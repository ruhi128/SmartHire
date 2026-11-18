import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import { Badge, Card, EmptyState, ErrorState, LoadingState, SectionTitle } from '../../components/Ui';
import { dsaApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors } from '../../constants/theme';
import { formatDate, statusTone } from '../../utils/format';
import { DEMO_MODE } from '../../config/runtime';

export default function DsaPerformanceScreen() {
  const { data, loading, refreshing, error, reload } = useAsyncData(() => dsaApi.performance(), []);
  if (loading) return <LoadingState label="Loading coding performance…" />;
  if (error) return <ErrorState message={error} onRetry={() => reload().catch(() => {})} />;
  if (!data) return <ErrorState message="Performance is not available yet." onRetry={() => reload().catch(() => {})} />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}>
      <Text style={styles.title}>DSA performance</Text>
      <View style={styles.metrics}>
        <Metric label="Attempts" value={data.totalAttempts} />
        <Metric label="Accepted attempts" value={data.accepted} color={colors.success} />
        <Metric label="Unique problems solved" value={data.uniqueProblemsSolved ?? data.accepted} color={colors.primary} />
        <Metric label="Accuracy" value={`${data.accuracy ?? 0}%`} color={colors.accent} />
      </View>

      <SectionTitle title="By difficulty" />
      <Card>
        {Object.entries(data.byDifficulty || {}).map(([level, value]) => (
          <View key={level} style={styles.row}>
            <Badge tone={level === 'Easy' ? 'success' : level === 'Medium' ? 'warning' : 'danger'}>{level}</Badge>
            <Text style={styles.rowText}>{value.solved} solved / {value.total} attempted</Text>
          </View>
        ))}
      </Card>

      {data.topicStats?.length ? <>
        <SectionTitle title="By topic" />
        <Card>
          {data.topicStats.map((item) => (
            <View key={item.topic} style={styles.row}>
              <Text style={styles.topic}>{item.topic}</Text>
              <Text style={styles.rowText}>{item.solved} accepted / {item.attempted} attempts</Text>
            </View>
          ))}
        </Card>
      </> : null}

      <SectionTitle title="Recent submissions" />
      {data.recentSubmissions?.length ? data.recentSubmissions.map((item) => (
        <Card key={item.id} style={styles.submission}>
          <View style={styles.flex}>
            <Text style={styles.problem}>{item.title || 'Coding problem'}</Text>
            <Text style={styles.meta}>{item.language} · {formatDate(item.submittedAt)}</Text>
          </View>
          <Badge tone={statusTone(item.status)}>{item.status}</Badge>
        </Card>
      )) : <EmptyState title="No submissions yet" body="Solve a DSA problem to see your history here." />}
      {!DEMO_MODE ? <Text style={styles.note}>This page uses submissions saved to your SmartHire account. Older website practice stored only in that browser may not appear here.</Text> : null}
    </Screen>
  );
}

function Metric({ label, value, color = colors.primary }) {
  return (
    <Card style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value ?? 0}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 },
  metric: { flexBasis: '47%', flexGrow: 1, padding: 12 },
  metricValue: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  metricLabel: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingVertical: 8 },
  rowText: { color: colors.muted, fontSize: 12, flexShrink: 1, textAlign: 'right' },
  topic: { color: colors.text, fontWeight: '700', fontSize: 12, flex: 1 },
  submission: { marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, paddingRight: 8 },
  problem: { color: colors.text, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12, marginBottom: 12 },
});
