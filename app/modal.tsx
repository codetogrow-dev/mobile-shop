import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/constants/theme';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="h1">Modal</ThemedText>
      <Link href="/(app)/(tabs)/dashboard" style={styles.link}>
        <ThemedText type="body" color={colors.primary500}>Go to Dashboard</ThemedText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[5], backgroundColor: colors.bgBase },
  link: { marginTop: spacing[4] },
});