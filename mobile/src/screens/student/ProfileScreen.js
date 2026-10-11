import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import NotificationSettingsCard from '../../components/NotificationSettingsCard';
import { AppButton, Badge, Card, ErrorState, FormInput, LoadingState, SectionTitle } from '../../components/Ui';
import { authApi, studentApi } from '../../api';
import useAsyncData from '../../utils/useAsyncData';
import { apiErrorMessage, apiUrl } from '../../api/client';
import { colors, spacing } from '../../constants/theme';
import { getInitials } from '../../utils/format';
import { DEMO_MODE } from '../../config/runtime';
import { useAuth } from '../../context/AuthContext';

const PLACEMENT_OPTIONS = [
  { value: 'unplaced', label: 'Unplaced', icon: 'time-outline' },
  { value: 'placed', label: 'Placed', icon: 'checkmark-circle-outline' },
  { value: 'opted_out', label: 'Opted out', icon: 'remove-circle-outline' },
];


const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// Keep the rest of the app usable if someone opens a JavaScript update in an
// older custom development build that was compiled before expo-image-picker.
// A freshly rebuilt native app is still required before photo selection works.
function getImagePicker() {
  try {
    return require('expo-image-picker');
  } catch {
    return null;
  }
}

function avatarMimeType(asset = {}) {
  const supplied = String(asset.mimeType || '').toLowerCase();
  if (['image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'].includes(supplied)) return supplied;
  const name = String(asset.fileName || asset.name || '').toLowerCase();
  if (/\.png$/.test(name)) return 'image/png';
  if (/\.webp$/.test(name)) return 'image/webp';
  if (/\.jpe?g$/.test(name)) return 'image/jpeg';
  return 'application/octet-stream';
}

function stringValue(value) {
  return value === undefined || value === null ? '' : String(value);
}

function fieldsFrom(profile = {}) {
  return {
    full_name: profile.full_name || '',
    phone: profile.phone || '',
    branch: profile.branch || '',
    semester: stringValue(profile.semester),
    cgpa: stringValue(profile.cgpa),
    tenth_percent: stringValue(profile.tenth_percent),
    twelfth_percent: stringValue(profile.twelfth_percent),
    backlogs: profile.backlogs === undefined || profile.backlogs === null ? '0' : String(profile.backlogs),
    placement_status: profile.placement_status || 'unplaced',
    skillsText: (profile.skills || []).join(', '),
    certificationsText: (profile.certifications || []).join(', '),
    linkedin_url: profile.linkedin_url || '',
    github_url: profile.github_url || '',
  };
}

function numberInRange(value, min, max, label, { integer = false } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max || (integer && !Number.isInteger(numeric))) {
    return `${label} must be ${integer ? 'a whole number ' : ''}between ${min} and ${max}.`;
  }
  return null;
}

// Earlier local sample data uses `seeking`; the production API's equivalent is
// `unplaced`. Keep the demo record intact while presenting one clear native
// label, and only send supported production values after a user changes it.
function canonicalPlacementStatus(value) {
  return value === 'seeking' ? 'unplaced' : value;
}

function placementOption(value) {
  return PLACEMENT_OPTIONS.find((option) => option.value === canonicalPlacementStatus(value)) || PLACEMENT_OPTIONS[0];
}

export default function ProfileScreen({ navigation }) {
  const { user, session, logout, updateUserLocally } = useAuth();
  const { data, loading, error, reload, setData } = useAsyncData(() => studentApi.profile(), []);
  const profile = data?.profile || {};
  const [form, setForm] = useState(fieldsFrom());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (data) setForm(fieldsFrom(profile));
  }, [data]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile.avatar_url, profile.avatar_updated_at, user?.avatar_url, user?.avatar_updated_at]);

  const currentPlacement = useMemo(() => placementOption(form.placement_status), [form.placement_status]);
  const avatarPath = profile.avatar_url || user?.avatar_url || null;
  const avatarSource = avatarPath && !DEMO_MODE && session?.token && !avatarFailed
    ? { uri: apiUrl(avatarPath), headers: { Authorization: `Bearer ${session.token}` } }
    : null;
  const set = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));

  const validate = () => {
    if (!form.full_name.trim()) return 'Enter your full name.';
    return (
      numberInRange(form.semester, 1, 8, 'Semester', { integer: true })
      || numberInRange(form.cgpa, 0, 10, 'CGPA')
      || numberInRange(form.tenth_percent, 0, 100, '10th percentage')
      || numberInRange(form.twelfth_percent, 0, 100, '12th percentage')
      || numberInRange(form.backlogs, 0, 99, 'Backlogs', { integer: true })
    );
  };

  const save = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      Alert.alert('Check your profile', validationMessage);
      return;
    }

    setSaving(true);
    try {
      const response = await studentApi.updateProfile({
        ...form,
        skills: form.skillsText.split(',').map((value) => value.trim()).filter(Boolean),
        certifications: form.certificationsText.split(',').map((value) => value.trim()).filter(Boolean),
      });
      const savedProfile = response.profile || profile;
      setData({ profile: savedProfile });
      if (savedProfile.full_name && updateUserLocally) await updateUserLocally({ name: savedProfile.full_name });
      Alert.alert('Profile updated', response.message || 'Your details are saved.');
    } catch (err) {
      Alert.alert('Could not save profile', apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const uploadResume = async () => {
    if (DEMO_MODE) {
      Alert.alert('Resume upload unavailable', 'Local demo mode never reads, uploads, or stores files. You can explore the resume builder and save a draft on your device.');
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
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        Alert.alert('File is too large', 'Choose a PDF no larger than 5 MB.');
        return;
      }
      setUploading(true);
      const body = new FormData();
      body.append('resume', {
        uri: asset.uri,
        name: asset.name || 'resume.pdf',
        type: asset.mimeType || 'application/pdf',
      });
      const response = await studentApi.uploadResume(body);
      setData((old) => ({
        profile: { ...(old?.profile || {}), resume_url: response.resume_url },
      }));
      Alert.alert('Resume uploaded', response.message || 'Your PDF resume was uploaded.');
    } catch (err) {
      Alert.alert('Could not upload resume', apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const openResume = async () => {
    const url = profile.resume_url;
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported URL');
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open resume', 'The saved resume link is not available on this device.');
    }
  };

  const chooseAvatar = async () => {
    if (DEMO_MODE) {
      Alert.alert('Profile photo unavailable', 'Local demo mode never reads, uploads, or stores files. Use a live SmartHire build to update your photo.');
      return;
    }

    const ImagePicker = getImagePicker();
    if (!ImagePicker) {
      Alert.alert('App update required', 'This installed SmartHire app was built before profile-photo support was added. Install the latest SmartHire build, then try again.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo-library access to choose a profile photo.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (picked.canceled) return;
      const asset = picked.assets?.[0];
      if (!asset?.uri) return;
      const fileSize = Number(asset.fileSize || asset.size || 0);
      if (fileSize && fileSize > MAX_AVATAR_BYTES) {
        Alert.alert('Photo is too large', 'Choose a JPEG, PNG, or WebP image no larger than 2 MB.');
        return;
      }

      setUploadingAvatar(true);
      const body = new FormData();
      body.append('avatar', {
        uri: asset.uri,
        name: asset.fileName || asset.name || 'profile-photo.jpg',
        type: avatarMimeType(asset),
      });
      const response = await authApi.uploadAvatar(body);
      const patch = {
        avatar_url: response.avatar_url || null,
        avatar_updated_at: response.avatar_updated_at || null,
      };
      setData((old) => ({ profile: { ...(old?.profile || {}), ...patch } }));
      if (updateUserLocally) await updateUserLocally(patch);
      Alert.alert('Profile photo updated', response.message || 'Your new photo is ready.');
    } catch (err) {
      Alert.alert('Could not update photo', apiErrorMessage(err, 'Choose a JPEG, PNG, or WebP image no larger than 2 MB.'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = () => {
    if (DEMO_MODE) return;
    Alert.alert('Remove profile photo?', 'Your initials will be shown instead.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploadingAvatar(true);
          try {
            const response = await authApi.removeAvatar();
            const patch = { avatar_url: null, avatar_updated_at: null };
            setData((old) => ({ profile: { ...(old?.profile || {}), ...patch } }));
            if (updateUserLocally) await updateUserLocally(patch);
            Alert.alert('Profile photo removed', response.message || 'Your initials will be shown.');
          } catch (err) {
            Alert.alert('Could not remove photo', apiErrorMessage(err));
          } finally {
            setUploadingAvatar(false);
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingState label="Loading profile…" />;
  if (error) return <ErrorState message={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.identityCopy}>
          <Text style={styles.title}>My profile</Text>
          <Text style={styles.subtitle}>Keep your eligibility details current for placement workflows.</Text>
        </View>
        <View style={styles.personIcon}><Ionicons name="person" size={26} color={colors.primary} /></View>
      </View>

      <Card style={styles.identityCard}>
        <View style={styles.identityTop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            disabled={uploadingAvatar || DEMO_MODE}
            onPress={chooseAvatar}
            style={({ pressed }) => [styles.avatar, pressed && !DEMO_MODE && styles.pressed]}
          >
            {avatarSource ? <Image source={avatarSource} style={styles.avatarImage} onError={() => setAvatarFailed(true)} /> : <Text style={styles.avatarText}>{getInitials(form.full_name || user?.name || 'Student')}</Text>}
            {!DEMO_MODE ? <View style={styles.avatarEdit}><Ionicons name="camera" size={11} color={colors.white} /></View> : null}
          </Pressable>
          <View style={styles.identityContent}>
            <Text style={styles.identityName}>{form.full_name || user?.name || 'Student'}</Text>
            <Text style={styles.identityEmail}>{profile.email || user?.email || 'No email available'}</Text>
          </View>
          <Badge tone={currentPlacement.value === 'placed' ? 'success' : currentPlacement.value === 'opted_out' ? 'warning' : 'info'}>{currentPlacement.label}</Badge>
        </View>
        <View style={styles.identityMeta}>
          <View style={styles.identityMetaItem}>
            <Ionicons name="card-outline" size={15} color={colors.muted} />
            <Text style={styles.identityMetaText}>{profile.roll_number || 'Roll number not available'}</Text>
          </View>
          <View style={styles.identityMetaItem}>
            <Ionicons name="school-outline" size={15} color={colors.muted} />
            <Text style={styles.identityMetaText}>{form.branch || 'Branch not added'}{form.semester ? ` · Semester ${form.semester}` : ''}</Text>
          </View>
        </View>
        <View style={styles.avatarActions}>
          <AppButton
            title={DEMO_MODE ? 'Photo unavailable in demo' : (avatarPath ? 'Change profile photo' : 'Add profile photo')}
            compact
            variant="outline"
            disabled={DEMO_MODE}
            loading={uploadingAvatar}
            onPress={chooseAvatar}
            style={styles.avatarAction}
          />
          {avatarPath && !DEMO_MODE ? <AppButton title="Remove" compact variant="ghost" disabled={uploadingAvatar} onPress={removeAvatar} style={styles.removeAvatarAction} /> : null}
        </View>
        <Text style={styles.avatarHelp}>{DEMO_MODE ? 'Photo selection is intentionally disabled in local demo mode.' : 'JPEG, PNG, or WebP · maximum 2 MB · visible only through your authenticated SmartHire account.'}</Text>
      </Card>

      <SectionTitle title="Personal and academic details" />
      <Card>
        <FormInput label="Full name" value={form.full_name} onChangeText={set('full_name')} />
        <FormInput label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <FormInput label="Branch" value={form.branch} onChangeText={set('branch')} placeholder="e.g. Computer Science" />
        <View style={styles.row}>
          <FormInput style={styles.half} label="Semester" value={form.semester} onChangeText={set('semester')} keyboardType="number-pad" placeholder="1–8" />
          <FormInput style={styles.half} label="CGPA" value={form.cgpa} onChangeText={set('cgpa')} keyboardType="decimal-pad" placeholder="0–10" />
        </View>
        <View style={styles.row}>
          <FormInput style={styles.half} label="10th percentage" value={form.tenth_percent} onChangeText={set('tenth_percent')} keyboardType="decimal-pad" placeholder="0–100" />
          <FormInput style={styles.half} label="12th percentage" value={form.twelfth_percent} onChangeText={set('twelfth_percent')} keyboardType="decimal-pad" placeholder="0–100" />
        </View>
        <FormInput label="Active backlogs" value={form.backlogs} onChangeText={set('backlogs')} keyboardType="number-pad" />
        <Text style={styles.fieldLabel}>Placement status</Text>
        <Text style={styles.fieldHelp}>This is saved with the same profile record used by the website.</Text>
        <View style={styles.placementChoices}>
          {PLACEMENT_OPTIONS.map((option) => {
            const selected = canonicalPlacementStatus(form.placement_status) === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => set('placement_status')(option.value)}
                style={({ pressed }) => [styles.placementChoice, selected && styles.placementChoiceActive, pressed && styles.pressed]}
              >
                <Ionicons name={option.icon} size={16} color={selected ? colors.primary : colors.muted} />
                <Text style={[styles.placementChoiceText, selected && styles.placementChoiceTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionTitle title="Skills and links" />
      <Card>
        <FormInput label="Skills" value={form.skillsText} onChangeText={set('skillsText')} placeholder="React, Python, SQL" />
        <FormInput label="Certifications" value={form.certificationsText} onChangeText={set('certificationsText')} placeholder="Separate with commas" />
        <FormInput label="LinkedIn URL" value={form.linkedin_url} onChangeText={set('linkedin_url')} autoCapitalize="none" keyboardType="url" />
        <FormInput label="GitHub URL" value={form.github_url} onChangeText={set('github_url')} autoCapitalize="none" keyboardType="url" />
      </Card>

      <SectionTitle title="Resume" />
      <Card>
        <Text style={styles.resumeText}>
          {DEMO_MODE
            ? 'File upload is unavailable in local demo mode. Build a sample resume or save a device-only draft instead.'
            : (profile.resume_url ? 'A resume is uploaded to your profile.' : 'Build a resume in SmartHire or upload a PDF (maximum 5 MB).')}
        </Text>
        <AppButton title="Build a resume" onPress={() => navigation.navigate('ResumeBuilder')} style={styles.smallButton} />
        {!DEMO_MODE && profile.resume_url ? <AppButton title="Open current resume" variant="outline" compact onPress={openResume} style={styles.smallButton} /> : null}
        <AppButton
          title={DEMO_MODE ? 'PDF upload unavailable in demo' : (profile.resume_url ? 'Replace PDF resume' : 'Upload PDF resume')}
          onPress={uploadResume}
          loading={uploading}
          disabled={DEMO_MODE}
          variant="outline"
          style={styles.smallButton}
        />
      </Card>

      <SectionTitle title="Notifications" />
      <NotificationSettingsCard />
      <AppButton title="Open in-app notifications" variant="outline" onPress={() => navigation.navigate('Notifications')} style={styles.notificationsButton} />
      <AppButton title="Announcements" variant="outline" onPress={() => navigation.navigate('Announcements')} style={styles.announcements} />

      <AppButton title="Save profile" onPress={save} loading={saving} style={styles.save} />
      <AppButton
        title="Sign out"
        onPress={() => Alert.alert('Sign out?', 'You will need to sign in again to access SmartHire.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: logout },
        ])}
        variant="ghost"
        style={styles.signOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identityCopy: { flex: 1, paddingRight: spacing.md },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 4, lineHeight: 20 },
  personIcon: { height: 47, width: 47, borderRadius: 15, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  identityCard: { marginTop: spacing.md },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { height: 48, width: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0E7FF', overflow: 'visible', position: 'relative' },
  avatarImage: { height: 48, width: 48, borderRadius: 15, resizeMode: 'cover' },
  avatarText: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  avatarEdit: { position: 'absolute', right: -4, bottom: -4, height: 20, width: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  identityContent: { flex: 1, minWidth: 0 },
  identityName: { color: colors.text, fontSize: 17, fontWeight: '900' },
  identityEmail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  identityMeta: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.sm, gap: 6 },
  identityMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  identityMetaText: { color: colors.muted, fontSize: 12, flex: 1 },
  avatarActions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: 8 },
  avatarAction: { flex: 1 },
  removeAvatarAction: { paddingHorizontal: 8 },
  avatarHelp: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 7 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  fieldLabel: { color: colors.text, fontWeight: '700', marginBottom: 4, fontSize: 14 },
  fieldHelp: { color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: spacing.sm },
  placementChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  placementChoice: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: colors.white },
  placementChoiceActive: { borderColor: colors.primary, backgroundColor: '#EEF2FF' },
  placementChoiceText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  placementChoiceTextActive: { color: colors.primary },
  pressed: { opacity: 0.78 },
  resumeText: { color: colors.muted, lineHeight: 21 },
  smallButton: { marginTop: 10 },
  notificationsButton: { marginTop: spacing.md },
  announcements: { marginTop: 10 },
  save: { marginTop: spacing.lg },
  signOut: { marginTop: 10 },
});
