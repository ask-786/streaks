import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { ActivitiesScreen } from '../screens/ActivitiesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ActivitySettingsScreen } from '../screens/ActivitySettingsScreen';
import { Typography, Spacing } from '../constants';
import { useAttendanceStore } from '../store/attendanceStore';
import { useTheme } from '../hooks/useTheme';
import { TabBar } from './TabBar';
import { IconButton } from '../components/ui';

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

/**
 * Two-line header title: the habit's name reads as the subject, with a quiet
 * label above it so the user always knows which habit they are inside.
 */
const HabitTitle: React.FC<{ name?: string }> = ({ name }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.headerTitle}>
      <Text style={[styles.headerEyebrow, { color: colors.textTertiary }]}>Habit</Text>
      <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>
        {name ?? 'Activity'}
      </Text>
    </View>
  );
};

const ActivityTabNavigator = () => {
  const { activities, selectedActivityId } = useAttendanceStore();
  const selectedActivity = activities.find((a) => a.id === selectedActivityId);
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: false,
        headerTitleAlign: 'left' as const,
        headerTitleStyle: {
          ...Typography.headlineMedium,
          color: colors.textPrimary,
        },
        headerTintColor: colors.primary,
        headerRightContainerStyle: { paddingRight: Spacing.md },
        headerLeftContainerStyle: { paddingLeft: Spacing.sm },
        headerRight: () => (
          <IconButton
            icon="sliders-h"
            onPress={() => navigation.navigate('ActivitySettings' as never)}
            accessibilityLabel="Habit settings"
          />
        ),
        sceneStyle: { backgroundColor: colors.background },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerTitle: () => <HabitTitle name={selectedActivity?.name} />,
          tabBarLabel: 'Today',
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          headerTitle: () => <HabitTitle name={selectedActivity?.name} />,
          tabBarLabel: 'Calendar',
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          headerTitle: () => <HabitTitle name={selectedActivity?.name} />,
          tabBarLabel: 'Stats',
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();

  // Give React Navigation the same palette so screen transitions never flash a
  // stock white or black frame between routes.
  const navTheme: Theme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.accent,
      },
    };
  }, [isDark, colors]);

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Activities"
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: {
            ...Typography.headlineMedium,
            color: colors.textPrimary,
          },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
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
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen
          name="ActivitySettings"
          component={ActivitySettingsScreen}
          options={{ title: 'Habit settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    justifyContent: 'center',
  },
  headerEyebrow: {
    ...Typography.overline,
    fontSize: 9.5,
    marginBottom: 2,
  },
  headerName: {
    ...Typography.headlineMedium,
    maxWidth: 220,
  },
});
