import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SECTIONS } from '../lib/sections';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

function ThemedStack() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          headerBackTitle: 'Dashboard',
          contentStyle: { backgroundColor: colors.page },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: 'Consolidated Dashboard' }} />
        <Stack.Screen name="financial-performance" options={{ title: SECTIONS.financialPerformance.title }} />
        <Stack.Screen name="balance-sheet" options={{ title: SECTIONS.balanceSheet.title }} />
        <Stack.Screen name="expenses" options={{ title: SECTIONS.expenses.title }} />
        <Stack.Screen name="ecommerce" options={{ title: SECTIONS.ecommerce.title }} />
        <Stack.Screen name="product-catalog" options={{ title: SECTIONS.productCatalog.title }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
