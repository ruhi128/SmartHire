import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { AppButton, Badge, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import { companyOaApi, mockOaApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors, shadow, spacing } from '../../constants/theme';
import { formatDate } from '../../utils/format';

const sourceLabels = { company: 'Company OA', mock: 'Mock OA' };
const companyModes = [
  { key: 'pending', label: 'Pending review' },
  { key: 'all', label: 'All submissions' },
];

function statusDetails(status = 'pending') {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'approved') return { label: 'Approved', tone: 'success', icon: 'checkmark-circle-outline' };
  if (normalized === 'rejected') return { label: 'Rejected', tone: 'danger', icon: 'close-circle-outline' };
  return { label: 'Pending', tone: 'warning', icon: 'time-outline' };
}

function questionCount(test, source) {
  return test.question_count
    ?? test.mock_oa_questions?.length
    ?? test.questions?.length
    ?? (source === 'mock' ? test.mock_oa_questions?.length : 0)
    ?? 0;
}

function questionOptions(question) {
  if (Array.isArray(question?.options)) return question.options;
  if (typeof question?.options === 'string') {
    try {
      const parsed = JSON.parse(question.options);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function errorMessage(error) {
  return error?.response?.data?.error || error?.message || 'Please try again.';
}

function QuestionPreview({ question, index }) {
  const type = question.question_type || question.type || 'mcq';
  const options = questionOptions(question);
  const numericAnswer = Number(question.correct_index);
  const hasAnswerKey = Number.isInteger(numericAnswer) && numericAnswer >= 0;
  const text = question.question_text || question.text || 'Question text was not provided.';

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionMeta}>
        <Badge tone="info" style={styles.questionNumber}>Q{index + 1}</Badge>
        {question.section ? <Text style={styles.sectionChip}>{question.section}</Text> : null}
        <Text style={styles.markText}>{question.marks ?? 1} mark{Number(question.marks ?? 1) === 1 ? '' : 's'}</Text>
        <Text style={styles.questionType}>{String(type).replace(/_/g, ' ')}</Text>
      </View>

      <Text style={styles.questionText}>{text}</Text>

      {options.length ? (
        <View style={styles.options}>
          {options.map((option, optionIndex) => {
            const isCorrect = hasAnswerKey && optionIndex === numericAnswer;
            return (
              <View key={`${question.id || index}-${optionIndex}`} style={[styles.option, isCorrect && styles.correctOption]}>
                <Ionicons
                  name={isCorrect ? 'checkmark-circle' : 'ellipse-outline'}
                  size={17}
                  color={isCorrect ? colors.success : '#94A3B8'}
                />
                <Text style={[styles.optionText, isCorrect && styles.correctOptionText]}>
                  {String.fromCharCode(65 + optionIndex)}. {String(option)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.freeResponse}>Free-response question — no option answer key is configured.</Text>
      )}

      {question.explanation ? (
        <View style={styles.explanation}>
          <Ionicons name="bulb-outline" size={15} color={colors.primary} />
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function AdminOaReviewsScreen({ navigation }) {
  const [source, setSource] = useState('company');
  const [companyMode, setCompanyMode] = useState('pending');
  const [expandedKey, setExpandedKey] = useState(null);
  const [questionCache, setQuestionCache] = useState({});
  const [reviewerNotes, setReviewerNotes] = useState({});
  const [loadingQuestionsKey, setLoadingQuestionsKey] = useState(null);
  const [actingKey, setActingKey] = useState(null);

  const { data, setData, loading, refreshing, error, reload } = useAsyncData(async () => {
    if (source === 'company') {
      const response = companyMode === 'all' ? await companyOaApi.all() : await companyOaApi.pending();
      return response?.tests || [];
    }
    const response = await mockOaApi.pending();
    return response?.tests || [];
  }, [source, companyMode]);

  const tests = Array.isArray(data) ? data : [];
  const modeLabel = source === 'company' && companyMode === 'all' ? 'all Company OA submissions' : `pending ${sourceLabels[source]} submissions`;

  const switchSource = (nextSource) => {
    setSource(nextSource);
    setExpandedKey(null);
  };

  const switchCompanyMode = (nextMode) => {
    setCompanyMode(nextMode);
    setExpandedKey(null);
  };

  const cacheKeyFor = (test) => `${source}:${test.id}`;

  const previewQuestions = async (test) => {
    const cacheKey = cacheKeyFor(test);
    if (expandedKey === cacheKey) {
      setExpandedKey(null);
      return;
    }

    if (questionCache[cacheKey]) {
      setExpandedKey(cacheKey);
      return;
    }

    const embeddedMockQuestions = source === 'mock'
      ? (test.mock_oa_questions || test.questions)
      : null;
    if (Array.isArray(embeddedMockQuestions)) {
      setQuestionCache((current) => ({ ...current, [cacheKey]: embeddedMockQuestions }));
      setExpandedKey(cacheKey);
      return;
    }

    setLoadingQuestionsKey(cacheKey);
    try {
      const response = source === 'company'
        ? await companyOaApi.questions(test.id)
        : await mockOaApi.test(test.id);
      const questions = response?.questions || response?.mock_oa_questions || [];
      setQuestionCache((current) => ({ ...current, [cacheKey]: questions }));
      setExpandedKey(cacheKey);
    } catch (requestError) {
      Alert.alert('Could not load questions', errorMessage(requestError));
    } finally {
      setLoadingQuestionsKey(null);
    }
  };

  const updateLocalTest = (test, action, note) => {
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const testKey = cacheKeyFor(test);
    setData((current) => {
      const currentTests = Array.isArray(current) ? current : [];
      if (source === 'company' && companyMode === 'all') {
        return currentTests.map((item) => item.id === test.id
          ? { ...item, approval_status: newStatus, approval_note: note || '' }
          : item);
      }
      return currentTests.filter((item) => item.id !== test.id);
    });
    setExpandedKey(null);
    setReviewerNotes((current) => ({ ...current, [testKey]: '' }));
  };

  const makeDecision = async (test, action) => {
    const testKey = cacheKeyFor(test);
    const note = (reviewerNotes[testKey] || '').trim();
    setActingKey(testKey);
    try {
      if (source === 'company') {
        await companyOaApi.approve(test.id, action, note);
      } else if (action === 'approve') {
        await mockOaApi.approve(test.id);
      } else {
        await mockOaApi.reject(test.id, note);
      }
      updateLocalTest(test, action, note);
      Alert.alert(
        action === 'approve' ? 'Assessment approved' : 'Assessment rejected',
        action === 'approve'
          ? 'The assessment is now available in the appropriate student practice area.'
          : 'The assessment has been removed from the pending review queue.',
      );
    } catch (requestError) {
      Alert.alert('Could not update assessment', errorMessage(requestError));
    } finally {
      setActingKey(null);
    }
  };

  const confirmDecision = (test, action) => {
    const testKey = cacheKeyFor(test);
    const note = (reviewerNotes[testKey] || '').trim();
    const approve = action === 'approve';
    Alert.alert(
      approve ? 'Approve assessment?' : 'Reject assessment?',
      approve
        ? 'This will publish the assessment to eligible students.'
        : note
          ? 'The reviewer note will be saved with this rejection.'
          : 'You can optionally add a reviewer note before rejecting.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve & publish' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: () => makeDecision(test, action),
        },
      ],
    );
  };

  if (loading) {
    return <><AppHeader navigation={navigation} title="Assessment approvals" /><LoadingState label="Loading assessment submissions…" /></>;
  }

  if (error) {
    return <><AppHeader navigation={navigation} title="Assessment approvals" /><ErrorState message={error} onRetry={() => reload().catch(() => {})} /></>;
  }

  const renderHeader = () => (
    <View>
      <View style={styles.sourceTabs}>
        {['company', 'mock'].map((key) => {
          const active = source === key;
          return (
            <Pressable
              key={key}
              onPress={() => switchSource(key)}
              style={[styles.sourceTab, active && styles.sourceTabActive]}
            >
              <Ionicons
                name={key === 'company' ? 'business-outline' : 'school-outline'}
                color={active ? colors.primary : colors.muted}
                size={16}
              />
              <Text style={[styles.sourceTabText, active && styles.sourceTabTextActive]}>{sourceLabels[key]}</Text>
            </Pressable>
          );
        })}
      </View>

      {source === 'company' ? (
        <>
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={19} color={colors.primary} />
            <Text style={styles.infoText}>
              Review the assessment, answer key, and eligibility before publishing. A reviewer note is retained with the decision for the company.
            </Text>
          </View>
          <View style={styles.modeTabs}>
            {companyModes.map((mode) => (
              <Pressable
                key={mode.key}
                onPress={() => switchCompanyMode(mode.key)}
                style={[styles.modeTab, companyMode === mode.key && styles.modeTabActive]}
              >
                <Text style={[styles.modeText, companyMode === mode.key && styles.modeTextActive]}>{mode.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={19} color={colors.accent} />
          <Text style={styles.infoText}>Review the pending Mock OA questions and answer key before publishing it to students.</Text>
        </View>
      )}

      <Text style={styles.countText}>{tests.length} {tests.length === 1 ? 'assessment' : 'assessments'} · {modeLabel}</Text>
    </View>
  );

  const renderTest = ({ item: test }) => {
    const cacheKey = cacheKeyFor(test);
    const expanded = expandedKey === cacheKey;
    const loadingQuestions = loadingQuestionsKey === cacheKey;
    const acting = actingKey === cacheKey;
    const status = source === 'company' ? test.approval_status : (test.status || test.approval_status);
    const statusInfo = statusDetails(status);
    const pending = statusInfo.label === 'Pending';
    const questions = questionCache[cacheKey] || [];
    const note = reviewerNotes[cacheKey] || '';
    const testType = test.test_type || test.type || 'Assessment';
    const companyName = test.companies?.name || (source === 'mock' ? 'Recruiter submission' : 'Company');

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.ownerIcon, source === 'mock' && styles.mockOwnerIcon]}>
            <Ionicons
              name={source === 'company' ? 'business-outline' : 'school-outline'}
              size={22}
              color={source === 'company' ? colors.warning : colors.accent}
            />
          </View>
          <View style={styles.cardMain}>
            <View style={styles.titleLine}>
              <Text style={styles.title}>{test.title || 'Untitled assessment'}</Text>
              <Badge tone={statusInfo.tone} style={styles.statusBadge}>{statusInfo.label}</Badge>
            </View>
            <Text style={styles.owner}>{companyName}</Text>
          </View>
        </View>

        <View style={styles.metadataRow}>
          <View style={styles.metadataItem}><Ionicons name="pricetag-outline" size={14} color={colors.muted} /><Text style={styles.metadataText}>{String(testType).replace(/_/g, ' ')}</Text></View>
          <View style={styles.metadataItem}><Ionicons name="time-outline" size={14} color={colors.muted} /><Text style={styles.metadataText}>{test.duration || 0} min</Text></View>
          <View style={styles.metadataItem}><Ionicons name="help-circle-outline" size={14} color={colors.muted} /><Text style={styles.metadataText}>{questionCount(test, source)} questions</Text></View>
        </View>

        {test.description ? <Text numberOfLines={expanded ? undefined : 3} style={styles.description}>{test.description}</Text> : null}
        {source === 'company' ? (
          <Text style={styles.eligibility}>
            Eligible: {test.target_branches?.length ? test.target_branches.join(', ') : 'All branches'} · CGPA {test.min_cgpa || 0}+
          </Text>
        ) : null}
        {test.approval_note ? <Text style={styles.savedNote}>Reviewer note: {test.approval_note}</Text> : null}
        <Text style={styles.date}>Submitted {formatDate(test.created_at)}</Text>

        <Pressable onPress={() => previewQuestions(test)} style={styles.previewButton} disabled={loadingQuestions || acting}>
          {loadingQuestions ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={expanded ? 'chevron-up-outline' : 'eye-outline'} size={18} color={colors.primary} />}
          <Text style={styles.previewText}>{loadingQuestions ? 'Loading questions…' : expanded ? 'Hide question preview' : 'Preview questions & answer key'}</Text>
        </Pressable>

        {expanded ? (
          <View style={styles.expandedArea}>
            {test.instructions ? (
              <View style={styles.instructions}>
                <Text style={styles.detailLabel}>Instructions</Text>
                <Text style={styles.instructionsText}>{test.instructions}</Text>
              </View>
            ) : null}

            <Text style={styles.detailLabel}>Questions & answer key ({questions.length})</Text>
            {questions.length ? questions.map((question, index) => (
              <QuestionPreview key={String(question.id || index)} question={question} index={index} />
            )) : <Text style={styles.noQuestions}>No questions were returned for this assessment.</Text>}

            {pending ? (
              <View style={styles.decisionArea}>
                <Text style={styles.detailLabel}>Reviewer note</Text>
                <Text style={styles.noteHint}>Optional for approval; shared with the company when you reject.</Text>
                <TextInput
                  value={note}
                  onChangeText={(value) => setReviewerNotes((current) => ({ ...current, [cacheKey]: value }))}
                  placeholder="e.g. Please clarify the wording in question 3."
                  placeholderTextColor="#94A3B8"
                  multiline
                  editable={!acting}
                  style={styles.noteInput}
                />
                <View style={styles.decisionButtons}>
                  <AppButton
                    title="Reject"
                    compact
                    variant="danger"
                    style={styles.decisionButton}
                    onPress={() => confirmDecision(test, 'reject')}
                    loading={acting}
                  />
                  <AppButton
                    title="Approve & publish"
                    compact
                    variant="success"
                    style={styles.decisionButton}
                    onPress={() => confirmDecision(test, 'approve')}
                    loading={acting}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <AppHeader
        navigation={navigation}
        title="Assessment approvals"
        subtitle="Review Company OA and Mock OA submissions"
      />
      <Screen scroll={false}>
        <FlatList
          data={tests}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTest}
          extraData={{ expandedKey, questionCache, reviewerNotes, actingKey, loadingQuestionsKey, source, companyMode }}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={(
            <EmptyState
              title={source === 'company' && companyMode === 'all' ? 'No Company OA submissions' : `No pending ${sourceLabels[source]}`}
              body={source === 'company' && companyMode === 'pending'
                ? 'All caught up — there are no Company OA tests awaiting review.'
                : 'There are no assessment submissions in this view.'}
            />
          )}
          contentContainerStyle={[styles.list, !tests.length && styles.emptyList]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xl, gap: 12 },
  emptyList: { flexGrow: 1 },
  sourceTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sourceTab: { flex: 1, minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 11 },
  sourceTabActive: { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' },
  sourceTabText: { color: colors.muted, fontWeight: '800', fontSize: 13 },
  sourceTabTextActive: { color: colors.primary },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 12, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', marginBottom: 12 },
  infoText: { flex: 1, color: '#4338CA', fontSize: 12, lineHeight: 18 },
  modeTabs: { flexDirection: 'row', padding: 3, backgroundColor: '#E9EEF7', borderRadius: 11, marginBottom: 12 },
  modeTab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38, paddingHorizontal: 8, borderRadius: 8 },
  modeTabActive: { backgroundColor: colors.white, ...shadow },
  modeText: { color: colors.muted, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  modeTextActive: { color: colors.primary },
  countText: { color: colors.muted, fontSize: 12, marginBottom: 2 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 15, overflow: 'hidden', ...shadow },
  cardTop: { flexDirection: 'row', padding: 14, paddingBottom: 8, alignItems: 'flex-start' },
  ownerIcon: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF3C7', marginRight: 10 },
  mockOwnerIcon: { backgroundColor: '#E0F2FE' },
  cardMain: { flex: 1, minWidth: 0 },
  titleLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  title: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  statusBadge: { marginTop: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3 },
  owner: { color: colors.muted, fontSize: 12, marginTop: 4 },
  metadataRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14, paddingBottom: 5 },
  metadataItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metadataText: { color: colors.muted, fontSize: 11, textTransform: 'capitalize' },
  description: { color: colors.muted, lineHeight: 19, fontSize: 13, marginHorizontal: 14, marginTop: 7 },
  eligibility: { color: colors.primary, fontSize: 11, lineHeight: 17, marginHorizontal: 14, marginTop: 8 },
  savedNote: { color: colors.danger, fontSize: 12, fontStyle: 'italic', lineHeight: 18, marginHorizontal: 14, marginTop: 8 },
  date: { color: colors.muted, fontSize: 11, marginHorizontal: 14, marginTop: 9 },
  previewButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, margin: 14, marginTop: 11, minHeight: 39, borderRadius: 9, borderWidth: 1, borderColor: '#C7D2FE', backgroundColor: '#F8FAFF' },
  previewText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  expandedArea: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#F8FAFC', padding: 14, paddingTop: 13 },
  instructions: { padding: 11, marginBottom: 13, borderRadius: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE' },
  instructionsText: { color: '#334155', fontSize: 12, lineHeight: 18 },
  detailLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.55, marginBottom: 7 },
  questionCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 11, marginBottom: 10 },
  questionMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 },
  questionNumber: { paddingHorizontal: 7, paddingVertical: 2 },
  sectionChip: { color: colors.muted, fontSize: 10, fontWeight: '700', backgroundColor: '#F1F5F9', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  markText: { color: colors.success, fontSize: 10, fontWeight: '800' },
  questionType: { marginLeft: 'auto', color: colors.muted, fontSize: 10, fontStyle: 'italic', textTransform: 'capitalize' },
  questionText: { color: colors.text, lineHeight: 19, fontSize: 13, fontWeight: '600' },
  options: { marginTop: 10, gap: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#F8FAFC', paddingHorizontal: 9, paddingVertical: 8 },
  correctOption: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  optionText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 },
  correctOptionText: { color: '#166534', fontWeight: '800' },
  freeResponse: { color: colors.muted, fontSize: 12, fontStyle: 'italic', marginTop: 9, lineHeight: 17 },
  explanation: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#EEF2F7' },
  explanationText: { flex: 1, color: colors.primary, fontSize: 11, lineHeight: 17, fontStyle: 'italic' },
  noQuestions: { color: colors.muted, fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
  decisionArea: { marginTop: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  noteHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -3, marginBottom: 8 },
  noteInput: { minHeight: 82, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.white, color: colors.text, fontSize: 13, lineHeight: 19, paddingHorizontal: 11, paddingTop: 10, textAlignVertical: 'top' },
  decisionButtons: { flexDirection: 'row', gap: 9, marginTop: 11 },
  decisionButton: { flex: 1 },
});
