import { Card, SectionHeader } from '../components/Card';
import { HBarList } from '../components/HBarList';
import { BackToDashboard, Screen } from '../components/Screen';
import { dashboard } from '../data';
import { fmtUsd } from '../lib/format';

export default function EcommerceScreen() {
  const ec = dashboard.ecommerce;
  return (
    <Screen>
      <SectionHeader note={`${ec.note}, ${fmtUsd(ec.revenue)} total`} />
      <Card title="Revenue by Sales Region">
        <HBarList items={ec.byRegion} />
      </Card>
      <Card title="Revenue by Product Category">
        <HBarList items={ec.byCategory} />
      </Card>
      <Card title="Wholesale vs. Retail Channel">
        <HBarList items={ec.byChannel} />
      </Card>
      <Card title="Top 5 Sales Representatives">
        <HBarList items={ec.topReps} />
      </Card>
      <BackToDashboard />
    </Screen>
  );
}
