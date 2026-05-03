## ADDED Requirements

### Requirement: Input mode selection
The system SHALL require the user to choose an input mode before entering stickers: "I will input the stickers I HAVE" (Mode A) or "I will input the stickers I NEED" (Mode B). This choice MUST be presented clearly on first use.

#### Scenario: Mode A selected
- **WHEN** user selects Mode A and inputs sticker numbers
- **THEN** those numbers are stored as owned; all others (1–980) are inferred as missing

#### Scenario: Mode B selected
- **WHEN** user selects Mode B and inputs sticker numbers
- **THEN** those numbers are stored as missing; all others (1–980) are inferred as owned

#### Scenario: Mode conflict prevention
- **WHEN** user has already selected a mode and input stickers
- **THEN** the system does not allow switching mode without clearing existing data

### Requirement: Owned sticker tracking
The system SHALL store which stickers (1–980) a user owns. Ownership is boolean — no quantity or duplicate tracking in V1.

#### Scenario: Mark sticker as owned
- **WHEN** a user marks sticker #42 as owned
- **THEN** the system stores a `user_stickers` row for that user and sticker_id

#### Scenario: Idempotent upsert
- **WHEN** the same sticker is submitted more than once (e.g. duplicate in file)
- **THEN** only one row exists for that user/sticker pair

### Requirement: Missing sticker inference
The system SHALL automatically compute missing stickers as all sticker IDs (1–980) not present in the user's owned collection.

#### Scenario: Missing stickers computed
- **WHEN** a user owns stickers 1–100
- **THEN** the system infers stickers 101–980 as missing
