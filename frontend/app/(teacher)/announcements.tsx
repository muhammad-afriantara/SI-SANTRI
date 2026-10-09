import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, radii, spacing, typography, touchTargets } from "../../utils/theme";
import { Card, Badge, PrimaryButton } from "../../components/ui";

export default function TeacherAnnouncements() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"normal" | "penting" | "mendesak">("normal");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await apiRequest("/teacher/announcements", { token });
      setAnnouncements(res || []);
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

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Judul dan isi pengumuman tidak boleh kosong.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/teacher/announcements", {
        method: "POST",
        token,
        body: { title: title.trim(), content: content.trim(), priority },
      });
      setShowModal(false);
      setTitle("");
      setContent("");
      setPriority("normal");
      await loadData();
    } catch (e) {
      alert("Gagal mempublikasikan pengumuman.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/teacher/announcements/${id}`, { method: "DELETE", token });
      await loadData();
    } catch (e) {
      alert("Gagal menghapus pengumuman.");
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
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pengumuman Kelas</Text>
          <Text style={styles.headerSubtitle}>
            Pesan langsung kepada seluruh siswa dan wali murid
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.addBtnText}>+ Buat Baru</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {announcements.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: spacing.xl, marginTop: spacing.md }}>
            <Text style={{ fontSize: 32, marginBottom: spacing.sm }}>📢</Text>
            <Text style={styles.emptyTitle}>Belum Ada Pengumuman</Text>
            <Text style={styles.emptySubtitle}>
              Klik tombol "+ Buat Baru" di atas untuk mengirim pengumuman kepada siswa dan wali murid.
            </Text>
          </Card>
        ) : (
          announcements.map((item) => (
            <Card key={item.id} style={styles.annCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMeta}>
                    Kelas {item.class_id} · {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <Badge
                  label={
                    item.priority === "mendesak"
                      ? "Mendesak"
                      : item.priority === "penting"
                      ? "Penting"
                      : "Informasi"
                  }
                  tone={
                    item.priority === "mendesak"
                      ? "error"
                      : item.priority === "penting"
                      ? "warning"
                      : "info"
                  }
                />
              </View>

              <Text style={styles.cardBody}>{item.content}</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.authorText}>Diposting oleh: {item.author_name}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Modal Buat Pengumuman */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Buat Pengumuman Kelas</Text>
            <Text style={styles.modalSubtitle}>
              Pengumuman akan muncul di beranda siswa dan aplikasi orang tua
            </Text>

            <Text style={styles.inputLabel}>Judul Pengumuman</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Contoh: Pengingat Sholat Dhuha & Pembiasaan Besok"
              placeholderTextColor={colors.onSurfaceTertiary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Tingkat Prioritas</Text>
            <View style={styles.priorityRow}>
              {(["normal", "penting", "mendesak"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChip,
                    priority === p && styles.priorityChipActive,
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      priority === p && styles.priorityChipTextActive,
                    ]}
                  >
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Isi Pesan Pengumuman</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Tuliskan isi pengumuman atau instruksi bimbingan secara lengkap..."
              placeholderTextColor={colors.onSurfaceTertiary}
              multiline
              numberOfLines={4}
              value={content}
              onChangeText={setContent}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnCancel]}
                onPress={() => setShowModal(false)}
                disabled={submitting}
              >
                <Text style={styles.btnCancelText}>Batal</Text>
              </TouchableOpacity>
              <PrimaryButton
                title={submitting ? "Memposting..." : "Publikasikan 📢"}
                onPress={handleCreate}
                loading={submitting}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.onSurface },
  headerSubtitle: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  emptyTitle: { ...typography.h4, color: colors.onSurface },
  emptySubtitle: { ...typography.caption, color: colors.onSurfaceSecondary, textAlign: "center", marginTop: 4 },
  annCard: { marginBottom: spacing.base },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.xs },
  cardTitle: { ...typography.h4, color: colors.onSurface },
  cardMeta: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  cardBody: { ...typography.body, color: colors.onSurface, lineHeight: 20, marginVertical: spacing.xs },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  authorText: { ...typography.caption, color: colors.onSurfaceTertiary },
  deleteText: { ...typography.caption, color: colors.error, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: { width: "100%", maxWidth: 440 },
  modalTitle: { ...typography.h3, color: colors.onSurface },
  modalSubtitle: { ...typography.caption, color: colors.onSurfaceSecondary, marginBottom: spacing.md },
  inputLabel: { ...typography.bodyMedium, color: colors.onSurface, marginBottom: spacing.xs },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    padding: spacing.md,
    fontSize: 14,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  priorityRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  priorityChip: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priorityChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  priorityChipText: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceSecondary },
  priorityChipTextActive: { color: "#FFFFFF" },
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
    marginBottom: spacing.md,
  },
  modalBtnRow: { flexDirection: "row", gap: spacing.sm },
  modalBtn: {
    minHeight: touchTargets.minHeight,
    borderRadius: radii.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  btnCancel: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  btnCancelText: { color: colors.onSurfaceSecondary, fontWeight: "600" },
});
