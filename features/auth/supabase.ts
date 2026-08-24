import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  browserClient ??= createClient(supabaseUrl!, supabaseKey!);
  return browserClient;
}

export function createSupabaseServerClient(accessToken: string) {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl!, supabaseKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function getBearerAccessToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() || null : null;
}

/** Establishes one consistent server-side authorization boundary for cloud data APIs. */
export async function requireSupabaseUser(request: Request, unauthorizedMessage: string) {
  const accessToken = getBearerAccessToken(request);
  const client = accessToken ? createSupabaseServerClient(accessToken) : null;
  if (!client) return { error: Response.json({ error: "Supabase 云端服务尚未配置。" }, { status: 503 }) };
  const { data, error } = await client.auth.getUser(accessToken ?? undefined);
  if (error || !data.user) return { error: Response.json({ error: unauthorizedMessage }, { status: 401 }) };
  return { client, userId: data.user.id };
}
