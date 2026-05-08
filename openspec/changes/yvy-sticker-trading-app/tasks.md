## 1. Project Setup

- [x] 1.1 Scaffold Next.js app with App Router, TypeScript, and Tailwind CSS in the repo root (`npx create-next-app@latest .`)
- [x] 1.2 Install Supabase JS client (`@supabase/supabase-js`)
- [x] 1.3 Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_WHATSAPP_GROUP_URL`
- [x] 1.4 Create `lib/supabase.ts` with a typed Supabase client singleton
- [x] 1.5 Configure `next.config.ts` for PWA manifest support (add `manifest.json` to `/public`)
- [x] 1.6 Add `public/manifest.json` with app name, icons, `display: standalone`, `start_url: /`

## 2. Database

- [x] 2.1 Create Supabase project and note connection credentials
- [x] 2.2 Run migration: create `users` table (`id`, `name`, `apartment`, `tower`, `phone` UNIQUE, `input_mode`, `created_at`)
- [x] 2.3 Run migration: create `user_stickers` table (`id`, `user_id` FK, `sticker_id` 1–980, UNIQUE(`user_id`, `sticker_id`))
- [x] 2.4 Create indexes on `user_stickers(user_id)` and `user_stickers(sticker_id)`
- [x] 2.5 Export TypeScript types from Supabase schema (`supabase gen types typescript`)
- [x] 2.6 Migration 007: create `audit_log` table (`id`, `user_id` FK, `action`, `metadata` jsonb, `created_at`) with index on `(user_id, created_at DESC)`

## 3. User Registration

- [x] 3.1 Create `app/page.tsx` as the registration screen (Screen 1)
- [x] 3.2 Build registration form component with fields: name, apartment (4 digits), tower (1–2 digits), phone
- [x] 3.3 Implement client-side validation: all fields required, apartment = 4 chars, tower = 1–2 chars, phone 10–11 digits, name requires surname
- [x] 3.4 Implement input normalization (lowercase + trim) before submission
- [x] 3.5 Create Server Action `actions/registerUser.ts`: upsert user by phone, return existing profile if phone already exists
- [x] 3.6 Generate and store display key (`name-apartment-tower`) derived on the server
- [x] 3.7 On successful registration, store user id in `localStorage` and redirect to `/stickers`

## 4. Input Mode Selection

- [x] 4.1 Create `app/stickers/page.tsx` as Screen 2 (sticker input)
- [x] 4.2 Build mode selection UI: two clearly labeled cards/buttons — "Vou informar as figurinhas que TENHO" and "Vou informar as figurinhas que PRECISO"
- [x] 4.3 Create Server Action `actions/setInputMode.ts`: save `input_mode` to `users` table for the current user
- [x] 4.4 Show a warning/confirmation dialog if user tries to change mode after stickers are already saved

## 5. Sticker Input — File Upload

- [x] 5.1 Build `FileUpload` component: accepts `.txt` files, reads content client-side
- [x] 5.2 Implement parser: split by `;`, strip spaces, parse integers, deduplicate
- [x] 5.3 Validate parsed numbers are within 1–980; collect invalid entries and show error list in pt-BR
- [x] 5.4 Create Server Action `actions/saveStickers.ts`: delete existing `user_stickers` rows for user, bulk-insert new ones (idempotent replace)
- [x] 5.5 Show success confirmation after upload with count of stickers saved

## 6. Sticker Input — Grid

- [x] 6.1 Build `StickerGrid` component: CSS grid of checkboxes organized by team with flag icons
- [x] 6.2 Pre-populate grid with user's currently saved stickers on load
- [x] 6.3 Implement "Save" button that collects all checked sticker IDs and calls `saveStickers` Server Action
- [x] 6.4 Add "Marcar todos" / "Desmarcar todos" per section with undo toast
- [x] 6.5 Verify grid renders and scrolls smoothly on a mobile viewport
- [x] 6.6 Completion counter in footer showing `owned/total` stickers
- [x] 6.7 Unsaved changes guard: `beforeunload` warning and amber banner above save button

## 7. Trade Matching

- [x] 7.1 Create `app/matches/page.tsx` as Ranking de Trocas screen
- [x] 7.2 Implement `lib/matching.ts`: query all other users' stickers from Supabase and compute `matchScore`, `reciprocalScore`, and `mutualScore` in-process
- [x] 7.3 Sort results by `mutualScore` DESC, then total DESC, then `matchScore` DESC
- [x] 7.4 Build `MatchCard` component: shows match scores, "Realizar Troca" primary button, discrete WhatsApp link
- [x] 7.5 Handle empty state: show pt-BR message when no matches found
- [x] 7.6 Trade modal: two-step flow (select stickers → confirm → send); centered overlay
- [x] 7.7 Pending trades UI: received/sent tabs, accept/reject/cancel actions with server-side effectuation

## 8. Navigation & Header

- [x] 8.1 Hamburger menu replacing header nav tabs: slide-in drawer overlay
- [x] 8.2 Drawer contains all nav links, font size controls (A / A+ / A++), and WhatsApp group link
- [x] 8.3 Pending trades badge on hamburger button (red dot with count)
- [x] 8.4 Header sticky at top with correct z-index stacking (header z-70, drawer z-60)
- [x] 8.5 Drawer closes on navigation and can be toggled open/close via hamburger

## 9. New Screens

- [x] 9.1 Ranking do Álbum (`/ranking`): all users sorted by completion %, gold/silver/bronze medals for top 3, progress bar per user
- [x] 9.2 Faltantes (`/missing`): missing stickers list with search/filter by country or code
- [x] 9.3 Histórico (`/historico`): last 50 audit log entries, day-grouped, color-coded by event type, ⚑ real-life checklist hints for physical album actions

## 10. Repetidas UX

- [x] 10.1 Inline steppers on list items: `−` · count · `+` · `✕` without page navigation
- [x] 10.2 Undo toast on decrement and remove (5-second window)
- [x] 10.3 `DuplicatePicker`: team panel stays open after saving so user can pick next sticker immediately
- [x] 10.4 Gold count badges on sticker grid buttons showing existing duplicate quantities
- [x] 10.5 Pre-fills stepper with current count when tapping a sticker that already has duplicates

## 11. Audit Log

- [x] 11.1 `actions/logAction.ts`: fire-and-forget helper that never blocks calling actions
- [x] 11.2 Instrumented in: `saveStickers`, `createTradeRequest`, `respondToTrade`, `upsertDuplicate`, `removeDuplicate`
- [x] 11.3 `actions/getAuditLog.ts`: fetches last 50 entries for a user ordered by date desc
- [x] 11.4 `AuditScreen`: EVENT_CONFIG map with icon, colors, label/detail/realLifeHint per event type

## 12. Testing

- [x] 12.1 Vitest v2 + React Testing Library + jsdom configured (Node 20 compatible)
- [x] 12.2 `vitest.config.mts` (ESM) — eliminates CJS deprecation warning
- [x] 12.3 Unit tests: `normalize`, `parser`, `matching` (5 tests each)
- [x] 12.4 Integration tests: `registerUser`, `saveStickers`, `pendingTrades`/`createTradeRequest`/`respondToTrade`
- [x] 12.5 Integration tests: `logAction`, `getAuditLog` (7 tests)
- [x] 12.6 Component tests: `AuditScreen` — all UI states, event rendering, real-life hints (7 tests)
- [x] 12.7 Total: 59 tests across 8 files, all passing

## 13. Polish & QA

- [x] 13.1 All user-facing strings in pt-BR
- [x] 13.2 PWA icon: cropped, centered on brand green background, no emoji artifacts
- [x] 13.3 Page-level h2 titles: left accent bar + text shadow for green-on-white visibility
- [x] 13.4 Font size preference persisted in localStorage and applied on load
- [x] 13.5 Phone input: numeric keyboard, strips non-digits, validates 10–11 digits on blur
- [ ] 13.6 Test full flow on a real mobile device (registration → sticker input → matches → WhatsApp tap)
- [ ] 13.7 Verify PWA installability (manifest + HTTPS) on iOS Safari and Android Chrome

## 14. Deployment

- [x] 14.1 Vercel project linked to repository
- [x] 14.2 Environment variables set on Vercel
- [x] 14.3 Deploy via `vercel deploy --prod` (not CI/CD pipeline)
- [x] 14.4 Production URL live: https://yvy-stickers.vercel.app
- [ ] 14.5 Share production URL with all YVY Lindóia residents
