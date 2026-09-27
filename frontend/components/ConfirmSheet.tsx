import React from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing, typography } from "../utils/theme";
import { PrimaryButton } from "./ui";

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = "Ya, Keluar",
  cancelLabel = "Batal",
  onConfirm,
  onCancel,
  testID,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.base }]} onPress={() => {}}>
          <View testID={testID} style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <PrimaryButton title={confirmLabel} onPress={onConfirm} variant="danger" testID="confirm-sheet-confirm-button" />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton title={cancelLabel} onPress={onCancel} variant="secondary" testID="confirm-sheet-cancel-button" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radii.banner,
    borderTopRightRadius: radii.banner,
    padding: spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
    marginBottom: spacing.base,
  },
  title: {
    ...typography.h2,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    color: colors.onSurfaceSecondary,
    marginBottom: spacing.lg,
  },
});
