import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';
import { fmtRupeeCompact } from '@/lib/format-num';

interface Props {
  /** "month" or "year". Used in copy. */
  unit: 'month' | 'year';
  /** Actual revenue accumulated so far. */
  earnedSoFar: number;
  /** Projected total revenue at the end of the period. */
  projectedTotal: number;
  /** Previous period's actual total — used for "X more / less than last X". */
  previousTotal?: number | null;
  /** How sure are we? 'high' | 'medium' | 'low'. Drives copy tone. */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * A plain-language "pace check" card that replaces dashed forecast bars.
 * Says: "At this pace, you'll finish the month at ₨X — Y more than last month".
 * Tone adapts to confidence + delta direction.
 */
export function PaceCard({ unit, earnedSoFar, projectedTotal, previousTotal, confidence }: Props) {
  const diff = previousTotal != null ? projectedTotal - previousTotal : null;
  const isUp = (diff ?? 0) >= 0;
  const headlineColor = isUp ? colors.success : colors.danger;

  const confidenceLine =
    confidence === 'high'   ? `Based on your steady trend so far.` :
    confidence === 'medium' ? `Based on a noisy trend — could swing either way.` :
                              `Early days — this is just a rough estimate.`;
  const confidenceIcon: 'thumbs-up' | 'help-circle' | 'compass' =
    confidence === 'high' ? 'thumbs-up' :
    confidence === 'medium' ? 'compass' : 'help-circle';

  const unitWord = unit === 'month' ? 'month' : 'year';

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Ionicons name="trending-up" size={18} color={colors.accent} />
        </View>
        <ThemedText type="overline" color={colors.textTertiary}>
          PACE CHECK
        </ThemedText>
      </View>

      <ThemedText type="body" color={colors.textSecondary}>
        At this pace, you’ll finish the {unitWord} at
      </ThemedText>
      <ThemedText
        type="display"
        color={colors.primary500}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.bigNumber}
      >
        {fmtRupeeCompact(projectedTotal)}
      </ThemedText>

      {diff !== null && previousTotal !== null && previousTotal !== undefined && (
        <View style={[styles.deltaRow, { borderColor: headlineColor + '40', backgroundColor: headlineColor + '14' }]}>
          <Ionicons
            name={isUp ? 'arrow-up-circle' : 'arrow-down-circle'}
            size={16}
            color={headlineColor}
          />
          <ThemedText type="bodySm" color={headlineColor}>
            {fmtRupeeCompact(Math.abs(diff))} {isUp ? 'more' : 'less'} than last {unitWord}
          </ThemedText>
        </View>
      )}

      <View style={styles.footer}>
        <Ionicons name={confidenceIcon} size={13} color={colors.textTertiary} />
        <ThemedText type="caption" color={colors.textTertiary} style={{ flex: 1 }}>
          {confidenceLine} You’ve earned {fmtRupeeCompact(earnedSoFar)} so far.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.accent + '50',
    padding: spacing[5],
    gap: spacing[2],
    shadowColor: colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  iconWrap: {
    width: 28, height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary50,
    alignItems: 'center', justifyContent: 'center',
  },
  bigNumber: { marginVertical: spacing[1] },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[2],
  },
});
