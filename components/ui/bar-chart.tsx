import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/constants/theme';

export interface BarDatum {
  label: string;
  value: number;
  /** Max across the whole series, used for percentage height. */
  max: number;
  /** Profit value used to recolor the bar red when negative. */
  profit?: number;
}

interface Props {
  bars: BarDatum[];
  compact?: boolean;
}

/**
 * Lightweight flex-row bar chart used by every reports panel. Shows only
 * actual data — projections live in the separate PaceCard component above
 * the chart, so the bars stay easy to read for a layman.
 */
export function BarChart({ bars, compact = false }: Props) {
  return (
    <View style={[styles.container, compact && { height: 70 }]}>
      {bars.map((b, i) => (
        <View key={i} style={styles.col}>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { height: `${Math.max((b.value / b.max) * 100, b.value > 0 ? 4 : 0)}%` },
                b.profit !== undefined && b.profit < 0 && { backgroundColor: colors.danger + 'AA' },
              ]}
            />
          </View>
          <ThemedText
            type="overline"
            color={colors.textTertiary}
            style={styles.label}
            numberOfLines={1}
          >
            {b.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 3 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  track: {
    flex: 1, width: '100%', justifyContent: 'flex-end',
    backgroundColor: colors.bgElevated, borderRadius: 4,
  },
  fill: { width: '100%', backgroundColor: colors.primary500, borderRadius: 4 },
  label: { textAlign: 'center', fontSize: 9 },
});
