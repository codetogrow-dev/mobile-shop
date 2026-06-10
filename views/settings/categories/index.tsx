import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { QK } from '@/constants/query-keys';
import { listCategories, createCategory, updateCategory, deleteCategory } from '@/api/categories';
import { useAuthStore } from '@/store/auth-store';

export const PRESET_COLORS = [
  '#00B4E6', '#00C48C', '#FFB800', '#FF4757',
  '#7C5CBF', '#3D8EF0', '#FF6B6B', '#20C997',
  '#FD7E14', '#6F42C1', '#E83E8C', '#8CA3B4',
];

type CategoryRow = {
  id: string;
  name: string;
  color_hex: string | null;
  parent_id: string | null;
};

type FormMode =
  | { type: 'add-parent' }
  | { type: 'add-child'; parentId: string; parentColor: string }
  | { type: 'edit'; category: CategoryRow };

export default function CategoriesView() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const tenantId = (user as any)?.user_metadata?.tenant_id ?? user?.id ?? '';

  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: categories, isLoading } = useQuery({
    queryKey: QK.categories.list,
    queryFn: listCategories,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QK.categories.all });

  const openForm = (mode: FormMode) => {
    setFormMode(mode);
    if (mode.type === 'edit') {
      setFormName(mode.category.name);
      setFormColor(mode.category.color_hex ?? PRESET_COLORS[0]);
    } else if (mode.type === 'add-child') {
      setFormName('');
      setFormColor(mode.parentColor);
    } else {
      setFormName('');
      setFormColor(PRESET_COLORS[0]);
    }
  };

  const closeForm = () => {
    setFormMode(null);
    setFormName('');
    setFormColor(PRESET_COLORS[0]);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const parentId = formMode?.type === 'add-child' ? formMode.parentId : null;
      return createCategory(formName, formColor, tenantId, parentId);
    },
    onSuccess: (data) => {
      invalidate();
      if (formMode?.type === 'add-child') {
        setExpanded((e) => ({ ...e, [formMode.parentId]: true }));
      }
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (formMode?.type !== 'edit') return Promise.reject();
      return updateCategory(formMode.category.id, formName, formColor);
    },
    onSuccess: () => { invalidate(); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => invalidate(),
  });

  const handleDelete = (id: string, name: string, hasChildren: boolean) => {
    const msg = hasChildren
      ? `Delete "${name}"? All its sub-categories will also be deleted.`
      : `Delete "${name}"? Products using this category will become uncategorised.`;
    Alert.alert('Delete Category', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const parents = categories?.filter((c) => !c.parent_id) ?? [];
  const childrenOf = (parentId: string) =>
    categories?.filter((c) => c.parent_id === parentId) ?? [];

  const formTitle =
    formMode?.type === 'edit'
      ? 'Edit Category'
      : formMode?.type === 'add-child'
      ? 'New Sub-category'
      : 'New Category';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <ThemedText type="h3">Categories</ThemedText>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => openForm({ type: 'add-parent' })}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Form */}
        {formMode && (
          <CategoryForm
            title={formTitle}
            name={formName}
            color={formColor}
            onNameChange={setFormName}
            onColorChange={setFormColor}
            onSave={() => {
              if (!formName.trim()) return;
              formMode.type === 'edit' ? updateMutation.mutate() : createMutation.mutate();
            }}
            onCancel={closeForm}
            saving={createMutation.isPending || updateMutation.isPending}
            error={
              (createMutation.error as any)?.message ??
              (updateMutation.error as any)?.message
            }
          />
        )}

        {/* List */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary500} style={{ marginTop: spacing[8] }} />
        ) : parents.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={48} color={colors.textTertiary} />
            <ThemedText type="body" color={colors.textSecondary} style={styles.emptyText}>
              No categories yet.{'\n'}Tap + to create your first one.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {parents.map((parent, pi) => {
              const children = childrenOf(parent.id);
              const isExpanded = expanded[parent.id] ?? false;
              const isLast = pi === parents.length - 1;

              return (
                <View key={parent.id}>
                  {/* Parent row */}
                  <View style={[styles.parentRow, !isLast || isExpanded ? styles.rowBorder : null]}>
                    <TouchableOpacity
                      style={styles.expandBtn}
                      onPress={() => setExpanded((e) => ({ ...e, [parent.id]: !isExpanded }))}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={16}
                        color={children.length > 0 ? colors.textSecondary : colors.border}
                      />
                    </TouchableOpacity>

                    <View style={[styles.colorDot, { backgroundColor: parent.color_hex ?? colors.primary500 }]} />

                    <ThemedText type="body" style={styles.categoryName} numberOfLines={1}>
                      {parent.name}
                    </ThemedText>

                    {children.length > 0 && (
                      <View style={styles.countBadge}>
                        <ThemedText type="caption" color={colors.textTertiary}>{children.length}</ThemedText>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.rowAction}
                      onPress={() => openForm({ type: 'edit', category: parent as CategoryRow })}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.primary500} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rowAction}
                      onPress={() => handleDelete(parent.id, parent.name, children.length > 0)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>

                  {/* Children */}
                  {isExpanded && (
                    <View style={styles.childrenBlock}>
                      {children.map((child, ci) => (
                        <View
                          key={child.id}
                          style={[styles.childRow, ci < children.length - 1 ? styles.rowBorder : null]}
                        >
                          <View style={styles.childIndent} />
                          <Ionicons name="return-down-forward" size={14} color={colors.border} />
                          <View style={[styles.colorDotSm, { backgroundColor: child.color_hex ?? colors.primary500 }]} />
                          <ThemedText type="body" style={styles.categoryName} numberOfLines={1}>
                            {child.name}
                          </ThemedText>
                          <TouchableOpacity
                            style={styles.rowAction}
                            onPress={() => openForm({ type: 'edit', category: child as CategoryRow })}
                          >
                            <Ionicons name="create-outline" size={16} color={colors.primary500} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.rowAction}
                            onPress={() => handleDelete(child.id, child.name, false)}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      ))}

                      {/* Add sub-category row */}
                      <TouchableOpacity
                        style={styles.addChildRow}
                        onPress={() => openForm({
                          type: 'add-child',
                          parentId: parent.id,
                          parentColor: parent.color_hex ?? PRESET_COLORS[0],
                        })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.childIndent} />
                        <Ionicons name="add-circle-outline" size={16} color={colors.primary500} />
                        <ThemedText type="caption" color={colors.primary500}>Add sub-category</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface CategoryFormProps {
  title: string;
  name: string;
  color: string;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
}

function CategoryForm({
  title, name, color, onNameChange, onColorChange,
  onSave, onCancel, saving, error,
}: CategoryFormProps) {
  return (
    <View style={formStyles.card}>
      <ThemedText type="h4">{title}</ThemedText>

      {error && (
        <View style={formStyles.errorBanner}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <ThemedText type="caption" color={colors.danger}>{error}</ThemedText>
        </View>
      )}

      <TextInput
        style={formStyles.input}
        value={name}
        onChangeText={onNameChange}
        placeholder="e.g. Samsung, Chargers…"
        placeholderTextColor={colors.textTertiary}
        autoFocus
      />

      <View style={formStyles.colorGrid}>
        {PRESET_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[formStyles.colorSwatch, { backgroundColor: c }, color === c && formStyles.colorSwatchSelected]}
            onPress={() => onColorChange(c)}
            activeOpacity={0.8}
          >
            {color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={[formStyles.preview, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
        <View style={[formStyles.previewDot, { backgroundColor: color }]} />
        <ThemedText type="caption" color={color} style={{ fontWeight: '600' }}>
          {name.trim() || 'Preview'}
        </ThemedText>
      </View>

      <View style={formStyles.actions}>
        <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <ThemedText type="caption" color={colors.textSecondary}>Cancel</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[formStyles.saveBtn, (!name.trim() || saving) && formStyles.saveBtnDisabled]}
          onPress={onSave}
          disabled={!name.trim() || saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator size="small" color={colors.textInverse} />
            : <ThemedText type="caption" color={colors.textInverse} style={{ fontWeight: '600' }}>Save</ThemedText>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary500,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  content: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  list: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  expandBtn: {
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  colorDotSm: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { flex: 1 },
  countBadge: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  rowAction: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  childrenBlock: {
    backgroundColor: colors.bgBase,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  childIndent: { width: spacing[5] },
  addChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  empty: { alignItems: 'center', paddingTop: spacing[12], gap: spacing[3] },
  emptyText: { textAlign: 'center' },
});

const formStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.primary300,
    ...shadows.md,
  },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.dangerBg, borderRadius: radius.sm,
    padding: spacing[2], borderWidth: 1, borderColor: colors.danger,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: 'Montserrat_400Regular',
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  colorSwatch: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchSelected: { borderWidth: 2.5, borderColor: colors.textPrimary },
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.full, borderWidth: 1, alignSelf: 'flex-start',
  },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  actions: { flexDirection: 'row', gap: spacing[3] },
  cancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing[3],
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  saveBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing[3],
    borderRadius: radius.md, backgroundColor: colors.primary500,
  },
  saveBtnDisabled: { opacity: 0.5 },
});
