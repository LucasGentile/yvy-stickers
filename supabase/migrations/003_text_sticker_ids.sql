-- Sticker IDs changed from integers (1-980) to text codes (MEX1, FWC00, CC14, etc.)
-- Clear all sticker data — old integer IDs are no longer valid
TRUNCATE user_duplicates;
TRUNCATE user_stickers;

-- Migrate user_stickers.sticker_id: integer → text
ALTER TABLE user_stickers DROP CONSTRAINT IF EXISTS user_stickers_sticker_id_check;
ALTER TABLE user_stickers ALTER COLUMN sticker_id TYPE text USING sticker_id::text;

-- Migrate user_duplicates.sticker_id: integer → text
ALTER TABLE user_duplicates DROP CONSTRAINT IF EXISTS user_duplicates_sticker_id_check;
ALTER TABLE user_duplicates ALTER COLUMN sticker_id TYPE text USING sticker_id::text;
