import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { AppButton, Card, FormInput, SectionTitle } from '../../components/Ui';
import { jobsApi } from '../../api';
import { apiErrorMessage } from '../../api/client';
import { colors, spacing } from '../../constants/theme';
import { DEMO_MODE } from '../../config/runtime';

const BRANCHES = ['CE', 'CST', 'ENC', 'DS', 'AI', 'IT'];
const JOB_TYPES = [
  { value: 'full-time', label: 'Full time' },
  { value: 'internship', label: 'Internship' },
  { value: 'contract', label: 'Contract' },
];
const initial = {
  title: '',
  description: '',
  package_lpa: '',
  deadline: '',
  drive_date: '',
  min_cgpa: '6.0',
  max_backlogs: '0',
  job_type: 'full-time',
  eligible_branches: [],
  requiredSkills: '',
  rounds: '',
};

function localDateIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isPdf(asset) {
  return asset?.mimeType === 'application/pdf' || /\.pdf$/i.test(asset?.name || '');
}

function selectedFileLabel(file) {
  if (!file) return '';
  const size = file.size ? ` · ${(file.size / 1024).toFixed(0)} KB` : '';
  return `${file.name || 'Selected PDF'}${size}`;
}

function FileField({ label, hint, file, onPick, onClear, disabled }) {
  return (
    <View style={styles.fileField}>
      <Text style={styles.fileLabel}>{label}</Text>
      {file ? (
        <View style={styles.fileSelected}>
          <Ionicons name="document-text-outline" size={19} color={colors.primary} />
          <Text style={styles.fileName} numberOfLines={1}>{selectedFileLabel(file)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label}`} onPress={onClear} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.danger} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onPick}
          style={({ pressed }) => [styles.filePicker, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
        >
          <Ionicons name="attach-outline" size={19} color={colors.primary} />
          <View style={styles.filePickerText}>
            <Text style={styles.filePickerTitle}>{disabled ? 'PDF upload unavailable in demo' : `Choose PDF — ${hint}`}</Text>
            <Text style={styles.filePickerHint}>{disabled ? 'Live mode stores documents through SmartHire.' : 'Optional · PDF · maximum 10 MB'}</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

export default function PostJobScreen({ navigation }) {
  const [form, setForm] = useState(initial);
  const [jdFile, setJdFile] = useState(null);
  const [evalFile, setEvalFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));

  const toggleBranch = (branch) => {
    setForm((old) => ({
      ...old,
      eligible_branches: old.eligible_branches.includes(branch)
        ? old.eligible_branches.filter((item) => item !== branch)
        : [...old.eligible_branches, branch],
    }));
  };

  const choosePdf = async (setter, label) => {
    if (DEMO_MODE) {
      Alert.alert('Document upload unavailable', 'Local demo mode never reads, uploads, or stores device files. Switch to a configured live build to attach job documents.');
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled) return;
      const asset = picked.assets?.[0];
      if (!asset) return;
      if (!isPdf(asset)) {
        Alert.alert('Only PDF files are allowed', `Choose a PDF for ${label}.`);
        return;
      }
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert('File is too large', 'Choose a PDF no larger than 10 MB.');
        return;
      }
      setter(asset);
    } catch (error) {
      Alert.alert('Could not select document', error?.message || 'Please try again.');
    }
  };

  const validate = () => {
    const today = localDateIso();
    if (!form.title.trim()) return 'Enter the job title.';
    if (!form.description.trim()) return 'Enter a job description.';
    if (!form.package_lpa.trim() || Number(form.package_lpa) <= 0) return 'Enter a package greater than zero.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.deadline)) return 'Enter the deadline in YYYY-MM-DD format.';
    if (form.deadline < today) return `The deadline cannot be before ${today}.`;
    if (form.drive_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.drive_date)) return 'Enter the drive date in YYYY-MM-DD format.';
    if (form.drive_date && form.drive_date < form.deadline) return 'The drive date cannot be before the application deadline.';
    if (!form.eligible_branches.length) return 'Select at least one eligible branch.';
    if (Number(form.min_cgpa) < 0 || Number(form.min_cgpa) > 10) return 'Minimum CGPA must be between 0 and 10.';
    if (Number(form.max_backlogs) < 0) return 'Maximum backlogs cannot be negative.';
    return null;
  };

  const uploadDocument = async (file, kind) => {
    if (!file) return null;
    const body = new FormData();
    body.append('file', {
      uri: file.uri,
      name: file.name || `${kind}.pdf`,
      type: file.mimeType || 'application/pdf',
    });
    body.append('kind', kind);
    const response = await jobsApi.uploadDoc(body);
    return response.url;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) return Alert.alert('Check the job details', validationError);
    setSaving(true);
    try {
      // Keep the order identical to web: optional documents are persisted first,
      // then their server-issued URLs become part of the job submission.
      const jd_doc_url = await uploadDocument(jdFile, 'jd');
      const eval_doc_url = await uploadDocument(evalFile, 'eval');
      const response = await jobsApi.create({
        title: form.title.trim(),
        description: form.description.trim(),
        package_lpa: Number(form.package_lpa),
        deadline: form.deadline,
        drive_date: form.drive_date || null,
        min_cgpa: Number(form.min_cgpa || 0),
        max_backlogs: Number(form.max_backlogs || 0),
        job_type: form.job_type,
        eligible_branches: form.eligible_branches,
        required_skills: form.requiredSkills.split(',').map((item) => item.trim()).filter(Boolean),
        rounds: form.rounds.trim(),
        jd_doc_url,
        eval_doc_url,
      });
      Alert.alert(
        'Job submitted for approval',
        response.message || 'The placement team can now review this posting. Students will see it only after approval.',
        [{ text: 'View postings', onPress: () => navigation.replace('RecruiterJobs') }],
      );
    } catch (error) {
      Alert.alert('Could not post job', apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppHeader navigation={navigation} title="Post a job" />
      <Screen>
        <Card style={styles.notice}>
          <Ionicons name="information-circle-outline" size={21} color={colors.warning} />
          <Text style={styles.noticeText}>Recruiter-created jobs are reviewed by the placement team before publication. Approval makes the job visible to eligible students and sends the usual announcement.</Text>
        </Card>

        <SectionTitle title="Basic information" />
        <Card>
          <FormInput label="Job title *" value={form.title} onChangeText={set('title')} placeholder="Software Engineer" />
          <FormInput label="Job description *" value={form.description} onChangeText={set('description')} multiline placeholder="Describe the role, responsibilities, and expectations." />
          <View style={styles.row}>
            <FormInput style={styles.half} label="Package (LPA) *" value={form.package_lpa} onChangeText={set('package_lpa')} keyboardType="decimal-pad" placeholder="7.5" />
            <FormInput style={styles.half} label="Interview rounds" value={form.rounds} onChangeText={set('rounds')} placeholder="OA, technical, HR" />
          </View>
          <Text style={styles.inputLabel}>Job type</Text>
          <View style={styles.choiceRow}>
            {JOB_TYPES.map((type) => (
              <Pressable key={type.value} accessibilityRole="button" accessibilityState={{ selected: form.job_type === type.value }} onPress={() => setForm((old) => ({ ...old, job_type: type.value }))} style={[styles.choice, form.job_type === type.value && styles.choiceSelected]}>
                <Text style={[styles.choiceText, form.job_type === type.value && styles.choiceTextSelected]}>{type.label}</Text>
              </Pressable>
            ))}
          </View>
          <FormInput label="Required skills" value={form.requiredSkills} onChangeText={set('requiredSkills')} placeholder="Java, DSA, SQL, problem solving (comma separated)" />
        </Card>

        <SectionTitle title="Eligibility" />
        <Card>
          <View style={styles.row}>
            <FormInput style={styles.half} label="Minimum CGPA" value={form.min_cgpa} onChangeText={set('min_cgpa')} keyboardType="decimal-pad" />
            <FormInput style={styles.half} label="Maximum backlogs" value={form.max_backlogs} onChangeText={set('max_backlogs')} keyboardType="number-pad" />
          </View>
          <View style={styles.branchHead}>
            <Text style={styles.inputLabel}>Eligible branches *</Text>
            <View style={styles.branchActions}>
              <Pressable accessibilityRole="button" onPress={() => setForm((old) => ({ ...old, eligible_branches: BRANCHES }))}><Text style={styles.branchAction}>Select all</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => setForm((old) => ({ ...old, eligible_branches: [] }))}><Text style={[styles.branchAction, styles.clearAction]}>Clear</Text></Pressable>
            </View>
          </View>
          <View style={styles.branches}>
            {BRANCHES.map((branch) => {
              const selected = form.eligible_branches.includes(branch);
              return <Pressable key={branch} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggleBranch(branch)} style={[styles.branch, selected && styles.branchSelected]}>
                {selected ? <Ionicons name="checkmark-circle" size={14} color={colors.primary} /> : null}
                <Text style={[styles.branchText, selected && styles.branchTextSelected]}>{branch}</Text>
              </Pressable>;
            })}
          </View>
          <Text style={styles.branchCount}>{form.eligible_branches.length ? `${form.eligible_branches.length} branch${form.eligible_branches.length === 1 ? '' : 'es'} selected` : 'Select one or more branches.'}</Text>
        </Card>

        <SectionTitle title="Documents" />
        <Card>
          <Text style={styles.documentsIntro}>Attach an optional job-description PDF and/or assessment-evaluation PDF. Both files are reviewed with the posting.</Text>
          <FileField label="Job description (JD)" hint="company JD document" file={jdFile} onPick={() => choosePdf(setJdFile, 'the job description')} onClear={() => setJdFile(null)} disabled={DEMO_MODE} />
          <FileField label="Evaluation details" hint="assessment or evaluation criteria" file={evalFile} onPick={() => choosePdf(setEvalFile, 'the evaluation details')} onClear={() => setEvalFile(null)} disabled={DEMO_MODE} />
        </Card>

        <SectionTitle title="Schedule" />
        <Card>
          <View style={styles.row}>
            <FormInput style={styles.half} label="Application deadline *" value={form.deadline} onChangeText={set('deadline')} placeholder="YYYY-MM-DD" autoCapitalize="none" />
            <FormInput style={styles.half} label="Drive / test date" value={form.drive_date} onChangeText={set('drive_date')} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          </View>
          <Text style={styles.dateHelp}>Use calendar dates in YYYY-MM-DD form. The drive date is optional but cannot precede the deadline.</Text>
        </Card>

        <AppButton title="Submit for approval" onPress={submit} loading={saving} style={styles.submit} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: 10, borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  noticeText: { flex: 1, color: '#78350F', lineHeight: 19, fontSize: 12 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  inputLabel: { color: colors.text, fontWeight: '700', marginBottom: 7, fontSize: 14 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  choice: { borderWidth: 1, borderColor: colors.border, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.white },
  choiceSelected: { borderColor: colors.primary, backgroundColor: '#EEF2FF' },
  choiceText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  choiceTextSelected: { color: colors.primary },
  branchHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  branchActions: { flexDirection: 'row', gap: 12, marginBottom: 7 },
  branchAction: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  clearAction: { color: colors.danger },
  branches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  branch: { borderWidth: 1, borderColor: colors.border, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  branchSelected: { borderColor: colors.primary, backgroundColor: '#EEF2FF' },
  branchText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  branchTextSelected: { color: colors.primary },
  branchCount: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 9 },
  documentsIntro: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  fileField: { marginTop: 10 },
  fileLabel: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 7 },
  filePicker: { minHeight: 58, borderWidth: 1, borderStyle: 'dashed', borderColor: '#A5B4FC', backgroundColor: '#F8FAFF', borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  filePickerText: { flex: 1 },
  filePickerTitle: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  filePickerHint: { color: colors.muted, fontSize: 10, marginTop: 2 },
  fileSelected: { minHeight: 54, borderWidth: 1, borderColor: '#A5B4FC', backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileName: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.58 },
  pressed: { opacity: 0.78 },
  dateHelp: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -2 },
  submit: { marginTop: spacing.lg },
});
