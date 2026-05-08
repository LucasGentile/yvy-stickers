-- Add accepted_at timestamp and rollback_requested_by to pending_trades
ALTER TABLE pending_trades
  ADD COLUMN accepted_at        timestamptz,
  ADD COLUMN rollback_requested_by uuid REFERENCES users(id);

-- Extend the status check to include rolled_back
ALTER TABLE pending_trades DROP CONSTRAINT pending_trades_status_check;
ALTER TABLE pending_trades ADD CONSTRAINT pending_trades_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'rolled_back'));
