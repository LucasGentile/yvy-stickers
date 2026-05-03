## ADDED Requirements

### Requirement: Per-user WhatsApp link
Each match result SHALL include a button that opens a WhatsApp conversation with that user via `https://wa.me/<phone>`.

#### Scenario: WhatsApp button opens chat
- **WHEN** user taps the WhatsApp button on a match card
- **THEN** the device opens WhatsApp directed to that user's phone number

#### Scenario: Phone number formatted correctly
- **WHEN** phone is stored as "11999998888"
- **THEN** the link is constructed as `https://wa.me/11999998888`

### Requirement: Condominium WhatsApp group link
The app SHALL display a persistent, easily accessible button to open the YVY Lindóia condominium WhatsApp group invite link.

#### Scenario: Group button visible on main screen
- **WHEN** any user views the main screen
- **THEN** the group link button is visible without scrolling (e.g. in header or sticky bar)

#### Scenario: Group button opens invite link
- **WHEN** user taps the group button
- **THEN** the device opens the WhatsApp group invite URL
