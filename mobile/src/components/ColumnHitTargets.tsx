import { Pressable, StyleSheet, View } from 'react-native';

interface Props {
  /** Column centers in the chart's viewBox x units. */
  centers: number[];
  /** Width of each tap column in viewBox units. */
  columnWidth: number;
  /** Total viewBox width; positions are converted to percentages of it. */
  viewBoxWidth: number;
  /** Accessible label per column, e.g. "2016: $952.3M". */
  labels: string[];
  selected: number;
  onSelect: (index: number) => void;
}

/**
 * Transparent full-height tap columns laid over an <Svg>. Used instead of
 * onPress on SVG shapes, which react-native-svg cannot handle on web (it
 * leaks touch-responder props onto DOM nodes and the taps are ignored).
 *
 * The parent must be position: relative, and the Svg's aspect ratio must
 * match its viewBox so percentage positions line up with the drawing.
 */
export function ColumnHitTargets({ centers, columnWidth, viewBoxWidth, labels, selected, onSelect }: Props) {
  return (
    <View style={styles.overlay}>
      {centers.map((cx, i) => {
        const left = Math.max(cx - columnWidth / 2, 0);
        const right = Math.min(cx + columnWidth / 2, viewBoxWidth);
        return (
          <Pressable
            key={i}
            onPress={() => onSelect(i)}
            accessibilityRole="button"
            accessibilityLabel={labels[i]}
            accessibilityState={{ selected: selected === i }}
            style={[
              styles.column,
              { left: `${(left / viewBoxWidth) * 100}%`, width: `${((right - left) / viewBoxWidth) * 100}%` },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'box-none' },
  column: { position: 'absolute', top: 0, bottom: 0 },
});
