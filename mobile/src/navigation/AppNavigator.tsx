import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCourseStore } from '../store/CourseStore';
import { useColors } from '../components/theme';

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

const TAB_LABELS: Record<string, string> = {
  DashboardTab: 'Tổng Quan',
  CoursesTab: 'Khóa Học',
  CalendarTab: 'Lịch Học',
  RoadmapTab: 'Lộ Trình',
  ProfileTab: 'Cá Nhân',
};

const TAB_ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  DashboardTab: ['grid', 'grid-outline'],
  CoursesTab: ['book', 'book-outline'],
  CalendarTab: ['calendar', 'calendar-outline'],
  RoadmapTab: ['git-branch', 'git-branch-outline'],
  ProfileTab: ['person-circle', 'person-circle-outline'],
};

function BottomTabs() {
  const insets = useSafeAreaInsets();
  const C = useColors();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.inkFaint,
        tabBarStyle: {
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 6,
          backgroundColor: C.paper,
          borderTopWidth: 1,
          borderColor: C.line,
        },
        // Nhãn mặc định của React Navigation bị kẹp chiều cao (đo được 7px, rồi
        // 11px cho cỡ chữ 10px) nên dấu nặng dưới chân chữ "Học"/"Lịch" bị cắt.
        // Tự render Text để kiểm soát hẳn lineHeight và vùng hiển thị.
        tabBarLabel: ({ color }) => (
          <View style={{ height: 17, justifyContent: 'center', overflow: 'visible' }}>
            <Text
              style={{
                fontSize: 10,
                lineHeight: 15,
                fontWeight: '700',
                color,
                textAlign: 'center',
              }}
            >
              {TAB_LABELS[route.name] || route.name}
            </Text>
          </View>
        ),
        tabBarIcon: ({ focused, color }) => {
          const [active, inactive] = TAB_ICONS[route.name] || ['help', 'help-outline'];
          return <Ionicons name={focused ? active : inactive} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="DashboardTab" component={LearnerDashboard} />
      <Tab.Screen name="CoursesTab" component={CoursesScreen} />
      <Tab.Screen name="CalendarTab" component={LearnerCalendarScreen} />
      <Tab.Screen name="RoadmapTab" component={RoadmapScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
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
