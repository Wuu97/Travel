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