import { colors, tabBar } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { QK } from "@/constants/query-keys";
import { getOverdueCount } from "@/api/dues";

export default function TabsLayout() {
  const { data: overdue } = useQuery({
    queryKey: QK.dues.overdueCount,
    queryFn: getOverdueCount,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const overdueTotal = (overdue?.receivables_overdue ?? 0) + (overdue?.payables_overdue ?? 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary500,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: tabBar.height + (Platform.OS === "ios" ? 20 : 0),
          paddingBottom: Platform.OS === "ios" ? 12 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory/index"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color }) => (
            <Ionicons name="cube" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales/index"
        options={{
          title: "Sales",
          tabBarIcon: ({ color }) => (
            <Ionicons name="receipt" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchases/index"
        options={{
          title: "Purchases",
          tabBarIcon: ({ color }) => (
            <Ionicons name="cart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings" size={24} color={color} />
          ),
          tabBarBadge: overdueTotal > 0 ? overdueTotal : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            color: colors.textInverse,
            fontSize: 10,
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
        }}
      />
      {/* Hidden tab entries (still routable, just not in the tab bar) */}
      <Tabs.Screen name="dues/index"    options={{ href: null }} />
      <Tabs.Screen name="reports/index" options={{ href: null }} />
      <Tabs.Screen name="inventory/[id]"      options={{ href: null }} />
      <Tabs.Screen name="settings/categories" options={{ href: null }} />
    </Tabs>
  );
}
