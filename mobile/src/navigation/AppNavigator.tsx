import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCourseStore } from '../store/CourseStore';

import LoginScreen from '../screens/LoginScreen';
import LearnerDashboard from '../screens/LearnerDashboard';
import CoursesScreen from '../screens/CoursesScreen';
import LearnerCalendarScreen from '../screens/LearnerCalendarScreen';
import RoadmapScreen from '../screens/RoadmapScreen';
import ProfileScreen from '../screens/ProfileScreen';

import CourseOverviewScreen from '../screens/CourseOverviewScreen';
import LessonViewerScreen from '../screens/LessonViewerScreen';
import AssessmentPlayerScreen from '../screens/AssessmentPlayerScreen';
import ClassroomScheduleScreen from '../screens/ClassroomScheduleScreen';
import CertificatesScreen from '../screens/CertificatesScreen';
import LearningHistoryScreen from '../screens/LearningHistoryScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import AiLearningHubScreen from '../screens/AiLearningHubScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  DashboardTab: ['grid', 'grid-outline'],
  CoursesTab: ['book', 'book-outline'],
  CalendarTab: ['calendar', 'calendar-outline'],
  RoadmapTab: ['git-branch', 'git-branch-outline'],
  ProfileTab: ['person-circle', 'person-circle-outline'],
};

function BottomTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#009E49',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderColor: '#E2E8F0',
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarIcon: ({ focused, color }) => {
          const [active, inactive] = TAB_ICONS[route.name] || ['help', 'help-outline'];
          return <Ionicons name={focused ? active : inactive} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="DashboardTab" component={LearnerDashboard} options={{ tabBarLabel: 'Tổng Quan' }} />
      <Tab.Screen name="CoursesTab" component={CoursesScreen} options={{ tabBarLabel: 'Khóa Học' }} />
      <Tab.Screen name="CalendarTab" component={LearnerCalendarScreen} options={{ tabBarLabel: 'Lịch Học' }} />
      <Tab.Screen name="RoadmapTab" component={RoadmapScreen} options={{ tabBarLabel: 'Lộ Trình' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: 'Cá Nhân' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useCourseStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabs} />
            <Stack.Screen name="CourseOverview" component={CourseOverviewScreen} />
            <Stack.Screen name="LessonViewer" component={LessonViewerScreen} />
            <Stack.Screen
              name="AssessmentPlayer"
              component={AssessmentPlayerScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="Classrooms" component={ClassroomScheduleScreen} />
            <Stack.Screen name="Certificates" component={CertificatesScreen} />
            <Stack.Screen name="LearningHistory" component={LearningHistoryScreen} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            <Stack.Screen name="AiLearningHub" component={AiLearningHubScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
