CREATE TABLE IF NOT EXISTS pending_trades (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id  uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  giving_ids    text[]      NOT NULL DEFAULT '{}',
  receiving_ids text[]      NOT NULL DEFAULT '{}',
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_trades_initiator_idx ON pending_trades(initiator_id);
CREATE INDEX IF NOT EXISTS pending_trades_receiver_idx  ON pending_trades(receiver_id);
CREATE INDEX IF NOT EXISTS pending_trades_status_idx    ON pending_trades(status);
