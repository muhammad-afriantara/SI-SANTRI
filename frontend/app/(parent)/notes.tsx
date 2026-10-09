import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, radii, spacing, typography } from "../../utils/theme";
import { Card, PrimaryButton } from "../../components/ui";

export default function ParentNotes() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await apiRequest("/parent/notes", { token });
      setNotes(res || []);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSend = async () => {
    if (!messageText.trim()) {
      alert("Silakan ketik pesan motivasi terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("/parent/notes", {
        method: "POST",
        token,
        body: { message: messageText.trim() },
      });
      setMessageText("");
      setToast("Pesan motivasi berhasil dikirim ke anak!");
      setTimeout(() => setToast(null), 3000);
      await loadData();
    } catch (e) {
      alert("Gagal mengirim pesan motivasi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Catatan & Motivasi Anak</Text>
        <Text style={styles.subtitle}>
          Kirimkan doa, nasihat, dan apresiasi hangat agar ananda semakin bersemangat
        </Text>

        {toast && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>❤️ {toast}</Text>
          </View>
        )}

        {/* Input Card */}
        <Card style={styles.inputCard}>
          <Text style={styles.inputTitle}>Tulis Pesan Hari Ini</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Contoh: Semangat belajarnya hari ini ananda sayang! Ibu & Ayah selalu mendoakan yang terbaik untukmu..."
            placeholderTextColor={colors.onSurfaceTertiary}
            multiline
            numberOfLines={4}
            value={messageText}
            onChangeText={setMessageText}
          />
          <PrimaryButton
            title={submitting ? "Mengirim..." : "Kirim Pesan Motivasi ❤️"}
            onPress={handleSend}
            loading={submitting}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        {/* List Riwayat Pesan */}
        <Text style={styles.historyTitle}>Riwayat Pesan Terkirim ({notes.length})</Text>

        {notes.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: spacing.xl, marginTop: spacing.sm }}>
            <Text style={{ fontSize: 32, marginBottom: spacing.sm }}>💌</Text>
            <Text style={styles.emptyTitle}>Belum Ada Pesan</Text>
            <Text style={styles.emptySubtitle}>
              Pesan motivasi yang Anda kirimkan akan tampil di beranda aplikasi anak Anda.
            </Text>
          </Card>
        ) : (
          notes.map((n) => (
            <Card key={n.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteSender}>
                  {n.parent_name && !n.parent_name.startsWith("Wali dari") ? n.parent_name : "Orang Tua"}
                </Text>
                <Text style={styles.noteDate}>
                  {new Date(n.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <Text style={styles.noteText}>"{n.message}"</Text>
              <View style={styles.deliveredRow}>
                <Text style={styles.deliveredText}>✓ Ditampilkan di beranda anak</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  title: { ...typography.h2, color: colors.brand, marginBottom: 4 },
  subtitle: { ...typography.caption, color: colors.onSurfaceSecondary, marginBottom: spacing.md },
  toast: {
    backgroundColor: "#FCE7F3",
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#F472B6",
  },
  toastText: { ...typography.bodyMedium, color: "#9D174D" },
  inputCard: { marginBottom: spacing.lg },
  inputTitle: { ...typography.h4, color: colors.onSurface, marginBottom: spacing.sm },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    padding: spacing.md,
    fontSize: 14,
    color: colors.onSurface,
    textAlignVertical: "top",
    minHeight: 100,
  },
  historyTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h4, color: colors.onSurface },
  emptySubtitle: { ...typography.caption, color: colors.onSurfaceSecondary, textAlign: "center", marginTop: 4 },
  noteCard: { marginBottom: spacing.base },
  noteHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs },
  noteSender: { ...typography.caption, color: colors.brandPrimary, fontWeight: "700" },
  noteDate: { ...typography.caption, color: colors.onSurfaceTertiary },
  noteText: { ...typography.body, color: colors.onSurface, fontStyle: "italic", lineHeight: 20 },
  deliveredRow: { marginTop: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  deliveredText: { ...typography.caption, color: colors.brandPrimary, fontWeight: "600" },
});
