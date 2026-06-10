import { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Modal, TouchableOpacity,
  TouchableWithoutFeedback, ScrollView, Animated, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import type { SaleFilters, PurchaseFilters, SaleSortBy, PurchaseSortBy } from '@/types/app';
import { DEFAULT_SALE_FILTERS, DEFAULT_PURCHASE_FILTERS } from '@/types/app';

// ─── Sales variant ────────────────────────────────────────────────────────────

interface SaleSheetProps {
  mode: 'sales';
  visible: boolean;
  filters: SaleFilters;
  onApply: (f: SaleFilters) => void;
  onClose: () => void;
}

// ─── Purchases variant ────────────────────────────────────────────────────────

interface PurchaseSheetProps {
  mode: 'purchases';
  visible: boolean;
  filters: PurchaseFilters;
  onApply: (f: PurchaseFilters) => void;
  onClose: () => void;
}

type Props = SaleSheetProps | PurchaseSheetProps;

const SORT_OPTIONS_SALES: { label: string; value: SaleSortBy; icon: string }[] = [
  { label: 'Date (Newest first)', value: 'date_desc',   icon: 'time-outline' },
  { label: 'Revenue (High–Low)',  value: 'amount_desc', icon: 'trending-up-outline' },
  { label: 'Revenue (Low–High)',  value: 'amount_asc',  icon: 'trending-down-outline' },
  { label: 'Quantity (High–Low)', value: 'qty_desc',    icon: 'cube-outline' },
];

const SORT_OPTIONS_PURCHASES: { label: string; value: PurchaseSortBy; icon: string }[] = [
  { label: 'Date (Newest first)', value: 'date_desc',   icon: 'time-outline' },
  { label: 'Amount (High–Low)',   value: 'amount_desc', icon: 'trending-up-outline' },
  { label: 'Amount (Low–High)',   value: 'amount_asc',  icon: 'trending-down-outline' },
  { label: 'Quantity (High–Low)', value: 'qty_desc',    icon: 'cube-outline' },
];

export function countTransactionFiltersActive(f: SaleFilters | PurchaseFilters): number {
  let n = 0;
  if (f.dateFrom || f.dateTo) n++;
  if (f.sortBy !== 'date_desc') n++;
  if ('supplier' in f && f.supplier) n++;
  return n;
}

export function TransactionFilterSheet(props: Props) {
  const { visible, onClose, mode } = props;
  const slideAnim = useRef(new Animated.Value(700)).current;

  const [draft, setDraft] = useState<SaleFilters | PurchaseFilters>(
    mode === 'sales' ? props.filters : props.filters,
  );

  useEffect(() => {
    if (visible) {
      setDraft(mode === 'sales'
        ? (props as SaleSheetProps).filters
        : (props as PurchaseSheetProps).filters,
      );
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 700, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleReset = () =>
    setDraft(mode === 'sales' ? DEFAULT_SALE_FILTERS : DEFAULT_PURCHASE_FILTERS);

  const handleApply = () => {
    if (mode === 'sales') (props as SaleSheetProps).onApply(draft as SaleFilters);
    else (props as PurchaseSheetProps).onApply(draft as PurchaseFilters);
    onClose();
  };

  const activeCount = countTransactionFiltersActive(draft);
  const sortOptions = mode === 'sales' ? SORT_OPTIONS_SALES : SORT_OPTIONS_PURCHASES;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <ThemedText type="h3">
            Filter {mode === 'sales' ? 'Sales' : 'Purchases'}
          </ThemedText>
          <View style={styles.headerActions}>
            {activeCount > 0 && (
              <TouchableOpacity onPress={handleReset} style={styles.resetBtn} activeOpacity={0.7}>
                <Ionicons name="refresh-outline" size={15} color={colors.danger} />
                <ThemedText type="caption" color={colors.danger}>Reset</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Supplier (purchases only) ── */}
          {'supplier' in draft && (
            <Section title="Supplier">
              <View style={styles.searchBox}>
                <Ionicons name="business-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  value={(draft as PurchaseFilters).supplier}
                  onChangeText={(v) => set('supplier' as any, v)}
                  placeholder="Filter by supplier name…"
                  placeholderTextColor={colors.textTertiary}
                  autoCorrect={false}
                />
                {(draft as PurchaseFilters).supplier ? (
                  <TouchableOpacity onPress={() => set('supplier' as any, '')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </Section>
          )}

          {/* ── Date Range ── */}
          <Section title="Date Range">
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <DatePickerField
                  label="From"
                  value={draft.dateFrom}
                  onChange={(v) => set('dateFrom', v)}
                  placeholder="Start date"
                  maximumDate={draft.dateTo ? new Date(draft.dateTo) : new Date()}
                />
              </View>
              <View style={styles.dateSep}>
                <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
              </View>
              <View style={styles.dateField}>
                <DatePickerField
                  label="To"
                  value={draft.dateTo}
                  onChange={(v) => set('dateTo', v)}
                  placeholder="End date"
                  minimumDate={draft.dateFrom ? new Date(draft.dateFrom) : undefined}
                  maximumDate={new Date()}
                />
              </View>
            </View>

            {/* Quick date presets */}
            <View style={styles.presets}>
              {DATE_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={styles.presetChip}
                  onPress={() => { set('dateFrom', p.from()); set('dateTo', p.to()); }}
                  activeOpacity={0.7}
                >
                  <ThemedText type="caption" color={colors.primary600}>{p.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* ── Sort ── */}
          <Section title="Sort By">
            <View style={styles.sortList}>
              {sortOptions.map((o) => {
                const active = draft.sortBy === o.value;
                return (
                  <TouchableOpacity
                    key={o.value}
                    style={[styles.sortRow, active && styles.sortRowActive]}
                    onPress={() => set('sortBy', o.value as any)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={o.icon as any} size={18} color={active ? colors.primary500 : colors.textTertiary} />
                    <ThemedText type="body" color={active ? colors.primary500 : colors.textPrimary}
                      style={active && { fontWeight: '600' }}>
                      {o.label}
                    </ThemedText>
                    {active && <Ionicons name="checkmark" size={18} color={colors.primary500} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>

        </ScrollView>

        {/* Apply */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
            <ThemedText type="h4" color={colors.textInverse}>
              Apply{activeCount > 0 ? ` (${activeCount})` : ''}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing[3] }}>
      <ThemedText type="overline" color={colors.textTertiary} style={{ textTransform: 'uppercase' }}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function fmt(d: Date) {
  return d.toISOString().split('T')[0];
}

const DATE_PRESETS = [
  { label: 'Today',      from: () => fmt(new Date()),                              to: () => fmt(new Date()) },
  { label: 'Yesterday',  from: () => { const d = new Date(); d.setDate(d.getDate()-1); return fmt(d); }, to: () => { const d = new Date(); d.setDate(d.getDate()-1); return fmt(d); } },
  { label: 'This week',  from: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return fmt(d); }, to: () => fmt(new Date()) },
  { label: 'This month', from: () => { const d = new Date(); return fmt(new Date(d.getFullYear(), d.getMonth(), 1)); }, to: () => fmt(new Date()) },
  { label: 'Last 30d',   from: () => { const d = new Date(); d.setDate(d.getDate()-30); return fmt(d); }, to: () => fmt(new Date()) },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    ...shadows.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing[3], marginBottom: spacing[1],
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[5], paddingVertical: spacing[4],
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1],
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.full, backgroundColor: colors.dangerBg,
    borderWidth: 1, borderColor: colors.danger + '40',
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: spacing[5], gap: spacing[6], paddingBottom: spacing[4] },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[3], height: 44,
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgElevated,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: colors.textPrimary,
    fontFamily: 'Montserrat_400Regular',
    paddingVertical: 0,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dateField: { flex: 1 },
  dateSep: { marginTop: spacing[4] },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  presetChip: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.full, borderWidth: 1,
    borderColor: colors.primary200, backgroundColor: colors.primary50,
  },
  sortList: { gap: spacing[2] },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingVertical: spacing[3], paddingHorizontal: spacing[4],
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgElevated,
  },
  sortRowActive: { borderColor: colors.primary300, backgroundColor: colors.primary50 },
  footer: {
    padding: spacing[5], paddingBottom: spacing[6],
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  applyBtn: {
    backgroundColor: colors.primary500, borderRadius: radius.lg,
    paddingVertical: spacing[4], alignItems: 'center', justifyContent: 'center',
    ...shadows.md,
  },
});
