import { StyleSheet, Text, View } from 'react-native';

import { fmtValue } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';
import type { Kpi } from '../types/dashboard';

/** Two-column grid of stat tiles (headline number + context line). */
export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid}>
      {kpis.map((k) => (
        <View
          key={k.label}
          style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessible
          accessibilityLabel={`${k.label}: ${fmtValue(k.value, k.format)}. ${k.sub}`}
        >
          <Text style={[styles.label, { color: colors.textMuted }]}>{k.label}</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{fmtValue(k.value, k.format)}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{k.sub}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: {
    width: '48.5%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  label: { fontSize: 11.5, marginBottom: 6 },
  value: { fontSize: 21, fontWeight: '600', fontVariant: ['tabular-nums'] },
  sub: { fontSize: 11, marginTop: 4 },
});
