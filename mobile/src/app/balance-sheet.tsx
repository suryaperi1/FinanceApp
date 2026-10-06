import { Card, SectionHeader } from '../components/Card';
import { BackToDashboard, Screen } from '../components/Screen';
import { StackedColumnChart } from '../components/StackedColumnChart';
import { dashboard } from '../data';
import type { StackChartData } from '../types/dashboard';

const maxColumnTotal = (c: StackChartData) =>
  Math.max(...c.categories.map((_, i) => c.series.reduce((acc, s) => acc + s.values[i], 0)));

export default function BalanceSheetScreen() {
  const bs = dashboard.balanceSheet;
  // Both charts share one scale so their column heights are comparable.
  const shared = Math.max(maxColumnTotal(bs.assets), maxColumnTotal(bs.liabilitiesEquity));

  return (
    <Screen>
      <SectionHeader note={bs.note} />
      <Card title="Assets — Cash vs. Working Capital vs. Long-Term Assets">
        <StackedColumnChart data={bs.assets} maxTotal={shared} />
      </Card>
      <Card title="Liabilities vs. Equity">
        <StackedColumnChart data={bs.liabilitiesEquity} maxTotal={shared} />
      </Card>
      <BackToDashboard />
    </Screen>
  );
}
