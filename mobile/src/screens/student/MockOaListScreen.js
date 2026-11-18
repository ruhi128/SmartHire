import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { Badge, EmptyState, ErrorState, LoadingState, SectionTitle } from '../../components/Ui';
import { mockOaApi } from '../../api';
import { colors, spacing } from '../../constants/theme';
import { formatDate } from '../../utils/format';
import useAsyncData from '../../utils/useAsyncData';
import { LAPTOP_FEATURES, showLaptopRequired } from '../../components/LaptopRequired';

export default function MockOaListScreen({ navigation, route }) {
  const refreshKey = route?.params?.refreshKey;
  const { data, loading, refreshing, error, reload } = useAsyncData(async () => {
    const [catalog, saved] = await Promise.all([mockOaApi.tests(), mockOaApi.history()]);
    return { tests: catalog.tests || [], history: saved.history || [] };
  }, [refreshKey]);
  const tests = data?.tests || [];
  const history = data?.history || [];

  if (loading) return <LoadingState label="Loading mock assessments and results…" />;
  if (error) return <ErrorState message={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <Screen scroll={false} contentContainerStyle={styles.page}>
      <FlatList
        data={tests}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
        ListHeaderComponent={(
          <View>
            <Text style={styles.title}>Mock OA</Text>
            <Text style={styles.subtitle}>Browse approved tests and review saved attempts. New attempts are taken on the SmartHire website using a laptop.</Text>
            <Pressable accessibilityRole="button" onPress={() => showLaptopRequired(LAPTOP_FEATURES.mockOa)} style={styles.laptopHint}>
              <Ionicons name="laptop-outline" size={19} color={colors.primary} />
              <Text style={styles.laptopText}>How to take a Mock OA on a laptop</Text>
            </Pressable>
            <SectionTitle title={`Approved tests (${tests.length})`} />
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No approved tests" body="Approved tests will appear here. Your saved results remain accessible below." />}
        renderItem={({ item }) => {
          const priorAttempts = Number(item.attempts) || 0;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Review ${item.title} and its saved attempts`}
              onPress={() => navigation.navigate('MockOaHistory', { testId: item.id, title: item.title })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.icon}><Ionicons name="document-text-outline" size={23} color={colors.warning} /></View>
              <View style={styles.content}>
                <View style={styles.titleLine}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.type ? <Badge tone="warning">{item.type}</Badge> : null}
                </View>
                <Text style={styles.company}>{item.companies?.name || 'Practice assessment'}</Text>
                <Text style={styles.meta}>{item.question_count || 0} questions · {item.duration || 0} min</Text>
                {priorAttempts ? <Text style={styles.attempt}>{priorAttempts} saved attempt{priorAttempts === 1 ? '' : 's'}{item.bestScore != null ? ` · Best ${item.bestScore} points` : ''}</Text> : null}
                <Text style={styles.startAction}>View saved results and laptop instructions →</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          );
        }}
        ListFooterComponent={(
          <View style={styles.history}>
            <SectionTitle title={`Your saved results (${history.length})`} />
            {!history.length ? <Text style={styles.emptyHistory}>No saved attempts yet. Complete a test on the website and refresh this page.</Text> : null}
            {history.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Saved result for ${item.testTitle}`} onPress={() => navigation.navigate('MockOaResult', { attemptId: item.id })} style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}>
                <View style={styles.resultCopy}>
                  <Text style={styles.resultTitle}>{item.testTitle || 'Mock OA'}</Text>
                  <Text style={styles.meta}>{item.company || 'Practice'} · {formatDate(item.submittedAt)}</Text>
                </View>
                <Text style={styles.resultScore}>{item.percentage == null ? '—' : `${item.percentage}%`}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0 },
  list: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 5, fontSize: 12, lineHeight: 18 },
  laptopHint: { marginTop: spacing.md, padding: 10, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2FF' },
  laptopText: { color: colors.primary, fontWeight: '800', fontSize: 12, flex: 1 },
  card: { padding: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  icon: { width: 47, height: 47, borderRadius: 14, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  content: { flex: 1, paddingRight: 8 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '900', flexShrink: 1 },
  company: { color: colors.muted, marginTop: 3, fontSize: 13 },
  meta: { color: colors.muted, marginTop: 5, fontSize: 12 },
  attempt: { color: colors.warning, marginTop: 6, fontSize: 12, fontWeight: '700' },
  startAction: { color: colors.primary, marginTop: 8, fontSize: 12, fontWeight: '800' },
  history: { marginTop: spacing.sm },
  emptyHistory: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  resultCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resultCopy: { flex: 1 },
  resultTitle: { color: colors.text, fontWeight: '800' },
  resultScore: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  pressed: { opacity: 0.75 },
});
