## Context

yvy-stickers is a Next.js (App Router) PWA for FIFA World Cup 2026 sticker trading among residents of YVY Lindóia condominium. Auth is via Supabase session. All server actions use `supabaseAdmin`. Sticker codes follow the pattern `[3-letter section][1-2 digit number]` (e.g. `BRA5`, `FWC00`, `CC3`). Sections are defined in `lib/stickers.ts`. Duplicates (repetidas) are stored in `user_duplicates` with `count` and can be partially reserved by pending trades.

## Goals / Non-Goals

**Goals:**
- Accept sticker want-lists in at least 3 common formats and resolve them to canonical codes
- Show which community users have available duplicates for those codes, grouped by user
- Allow sending a one-directional "I want to buy these" request to one or more users
- Integrate request management into the existing `/trocas` page without breaking the existing trade flow

**Non-Goals:**
- Price negotiation or in-app payment
- Bulk requesting to all matching users at once (user selects per-user)
- Modifying or extending the existing `pending_trades` / `advanced_trades` tables
- Real-time updates (polling or websocket)
- Push notifications (out of scope for now)

## Decisions

### 1. Separate `purchase_requests` table (not reusing `pending_trades`)
**Decision:** New `purchase_requests` table with its own status lifecycle.
**Rationale:** The semantics are fundamentally different — a purchase request has no `giving_ids` (the buyer offers nothing), no partial acceptance flow, and no rollback mechanism. Reusing `pending_trades` would require nullable columns and conditional logic throughout the trade codebase.
**Alternative considered:** Repurpose `pending_trades` with an empty `giving_ids` and a `type` discriminator — rejected because it couples unrelated concepts.

### 2. Flexible parser as a pure utility function (not a server action)
**Decision:** Implement `lib/parseStickerList.ts` as a pure function (no DB, no server), called client-side to show a parse preview before the user submits.
**Rationale:** The parser needs to run immediately on paste (no round-trip) so the user can see what was recognized before querying the community. The server action `searchCommunityDuplicates` receives the already-parsed code list.
**Alternative considered:** Parse on the server — rejected because the preview UX requires instant feedback.

### 3. "Compras" tab in `/trocas` (not a separate page)
**Decision:** Add a "Compras" tab to the existing `/trocas` page (which already has Recebidas/Enviadas tabs).
**Rationale:** Purchase requests are contextually related to trades — same audience, same mental model. A separate `/compras` page would fragment the inbox experience.
**Alternative considered:** Separate `/compras` page — rejected; adds nav clutter for a secondary flow.

### 4. Parser format priority
**Decision:** Try formats in this order per line:
1. `SECTION: num, num, num` (with optional leading emoji + any non-alpha chars stripped) — "other app" format
2. `SECTIONnum xCount` — our repetidas export (count is ignored; we only care about the code)
3. `SECTIONnum` bare code (existing bulk format, space/semicolon/comma-separated)

If a line matches none of these, it is added to `unrecognized[]` and shown to the user as a warning chip.
**Rationale:** Handles the three real-world formats observed. The order matters only for ambiguity resolution, which is minimal given the distinct syntax.

### 5. Available count definition — includes purchase_request reservations
**Decision:** A sticker is "available" from a user if `user_duplicates.count - reserved_count > 0`, where `reserved_count` is the count of that `sticker_id` appearing in:
- active `pending_trades.giving_ids` for that user (status = `pending`), AND
- active `purchase_requests.sticker_ids` for that user as seller (status = `pending`)

Both sources contribute to the reserved total.
**Rationale:** Stickers committed in a pending purchase request are no longer freely available, exactly like stickers in a pending trade. Without this, the same sticker could be simultaneously promised to multiple buyers and a trade partner.
**Impact:** The `searchCommunityDuplicates` query must subtract both reservation sources. The existing `checkStickerAvailability` and `DuplicatesScreen` reserved-count display should also be updated to include purchase_request reservations for consistency.

### 6. Purchase request acceptance effectuates the sticker transfer immediately
**Decision:** When a seller accepts a purchase request, the sticker transfer is effectuated atomically in the same server action: seller's `user_duplicates` is decremented for each sticker, and those stickers are added to the buyer's `user_stickers` (album) for any not already owned.
**Rationale:** Mirrors how `respondToTrade` + `effectuateTrade` work in the existing trade flow. Acceptance means the deal is done — the app should reflect reality. A two-step "agree then confirm" adds friction for no benefit in this community context.
**Alternative considered:** Status-only acceptance (social confirmation, no transfer) — rejected by the product owner. The exchange should be recorded in the app when it happens.

## Data Model

```sql
-- New table
CREATE TABLE purchase_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sticker_ids   TEXT[] NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_requests_buyer  ON purchase_requests(buyer_id);
CREATE INDEX idx_purchase_requests_seller ON purchase_requests(seller_id);
CREATE INDEX idx_purchase_requests_status ON purchase_requests(status);
```

No new columns on existing tables.

## Screen Flow

```
Nav drawer → "Buscar Figurinhas" → /buscar

[/buscar]
  ┌─────────────────────────────────────┐
  │  Paste your want-list               │
  │  ┌──────────────────────────────┐   │
  │  │  <textarea>                  │   │
  │  └──────────────────────────────┘   │
  │  [Buscar]                           │
  │                                     │
  │  Parsed preview (before submit):    │
  │  ✓ 12 figurinhas reconhecidas       │
  │  ⚠ 2 tokens não reconhecidos: ...  │
  │                                     │
  │  Results (after submit):            │
  │  ┌──────────────────────────────┐   │
  │  │ João (apt 0806) — 4 figurinhas│  │
  │  │ [BRA5] [ARG18] [FWC3] [CC7]  │   │
  │  │ [Solicitar estas 4] ↓         │   │
  │  └──────────────────────────────┘   │
  │  ┌──────────────────────────────┐   │
  │  │ Maria (apt 0312) — 2 fig.    │   │
  │  │ [FWC3] [CC7]                 │   │
  │  │ [Solicitar estas 2]          │   │
  │  └──────────────────────────────┘   │
  └─────────────────────────────────────┘

[Solicitar] → confirmation modal
  "Enviar pedido para João de 4 figurinhas?"
  [Cancelar] [Confirmar]
  → creates purchase_request → showSuccess toast
```

```
[/trocas] — "Compras" tab

  Sub-tabs: [Recebidas] [Enviadas]

  Recebidas (seller view):
    ┌─────────────────────────────────────┐
    │ Pedro (apt 1102) quer comprar:      │
    │ [BRA5] [ARG18]                      │
    │ [Recusar] [Aceitar]                 │
    └─────────────────────────────────────┘

  Enviadas (buyer view):
    ┌─────────────────────────────────────┐
    │ Para: João (apt 0806)               │
    │ [BRA5] [ARG18] [FWC3] [CC7]        │
    │ Status: Pendente  [Cancelar]        │
    └─────────────────────────────────────┘
```

## Server Actions

### `actions/searchCommunityDuplicates.ts`
```typescript
type SearchResult = {
  userId: string
  displayName: string
  apartment: string
  tower: string
  availableStickers: string[]  // subset of requested codes this user has available
}

async function searchCommunityDuplicates(
  codes: string[]
): Promise<SearchResult[]>
```

Query strategy: join `user_duplicates` with `profiles`, filter by `sticker_id IN (codes)` and available count > 0, exclude current user, group by user.

### `actions/createPurchaseRequest.ts`
```typescript
type CreatePurchaseResult =
  | { success: true; requestId: string }
  | { success: false; error: string }

async function createPurchaseRequest(input: {
  sellerId: string
  stickerIds: string[]
  message?: string
}): Promise<CreatePurchaseResult>
```

Validates: current user is authenticated, sellerId != buyer, sticker_ids non-empty, no duplicate pending request already exists for same buyer+seller+overlapping stickers.

### `actions/respondToPurchaseRequest.ts`
```typescript
type RespondResult =
  | { success: true }
  | { success: false; error: string }

async function respondToPurchaseRequest(input: {
  requestId: string
  action: 'accept' | 'reject' | 'cancel'  // cancel is buyer-only
}): Promise<RespondResult>
```

On `accept`: atomically (in a transaction or sequential guarded writes via `supabaseAdmin`):
1. Decrement `user_duplicates` for each `sticker_id` in the request (seller side) — remove the row if count reaches 0
2. Upsert each sticker into `buyer_id`'s `user_stickers` (adds to album; skip if already owned)
3. Set `status = 'accepted'`, `updated_at = now()`
4. Log `purchase_request_accepted`

On `reject` / `cancel`: set status only, log audit event.

### `actions/getPurchaseRequests.ts`
```typescript
type PurchaseRequestsResult = {
  incoming: PurchaseRequest[]  // where seller_id = current user
  outgoing: PurchaseRequest[]  // where buyer_id = current user
}

async function getPurchaseRequests(): Promise<PurchaseRequestsResult>
```

## Parser Design (`lib/parseStickerList.ts`)

```typescript
type ParseResult = {
  codes: string[]          // valid, deduplicated sticker codes
  unrecognized: string[]   // tokens that couldn't be resolved
}

function parseStickerList(raw: string): ParseResult
```

**Algorithm:**
1. Split input by newlines
2. For each line:
   a. Strip leading emoji characters and whitespace (regex: `/^[\p{Emoji}\s]+/u`)
   b. Try pattern A: `/^([A-Z]{2,3})\s*:\s*(.+)/i` → section header + number list
      - Extract section (uppercase), split remainder by `,` or `;`, trim → `[SECTION+num, ...]`
   c. Try pattern B: `/^([A-Z]{2,3})(\d{1,2})\s+x\d+/i` → single code with count
      - Extract `SECTION+num`
   d. Try pattern C: tokenize remaining by `,`, `;`, or whitespace → each token as bare code
3. Validate each candidate code against `getAllStickerCodes()` from `lib/stickers.ts`
4. Valid → add to `codes` (deduplicate). Invalid → add to `unrecognized`.

## Audit Logging

All `createPurchaseRequest` and `respondToPurchaseRequest` calls must log via `logAction`:
- `purchase_request_sent` — buyer metadata: `{ sellerId, stickerCount }`
- `purchase_request_accepted` — seller metadata: `{ buyerId, stickerIds }`
- `purchase_request_rejected` — seller metadata: `{ buyerId }`
- `purchase_request_cancelled` — buyer metadata: `{ sellerId }`

## Risks / Trade-offs

- **No reservation on purchase_request**: Stickers requested via purchase_request are not reserved — the same sticker could be in multiple purchase requests simultaneously. Mitigation: show sellers all pending requests together; it's their responsibility to manage availability. This is acceptable given the informal community context.
- **Parser false positives**: Some emoji or characters from WhatsApp messages might produce garbage tokens. Mitigation: the unrecognized preview step lets users catch this before querying.
- **"Compras" tab badge**: Sellers need a visual indicator for incoming requests. The existing pending-trades badge on the hamburger doesn't currently distinguish request types. Mitigation: include purchase_requests count in the same badge total (simple to add, avoids badge proliferation).
