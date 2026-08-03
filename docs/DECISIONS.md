## Decision #001

Date: 2026-08-02

Display names are unique within an EventSet.

Reason:

The application is community-oriented rather than authentication-oriented.

Participants should immediately recognize each other in the UI.

UUID remains the internal identifier.

## Pending Decisions

### PD-001

Clarify ApplicationState transitions.

Reason:

DATA_MODEL.md and USER_STORIES.md differ on volunteer behaviour after closing.

Target:

Before implementing volunteer mode.

---

### PD-002

Should User belong to an EventSet?

Reason:

Demo and Live datasets must remain isolated.

Target:

Before implementing the Google Sheets backend.

---

## Decision #002

❤️ selections are intentionally limited because they represent a participant's highest priorities.
This improves the quality of demand estimation and encourages thoughtful choices.

💛 selections provide additional flexibility without influencing demand metrics.

---

Decision #003

The backend stores participant state, not participant actions.

Each synchronization replaces the complete current selection set.

The system intentionally avoids event sourcing and incremental updates.

Reason

The participant frontend already owns the complete current state.

Replacing state is simpler, naturally idempotent and easier to recover after temporary failures.