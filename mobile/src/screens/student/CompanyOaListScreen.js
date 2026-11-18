import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { Badge, EmptyState, ErrorState, LoadingState, SectionTitle } from '../../components/Ui';
import { companyOaApi } from '../../api';
import { colors, spacing } from '../../constants/theme';
import { formatDate } from '../../utils/format';
import useAsyncData from '../../utils/useAsyncData';
import { apiErrorMessage } from '../../api/client';
import { LAPTOP_FEATURES, showLaptopRequired } from '../../components/LaptopRequired';

export default function CompanyOaListScreen({ navigation, route }) {
  const refreshKey = route?.params?.refreshKey;
  const { data, loading, refreshing, error, reload } = useAsyncData(async () => {
    // A previous API revision lacks /api/companyoa/history. Its 404 must not
    // hide the eligible assessments, but must not masquerade as zero attempts.
    const [available, saved] = await Promise.all([
      companyOaApi.available(),
      companyOaApi.history().then((value) => ({ value }), (failure) => ({ failure })),
    ]);
    const historyError = saved.failure?.response?.status === 404
      ? 'Saved Company OA results need the newer SmartHire backend. Ask the backend owner to deploy /api/companyoa/history.'
      : saved.failure ? apiErrorMessage(saved.failure) : '';
    return { tests: available.tests || [], history: saved.value?.history || [], historyError };
  }, [refreshKey]);
  const tests = data?.tests || [];
  const history = data?.history || [];
  const historyError = data?.historyError || '';

  if (loading) return <LoadingState label="Loading company assessments and results…" />;
  if (error) return <ErrorState message={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <Screen scroll={false} contentContainerStyle={styles.page}>
      <FlatList
        data={tests}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
        ListHeaderComponent={<View>
          <Text style={styles.title}>Company OA</Text>
          <Text style={styles.subtitle}>Approved assessments matching your eligibility and your saved results are available here. Each official assessment allows one attempt on the SmartHire website using a laptop.</Text>
          <Pressable accessibilityRole="button" onPress={() => showLaptopRequired(LAPTOP_FEATURES.companyOa)} style={styles.notice}>
            <Ionicons name="laptop-outline" size={19} color={colors.info} />
            <Text style={styles.noticeText}>How to take your one attempt on a laptop</Text>
          </Pressable>
          {historyError ? <Text style={styles.historyWarning}>{historyError}</Text> : null}
          <SectionTitle title={`Eligible tests (${tests.length})`} />
        </View>}
        ListEmptyComponent={<EmptyState title="No eligible company assessments" body={historyError ? 'Check your branch and CGPA in Profile. Saved results are temporarily unavailable; see the update notice above.' : 'Complete your branch and CGPA in Profile, then check again. Past results remain accessible below even if a test is no longer active.'} />}
        renderItem={({ item }) => {
          const previous = history.find((attempt) => attempt.testId === item.id);
          const alreadyAttempted = Number(item.attempt_count) > 0 || Boolean(previous);
          const openTest = () => {
            if (!alreadyAttempted) return showLaptopRequired(LAPTOP_FEATURES.companyOa);
            if (!previous?.id) return Alert.alert('Result unavailable', historyError || 'Pull to refresh your saved results, then try again.');
            navigation.navigate('CompanyOaResult', { attemptId: previous.id });
          };
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={alreadyAttempted ? `View saved result for ${item.title}` : `Laptop instructions for ${item.title}`}
              onPress={openTest}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.icon}><Ionicons name="business-outline" size={23} color={colors.success} /></View>
              <View style={styles.content}>
                <View style={styles.titleLine}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.test_type ? <Badge tone="success">{item.test_type}</Badge> : null}
                </View>
                <Text style={styles.company}>{item.companies?.name || 'Company'}</Text>
                <Text style={styles.meta}>{item.duration || 0} min · Min. CGPA {item.min_cgpa ?? 0}</Text>
                {alreadyAttempted ? <Text style={styles.startAction}>View your saved result →</Text> : <Text style={styles.startAction}>Take this Company OA on a laptop →</Text>}
              </View>
              <Ionicons name={alreadyAttempted ? 'checkmark-circle' : 'chevron-forward'} size={20} color={alreadyAttempted ? colors.success : colors.primary} />
            </Pressable>
          );
        }}
        ListFooterComponent={<View style={styles.history}>
          <SectionTitle title={historyError ? 'Your saved results (unavailable)' : `Your saved results (${history.length})`} />
          {!history.length && !historyError ? <Text style={styles.emptyHistory}>No attempts saved yet. Complete an eligible test on a laptop and refresh here.</Text> : null}
          {history.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Saved result for ${item.title}`} onPress={() => navigation.navigate('CompanyOaResult', { attemptId: item.id })} style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}>
            <View style={styles.resultCopy}>
              <Text style={styles.resultTitle}>{item.title || 'Company OA'}</Text>
              <Text style={styles.meta}>{item.company || 'Company'} · {formatDate(item.submittedAt)}</Text>
            </View>
            <Text style={styles.resultScore}>{item.pct == null ? '—' : `${item.pct}%`}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>)}
        </View>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0 },
  list: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  title: { color: colors.text, fontWeight: '900', fontSize: 25 },
  subtitle: { color: colors.muted, marginTop: 5, lineHeight: 19, fontSize: 12 },
  notice: { marginTop: spacing.md, borderColor: '#BAE6FD', borderWidth: 1, borderRadius: 11, padding: 10, backgroundColor: '#F0F9FF', flexDirection: 'row', gap: 8, alignItems: 'center' },
  noticeText: { flex: 1, color: colors.info, fontWeight: '800', fontSize: 12 },
  historyWarning: { color: '#9A3412', backgroundColor: '#FFF7ED', padding: 10, borderRadius: 10, marginTop: 10, lineHeight: 18, fontSize: 12 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center' },
  icon: { height: 47, width: 47, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#DCFCE7', marginRight: 11 },
  content: { flex: 1, paddingRight: 8 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 16, flexShrink: 1 },
  company: { color: colors.muted, fontSize: 13, marginTop: 3 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 5 },
  startAction: { color: colors.primary, marginTop: 8, fontSize: 12, fontWeight: '800' },
  history: { marginTop: spacing.sm },
  emptyHistory: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  resultCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resultCopy: { flex: 1 },
  resultTitle: { color: colors.text, fontWeight: '800' },
  resultScore: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  pressed: { opacity: 0.75 },
});
