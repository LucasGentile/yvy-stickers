# Move Panelinhas into Mural Page

## Description

Move the "Panelinhas do YVYs" standalone page content into the "Mural do YVY" page as a new paginated section. Remove the standalone menu item.

## Acceptance Criteria

- Panelinhas content appears as a section within the Mural page
- Panelinhas section is paginated (show 5 items initially, "show more" loads next batch)
- Navigation menu no longer shows "Panelinhas do YVYs" as a separate item
- The `/panelinhas` route redirects to `/mural` (or is removed)
- Both sections (insights + panelinhas) load independently
- UX is not broken by long lists

## Plan

1. Create a `PanelinhasSection` component extracted from `PanelinhasScreen` with pagination (page size 5)
2. Integrate `PanelinhasSection` into `MuralScreen` below the insights
3. Remove "Panelinhas do YVYs" from `SOCIAL_NAV` in `Header.tsx`
4. Redirect `/panelinhas` to `/mural` or remove the page
5. Write tests for the pagination behavior
6. Run lint + tests

## Impact

- `components/MuralScreen.tsx` — adds panelinhas section
- `components/PanelinhasScreen.tsx` — can be deleted or kept for redirect
- `components/Header.tsx` — remove nav item
- `app/panelinhas/page.tsx` — redirect to `/mural`

## Risks

- None significant — additive change to Mural, removal of standalone page

## Timeline

- Single session task

## Status: Complete

## Lessons Learned

- Text split across elements (e.g. name & name) requires `container.textContent` assertions in RTL tests instead of `screen.getByText`
- The original PanelinhasScreen component is no longer used directly — can be removed later if desired

## Technical Debt

- `components/PanelinhasScreen.tsx` is now dead code (replaced by `PanelinhasSection.tsx`)
- Pre-existing unhandled errors in `rollbackTrade.test.ts` remain unfixed
