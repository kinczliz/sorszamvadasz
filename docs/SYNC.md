# Synchronization

**Project:** Sorszámvadász
**Version:** 1.0
**Status:** Proposed

---

# Purpose

Synchronization turns Sorszámvadász from a personal programme planner into a shared coordination tool.

Its primary goals are:

* preserve the fast participant experience
* store selections centrally
* allow organizers and volunteers to see aggregated demand
* keep LIVE and DEMO data fully isolated
* handle temporary connection problems safely
* avoid unnecessary conflict-resolution complexity

The application serves a trusted group of approximately 30–40 people. The synchronization design should remain simple and understandable.

---

# Principles

## Local-first interaction

Participant actions update the interface immediately.

The participant should not have to wait for the backend before seeing a selection change.

Local storage remains a temporary safety copy and supports recovery when the network is unreliable.

---

## Server as shared source of truth

The backend is the authoritative source for:

* participant identity
* synchronized selections
* daily application state
* volunteer registrations
* volunteer allocations
* aggregated demand
* Esély

Local storage alone is not considered shared data.

---

## Replace rather than merge

The frontend sends the participant's complete current selection set.

The backend replaces that participant's stored selections for the active EventSet with the submitted set.

This applies equally when:

* adding a selection
* changing ❤️ to 💛
* removing one selection
* using Újrakezdem

An empty submitted set means that all selections belonging to that participant in the active EventSet must be removed.

This avoids event logs, tombstones and complex merge algorithms.

---

# Environment Isolation

LIVE and DEMO use the same official programme list.

They maintain separate user-generated data.

The following data must never mix between environments:

* Users
* Selections
* Volunteers
* Allocations
* Day states
* Aggregated metrics

Every synchronized request must identify the active environment or EventSet.

---

# Participant Identity

## Display name

Participants identify themselves using a recognizable display name.

The display name is intended for community recognition, not secure authentication.

Display names must be unique within an EventSet.

---

## User identifier

The backend assigns every participant a UUID.

The frontend stores:

```text
sorszamvadasz.userId
sorszamvadasz.displayName
```

The UUID is used for all synchronized operations.

The display name remains visible in the user interface.

---

## First registration

When a device has no stored user UUID:

1. The participant enters a display name.
2. The frontend generates and retains a registration UUID, then sends it with the display name and active EventSet to the backend.
3. The backend checks whether the display name is available.
4. If available, the backend creates the User and returns its UUID.
5. The frontend stores the UUID and display name locally.
6. Existing local selections are uploaded for that new User.

If the browser cannot confirm the response, it retries with the same registration UUID. The backend returns the originally created User instead of treating the retry as a duplicate name. Editing the entered display name starts a new registration attempt with a new UUID.

---

## Duplicate display name

If the requested display name already exists, registration is rejected.

The application asks the participant to choose a more distinctive name.

Suggested UI text:

```text
Ez a név már használatban van.

Kérlek válassz egy olyan nevet,
amiről a többiek biztosan felismernek.
```

The application must not silently attach a new device to an existing participant based only on a matching display name.

---

## Returning participant on the same device

If a stored UUID exists:

1. The frontend requests the participant's current server record.
2. If the User exists in the active EventSet, synchronization continues.
3. The stored display name may be refreshed from the server.
4. Server selections are loaded and become the current shared state.

---

## Unknown or invalid UUID

If the stored UUID is not recognized by the backend:

1. Keep the locally stored selections temporarily.
2. Remove the invalid UUID.
3. Ask the participant to register a display name again.
4. Upload the preserved local selections after successful registration.

---

# Selection Synchronization

## Immediate participant experience

When a participant changes a selection:

1. Validate the daily ❤️ and 💛 limits locally.
2. Update the React state immediately.
3. Update local storage immediately.
4. Send the complete current selection set to the backend.
5. Show the selection as saved locally while synchronization is pending.

---

## Successful synchronization

When the backend accepts the submitted selection set:

* the local selection state remains unchanged
* the frontend records the latest successful synchronization time
* no disruptive confirmation is required

A small status indicator may be added later if user testing shows it is useful.

---

## Failed synchronization

When synchronization fails:

* retain the local selections
* do not revert the participant's visible changes
* mark synchronization as pending
* retry when another selection is made, the page is reopened or connectivity returns

Suggested UI text when explicit feedback is needed:

```text
A módosítás elmentve ezen az eszközön.

A közös rendszerrel később szinkronizáljuk.
```

The application must not repeatedly interrupt the participant with error dialogs.

---

# Initial Synchronization

When a participant already has local selections and connects to the backend for the first time:

## New User

For a newly created backend User, upload the complete local selection set.

The local set becomes the participant's initial shared state.

---

## Existing recognized User

For a recognized User UUID, the server selection set takes precedence during initial page loading.

This prevents stale browser data from overwriting newer shared data without an explicit participant action.

After the server state is loaded, any new participant action submits the complete updated state.

---

# Daily Selection Limits

The frontend enforces configured per-day limits immediately.

Default values:

```text
maxWantPerDay = 2
maxIfAvailablePerDay = 4
```

The backend must validate the same limits.

If a submitted selection set exceeds the configured limits, the backend rejects it and returns a validation error.

The frontend should then reload the current server selection set and explain that the requested change could not be synchronized.

Local validation should normally prevent this situation.

---

# Programme Updates

Programme identity is based on the stable ID derived from the organizer's `DAY-id`.

Changes to the following fields do not change programme identity:

* title
* time
* type
* location

Existing selections therefore remain valid after ordinary programme updates.

---

## Removed programmes

If an updated official workbook removes a programme:

* the programme disappears from the frontend
* existing selections referencing that programme are ignored by the frontend
* the backend may retain or clean up those orphaned selections
* orphaned selections must not contribute to demand, summaries or Esély

Automatic cleanup may occur during programme import or backend maintenance.

---

## New programmes

New programmes appear with no selections.

No migration is required.

---

# Application State

Each festival day has one state:

* OPEN
* CLOSED
* QUEUEING
* FINISHED

## OPEN

Participants may modify selections.

## CLOSED

Participant selections are locked.

Volunteers are not yet allocating sorszámok.

## QUEUEING

Participant selections remain locked.

Volunteers may register and allocate their capacity.

## FINISHED

The day is read-only.

---

The backend is authoritative for day state.

The frontend may display cached state temporarily, but every write operation must also be validated by the backend.

---

# Volunteer Synchronization

A volunteer registers separately for one festival day.

Volunteer activity is always day-specific.

The backend stores:

* volunteer UUID
* participant User UUID
* festival day
* active status
* allocation choices
* quantities

Each volunteer may allocate:

* maximum two programmes for that day
* maximum four sorszám per programme

The backend validates these rules.

Volunteer actions synchronize immediately because they affect shared capacity and coordination.

---

# Aggregated Demand

Demand is calculated from synchronized ❤️ selections only.

💛 selections remain visible as secondary interest but do not contribute to Esély.

Aggregated demand may be recalculated when data changes or as part of the hourly metrics job.

---

# Esély

Esély is calculated by the backend hourly.

Participant selection writes do not trigger immediate Esély recalculation.

The calculation uses:

```text
ratio = synchronized ❤️ demand / volunteer capacity
```

The backend publishes one stable code per festival day:

* VERY_GOOD
* GOOD
* LOW
* VERY_LOW
* HOPELESS

The frontend displays:

* 🟢 Remek
* 🟡 Jó
* ⚪ Kicsi
* 🟠 Alig
* 🔴 Felejtős

The backend also publishes the calculation timestamp.

Esély is advisory only and does not guarantee that a participant will or will not receive a sorszám.

---

# Újrakezdem

When the participant confirms Újrakezdem:

1. The frontend replaces the current local selection set with an empty set.
2. The UI updates immediately.
3. The frontend submits the empty selection set to the backend.
4. The backend removes all selections belonging to that participant in the active EventSet.

If the backend is temporarily unavailable, the empty set remains pending and must be synchronized later.

---

# Backend Responsibilities

The backend is responsible for:

* creating and identifying Users
* enforcing unique display names
* storing complete participant selection sets
* validating daily selection limits
* enforcing day state
* storing volunteers and allocations
* isolating LIVE and DEMO
* calculating aggregated demand
* calculating Esély hourly
* returning current shared state
* rejecting malformed or inconsistent requests

---

# Frontend Responsibilities

The frontend is responsible for:

* immediate visual feedback
* local input validation
* local persistence
* submitting complete current state
* retrying failed synchronization
* displaying the latest server state
* displaying clear Hungarian messages
* preserving usability during temporary connectivity problems

---

# Conflict Resolution

The MVP intentionally avoids complex multi-device conflict handling.

Rules:

1. A recognized User UUID identifies one participant.
2. Initial loading uses server state.
3. Each later participant action submits the complete current state.
4. The latest successfully accepted submission replaces the previous server state.
5. Concurrent use from two devices is considered an unsupported edge case for the festival MVP.

If multi-device usage becomes common, version numbers or timestamps may be introduced after the festival.

---

# Security and Trust

The system is designed for a small trusted community.

It does not provide strong authentication in Version 1.

A stored User UUID acts as a lightweight device credential.

Administrative and volunteer operations require stronger protection than participant selection writes and must not rely only on a display name.

The exact administrator authorization mechanism is defined separately.

---

# Out of Scope for Festival MVP

* real-time WebSocket synchronization
* user passwords
* email or social login
* sophisticated offline conflict merging
* multi-device editing guarantees
* event sourcing
* synchronization history
* manual conflict-resolution screens
