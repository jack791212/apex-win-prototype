-- =====================================================================
-- Apex Win × Supabase 一鍵建置（在 Supabase → SQL Editor 全選貼上 → Run）
-- 內容：profiles 玩家檔、battle_history 戰績、RLS 權限、註冊自動建檔 trigger
-- 安全：玩家只能讀/寫自己的資料（RLS）。前端只用 anon key。
-- =====================================================================

-- ---------- 1) 玩家檔：一個 user 一列（id = auth.users.id）----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar text default '👑',
  balance numeric not null default 28560,
  currency text not null default 'TWD',
  wallet jsonb not null default '{}'::jsonb,
  arena_stats jsonb not null default
    '{"matches":0,"wins":0,"losses":0,"profit":0,"streak":0,"best":0,"bigWin":0,"hostNet":0}'::jsonb,
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own_select" on public.profiles;
drop policy if exists "own_update" on public.profiles;
drop policy if exists "own_insert" on public.profiles;
create policy "own_select" on public.profiles for select using (auth.uid() = id);
create policy "own_update" on public.profiles for update using (auth.uid() = id);
create policy "own_insert" on public.profiles for insert with check (auth.uid() = id);

-- ---------- 2) 戰績列：一場一列（取代記憶體 history[]）----------
create table if not exists public.battle_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  ts timestamptz default now(),
  vs text,
  mode text,
  wager numeric,
  net numeric,
  win boolean,
  payload jsonb                -- 完整 rec（seats/totals/rounds）供回放
);
alter table public.battle_history enable row level security;
drop policy if exists "own_h_select" on public.battle_history;
drop policy if exists "own_h_insert" on public.battle_history;
create policy "own_h_select" on public.battle_history for select using (auth.uid() = user_id);
create policy "own_h_insert" on public.battle_history for insert with check (auth.uid() = user_id);
create index if not exists battle_history_user_ts on public.battle_history (user_id, ts desc);

-- ---------- 3) 註冊時自動建立 profile ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 完成。回前端 src/core/config.js 填入 URL + anon key 即可。
