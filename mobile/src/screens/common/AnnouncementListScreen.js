import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { announcementApi } from '../../api';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { Badge, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import useAsyncData from '../../utils/useAsyncData';
import { formatDate } from '../../utils/format';
import { colors, spacing } from '../../constants/theme';

export default function AnnouncementListScreen({ navigation }) {
  const { data, loading, refreshing, error, reload } = useAsyncData(() => announcementApi.list(), []);
  const list = Array.isArray(data) ? data : [];

  if (loading) return <><AppHeader navigation={navigation} title="Announcements" /><Screen hasHeader scroll={false} contentContainerStyle={styles.page}><LoadingState /></Screen></>;
  if (error) return <><AppHeader navigation={navigation} title="Announcements" /><Screen hasHeader scroll={false} contentContainerStyle={styles.page}><ErrorState message={error} onRetry={() => reload().catch(() => {})} /></Screen></>;

  return (
    <>
      <AppHeader navigation={navigation} title="Announcements" />
      <Screen hasHeader scroll={false} contentContainerStyle={styles.page}>
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, !list.length && styles.empty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
          ListEmptyComponent={<EmptyState title="No announcements" body="Announcements from the placement cell will appear here." />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}><Text style={styles.title}>{item.title}</Text><Badge tone={item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'info'}>{item.priority || 'normal'}</Badge></View>
              <Text style={styles.content}>{item.content}</Text>
              <Text style={styles.meta}>{item.companies?.name ? `${item.companies.name} · ` : ''}{formatDate(item.created_at)}</Text>
            </View>
          )}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0 },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  card: { backgroundColor: colors.white, padding: spacing.md, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 16 },
  content: { color: colors.muted, lineHeight: 21, marginTop: 9 },
  meta: { color: '#94A3B8', marginTop: 12, fontSize: 12 },
});
