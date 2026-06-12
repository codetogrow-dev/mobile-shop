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

import { getSupplier, getSupplierStats } from '@/api/suppliers';
import { getPayablesForSupplier } from '@/api/dues';
import { listPaymentsForSupplier } from '@/api/payments';

import { ContactActions } from '@/views/customer-detail/contact-actions';
import { PaymentTimeline } from '@/views/customer-detail/payment-timeline';

type OweInfoKey = 'total' | 'overdue' | 'batches';

export default function SupplierDetailView() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [oweInfo, setOweInfo] = useState<OweInfoKey | null>(null);

  const supplierQ = useQuery({
    queryKey: QK.suppliers.detail(id ?? ''),
    queryFn: () => getSupplier(id!),
    enabled: !!id,
  });
  const purchasesQ = useQuery({
    queryKey: QK.dues.supplier(id ?? ''),
    queryFn: () => getPayablesForSupplier(id!),
    enabled: !!id,
  });
  const statsQ = useQuery({
    queryKey: QK.suppliers.stats(id ?? ''),
    queryFn: () => getSupplierStats(id!),
    enabled: !!id,
  });
  const paymentsQ = useQuery({
    queryKey: QK.payments.bySupplier(id ?? ''),
    queryFn: () => listPaymentsForSupplier(id!),
    enabled: !!id,
  });

  const purchases = purchasesQ.data ?? [];
  const sortedPurchases = useMemo(() => {
    const today = new Date(new Date().toDateString());
    return [...purchases].sort((a: any, b: any) => {
      const aOver = a.due_date && new Date(a.due_date) < today ? 0 : 1;
      const bOver = b.due_date && new Date(b.due_date) < today ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      const aDue = a.due_date ? +new Date(a.due_date) : Infinity;
      const bDue = b.due_date ? +new Date(b.due_date) : Infinity;
      return aDue - bDue;
    });
  }, [purchases]);

  const totals = useMemo(() => {
    const today = new Date(new Date().toDateString());
    let total = 0, overdue = 0;
    purchases.forEach((p: any) => {
      const bal = Number(p.balance_due ?? 0);
      total += bal;
      if (bal > 0 && p.due_date && new Date(p.due_date) < today) overdue += bal;
    });
    return { total, overdue, count: purchases.length };
  }, [purchases]);

  const supplier = supplierQ.data;
  const refetchAll = () => { supplierQ.refetch(); purchasesQ.refetch(); };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <ThemedText type="h3" numberOfLines={1} style={{ flex: 1 }}>
          {supplier?.name ?? 'Supplier'}
        </ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={supplierQ.isLoading || purchasesQ.isLoading} onRefresh={refetchAll} tintColor={colors.primary500} />
        }
      >
        <Card>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <ThemedText type="h2" color={colors.info}>
                {(supplier?.name ?? '?').charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText type="h3" numberOfLines={1}>{supplier?.name ?? '—'}</ThemedText>
              <Badge label="Supplier" variant="info" />
            </View>
          </View>
          <View style={styles.contactList}>
            {supplier?.phone && (
              <ContactRow icon="call-outline" label="Phone" value={supplier.phone} />
            )}
            {supplier?.cnic && (
              <ContactRow icon="card-outline" label="CNIC" value={supplier.cnic} />
            )}
            {supplier?.address && (
              <ContactRow icon="location-outline" label="Address" value={supplier.address} />
            )}
          </View>
          <View style={{ height: spacing[3] }} />
          <ContactActions phone={supplier?.phone ?? null} />
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
                    label: 'Lifetime purchased',
                    value: fmtRupee(statsQ.data.lifetime_purchased),
                    icon: 'cart-outline',
                    accent: colors.info,
                    accentBg: colors.infoBg,
                    description:
                      'Total amount this shop has bought from this supplier across every purchase batch, including partial and unpaid amounts.',
                    rawValue: statsQ.data.lifetime_purchased,
                  },
                  {
                    label: 'Batches',
                    value: String(statsQ.data.batch_count),
                    icon: 'layers-outline',
                    accent: colors.primary500,
                    accentBg: colors.primary50,
                    description:
                      'Number of separate purchase batches received from this supplier. Each recorded purchase counts as one batch.',
                    rawValue: statsQ.data.batch_count,
                    isCurrency: false,
                  },
                  {
                    label: 'Avg batch',
                    value: fmtRupee(statsQ.data.avg_batch),
                    icon: 'receipt-outline',
                    accent: colors.success,
                    accentBg: colors.successBg,
                    description:
                      'Average amount per batch from this supplier (lifetime purchased ÷ batches). Higher means each restock is bigger.',
                    rawValue: statsQ.data.avg_batch,
                  },
                  {
                    label: 'Last purchase',
                    value: statsQ.data.last_purchase_at
                      ? fmtKarachi(statsQ.data.last_purchase_at, 'dd MMM yyyy')
                      : '—',
                    icon: 'time-outline',
                    accent: colors.warning,
                    accentBg: colors.warningBg,
                    description: statsQ.data.last_purchase_at
                      ? 'Date and time of the most recent purchase batch received from this supplier.'
                      : 'No purchases have been recorded from this supplier yet.',
                    isCurrency: false,
                    rawValue: 0,
                  },
                ] as KpiItem[]
              }
            />
          </View>
        )}

        <Card>
          <ThemedText type="h4" style={{ marginBottom: spacing[3] }}>You owe</ThemedText>
          <View style={styles.totalsGrid}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setOweInfo('total')}
              style={[styles.totalCell, { borderLeftColor: colors.info }]}
            >
              <ThemedText type="overline" color={colors.textTertiary}>TOTAL DUE</ThemedText>
              <ThemedText type="h4" color={colors.textPrimary} numberOfLines={1} adjustsFontSizeToFit>
                {fmtRupeeCompact(totals.total)}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setOweInfo('overdue')}
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
              onPress={() => setOweInfo('batches')}
              style={[styles.totalCell, { borderLeftColor: colors.warning }]}
            >
              <ThemedText type="overline" color={colors.textTertiary}>BATCHES</ThemedText>
              <ThemedText type="h4" color={colors.textPrimary} numberOfLines={1}>
                {totals.count}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Info modals for the You-owe cells */}
        <StatInfoModal
          visible={oweInfo === 'total'}
          onClose={() => setOweInfo(null)}
          label="Total Due"
          description="Total amount you owe this supplier across every purchase batch that hasn't been fully paid yet."
          value={totals.total}
          icon="cash-outline"
          accentColor={colors.info}
          accentBg={colors.infoBg}
        />
        <StatInfoModal
          visible={oweInfo === 'overdue'}
          onClose={() => setOweInfo(null)}
          label="Overdue"
          description="Portion of the total that has already passed its due date. Settle these first to avoid hurting the relationship."
          value={totals.overdue}
          icon="alert-circle-outline"
          accentColor={totals.overdue > 0 ? colors.danger : colors.success}
          accentBg={totals.overdue > 0 ? colors.dangerBg : colors.successBg}
        />
        <StatInfoModal
          visible={oweInfo === 'batches'}
          onClose={() => setOweInfo(null)}
          label="Batches"
          description="Number of separate purchase batches from this supplier that still have an unpaid balance."
          value={totals.count}
          isCurrency={false}
          icon="layers-outline"
          accentColor={colors.warning}
          accentBg={colors.warningBg}
        />

        <View>
          <ThemedText type="h4" style={styles.sectionLabel}>Unpaid Purchases</ThemedText>
          {sortedPurchases.length === 0 ? (
            <Card>
              <View style={styles.emptyInline}>
                <Ionicons name="checkmark-done-circle-outline" size={28} color={colors.success} />
                <ThemedText type="body" color={colors.textSecondary}>
                  No outstanding purchases from this supplier.
                </ThemedText>
              </View>
            </Card>
          ) : (
            <View style={{ gap: spacing[3] }}>
              {sortedPurchases.map((p: any) => (
                <UnpaidPurchaseCard key={p.id} purchase={p} />
              ))}
            </View>
          )}
        </View>

        {/* Payment history (all-time, across every purchase from this supplier) */}
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

function UnpaidPurchaseCard({ purchase }: { purchase: any }) {
  const today = new Date(new Date().toDateString());
  const balance = Number(purchase.balance_due ?? 0);
  const overdue = balance > 0 && purchase.due_date && new Date(purchase.due_date) < today;
  const total = Number(purchase.quantity) * Number(purchase.cost_price);
  const paid  = Number(purchase.amount_paid ?? 0);

  return (
    <Card>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="h4" numberOfLines={1}>{purchase.products?.name ?? 'Purchase'}</ThemedText>
          <ThemedText type="caption" color={colors.textTertiary}>
            {fmtKarachi(purchase.purchased_at, 'dd MMM yyyy')} · {purchase.quantity} unit{purchase.quantity === 1 ? '' : 's'}
          </ThemedText>
        </View>
        <PaymentStatusBadge status={purchase.payment_status} overdue={overdue} compact />
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

      {purchase.due_date && (
        <View style={[styles.dueRow, overdue && styles.dueRowOverdue]}>
          <Ionicons
            name={overdue ? 'alert-circle' : 'time-outline'}
            size={13}
            color={overdue ? colors.danger : colors.warning}
          />
          <ThemedText type="caption" color={overdue ? colors.danger : colors.textSecondary}>
            {overdue ? 'Overdue since ' : 'Due '}
            {fmtKarachi(purchase.due_date, 'dd MMM yyyy')}
          </ThemedText>
        </View>
      )}

      <TouchableOpacity
        style={styles.payBtn}
        onPress={() =>
          router.push({
            pathname: '/(app)/record-payment',
            params: { transactionType: 'purchase', transactionId: purchase.id, maxAmount: balance.toString() },
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
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 18, backgroundColor: colors.bgElevated,
  },
  content: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[12] },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.infoBg, alignItems: 'center', justifyContent: 'center',
  },
  contactList: { gap: spacing[2] },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  totalCell: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 100,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    borderRadius: radius.md, backgroundColor: colors.bgElevated,
    borderLeftWidth: 3, gap: spacing[1],
  },
  sectionLabel: { marginBottom: spacing[3], color: colors.textSecondary },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  emptyInline: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[2] },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] },
  amountsRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  amountCell: {
    flex: 1,
    paddingHorizontal: spacing[2], paddingVertical: spacing[2],
    backgroundColor: colors.bgElevated, borderRadius: radius.sm, gap: 2,
  },
  dueRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    backgroundColor: colors.warningBg, borderRadius: radius.md, marginBottom: spacing[3],
  },
  dueRowOverdue: { backgroundColor: colors.dangerBg },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[2], paddingVertical: spacing[3],
    backgroundColor: colors.primary500, borderRadius: radius.md,
  },
});
