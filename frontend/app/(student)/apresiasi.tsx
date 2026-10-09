import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, radii, spacing, typography } from "../../utils/theme";
import { Card, Badge, ProgressBar } from "../../components/ui";

export default function StudentApresiasiScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await apiRequest("/student/badges", { token });
      setData(res);
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

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  const unlockedCount = data?.unlocked_count ?? 0;
  const totalBadges = data?.total_badges ?? 6;
  const badges = data?.badges || [];
  const progressRatio = totalBadges > 0 ? unlockedCount / totalBadges : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>Lencana & Apresiasi</Text>
        <Text style={styles.headerSubtitle}>
          Penghargaan atas keistiqomahan ibadah dan kebiasaan baikmu
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Banner Prestasi */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiTopRow}>
            <View>
              <Text style={styles.kpiLabel}>Pencapaian Lencana</Text>
              <Text style={styles.kpiNumber}>
                {unlockedCount} <Text style={styles.kpiTotal}>/ {totalBadges} Terbuka</Text>
              </Text>
            </View>
            <Text style={{ fontSize: 40 }}>🏅</Text>
          </View>
          <ProgressBar progress={progressRatio} style={{ marginVertical: spacing.sm }} />
          <Text style={styles.kpiMotivation}>
            {unlockedCount === totalBadges
              ? "Maa Syaa Allah! Semua lencana telah kamu raih. Pertahankan istiqomahmu!"
              : "Terus semangat mengisi jurnal dan menjalankan pembiasaan setiap hari!"}
          </Text>
        </Card>

        {/* Daftar Lencana */}
        <Text style={styles.sectionTitle}>Koleksi Lencana Karakter</Text>

        {badges.map((b: any) => {
          const isUnlocked = b.unlocked;
          return (
            <Card
              key={b.id}
              style={[
                styles.badgeCard,
                isUnlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked,
              ]}
            >
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.iconBox,
                    isUnlocked ? styles.iconBoxUnlocked : styles.iconBoxLocked,
                  ]}
                >
                  <Text style={{ fontSize: 32 }}>{b.icon}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.badgeTitle}>{b.title}</Text>
                    <Badge
                      label={isUnlocked ? "✓ Terbuka" : "Progres"}
                      tone={isUnlocked ? "success" : "warning"}
                    />
                  </View>

                  <Text style={styles.badgeDesc}>{b.description}</Text>

                  {isUnlocked ? (
                    <Text style={styles.earnedText}>
                      ⭐ Diperoleh pada:{" "}
                      {new Date(b.earned_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  ) : (
                    <View style={styles.progressWrap}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                        <Text style={styles.progressLabel}>Capaian: {b.current} / {b.target}</Text>
                        <Text style={styles.progressLabel}>{b.percentage}%</Text>
                      </View>
                      <ProgressBar progress={b.percentage / 100} />
                    </View>
                  )}
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.onSurface },
  headerSubtitle: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  kpiCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1.5,
    marginBottom: spacing.lg,
  },
  kpiTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kpiLabel: { ...typography.caption, color: "#166534", fontWeight: "700" },
  kpiNumber: { ...typography.h1, color: colors.brandPrimary, marginVertical: 2 },
  kpiTotal: { ...typography.body, color: colors.onSurfaceSecondary },
  kpiMotivation: { ...typography.caption, color: "#15803D", fontStyle: "italic", marginTop: 2 },
  sectionTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.sm },
  badgeCard: { marginBottom: spacing.md },
  badgeCardUnlocked: {
    backgroundColor: colors.surfaceElevated,
    borderColor: "#86EFAC",
    borderWidth: 1.5,
  },
  badgeCardLocked: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    opacity: 0.85,
  },
  badgeRow: { flexDirection: "row", alignItems: "flex-start" },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: radii.card,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxUnlocked: { backgroundColor: "#DCFCE7" },
  iconBoxLocked: { backgroundColor: "#F1F5F9" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  badgeTitle: { ...typography.h4, color: colors.onSurface, flex: 1 },
  badgeDesc: { ...typography.caption, color: colors.onSurfaceSecondary, lineHeight: 18, marginVertical: 2 },
  earnedText: { fontSize: 11, color: colors.brandPrimary, fontWeight: "700", marginTop: 4 },
  progressWrap: { marginTop: 6 },
  progressLabel: { fontSize: 11, color: colors.onSurfaceTertiary, fontWeight: "600" },
});
