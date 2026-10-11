import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import { Card, SectionTitle } from '../../components/Ui';
import { colors, spacing } from '../../constants/theme';

const modules = [
  { screen: 'AptitudeTests', title: 'Aptitude practice', body: 'Take timed tests on your phone and review your saved performance.', icon: 'calculator-outline', color: '#4F46E5' },
  { screen: 'DsaList', title: 'DSA coding', body: 'Solve problems, run code, and track submissions.', icon: 'code-slash-outline', color: '#0891B2' },
  { screen: 'MockOaList', title: 'Mock OA', body: 'Take timed company-style assessments and review practice results.', icon: 'document-text-outline', color: '#B45309' },
  { screen: 'CompanyOaList', title: 'Company OA', body: 'Take your eligible official assessment with a timed mobile attempt.', icon: 'business-outline', color: '#15803D' },
  { screen: 'AtsGuidance', title: 'ATS guidance', body: 'Review keyword and structure guidance.', icon: 'sparkles-outline', color: '#9333EA' },
  { screen: 'InterviewHub', title: 'Mock interview', body: 'Complete a typed-answer practice session and review saved feedback.', icon: 'chatbubbles-outline', color: '#E11D48' },
];

export default function PracticeHubScreen({ navigation }) {
  return <Screen><Text style={styles.title}>Practice centre</Text><Text style={styles.subtitle}>Build readiness through guided practice. Assessment scores are practice feedback, not employment predictions.</Text><SectionTitle title="Practice modules" />{modules.map((module) => <Pressable key={module.screen} onPress={() => navigation.navigate(module.screen)} style={({ pressed }) => [styles.module, pressed && styles.pressed]}><View style={[styles.icon, { backgroundColor: `${module.color}18` }]}><Ionicons name={module.icon} size={24} color={module.color} /></View><View style={styles.body}><Text style={styles.moduleTitle}>{module.title}</Text><Text style={styles.moduleBody}>{module.body}</Text></View><Ionicons name="chevron-forward" size={21} color="#94A3B8" /></Pressable>)}<Card style={styles.tip}><Ionicons name="information-circle-outline" size={20} color={colors.info} /><Text style={styles.tipText}>Aptitude, DSA coding, Mock OA, Company OA, and typed mock-interview practice work on mobile. Practice feedback is saved to the same SmartHire account when you use a live build.</Text></Card></Screen>;
}
const styles = StyleSheet.create({
  title: { fontSize: 25, fontWeight: '900', color: colors.text }, subtitle: { color: colors.muted, marginTop: 5, lineHeight: 20 }, module: { padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', marginBottom: 9 }, icon: { height: 45, width: 45, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, body: { flex: 1 }, moduleTitle: { color: colors.text, fontWeight: '900' }, moduleBody: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3, paddingRight: 5 }, pressed: { opacity: 0.75 }, tip: { marginTop: spacing.md, flexDirection: 'row', gap: 10 }, tipText: { flex: 1, color: colors.muted, lineHeight: 20, fontSize: 13 },
});
