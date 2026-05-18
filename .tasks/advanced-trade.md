# Advanced Trade (Troca Triangular)

## Feature Name

Advanced Trade — 3-person circular sticker exchange

## Description

A fully automated 3-person trade where no user picks stickers. The system finds circular trade opportunities where:

- User A has duplicates User B needs, but B has nothing for A
- User B has duplicates User C needs, but C has nothing for B
- User C has duplicates User A needs, but A has nothing for C

The system proposes the optimal circular exchange and each user can only APPROVE or REJECT — no sticker selection required.

## How It Differs From Normal Trades

| Aspect            | Normal Trade        | Advanced Trade                                                 |
| ----------------- | ------------------- | -------------------------------------------------------------- |
| Participants      | 2                   | 3                                                              |
| Sticker selection | Manual by initiator | Automatic by algorithm                                         |
| Approval flow     | Receiver approves   | All 3 must approve                                             |
| Menu visibility   | Everyone            | Only users who are part of a valid cycle (computed at runtime) |
| Initiation        | Any user, any time  | System proposes; user requests matching                        |

## Eligibility (Runtime Computation)

**There is no `advanced_trade_enabled` column or static opt-in.** Eligibility is computed dynamically:

A user is eligible for the "Troca Avançada" menu item if and only if they are currently part of **at least one valid 3-person cycle** based on live duplicate/sticker data. This is evaluated at runtime every time the user loads the app (via `getAdvancedTradeEligibility`).

This means:

- The menu appears/disappears as users add/remove duplicates or complete trades
- No admin action is needed to "enable" a user
- No desync risk — the source of truth is always the current sticker state

### Performance Strategy

Since checking all possible triples is O(n³) in the worst case, the eligibility check uses a **lightweight pre-filter**:

1. For the current user, find who has unreserved duplicates they need → set `potentialGivers`
2. Find who needs their unreserved duplicates → set `potentialReceivers`
3. Check if any user in `potentialReceivers` has unreserved duplicates that any user in `potentialGivers` needs (closing the cycle)
4. If at least one such cycle exists → eligible

This avoids brute-forcing all triples and short-circuits as soon as one valid cycle is found.

## Acceptance Criteria

1. The "Troca Avançada" menu item only appears for users who are part of at least one valid 3-person cycle (computed at runtime from live data)
2. A matching algorithm finds the best 3-person circular trade for a requesting user
3. The trade proposal shows all 3 participants what they give and receive — no picking
4. All 3 participants must APPROVE for the trade to execute
5. If any participant REJECTS, the proposal is cancelled for all
6. Stickers committed to a pending advanced trade are reserved (same rule as normal trades)
7. Only unreserved duplicates are considered by the matching algorithm
8. The effectuation logic reuses the existing `effectuateTrade` mechanics (decrement/add per user)
9. Audit logging covers: `advanced_trade_proposed`, `advanced_trade_approved`, `advanced_trade_rejected`, `advanced_trade_executed`

---

## Implementation Plan

### Phase 1: Database Schema

**Migration file**: `supabase/migrations/013_advanced_trade.sql`

```sql
CREATE TABLE IF NOT EXISTS advanced_trades (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  -- Participants (always exactly 3, in cycle order: A→B→C→A)
  user_a_id       uuid        NOT NULL REFERENCES users(id),
  user_b_id       uuid        NOT NULL REFERENCES users(id),
  user_c_id       uuid        NOT NULL REFERENCES users(id),
  -- What each gives (to the next in cycle)
  a_gives_ids     text[]      NOT NULL DEFAULT '{}',  -- A gives to B
  b_gives_ids     text[]      NOT NULL DEFAULT '{}',  -- B gives to C
  c_gives_ids     text[]      NOT NULL DEFAULT '{}',  -- C gives to A
  -- Approval state per user
  user_a_status   text        NOT NULL DEFAULT 'pending' CHECK (user_a_status IN ('pending', 'approved', 'rejected')),
  user_b_status   text        NOT NULL DEFAULT 'pending' CHECK (user_b_status IN ('pending', 'approved', 'rejected')),
  user_c_status   text        NOT NULL DEFAULT 'pending' CHECK (user_c_status IN ('pending', 'approved', 'rejected')),
  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  requested_by    uuid        NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS advanced_trades_user_a_idx ON advanced_trades(user_a_id);
CREATE INDEX IF NOT EXISTS advanced_trades_user_b_idx ON advanced_trades(user_b_id);
CREATE INDEX IF NOT EXISTS advanced_trades_user_c_idx ON advanced_trades(user_c_id);
CREATE INDEX IF NOT EXISTS advanced_trades_status_idx ON advanced_trades(status);
```

No changes to the `users` table — eligibility is computed at runtime.

### Phase 2: Matching Algorithm

**File**: `lib/advancedMatching.ts`

Two exported functions:

#### `checkAdvancedTradeEligibility(userId: string): Promise<boolean>`

Lightweight check — does at least one valid cycle exist for this user?

1. Load the user's needed stickers and unreserved duplicates
2. Find `potentialGivers`: other approved users who have unreserved dupes matching user's needs
3. Find `potentialReceivers`: other approved users who need user's unreserved dupes
4. For each receiver R in `potentialReceivers`, check if any giver G in `potentialGivers` needs R's unreserved dupes
5. Return `true` on first valid cycle found; `false` if none exist

This is O(n²) worst case but short-circuits early.

#### `findBestAdvancedTrade(userId: string): Promise<AdvancedTradeProposal | null>`

Full computation — find the highest-scoring cycle and return it.

1. Load all approved users with their stickers, duplicates, and pending reservations (from both `pending_trades` AND `advanced_trades`)
2. For the requesting user (A), compute their needed set and available-dupes set
3. For every pair (B, C) of other users where:
   - A has available dupes that B needs (A→B leg)
   - B has available dupes that C needs (B→C leg)
   - C has available dupes that A needs (C→A leg)
4. Score = `min(A→B count, B→C count, C→A count)` (bottleneck determines trade size)
5. Select the top-scoring triple; cap all legs to the bottleneck count (balanced trade)
6. Within each leg, select stickers by: non-chrome first, then alphabetical
7. Return the proposal or null

**Key constraints**:

- Minimum 1 sticker per leg
- All legs same count (balanced)
- Only considers unreserved duplicates (excluding both normal + advanced pending trades)
- All participants must be `approved = true`

### Phase 3: Server Actions

#### `actions/getAdvancedTradeEligibility.ts`

- Input: `userId`
- Calls `checkAdvancedTradeEligibility`
- Returns `{ eligible: boolean }`
- Used by Header to show/hide menu item

#### `actions/findAdvancedTrade.ts`

- Input: `userId`
- Calls `findBestAdvancedTrade`
- If found: creates a row in `advanced_trades` with status `pending`, auto-approves the requester's slot
- Returns the proposal details or `{ found: false }`

#### `actions/getAdvancedTrades.ts`

- Input: `userId`
- Returns all advanced trades where the user is a participant (pending + recently accepted)
- Normalizes perspective: "what I give", "what I receive", "who I give to", "who gives to me"

#### `actions/respondToAdvancedTrade.ts`

- Input: `tradeId`, `userId`, `action: 'approve' | 'reject'`
- Validates user is a participant and trade is still pending
- Updates the user's individual status column
- If action is `reject`: sets overall status to `rejected`
- If action is `approve` and all 3 are now approved:
  - Re-validates sticker availability (guards against races)
  - Calls `effectuateAdvancedTrade`
- Atomic guard on the status transition

#### `actions/effectuateAdvancedTrade.ts`

- Reuses the decrement/add logic pattern from `effectuateTrade`
- Processes three legs:
  - Decrement A's dupes for `a_gives_ids`, add to B's collection
  - Decrement B's dupes for `b_gives_ids`, add to C's collection
  - Decrement C's dupes for `c_gives_ids`, add to A's collection
- Sets status to `accepted`, records `accepted_at`

### Phase 4: Frontend

#### Page: `app/advanced-trade/page.tsx`

- SSR-compatible shell that loads the client component

#### Component: `components/AdvancedTradeScreen.tsx`

- **No pending proposal** → Shows explanation text + "Buscar Troca Avançada" button
- **Searching** → Loading spinner
- **No match found** → Friendly message ("Nenhuma troca triangular disponível no momento")
- **Pending proposal** → Shows the triangle visualization:
  - Three cards showing each leg (who gives what to whom)
  - Current user's action: Approve / Reject buttons
  - Status of other participants (approved ✓ / pending ⏳ / rejected ✗)
- **Completed** → Success summary

#### Header update: `components/Header.tsx`

- Add "Troca Avançada" menu item
- Only visible when `getAdvancedTradeEligibility` returns `{ eligible: true }`
- Badge shows pending proposals awaiting user's response

### Phase 5: Reservation Integration

Existing code that computes reservations must also account for `advanced_trades`:

- `lib/matching.ts` (`getMatches`): include stickers from pending advanced trades in the reserved counts
- `actions/createTradeRequest.ts`: include advanced trade reservations when checking availability
- `lib/advancedMatching.ts`: self-referential — exclude stickers already in other pending advanced trades

The reservation query pattern:

```
For user X, reserved stickers =
  stickers X gives in pending normal trades +
  stickers X gives in pending advanced trades
```

### Phase 6: Tests

- `__tests__/advancedMatching.test.ts` — unit tests for eligibility check and matching algorithm
- `__tests__/advancedTrade.test.ts` — unit tests for server actions (create, respond, effectuate)
- Edge cases:
  - User has no valid triples → eligibility = false, menu hidden
  - Sticker becomes unavailable between proposal and last approval (race) → effectuation fails gracefully, proposal cancelled
  - One user rejects → whole trade cancelled
  - User is part of multiple advanced trades simultaneously with different stickers
  - Normal trade accepted reduces dupes → advanced trade eligibility changes dynamically
  - All three approve simultaneously (race) → only one effectuation runs

---

## Expected Impact on Codebase

- New table `advanced_trades` (no changes to `users`)
- 4–5 new server actions
- 1 new matching library (`lib/advancedMatching.ts`)
- 1 new page + 1 new component
- Modifications to `Header.tsx` (conditional menu item)
- Modifications to `lib/matching.ts` (reservation awareness for advanced trades)
- Modifications to `actions/createTradeRequest.ts` (reservation awareness)
- Modifications to `lib/database.types.ts` (type updates)

## Expected Timeline

- Phase 1 (Schema): ~20 min
- Phase 2 (Algorithm): ~2 hours
- Phase 3 (Actions): ~2 hours
- Phase 4 (Frontend): ~2 hours
- Phase 5 (Integration): ~1 hour
- Phase 6 (Tests): ~2 hours

## Risks and Mitigations

| Risk                                                  | Mitigation                                                                                                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eligibility check too slow for Header render          | The pre-filter approach is O(n²) worst case but short-circuits early. For <100 users in a condo app this is fast (<200ms). Can add a brief client-side cache if needed. |
| Race: sticker reserved between find and last approval | Re-validate availability at effectuation time; if unavailable, set status to `cancelled` with error                                                                     |
| Stale proposals lingering forever                     | Check age on load; auto-expire proposals older than 48h                                                                                                                 |
| Three-way reservation conflict with normal trades     | Both systems query the same reservation pool — if a sticker is committed anywhere, it's excluded everywhere                                                             |
| Algorithm finds suboptimal trade                      | The balanced-leg approach (min of all legs) is deterministic and fair — no user gives more than they receive                                                            |

## Dependencies

- Existing `effectuateTrade` decrement/add logic (reused)
- Existing reservation queries in `getMatches` and `createTradeRequest`
- No admin action required — purely data-driven eligibility

## Test Cases

1. Happy path: 3 users, all approve → stickers transferred correctly
2. One user rejects → status = rejected, no sticker movement
3. Algorithm finds no valid triple → eligibility = false, menu hidden
4. Sticker becomes unavailable before effectuation → error, proposal cancelled
5. Non-eligible user cannot access the page (no valid cycles)
6. Stickers reserved in advanced trade don't appear in normal trade matching
7. Multiple concurrent approvals (race) → only one effectuation runs
8. User completes a normal trade → advanced trade eligibility recalculated dynamically
9. User in two advanced trades with different stickers → both valid
10. Balanced trade: if A→B has 5 stickers, B→C has 3, C→A has 7 → all legs capped at 3

## Documentation

- INSTRUCOES.md: new section explaining "Troca Avançada"
- In-app explanation text on the advanced trade screen

## Potential Technical Debt

- The eligibility check runs on every page load via the Header. For <100 users this is fine; if scale grows, consider a materialized view or a short TTL cache.
- `effectuateAdvancedTrade` processes 3 legs sequentially. Partial failure mid-way could leave inconsistent state. For a condo app the risk is low; a proper DB transaction would be more robust but Supabase JS client doesn't support multi-statement transactions natively.
- The algorithm always picks the single best triple. In theory, multiple non-overlapping triples could be proposed simultaneously — that's a future enhancement.

---

## Next Steps

- [ ] Confirm plan with user
- [ ] Implement Phase 1 (migration)
- [ ] Implement Phase 2 (algorithm)
- [ ] Implement Phase 3 (actions)
- [ ] Implement Phase 4 (frontend)
- [ ] Implement Phase 5 (reservation integration)
- [ ] Implement Phase 6 (tests)
