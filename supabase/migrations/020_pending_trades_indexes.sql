-- Composite indexes for the most common pending_trades query pattern:
-- filter by (initiator_id OR receiver_id) + status.
-- The OR is resolved by the planner as a BitmapOr over both indexes,
-- which avoids a full table scan as the trades table grows.
CREATE INDEX IF NOT EXISTS idx_pending_trades_initiator_status
  ON pending_trades (initiator_id, status);

CREATE INDEX IF NOT EXISTS idx_pending_trades_receiver_status
  ON pending_trades (receiver_id, status);
