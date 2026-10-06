import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { ColumnHitTargets } from './ColumnHitTargets';

import { chartFontFamily } from '../theme/fonts';
import { useTheme } from '../theme/ThemeProvider';
import type { TrendPoint } from '../types/dashboard';

const W = 300;
const H = 140;
const X0 = 24;
const X1 = 272;
const Y_TOP = 26;
const Y_BOTTOM = 106;
const BASELINE = 116;
const X_LABEL_Y = 134;

interface Props {
  points: TrendPoint[];
  color: string;
  format: (v: number) => string;
}

/**
 * Single-series trend line, styled after the HTML dashboard: 2px line,
 * ringed markers, dashed segment + hollow marker for forecast points, and
 * direct labels only on the latest actual and forecast values. Tap a point
 * to read its exact value in the caption below the chart.
 */
export function TrendLineChart({ points, color, format }: Props) {
  const { colors } = useTheme();
  const lastActual = points.reduce((acc, p, i) => (p.forecast ? acc : i), 0);
  const [selected, setSelected] = useState(lastActual);

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = points.length > 1 ? (X1 - X0) / (points.length - 1) : 0;

  const xy = points.map((p, i) => ({
    x: X0 + i * step,
    y: Y_BOTTOM - ((p.value - min) / span) * (Y_BOTTOM - Y_TOP),
  }));

  const actualPath = xy
    .slice(0, lastActual + 1)
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');

  const labelled = new Set(points.map((p, i) => (p.forecast || i === lastActual ? i : -1)).filter((i) => i >= 0));
  const sel = points[selected];

  return (
    <View>
      <View style={styles.plot}>
        <Svg
          width="100%"
          style={{ aspectRatio: W / H }}
          viewBox={`0 0 ${W} ${H}`}
          accessibilityLabel={points.map((p) => `${p.label} ${format(p.value)}`).join(', ')}
        >
          <Line x1={X0} y1={BASELINE} x2={X1} y2={BASELINE} stroke={colors.axis} strokeWidth={1} />

          <Path d={actualPath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

          {points.map((p, i) =>
            p.forecast && i > 0 ? (
              <Line
                key={`f-${p.label}`}
                x1={xy[i - 1].x}
                y1={xy[i - 1].y}
                x2={xy[i].x}
                y2={xy[i].y}
                stroke={color}
                strokeWidth={2}
                strokeDasharray="3 3"
                opacity={0.6}
              />
            ) : null,
          )}

          {points.map((p, i) => (
            <G key={p.label}>
              {selected === i ? (
                <Line x1={xy[i].x} y1={xy[i].y + 6} x2={xy[i].x} y2={BASELINE} stroke={colors.axis} strokeWidth={1} />
              ) : null}
              <Circle
                cx={xy[i].x}
                cy={xy[i].y}
                r={4}
                fill={p.forecast ? colors.surface : color}
                stroke={p.forecast ? color : colors.surface}
                strokeWidth={2}
              />
              {labelled.has(i) ? (
                <SvgText
                  fontFamily={chartFontFamily}
                  x={xy[i].x}
                  y={xy[i].y - 10}
                  fontSize={11}
                  fontWeight={p.forecast ? '500' : '600'}
                  fill={p.forecast ? colors.textSecondary : colors.textPrimary}
                  textAnchor="middle"
                >
                  {format(p.value)}
                </SvgText>
              ) : null}
              <SvgText
                  fontFamily={chartFontFamily}
                x={xy[i].x}
                y={X_LABEL_Y}
                fontSize={10}
                fontStyle={p.forecast ? 'italic' : 'normal'}
                fill={p.forecast ? colors.textSecondary : colors.textMuted}
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            </G>
          ))}
        </Svg>
        {/* Hit targets larger than the marks: the full-height column around each point. */}
        <ColumnHitTargets
          centers={xy.map((pt) => pt.x)}
          columnWidth={step || W}
          viewBoxWidth={W}
          labels={points.map((p) => `${p.label}${p.forecast ? ' (budget)' : ''}: ${format(p.value)}`)}
          selected={selected}
          onSelect={setSelected}
        />
      </View>
      {sel ? (
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{sel.label}</Text>
          {sel.forecast ? ' (budget)' : ''}: {format(sel.value)} · tap a year to inspect
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { position: 'relative' },
  caption: { fontSize: 12, marginTop: 6 },
});
