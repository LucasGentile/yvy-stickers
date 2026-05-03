-- users
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  apartment   text not null,
  tower       text not null,
  phone       text not null unique,
  input_mode  text not null check (input_mode in ('have', 'need')),
  display_key text not null,
  created_at  timestamptz not null default now()
);

-- user_stickers (boolean ownership — no quantity tracking in V1)
create table if not exists user_stickers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  sticker_id integer not null check (sticker_id between 1 and 980),
  unique (user_id, sticker_id)
);

create index if not exists idx_user_stickers_user_id    on user_stickers(user_id);
create index if not exists idx_user_stickers_sticker_id on user_stickers(sticker_id);
