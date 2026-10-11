import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../constants/theme';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <View style={styles.mark}><Text style={styles.markText}>SH</Text></View>
        <Text style={styles.brand}>SmartHire</Text>
        <Text style={styles.tagline}>Campus placement, in your pocket</Text>
      </View>
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  hero: { height: 210, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.lg },
  mark: { height: 58, width: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  markText: { color: colors.white, fontSize: 20, fontWeight: '900' },
  brand: { color: colors.white, fontSize: 28, fontWeight: '900', marginTop: 10 },
  tagline: { color: '#CBD5E1', marginTop: 4 },
  sheet: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg },
  title: { fontSize: 25, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.muted, lineHeight: 21, marginTop: 7, marginBottom: spacing.lg },
});
