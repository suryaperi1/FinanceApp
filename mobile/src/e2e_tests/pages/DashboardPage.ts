import { BasePage } from './BasePage';
import FinancialPerformancePage from './FinancialPerformancePage';

/** Main screen: "Red30 Tech — Consolidated Dashboard" (mobile/src/app/index.tsx). */
class DashboardPage extends BasePage {
  protected readonly screenTestId = 'dashboard-screen';

  private readonly ids = {
    title: 'dashboard-title',
    kpiGrid: 'kpi-grid',
  };

  getTitle(): Promise<string> {
    return this.getText(this.ids.title);
  }

  isKpiGridDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.ids.kpiGrid);
  }

  /** Section buttons are located by their testID, e.g. "nav-financial-performance". */
  isSectionLinkDisplayed(navTestId: string): Promise<boolean> {
    return this.isDisplayed(navTestId);
  }

  /** Accessibility label of a section button: "<title>. <summary>". */
  getSectionLinkLabel(navTestId: string): Promise<string> {
    return this.getLabel(navTestId);
  }

  async openFinancialPerformance(navTestId: string): Promise<typeof FinancialPerformancePage> {
    await this.tap(navTestId);
    return FinancialPerformancePage.waitForLoaded();
  }
}

export default new DashboardPage();
