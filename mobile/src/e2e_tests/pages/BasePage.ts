import { $ } from '@wdio/globals';

import { config } from '../config/env';
import { getAccessibilityLabel } from '../utils/app';
import { scrollUntilDisplayed } from '../utils/gestures';
import { byTestId, byText } from '../utils/locators';

/**
 * Behaviour shared by every screen. Page objects extend this and expose intent-level
 * methods (e.g. `openFinancialPerformance()`); specs never use selectors directly.
 */
export abstract class BasePage {
  /** testID of the screen's root ScrollView, used to know the screen has loaded. */
  protected abstract readonly screenTestId: string;

  /** Wait until this screen is shown. Returns `this` so calls can be chained. */
  async waitForLoaded(timeout = config.waitTimeout): Promise<this> {
    await $(byTestId(this.screenTestId)).waitForDisplayed({
      timeout,
      timeoutMsg: `${this.constructor.name} did not load within ${timeout} ms`,
    });
    return this;
  }

  async isLoaded(): Promise<boolean> {
    return $(byTestId(this.screenTestId)).isDisplayed();
  }

  // ---- helpers for subclasses -------------------------------------------------------

  /** Scroll the element with this testID into view (if needed) and return it. */
  protected scrollTo(testId: string) {
    return scrollUntilDisplayed(byTestId(testId));
  }

  protected async isDisplayed(testId: string): Promise<boolean> {
    try {
      await this.scrollTo(testId);
      return true;
    } catch {
      return false;
    }
  }

  protected async getText(testId: string): Promise<string> {
    return (await this.scrollTo(testId)).getText();
  }

  protected async getLabel(testId: string): Promise<string> {
    return getAccessibilityLabel(await this.scrollTo(testId));
  }

  protected async tap(testId: string): Promise<void> {
    await (await this.scrollTo(testId)).click();
  }

  /** True if an element with exactly this text becomes visible (no scrolling). */
  protected async isTextVisible(text: string, timeout = config.waitTimeout): Promise<boolean> {
    try {
      await $(byText(text)).waitForDisplayed({ timeout });
      return true;
    } catch {
      return false;
    }
  }
}
