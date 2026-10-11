import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../constants/theme';

// A screen without an app header owns the top inset. Screens rendered beneath
// AppHeader pass `hasHeader` so that the header owns it exactly once.
export default function Screen({ children, scroll = true, contentContainerStyle, style, refreshControl, hasHeader = false }) {
  const content = (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={hasHeader ? ['left', 'right', 'bottom'] : ['top', 'left', 'right', 'bottom']} style={[styles.safe, style]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

export const screenStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  padded: { padding: spacing.md },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  content: { flex: 1, padding: spacing.md },
});
