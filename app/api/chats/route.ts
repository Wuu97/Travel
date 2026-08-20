import { createSupabaseServerClient } from "../../../features/auth/supabase";
import { normalizeChatMessage, type SavedChat } from "../../../features/chat/model";

type ChatRow = { id: string; title: string; messages: unknown; created_at: number; updated_at: number };

function getAccessToken(request: Request) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

async function getAuthenticatedClient(request: Request) {
  const accessToken = getAccessToken(request);
  const client = accessToken ? createSupabaseServerClient(accessToken) : null;
  if (!client) return { error: Response.json({ error: "Supabase 云端服务尚未配置。" }, { status: 503 }) };
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return { error: Response.json({ error: "请先登录后同步历史记录。" }, { status: 401 }) };
  return { client, userId: data.user.id };
}

function normalizeRow(row: ChatRow): SavedChat | null {
  if (!Array.isArray(row.messages) || !row.id || !row.title) return null;
  const messages = row.messages.map(normalizeChatMessage).filter((message) => message !== null);
  return { id: row.id, title: row.title, messages, createdAt: row.created_at, updatedAt: row.updated_at };
}

function parseChat(value: unknown): SavedChat | null {
  if (!value || typeof value !== "object") return null;
  const chat = value as Partial<SavedChat>;
  if (typeof chat.id !== "string" || !chat.id || typeof chat.title !== "string" || !Array.isArray(chat.messages)) return null;
  const messages = chat.messages.map(normalizeChatMessage).filter((message) => message !== null);
  if (messages.length !== chat.messages.length) return null;
  return { id: chat.id.slice(0, 200), title: chat.title.slice(0, 200), messages, createdAt: typeof chat.createdAt === "number" ? chat.createdAt : Date.now(), updatedAt: typeof chat.updatedAt === "number" ? chat.updatedAt : Date.now() };
}

export async function GET(request: Request) {
  const context = await getAuthenticatedClient(request);
  if ("error" in context) return context.error;
  const { data, error } = await context.client.from("chat_sessions").select("id, title, messages, created_at, updated_at").order("updated_at", { ascending: false }).limit(20);
  if (error) return Response.json({ error: error.message }, { status: 502 });
  return Response.json({ chats: (data as ChatRow[]).map(normalizeRow).filter((chat): chat is SavedChat => chat !== null) });
}

export async function PUT(request: Request) {
  const context = await getAuthenticatedClient(request);
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
  const context = await getAuthenticatedClient(request);
  if ("error" in context) return context.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "缺少对话 ID。" }, { status: 400 });
  const { error } = await context.client.from("chat_sessions").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 502 });
  return Response.json({ deleted: true });
}