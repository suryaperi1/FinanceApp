import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '../components/Card';
import { KpiGrid } from '../components/KpiGrid';
import { Screen } from '../components/Screen';
import { dashboard } from '../data';
import { fmtDate } from '../lib/format';
import { SECTION_LIST } from '../lib/sections';
import { useTheme } from '../theme/ThemeProvider';

/** Main page: Red30 Tech — Consolidated Dashboard. */
export default function ConsolidatedDashboard() {
  const { colors, toggle } = useTheme();

  return (
    <Screen padTop>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.h1, { color: colors.textPrimary }]} accessibilityRole="header">
            Red30 Tech — Consolidated Dashboard
          </Text>
        </View>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel="Toggle light or dark theme"
          style={[styles.toggle, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={[styles.toggleText, { color: colors.textSecondary }]}>Toggle theme</Text>
        </Pressable>
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{dashboard.subtitle}</Text>

      <KpiGrid kpis={dashboard.kpis} />

      <View style={styles.spacer} />
      <SectionHeader title="Dashboards" note="Tap a section for its charts" />
      {SECTION_LIST.map((s) => (
        <Pressable
          key={s.title}
          onPress={() => router.push(s.href)}
          accessibilityRole="link"
          accessibilityLabel={`${s.title}. ${s.summary}`}
          style={({ pressed }) => [
            styles.navCard,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={[styles.navAccent, { backgroundColor: colors.accent }]} />
          <View style={styles.navBody}>
            <Text style={[styles.navTitle, { color: colors.textPrimary }]}>{s.title}</Text>
            <Text style={[styles.navSummary, { color: colors.textSecondary }]} numberOfLines={2}>
              {s.summary}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </Pressable>
      ))}

      <View style={[styles.notes, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.notesTitle, { color: colors.textPrimary }]}>Data notes</Text>
        {dashboard.dataNotes.map((n) => (
          <Text key={n} style={[styles.note, { color: colors.textSecondary }]}>
            • {n}
          </Text>
        ))}
      </View>

      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Generated from the Spreadsheets workbooks · data as of {fmtDate(dashboard.dataUpdatedAt)}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 6 },
  headerText: { flex: 1 },
  h1: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  toggle: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  toggleText: { fontSize: 12 },
  spacer: { height: 18 },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    minHeight: 68,
  },
  navAccent: { width: 4, alignSelf: 'stretch' },
  navBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  navTitle: { fontSize: 15, fontWeight: '600' },
  navSummary: { fontSize: 12.5, marginTop: 3 },
  chevron: { fontSize: 26, paddingRight: 14, fontWeight: '300' },
  notes: { marginTop: 20, padding: 14, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  notesTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  note: { fontSize: 12.5, lineHeight: 19, marginBottom: 4 },
  footer: { fontSize: 11.5, textAlign: 'center', marginTop: 20 },
});
