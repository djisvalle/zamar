import './global.css';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colorScheme } from 'nativewind';
import { StoreProvider, useStore } from './src/data/store';
import { ThemeProvider } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function ThemedApp() {
  const { settings } = useStore();

  useEffect(() => {
    colorScheme.set(settings.appearance);
  }, [settings.appearance]);

  return (
    <ThemeProvider appearance={settings.appearance}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <ThemedApp />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
