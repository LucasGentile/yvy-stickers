-- Add rollback support to advanced_trades
ALTER TABLE advanced_trades
  ADD COLUMN rollback_requested_by uuid REFERENCES users(id),
  ADD COLUMN rollback_requested_at timestamptz,
  ADD COLUMN rollback_a_status text NOT NULL DEFAULT 'none' CHECK (rollback_a_status IN ('none', 'approved', 'denied')),
  ADD COLUMN rollback_b_status text NOT NULL DEFAULT 'none' CHECK (rollback_b_status IN ('none', 'approved', 'denied')),
  ADD COLUMN rollback_c_status text NOT NULL DEFAULT 'none' CHECK (rollback_c_status IN ('none', 'approved', 'denied'));

-- Extend status check to include rolled_back
ALTER TABLE advanced_trades DROP CONSTRAINT advanced_trades_status_check;
ALTER TABLE advanced_trades ADD CONSTRAINT advanced_trades_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired', 'rolled_back'));
