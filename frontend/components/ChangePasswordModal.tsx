import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Modal } from "react-native";
import { useAuth } from "../context/AuthContext";
import { apiRequest, ApiError } from "../utils/api";
import { useToast } from "./Toast";
import { colors, radii, spacing, typography } from "../utils/theme";
import { PrimaryButton } from "./ui";

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
}

export function ChangePasswordModal({
  visible,
  onClose,
  title = "Ubah Password",
}: ChangePasswordModalProps) {
  const { token, role } = useAuth();
  const { show } = useToast();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const minLength = role === "admin" ? 8 : 6;

  const handleClose = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!oldPassword.trim()) {
      show("Mohon masukkan password saat ini.", "error");
      return;
    }
    if (!newPassword.trim()) {
      show("Mohon masukkan password baru.", "error");
      return;
    }
    if (newPassword.length < minLength) {
      show(`Password baru minimal ${minLength} karakter.`, "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      show("Konfirmasi password baru tidak cocok.", "error");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        token,
        body: { old_password: oldPassword, new_password: newPassword },
      });
      show("Password berhasil diperbarui!", "success");
      handleClose();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : (e.message || "Gagal mengubah password.");
      show(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.modalTitle}>{title}</Text>

          <Text style={styles.inputLabel}>Password Lama</Text>
          <TextInput
            style={styles.input}
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="Masukkan password saat ini"
            placeholderTextColor={colors.onSurfaceTertiary}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Password Baru</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={`Minimal ${minLength} karakter`}
            placeholderTextColor={colors.onSurfaceTertiary}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Ulangi Password Baru</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Ketik ulang password baru"
            placeholderTextColor={colors.onSurfaceTertiary}
            secureTextEntry
            autoCapitalize="none"
          />

          <View style={styles.btnRow}>
            <PrimaryButton
              title="Batal"
              variant="secondary"
              onPress={handleClose}
              style={{ flex: 1, marginRight: spacing.sm }}
            />
            <PrimaryButton
              title="Simpan"
              onPress={handleSubmit}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.onSurface,
    marginBottom: spacing.base,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontWeight: "600",
  },
  input: {
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.onSurface,
  },
  btnRow: {
    flexDirection: "row",
    marginTop: spacing.xl,
  },
});
