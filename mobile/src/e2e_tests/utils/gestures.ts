import { $, driver } from '@wdio/globals';

export type SwipeDirection = 'up' | 'down';

/**
 * Swipe vertically through the middle of the screen with a touch pointer (W3C actions,
 * works on both platforms). `up` moves the content up, i.e. scrolls down the page.
 */
export async function swipe(direction: SwipeDirection, durationMs = 400): Promise<void> {
  const { width, height } = await driver.getWindowSize();
  const x = Math.round(width / 2);
  const top = Math.round(height * 0.3);
  const bottom = Math.round(height * 0.7);
  const [startY, endY] = direction === 'up' ? [bottom, top] : [top, bottom];

  await driver
    .action('pointer', { parameters: { pointerType: 'touch' } })
    .move({ x, y: startY })
    .down()
    .pause(100)
    .move({ x, y: endY, duration: durationMs })
    .up()
    .perform();
  await driver.releaseActions();
}

/**
 * Scroll until the element matching `selector` is on screen and return it.
 * Needed because Android only exposes views that are inside the visible area.
 */
export async function scrollUntilDisplayed(
  selector: string,
  { direction = 'up', maxSwipes = 8 }: { direction?: SwipeDirection; maxSwipes?: number } = {},
): Promise<WebdriverIO.Element> {
  for (let i = 0; i <= maxSwipes; i++) {
    const element = await $(selector).getElement();
    if ((await element.isExisting()) && (await element.isDisplayed())) return element;
    if (i < maxSwipes) await swipe(direction);
  }
  throw new Error(`Element not found after ${maxSwipes} swipes ${direction}: ${selector}`);
}
