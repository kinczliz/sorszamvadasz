# API

**Project:** Sorszámvadász
**Version:** 1.0
**Status:** Proposed

---

# Purpose

This document defines the JSON contract between the Sorszámvadász frontend and backend.

The festival MVP uses a deliberately small API.

The backend is responsible for shared state, validation and environment isolation. The frontend remains responsible for immediate interaction and local persistence.

---

# General Conventions

## Transport

Requests and responses use HTTPS and JSON.

## Environments

Every request must identify the active environment:

```text
LIVE
DEMO
```

LIVE and DEMO use the same official programme list but completely separate user-generated data.

## Identifiers

Users and programmes are identified using UUID strings.

## Timestamps

Timestamps use ISO 8601 format.

Example:

```text
2026-08-04T08:15:00+02:00
```

## Success responses

Successful responses contain:

```json
{
  "ok": true,
  "data": {}
}
```

## Error responses

Failed responses contain:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

The frontend should primarily act on `code`.

Backend error messages are intended for diagnostics and need not be displayed directly to participants.

---

# API Endpoints

The participant MVP requires four operations:

1. Register participant
2. Load participant state
3. Synchronize selections
4. Load daily status

Google Apps Script may expose these through one web-app URL using an `action` field rather than literal REST paths.

The logical API contract remains the same.

---

# Register Participant

Creates a new participant in one environment.

## Logical endpoint

```text
POST /register
```

## Request

```json
{
  "environment": "LIVE",
  "displayName": "Zoli Cisco",
  "selections": {
    "programme-uuid-1": "WANT",
    "programme-uuid-2": "IF_AVAILABLE"
  }
}
```

`selections` contains the participant’s current locally stored selections and may be empty.

## Validation

The backend must validate:

* supported environment
* non-empty display name
* display-name length
* display-name uniqueness within the environment
* programme IDs
* selection priority values
* daily ❤️ and 💛 limits
* programme membership in the active programme dataset

## Success response

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "displayName": "Zoli Cisco"
    },
    "selections": {
      "programme-uuid-1": "WANT",
      "programme-uuid-2": "IF_AVAILABLE"
    },
    "serverTime": "2026-08-04T08:15:00+02:00"
  }
}
```

## Duplicate-name response

```json
{
  "ok": false,
  "error": {
    "code": "DISPLAY_NAME_TAKEN",
    "message": "Display name is already in use."
  }
}
```

Suggested participant UI:

```text
Ez a név már használatban van.

Kérlek válassz egy olyan nevet,
amiről a többiek biztosan felismernek.
```

---

# Load Participant State

Loads the current shared state for a recognized participant.

## Logical endpoint

```text
POST /participant
```

POST is used to keep the implementation simple and avoid passing identifiers in URL query strings.

## Request

```json
{
  "environment": "LIVE",
  "userId": "user-uuid"
}
```

## Success response

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "displayName": "Zoli Cisco"
    },
    "selections": {
      "programme-uuid-1": "WANT",
      "programme-uuid-2": "IF_AVAILABLE"
    },
    "dayStates": {
      "2026-08-04": "OPEN",
      "2026-08-05": "OPEN",
      "2026-08-06": "CLOSED",
      "2026-08-07": "OPEN",
      "2026-08-08": "OPEN"
    },
    "serverTime": "2026-08-04T08:16:00+02:00"
  }
}
```

## Unknown-user response

```json
{
  "ok": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User identifier is not recognized."
  }
}
```

The frontend preserves local selections, clears the invalid local user ID and starts registration again.

---

# Synchronize Selections

Replaces the participant’s complete synchronized selection set.

## Logical endpoint

```text
POST /sync-selections
```

## Request

```json
{
  "environment": "LIVE",
  "userId": "user-uuid",
  "selections": {
    "programme-uuid-1": "WANT",
    "programme-uuid-3": "IF_AVAILABLE"
  }
}
```

An empty selection map means:

> Remove all synchronized selections for this participant in this environment.

This is also how `Újrakezdem` is synchronized.

## Validation

The backend must validate:

* environment
* recognized user
* programme IDs
* priority values
* daily selection limits
* current day state
* programme membership in the active programme dataset

## Success response

```json
{
  "ok": true,
  "data": {
    "selections": {
      "programme-uuid-1": "WANT",
      "programme-uuid-3": "IF_AVAILABLE"
    },
    "syncedAt": "2026-08-04T08:17:00+02:00"
  }
}
```

## Day-closed response

```json
{
  "ok": false,
  "error": {
    "code": "DAY_NOT_OPEN",
    "message": "Selections for this day are currently locked."
  }
}
```

## Limit response

```json
{
  "ok": false,
  "error": {
    "code": "DAILY_LIMIT_EXCEEDED",
    "message": "Submitted selections exceed the configured daily limit."
  }
}
```

Local validation should normally prevent this error.

When it occurs, the frontend should reload the server state rather than repeatedly retrying an invalid payload.

---

# Load Daily Status

Returns shared daily information used by participants.

## Logical endpoint

```text
POST /day-status
```

## Request

```json
{
  "environment": "LIVE"
}
```

## Success response

```json
{
  "ok": true,
  "data": {
    "days": [
      {
        "date": "2026-08-04",
        "state": "OPEN",
        "chance": "GOOD",
        "wantCount": 46,
        "ifAvailableCount": 31,
        "volunteerCount": 4,
        "capacity": 32,
        "metricsUpdatedAt": "2026-08-04T08:00:00+02:00"
      },
      {
        "date": "2026-08-05",
        "state": "OPEN",
        "chance": null,
        "wantCount": 0,
        "ifAvailableCount": 0,
        "volunteerCount": 0,
        "capacity": 0,
        "metricsUpdatedAt": null
      }
    ],
    "serverTime": "2026-08-04T08:18:00+02:00"
  }
}
```

## Chance values

Supported backend values:

```text
VERY_GOOD
GOOD
LOW
VERY_LOW
HOPELESS
```

The frontend displays:

| Backend     | UI          |
| ----------- | ----------- |
| `VERY_GOOD` | 🟢 Remek    |
| `GOOD`      | 🟡 Jó       |
| `LOW`       | ⚪ Kicsi     |
| `VERY_LOW`  | 🟠 Alig     |
| `HOPELESS`  | 🔴 Felejtős |

`chance: null` means that no useful estimate has yet been published.

---

# Selection Model

Selections are represented as an object keyed by programme ID.

```json
{
  "programme-uuid-1": "WANT",
  "programme-uuid-2": "IF_AVAILABLE"
}
```

Supported values:

```text
WANT
IF_AVAILABLE
```

No-selection entries are omitted.

The complete map is submitted during synchronization.

---

# Daily Limits

Initial configuration:

```json
{
  "maxWantPerDay": 2,
  "maxIfAvailablePerDay": 4
}
```

The frontend and backend must enforce the same values.

Configuration may later be returned by the backend, but the first festival release may use matching constants in both implementations.

---

# Day States

Supported values:

```text
OPEN
CLOSED
QUEUEING
FINISHED
```

## OPEN

Participants may edit selections.

## CLOSED

Participant selections are locked.

## QUEUEING

Participant selections remain locked. Volunteer operations are allowed.

## FINISHED

The day is read-only.

Every backend write validates the current state.

---

# Error Codes

Minimum participant API error codes:

| Code                   | Meaning                          |
| ---------------------- | -------------------------------- |
| `INVALID_REQUEST`      | Missing or malformed request     |
| `INVALID_ENVIRONMENT`  | Unsupported environment          |
| `DISPLAY_NAME_TAKEN`   | Display name already exists      |
| `INVALID_DISPLAY_NAME` | Display name is empty or invalid |
| `USER_NOT_FOUND`       | User UUID is unknown             |
| `PROGRAMME_NOT_FOUND`  | Programme ID is invalid          |
| `INVALID_PRIORITY`     | Unsupported selection value      |
| `DAILY_LIMIT_EXCEEDED` | Daily ❤️ or 💛 limit exceeded    |
| `DAY_NOT_OPEN`         | Participant writes are locked    |
| `SERVER_ERROR`         | Unexpected backend error         |

The backend must not return stack traces or internal spreadsheet details to clients.

---

# Google Apps Script Routing

The first implementation may use one deployed Apps Script web-app URL.

Requests may use this envelope:

```json
{
  "action": "syncSelections",
  "payload": {
    "environment": "LIVE",
    "userId": "user-uuid",
    "selections": {}
  }
}
```

Supported actions:

```text
register
getParticipant
syncSelections
getDayStatus
```

This avoids building unnecessary routing infrastructure while preserving clear logical operations.

---

# Backend Storage

The API contract does not expose Google Sheets row numbers.

The backend must identify entities using stable UUIDs and programme IDs.

Spreadsheet details remain internal implementation concerns.

Recommended logical worksheets:

```text
Settings
Users
Selections
DayStates
Volunteers
Allocations
DayMetrics
```

The programme list remains sourced from the official Excel import pipeline and its generated JSON unless a later implementation deliberately imports it into the backend.

---

# Idempotency

`syncSelections` is naturally idempotent.

Submitting the same complete selection map multiple times produces the same stored result.

This supports safe retries after uncertain network failures.

Participant registration is not automatically idempotent because duplicate display names are rejected.

---

# Out of Scope

The festival MVP API does not include:

* password authentication
* OAuth
* WebSockets
* incremental selection operations
* event logs
* multi-device conflict resolution
* participant deletion
* programme administration
* historical analytics
* push notifications
