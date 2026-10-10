import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
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

  // Modal Pemilih Guru Wali (Dropdown / Selector khusus)
  const [teacherPickerModalVisible, setTeacherPickerModalVisible] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");

  // Modal Tambah Guru
  const [addTeacherModalVisible, setAddTeacherModalVisible] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [submittingTeacher, setSubmittingTeacher] = useState(false);

  // Modal Daftar Guru
  const [teachersModalVisible, setTeachersModalVisible] = useState(false);

  // Modal Reset Password (Bisa Siswa atau Guru)
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<any>(null);
  const [newPassInput, setNewPassInput] = useState("");
  const [resetting, setResetting] = useState(false);

  // Otomatis buat username dari nama guru untuk preview
  const autoTeacherUsername = useMemo(() => {
    if (!newTeacherName.trim()) return "";
    return newTeacherName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 30);
  }, [newTeacherName]);

  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => {
        if (!word) return "";
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  };

  const validateTeacherFormat = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return "Nama lengkap guru wajib diisi.";
    if (trimmed.length < 3) return "Nama guru minimal 3 karakter.";
    if (trimmed.length > 60) return "Nama guru maksimal 60 karakter.";
    if (/\d/.test(trimmed)) return "Nama guru tidak boleh mengandung angka.";
    if (trimmed.includes(",") || trimmed.includes(".")) {
      return "Format nama guru harus TANPA GELAR akademik agar seragam dengan 19 guru lainnya (contoh: Sintia Widiyawati, bukan Sintia Widiyawati, S.Pd.).";
    }
    if (!/^[a-zA-Z\s'\-]+$/.test(trimmed)) {
      return "Nama guru hanya boleh memuat huruf alfabet, spasi, tanda petik ('), dan tanda hubung (-).";
    }
    const words = trimmed.split(/\s+/).filter(Boolean);
    const hasLower = words.some(
      (w) => w[0] === w[0].toLowerCase() && !["dan", "bin", "binti"].includes(w.toLowerCase())
    );
    if (hasLower) {
      return "Format tidak sesuai: Awali setiap kata dengan huruf kapital (Title Case), contoh: Sintia Widiyawati.";
    }
    return null;
  };

  const validateStudentFormat = (name: string, nipd: string): string | null => {
    const trimmedName = name.trim();
    const trimmedNipd = nipd.trim();

    if (!trimmedName) return "Nama lengkap siswa wajib diisi.";
    if (trimmedName.length < 3) return "Nama siswa minimal 3 karakter.";
    if (trimmedName.length > 60) return "Nama siswa maksimal 60 karakter.";
    if (/\d/.test(trimmedName)) return "Nama siswa tidak boleh mengandung angka.";
    if (!/^[a-zA-Z\s'\.\-]+$/.test(trimmedName)) {
      return "Nama siswa hanya boleh memuat huruf, spasi, tanda petik ('), dan tanda hubung (-).";
    }
    const words = trimmedName.split(/\s+/).filter(Boolean);
    if (words.some((w) => w[0] === w[0].toLowerCase())) {
      return "Format nama siswa harus diawali huruf kapital pada tiap kata (Title Case), contoh: Ahmad Adila Riskiyansyah.";
    }

    if (!trimmedNipd) return "NIPD siswa wajib diisi.";
    if (!/^\d{4,10}$/.test(trimmedNipd)) {
      return "Format NIPD tidak valid. NIPD harus berupa 4 sampai 10 digit angka tanpa huruf atau spasi (contoh: 8308).";
    }

    return null;
  };

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
    const errorMsg = validateStudentFormat(newName, newNipd);
    if (errorMsg) {
      show(errorMsg, "error");
      return;
    }
    if (!newClassId) {
      show("Mohon pilih salah satu rombel kelas.", "error");
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
    const errorMsg = validateTeacherFormat(newTeacherName);
    if (errorMsg) {
      show(errorMsg, "error");
      return;
    }
    setSubmittingTeacher(true);
    try {
      const res = await apiRequest("/admin/teachers", {
        method: "POST",
        token,
        body: {
          name: newTeacherName.trim(),
        },
      });
      show(`Guru ${res.name} (Username: @${res.username}) berhasil ditambahkan!`, "success");
      setAddTeacherModalVisible(false);
      setNewTeacherName("");
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
        <View style={{ flex: 1, paddingRight: spacing.sm }}>
          <Text style={styles.headerTitle} testID="admin-dashboard-title">Panel Admin Sekolah</Text>
          <Text style={styles.headerSubtitle}>SMP NEGERI 2 PANJI</Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "center" }}>
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

            {/* Tombol Ekspor Rekap Sekolah (Dibuat di bawah KPI agar Header Luas & Nyaman) */}
            <TouchableOpacity
              style={styles.exportActionCard}
              onPress={handleExport}
              disabled={downloading}
              activeOpacity={0.8}
            >
              <View style={styles.exportActionLeft}>
                <View style={styles.exportIconBox}>
                  <Text style={styles.exportIconText}>{downloading ? "⏳" : "📥"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportActionTitle}>
                    {downloading ? "Sedang Menyiapkan CSV..." : "Ekspor Rekap Karakter Santri (CSV)"}
                  </Text>
                  <Text style={styles.exportActionSub}>
                    Unduh rekap nilai 15 rombel langsung ke folder Unduhan HP
                  </Text>
                </View>
              </View>
              <View style={styles.exportActionBadge}>
                <Text style={styles.exportActionBadgeText}>{downloading ? "Proses..." : "Unduh CSV"}</Text>
              </View>
            </TouchableOpacity>

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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
              <Text style={styles.modalTitle}>Tambah Siswa Baru (Admin)</Text>
              <Text style={styles.modalSubtitle}>
                Akun siswa (NIPD) dan akun wali murid akan otomatis dibuat dengan password default (password123).
              </Text>

              {/* Input Nama Siswa */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.inputLabel}>Nama Lengkap Siswa</Text>
                {newName.trim().length > 0 && (
                  <TouchableOpacity onPress={() => setNewName(toTitleCase(newName))}>
                    <Text style={styles.formatQuickFixBtn}>✨ Rapikan Format</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Contoh: Ahmad Adila Riskiyansyah"
              />
              <Text style={styles.fieldFormatGuide}>
                💡 Format: Awali huruf kapital pada tiap kata (Title Case) tanpa angka atau simbol aneh. Contoh: Ahmad Adila Riskiyansyah.
              </Text>

              {/* Input NIPD */}
              <Text style={styles.inputLabel}>NIPD (Nomor Induk Siswa)</Text>
              <TextInput
                style={styles.input}
                value={newNipd}
                onChangeText={(text) => setNewNipd(text.replace(/[^0-9]/g, ""))}
                placeholder="Contoh: 8308"
                keyboardType="number-pad"
              />
              <Text style={styles.fieldFormatGuide}>
                💡 Format: 4 s/d 10 digit angka resmi buku induk sekolah (contoh: 8308 atau 8459).
              </Text>

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

              {/* Pemilih Guru Wali (Dropdown Trigger Nyaman & Rapi) */}
              <Text style={styles.inputLabel}>Pilih Guru Wali Kelas (Bebas Typo)</Text>
              <TouchableOpacity
                style={styles.teacherSelectTrigger}
                onPress={() => {
                  setTeacherSearch("");
                  setTeacherPickerModalVisible(true);
                }}
              >
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.teacherSelectTriggerName}>
                    {newTeacherId
                      ? `👤 ${teachers.find((t) => t.teacher_id === newTeacherId)?.name || "Guru Terpilih"}`
                      : "✓ Otomatis (Sesuai Rombel / Belum Ditentukan)"}
                  </Text>
                  <Text style={styles.teacherSelectTriggerHint}>
                    {newTeacherId
                      ? `Username: @${teachers.find((t) => t.teacher_id === newTeacherId)?.username}`
                      : "Ketuk untuk memilih guru wali pembimbing resmi"}
                  </Text>
                </View>
                <Text style={styles.teacherSelectArrow}>▼</Text>
              </TouchableOpacity>

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

      {/* Modal Khusus Pemilih Guru Wali (Dropdown Sheet) */}
      <Modal visible={teacherPickerModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>Pilih Guru Wali Pembina</Text>
            <Text style={styles.modalSubtitle}>
              Pilih guru dari daftar akun resmi SMP Negeri 2 Panji untuk menghindari salah ketik.
            </Text>

            <TextInput
              style={styles.teacherSearchInput}
              value={teacherSearch}
              onChangeText={setTeacherSearch}
              placeholder="🔍 Cari nama atau username guru..."
              placeholderTextColor={colors.onSurfaceTertiary}
            />

            <ScrollView style={{ maxHeight: 320, marginVertical: spacing.sm }} showsVerticalScrollIndicator={true}>
              <TouchableOpacity
                style={[
                  styles.teacherSelectItem,
                  newTeacherId === "" && styles.teacherSelectItemActive,
                ]}
                onPress={() => {
                  setNewTeacherId("");
                  setTeacherPickerModalVisible(false);
                }}
              >
                <Text style={[styles.teacherSelectItemName, newTeacherId === "" && styles.teacherSelectItemNameActive]}>
                  {newTeacherId === "" ? "✓ " : ""}Otomatis (Sesuai Rombel / Belum Ditentukan)
                </Text>
                <Text style={styles.teacherSelectItemSub}>
                  Guru pembina akan ditetapkan otomatis sesuai wali kelas rombel
                </Text>
              </TouchableOpacity>

              {teachers
                .filter((t) => {
                  if (!teacherSearch.trim()) return true;
                  const query = teacherSearch.toLowerCase();
                  return t.name.toLowerCase().includes(query) || (t.username || "").toLowerCase().includes(query);
                })
                .map((t) => {
                  const isSelected = newTeacherId === t.teacher_id;
                  return (
                    <TouchableOpacity
                      key={t.teacher_id}
                      style={[
                        styles.teacherSelectItem,
                        isSelected && styles.teacherSelectItemActive,
                      ]}
                      onPress={() => {
                        setNewTeacherId(t.teacher_id);
                        setTeacherPickerModalVisible(false);
                      }}
                    >
                      <Text style={[styles.teacherSelectItemName, isSelected && styles.teacherSelectItemNameActive]}>
                        {isSelected ? "✓ " : ""}👤 {t.name}
                      </Text>
                      <Text style={styles.teacherSelectItemSub}>
                        Username login: @{t.username}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <PrimaryButton
              title="Tutup Pilihan"
              variant="secondary"
              onPress={() => setTeacherPickerModalVisible(false)}
              style={{ marginTop: spacing.sm }}
            />
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

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.inputLabel}>Nama Lengkap Guru</Text>
              {newTeacherName.trim().length > 0 && (
                <TouchableOpacity onPress={() => setNewTeacherName(toTitleCase(newTeacherName))}>
                  <Text style={styles.formatQuickFixBtn}>✨ Rapikan Format</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              value={newTeacherName}
              onChangeText={setNewTeacherName}
              placeholder="Contoh: Sintia Widiyawati"
            />
            <Text style={styles.fieldFormatGuide}>
              💡 Format: Nama lengkap guru TANPA GELAR menggunakan huruf kapital di awal tiap kata (Title Case). Contoh: Sintia Widiyawati (agar seragam dengan 19 guru resmi lainnya).
            </Text>

            {/* Kotak Otomatis Username */}
            <View style={styles.usernamePreviewBox}>
              <Text style={styles.usernamePreviewLabel}>Username Login Guru (Otomatis):</Text>
              <Text style={styles.usernamePreviewValue}>
                {autoTeacherUsername ? `@${autoTeacherUsername}` : "(otomatis dibuat oleh sistem dari nama guru)"}
              </Text>
            </View>

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
  exportActionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  exportActionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  exportIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  exportIconText: { fontSize: 18 },
  exportActionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  exportActionSub: {
    fontSize: 11,
    color: "#15803D",
    marginTop: 2,
  },
  exportActionBadge: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.button,
  },
  exportActionBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  teacherSelectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  teacherSelectTriggerName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  teacherSelectTriggerHint: {
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },
  teacherSelectArrow: {
    fontSize: 14,
    color: colors.onSurfaceSecondary,
    marginLeft: spacing.sm,
  },
  teacherSearchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  teacherSelectItem: {
    padding: spacing.sm + 2,
    borderRadius: radii.button,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  teacherSelectItemActive: {
    backgroundColor: "#ECFDF5",
    borderColor: colors.brandPrimary,
  },
  teacherSelectItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
  },
  teacherSelectItemNameActive: {
    color: colors.brandPrimary,
  },
  teacherSelectItemSub: {
    fontSize: 11,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },
  fieldFormatGuide: {
    fontSize: 11,
    color: "#047857",
    backgroundColor: "#F0FDF4",
    padding: 6,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  formatQuickFixBtn: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  usernamePreviewBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radii.button,
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  usernamePreviewLabel: {
    fontSize: 11,
    color: colors.onSurfaceTertiary,
  },
  usernamePreviewValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brandPrimary,
    marginTop: 2,
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
