import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AuthLayout from './AuthLayout';
import { AppButton, FormInput } from '../../components/Ui';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../api/client';
import { DEMO_ACCOUNTS, DEMO_MODE, DEMO_NOTICE } from '../../config/runtime';
import { colors, spacing } from '../../constants/theme';

export default function LoginScreen({ navigation }) {
  const { signIn, signInDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoRoleLoading, setDemoRoleLoading] = useState(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email address and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      const body = error?.response?.data;
      if (body?.needsVerification) {
        navigation.navigate('VerifyEmail', { email: body.email || email.trim().toLowerCase() });
      } else {
        Alert.alert('Could not sign in', apiErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const enterDemo = async (role) => {
    setDemoRoleLoading(role);
    try {
      await signInDemo(role);
    } catch (error) {
      Alert.alert('Could not start local demo', apiErrorMessage(error));
    } finally {
      setDemoRoleLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <AuthLayout
        title={DEMO_MODE ? 'Explore local demo' : 'Welcome back'}
        subtitle={DEMO_MODE ? 'Choose a sample role. These are not SmartHire accounts.' : 'Sign in to view your placement journey.'}
      >
        {DEMO_MODE ? (
          <View style={styles.demoPanel} testID="demo-role-panel">
            <View style={styles.demoNotice}>
              <Text style={styles.demoNoticeTitle}>LOCAL SAMPLE WORKSPACE</Text>
              <Text style={styles.demoNoticeText}>{DEMO_NOTICE} Changes reset when the app reloads.</Text>
            </View>
            {DEMO_ACCOUNTS.map((account) => (
              <View key={account.role} style={styles.demoRole}>
                <View style={styles.demoCopy}>
                  <Text style={styles.demoRoleTitle}>{account.label.replace('Explore as ', '')}</Text>
                  <Text style={styles.demoRoleText}>{account.description}</Text>
                </View>
                <AppButton
                  title="Enter"
                  compact
                  disabled={Boolean(demoRoleLoading)}
                  loading={demoRoleLoading === account.role}
                  onPress={() => enterDemo(account.role)}
                  testID={`demo-login-${account.role}`}
                  style={styles.demoButton}
                />
              </View>
            ))}
            <Text style={styles.demoReset}>Demo data exists only while this app session is running.</Text>
          </View>
        ) : (
          <>
            <FormInput
              label="Email address"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />
            <FormInput
              label="Password"
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              onSubmitEditing={submit}
            />
            <AppButton title="Sign in" onPress={submit} loading={loading} style={styles.submit} />
            <View style={styles.footer}>
              <Text style={styles.footerText}>New to SmartHire?</Text>
              <Pressable onPress={() => navigation.navigate('Register')}><Text style={styles.link}> Create an account</Text></Pressable>
            </View>
          </>
        )}
      </AuthLayout>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  submit: { marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, flexWrap: 'wrap' },
  footerText: { color: colors.muted },
  link: { color: colors.primary, fontWeight: '800' },
  demoPanel: { gap: spacing.sm },
  demoNotice: { borderWidth: 1, borderColor: '#F4C76D', backgroundColor: '#FFF7E6', padding: 10, borderRadius: 12 },
  demoNoticeTitle: { color: '#8A5200', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  demoNoticeText: { color: '#754A0B', fontSize: 12, lineHeight: 17, marginTop: 3 },
  demoRole: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  demoCopy: { flex: 1 },
  demoRoleTitle: { color: colors.text, fontWeight: '900', fontSize: 14 },
  demoRoleText: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  demoButton: { minWidth: 67 },
  demoReset: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 2 },
});
