import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, ProgressBar, Button, BarChart, StatTile, ResourceCard } from '../components/ui';
import RoadmapTabsPanel from '../components/RoadmapTabsPanel';
import {
  currentUser,
  myLearningCourses,
  notifications,
  deriveCertificates,
  totalLearningHours,
  weeklyStudyHours,
} from '../data/mockData';
import { levelDefinition } from '../data/levelSystem';

export default function LearnerDashboard({ navigation }: any) {
  // In a real app, this would come from a Redux or Zustand store
  const user = currentUser;
  const allCourses = []; // In mock, myLearningCourses in web actually takes allCourses, let's see. 
  // Wait, myLearningCourses requires `allCourses` array. 
  // Let me just mock the derived data directly here if allCourses is too complex to fetch.
  // Actually, mockData.js has `courses` exported. Let's import it.
  
  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16 }}>
      {/* Header Card */}
      <View className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-slate-100">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1 pr-2">
            <View className="w-14 h-14 rounded-full bg-slate-200 items-center justify-center mr-4">
              <Text className="text-xl font-bold text-slate-600">
                {user.avatar || user.fullName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-800">Xin chào, {user.fullName.split(' ').pop()}! 👋</Text>
              <View className="flex-row items-center mt-1">
                <Badge tone="rail">Level {user.level}</Badge>
              </View>
              <Text className="text-xs text-slate-500 mt-1">{user.position} &middot; MM Mega Market</Text>
            </View>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center relative">
            <Ionicons name="notifications-outline" size={22} color="#334155" />
            <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
          </TouchableOpacity>
        </View>
        <Button onPress={() => navigation.navigate('CoursesTab')}>Khóa Học Của Tôi</Button>
      </View>

      {/* Stats Grid */}
      <View className="flex-row justify-between mb-6">
        <StatTile label="Giờ Học" value="12.5h" tone="blue" onClick={() => {}} />
        <StatTile label="Hoàn Thành" value="5" tone="sage" onClick={() => navigation.navigate('CoursesTab')} />
        <StatTile label="Bắt Buộc" value="2" tone="amber" onClick={() => navigation.navigate('CoursesTab')} />
      </View>

      {/* Roadmap */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="font-bold text-slate-800">Lộ Trình</Text>
          <Text className="text-mm-green text-sm font-medium" onPress={() => navigation.navigate('Roadmap')}>Chi Tiết</Text>
        </View>
        <TouchableOpacity 
          className="bg-white p-4 rounded-xl shadow-sm flex-row items-center justify-between border border-slate-100"
          onPress={() => navigation.navigate('Roadmap')}
        >
          <View className="flex-row items-center flex-1">
            <View className="w-12 h-12 bg-mm-green/10 rounded-full items-center justify-center mr-3">
              <Ionicons name="trending-up" size={24} color="#009E49" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">Mục tiêu tiếp theo</Text>
              <Text className="font-bold text-slate-800" numberOfLines={1}>Trưởng nhóm Bán hàng</Text>
              <View className="flex-row items-center mt-2">
                <View className="flex-1 h-1.5 bg-slate-100 rounded-full mr-2">
                  <View className="h-full bg-mm-green rounded-full w-1/3" />
                </View>
                <Text className="text-[10px] text-slate-500 font-medium">30%</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* In Progress Courses */}
      <View className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="font-bold text-slate-800">Đang Theo Dõi (1)</Text>
          <Text className="text-mm-green text-sm font-medium" onPress={() => navigation.navigate('CoursesTab')}>Tất Cả</Text>
        </View>
        <View className="border border-slate-100 p-3 rounded-lg flex-row items-center">
          <View className="flex-1 mr-3">
            <Text className="font-semibold text-sm text-slate-800 mb-2" numberOfLines={1}>
              Nghiệp Vụ Quản Lý Ngành Hàng
            </Text>
            <ProgressBar value={45} />
          </View>
          <Badge tone="amber">45%</Badge>
        </View>
      </View>

      {/* Chart */}
      <View className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <Text className="font-bold text-slate-800 mb-2">Thời Lượng Học Tập Theo Thứ</Text>
        <BarChart data={[
          { label: 'T2', value: 2 },
          { label: 'T3', value: 1.5 },
          { label: 'T4', value: 3 },
          { label: 'T5', value: 0 },
          { label: 'T6', value: 1 },
          { label: 'T7', value: 0.5 },
          { label: 'CN', value: 4 },
        ]} />
      </View>

      {/* Resources */}
      <View className="mb-8 flex-row flex-wrap justify-between">
        {/* Card 1: Chứng Chỉ */}
        <TouchableOpacity className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 w-[48%] items-center">
           <View className="w-12 h-12 bg-amber-50 rounded-full items-center justify-center mb-2">
             <Ionicons name="medal" size={24} color="#d97706" />
           </View>
           <Text className="text-xl font-bold text-slate-800">3</Text>
           <Text className="text-xs text-slate-500 text-center mt-1">Chứng Chỉ</Text>
        </TouchableOpacity>

        {/* Card 2: Khóa Bắt Buộc */}
        <TouchableOpacity className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 w-[48%] items-center" onPress={() => navigation.navigate('CoursesTab')}>
           <View className="w-12 h-12 bg-red-50 rounded-full items-center justify-center mb-2">
             <Ionicons name="alert-circle" size={24} color="#ef4444" />
           </View>
           <Text className="text-xl font-bold text-slate-800">2</Text>
           <Text className="text-xs text-slate-500 text-center mt-1">Khóa Bắt Buộc</Text>
        </TouchableOpacity>

        {/* Card 3: Thông Báo */}
        <TouchableOpacity className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 w-full flex-row items-center">
           <View className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center mr-4">
             <Ionicons name="notifications" size={24} color="#3b82f6" />
             <View className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
           </View>
           <View className="flex-1">
             <Text className="text-sm font-bold text-slate-800">1 Thông báo mới</Text>
             <Text className="text-[11px] text-slate-500 mt-1">Bạn có khóa học vừa được chỉ định thêm.</Text>
           </View>
           <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
