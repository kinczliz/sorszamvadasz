# Metrics

## Purpose

Metrics help participants make better decisions before joining a queue.

Metrics are advisory only. They do not guarantee that a participant will or will not receive a sorszám.

---

# Update Frequency

Participant selections are stored immediately.

Aggregated metrics are calculated by the backend **hourly** (configurable).

The participant application displays the most recently published metrics.

The frontend never calculates these values.

---

# DayStatus

The backend publishes one summary for each festival day.

Example:

```json
{
  "day": "SZERDA",
  "chance": "GOOD",
  "updatedAt": "2026-08-06T13:00:00+02:00"
}
```

---

# Demand

Demand is the total number of **Szeretném (❤️)** selections for a festival day.

Only ❤️ selections contribute to demand.

**Ha marad (💛)** selections are informational and are not included when calculating Esély.

---

# Capacity

Capacity is calculated from the number of available volunteers.

The backend stores:

* volunteer count
* tickets processed per volunteer

```
capacity = volunteers × ticketsPerVolunteer
```

The value **ticketsPerVolunteer** is configurable.

No frontend changes are required when this value changes.

---

# Esély

The backend calculates:

```
ratio = demand / capacity
```

The ratio is mapped to one of five levels.

| Backend value | Participant UI |
| ------------- | -------------- |
| VERY_GOOD     | 🟢 Remek       |
| GOOD          | 🟡 Jó          |
| LOW           | ⚪ Kicsi        |
| VERY_LOW      | 🟠 Alig        |
| HOPELESS      | 🔴 Felejtős    |

The exact ratio thresholds are backend configuration and may evolve based on real festival experience.

---

# Presentation

The participant application displays Esély in the daily programme header.

Example:

```
SZERDA                 🟡 Jó

❤️ 4      💛 2
```

The application may also display:

```
Frissítve: 13:00
```

to indicate when the metrics were last calculated.

---

# Design Principles

* Metrics help participants make informed decisions.
* Metrics are intentionally simple.
* Participants see only the interpreted result (Esély), not the underlying calculations.
* The backend owns all calculations.
* The frontend is responsible only for presentation.

---

# Future Extensions

Possible future metrics include:

* programme-specific Esély
* historical demand trends
* volunteer capacity forecasting

These are explicitly out of scope for the festival MVP.
