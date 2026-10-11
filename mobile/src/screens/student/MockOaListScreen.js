import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { Badge, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import { mockOaApi } from '../../api';
import { colors, spacing } from '../../constants/theme';
import useAsyncData from '../../utils/useAsyncData';

export default function MockOaListScreen({ navigation, route }) {
  const refreshKey = route?.params?.refreshKey;
  const { data, loading, refreshing, error, reload } = useAsyncData(() => mockOaApi.tests(), [refreshKey]);
  const tests = data?.tests || [];

  if (loading) return <LoadingState label="Loading mock assessments…" />;
  if (error) return <ErrorState message={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <Screen scroll={false} contentContainerStyle={styles.page}>
      <View style={styles.heading}>
        <Text style={styles.title}>Mock OA</Text>
        <Text style={styles.subtitle}>Practice approved company-style online assessments right from your phone. Timers, review flags, and practice integrity signals follow the website workflow.</Text>
      </View>
      <FlatList
        data={tests}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, !tests.length && styles.empty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
        ListEmptyComponent={<EmptyState title="No mock assessments yet" body="Approved tests will appear here when they are available." />}
        renderItem={({ item }) => {
          const priorAttempts = Number(item.attempts) || 0;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${priorAttempts ? 'Attempt again' : 'Start'} ${item.title}`}
              onPress={() => navigation.navigate('MockOaAttempt', { testId: item.id, title: item.title })}
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
                {priorAttempts ? <Text style={styles.attempt}>Attempts: {priorAttempts}{item.bestScore !== null ? ` · Best ${item.bestScore}` : ''}</Text> : null}
                <Text style={styles.startAction}>{priorAttempts ? 'Start another practice attempt' : 'Start Mock OA'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0 },
  heading: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 2 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 5, fontSize: 12, lineHeight: 18 },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  card: { padding: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  icon: { width: 47, height: 47, borderRadius: 14, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  content: { flex: 1, paddingRight: 8 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '900', flexShrink: 1 },
  company: { color: colors.muted, marginTop: 3, fontSize: 13 },
  meta: { color: colors.muted, marginTop: 7, fontSize: 12 },
  attempt: { color: colors.warning, marginTop: 6, fontSize: 12, fontWeight: '700' },
  startAction: { color: colors.primary, marginTop: 8, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
