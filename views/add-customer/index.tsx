import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCnic } from '@/components/ui/person-picker';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { customerSchema, type CustomerFormValues } from '@/types/app';
import { createCustomer } from '@/api/customers';
import { QK } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth-store';

export default function AddCustomerView() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const tenantId =
    ((user as any)?.user_metadata?.tenant_id as string | undefined) ?? user?.id ?? '';

  const { control, handleSubmit, formState: { errors } } =
    useForm<CustomerFormValues>({
      resolver: zodResolver(customerSchema) as any,
      defaultValues: { name: '', phone: '', cnic: '', address: '', notes: '' } as any,
    });

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) => createCustomer({ ...values, tenant_id: tenantId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.customers.all });
      router.back();
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText type="h3">Add Customer</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {mutation.error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <ThemedText type="caption" color={colors.danger}>
                {(mutation.error as any)?.message ?? 'Failed to create customer'}
              </ThemedText>
            </View>
          )}

          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>Customer details</ThemedText>

            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  label="Name *"
                  placeholder="Customer name"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Input
                  label="Phone (optional)"
                  placeholder="03xx xxx xxxx"
                  keyboardType="phone-pad"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  error={errors.phone?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="cnic"
              render={({ field }) => (
                <Input
                  label="CNIC (optional)"
                  placeholder="31021-6739239-1"
                  keyboardType="number-pad"
                  maxLength={15}
                  value={field.value ?? ''}
                  onChangeText={(t) => field.onChange(formatCnic(t))}
                  error={errors.cnic?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <Input
                  label="Address (optional)"
                  placeholder="House / Street / Area"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  multiline
                  numberOfLines={2}
                />
              )}
            />

            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <Input
                  label="Notes (optional)"
                  placeholder="Anything worth remembering"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  multiline
                  numberOfLines={2}
                />
              )}
            />
          </Card>

          <Button
            label="Save Customer"
            onPress={handleSubmit((v) => mutation.mutate(v))}
            loading={mutation.isPending}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 18, backgroundColor: colors.bgElevated,
  },
  content: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  sectionTitle: { marginBottom: spacing[3] },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.danger,
  },
});
