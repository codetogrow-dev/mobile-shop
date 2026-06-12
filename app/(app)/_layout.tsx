import { useEffect } from "react";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/auth-store";
import { Stack, router } from "expo-router";

export default function AppLayout() {
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/(auth)/login');
    }
  }, [session, isLoading]);

  if (isLoading || !session) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgBase },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-sale" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-purchase" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-product" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="edit-product/[id]"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="sale/[id]" />
      <Stack.Screen name="purchase/[id]" />
      <Stack.Screen name="customer/[id]" />
      <Stack.Screen name="supplier/[id]" />
      <Stack.Screen name="customers/index" />
      <Stack.Screen name="suppliers/index" />
      <Stack.Screen name="add-customer" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-supplier" options={{ presentation: "modal" }} />
      <Stack.Screen name="record-payment" options={{ presentation: "modal" }} />
    </Stack>
  );
}
