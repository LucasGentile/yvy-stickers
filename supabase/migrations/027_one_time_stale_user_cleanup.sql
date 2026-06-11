-- Step 1: Re-activate any user who has stickers but was wrongly deactivated.
UPDATE users
SET is_active = true
WHERE is_active = false
  AND id IN (SELECT DISTINCT user_id FROM user_stickers);

-- Step 2: One-time deactivation of genuinely stale accounts —
-- registered more than 3 days ago and never added a single sticker or duplicate.
UPDATE users
SET is_active = false
WHERE is_active = true
  AND created_at < NOW() - INTERVAL '3 days'
  AND id NOT IN (SELECT DISTINCT user_id FROM user_stickers)
  AND id NOT IN (SELECT DISTINCT user_id FROM user_duplicates);
