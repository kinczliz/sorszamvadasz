# API request examples

Set `API_URL` to the Apps Script web-app URL before running these requests.

```bash
curl -X POST "$API_URL" -H 'Content-Type: application/json' -d '{"action":"register","environment":"LIVE"}'
curl -X POST "$API_URL" -H 'Content-Type: application/json' -d '{"action":"syncSelections","environment":"LIVE"}'
curl -X POST "$API_URL" -H 'Content-Type: application/json' -d '{"action":"getDayStatus","environment":"LIVE"}'
curl -X POST "$API_URL" -H 'Content-Type: application/json' -d '{"action":"getParticipant","environment":"LIVE"}'
```

Each request currently returns `NOT_IMPLEMENTED`, for example:

```json
{
  "ok": false,
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "The register action is not implemented yet."
  }
}
```
