-- Track when a user completes their album (all stickers collected)
ALTER TABLE users ADD COLUMN album_completed_at timestamptz;
