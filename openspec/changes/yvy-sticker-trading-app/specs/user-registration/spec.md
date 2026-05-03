## ADDED Requirements

### Requirement: User self-registration
The system SHALL allow any resident to register using their name, apartment number, tower, and WhatsApp phone number. No password or email is required. Phone number is the unique identifier.

#### Scenario: Successful registration
- **WHEN** a user submits valid name, apartment, tower, and phone
- **THEN** the system normalizes inputs (lowercase, trimmed), stores the user, and generates display key as `name-apartment-tower`

#### Scenario: Duplicate phone rejected
- **WHEN** a user submits a phone number that already exists in the database
- **THEN** the system loads the existing user profile instead of creating a duplicate

#### Scenario: Multiple users per apartment
- **WHEN** two users submit the same apartment and tower but different phone numbers
- **THEN** both are registered as separate users

### Requirement: Input normalization
The system SHALL normalize all user input fields before storing: lowercase and trimmed whitespace.

#### Scenario: Name normalization
- **WHEN** a user types "  Lucas Gentile  "
- **THEN** the stored name is "lucas gentile"

#### Scenario: Display key format
- **WHEN** a user registers with name "Lucas", apartment "0806", tower "2"
- **THEN** the display key is "lucas-0806-2"

### Requirement: Field validation
The system SHALL validate user fields: name (non-empty string), apartment (4-digit string), tower (1–2 digit string), phone (non-empty string).

#### Scenario: Missing required field
- **WHEN** a user submits the form without filling all required fields
- **THEN** the system shows a validation error in pt-BR and does not create a record
