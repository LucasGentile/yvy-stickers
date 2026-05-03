## ADDED Requirements

### Requirement: Text file upload
The system SHALL allow users to upload a `.txt` file containing semicolon-separated sticker numbers (e.g. `1;5;23;105;300`). Spaces SHALL be ignored. Numbers outside 1–980 SHALL be rejected with a visible error. Duplicate numbers in the file SHALL be deduplicated automatically.

#### Scenario: Valid file uploaded
- **WHEN** user uploads a `.txt` file with content "1; 5; 23; 105"
- **THEN** stickers 1, 5, 23, and 105 are registered for that user

#### Scenario: Out-of-range number rejected
- **WHEN** the file contains number 0 or 981
- **THEN** the system shows an error message in pt-BR listing invalid numbers

#### Scenario: Duplicates in file deduplicated
- **WHEN** the file contains "5;5;10"
- **THEN** only stickers 5 and 10 are registered (no duplicate entry)

### Requirement: Manual grid input
The system SHALL display a checkbox grid of numbers 1–980 that allows users to select stickers by tapping or clicking. The grid MUST be fast and responsive on mobile devices.

#### Scenario: Sticker selected via grid
- **WHEN** user taps checkbox for sticker #300
- **THEN** sticker 300 is marked as selected in the UI

#### Scenario: Grid saves selection
- **WHEN** user finishes selecting stickers and confirms
- **THEN** all selected stickers are stored in the database for that user

#### Scenario: Grid performance on mobile
- **WHEN** the grid renders all 980 checkboxes on a mobile device
- **THEN** the page remains interactive without significant lag
