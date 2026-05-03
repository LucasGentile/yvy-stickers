## Why

Residents of the YVY Lindóia condominium (~136 apartments) currently coordinate FIFA World Cup 2026 sticker trades via chaotic WhatsApp messages, making it hard to find good matches. A purpose-built PWA will replace this with a structured, fast, and accessible trading system for all age groups.

## What Changes

- New application from scratch — no existing codebase
- PWA built with Next.js (App Router), TypeScript, Tailwind CSS
- Supabase (PostgreSQL) as backend/database
- No traditional authentication — phone number is the unique identifier
- Users register with name, apartment, tower, and WhatsApp phone
- Users manage their sticker collection (1–980) via file upload or grid selection
- System infers missing stickers automatically based on input mode
- Matching engine ranks other users by how many stickers they can trade
- Direct WhatsApp contact per user + link to condominium group
- Interface entirely in Brazilian Portuguese (pt-BR)

## Capabilities

### New Capabilities

- `user-registration`: User self-registration using name, apartment, tower, and phone (unique identifier). No password. Inputs normalized (lowercase, trimmed). Display key: `name-apartment-tower`.
- `sticker-collection`: Manage owned stickers (1–980) and duplicate quantities. Supports two input modes: "I have" (system infers missing) and "I need" (system infers owned).
- `sticker-input`: Two input methods — plain text file upload (`;`-separated numbers) and interactive checkbox grid (mobile-friendly).
- `trade-matching`: For each user pair, compute `matchScore` (stickers the other has that I need) and `reciprocalScore` (stickers I have that they need). Rank results descending by both scores.
- `whatsapp-contact`: Per-user button linking to `https://wa.me/<phone>` and a persistent button to the YVY Lindóia condominium WhatsApp group.

### Modified Capabilities

<!-- none — greenfield project -->

## Impact

- **New database tables**: `users`, `stickers`, `user_stickers`
- **New Next.js app**: 3–4 screens, App Router, TypeScript, Tailwind CSS
- **Supabase project**: PostgreSQL + REST API, indexed on `user_id` and `sticker_id`
- **No external auth provider** required
- **Deployment**: Vercel (recommended for Next.js PWA)
