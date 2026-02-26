-- 問い合わせテーブル
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- RLS有効化（サービスロール経由のみ操作可能、公開読み取り不可）
alter table public.contacts enable row level security;
