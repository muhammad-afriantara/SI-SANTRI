import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, touchTargets } from "../../utils/theme";

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, color: focused ? colors.brandPrimary : colors.onSurfaceTertiary }}>
      {symbol}
    </Text>
  );
}

export default function StudentTabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.onSurfaceTertiary,
        tabBarStyle: {
          height: touchTargets.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarTestID: "student-tab-home",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon symbol="🏠" focused={focused} />,
        } as any}
      />
      <Tabs.Screen
        name="form"
        options={{
          title: "Jurnal",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon symbol="📝" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Perkembangan",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon symbol="📈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="apresiasi"
        options={{
          title: "Apresiasi",
          tabBarTestID: "student-tab-apresiasi",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon symbol="🏅" focused={focused} />,
        } as any}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Akun",
          tabBarTestID: "student-tab-profile",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon symbol="👤" focused={focused} />,
        } as any}
      />
    </Tabs>
  );
}
