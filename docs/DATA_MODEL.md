# DATA_MODEL.md

**Project:** Sorszámvadász

**Version:** 1.1

**Status:** Accepted

---

# Purpose

This document defines the business data model of Sorszámvadász.

The document is independent of the storage technology.

Google Sheets, JSON files or SQL databases are implementation details and must not influence the business model.

---

# Core Concepts

The application is built around seven core entities.

- EventSet
- Event
- User
- Selection
- Volunteer
- Allocation
- ApplicationState

---

# EventSet

An EventSet represents one imported programme list.

Examples:

- Ördögkatlan 2026 Demo
- Ördögkatlan 2026 Live
- Ördögkatlan 2027

Only one EventSet can be active at any given time.

## Attributes

| Name | Type | Description |
|------|------|-------------|
| id | UUID | Internal identifier |
| name | String | Display name |
| mode | DEMO \| LIVE | Dataset type |
| createdAt | DateTime | Creation timestamp |
| active | Boolean | Indicates the currently active EventSet |

---

# Event

Represents one programme that may require a sorszám.

## Attributes

| Name | Type | Description |
|------|------|-------------|
| id | UUID | Internal identifier |
| eventSetId | UUID | Parent EventSet |
| day | Date | Festival day |
| dayId | String | Original import identifier (e.g. SZERDA-01) |
| startTime | Time | Start time |
| title | String | Programme title |
| type | String | Programme category |
| location | String | Venue |
| active | Boolean | Visibility flag |

## Rules

An Event belongs to exactly one EventSet.

Events are never modified by participants.

---

# User

Represents one participant.

Authentication is intentionally lightweight.

The application is based on recognition rather than identity verification.

## Attributes

| Name | Type | Description |
|------|------|-------------|
| id | UUID | Internal identifier |
| displayName | String | Name visible to other participants |
| createdAt | DateTime | Registration time |
| lastSeen | DateTime | Last activity |

## Rules

Display names **must be unique within an EventSet**.

The application assists participants in choosing a unique display name.

The purpose of the display name is community recognition, not authentication.

Internally every User is identified exclusively by a UUID.

---

# Selection

Represents one participant's preference for one Event.

## Attributes

| Name | Type | Description |
|------|------|-------------|
| id | UUID | Internal identifier |
| userId | UUID | Participant |
| eventId | UUID | Selected Event |
| priority | Priority | Preference level |
| updatedAt | DateTime | Last modification |

## Priority

Possible values:

- WANT
- IF_AVAILABLE

User Interface

| Value | Display |
|------|----------|
| WANT | Szeretném |
| IF_AVAILABLE | Ha marad |

## Rules

Only one Selection may exist for a given User and Event.

Changing the priority updates the existing Selection.

Removing a preference deletes the Selection.

---

# Volunteer

Represents a participant acting as a Sorszámvadász.

## Attributes

| Name | Type | Description |
|------|------|-------------|
| id | UUID | Internal identifier |
| userId | UUID | Related participant |
| active | Boolean | Volunteer currently active |
| startedAt | DateTime | Start time |
| finishedAt | DateTime | Finish time |

---

# Allocation

Represents a volunteer's intention to request sorszámok.

## Attributes

| Name | Type | Description |
|------|------|-------------|
| id | UUID | Internal identifier |
| volunteerId | UUID | Volunteer |
| eventId | UUID | Requested programme |
| quantity | Integer | Number of requested sorszámok |
| createdAt | DateTime | Timestamp |

## Rules

Quantity must be between 1 and 4.

A volunteer may allocate sorszámok for at most two Events.

These limits are configurable.

---

# ApplicationState

Represents the current state of one festival day.

Possible values

- OPEN
- CLOSED
- QUEUEING
- FINISHED

## Meaning

### OPEN

Participants may create and modify Selections.

Volunteers are inactive.

### CLOSED

Participants cannot modify Selections.

Volunteers are not yet allocating sorszámok.

### QUEUEING

Participants remain locked.

Volunteers may create and modify Allocations.

### FINISHED

The festival morning has ended.

The application becomes read-only.

---

# Configuration

Business rules must never be hardcoded.

At minimum the following configuration values exist.

| Setting | Default |
|----------|---------|
| maxPerformancesPerVolunteer | 2 |
| maxSorszamPerPerformance | 4 |
| activeEventSet | Current LIVE dataset |
| demoEventSet | Current DEMO dataset |

---

# Business Rules

A participant may have only one Selection for a given Event.

Selections belong to exactly one Event.

Events belong to exactly one EventSet.

Users belong to exactly one EventSet.

Display names are unique within an EventSet.

Resetting a festival day deletes Selections and Allocations for that day only.

Events are never deleted by administrative operations.

Switching between Demo and Live changes only the active EventSet.

Selections, Volunteers and Allocations are completely isolated between EventSets.

---

# Future Extensions

The model intentionally allows future additions without structural changes.

Examples include:

- programme capacities
- waiting lists
- recommendation engine
- multiple festivals
- participant statistics
- volunteer statistics
- optional authentication
