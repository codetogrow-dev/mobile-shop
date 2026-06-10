import { Text, type TextProps } from 'react-native';
import { colors, typography, type TextType } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  color?: string;
};

export function ThemedText({ style, type = 'body', color, ...rest }: ThemedTextProps) {
  const typeStyle = typography[type];

  return (
    <Text
      style={[
        typeStyle,
        { color: color ?? colors.textPrimary },
        style,
      ]}
      {...rest}
    />
  );
}
