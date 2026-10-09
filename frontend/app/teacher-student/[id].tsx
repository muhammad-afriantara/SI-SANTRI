import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, radii, spacing, typography, touchTargets } from "../../utils/theme";
import { Card, Badge, ProgressBar, PrimaryButton } from "../../components/ui";
import { PRAYER_TIMES, prayerLabel, sleepLabel, wakeLabel, akhlakLabel } from "../../constants/formOptions";

const MENTORING_CATEGORIES = [
  { key: "umum", label: "Umum" },
  { key: "akademik", label: "Akademik" },
  { key: "akhlak", label: "Akhlak" },
  { key: "ibadah", label: "Ibadah" },
  { key: "kedisiplinan", label: "Kedisiplinan" },
  { key: "sosial", label: "Sosial" },
];

export default function TeacherStudentDetail() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [mentoringNotes, setMentoringNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mentoring modal
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState("umum");
  const [noteText, setNoteText] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [studentData, notes] = await Promise.all([
        apiRequest(`/teacher/students/${id}`, { token }),
        apiRequest(`/teacher/students/${id}/mentoring-notes`, { token }),
      ]);
      setData(studentData);
      setMentoringNotes(notes || []);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddMentoringNote = async () => {
    if (!noteText.trim()) {
      alert("Catatan bimbingan tidak boleh kosong.");
      return;
    }

    setSubmittingNote(true);
    try {
      await apiRequest(`/teacher/students/${id}/mentoring-notes`, {
        method: "POST",
        token,
        body: {
          category,
          note: noteText.trim(),
          follow_up_action: followUp.trim() || undefined,
        },
      });
      setShowModal(false);
      setNoteText("");
      setFollowUp("");
      setCategory("umum");
      await loadData();
    } catch (e) {
      alert("Gagal menyimpan catatan bimbingan.");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteMentoringNote = async (noteId: string) => {
    try {
      await apiRequest(`/teacher/mentoring-notes/${noteId}`, { method: "DELETE", token });
      await loadData();
    } catch (e) {
      alert("Gagal menghapus catatan bimbingan.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]} testID="teacher-student-detail-loading">
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  const report = data?.report;
  const scores = report?.scores;
  const conf = report?.parent_confirmation || {};

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.xxxl,
        }}
      >
        <TouchableOpacity
          testID="teacher-student-detail-back-button"
          onPress={() => router.back()}
          style={{ marginBottom: spacing.sm }}
        >
          <Text style={styles.backText}>‹ Kembali ke Daftar Siswa</Text>
        </TouchableOpacity>

        {/* Profil Siswa */}
        <Card style={styles.profileCard}>
          <Text style={styles.studentName} testID="teacher-student-detail-name">
            {data?.student?.name}
          </Text>
          <Text style={styles.studentMeta}>
            NIPD: {data?.student?.nipd} · Kelas {data?.student?.class_id}
          </Text>
          <Text style={styles.studentMeta}>Guru Wali: {data?.student?.teacher_name}</Text>
        </Card>

        {/* Rekap 7 dan 30 Hari */}
        <View style={styles.recapRow}>
          <RecapCard testID="teacher-student-recap-7" title="7 Hari Terakhir" recap={data?.recap_7_days} />
          <RecapCard testID="teacher-student-recap-30" title="30 Hari Terakhir" recap={data?.recap_30_days} />
        </View>

        {/* Laporan Harian Terpilih */}
        <Text style={styles.sectionTitle}>Jurnal Tanggal {data?.date}</Text>
        {report ? (
          <Card style={styles.reportCard}>
            <View testID="teacher-student-report-detail">
              {/* Skor Karakter Hari Ini */}
              {scores && (
                <View style={styles.scoreHeaderBox}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.scoreTitle}>
                      ⭐ Skor Karakter: {scores.total} / 87 Poin
                    </Text>
                    <Badge label={`${scores.percentage}%`} tone="success" />
                  </View>
                  <View style={styles.catChipsRow}>
                    <Text style={styles.catChip}>Ibadah: {scores.ibadah}/20</Text>
                    <Text style={styles.catChip}>Belajar: {scores.belajar}/39</Text>
                    <Text style={styles.catChip}>Akhlak: {scores.akhlak}/15</Text>
                    <Text style={styles.catChip}>Diri: {scores.pengembangan}/13</Text>
                  </View>
                </View>
              )}

              {/* Status Konfirmasi Orang Tua */}
              <View style={styles.confBox}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.confTitle}>Konfirmasi Orang Tua:</Text>
                  <Badge
                    label={
                      conf.status === "confirmed"
                        ? "✓ Sesuai"
                        : conf.status === "rejected"
                        ? "Perlu Perbaikan"
                        : "Menunggu"
                    }
                    tone={conf.status === "confirmed" ? "success" : conf.status === "rejected" ? "error" : "warning"}
                  />
                </View>
                {conf.parent_note && (
                  <Text style={styles.confNote}>Catatan Wali: "{conf.parent_note}"</Text>
                )}
              </View>

              {/* Foto Bukti jika ada */}
              {report.proofs && report.proofs.length > 0 && (
                <View style={{ marginVertical: spacing.sm }}>
                  <Text style={styles.sectionSubtitle}>Foto Bukti Kegiatan:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {report.proofs.map((p: any, idx: number) => (
                      <View key={p.id || idx} style={styles.photoContainer}>
                        <Image source={{ uri: p.url }} style={styles.photoThumb} />
                        {p.caption ? <Text style={styles.photoCaption}>{p.caption}</Text> : null}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Waktu Pengisian</Text>
                <Text style={styles.reportValue}>
                  {new Date(report.submitted_at || report.updated_at).toLocaleString("id-ID")}
                </Text>
              </View>
              {report.submitted_late && <Badge label="Terlambat mengisi" tone="warning" />}

              <Text style={styles.sectionSubtitle}>Sholat Fardhu</Text>
              {PRAYER_TIMES.map((p) => (
                <View key={p.key} style={styles.reportRow}>
                  <Text style={styles.reportLabel}>{p.label}</Text>
                  <Text style={styles.reportValue}>{prayerLabel(report[p.key])}</Text>
                </View>
              ))}

              <Text style={styles.sectionSubtitle}>Tidur & Bangun</Text>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Tidur Malam</Text>
                <Text style={styles.reportValue}>{sleepLabel(report.sleep_window)}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Bangun Pagi</Text>
                <Text style={styles.reportValue}>{wakeLabel(report.wake_window)}</Text>
              </View>

              {/* Kegiatan Akhlak & Belajar */}
              {report.akhlak_items && report.akhlak_items.length > 0 && (
                <>
                  <Text style={styles.sectionSubtitle}>Bakti di Rumah (Akhlak)</Text>
                  {report.akhlak_items.map((k: string) => (
                    <Text key={k} style={styles.bulletItem}>• {akhlakLabel(k)}</Text>
                  ))}
                </>
              )}

              {report.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Catatan Anak:</Text>
                  <Text style={styles.notesText}>"{report.notes}"</Text>
                </View>
              )}
            </View>
          </Card>
        ) : (
          <Card testID="teacher-student-report-empty">
            <Text style={styles.emptyText}>Siswa belum mengisi jurnal pada tanggal {data?.date}.</Text>
          </Card>
        )}

        {/* Bagian Catatan Pendampingan / Bimbingan Siswa */}
        <View style={styles.mentoringHeaderRow}>
          <Text style={styles.sectionTitle}>Catatan Bimbingan ({mentoringNotes.length})</Text>
          <TouchableOpacity style={styles.addNoteBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.addNoteBtnText}>+ Tambah Catatan</Text>
          </TouchableOpacity>
        </View>

        {mentoringNotes.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: spacing.lg }}>
            <Text style={{ fontSize: 28, marginBottom: 4 }}>📝</Text>
            <Text style={styles.emptyText}>Belum ada catatan bimbingan untuk siswa ini.</Text>
            <Text style={styles.emptySubText}>
              Wali kelas dapat mendokumentasikan perkembangan karakter, konseling, atau bimbingan khusus di sini.
            </Text>
          </Card>
        ) : (
          mentoringNotes.map((note) => (
            <Card key={note.id} style={styles.mentoringCard}>
              <View style={styles.mentoringCardHeader}>
                <Badge label={note.category?.toUpperCase() || "UMUM"} tone="info" />
                <Text style={styles.mentoringDate}>
                  {new Date(note.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <Text style={styles.mentoringText}>{note.note}</Text>
              {note.follow_up_action && (
                <View style={styles.followUpBox}>
                  <Text style={styles.followUpLabel}>Tindak Lanjut:</Text>
                  <Text style={styles.followUpText}>{note.follow_up_action}</Text>
                </View>
              )}
              <View style={styles.mentoringFooter}>
                <Text style={styles.mentoringAuthor}>Oleh: {note.teacher_name}</Text>
                <TouchableOpacity onPress={() => handleDeleteMentoringNote(note.id)}>
                  <Text style={styles.deleteNoteText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Modal Tambah Catatan Pendampingan */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Catatan Bimbingan Siswa</Text>
            <Text style={styles.modalSubtitle}>Siswa: {data?.student?.name}</Text>

            <Text style={styles.inputLabel}>Kategori Bimbingan</Text>
            <View style={styles.catChipRow}>
              {MENTORING_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.catSelectChip, category === c.key && styles.catSelectChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={[styles.catSelectText, category === c.key && styles.catSelectTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Catatan Observasi / Konseling</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Tuliskan catatan perkembangan karakter, kendala, atau bimbingan yang diberikan..."
              placeholderTextColor={colors.onSurfaceTertiary}
              multiline
              numberOfLines={4}
              value={noteText}
              onChangeText={setNoteText}
            />

            <Text style={styles.inputLabel}>Rencana Tindak Lanjut (Opsional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Contoh: Mengingatkan saat apel pagi, koordinasi dengan orang tua..."
              placeholderTextColor={colors.onSurfaceTertiary}
              value={followUp}
              onChangeText={setFollowUp}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnCancel]}
                onPress={() => setShowModal(false)}
                disabled={submittingNote}
              >
                <Text style={styles.btnCancelText}>Batal</Text>
              </TouchableOpacity>
              <PrimaryButton
                title={submittingNote ? "Menyimpan..." : "Simpan Catatan"}
                onPress={handleAddMentoringNote}
                loading={submittingNote}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function RecapCard({ testID, title, recap }: { testID: string; title: string; recap: any }) {
  const avgScore = recap?.average_score ?? "-";
  return (
    <Card style={styles.recapCard}>
      <View testID={testID}>
        <Text style={styles.recapTitle}>{title}</Text>
        <Text style={styles.recapScoreText}>⭐ {avgScore} Poin</Text>
        <Text style={styles.recapValue}>{recap?.submission_rate}% Pengisian</Text>
        <ProgressBar progress={(recap?.submission_rate || 0) / 100} />
        <Text style={styles.recapSub}>{recap?.prayer_berjamaah_rate}% Sholat Berjamaah</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  backText: { ...typography.bodyMedium, color: colors.brandPrimary },
  profileCard: { marginBottom: spacing.base },
  studentName: { ...typography.h2, color: colors.brand },
  studentMeta: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  recapRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.base },
  recapCard: { flex: 1 },
  recapTitle: { ...typography.caption, color: colors.onSurfaceTertiary },
  recapScoreText: { ...typography.h4, color: colors.brandPrimary, marginVertical: 2 },
  recapValue: { ...typography.caption, color: colors.onSurface, marginBottom: spacing.xs },
  recapSub: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: spacing.xs },
  sectionTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.sm },
  sectionSubtitle: { ...typography.bodyMedium, color: colors.brand, marginTop: spacing.sm, marginBottom: spacing.xs },
  reportCard: { marginBottom: spacing.lg },
  scoreHeaderBox: {
    backgroundColor: "#F0FDF4",
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  scoreTitle: { ...typography.h4, color: "#166534" },
  catChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.xs },
  catChip: { fontSize: 11, color: "#15803D", backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  confBox: {
    backgroundColor: "#EFF6FF",
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  confTitle: { ...typography.bodyMedium, color: colors.info },
  confNote: { ...typography.caption, color: colors.onSurface, fontStyle: "italic", marginTop: 4 },
  photoContainer: { marginRight: spacing.sm, alignItems: "center" },
  photoThumb: { width: 80, height: 80, borderRadius: radii.sm, backgroundColor: colors.border },
  photoCaption: { ...typography.caption, color: colors.onSurfaceSecondary, maxWidth: 80, textAlign: "center", marginTop: 2 },
  reportRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  reportLabel: { ...typography.body, color: colors.onSurfaceSecondary },
  reportValue: { ...typography.bodyMedium, color: colors.onSurface },
  bulletItem: { ...typography.body, color: colors.onSurface, paddingVertical: 2 },
  notesBox: { backgroundColor: "#F8FAFC", padding: spacing.sm, borderRadius: radii.sm, marginTop: spacing.sm },
  notesLabel: { ...typography.caption, color: colors.onSurfaceSecondary, fontWeight: "600" },
  notesText: { ...typography.body, color: colors.onSurface, fontStyle: "italic", marginTop: 2 },
  emptyText: { ...typography.body, color: colors.onSurfaceTertiary, textAlign: "center" },
  emptySubText: { ...typography.caption, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: 4 },
  mentoringHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md, marginBottom: spacing.sm },
  addNoteBtn: { backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs, borderRadius: radii.button },
  addNoteBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  mentoringCard: { marginBottom: spacing.sm },
  mentoringCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  mentoringDate: { ...typography.caption, color: colors.onSurfaceTertiary },
  mentoringText: { ...typography.body, color: colors.onSurface, lineHeight: 20 },
  followUpBox: { backgroundColor: "#F1F5F9", padding: spacing.xs + 2, borderRadius: radii.xs, marginTop: spacing.xs },
  followUpLabel: { fontSize: 10, color: colors.onSurfaceSecondary, fontWeight: "700" },
  followUpText: { fontSize: 12, color: colors.onSurface },
  mentoringFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  mentoringAuthor: { fontSize: 11, color: colors.onSurfaceTertiary },
  deleteNoteText: { fontSize: 11, color: colors.error, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
  modalCard: { width: "100%", maxWidth: 440 },
  modalTitle: { ...typography.h3, color: colors.onSurface },
  modalSubtitle: { ...typography.caption, color: colors.brandPrimary, fontWeight: "600", marginBottom: spacing.md },
  inputLabel: { ...typography.bodyMedium, color: colors.onSurface, marginBottom: spacing.xs },
  catChipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  catSelectChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.chip, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  catSelectChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  catSelectText: { fontSize: 11, color: colors.onSurfaceSecondary, fontWeight: "600" },
  catSelectTextActive: { color: "#FFFFFF" },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    padding: spacing.md,
    fontSize: 14,
    color: colors.onSurface,
    textAlignVertical: "top",
    minHeight: 90,
    marginBottom: spacing.md,
  },
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
  modalBtnRow: { flexDirection: "row", gap: spacing.sm },
  modalBtn: { minHeight: touchTargets.minHeight, borderRadius: radii.button, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  btnCancel: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  btnCancelText: { color: colors.onSurfaceSecondary, fontWeight: "600" },
});
