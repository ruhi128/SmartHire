import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { jobsApi } from '../../api';
import { FormInput, Badge, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import { colors, spacing } from '../../constants/theme';
import { formatDate, statusTone } from '../../utils/format';
import useAsyncData from '../../utils/useAsyncData';

export default function JobsListScreen({ navigation }) {
  const { data, loading, refreshing, error, reload } = useAsyncData(() => jobsApi.list(), []);
  const [search, setSearch] = useState('');
  const initialFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (initialFocus.current) { initialFocus.current = false; return undefined; }
    reload({ refresh: true }).catch(() => {});
    return undefined;
  }, [reload]));
  const jobs = Array.isArray(data) ? data : [];
  const displayed = useMemo(() => jobs.filter((job) => `${job.title} ${job.companies?.name} ${job.required_skills?.join(' ')}`.toLowerCase().includes(search.toLowerCase())), [jobs, search]);
  if (loading) return <LoadingState label="Loading opportunities…" />;
  if (error) return <ErrorState message={error} onRetry={() => reload().catch(() => {})} />;
  return (
    <View style={styles.page}>
      <View style={styles.heading}><Text style={styles.title}>Jobs</Text><Pressable onPress={() => navigation.navigate('Applications')}><Text style={styles.link}>My applications</Text></Pressable></View>
      <FormInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Search role, company or skill" />
      <FlatList
        data={displayed}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, !displayed.length && styles.empty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
        ListEmptyComponent={<EmptyState title="No matching jobs" body={jobs.length ? 'Try another search term.' : 'New approved opportunities will appear here.'} />}
        renderItem={({ item }) => <Pressable onPress={() => navigation.navigate('JobDetail', { jobId: item.id })} style={styles.card}><View style={styles.cardTop}><View style={styles.logo}><Ionicons name="business" color={colors.primary} size={20} /></View><View style={styles.headerText}><Text style={styles.jobTitle}>{item.title}</Text><Text style={styles.company}>{item.companies?.name || 'Company'}</Text></View>{item.application_status ? <Badge tone={statusTone(item.application_status)}>{item.application_status}</Badge> : null}</View><View style={styles.meta}><Text style={styles.metaText}><Ionicons name="cash-outline" size={13} /> {item.package_lpa ? `${item.package_lpa} LPA` : 'Package not stated'}</Text><Text style={styles.metaText}><Ionicons name="calendar-outline" size={13} /> Apply by {formatDate(item.deadline)}</Text></View>{item.required_skills?.length ? <View style={styles.tags}>{item.required_skills.slice(0, 3).map((skill) => <Badge key={skill}>{skill}</Badge>)}{item.required_skills.length > 3 ? <Text style={styles.moreSkills}>+{item.required_skills.length - 3}</Text> : null}</View> : null}</Pressable>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  link: { color: colors.primary, fontWeight: '800' },
  search: { marginBottom: 2 },
  list: { paddingBottom: spacing.xl, gap: spacing.md },
  empty: { flexGrow: 1 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  logo: { height: 43, width: 43, borderRadius: 13, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerText: { flex: 1 },
  jobTitle: { fontWeight: '900', color: colors.text, fontSize: 16 },
  company: { color: colors.muted, marginTop: 3, fontSize: 13 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  metaText: { color: colors.muted, fontSize: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 13 },
  moreSkills: { color: colors.muted, fontSize: 12 },
});
