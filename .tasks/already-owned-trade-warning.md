# Feature: Already-Owned Incoming Sticker Warning

## Description

When a user has a pending trade and subsequently acquires a sticker they were going to receive through that trade (e.g., by buying a new pack), the system should:

1. Visually distinguish that sticker in the pending trade UI (red diagonal striped background on the sticker chip)
2. Show a confirmation modal when the user tries to approve the trade, alerting them they already own the incoming sticker and suggesting they reject instead

## Use Case

- User A requests to trade BRA2 with User B's CAN3
- Before User B responds, User A buys a new pack and gets CAN3
- When User A views the pending trade, CAN3 (the sticker they'd receive) now has a red striped background
- If User A tries to approve, a modal warns them they already have CAN3 and suggests rejecting
- The modal offers: "Confirmar mesmo assim" (confirm anyway), "Recusar troca" (reject trade), or dismiss

## Acceptance Criteria

- [ ] Stickers the user already owns that appear in `myReceivingIds` are visually distinguished with a red diagonal striped background
- [ ] The visual treatment applies in both normal `TradeCard` and advanced `TradeCard` (AdvancedTradeScreen)
- [ ] When user clicks approve on a trade containing already-owned incoming stickers, a modal appears
- [ ] Modal clearly states which sticker(s) the user already owns
- [ ] Modal has three actions: "Confirmar mesmo assim", "Recusar troca", dismiss (X or backdrop click)
- [ ] "Confirmar mesmo assim" proceeds with the normal approval flow
- [ ] "Recusar troca" rejects the trade
- [ ] Dismissing the modal returns to the previous state without action
- [ ] Tests cover the detection logic and modal interactions

## Impact on Codebase

### New Files

- `components/trades/AlreadyOwnedWarningModal.tsx` — Modal component
- `actions/checkAlreadyOwnedIncoming.ts` — Server action to check if user owns any incoming stickers
- `__tests__/alreadyOwnedTradeWarning.test.tsx` — Test suite

### Modified Files

- `components/StickerChip.tsx` — Add new `already-owned` variant with red striped background
- `components/trades/StickerList.tsx` — Support highlighting already-owned stickers
- `components/trades/TradeCard.tsx` — Integrate ownership check + modal trigger on approve
- `components/AdvancedTradeScreen.tsx` — Same integration for advanced trades

## Expected Timeline

- Planning: done
- Implementation: ~2-3 hours
- Testing: ~1 hour

## Risks & Mitigations

| Risk                                                                       | Mitigation                                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Race condition: user marks sticker as owned between modal open and confirm | The approval action already has an atomic status check; the modal is purely UX guidance |
| Performance: extra DB call on trade card render                            | Lazy-load ownership check only when trade card is visible or user interacts             |
| Stale data after tab switch                                                | Already handled by existing `handleVisibility` refresh in MatchesScreen                 |

## Dependencies

- Existing `getUserData` action (provides user's owned sticker list)
- Existing `respondToTrade` / `respondToAdvancedTrade` actions
- Existing `StickerChip` component variant system

## Test Cases

1. User owns none of the incoming stickers → no visual change, no modal
2. User owns 1 of N incoming stickers → that sticker has red striped bg, modal on approve
3. User owns ALL incoming stickers → all have striped bg, modal on approve
4. Modal "Confirmar mesmo assim" → proceeds to normal acceptance flow
5. Modal "Recusar troca" → calls reject action
6. Modal dismiss (X/backdrop) → returns to previous state
7. Advanced trade: same behavior applies

## Documentation

- No external docs needed; feature is self-explanatory in the UI
- Inline code: the variant name `already-owned` and modal component are self-documenting

## Technical Approach

### Detection

Create `actions/checkAlreadyOwnedIncoming.ts`:

- Input: `userId`, `receivingIds: string[]`
- Queries `user_stickers` for the user to find which of `receivingIds` are already owned
- Returns `string[]` of already-owned sticker IDs

### Visual Treatment (StickerChip)

Add variant `already-owned` to `StickerChipVariant`:

- Uses CSS `repeating-linear-gradient` with red/transparent diagonal stripes as background
- Maintains readability of the sticker ID text

### Modal Component

`AlreadyOwnedWarningModal`:

- Props: `open`, `alreadyOwnedIds: string[]`, `onConfirm`, `onReject`, `onDismiss`
- Backdrop overlay with centered card
- Lists the already-owned sticker IDs
- Three action buttons

### Integration in TradeCard

- On mount (or when confirming accept), call `checkAlreadyOwnedIncoming`
- Pass `alreadyOwnedIds` to `StickerList` for highlighting
- Before proceeding with accept, if `alreadyOwnedIds.length > 0`, show modal instead
- Modal actions delegate to existing `handle('accept')` or `handle('reject')`

### Integration in AdvancedTradeScreen

- Same pattern: check owned stickers against `myReceivingIds`
- Show modal before `respondToAdvancedTrade(..., 'approve')`
