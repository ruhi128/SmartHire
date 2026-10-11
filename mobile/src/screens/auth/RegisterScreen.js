import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AuthLayout from './AuthLayout';
import { AppButton, FormInput } from '../../components/Ui';
import { authApi } from '../../api';
import { apiErrorMessage } from '../../api/client';
import { colors, spacing } from '../../constants/theme';

const roles = [
  ['student', 'Student'],
  ['recruiter', 'Recruiter'],
  ['admin', 'Administrator'],
];

export default function RegisterScreen({ navigation }) {
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', full_name: '', roll_number: '', branch: '', cgpa: '', company_name: '' });
  const [loading, setLoading] = useState(false);
  const set = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));
  const title = useMemo(() => role === 'student' ? 'Create student account' : role === 'recruiter' ? 'Create recruiter account' : 'Create administrator account', [role]);

  const submit = async () => {
    if (!form.email.trim() || !form.password) return Alert.alert('Missing details', 'Email and password are required.');
    if (form.password.length < 8) return Alert.alert('Use a stronger password', 'Password must contain at least 8 characters.');
    if (form.password !== form.confirmPassword) return Alert.alert('Passwords do not match', 'Re-enter the same password in both fields.');
    if (role === 'student' && !form.full_name.trim()) return Alert.alert('Missing name', 'Enter your full name.');
    setLoading(true);
    try {
      await authApi.register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role,
        full_name: form.full_name.trim(),
        roll_number: form.roll_number.trim() || undefined,
        branch: form.branch.trim() || undefined,
        cgpa: form.cgpa || undefined,
        company_name: form.company_name.trim() || undefined,
      });
      navigation.replace('VerifyEmail', { email: form.email.trim().toLowerCase(), registered: true });
    } catch (error) {
      Alert.alert('Could not create account', apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <AuthLayout title={title} subtitle="Verify your email address before you sign in.">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>I am joining as</Text>
          <View style={styles.roleRow}>
            {roles.map(([value, label]) => (
              <Pressable key={value} onPress={() => setRole(value)} style={[styles.role, role === value && styles.roleSelected]}>
                <Text style={[styles.roleText, role === value && styles.roleTextSelected]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <FormInput label="Email address" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={set('email')} placeholder="you@example.com" />
          <FormInput label="Password" secureTextEntry value={form.password} onChangeText={set('password')} placeholder="At least 8 characters" />
          <FormInput label="Confirm password" secureTextEntry value={form.confirmPassword} onChangeText={set('confirmPassword')} placeholder="Repeat your password" />
          {role === 'student' ? <>
            <FormInput label="Full name" value={form.full_name} onChangeText={set('full_name')} placeholder="Your full name" />
            <FormInput label="Roll number (optional)" value={form.roll_number} onChangeText={set('roll_number')} placeholder="e.g. CS2026001" />
            <FormInput label="Branch (optional)" value={form.branch} onChangeText={set('branch')} placeholder="e.g. Computer Science" />
            <FormInput label="CGPA (optional)" value={form.cgpa} onChangeText={set('cgpa')} keyboardType="decimal-pad" placeholder="e.g. 8.2" />
          </> : null}
          {role === 'recruiter' ? <FormInput label="Company name (optional)" value={form.company_name} onChangeText={set('company_name')} placeholder="Your organisation" /> : null}
          <Text style={styles.notice}>Use only an account role authorized by your institution. Account approval and access policies are enforced by your SmartHire deployment.</Text>
          <AppButton title="Create account" onPress={submit} loading={loading} style={styles.submit} />
          <View style={styles.footer}><Text style={styles.footerText}>Already have an account?</Text><Pressable onPress={() => navigation.goBack()}><Text style={styles.link}> Sign in</Text></Pressable></View>
        </ScrollView>
      </AuthLayout>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 7, marginBottom: spacing.lg },
  role: { flex: 1, minHeight: 43, borderRadius: 10, padding: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  roleSelected: { backgroundColor: '#EEF2FF', borderColor: colors.primary },
  roleText: { color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  roleTextSelected: { color: colors.primary },
  notice: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  submit: { marginTop: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginVertical: spacing.lg },
  footerText: { color: colors.muted },
  link: { color: colors.primary, fontWeight: '800' },
});
