import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from './AppHeader';
import Screen from './Screen';
import { AppButton, Badge, Card, ErrorState, LoadingState } from './Ui';
import { apiErrorMessage } from '../api/client';
import { colors, spacing } from '../constants/theme';

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function answerExists(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function optionsFor(question = {}) {
  if (Array.isArray(question.options)) return question.options;
  if (typeof question.options === 'string') {
    try {
      const parsed = JSON.parse(question.options);
      return Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? Object.values(parsed) : []);
    } catch {
      return [];
    }
  }
  if (question.options && typeof question.options === 'object') return Object.values(question.options);
  return [];
}

function questionType(question = {}) {
  const type = String(question.question_type || question.type || 'mcq').toLowerCase();
  return type === 'mcq' ? 'mcq' : type === 'coding' ? 'coding' : 'text';
}

function timerColor(seconds) {
  if (seconds < 60) return colors.danger;
  if (seconds < 180) return colors.warning;
  return colors.primary;
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Shared native attempt surface for server-backed timed assessments.
 * The caller owns endpoint-specific loading/submission while this component
 * consistently owns the timer, question navigation, flags, and safe submit.
 */
export default function TimedAssessmentAttempt({
  navigation,
  testId,
  fallbackTitle = 'Assessment',
  loadAssessment,
  submitAssessment,
  resultRoute,
  assessmentLabel = 'assessment',
  persistIntegrity = false,
}) {
  const [reloadKey, setReloadKey] = useState(0);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [deadline, setDeadline] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState([]);

  const answersRef = useRef({});
  const violationsRef = useRef([]);
  const submittingRef = useRef(false);
  const timerSubmittedRef = useRef(false);
  const autoTerminationRef = useRef(false);
  const pendingTerminationRef = useRef(false);
  const appStateRef = useRef(AppState.currentState || 'active');
  const submitRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!testId) {
        if (mounted) {
          setLoading(false);
          setLoadError(`This ${assessmentLabel} is missing an identifier. Return to the list and try again.`);
        }
        return;
      }

      setLoading(true);
      setLoadError('');
      setAssessment(null);
      setQuestions([]);
      setAnswers({});
      setFlagged({});
      setCurrentIndex(0);
      setDeadline(null);
      setRemainingSeconds(0);
      setStartedAt(0);
      setViolations([]);
      answersRef.current = {};
      violationsRef.current = [];
      submittingRef.current = false;
      timerSubmittedRef.current = false;
      autoTerminationRef.current = false;
      pendingTerminationRef.current = false;
      appStateRef.current = AppState.currentState || 'active';

      try {
        const response = await loadAssessment(testId);
        if (!mounted) return;
        const test = response?.test || null;
        const nextQuestions = Array.isArray(response?.questions) ? response.questions : [];
        if (!test) throw new Error(`The server did not return this ${assessmentLabel}.`);
        if (!nextQuestions.length) throw new Error(`This ${assessmentLabel} has no questions yet.`);

        const durationMinutes = Math.max(1, Number(test.duration ?? test.duration_minutes) || 15);
        const now = Date.now();
        setAssessment(test);
        setQuestions(nextQuestions);
        setStartedAt(now);
        setRemainingSeconds(durationMinutes * 60);
        setDeadline(now + durationMinutes * 60 * 1000);
      } catch (error) {
        if (mounted) setLoadError(apiErrorMessage(error, `Could not start this ${assessmentLabel}.`));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [assessmentLabel, loadAssessment, reloadKey, testId]);

  const submitAttempt = useCallback(async (autoSubmitted = false) => {
    if (!assessment || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    const snapshotViolations = violationsRef.current.slice();
    const integrityScore = Math.max(0, 100 - snapshotViolations.length * 5);
    const proctoring = {
      violations: snapshotViolations,
      integrityScore,
      terminated: autoTerminationRef.current,
    };

    try {
      const result = await submitAssessment({
        testId: assessment.id || testId,
        answers: answersRef.current,
        timeTaken: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
        autoSubmitted,
        proctoring,
      });
      navigation.replace(resultRoute, {
        result,
        title: assessment.title || fallbackTitle,
        autoSubmitted,
        submissionReason: autoTerminationRef.current ? 'foreground-switches' : (autoSubmitted ? 'time-limit' : 'manual'),
      });
    } catch (error) {
      submittingRef.current = false;
      setSubmitting(false);
      Alert.alert(`Could not submit ${assessmentLabel}`, apiErrorMessage(error, 'Your answers have not been submitted. Please try again.'));
    }
  }, [assessment, assessmentLabel, fallbackTitle, navigation, resultRoute, startedAt, submitAssessment, testId]);

  submitRef.current = submitAttempt;

  // A deadline keeps the countdown accurate if Android backgrounds the app.
  useEffect(() => {
    if (!deadline || submitting) return undefined;

    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0 && !timerSubmittedRef.current) {
        timerSubmittedRef.current = true;
        setTimeout(() => submitRef.current?.(true), 0);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline, submitting]);

  // A native application is already full screen, so use real app foreground
  // transitions as the honest mobile analogue of the website's tab-switch
  // signal. It is intentionally described as a client-side signal, not proof.
  useEffect(() => {
    if (!assessment) return undefined;

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (previousState === 'active' && (nextState === 'inactive' || nextState === 'background')) {
        const nextViolation = {
          type: 'app_background',
          detail: 'The assessment was moved out of the foreground.',
          at: new Date().toISOString(),
        };
        const nextViolations = [...violationsRef.current, nextViolation];
        violationsRef.current = nextViolations;
        setViolations(nextViolations);
        if (nextViolations.length >= 3) {
          autoTerminationRef.current = true;
          pendingTerminationRef.current = true;
        }
      }

      // Wait until the app is active again before an automatic network submit.
      if (nextState === 'active' && pendingTerminationRef.current) {
        pendingTerminationRef.current = false;
        setTimeout(() => submitRef.current?.(true), 0);
      }
    });

    return () => subscription.remove();
  }, [assessment]);

  // Avoid silently discarding an in-progress timed attempt through Android's
  // back gesture or the visible header button.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!assessment || submittingRef.current) return;
      event.preventDefault();
      Alert.alert(
        `Leave ${assessmentLabel}?`,
        'Your current answers are only saved when you submit the assessment.',
        [
          { text: 'Keep working', style: 'cancel' },
          { text: 'Leave test', style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
        ]
      );
    });
    return unsubscribe;
  }, [assessment, assessmentLabel, navigation]);

  const setAnswer = (questionId, value) => {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;
    setAnswers(next);
  };

  const clearAnswer = (questionId) => {
    const next = { ...answersRef.current };
    delete next[questionId];
    answersRef.current = next;
    setAnswers(next);
  };

  const toggleFlag = (questionId) => {
    setFlagged((previous) => ({ ...previous, [questionId]: !previous[questionId] }));
  };

  const requestSubmit = () => {
    if (!assessment || submitting) return;
    const unanswered = questions.filter((question) => !answerExists(answersRef.current[question.id])).length;
    const body = unanswered
      ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} unanswered. Submit anyway?`
      : 'All questions are answered. Submit this assessment now?';
    Alert.alert(`Submit ${assessmentLabel}?`, body, [
      { text: 'Keep reviewing', style: 'cancel' },
      { text: 'Submit', style: 'destructive', onPress: () => submitAttempt(false) },
    ]);
  };

  const title = assessment?.title || fallbackTitle;
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter((question) => answerExists(answers[question.id])).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const currentTimerColor = timerColor(remainingSeconds);

  if (loading) {
    return <><AppHeader navigation={navigation} title={title} /><Screen hasHeader><LoadingState label={`Preparing ${assessmentLabel}…`} /></Screen></>;
  }

  if (loadError || !assessment || !currentQuestion) {
    return (
      <>
        <AppHeader navigation={navigation} title={title} />
        <Screen hasHeader><ErrorState message={loadError || `This ${assessmentLabel} is unavailable.`} onRetry={() => setReloadKey((key) => key + 1)} /></Screen>
      </>
    );
  }

  const type = questionType(currentQuestion);
  const options = optionsFor(currentQuestion);
  const selectedOption = answers[currentQuestion.id];
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const foregroundLimit = 3;

  return (
    <>
      <AppHeader
        navigation={navigation}
        title={title}
        subtitle={`Question ${currentIndex + 1} of ${questions.length}`}
        right={<View style={[styles.headerTimer, { borderColor: `${currentTimerColor}66` }]}><Ionicons name="time-outline" size={15} color={colors.white} /><Text style={styles.headerTimerText}>{formatClock(remainingSeconds)}</Text></View>}
      />
      <Screen hasHeader>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>Timed {assessmentLabel}</Text>
              <Text style={styles.summaryTitle}>{title}</Text>
            </View>
            <View style={[styles.timer, { borderColor: `${currentTimerColor}44`, backgroundColor: `${currentTimerColor}14` }]}>
              <Ionicons name="time-outline" color={currentTimerColor} size={18} />
              <Text style={[styles.timerText, { color: currentTimerColor }]}>{formatClock(remainingSeconds)}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
          <View style={styles.summaryStats}>
            <Text style={styles.summaryStat}><Text style={styles.summaryStatValue}>{answeredCount}</Text> answered</Text>
            <Text style={styles.summaryStat}><Text style={styles.summaryStatValue}>{flaggedCount}</Text> flagged</Text>
            <Text style={styles.summaryStat}><Text style={styles.summaryStatValue}>{questions.length - answeredCount}</Text> remaining</Text>
          </View>
        </Card>

        <View style={[styles.foregroundNotice, violations.length > 0 && styles.foregroundNoticeWarn]}>
          <Ionicons name={violations.length ? 'warning-outline' : 'shield-checkmark-outline'} size={18} color={violations.length ? colors.warning : colors.info} />
          <View style={styles.foregroundCopy}>
            <Text style={[styles.foregroundTitle, violations.length > 0 && styles.foregroundTitleWarn]}>{violations.length ? `${violations.length} foreground switch${violations.length === 1 ? '' : 'es'} recorded` : 'Keep this assessment in the foreground'}</Text>
            <Text style={styles.foregroundText}>{violations.length >= foregroundLimit ? 'This assessment will submit when the app is active again.' : `Leaving the app ${foregroundLimit} times automatically submits the attempt.`}</Text>
          </View>
          {persistIntegrity ? <Badge tone={violations.length ? 'warning' : 'info'}>{Math.max(0, 100 - violations.length * 5)}/100</Badge> : null}
        </View>

        <Card style={[styles.questionCard, flagged[currentQuestion.id] && styles.questionCardFlagged]}>
          <View style={styles.questionTop}>
            <View style={styles.questionNumber}><Text style={styles.questionNumberText}>{currentIndex + 1}</Text></View>
            <View style={styles.questionTools}>
              {currentQuestion.section ? <Badge tone="info">{currentQuestion.section}</Badge> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={flagged[currentQuestion.id] ? 'Remove question flag' : 'Flag question for review'}
                onPress={() => toggleFlag(currentQuestion.id)}
                style={({ pressed }) => [styles.flagButton, flagged[currentQuestion.id] && styles.flagButtonActive, pressed && styles.pressed]}
              >
                <Ionicons name={flagged[currentQuestion.id] ? 'flag' : 'flag-outline'} size={15} color={flagged[currentQuestion.id] ? colors.warning : colors.muted} />
                <Text style={[styles.flagText, flagged[currentQuestion.id] && styles.flagTextActive]}>{flagged[currentQuestion.id] ? 'Flagged' : 'Flag'}</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.questionText}>{currentQuestion.question_text || 'Question text is unavailable.'}</Text>
          {currentQuestion.description ? <Text style={styles.questionDescription}>{currentQuestion.description}</Text> : null}
          <Text style={styles.marking}>{currentQuestion.marks || 0} mark{Number(currentQuestion.marks) === 1 ? '' : 's'}{Number(currentQuestion.negative_marks) ? ` · −${currentQuestion.negative_marks} for an incorrect answer` : ''}</Text>

          {type === 'mcq' ? (
            <View style={styles.options}>
              {options.map((option, optionIndex) => {
                const selected = selectedOption === optionIndex;
                return (
                  <Pressable
                    key={`${currentQuestion.id}-${optionIndex}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setAnswer(currentQuestion.id, optionIndex)}
                    style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
                  >
                    <View style={[styles.optionLetter, selected && styles.optionLetterSelected]}><Text style={[styles.optionLetterText, selected && styles.optionLetterTextSelected]}>{String.fromCharCode(65 + optionIndex)}</Text></View>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{String(option)}</Text>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
              {!options.length ? <Text style={styles.missingOptions}>No answer options were supplied for this question.</Text> : null}
            </View>
          ) : (
            <View style={styles.responseArea}>
              <View style={styles.responseHeading}>
                <Text style={styles.responseLabel}>{type === 'coding' ? 'Write your code or approach' : 'Write your response'}</Text>
                <Text style={styles.responseCount}>{type === 'text' ? `${wordCount(selectedOption)}${currentQuestion.word_limit ? ` / ${currentQuestion.word_limit} words` : ' words'}` : `${String(selectedOption || '').length} characters`}</Text>
              </View>
              {currentQuestion.starter_code ? <View style={styles.starterCode}><Text style={styles.starterLabel}>Starter code</Text><Text selectable style={styles.starterText}>{currentQuestion.starter_code}</Text></View> : null}
              <TextInput
                multiline
                value={typeof selectedOption === 'string' ? selectedOption : ''}
                onChangeText={(value) => setAnswer(currentQuestion.id, value)}
                placeholder={currentQuestion.placeholder || (type === 'coding' ? 'Write your solution or code here…' : 'Write your response here…')}
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
                style={[styles.responseInput, type === 'coding' && styles.codeInput]}
              />
            </View>
          )}

          {answerExists(selectedOption) ? <Pressable accessibilityRole="button" onPress={() => clearAnswer(currentQuestion.id)} style={styles.clearButton}><Ionicons name="close-circle-outline" size={15} color={colors.danger} /><Text style={styles.clearText}>Clear response</Text></Pressable> : null}
        </Card>

        <Text style={styles.paletteTitle}>Question palette</Text>
        <View style={styles.palette}>
          {questions.map((question, index) => {
            const isCurrent = index === currentIndex;
            const isAnswered = answerExists(answers[question.id]);
            const isFlagged = flagged[question.id];
            return (
              <Pressable
                key={question.id || index}
                accessibilityRole="button"
                accessibilityLabel={`Question ${index + 1}${isAnswered ? ', answered' : ''}${isFlagged ? ', flagged' : ''}`}
                onPress={() => setCurrentIndex(index)}
                style={({ pressed }) => [styles.paletteButton, isAnswered && styles.paletteAnswered, isFlagged && styles.paletteFlagged, isCurrent && styles.paletteCurrent, pressed && styles.pressed]}
              >
                <Text style={[styles.paletteText, (isAnswered || isCurrent) && styles.paletteTextActive]}>{index + 1}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.legend}>
          <Legend color={colors.primary} label="Answered" />
          <Legend color={colors.warning} label="Flagged" />
          <Legend color="#E2E8F0" label="Not visited" />
        </View>

        <View style={styles.navigationRow}>
          <AppButton title="Previous" variant="outline" disabled={currentIndex === 0 || submitting} onPress={() => setCurrentIndex((index) => Math.max(0, index - 1))} style={styles.navigationButton} />
          {isLastQuestion
            ? <AppButton title={`Submit ${assessmentLabel}`} variant="success" loading={submitting} onPress={requestSubmit} style={styles.navigationButton} />
            : <AppButton title="Next" disabled={submitting} onPress={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))} style={styles.navigationButton} />}
        </View>
        <AppButton title={`Submit ${assessmentLabel}`} variant="ghost" loading={submitting} onPress={requestSubmit} style={styles.submitAllButton} />
      </Screen>
    </>
  );
}

function Legend({ color, label }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  headerTimer: { minWidth: 76, minHeight: 30, paddingHorizontal: 7, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  headerTimerText: { color: colors.white, fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  summaryCard: { marginBottom: spacing.md },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  summaryCopy: { flex: 1 },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 4 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  timerText: { fontVariant: ['tabular-nums'], fontSize: 17, fontWeight: '900' },
  progressTrack: { height: 7, backgroundColor: '#E2E8F0', borderRadius: 99, overflow: 'hidden', marginTop: 15 },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: colors.primary },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  summaryStat: { color: colors.muted, fontSize: 11 },
  summaryStatValue: { color: colors.text, fontWeight: '900' },
  foregroundNotice: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#BAE6FD', backgroundColor: '#F0F9FF', borderRadius: 12, padding: 11, marginBottom: spacing.md },
  foregroundNoticeWarn: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  foregroundCopy: { flex: 1 },
  foregroundTitle: { color: colors.info, fontSize: 12, fontWeight: '900' },
  foregroundTitleWarn: { color: '#92400E' },
  foregroundText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  questionCard: { marginBottom: spacing.md },
  questionCardFlagged: { borderColor: '#F59E0B' },
  questionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  questionNumber: { width: 37, height: 37, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  questionNumberText: { color: colors.primary, fontWeight: '900' },
  questionTools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7, flex: 1 },
  flagButton: { minHeight: 31, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  flagButtonActive: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  flagText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  flagTextActive: { color: '#B45309' },
  questionText: { color: colors.text, fontSize: 17, lineHeight: 26, fontWeight: '700', marginTop: 17 },
  questionDescription: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  marking: { color: colors.muted, fontSize: 11, marginTop: 7 },
  options: { gap: 9, marginTop: spacing.lg },
  option: { minHeight: 57, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#EEF2FF' },
  optionLetter: { width: 29, height: 29, borderRadius: 15, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  optionLetterSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionLetterText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  optionLetterTextSelected: { color: colors.white },
  optionText: { color: colors.text, fontSize: 14, lineHeight: 20, flex: 1 },
  optionTextSelected: { color: colors.primary, fontWeight: '800' },
  missingOptions: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  responseArea: { marginTop: spacing.lg },
  responseHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  responseLabel: { color: colors.text, fontSize: 13, fontWeight: '900' },
  responseCount: { color: colors.muted, fontSize: 11 },
  responseInput: { minHeight: 160, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, color: colors.text, padding: 12, fontSize: 14, lineHeight: 21 },
  codeInput: { minHeight: 215, fontFamily: 'monospace', fontSize: 13 },
  starterCode: { backgroundColor: '#0F172A', borderRadius: 10, padding: 11, marginBottom: 9 },
  starterLabel: { color: '#94A3B8', fontSize: 10, textTransform: 'uppercase', fontWeight: '900', letterSpacing: 0.5, marginBottom: 5 },
  starterText: { color: '#E2E8F0', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  clearButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: 12, paddingVertical: 4 },
  clearText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  paletteTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 8 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paletteButton: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  paletteAnswered: { backgroundColor: colors.primary, borderColor: colors.primary },
  paletteFlagged: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
  paletteCurrent: { borderWidth: 2, borderColor: colors.navy },
  paletteText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  paletteTextActive: { color: colors.white },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, marginTop: 10, marginBottom: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { color: colors.muted, fontSize: 11 },
  navigationRow: { flexDirection: 'row', gap: 9 },
  navigationButton: { flex: 1 },
  submitAllButton: { marginTop: 10, marginBottom: spacing.md },
  pressed: { opacity: 0.78 },
});
