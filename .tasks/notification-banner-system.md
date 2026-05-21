# Notification Banner System

## Description

A global notification banner system that displays success (green) and error (red) banners when server actions complete. Banners appear at the top of the viewport, auto-dismiss after a timeout, and can be manually dismissed.

## Acceptance Criteria

- [x] A `NotificationContext` provides `showSuccess` and `showError` methods globally
- [ ] A `NotificationBanner` component renders at the top of the viewport
- [ ] Success banners are green with a contextual success message
- [ ] Error banners are red with a contextual failure message + suggestion to retry/seek help
- [ ] Banners auto-dismiss after 5 seconds
- [ ] Banners can be manually dismissed
- [ ] Integrated into: trade submit/cancel/refuse (normal and advanced)
- [ ] Integrated into: sticker save actions
- [ ] Integrated into: trade UNDO requests from history
- [ ] Integrated into: duplicate sticker registration

## Architecture

- `contexts/NotificationContext.tsx` — context + provider + `useNotification()` hook
- `components/NotificationBanner.tsx` — visual banner rendered in providers
- Integration points replace inline `setMsg` patterns with `showSuccess`/`showError`

## Timeline

Single session implementation.

## Risks

- Need to ensure banner doesn't conflict with existing Header (z-index layering)
- Existing inline toasts in StickersScreen/DuplicatesScreen serve undo functionality — those should remain; the new system is for action outcome feedback

## Dependencies

None — new feature addition.
