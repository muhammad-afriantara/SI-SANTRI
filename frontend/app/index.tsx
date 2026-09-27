import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { colors } from "../utils/theme";

export default function Index() {
  const { loading, token, role } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!token || !role) {
      router.replace("/login");
      return;
    }
    if (role === "siswa") router.replace("/(student)");
    else if (role === "guru") router.replace("/(teacher)");
    else if (role === "wali_murid") router.replace("/(parent)");
  }, [loading, token, role]);

  return (
    <View style={styles.container} testID="splash-loading-screen">
      <ActivityIndicator size="large" color={colors.brandPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
