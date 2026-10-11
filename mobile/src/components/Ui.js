import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow, spacing } from '../constants/theme';
import { DEMO_MODE, WEB_APP_URL } from '../config/runtime';

export function AppButton({ title, onPress, variant = 'primary', loading = false, disabled = false, style, compact = false, testID }) {
  const palette = {
    primary: [colors.primary, colors.white],
    secondary: [colors.navy, colors.white],
    danger: [colors.danger, colors.white],
    outline: [colors.white, colors.primary],
    ghost: ['transparent', colors.primary],
    success: [colors.success, colors.white],
  }[variant] || [colors.primary, colors.white];
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compactButton,
        { backgroundColor: palette[0], borderColor: variant === 'outline' ? colors.primary : palette[0] },
        (disabled || loading) && styles.disabled,
        pressed && !(disabled || loading) && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette[1]} /> : <Text style={[styles.buttonText, { color: palette[1] }]}>{title}</Text>}
    </Pressable>
  );
}

export function FormInput({ label, error, multiline = false, style, inputStyle, ...props }) {
  return (
    <View style={[styles.inputBlock, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, error && styles.inputError, inputStyle]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ children, tone = 'neutral', style }) {
  const palette = {
    neutral: ['#EEF2FF', '#4338CA'],
    success: ['#DCFCE7', '#166534'],
    warning: ['#FEF3C7', '#92400E'],
    danger: ['#FEE2E2', '#991B1B'],
    info: ['#E0F2FE', '#075985'],
  }[tone] || ['#F1F5F9', '#475569'];
  return <View style={[styles.badge, { backgroundColor: palette[0] }, style]}><Text style={[styles.badgeText, { color: palette[1] }]}>{children}</Text></View>;
}

export function LoadingState({ label = 'Loading…' }) {
  return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>{label}</Text></View>;
}

export function EmptyState({ title = 'Nothing here yet', body, action }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  return <View style={styles.empty}><Text style={styles.errorTitle}>Could not load this page</Text><Text style={styles.emptyBody}>{message}</Text>{onRetry ? <AppButton title="Try again" variant="outline" onPress={onRetry} compact style={styles.emptyAction} /> : null}</View>;
}

/**
 * A deliberate website continuation for any future flow that has no native
 * equivalent. Mock interviews and timed assessments now use dedicated native
 * student screens, so this component must not be used to bypass those flows.
 */
export function WebsiteHandoff({
  title = 'Continue in a browser',
  body = 'This feature continues on the SmartHire website. Sign in with the same account to continue.',
  websitePath = '',
  icon = 'laptop-outline',
  style,
}) {
  const target = WEB_APP_URL ? `${WEB_APP_URL}${websitePath ? (websitePath.startsWith('/') ? websitePath : `/${websitePath}`) : ''}` : '';

  const openWebsite = async () => {
    if (DEMO_MODE) {
      Alert.alert('Website handoff unavailable in demo', 'Local demo mode does not open websites or make network requests. Use a configured live build and a laptop to complete this assessment.');
      return;
    }
    if (!target) {
      Alert.alert('Website address not configured', 'This mobile build has no SmartHire website address. Set EXPO_PUBLIC_WEB_URL, rebuild the app, then continue on a laptop.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(target);
      if (!supported) throw new Error('This device cannot open the configured SmartHire website.');
      await Linking.openURL(target);
    } catch (error) {
      Alert.alert('Could not open SmartHire', error?.message || 'Please open SmartHire on a laptop and sign in with the same account.');
    }
  };

  const unavailable = DEMO_MODE || !target;
  return (
    <Card style={[styles.handoff, style]}>
      <View style={styles.handoffIcon}><Ionicons name={icon} size={27} color={colors.primary} /></View>
      <Text style={styles.handoffTitle}>{title}</Text>
      <Text style={styles.handoffBody}>{body}</Text>
      <AppButton
        title={DEMO_MODE ? 'Website handoff unavailable in demo' : (target ? 'Open SmartHire website' : 'Website address unavailable')}
        onPress={openWebsite}
        disabled={unavailable}
        style={styles.handoffButton}
      />
      <Text style={styles.handoffNote}>
        {DEMO_MODE
          ? 'Demo mode stays offline and cannot launch the website.'
          : target
            ? 'Open this on a laptop, then sign in with the same SmartHire account.'
            : 'Ask the app administrator to configure EXPO_PUBLIC_WEB_URL for this build.'}
      </Text>
    </Card>
  );
}

export function SectionTitle({ title, action }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action}</View>;
}

const styles = StyleSheet.create({
  button: { minHeight: 48, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  compactButton: { minHeight: 38, paddingHorizontal: 13, borderRadius: 9 },
  buttonText: { fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
  inputBlock: { marginBottom: spacing.md },
  label: { color: colors.text, fontWeight: '700', marginBottom: 7, fontSize: 14 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, minHeight: 48, paddingHorizontal: 13, fontSize: 16, color: colors.text, backgroundColor: colors.white },
  multiline: { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, marginTop: 5 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  center: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { marginTop: 12, color: colors.muted },
  empty: { alignItems: 'center', justifyContent: 'center', minHeight: 220, padding: spacing.lg },
  emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 18, textAlign: 'center' },
  errorTitle: { color: colors.danger, fontWeight: '800', fontSize: 18, textAlign: 'center' },
  emptyBody: { color: colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 21 },
  emptyAction: { marginTop: spacing.md },
  handoff: { alignItems: 'center', paddingVertical: spacing.lg },
  handoffIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF' },
  handoffTitle: { color: colors.text, fontSize: 19, fontWeight: '900', textAlign: 'center', marginTop: 12 },
  handoffBody: { color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 7, maxWidth: 370 },
  handoffButton: { alignSelf: 'stretch', marginTop: spacing.md },
  handoffNote: { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 10, maxWidth: 370 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
});
