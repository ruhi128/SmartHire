import { useState } from 'react';
import { Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { AppButton, Badge, Card, EmptyState, ErrorState, FormInput, LoadingState } from '../../components/Ui';
import { jobsApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors, spacing } from '../../constants/theme';
import { formatDate, statusTone } from '../../utils/format';

async function openDocument(url, label) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error('This device cannot open that document link.');
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert(`Could not open ${label}`, error?.message || 'Please try again.');
  }
}

export default function AdminJobApprovalsScreen({ navigation }) {
  const { data, setData, loading, refreshing, error, reload } = useAsyncData(() => jobsApi.pending(), []);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [notes, setNotes] = useState({});
  const [actingId, setActingId] = useState(null);
  const jobs = Array.isArray(data) ? data : [];

  const setNote = (jobId, note) => setNotes((old) => ({ ...old, [jobId]: note }));

  const decide = (job, action) => {
    const approving = action === 'approve';
    const note = (notes[job.id] || '').trim();
    Alert.alert(
      approving ? 'Approve and publish job?' : 'Reject job posting?',
      approving
        ? 'Eligible students will be notified and can see this job immediately.'
        : (note ? `The recruiter will receive this reason:\n\n${note}` : 'The job will remain hidden. Add an optional reviewer note below if you want to explain the decision to the recruiter.'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approving ? 'Approve & publish' : 'Reject',
          style: approving ? 'default' : 'destructive',
          onPress: async () => {
            setActingId(job.id);
            try {
              await jobsApi.approve(job.id, action, note);
              setData((old) => (old || []).filter((item) => item.id !== job.id));
              setExpandedJobId(null);
              Alert.alert(approving ? 'Job approved' : 'Job rejected', approving ? 'The role is live for eligible students and the recruiter has been notified.' : 'The recruiter has been notified of the decision.');
            } catch (err) {
              Alert.alert('Could not update job', err?.response?.data?.error || 'Please try again.');
            } finally {
              setActingId(null);
            }
          },
        },
      ],
    );
  };

  if (loading) return <><AppHeader navigation={navigation} title="Job approvals" /><LoadingState /></>;
  if (error) return <><AppHeader navigation={navigation} title="Job approvals" /><ErrorState message={error} onRetry={() => reload().catch(() => {})} /></>;

  return (
    <>
      <AppHeader navigation={navigation} title="Job approvals" subtitle="Recruiter submissions awaiting publication" />
      <Screen scroll={false}>
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
          contentContainerStyle={[styles.list, !jobs.length && styles.empty]}
          ListHeaderComponent={<>
            <Card style={styles.notice}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.noticeText}>Review the full posting, attached PDFs, and eligibility before publishing. Your optional note is shared with the recruiter when you decide.</Text>
            </Card>
            <Text style={styles.count}>{jobs.length} pending posting{jobs.length === 1 ? '' : 's'}</Text>
          </>}
          ListEmptyComponent={<EmptyState title="All caught up" body="There are no recruiter job postings awaiting review." />}
          renderItem={({ item }) => {
            const expanded = expandedJobId === item.id;
            const busy = actingId === item.id;
            return (
              <Card style={styles.card}>
                <View style={styles.heading}>
                  <View style={styles.logo}><Ionicons name="business-outline" size={21} color={colors.primary} /></View>
                  <View style={styles.headingText}>
                    <Text style={styles.company}>{item.companies?.name || 'Company'}</Text>
                    <Text style={styles.title}>{item.title}</Text>
                    <View style={styles.badgeRow}>
                      <Badge tone="warning">Pending review</Badge>
                      <Badge tone={item.job_type === 'internship' ? 'info' : item.job_type === 'contract' ? 'warning' : 'success'}>{item.job_type || 'full-time'}</Badge>
                    </View>
                  </View>
                  <Text style={styles.package}>{item.package_lpa} LPA</Text>
                </View>

                <Text style={styles.description} numberOfLines={expanded ? undefined : 3}>{item.description || 'No description provided.'}</Text>
                <View style={styles.details}>
                  <Text style={styles.detail}>Deadline {formatDate(item.deadline)}</Text>
                  {item.drive_date ? <Text style={styles.detail}>Drive {formatDate(item.drive_date)}</Text> : null}
                  <Text style={styles.detail}>CGPA {item.min_cgpa || 0}+</Text>
                  <Text style={styles.detail}>≤ {item.max_backlogs ?? 0} backlogs</Text>
                </View>

                <Pressable accessibilityRole="button" onPress={() => setExpandedJobId(expanded ? null : item.id)} style={({ pressed }) => [styles.reviewToggle, pressed && styles.pressed]}>
                  <Text style={styles.reviewToggleText}>{expanded ? 'Hide review details' : 'Review posting and decide'}</Text>
                  <Ionicons name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={17} color={colors.primary} />
                </Pressable>

                {expanded ? <View style={styles.expanded}>
                  <Detail title="Eligible branches" value={item.eligible_branches?.length ? item.eligible_branches.join(', ') : 'All branches'} />
                  <Detail title="Required skills" value={item.required_skills?.length ? item.required_skills.join(', ') : 'Not specified'} />
                  {item.rounds ? <Detail title="Selection rounds" value={item.rounds} /> : null}

                  {item.jd_doc_url || item.eval_doc_url ? <View style={styles.documentBlock}>
                    <Text style={styles.sectionLabel}>Attached documents</Text>
                    <Text style={styles.documentsHint}>Open each recruiter-provided PDF in the device viewer before making a decision.</Text>
                    {item.jd_doc_url ? <AppButton title="Open job description PDF" variant="outline" compact onPress={() => openDocument(item.jd_doc_url, 'job description PDF')} style={styles.documentButton} /> : null}
                    {item.eval_doc_url ? <AppButton title="Open evaluation details PDF" variant="outline" compact onPress={() => openDocument(item.eval_doc_url, 'evaluation details PDF')} style={styles.documentButton} /> : null}
                  </View> : null}

                  <FormInput
                    label="Note to recruiter (optional)"
                    value={notes[item.id] || ''}
                    onChangeText={(value) => setNote(item.id, value)}
                    placeholder="For example: Please clarify the assessment criteria or update the eligible branches."
                    multiline
                    inputStyle={styles.noteInput}
                  />
                  <Text style={styles.noteHelp}>For a rejection, this note is sent as the reviewer reason. You can also record an approval note.</Text>
                  <View style={styles.actions}>
                    <AppButton title="Reject" compact variant="outline" onPress={() => decide(item, 'reject')} loading={busy} disabled={Boolean(actingId && !busy)} style={styles.reject} />
                    <AppButton title="Approve & publish" compact onPress={() => decide(item, 'approve')} loading={busy} disabled={Boolean(actingId && !busy)} style={styles.approve} />
                  </View>
                </View> : null}
              </Card>
            );
          }}
        />
      </Screen>
    </>
  );
}

function Detail({ title, value }) {
  return <View style={styles.detailBlock}><Text style={styles.sectionLabel}>{title}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  notice: { flexDirection: 'row', gap: 9, backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', marginBottom: 13 },
  noticeText: { flex: 1, color: '#3730A3', fontSize: 12, lineHeight: 18 },
  count: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  card: { marginBottom: 12, padding: 0, overflow: 'hidden' },
  heading: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, paddingBottom: 9 },
  logo: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headingText: { flex: 1, minWidth: 0 },
  company: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  title: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  package: { color: colors.success, fontWeight: '900', fontSize: 12, marginLeft: 8 },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19, paddingHorizontal: spacing.md },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: spacing.md, marginTop: 11 },
  detail: { color: colors.muted, fontSize: 11, backgroundColor: '#F8FAFC', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  reviewToggle: { minHeight: 42, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 13, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewToggleText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  expanded: { padding: spacing.md, paddingTop: 3, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: colors.border },
  detailBlock: { marginTop: 12 },
  sectionLabel: { color: colors.text, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  detailValue: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  documentBlock: { marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border },
  documentsHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 4 },
  documentButton: { marginTop: 7 },
  noteInput: { minHeight: 92 },
  noteHelp: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -6 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 15 },
  reject: { flex: 1, borderColor: '#FCA5A5' },
  approve: { flex: 1, backgroundColor: colors.success, borderColor: colors.success },
  pressed: { opacity: 0.72 },
});
