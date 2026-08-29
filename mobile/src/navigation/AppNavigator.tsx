import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import LearnerDashboard from '../screens/LearnerDashboard';
import CoursesScreen from '../screens/CoursesScreen';
import RoadmapScreen from '../screens/RoadmapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CourseOverviewScreen from '../screens/CourseOverviewScreen';
import LessonViewerScreen from '../screens/LessonViewerScreen';
import ClassroomScheduleScreen from '../screens/ClassroomScheduleScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', fontSize: 16 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="DashboardMain" 
        component={LearnerDashboard} 
        options={{ title: 'Tổng Quan' }} 
      />
      <Stack.Screen name="Roadmap" component={RoadmapScreen} options={{ title: 'Chi Tiết Lộ Trình' }} />
      <Stack.Screen name="CourseOverview" component={CourseOverviewScreen} options={{ title: 'Tổng Quan Khóa Học' }} />
      <Stack.Screen name="LessonViewer" component={LessonViewerScreen} options={{ title: 'Chi Tiết Bài Học' }} />
      <Stack.Screen name="ClassroomSchedule" component={ClassroomScheduleScreen} options={{ title: 'Lịch Đào Tạo' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#009E49',
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: { paddingBottom: 5, paddingTop: 5, height: 60 },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'help';
            if (route.name === 'DashboardTab') {
              iconName = focused ? 'grid' : 'grid-outline';
            } else if (route.name === 'CoursesTab') {
              iconName = focused ? 'book' : 'book-outline';
            } else if (route.name === 'ProfileTab') {
              iconName = focused ? 'person' : 'person-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen 
          name="DashboardTab" 
          component={DashboardStack} 
          options={{ title: 'Tổng Quan', tabBarLabel: 'Tổng Quan' }} 
        />
        <Tab.Screen 
          name="CoursesTab" 
          component={CoursesScreen} 
          options={{ title: 'Khóa Học', tabBarLabel: 'Khóa Học' }} 
        />
        <Tab.Screen 
          name="ProfileTab" 
          component={ProfileScreen} 
          options={{ title: 'Tài Khoản', tabBarLabel: 'Tài Khoản' }} 
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
