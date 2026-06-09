## Why

Residents frequently receive sticker want-lists from neighbors or people in the condominium group — screenshots, WhatsApp forwards, or exports from other apps — but currently have no way to cross-reference those lists against who in the community has available duplicates. This forces manual, error-prone searching through individual profiles. A dedicated community search screen closes that gap: paste a list, instantly see who has what, and send a one-directional purchase request to those users.

## What Changes

- New page `/buscar` ("Buscar Figurinhas") accessible from the main nav drawer
- Flexible multi-format sticker list parser (handles at least 3 common formats including the dominant "other-app" format and our own repetidas export)
- Server action to query which community users have available duplicates for a given set of sticker codes
- New `purchase_requests` database table for one-directional "I want to buy these from you" requests
- Purchase request management integrated into the existing `/trocas` page (new "Compras" tab)
- Notifications for sellers when they receive a new purchase request

## Capabilities

### New Capabilities

- `flexible-list-parser`: Parse sticker want-lists in multiple formats into a canonical list of sticker codes. Formats supported: (1) `SECTION: num, num, num` with optional emoji prefix (other-app format), (2) `SECTIONnum xCount` (our repetidas export), (3) semicolon/comma/newline-separated codes (existing bulk lookup format). Returns parsed codes plus a list of unrecognized tokens so the user can review.
- `community-duplicate-search`: Given a list of sticker codes, find all other users who have at least one of those stickers available (count > reserved). Returns results grouped by user with the subset of requested stickers they hold.
- `purchase-request`: One-directional request from a buyer to a seller for a specific set of sticker codes. Statuses: `pending`, `accepted`, `rejected`, `cancelled`. No reciprocal exchange is committed; the seller decides whether to proceed and can initiate a normal trade request from the acceptance flow.

### Modified Capabilities

- `trade-inbox`: The `/trocas` page gains a "Compras" tab alongside the existing Recebidas/Enviadas tabs, showing incoming and outgoing purchase requests.

## Impact

- **New database table**: `purchase_requests` (`id`, `buyer_id`, `seller_id`, `sticker_ids[]`, `status`, `message`, `created_at`, `updated_at`)
- **New migration file**: append-only, nullable/defaulted columns only
- **New page**: `app/buscar/page.tsx` + `components/CommunitySearchScreen.tsx`
- **New server actions**: `actions/parseStickerList.ts`, `actions/searchCommunityDuplicates.ts`, `actions/createPurchaseRequest.ts`, `actions/respondToPurchaseRequest.ts`
- **Modified**: `/trocas` page — add "Compras" tab; nav drawer — add "Buscar" link
- **No changes** to existing trade, duplicate, or album logic
