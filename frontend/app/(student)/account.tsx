import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { colors, spacing, typography } from "../../utils/theme";
import { Card, PrimaryButton } from "../../components/ui";

export default function StudentAccount() {
  const insets = useSafeAreaInsets();
  const { profile, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title} testID="student-account-title">Akun Saya</Text>
      <Card style={styles.card}>
        <Text style={styles.name} testID="student-account-name">{profile?.name}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>NIPD</Text>
          <Text style={styles.value}>{profile?.nipd}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Kelas</Text>
          <Text style={styles.value}>{profile?.class_id}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Guru Wali</Text>
          <Text style={styles.value}>{profile?.teacher_name}</Text>
        </View>
      </Card>
      <PrimaryButton title="Keluar" onPress={handleLogout} variant="danger" testID="student-logout-button" style={{ marginTop: spacing.lg }} />
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
