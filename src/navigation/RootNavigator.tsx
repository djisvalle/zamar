import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LiveStageScreen } from '../screens/LiveStageScreen';
import { AddSongScreen } from '../screens/AddSongScreen';
import { SetlistDetailsScreen } from '../screens/SetlistDetailsScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Every screen draws its own header per the design (menu/tabs/edit/settings
// on Live Stage, back/save on Add Song) — the native stack header stays off.
// Live Stage is the app's home route: with no songId param it renders the
// same shell in an empty state, and the Menu drawer's Library tab is how you
// get to a song (there's no separate standalone Library screen/route).
export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="LiveStage">
      <Stack.Screen name="LiveStage" component={LiveStageScreen} />
      <Stack.Screen name="AddSong" component={AddSongScreen} />
      <Stack.Screen name="SetlistDetails" component={SetlistDetailsScreen} />
    </Stack.Navigator>
  );
}
