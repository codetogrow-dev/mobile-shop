import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PaymentStatusBadge } from '@/components/ui/payment-status-badge';
import { StatInfoModal } from '@/components/ui/stat-info-modal';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtCurrency, fmtRupee, fmtRupeeCompact } from '@/lib/format-num';
import { fmtKarachi } from '@/lib/datetime';
import { QK } from '@/constants/query-keys';
import { KpiGrid, type KpiItem } from '@/components/ui/kpi-grid';

import { getCustomer, getCustomerStats } from '@/api/customers';
import { getReceivablesForCustomer } from '@/api/dues';
import { listPaymentsForCustomer } from '@/api/payments';

import { ContactActions } from './contact-actions';
import { PaymentTimeline } from './payment-timeline';

type OutstandingInfoKey = 'total' | 'overdue' | 'txns';

export default function CustomerDetailView() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [outInfo, setOutInfo] = useState<OutstandingInfoKey | null>(null);

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
  const statsQ = useQuery({
    queryKey: QK.customers.stats(id ?? ''),
    queryFn: () => getCustomerStats(id!),
    enabled: !!id,
  });
  const paymentsQ = useQuery({
    queryKey: QK.payments.byCustomer(id ?? ''),
    queryFn: () => listPaymentsForCustomer(id!),
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

        {/* Lifetime KPI grid */}
        {statsQ.data && (
          <View>
            <View style={styles.sectionLabelRow}>
              <Ionicons name="stats-chart" size={14} color={colors.textSecondary} />
              <ThemedText type="overline" color={colors.textSecondary}>LIFETIME STATS</ThemedText>
            </View>
            <KpiGrid
              items={
                [
                  {
                    label: 'Lifetime spent',
                    value: fmtRupee(statsQ.data.lifetime_spent),
                    icon: 'cash-outline',
                    accent: colors.primary500,
                    accentBg: colors.primary50,
                    description:
                      'Total amount this customer has spent at the shop across every sale, including partial and unpaid amounts.',
                    rawValue: statsQ.data.lifetime_spent,
                  },
                  {
                    label: 'Visits',
                    value: String(statsQ.data.visit_count),
                    icon: 'repeat-outline',
                    accent: colors.info,
                    accentBg: colors.infoBg,
                    description:
                      'Number of separate sales recorded for this customer. Each recorded sale counts as one visit.',
                    rawValue: statsQ.data.visit_count,
                    isCurrency: false,
                  },
                  {
                    label: 'Avg ticket',
                    value: fmtRupee(statsQ.data.avg_ticket),
                    icon: 'receipt-outline',
                    accent: colors.success,
                    accentBg: colors.successBg,
                    description:
                      'Average amount per sale for this customer (lifetime spent ÷ visits). Higher means they buy bigger every trip.',
                    rawValue: statsQ.data.avg_ticket,
                  },
                  {
                    label: 'Last visit',
                    value: statsQ.data.last_visit_at
                      ? fmtKarachi(statsQ.data.last_visit_at, 'dd MMM yyyy')
                      : '—',
                    icon: 'time-outline',
                    accent: colors.warning,
                    accentBg: colors.warningBg,
                    description: statsQ.data.last_visit_at
                      ? 'Date and time of the most recent sale recorded for this customer.'
                      : 'No sales have been recorded for this customer yet.',
                    // Display-only tile — no exact-value block needed for a
                    // date. Omitting rawValue/isCurrency hides the number
                    // section in the modal.
                    isCurrency: false,
                    rawValue: 0,
                  },
                ] as KpiItem[]
              }
            />
          </View>
        )}

        {/* Totals card */}
        <Card>
          <ThemedText type="h4" style={{ marginBottom: spacing[3] }}>Outstanding</ThemedText>
          <View style={styles.totalsGrid}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setOutInfo('total')}
              style={[styles.totalCell, { borderLeftColor: colors.primary500 }]}
            >
              <ThemedText type="overline" color={colors.textTertiary}>TOTAL DUE</ThemedText>
              <ThemedText type="h4" color={colors.textPrimary} numberOfLines={1} adjustsFontSizeToFit>
                {fmtRupeeCompact(totals.total)}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setOutInfo('overdue')}
              style={[styles.totalCell, { borderLeftColor: totals.overdue > 0 ? colors.danger : colors.success }]}
            >
              <ThemedText type="overline" color={colors.textTertiary}>OVERDUE</ThemedText>
              <ThemedText
                type="h4"
                color={totals.overdue > 0 ? colors.danger : colors.success}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {fmtRupeeCompact(totals.overdue)}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setOutInfo('txns')}
              style={[styles.totalCell, { borderLeftColor: colors.info }]}
            >
              <ThemedText type="overline" color={colors.textTertiary}>TXNS</ThemedText>
              <ThemedText type="h4" color={colors.textPrimary} numberOfLines={1}>
                {totals.count}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Info modals for the Outstanding cells */}
        <StatInfoModal
          visible={outInfo === 'total'}
          onClose={() => setOutInfo(null)}
          label="Total Due"
          description="Total amount this customer still owes you across every sale that hasn't been fully paid yet."
          value={totals.total}
          icon="cash-outline"
          accentColor={colors.primary500}
          accentBg={colors.primary50}
        />
        <StatInfoModal
          visible={outInfo === 'overdue'}
          onClose={() => setOutInfo(null)}
          label="Overdue"
          description="Portion of the total that has already passed its due date. Follow up on these first."
          value={totals.overdue}
          icon="alert-circle-outline"
          accentColor={totals.overdue > 0 ? colors.danger : colors.success}
          accentBg={totals.overdue > 0 ? colors.dangerBg : colors.successBg}
        />
        <StatInfoModal
          visible={outInfo === 'txns'}
          onClose={() => setOutInfo(null)}
          label="Transactions"
          description="Number of separate sales to this customer that still have an unpaid balance."
          value={totals.count}
          isCurrency={false}
          icon="receipt-outline"
          accentColor={colors.info}
          accentBg={colors.infoBg}
        />

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

        {/* Payment history (all-time, across every sale to this customer) */}
        <Card>
          <View style={styles.sectionLabelRow}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <ThemedText type="overline" color={colors.textSecondary}>PAYMENT HISTORY</ThemedText>
          </View>
          <PaymentTimeline payments={paymentsQ.data ?? []} />
        </Card>
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
            {fmtKarachi(sale.sold_at, 'dd MMM yyyy')} · {sale.quantity} unit{sale.quantity === 1 ? '' : 's'}
          </ThemedText>
        </View>
        <PaymentStatusBadge status={sale.payment_status} overdue={overdue} compact />
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.amountCell}>
          <ThemedText type="caption" color={colors.textTertiary}>Total</ThemedText>
          <ThemedText type="numericSm" color={colors.textPrimary}>{fmtRupeeCompact(total)}</ThemedText>
        </View>
        <View style={styles.amountCell}>
          <ThemedText type="caption" color={colors.textTertiary}>Paid</ThemedText>
          <ThemedText type="numericSm" color={colors.success}>{fmtRupeeCompact(paid)}</ThemedText>
        </View>
        <View style={styles.amountCell}>
          <ThemedText type="caption" color={colors.textTertiary}>Balance</ThemedText>
          <ThemedText type="numericSm" color={overdue ? colors.danger : colors.textPrimary}>
            {fmtRupeeCompact(balance)}
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
            {fmtKarachi(sale.due_date, 'dd MMM yyyy')}
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
  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  totalCell: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 100,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderLeftWidth: 3,
    gap: spacing[1],
  },
  sectionLabel: { marginBottom: spacing[3], color: colors.textSecondary },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
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
