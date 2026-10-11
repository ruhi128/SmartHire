import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { AppButton, Badge, Card, ErrorState, LoadingState } from '../../components/Ui';
import { aptitudeApi } from '../../api';
import { apiErrorMessage } from '../../api/client';
import { colors, spacing } from '../../constants/theme';

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function optionList(question = {}) {
  if (Array.isArray(question.options)) return question.options;
  if (typeof question.options === 'string') {
    try {
      const parsed = JSON.parse(question.options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function timerTone(seconds) {
  if (seconds < 60) return colors.danger;
  if (seconds < 180) return colors.warning;
  return colors.primary;
}

export default function AptitudeAttemptScreen({ navigation, route }) {
  const testId = route?.params?.testId;
  const fallbackTitle = route?.params?.title || 'Aptitude practice';
  const [reloadKey, setReloadKey] = useState(0);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [deadline, setDeadline] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const answersRef = useRef({});
  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const submitRef = useRef(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!testId) {
        if (active) {
          setLoading(false);
          setLoadError('This aptitude test is missing an identifier. Return to the test list and try again.');
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
      answersRef.current = {};
      submittingRef.current = false;
      autoSubmittedRef.current = false;

      try {
        const response = await aptitudeApi.start(testId);
        if (!active) return;
        const nextAssessment = response?.test || null;
        const nextQuestions = Array.isArray(response?.questions) ? response.questions : [];
        if (!nextAssessment) throw new Error('The server did not return this aptitude test.');
        if (!nextQuestions.length) throw new Error('This aptitude test has no questions yet.');

        const durationMinutes = Math.max(1, Number(nextAssessment.duration_minutes) || 15);
        const started = new Date().toISOString();
        setAssessment(nextAssessment);
        setQuestions(nextQuestions);
        setStartedAt(started);
        setRemainingSeconds(durationMinutes * 60);
        setDeadline(Date.now() + (durationMinutes * 60 * 1000));
      } catch (error) {
        if (active) setLoadError(apiErrorMessage(error, 'Could not start this aptitude test.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [testId, reloadKey]);

  const submitAttempt = useCallback(async (autoSubmitted = false) => {
    if (!assessment || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    // Keep the original deadline while the request is in flight. If a network
    // submission fails, the truthful countdown can resume instead of leaving
    // the student with a frozen attempt.
    try {
      const result = await aptitudeApi.submit({
        test_id: assessment.id || testId,
        answers: answersRef.current,
        started_at: startedAt || new Date().toISOString(),
      });
      navigation.replace('AptitudeResult', {
        result,
        title: assessment.title || fallbackTitle,
        autoSubmitted,
      });
    } catch (error) {
      submittingRef.current = false;
      setSubmitting(false);
      Alert.alert('Could not submit test', apiErrorMessage(error, 'Your answers have not been submitted. Please try again.'));
    }
  }, [assessment, fallbackTitle, navigation, startedAt, testId]);

  submitRef.current = submitAttempt;

  // A deadline (rather than decrementing a counter) keeps the timer truthful
  // if the app briefly backgrounds and then returns to the foreground.
  useEffect(() => {
    if (!deadline || submitting) return undefined;

    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        setTimeout(() => submitRef.current?.(true), 0);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline, submitting]);

  const chooseAnswer = (questionId, optionIndex) => {
    const next = { ...answersRef.current, [questionId]: optionIndex };
    answersRef.current = next;
    setAnswers(next);
  };

  const toggleFlag = (questionId) => {
    setFlagged((previous) => ({ ...previous, [questionId]: !previous[questionId] }));
  };

  const requestSubmit = () => {
    if (!assessment || submitting) return;
    const unanswered = questions.filter((question) => answersRef.current[question.id] === undefined).length;
    const body = unanswered
      ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} unanswered. Submit anyway?`
      : 'All questions are answered. Submit this aptitude test now?';
    Alert.alert('Submit aptitude test?', body, [
      { text: 'Keep reviewing', style: 'cancel' },
      { text: 'Submit', style: 'destructive', onPress: () => submitAttempt(false) },
    ]);
  };

  const title = assessment?.title || fallbackTitle;
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter((question) => answers[question.id] !== undefined).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const clockColor = timerTone(remainingSeconds);

  if (loading) {
    return <><AppHeader navigation={navigation} title={title} /><Screen hasHeader><LoadingState label="Preparing aptitude test…" /></Screen></>;
  }

  if (loadError || !assessment || !currentQuestion) {
    return (
      <>
        <AppHeader navigation={navigation} title={title} />
        <Screen hasHeader>
          <ErrorState message={loadError || 'This aptitude test is unavailable.'} onRetry={() => setReloadKey((value) => value + 1)} />
        </Screen>
      </>
    );
  }

  const options = optionList(currentQuestion);
  const selectedOption = answers[currentQuestion.id];
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <>
      <AppHeader navigation={navigation} title={title} subtitle={`Question ${currentIndex + 1} of ${questions.length}`} />
      <Screen hasHeader>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>Timed aptitude test</Text>
              <Text style={styles.summaryTitle}>{title}</Text>
            </View>
            <View style={[styles.timer, { borderColor: `${clockColor}44`, backgroundColor: `${clockColor}14` }]}>
              <Ionicons name="time-outline" color={clockColor} size={18} />
              <Text style={[styles.timerText, { color: clockColor }]}>{formatClock(remainingSeconds)}</Text>
            </View>
          </View>
          <View style={styles.progressLine}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
          <View style={styles.summaryStats}>
            <Text style={styles.summaryStat}><Text style={styles.summaryStatValue}>{answeredCount}</Text> answered</Text>
            <Text style={styles.summaryStat}><Text style={styles.summaryStatValue}>{flaggedCount}</Text> flagged</Text>
            <Text style={styles.summaryStat}><Text style={styles.summaryStatValue}>{questions.length - answeredCount}</Text> remaining</Text>
          </View>
        </Card>

        <Card style={[styles.questionCard, flagged[currentQuestion.id] && styles.questionCardFlagged]}>
          <View style={styles.questionTop}>
            <View style={styles.questionNumber}><Text style={styles.questionNumberText}>{currentIndex + 1}</Text></View>
            <View style={styles.questionBadges}>
              {currentQuestion.topic ? <Badge tone="info">{currentQuestion.topic}</Badge> : null}
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
          <Text style={styles.marking}>{currentQuestion.marks || 0} mark{Number(currentQuestion.marks) === 1 ? '' : 's'}{Number(currentQuestion.negative_marks) ? ` · −${currentQuestion.negative_marks} for an incorrect answer` : ''}</Text>

          <View style={styles.options}>
            {options.map((option, optionIndex) => {
              const selected = selectedOption === optionIndex;
              return (
                <Pressable
                  key={`${currentQuestion.id}-${optionIndex}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => chooseAnswer(currentQuestion.id, optionIndex)}
                  style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
                >
                  <View style={[styles.optionLetter, selected && styles.optionLetterSelected]}><Text style={[styles.optionLetterText, selected && styles.optionLetterTextSelected]}>{String.fromCharCode(65 + optionIndex)}</Text></View>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{String(option)}</Text>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Text style={styles.paletteTitle}>Question palette</Text>
        <View style={styles.palette}>
          {questions.map((question, index) => {
            const isCurrent = index === currentIndex;
            const isAnswered = answers[question.id] !== undefined;
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
          <AppButton title="Previous" variant="outline" disabled={currentIndex === 0 || submitting} onPress={() => setCurrentIndex((value) => Math.max(0, value - 1))} style={styles.navigationButton} />
          {isLastQuestion
            ? <AppButton title="Submit test" variant="success" loading={submitting} onPress={requestSubmit} style={styles.navigationButton} />
            : <AppButton title="Next" disabled={submitting} onPress={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))} style={styles.navigationButton} />}
        </View>
        <AppButton title="Submit aptitude test" variant="ghost" loading={submitting} onPress={requestSubmit} style={styles.submitAllButton} />
      </Screen>
    </>
  );
}

function Legend({ color, label }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  summaryCard: { marginBottom: spacing.md },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  summaryCopy: { flex: 1 },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 4 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  timerText: { fontVariant: ['tabular-nums'], fontSize: 17, fontWeight: '900' },
  progressLine: { height: 7, backgroundColor: '#E2E8F0', borderRadius: 99, overflow: 'hidden', marginTop: 15 },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: colors.primary },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  summaryStat: { color: colors.muted, fontSize: 11 },
  summaryStatValue: { color: colors.text, fontWeight: '900' },
  questionCard: { marginBottom: spacing.md },
  questionCardFlagged: { borderColor: '#F59E0B' },
  questionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  questionNumber: { width: 37, height: 37, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  questionNumberText: { color: colors.primary, fontWeight: '900' },
  questionBadges: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7, flex: 1 },
  flagButton: { minHeight: 31, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  flagButtonActive: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  flagText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  flagTextActive: { color: '#B45309' },
  questionText: { color: colors.text, fontSize: 17, lineHeight: 26, fontWeight: '700', marginTop: 17 },
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
