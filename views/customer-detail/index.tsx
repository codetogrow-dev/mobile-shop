import { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PaymentStatusBadge } from '@/components/ui/payment-status-badge';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtCurrency } from '@/lib/format-num';
import { QK } from '@/constants/query-keys';

import { getCustomer } from '@/api/customers';
import { getReceivablesForCustomer } from '@/api/dues';

import { ContactActions } from './contact-actions';

export default function CustomerDetailView() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const customerQ = useQuery({
    queryKey: QK.customers.detail(id ?? ''),
    queryFn: () => getCustomer(id!),
    enabled: !!id,
  });
  const salesQ = useQuery({
    queryKey: QK.dues.customer(id ?? ''),
    queryFn: () => getReceivablesForCustomer(id!),
    enabled: !!id,
  });

  const sales = salesQ.data ?? [];
  const sortedSales = useMemo(() => {
    const today = new Date(new Date().toDateString());
    return [...sales].sort((a: any, b: any) => {
      const aOver = a.due_date && new Date(a.due_date) < today ? 0 : 1;
      const bOver = b.due_date && new Date(b.due_date) < today ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      const aDue = a.due_date ? +new Date(a.due_date) : Infinity;
      const bDue = b.due_date ? +new Date(b.due_date) : Infinity;
      return aDue - bDue;
    });
  }, [sales]);

  const totals = useMemo(() => {
    const today = new Date(new Date().toDateString());
    let total = 0, overdue = 0;
    sales.forEach((s: any) => {
      const bal = Number(s.balance_due ?? 0);
      total += bal;
      if (bal > 0 && s.due_date && new Date(s.due_date) < today) overdue += bal;
    });
    return { total, overdue, count: sales.length };
  }, [sales]);

  const customer = customerQ.data;

  const refetchAll = () => { customerQ.refetch(); salesQ.refetch(); };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <ThemedText type="h3" numberOfLines={1} style={{ flex: 1 }}>
          {customer?.name ?? 'Customer'}
        </ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={customerQ.isLoading || salesQ.isLoading} onRefresh={refetchAll} tintColor={colors.primary500} />
        }
      >
        {/* Profile card */}
        <Card>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <ThemedText type="h2" color={colors.primary600}>
                {(customer?.name ?? '?').charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText type="h3" numberOfLines={1}>{customer?.name ?? '—'}</ThemedText>
              <Badge label="Customer" variant="info" />
            </View>
          </View>

          <View style={styles.contactList}>
            {customer?.phone && (
              <ContactRow icon="call-outline" label="Phone" value={customer.phone} />
            )}
            {customer?.cnic && (
              <ContactRow icon="card-outline" label="CNIC" value={customer.cnic} />
            )}
            {customer?.address && (
              <ContactRow icon="location-outline" label="Address" value={customer.address} />
            )}
          </View>

          <View style={{ height: spacing[3] }} />
          <ContactActions phone={customer?.phone ?? null} />
        </Card>

        {/* Totals card */}
        <Card>
          <ThemedText type="h4" style={{ marginBottom: spacing[3] }}>Outstanding</ThemedText>
          <View style={styles.totalsGrid}>
            <View style={[styles.totalCell, { borderLeftColor: colors.primary500 }]}>
              <ThemedText type="overline" color={colors.textTertiary}>TOTAL DUE</ThemedText>
              <ThemedText type="numeric" color={colors.textPrimary}>{fmtCurrency(totals.total)}</ThemedText>
            </View>
            <View style={[styles.totalCell, { borderLeftColor: totals.overdue > 0 ? colors.danger : colors.success }]}>
              <ThemedText type="overline" color={colors.textTertiary}>OVERDUE</ThemedText>
              <ThemedText type="numeric" color={totals.overdue > 0 ? colors.danger : colors.success}>
                {fmtCurrency(totals.overdue)}
              </ThemedText>
            </View>
            <View style={[styles.totalCell, { borderLeftColor: colors.info }]}>
              <ThemedText type="overline" color={colors.textTertiary}>TXNS</ThemedText>
              <ThemedText type="numeric" color={colors.textPrimary}>{totals.count}</ThemedText>
            </View>
          </View>
        </Card>

        {/* Unpaid sales */}
        <View>
          <ThemedText type="h4" style={styles.sectionLabel}>Unpaid Sales</ThemedText>
          {sortedSales.length === 0 ? (
            <Card>
              <View style={styles.emptyInline}>
                <Ionicons name="checkmark-done-circle-outline" size={28} color={colors.success} />
                <ThemedText type="body" color={colors.textSecondary}>
                  No unpaid sales for this customer.
                </ThemedText>
              </View>
            </Card>
          ) : (
            <View style={{ gap: spacing[3] }}>
              {sortedSales.map((s: any) => (
                <UnpaidSaleCard key={s.id} sale={s} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ContactRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.contactRow}>
      <Ionicons name={icon} size={14} color={colors.textTertiary} />
      <ThemedText type="caption" color={colors.textTertiary} style={{ width: 60 }}>{label}</ThemedText>
      <ThemedText type="body" color={colors.textPrimary} style={{ flex: 1 }} numberOfLines={2}>
        {value}
      </ThemedText>
    </View>
  );
}

function UnpaidSaleCard({ sale }: { sale: any }) {
  const today = new Date(new Date().toDateString());
  const balance = Number(sale.balance_due ?? 0);
  const overdue = balance > 0 && sale.due_date && new Date(sale.due_date) < today;
  const total = Number(sale.total_revenue ?? 0);
  const paid  = Number(sale.amount_paid ?? 0);

  return (
    <Card>
      <View style={styles.saleHead}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="h4" numberOfLines={1}>{sale.products?.name ?? 'Sale'}</ThemedText>
          <ThemedText type="caption" color={colors.textTertiary}>
            {format(parseISO(sale.sold_at), 'dd MMM yyyy')} · {sale.quantity} unit{sale.quantity === 1 ? '' : 's'}
          </ThemedText>
        </View>
        <PaymentStatusBadge status={sale.payment_status} overdue={overdue} compact />
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.amountCell}>
          <ThemedText type="caption" color={colors.textTertiary}>Total</ThemedText>
          <ThemedText type="numericSm" color={colors.textPrimary}>{fmtCurrency(total)}</ThemedText>
        </View>
        <View style={styles.amountCell}>
          <ThemedText type="caption" color={colors.textTertiary}>Paid</ThemedText>
          <ThemedText type="numericSm" color={colors.success}>{fmtCurrency(paid)}</ThemedText>
        </View>
        <View style={styles.amountCell}>
          <ThemedText type="caption" color={colors.textTertiary}>Balance</ThemedText>
          <ThemedText type="numericSm" color={overdue ? colors.danger : colors.textPrimary}>
            {fmtCurrency(balance)}
          </ThemedText>
        </View>
      </View>

      {sale.due_date && (
        <View style={[styles.dueRow, overdue && styles.dueRowOverdue]}>
          <Ionicons
            name={overdue ? 'alert-circle' : 'time-outline'}
            size={13}
            color={overdue ? colors.danger : colors.warning}
          />
          <ThemedText type="caption" color={overdue ? colors.danger : colors.textSecondary}>
            {overdue ? 'Overdue since ' : 'Due '}
            {format(parseISO(sale.due_date), 'dd MMM yyyy')}
          </ThemedText>
        </View>
      )}

      <TouchableOpacity
        style={styles.payBtn}
        onPress={() =>
          router.push({
            pathname: '/(app)/record-payment',
            params: { transactionType: 'sale', transactionId: sale.id, maxAmount: balance.toString() },
          })
        }
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle" size={16} color={colors.textInverse} />
        <ThemedText type="caption" color={colors.textInverse} style={{ fontWeight: '700' }}>
          Record payment
        </ThemedText>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
  },
  content: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[12] },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactList: { gap: spacing[2] },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  totalsGrid: { flexDirection: 'row', gap: spacing[2] },
  totalCell: {
    flex: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderLeftWidth: 3,
    gap: spacing[1],
  },
  sectionLabel: { marginBottom: spacing[3], color: colors.textSecondary },
  emptyInline: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[2] },
  saleHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] },
  amountsRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  amountCell: {
    flex: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    gap: 2,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    marginBottom: spacing[3],
  },
  dueRowOverdue: { backgroundColor: colors.dangerBg },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    backgroundColor: colors.primary500,
    borderRadius: radius.md,
  },
});
