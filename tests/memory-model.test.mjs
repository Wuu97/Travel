import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = ["features/memory/model.ts", "features/memory/repository.ts"];
const userId = "11111111-1111-4111-8111-111111111111";
const memoryId = "22222222-2222-4222-8222-222222222222";
const row = (overrides = {}) => ({ id: memoryId, user_id: userId, preference: { pace: "relaxed", interests: ["nature"] }, confidence: 0.6, source: "inferred", created_at: "2026-08-25T00:00:00.000Z", updated_at: "2026-08-25T00:00:00.000Z", ...overrides });
const memory = (overrides = {}) => ({ id: memoryId, userId, preference: { pace: "relaxed", interests: ["nature"] }, confidence: 0.6, source: "inferred", createdAt: "2026-08-25T00:00:00.000Z", updatedAt: "2026-08-25T00:00:00.000Z", ...overrides });

test("validates the bounded travel memory model", async () => {
  const compilation = await compileTypeScript(sources, "travel-memory-model-");
  try {
    const { normalizeTravelMemory } = await compilation.importModule("model.js");
    assert.equal(normalizeTravelMemory({ ...memory(), confidence: 0 })?.confidence, 0);
    assert.equal(normalizeTravelMemory({ ...memory(), confidence: 1 })?.confidence, 1);
    assert.equal(normalizeTravelMemory({ ...memory(), confidence: -1 }), undefined);
    assert.equal(normalizeTravelMemory({ ...memory(), confidence: 1.5 }), undefined);
    assert.equal(normalizeTravelMemory({ ...memory(), source: "unknown" }), undefined);
    assert.equal(normalizeTravelMemory({ ...memory(), preference: { pace: "rushed" } }), undefined);
  } finally { await compilation.cleanup(); }
});

test("performs memory CRUD through a user-scoped repository", async () => {
  const compilation = await compileTypeScript(sources, "travel-memory-repository-");
  try {
    const { createTravelMemoryRepository } = await compilation.importModule("repository.js");
    const rows = [];
    const client = { from() { return {
      insert(values) { const next = row({ ...values }); rows.push(next); return { select() { return { async single() { return { data: next, error: null }; } }; } }; },
      select() { return { eq(_column, value) { return { async order() { return { data: rows.filter((item) => item.user_id === value), error: null }; } }; } }; },
      update(values) { return { eq(_column, id) { return { eq(_userColumn, ownerId) { return { select() { return { async single() { const found = rows.find((item) => item.id === id && item.user_id === ownerId); if (!found) return { data: null, error: { message: "not found" } }; Object.assign(found, values, { updated_at: "2026-08-26T00:00:00.000Z" }); return { data: found, error: null }; } }; } }; } }; } }; },
      delete() { return { eq(_column, id) { return { async eq(_userColumn, ownerId) { const index = rows.findIndex((item) => item.id === id && item.user_id === ownerId); if (index < 0) return { data: null, error: { message: "not found" } }; rows.splice(index, 1); return { data: null, error: null }; } }; } }; },
    }; } };
    const repository = createTravelMemoryRepository(client);
    const created = await repository.createMemory({ userId, preference: { pace: "relaxed", interests: ["nature"] }, confidence: 1, source: "explicit" });
    assert.equal(created.source, "explicit");
    assert.equal((await repository.getUserMemories(userId)).length, 1);
    assert.equal((await repository.updateMemory(userId, memoryId, { confidence: 0.6 })).confidence, 0.6);
    await repository.deleteMemory(userId, memoryId);
    assert.equal((await repository.getUserMemories(userId)).length, 0);
  } finally { await compilation.cleanup(); }
});

test("defines ownership-only RLS policies for travel memories", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260825000000_create_travel_memories.sql", import.meta.url), "utf8");
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /auth\.uid\(\) = user_id/g);
  assert.doesNotMatch(migration, /for select using \(true\)/i);
});
