import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { ActivitiesScreen } from '../screens/ActivitiesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ActivitySettingsScreen } from '../screens/ActivitySettingsScreen';
import { Colors, Typography } from '../constants';
import { Text } from 'react-native';
import { useAttendanceStore } from '../store/attendanceStore';
import { useTheme } from '../hooks/useTheme';
import { FontAwesome5 } from '@expo/vector-icons';

export type RootStackParamList = {
  Activities: undefined;
  ActivityDetail: undefined;
  Settings: undefined;
  ActivitySettings: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Stats: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const ICON_SIZE = 22;
const TabIcon: React.FC<{ name: string; color: string }> = ({ name, color }) => (
  <FontAwesome5 name={name} size={ICON_SIZE} color={color} />
);

const ActivityTabNavigator = () => {
  const { activities, selectedActivityId } = useAttendanceStore();
  const selectedActivity = activities.find(a => a.id === selectedActivityId);
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          ...Typography.headlineMedium,
          color: colors.textPrimary,
        },
        headerTintColor: Colors.primary,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ActivitySettings' as never)}
            style={{ marginRight: 16, padding: 4 }}
            hitSlop={8}
          >
            <FontAwesome5 name="cog" size={19} color={colors.textSecondary} />
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 12,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          ...Typography.labelMedium,
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerTitle: selectedActivity ? selectedActivity.name : 'Activity',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <TabIcon name="calendar-alt" color={color} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <TabIcon name="chart-bar" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Activities"
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            ...Typography.headlineMedium,
            color: colors.textPrimary,
          },
          headerTintColor: Colors.primary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="Activities"
          component={ActivitiesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ActivityDetail"
          component={ActivityTabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="ActivitySettings"
          component={ActivitySettingsScreen}
          options={{ title: 'Activity Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
