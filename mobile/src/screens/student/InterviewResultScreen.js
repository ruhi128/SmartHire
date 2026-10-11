import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { AppButton, Card, SectionTitle } from '../../components/Ui';
import { colors, spacing } from '../../constants/theme';

function formatDuration(value = 0) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function gradeFor(score = 0) {
  if (score >= 85) return 'A+';
  if (score >= 75) return 'A';
  if (score >= 65) return 'B+';
  if (score >= 55) return 'B';
  if (score >= 45) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export default function InterviewResultScreen({ navigation, route }) {
  const { score = {}, durationSeconds = 0, sessionId } = route.params || {};
  const feedback = score.feedback || { strengths: [], improvements: [], tips: [] };
  const overall = Number(score.overall) || 0;
  const grade = gradeFor(overall);

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.check, { backgroundColor: overall >= 70 ? colors.success : overall >= 40 ? colors.warning : colors.primary }]}>
          <Ionicons name={overall >= 70 ? 'checkmark' : 'chatbubbles-outline'} size={35} color={colors.white} />
        </View>
        <Text style={styles.title}>Practice saved</Text>
        <Text style={styles.subtitle}>Your typed responses and text-only feedback are now in your interview history.</Text>
      </View>

      <Card style={styles.scoreCard}>
        <Text style={styles.score}>{overall}</Text>
        <Text style={styles.scoreCaption}>Text practice score · Grade {grade}</Text>
        <Text style={styles.duration}>{formatDuration(durationSeconds)} · {score.averageWords ?? 0} average words per response</Text>
        {sessionId ? <Text style={styles.saved}>Saved to SmartHire history</Text> : null}
      </Card>

      <Card style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={19} color={colors.info} />
        <Text style={styles.disclaimerText}>This feedback reflects typed-answer heuristics only. It is not a voice, video, emotion, identity, attention, secure-proctoring, or employment evaluation.</Text>
      </Card>

      <SectionTitle title="Text feedback breakdown" />
      <Card style={styles.metrics}>
        <Metric label="Relevance" value={score.relevance} />
        <Metric label="Content" value={score.content} />
        <Metric label="Structure" value={score.structure} />
        <Metric label="Wording" value={score.confidence} />
      </Card>

      <SectionTitle title="What worked" />
      <BulletCard values={feedback.strengths} color={colors.success} empty="Complete more practice to surface strengths." />
      <SectionTitle title="Practice next" />
      <BulletCard values={feedback.improvements} color={colors.warning} empty="Keep using specific, truthful examples." />
      {(feedback.tips || []).length ? <><SectionTitle title="Tips" /><BulletCard values={feedback.tips} color={colors.primary} /></> : null}

      <AppButton title="View interview history" onPress={() => navigation.navigate('InterviewHub', { refreshKey: Date.now() })} style={styles.button} />
      <AppButton title="Start another practice" variant="outline" onPress={() => navigation.replace('MockInterview')} style={styles.secondaryButton} />
    </Screen>
  );
}

function Metric({ label, value }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value ?? 0}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function BulletCard({ values = [], color, empty }) {
  const content = values.length ? values : [empty].filter(Boolean);
  return <Card>{content.map((item, index) => <View key={`${item}-${index}`} style={styles.bullet}><View style={[styles.bulletDot, { backgroundColor: color }]} /><Text style={styles.bulletText}>{item}</Text></View>)}</Card>;
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.sm },
  check: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontWeight: '900', fontSize: 24, marginTop: 13 },
  subtitle: { color: colors.muted, lineHeight: 19, marginTop: 5, textAlign: 'center', maxWidth: 380 },
  scoreCard: { alignItems: 'center' },
  score: { color: colors.primary, fontSize: 48, fontWeight: '900' },
  scoreCaption: { color: colors.text, fontWeight: '800', fontSize: 15 },
  duration: { color: colors.muted, marginTop: 5, fontSize: 12 },
  saved: { color: colors.success, fontSize: 12, fontWeight: '800', marginTop: 8 },
  disclaimer: { flexDirection: 'row', gap: 9, marginTop: 13, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  disclaimerText: { color: '#1E40AF', flex: 1, fontSize: 12, lineHeight: 18 },
  metrics: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center', flex: 1 },
  metricValue: { color: colors.primary, fontWeight: '900', fontSize: 19 },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 3, textAlign: 'center' },
  bullet: { flexDirection: 'row', gap: 9, marginBottom: 10 },
  bulletDot: { height: 7, width: 7, borderRadius: 4, marginTop: 6 },
  bulletText: { flex: 1, color: colors.text, lineHeight: 19 },
  button: { marginTop: spacing.lg },
  secondaryButton: { marginTop: spacing.sm },
});
