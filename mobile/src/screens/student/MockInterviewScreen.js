import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { AppButton, Badge, Card, SectionTitle } from '../../components/Ui';
import { interviewApi } from '../../api';
import { apiErrorMessage } from '../../api/client';
import { colors, spacing } from '../../constants/theme';
import { analyzeInterviewAnswer, INTERVIEW_QUESTIONS, scoreInterview } from '../../utils/interviewAnalysis';

function formatClock(value = 0) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
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

/**
 * A mobile-native, typed-answer version of SmartHire interview practice.
 * The answer heuristic mirrors the website's text feedback, but intentionally
 * does not substitute typed content for microphone/camera/biometric analysis.
 */
export default function MockInterviewScreen({ navigation }) {
  const [phase, setPhase] = useState('setup');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (phase !== 'practice' || !startedAt) return undefined;
    const updateClock = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [phase, startedAt]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (phase !== 'practice' || saving) return;
      event.preventDefault();
      Alert.alert(
        'Leave typed interview practice?',
        'Your current responses are only kept while this practice session is open. They will not be saved if you leave.',
        [
          { text: 'Keep practising', style: 'cancel' },
          { text: 'Leave without saving', style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, phase, saving]);

  const startPractice = () => {
    savingRef.current = false;
    setAnswers({});
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setStartedAt(Date.now());
    setPhase('practice');
  };

  const updateAnswer = (value) => {
    setAnswers((previous) => ({ ...previous, [currentIndex]: value }));
  };

  const finishPractice = async () => {
    if (savingRef.current) return;

    const transcript = INTERVIEW_QUESTIONS.map((question, index) => ({
      question,
      answer: String(answers[index] || '').trim(),
      timestamp: elapsedSeconds,
    }));
    const score = scoreInterview(transcript);
    const durationSeconds = Math.max(1, elapsedSeconds);

    savingRef.current = true;
    setSaving(true);
    try {
      const response = await interviewApi.save({
        durationSeconds,
        overallScore: score.overall,
        // Legacy camera/behavioural columns are deliberately unavailable in
        // the native typed flow. Text wording feedback is retained only in
        // aiFeedback.scores.confidence below, never repurposed as a biometric
        // or behavioural confidence signal.
        eyeContactScore: null,
        confidenceScore: null,
        attentionScore: null,
        stressScore: null,
        transcript,
        expressionLog: [],
        aiFeedback: {
          mode: 'typed-practice',
          summary: 'Feedback is calculated from typed practice responses only. It does not evaluate voice, video, emotion, identity, attention, or employability.',
          strengths: score.feedback.strengths,
          improvements: score.feedback.improvements,
          tips: score.feedback.tips,
          scores: {
            overall: score.overall,
            content: score.content,
            fluency: score.fluency,
            confidence: score.confidence,
            structure: score.structure,
            relevance: score.relevance,
          },
        },
      });
      navigation.replace('InterviewResult', {
        score,
        durationSeconds,
        sessionId: response?.sessionId || response?.session?.id || null,
      });
    } catch (error) {
      savingRef.current = false;
      setSaving(false);
      Alert.alert('Could not save practice session', apiErrorMessage(error, 'Your responses are still on this screen. Check your connection and try again.'));
    }
  };

  const requestFinish = () => {
    if (saving) return;
    const unanswered = INTERVIEW_QUESTIONS.filter((_, index) => !String(answers[index] || '').trim()).length;
    const body = unanswered
      ? `${unanswered} prompt${unanswered === 1 ? ' is' : 's are'} blank. Blank prompts receive no text-feedback credit. Save this practice session anyway?`
      : 'Save this typed practice session and view your feedback?';
    Alert.alert('Finish interview practice?', body, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Save and view feedback', onPress: finishPractice },
    ]);
  };

  if (phase === 'setup') {
    return (
      <>
        <AppHeader navigation={navigation} title="Mock interview" />
        <Screen hasHeader>
          <View style={styles.hero}>
            <View style={styles.heroIcon}><Ionicons name="chatbubbles-outline" size={34} color={colors.white} /></View>
            <Text style={styles.title}>Typed interview practice</Text>
            <Text style={styles.subtitle}>Answer five common interview prompts in your own words, then save transparent content feedback to your SmartHire history.</Text>
          </View>

          <Card style={styles.boundary}>
            <View style={styles.boundaryTitleRow}><Ionicons name="document-text-outline" size={20} color={colors.info} /><Text style={styles.boundaryTitle}>What this mobile session measures</Text></View>
            <Text style={styles.boundaryText}>It reviews only the text you type for relevance, detail, wording, and answer structure. It does not access or analyse your camera, microphone, facial expression, eye contact, emotion, identity, attention, or hiring suitability.</Text>
          </Card>

          <SectionTitle title="How it works" />
          <Card>
            <Step number="1" title="Answer at your pace" body="Move between prompts freely. Your typed response stays editable until you save." />
            <Step number="2" title="Use concrete examples" body="For practice, aim for 60–120 words and explain your personal contribution truthfully." />
            <Step number="3" title="Review saved feedback" body="Your session, responses, and text-only feedback are available from interview history." last />
          </Card>

          <SectionTitle title="Practice prompts" />
          <Card style={styles.promptList}>
            {INTERVIEW_QUESTIONS.map((question, index) => (
              <View key={question} style={[styles.promptPreview, index < INTERVIEW_QUESTIONS.length - 1 && styles.promptPreviewBorder]}>
                <View style={styles.promptNumber}><Text style={styles.promptNumberText}>{index + 1}</Text></View>
                <Text style={styles.promptPreviewText}>{question}</Text>
              </View>
            ))}
          </Card>
          <AppButton title="Start typed practice" onPress={startPractice} style={styles.startButton} />
        </Screen>
      </>
    );
  }

  const question = INTERVIEW_QUESTIONS[currentIndex];
  const answer = answers[currentIndex] || '';
  const answerScore = analyzeInterviewAnswer(question, answer);
  const answeredCount = INTERVIEW_QUESTIONS.filter((_, index) => String(answers[index] || '').trim()).length;
  const isLast = currentIndex === INTERVIEW_QUESTIONS.length - 1;

  return (
    <>
      <AppHeader
        navigation={navigation}
        title="Mock interview"
        subtitle={`Prompt ${currentIndex + 1} of ${INTERVIEW_QUESTIONS.length}`}
        right={<View style={styles.clock}><Ionicons name="time-outline" size={14} color="#FDE68A" /><Text style={styles.clockText}>{formatClock(elapsedSeconds)}</Text></View>}
      />
      <Screen hasHeader>
        <View style={styles.statusRow}>
          <Badge tone="info">Typed practice only</Badge>
          <Text style={styles.statusText}>{answeredCount} of {INTERVIEW_QUESTIONS.length} answered</Text>
        </View>

        <Card style={styles.questionCard}>
          <View style={styles.questionTop}>
            <View style={styles.questionIndex}><Text style={styles.questionIndexText}>{currentIndex + 1}</Text></View>
            <Text style={styles.questionLabel}>Interview prompt</Text>
          </View>
          <Text style={styles.question}>{question}</Text>
          <Text style={styles.tip}>Tip: Be specific about the context, your action, and the result. Typed feedback is most useful with an honest example.</Text>
        </Card>

        <Card style={styles.answerCard}>
          <View style={styles.answerHeader}>
            <Text style={styles.answerTitle}>Your typed response</Text>
            <Text style={[styles.wordCount, answerScore.wordCount >= 60 && answerScore.wordCount <= 150 && styles.wordCountIdeal]}>{answerScore.wordCount} words</Text>
          </View>
          <TextInput
            accessibilityLabel={`Typed response for prompt ${currentIndex + 1}`}
            multiline
            value={answer}
            onChangeText={updateAnswer}
            placeholder="Write your answer here…"
            placeholderTextColor="#94A3B8"
            textAlignVertical="top"
            style={styles.answerInput}
            editable={!saving}
          />
          <Text style={styles.answerHelp}>A practical target is 60–120 words; quality and truthful detail matter more than length.</Text>
        </Card>

        <Card style={styles.liveCard}>
          <View style={styles.liveHeader}><Ionicons name="analytics-outline" size={18} color={colors.primary} /><Text style={styles.liveTitle}>Text feedback preview</Text></View>
          <Text style={styles.liveNotice}>These are content heuristics from the text currently typed, not voice or behavioural scores.</Text>
          <View style={styles.metricGrid}>
            <MiniMetric label="Relevance" value={answerScore.relevanceScore} color={colors.primary} />
            <MiniMetric label="Wording" value={answerScore.confidenceScore} color={colors.accent} />
            <MiniMetric label="Structure" value={answerScore.structureScore} color={colors.warning} />
            <MiniMetric label="Detail" value={answerScore.lengthScore} color={colors.success} />
          </View>
        </Card>

        <Text style={styles.paletteTitle}>Prompts</Text>
        <View style={styles.palette}>
          {INTERVIEW_QUESTIONS.map((item, index) => {
            const selected = index === currentIndex;
            const completed = Boolean(String(answers[index] || '').trim());
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={`Prompt ${index + 1}${completed ? ', has response' : ''}${selected ? ', current' : ''}`}
                onPress={() => !saving && setCurrentIndex(index)}
                style={({ pressed }) => [styles.paletteButton, completed && styles.paletteCompleted, selected && styles.paletteCurrent, pressed && !saving && styles.pressed]}
              >
                <Text style={[styles.paletteText, (completed || selected) && styles.paletteTextActive]}>{index + 1}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.navigationRow}>
          <AppButton title="Previous" variant="outline" disabled={currentIndex === 0 || saving} onPress={() => setCurrentIndex((value) => Math.max(0, value - 1))} style={styles.navigationButton} />
          {isLast
            ? <AppButton title="Save practice" variant="success" loading={saving} onPress={requestFinish} style={styles.navigationButton} />
            : <AppButton title="Next prompt" disabled={saving} onPress={() => setCurrentIndex((value) => Math.min(INTERVIEW_QUESTIONS.length - 1, value + 1))} style={styles.navigationButton} />}
        </View>
        <AppButton title="Finish and save feedback" variant="ghost" loading={saving} onPress={requestFinish} style={styles.finishButton} />
      </Screen>
    </>
  );
}

function Step({ number, title, body, last = false }) {
  return (
    <View style={[styles.step, !last && styles.stepBorder]}>
      <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View>
      <View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepBody}>{body}</Text></View>
    </View>
  );
}

function MiniMetric({ label, value, color }) {
  const numeric = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={styles.metric}>
      <View style={styles.metricTop}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, { color }]}>{numeric}</Text></View>
      <View style={styles.metricTrack}><View style={[styles.metricFill, { width: `${numeric}%`, backgroundColor: color }]} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.sm },
  heroIcon: { height: 68, width: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 13, textAlign: 'center' },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 7, textAlign: 'center', maxWidth: 430 },
  boundary: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  boundaryTitleRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  boundaryTitle: { color: '#1E3A8A', fontWeight: '900', flex: 1 },
  boundaryText: { color: '#1E40AF', lineHeight: 20, marginTop: 8, fontSize: 13 },
  step: { flexDirection: 'row', gap: 11, paddingVertical: 12 },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  stepNumber: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0E7FF' },
  stepNumberText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  stepCopy: { flex: 1 },
  stepTitle: { color: colors.text, fontWeight: '800' },
  stepBody: { color: colors.muted, lineHeight: 19, marginTop: 3, fontSize: 13 },
  promptList: { paddingVertical: 3 },
  promptPreview: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 12 },
  promptPreviewBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  promptNumber: { height: 25, width: 25, borderRadius: 13, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  promptNumberText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  promptPreviewText: { flex: 1, color: colors.text, lineHeight: 19, fontSize: 13 },
  startButton: { marginTop: spacing.lg },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  clockText: { color: '#FEF3C7', fontVariant: ['tabular-nums'], fontSize: 13, fontWeight: '900' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, gap: 8 },
  statusText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  questionCard: { borderColor: '#C7D2FE' },
  questionTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  questionIndex: { height: 33, width: 33, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  questionIndexText: { color: colors.white, fontWeight: '900' },
  questionLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  question: { color: colors.text, fontSize: 18, fontWeight: '800', lineHeight: 26, marginTop: 14 },
  tip: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  answerCard: { marginTop: spacing.md },
  answerHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  answerTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  wordCount: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  wordCountIdeal: { color: colors.success },
  answerInput: { minHeight: 190, borderColor: colors.border, borderRadius: 11, borderWidth: 1, backgroundColor: '#FAFCFF', color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 11, padding: 12 },
  answerHelp: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 8 },
  liveCard: { marginTop: spacing.md, backgroundColor: '#FAFAFF' },
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveTitle: { color: colors.text, fontWeight: '900' },
  liveNotice: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 7 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 13 },
  metric: { width: '47%', minWidth: 130 },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  metricValue: { fontSize: 12, fontWeight: '900' },
  metricTrack: { height: 6, overflow: 'hidden', borderRadius: 99, backgroundColor: '#E2E8F0' },
  metricFill: { height: '100%', borderRadius: 99 },
  paletteTitle: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: spacing.lg, marginBottom: 8 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  paletteButton: { width: 42, height: 42, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  paletteCompleted: { backgroundColor: colors.primary, borderColor: colors.primary },
  paletteCurrent: { borderWidth: 2, borderColor: colors.navy },
  paletteText: { color: colors.muted, fontWeight: '900' },
  paletteTextActive: { color: colors.white },
  navigationRow: { flexDirection: 'row', gap: 9, marginTop: spacing.lg },
  navigationButton: { flex: 1 },
  finishButton: { marginTop: 10, marginBottom: spacing.md },
  pressed: { opacity: 0.78 },
});
