import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { colors, spacing, typography } from "../../utils/theme";
import { Card, PrimaryButton } from "../../components/ui";

export default function TeacherAccount() {
  const insets = useSafeAreaInsets();
  const { profile, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title} testID="teacher-account-title">Akun Saya</Text>
      <Card style={styles.card}>
        <Text style={styles.name} testID="teacher-account-name">{profile?.name}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{profile?.username}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Siswa Binaan</Text>
          <Text style={styles.value}>{profile?.total_students}</Text>
        </View>
      </Card>
      <PrimaryButton title="Keluar" onPress={handleLogout} variant="danger" testID="teacher-logout-button" style={{ marginTop: spacing.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.lg },
  title: { ...typography.h1, color: colors.onSurface, marginBottom: spacing.lg },
  card: { gap: spacing.sm },
  name: { ...typography.h2, color: colors.brand, marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  label: { ...typography.body, color: colors.onSurfaceTertiary },
  value: { ...typography.bodyMedium, color: colors.onSurface },
});
