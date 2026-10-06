import { Card, SectionHeader } from '../components/Card';
import { HBarList } from '../components/HBarList';
import { BackToDashboard, Screen } from '../components/Screen';
import { dashboard } from '../data';

export default function ExpensesScreen() {
  const ex = dashboard.expenses;
  return (
    <Screen>
      <SectionHeader note={ex.note} />
      <Card title="Labor Cost by Department">
        <HBarList items={ex.labor} />
      </Card>
      <Card title="Marketing Spend by Category">
        <HBarList items={ex.marketing} />
      </Card>
      <Card title="Overhead Cost by Category">
        <HBarList items={ex.overhead} />
      </Card>
      <BackToDashboard />
    </Screen>
  );
}
