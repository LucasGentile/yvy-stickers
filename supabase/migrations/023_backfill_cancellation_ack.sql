-- Pre-acknowledge all existing cancellations so the banner is not retroactive.
-- Only trades cancelled after this migration will require acknowledgment.
UPDATE pending_trades
SET cancellation_acked_at = now()
WHERE status IN ('cancelled', 'rejected')
  AND cancellation_acked_at IS NULL;
