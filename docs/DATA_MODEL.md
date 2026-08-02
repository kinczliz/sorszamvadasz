# DATA_MODEL.md

**Project:** Sorszámvadász

**Version:** 1.0

**Status:** Accepted

---

# Purpose

This document defines the business data model of Sorszámvadász.

It is independent of any storage technology.

Google Sheets, JSON files or SQL databases are implementation details.

---

# Core Concepts

The application is built around seven core entities:

- Event
- User
- Selection
- Volunteer
- Allocation
- EventSet
- ApplicationState

---

# EventSet

Represents one imported programme list.

Examples:

- Ördögkatlan 2026 Demo
- Ördögkatlan 2026 Live
- Ördögkatlan 2027

Only one EventSet can be active at any given time.

---

Attributes

| Name | Type |
|------|------|
| id | UUID |
| name | String |
| mode | DEMO \| LIVE |
| createdAt | DateTime |
| active | Boolean |

---

# Event

Represents one programme that may require a sorszám.

---

Attributes

| Name | Type |
|------|------|
| id | UUID |
| eventSetId | UUID |
| day | Date |
| dayId | String |
| startTime | Time |
| title | String |
| type | String |
| location | String |
| active | Boolean |

---

Rules

An Event belongs to exactly one EventSet.

---

# User

Represents one participant.

Authentication is intentionally lightweight.

The user's name is sufficient.

---

Attributes

| Name | Type |
|------|------|
| id | UUID |
| name | String |
| createdAt | DateTime |
| lastSeen | DateTime |

---

Rules

Names are not required to be unique.

The UUID is the internal identifier.

---

# Selection

Represents one participant's preference for one Event.

---

Attributes

| Name | Type |
|------|------|
| id | UUID |
| userId | UUID |
| eventId | UUID |
| priority | Priority |
| updatedAt | DateTime |

---

Priority

Possible values:

- WANT
- IF_AVAILABLE

UI translations:

- WANT → Szeretném
- IF_AVAILABLE → Ha marad

Only one Selection may exist for a given User and Event.

---

# Volunteer

Represents a participant acting as a Sorszámvadász.

---

Attributes

| Name | Type |
|------|------|
| id | UUID |
| userId | UUID |
| active | Boolean |
| startedAt | DateTime |
| finishedAt | DateTime |

---

# Allocation

Represents the volunteer's intention to request sorszámok.

---

Attributes

| Name | Type |
|------|------|
| id | UUID |
| volunteerId | UUID |
| eventId | UUID |
| quantity | Integer |
| createdAt | DateTime |

---

Rules

quantity must be between 1 and 4.

A volunteer may allocate sorszámok for at most two Events.

These limits are configurable.

---

# ApplicationState

Represents the current state of one festival day.

Possible values:

- OPEN
- CLOSED
- QUEUEING
- FINISHED

Meaning

OPEN

Participants may edit selections.

---

CLOSED

Selections are locked.

Volunteers inactive.

---

QUEUEING

Participants locked.

Volunteers may create Allocations.

---

FINISHED

Read-only.

Statistics only.

---

# Configuration

Business rules must not be hardcoded.

At minimum, the following settings exist:

| Setting | Default |
|----------|---------|
| maxPerformancesPerVolunteer | 2 |
| maxSorszamPerPerformance | 4 |
| activeEventSet | current Live |
| demoEventSet | current Demo |

---

# Business Rules

A participant may have at most one Selection per Event.

Changing "Szeretném" to "Ha marad" updates the existing Selection.

Deleting a preference removes the Selection.

---

A volunteer may allocate:

- maximum two Events
- maximum four sorszám per Event

These limits are configurable.

---

Resetting a festival day deletes Selections and Allocations for that day only.

Events are never deleted.

---

Switching between Demo and Live changes the active EventSet.

Selections remain isolated.

---

# Future Extensions

The model intentionally allows future additions such as:

- ticket capacities
- waitlists
- user roles
- multiple festivals
- statistics
- recommendation engine

without changing the existing entities.
