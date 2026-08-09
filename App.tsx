import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAttendanceStore } from './src/store/attendanceStore';
import { useNotifications } from './src/hooks/useNotifications';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';

/**
 * Root app component.
 * - Hydrates the attendance store from AsyncStorage on mount.
 * - Wraps the app with PaperProvider (theming), SafeAreaProvider (insets, which
 *   the floating tab bar and list screens read directly) and
 *   GestureHandlerRootView.
 */
function AppContent() {
  const hydrate = useAttendanceStore((state) => state.hydrate);
  const { isDark, paperTheme, colors } = useTheme();

  // Initialize and observe notifications
  useNotifications();

  useEffect(() => {
    // Load all persisted logged dates on app launch
    hydrate();
  }, []);

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <AppNavigator />
    </PaperProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
