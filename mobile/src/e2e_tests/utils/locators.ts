import { driver } from '@wdio/globals';

/**
 * Cross-platform selector builders. Page objects use these instead of raw selector strings,
 * so a locator works on both iOS and Android.
 *
 * React Native maps the `testID` prop to:
 *   - Android: the view's resource-id
 *   - iOS:     the accessibilityIdentifier (Appium's "accessibility id")
 */

/** Escape a value for use inside a double-quoted selector string. */
const quote = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** Element whose React Native `testID` is exactly `testId`. Preferred locator. */
export function byTestId(testId: string): string {
  return driver.isAndroid ? `android=new UiSelector().resourceId(${quote(testId)})` : `~${testId}`;
}

/**
 * Element whose visible text is exactly `text`. Use for things that have no testID,
 * such as the native navigation-bar title.
 */
export function byText(text: string): string {
  return driver.isAndroid
    ? `android=new UiSelector().text(${quote(text)})`
    : `-ios predicate string:label == ${quote(text)} OR name == ${quote(text)}`;
}

/** Element whose visible text contains `text`. */
export function byPartialText(text: string): string {
  return driver.isAndroid
    ? `android=new UiSelector().textContains(${quote(text)})`
    : `-ios predicate string:label CONTAINS ${quote(text)}`;
}
