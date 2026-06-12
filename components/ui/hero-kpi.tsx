import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';

export type HeroTrend = 'up' | 'down' | 'flat';

interface Props {
  label: string;
  value: string;
  /** Optional sub-line e.g. "+12% vs last week" or "₨2.45 lakh forecast". */
  delta?: string;
  trend?: HeroTrend;
  /** Big numeric color — defaults to primary500. */
  accent?: string;
  /** Optional left icon. */
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

/**
 * Big hero KPI tile used at the top of every reports panel. Uses display-size
 * typography and a cyan glow to feel "futuristic".
 */
export function HeroKpi({ label, value, delta, trend, accent, icon, onPress }: Props) {
  const Wrap: any = onPress ? TouchableOpacity : View;
  const accentColor = accent ?? colors.primary500;
  const trendColor =
    trend === 'up'   ? colors.success :
    trend === 'down' ? colors.danger  : colors.textTertiary;
  const trendIcon: keyof typeof Ionicons.glyphMap | null =
    trend === 'up'   ? 'trending-up'   :
    trend === 'down' ? 'trending-down' : null;

  return (
    <Wrap onPress={onPress} activeOpacity={0.85} style={styles.card}>
      <View style={styles.row}>
        {icon && (
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
        )}
        <ThemedText type="overline" color={colors.textTertiary}>
          {label}
        </ThemedText>
      </View>
      <ThemedText
        type="display"
        color={accentColor}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.value}
      >
        {value}
      </ThemedText>
      {delta && (
        <View style={styles.deltaRow}>
          {trendIcon && <Ionicons name={trendIcon} size={13} color={trendColor} />}
          <ThemedText type="caption" color={trendColor}>{delta}</ThemedText>
        </View>
      )}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing[5],
    gap: spacing[2],
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  iconWrap: {
    width: 28, height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { marginVertical: spacing[1] },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
});
