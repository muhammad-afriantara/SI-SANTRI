import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest, ApiError, downloadCsv } from "../../utils/api";
import { useToast } from "../../components/Toast";
import { colors, radii, spacing, typography } from "../../utils/theme";
import { Card, Badge, PrimaryButton, Chip } from "../../components/ui";

const CLASS_OPTIONS = [
  "Semua",
  "7A", "7B", "7C", "7D", "7E",
  "8A", "8B", "8C", "8D", "8E",
  "9A", "9B", "9C", "9D", "9E",
];

const GRADE_7_CLASSES = ["7A", "7B", "7C", "7D", "7E"];
const GRADE_8_CLASSES = ["8A", "8B", "8C", "8D", "8E"];
const GRADE_9_CLASSES = ["9A", "9B", "9C", "9D", "9E"];

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { token, profile } = useAuth();
  const { show } = useToast();

  const [dashboard, setDashboard] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("Semua");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const latestReqIdRef = useRef(0);

  // Modal Tambah Siswa
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNipd, setNewNipd] = useState("");
  const [newClassId, setNewClassId] = useState("7A");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal Tambah Guru
  const [addTeacherModalVisible, setAddTeacherModalVisible] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherUsername, setNewTeacherUsername] = useState("");
  const [submittingTeacher, setSubmittingTeacher] = useState(false);

  // Modal Daftar Guru
  const [teachersModalVisible, setTeachersModalVisible] = useState(false);

  // Modal Reset Password (Bisa Siswa atau Guru)
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<any>(null);
  const [newPassInput, setNewPassInput] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const classParam = selectedClass !== "Semua" ? `&class_id=${selectedClass}` : "";
      const filename = `rekap_karakter_sekolah_${selectedClass}_30hari.csv`;
      await downloadCsv(`/admin/export-recap?days=30${classParam}`, filename, token);
      Alert.alert(
        "Ekspor Berhasil",
        `Rekap karakter sekolah (${selectedClass}) berhasil diunduh (${filename}). Anda dapat membukanya di Microsoft Excel.`
      );
    } catch (e: any) {
      Alert.alert("Gagal Ekspor", e.message || "Gagal mengunduh file rekap.");
    } finally {
      setDownloading(false);
    }
  };

  const loadDashboard = useCallback(async () => {
    try {
      const res = await apiRequest("/admin/dashboard", { token });
      setDashboard(res);
    } catch (e) {
      // silent fail
    }
  }, [token]);

  const loadTeachers = useCallback(async () => {
    try {
      const res = await apiRequest("/admin/teachers", { token });
      setTeachers(res || []);
    } catch (e) {
      // silent fail
    }
  }, [token]);

  const loadStudents = useCallback(
    async (targetClass?: string, targetSearch?: string) => {
      const classToQuery = targetClass !== undefined ? targetClass : selectedClass;
      const searchToQuery = targetSearch !== undefined ? targetSearch : search;
      const reqId = ++latestReqIdRef.current;
      setFetchingStudents(true);

      try {
        const params = new URLSearchParams();
        if (classToQuery !== "Semua") params.append("class_id", classToQuery);
        if (searchToQuery.trim()) params.append("search", searchToQuery.trim());
        params.append("limit", "100");

        const res = await apiRequest(`/admin/students?${params.toString()}`, { token });
        // Hanya update jika respon ini berasal dari klik terakhir pengguna (Cegah race-condition)
        if (reqId === latestReqIdRef.current) {
          setStudents(res.items || []);
        }
      } catch (e) {
        // silent fail
      } finally {
        if (reqId === latestReqIdRef.current) {
          setFetchingStudents(false);
        }
      }
    },
    [token, selectedClass, search]
  );

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([loadDashboard(), loadTeachers(), loadStudents(selectedClass, search)]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadDashboard, loadTeachers, loadStudents, selectedClass, search]);

  // Hanya muat sekali saat layar dibuka/fokus, tidak memicu re-render saat ganti kelas
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [token])
  );

  const handleSelectClass = (cls: string) => {
    if (cls === selectedClass) return;
    setSelectedClass(cls);
    loadStudents(cls, search);
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    loadStudents(selectedClass, text);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const handleAddStudent = async () => {
    if (!newName.trim() || !newNipd.trim() || !newClassId) {
      show("Mohon lengkapi nama, NIPD, dan kelas.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const body: any = {
        name: newName.trim(),
        nipd: newNipd.trim(),
        class_id: newClassId,
      };
      if (newTeacherId) {
        body.teacher_id = newTeacherId;
      }

      const res = await apiRequest("/admin/students", {
        method: "POST",
        token,
        body,
      });
      show(`Siswa ${res.name} (NIPD: ${res.nipd}) berhasil ditambahkan!`, "success");
      setAddModalVisible(false);
      setNewName("");
      setNewNipd("");
      setNewTeacherId("");
      loadAll();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Gagal menambahkan siswa";
      show(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTeacher = async () => {
    if (!newTeacherName.trim()) {
      show("Mohon masukkan nama lengkap guru.", "error");
      return;
    }
    setSubmittingTeacher(true);
    try {
      const res = await apiRequest("/admin/teachers", {
        method: "POST",
        token,
        body: {
          name: newTeacherName.trim(),
          username: newTeacherUsername.trim() || undefined,
        },
      });
      show(`Guru ${res.name} (Username: ${res.username}) berhasil ditambahkan!`, "success");
      setAddTeacherModalVisible(false);
      setNewTeacherName("");
      setNewTeacherUsername("");
      loadAll();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Gagal menambahkan guru";
      show(msg, "error");
    } finally {
      setSubmittingTeacher(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!selectedUserForReset) return;
    setResetting(true);
    try {
      const targetId = selectedUserForReset.student_id || selectedUserForReset.teacher_id;
      const res = await apiRequest(`/admin/users/${targetId}/reset-password`, {
        method: "POST",
        token,
        body: { new_password: newPassInput.trim() || undefined },
      });
      show(res.message || "Password berhasil direset!", "success");
      setResetModalVisible(false);
      setNewPassInput("");
      setSelectedUserForReset(null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Gagal mereset password";
      show(msg, "error");
    } finally {
      setResetting(false);
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
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} testID="admin-dashboard-title">Panel Admin Sekolah</Text>
          <Text style={styles.headerSubtitle}>SMP NEGERI 2 PANJI</Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "center" }}>
          <TouchableOpacity
            style={styles.exportHeaderBtn}
            onPress={handleExport}
            disabled={downloading}
          >
            <Text style={styles.exportHeaderBtnText}>{downloading ? "⏳" : "📥 Ekspor"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="admin-add-teacher-btn"
            style={styles.addTeacherBtn}
            onPress={() => setAddTeacherModalVisible(true)}
          >
            <Text style={styles.addTeacherBtnText}>+ Guru</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="admin-add-student-btn"
            style={styles.addButton}
            onPress={() => setAddModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+ Siswa</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => item.student_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.base }}>
            {/* Peringatan Keamanan Password Default */}
            {profile?.must_change_password && (
              <View style={styles.securityWarningCard}>
                <Text style={styles.securityWarningTitle}>⚠️ Peringatan Keamanan Akun</Text>
                <Text style={styles.securityWarningText}>
                  Akun Admin masih menggunakan password default sekolah. Segera ganti password Anda di menu Akun demi perlindungan data.
                </Text>
              </View>
            )}

            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={styles.kpiValue}>{dashboard?.total_students || 0}</Text>
                <Text style={styles.kpiLabel}>Total Siswa</Text>
              </View>

              <TouchableOpacity
                style={[styles.kpiCard, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => setTeachersModalVisible(true)}
              >
                <Text style={styles.kpiValue}>{dashboard?.total_teachers || teachers.length || 0}</Text>
                <Text style={[styles.kpiLabel, { color: colors.brandPrimary, fontWeight: "700" }]}>Total Guru 👁️</Text>
              </TouchableOpacity>

              <View style={[styles.kpiCard, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.kpiValue, { color: colors.success }]}>{dashboard?.submitted_today || 0}</Text>
                <Text style={styles.kpiLabel}>Isi Hari Ini</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.kpiValue, { color: colors.warning }]}>{dashboard?.pending_today || 0}</Text>
                <Text style={styles.kpiLabel}>Belum Isi</Text>
              </View>
            </View>

            {/* Filter Kelas */}
            <Text style={styles.sectionHeader}>Filter Rombongan Belajar (15 Kelas)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xs, marginBottom: spacing.md }}
            >
              {CLASS_OPTIONS.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={selectedClass === item}
                  onPress={() => handleSelectClass(item)}
                />
              ))}
            </ScrollView>

            {/* Kolom Pencarian */}
            <TextInput
              testID="admin-search-input"
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Cari nama atau NIPD siswa..."
              placeholderTextColor={colors.onSurfaceTertiary}
              style={styles.searchInput}
            />

            <View style={styles.listHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Text style={styles.listHeaderText}>
                  Daftar Siswa {selectedClass !== "Semua" ? `Kelas ${selectedClass}` : ""} ({students.length})
                </Text>
                {fetchingStudents && <ActivityIndicator size="small" color={colors.brandPrimary} />}
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.studentCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.cardTopRow}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Badge label={`Kelas ${item.class_id}`} tone="info" />
              </View>
              <Text style={styles.studentMeta}>NIPD: {item.nipd} · Guru Wali: {item.teacher_name || "-"}</Text>
            </View>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setSelectedUserForReset(item);
                setResetModalVisible(true);
              }}
            >
              <Text style={styles.resetBtnText}>🔑 Reset</Text>
            </TouchableOpacity>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Tidak ada siswa ditemukan.</Text>
        }
      />

      {/* Modal Tambah Siswa */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Tambah Siswa Baru (Admin)</Text>
              <Text style={styles.modalSubtitle}>
                Akun siswa (NIPD) dan akun wali murid akan otomatis dibuat dengan password default (password123).
              </Text>

              <Text style={styles.inputLabel}>Nama Lengkap Siswa</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Contoh: Budi Santoso"
              />

              <Text style={styles.inputLabel}>NIPD (Nomor Induk Siswa)</Text>
              <TextInput
                style={styles.input}
                value={newNipd}
                onChangeText={setNewNipd}
                placeholder="Contoh: 9005"
                keyboardType="number-pad"
              />

              {/* Pilihan Kelas Dikelompokkan */}
              <Text style={styles.inputLabel}>Pilih Kelas (Rombel)</Text>
              <Text style={styles.gradeGroupTitle}>Kelas 7</Text>
              <View style={styles.chipWrapRow}>
                {GRADE_7_CLASSES.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    selected={newClassId === c}
                    onPress={() => setNewClassId(c)}
                  />
                ))}
              </View>
              <Text style={styles.gradeGroupTitle}>Kelas 8</Text>
              <View style={styles.chipWrapRow}>
                {GRADE_8_CLASSES.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    selected={newClassId === c}
                    onPress={() => setNewClassId(c)}
                  />
                ))}
              </View>
              <Text style={styles.gradeGroupTitle}>Kelas 9</Text>
              <View style={styles.chipWrapRow}>
                {GRADE_9_CLASSES.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    selected={newClassId === c}
                    onPress={() => setNewClassId(c)}
                  />
                ))}
              </View>

              {/* Pemilih Guru Wali (Anti Typo) */}
              <Text style={styles.inputLabel}>Pilih Guru Wali (Bebas Typo)</Text>
              <Text style={styles.inputHint}>
                Pilih guru pembina siswa dari daftar akun guru resmi sekolah:
              </Text>
              <View style={styles.teacherPickerBox}>
                <TouchableOpacity
                  style={[
                    styles.teacherPickItem,
                    newTeacherId === "" && styles.teacherPickItemSelected,
                  ]}
                  onPress={() => setNewTeacherId("")}
                >
                  <Text
                    style={[
                      styles.teacherPickItemText,
                      newTeacherId === "" && styles.teacherPickItemTextSelected,
                    ]}
                  >
                    {newTeacherId === "" ? "✓ " : "• "}Otomatis (Sesuai Rombel / Belum Ditentukan)
                  </Text>
                </TouchableOpacity>

                {teachers.map((t) => {
                  const isSelected = newTeacherId === t.teacher_id;
                  return (
                    <TouchableOpacity
                      key={t.teacher_id}
                      style={[
                        styles.teacherPickItem,
                        isSelected && styles.teacherPickItemSelected,
                      ]}
                      onPress={() => setNewTeacherId(t.teacher_id)}
                    >
                      <Text
                        style={[
                          styles.teacherPickItemText,
                          isSelected && styles.teacherPickItemTextSelected,
                        ]}
                      >
                        {isSelected ? "✓ " : "• "}{t.name} ({t.username})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalBtnRow}>
                <PrimaryButton
                  title="Batal"
                  variant="secondary"
                  onPress={() => {
                    setAddModalVisible(false);
                    setNewTeacherId("");
                  }}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <PrimaryButton
                  title="Simpan Siswa"
                  onPress={handleAddStudent}
                  loading={submitting}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Tambah Guru Baru */}
      <Modal visible={addTeacherModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tambah Guru Baru</Text>
            <Text style={styles.modalSubtitle}>
              Akun guru akan otomatis dibuat dengan password default sekolah (password123).
            </Text>

            <Text style={styles.inputLabel}>Nama Lengkap Guru</Text>
            <TextInput
              style={styles.input}
              value={newTeacherName}
              onChangeText={setNewTeacherName}
              placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd"
            />

            <Text style={styles.inputLabel}>Username Login (Opsional)</Text>
            <TextInput
              style={styles.input}
              value={newTeacherUsername}
              onChangeText={setNewTeacherUsername}
              placeholder="Contoh: siti_aminah (otomatis dari nama)"
              autoCapitalize="none"
            />

            <View style={styles.defaultPassNotice}>
              <Text style={styles.defaultPassNoticeText}>
                🔑 Password Default: <Text style={{ fontWeight: "800" }}>password123</Text> (Guru dapat mengubahnya mandiri di menu Akun).
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <PrimaryButton
                title="Batal"
                variant="secondary"
                onPress={() => {
                  setAddTeacherModalVisible(false);
                  setNewTeacherName("");
                  setNewTeacherUsername("");
                }}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <PrimaryButton
                title="Simpan Guru"
                onPress={handleAddTeacher}
                loading={submittingTeacher}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Daftar Guru Terdaftar */}
      <Modal visible={teachersModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <View style={styles.teacherModalHeader}>
              <Text style={styles.modalTitle}>Daftar Guru ({teachers.length})</Text>
              <TouchableOpacity
                style={styles.addTeacherSmallBtn}
                onPress={() => {
                  setTeachersModalVisible(false);
                  setAddTeacherModalVisible(true);
                }}
              >
                <Text style={styles.addTeacherSmallBtnText}>+ Tambah Guru</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Akun guru wali kelas dan pembina santri terdaftar di SMPN 2 Panji:
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {teachers.map((t) => (
                <View key={t.teacher_id} style={styles.teacherCardItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teacherCardName}>{t.name}</Text>
                    <Text style={styles.teacherCardMeta}>
                      Username: <Text style={{ fontWeight: "700" }}>{t.username}</Text>
                    </Text>
                    <Text style={styles.teacherCardMeta}>
                      Santri Dibina: {t.student_count || 0} siswa {t.classes?.length ? `(${t.classes.join(", ")})` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={() => {
                      setTeachersModalVisible(false);
                      setSelectedUserForReset(t);
                      setResetModalVisible(true);
                    }}
                  >
                    <Text style={styles.resetBtnText}>🔑 Reset</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <PrimaryButton
              title="Tutup"
              variant="secondary"
              onPress={() => setTeachersModalVisible(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Reset Password */}
      <Modal visible={resetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Reset kata sandi untuk {selectedUserForReset?.name} ({selectedUserForReset?.nipd ? `NIPD: ${selectedUserForReset.nipd}` : `Username: ${selectedUserForReset?.username}`}).
            </Text>

            <Text style={styles.inputLabel}>Password Baru (Opsional)</Text>
            <TextInput
              style={styles.input}
              value={newPassInput}
              onChangeText={setNewPassInput}
              placeholder="Kosongkan untuk default (password123)"
              autoCapitalize="none"
            />

            <View style={styles.modalBtnRow}>
              <PrimaryButton
                title="Batal"
                variant="secondary"
                onPress={() => {
                  setResetModalVisible(false);
                  setSelectedUserForReset(null);
                  setNewPassInput("");
                }}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <PrimaryButton
                title="Reset Password"
                onPress={handleConfirmReset}
                loading={resetting}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h1, color: colors.brand },
  headerSubtitle: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  exportHeaderBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
  },
  exportHeaderBtnText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 13 },
  addTeacherBtn: {
    backgroundColor: "#0D9488",
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
  },
  addTeacherBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  addButton: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
  },
  addButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  securityWarningCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  securityWarningTitle: {
    ...typography.bodyMedium,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 2,
  },
  securityWarningText: {
    ...typography.caption,
    color: "#7F1D1D",
    lineHeight: 18,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  kpiCard: {
    flex: 1,
    borderRadius: radii.card,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiValue: { fontSize: 20, fontWeight: "800", color: colors.brand },
  kpiLabel: { ...typography.tiny, color: colors.onSurfaceTertiary, marginTop: 4, textAlign: "center" },
  sectionHeader: { ...typography.caption, fontWeight: "700", color: colors.onSurfaceSecondary, marginBottom: spacing.xs },
  searchInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  listHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs },
  listHeaderText: { ...typography.h3, color: colors.onSurface },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    padding: spacing.base,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
  studentName: { ...typography.bodyMedium, fontWeight: "700", color: colors.onSurface },
  studentMeta: { ...typography.caption, color: colors.onSurfaceTertiary },
  resetBtn: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetBtnText: { ...typography.caption, fontWeight: "700", color: colors.onSurfaceSecondary },
  emptyText: { ...typography.body, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.xl },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
  modalContent: { backgroundColor: colors.surfaceElevated, borderRadius: radii.card, padding: spacing.lg },
  modalTitle: { ...typography.h2, color: colors.onSurface, marginBottom: spacing.xs },
  modalSubtitle: { ...typography.caption, color: colors.onSurfaceSecondary, marginBottom: spacing.base },
  inputLabel: { ...typography.caption, fontWeight: "700", color: colors.onSurface, marginTop: spacing.sm, marginBottom: spacing.xs },
  inputHint: { ...typography.tiny, color: colors.onSurfaceTertiary, marginBottom: spacing.xs },
  gradeGroupTitle: { ...typography.tiny, fontWeight: "700", color: colors.onSurfaceTertiary, marginTop: spacing.xs },
  input: {
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.onSurface,
  },
  chipWrapRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginVertical: spacing.xs },
  modalBtnRow: { flexDirection: "row", marginTop: spacing.lg },
  defaultPassNotice: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: radii.card,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  defaultPassNoticeText: {
    ...typography.caption,
    color: "#166534",
  },
  teacherPickerBox: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    padding: spacing.xs,
    backgroundColor: colors.surface,
  },
  teacherPickItem: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.button,
    marginBottom: 2,
  },
  teacherPickItemSelected: {
    backgroundColor: colors.brandTertiary,
  },
  teacherPickItemText: {
    ...typography.caption,
    color: colors.onSurface,
  },
  teacherPickItemTextSelected: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  teacherModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addTeacherSmallBtn: {
    backgroundColor: "#0D9488",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.button,
  },
  addTeacherSmallBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  teacherCardItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    marginBottom: spacing.xs,
  },
  teacherCardName: {
    ...typography.bodyMedium,
    fontWeight: "700",
    color: colors.onSurface,
  },
  teacherCardMeta: {
    ...typography.caption,
    color: colors.onSurfaceSecondary,
    marginTop: 2,
  },
});
