## 1. Project Setup

- [ ] 1.1 Scaffold Next.js app with App Router, TypeScript, and Tailwind CSS in the repo root (`npx create-next-app@latest .`)
- [ ] 1.2 Install Supabase JS client (`@supabase/supabase-js`)
- [ ] 1.3 Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_WHATSAPP_GROUP_URL`
- [ ] 1.4 Create `lib/supabase.ts` with a typed Supabase client singleton
- [ ] 1.5 Configure `next.config.ts` for PWA manifest support (add `manifest.json` to `/public`)
- [ ] 1.6 Add `public/manifest.json` with app name, icons, `display: standalone`, `start_url: /`

## 2. Database

- [ ] 2.1 Create Supabase project and note connection credentials
- [ ] 2.2 Run migration: create `users` table (`id`, `name`, `apartment`, `tower`, `phone` UNIQUE, `input_mode`, `created_at`)
- [ ] 2.3 Run migration: create `user_stickers` table (`id`, `user_id` FK, `sticker_id` 1–980, UNIQUE(`user_id`, `sticker_id`))
- [ ] 2.4 Create indexes on `user_stickers(user_id)` and `user_stickers(sticker_id)`
- [ ] 2.5 Export TypeScript types from Supabase schema (`supabase gen types typescript`)

## 3. User Registration

- [ ] 3.1 Create `app/page.tsx` as the registration screen (Screen 1)
- [ ] 3.2 Build registration form component with fields: name, apartment (4 digits), tower (1–2 digits), phone
- [ ] 3.3 Implement client-side validation: all fields required, apartment = 4 chars, tower = 1–2 chars
- [ ] 3.4 Implement input normalization (lowercase + trim) before submission
- [ ] 3.5 Create Server Action `actions/registerUser.ts`: upsert user by phone, return existing profile if phone already exists
- [ ] 3.6 Generate and store display key (`name-apartment-tower`) derived on the server
- [ ] 3.7 On successful registration, store user id in `localStorage` and redirect to `/stickers`

## 4. Input Mode Selection

- [ ] 4.1 Create `app/stickers/page.tsx` as Screen 2 (sticker input)
- [ ] 4.2 Build mode selection UI: two clearly labeled cards/buttons — "Vou informar as figurinhas que TENHO" and "Vou informar as figurinhas que PRECISO"
- [ ] 4.3 Create Server Action `actions/setInputMode.ts`: save `input_mode` to `users` table for the current user
- [ ] 4.4 Show a warning/confirmation dialog if user tries to change mode after stickers are already saved

## 5. Sticker Input — File Upload

- [ ] 5.1 Build `FileUpload` component: accepts `.txt` files, reads content client-side
- [ ] 5.2 Implement parser: split by `;`, strip spaces, parse integers, deduplicate
- [ ] 5.3 Validate parsed numbers are within 1–980; collect invalid entries and show error list in pt-BR
- [ ] 5.4 Create Server Action `actions/saveStickers.ts`: delete existing `user_stickers` rows for user, bulk-insert new ones (idempotent replace)
- [ ] 5.5 Show success confirmation after upload with count of stickers saved

## 6. Sticker Input — Grid

- [ ] 6.1 Build `StickerGrid` component: CSS grid of 980 checkboxes labeled 1–980
- [ ] 6.2 Pre-populate grid with user's currently saved stickers on load
- [ ] 6.3 Implement "Save" button that collects all checked sticker IDs and calls `saveStickers` Server Action
- [ ] 6.4 Add a "Select all" / "Clear all" helper for usability
- [ ] 6.5 Verify grid renders and scrolls smoothly on a mobile viewport

## 7. Trade Matching

- [ ] 7.1 Create `app/matches/page.tsx` as Screen 3 (match results)
- [ ] 7.2 Implement `lib/matching.ts`: query all other users' stickers from Supabase and compute `matchScore` and `reciprocalScore` in-process
- [ ] 7.3 Sort results by `matchScore` DESC, then `reciprocalScore` DESC
- [ ] 7.4 Build `MatchCard` component: displays display key, matchScore ("X figurinhas que eu preciso"), reciprocalScore ("X figurinhas que tenho para dar"), and WhatsApp button
- [ ] 7.5 Handle empty state: show pt-BR message when no matches found
- [ ] 7.6 Add "Atualizar minhas figurinhas" button linking back to `/stickers`

## 8. WhatsApp Integration

- [ ] 8.1 Build `WhatsAppButton` component: renders `<a href="https://wa.me/<phone>">` for per-user contact
- [ ] 8.2 Build persistent header with app name and condominium group button (`NEXT_PUBLIC_WHATSAPP_GROUP_URL`)
- [ ] 8.3 Add header to root layout so it appears on all screens

## 9. Testing

- [ ] 9.1 Install and configure Vitest with `@vitejs/plugin-react` and `@testing-library/react` for unit/integration tests
- [ ] 9.2 Install and configure Playwright for E2E tests (`npx playwright install`)
- [ ] 9.3 Unit test `lib/parser.ts`: valid input, semicolon-separated, spaces stripped, deduplication, out-of-range rejection, empty input
- [ ] 9.4 Unit test `lib/normalize.ts`: lowercase, trim, display key format (`name-apartment-tower`)
- [ ] 9.5 Unit test `lib/matching.ts`: correct matchScore, correct reciprocalScore, sort order (primary + tiebreaker), empty result when no overlap
- [ ] 9.6 Integration test `actions/registerUser.ts`: new user created, duplicate phone returns existing user, missing fields rejected (mock Supabase client)
- [ ] 9.7 Integration test `actions/saveStickers.ts`: stickers inserted, re-submission replaces previous data idempotently (mock Supabase client)
- [ ] 9.8 E2E test — Registration flow: fill form with valid data → redirected to `/stickers`
- [ ] 9.9 E2E test — Sticker input via file upload: upload valid `.txt` → success confirmation shown
- [ ] 9.10 E2E test — Full happy path: register → select mode → upload file → view matches → WhatsApp button has correct `href`
- [ ] 9.11 Configure Vitest coverage reporter; verify overall coverage is ≥ 80%

## 10. Polish & QA

- [ ] 10.1 Verify all user-facing strings are in pt-BR
- [ ] 10.2 Test full flow on a real mobile device (registration → sticker input → matches → WhatsApp tap)
- [ ] 10.3 Test file upload with valid, out-of-range, and malformed inputs
- [ ] 10.4 Test mode conflict: attempt to switch mode after stickers are saved
- [ ] 10.5 Test duplicate phone registration loads existing profile
- [ ] 10.6 Verify PWA installability (manifest + HTTPS)

## 11. Deployment

- [ ] 11.1 Create Vercel project linked to the GitHub repository
- [ ] 11.2 Set environment variables on Vercel (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `WHATSAPP_GROUP_URL`)
- [ ] 11.3 Deploy and verify production URL works end-to-end
- [ ] 11.4 Share production URL with YVY Lindóia residents
