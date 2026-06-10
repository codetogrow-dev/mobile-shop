import { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { loginSchema, type LoginFormValues } from '@/types/app';
import { signIn } from '@/api/auth';
import { useAuthStore } from '@/store/auth-store';

export default function LoginView() {
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError('');
    try {
      const data = await signIn(values.email, values.password);
      setSession(data.session);
      router.replace('/(app)/(tabs)/dashboard');
    } catch (e: any) {
      setError(e?.message ?? 'Login failed. Check your credentials.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="storefront" size={36} color={colors.primary500} />
          </View>
          <ThemedText type="h1" style={styles.title}>MobileShop</ThemedText>
          <ThemedText type="body" color={colors.textSecondary} style={styles.subtitle}>
            Inventory & Sales Management
          </ThemedText>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <ThemedText type="h3" style={styles.cardTitle}>Sign In</ThemedText>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <ThemedText type="caption" color={colors.danger} style={{ flex: 1 }}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={field.value}
                onChangeText={field.onChange}
                error={errors.email?.message}
                leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textTertiary} />}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                value={field.value}
                onChangeText={field.onChange}
                error={errors.password?.message}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />}
                rightIcon={
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textTertiary}
                  />
                }
                onRightIconPress={() => setShowPassword((p) => !p)}
              />
            )}
          />

          <Button
            label={isSubmitting ? '' : 'Sign In'}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            fullWidth
            size="lg"
            style={styles.signInBtn}
          />

          <TouchableOpacity
            style={styles.signUpLink}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.7}
          >
            <ThemedText type="caption" color={colors.textSecondary}>
              Don't have an account?{' '}
            </ThemedText>
            <ThemedText type="caption" color={colors.primary500} style={{ fontWeight: '600' }}>
              Sign Up
            </ThemedText>
          </TouchableOpacity>

          {/* DEV ONLY */}
          <TouchableOpacity
            style={styles.devBtn}
            onPress={() => router.replace('/(app)/(tabs)/dashboard')}
            activeOpacity={0.7}
          >
            <ThemedText type="caption" color={colors.textTertiary}>
              [DEV] Skip login → Dashboard
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText type="caption" color={colors.textTertiary} style={styles.footer}>
          Mobile Shop Manager v1.0
        </ThemedText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    justifyContent: 'center',
    gap: spacing[6],
  },
  header: { alignItems: 'center', gap: spacing[3] },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary50,
    borderWidth: 2,
    borderColor: colors.primary200,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing[6],
    gap: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  cardTitle: { marginBottom: spacing[1] },
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
  signInBtn: { marginTop: spacing[2] },
  signUpLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  devBtn: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing[1],
  },
  footer: { textAlign: 'center' },
});