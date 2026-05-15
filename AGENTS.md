<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Component architecture notes

## Trade card rendering (`components/audit/`)

- **`TradeCardBody`** is the single source of truth for rendering a trade event card (icon circle, label, sticker chips with give/receive colors). It is used by both:
  - `EventCard` — the history page (`/historico`), adds trade assistant, rollback controls, and links timestamps to the timeline detail page
  - `TimelineEntry` — the timeline detail page (`/history/[id]`), applies focused-entry styling (accent border) for the entry the user navigated from
- When modifying trade card visuals, update `TradeCardBody`. Context-specific behavior (assistants, rollback, linking) belongs in the consumer components.

# Database safety rules

These apply to every migration and every server action — no exceptions.

- **Migrations are append-only.** Never edit an existing file in `supabase/migrations/`. Always create a new numbered file.
- **No destructive DDL without explicit user confirmation.** `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` require the user to approve before the SQL is written or run.
- **New columns must be nullable or have a default.** Never add a `NOT NULL` column without a default to a table that already has rows.
- **All `DELETE` and `UPDATE` statements must have a `WHERE` clause.** A statement that could affect all rows must never be written or run without explicit user confirmation.
- **Never run `supabase db push` automatically.** Always tell the user to run it manually after reviewing the migration file.
- **Prefer soft deletes or status columns** over hard deletes for user-generated data (stickers, duplicates, trades).
