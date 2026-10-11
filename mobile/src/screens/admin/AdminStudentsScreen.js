import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { Badge, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import { adminApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { colors, spacing } from '../../constants/theme';

const statusOptions = [
  { value: 'placed', label: 'Placed', icon: 'checkmark-circle-outline', tone: colors.success },
  { value: 'unplaced', label: 'Unplaced', icon: 'time-outline', tone: colors.primary },
  { value: 'opted_out', label: 'Opted out', icon: 'remove-circle-outline', tone: colors.warning },
];

const placementTone = (status) => (
  status === 'placed' ? 'success' : status === 'opted_out' ? 'warning' : 'neutral'
);

export default function AdminStudentsScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { data, setData, loading, refreshing, error, reload } = useAsyncData(
    () => adminApi.students({ limit: 100 }),
    [],
  );
  const students = data?.students || [];
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) => (
      [student.full_name, student.roll_number, student.branch, student.users?.email]
        .some((value) => String(value || '').toLowerCase().includes(term))
    ));
  }, [students, search]);

  const update = (student, status) => {
    Alert.alert(
      'Update placement status?',
      `Set ${student.full_name || 'this student'} to “${status.replace('_', ' ')}”?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await adminApi.updatePlacement(student.id, status);
              setData((old) => ({
                ...old,
                students: (old?.students || []).map((item) => (
                  item.id === student.id ? { ...item, placement_status: status } : item
                )),
              }));
            } catch (err) {
              Alert.alert('Could not update student', err?.response?.data?.error || 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const chooseStatus = (status) => {
    const student = selectedStudent;
    setSelectedStudent(null);
    if (student) update(student, status);
  };

  if (loading) {
    return <><AppHeader navigation={navigation} title="Student records" /><LoadingState /></>;
  }
  if (error) {
    return <><AppHeader navigation={navigation} title="Student records" /><ErrorState message={error} onRetry={() => reload().catch(() => {})} /></>;
  }

  return (
    <>
      <AppHeader navigation={navigation} title="Student records" subtitle={`${data?.total ?? students.length} registered students`} />
      <Screen scroll={false}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={19} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, roll number, branch…"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
        </View>
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
          contentContainerStyle={[styles.list, !visible.length && styles.empty]}
          ListHeaderComponent={<Text style={styles.result}>{visible.length} record{visible.length === 1 ? '' : 's'}</Text>}
          ListEmptyComponent={<EmptyState title="No student records found" body="Try changing the search term." />}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelectedStudent(item)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <View style={styles.top}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(item.full_name || 'S')[0].toUpperCase()}</Text></View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.full_name || 'Student'}</Text>
                  <Text style={styles.meta}>{item.roll_number || 'No roll number'} · {item.branch || 'Branch not set'}</Text>
                  <Text style={styles.meta}>CGPA {item.cgpa ?? '—'} · Sem {item.semester ?? '—'} · Backlogs {item.backlogs ?? '—'}</Text>
                </View>
                <View style={styles.side}>
                  <Badge tone={placementTone(item.placement_status)}>{(item.placement_status || 'unplaced').replace('_', ' ')}</Badge>
                  <Ionicons name="ellipsis-horizontal" color={colors.muted} size={19} style={styles.more} />
                </View>
              </View>
              {item.users?.email ? <Text style={styles.email}>{item.users.email}</Text> : null}
              {item.skills?.length ? <Text style={styles.skills} numberOfLines={1}>Skills: {Array.isArray(item.skills) ? item.skills.join(', ') : item.skills}</Text> : null}
            </Pressable>
          )}
        />
      </Screen>

      <Modal transparent visible={Boolean(selectedStudent)} animationType="fade" onRequestClose={() => setSelectedStudent(null)}>
        <View style={styles.overlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close status selector" style={styles.backdrop} onPress={() => setSelectedStudent(null)} />
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Placement status</Text>
            <Text style={styles.sheetSubtitle} numberOfLines={1}>{selectedStudent?.full_name || 'Student'}</Text>
            {statusOptions.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                onPress={() => chooseStatus(option.value)}
                style={({ pressed }) => [styles.statusButton, pressed && styles.pressed]}
              >
                <View style={[styles.statusIcon, { backgroundColor: `${option.tone}18` }]}>
                  <Ionicons name={option.icon} size={22} color={option.tone} />
                </View>
                <Text style={styles.statusLabel}>{option.label}</Text>
                {selectedStudent?.placement_status === option.value ? <Ionicons name="checkmark" size={21} color={colors.success} /> : <Ionicons name="chevron-forward" size={20} color="#94A3B8" />}
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" onPress={() => setSelectedStudent(null)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  search: { height: 48, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 11 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, marginLeft: 8, height: '100%' },
  list: { gap: 9, paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  result: { color: colors.muted, fontSize: 12, fontWeight: '800', marginBottom: 2 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
  top: { flexDirection: 'row', alignItems: 'center' },
  avatar: { height: 41, width: 41, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', marginRight: 10 },
  avatarText: { color: colors.primary, fontWeight: '900', fontSize: 16 },
  info: { flex: 1, paddingRight: 5 },
  name: { color: colors.text, fontSize: 15, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  side: { alignItems: 'flex-end' },
  more: { marginTop: 6 },
  email: { color: colors.muted, fontSize: 11, marginTop: 9, paddingTop: 8, borderTopWidth: 1, borderColor: colors.border },
  skills: { color: colors.primary, fontSize: 11, marginTop: 4 },
  pressed: { opacity: 0.75 },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: spacing.lg, paddingBottom: 28 },
  sheetHandle: { width: 38, height: 4, borderRadius: 99, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  sheetSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 15 },
  statusButton: { minHeight: 57, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: '#F1F5F9' },
  statusIcon: { height: 36, width: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  statusLabel: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 15 },
  cancelButton: { marginTop: 13, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#F1F5F9' },
  cancelText: { color: colors.text, fontWeight: '800' },
});
