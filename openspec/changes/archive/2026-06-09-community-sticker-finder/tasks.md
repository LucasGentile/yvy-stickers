## 1. Database Migration

- [x] 1.1 Create `supabase/migrations/<next-number>_add_purchase_requests.sql` — `CREATE TABLE purchase_requests` with all columns, constraints, and indexes as defined in design.md. Never edit existing migration files.
- [x] 1.2 Add `purchase_requests` types to `lib/database.types.ts` (Row, Insert, Update shapes)
- [x] 1.3 Instruct user to run `supabase db push` to apply the migration

## 2. Parser

- [x] 2.1 Create `lib/parseStickerList.ts` — pure function `parseStickerList(raw: string): ParseResult` implementing the 3-format algorithm from design.md. Use `getAllStickerCodes()` (or equivalent) from `lib/stickers.ts` for validation.
- [x] 2.2 Write unit tests in `__tests__/parseStickerList.test.ts` covering: other-app format with emoji, our repetidas export format, bare code list (semicolon/comma/newline), mixed format input, unrecognized tokens, empty input, duplicate deduplication

## 3. Server Actions

- [x] 3.1 Create `actions/searchCommunityDuplicates.ts` — query `user_duplicates` joined with `profiles`, filter by `sticker_id IN (codes)` and available count > 0, exclude current user, group and return `SearchResult[]`. Reserved count = stickers in active `pending_trades.giving_ids` + stickers in active `purchase_requests.sticker_ids` (both status = `pending`) for each user as seller.
- [x] 3.2 Create `actions/createPurchaseRequest.ts` — validate auth, sellerId != buyer, non-empty stickers, insert into `purchase_requests`, log `purchase_request_sent` via `logAction`. Block UI rules apply (return typed result).
- [x] 3.3 Create `actions/respondToPurchaseRequest.ts` — accept/reject (seller only) / cancel (buyer only) with ownership check. On **accept**: decrement seller's `user_duplicates` for each sticker (remove row if count reaches 0), upsert each sticker into buyer's `user_stickers` (skip if already owned), set status + updated_at, log `purchase_request_accepted`. On reject/cancel: set status only, log audit event.
- [x] 3.4 Create `actions/getPurchaseRequests.ts` — return `{ incoming, outgoing }` for the current user, filtering terminal statuses (accepted/rejected/cancelled) to show only last 30 days for history

## 4. `/buscar` Page

- [x] 4.1 Create `app/buscar/page.tsx` — server component wrapper (requires auth, similar to other protected pages)
- [x] 4.2 Create `components/CommunitySearchScreen.tsx` — client component with:
  - Textarea for pasting the want-list
  - Live parse preview on paste/change (calls `parseStickerList` client-side): shows recognized count chip and unrecognized warning chips
  - "Buscar" button (disabled when 0 valid codes parsed) — calls `searchCommunityDuplicates` server action; shows loading state
  - Results section: one card per matching user showing their displayName, apartment, available sticker chips, and "Solicitar" button
  - Empty state when no community user has any of the requested stickers
- [x] 4.3 Create `components/PurchaseRequestModal.tsx` — confirmation modal triggered by "Solicitar" button: shows seller name, sticker chip list, optional message textarea, [Cancelar] / [Confirmar] buttons with pending state; calls `createPurchaseRequest`; shows `showSuccess` / `showError` notification on completion
- [x] 4.4 Prevent sending a request to the same seller while a previous one is still pending (disable "Solicitar" and show a tooltip "Pedido já enviado")

## 5. `/trocas` — "Compras" Tab

- [x] 5.1 Add `purchase_requests` to the data fetched in the `/trocas` page (call `getPurchaseRequests`)
- [x] 5.2 Add "Compras" tab alongside existing tabs in the trades page UI
- [x] 5.3 Create `components/PurchaseRequestCard.tsx` — renders a single purchase request:
  - Seller view (incoming): buyer name + apartment, sticker chips, [Recusar] / [Aceitar] buttons with pending state + `showSuccess`/`showError` notifications
  - Buyer view (outgoing): seller name + apartment, sticker chips, status badge (Pendente / Aceito / Recusado), [Cancelar] button when status is pending
- [x] 5.4 Include pending purchase_requests count in the hamburger badge total (alongside pending trades count)

## 6. Reservation backfill — existing availability surfaces

- [x] 6.1 Update `actions/checkStickerAvailability.ts` and `actions/checkStickerListAvailability.ts` — add `purchase_requests` to the reserved-count calculation (same logic as task 3.1) so the Verificar Figurinha screen reflects purchase_request reservations
- [x] 6.2 Update `DuplicatesScreen.tsx` reserved-count display — the per-sticker "X reservada(s)" badge must also count active purchase_requests where that sticker is in `sticker_ids` and the current user is the seller

## 7. Navigation

- [x] 7.1 Add "Buscar Figurinhas" link to the nav drawer (between "Verificar Figurinha" and "Trocas", or at a sensible position)

## 8. Audit Log Display

- [x] 8.1 Add `purchase_request_sent`, `purchase_request_accepted`, `purchase_request_rejected`, `purchase_request_cancelled` entries to `EVENT_CONFIG` in `AuditScreen` (icon, colors, label, detail formatter in pt-BR)

## 9. Tests

- [x] 9.1 Implement `lib/parseStickerList.ts` until all cases in `__tests__/parseStickerList.test.ts` pass — test file is already written with 30+ cases across 5 groups (Format A emoji headers, Format B repetidas export, Format C bare codes, mixed formats, edge cases)
- [x] 9.2 Integration tests for `createPurchaseRequest`: happy path, duplicate pending request, sellerId == buyerId guard
- [x] 9.3 Integration tests for `respondToPurchaseRequest`: accept (verifies seller duplicate decremented + buyer sticker added to album), reject, cancel, wrong-user ownership check, accept when seller duplicate count was exactly 1 (row removed)
- [x] 9.4 Integration tests for `searchCommunityDuplicates`: returns users with available stickers, excludes current user, excludes stickers fully reserved by pending_trades, excludes stickers fully reserved by pending purchase_requests, sticker reserved by both sources counts correctly
