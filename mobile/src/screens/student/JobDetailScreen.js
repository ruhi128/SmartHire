import { useState } from 'react';
import { Alert, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { AppButton, Badge, Card, ErrorState, LoadingState, SectionTitle } from '../../components/Ui';
import { applicationsApi, jobsApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors, spacing } from '../../constants/theme';
import { DEMO_MODE } from '../../config/runtime';
import { formatDate, statusTone } from '../../utils/format';

async function openExternalDocument(url, label) {
  if (!url) return;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error('This device cannot open that document link.');
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert(`Could not open ${label}`, error?.message || 'Please try again.');
  }
}

export default function JobDetailScreen({ navigation, route }) {
  const { jobId } = route.params;
  const { data: job, loading, refreshing, error, reload } = useAsyncData(() => jobsApi.byId(jobId), [jobId]);
  const [applying, setApplying] = useState(false);
  const [localApplicationStatus, setLocalApplicationStatus] = useState(null);

  const apply = async () => {
    Alert.alert(
      DEMO_MODE ? 'Save local sample application?' : 'Submit application?',
      DEMO_MODE
        ? 'This changes only the local sample workspace and does not contact a recruiter or backend.'
        : 'Your current SmartHire profile will be used for this application.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: DEMO_MODE ? 'Save locally' : 'Apply',
          onPress: async () => {
            setApplying(true);
            try {
              const res = await applicationsApi.apply(jobId);
              setLocalApplicationStatus(res.application?.status || 'applied');
              Alert.alert('Application submitted', res.message || 'Your application was submitted successfully.');
            } catch (e) {
              Alert.alert('Could not apply', e?.response?.data?.error || 'Please try again.');
            } finally {
              setApplying(false);
            }
          },
        },
      ],
    );
  };

  if (loading) return <><AppHeader navigation={navigation} title="Job details" /><LoadingState /></>;
  if (error) return <><AppHeader navigation={navigation} title="Job details" /><ErrorState message={error} onRetry={() => reload().catch(() => {})} /></>;

  const applicationStatus = localApplicationStatus || job.application_status;
  const applied = Boolean(applicationStatus);
  const hasDocuments = Boolean(job.jd_doc_url || job.eval_doc_url);

  return (
    <>
      <AppHeader navigation={navigation} title="Job details" subtitle={job.companies?.name || 'Company'} />
      <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}>
        <Card>
          <View style={styles.companyRow}>
            <View style={styles.logo}><Ionicons name="business" color={colors.primary} size={25} /></View>
            <View style={styles.flex}>
              <Text style={styles.title}>{job.title}</Text>
              <Text style={styles.company}>{job.companies?.name || 'Company'}</Text>
            </View>
            {applicationStatus ? <Badge tone={statusTone(applicationStatus)}>{applicationStatus}</Badge> : null}
          </View>
          <View style={styles.infoGrid}>
            <Info icon="cash-outline" label="Package" value={job.package_lpa ? `${job.package_lpa} LPA` : 'Not stated'} />
            <Info icon="calendar-outline" label="Deadline" value={formatDate(job.deadline)} />
            <Info icon="school-outline" label="Min. CGPA" value={job.min_cgpa ?? '—'} />
            <Info icon="layers-outline" label="Max. backlogs" value={job.max_backlogs ?? '—'} />
          </View>
        </Card>

        <SectionTitle title="Role description" />
        <Card><Text style={styles.text}>{job.description || 'No job description was provided.'}</Text></Card>

        <SectionTitle title="Eligibility" />
        <Card>
          <Text style={styles.label}>Eligible branches</Text>
          <Text style={styles.text}>{job.eligible_branches?.length ? job.eligible_branches.join(', ') : 'All branches'}</Text>
          {job.required_skills?.length ? <>
            <Text style={[styles.label, styles.labelSpacing]}>Required skills</Text>
            <View style={styles.tags}>{job.required_skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</View>
          </> : null}
          {job.rounds ? <>
            <Text style={[styles.label, styles.labelSpacing]}>Selection rounds</Text>
            <Text style={styles.text}>{job.rounds}</Text>
          </> : null}
        </Card>

        {hasDocuments ? <>
          <SectionTitle title="Attached documents" />
          <Card>
            <Text style={styles.documentsIntro}>Open the recruiter-provided PDFs to review the role and any assessment instructions before applying.</Text>
            {job.jd_doc_url ? <AppButton title="Open job description PDF" variant="outline" compact onPress={() => openExternalDocument(job.jd_doc_url, 'job description PDF')} style={styles.documentButton} /> : null}
            {job.eval_doc_url ? <AppButton title="Open evaluation details PDF" variant="outline" compact onPress={() => openExternalDocument(job.eval_doc_url, 'evaluation details PDF')} style={styles.documentButton} /> : null}
          </Card>
        </> : null}

        {!DEMO_MODE && job.companies?.website ? <AppButton title="Visit company website" variant="outline" onPress={() => openExternalDocument(job.companies.website, 'company website')} style={styles.website} /> : null}
        <AppButton title={applied ? `Application ${applicationStatus}` : (DEMO_MODE ? 'Save local application' : 'Apply now')} onPress={apply} loading={applying} disabled={applied} style={styles.apply} />
      </Screen>
    </>
  );
}

function Info({ icon, label, value }) {
  return <View style={styles.info}><Ionicons name={icon} size={18} color={colors.primary} /><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  companyRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900' },
  company: { color: colors.muted, marginTop: 4 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15 },
  info: { width: '50%', marginBottom: 13 },
  infoLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },
  infoValue: { color: colors.text, fontWeight: '800', marginTop: 2 },
  text: { color: colors.muted, lineHeight: 22 },
  label: { color: colors.text, fontWeight: '800', marginBottom: 5 },
  labelSpacing: { marginTop: 17 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  documentsIntro: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  documentButton: { marginTop: 8 },
  website: { marginTop: spacing.lg },
  apply: { marginTop: spacing.md },
});
