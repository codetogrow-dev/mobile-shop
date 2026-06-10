import { colors, radius, spacing } from '@/constants/theme';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { ThemedText } from '../themed-text';

export type BadgeVariant = 'primary' | 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  color?: string;
  bgColor?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { backgroundColor: string; textColor: string }> = {
  primary: { backgroundColor: colors.primary50,   textColor: colors.primary600 },
  default: { backgroundColor: colors.primary50,   textColor: colors.primary500 },
  success: { backgroundColor: colors.successBg,   textColor: colors.success },
  warning: { backgroundColor: colors.warningBg,   textColor: colors.warning },
  danger:  { backgroundColor: colors.dangerBg,    textColor: colors.danger },
  info:    { backgroundColor: colors.infoBg,      textColor: colors.info },
};

export function Badge({ label, variant = 'default', style, color, bgColor, dot }: BadgeProps) {
  const vs = variantStyles[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor ?? vs.backgroundColor },
        style,
      ]}
    >
      {dot && (
        <View style={[styles.dot, { backgroundColor: color ?? vs.textColor }]} />
      )}
      <ThemedText
        type="caption"
        color={color ?? vs.textColor}
        style={styles.label}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: '600',
  },
});
