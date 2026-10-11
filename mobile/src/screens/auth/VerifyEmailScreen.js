import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import AuthLayout from './AuthLayout';
import { AppButton, FormInput } from '../../components/Ui';
import { authApi } from '../../api';
import { apiErrorMessage } from '../../api/client';
import { colors, spacing } from '../../constants/theme';

export default function VerifyEmailScreen({ navigation, route }) {
  const email = route.params?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!remaining) return undefined;
    const id = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const verify = async () => {
    if (code.trim().length !== 6) return Alert.alert('Enter the complete code', 'Use the 6-digit code sent to your email.');
    setLoading(true);
    try {
      await authApi.verifyEmail(email, code.trim());
      Alert.alert('Email verified', 'You can now sign in.', [{ text: 'Sign in', onPress: () => navigation.popToTop() }]);
    } catch (error) {
      Alert.alert('Verification failed', apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const response = await authApi.resendCode(email);
      Alert.alert('Code sent', response.message || 'A new code was sent to your email.');
      setRemaining(60);
    } catch (error) {
      Alert.alert('Could not resend code', apiErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <AuthLayout title="Verify your email" subtitle={`Enter the 6-digit code sent to ${email || 'your email address'}.`}>
        <FormInput
          label="Verification code"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="123456"
          inputStyle={styles.code}
          onSubmitEditing={verify}
        />
        <AppButton title="Verify email" onPress={verify} loading={loading} />
        <View style={styles.resend}><Text style={styles.resendText}>Didn’t receive a code?</Text><AppButton title={remaining ? `Resend in ${remaining}s` : 'Resend code'} variant="ghost" compact onPress={resend} loading={resending} disabled={Boolean(remaining)} /></View>
      </AuthLayout>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  code: { letterSpacing: 8, fontWeight: '800', fontSize: 22, textAlign: 'center' },
  resend: { alignItems: 'center', marginTop: spacing.lg },
  resendText: { color: colors.muted, marginBottom: 3 },
});
