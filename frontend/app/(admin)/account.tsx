import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { colors, spacing, typography } from "../../utils/theme";
import { Card, PrimaryButton } from "../../components/ui";
import { ChangePasswordModal } from "../../components/ChangePasswordModal";

export default function AdminAccount() {
  const insets = useSafeAreaInsets();
  const { profile, logout } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title} testID="admin-account-title">Akun Administrator</Text>
      <Card style={styles.card}>
        <Text style={styles.name} testID="admin-account-name">{profile?.name || "Admin Sekolah"}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{profile?.username || "admin"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Hak Akses</Text>
          <Text style={styles.value}>Administrator Penuh</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Institusi</Text>
          <Text style={styles.value}>SMP Negeri 2 Panji</Text>
        </View>
      </Card>

      <PrimaryButton
        title="🔑 Ubah Password Admin"
        onPress={() => setModalVisible(true)}
        variant="secondary"
        testID="admin-change-password-button"
        style={{ marginTop: spacing.lg }}
      />

      <PrimaryButton
        title="Keluar"
        onPress={handleLogout}
        variant="danger"
        testID="admin-logout-button"
        style={{ marginTop: spacing.md }}
      />

      <ChangePasswordModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Ubah Password Admin"
      />
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
