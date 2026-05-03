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
The system SHALL store which stickers (1–980) a user owns and in what quantity (minimum 1).

#### Scenario: Mark sticker as owned
- **WHEN** a user marks sticker #42 as owned with quantity 2
- **THEN** the system stores `sticker_id=42, quantity=2` for that user

#### Scenario: Update duplicate quantity
- **WHEN** a user changes the quantity of sticker #42 from 2 to 3
- **THEN** the system updates the record idempotently

### Requirement: Missing sticker inference
The system SHALL automatically compute missing stickers as all sticker IDs (1–980) not present in the user's owned collection.

#### Scenario: Missing stickers computed
- **WHEN** a user owns stickers 1–100
- **THEN** the system infers stickers 101–980 as missing
