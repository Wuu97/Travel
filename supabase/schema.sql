create table if not exists public.chat_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  messages jsonb not null default '[]'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists chat_sessions_user_updated_at_idx on public.chat_sessions (user_id, updated_at desc);

alter table public.chat_sessions enable row level security;

drop policy if exists "Users can read their chat sessions" on public.chat_sessions;
drop policy if exists "Users can create their chat sessions" on public.chat_sessions;
drop policy if exists "Users can update their chat sessions" on public.chat_sessions;
drop policy if exists "Users can delete their chat sessions" on public.chat_sessions;
create policy "Users can read their chat sessions" on public.chat_sessions for select using (auth.uid() = user_id);
create policy "Users can create their chat sessions" on public.chat_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update their chat sessions" on public.chat_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their chat sessions" on public.chat_sessions for delete using (auth.uid() = user_id);

create table if not exists public.trip_snapshots (
  id text not null check (char_length(id) between 1 and 128),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at bigint not null,
  primary key (id, user_id)
);

create index if not exists trip_snapshots_user_updated_at_idx on public.trip_snapshots (user_id, updated_at desc);

alter table public.trip_snapshots enable row level security;

drop policy if exists "Users can read their trip snapshots" on public.trip_snapshots;
drop policy if exists "Users can create their trip snapshots" on public.trip_snapshots;
drop policy if exists "Users can update their trip snapshots" on public.trip_snapshots;
drop policy if exists "Users can delete their trip snapshots" on public.trip_snapshots;
create policy "Users can read their trip snapshots" on public.trip_snapshots for select using (auth.uid() = user_id);
create policy "Users can create their trip snapshots" on public.trip_snapshots for insert with check (auth.uid() = user_id);
create policy "Users can update their trip snapshots" on public.trip_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their trip snapshots" on public.trip_snapshots for delete using (auth.uid() = user_id);

-- Shared trips use a single authoritative record plus explicit memberships.
create table if not exists public.trips (
  id text primary key check (char_length(id) between 1 and 128),
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  version bigint not null default 1,
  updated_at bigint not null
);
create table if not exists public.trip_members (
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  primary key (trip_id, user_id)
);
create table if not exists public.trip_invites (
  token uuid primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at bigint not null,
  expires_at bigint not null
);

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;

create or replace function public.is_trip_member(target_trip_id text, required_role text default 'viewer')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = target_trip_id and owner_id = auth.uid())
    or exists (select 1 from public.trip_members where trip_id = target_trip_id and user_id = auth.uid() and (required_role = 'viewer' or role = 'editor'));
$$;

drop policy if exists "Trip participants can read trips" on public.trips;
drop policy if exists "Users can create owned trips" on public.trips;
drop policy if exists "Editors can update trips" on public.trips;
drop policy if exists "Owners can delete trips" on public.trips;
create policy "Trip participants can read trips" on public.trips for select using (public.is_trip_member(id));
create policy "Users can create owned trips" on public.trips for insert with check (owner_id = auth.uid());
create policy "Editors can update trips" on public.trips for update using (public.is_trip_member(id, 'editor')) with check (public.is_trip_member(id, 'editor'));
create policy "Owners can delete trips" on public.trips for delete using (owner_id = auth.uid());
drop policy if exists "Participants can read memberships" on public.trip_members;
drop policy if exists "Editors can manage memberships" on public.trip_members;
drop policy if exists "Owners can insert memberships" on public.trip_members;
drop policy if exists "Owners can update memberships" on public.trip_members;
drop policy if exists "Owners can delete memberships" on public.trip_members;
create policy "Participants can read memberships" on public.trip_members for select using (public.is_trip_member(trip_id));
create policy "Owners can insert memberships" on public.trip_members for insert with check (exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid()));
create policy "Owners can update memberships" on public.trip_members for update using (exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())) with check (exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid()));
create policy "Owners can delete memberships" on public.trip_members for delete using (exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid()));
drop policy if exists "Editors can create invites" on public.trip_invites;
drop policy if exists "Editors can read invites" on public.trip_invites;
drop policy if exists "Owners can create invites" on public.trip_invites;
drop policy if exists "Owners can update invites" on public.trip_invites;
drop policy if exists "Owners can delete invites" on public.trip_invites;
drop policy if exists "Owners can read invites" on public.trip_invites;
create policy "Owners can create invites" on public.trip_invites for insert with check (created_by = auth.uid() and exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid()));
create policy "Owners can update invites" on public.trip_invites for update using (exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())) with check (created_by = auth.uid() and exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid()));
create policy "Owners can delete invites" on public.trip_invites for delete using (exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid()));
create policy "Owners can read invites" on public.trip_invites for select using (exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid()));

create table if not exists public.travel_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preference jsonb not null,
  confidence numeric not null default 1 check (confidence >= 0 and confidence <= 1),
  source text not null check (source in ('explicit', 'inferred')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists travel_memories_user_updated_at_idx on public.travel_memories (user_id, updated_at desc);

create or replace function public.set_travel_memories_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists travel_memories_set_updated_at on public.travel_memories;
create trigger travel_memories_set_updated_at before update on public.travel_memories
for each row execute function public.set_travel_memories_updated_at();

alter table public.travel_memories enable row level security;

drop policy if exists "Users can read their travel memories" on public.travel_memories;
drop policy if exists "Users can create their travel memories" on public.travel_memories;
drop policy if exists "Users can update their travel memories" on public.travel_memories;
drop policy if exists "Users can delete their travel memories" on public.travel_memories;
create policy "Users can read their travel memories" on public.travel_memories for select using (auth.uid() = user_id);
create policy "Users can create their travel memories" on public.travel_memories for insert with check (auth.uid() = user_id);
create policy "Users can update their travel memories" on public.travel_memories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their travel memories" on public.travel_memories for delete using (auth.uid() = user_id);

create or replace function public.accept_trip_invite(invite_token uuid)
returns text language plpgsql security definer set search_path = public as $$
declare invitation public.trip_invites%rowtype;
begin
  select * into invitation from public.trip_invites where token = invite_token and expires_at > (extract(epoch from now()) * 1000)::bigint;
  if not found then raise exception '邀请链接无效或已过期'; end if;
  insert into public.trip_members (trip_id, user_id, role) values (invitation.trip_id, auth.uid(), invitation.role)
  on conflict (trip_id, user_id) do update set role = excluded.role;
  return invitation.trip_id;
end;
$$;
grant execute on function public.accept_trip_invite(uuid) to authenticated;
