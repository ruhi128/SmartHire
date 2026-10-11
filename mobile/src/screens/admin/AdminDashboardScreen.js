import { useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { Card, ErrorState, LoadingState, SectionTitle } from '../../components/Ui';
import { adminApi, companyOaApi, jobsApi, mockOaApi } from '../../api';
import { apiUrl } from '../../api/client';
import { DEMO_MODE } from '../../config/runtime';
import { useAuth } from '../../context/AuthContext';
import useAsyncData from '../../utils/useAsyncData';
import { colors, spacing } from '../../constants/theme';
import { formatDate, getInitials, statusTone } from '../../utils/format';

function Metric({ label, value, tone, icon }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${tone}18` }]}><Ionicons name={icon} color={tone} size={19} /></View>
      <Text style={styles.metricValue}>{value ?? 0}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Action({ title, body, icon, tone, onPress, badge }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={[styles.actionIcon, { backgroundColor: `${tone}18` }]}><Ionicons name={icon} size={22} color={tone} /></View>
      <View style={styles.actionBody}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{body}</Text>
      </View>
      {badge ? <View style={[styles.count, { backgroundColor: `${tone}18` }]}><Text style={[styles.countText, { color: tone }]}>{badge}</Text></View> : <Ionicons name="chevron-forward" color="#94A3B8" size={20} />}
    </Pressable>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const { user, session } = useAuth();
  const { data, loading, refreshing, error, reload } = useAsyncData(async () => {
    const [stats, jobs, companyOa, mockOa] = await Promise.all([
      adminApi.stats(),
      jobsApi.pending(),
      companyOaApi.pending(),
      mockOaApi.pending(),
    ]);
    return { stats, jobs, companyOa, mockOa };
  }, []);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarPath = user?.avatar_url || null;
  const avatarSource = avatarPath && !DEMO_MODE && session?.token && !avatarFailed
    ? { uri: apiUrl(avatarPath), headers: { Authorization: `Bearer ${session.token}` } }
    : null;

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar_url, user?.avatar_updated_at]);

  if (loading) return <LoadingState label="Loading placement overview…" />;
  if (error) return <ErrorState message={error} onRetry={() => reload().catch(() => {})} />;

  const overview = data.stats?.overview || {};
  const pendingJobs = data.jobs?.length || 0;
  const pendingCompany = data.companyOa?.tests?.length || 0;
  const pendingMock = data.mockOa?.tests?.length || 0;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}>
      <View style={styles.hero}>
        <View style={styles.heroAvatar}>
          {avatarSource
            ? <Image source={avatarSource} style={styles.heroAvatarImage} onError={() => setAvatarFailed(true)} />
            : <Text style={styles.heroAvatarText}>{getInitials(user?.name || user?.email || 'Admin')}</Text>}
        </View>
        <View style={styles.heroBody}>
          <Text style={styles.title}>Placement control</Text>
          <Text style={styles.subtitle}>Review workflow items and monitor placement activity.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => navigation.navigate('Notifications')} style={styles.bell}>
          <Ionicons name="notifications-outline" size={22} color={colors.white} />
        </Pressable>
      </View>

      <Card style={styles.metrics}>
        <Metric label="Students" value={overview.totalStudents} tone={colors.primary} icon="people-outline" />
        <Metric label="Placed" value={overview.placedStudents} tone={colors.success} icon="ribbon-outline" />
        <Metric label="Live jobs" value={overview.activeJobs} tone={colors.warning} icon="briefcase-outline" />
        <Metric label="Applications" value={overview.totalApplications} tone={colors.accent} icon="documents-outline" />
      </Card>

      <SectionTitle title="Needs review" />
      <View style={styles.actions}>
        <Action title="Job approvals" body="Review recruiter job postings" icon="briefcase-outline" tone={colors.primary} badge={pendingJobs || null} onPress={() => navigation.navigate('AdminJobApprovals')} />
        <Action title="Assessment approvals" body="Review Company OA and Mock OA submissions" icon="document-text-outline" tone={colors.warning} badge={(pendingCompany + pendingMock) || null} onPress={() => navigation.navigate('AdminOaReviews')} />
        <Action title="Student records" body="Review placement status and profiles" icon="people-outline" tone={colors.success} onPress={() => navigation.navigate('AdminStudents')} />
        <Action title="Placement report" body="View and export placement records" icon="bar-chart-outline" tone={colors.navy} onPress={() => navigation.navigate('AdminReports')} />
        <Action title="Announcements" body="Publish information to the placement community" icon="megaphone-outline" tone={colors.accent} onPress={() => navigation.navigate('AdminAnnouncements')} />
      </View>

      <SectionTitle title="Recent applications" />
      {(data.stats?.recentApplications || []).slice(0, 5).map((item, index) => (
        <View key={`${item.student}-${index}`} style={styles.recent}>
          <View style={styles.recentIcon}><Ionicons name="person-outline" size={17} color={colors.primary} /></View>
          <View style={styles.recentBody}>
            <Text style={styles.recentTitle}>{item.job || 'Job role'} · {item.company || 'Company'}</Text>
            <Text style={styles.recentSub}>{formatDate(item.appliedAt)}</Text>
          </View>
          <Text style={[styles.status, { color: statusTone(item.status) === 'success' ? colors.success : colors.primary }]}>{item.status || 'applied'}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginHorizontal: -spacing.md, marginTop: -spacing.md, padding: spacing.lg, paddingTop: 28, minHeight: 139, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center' },
  heroAvatar: { width: 51, height: 51, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 11, overflow: 'hidden' },
  heroAvatarImage: { width: 51, height: 51, borderRadius: 16, resizeMode: 'cover' },
  heroAvatarText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  heroBody: { flex: 1 },
  title: { color: colors.white, fontSize: 21, fontWeight: '900' },
  subtitle: { color: '#CBD5E1', marginTop: 4, fontSize: 12, lineHeight: 17 },
  bell: { padding: 9 },
  metrics: { marginTop: -15, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between' },
  metric: { flex: 1, alignItems: 'center' },
  metricIcon: { height: 33, width: 33, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 6 },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 2, textAlign: 'center' },
  actions: { gap: 9 },
  action: { minHeight: 70, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, backgroundColor: colors.white, alignItems: 'center', flexDirection: 'row' },
  actionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  actionBody: { flex: 1 },
  actionTitle: { color: colors.text, fontWeight: '900' },
  actionSub: { color: colors.muted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  count: { minWidth: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  countText: { fontWeight: '900', fontSize: 12 },
  pressed: { opacity: 0.75 },
  recent: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 11, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  recentIcon: { height: 37, width: 37, borderRadius: 11, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF2FF', marginRight: 10 },
  recentBody: { flex: 1 },
  recentTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
  recentSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  status: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
});
