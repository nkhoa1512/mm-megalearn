import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { courses } from '../data/mockData';
import { ProgressBar, Badge } from './ui';

export default function RoadmapTabsPanel({ user }: any) {
  const mockCourses = courses.slice(0, 2); // Show 2 courses for the current step

  const steps = [
    { title: 'Nhân viên Bán hàng', status: 'completed', description: 'Đã hoàn thành' },
    { title: 'Trưởng nhóm Bán hàng', status: 'current', description: 'Đang theo học (Kế cận)' },
    { title: 'Trưởng phòng / Quản lý', status: 'locked', description: 'Cấp bậc tiếp theo' },
  ];

  return (
    <View className="bg-white p-5 rounded-xl shadow-sm flex-1">
      <Text className="text-lg font-bold text-slate-800 mb-6">Lộ Trình Nghề Nghiệp</Text>
      
      <View className="ml-2">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';
          const isLocked = step.status === 'locked';
          
          return (
            <View key={idx} className="flex-row">
              {/* Timeline Column */}
              <View className="items-center mr-4">
                <View className={`w-8 h-8 rounded-full items-center justify-center z-10 ${isCompleted ? 'bg-mm-green' : isCurrent ? 'bg-mm-green border-4 border-mm-green/20' : 'bg-slate-200'}`}>
                  {isCompleted && <Ionicons name="checkmark" size={16} color="white" />}
                  {isCurrent && <View className="w-3 h-3 bg-white rounded-full" />}
                  {isLocked && <Ionicons name="lock-closed" size={14} color="#94a3b8" />}
                </View>
                {/* Connecting Line */}
                {!isLast && (
                  <View className={`w-0.5 flex-1 ${isCompleted ? 'bg-mm-green' : 'bg-slate-200'}`} />
                )}
              </View>
              
              {/* Content Column */}
              <View className="flex-1 pb-10">
                <Text className={`text-base font-bold ${isCurrent ? 'text-mm-green' : isLocked ? 'text-slate-400' : 'text-slate-800'}`}>
                  {step.title}
                </Text>
                <Text className="text-xs text-slate-500 mt-1 mb-3">{step.description}</Text>
                
                {/* Show courses only for current step */}
                {isCurrent && (
                  <View className="mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Text className="text-sm font-semibold text-slate-700 mb-3">Điều kiện thăng cấp:</Text>
                    {mockCourses.map((course: any, cIdx: number) => (
                      <View key={cIdx} className="flex-row mb-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <View className="w-12 bg-slate-100 rounded items-center justify-center mr-3">
                           <Text className="text-xl">📚</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="font-bold text-slate-800 text-xs mb-1" numberOfLines={2}>{course.title}</Text>
                          <ProgressBar value={course.progress || 30} />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
