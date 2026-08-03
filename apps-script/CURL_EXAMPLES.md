# API request examples

```bash
export SORSZAMVADASZ_API_URL="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
```

Successful registration:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"register","payload":{"environment":"LIVE","displayName":"Zoli Cisco","selections":{}}}' \
  | python3 -m json.tool
```

Duplicate display name (run after the successful registration):

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"register","payload":{"environment":"LIVE","displayName":"zoli cisco","selections":{}}}' \
  | python3 -m json.tool
```

Invalid environment:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"register","payload":{"environment":"TEST","displayName":"Zoli Cisco","selections":{}}}' \
  | python3 -m json.tool
```

Invalid display name:

```bash
curl -X POST "$SORSZAMVADASZ_API_URL" -H 'Content-Type: application/json' \
  -d '{"action":"register","payload":{"environment":"LIVE","displayName":"   ","selections":{}}}' \
  | python3 -m json.tool
```
```
