import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaUrl = new URL("../supabase/schema.sql", import.meta.url);

test("only trip owners can manage memberships and invitations through RLS", async () => {
  const schema = await readFile(schemaUrl, "utf8");
  const ownerCheck = /exists \(select 1 from public\.trips where id = trip_id and owner_id = auth\.uid\(\)\)/;

  assert.match(schema, /drop policy if exists "Editors can manage memberships" on public\.trip_members;/);
  assert.match(schema, /drop policy if exists "Editors can create invites" on public\.trip_invites;/);
  assert.match(schema, /create policy "Owners can insert memberships" on public\.trip_members for insert with check \(exists \(select 1 from public\.trips where id = trip_id and owner_id = auth\.uid\(\)\)\);/);
  assert.match(schema, /create policy "Owners can update memberships" on public\.trip_members for update using \(exists \(select 1 from public\.trips where id = trip_id and owner_id = auth\.uid\(\)\)\) with check \(exists \(select 1 from public\.trips where id = trip_id and owner_id = auth\.uid\(\)\)\);/);
  assert.match(schema, /create policy "Owners can delete memberships" on public\.trip_members for delete using \(exists \(select 1 from public\.trips where id = trip_id and owner_id = auth\.uid\(\)\)\);/);
  assert.match(schema, /create policy "Owners can create invites" on public\.trip_invites for insert with check \(created_by = auth\.uid\(\) and exists \(select 1 from public\.trips where id = trip_id and owner_id = auth\.uid\(\)\)\);/);
  assert.match(schema, /create policy "Owners can update invites"/);
  assert.match(schema, /create policy "Owners can delete invites"/);
  assert.match(schema, ownerCheck);

  assert.doesNotMatch(schema, /create policy "Editors can manage memberships"/);
  assert.doesNotMatch(schema, /create policy "Editors can create invites"/);
  assert.match(schema, /create or replace function public\.accept_trip_invite\(invite_token uuid\)[\s\S]*security definer/);
  assert.match(schema, /insert into public\.trip_members \(trip_id, user_id, role\) values \(invitation\.trip_id, auth\.uid\(\), invitation\.role\)/);
  assert.match(schema, /grant execute on function public\.accept_trip_invite\(uuid\) to authenticated;/);
});
