-- Support partial trade rollback: store which specific sticker subsets to revert.
-- NULL means "revert all" (full rollback); an array (even empty) means "revert only these".
ALTER TABLE pending_trades
  ADD COLUMN rollback_giving_ids    text[],
  ADD COLUMN rollback_receiving_ids text[];
