import { BasePage } from './BasePage';

/** "Five-Year Financial Performance" section (mobile/src/app/financial-performance.tsx). */
class FinancialPerformancePage extends BasePage {
  protected readonly screenTestId = 'financial-performance-screen';

  private readonly ids = {
    backToDashboard: 'back-to-dashboard',
  };

  /** The title is drawn by the native stack header, which has no testID, so match by text. */
  isHeaderTitleDisplayed(title: string): Promise<boolean> {
    return this.isTextVisible(title);
  }

  isChartDisplayed(chartTestId: string): Promise<boolean> {
    return this.isDisplayed(chartTestId);
  }

  /** Card titles get the testID "<card testID>-title" (see components/Card.tsx). */
  getChartTitle(chartTestId: string): Promise<string> {
    return this.getText(`${chartTestId}-title`);
  }

  /** Tap "← Back to Consolidated Dashboard" at the bottom of the screen. */
  async backToDashboard(): Promise<void> {
    await this.tap(this.ids.backToDashboard);
  }
}

export default new FinancialPerformancePage();
