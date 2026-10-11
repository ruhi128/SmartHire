import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import { AppButton, Card, ErrorState, FormInput, LoadingState, SectionTitle } from '../../components/Ui';
import { studentApi } from '../../api';
import { colors, spacing } from '../../constants/theme';
import { DEMO_MODE } from '../../config/runtime';
import { apiErrorMessage } from '../../api/client';
import useAsyncData from '../../utils/useAsyncData';
import { buildResumeHtml, createAndSharePdf, createPdfFromHtml, resumeThemes } from '../../utils/documentExport';
import { useAuth } from '../../context/AuthContext';

const DRAFT_VERSION = 'smarthire.resume-builder.v1';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  summary: '',
  college: '',
  degree: '',
  branch: '',
  cgpa: '',
  gradYear: '',
  skills: '',
  experience: '',
  projects: '',
  certifications: '',
  achievements: '',
};

const sections = [
  { id: 'personal', label: 'Personal' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'extras', label: 'Extras' },
];

function resumeDefaults(profile = {}, user = {}) {
  return {
    ...emptyForm,
    name: profile.full_name || user.name || '',
    email: profile.email || user.email || '',
    phone: profile.phone || '',
    linkedin: profile.linkedin_url || '',
    github: profile.github_url || '',
    branch: profile.branch || '',
    cgpa: profile.cgpa === undefined || profile.cgpa === null ? '' : String(profile.cgpa),
    skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : (profile.skills || ''),
    certifications: Array.isArray(profile.certifications) ? profile.certifications.join('\n') : (profile.certifications || ''),
  };
}

function listFromText(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function FieldRow({ children }) {
  return <View style={styles.fieldRow}>{children}</View>;
}

export default function ResumeBuilderScreen({ navigation }) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsyncData(() => studentApi.profile(), []);
  const profile = data?.profile || {};
  const draftKey = `${DRAFT_VERSION}:${user?.id || 'guest'}`;
  const [form, setForm] = useState(emptyForm);
  const [template, setTemplate] = useState('classic');
  const [activeSection, setActiveSection] = useState('personal');
  const [draftLoading, setDraftLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const profileMerged = useRef(false);

  useEffect(() => {
    let mounted = true;
    setDraftLoading(true);
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        if (!mounted || !raw) return;
        try {
          const stored = JSON.parse(raw);
          if (stored?.form && typeof stored.form === 'object') setForm((old) => ({ ...old, ...stored.form }));
          if (stored?.template && resumeThemes[stored.template]) setTemplate(stored.template);
        } catch {
          // Invalid local drafts are ignored; the user can start a new draft safely.
        }
      })
      .finally(() => { if (mounted) setDraftLoading(false); });
    return () => { mounted = false; };
  }, [draftKey]);

  useEffect(() => {
    if (draftLoading || loading || profileMerged.current) return;
    const defaults = resumeDefaults(profile, user || {});
    setForm((old) => {
      const merged = { ...old };
      Object.entries(defaults).forEach(([key, value]) => {
        if (!String(merged[key] || '').trim() && String(value || '').trim()) merged[key] = value;
      });
      return merged;
    });
    profileMerged.current = true;
  }, [draftLoading, loading, profile, user]);

  const set = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));
  const theme = resumeThemes[template] || resumeThemes.classic;
  const skillPreview = useMemo(() => String(form.skills || '').split(',').map((item) => item.trim()).filter(Boolean), [form.skills]);

  const validResume = () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert('Name and email required', 'Add your name and email before creating the PDF.');
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    setBusy('draft');
    try {
      await AsyncStorage.setItem(draftKey, JSON.stringify({ form, template, savedAt: new Date().toISOString() }));
      Alert.alert('Draft saved', 'Your resume draft is stored locally on this device.');
    } catch {
      Alert.alert('Could not save draft', 'Please make sure your device has available storage and try again.');
    } finally {
      setBusy('');
    }
  };

  const profilePayload = () => ({
    full_name: form.name.trim(),
    phone: form.phone.trim(),
    branch: form.branch.trim(),
    semester: profile.semester === undefined || profile.semester === null ? '' : String(profile.semester),
    cgpa: form.cgpa.trim(),
    skills: listFromText(form.skills),
    certifications: listFromText(form.certifications),
    linkedin_url: form.linkedin.trim(),
    github_url: form.github.trim(),
    tenth_percent: profile.tenth_percent === undefined || profile.tenth_percent === null ? '' : String(profile.tenth_percent),
    twelfth_percent: profile.twelfth_percent === undefined || profile.twelfth_percent === null ? '' : String(profile.twelfth_percent),
    backlogs: profile.backlogs === undefined || profile.backlogs === null ? '0' : String(profile.backlogs),
    placement_status: profile.placement_status || 'unplaced',
  });

  const saveProfileDetails = async ({ silent = false } = {}) => {
    const response = await studentApi.updateProfile(profilePayload());
    if (!silent) Alert.alert('Profile updated', response.message || 'Your profile details were updated.');
    return response;
  };

  const syncProfile = async () => {
    if (!form.name.trim()) return Alert.alert('Name required', 'Add your full name before syncing your profile.');
    setBusy('profile');
    try {
      await saveProfileDetails();
    } catch (err) {
      Alert.alert('Could not update profile', apiErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const exportPdf = async () => {
    if (!validResume()) return;
    setBusy('export');
    try {
      await createAndSharePdf(buildResumeHtml(form, template), 'Share resume PDF');
    } catch (err) {
      Alert.alert('Could not export PDF', err?.message || 'Please try again on an Android or iOS device.');
    } finally {
      setBusy('');
    }
  };

  const savePdfToProfile = async () => {
    if (!validResume()) return;
    if (DEMO_MODE) return Alert.alert('Profile upload unavailable', 'Local demo mode does not create or upload a profile file. Use Save draft for device-only data, or Export / share PDF for a local device action.');
    setBusy('upload');
    try {
      await saveProfileDetails({ silent: true });
      const uri = await createPdfFromHtml(buildResumeHtml(form, template));
      const body = new FormData();
      const safeName = form.name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'resume';
      body.append('resume', { uri, name: `${safeName}_resume.pdf`, type: 'application/pdf' });
      const response = await studentApi.uploadResume(body);
      await AsyncStorage.setItem(draftKey, JSON.stringify({ form, template, savedAt: new Date().toISOString() }));
      Alert.alert('Resume saved', response.message || 'Your PDF resume is now attached to your SmartHire profile.');
    } catch (err) {
      Alert.alert('Could not save resume', apiErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  if (loading || draftLoading) return <><AppHeader navigation={navigation} title="Resume builder" /><LoadingState label="Preparing your resume builder…" /></>;

  return (
    <>
      <AppHeader navigation={navigation} title="Resume builder" subtitle={DEMO_MODE ? 'Create a device-only sample resume draft' : 'Create, share, or save a PDF resume'} />
      <Screen>
        {error ? <ErrorState message="Your profile could not be loaded. You can still create a local resume draft." onRetry={() => reload().catch(() => {})} /> : null}
        <Card style={styles.intro}>
          <View style={[styles.introIcon, { backgroundColor: `${theme.accent}18` }]}><Ionicons name="document-text-outline" size={25} color={theme.accent} /></View>
          <View style={styles.introText}><Text style={styles.introTitle}>Mobile-friendly resume builder</Text><Text style={styles.introCopy}>{DEMO_MODE ? 'This demo uses local sample data. Drafts remain on this device; profile file upload is unavailable.' : 'Fields marked in your profile can be synced to SmartHire; the full draft remains on this device until you save or export it.'}</Text></View>
        </Card>

        <SectionTitle title="Template" />
        <View style={styles.templates}>
          {Object.entries(resumeThemes).map(([id, item]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: template === id }}
              onPress={() => setTemplate(id)}
              style={({ pressed }) => [styles.template, template === id && { borderColor: item.accent, backgroundColor: item.soft }, pressed && styles.pressed]}
            >
              <View style={[styles.templateSwatch, { backgroundColor: item.accent }]} />
              <Text style={[styles.templateName, template === id && { color: item.accent }]}>{item.name}</Text>
              {template === id ? <Ionicons name="checkmark-circle" size={17} color={item.accent} /> : null}
            </Pressable>
          ))}
        </View>

        <Card style={styles.preview}>
          <View style={[styles.previewHeader, { backgroundColor: theme.accent }]}>
            <Text style={styles.previewName} numberOfLines={1}>{form.name || 'Your Name'}</Text>
            <Text style={styles.previewContact} numberOfLines={1}>{form.email || 'your.email@example.com'}{form.phone ? ` · ${form.phone}` : ''}</Text>
          </View>
          <View style={styles.previewBody}>
            <Text style={[styles.previewHeading, { color: theme.accent }]}>PROFILE SNAPSHOT</Text>
            <Text style={styles.previewSummary} numberOfLines={3}>{form.summary || 'Add a professional summary to introduce your skills and career goals.'}</Text>
            {skillPreview.length ? <View style={styles.skillPreview}>{skillPreview.slice(0, 6).map((skill, index) => <View key={`${skill}-${index}`} style={[styles.skillChip, { backgroundColor: theme.soft }]}><Text style={[styles.skillText, { color: theme.accent }]}>{skill}</Text></View>)}</View> : null}
          </View>
        </Card>

        <SectionTitle title="Resume details" />
        <View style={styles.tabs}>
          {sections.map((section) => (
            <Pressable key={section.id} accessibilityRole="tab" accessibilityState={{ selected: activeSection === section.id }} onPress={() => setActiveSection(section.id)} style={[styles.tab, activeSection === section.id && styles.tabActive]}>
              <Text style={[styles.tabText, activeSection === section.id && styles.tabTextActive]}>{section.label}</Text>
            </Pressable>
          ))}
        </View>

        <Card>
          {activeSection === 'personal' ? <>
            <Text style={styles.cardTitle}>Personal information</Text>
            <FieldRow><FormInput style={styles.half} label="Full name" value={form.name} onChangeText={set('name')} placeholder="Aarav Kumar" /><FormInput style={styles.half} label="Email" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" /></FieldRow>
            <FieldRow><FormInput style={styles.half} label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+91 98765 43210" /><FormInput style={styles.half} label="Location" value={form.location} onChangeText={set('location')} placeholder="Mumbai, India" /></FieldRow>
            <FormInput label="LinkedIn URL" value={form.linkedin} onChangeText={set('linkedin')} autoCapitalize="none" keyboardType="url" placeholder="linkedin.com/in/you" />
            <FormInput label="GitHub URL" value={form.github} onChangeText={set('github')} autoCapitalize="none" keyboardType="url" placeholder="github.com/you" />
            <FormInput label="Professional summary" multiline value={form.summary} onChangeText={set('summary')} placeholder="Briefly describe your strengths, interests, and career direction." />
          </> : null}

          {activeSection === 'education' ? <>
            <Text style={styles.cardTitle}>Education</Text>
            <FormInput label="College or university" value={form.college} onChangeText={set('college')} placeholder="Institute name" />
            <FieldRow><FormInput style={styles.half} label="Degree" value={form.degree} onChangeText={set('degree')} placeholder="B.Tech" /><FormInput style={styles.half} label="Branch / major" value={form.branch} onChangeText={set('branch')} placeholder="Computer Science" /></FieldRow>
            <FieldRow><FormInput style={styles.half} label="CGPA" value={form.cgpa} onChangeText={set('cgpa')} keyboardType="decimal-pad" placeholder="8.5" /><FormInput style={styles.half} label="Graduation year" value={form.gradYear} onChangeText={set('gradYear')} keyboardType="number-pad" placeholder="2027" /></FieldRow>
          </> : null}

          {activeSection === 'skills' ? <>
            <Text style={styles.cardTitle}>Skills</Text>
            <FormInput label="Technical skills" multiline value={form.skills} onChangeText={set('skills')} placeholder="React, Node.js, Python, SQL, Git" />
            <Text style={styles.helper}>Separate skills with commas. They appear as concise skill tags in the PDF.</Text>
          </> : null}

          {activeSection === 'experience' ? <>
            <Text style={styles.cardTitle}>Experience</Text>
            <FormInput label="Internships and work experience" multiline value={form.experience} onChangeText={set('experience')} placeholder={'Software Intern — Company (Jun–Aug 2026)\n• Built REST APIs using Node.js\n• Collaborated with a cross-functional team'} />
            <Text style={styles.helper}>Put a role or organisation on its own line. Start achievement lines with a dash or bullet.</Text>
          </> : null}

          {activeSection === 'projects' ? <>
            <Text style={styles.cardTitle}>Projects</Text>
            <FormInput label="Projects" multiline value={form.projects} onChangeText={set('projects')} placeholder={'SmartHire — React, Node.js, Supabase\n• Built a role-based placement platform\n• Added assessment and application workflows'} />
            <Text style={styles.helper}>Put a project name and tech stack on its own line, followed by bullet points.</Text>
          </> : null}

          {activeSection === 'extras' ? <>
            <Text style={styles.cardTitle}>Certifications and achievements</Text>
            <FormInput label="Certifications" multiline value={form.certifications} onChangeText={set('certifications')} placeholder={'AWS Certified Cloud Practitioner\nData Structures and Algorithms — Coursera'} />
            <FormInput label="Achievements and activities" multiline value={form.achievements} onChangeText={set('achievements')} placeholder={'Hackathon finalist\nCoding club coordinator'} />
          </> : null}
        </Card>

        <SectionTitle title="Save and export" />
        <Card style={styles.actionsCard}>
          <Text style={styles.actionCopy}>{DEMO_MODE ? <>Use <Text style={styles.bold}>Save draft</Text> to continue later on this device. Export opens your device’s share sheet. Profile PDF upload is intentionally unavailable in local demo mode.</> : <>Use <Text style={styles.bold}>Save draft</Text> to continue later on this device. Export opens your device’s share sheet; saving to profile creates and uploads a PDF resume.</>}</Text>
          <AppButton title="Save draft on this device" variant="outline" onPress={saveDraft} loading={busy === 'draft'} style={styles.actionButton} />
          <AppButton title="Sync profile details" variant="outline" onPress={syncProfile} loading={busy === 'profile'} style={styles.actionButton} />
          <AppButton title="Export / share PDF" onPress={exportPdf} loading={busy === 'export'} style={styles.actionButton} />
          <AppButton title={DEMO_MODE ? 'Profile upload unavailable in demo' : 'Create PDF and save to profile'} variant="secondary" onPress={savePdfToProfile} loading={busy === 'upload'} disabled={DEMO_MODE} style={styles.actionButton} />
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', alignItems: 'flex-start' },
  introIcon: { height: 47, width: 47, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  introText: { flex: 1 },
  introTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  introCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  template: { width: '48.7%', minHeight: 48, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' },
  templateSwatch: { height: 18, width: 18, borderRadius: 6, marginRight: 7 },
  templateName: { color: colors.text, fontSize: 13, fontWeight: '800', flex: 1 },
  preview: { marginTop: spacing.md, padding: 0, overflow: 'hidden' },
  previewHeader: { padding: 16 },
  previewName: { color: colors.white, fontSize: 20, fontWeight: '900' },
  previewContact: { color: '#E2E8F0', fontSize: 11, marginTop: 4 },
  previewBody: { padding: 14 },
  previewHeading: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  previewSummary: { color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 5 },
  skillPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 11 },
  skillChip: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  skillText: { fontSize: 10, fontWeight: '800' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: spacing.sm },
  tab: { borderRadius: 99, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: colors.white },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: spacing.md },
  fieldRow: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -3 },
  actionsCard: { marginBottom: spacing.md },
  actionCopy: { color: colors.muted, lineHeight: 20, fontSize: 12 },
  bold: { color: colors.text, fontWeight: '800' },
  actionButton: { marginTop: 10 },
  pressed: { opacity: 0.75 },
});
