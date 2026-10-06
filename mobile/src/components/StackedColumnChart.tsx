import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { fmtUsd } from '../lib/format';
import { chartFontFamily } from '../theme/fonts';
import { useTheme } from '../theme/ThemeProvider';
import type { StackChartData } from '../types/dashboard';
import { ColumnHitTargets } from './ColumnHitTargets';
import { Legend } from './Legend';

const W = 340;
const H = 220;
const LEFT = 8;
const RIGHT = 8;
const TOP = 20;
const BASELINE = 192;
const X_LABEL_Y = 210;
const SEGMENT_GAP = 2;

interface Props {
  data: StackChartData;
  /** Pass the same value to sibling charts so they share one scale. */
  maxTotal?: number;
}

/**
 * Stacked columns (one per category) with a total label on top. Tap a column
 * to see its breakdown in the table under the chart.
 */
export function StackedColumnChart({ data, maxTotal }: Props) {
  const { colors } = useTheme();
  const n = data.categories.length;
  const totals = data.categories.map((_, i) => data.series.reduce((acc, s) => acc + s.values[i], 0));
  const scaleMax = maxTotal ?? Math.max(...totals);
  const [selected, setSelected] = useState(n - 1);

  const slot = (W - LEFT - RIGHT) / n;
  const barW = Math.min(44, slot * 0.62);
  const plotH = BASELINE - TOP;
  const seriesColor = (j: number) => colors.series[j % colors.series.length];
  const centerX = (i: number) => LEFT + slot * i + slot / 2;

  return (
    <View>
      <Legend items={data.series.map((s, j) => ({ label: s.name, color: seriesColor(j) }))} />
      <View style={styles.plot}>
        <Svg width="100%" style={{ aspectRatio: W / H }} viewBox={`0 0 ${W} ${H}`}>
          <Line x1={LEFT} y1={BASELINE} x2={W - RIGHT} y2={BASELINE} stroke={colors.axis} strokeWidth={1} />
          {data.categories.map((cat, i) => {
            const cx = centerX(i);
            const x = cx - barW / 2;
            let y = BASELINE;
            const segments = data.series.map((s, j) => {
              const h = (s.values[i] / scaleMax) * plotH;
              const top = y - h;
              // Leave a surface-colored gap between stacked segments.
              const rect = (
                <Rect
                  key={s.name}
                  x={x}
                  y={top + (j > 0 ? SEGMENT_GAP : 0)}
                  width={barW}
                  height={Math.max(h - (j > 0 ? SEGMENT_GAP : 0), 0)}
                  rx={2}
                  fill={seriesColor(j)}
                />
              );
              y = top;
              return rect;
            });
            return (
              <G key={cat}>
                {selected === i ? (
                  <Rect x={cx - slot / 2 + 2} y={TOP - 18} width={slot - 4} height={BASELINE - TOP + 18} rx={6} fill={colors.gridline} opacity={0.5} />
                ) : null}
                {segments}
                <SvgText fontFamily={chartFontFamily} x={cx} y={y - 5} fontSize={10} fontWeight="600" fill={colors.textSecondary} textAnchor="middle">
                  {fmtUsd(totals[i])}
                </SvgText>
                <SvgText fontFamily={chartFontFamily} x={cx} y={X_LABEL_Y} fontSize={10.5} fill={colors.textMuted} textAnchor="middle">
                  {cat}
                </SvgText>
              </G>
            );
          })}
        </Svg>
        <ColumnHitTargets
          centers={data.categories.map((_, i) => centerX(i))}
          columnWidth={slot}
          viewBoxWidth={W}
          labels={data.categories.map((cat, i) => `${cat}: total ${fmtUsd(totals[i])}`)}
          selected={selected}
          onSelect={setSelected}
        />
      </View>

      <View style={[styles.table, { borderTopColor: colors.border }]}>
        <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>
          {data.categories[selected]} · tap a year to inspect
        </Text>
        {data.series
          .map((s, j) => ({ s, j }))
          .reverse()
          .map(({ s, j }) => (
            <View key={s.name} style={styles.tableRow}>
              <View style={[styles.swatch, { backgroundColor: seriesColor(j) }]} />
              <Text style={[styles.tableLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={[styles.tableValue, { color: colors.textPrimary }]}>{fmtUsd(s.values[selected])}</Text>
            </View>
          ))}
        <View style={styles.tableRow}>
          <View style={styles.swatch} />
          <Text style={[styles.tableLabel, { color: colors.textPrimary, fontWeight: '600' }]}>Total</Text>
          <Text style={[styles.tableValue, { color: colors.textPrimary }]}>{fmtUsd(totals[selected])}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { position: 'relative' },
  table: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8 },
  tableTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  swatch: { width: 9, height: 9, borderRadius: 2 },
  tableLabel: { fontSize: 12, flex: 1 },
  tableValue: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
