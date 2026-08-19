import { env } from "cloudflare:workers";
import { isStoredTrip } from "../../../features/trip/snapshotValidation";
import { getTripId } from "../../../features/trip/tripId";
import { getAuthenticatedUserId } from "../../../features/trip/access";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS trip_snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT
  );
`;

async function getDatabase() {
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  await env.DB.exec(CREATE_TABLE_SQL);
  return env.DB;
}

export async function GET(request: Request) {
  try {
    const userId = getAuthenticatedUserId(request);
    if (!userId) return Response.json({ error: "请先登录后查看共享行程。" }, { status: 401 });
    const database = await getDatabase();
    const tripId = getTripId(request);
    const row = await database
      .prepare("SELECT payload, updated_at, updated_by FROM trip_snapshots WHERE id = ? AND updated_by = ?")
      .bind(tripId, userId)
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
    const userId = getAuthenticatedUserId(request);
    if (!userId) return Response.json({ error: "请先登录后编辑共享行程。" }, { status: 401 });
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
    const updatedBy = userId;

    const result = await database
      .prepare(
        `INSERT INTO trip_snapshots (id, payload, updated_at, updated_by)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payload = excluded.payload,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by
         WHERE trip_snapshots.updated_by = excluded.updated_by
            OR trip_snapshots.updated_by IS NULL`,
      )
      .bind(tripId, JSON.stringify(body.trip), updatedAt, updatedBy)
      .run();

    if (!result.meta.changes) {
      return Response.json({ error: "你没有编辑该共享行程的权限。" }, { status: 403 });
    }

    return Response.json({ updatedAt, updatedBy });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "无法保存共享行程。" },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = getAuthenticatedUserId(request);
    if (!userId) return Response.json({ error: "请先登录后删除共享行程。" }, { status: 401 });
    const database = await getDatabase();
    const tripId = getTripId(request);
    const result = await database.prepare("DELETE FROM trip_snapshots WHERE id = ? AND updated_by = ?").bind(tripId, userId).run();
    if (!result.meta.changes) return Response.json({ error: "你没有删除该共享行程的权限。" }, { status: 403 });
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "无法删除共享行程。" },
      { status: 503 },
    );
  }
}
