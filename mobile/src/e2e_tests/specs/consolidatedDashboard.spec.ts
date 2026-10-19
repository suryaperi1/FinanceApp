import { expect } from '@wdio/globals';

import DashboardPage from '../pages/DashboardPage';
import { relaunchApp } from '../utils/app';
import { dashboardData } from '../utils/testData';

const expected = dashboardData.consolidatedDashboard;

describe('Consolidated Dashboard', () => {
  beforeEach(async () => {
    await relaunchApp();
    await DashboardPage.waitForLoaded();
  });

  it('is shown as the main screen with its title', async () => {
    expect(await DashboardPage.isLoaded()).toBe(true);
    const title = await DashboardPage.getTitle();
    expect(title).toContain(expected.titleKeyword);
    expect(title).toBe(expected.title);
  });

  it('shows the KPI tiles', async () => {
    expect(await DashboardPage.isKpiGridDisplayed()).toBe(true);
  });
});
