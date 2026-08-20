import { requireSupabaseUser } from "../../../features/auth/supabase";
import { normalizeChatMessage, type SavedChat } from "../../../features/chat/model";
import { isShortString } from "../../../features/shared/validation";

type ChatRow = { id: string; title: string; messages: unknown; created_at: number; updated_at: number };
const MAX_CHAT_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 12_000;
const isChatId = (value: unknown) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value);
const isTimestamp = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0;

function parseMessages(value: unknown): SavedChat["messages"] | null {
  if (!Array.isArray(value) || value.length > MAX_CHAT_MESSAGES) return null;
  const messages = value.map(normalizeChatMessage);
  return messages.every((message) => message && message.content.trim() && message.content.length <= MAX_MESSAGE_LENGTH)
    ? messages
    : null;
}

function normalizeRow(row: ChatRow): SavedChat | null {
  if (!isChatId(row.id) || !isShortString(row.title, 200) || !row.title.trim() || !isTimestamp(row.created_at) || !isTimestamp(row.updated_at)) return null;
  const messages = parseMessages(row.messages);
  if (!messages) return null;
  return { id: row.id, title: row.title, messages, createdAt: row.created_at, updatedAt: row.updated_at };
}

function parseChat(value: unknown): SavedChat | null {
  if (!value || typeof value !== "object") return null;
  const chat = value as Partial<SavedChat>;
  if (!isChatId(chat.id) || !isShortString(chat.title, 200) || !chat.title.trim()) return null;
  const messages = parseMessages(chat.messages);
  if (!messages) return null;
  const now = Date.now();
  return { id: chat.id, title: chat.title.trim(), messages, createdAt: isTimestamp(chat.createdAt) ? chat.createdAt : now, updatedAt: isTimestamp(chat.updatedAt) ? chat.updatedAt : now };
}

export async function GET(request: Request) {
  const context = await requireSupabaseUser(request, "请先登录后同步历史记录。");
  if ("error" in context) return context.error;
  const { data, error } = await context.client.from("chat_sessions").select("id, title, messages, created_at, updated_at").order("updated_at", { ascending: false }).limit(20);
  if (error) return Response.json({ error: error.message }, { status: 502 });
  return Response.json({ chats: (data as ChatRow[]).map(normalizeRow).filter((chat): chat is SavedChat => chat !== null) });
}

export async function PUT(request: Request) {
  const context = await requireSupabaseUser(request, "请先登录后同步历史记录。");
  if ("error" in context) return context.error;
  let body: { chat?: unknown };
  try { body = await request.json() as { chat?: unknown }; }
  catch { return Response.json({ error: "请求格式无效。" }, { status: 400 }); }
  const chat = parseChat(body.chat);
  if (!chat) return Response.json({ error: "对话数据无效。" }, { status: 400 });
  const { error } = await context.client.from("chat_sessions").upsert({ id: chat.id, user_id: context.userId, title: chat.title, messages: chat.messages, created_at: chat.createdAt, updated_at: chat.updatedAt }, { onConflict: "id" });
  if (error) return Response.json({ error: error.message }, { status: 502 });
  return Response.json({ chat });
}

export async function DELETE(request: Request) {
  const context = await requireSupabaseUser(request, "请先登录后同步历史记录。");
  if ("error" in context) return context.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!isChatId(id)) return Response.json({ error: "对话 ID 无效。" }, { status: 400 });
  const { error } = await context.client.from("chat_sessions").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 502 });
  return Response.json({ deleted: true });
}
