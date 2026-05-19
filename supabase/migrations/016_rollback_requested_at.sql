ALTER TABLE pending_trades
  ADD COLUMN rollback_requested_at timestamptz;
