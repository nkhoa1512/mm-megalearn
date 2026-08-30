import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Screens
import LearnerDashboard from '../screens/LearnerDashboard';
import CoursesScreen from '../screens/CoursesScreen';
import ClassroomScheduleScreen from '../screens/ClassroomScheduleScreen';
import CertificatesScreen from '../screens/CertificatesScreen';
import ProfileScreen from '../screens/ProfileScreen';

import CourseOverviewScreen from '../screens/CourseOverviewScreen';
import LessonViewerScreen from '../screens/LessonViewerScreen';
import AssessmentPlayerScreen from '../screens/AssessmentPlayerScreen';
import RoadmapScreen from '../screens/RoadmapScreen';
import AiLearningHubScreen from '../screens/AiLearningHubScreen';
import LearnerCalendarScreen from '../screens/LearnerCalendarScreen';
import LearningHistoryScreen from '../screens/LearningHistoryScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#009E49',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderColor: '#E2E8F0',
        },
        tabBarLabelStyle: {
          fontSize: 9.5,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help';
          if (route.name === 'DashboardTab') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'CoursesTab') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'ClassroomsTab') {
            iconName = focused ? 'easel' : 'easel-outline';
          } else if (route.name === 'AchievementsTab') {
            iconName = focused ? 'ribbon' : 'ribbon-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={LearnerDashboard}
        options={{ title: 'Tổng Quan', tabBarLabel: 'Tổng Quan' }}
      />
      <Tab.Screen
        name="CoursesTab"
        component={CoursesScreen}
        options={{ title: 'Khóa Học', tabBarLabel: 'Khóa Học' }}
      />
      <Tab.Screen
        name="ClassroomsTab"
        component={ClassroomScheduleScreen}
        options={{ title: 'Lớp Thực Hành', tabBarLabel: 'Thực Hành' }}
      />
      <Tab.Screen
        name="AchievementsTab"
        component={CertificatesScreen}
        options={{ title: 'Thành Tích', tabBarLabel: 'Chứng Chỉ' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Tài Khoản', tabBarLabel: 'Tài Khoản' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={BottomTabs} />
        <Stack.Screen name="CourseOverview" component={CourseOverviewScreen} />
        <Stack.Screen name="LessonViewer" component={LessonViewerScreen} />
        <Stack.Screen name="AssessmentPlayer" component={AssessmentPlayerScreen} />
        <Stack.Screen name="Roadmap" component={RoadmapScreen} />
        <Stack.Screen name="AiLearningHub" component={AiLearningHubScreen} />
        <Stack.Screen name="LearnerCalendar" component={LearnerCalendarScreen} />
        <Stack.Screen name="LearningHistory" component={LearningHistoryScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Certificates" component={CertificatesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
