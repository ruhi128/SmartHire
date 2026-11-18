import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import Screen from '../../components/Screen';
import { AppButton, Badge, Card, ErrorState, LoadingState } from '../../components/Ui';
import { companyOaApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { formatDateTime } from '../../utils/format';
import { colors, spacing } from '../../constants/theme';

export default function CompanyOaResultScreen({ navigation, route }) {
  const attemptId = route.params?.attemptId;
  const { data, loading, error, reload } = useAsyncData(
    () => attemptId ? companyOaApi.attemptResult(attemptId) : Promise.resolve(null),
    [attemptId],
  );
  const result = data?.attempt;

  return <>
    <AppHeader navigation={navigation} title="Saved Company OA result" />
    <Screen hasHeader>
      {!attemptId ? <ErrorState message="Select an attempt from Company OA history to view a saved result." />
        : loading ? <LoadingState label="Loading saved result…" />
          : error ? <ErrorState message={error} onRetry={() => reload().catch(() => {})} />
            : !result ? <ErrorState message="This saved attempt could not be found." /> : <>
              <View style={styles.hero}>
                <View style={styles.icon}><Ionicons name="checkmark" size={36} color={colors.white} /></View>
                <Text style={styles.title}>Saved assessment result</Text>
                <Text style={styles.subtitle}>{result.title || 'Company OA'} · {formatDateTime(result.submittedAt)}</Text>
              </View>
              <Card>
                <Badge tone="success" style={styles.saved}>Saved to your SmartHire account</Badge>
                <Text style={styles.score}>{result.pct == null ? '—' : `${result.pct}%`}</Text>
                <Text style={styles.caption}>{result.score ?? '—'} / {result.maxScore ?? '—'} marks · Grade {result.grade || '—'}</Text>
                <View style={styles.stats}>
                  <Stat label="Correct" value={result.correct ?? '—'} color={colors.success} />
                  <Stat label="Wrong" value={result.wrong ?? '—'} color={colors.danger} />
                  <Stat label="Skipped" value={result.skipped ?? '—'} color={colors.warning} />
                </View>
              </Card>
              <Text style={styles.note}>This is the server-saved outcome for your one official attempt. Text and coding responses may need human review; automated scores are not a hiring decision.</Text>
              <AppButton title="Back to Company OA" onPress={() => navigation.navigate('CompanyOaList', { refreshKey: Date.now() })} style={styles.button} />
            </>}
    </Screen>
  </>;
}

function Stat({ label, value, color }) {
  return <View style={styles.stat}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 23, fontWeight: '900', textAlign: 'center', marginTop: 13 },
  subtitle: { color: colors.muted, marginTop: 5, textAlign: 'center' },
  saved: { alignSelf: 'center' },
  score: { textAlign: 'center', color: colors.primary, fontWeight: '900', fontSize: 38, marginTop: 10 },
  caption: { textAlign: 'center', color: colors.muted, marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderColor: colors.border },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 3 },
  note: { color: colors.muted, lineHeight: 18, fontSize: 12, marginTop: 14 },
  button: { marginTop: spacing.lg },
});
