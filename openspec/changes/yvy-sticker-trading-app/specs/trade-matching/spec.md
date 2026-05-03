## ADDED Requirements

### Requirement: Match score computation
For each pair of users A and B, the system SHALL compute:
- `matchScore`: count of stickers B owns that A is missing
- `reciprocalScore`: count of stickers A owns that B is missing

#### Scenario: Match score calculated
- **WHEN** user A is missing stickers [1, 2, 3] and user B owns stickers [2, 3, 4]
- **THEN** matchScore for A vs B is 2 (stickers 2 and 3)

#### Scenario: Reciprocal score calculated
- **WHEN** user A owns stickers [10, 11] and user B is missing stickers [10, 15]
- **THEN** reciprocalScore for A vs B is 1 (sticker 10)

### Requirement: Match result ranking
The system SHALL display trading partners ranked by `matchScore` descending, then `reciprocalScore` descending.

#### Scenario: Primary sort by matchScore
- **WHEN** user B has matchScore 5 and user C has matchScore 3
- **THEN** user B appears above user C in the results list

#### Scenario: Secondary sort by reciprocalScore
- **WHEN** two users have equal matchScore
- **THEN** the user with higher reciprocalScore appears first

### Requirement: Match result display
Each match result SHALL display: user display key (`name-apartment-tower`), `matchScore`, and `reciprocalScore`.

#### Scenario: Result card shown
- **WHEN** results are rendered
- **THEN** each card shows the display key, how many stickers they can give me, and how many I can give them

#### Scenario: Empty results
- **WHEN** no other user has stickers the current user needs
- **THEN** a message in pt-BR is shown indicating no matches were found
