import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { Badge, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import { companyOaApi } from '../../api';
import { colors, spacing } from '../../constants/theme';
import useAsyncData from '../../utils/useAsyncData';

export default function CompanyOaListScreen({ navigation, route }) {
  const refreshKey = route?.params?.refreshKey;
  const { data, loading, refreshing, error, reload } = useAsyncData(() => companyOaApi.available(), [refreshKey]);
  const tests = data?.tests || [];

  if (loading) return <LoadingState label="Loading company assessments…" />;
  if (error) return <ErrorState message={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <Screen scroll={false} contentContainerStyle={styles.page}>
      <View style={styles.heading}>
        <Text style={styles.title}>Company OA</Text>
        <Text style={styles.subtitle}>Only approved assessments matching your eligibility are shown. Each official Company OA allows one timed, mobile-native attempt.</Text>
      </View>
      <View style={styles.notice}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.info} />
        <Text style={styles.noticeText}>Stay in SmartHire while you take an assessment. Leaving the app three times submits the active attempt, matching the website’s tab-switch safeguard.</Text>
      </View>
      <FlatList
        data={tests}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, !tests.length && styles.empty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
        ListEmptyComponent={<EmptyState title="No eligible company assessments" body="Complete your branch and CGPA in Profile, then check again when assessments are published." />}
        renderItem={({ item }) => {
          const alreadyAttempted = Number(item.attempt_count) > 0;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: alreadyAttempted }}
              accessibilityLabel={alreadyAttempted ? `${item.title}, already attempted` : `Start ${item.title}`}
              disabled={alreadyAttempted}
              onPress={() => navigation.navigate('CompanyOaAttempt', { testId: item.id, title: item.title })}
              style={({ pressed }) => [styles.card, alreadyAttempted && styles.cardDisabled, pressed && styles.pressed]}
            >
              <View style={styles.icon}><Ionicons name="business-outline" size={23} color={colors.success} /></View>
              <View style={styles.content}>
                <View style={styles.titleLine}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.test_type ? <Badge tone="success">{item.test_type}</Badge> : null}
                </View>
                <Text style={styles.company}>{item.companies?.name || 'Company'}</Text>
                <Text style={styles.meta}>{item.duration || 0} min · Min. CGPA {item.min_cgpa ?? 0}</Text>
                {alreadyAttempted ? <Badge tone="info" style={styles.attempt}>Attempt completed · {item.best_pct || 0}%{item.best_grade ? ` · Grade ${item.best_grade}` : ''}</Badge> : <Text style={styles.startAction}>Start Company OA</Text>}
              </View>
              <Ionicons name={alreadyAttempted ? 'checkmark-circle' : 'chevron-forward'} size={20} color={alreadyAttempted ? colors.success : colors.primary} />
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
  title: { color: colors.text, fontWeight: '900', fontSize: 25 },
  subtitle: { color: colors.muted, marginTop: 5, lineHeight: 19, fontSize: 12 },
  notice: { marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: 1, borderColor: '#BAE6FD', borderWidth: 1, borderRadius: 11, padding: 10, backgroundColor: '#F0F9FF', flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  noticeText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center' },
  cardDisabled: { opacity: 0.72, backgroundColor: '#F8FAFC' },
  icon: { height: 47, width: 47, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#DCFCE7', marginRight: 11 },
  content: { flex: 1, paddingRight: 8 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 16, flexShrink: 1 },
  company: { color: colors.muted, fontSize: 13, marginTop: 3 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 7 },
  attempt: { marginTop: 8, alignSelf: 'flex-start' },
  startAction: { color: colors.primary, marginTop: 8, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
