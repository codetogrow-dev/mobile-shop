import { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, StyleSheet, Modal, TouchableOpacity,
  TouchableWithoutFeedback, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Combobox } from '@/components/ui/combobox';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { QK } from '@/constants/query-keys';
import { listCategories } from '@/api/categories';
import type { ProductFilters, StockFilter, SortBy } from '@/types/app';
import { DEFAULT_FILTERS } from '@/types/app';
import { STOCK_FILTER, PRODUCT_SORT } from '@/constants/enums';

interface Props {
  visible: boolean;
  filters: ProductFilters;
  onApply: (filters: ProductFilters) => void;
  onClose: () => void;
}

const STOCK_OPTIONS: { label: string; value: StockFilter; icon: string; color: string }[] = [
  { label: 'All Products',  value: STOCK_FILTER.ALL, icon: 'apps-outline',             color: colors.textSecondary },
  { label: 'In Stock',      value: STOCK_FILTER.OK,  icon: 'checkmark-circle-outline', color: colors.success },
  { label: 'Low Stock',     value: STOCK_FILTER.LOW, icon: 'warning-outline',           color: colors.warning },
  { label: 'Out of Stock',  value: STOCK_FILTER.OUT, icon: 'close-circle-outline',      color: colors.danger },
];

const SORT_OPTIONS: { label: string; value: SortBy; icon: string }[] = [
  { label: 'Name (A–Z)',        value: PRODUCT_SORT.NAME,    icon: 'text-outline' },
  { label: 'Stock Level',       value: PRODUCT_SORT.STOCK,   icon: 'cube-outline' },
  { label: 'Recently Updated',  value: PRODUCT_SORT.UPDATED, icon: 'time-outline' },
];

export function InventoryFilterSheet({ visible, filters, onApply, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const [draft, setDraft] = useState<ProductFilters>(filters);
  const [draftParentIds, setDraftParentIds] = useState<string[]>([]);
  const [draftSubIds, setDraftSubIds] = useState<string[]>([]);
  const [comboOpen, setComboOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: QK.categories.all,
    queryFn: listCategories,
  });

  const allCategories = categories ?? [];

  const parentItems = useMemo(
    () =>
      allCategories
        .filter((c) => !(c as any).parent_id)
        .map((c) => ({ id: c.id, label: c.name, color: (c as any).color_hex ?? undefined })),
    [allCategories],
  );

  const subItems = useMemo(
    () =>
      allCategories
        .filter((c) => (c as any).parent_id && draftParentIds.includes((c as any).parent_id))
        .map((c) => ({ id: c.id, label: c.name, color: (c as any).color_hex ?? undefined })),
    [allCategories, draftParentIds],
  );

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      if (categories && categories.length > 0) {
        const parentIds = categories
          .filter((c) => !(c as any).parent_id && filters.categoryIds.includes(c.id))
          .map((c) => c.id);
        const childIds = categories
          .filter((c) => !!(c as any).parent_id && filters.categoryIds.includes(c.id))
          .map((c) => c.id);
        const backDerivedParents = [
          ...new Set(
            categories
              .filter((c) => childIds.includes(c.id))
              .map((c) => (c as any).parent_id as string),
          ),
        ];
        setDraftParentIds(parentIds.length > 0 ? parentIds : backDerivedParents);
        setDraftSubIds(childIds);
      } else {
        setDraftParentIds([]);
        setDraftSubIds([]);
      }
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible, categories]);

  const set = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleReset = () => {
    setDraft(DEFAULT_FILTERS);
    setDraftParentIds([]);
    setDraftSubIds([]);
  };

  const handleApply = () => {
    const resolvedIds = draftSubIds.length > 0 ? draftSubIds : draftParentIds;
    onApply({ ...draft, categoryIds: resolvedIds });
    onClose();
  };

  const activeCount = countActive({ ...draft, categoryIds: draftSubIds.length > 0 ? draftSubIds : draftParentIds });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <ThemedText type="h3">Filters</ThemedText>
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
          nestedScrollEnabled
          scrollEnabled={!comboOpen}
        >
          {/* ── Stock Status ── */}
          <Section title="Stock Status">
            <View style={styles.optionGrid}>
              {STOCK_OPTIONS.map((o) => {
                const active = draft.stockFilter === o.value;
                return (
                  <TouchableOpacity
                    key={o.value}
                    style={[styles.optionChip, active && { borderColor: o.color, backgroundColor: o.color + '18' }]}
                    onPress={() => set('stockFilter', o.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={o.icon as any} size={16} color={active ? o.color : colors.textTertiary} />
                    <ThemedText
                      type="caption"
                      color={active ? o.color : colors.textSecondary}
                      style={active ? { fontWeight: '600' } : undefined}
                    >
                      {o.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>

          {/* ── Category ── */}
          <Section title="Category">
            <Combobox
              items={parentItems}
              selectedIds={draftParentIds}
              onChangeSelectedIds={(ids) => {
                setDraftParentIds(ids);
                setDraftSubIds((prev) =>
                  prev.filter((sid) => {
                    const c = allCategories.find((c) => c.id === sid);
                    return (c as any)?.parent_id != null && ids.includes((c as any).parent_id);
                  }),
                );
              }}
              placeholder="All Categories"
              multiple
              noBackdrop
              onOpenChange={setComboOpen}
            />
            {draftParentIds.length > 0 && subItems.length > 0 && (
              <Combobox
                items={subItems}
                selectedIds={draftSubIds}
                onChangeSelectedIds={setDraftSubIds}
                placeholder="All Sub-categories"
                multiple
                noBackdrop
                onOpenChange={setComboOpen}
              />
            )}
          </Section>

          {/* ── Sort By ── */}
          <Section title="Sort By">
            <View style={styles.sortList}>
              {SORT_OPTIONS.map((o) => {
                const active = draft.sortBy === o.value;
                return (
                  <TouchableOpacity
                    key={o.value}
                    style={[styles.sortRow, active && styles.sortRowActive]}
                    onPress={() => set('sortBy', o.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={o.icon as any} size={18} color={active ? colors.primary500 : colors.textTertiary} />
                    <ThemedText
                      type="body"
                      color={active ? colors.primary500 : colors.textPrimary}
                      style={active ? { fontWeight: '600' } : undefined}
                    >
                      {o.label}
                    </ThemedText>
                    {active && (
                      <Ionicons name="checkmark" size={18} color={colors.primary500} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>

          {/* ── Date Added ── */}
          <Section title="Date Added">
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
          </Section>
        </ScrollView>

        {/* Apply */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
            <ThemedText type="h4" color={colors.textInverse}>
              Apply Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <ThemedText type="overline" color={colors.textTertiary} style={sectionStyles.title}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

export function countActive(f: ProductFilters): number {
  let n = 0;
  if (f.stockFilter !== STOCK_FILTER.ALL) n++;
  if (f.categoryIds.length > 0) n++;
  if (f.sortBy !== PRODUCT_SORT.NAME) n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}

const sectionStyles = StyleSheet.create({
  container: { gap: spacing[3] },
  title: { textTransform: 'uppercase' },
});

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
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
    backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: spacing[5], gap: spacing[6], paddingBottom: spacing[4] },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.full, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgElevated,
  },
  sortList: { gap: spacing[2] },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingVertical: spacing[3], paddingHorizontal: spacing[4],
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgElevated,
  },
  sortRowActive: { borderColor: colors.primary300, backgroundColor: colors.primary50 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dateField: { flex: 1 },
  dateSep: { marginTop: spacing[4] },
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
