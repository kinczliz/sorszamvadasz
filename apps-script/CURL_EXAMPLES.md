# API request examples

```bash
export SORSZAMVADASZ_API_URL="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
```

First successful registration:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"register","payload":{"environment":"LIVE","displayName":"Zoli Cisco","registrationId":"11111111-1111-4111-8111-111111111111","selections":{}}}' \
  | python3 -m json.tool
```

Retry with the identical registration ID (returns the originally created user):

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" -H "Content-Type: application/json" --data-binary @- <<'JSON' | python3 -m json.tool
{"action":"register","payload":{"environment":"LIVE","displayName":"Zoli Cisco","registrationId":"11111111-1111-4111-8111-111111111111","selections":{}}}
JSON
```

Same name with a different registration ID (returns `DISPLAY_NAME_TAKEN`):

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" -H "Content-Type: application/json" --data-binary @- <<'JSON' | python3 -m json.tool
{"action":"register","payload":{"environment":"LIVE","displayName":"Zoli Cisco","registrationId":"22222222-2222-4222-8222-222222222222","selections":{}}}
JSON
```

Duplicate display name (run after the successful registration):

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"register","payload":{"environment":"LIVE","displayName":"zoli cisco","registrationId":"33333333-3333-4333-8333-333333333333","selections":{}}}' \
  | python3 -m json.tool
```

Invalid environment:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"register","payload":{"environment":"TEST","displayName":"Zoli Cisco","registrationId":"44444444-4444-4444-8444-444444444444","selections":{}}}' \
  | python3 -m json.tool
```

Invalid display name:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"register","payload":{"environment":"LIVE","displayName":"   ","registrationId":"55555555-5555-4555-8555-555555555555","selections":{}}}' \
  | python3 -m json.tool
```

Successful participant lookup:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"getParticipant","payload":{"environment":"LIVE","userId":"USER_UUID"}}' \
  | python3 -m json.tool
```

Unknown participant:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"getParticipant","payload":{"environment":"LIVE","userId":"00000000-0000-4000-8000-000000000000"}}' \
  | python3 -m json.tool
```

Invalid environment:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"getParticipant","payload":{"environment":"TEST","userId":"00000000-0000-4000-8000-000000000000"}}' \
  | python3 -m json.tool
```

Malformed user ID:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"getParticipant","payload":{"environment":"LIVE","userId":"not-a-uuid"}}' \
  | python3 -m json.tool
```

Successful selection replacement:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"syncSelections","payload":{"environment":"LIVE","userId":"USER_UUID","selections":{"7a4e2012-f5c7-5a39-b8bb-d8d8b1a87505":"WANT"}}}' \
  | python3 -m json.tool
```

Empty map / Újrakezdem:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"syncSelections","payload":{"environment":"LIVE","userId":"USER_UUID","selections":{}}}' \
  | python3 -m json.tool
```

Unknown user:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"syncSelections","payload":{"environment":"LIVE","userId":"00000000-0000-4000-8000-000000000000","selections":{}}}' \
  | python3 -m json.tool
```

Invalid programme ID:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"syncSelections","payload":{"environment":"LIVE","userId":"USER_UUID","selections":{"00000000-0000-4000-8000-000000000000":"WANT"}}}' \
  | python3 -m json.tool
```

Invalid priority:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"syncSelections","payload":{"environment":"LIVE","userId":"USER_UUID","selections":{"7a4e2012-f5c7-5a39-b8bb-d8d8b1a87505":"MAYBE"}}}' \
  | python3 -m json.tool
```

Daily limit exceeded:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"syncSelections","payload":{"environment":"LIVE","userId":"USER_UUID","selections":{"7a4e2012-f5c7-5a39-b8bb-d8d8b1a87505":"WANT","da77a7ef-9d3f-528f-85ba-dd9b86fad6d7":"WANT","580e8e07-9646-5cc2-9a6b-0b91d2f7252e":"WANT"}}}' \
  | python3 -m json.tool
```

Attempt to change a CLOSED day (after setting that programme day to `CLOSED` in DayStates):

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"syncSelections","payload":{"environment":"LIVE","userId":"USER_UUID","selections":{"7a4e2012-f5c7-5a39-b8bb-d8d8b1a87505":"WANT"}}}' \
  | python3 -m json.tool
```

Idempotent resubmission (repeat the successful replacement request unchanged):

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"syncSelections","payload":{"environment":"LIVE","userId":"USER_UUID","selections":{"7a4e2012-f5c7-5a39-b8bb-d8d8b1a87505":"WANT"}}}' \
  | python3 -m json.tool
```

Successful LIVE day-status request:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"getDayStatus","payload":{"environment":"LIVE"}}' \
  | python3 -m json.tool
```

Successful DEMO day-status request:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"getDayStatus","payload":{"environment":"DEMO"}}' \
  | python3 -m json.tool
```

Invalid environment:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"getDayStatus","payload":{"environment":"TEST"}}' \
  | python3 -m json.tool
```

Before any metrics exist (returns zero counts and `null` metrics):

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"getDayStatus","payload":{"environment":"LIVE"}}' \
  | python3 -m json.tool
```

Volunteer overview, successful LIVE request:

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'JSON' \
| python3 -m json.tool
{"action":"getVolunteerOverview","payload":{"environment":"LIVE","date":"2026-08-04"}}
JSON
```

Volunteer overview, DEMO request:

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'JSON' \
| python3 -m json.tool
{"action":"getVolunteerOverview","payload":{"environment":"DEMO","date":"2026-08-04"}}
JSON
```

Volunteer overview, invalid date:

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'JSON' \
| python3 -m json.tool
{"action":"getVolunteerOverview","payload":{"environment":"LIVE","date":"2026-08-09"}}
JSON
```

Volunteer overview, invalid environment:

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'JSON' \
| python3 -m json.tool
{"action":"getVolunteerOverview","payload":{"environment":"TEST","date":"2026-08-04"}}
JSON
```

Volunteer overview before the first metrics publication (returns zero programme counts and `null` metrics):

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'JSON' \
| python3 -m json.tool
{"action":"getVolunteerOverview","payload":{"environment":"LIVE","date":"2026-08-04"}}
JSON
```

Volunteer signup:

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" -H "Content-Type: application/json" --data-binary @- <<'JSON' | python3 -m json.tool
{"action":"setVolunteerStatus","payload":{"environment":"LIVE","userId":"USER_UUID","date":"2026-08-04","active":true}}
JSON
```

Volunteer withdrawal:

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" -H "Content-Type: application/json" --data-binary @- <<'JSON' | python3 -m json.tool
{"action":"setVolunteerStatus","payload":{"environment":"LIVE","userId":"USER_UUID","date":"2026-08-04","active":false}}
JSON
```

Duplicate signup / idempotent signup (repeat the signup request unchanged):

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" -H "Content-Type: application/json" --data-binary @- <<'JSON' | python3 -m json.tool
{"action":"setVolunteerStatus","payload":{"environment":"LIVE","userId":"USER_UUID","date":"2026-08-04","active":true}}
JSON
```

Unknown user:

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" -H "Content-Type: application/json" --data-binary @- <<'JSON' | python3 -m json.tool
{"action":"setVolunteerStatus","payload":{"environment":"LIVE","userId":"00000000-0000-4000-8000-000000000000","date":"2026-08-04","active":true}}
JSON
```

Invalid date:

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" -H "Content-Type: application/json" --data-binary @- <<'JSON' | python3 -m json.tool
{"action":"setVolunteerStatus","payload":{"environment":"LIVE","userId":"USER_UUID","date":"2026-08-09","active":true}}
JSON
```

FINISHED-day rejection (after setting the day state to `FINISHED`):

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" -H "Content-Type: application/json" --data-binary @- <<'JSON' | python3 -m json.tool
{"action":"setVolunteerStatus","payload":{"environment":"LIVE","userId":"USER_UUID","date":"2026-08-04","active":true}}
JSON
```

Programme requestors setup:

```bash
export VOLUNTEER_ACCESS_CODE="..."
```

Successful programme requestor lookup:

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" -H "Content-Type: application/json" --data-binary @- <<JSON | python3 -m json.tool
{"action":"getProgrammeRequestors","payload":{"environment":"LIVE","programmeId":"7a4e2012-f5c7-5a39-b8bb-d8d8b1a87505","accessCode":"$VOLUNTEER_ACCESS_CODE"}}
JSON
```

Wrong volunteer access code:

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" -H "Content-Type: application/json" --data-binary @- <<'JSON' | python3 -m json.tool
{"action":"getProgrammeRequestors","payload":{"environment":"LIVE","programmeId":"7a4e2012-f5c7-5a39-b8bb-d8d8b1a87505","accessCode":"wrong-code"}}
JSON
```

Invalid programme ID:

```bash
curl -sS -L "$SORSZAMVADASZ_API_URL" -H "Content-Type: application/json" --data-binary @- <<JSON | python3 -m json.tool
{"action":"getProgrammeRequestors","payload":{"environment":"LIVE","programmeId":"00000000-0000-4000-8000-000000000000","accessCode":"$VOLUNTEER_ACCESS_CODE"}}
JSON
```
