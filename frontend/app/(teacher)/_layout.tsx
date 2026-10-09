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

export default function TeacherTabsLayout() {
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
          title: "Siswa",
          tabBarTestID: "teacher-tab-dashboard",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon symbol="👥" focused={focused} />,
        } as any}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "Analisis",
          tabBarTestID: "teacher-tab-analysis",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon symbol="📊" focused={focused} />,
        } as any}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: "Pengumuman",
          tabBarTestID: "teacher-tab-announcements",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon symbol="📢" focused={focused} />,
        } as any}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Akun",
          tabBarTestID: "teacher-tab-account",
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon symbol="👤" focused={focused} />,
        } as any}
      />
    </Tabs>
  );
}
