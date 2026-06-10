import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SparklineCardProps {
  title: string;
  value: string | number;
  data: number[];
  change?: string;
  trend?: 'up' | 'down';
}

export function SparklineCard({ title, value, data, change, trend }: SparklineCardProps) {
  const maxValue = Math.max(...data, 1);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <ThemedText type="caption" color={colors.textSecondary}>{title}</ThemedText>
          <ThemedText type="numeric" color={colors.accent} style={styles.value}>{value}</ThemedText>
        </View>
        {change && (
          <View style={[styles.badge, { backgroundColor: trend === 'up' ? colors.successBg : colors.dangerBg }]}>
            <Ionicons
              name={trend === 'up' ? 'trending-up' : 'trending-down'}
              size={12}
              color={trend === 'up' ? colors.success : colors.danger}
            />
            <ThemedText type="caption" color={trend === 'up' ? colors.success : colors.danger}>
              {change}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const heightPct = Math.max((item / maxValue) * 100, 4);
          const isLast = index === data.length - 1;
          return (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: isLast ? colors.accent : colors.primary300,
                      opacity: isLast ? 1 : 0.6 + (index / data.length) * 0.4,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.labelRow}>
        {['7d ago', '', '', '', '', '', 'Today'].map((l, i) => (
          <ThemedText key={i} type="caption" color={colors.textTertiary} style={styles.barLabel}>
            {l}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  value: {
    marginTop: spacing[1],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 64,
    gap: spacing[1],
  },
  barWrapper: {
    flex: 1,
    height: '100%',
  },
  barTrack: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.bgElevated,
    borderRadius: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
  },
});
