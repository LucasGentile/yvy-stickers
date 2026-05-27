-- Enable RLS on all tables exposed to PostgREST.
-- All data access goes through server actions using the service role key,
-- which bypasses RLS. No anon policies are granted — default deny applies.
alter table public.users           enable row level security;
alter table public.user_stickers   enable row level security;
alter table public.user_duplicates enable row level security;
alter table public.audit_log       enable row level security;
alter table public.pending_trades  enable row level security;
alter table public.advanced_trades enable row level security;
