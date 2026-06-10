import { useState, useMemo, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, TextInput,
  Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius, shadows } from '@/constants/theme';

export interface ComboboxItem {
  id: string;
  label: string;
  color?: string;
}

export interface ComboboxProps {
  items: ComboboxItem[];
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  placeholder: string;
  multiple?: boolean;
}

export function Combobox({
  items,
  selectedIds,
  onChangeSelectedIds,
  placeholder,
  multiple = true,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  const selectedItems = items.filter((i) => selectedIds.includes(i.id));

  const close = () => {
    setOpen(false);
    inputRef.current?.blur();
    // restore label in single mode
    if (!multiple && selectedIds.length > 0) {
      setQuery(items.find((i) => i.id === selectedIds[0])?.label ?? '');
    }
  };

  const openDropdown = () => {
    setOpen(true);
    if (!multiple) setQuery('');
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const handleTriggerPress = () => {
    if (open) {
      close();
    } else {
      openDropdown();
    }
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (!open) setOpen(true);
    if (!multiple && selectedIds.length > 0) {
      onChangeSelectedIds([]);
    }
  };

  const toggle = (id: string) => {
    if (!multiple) {
      const alreadySelected = selectedIds.includes(id);
      const label = items.find((i) => i.id === id)?.label ?? '';
      onChangeSelectedIds(alreadySelected ? [] : [id]);
      setQuery(alreadySelected ? '' : label);
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (selectedIds.includes(id)) {
      onChangeSelectedIds(selectedIds.filter((s) => s !== id));
    } else {
      onChangeSelectedIds([...selectedIds, id]);
    }
  };

  const removeChip = (id: string) => {
    onChangeSelectedIds(selectedIds.filter((s) => s !== id));
  };

  // In single mode show the selected label when closed
  const inputValue = (!multiple && !open && selectedIds.length > 0)
    ? (items.find((i) => i.id === selectedIds[0])?.label ?? query)
    : query;

  return (
    <View style={styles.wrapper}>
      {/* Full-screen backdrop — closes dropdown on outside tap */}
      {open && (
        <TouchableOpacity
          style={styles.backdrop}
          onPress={close}
          activeOpacity={1}
        />
      )}

      {/* Input row — tapping toggles open/close */}
      <TouchableOpacity
        style={[styles.inputRow, open && styles.inputRowOpen]}
        onPress={handleTriggerPress}
        activeOpacity={1}
      >
        <Ionicons
          name="search-outline"
          size={16}
          color={open ? colors.primary500 : colors.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={inputValue}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={close}
          // don't use onFocus to open — the TouchableOpacity handles it
          editable={open}
        />
        {(query.length > 0 || selectedIds.length > 0) ? (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              onChangeSelectedIds([]);
              setOpen(false);
              inputRef.current?.blur();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : (
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textTertiary}
          />
        )}
      </TouchableOpacity>

      {/* Selected chips — multi only */}
      {multiple && selectedItems.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}
          keyboardShouldPersistTaps="handled"
        >
          {selectedItems.map((item) => (
            <View
              key={item.id}
              style={[
                styles.chip,
                item.color
                  ? { borderColor: item.color, backgroundColor: item.color + '18' }
                  : styles.chipDefault,
              ]}
            >
              {item.color ? (
                <View style={[styles.chipDot, { backgroundColor: item.color }]} />
              ) : null}
              <ThemedText
                type="caption"
                color={item.color ?? colors.primary600}
                numberOfLines={1}
                style={styles.chipLabel}
              >
                {item.label}
              </ThemedText>
              <TouchableOpacity
                onPress={() => removeChip(item.id)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={12} color={item.color ?? colors.primary600} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => onChangeSelectedIds([])}
            style={styles.clearAll}
            activeOpacity={0.7}
          >
            <ThemedText type="caption" color={colors.danger}>Clear</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Inline dropdown */}
      {open && (
        <View style={styles.dropdown}>
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <ThemedText type="caption" color={colors.textTertiary}>No results</ThemedText>
              </View>
            ) : (
              filtered.map((item, index) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <View key={item.id}>
                    <TouchableOpacity
                      style={[styles.row, selected && styles.rowSelected]}
                      onPress={() => toggle(item.id)}
                      activeOpacity={0.65}
                    >
                      {item.color ? (
                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                      ) : null}
                      <ThemedText
                        type="body"
                        color={selected ? (item.color ?? colors.primary500) : colors.textPrimary}
                        style={[styles.rowLabel, selected && styles.rowLabelSelected]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </ThemedText>
                      {multiple ? (
                        <View
                          style={[
                            styles.checkbox,
                            selected && {
                              backgroundColor: item.color ?? colors.primary500,
                              borderColor: item.color ?? colors.primary500,
                            },
                          ]}
                        >
                          {selected && (
                            <Ionicons name="checkmark" size={10} color={colors.textInverse} />
                          )}
                        </View>
                      ) : (
                        selected && (
                          <Ionicons name="checkmark" size={16} color={colors.primary500} />
                        )
                      )}
                    </TouchableOpacity>
                    {index < filtered.length - 1 && <View style={styles.sep} />}
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Done — multi only */}
          {multiple && (
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={close}
              activeOpacity={0.8}
            >
              <ThemedText type="caption" color={colors.primary600}>
                Done{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </ThemedText>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary500} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing[2] },

  // Full-screen transparent overlay — catches outside taps
  backdrop: {
    position: 'absolute',
    top: -2000,
    bottom: -2000,
    left: -2000,
    right: -2000,
    zIndex: 998,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    gap: spacing[2],
    zIndex: 1000,
  },
  inputRowOpen: {
    borderColor: colors.primary300,
    backgroundColor: colors.bgCard,
  },
  searchIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    color: colors.textPrimary,
    paddingVertical: 0,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },

  chipsScroll: { maxHeight: 36 },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingRight: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipDefault: {
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  chipLabel: { flexShrink: 1, maxWidth: 100 },
  clearAll: { paddingHorizontal: spacing[2], paddingVertical: 5 },

  dropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
    zIndex: 999,
    elevation: 8,
    ...shadows.md,
  },

  list: { maxHeight: 200 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[3],
    backgroundColor: colors.bgCard,
  },
  rowSelected: { backgroundColor: colors.primary50 },
  dot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  rowLabel: { flex: 1, fontSize: 14 },
  rowLabelSelected: { fontFamily: 'Montserrat_600SemiBold' },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sep: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing[3],
    opacity: 0.5,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },

  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.primary50,
  },
});
