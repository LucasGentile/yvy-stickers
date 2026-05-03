## Context

YVY Lindóia condominium (~136 apartments) residents currently coordinate FIFA World Cup 2026 sticker trades ad hoc via WhatsApp. The goal is a greenfield PWA accessible to all age groups (kids, adults, elderly), requiring zero login friction and full usability on mobile devices. There is no existing codebase or infrastructure.

Stack chosen: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase.

## Goals / Non-Goals

**Goals:**
- Ship a working, mobile-first PWA as fast as possible
- Allow any resident to register, manage stickers, and find trade partners in 3–4 screens
- Provide direct WhatsApp contact per user and link to condominium group
- Interface fully in pt-BR

**Non-Goals:**
- Authentication system (no email/password/OAuth)
- Push notifications or real-time updates
- Admin panel or moderation tools
- Sticker image support
- Multi-condominium support
- Offline-first / service worker caching (PWA manifest only)

## Decisions

### 1. Phone as unique identity (no auth)
**Decision:** Phone number is the sole unique identifier. On registration, if phone already exists, load that profile.
**Rationale:** Target audience includes elderly and children — any login friction is a dealbreaker. Phone is already the communication channel (WhatsApp).
**Alternative considered:** Magic link via SMS — rejected due to cost and complexity.

### 2. Next.js App Router (single repo, fullstack)
**Decision:** One Next.js app with App Router. Server Actions call Supabase directly from the server.
**Rationale:** No separate API layer needed. Supabase client can be used server-side in Server Components and Server Actions, keeping the codebase small.
**Alternative considered:** Separate Next.js frontend + Express API — rejected as overengineering for this scale.

### 3. Supabase as backend
**Decision:** Supabase (PostgreSQL + PostgREST) for data storage. Use the Supabase JS client in Server Actions.
**Rationale:** Zero backend infrastructure to manage, built-in REST API, free tier sufficient for ~136 apartments.
**Alternative considered:** Firebase Firestore — rejected because PostgreSQL relational queries are a better fit for the matching logic.

### 4. Matching computed on demand (no cache)
**Decision:** Trade matching is computed at query time using a SQL query joining `user_stickers` for both users.
**Rationale:** With ~136 users and 980 stickers, the dataset is tiny. A single query with aggregation is fast enough. No caching layer needed at this scale.
**Alternative considered:** Precomputed match table refreshed on sticker update — rejected as premature optimization.

### 5. Input mode stored per user
**Decision:** Add a `input_mode` column (`have` | `need`) to the `users` table. Mode cannot be changed without clearing sticker data.
**Rationale:** Prevents conflicting states where the system cannot infer which stickers are missing.

### 6. Sticker grid virtualization
**Decision:** Render the 980-item checkbox grid using a CSS grid with Tailwind. No virtualization library.
**Rationale:** 980 simple checkbox elements is well within browser rendering capacity. A virtualization library adds complexity without measurable benefit at this size.
**Alternative considered:** react-window — rejected as unnecessary.

### 7. Deployment on Vercel
**Decision:** Deploy via Vercel with automatic Git integration.
**Rationale:** Zero-config for Next.js, free tier sufficient, fast global CDN.

## Data Model

```sql
-- users
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
name        TEXT NOT NULL
apartment   TEXT NOT NULL          -- 4-digit string, e.g. "0806"
tower       TEXT NOT NULL          -- 1–2 digit string
phone       TEXT NOT NULL UNIQUE   -- WhatsApp number, unique identifier
input_mode  TEXT NOT NULL          -- 'have' | 'need'
created_at  TIMESTAMPTZ DEFAULT now()

-- user_stickers  (boolean ownership — no quantity tracking in V1)
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
sticker_id  INTEGER NOT NULL CHECK (sticker_id BETWEEN 1 AND 980)
UNIQUE (user_id, sticker_id)

-- Indexes
CREATE INDEX idx_user_stickers_user_id    ON user_stickers(user_id);
CREATE INDEX idx_user_stickers_sticker_id ON user_stickers(sticker_id);
```

No separate `stickers` table — sticker IDs are integers 1–980 enforced by constraint.

## Screen Flow (3 screens)

```
[1] Registration      → name / apartment / tower / phone
        ↓
[2] Sticker Input     → choose mode (HAVE / NEED) → file upload or grid
        ↓
[3] Match Results     → ranked list of trade partners with WhatsApp buttons
```

- Condominium WhatsApp group button: persistent in the header across all screens.
- User can navigate back to screen 2 to update their sticker list.

## Matching SQL (pseudocode)

```sql
SELECT
  b.id,
  b.name, b.apartment, b.tower, b.phone,
  COUNT(CASE WHEN bs.sticker_id = ANY(a_missing) THEN 1 END) AS match_score,
  COUNT(CASE WHEN as.sticker_id = ANY(b_missing) THEN 1 END) AS reciprocal_score
FROM users b
JOIN user_stickers bs ON bs.user_id = b.id
WHERE b.id != :current_user_id
GROUP BY b.id
ORDER BY match_score DESC, reciprocal_score DESC;
```

The missing sticker sets are derived from the complement of each user's `user_stickers` rows relative to 1–980.

## Risks / Trade-offs

- **Phone as identity is mutable** → If a user changes their WhatsApp number, they lose their data. Mitigation: document this limitation in the UI; out of scope to solve.
- **No data ownership / deletion** → Any resident can register any phone. Mitigation: acceptable for a community tool; moderation not in scope.
- **Supabase free tier limits** → 500 MB storage, 2 GB bandwidth. At this scale (~136 users × 980 stickers = ~130k rows) this is negligible.
- **Grid UX on very small screens** → 980 checkboxes may require scrolling. Mitigation: add a number-range filter or alphabet grouping if usability testing reveals issues.
- **txt file parsing errors** → Malformed files could confuse users. Mitigation: show clear per-line error messages in pt-BR.

## Resolved Decisions

- **WhatsApp group link:** `https://chat.whatsapp.com/GzQ9pTekgf7E02lTu8nYy2?mode=gi_t` — hardcoded in `NEXT_PUBLIC_WHATSAPP_GROUP_URL`.
- **Duplicate tracking:** Removed from V1. `user_stickers.quantity` column dropped — sticker ownership is boolean (owned or not). Duplicates are out of scope.

## Open Questions

- Is Vercel deployment managed by the developer or handed off to a condominium admin?
