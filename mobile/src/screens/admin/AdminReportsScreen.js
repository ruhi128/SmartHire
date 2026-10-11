import { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { AppButton, Badge, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import { adminApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors, spacing } from '../../constants/theme';
import { buildPlacementReportHtml, createAndSharePdf } from '../../utils/documentExport';

function Metric({ label, value, color, icon }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}><Ionicons name={icon} size={18} color={color} /></View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function statusTone(status) {
  if (status === 'placed') return 'success';
  if (status === 'opted_out') return 'warning';
  return 'neutral';
}

export default function AdminReportsScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const { data, loading, refreshing, error, reload } = useAsyncData(() => adminApi.report(), []);
  const report = data?.report || [];
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return report;
    return report.filter((item) => [item.name, item.rollNumber, item.branch, item.placementStatus, item.company, item.role]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [report, search]);
  const placed = report.filter((item) => item.placementStatus === 'placed').length;
  const companies = new Set(report.map((item) => item.company).filter((name) => name && name !== '-')).size;

  const exportPdf = async () => {
    setExporting(true);
    try {
      await createAndSharePdf(buildPlacementReportHtml(report), 'Share placement report');
    } catch (err) {
      Alert.alert('Could not export report', err?.message || 'Please try again on an Android or iOS device.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <><AppHeader navigation={navigation} title="Placement report" /><LoadingState label="Preparing placement report…" /></>;
  if (error) return <><AppHeader navigation={navigation} title="Placement report" /><ErrorState message={error} onRetry={() => reload().catch(() => {})} /></>;

  return (
    <>
      <AppHeader navigation={navigation} title="Placement report" subtitle={`${report.length} student record${report.length === 1 ? '' : 's'}`} />
      <Screen scroll={false}>
        <View style={styles.metrics}>
          <Metric label="Students" value={report.length} color={colors.primary} icon="people-outline" />
          <Metric label="Placed" value={placed} color={colors.success} icon="ribbon-outline" />
          <Metric label="Companies" value={companies} color={colors.accent} icon="business-outline" />
        </View>
        <AppButton title="Export / share full PDF report" onPress={exportPdf} loading={exporting} style={styles.exportButton} />
        <View style={styles.search}>
          <Ionicons name="search-outline" size={19} color={colors.muted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search name, branch, company…" placeholderTextColor="#94A3B8" style={styles.searchInput} />
        </View>
        <FlatList
          data={visible}
          keyExtractor={(item, index) => `${item.rollNumber || item.email || item.name || 'student'}-${index}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
          contentContainerStyle={[styles.list, !visible.length && styles.empty]}
          ListHeaderComponent={<Text style={styles.result}>{visible.length} record{visible.length === 1 ? '' : 's'} shown</Text>}
          ListEmptyComponent={<EmptyState title="No records match this search" body="Try changing the search phrase." />}
          renderItem={({ item }) => (
            <View style={styles.record}>
              <View style={styles.recordTop}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(item.name || 'S')[0].toUpperCase()}</Text></View>
                <View style={styles.studentInfo}>
                  <Text style={styles.name}>{item.name || 'Student'}</Text>
                  <Text style={styles.meta}>{item.rollNumber || 'No roll number'} · {item.branch || 'Branch not set'} · CGPA {item.cgpa ?? '—'}</Text>
                </View>
                <Badge tone={statusTone(item.placementStatus)}>{(item.placementStatus || 'unplaced').replace('_', ' ')}</Badge>
              </View>
              {item.company && item.company !== '-' ? <View style={styles.offer}><Ionicons name="business-outline" size={15} color={colors.success} /><Text style={styles.offerText}>{item.company} · {item.role || 'Role not set'}{item.package && item.package !== '-' ? ` · ${item.package}` : ''}</Text></View> : <Text style={styles.noOffer}>No selected offer is recorded.</Text>}
            </View>
          )}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  metrics: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  metric: { flex: 1, alignItems: 'center' },
  metricIcon: { height: 32, width: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 4 },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 1 },
  exportButton: { marginBottom: 10 },
  search: { height: 48, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 11 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, marginLeft: 8, height: '100%' },
  list: { gap: 9, paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  result: { color: colors.muted, fontSize: 12, fontWeight: '800', marginBottom: 2 },
  record: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
  recordTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { height: 40, width: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', marginRight: 10 },
  avatarText: { color: colors.primary, fontWeight: '900', fontSize: 16 },
  studentInfo: { flex: 1, paddingRight: 8 },
  name: { color: colors.text, fontSize: 14, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  offer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: '#F1F5F9', marginTop: 9, paddingTop: 8 },
  offerText: { flex: 1, color: colors.success, fontSize: 11, fontWeight: '700', marginLeft: 6 },
  noOffer: { color: colors.muted, fontSize: 11, borderTopWidth: 1, borderColor: '#F1F5F9', marginTop: 9, paddingTop: 8 },
});
