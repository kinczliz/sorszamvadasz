# USER_STORIES.md

**Project:** Sorszámvadász

**Version:** 1.0

**Status:** Accepted

---

# Purpose

This document describes the expected behaviour of Sorszámvadász from the perspective of its users.

These stories define the application's functionality.

Implementation details are intentionally excluded.

---

# Personas

The application has three primary personas.

- Participant
- Volunteer ("Sorszámvadász")
- Administrator

---

# Participant

## US-001 – Enter a display name

As a participant

I want to enter the name by which other participants know me

so that everyone can identify my requests.

### Acceptance Criteria

- The application asks for a display name.
- The display name is remembered on the device.
- Duplicate display names are rejected.
- The application suggests choosing a more distinctive name.

---

## US-002 – Browse programmes

As a participant

I want to browse all programmes requiring a sorszám

so that I can decide which ones interest me.

### Acceptance Criteria

- Programmes are grouped by festival day.
- The programme title is visible.
- The time is visible.
- The location is visible.
- Search is available.

---

## US-003 – Mark "Szeretném"

As a participant

I want to indicate that I would really like to attend a programme

so that volunteers know it should be prioritised.

### Acceptance Criteria

- Selecting "Szeretném" immediately saves the choice.
- Selecting it again removes the choice.
- The application confirms that the change was saved.

---

## US-004 – Mark "Ha marad"

As a participant

I want to indicate that I would attend only if spare sorszámok remain

so that volunteers prioritise others first.

### Acceptance Criteria

- Selecting "Ha marad" immediately saves the choice.
- Switching between "Szeretném" and "Ha marad" updates the existing selection.
- Selecting it again removes the choice.

---

## US-005 – Continue later

As a participant

I want the application to remember my previous selections

so that I can continue where I left off.

### Acceptance Criteria

- Refreshing the browser keeps my selections.
- Returning later on the same device restores my name automatically.

---

## US-006 – Respect closing time

As a participant

I want to know when the daily request period has ended

so that I understand why I cannot modify my requests.

### Acceptance Criteria

- Editing is disabled after closing.
- Existing selections remain visible.
- A friendly explanation is displayed.

---

# Volunteer

## US-101 – Become a volunteer

As a volunteer

I want to indicate that I am queueing today

so that other volunteers know I am helping.

### Acceptance Criteria

- Volunteer mode can be enabled.
- The dashboard immediately reflects the active volunteer.

---

## US-102 – See remaining demand

As a volunteer

I want to see which programmes still need sorszámok

so that I can use my allocation effectively.

### Acceptance Criteria

The application displays:

- Requested ("Szeretném")
- Already allocated
- Remaining demand

---

## US-103 – Allocate sorszámok

As a volunteer

I want to record how many sorszámok I will request

so that duplicate requests are avoided.

### Acceptance Criteria

- Maximum two programmes.
- Maximum four sorszám per programme.
- Limits are configurable.

---

## US-104 – Finish volunteering

As a volunteer

I want to indicate that I have finished queueing

so that the dashboard reflects reality.

### Acceptance Criteria

- Volunteer mode ends.
- Dashboard updates immediately.

---

# Administrator

## US-201 – Import programme list

As an administrator

I want to import a programme list

so that participants always see current information.

### Acceptance Criteria

- CSV import.
- Existing EventSets remain unchanged.
- A new EventSet is created.

---

## US-202 – Activate EventSet

As an administrator

I want to switch between Demo and Live

so that testing never affects real data.

### Acceptance Criteria

- Switching is immediate.
- Data sets remain isolated.

---

## US-203 – Close requests

As an administrator

I want to close one festival day

so that volunteers can start queueing using stable information.

### Acceptance Criteria

- Participants can no longer edit.
- Volunteers remain able to allocate.

---

## US-204 – Re-open requests

As an administrator

I want to re-open a festival day

so that participants can continue editing if necessary.

### Acceptance Criteria

- Editing becomes available again.

---

## US-205 – Reset one day

As an administrator

I want to remove all participant requests for one day

so that we can recover from mistakes.

### Acceptance Criteria

- Events remain untouched.
- Only Selections and Allocations are removed.
- Confirmation is required.
- A snapshot is created before deletion.

---

## US-206 – Load demo data

As an administrator

I want to populate Demo Mode with realistic example data

so that participants can practice using the application.

### Acceptance Criteria

- Demo data loads in one action.
- Live data is unaffected.

---

# General

## US-301 – Mobile usability

As any user

I want the application to work comfortably on my phone

so that I can use it during the festival.

### Acceptance Criteria

- Responsive layout.
- Large touch targets.
- High contrast.
- Dark theme.

---

## US-302 – Fast interaction

As any user

I want every interaction to feel immediate

so that using the application never slows me down.

### Acceptance Criteria

- Saving requires no explicit Save button.
- Changes appear immediately.
- Visual confirmation is shown after each successful save.

---

# Guiding Principle

Every implemented feature should make the festival morning simpler.

If a feature does not reduce confusion or save time, it belongs in the backlog rather than Version 1.
