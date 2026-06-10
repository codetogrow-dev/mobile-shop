import { useState } from 'react';
import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import {
  StyleSheet, TextInput, TextInputProps,
  TouchableOpacity, View, ViewStyle,
} from 'react-native';
import { ThemedText } from '../themed-text';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  placeholder?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  value: string;
  onChangeText: (text: string) => void;
}

export function Input({
  label,
  placeholder,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  value,
  onChangeText,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label && (
        <ThemedText
          type="bodySm"
          color={colors.textSecondary}
          style={{ marginBottom: spacing[2], fontWeight: '600' }}
        >
          {label}
        </ThemedText>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: error ? colors.danger : focused ? colors.borderFocus : colors.border,
            borderWidth: error || focused ? 2 : 1,
            backgroundColor: focused ? colors.bgCard : colors.bgElevated,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          {...props}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            {
              paddingLeft: leftIcon ? spacing[2] : spacing[3],
              color: colors.textPrimary,
              fontFamily: fontFamily.regular,
            },
          ]}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            activeOpacity={0.7}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <ThemedText type="caption" color={colors.danger} style={{ marginTop: spacing[1] }}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: spacing[3],
    paddingRight: spacing[3],
  },
  leftIcon: {
    paddingLeft: spacing[3],
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    paddingRight: spacing[3],
    justifyContent: 'center',
    alignItems: 'center',
  },
});