import { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform,
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
import { signUpSchema, type SignUpFormValues } from '@/types/app';
import { signUp } from '@/api/auth';
import { useAuthStore } from '@/store/auth-store';

export default function SignUpView() {
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '' },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setError('');
    try {
      const data = await signUp(values.email, values.password, values.full_name);
      if (data.session) {
        setSession(data.session);
        router.replace('/(app)/(tabs)/dashboard');
      } else {
        // Email confirmation required
        setSuccess(true);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Sign up failed. Please try again.');
    }
  };

  if (success) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <View style={styles.successBox}>
          <View style={styles.successIcon}>
            <Ionicons name="mail-open-outline" size={40} color={colors.success} />
          </View>
          <ThemedText type="h3" style={{ textAlign: 'center' }}>Check your email</ThemedText>
          <ThemedText type="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            We sent a confirmation link to your email. Click it to activate your account.
          </ThemedText>
          <Button
            label="Back to Sign In"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
            variant="secondary"
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            Create your account
          </ThemedText>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <ThemedText type="h3" style={styles.cardTitle}>Sign Up</ThemedText>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <ThemedText type="caption" color={colors.danger} style={{ flex: 1 }}>{error}</ThemedText>
            </View>
          ) : null}

          <Controller
            control={control}
            name="full_name"
            render={({ field }) => (
              <Input
                label="Full Name"
                placeholder="e.g. Ahmed Khan"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.full_name?.message}
                leftIcon={<Ionicons name="person-outline" size={18} color={colors.textTertiary} />}
              />
            )}
          />

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
                placeholder="Min. 6 characters"
                secureTextEntry={!showPassword}
                value={field.value}
                onChangeText={field.onChange}
                error={errors.password?.message}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />}
                rightIcon={<Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />}
                onRightIconPress={() => setShowPassword((p) => !p)}
              />
            )}
          />

          <Controller
            control={control}
            name="confirm_password"
            render={({ field }) => (
              <Input
                label="Confirm Password"
                placeholder="Re-enter password"
                secureTextEntry={!showConfirm}
                value={field.value}
                onChangeText={field.onChange}
                error={errors.confirm_password?.message}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />}
                rightIcon={<Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />}
                onRightIconPress={() => setShowConfirm((p) => !p)}
              />
            )}
          />

          <Button
            label="Create Account"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            fullWidth
            size="lg"
            style={styles.submitBtn}
          />

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.7}
          >
            <ThemedText type="caption" color={colors.textSecondary}>
              Already have an account?{' '}
            </ThemedText>
            <ThemedText type="caption" color={colors.primary500} style={{ fontWeight: '600' }}>
              Sign In
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
  center: { justifyContent: 'center', alignItems: 'center' },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    justifyContent: 'center',
    gap: spacing[6],
  },
  header: { alignItems: 'center', gap: spacing[3] },
  logoBox: {
    width: 72, height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary50,
    borderWidth: 2, borderColor: colors.primary200,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.md,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing[6],
    gap: spacing[4],
    borderWidth: 1, borderColor: colors.border,
    ...shadows.lg,
  },
  cardTitle: { marginBottom: spacing[1] },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.dangerBg, borderRadius: radius.md,
    padding: spacing[3], borderWidth: 1, borderColor: colors.danger,
  },
  submitBtn: { marginTop: spacing[2] },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footer: { textAlign: 'center' },
  successBox: {
    margin: spacing[5],
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing[6],
    gap: spacing[4],
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
    ...shadows.lg,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.successBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing[2],
  },
});
