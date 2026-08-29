import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { currentUser } from '../data/mockData';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const user = currentUser;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-xl font-bold text-slate-800 mb-6">Tài Khoản</Text>
        
        <View className="items-center mb-8">
          <Image 
            source={{ uri: user.avatar }} 
            className="w-24 h-24 rounded-full bg-slate-200 mb-4 border-4 border-white shadow-sm"
          />
          <Text className="text-2xl font-bold text-slate-800">{user.name}</Text>
          <Text className="text-sm text-slate-500 mt-1">{user.position}</Text>
          <Text className="text-sm text-mm-green font-medium mt-1">MM Mega Market</Text>
        </View>

        <View className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <TouchableOpacity className="flex-row items-center p-4 border-b border-slate-50">
            <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4">
              <Ionicons name="person-outline" size={20} color="#334155" />
            </View>
            <Text className="flex-1 font-semibold text-slate-700">Thông tin cá nhân</Text>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center p-4 border-b border-slate-50">
            <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4">
              <Ionicons name="settings-outline" size={20} color="#334155" />
            </View>
            <Text className="flex-1 font-semibold text-slate-700">Cài đặt</Text>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center p-4">
            <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4">
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <Text className="flex-1 font-semibold text-red-500">Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
