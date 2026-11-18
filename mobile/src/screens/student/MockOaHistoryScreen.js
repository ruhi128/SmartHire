import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import Screen from '../../components/Screen';
import { AppButton, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import { mockOaApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors, spacing } from '../../constants/theme';
import { formatDate } from '../../utils/format';
import { LAPTOP_FEATURES, showLaptopRequired } from '../../components/LaptopRequired';

export default function MockOaHistoryScreen({ navigation, route }) {
  const { testId, title = 'Mock OA' } = route.params || {};
  const { data, loading, error, refreshing, reload } = useAsyncData(() => mockOaApi.history(), [testId]);
  const attempts = (data?.history || []).filter((attempt) => attempt.testId === testId);

  return <>
    <AppHeader navigation={navigation} title="Mock OA history" />
    <Screen hasHeader scroll={false}>
      {loading ? <LoadingState label="Loading saved results…" /> : error ? (
        <ErrorState message={error} onRetry={() => reload().catch(() => {})} />
      ) : (
        <FlatList
          data={attempts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
          ListHeaderComponent={<View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Your saved attempts ({attempts.length}). Taking or retaking this assessment is available only on the SmartHire website using a laptop.</Text>
            <AppButton title="How to take this on a laptop" variant="outline" onPress={() => showLaptopRequired(LAPTOP_FEATURES.mockOa)} style={styles.laptop} />
          </View>}
          ListEmptyComponent={<EmptyState title="No saved attempts" body="After you finish this assessment on a laptop, refresh to see your result here." />}
          renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open saved result from ${formatDate(item.submittedAt)}`} onPress={() => navigation.navigate('MockOaResult', { attemptId: item.id })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.content}>
              <Text style={styles.score}>{item.percentage == null ? 'Result pending' : `${item.percentage}%`}</Text>
              <Text style={styles.meta}>{item.score ?? '—'} / {item.totalPossible ?? '—'} points · {formatDate(item.submittedAt)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </Pressable>}
        />
      )}
    </Screen>
  </>;
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, gap: 10 },
  title: { color: colors.text, fontSize: 23, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  laptop: { marginTop: spacing.md, marginBottom: spacing.sm },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center' },
  content: { flex: 1 },
  score: { color: colors.primary, fontSize: 21, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 5 },
  pressed: { opacity: 0.75 },
});
