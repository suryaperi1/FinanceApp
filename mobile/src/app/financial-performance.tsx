import { Card, SectionHeader } from '../components/Card';
import { BackToDashboard, Screen } from '../components/Screen';
import { TrendLineChart } from '../components/TrendLineChart';
import { dashboard } from '../data';
import { fmtPct, fmtUsd } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';

export default function FinancialPerformanceScreen() {
  const { colors } = useTheme();
  const fp = dashboard.financialPerformance;

  return (
    <Screen>
      <SectionHeader note={fp.note} />
      <Card title="Gross Revenue">
        <TrendLineChart points={fp.grossRevenue} color={colors.series[0]} format={fmtUsd} />
      </Card>
      <Card title="Net Income">
        <TrendLineChart points={fp.netIncome} color={colors.series[1]} format={fmtUsd} />
      </Card>
      <Card title="Gross Margin">
        <TrendLineChart points={fp.grossMargin} color={colors.series[2]} format={(v) => fmtPct(v)} />
      </Card>
      <BackToDashboard />
    </Screen>
  );
}
