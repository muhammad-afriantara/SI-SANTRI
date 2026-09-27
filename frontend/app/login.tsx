import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, Role } from "../context/AuthContext";
import { ApiError } from "../utils/api";
import { colors, radii, spacing, typography, touchTargets } from "../utils/theme";
import { PrimaryButton } from "../components/ui";

const ROLE_TABS: { key: Role; label: string }[] = [
  { key: "siswa", label: "Siswa" },
  { key: "guru", label: "Guru Wali" },
  { key: "wali_murid", label: "Wali Murid" },
];

const ROLE_CONFIG: Record<Role, { label: string; placeholder: string; helper?: string }> = {
  siswa: {
    label: "NIPD (Nomor Induk Peserta Didik)",
    placeholder: "Masukkan NIPD (contoh: 8459)",
  },
  guru: {
    label: "Nama Lengkap Guru (format: nama_lengkap)",
    placeholder: "contoh: catur_anjar_anggraini",
    helper: "Bisa mengetik nama lengkap biasa, sistem otomatis memformatnya.",
  },
  wali_murid: {
    label: "Nama Lengkap Siswa (format: nama_lengkap)",
    placeholder: "contoh: afika_putri_rievylia",
    helper: "Ketik nama lengkap anak Anda.",
  },
};

const DEMO_CHIPS: { role: Role; label: string; identifier: string }[] = [
  { role: "siswa", label: "Coba Siswa (NIPD: 8459)", identifier: "8459" },
  { role: "guru", label: "Coba Guru (catur_anjar_anggraini)", identifier: "catur_anjar_anggraini" },
  { role: "wali_murid", label: "Coba Wali Murid (afika_putri_rievylia)", identifier: "afika_putri_rievylia" },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [role, setRole] = useState<Role>("siswa");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const config = ROLE_CONFIG[role];

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setError("");
  };

  const handleQuickFill = (chip: (typeof DEMO_CHIPS)[number]) => {
    setRole(chip.role);
    setIdentifier(chip.identifier);
    setPassword("password123");
    setError("");
  };

  const handleSubmit = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError("Mohon isi identitas dan password terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(role, identifier.trim(), password.trim());
      if (role === "siswa") router.replace("/(student)");
      else if (role === "guru") router.replace("/(teacher)");
      else router.replace("/(parent)");
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Gagal terhubung ke server.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>SS</Text>
          </View>
          <Text style={styles.title} testID="login-app-title">SI SANTRI</Text>
          <Text style={styles.subtitle}>
            Sistem Pengawasan Tingkah Laku Sehari-hari{"\n"}SMP Negeri 2 Panji
          </Text>
        </View>

        <View style={styles.tabRow} testID="login-role-switcher">
          {ROLE_TABS.map((tab) => {
            const active = tab.key === role;
            return (
              <TouchableOpacity
                key={tab.key}
                testID={`login-role-${tab.key}-tab`}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => handleRoleChange(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{config.label}</Text>
          <TextInput
            testID="login-identifier-input"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={config.placeholder}
            placeholderTextColor={colors.onSurfaceTertiary}
            style={styles.input}
            keyboardType={role === "siswa" ? "number-pad" : "default"}
            autoCapitalize="none"
          />
          {config.helper ? <Text style={styles.helper}>{config.helper}</Text> : null}

          <Text style={[styles.label, { marginTop: spacing.base }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              testID="login-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="Masukkan password"
              placeholderTextColor={colors.onSurfaceTertiary}
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              autoCapitalize="none"
            />
            <TouchableOpacity
              testID="login-toggle-password-visibility"
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeText}>{showPassword ? "Sembunyikan" : "Lihat"}</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <Text style={styles.error} testID="login-error-message">
              {error}
            </Text>
          ) : null}

          <PrimaryButton
            title="Masuk"
            onPress={handleSubmit}
            loading={loading}
            testID="login-submit-button"
            style={{ marginTop: spacing.lg }}
          />
        </View>

        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Demo Cepat untuk Pengujian</Text>
          {DEMO_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.role}
              testID={`login-demo-chip-${chip.role}`}
              style={styles.demoChip}
              onPress={() => handleQuickFill(chip)}
              activeOpacity={0.75}
            >
              <Text style={styles.demoChipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  title: {
    ...typography.display,
    color: colors.brand,
  },
  subtitle: {
    ...typography.body,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.button,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    minHeight: touchTargets.minHeight - 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.button - 2,
  },
  tabActive: {
    backgroundColor: colors.brandPrimary,
  },
  tabText: {
    ...typography.caption,
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  form: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  helper: {
    ...typography.caption,
    color: colors.onSurfaceTertiary,
    marginTop: spacing.xs,
  },
  input: {
    minHeight: touchTargets.inputHeight,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.base,
    color: colors.onSurface,
    ...typography.body,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  passwordInput: {
    flex: 1,
    minHeight: touchTargets.inputHeight,
    paddingHorizontal: spacing.base,
    color: colors.onSurface,
    ...typography.body,
  },
  eyeButton: {
    paddingHorizontal: spacing.base,
  },
  eyeText: {
    ...typography.caption,
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },
  demoSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  demoTitle: {
    ...typography.caption,
    color: colors.onSurfaceTertiary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  demoChip: {
    minHeight: touchTargets.chipHeight,
    borderRadius: radii.chip,
    borderWidth: 1.5,
    borderColor: colors.borderBrand,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  demoChipText: {
    ...typography.bodyMedium,
    color: colors.onBrandTertiary,
    fontWeight: "700",
  },
});
