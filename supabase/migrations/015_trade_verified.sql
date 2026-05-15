-- Add verified flag to pending_trades (marks physical exchange as completed)
ALTER TABLE pending_trades
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN verified_by uuid REFERENCES users(id);

-- Same for advanced_trades
ALTER TABLE advanced_trades
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN verified_by uuid REFERENCES users(id);
