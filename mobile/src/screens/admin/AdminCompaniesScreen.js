import { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Linking, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import { adminApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors, shadow, spacing } from '../../constants/theme';

function SummaryMetric({ icon, label, value, tone }) {
  return (
    <View style={[styles.metric, { borderColor: `${tone}33`, backgroundColor: `${tone}0F` }]}>
      <Ionicons name={icon} size={18} color={tone} />
      <View style={styles.metricBody}>
        <Text style={[styles.metricValue, { color: tone }]}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function normaliseUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function CompanyLogo({ name, logoUrl }) {
  const [imageFailed, setImageFailed] = useState(false);
  const uri = normaliseUrl(logoUrl);
  return (
    <View style={styles.logo}>
      {uri && !imageFailed ? (
        <Image
          source={{ uri }}
          accessibilityLabel={`${name || 'Company'} logo`}
          style={styles.logoImage}
          resizeMode="contain"
          onError={() => setImageFailed(true)}
        />
      ) : <Text style={styles.logoText}>{(name || 'C')[0].toUpperCase()}</Text>}
    </View>
  );
}

export default function AdminCompaniesScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const { data, loading, refreshing, error, reload } = useAsyncData(() => adminApi.companies(), []);
  const companies = data?.companies || [];

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter((company) => [company.name, company.recruiterEmail, company.website]
      .some((value) => String(value || '').toLowerCase().includes(query)));
  }, [companies, search]);

  const totals = useMemo(() => companies.reduce((summary, company) => ({
    jobs: summary.jobs + Number(company.totalJobs || 0),
    activeJobs: summary.activeJobs + Number(company.activeJobs || 0),
  }), { jobs: 0, activeJobs: 0 }), [companies]);

  const openWebsite = async (website) => {
    const url = normaliseUrl(website);
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(url);
    } catch (_) {
      Alert.alert('Unable to open website', 'This device could not open the company website.');
    }
  };

  if (loading) return <><AppHeader navigation={navigation} title="Companies" /><LoadingState label="Loading company records…" /></>;
  if (error) return <><AppHeader navigation={navigation} title="Companies" /><ErrorState message={error} onRetry={() => reload().catch(() => {})} /></>;

  return (
    <>
      <AppHeader navigation={navigation} title="Companies" subtitle={`${companies.length} company record${companies.length === 1 ? '' : 's'} in the placement pool`} />
      <Screen scroll={false}>
        <FlatList
          data={filteredCompanies}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
          contentContainerStyle={[styles.list, !filteredCompanies.length && styles.empty]}
          ListHeaderComponent={(
            <View>
              <View style={styles.metrics}>
                <SummaryMetric icon="business-outline" label="Companies" value={companies.length} tone={colors.primary} />
                <SummaryMetric icon="briefcase-outline" label="Job postings" value={totals.jobs} tone={colors.accent} />
                <SummaryMetric icon="pulse-outline" label="Active jobs" value={totals.activeJobs} tone={colors.success} />
              </View>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search company, recruiter, or website"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="search"
                  style={styles.searchInput}
                />
                {search ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear company search" onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </Pressable>
                ) : null}
              </View>
              {search ? <Text style={styles.resultText}>{filteredCompanies.length} matching record{filteredCompanies.length === 1 ? '' : 's'}</Text> : null}
            </View>
          )}
          ListEmptyComponent={(
            <EmptyState
              title={search ? 'No matching companies' : 'No companies found'}
              body={search ? 'Try a different company name, recruiter email, or website.' : 'Company records linked to recruiters will appear here.'}
            />
          )}
          renderItem={({ item }) => {
            const active = Number(item.activeJobs || 0) > 0;
            return (
              <View style={styles.card}>
                <View style={styles.top}>
                  <CompanyLogo name={item.name} logoUrl={item.logoUrl} />
                  <View style={styles.main}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{item.name || 'Company'}</Text>
                      <View style={[styles.status, active ? styles.activeStatus : styles.inactiveStatus]}>
                        <Text style={[styles.statusText, active ? styles.activeStatusText : styles.inactiveStatusText]}>{active ? 'Active' : 'No active jobs'}</Text>
                      </View>
                    </View>
                    <Text style={styles.email}>{item.recruiterEmail || 'Recruiter email not available'}</Text>
                    {item.website ? (
                      <Pressable onPress={() => openWebsite(item.website)} hitSlop={5} style={styles.websiteRow}>
                        <Ionicons name="open-outline" size={12} color={colors.primary} />
                        <Text numberOfLines={1} style={styles.website}>{item.website}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                <View style={styles.stats}>
                  <View style={styles.stat}><Text style={styles.value}>{item.totalJobs || 0}</Text><Text style={styles.label}>Job postings</Text></View>
                  <View style={styles.divider} />
                  <View style={styles.stat}><Text style={[styles.value, { color: colors.success }]}>{item.activeJobs || 0}</Text><Text style={styles.label}>Active jobs</Text></View>
                  <View style={styles.divider} />
                  <View style={styles.stat}><Ionicons name="person-outline" size={18} color={colors.muted} /><Text style={styles.label}>Recruiter</Text></View>
                </View>
              </View>
            );
          }}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  metrics: { flexDirection: 'row', gap: 8, marginBottom: 13 },
  metric: { flex: 1, minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 9, borderWidth: 1, borderRadius: 12 },
  metricBody: { flex: 1, minWidth: 0 },
  metricValue: { fontSize: 18, lineHeight: 21, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 2 },
  searchBox: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.white, marginBottom: 9 },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 8 },
  resultText: { color: colors.muted, fontSize: 11, marginBottom: 2 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 13, ...shadow },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  logo: { width: 45, height: 45, borderRadius: 14, overflow: 'hidden', backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoImage: { width: '100%', height: '100%' },
  logoText: { color: colors.primary, fontSize: 17, fontWeight: '900' }, 
  main: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  name: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 20, fontWeight: '900' },
  status: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  activeStatus: { backgroundColor: '#DCFCE7' },
  inactiveStatus: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 10, fontWeight: '800' },
  activeStatusText: { color: '#166534' },
  inactiveStatusText: { color: '#92400E' },
  email: { color: colors.muted, marginTop: 4, fontSize: 12 },
  websiteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, paddingRight: 8 },
  website: { flex: 1, color: colors.primary, fontSize: 11 },
  stats: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderColor: colors.border },
  stat: { flex: 1, minHeight: 37, alignItems: 'center', justifyContent: 'center' },
  value: { color: colors.text, fontWeight: '900', fontSize: 17 },
  label: { color: colors.muted, fontSize: 10, marginTop: 3, textAlign: 'center' },
  divider: { height: 34, borderLeftWidth: 1, borderColor: colors.border },
});
