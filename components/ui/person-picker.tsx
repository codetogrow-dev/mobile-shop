import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { colors, spacing, radius } from '@/constants/theme';
import { QK } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth-store';

import { listCustomers, createCustomer } from '@/api/customers';
import { listSuppliers, createSupplier } from '@/api/suppliers';
import type { Party } from '@/types/app';

/** Format CNIC as user types: 31021-6739239-1 (5-7-1). */
export function formatCnic(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function isValidCnic(formatted: string): boolean {
  return /^\d{5}-\d{7}-\d$/.test(formatted);
}

type Kind = 'customer' | 'supplier';

interface Props {
  kind: Kind;
  value: string | null;
  onChange: (id: string | null, party: Party | null) => void;
  label?: string;
  error?: string;
  required?: boolean;
}

export function PersonPicker({ kind, value, onChange, label, error, required }: Props) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const tenantId =
    ((user as any)?.user_metadata?.tenant_id as string | undefined) ?? user?.id ?? '';

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCnic, setNewCnic] = useState('');
  const [createErr, setCreateErr] = useState<string | null>(null);

  const listKey  = kind === 'customer' ? QK.customers.list() : QK.suppliers.list();
  const listFn   = kind === 'customer' ? listCustomers       : listSuppliers;
  const createFn = kind === 'customer' ? createCustomer      : createSupplier;
  const allKey   = kind === 'customer' ? QK.customers.all    : QK.suppliers.all;

  const { data: parties } = useQuery({ queryKey: listKey, queryFn: () => listFn() });

  const create = useMutation({
    mutationFn: () =>
      createFn({ name: newName, phone: newPhone, cnic: newCnic, tenant_id: tenantId }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: allKey });
      onChange(p.id, p);
      setAdding(false);
      setNewName('');
      setNewPhone('');
      setNewCnic('');
      setCreateErr(null);
    },
    onError: (e: any) => setCreateErr(e?.message ?? 'Failed to create'),
  });

  const items = (parties ?? []).map((p) => ({ id: p.id, label: p.name }));
  const selectedIds = value ? [value] : [];

  const noun = kind === 'customer' ? 'customer' : 'supplier';

  return (
    <View style={styles.wrapper}>
      {label && (
        <ThemedText type="caption" color={colors.textSecondary} style={styles.label}>
          {label}{required ? ' *' : ''}
        </ThemedText>
      )}

      <Combobox
        items={items}
        selectedIds={selectedIds}
        onChangeSelectedIds={(ids) => {
          const id = ids[0] ?? null;
          const p  = id ? (parties ?? []).find((x) => x.id === id) ?? null : null;
          onChange(id, p);
        }}
        placeholder={`Search ${noun}…`}
        multiple={false}
        noBackdrop
      />

      {!adding && (
        <TouchableOpacity onPress={() => setAdding(true)} style={styles.addRow} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={16} color={colors.primary500} />
          <ThemedText type="caption" color={colors.primary600}>
            Add a new {noun}
          </ThemedText>
        </TouchableOpacity>
      )}

      {adding && (
        <View style={styles.addCard}>
          <Input
            label={`New ${noun} name`}
            placeholder={`${noun[0].toUpperCase() + noun.slice(1)} name`}
            value={newName}
            onChangeText={setNewName}
          />
          <Input
            label="Phone (optional)"
            placeholder="03xx xxx xxxx"
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
          />
          <Input
            label="CNIC (optional)"
            placeholder="31021-6739239-1"
            value={newCnic}
            onChangeText={(t) => setNewCnic(formatCnic(t))}
            keyboardType="number-pad"
            maxLength={15}
          />
          {createErr && (
            <ThemedText type="caption" color={colors.danger}>{createErr}</ThemedText>
          )}
          <View style={styles.addActions}>
            <TouchableOpacity
              onPress={() => { setAdding(false); setCreateErr(null); }}
              style={[styles.actionBtn, styles.cancelBtn]}
              activeOpacity={0.7}
            >
              <ThemedText type="caption" color={colors.textSecondary}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (newName.trim().length === 0) { setCreateErr('Name is required'); return; }
                if (newCnic.length > 0 && !isValidCnic(newCnic)) {
                  setCreateErr('CNIC must be 13 digits (XXXXX-XXXXXXX-X)');
                  return;
                }
                create.mutate();
              }}
              style={[styles.actionBtn, styles.saveBtn]}
              disabled={create.isPending}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={14} color={colors.textInverse} />
              <ThemedText type="caption" color={colors.textInverse}>
                {create.isPending ? 'Saving…' : 'Save & select'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && (
        <ThemedText type="caption" color={colors.danger} style={{ marginTop: spacing[1] }}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing[2] },
  label: { marginBottom: spacing[1], fontWeight: '600' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
  },
  addCard: {
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
  },
  cancelBtn: { backgroundColor: colors.bgElevated },
  saveBtn:   { backgroundColor: colors.primary500 },
});
