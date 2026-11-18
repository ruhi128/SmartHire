import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import Screen from '../../components/Screen';
import { AppButton, Badge, Card, ErrorState, LoadingState } from '../../components/Ui';
import { mockOaApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { formatDateTime } from '../../utils/format';
import { colors, spacing } from '../../constants/theme';

// Saved results are always loaded by attempt ID. A route parameter containing
// a client-computed score must never masquerade as a completed assessment.
export default function MockOaResultScreen({ navigation, route }) {
  const attemptId = route.params?.attemptId;
  const { data, loading, error, reload } = useAsyncData(
    () => attemptId ? mockOaApi.attemptResult(attemptId) : Promise.resolve(null),
    [attemptId],
  );
  const result = data?.attempt;

  return <>
    <AppHeader navigation={navigation} title="Saved Mock OA result" />
    <Screen hasHeader>
      {!attemptId ? <ErrorState message="Select an attempt from Mock OA history to view a saved result." />
        : loading ? <LoadingState label="Loading saved result…" />
          : error ? <ErrorState message={error} onRetry={() => reload().catch(() => {})} />
            : !result ? <ErrorState message="This saved attempt could not be found." /> : <>
              <View style={styles.hero}>
                <View style={[styles.icon, { backgroundColor: result.passed ? colors.success : colors.warning }]}>
                  <Ionicons name={result.passed ? 'checkmark' : 'flag-outline'} size={35} color={colors.white} />
                </View>
                <Text style={styles.title}>Saved assessment result</Text>
                <Text style={styles.subtitle}>{result.testTitle || 'Mock OA'} · {formatDateTime(result.submittedAt)}</Text>
              </View>

              <Card>
                <Badge tone={data.summaryOnly ? 'warning' : 'success'} style={styles.saved}>{data.summaryOnly ? 'Account history summary only' : 'Saved to your SmartHire account'}</Badge>
                <Text style={styles.score}>{result.percentage == null ? '—' : `${result.percentage}%`}</Text>
                <Text style={styles.caption}>{result.score ?? '—'} / {result.totalPossible ?? '—'} points · {result.passed === true ? 'Practice pass threshold met' : result.passed === false ? 'Keep practising' : 'Pass status not available'}</Text>
                <View style={styles.stats}>
                  <Stat label="Correct" value={result.correct ?? '—'} color={colors.success} />
                  <Stat label="Wrong" value={result.wrong ?? '—'} color={colors.danger} />
                  <Stat label="Skipped" value={result.skipped ?? '—'} color={colors.warning} />
                </View>
              </Card>

              {result.integrityScore != null ? <Card style={styles.integrity}>
                <Text style={styles.integrityTitle}>Client-reported integrity signal</Text>
                <Text style={styles.integrityScore}>{result.integrityScore}/100</Text>
                <Text style={styles.integrityText}>This is a browser-reported practice signal, not tamper-proof proctoring or evidence of misconduct.</Text>
              </Card> : null}

              {data.summaryOnly ? <Text style={styles.note}>The deployed backend has the saved history list but not the detail endpoint. This is the server-saved summary, not full question-by-question feedback. Deploy /api/mockoa/history/:attemptId to enable full details.</Text> : null}
              <Text style={styles.note}>Scores are practice feedback, not a hiring decision. Grading may be limited if a coding question has no private reference cases.</Text>
              <AppButton title="Back to Mock OA" onPress={() => navigation.navigate('MockOaList', { refreshKey: Date.now() })} style={styles.button} />
            </>}
    </Screen>
  </>;
}

function Stat({ label, value, color }) {
  return <View style={styles.stat}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 13 },
  subtitle: { color: colors.muted, marginTop: 5, textAlign: 'center' },
  saved: { alignSelf: 'center' },
  score: { color: colors.primary, fontSize: 38, fontWeight: '900', textAlign: 'center', marginTop: 10 },
  caption: { color: colors.muted, textAlign: 'center', marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: 19, borderTopWidth: 1, borderColor: colors.border, paddingTop: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontWeight: '900', fontSize: 20 },
  statLabel: { color: colors.muted, marginTop: 3, fontSize: 12 },
  integrity: { marginTop: 13 },
  integrityTitle: { color: colors.text, fontWeight: '900' },
  integrityScore: { color: colors.info, fontSize: 23, fontWeight: '900', marginTop: 12 },
  integrityText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 14 },
  button: { marginTop: spacing.lg },
});
