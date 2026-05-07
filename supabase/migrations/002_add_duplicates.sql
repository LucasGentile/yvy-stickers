-- track duplicate stickers available for trading
create table if not exists user_duplicates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  sticker_id integer not null check (sticker_id between 1 and 980),
  count      integer not null default 1 check (count > 0),
  unique (user_id, sticker_id)
);

create index if not exists idx_user_duplicates_user_id on user_duplicates(user_id);
