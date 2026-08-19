import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from './src/data/store';
import { ThemeProvider } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function ThemedApp() {
  const { settings } = useStore();
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
    <SafeAreaProvider>
      <StoreProvider>
        <ThemedApp />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
