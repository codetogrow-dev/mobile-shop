import { colors, radius, spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

interface SearchBarProps extends Omit<TextInputProps, "style"> {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = "Search...",
  containerStyle,
  ...props
}: SearchBarProps) {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
        },
        containerStyle,
      ]}
    >
      <Ionicons
        name="search"
        size={20}
        color={colors.textTertiary}
        style={styles.icon}
      />
      <TextInput
        {...props}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.input,
          {
            color: colors.textPrimary,
          },
        ]}
      />
      {value.length > 0 && onClear && (
        <Pressable onPress={onClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    minHeight: 44,
  },
  icon: {
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: spacing[2],
  },
  clearButton: {
    marginLeft: spacing[2],
    padding: spacing[1],
  },
});
