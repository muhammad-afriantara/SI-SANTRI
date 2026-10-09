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
  Image,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, radii, spacing, typography, touchTargets } from "../../utils/theme";
import { Card, Badge, PrimaryButton } from "../../components/ui";
import { akhlakLabel } from "../../constants/formOptions";

export default function ParentConfirmations() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [modalAction, setModalAction] = useState<"confirm" | "reject">("confirm");
  const [parentNote, setParentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await apiRequest("/parent/confirmations", { token });
      setItems(res || []);
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

  const openActionModal = (report: any, action: "confirm" | "reject") => {
    setSelectedReport(report);
    setModalAction(action);
    setParentNote(report?.parent_confirmation?.parent_note || "");
  };

  const handleSaveConfirmation = async () => {
    if (!selectedReport) return;
    setSubmitting(true);
    try {
      await apiRequest(`/parent/reports/${selectedReport.activity_date}/confirm`, {
        method: "POST",
        token,
        body: {
          status: modalAction === "confirm" ? "confirmed" : "rejected",
          note: parentNote.trim() || undefined,
        },
      });
      setMessage("Status konfirmasi berhasil disimpan!");
      setTimeout(() => setMessage(null), 3000);
      setSelectedReport(null);
      await loadData();
    } catch (e) {
      alert("Gagal menyimpan konfirmasi.");
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

  const pendingCount = items.filter(
    (i) => (i.parent_confirmation?.status || "pending") === "pending" && i.akhlak_items?.length > 0
  ).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Konfirmasi Kegiatan Anak</Text>
        <Text style={styles.subtitle}>
          Verifikasi kebiasaan baik dan bakti ananda di rumah (indikator Akhlak)
        </Text>

        {message && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>✓ {message}</Text>
          </View>
        )}

        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiNum}>{pendingCount}</Text>
            <Text style={styles.kpiLabel}>Perlu Konfirmasi</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiNum}>{items.length - pendingCount}</Text>
            <Text style={styles.kpiLabel}>Telah Diverifikasi</Text>
          </Card>
        </View>

        {items.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: spacing.xl, marginTop: spacing.md }}>
            <Text style={{ fontSize: 32, marginBottom: spacing.sm }}>📋</Text>
            <Text style={styles.emptyTitle}>Belum Ada Laporan</Text>
            <Text style={styles.emptySubtitle}>
              Laporan harian ananda akan muncul di sini saat telah diisi.
            </Text>
          </Card>
        ) : (
          items.map((item) => {
            const conf = item.parent_confirmation || {};
            const isConfirmed = conf.status === "confirmed";
            const isRejected = conf.status === "rejected";
            const isPending = !isConfirmed && !isRejected;

            return (
              <Card key={item.activity_date} style={styles.reportCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardDate}>{item.activity_date}</Text>
                    {item.scores && (
                      <Text style={styles.cardScore}>
                        ⭐ Skor: {item.scores.total} Poin (Akhlak: {item.scores.akhlak} Poin)
                      </Text>
                    )}
                  </View>
                  <Badge
                    label={
                      isConfirmed
                        ? "Telah Sesuai"
                        : isRejected
                        ? "Perlu Perbaikan"
                        : "Menunggu"
                    }
                    tone={isConfirmed ? "success" : isRejected ? "error" : "warning"}
                  />
                </View>

                {/* Indikator Akhlak */}
                <View style={styles.akhlakSection}>
                  <Text style={styles.sectionHeader}>Kegiatan Rumah yang Dilakukan Anak:</Text>
                  {item.akhlak_items && item.akhlak_items.length > 0 ? (
                    item.akhlak_items.map((key: string) => (
                      <View key={key} style={styles.akhlakRow}>
                        <Text style={styles.checkIcon}>✓</Text>
                        <Text style={styles.akhlakText}>{akhlakLabel(key)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noAkhlakText}>Tidak ada kegiatan rumah yang dicentang.</Text>
                  )}
                </View>

                {/* Foto Bukti jika ada */}
                {item.proofs && item.proofs.length > 0 && (
                  <View style={styles.proofsSection}>
                    <Text style={styles.sectionHeader}>Foto Bukti Kegiatan:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {item.proofs.map((p: any, idx: number) => (
                        <View key={p.id || idx} style={styles.photoContainer}>
                          <Image source={{ uri: p.url }} style={styles.photoThumb} />
                          {p.caption ? <Text style={styles.photoCaption}>{p.caption}</Text> : null}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Catatan Ananda jika ada */}
                {item.notes ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteBoxLabel}>Catatan Anak:</Text>
                    <Text style={styles.noteBoxText}>"{item.notes}"</Text>
                  </View>
                ) : null}

                {/* Catatan Orang Tua jika sudah ada */}
                {conf.parent_note ? (
                  <View style={styles.parentNoteBox}>
                    <Text style={styles.parentNoteLabel}>Catatan Anda:</Text>
                    <Text style={styles.parentNoteText}>"{conf.parent_note}"</Text>
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  {isPending ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.btnConfirm]}
                        onPress={() => openActionModal(item, "confirm")}
                      >
                        <Text style={styles.btnConfirmText}>✓ Sesuai</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.btnNote]}
                        onPress={() => openActionModal(item, "reject")}
                      >
                        <Text style={styles.btnNoteText}>💬 Beri Catatan</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnEdit]}
                      onPress={() => openActionModal(item, isConfirmed ? "confirm" : "reject")}
                    >
                      <Text style={styles.btnEditText}>✏️ Ubah Konfirmasi / Catatan</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={!!selectedReport} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {modalAction === "confirm" ? "Konfirmasi Sesuai" : "Beri Catatan / Koreksi"}
            </Text>
            <Text style={styles.modalDate}>Tanggal: {selectedReport?.activity_date}</Text>

            <Text style={styles.inputLabel}>
              {modalAction === "confirm"
                ? "Pesan Apresiasi untuk Anak (Opsional):"
                : "Tuliskan catatan perbaikan untuk anak:"}
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder={
                modalAction === "confirm"
                  ? "Contoh: Alhamdulillah rajin sekali hari ini, pertahankan ya nak..."
                  : "Contoh: Kamar belum rapi tadi pagi, besok tolong dirapikan ya..."
              }
              placeholderTextColor={colors.onSurfaceTertiary}
              multiline
              numberOfLines={4}
              value={parentNote}
              onChangeText={setParentNote}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnCancel]}
                onPress={() => setSelectedReport(null)}
                disabled={submitting}
              >
                <Text style={styles.btnCancelText}>Batal</Text>
              </TouchableOpacity>
              <PrimaryButton
                title={submitting ? "Menyimpan..." : "Simpan Status"}
                onPress={handleSaveConfirmation}
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
  title: { ...typography.h2, color: colors.brand, marginBottom: 4 },
  subtitle: { ...typography.caption, color: colors.onSurfaceSecondary, marginBottom: spacing.md },
  toast: {
    backgroundColor: "#DCFCE7",
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  toastText: { ...typography.bodyMedium, color: "#166534" },
  kpiRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  kpiCard: { flex: 1, alignItems: "center", paddingVertical: spacing.md },
  kpiNum: { ...typography.h1, color: colors.brandPrimary },
  kpiLabel: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  emptyTitle: { ...typography.h4, color: colors.onSurface },
  emptySubtitle: { ...typography.caption, color: colors.onSurfaceSecondary, textAlign: "center", marginTop: 4 },
  reportCard: { marginBottom: spacing.base },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
  cardDate: { ...typography.h4, color: colors.onSurface },
  cardScore: { ...typography.caption, color: colors.brandPrimary, marginTop: 2, fontWeight: "600" },
  akhlakSection: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginVertical: spacing.xs,
  },
  sectionHeader: { ...typography.caption, color: colors.onSurfaceSecondary, fontWeight: "700", marginBottom: 4 },
  akhlakRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  checkIcon: { color: colors.brandPrimary, fontWeight: "bold", fontSize: 13 },
  akhlakText: { ...typography.body, color: colors.onSurface, flex: 1 },
  noAkhlakText: { ...typography.caption, color: colors.onSurfaceTertiary, fontStyle: "italic" },
  proofsSection: { marginTop: spacing.sm },
  photoContainer: { marginRight: spacing.sm, alignItems: "center" },
  photoThumb: { width: 80, height: 80, borderRadius: radii.sm, backgroundColor: colors.border },
  photoCaption: { ...typography.caption, color: colors.onSurfaceSecondary, maxWidth: 80, textAlign: "center", marginTop: 2 },
  noteBox: {
    backgroundColor: "#F1F5F9",
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.xs,
  },
  noteBoxLabel: { ...typography.caption, color: colors.onSurfaceSecondary, fontWeight: "600" },
  noteBoxText: { ...typography.body, color: colors.onSurface, fontStyle: "italic", marginTop: 2 },
  parentNoteBox: {
    backgroundColor: "#EFF6FF",
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  parentNoteLabel: { ...typography.caption, color: colors.info, fontWeight: "700" },
  parentNoteText: { ...typography.body, color: colors.onSurface, marginTop: 2 },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flex: 1,
    minHeight: touchTargets.minHeight,
    borderRadius: radii.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  btnConfirm: { backgroundColor: colors.brandPrimary },
  btnConfirmText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  btnNote: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.brandPrimary },
  btnNoteText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 14 },
  btnEdit: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnEditText: { color: colors.onSurfaceSecondary, fontWeight: "600", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: { width: "100%", maxWidth: 420 },
  modalTitle: { ...typography.h3, color: colors.onSurface },
  modalDate: { ...typography.caption, color: colors.brandPrimary, marginBottom: spacing.md, fontWeight: "600" },
  inputLabel: { ...typography.bodyMedium, color: colors.onSurface, marginBottom: spacing.xs },
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
