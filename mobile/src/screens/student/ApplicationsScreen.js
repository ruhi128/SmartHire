import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { applicationsApi } from '../../api';
import Screen from '../../components/Screen';
import { Badge, Card, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import { colors, spacing } from '../../constants/theme';
import { formatDate, statusTone } from '../../utils/format';
import useAsyncData from '../../utils/useAsyncData';

const stageLabels = { applied: 'Application submitted', oa_cleared: 'Cleared online assessment', interview_1_cleared: 'Cleared interview round 1', interview_2_cleared: 'Cleared interview round 2', selected: 'Selected', rejected: 'Not selected' };

export default function ApplicationsScreen() {
  const { data, loading, refreshing, error, reload } = useAsyncData(() => applicationsApi.mine(), []);
  const initialFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (initialFocus.current) { initialFocus.current = false; return undefined; }
    reload({ refresh: true }).catch(() => {});
    return undefined;
  }, [reload]));
  const applications = Array.isArray(data) ? data : [];
  if (loading) return <Screen scroll={false} contentContainerStyle={styles.page}><LoadingState label="Loading applications…" /></Screen>;
  if (error) return <Screen scroll={false} contentContainerStyle={styles.page}><ErrorState message={error} onRetry={() => reload().catch(() => {})} /></Screen>;
  return <Screen scroll={false} contentContainerStyle={styles.page}><Text style={styles.heading}>My applications</Text><FlatList data={applications} keyExtractor={(item) => String(item.id)} contentContainerStyle={[styles.list, !applications.length && styles.empty]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />} ListEmptyComponent={<EmptyState title="No applications yet" body="Applications you submit from the Jobs tab will appear here." />} renderItem={({ item }) => <Card style={styles.card}><View style={styles.top}><View style={styles.logo}><Ionicons name="business-outline" size={20} color={colors.primary} /></View><View style={styles.texts}><Text style={styles.title}>{item.job_postings?.title || 'Job role'}</Text><Text style={styles.company}>{item.job_postings?.companies?.name || 'Company'}</Text></View><Badge tone={statusTone(item.status)}>{item.status || 'applied'}</Badge></View><Text style={styles.applied}>Applied on {formatDate(item.applied_at)}</Text><View style={styles.timeline}>{(item.stage_history?.length ? item.stage_history : [{ stage: item.stage || 'applied', at: item.applied_at }]).slice(-4).map((entry, index, array) => <View key={`${entry.stage}-${index}`} style={styles.stage}><View style={styles.stageDot}><Ionicons name={index === array.length - 1 ? 'checkmark' : 'ellipse'} size={index === array.length - 1 ? 13 : 8} color={colors.white} /></View>{index < array.length - 1 ? <View style={styles.stageLine} /> : null}<View style={styles.stageText}><Text style={styles.stageTitle}>{stageLabels[entry.stage] || entry.stage}</Text>{entry.at ? <Text style={styles.stageDate}>{formatDate(entry.at)}</Text> : null}</View></View>)}</View></Card>} /></Screen>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, padding: 0, paddingTop: spacing.md }, heading: { paddingHorizontal: spacing.md, color: colors.text, fontSize: 25, fontWeight: '900', marginBottom: 12 }, list: { padding: spacing.md, paddingTop: 0, gap: spacing.md }, empty: { flexGrow: 1 }, card: { padding: 14 }, top: { flexDirection: 'row', alignItems: 'center' }, logo: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 }, texts: { flex: 1 }, title: { color: colors.text, fontWeight: '900', fontSize: 16 }, company: { color: colors.muted, marginTop: 3, fontSize: 13 }, applied: { color: colors.muted, marginTop: 12, fontSize: 12 }, timeline: { marginTop: 15, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }, stage: { minHeight: 38, flexDirection: 'row', position: 'relative' }, stageDot: { width: 21, height: 21, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 9, zIndex: 1 }, stageLine: { position: 'absolute', top: 20, left: 10, width: 1, height: 24, backgroundColor: '#C7D2FE' }, stageText: { flex: 1, paddingTop: 1 }, stageTitle: { color: colors.text, fontWeight: '700', fontSize: 13 }, stageDate: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
