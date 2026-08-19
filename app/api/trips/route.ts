import { env } from "cloudflare:workers";
import { isStoredTrip } from "../validation";

const DEFAULT_TRIP_ID = "hangzhou-summer-trip";
const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS trip_snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT
  );
`;

function getTripId(request: Request) {
  const tripId = new URL(request.url).searchParams.get("tripId") || DEFAULT_TRIP_ID;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(tripId)) {
    throw new Error("行程 ID 格式无效。");
  }
  return tripId;
}

async function getDatabase() {
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  await env.DB.exec(CREATE_TABLE_SQL);
  return env.DB;
}

export async function GET(request: Request) {
  try {
    const database = await getDatabase();
    const tripId = getTripId(request);
    const row = await database
      .prepare("SELECT payload, updated_at, updated_by FROM trip_snapshots WHERE id = ?")
      .bind(tripId)
      .first<{ payload: string; updated_at: number; updated_by: string | null }>();

    if (!row) return Response.json({ trip: null });

    const trip = JSON.parse(row.payload) as unknown;
    if (!isStoredTrip(trip)) {
      return Response.json({ error: "保存的行程数据无效。" }, { status: 500 });
    }

    return Response.json({
      trip,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "无法读取共享行程。" },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    let body: { trip?: unknown };
    try {
      body = (await request.json()) as { trip?: unknown };
    } catch {
      return Response.json({ error: "请求格式无效。" }, { status: 400 });
    }
    if (!isStoredTrip(body.trip)) {
      return Response.json({ error: "行程数据格式无效。" }, { status: 400 });
    }

    const database = await getDatabase();
    const tripId = getTripId(request);
    const updatedAt = Date.now();
    const updatedBy = request.headers.get("oai-authenticated-user-id");

    await database
      .prepare(
        `INSERT INTO trip_snapshots (id, payload, updated_at, updated_by)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payload = excluded.payload,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`,
      )
      .bind(tripId, JSON.stringify(body.trip), updatedAt, updatedBy)
      .run();

    return Response.json({ updatedAt, updatedBy });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "无法保存共享行程。" },
      { status: 503 },
    );
  }
}
