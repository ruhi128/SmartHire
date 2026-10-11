import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

export default function AppHeader({ navigation, title, subtitle, right, back = true }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top, minHeight: 64 + insets.top }]}>
      {back && navigation?.canGoBack?.() ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
      ) : <View style={styles.backSpacer} />}
      <View style={styles.titleWrap}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  // `minHeight` is completed with the physical top inset at render time. This
  // keeps the 64 px content row while moving it below a notch/status bar.
  wrap: { paddingHorizontal: 8, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center' }, 
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  backSpacer: { width: 42 },
  titleWrap: { flex: 1 },
  title: { color: colors.white, fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 12, marginTop: 1 },
  right: { minWidth: 42, alignItems: 'flex-end' },
});
