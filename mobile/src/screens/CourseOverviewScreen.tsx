import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function CourseOverviewScreen({ route }: any) {
  const navigation = useNavigation<any>();
  // Mock course data or read from route.params
  const course = route.params?.course || {
    title: 'Customer Care Excellence & Horeca Client Service',
    code: 'CSERV-087',
    category: 'Customer Service',
    duration: '3h',
    version: 'v2.1',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&h=300&fit=crop',
  };

  const modules = [
    {
      title: 'Module 1: Principles & Regulatory Framework',
      lessons: [
        { id: '1.1', title: 'Industry Standards & Legal Foundations', type: 'Video', req: 'Required', status: 'Not started', icon: 'videocam-outline' },
        { id: '1.2', title: 'Standard Operating Guidelines & Checklists', type: 'PDF', req: 'Required', status: 'Not started', icon: 'document-text-outline' },
      ]
    },
    {
      title: 'Module 2: Practical Execution & Store Floor Application',
      lessons: [
        { id: '2.1', title: 'Step-by-Step Practical Workflow Simulation', type: 'Video', req: 'Required', status: 'Not started', icon: 'videocam-outline' },
        { id: '2.2', title: 'Incident Response & Corrective Actions', type: 'PPT', req: 'Required', status: 'Not started', icon: 'easel-outline' },
        { id: '2.3', title: 'Final Assessment', type: 'Quiz', req: 'Required', status: 'Not started', icon: 'help-circle-outline' },
      ]
    }
  ];

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Cover Image */}
        <View className="rounded-xl overflow-hidden bg-slate-800 h-48 mb-4 relative justify-end">
          <Image source={{ uri: course.image }} className="absolute inset-0 w-full h-full opacity-60" />
          <View className="p-4 relative">
             <View className="flex-row items-center mb-2">
               <View className="bg-white px-2 py-1 rounded mr-2"><Text className="text-[10px] font-bold text-slate-800">{course.code}</Text></View>
               <View className="bg-white px-2 py-1 rounded"><Text className="text-[10px] font-bold text-slate-800">Optional (Elective)</Text></View>
             </View>
             <Text className="text-xl font-bold text-white mb-1">{course.title}</Text>
             <Text className="text-[10px] text-slate-300">{course.category} • {course.duration} • {course.version}</Text>
          </View>
        </View>

        {/* Level Match */}
        <View className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100 flex-row items-center justify-between">
           <View className="flex-1 flex-row items-center flex-wrap">
              <Text className="text-xs text-slate-500 mr-2 mb-1">Cấp bậc của bạn:</Text>
              <View className="bg-slate-100 px-2 py-1 rounded-full mb-1"><Text className="text-[10px] text-slate-600 font-medium">Level 7</Text></View>
              <Ionicons name="arrow-forward" size={14} color="#94a3b8" className="mx-2 mb-1" />
              <Text className="text-xs text-slate-500 mr-2 mb-1">Cấp bậc khóa học:</Text>
              <View className="bg-slate-100 px-2 py-1 rounded-full mb-1"><Text className="text-[10px] text-slate-600 font-medium">Level 7</Text></View>
           </View>
           <View className="bg-green-100 px-2 py-1 rounded-lg flex-row items-center ml-2">
              <Ionicons name="lock-open" size={12} color="#15803d" />
              <Text className="text-green-700 text-[10px] font-bold ml-1">Đúng cấp</Text>
           </View>
        </View>

        {/* Action Box */}
        <View className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-blue-200">
           <Text className="text-blue-700 font-bold mb-1">Khóa Học Thuộc Cấp Bậc Của Bạn — Học Ngay Không Cần Duyệt</Text>
           <Text className="text-xs text-slate-500 mb-4 leading-5">Khóa học ở cấp bậc hiện tại hoặc thấp hơn của bạn nên mở tự do. Bấm để ghi danh và bắt đầu học.</Text>
           <TouchableOpacity className="bg-mm-green py-3 rounded-lg flex-row justify-center items-center">
             <Ionicons name="add" size={16} color="white" />
             <Text className="text-white font-bold ml-1">Đăng Ký Học Ngay</Text>
           </TouchableOpacity>
        </View>

        {/* Curriculum */}
        <View className="bg-white rounded-xl shadow-sm p-4 mb-8">
           <Text className="text-xs font-bold text-slate-400 mb-4 uppercase">Cấu Trúc Chương Trình & Các Bài Học</Text>
           {modules.map((mod, i) => (
             <View key={i} className="mb-6">
                <View className="flex-row items-center mb-4">
                  <View className="w-6 h-6 rounded-full bg-mm-green items-center justify-center mr-2">
                    <Text className="text-white text-xs font-bold">{i+1}</Text>
                  </View>
                  <Text className="font-bold text-slate-800 text-sm flex-1">{mod.title}</Text>
                </View>
                {mod.lessons.map((les, j) => (
                  <TouchableOpacity 
                    key={j} 
                    className="flex-row items-center pl-8 mb-5"
                    onPress={() => navigation.navigate('LessonViewer', { lesson: les, courseTitle: course.title })}
                  >
                     <View className="w-8 h-8 rounded-lg bg-slate-50 items-center justify-center mr-3 border border-slate-100">
                        <Ionicons name={les.icon as any} size={16} color="#64748b" />
                     </View>
                     <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-700 mb-0.5">{les.id} {les.title}</Text>
                        <Text className="text-[10px] text-slate-500">{les.type} • {les.req}</Text>
                     </View>
                     <View className="bg-slate-100 px-2 py-1 rounded ml-2">
                        <Text className="text-[10px] font-bold text-slate-500">{les.status}</Text>
                     </View>
                  </TouchableOpacity>
                ))}
             </View>
           ))}
        </View>
      </ScrollView>
    </View>
  );
}
