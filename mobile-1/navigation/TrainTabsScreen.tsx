import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, ChartColumn, MapPin, Train } from 'lucide-react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, space, type } from '../theme/tokens';
import { TrainDetailScreen } from '../screens/TrainDetailScreen';
import { TrackScreen } from '../screens/TrackScreen';
import { BehaviorScreen } from '../screens/BehaviorScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { TrainInstanceProvider } from '../context/TrainInstanceContext';
import type { RootStackParamList, TrainTabsParamList } from './types';

const Tab = createBottomTabNavigator<TrainTabsParamList>();

const TAB_ICONS: Record<keyof TrainTabsParamList, typeof Train> = {
  TrainView: Train,
  Track: MapPin,
  Behavior: ChartColumn,
  Alerts: Bell,
};

const TAB_LABELS: Record<keyof TrainTabsParamList, string> = {
  TrainView: 'Train View',
  Track: 'Track',
  Behavior: 'Behavior',
  Alerts: 'Alerts',
};

type Props = NativeStackScreenProps<RootStackParamList, 'TrainTabs'>;

export function TrainTabsScreen({ route, navigation }: Props) {
  const { trainNo } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <TrainInstanceProvider trainNo={trainNo}>
      <View style={styles.ground}>
        <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.pinkDeep} />
          </TouchableOpacity>
          <Text style={styles.wordmark}>navarail</Text>
          <View style={styles.backBtn} />
        </View>
        <Tab.Navigator
          screenOptions={({ route: r }) => {
            const name = r.name as keyof TrainTabsParamList;
            const Icon = TAB_ICONS[name];
            return {
              headerShown: false,
              tabBarLabel: TAB_LABELS[name],
              tabBarActiveTintColor: colors.pinkDeep,
              tabBarInactiveTintColor: colors.maroonMuted,
              tabBarStyle: [
                styles.tabBar,
                { paddingBottom: Math.max(space.xs, insets.bottom), height: 58 + insets.bottom },
              ],
              tabBarLabelStyle: styles.tabLabel,
              tabBarIcon: ({ focused, color }) => (
                <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
                  <Icon size={16} color={focused ? colors.white : color} />
                </View>
              ),
            };
          }}
        >
          <Tab.Screen name="TrainView" component={TrainDetailScreen} initialParams={{ trainNo }} />
          <Tab.Screen name="Track" component={TrackScreen} initialParams={{ trainNo }} />
          <Tab.Screen name="Behavior" component={BehaviorScreen} initialParams={{ trainNo }} />
          <Tab.Screen name="Alerts" component={AlertsScreen} initialParams={{ trainNo }} />
        </Tab.Navigator>
      </View>
    </TrainInstanceProvider>
  );
}

const styles = StyleSheet.create({
  ground: {
    flex: 1,
    backgroundColor: colors.pink,
  },
  header: {
    height: 64,
    backgroundColor: colors.cream,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    ...type.display,
    fontSize: 30,
    color: colors.pinkDeep,
  },
  tabBar: {
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    height: 64,
    paddingTop: space.xs,
    paddingBottom: space.xs,
  },
  tabLabel: {
    ...type.micro,
    fontSize: 10,
  },
  tabIconWrap: {
    width: 40,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: colors.pinkDeep,
  },
});
