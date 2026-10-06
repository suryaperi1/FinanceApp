import { StyleSheet, Text, View } from 'react-native';

import { fmtUsd } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';
import type { BarItem } from '../types/dashboard';

/**
 * Ranked horizontal bars for a single magnitude measure. One hue by design —
 * the label already identifies each bar. Every bar carries its value, so no
 * tooltip is needed. Label and value sit above the bar so long names fit on a
 * phone.
 */
export function HBarList({ items, format = fmtUsd }: { items: BarItem[]; format?: (v: number) => string }) {
  const { colors } = useTheme();
  const max = Math.max(...items.map((i) => i.value), 0);

  return (
    <View>
      {items.map((it) => {
        const pct = max > 0 ? Math.max((it.value / max) * 100, 0.5) : 0;
        return (
          <View
            key={it.label}
            style={styles.row}
            accessible
            accessibilityLabel={`${it.label}: ${format(it.value)}`}
          >
            <View style={styles.labels}>
              <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={2}>
                {it.label}
              </Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{format(it.value)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.gridline }]}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.series[0] }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 10 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 4 },
  label: { fontSize: 12.5, flexShrink: 1 },
  value: { fontSize: 12.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  track: { height: 12, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
