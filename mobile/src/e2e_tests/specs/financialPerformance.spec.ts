import { expect } from '@wdio/globals';

import DashboardPage from '../pages/DashboardPage';
import { relaunchApp } from '../utils/app';
import { dashboardData } from '../utils/testData';

const section = dashboardData.sections.financialPerformance;

describe('Five-Year Financial Performance', () => {
  beforeEach(async () => {
    await relaunchApp();
    await DashboardPage.waitForLoaded();
  });

  it('is listed on the Consolidated Dashboard', async () => {
    expect(await DashboardPage.isSectionLinkDisplayed(section.navTestId)).toBe(true);
    expect(await DashboardPage.getSectionLinkLabel(section.navTestId)).toContain(section.title);
  });

  it('opens its screen with the section title and all charts', async () => {
    const page = await DashboardPage.openFinancialPerformance(section.navTestId);

    expect(await page.isHeaderTitleDisplayed(section.title)).toBe(true);
    for (const chart of section.charts) {
      expect(await page.isChartDisplayed(chart.testId)).toBe(true);
      expect(await page.getChartTitle(chart.testId)).toBe(chart.title);
    }
  });

  it('returns to the Consolidated Dashboard via the back link', async () => {
    const page = await DashboardPage.openFinancialPerformance(section.navTestId);
    await page.backToDashboard();
    await DashboardPage.waitForLoaded();
    expect(await DashboardPage.isLoaded()).toBe(true);
  });
});
