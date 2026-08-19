import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LibraryScreen } from '../screens/LibraryScreen';
import { LiveStageScreen } from '../screens/LiveStageScreen';
import { AddSongScreen } from '../screens/AddSongScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Every screen draws its own header per the design (menu/tabs/edit/settings
// on Live Stage, back/save on Add Song) — the native stack header stays off.
export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Library">
      <Stack.Screen name="Library" component={LibraryScreen} />
      <Stack.Screen name="LiveStage" component={LiveStageScreen} />
      <Stack.Screen name="AddSong" component={AddSongScreen} />
    </Stack.Navigator>
  );
}
