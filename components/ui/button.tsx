import { colors, radius, spacing } from "@/constants/theme";
import { Pressable, PressableProps, StyleSheet, ViewStyle } from "react-native";
import { ThemedText } from "../themed-text";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "style"> {
  label?: string;
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const variantStyles = {
  primary: {
    backgroundColor: colors.primary500,
    pressedColor: colors.primary600,
    textColor: colors.textInverse,
    borderColor: 'transparent',
  },
  secondary: {
    backgroundColor: colors.bgElevated,
    pressedColor: colors.primary50,
    textColor: colors.primary500,
    borderColor: 'transparent',
  },
  tertiary: {
    backgroundColor: "transparent",
    pressedColor: colors.bgElevated,
    textColor: colors.primary500,
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
    pressedColor: "#e63946",
    textColor: colors.textInverse,
    borderColor: 'transparent',
  },
  outline: {
    backgroundColor: "transparent",
    pressedColor: colors.bgElevated,
    textColor: colors.primary500,
    borderColor: colors.primary300,
  },
};

const sizeStyles = {
  sm: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    fontSize: 12,
  },
  md: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    fontSize: 14,
  },
  lg: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    fontSize: 16,
  },
};

export function Button({
  label,
  title,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  style,
  ...props
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const text = title ?? label ?? '';

  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            pressed && !disabled
              ? variantStyle.pressedColor
              : variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          width: fullWidth ? "100%" : "auto",
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <ThemedText
        type="body"
        color={disabled ? colors.textTertiary : variantStyle.textColor}
        style={{ fontWeight: "600", fontSize: sizeStyle.fontSize }}
      >
        {loading ? "Loading..." : text}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
