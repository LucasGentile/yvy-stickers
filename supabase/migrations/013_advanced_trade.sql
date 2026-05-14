CREATE TABLE IF NOT EXISTS advanced_trades (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  -- Participants (always exactly 3, in cycle order: A→B→C→A)
  user_a_id       uuid        NOT NULL REFERENCES users(id),
  user_b_id       uuid        NOT NULL REFERENCES users(id),
  user_c_id       uuid        NOT NULL REFERENCES users(id),
  -- What each gives (to the next in cycle)
  a_gives_ids     text[]      NOT NULL DEFAULT '{}',
  b_gives_ids     text[]      NOT NULL DEFAULT '{}',
  c_gives_ids     text[]      NOT NULL DEFAULT '{}',
  -- Approval state per user
  user_a_status   text        NOT NULL DEFAULT 'pending' CHECK (user_a_status IN ('pending', 'approved', 'rejected')),
  user_b_status   text        NOT NULL DEFAULT 'pending' CHECK (user_b_status IN ('pending', 'approved', 'rejected')),
  user_c_status   text        NOT NULL DEFAULT 'pending' CHECK (user_c_status IN ('pending', 'approved', 'rejected')),
  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  requested_by    uuid        NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS advanced_trades_user_a_idx ON advanced_trades(user_a_id);
CREATE INDEX IF NOT EXISTS advanced_trades_user_b_idx ON advanced_trades(user_b_id);
CREATE INDEX IF NOT EXISTS advanced_trades_user_c_idx ON advanced_trades(user_c_id);
CREATE INDEX IF NOT EXISTS advanced_trades_status_idx ON advanced_trades(status);
