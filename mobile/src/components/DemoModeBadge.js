import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEMO_MODE, DEMO_NOTICE } from '../config/runtime';
import { colors, spacing } from '../constants/theme';

/** A deliberately prominent, root-level reminder for the local-only demo. */
export default function DemoModeBadge() {
  if (!DEMO_MODE) return null;

  return (
    <View accessibilityRole="alert" style={styles.banner} testID="demo-mode-banner">
      <Ionicons name="flask-outline" size={16} color={colors.warning} />
      <View style={styles.copy}>
        <Text style={styles.title}>LOCAL DEMO MODE</Text>
        <Text style={styles.body}>{DEMO_NOTICE}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#FFF7E6',
    borderWidth: 1,
    borderColor: '#F4C76D',
    borderRadius: 10,
  },
  copy: { flex: 1 },
  title: { color: '#8A5200', fontWeight: '800', fontSize: 11, letterSpacing: 0.7 },
  body: { color: '#754A0B', fontSize: 11, lineHeight: 16, marginTop: 2 },
});
