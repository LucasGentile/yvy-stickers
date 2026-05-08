-- Returns the number of user_stickers rows per user.
-- Used by getRanking to avoid fetching all rows into JS (PostgREST caps at 1000 rows by default).
CREATE OR REPLACE FUNCTION get_sticker_counts_by_user()
RETURNS TABLE (user_id uuid, sticker_count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT user_id, COUNT(*)::bigint AS sticker_count
  FROM user_stickers
  GROUP BY user_id;
$$;
