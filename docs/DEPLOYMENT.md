# Deployment

## Backend: bound Apps Script

1. Create the festival Google Spreadsheet.
2. In the spreadsheet, open **Extensions → Apps Script**.
3. Replace the default script and add every file from `apps-script/`, including `appsscript.json`.
4. In **Project Settings**, confirm the V8 runtime and the `Europe/Budapest` time zone from the manifest.
5. Set `Config.PROGRAMME_DATA_URL` to an accessible URL serving the generated `data/2026/programs.json` file. Do not use a private local URL.
6. Choose **Deploy → New deployment → Web app**.
7. Run as the account that owns or manages the spreadsheet, so the web app can read and write its bound sheets.
8. Grant access only to the trusted festival group. Use the narrowest Google account/domain setting that includes every participant; if anonymous participant access is required, understand that the API uses lightweight UUID recognition rather than authentication.
9. Deploy and copy the Web App URL ending in `/exec`.
10. Set `SORSZAMVADASZ_API_URL` as shown in `apps-script/CURL_EXAMPLES.md`, then run its smoke tests in this order:
   register, identical registration retry, different-ID duplicate register, getParticipant, syncSelections, getParticipant again, getDayStatus.

The Users sheet migration adds a `registrationId` header as the final column without changing existing rows. Existing users may have a blank value.

To update an existing web app after code changes, open **Deploy → Manage deployments**, select the web-app deployment, choose **Edit**, select **New version**, then deploy. Keep using the copied `/exec` URL unless Google changes it.

## Frontend

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SORSZAMVADASZ_API_URL` to the deployed Apps Script `/exec` URL.
3. Run `npm run build`.
4. Deploy the generated `dist/` directory with the environment variable set in the frontend host's build configuration.

The deployment URL is public configuration, not a secret, but it must not be committed as a real project value. The Apps Script project requires Spreadsheet and URL Fetch authorization; URL Fetch is used for the official programme data.

## Admin participant reset

This is a manual recovery tool in `AdminParticipantReset.gs`, not a web endpoint.

1. Set `ADMIN_RESET_ENVIRONMENT` and `ADMIN_RESET_USER_ID`.
2. Run `previewParticipantReset()` and verify the logged display name and related-row counts.
3. Set `ADMIN_RESET_CONFIRMATION = "DELETE"` and run `deleteParticipantReset()`.
4. Clear the confirmation value immediately afterwards.
5. Run `publishMetrics()` to refresh published counts.
6. Ask the participant to clear site data or use a private window before registering again.
