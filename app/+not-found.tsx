import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={64} color={colors.textTertiary} />
      <ThemedText type="h2" color={colors.textPrimary}>Page Not Found</ThemedText>
      <ThemedText type="body" color={colors.textSecondary} style={styles.sub}>
        The screen you're looking for doesn't exist.
      </ThemedText>
      <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(app)/(tabs)/dashboard')}>
        <ThemedText type="caption" color={colors.textInverse}>Go to Dashboard</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
    gap: spacing[4],
  },
  sub: { textAlign: 'center' },
  btn: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    backgroundColor: colors.primary500,
    borderRadius: 8,
  },
});
