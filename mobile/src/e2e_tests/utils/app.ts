import { driver } from '@wdio/globals';

import { APP_ID } from '../config/env';

/** Bundle id (iOS) or package name (Android) of the app under test. */
export const appId = (): string => (driver.isAndroid ? APP_ID.android : APP_ID.ios);

/** Kill and relaunch the app so every test starts on the Consolidated Dashboard. */
export async function relaunchApp(): Promise<void> {
  await driver.terminateApp(appId());
  await driver.activateApp(appId());
}

/** Accessibility label of an element (content-desc on Android, label on iOS). */
export async function getAccessibilityLabel(element: WebdriverIO.Element): Promise<string> {
  return (await element.getAttribute(driver.isAndroid ? 'content-desc' : 'label')) ?? '';
}
