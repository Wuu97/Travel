import { normalizeTravelMemory, normalizeTravelPreference, travelMemorySources, type TravelMemory, type TravelMemorySource, type TravelPreference } from "./model";

type RepositoryError = { message: string } | null;
type RepositoryResult = Promise<{ data: unknown; error: RepositoryError }>;
type MemoryInsert = { user_id: string; preference: TravelPreference; confidence: number; source: TravelMemorySource };
type MemoryUpdate = Partial<Pick<MemoryInsert, "preference" | "confidence" | "source">>;

export type MemoryRepositoryClient = {
  from(table: "travel_memories"): {
    insert(values: MemoryInsert): { select(columns: string): { single(): RepositoryResult } };
    select(columns: string): { eq(column: "user_id", value: string): { order(column: "updated_at", options: { ascending: boolean }): RepositoryResult } };
    update(values: MemoryUpdate): { eq(column: "id", value: string): { eq(column: "user_id", value: string): { select(columns: string): { single(): RepositoryResult } } } };
    delete(): { eq(column: "id", value: string): { eq(column: "user_id", value: string): { select(columns: string): { maybeSingle(): RepositoryResult } } } };
  };
};

export type CreateTravelMemoryInput = {
  userId: string;
  preference: TravelPreference;
  confidence: number;
  source: TravelMemorySource;
};

export type UpdateTravelMemoryInput = {
  preference?: TravelPreference;
  confidence?: number;
  source?: TravelMemorySource;
};

const memoryColumns = "id, user_id, preference, confidence, source, created_at, updated_at";
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const validConfidence = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;
const validSource = (value: unknown): value is TravelMemorySource => typeof value === "string" && travelMemorySources.includes(value as TravelMemorySource);

function toMemory(value: unknown): TravelMemory {
  if (!value || typeof value !== "object") throw new Error("旅行偏好数据格式无效。");
  const raw = value as Record<string, unknown>;
  const memory = normalizeTravelMemory({
    id: raw.id,
    userId: raw.user_id,
    preference: raw.preference,
    confidence: typeof raw.confidence === "string" ? Number(raw.confidence) : raw.confidence,
    source: raw.source,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  });
  if (!memory) throw new Error("旅行偏好数据格式无效。");
  return memory;
}

function throwRepositoryError(error: RepositoryError, action: string): never {
  throw new Error(`${action}：${error?.message || "未知错误"}`);
}

export function createTravelMemoryRepository(client: MemoryRepositoryClient) {
  return {
    async createMemory(input: CreateTravelMemoryInput): Promise<TravelMemory> {
      const preference = normalizeTravelPreference(input.preference);
      if (!uuid(input.userId) || !preference || !validConfidence(input.confidence) || !validSource(input.source)) throw new Error("旅行偏好输入无效。");
      const { data, error } = await client.from("travel_memories").insert({ user_id: input.userId, preference, confidence: input.confidence, source: input.source }).select(memoryColumns).single();
      if (error) return throwRepositoryError(error, "无法创建旅行偏好");
      return toMemory(data);
    },

    async getUserMemories(userId: string): Promise<TravelMemory[]> {
      if (!uuid(userId)) throw new Error("用户 ID 无效。");
      const { data, error } = await client.from("travel_memories").select(memoryColumns).eq("user_id", userId).order("updated_at", { ascending: false });
      if (error) return throwRepositoryError(error, "无法读取旅行偏好");
      return Array.isArray(data) ? data.map(toMemory) : [];
    },

    async updateMemory(userId: string, memoryId: string, input: UpdateTravelMemoryInput): Promise<TravelMemory> {
      const preference = input.preference === undefined ? undefined : normalizeTravelPreference(input.preference);
      if (!uuid(userId) || !uuid(memoryId) || (input.preference !== undefined && !preference) || (input.confidence !== undefined && !validConfidence(input.confidence)) || (input.source !== undefined && !validSource(input.source))) throw new Error("旅行偏好输入无效。");
      const update = { ...input, ...(preference ? { preference } : {}) };
      const { data, error } = await client.from("travel_memories").update(update).eq("id", memoryId).eq("user_id", userId).select(memoryColumns).single();
      if (error) return throwRepositoryError(error, "无法更新旅行偏好");
      return toMemory(data);
    },

    async deleteMemory(userId: string, memoryId: string): Promise<void> {
      if (!uuid(userId) || !uuid(memoryId)) throw new Error("旅行偏好 ID 无效。");
      const { data, error } = await client.from("travel_memories").delete().eq("id", memoryId).eq("user_id", userId).select("id").maybeSingle();
      if (error) return throwRepositoryError(error, "无法删除旅行偏好");
      if (!data) throw new Error("旅行偏好不存在或无删除权限。");
    },
  };
}
