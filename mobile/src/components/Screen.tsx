import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';

/** Scrollable page body with the app background and bottom safe-area padding. */
export function Screen({ children, padTop = false }: { children: ReactNode; padTop?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: colors.page }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: (padTop ? insets.top : 0) + 16, paddingBottom: insets.bottom + 32 },
      ]}
    >
      {children}
    </ScrollView>
  );
}

/** "Back to Consolidated Dashboard" link shown on every section page. */
export function BackToDashboard() {
  const { colors } = useTheme();
  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <Pressable
      onPress={goHome}
      accessibilityRole="link"
      style={({ pressed }) => [
        styles.back,
        { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.backText, { color: colors.accent }]}>← Back to Consolidated Dashboard</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16 },
  back: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  backText: { fontSize: 14, fontWeight: '600' },
});
