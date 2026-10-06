import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export interface LegendItem {
  label: string;
  color: string;
}

export function Legend({ items }: { items: LegendItem[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legend}>
      {items.map((it) => (
        <View key={it.label} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: it.color }]} />
          <Text style={[styles.text, { color: colors.textSecondary }]}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { gap: 6, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 9, height: 9, borderRadius: 2 },
  text: { fontSize: 11.5, flexShrink: 1 },
});
