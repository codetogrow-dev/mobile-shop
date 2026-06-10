import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/auth-store";
import { Stack } from "expo-router";

export default function AppLayout() {
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);

  // AUTH GUARD COMMENTED OUT FOR DEVELOPMENT
  // useEffect(() => {
  //   if (!isLoading && !session) {
  //     router.replace('/(auth)/login');
  //   }
  // }, [session, isLoading]);

  // if (isLoading || !session) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgBase },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="purchases/index" />
      <Stack.Screen name="add-sale" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-purchase" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-product" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="edit-product/[id]"
        options={{ presentation: "modal" }}
      />
    </Stack>
  );
}
