# Red30 Tech Dashboard — mobile app

React Native (Expo + TypeScript) app that turns the workbooks in `../Spreadsheets` into a
mobile dashboard. It mirrors `../Web/Red30 Tech Dashboard.html`:

- **Consolidated Dashboard** (main page): KPI tiles, buttons for each section, data notes, theme toggle
- **Five-Year Financial Performance**: revenue, net income, gross margin trends (+ budget forecast point)
- **Balance Sheet Composition**: assets and liabilities/equity stacked columns on a shared scale
- **2018 Expense Breakdown**: labor, marketing and overhead by category
- **E-Commerce Sales Performance**: revenue by region, category, channel and top sales reps
- **Product Catalog**: top products by revenue

Each section page has a header back button and a "Back to Consolidated Dashboard" link.

## How the data gets in

Phones can't read the `Spreadsheets` folder directly, so the data is converted at build time:

```
../Spreadsheets/*.xlsx  ──(npm run build:data)──▶  src/data/dashboard.json  ──▶  app screens
```

`scripts/build-data.ts` parses the workbooks with SheetJS, aggregates them (same logic as
`../dashboard.py`), and writes a small JSON file that is bundled into the app. It runs
automatically before `npm start`, `npm run android` and `npm run ios`. After you change a
workbook, restart the dev server (or run `npm run build:data`) to pick up the new numbers.
Set `RED30_DATA_DIR` to read workbooks from a different folder.

`dashboard.json` is committed so the app builds even without running the script; it only
changes when the workbooks change.

## Getting started

Requirements: Node 20+ and npm. For a device, install **Expo Go** (Android/iOS) or use an
Android emulator / iOS simulator.

```bash
cd mobile
npm install
npm start          # regenerates data, then starts Expo: scan the QR code with Expo Go
npm run android    # same, opening an Android emulator/device
npm run ios        # same, opening the iOS simulator (macOS only)
npm run web        # quick preview in a browser
```

Other scripts:

| Script | What it does |
|---|---|
| `npm run build:data` | Regenerate `src/data/dashboard.json` from the workbooks |
| `npm run typecheck` | TypeScript check of the app and the data script |

Installable builds: `npx eas-cli@latest build -p android` (or `-p ios`) — see the Expo EAS docs.

## Project layout

```
mobile/
├── app.json                 Expo config (name, scheme, bundle ids)
├── scripts/build-data.ts    xlsx → dashboard.json converter (build time only)
└── src/
    ├── app/                 expo-router screens (one file = one route)
    │   ├── _layout.tsx      Stack navigator + theme
    │   ├── index.tsx        Consolidated Dashboard (main page)
    │   ├── financial-performance.tsx
    │   ├── balance-sheet.tsx
    │   ├── expenses.tsx
    │   ├── ecommerce.tsx
    │   └── product-catalog.tsx
    ├── components/          Card, KpiGrid, HBarList, TrendLineChart, StackedColumnChart, …
    ├── data/                dashboard.json (generated) + typed accessor
    ├── lib/                 number formatting, section list for the main page
    ├── theme/               light/dark color tokens (same as the HTML dashboard)
    └── types/dashboard.ts   JSON schema shared by the script and the app
```

## Dependencies

Runtime: `expo`, `expo-router`, `react-native-svg` (charts), `react-native-safe-area-context`,
`react-native-screens`, `expo-status-bar`, `react-native-web` + `react-dom` (browser preview).
Build-time only: `xlsx` (SheetJS, installed from the official SheetJS CDN), `tsx`, `typescript`.

Charts are small hand-written SVG components — no chart library — so they match the web
dashboard's palette and styling in both light and dark mode.

## Security notes

**Do not run `npm audit fix --force`.** It ignores Expo's version constraints and "fixes"
advisories by downgrading core packages (e.g. `expo` 57 → 44, `react-native` 0.86 → 0.72),
which breaks the app. If it happens, restore with
`git restore package.json package-lock.json && npm install`.

`npm audit` reports high/moderate findings that come from Expo SDK 57's own dependencies
(as of Oct 2026). They have no safe fix in this project:

| Package | Pulled in by | Where it runs | Why it isn't fixed here |
|---|---|---|---|
| `braces` | Metro bundler | Dev machine only | No patched release exists |
| `node-forge` | Expo CLI code signing | Dev machine only | No patched release exists |
| `uuid` | iOS project tooling (`xcode`) | Dev machine / build only | Fix is a major-version jump the tooling doesn't support |
| `decode-uri-component` | `expo-router` → `query-string` | In the app (deep-link parsing) | Fixed version is ESM-only and breaks `query-string` |

The other flagged packages are only listed because they depend on one of these four.
Practical risk is low: three never ship in the app, and the app itself has no login,
network calls or user data — the worst case is a malformed `red30://` link slowing it down.

To pick up fixes as Expo releases them:

```bash
npx expo install --fix         # move to the latest SDK-compatible patch versions
npx expo install expo@latest   # when upgrading to a new Expo SDK, then run --fix again
npx expo-doctor                # confirm dependencies are consistent
```

Routine `npm install` warnings (deprecated packages, peer-dependency notices) are normal for
React Native projects and need no action.
