import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtRupeeCompact } from '@/lib/format-num';
import { QK } from '@/constants/query-keys';
import { getCustomersDashboardSummary } from '@/api/customers';
import { getSuppliersDashboardSummary } from '@/api/suppliers';

export function PeopleWidget() {
  const customersQ = useQuery({
    queryKey: QK.customers.dashboardSummary,
    queryFn: getCustomersDashboardSummary,
    staleTime: 60_000,
  });
  const suppliersQ = useQuery({
    queryKey: QK.suppliers.dashboardSummary,
    queryFn: getSuppliersDashboardSummary,
    staleTime: 60_000,
  });

  const c = customersQ.data;
  const s = suppliersQ.data;

  return (
    <View style={{ gap: spacing[3] }}>
      <View style={styles.sectionRow}>
        <ThemedText type="h4" color={colors.textSecondary}>People</ThemedText>
        <View style={styles.links}>
          <TouchableOpacity
            onPress={() => router.push('/(app)/customers' as any)}
            activeOpacity={0.7}
          >
            <ThemedText type="caption" color={colors.primary600}>Customers →</ThemedText>
          </TouchableOpacity>
          <View style={styles.dot} />
          <TouchableOpacity
            onPress={() => router.push('/(app)/suppliers' as any)}
            activeOpacity={0.7}
          >
            <ThemedText type="caption" color={colors.primary600}>Suppliers →</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.row}>
        <Card
          padded
          style={styles.tile}
          onPress={() => router.push('/(app)/customers' as any)}
        >
          <View style={[styles.iconBg, { backgroundColor: colors.primary50 }]}>
            <Ionicons name="people" size={16} color={colors.primary500} />
          </View>
          <ThemedText type="overline" color={colors.textTertiary}>SERVED TODAY</ThemedText>
          <ThemedText type="h3" color={colors.primary500}>{c?.customers_today ?? 0}</ThemedText>
          <ThemedText type="caption" color={colors.textTertiary}>customers</ThemedText>
        </Card>

        <Card
          padded
          style={styles.tile}
          onPress={() => router.push('/(app)/customers' as any)}
        >
          <View style={[styles.iconBg, { backgroundColor: colors.successBg }]}>
            <Ionicons name="person-add" size={16} color={colors.success} />
          </View>
          <ThemedText type="overline" color={colors.textTertiary}>NEW THIS MONTH</ThemedText>
          <ThemedText type="h3" color={colors.success}>{c?.new_this_month ?? 0}</ThemedText>
          <ThemedText type="caption" color={colors.textTertiary}>customers</ThemedText>
        </Card>
      </View>

      {/* Top customer hero card */}
      {c?.top_customer_id && c.top_customer_name && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/(app)/customer/${c.top_customer_id}` as any)}
          style={styles.heroCard}
        >
          <View style={styles.heroLeft}>
            <View style={styles.heroIcon}>
              <Ionicons name="trophy" size={18} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="overline" color={colors.warning}>TOP CUSTOMER THIS MONTH</ThemedText>
              <ThemedText type="h4" color={colors.textPrimary} numberOfLines={1}>
                {c.top_customer_name}
              </ThemedText>
              <ThemedText type="caption" color={colors.textSecondary}>
                {fmtRupeeCompact(c.top_customer_total)} this month
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      )}

      {/* Top supplier hero — info-coloured to differentiate */}
      {s?.top_supplier_id && s.top_supplier_name && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/(app)/supplier/${s.top_supplier_id}` as any)}
          style={[styles.heroCard, styles.heroCardSupplier]}
        >
          <View style={styles.heroLeft}>
            <View style={[styles.heroIcon, { backgroundColor: colors.infoBg }]}>
              <Ionicons name="ribbon" size={18} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="overline" color={colors.info}>TOP SUPPLIER THIS MONTH</ThemedText>
              <ThemedText type="h4" color={colors.textPrimary} numberOfLines={1}>
                {s.top_supplier_name}
              </ThemedText>
              <ThemedText type="caption" color={colors.textSecondary}>
                {fmtRupeeCompact(s.top_supplier_total)} this month
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  links: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textTertiary },
  row: { flexDirection: 'row', gap: spacing[3] },
  tile: { flex: 1, gap: spacing[1] },
  iconBg: {
    width: 28, height: 28, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing[1],
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    ...shadows.sm,
  },
  heroCardSupplier: { borderColor: colors.info + '40' },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  heroIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.warningBg,
    alignItems: 'center', justifyContent: 'center',
  },
});
