import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { Badge, Card, ErrorState, LoadingState, SectionTitle } from '../../components/Ui';
import { interviewApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors, spacing } from '../../constants/theme';
import { formatDateTime } from '../../utils/format';

function durationLabel(value = 0) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function InterviewSessionDetailScreen({ navigation, route }) {
  const { sessionId } = route.params || {};
  const { data, loading, error, reload } = useAsyncData(() => interviewApi.session(sessionId), [sessionId]);

  if (loading) return <><AppHeader navigation={navigation} title="Interview session" /><Screen hasHeader><LoadingState label="Loading saved practice…" /></Screen></>;
  if (error) return <><AppHeader navigation={navigation} title="Interview session" /><Screen hasHeader><ErrorState message={error} onRetry={() => reload().catch(() => {})} /></Screen></>;

  const session = data?.session || {};
  const feedback = session.feedback || {};
  const scores = feedback.scores || {};
  const typed = session.practiceMode === 'typed-practice' || feedback.mode === 'typed-practice';

  return (
    <>
      <AppHeader navigation={navigation} title="Interview session" />
      <Screen hasHeader>
        <Card>
          <View style={styles.summaryTop}><Badge tone={typed ? 'info' : 'neutral'}>{typed ? 'Typed practice' : 'Saved interview'}</Badge><Text style={styles.grade}>Grade {session.grade || '—'}</Text></View>
          <Text style={styles.score}>{session.overallScore ?? 0}</Text>
          <Text style={styles.scoreLabel}>{typed ? 'Text practice score' : 'Overall score'}</Text>
          <Text style={styles.meta}>{formatDateTime(session.conductedAt)} · {durationLabel(session.durationSeconds)}</Text>
        </Card>

        {typed ? <Card style={styles.boundary}><Text style={styles.boundaryTitle}>Text-only feedback</Text><Text style={styles.boundaryBody}>This session was calculated from the saved typed responses. No camera, microphone, facial-expression, eye-contact, emotion, identity, attention, or employability data was collected or inferred.</Text></Card> : null}

        {Object.keys(scores).length ? <>
          <SectionTitle title="Text feedback breakdown" />
          <Card style={styles.metrics}>
            <Metric label="Relevance" value={scores.relevance} />
            <Metric label="Content" value={scores.content} />
            <Metric label="Structure" value={scores.structure} />
            <Metric label="Wording" value={scores.confidence} />
          </Card>
        </> : null}

        <SectionTitle title="Saved feedback" />
        <FeedbackGroup title="What worked" values={feedback.strengths} color={colors.success} />
        <FeedbackGroup title="Practice next" values={feedback.improvements} color={colors.warning} />
        <FeedbackGroup title="Tips" values={feedback.tips} color={colors.primary} />
        {!((feedback.strengths || []).length || (feedback.improvements || []).length || (feedback.tips || []).length) ? <Card><Text style={styles.muted}>No written feedback was saved with this session.</Text></Card> : null}

        <SectionTitle title="Your responses" />
        {(session.transcript || []).length ? (session.transcript || []).map((item, index) => (
          <Card key={`${item.question || 'response'}-${index}`} style={styles.transcript}>
            <Text style={styles.question}>Q{index + 1}. {item.question || 'Interview prompt'}</Text>
            <Text style={styles.answer}>{item.answer || 'No response was saved for this prompt.'}</Text>
          </Card>
        )) : <Card><Text style={styles.muted}>No responses were saved for this session.</Text></Card>}
      </Screen>
    </>
  );
}

function Metric({ label, value }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value ?? 0}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function FeedbackGroup({ title, values = [], color }) {
  if (!values.length) return null;
  return (
    <Card style={styles.feedbackCard}>
      <Text style={[styles.feedbackTitle, { color }]}>{title}</Text>
      {values.map((item, index) => <View key={`${item}-${index}`} style={styles.feedbackItem}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={styles.feedbackText}>{item}</Text></View>)}
    </Card>
  );
}

const styles = StyleSheet.create({
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grade: { color: colors.muted, fontWeight: '800', fontSize: 13 },
  score: { color: colors.primary, fontSize: 42, fontWeight: '900', textAlign: 'center', marginTop: 12 },
  scoreLabel: { color: colors.text, fontWeight: '800', textAlign: 'center' },
  meta: { color: colors.muted, textAlign: 'center', marginTop: 6, fontSize: 12 },
  boundary: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', marginTop: spacing.md },
  boundaryTitle: { color: '#1E3A8A', fontWeight: '900' },
  boundaryBody: { color: '#1E40AF', fontSize: 12, lineHeight: 18, marginTop: 6 },
  metrics: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center', flex: 1 },
  metricValue: { color: colors.primary, fontWeight: '900', fontSize: 18 },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 3, textAlign: 'center' },
  feedbackCard: { marginBottom: 10 },
  feedbackTitle: { fontWeight: '900', marginBottom: 9 },
  feedbackItem: { flexDirection: 'row', gap: 9, marginBottom: 8 },
  dot: { height: 7, width: 7, borderRadius: 4, marginTop: 6 },
  feedbackText: { flex: 1, color: colors.text, lineHeight: 19 },
  transcript: { marginBottom: 10 },
  question: { color: colors.text, fontWeight: '800', lineHeight: 20 },
  answer: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  muted: { color: colors.muted, lineHeight: 19 },
});
