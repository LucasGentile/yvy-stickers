ALTER TABLE pending_trades
  ADD COLUMN IF NOT EXISTS cancellation_acked_at timestamptz;
