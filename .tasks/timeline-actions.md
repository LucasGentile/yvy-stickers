# Timeline Actions Feature

## Description

The detailed history screen (`/history/[id]`) shows a timeline of events related to a trade but currently renders them as read-only entries via `TimelineEntry`. Users should be able to perform contextual actions directly from this screen — most importantly, requesting an "undo trade" (rollback) from a successfully completed trade entry.

## Acceptance Criteria

- [ ] The timeline detail screen shows action buttons on entries where actions are available
- [ ] A successfully traded card (`trade_accepted`) shows:
  - "Desfazer troca" (undo trade) link that opens the RollbackControl flow
  - "Assistente de troca" button for the Trade Assistant
- [ ] A successfully executed advanced trade (`advanced_trade_executed`) shows:
  - "Desfazer troca" link for AdvancedRollbackControl
  - "Assistente de troca" button
- [ ] Non-canceled/non-rejected trade entries with stickers show the Trade Assistant button
- [ ] Real-life hints still appear for recent entries
- [ ] Actions only appear on the most relevant entry in the timeline (the accepted/executed one), not on every event

## Expected Impact

- `TimelineEntry` component gains action rendering (currently purely presentational)
- `TradeTimelineScreen` must pass `userId` down to entries for rollback controls
- No backend/API changes needed — all actions already exist

## Timeline

Single session — UI-only change reusing existing action components.

## Risks & Mitigations

- Risk: Cluttering the timeline with too many action buttons on every entry
  - Mitigation: Only show actions on the terminal event (`trade_accepted`, `advanced_trade_executed`)
- Risk: Duplicate rollback UIs if user navigates from EventCard → Timeline
  - Mitigation: Both use the same RollbackControl which checks server state on open

## Dependencies

- Existing `RollbackControl` component
- Existing `AdvancedRollbackControl` component
- Existing `TradeAssistant` component
- `getTradeTimeline` action (already returns `tradeId`)

## Test Cases

- TimelineEntry renders RollbackControl for `trade_accepted` entries with tradeId
- TimelineEntry renders AdvancedRollbackControl for `advanced_trade_executed` entries
- TimelineEntry renders TradeAssistant button for trade entries with stickers
- TimelineEntry does NOT render actions for canceled/rejected entries
- TimelineEntry does NOT render actions for non-terminal events (trade_sent, etc.)

## Documentation

No user-facing docs needed — the actions use the same UI patterns already established in EventCard.
