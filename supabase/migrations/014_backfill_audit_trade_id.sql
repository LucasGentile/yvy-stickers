-- Backfill tradeId into audit_log metadata for trade events that lack it.
-- Links each trade audit entry to its pending_trades row by matching:
--   1. The user is a participant (initiator or receiver)
--   2. The trade was created before the audit entry
--   3. Only one candidate exists (via DISTINCT + LIMIT 1 ordered by closest time)

-- Normal trade actions that should reference pending_trades
UPDATE audit_log a
SET metadata = a.metadata || jsonb_build_object('tradeId', t.id::text)
FROM (
  SELECT DISTINCT ON (al.id)
    al.id AS audit_id,
    pt.id
  FROM audit_log al
  JOIN pending_trades pt
    ON (pt.initiator_id = al.user_id OR pt.receiver_id = al.user_id)
    AND pt.created_at <= al.created_at + interval '1 minute'
    AND pt.created_at >= al.created_at - interval '24 hours'
  WHERE al.action IN (
    'trade_sent',
    'trade_received',
    'trade_rejected',
    'trade_cancelled',
    'trade_rolled_back',
    'trade_rollback_requested',
    'trade_rollback_denied'
  )
  AND (al.metadata->>'tradeId') IS NULL
  ORDER BY al.id, abs(extract(epoch from (al.created_at - pt.created_at)))
) t
WHERE a.id = t.audit_id;

-- Index to speed up timeline queries filtering by metadata->>tradeId
CREATE INDEX IF NOT EXISTS audit_log_trade_id_idx
  ON audit_log ((metadata->>'tradeId'))
  WHERE (metadata->>'tradeId') IS NOT NULL;
