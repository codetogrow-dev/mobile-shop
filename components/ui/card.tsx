import { colors, radius, shadows, spacing } from '@/constants/theme';
import {
  Pressable, PressableProps, StyleSheet, View, ViewStyle,
} from 'react-native';

interface CardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
  padded?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({
  children,
  variant = 'default',
  padded = true,
  style,
  onPress,
  ...props
}: CardProps) {
  const cardStyle = [
    styles.card,
    padded && styles.padded,
    {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      ...(variant === 'elevated' ? shadows.md : shadows.sm),
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        {...props}
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && { backgroundColor: colors.bgElevated },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  padded: {
    padding: spacing[4],
  },
});