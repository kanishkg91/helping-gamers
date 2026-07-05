-- KillSwitch zero-knowledge vault storage.
--
-- One row per user. The row contains ONLY ciphertext: the library is
-- AES-256-GCM encrypted on the user's device with a key that never leaves
-- it (except as the user's own 12-word recovery phrase). Neither the app
-- operator nor Supabase can read what anyone owns. There is deliberately
-- nothing else to store.

create table if not exists public.vaults (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  iv         text not null,
  ciphertext text not null,
  version    integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;

-- Owner-only access. No service-role loopholes are used by the app.
create policy "vault owner can read"
  on public.vaults for select
  using (auth.uid() = user_id);

create policy "vault owner can insert"
  on public.vaults for insert
  with check (auth.uid() = user_id);

create policy "vault owner can update"
  on public.vaults for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vault owner can delete"
  on public.vaults for delete
  using (auth.uid() = user_id);

-- Keep updated_at honest.
create or replace function public.touch_vaults_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists vaults_touch on public.vaults;
create trigger vaults_touch
  before update on public.vaults
  for each row execute function public.touch_vaults_updated_at();
