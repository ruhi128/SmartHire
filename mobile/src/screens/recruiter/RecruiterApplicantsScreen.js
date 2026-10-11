import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { AppButton, Badge, Card, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import { applicationsApi, jobsApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors, spacing } from '../../constants/theme';
import { formatDate, statusTone } from '../../utils/format';
import { buildApplicantsReportHtml, createAndSharePdf } from '../../utils/documentExport';

const STAGES = ['applied', 'oa_cleared', 'interview_1_cleared', 'interview_2_cleared', 'selected', 'rejected'];
const FILTERS = ['all', 'applied', 'shortlisted', 'selected', 'rejected'];
const stageLabel = (stage) => ({
  applied: 'Applied',
  oa_cleared: 'OA cleared',
  interview_1_cleared: 'Interview 1 cleared',
  interview_2_cleared: 'Interview 2 cleared',
  selected: 'Selected',
  rejected: 'Rejected',
})[stage] || stage || 'Applied';

function deriveStage(application = {}) {
  if (application.stage) return application.stage;
  if (application.status === 'selected') return 'selected';
  if (application.status === 'rejected') return 'rejected';
  if (application.status === 'shortlisted') return 'oa_cleared';
  return 'applied';
}

function stageToStatus(stage) {
  if (stage === 'selected') return 'selected';
  if (stage === 'rejected') return 'rejected';
  if (stage === 'applied') return 'applied';
  return 'shortlisted';
}

function filterLabel(filter) {
  return filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1);
}

async function openResume(url) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error('This device cannot open that resume link.');
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert('Could not open resume', error?.message || 'Please try again.');
  }
}

export default function RecruiterApplicantsScreen({ navigation, route }) {
  const routeJob = route?.params?.job;
  const [selectedJobId, setSelectedJobId] = useState(routeJob?.id || '');
  const [jobPickerOpen, setJobPickerOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const jobsState = useAsyncData(() => jobsApi.myJobs(), []);
  const jobs = Array.isArray(jobsState.data) ? jobsState.data : jobsState.data?.jobs || [];
  const effectiveJobId = selectedJobId || jobs[0]?.id || '';
  const applicationsState = useAsyncData(
    () => effectiveJobId ? applicationsApi.byJob(effectiveJobId) : Promise.resolve([]),
    [effectiveJobId],
  );

  useEffect(() => {
    if (!selectedJobId && jobs.length) setSelectedJobId(jobs[0].id);
  }, [jobs, selectedJobId]);

  const activeJob = jobs.find((job) => job.id === effectiveJobId) || (routeJob?.id === effectiveJobId ? routeJob : null);
  const applicants = Array.isArray(applicationsState.data) ? applicationsState.data : applicationsState.data?.applications || [];
  const filteredApplicants = useMemo(() => {
    const term = search.trim().toLowerCase();
    return applicants.filter((application) => {
      if (filter !== 'all' && application.status !== filter) return false;
      if (!term) return true;
      const profile = application.student_profiles || {};
      return [profile.full_name, profile.roll_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [applicants, filter, search]);

  const filterCount = (status) => status === 'all' ? applicants.length : applicants.filter((item) => item.status === status).length;

  const selectJob = (job) => {
    setSelectedJobId(job.id);
    setJobPickerOpen(false);
    setFilter('all');
    setSearch('');
  };

  const changeStage = (application, stage) => {
    const profile = application.student_profiles || {};
    Alert.alert(
      'Move candidate?',
      `Set ${profile.full_name || 'this candidate'} to “${stageLabel(stage)}”? The student receives the corresponding recruitment update.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdatingId(application.id);
            try {
              await applicationsApi.updateStage(application.id, stage);
              const nextStatus = stageToStatus(stage);
              applicationsState.setData((old) => {
                const update = (items) => (items || []).map((item) => item.id === application.id ? { ...item, stage, status: nextStatus } : item);
                return Array.isArray(old) ? update(old) : { ...(old || {}), applications: update(old?.applications) };
              });
            } catch (err) {
              Alert.alert('Could not update candidate', err?.response?.data?.error || 'Please try again.');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  const exportApplicants = async () => {
    if (!activeJob) return;
    setExporting(true);
    try {
      const html = buildApplicantsReportHtml(activeJob, filteredApplicants.map((item) => ({ ...item, stage: deriveStage(item) })));
      await createAndSharePdf(html, `Share ${activeJob.title} applicant report`);
    } catch (error) {
      Alert.alert('Could not export applicants', error?.message || 'Please try again on an Android or iOS device.');
    } finally {
      setExporting(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      jobsState.reload({ refresh: true }).catch(() => {}),
      applicationsState.reload({ refresh: true }).catch(() => {}),
    ]);
  };

  if (!activeJob && jobsState.loading) return <><AppHeader navigation={navigation} title="Applicants" /><LoadingState label="Loading job postings…" /></>;
  if (!activeJob && jobsState.error) return <><AppHeader navigation={navigation} title="Applicants" /><ErrorState message={jobsState.error} onRetry={() => jobsState.reload().catch(() => {})} /></>;
  if (!activeJob) return <><AppHeader navigation={navigation} title="Applicants" /><EmptyState title="No job postings yet" body="Create a job posting before managing its applicants." /></>;
  if (applicationsState.loading) return <><AppHeader navigation={navigation} title="Applicants" subtitle={activeJob.title} /><LoadingState label="Loading candidates…" /></>;
  if (applicationsState.error) return <><AppHeader navigation={navigation} title="Applicants" subtitle={activeJob.title} /><ErrorState message={applicationsState.error} onRetry={() => applicationsState.reload().catch(() => {})} /></>;

  return (
    <>
      <AppHeader navigation={navigation} title="Applicants" subtitle={activeJob.title} />
      <Screen scroll={false}>
        <FlatList
          data={filteredApplicants}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={jobsState.refreshing || applicationsState.refreshing} onRefresh={() => refreshAll().catch(() => {})} />}
          contentContainerStyle={[styles.list, !filteredApplicants.length && styles.empty]}
          ListHeaderComponent={<>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.count}>{filteredApplicants.length} candidate{filteredApplicants.length === 1 ? '' : 's'}</Text>
                <Text style={styles.sub}>Search, filter, export, and update the recruitment pipeline from one place.</Text>
              </View>
              <AppButton title="Export PDF" compact variant="outline" onPress={exportApplicants} loading={exporting} />
            </View>

            <Text style={styles.fieldLabel}>Selected job</Text>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: jobPickerOpen }} onPress={() => setJobPickerOpen((open) => !open)} style={({ pressed }) => [styles.jobSelector, pressed && styles.pressed]}>
              <View style={styles.jobSelectorIcon}><Ionicons name="briefcase-outline" size={18} color={colors.primary} /></View>
              <View style={styles.jobSelectorBody}><Text style={styles.jobSelectorTitle} numberOfLines={1}>{activeJob.title}</Text><Text style={styles.jobSelectorMeta}>{activeJob.package_lpa ? `${activeJob.package_lpa} LPA` : 'Package not stated'} · {activeJob.approval_status || activeJob.status || 'posting'}</Text></View>
              <Ionicons name={jobPickerOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={19} color={colors.muted} />
            </Pressable>
            {jobPickerOpen ? <Card style={styles.jobOptions}>
              <Text style={styles.optionIntro}>Choose a posting to manage its applicants.</Text>
              {jobs.map((job) => <Pressable key={job.id} accessibilityRole="radio" accessibilityState={{ selected: job.id === selectedJobId }} onPress={() => selectJob(job)} style={[styles.jobOption, job.id === selectedJobId && styles.jobOptionSelected]}>
                <View style={styles.optionBody}><Text style={[styles.optionTitle, job.id === selectedJobId && styles.optionTitleSelected]} numberOfLines={1}>{job.title}</Text><Text style={styles.optionMeta}>{job.package_lpa ? `${job.package_lpa} LPA` : 'Package not stated'} · {job.approval_status || job.status || 'posting'}</Text></View>
                {job.id === selectedJobId ? <Ionicons name="checkmark-circle" size={19} color={colors.primary} /> : null}
              </Pressable>)}
            </Card> : null}

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={colors.muted} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search by student name or roll number" placeholderTextColor="#94A3B8" style={styles.searchInput} autoCapitalize="none" />
              {search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
            </View>

            <View style={styles.filters}>
              {FILTERS.map((status) => {
                const active = filter === status;
                return <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setFilter(status)} style={[styles.filter, active && styles.filterActive]}>
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{filterLabel(status)} ({filterCount(status)})</Text>
                </Pressable>;
              })}
            </View>
            {search || filter !== 'all' ? <Text style={styles.filteredInfo}>Showing {filteredApplicants.length} of {applicants.length} applicants</Text> : null}
          </>}
          ListEmptyComponent={<EmptyState title="No applicants found" body={applicants.length ? 'Try clearing the search or changing the status filter.' : 'Applicants will appear after students submit their applications.'} />}
          renderItem={({ item }) => {
            const profile = item.student_profiles || {};
            const currentStage = deriveStage(item);
            const busy = updatingId === item.id;
            return (
              <Card style={styles.card}>
                <View style={styles.top}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{(profile.full_name || 'S')[0].toUpperCase()}</Text></View>
                  <View style={styles.body}>
                    <Text style={styles.name}>{profile.full_name || 'Student'}</Text>
                    <Text style={styles.meta}>{profile.roll_number || 'No roll number'} · {profile.branch || 'Branch not stated'}</Text>
                    <Text style={styles.meta}>CGPA {profile.cgpa ?? '—'} · Backlogs {profile.backlogs ?? '—'} · Applied {formatDate(item.applied_at)}</Text>
                  </View>
                  <Badge tone={statusTone(item.status || currentStage)}>{stageLabel(currentStage)}</Badge>
                </View>
                <View style={styles.links}>
                  {profile.users?.email || item.users?.email ? <Text style={styles.email} numberOfLines={1}>{profile.users?.email || item.users?.email}</Text> : <Text style={styles.email}>No email provided</Text>}
                  {profile.resume_url ? <Pressable accessibilityRole="button" onPress={() => openResume(profile.resume_url)} style={styles.resume}><Ionicons name="document-outline" size={15} color={colors.primary} /><Text style={styles.resumeText}>Open resume</Text></Pressable> : null}
                </View>
                <Text style={styles.pipelineLabel}>Recruitment stage</Text>
                <View style={styles.stageRow}>
                  {STAGES.map((stage) => <Pressable key={stage} disabled={Boolean(updatingId)} accessibilityRole="button" accessibilityState={{ selected: currentStage === stage, disabled: Boolean(updatingId) }} onPress={() => currentStage !== stage && changeStage(item, stage)} style={[styles.stage, currentStage === stage && styles.stageSelected, busy && styles.stageBusy]}><Text numberOfLines={1} style={[styles.stageText, currentStage === stage && styles.stageTextSelected]}>{stageLabel(stage)}</Text></Pressable>)}
                </View>
                {busy ? <Text style={styles.updating}>Updating candidate stage…</Text> : null}
              </Card>
            );
          }}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, gap: 10 },
  empty: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  headerCopy: { flex: 1 },
  count: { color: colors.text, fontSize: 21, fontWeight: '900' },
  sub: { color: colors.muted, marginTop: 3, lineHeight: 18, fontSize: 12 },
  fieldLabel: { color: colors.text, fontWeight: '800', fontSize: 12, marginBottom: 6 },
  jobSelector: { minHeight: 60, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  jobSelectorIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  jobSelectorBody: { flex: 1, minWidth: 0 },
  jobSelectorTitle: { color: colors.text, fontWeight: '900', fontSize: 14 },
  jobSelectorMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  jobOptions: { marginBottom: 10, padding: 9 },
  optionIntro: { color: colors.muted, fontSize: 11, marginHorizontal: 4, marginVertical: 4 },
  jobOption: { minHeight: 52, borderRadius: 9, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  jobOptionSelected: { backgroundColor: '#EEF2FF' },
  optionBody: { flex: 1, minWidth: 0 },
  optionTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  optionTitleSelected: { color: colors.primary },
  optionMeta: { color: colors.muted, fontSize: 10, marginTop: 2 },
  searchBox: { minHeight: 46, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
  filter: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 99, backgroundColor: colors.white },
  filterActive: { backgroundColor: '#EEF2FF', borderColor: colors.primary },
  filterText: { color: colors.muted, fontWeight: '800', fontSize: 11 },
  filterTextActive: { color: colors.primary },
  filteredInfo: { color: colors.muted, fontSize: 11, marginBottom: 9 },
  card: { marginBottom: 1 },
  top: { flexDirection: 'row', alignItems: 'center' },
  avatar: { height: 42, width: 42, borderRadius: 13, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: colors.primary, fontWeight: '900', fontSize: 17 },
  body: { flex: 1, paddingRight: 7, minWidth: 0 },
  name: { color: colors.text, fontWeight: '900', fontSize: 16 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  links: { marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  email: { color: colors.muted, fontSize: 11, flex: 1 },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resumeText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  pipelineLabel: { color: colors.text, fontWeight: '800', fontSize: 12, marginTop: 12, marginBottom: 7 },
  stageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stage: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, maxWidth: '48%' },
  stageSelected: { backgroundColor: '#EEF2FF', borderColor: colors.primary },
  stageBusy: { opacity: 0.58 },
  stageText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  stageTextSelected: { color: colors.primary },
  updating: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 8 },
  pressed: { opacity: 0.74 },
});
