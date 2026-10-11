import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { aptitudeApi } from '../../api';
import { Badge, Card, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import { colors, spacing } from '../../constants/theme';
import useAsyncData from '../../utils/useAsyncData';
import { formatDate } from '../../utils/format';

function percentageFor(attempt = {}) {
  const direct = Number(attempt.percentage);
  if (Number.isFinite(direct)) return Math.max(0, Math.round(direct));
  const score = Number(attempt.score) || 0;
  const total = Number(attempt.total_marks ?? attempt.total) || 0;
  return total ? Math.max(0, Math.round((score / total) * 100)) : 0;
}

function attemptDate(attempt = {}) {
  return attempt.submitted_at || attempt.created_at || attempt.updated_at || null;
}

function strengthFor(correct, total) {
  const ratio = total ? correct / total : 0;
  if (ratio >= 0.7) return 'Strong';
  if (ratio >= 0.4) return 'Average';
  return 'Weak';
}

// The live API already returns topicAnalysis. This fallback also makes the
// screen safe for older/local records that retain per-attempt topic results.
function topicFallback(attempts) {
  const topics = {};
  attempts.forEach((attempt) => {
    const source = attempt.topic_results || attempt.topicResults || {};
    Object.entries(source).forEach(([topic, value]) => {
      const stats = value || {};
      if (!topics[topic]) topics[topic] = { topic, correct: 0, wrong: 0, unattempted: 0, total: 0 };
      const target = topics[topic];
      const correct = Number(stats.correct) || 0;
      const wrong = Number(stats.wrong) || 0;
      const unattempted = Number(stats.unattempted ?? stats.skipped) || 0;
      target.correct += correct;
      target.wrong += wrong;
      target.unattempted += unattempted;
      target.total += Number(stats.total) || correct + wrong + unattempted;
    });
  });
  return Object.values(topics).map((item) => ({
    ...item,
    accuracy: item.correct + item.wrong ? Math.round((item.correct / (item.correct + item.wrong)) * 100) : 0,
    strength: strengthFor(item.correct, item.total),
  }));
}

function normalizedAnalysis(data) {
  const attempts = Array.isArray(data?.attempts) ? data.attempts : [];
  const topicAnalysis = Array.isArray(data?.topicAnalysis) && data.topicAnalysis.length
    ? data.topicAnalysis.map((item) => ({
      ...item,
      correct: Number(item.correct) || 0,
      wrong: Number(item.wrong) || 0,
      unattempted: Number(item.unattempted) || 0,
      total: Number(item.total) || (Number(item.correct) || 0) + (Number(item.wrong) || 0) + (Number(item.unattempted) || 0),
      accuracy: Number.isFinite(Number(item.accuracy)) ? Math.round(Number(item.accuracy)) : 0,
      strength: item.strength || strengthFor(Number(item.correct) || 0, Number(item.total) || 0),
    }))
    : topicFallback(attempts);
  return { attempts, topicAnalysis };
}

function toneForStrength(strength) {
  if (strength === 'Strong') return 'success';
  if (strength === 'Weak') return 'danger';
  return 'warning';
}

export default function AptitudeTestsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const pageStyle = { paddingTop: Math.max(insets.top, spacing.md) };
  const [mode, setMode] = useState(route?.params?.initialMode === 'performance' ? 'performance' : 'tests');
  const testsState = useAsyncData(() => aptitudeApi.tests(), []);
  const analysisState = useAsyncData(() => aptitudeApi.analysis(), []);

  useEffect(() => {
    if (['tests', 'performance'].includes(route?.params?.initialMode)) setMode(route.params.initialMode);
    if (route?.params?.refreshKey) {
      testsState.reload().catch(() => {});
      analysisState.reload().catch(() => {});
    }
  }, [route?.params?.initialMode, route?.params?.refreshKey]); // Intentional: react only to explicit navigation requests.

  const tests = Array.isArray(testsState.data) ? testsState.data : [];
  const analysis = useMemo(() => normalizedAnalysis(analysisState.data), [analysisState.data]);

  const header = (
    <View style={styles.heading}>
      <Text style={styles.title}>Aptitude practice</Text>
      <Text style={styles.subtitle}>Start timed aptitude tests, review saved scores, and identify topics to practise next.</Text>
      <View style={styles.tabs}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === 'tests' }} onPress={() => setMode('tests')} style={[styles.tab, mode === 'tests' && styles.tabActive]}>
          <Ionicons name="list-outline" size={17} color={mode === 'tests' ? colors.primary : colors.muted} />
          <Text style={[styles.tabText, mode === 'tests' && styles.tabTextActive]}>Tests</Text>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === 'performance' }} onPress={() => setMode('performance')} style={[styles.tab, mode === 'performance' && styles.tabActive]}>
          <Ionicons name="bar-chart-outline" size={17} color={mode === 'performance' ? colors.primary : colors.muted} />
          <Text style={[styles.tabText, mode === 'performance' && styles.tabTextActive]}>My performance</Text>
        </Pressable>
      </View>
    </View>
  );

  if (mode === 'tests') {
    if (testsState.loading) return <View style={[styles.page, pageStyle]}>{header}<LoadingState label="Loading aptitude tests…" /></View>;
    if (testsState.error) return <View style={[styles.page, pageStyle]}>{header}<ErrorState message={testsState.error} onRetry={() => testsState.reload().catch(() => {})} /></View>;
    return (
      <View style={[styles.page, pageStyle]}>
        {header}
        <FlatList
          data={tests}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, !tests.length && styles.empty]}
          refreshControl={<RefreshControl refreshing={testsState.refreshing} onRefresh={() => testsState.reload({ refresh: true }).catch(() => {})} />}
          ListEmptyComponent={<EmptyState title="No aptitude tests yet" body="Tests seeded by the placement team will appear here." />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Start ${item.title}`}
              onPress={() => navigation.navigate('AptitudeAttempt', { testId: item.id, title: item.title })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.icon}><Ionicons name="calculator-outline" size={23} color={colors.primary} /></View>
              <View style={styles.content}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.meta}>{item.total_questions || 0} questions · {item.duration_minutes || 0} min</Text>
                {item.attempts?.length ? <Text style={styles.attempt}>Best score: {item.best_score ?? 0}</Text> : <Text style={styles.attempt}>Not attempted yet</Text>}
                <Text style={styles.websiteAction}>Start timed test</Text>
              </View>
              <Ionicons name="play-circle-outline" size={22} color={colors.primary} />
            </Pressable>
          )}
        />
      </View>
    );
  }

  if (analysisState.loading) return <View style={[styles.page, pageStyle]}>{header}<LoadingState label="Loading aptitude performance…" /></View>;
  if (analysisState.error) return <View style={[styles.page, pageStyle]}>{header}<ErrorState message={analysisState.error} onRetry={() => analysisState.reload().catch(() => {})} /></View>;

  return <PerformanceView analysis={analysis} refreshing={analysisState.refreshing} onRefresh={() => analysisState.reload({ refresh: true }).catch(() => {})} header={header} pageStyle={pageStyle} />;
}

function PerformanceView({ analysis, refreshing, onRefresh, header, pageStyle }) {
  const attempts = [...analysis.attempts].sort((a, b) => new Date(attemptDate(b) || 0) - new Date(attemptDate(a) || 0));
  const chronological = [...attempts].reverse();
  const totalAttempts = attempts.length;
  const percentages = attempts.map(percentageFor);
  const average = totalAttempts ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / totalAttempts) : 0;
  const best = totalAttempts ? Math.max(...percentages) : 0;
  const totalCorrect = attempts.reduce((sum, item) => sum + (Number(item.correct) || 0), 0);
  const totalWrong = attempts.reduce((sum, item) => sum + (Number(item.wrong) || 0), 0);
  const latest = chronological[chronological.length - 1];
  const previous = chronological.slice(0, -1);
  const previousAverage = previous.length ? Math.round(previous.map(percentageFor).reduce((sum, value) => sum + value, 0) / previous.length) : null;
  const change = latest && previousAverage !== null ? percentageFor(latest) - previousAverage : null;
  const topics = [...analysis.topicAnalysis].sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));

  return (
    <View style={[styles.page, pageStyle]}>
      {header}
      <FlatList
        data={attempts}
        keyExtractor={(item, index) => String(item.id || `${attemptDate(item)}-${index}`)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[styles.performanceList, !attempts.length && styles.empty]}
        ListHeaderComponent={<>
          {totalAttempts ? <>
            <View style={styles.metricsGrid}>
              <Metric icon="documents-outline" label="Attempts" value={totalAttempts} tone={colors.primary} />
              <Metric icon="stats-chart-outline" label="Average" value={`${average}%`} tone={colors.accent} />
              <Metric icon="trophy-outline" label="Best" value={`${best}%`} tone={colors.success} />
              <Metric icon="checkmark-done-outline" label="Correct" value={totalCorrect} tone={colors.warning} />
            </View>
            <Card style={styles.trendCard}>
              <View style={styles.sectionTop}>
                <View>
                  <Text style={styles.cardSectionTitle}>Score trend</Text>
                  <Text style={styles.cardSectionSub}>{change === null ? 'Complete another test to compare progress.' : change >= 0 ? `${change}% above your earlier average` : `${Math.abs(change)}% below your earlier average`}</Text>
                </View>
                {change !== null ? <Badge tone={change >= 0 ? 'success' : 'warning'}>{change >= 0 ? 'Improving' : 'Needs attention'}</Badge> : null}
              </View>
              <View style={styles.chart}>
                {chronological.slice(-8).map((item, index) => {
                  const value = percentageFor(item);
                  return <View key={item.id || index} style={styles.chartColumn}>
                    <View style={styles.chartTrack}><View style={[styles.chartBar, { height: `${Math.max(5, value)}%` }]} /></View>
                    <Text style={styles.chartValue}>{value}</Text>
                  </View>;
                })}
              </View>
              <Text style={styles.chartCaption}>Scores are shown from oldest to newest. Percentages are calculated from the saved score and total marks.</Text>
            </Card>
            <SectionHeading title="Topic performance" subtitle="Accuracy is based on answered questions across all saved attempts." />
            {topics.length ? topics.map((topic) => <TopicCard key={topic.topic} topic={topic} />) : <Card><Text style={styles.emptyTopic}>Topic-level feedback will appear once a submitted test contains saved topic results.</Text></Card>}
            <SectionHeading title="Attempt history" subtitle={`${totalCorrect} correct · ${totalWrong} wrong across all attempts`} />
          </> : <Card style={styles.noPerformance}><Ionicons name="bar-chart-outline" size={34} color={colors.primary} /><Text style={styles.noPerformanceTitle}>No saved attempts yet</Text><Text style={styles.noPerformanceText}>Complete an aptitude test to see score history, a simple progress trend, and topic-level accuracy here.</Text></Card>}
        </>}
        ListEmptyComponent={totalAttempts ? null : <EmptyState title="No attempts yet" body="Open a listed test to start your first timed aptitude practice." />}
        renderItem={({ item }) => <AttemptCard attempt={item} />}
      />
    </View>
  );
}

function Metric({ icon, label, value, tone }) {
  return <Card style={styles.metric}><Ionicons name={icon} size={19} color={tone} /><Text style={[styles.metricValue, { color: tone }]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></Card>;
}

function SectionHeading({ title, subtitle }) {
  return <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}</View>;
}

function TopicCard({ topic }) {
  const total = Number(topic.total) || 0;
  const correct = Number(topic.correct) || 0;
  const wrong = Number(topic.wrong) || 0;
  const unattempted = Number(topic.unattempted) || 0;
  const accuracy = Number.isFinite(Number(topic.accuracy)) ? Math.max(0, Math.min(100, Math.round(Number(topic.accuracy)))) : (correct + wrong ? Math.round((correct / (correct + wrong)) * 100) : 0);
  const strength = topic.strength || strengthFor(correct, total);
  return <Card style={styles.topicCard}>
    <View style={styles.sectionTop}><Text style={styles.topicName}>{topic.topic || 'General'}</Text><Badge tone={toneForStrength(strength)}>{strength}</Badge></View>
    <View style={styles.accuracyLine}><Text style={styles.accuracyValue}>{accuracy}% accuracy</Text><Text style={styles.topicTotal}>{total} question{total === 1 ? '' : 's'}</Text></View>
    <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${accuracy}%`, backgroundColor: strength === 'Strong' ? colors.success : strength === 'Weak' ? colors.danger : colors.warning }]} /></View>
    <Text style={styles.topicStats}>{correct} correct · {wrong} wrong · {unattempted} skipped</Text>
  </Card>;
}

function AttemptCard({ attempt }) {
  const percentage = percentageFor(attempt);
  const total = Number(attempt.total_marks ?? attempt.total) || 0;
  const score = Number(attempt.score) || 0;
  return <Card style={styles.attemptCard}>
    <View style={[styles.attemptScore, { backgroundColor: percentage >= 70 ? '#DCFCE7' : percentage >= 40 ? '#FEF3C7' : '#FEE2E2' }]}><Text style={[styles.attemptScoreText, { color: percentage >= 70 ? colors.success : percentage >= 40 ? colors.warning : colors.danger }]}>{percentage}%</Text></View>
    <View style={styles.attemptBody}>
      <Text style={styles.attemptTitle}>{score} / {total || '—'} marks</Text>
      <Text style={styles.attemptDate}>{attemptDate(attempt) ? formatDate(attemptDate(attempt)) : 'Saved attempt'}</Text>
      <Text style={styles.attemptBreakdown}>{Number(attempt.correct) || 0} correct · {Number(attempt.wrong) || 0} wrong · {Number(attempt.unattempted) || 0} skipped</Text>
    </View>
  </Card>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.md },
  heading: { paddingHorizontal: spacing.md },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 5 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: spacing.md, marginBottom: 3 },
  tab: { flex: 1, minHeight: 43, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  tabActive: { backgroundColor: '#EEF2FF', borderColor: '#A5B4FC' },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: colors.primary },
  list: { padding: spacing.md, gap: spacing.md },
  performanceList: { padding: spacing.md, gap: 9, paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  card: { padding: 14, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' },
  icon: { width: 47, height: 47, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  content: { flex: 1 },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
  attempt: { color: colors.primary, marginTop: 7, fontWeight: '700', fontSize: 12 },
  websiteAction: { color: colors.primary, marginTop: 7, fontWeight: '800', fontSize: 12 },
  pressed: { opacity: 0.74 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  metric: { width: '48.7%', padding: 11, minHeight: 93 },
  metricValue: { fontSize: 22, fontWeight: '900', marginTop: 5 },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 1 },
  trendCard: { marginTop: 2 },
  sectionTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardSectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  cardSectionSub: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3, maxWidth: 220 },
  chart: { height: 123, flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 13 },
  chartColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartTrack: { height: 94, width: '100%', maxWidth: 28, backgroundColor: '#E2E8F0', borderRadius: 999, overflow: 'hidden', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: 999, backgroundColor: colors.primary },
  chartValue: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: 4 },
  chartCaption: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 6 },
  sectionHeading: { marginTop: spacing.lg, marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  topicCard: { marginBottom: 8 },
  topicName: { color: colors.text, fontWeight: '900', fontSize: 15, flex: 1 },
  accuracyLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  accuracyValue: { color: colors.text, fontWeight: '800', fontSize: 12 },
  topicTotal: { color: colors.muted, fontSize: 11 },
  progressTrack: { height: 8, borderRadius: 99, backgroundColor: '#E2E8F0', marginTop: 7, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  topicStats: { color: colors.muted, fontSize: 11, marginTop: 8 },
  emptyTopic: { color: colors.muted, textAlign: 'center', lineHeight: 19, fontSize: 12 },
  noPerformance: { alignItems: 'center', paddingVertical: spacing.xl, marginTop: spacing.md },
  noPerformanceTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 10 },
  noPerformanceText: { color: colors.muted, textAlign: 'center', lineHeight: 19, fontSize: 12, marginTop: 6 },
  attemptCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  attemptScore: { width: 53, height: 53, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  attemptScoreText: { fontSize: 15, fontWeight: '900' },
  attemptBody: { flex: 1 },
  attemptTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  attemptDate: { color: colors.muted, fontSize: 11, marginTop: 3 },
  attemptBreakdown: { color: colors.muted, fontSize: 11, marginTop: 3 },
});
