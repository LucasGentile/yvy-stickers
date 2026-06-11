-- Re-activate users who were wrongly deactivated by the v2.10.0 bug.
-- deactivateStaleUsers queried user_stickers with .in() which returned raw rows and
-- hit PostgREST's 1000-row limit, causing users with stickers to appear sticker-less
-- and get deactivated. Any user who has at least one sticker is a real participant.
UPDATE users
SET is_active = true
WHERE is_active = false
  AND id IN (SELECT DISTINCT user_id FROM user_stickers);
