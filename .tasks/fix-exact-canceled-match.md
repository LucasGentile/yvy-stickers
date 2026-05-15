# Fix: Exact-match canceled trade detection

## Description
Change the "previously canceled" indicator to only show when the exact sticker combination (giving + receiving) matches a previously canceled/rejected trade between the same two users. Also add a confirmation step in the trade modal when the user selects the same stickers as a previously canceled trade.

## Acceptance Criteria
- Badge on MatchCard only shows if the exact set of stickers currently available to trade was previously canceled between the same pair
- In the modal, when clicking "confirm trade", if the selected stickers match a previously canceled trade, show a warning asking for explicit confirmation
- The data layer fetches `giving_ids` and `receiving_ids` alongside the user IDs for canceled trades
- The comparison is set-equality (order-independent)

## Plan
1. Update `lib/matching.ts`:
   - Fetch `giving_ids, receiving_ids` in the canceled trades query
   - Change `previouslyCanceled: boolean` → `canceledTrades: CanceledTradeDetail[]` on MatchResult (array of matching canceled trades for that pair with their sticker sets)
2. Update `MatchCard.tsx`:
   - Badge logic: show only if any canceled trade's sticker set is a subset of current available stickers
   - Modal confirmation: when user clicks confirm, check if the selected giving+receiving matches a canceled trade; if so, show a warning before proceeding
3. Create a server action `checkCanceledTradeMatch` to verify at trade-creation time (or do it client-side from the data already loaded)
4. Update tests

## Impact
- `lib/matching.ts` — query + type changes
- `components/MatchCard.tsx` — badge + modal confirmation logic
- `__tests__/canceledIndicator.test.ts` — update expectations
- `__tests__/matchCardCanceled.test.tsx` — update/rewrite
