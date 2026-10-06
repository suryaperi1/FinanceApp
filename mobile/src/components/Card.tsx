import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {title ? <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function SectionHeader({ title, note }: { title?: string; note?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      {title ? <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text> : null}
      {note ? <Text style={[styles.sectionNote, { color: colors.textMuted }]}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: 12,
  },
  title: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  section: { marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionNote: { fontSize: 12, marginTop: 2 },
});
