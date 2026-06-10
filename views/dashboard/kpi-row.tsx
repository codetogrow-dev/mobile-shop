import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

export interface KPIData {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  iconBg?: string;
}

interface KPIRowProps {
  items: KPIData[];
}

export function KPIRow({ items }: KPIRowProps) {
  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.topRow}>
            {item.icon && <View style={[styles.iconBox, item.iconBg ? { backgroundColor: item.iconBg } : {}]}>{item.icon}</View>}
            {item.trend && item.trend !== 'neutral' && (
              <Ionicons
                name={item.trend === 'up' ? 'trending-up' : 'trending-down'}
                size={14}
                color={item.trend === 'up' ? colors.success : colors.danger}
              />
            )}
          </View>
          <ThemedText type="numeric" color={colors.textPrimary} style={styles.value}>
            {item.value}
          </ThemedText>
          <ThemedText type="caption" color={colors.textSecondary} numberOfLines={1}>
            {item.label}
          </ThemedText>
          {item.change && (
            <ThemedText
              type="caption"
              color={item.trend === 'up' ? colors.success : item.trend === 'down' ? colors.danger : colors.textTertiary}
              style={styles.change}
            >
              {item.trend === 'up' ? '↑ ' : item.trend === 'down' ? '↓ ' : ''}{item.change}
            </ThemedText>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  card: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[1],
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
  },
  change: {
    marginTop: spacing[1],
  },
});
