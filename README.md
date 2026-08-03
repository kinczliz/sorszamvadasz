# Sorszámvadász

Közösségi segédeszköz az Ördögkatlan résztvevőinek.

## Requirements

- Node.js 20 or later
- npm 10 or later

## Getting started

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal. Open it in a browser.

## Backend configuration

The participant app requires an Apps Script Web App URL. Copy `.env.example` to
`.env.local` and set `VITE_SORSZAMVADASZ_API_URL` to the deployed `/exec` URL:

```bash
cp .env.example .env.local
```

The local frontend shows a clear unavailable-system message until this value is
configured. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the bound Apps Script
setup and smoke-test sequence.

## Available commands

- `npm run dev` — starts the local development server
- `npm run build` — type-checks the project and creates a production build in `dist/`
- `npm run import-programs` — imports the official programme workbook into JSON
- `npm run preview` — previews the production build locally

## Updating the 2026 programme

The app reads the generated `data/2026/programs.json` file. It never reads Excel
in the browser.

1. Replace `data/2026/Programok.xlsx` with the updated workbook from the organisers.
2. Run `npm run import-programs`.
3. Commit both `Programok.xlsx` and `programs.json`.
4. Push.

The importer validates the `DAY-id`, `PROGRAM_NAME`, `TYPE`, `TIME`, and `LOCATION`
columns before generating the JSON file.

## Project structure

```text
src/
  App.tsx       Application root component
  main.tsx      React entry point
  programs.ts   Typed access to the generated programme data
  ProgrammeBrowser.tsx
                 Read-only programme browser
  styles.css    Global mobile-first styles
scripts/
  import-programs.mjs
                 Converts the organiser workbook into the app dataset
data/2026/
  Programok.xlsx Official organiser source file
  programs.json Generated programme dataset
docs/           Product and domain documentation
```
