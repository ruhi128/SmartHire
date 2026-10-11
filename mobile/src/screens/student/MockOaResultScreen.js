import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { AppButton, Badge, Card } from '../../components/Ui';
import { colors, spacing } from '../../constants/theme';

export default function MockOaResultScreen({ navigation, route }) {
  const { result = {}, title = 'Mock OA', autoSubmitted, submissionReason } = route.params || {};
  const foregroundSubmitted = submissionReason === 'foreground-switches' || result.terminated;
  const statusTitle = foregroundSubmitted
    ? 'Assessment auto-submitted'
    : autoSubmitted
      ? 'Time is up — assessment submitted'
      : 'Assessment submitted';
  const passed = Boolean(result.passed);

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: passed ? colors.success : colors.warning }]}>
          <Ionicons name={passed ? 'checkmark' : 'flag-outline'} size={36} color={colors.white} />
        </View>
        <Text style={styles.title}>{statusTitle}</Text>
        <Text style={styles.subtitle}>{title}</Text>
      </View>

      <Card>
        <Text style={styles.score}>{result.percentage ?? 0}%</Text>
        <Text style={styles.caption}>{result.score ?? 0} / {result.totalPossible ?? 0} points · {passed ? 'Practice pass threshold met' : 'Keep practicing'}</Text>
        <View style={styles.stats}>
          <Stat label="Correct" value={result.correct ?? 0} color={colors.success} />
          <Stat label="Wrong" value={result.wrong ?? 0} color={colors.danger} />
          <Stat label="Skipped" value={result.skipped ?? 0} color={colors.warning} />
        </View>
      </Card>

      <Card style={styles.integrity}>
        <View style={styles.integrityTop}>
          <Text style={styles.integrityTitle}>Mobile integrity context</Text>
          <Badge tone="info">Client signal</Badge>
        </View>
        <Text style={styles.integrityScore}>{result.integrityScore ?? 100}/100</Text>
        <Text style={styles.integrityText}>{result.violationCount || 0} foreground/background event{Number(result.violationCount) === 1 ? '' : 's'} recorded. This is a client-reported practice signal, not tamper-proof proctoring or proof of misconduct.</Text>
      </Card>

      <Text style={styles.note}>Scores reflect the assessment’s configured logic. They are practice feedback and should not be treated as a hiring decision.</Text>
      <AppButton title="Back to Mock OA" onPress={() => navigation.navigate('MockOaList', { refreshKey: Date.now() })} style={styles.button} />
    </Screen>
  );
}

function Stat({ label, value, color }) {
  return <View style={styles.stat}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 13 },
  subtitle: { color: colors.muted, marginTop: 5, textAlign: 'center' },
  score: { color: colors.primary, fontSize: 38, fontWeight: '900', textAlign: 'center' },
  caption: { color: colors.muted, textAlign: 'center', marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: 19, borderTopWidth: 1, borderColor: colors.border, paddingTop: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontWeight: '900', fontSize: 20 },
  statLabel: { color: colors.muted, marginTop: 3, fontSize: 12 },
  integrity: { marginTop: 13 },
  integrityTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  integrityTitle: { color: colors.text, fontWeight: '900' },
  integrityScore: { color: colors.info, fontSize: 23, fontWeight: '900', marginTop: 12 },
  integrityText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 14 },
  button: { marginTop: spacing.lg },
});
