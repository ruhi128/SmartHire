import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import NotificationSettingsCard from '../../components/NotificationSettingsCard';
import { AppButton, Card, SectionTitle } from '../../components/Ui';
import { authApi } from '../../api';
import { apiErrorMessage, apiUrl } from '../../api/client';
import { DEMO_MODE } from '../../config/runtime';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../constants/theme';
import { getInitials } from '../../utils/format';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// An old custom development build may not contain the image-picker native
// module yet. Avoid crashing the entire app and tell the user to install the
// rebuild required for this native capability.
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

export default function AdminAccountScreen({ navigation }) {
  const { user, session, logout, updateUserLocally } = useAuth();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarPath = user?.avatar_url || null;
  const avatarSource = avatarPath && !DEMO_MODE && session?.token && !avatarFailed
    ? { uri: apiUrl(avatarPath), headers: { Authorization: `Bearer ${session.token}` } }
    : null;

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar_url, user?.avatar_updated_at]);

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
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (picked.canceled) return;
      const asset = picked.assets?.[0];
      if (!asset?.uri) return;
      const size = Number(asset.fileSize || asset.size || 0);
      if (size && size > MAX_AVATAR_BYTES) {
        Alert.alert('Photo is too large', 'Choose a JPEG, PNG, or WebP image no larger than 2 MB.');
        return;
      }
      setAvatarBusy(true);
      const body = new FormData();
      body.append('avatar', {
        uri: asset.uri,
        name: asset.fileName || asset.name || 'profile-photo.jpg',
        type: avatarMimeType(asset),
      });
      const response = await authApi.uploadAvatar(body);
      const patch = { avatar_url: response.avatar_url || null, avatar_updated_at: response.avatar_updated_at || null };
      await updateUserLocally?.(patch);
      Alert.alert('Profile photo updated', response.message || 'Your new photo is ready.');
    } catch (error) {
      Alert.alert('Could not update photo', apiErrorMessage(error, 'Choose a JPEG, PNG, or WebP image no larger than 2 MB.'));
    } finally {
      setAvatarBusy(false);
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
          setAvatarBusy(true);
          try {
            const response = await authApi.removeAvatar();
            await updateUserLocally?.({ avatar_url: null, avatar_updated_at: null });
            Alert.alert('Profile photo removed', response.message || 'Your initials will be shown.');
          } catch (error) {
            Alert.alert('Could not remove photo', apiErrorMessage(error));
          } finally {
            setAvatarBusy(false);
          }
        },
      },
    ]);
  };


  return (
    <Screen>
      <View style={styles.hero}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          disabled={avatarBusy || DEMO_MODE}
          onPress={chooseAvatar}
          style={({ pressed }) => [styles.icon, pressed && !DEMO_MODE && styles.pressed]}
        >
          {avatarSource ? <Image source={avatarSource} style={styles.avatarImage} onError={() => setAvatarFailed(true)} /> : <Text style={styles.avatarText}>{getInitials(user?.name || user?.email || 'Admin')}</Text>}
          {!DEMO_MODE ? <View style={styles.cameraBadge}><Ionicons name="camera" size={11} color={colors.white} /></View> : null}
        </Pressable>
        <View style={styles.heroCopy}>
          <Text style={styles.name}>{user?.name || 'Placement administrator'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          <View style={styles.avatarActions}>
            <AppButton title={DEMO_MODE ? 'Photo unavailable in demo' : (avatarPath ? 'Change photo' : 'Add photo')} compact variant="outline" disabled={DEMO_MODE} loading={avatarBusy} onPress={chooseAvatar} style={styles.photoButton} />
            {avatarPath && !DEMO_MODE ? <AppButton title="Remove" compact variant="ghost" disabled={avatarBusy} onPress={removeAvatar} style={styles.removeButton} /> : null}
          </View>
        </View>
      </View>
      <Text style={styles.photoHelp}>{DEMO_MODE ? 'Photo selection is intentionally disabled in local demo mode.' : 'JPEG, PNG, or WebP · maximum 2 MB · private to your authenticated SmartHire account.'}</Text>
      <SectionTitle title="Administration" />
      <Card><Text style={styles.body}>Use the review tools to publish recruiter submissions, maintain student placement records, and communicate verified placement updates.</Text></Card>
      <SectionTitle title="Notifications" />
      <NotificationSettingsCard />
      <AppButton title="Open in-app notifications" variant="outline" onPress={() => navigation.navigate('Notifications')} style={styles.button} />
      <AppButton title="Companies" variant="outline" onPress={() => navigation.navigate('AdminCompanies')} style={styles.secondaryButton} />
      <AppButton
        title="Sign out"
        variant="ghost"
        onPress={() => Alert.alert('Sign out?', 'You will need to sign in again to access SmartHire.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: logout },
        ])}
        style={styles.signout}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  icon: { width: 57, height: 57, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF2FF', position: 'relative', overflow: 'visible' },
  avatarImage: { width: 57, height: 57, borderRadius: 18, resizeMode: 'cover' },
  avatarText: { color: colors.primary, fontSize: 17, fontWeight: '900' },
  cameraBadge: { position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.white },
  heroCopy: { flex: 1 },
  avatarActions: { flexDirection: 'row', gap: 7, marginTop: 8, alignItems: 'center' },
  photoButton: { flex: 1 },
  removeButton: { paddingHorizontal: 8 },
  photoHelp: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2, marginBottom: 8 },
  pressed: { opacity: 0.75 },
  name: { color: colors.text, fontSize: 20, fontWeight: '900' },
  email: { color: colors.muted, marginTop: 4 },
  body: { color: colors.muted, lineHeight: 21 },
  button: { marginTop: spacing.lg },
  secondaryButton: { marginTop: 10 },
  signout: { marginTop: 10 },
});
