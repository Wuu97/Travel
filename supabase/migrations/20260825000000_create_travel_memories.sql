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
