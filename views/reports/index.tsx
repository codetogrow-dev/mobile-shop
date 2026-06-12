import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { FeatureChipRail, type FeatureChipItem } from '@/components/ui/feature-chip-rail';
import { PeriodSegment, type ReportPeriod } from '@/components/ui/period-segment';
import { PeriodNavigator } from '@/components/ui/period-navigator';
import { colors, spacing } from '@/constants/theme';
import { REPORT_MODE } from '@/constants/enums';

import { SalesPanel } from './panels/sales-panel';
import { PurchasesPanel } from './panels/purchases-panel';
import { InventoryPanel } from './panels/inventory-panel';
import { CustomersPanel } from './panels/customers-panel';
import { SuppliersPanel } from './panels/suppliers-panel';
import { DuesPanel } from './panels/dues-panel';

type Feature = 'sales' | 'purchases' | 'inventory' | 'customers' | 'suppliers' | 'dues';

const FEATURES: FeatureChipItem<Feature>[] = [
  { id: 'sales',      label: 'Sales',      icon: 'cash-outline' },
  { id: 'purchases',  label: 'Purchases',  icon: 'cart-outline' },
  { id: 'inventory',  label: 'Inventory',  icon: 'cube-outline' },
  { id: 'customers',  label: 'Customers',  icon: 'people-outline' },
  { id: 'suppliers',  label: 'Suppliers',  icon: 'business-outline' },
  { id: 'dues',       label: 'Dues',       icon: 'wallet-outline' },
];

export default function ReportsView() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [feature, setFeature] = useState<Feature>('sales');
  const [period, setPeriod] = useState<ReportPeriod>(REPORT_MODE.DAILY);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  }, [qc]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="h2">Reports</ThemedText>
          <ThemedText type="caption" color={colors.textSecondary}>
            Per-feature analytics & forecasts
          </ThemedText>
        </View>
      </View>

      {/* Feature chip rail */}
      <FeatureChipRail
        items={FEATURES}
        activeId={feature}
        onChange={setFeature}
      />

      {/* Period segment */}
      <PeriodSegment value={period} onChange={setPeriod} />

      {/* Month / Year navigator — hidden for "Today" */}
      <PeriodNavigator
        period={period}
        year={year}
        month={month}
        onChangeYear={setYear}
        onChangeMonth={setMonth}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary500}
          />
        }
      >
        {feature === 'sales'      && <SalesPanel      period={period} year={year} month={month} />}
        {feature === 'purchases'  && <PurchasesPanel  period={period} year={year} month={month} />}
        {feature === 'inventory'  && <InventoryPanel  period={period} year={year} month={month} />}
        {feature === 'customers'  && <CustomersPanel  period={period} year={year} month={month} />}
        {feature === 'suppliers'  && <SuppliersPanel  period={period} year={year} month={month} />}
        {feature === 'dues'       && <DuesPanel       period={period} year={year} month={month} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  scroll: { paddingTop: spacing[3] },
});
