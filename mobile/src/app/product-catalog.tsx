import { Card, SectionHeader } from '../components/Card';
import { HBarList } from '../components/HBarList';
import { BackToDashboard, Screen } from '../components/Screen';
import { dashboard } from '../data';

export default function ProductCatalogScreen() {
  const pc = dashboard.productCatalog;
  return (
    <Screen>
      <SectionHeader note={pc.note} />
      <Card title={`Top ${pc.topProducts.length} Products by Revenue`}>
        <HBarList items={pc.topProducts} />
      </Card>
      <BackToDashboard />
    </Screen>
  );
}
