import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, Card } from './Ui';
import { DEMO_MODE, WEB_APP_URL } from '../config/runtime';
import { colors, spacing } from '../constants/theme';

// Mock OA, Company OA and Mock Interview stay *visible* on phone (lists,
// eligibility, history and past results), but starting an attempt/session is
// laptop-only: proctoring, timers and the interview UI are designed for the
// website on a larger screen. Every "Start" entry point in the app funnels
// through showLaptopRequired() / <LaptopRequiredNotice /> so the behaviour
// cannot drift between the hub, the lists and deep links into attempt routes.
//
// The website origin comes only from EXPO_PUBLIC_WEB_URL (see
// src/config/runtime.js). TODO(deploy): replace the placeholder in
// mobile/.env.example / eas.json with the real deployed URL and rebuild —
// EXPO_PUBLIC_* values are baked into the app bundle at build time.
export const LAPTOP_FEATURES = {
  mockOa: { label: 'Mock OA', websitePath: '/student/mockoa' },
  companyOa: { label: 'Company OA', websitePath: '/student/companyoa' },
  mockInterview: { label: 'Mock interview', websitePath: '/student/interview' },
};

export function laptopUrl(websitePath = '') {
  if (!WEB_APP_URL) return '';
  return `${WEB_APP_URL}${websitePath.startsWith('/') ? websitePath : `/${websitePath}`}`;
}

export async function openSmartHireWebsite(websitePath = '') {
  const target = laptopUrl(websitePath);
  if (!target) return false;
  try {
    await Linking.openURL(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prompt shown instead of starting a Mock OA / Company OA / Mock Interview
 * on the phone. Used by every Start button and by the attempt screens
 * themselves (defence-in-depth for deep links / stale navigation state).
 */
export function showLaptopRequired(feature) {
  const { label, websitePath } = feature || LAPTOP_FEATURES.mockOa;
  const target = laptopUrl(websitePath);

  if (DEMO_MODE) {
    Alert.alert(
      `${label} is taken on a laptop`,
      `Please open the SmartHire website on a laptop and sign in with the same account to take the ${label}. Demo mode stays offline, so the website cannot be opened from here.`,
    );
    return;
  }
  if (!target) {
    Alert.alert(
      `${label} is taken on a laptop`,
      `Please open the SmartHire website on a laptop and sign in with the same account to take the ${label}.\n\nThis app build does not have the website address configured yet (EXPO_PUBLIC_WEB_URL). Set it and rebuild the app, then this prompt will open the website for you.`,
    );
    return;
  }
  Alert.alert(
    `${label} is taken on a laptop`,
    `For the best experience — full-screen questions, proctoring and a stable timer — please take the ${label} on the SmartHire website using a laptop. You can browse tests, eligibility and past results here on your phone.`,
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Open website',
        onPress: async () => {
          const opened = await openSmartHireWebsite(websitePath);
          if (!opened) {
            Alert.alert('Could not open the website', `Open ${target} on your laptop and sign in with the same SmartHire account.`);
          }
        },
      },
    ],
  );
}

/** Full-screen gate used by the attempt/session routes themselves. */
export function LaptopRequiredNotice({ feature, navigation }) {
  const { label, websitePath } = feature || LAPTOP_FEATURES.mockOa;
  const target = laptopUrl(websitePath);
  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <View style={styles.icon}><Ionicons name="laptop-outline" size={30} color={colors.primary} /></View>
        <Text style={styles.title}>{label} is taken on a laptop</Text>
        <Text style={styles.body}>
          You can browse {label} tests and your past results on your phone, but attempts are
          taken on the SmartHire website using a laptop — full-screen questions, proctoring
          and a stable timer need the larger screen.
        </Text>
        {target && !DEMO_MODE ? (
          <AppButton title="Open SmartHire website" onPress={() => openSmartHireWebsite(websitePath)} style={styles.button} />
        ) : (
          <Text style={styles.note}>
            {DEMO_MODE
              ? 'Demo mode stays offline. Use a live build and a laptop to take this.'
              : 'The website address is not configured in this build yet (EXPO_PUBLIC_WEB_URL). Open SmartHire on your laptop and sign in with the same account.'}
          </Text>
        )}
        {navigation ? <AppButton title="Go back" variant="outline" onPress={() => navigation.goBack()} style={styles.button} /> : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background, padding: spacing.md, justifyContent: 'center' },
  card: { alignItems: 'center', paddingVertical: spacing.lg },
  icon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF' },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginTop: 12 },
  body: { color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 8 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: spacing.md },
  button: { alignSelf: 'stretch', marginTop: spacing.md },
});
