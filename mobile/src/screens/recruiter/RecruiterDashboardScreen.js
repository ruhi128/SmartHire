import { useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { Badge, Card, ErrorState, LoadingState, SectionTitle } from '../../components/Ui';
import { jobsApi } from '../../api';
import { apiUrl } from '../../api/client';
import { DEMO_MODE } from '../../config/runtime';
import { useAuth } from '../../context/AuthContext';
import useAsyncData from '../../utils/useAsyncData';
import { colors, spacing } from '../../constants/theme';
import { formatDate, getInitials, statusTone } from '../../utils/format';

function Metric({ label, value, icon, tone }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${tone}18` }]}>
        <Ionicons name={icon} size={19} color={tone} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Action({ title, subtitle, icon, tone, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={[styles.actionIcon, { backgroundColor: `${tone}18` }]}>
        <Ionicons name={icon} color={tone} size={22} />
      </View>
      <View style={styles.actionBody}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </Pressable>
  );
}

export default function RecruiterDashboardScreen({ navigation }) {
  const { user, session } = useAuth();
  const { data, loading, refreshing, error, reload } = useAsyncData(() => jobsApi.list(), []);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarPath = user?.avatar_url || null;
  const avatarSource = avatarPath && !DEMO_MODE && session?.token && !avatarFailed
    ? { uri: apiUrl(avatarPath), headers: { Authorization: `Bearer ${session.token}` } }
    : null;

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar_url, user?.avatar_updated_at]);

  if (loading) return <LoadingState label="Loading company activity…" />;
  if (error) return <ErrorState message={error} onRetry={() => reload().catch(() => {})} />;

  const jobs = Array.isArray(data) ? data : [];
  const pending = jobs.filter((job) => job.approval_status === 'pending').length;
  const approved = jobs.filter((job) => job.approval_status === 'approved').length;
  const active = jobs.filter((job) => job.status === 'active' && job.approval_status === 'approved').length;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}>
      <View style={styles.hero}>
        <View style={styles.heroAvatar}>
          {avatarSource
            ? <Image source={avatarSource} style={styles.heroAvatarImage} onError={() => setAvatarFailed(true)} />
            : <Text style={styles.heroAvatarText}>{getInitials(user?.name || user?.email || 'Recruiter')}</Text>}
        </View>
        <View style={styles.heroBody}>
          <Text style={styles.title}>Recruiter workspace</Text>
          <Text style={styles.subtitle}>Publish roles, review applications, and submit company assessments.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => navigation.navigate('Notifications')} style={styles.bell}>
          <Ionicons name="notifications-outline" size={22} color={colors.white} />
        </Pressable>
      </View>

      <Card style={styles.metrics}>
        <Metric label="All roles" value={jobs.length} icon="briefcase-outline" tone={colors.primary} />
        <Metric label="Pending" value={pending} icon="time-outline" tone={colors.warning} />
        <Metric label="Live" value={active} icon="checkmark-circle-outline" tone={colors.success} />
        <Metric label="Approved" value={approved} icon="ribbon-outline" tone={colors.accent} />
      </Card>

      <SectionTitle title="Quick actions" />
      <View style={styles.actions}>
        <Action title="Post a job" subtitle="Send a role for placement-team approval" icon="add-circle-outline" tone={colors.primary} onPress={() => navigation.navigate('PostJob')} />
        <Action title="Manage applicants" subtitle="Review candidates and progress stages" icon="people-outline" tone={colors.success} onPress={() => navigation.navigate('RecruiterJobs')} />
        <Action title="Company OA" subtitle="Submit assessment questions for approval" icon="document-text-outline" tone={colors.warning} onPress={() => navigation.navigate('RecruiterOa')} />
      </View>

      <SectionTitle title="Recent job postings" action={<Pressable onPress={() => navigation.navigate('RecruiterJobs')}><Text style={styles.link}>View all</Text></Pressable>} />
      {jobs.slice(0, 4).map((job) => (
        <Pressable key={job.id} onPress={() => navigation.navigate('RecruiterApplicants', { job })} style={styles.job}>
          <View style={styles.jobIcon}><Ionicons name="briefcase-outline" size={19} color={colors.primary} /></View>
          <View style={styles.jobBody}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobMeta}>{job.package_lpa ? `${job.package_lpa} LPA` : 'Package not stated'} · Deadline {formatDate(job.deadline)}</Text>
          </View>
          <Badge tone={statusTone(job.approval_status || job.status)}>{job.approval_status || job.status || 'draft'}</Badge>
        </Pressable>
      ))}
      {!jobs.length ? <Card><Text style={styles.empty}>No job postings yet. Create a role to begin the approval process.</Text></Card> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginHorizontal: -spacing.md, marginTop: -spacing.md, padding: spacing.lg, paddingTop: 28, backgroundColor: colors.navy, minHeight: 140, flexDirection: 'row', alignItems: 'center' },
  heroAvatar: { height: 50, width: 50, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 11, overflow: 'hidden' },
  heroAvatarImage: { height: 50, width: 50, borderRadius: 16, resizeMode: 'cover' },
  heroAvatarText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  heroBody: { flex: 1 },
  title: { color: colors.white, fontSize: 21, fontWeight: '900' },
  subtitle: { color: '#CBD5E1', fontSize: 12, lineHeight: 17, marginTop: 4 },
  bell: { padding: 9 },
  metrics: { marginTop: -15, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between' },
  metric: { flex: 1, alignItems: 'center' },
  metricIcon: { height: 33, width: 33, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 6 },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 2, textAlign: 'center' },
  actions: { gap: 9 },
  action: { minHeight: 71, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  actionIcon: { height: 42, width: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  actionBody: { flex: 1 },
  actionTitle: { color: colors.text, fontWeight: '900' },
  actionSub: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  pressed: { opacity: 0.75 },
  link: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  job: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 13, padding: 12, marginBottom: 8 },
  jobIcon: { height: 39, width: 39, backgroundColor: '#EEF2FF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  jobBody: { flex: 1, paddingRight: 7 },
  jobTitle: { color: colors.text, fontWeight: '800' },
  jobMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  empty: { color: colors.muted, lineHeight: 20 },
});
