import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { apiRequest, ApiError } from "../utils/api";
import { useToast } from "../components/Toast";
import { colors, radii, spacing, typography } from "../utils/theme";
import { Chip, PrimaryButton } from "../components/ui";

const CLASS_OPTIONS = ["7A", "7B", "7C", "7D", "8A", "8B", "8C", "8D", "8E"];

export default function AddStudentScreen() {
  const insets = useSafeAreaInsets();
  const { token, profile } = useAuth();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [nipd, setNipd] = useState("");
  const [classId, setClassId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !nipd.trim() || !classId) {
      show("Mohon lengkapi nama, NIPD, dan kelas.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("/teacher/students", {
        method: "POST",
        token,
        body: { name: name.trim(), nipd: nipd.trim(), class_id: classId },
      });
      show(`Siswa ${res.name} berhasil ditambahkan!`, "success");
      router.back();
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Gagal menambahkan siswa.";
      show(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl }}>
        <View style={styles.headerRow}>
          <Text style={styles.title} testID="add-student-title">Tambah Siswa Baru</Text>
          <TouchableOpacity testID="add-student-close-button" onPress={() => router.back()}>
            <Text style={styles.closeText}>Tutup</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Akun Siswa (login NIPD) dan akun Wali Murid (login nama siswa) akan otomatis dibuat dengan password default.
        </Text>

        <Text style={styles.label}>Nama Lengkap</Text>
        <TextInput
          testID="add-student-name-input"
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Contoh: Budi Setiawan"
          placeholderTextColor={colors.onSurfaceTertiary}
        />

        <Text style={styles.label}>NIPD</Text>
        <TextInput
          testID="add-student-nipd-input"
          style={styles.input}
          value={nipd}
          onChangeText={setNipd}
          placeholder="Contoh: 9001"
          placeholderTextColor={colors.onSurfaceTertiary}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Pilihan Kelas</Text>
        <View style={styles.chipWrapRow}>
          {CLASS_OPTIONS.map((c) => (
            <Chip key={c} label={c} selected={classId === c} onPress={() => setClassId(c)} testID={`add-student-class-${c}`} />
          ))}
        </View>

        <Text style={styles.label}>Guru Wali</Text>
        <View style={styles.teacherBox}>
          <Text style={styles.teacherText}>{profile?.name}</Text>
        </View>

        <PrimaryButton
          title="Simpan Siswa Baru"
          onPress={handleSubmit}
          loading={submitting}
          testID="add-student-submit-button"
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  title: { ...typography.h1, color: colors.onSurface },
  closeText: { ...typography.bodyMedium, color: colors.error },
  subtitle: { ...typography.caption, color: colors.onSurfaceSecondary, marginBottom: spacing.lg },
  label: { ...typography.bodyMedium, color: colors.onSurface, marginBottom: spacing.xs, marginTop: spacing.base },
  input: {
    minHeight: 50, borderRadius: radii.button, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceElevated, paddingHorizontal: spacing.base, color: colors.onSurface, ...typography.body,
  },
  chipWrapRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  teacherBox: {
    minHeight: 50, borderRadius: radii.button, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.base, justifyContent: "center",
  },
  teacherText: { ...typography.body, color: colors.onSurfaceSecondary },
});
