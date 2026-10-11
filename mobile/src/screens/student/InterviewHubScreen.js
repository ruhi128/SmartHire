import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { AppButton, Card, EmptyState, ErrorState, LoadingState, SectionTitle } from '../../components/Ui';
import { interviewApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors, spacing } from '../../constants/theme';
import { formatDate } from '../../utils/format';

export default function InterviewHubScreen({ navigation, route }) {
  const refreshKey = route?.params?.refreshKey;
  const { data, loading, error, refreshing, reload } = useAsyncData(async () => {
    const [analytics, history] = await Promise.all([interviewApi.analytics(), interviewApi.history()]);
    return { analytics, history: history.history || [] };
  }, [refreshKey]);

  if (loading) return <Screen><LoadingState label="Loading interview practice…" /></Screen>;
  if (error) return <Screen><ErrorState message={error} onRetry={() => reload().catch(() => {})} /></Screen>;

  const stats = data?.analytics?.averages;
  const typedSessionCount = Number(stats?.typedSessions ?? stats?.sessions ?? 0);
  const sessions = data?.history || [];
  return (
    <Screen scroll={false}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcon}><Ionicons name="chatbubbles-outline" size={31} color={colors.white} /></View>
              <View style={styles.heroContent}>
                <Text style={styles.title}>Mock interview</Text>
                <Text style={styles.subtitle}>Practise common interview prompts on your phone, then keep text-only feedback and responses in your SmartHire history.</Text>
              </View>
            </View>
            <AppButton title="Start typed practice" onPress={() => navigation.navigate('MockInterview')} style={styles.startButton} />
            <Card style={styles.boundary}>
              <View style={styles.boundaryTop}><Ionicons name="document-text-outline" size={18} color={colors.info} /><Text style={styles.boundaryTitle}>Text-only practice</Text></View>
              <Text style={styles.boundaryBody}>Mobile practice evaluates only what you type. It does not record or infer camera, microphone, facial-expression, eye-contact, emotion, identity, attention, or employability information.</Text>
            </Card>
            {stats && typedSessionCount > 0 ? <>
              <SectionTitle title="Your typed-practice averages" />
              <Card style={styles.metrics}>
                <Metric label="Overall" value={stats.typedOverall ?? stats.overall} />
                <Metric label="Content" value={stats.content} fallback="—" />
                <Metric label="Structure" value={stats.structure} fallback="—" />
                <Metric label="Wording" value={stats.wording ?? stats.confidence} fallback="—" />
              </Card>
            </> : null}
            <SectionTitle title="Past sessions" />
          </>
        )}
        ListEmptyComponent={<EmptyState title="No interview practice yet" body="Start a typed practice session to save your responses and text-feedback summary here." action={<AppButton title="Start typed practice" compact onPress={() => navigation.navigate('MockInterview')} />} />}
        renderItem={({ item }) => {
          const typed = item.practiceMode === 'typed-practice';
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${typed ? 'typed practice' : 'mock interview'} session from ${formatDate(item.conductedAt)}`}
              onPress={() => navigation.navigate('InterviewSessionDetail', { sessionId: item.id })}
              style={({ pressed }) => [styles.history, pressed && styles.pressed]}
            >
              <View style={styles.scoreBubble}><Text style={styles.scoreText}>{item.overallScore ?? '—'}</Text></View>
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>{typed ? 'Typed practice' : `${item.company || 'General'} interview`} · Grade {item.grade || '—'}</Text>
                <Text style={styles.historyMeta}>{item.duration || '—'} · {formatDate(item.conductedAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

function Metric({ label, value, fallback = 0 }) {
  const shown = value === undefined || value === null ? fallback : value;
  return <View style={styles.metric}><Text style={styles.metricValue}>{shown}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  heroIcon: { height: 59, width: 59, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.primary },
  heroContent: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.muted, lineHeight: 19, marginTop: 3 },
  startButton: { marginBottom: 12 },
  boundary: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  boundaryTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  boundaryTitle: { color: '#1E3A8A', fontWeight: '900' },
  boundaryBody: { color: '#1E40AF', fontSize: 12, lineHeight: 18, marginTop: 7 },
  metrics: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center', flex: 1 },
  metricValue: { color: colors.primary, fontSize: 21, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 3, textAlign: 'center' },
  history: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, marginBottom: 9 },
  scoreBubble: { height: 44, width: 44, borderRadius: 13, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  scoreText: { color: colors.primary, fontWeight: '900' },
  historyContent: { flex: 1 },
  historyTitle: { color: colors.text, fontWeight: '800' },
  historyMeta: { color: colors.muted, marginTop: 3, fontSize: 12 },
  pressed: { opacity: 0.78 },
});
