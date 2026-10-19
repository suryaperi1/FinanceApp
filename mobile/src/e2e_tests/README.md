# Red30 Dashboard — Mobile E2E Test Automation Guide

End-to-end UI tests for the Red30 Dashboard mobile app (`mobile/`), running against the real
app on **Android** (emulator/device) and **iOS** (simulator/device).

**Stack:** TypeScript · [WebdriverIO 9](https://webdriver.io) (test runner + client) ·
[Appium 3](https://appium.io) (device automation server) · Mocha (BDD `describe`/`it`) ·
UiAutomator2 driver (Android) / XCUITest driver (iOS).

> **Why Appium and not Playwright?** Playwright automates browsers only, so it can test the
> web build of the app (`npm run web`) but not the native iOS/Android apps. Appium drives the
> real native apps using the platform's own automation frameworks. WebdriverIO's API (`$`,
> `waitForDisplayed`, `expect`) will feel familiar if you know Playwright.

---

## 1. How it works

```
 specs/*.spec.ts ──▶ pages/*Page.ts ──▶ utils/locators.ts ──▶ WebdriverIO ──▶ Appium server ──▶ UiAutomator2 (Android)
 (what to test)      (how to do it)     (iOS/Android            (client)      (started by       XCUITest     (iOS)
                                         selectors)                            wdio service)        │
                                                                                                    ▼
                                                                                             Red30 Dashboard app
```

1. `wdio run config/wdio.<platform>.conf.ts` starts the **Appium server** automatically
   (`@wdio/appium-service`), using the Appium installed in this folder's `node_modules`.
2. For each spec file, WebdriverIO opens an Appium **session**, which launches the app on the
   device using the capabilities in the platform config.
3. Specs call **page objects**, and page objects find elements through **cross-platform
   locators** built from React Native `testID`s.
4. Results go to the console (spec reporter). A screenshot of each failed test goes to
   `reports/screenshots/`, and Appium/WDIO logs go to `reports/logs/`.

## 2. Folder layout

```
mobile/src/e2e_tests/
├── package.json            Test-only dependencies (kept separate from the Expo app)
├── tsconfig.json           TypeScript settings for the tests
├── config/
│   ├── env.ts              App ids + every environment variable the suite reads
│   ├── wdio.shared.conf.ts Runner, Appium service, Mocha, reporters, failure screenshots
│   ├── wdio.android.conf.ts Android capabilities (UiAutomator2)
│   └── wdio.ios.conf.ts    iOS capabilities (XCUITest)
├── data/
│   └── dashboard.json      Expected values (titles, testIDs) the tests assert against
├── pages/                  Page Object Model: one class per screen
│   ├── BasePage.ts         Shared behaviour: waitForLoaded, scroll, tap, getText, …
│   ├── DashboardPage.ts    Consolidated Dashboard (src/app/index.tsx)
│   └── FinancialPerformancePage.ts  Five-Year Financial Performance (src/app/financial-performance.tsx)
├── specs/                  The tests (*.spec.ts), one file per feature
│   ├── consolidatedDashboard.spec.ts
│   └── financialPerformance.spec.ts
├── utils/                  Reusable functions
│   ├── locators.ts         byTestId / byText / byPartialText (iOS + Android selectors)
│   ├── gestures.ts         swipe, scrollUntilDisplayed
│   ├── app.ts              relaunchApp, appId, getAccessibilityLabel
│   └── testData.ts         Typed loader for the JSON files in data/
└── reports/                Generated: logs + failure screenshots (git-ignored)
```

The folder is isolated from the app: the app's `tsconfig.json` and `eslint.config.js` exclude
it, and `mobile/metro.config.js` blocks it from the Metro bundler, so test code and test
dependencies never end up in the app.

## 3. Current test coverage

| Spec | Test | What it checks |
|---|---|---|
| `consolidatedDashboard.spec.ts` | is shown as the main screen with its title | App launches on the dashboard; title is "Red30 Tech — Consolidated Dashboard" |
| | shows the KPI tiles | KPI grid is rendered |
| `financialPerformance.spec.ts` | is listed on the Consolidated Dashboard | "Five-Year Financial Performance" button is present |
| | opens its screen with the section title and all charts | Tapping it opens the screen; header title plus Gross Revenue, Net Income and Gross Margin charts |
| | returns to the Consolidated Dashboard via the back link | "← Back to Consolidated Dashboard" works |

Every test starts by relaunching the app (`relaunchApp()` in `beforeEach`), so tests are
independent and can run in any order.

## 4. Prerequisites

| | Android | iOS |
|---|---|---|
| OS | Windows, macOS or Linux | **macOS only** |
| Tools | Node 20.19+, JDK 17, Android Studio (SDK, **Emulator**, platform-tools) | Node 20.19+, Xcode + a simulator runtime |
| Env vars | `ANDROID_HOME` (e.g. `%LOCALAPPDATA%\Android\Sdk`), `JAVA_HOME` | — |
| Device | An emulator (AVD) running, or a USB device with debugging on (`adb devices` lists it) | A booted simulator, or a provisioned real device |

## 5. One-time setup

```bash
cd mobile/src/e2e_tests
npm install                # WebdriverIO, Appium and the UiAutomator2 driver
npm run doctor:android     # Appium checks your Android setup and lists anything missing

# macOS, for iOS:
npm run setup:ios          # installs the XCUITest driver (adds it to package.json; commit that)
npm run doctor:ios
```

Appium treats this folder as its home, so drivers are recorded in `package.json` and
reinstalled by `npm install`.

## 6. Build and install the app under test

The tests need a **native build** of the app. Expo Go can't be used because Appium launches
the app by its package/bundle id (`com.red30tech.dashboard`). Use a **Release** build: it bundles
the JavaScript, so no Metro dev server is needed while tests run.

> **`npm run android` / `npm run ios` are not enough.** Those scripts run `expo start`, which
> opens the app inside **Expo Go**. `com.red30tech.dashboard` is never installed, and Appium
> fails with *"Either provide 'app' option to install 'com.red30tech.dashboard'…"*.

```bash
cd mobile
npm install

# Android: builds, installs and launches on the running emulator/device
npx expo run:android --variant release
#   APK: mobile/android/app/build/outputs/apk/release/app-release.apk

# Android, build the APK only (no device needed); then set ANDROID_APP to install it from the tests
npx expo prebuild -p android      # only if mobile/android/ doesn't exist yet
cd android && ./gradlew assembleRelease     # Windows: .\gradlew.bat assembleRelease

# iOS (macOS): builds, installs and launches on the booted simulator
npx expo run:ios --configuration Release
```

`expo run:*` generates the `android/` and `ios/` folders (Continuous Native Generation). They
are git-ignored; never edit them by hand.

There are two ways to point the tests at the app:

- **Installed app (default):** leave `ANDROID_APP` / `IOS_APP` unset. Appium launches the app
  already on the device.
- **Install from file:** set `ANDROID_APP` to the `.apk` path or `IOS_APP` to the `.app`/`.ipa`
  path. Appium installs it fresh at the start of each session. Use this in CI.

**After changing app code, rebuild and reinstall before re-running tests.**

## 7. Running tests

```bash
cd mobile/src/e2e_tests
npm run test:android
npm run test:ios

# from mobile/ (same thing)
npm run e2e:android
npm run e2e:ios

# a single spec file
npx wdio run ./config/wdio.android.conf.ts --spec ./specs/financialPerformance.spec.ts

# a single test by name
npx wdio run ./config/wdio.android.conf.ts --mochaOpts.grep "back link"

npm run typecheck          # type-check the test code (run before committing)
```

### Configuration (environment variables)

All are optional. They are read in `config/env.ts`.

| Variable | Default | Purpose |
|---|---|---|
| `ANDROID_APP` | unset → use installed app | Path to the `.apk` to install |
| `ANDROID_DEVICE_NAME` | `Android Emulator` | Shown in reports; Appium uses the first device otherwise |
| `ANDROID_AVD` | unset → a device must already be running | Emulator name from `emulator -list-avds` (e.g. `Medium_Phone_API_37.0`). Appium boots it if it isn't running |
| `ANDROID_UDID` | unset | Serial from `adb devices`, when several devices are connected |
| `ANDROID_PLATFORM_VERSION` | unset | Require a specific Android version, e.g. `15` |
| `IOS_APP` | unset → use installed app | Path to the simulator `.app` or device `.ipa` |
| `IOS_DEVICE_NAME` | `iPhone 17` | Simulator to use (must exist in Xcode → Devices) |
| `IOS_UDID` | unset | Exact simulator/device id (`xcrun simctl list devices`) |
| `IOS_PLATFORM_VERSION` | unset | iOS version, e.g. `26.0` |
| `E2E_WAIT_TIMEOUT` | `15000` | Default wait for elements (ms) |
| `APPIUM_PORT` | `4723` | Port for the Appium server the suite starts |

```powershell
# PowerShell
$env:ANDROID_AVD = "Medium_Phone_API_37.0"
$env:ANDROID_APP = "C:\path\to\mobile\android\app\build\outputs\apk\release\app-release.apk"
npm run test:android
```
```bash
# bash / zsh
IOS_DEVICE_NAME="iPhone 16 Pro" npm run test:ios
```

## 8. Locators: how elements are found

**Rule: locate by `testID`.** It is stable across copy changes, themes and languages, and
works the same on both platforms. React Native maps `testID` to:

- Android: the view's **resource-id**. Selector: `android=new UiSelector().resourceId("…")`
- iOS: the **accessibilityIdentifier**. Selector: `~…` (Appium "accessibility id")

`utils/locators.ts` hides that difference:

```ts
$(byTestId('dashboard-title'))                    // preferred
$(byText('Five-Year Financial Performance'))      // exact visible text (e.g. native header titles)
$(byPartialText('Consolidated'))                  // text contains
```

testIDs currently in the app:

| testID | Element | File |
|---|---|---|
| `dashboard-screen` | Dashboard scroll view | `src/app/index.tsx` |
| `dashboard-title` | "Red30 Tech — Consolidated Dashboard" heading | `src/app/index.tsx` |
| `kpi-grid` | KPI tiles container | `src/components/KpiGrid.tsx` |
| `nav-financial-performance`, `nav-balance-sheet`, `nav-expenses`, `nav-ecommerce`, `nav-product-catalog` | Section buttons on the dashboard | `src/lib/sections.ts` |
| `financial-performance-screen` | Financial Performance scroll view | `src/app/financial-performance.tsx` |
| `chart-gross-revenue`, `chart-net-income`, `chart-gross-margin` | Chart cards | `src/app/financial-performance.tsx` |
| `<card testID>-title` | Title text of any `Card` given a testID | `src/components/Card.tsx` |
| `back-to-dashboard` | "← Back to Consolidated Dashboard" link | `src/components/Screen.tsx` |

**Adding a testID:** add `testID="kebab-case-name"` to the component (`Screen` and `Card`
accept a `testID` prop), rebuild the app, and add the id to the page object. Things to know:

- **iOS hides the children of accessible elements.** A `Pressable` (or a `View` with
  `accessible`) is a single element to XCUITest, so `Text` inside it can't be found
  separately. Put the testID on the `Pressable` and read its label (`getAccessibilityLabel`);
  the section buttons work this way.
- **Android only exposes on-screen views.** Anything below the fold has to be scrolled to first.
  `BasePage` helpers do this for you through `scrollUntilDisplayed`.
- The **native header title** (stack navigator) has no testID, so match it with `byText`.

Use **Appium Inspector** to explore the element tree of a running app. Connect it to
`http://127.0.0.1:4723` with the same capabilities as `config/wdio.<platform>.conf.ts`.

## 9. Page Object Model conventions

- **One class per screen** in `pages/`, extending `BasePage`, exported as a **singleton**
  (`export default new DashboardPage()`).
- Each page sets `screenTestId` (its root testID). `waitForLoaded()` uses it.
- **Selectors are private** to the page (`private readonly ids = { … }`). Specs never contain
  selectors or `$()` calls.
- Public methods describe **intent**, not mechanics: `openFinancialPerformance()`, not
  `tapElement('nav-…')`. Methods that navigate return the next page object, already loaded.
- Page methods **return values** (`getTitle()`, `isChartDisplayed()`). **Assertions belong in
  specs**, so one page can serve many tests.

`BasePage` gives subclasses `scrollTo`, `isDisplayed`, `getText`, `getLabel`, `tap` and
`isTextVisible`. Each one scrolls the element into view first.

## 10. Test data

Expected values live in `data/*.json`, not in specs, so a copy change means a one-line
data edit. `utils/testData.ts` loads them with types:

```ts
import { dashboardData } from '../utils/testData';
const section = dashboardData.sections.financialPerformance;   // { title, navTestId, charts[] }
```

To add a data file: create `data/<name>.json`, add an interface in `utils/testData.ts`, and
load it with `loadData<YourType>('<name>')`.

The expected values match `src/lib/sections.ts` and the screen files. When the app's copy
changes, update `data/dashboard.json` in the same PR.

## 11. Writing a new test — worked example

Goal: verify the **Balance Sheet Composition** section opens.

1. **App:** give the screen a root testID. In `src/app/balance-sheet.tsx` use
   `<Screen testID="balance-sheet-screen">`. The nav button already has `nav-balance-sheet`.
2. **Data:** in `data/dashboard.json` add:
   ```json
   "balanceSheet": { "title": "Balance Sheet Composition", "navTestId": "nav-balance-sheet", "charts": [] }
   ```
   and add `balanceSheet: SectionData` to `DashboardData` in `utils/testData.ts`.
3. **Page object:** `pages/BalanceSheetPage.ts`
   ```ts
   import { BasePage } from './BasePage';

   class BalanceSheetPage extends BasePage {
     protected readonly screenTestId = 'balance-sheet-screen';
     isHeaderTitleDisplayed(title: string) { return this.isTextVisible(title); }
   }
   export default new BalanceSheetPage();
   ```
   In `DashboardPage`, add `openBalanceSheet(navTestId)` that taps and returns
   `BalanceSheetPage.waitForLoaded()`.
4. **Spec:** `specs/balanceSheet.spec.ts`
   ```ts
   import { expect } from '@wdio/globals';
   import DashboardPage from '../pages/DashboardPage';
   import { relaunchApp } from '../utils/app';
   import { dashboardData } from '../utils/testData';

   const section = dashboardData.sections.balanceSheet;

   describe('Balance Sheet Composition', () => {
     beforeEach(async () => {
       await relaunchApp();
       await DashboardPage.waitForLoaded();
     });

     it('opens from the dashboard', async () => {
       const page = await DashboardPage.openBalanceSheet(section.navTestId);
       expect(await page.isHeaderTitleDisplayed(section.title)).toBe(true);
     });
   });
   ```
5. Rebuild the app, run `npm run typecheck`, then run the spec on **both** platforms.

## 12. Debugging and troubleshooting

| Symptom | Fix |
|---|---|
| `Could not find a connected Android device` | Appium does not start emulators by default. Set `ANDROID_AVD`, or start one yourself (Android Studio → Device Manager) and check `adb devices` |
| `Either provide 'app' option to install 'com.red30tech.dashboard'…` | The native app isn't on the device (you probably ran it in Expo Go via `npm run android`). Build it (§6) and either install it or set `ANDROID_APP` |
| `Activity used to start app doesn't exist` | Same as above: build and install (§6) or set `ANDROID_APP` |
| App opens to a red screen / "Unable to load script" | You installed a **debug** build without Metro running. Use `--variant release` / `--configuration Release` |
| Element not found but visible in the app | Old build without the testID: rebuild. On iOS, check that it isn't inside an accessible parent (§8) |
| `Element not found after 8 swipes` | Wrong testID, or the element is on another screen. Check with Appium Inspector |
| iOS: first run is very slow | WebDriverAgent is compiled on first use (several minutes). Later runs are fast |
| Port 4723 in use | Another Appium is running. Stop it or set `APPIUM_PORT` |
| Flaky timing | Use `waitForDisplayed`/page helpers, never fixed sleeps. Raise `E2E_WAIT_TIMEOUT` on slow CI machines |

Where to look:

- `reports/screenshots/`: screen at the moment a test failed
- `reports/logs/`: Appium server log and per-worker WebdriverIO logs
- More detail: set `logLevel: 'info'` (or `'debug'`) in `config/wdio.shared.conf.ts`

## 13. Running in CI (outline)

- **Android:** Linux runner with KVM (e.g. GitHub Actions `ubuntu-latest` +
  `reactivecircus/android-emulator-runner`). Steps: `npm ci` in `mobile/`, run
  `npx expo prebuild -p android`, then `cd android && ./gradlew assembleRelease`, `npm ci` in
  `e2e_tests/`, then `ANDROID_APP=<apk path> npm run test:android`.
- **iOS:** macOS runner. Run `npx expo run:ios --configuration Release` (or
  `xcodebuild` for a simulator `.app`), then `npm run setup:ios`, then `npm run test:ios`.
- Upload `mobile/src/e2e_tests/reports/` as a build artifact.

## 14. Conventions checklist

- [ ] New UI that tests touch has a `testID` (kebab-case, prefixed by type: `nav-`, `chart-`, `…-screen`)
- [ ] No selectors or `$()` in specs; no assertions in page objects
- [ ] Expected text lives in `data/`, not hard-coded in specs
- [ ] Each test is independent (relaunches the app in `beforeEach`)
- [ ] No `driver.pause()`; wait for a condition instead
- [ ] `npm run typecheck` passes; spec run on Android **and** iOS
