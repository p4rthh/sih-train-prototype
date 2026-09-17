import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { YatraOne_400Regular } from '@expo-google-fonts/yatra-one';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { extraFonts } from './theme/fonts';
import { getActiveHost, setCustomHost } from './services/api';
import type { RootStackParamList } from './navigation/types';

// This is a user-facing app — people shouldn't have to open a settings modal and type a host
// before they can search for a train. services/api.ts is a frozen contract (can't change its
// own default port), but it already auto-detects the right *IP* on its own — on a physical
// device via Expo Go, getActiveHost() resolves to the dev machine's real LAN IP straight out of
// Metro's own connection info; on web/simulator it resolves to "localhost". The only thing it
// gets wrong for this project is the *port*: it defaults to 8000, but the real backend runs on
// 8001 (port 8000 was already occupied by an unrelated process on the dev machine — see
// UI_NOTES.md). Re-applying that same auto-detected host with the correct port here means the
// app just works out of the box; the hamburger-menu config modal is still there for anyone who
// needs to point at a different machine or a tunnel, it's just no longer required for the common
const activeHost = getActiveHost();
if (
  !activeHost.startsWith('http://') &&
  !activeHost.startsWith('https://') &&
  !activeHost.includes(':')
) {
  setCustomHost(`${activeHost}:8000`);
}

import { SplashScreen as BrandSplashScreen } from './screens/SplashScreen';
import { LocationPermissionScreen } from './screens/LocationPermissionScreen';
import { HomeScreen } from './screens/HomeScreen';
import { StationSearchScreen } from './screens/StationSearchScreen';
import { TrainTabsScreen } from './navigation/TrainTabsScreen';
import { PNRScreen } from './screens/PNRScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded, fontsError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    YatraOne_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Inter_800ExtraBold,
    ...extraFonts,
  });

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      setReady(true);
    }
  }, [fontsLoaded, fontsError]);

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={BrandSplashScreen} />
          <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="StationSearch" component={StationSearchScreen} />
          <Stack.Screen name="TrainTabs" component={TrainTabsScreen} />
          <Stack.Screen name="PNR" component={PNRScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
