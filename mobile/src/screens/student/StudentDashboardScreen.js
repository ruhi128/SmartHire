import { useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { Card, ErrorState, LoadingState, SectionTitle } from '../../components/Ui';
import { studentApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors, shadow, spacing } from '../../constants/theme';
import { formatDate, getInitials, statusTone } from '../../utils/format';
import { Badge } from '../../components/Ui';
import { apiUrl } from '../../api/client';
import { DEMO_MODE } from '../../config/runtime';
import { useAuth } from '../../context/AuthContext';

function Metric({ label, value, icon, tone = colors.primary }) {
  return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${tone}16` }]}><Ionicons name={icon} size={19} color={tone} /></View><Text style={styles.metricValue}>{value ?? 0}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function QuickAction({ title, subtitle, icon, tone, onPress }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}><View style={[styles.quickIcon, { backgroundColor: `${tone}18` }]}><Ionicons name={icon} size={21} color={tone} /></View><View style={styles.quickText}><Text style={styles.quickTitle}>{title}</Text><Text style={styles.quickSub}>{subtitle}</Text></View><Ionicons name="chevron-forward" color="#94A3B8" size={20} /></Pressable>;
}

export default function StudentDashboardScreen({ navigation }) {
  const { user, session } = useAuth();
  const { data, loading, refreshing, error, reload } = useAsyncData(() => studentApi.dashboard(), []);
  const profile = data?.profile || user?.profile || {};
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarPath = profile.avatar_url || user?.avatar_url || null;
  const avatarSource = avatarPath && !DEMO_MODE && session?.token && !avatarFailed
    ? { uri: apiUrl(avatarPath), headers: { Authorization: `Bearer ${session.token}` } }
    : null;

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile.avatar_url, profile.avatar_updated_at, user?.avatar_url, user?.avatar_updated_at]);

  if (loading) return <LoadingState label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={() => reload().catch(() => {})} />;
  const apps = data?.applications || {};
  const scores = data?.aptitudeScores || [];
  const aptitudeAverage = scores.length ? Math.round(scores.reduce((sum, item) => sum + ((item.score / item.total_marks) * 100 || 0), 0) / scores.length) : '—';

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          {avatarSource ? <Image source={avatarSource} style={styles.avatarImage} onError={() => setAvatarFailed(true)} /> : <Text style={styles.avatarText}>{getInitials(profile.full_name || user?.name || '')}</Text>}
        </View>
        <View style={styles.heroText}><Text style={styles.greeting}>Hello, {profile.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there'}</Text><Text style={styles.heroSub}>{profile.branch || 'Complete your profile to receive eligible opportunities.'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => navigation.navigate('Notifications')} style={styles.bell}><Ionicons name="notifications-outline" size={23} color={colors.white} /></Pressable>
      </View>

      <Card style={styles.progressCard}>
        <View style={styles.progressTop}><View><Text style={styles.progressLabel}>Placement profile</Text><Text style={styles.progressTitle}>{profile.placement_status === 'placed' ? 'Placed' : 'Ready for opportunities'}</Text></View><Badge tone={profile.placement_status === 'placed' ? 'success' : 'info'}>{profile.placement_status || 'unplaced'}</Badge></View>
        <View style={styles.metrics}>
          <Metric label="Applications" value={apps.total} icon="briefcase-outline" />
          <Metric label="Shortlisted" value={apps.shortlisted} icon="ribbon-outline" tone={colors.warning} />
          <Metric label="DSA accepted" value={data?.dsa?.accepted} icon="code-slash-outline" tone={colors.success} />
          <Metric label="Aptitude avg." value={aptitudeAverage === '—' ? '—' : `${aptitudeAverage}%`} icon="stats-chart-outline" tone={colors.accent} />
        </View>
      </Card>

      <SectionTitle title="Continue your journey" />
      <View style={styles.quickGroup}>
        <QuickAction title="Explore jobs" subtitle="See roles you can apply for" icon="briefcase-outline" tone={colors.primary} onPress={() => navigation.navigate('JobsTab')} />
        <QuickAction title="Practice for assessments" subtitle="Aptitude, DSA and Mock OA" icon="school-outline" tone={colors.accent} onPress={() => navigation.navigate('PracticeTab')} />
        <QuickAction title="Update profile" subtitle="Keep eligibility details current" icon="person-outline" tone={colors.success} onPress={() => navigation.navigate('ProfileTab')} />
      </View>

      <SectionTitle title="Recent applications" action={<Pressable onPress={() => navigation.navigate('JobsTab', { screen: 'Applications' })}><Text style={styles.viewAll}>View all</Text></Pressable>} />
      {(data?.recentApplications || []).length ? data.recentApplications.map((app) => <Pressable key={app.id} onPress={() => navigation.navigate('JobsTab', { screen: 'Applications' })} style={styles.application}><View style={styles.companyPlaceholder}><Ionicons name="business-outline" color={colors.primary} size={19} /></View><View style={styles.applicationText}><Text style={styles.applicationTitle}>{app.job_postings?.title || 'Job role'}</Text><Text style={styles.applicationSub}>{app.job_postings?.companies?.name || 'Company'} · Applied {formatDate(app.applied_at)}</Text></View><Badge tone={statusTone(app.status)}>{app.status || 'applied'}</Badge></Pressable>) : <Card><Text style={styles.emptyText}>No applications yet. Explore current opportunities to get started.</Text></Card>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginHorizontal: -spacing.md, marginTop: -spacing.md, padding: spacing.lg, paddingTop: 28, minHeight: 144, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center' },
  avatar: { height: 50, width: 50, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' },
  avatarImage: { height: 50, width: 50, borderRadius: 17, resizeMode: 'cover' },
  avatarText: { color: colors.white, fontWeight: '900', fontSize: 17 },
  heroText: { flex: 1 },
  greeting: { fontSize: 21, fontWeight: '900', color: colors.white },
  heroSub: { color: '#CBD5E1', marginTop: 3, lineHeight: 18, fontSize: 12 },
  bell: { padding: 9 },
  progressCard: { marginTop: -17, padding: 15, ...shadow },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: colors.muted, fontSize: 12 },
  progressTitle: { fontSize: 16, color: colors.text, fontWeight: '900', marginTop: 3 },
  metrics: { flexDirection: 'row', marginTop: 16, justifyContent: 'space-between' },
  metric: { flex: 1, alignItems: 'center' },
  metricIcon: { width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 6 },
  metricLabel: { fontSize: 10, color: colors.muted, marginTop: 2, textAlign: 'center' },
  quickGroup: { gap: 9 },
  quickAction: { minHeight: 70, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  quickIcon: { width: 41, height: 41, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  quickText: { flex: 1 },
  quickTitle: { color: colors.text, fontWeight: '800' },
  quickSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  pressed: { opacity: 0.75 },
  viewAll: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  application: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  companyPlaceholder: { height: 38, width: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', marginRight: 10 },
  applicationText: { flex: 1, paddingRight: 8 },
  applicationTitle: { color: colors.text, fontWeight: '800' },
  applicationSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  emptyText: { color: colors.muted, lineHeight: 20 },
});
