<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Database safety rules

These apply to every migration and every server action — no exceptions.

- **Migrations are append-only.** Never edit an existing file in `supabase/migrations/`. Always create a new numbered file.
- **No destructive DDL without explicit user confirmation.** `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` require the user to approve before the SQL is written or run.
- **New columns must be nullable or have a default.** Never add a `NOT NULL` column without a default to a table that already has rows.
- **All `DELETE` and `UPDATE` statements must have a `WHERE` clause.** A statement that could affect all rows must never be written or run without explicit user confirmation.
- **Never run `supabase db push` automatically.** Always tell the user to run it manually after reviewing the migration file.
- **Prefer soft deletes or status columns** over hard deletes for user-generated data (stickers, duplicates, trades).
