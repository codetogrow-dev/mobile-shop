import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { signOut } from '@/api/auth';
import { QK } from '@/constants/query-keys';
import { getOverdueCount } from '@/api/dues';

function SettingRow({
  icon,
  label,
  value,
  onPress,
  danger,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  badge?: number;
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.primary500} />
      </View>
      <View style={styles.settingInfo}>
        <ThemedText type="body" color={danger ? colors.danger : colors.textPrimary}>{label}</ThemedText>
        {value && <ThemedText type="caption" color={colors.textTertiary}>{value}</ThemedText>}
      </View>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <ThemedText type="overline" color={colors.textInverse} style={{ fontSize: 10 }}>
            {badge}
          </ThemedText>
        </View>
      )}
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
    </TouchableOpacity>
  );
}

export default function SettingsView() {
  const insets = useSafeAreaInsets();
  const { user, clearSession } = useAuthStore();

  const { data: overdue } = useQuery({
    queryKey: QK.dues.overdueCount,
    queryFn: getOverdueCount,
    staleTime: 60_000,
  });
  const overdueTotal = (overdue?.receivables_overdue ?? 0) + (overdue?.payables_overdue ?? 0);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut().catch(() => {});
          clearSession();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText type="h2">Settings</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={colors.primary500} />
          </View>
          <View>
            <ThemedText type="h3">{user?.user_metadata?.full_name ?? 'Shop Owner'}</ThemedText>
            <ThemedText type="body" color={colors.textSecondary}>{user?.email}</ThemedText>
          </View>
        </View>

        {/* Money */}
        <Card padded={false}>
          <SettingRow
            icon="wallet-outline"
            label="Dues"
            value="Receivables & payables"
            badge={overdueTotal}
            onPress={() => router.push('/(app)/(tabs)/dues' as any)}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="bar-chart-outline"
            label="Reports"
            value="Revenue, profit & analytics"
            onPress={() => router.push('/(app)/(tabs)/reports' as any)}
          />
        </Card>

        {/* Catalogue */}
        <Card padded={false}>
          <SettingRow
            icon="pricetag-outline"
            label="Categories"
            value="Manage product categories"
            onPress={() => router.push('/(app)/(tabs)/settings/categories')}
          />
        </Card>

        {/* App Info */}
        <Card padded={false}>
          <SettingRow icon="information-circle-outline" label="App Version" value="1.0.0" />
          <View style={styles.separator} />
          <SettingRow icon="storefront-outline" label="Business" value="Mobile Shop" />
        </Card>

        {/* Sign Out */}
        <Card padded={false}>
          <SettingRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleLogout}
            danger
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  content: { paddingHorizontal: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary50,
    borderWidth: 2,
    borderColor: colors.primary200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: {
    backgroundColor: colors.dangerBg,
  },
  settingInfo: { flex: 1 },
  separator: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing[4] },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: spacing[2],
  },
});
