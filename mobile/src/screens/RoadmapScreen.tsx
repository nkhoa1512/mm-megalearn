import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { currentUser } from '../data/mockData';
import { useNavigation } from '@react-navigation/native';

export default function RoadmapScreen() {
  const user = currentUser;
  const [activeTab, setActiveTab] = useState('HIEN_TAI');

  const tabs = [
    { id: 'HIEN_TAI', label: 'Lộ Trình Hiện Tại', icon: 'map' },
    { id: 'KE_CAN', label: 'Lộ Trình Kế Cận', icon: 'git-network' },
    { id: 'DE_XUAT', label: 'Lộ Trình Tự Đề Xuất', icon: 'options' },
    { id: 'GOI_Y', label: 'Khóa Học Gợi Ý', icon: 'star' },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      {/* Horizontal Tab Bar */}
      <View className="bg-white border-b border-slate-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`flex-row items-center px-4 py-4 border-b-2 mx-1 ${isActive ? 'border-mm-green' : 'border-transparent'}`}
              >
                <Ionicons name={tab.icon as any} size={18} color={isActive ? '#009E49' : '#64748b'} />
                <Text className={`ml-2 font-semibold ${isActive ? 'text-mm-green' : 'text-slate-500'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content Area */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {activeTab === 'HIEN_TAI' && <CurrentRoadmap />}
        {activeTab === 'KE_CAN' && <SuccessionRoadmap />}
        {activeTab === 'DE_XUAT' && <SuggestedRoadmap />}
        {activeTab === 'GOI_Y' && <RecommendedCourses />}
      </ScrollView>
    </View>
  );
}

// 1. LỘ TRÌNH HIỆN TẠI (DỌC)
function CurrentRoadmap() {
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);

  const milestones = [
    { title: 'XUẤT PHÁT', desc: '', status: 'start', image: null },
    { title: 'CHẶNG 1', desc: 'Food Safety & Hygiene Standards (HACCP)', status: 'pending', image: 'https://images.unsplash.com/photo-1574629810360-7efbb1925845?w=150&h=150&fit=crop', code: 'FSH-001' },
    { title: 'CHẶNG 2', desc: 'Fresh Meat & Poultry Cold Storage', status: 'pending', image: 'https://images.unsplash.com/photo-1607006411066-574d6c701d81?w=150&h=150&fit=crop', code: 'FMP-002' },
    { title: 'CHẶNG 3', desc: 'Seafood Quality Inspection', status: 'pending', image: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=150&h=150&fit=crop', code: 'SQI-003' },
    { title: 'CHẶNG 4', desc: 'Store Operations Excellence', status: 'pending', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&h=150&fit=crop', code: 'SOE-004' },
    { title: 'VỀ ĐÍCH', desc: '', status: 'finish', image: null },
  ];

  return (
    <View className="bg-white p-4 rounded-xl shadow-sm">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-lg font-bold text-slate-800">Định Biên Level 7</Text>
        <Text className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">0% Hoàn Thành</Text>
      </View>
      <View className="flex-row justify-center items-center mb-8 border-b border-slate-100 pb-4">
        <Text className="text-sm font-semibold text-slate-500">Tiến độ: 0/9 chặng</Text>
      </View>
      <View className="ml-2">
        {milestones.map((ms, idx) => {
          const isLast = idx === milestones.length - 1;
          const isStart = ms.status === 'start';
          const isFinish = ms.status === 'finish';
          
          return (
            <TouchableOpacity 
              key={idx} 
              className="flex-row" 
              activeOpacity={0.7} 
              onPress={() => { if(!isStart && !isFinish) setSelectedMilestone(ms); }}
            >
              <View className="items-center mr-4">
                {isStart ? (
                  <View className="w-14 h-14 bg-blue-500 rounded-full items-center justify-center z-10 shadow-sm border-4 border-blue-100">
                    <Ionicons name="play" size={20} color="white" className="ml-1" />
                  </View>
                ) : isFinish ? (
                  <View className="w-14 h-14 bg-amber-500 rounded-full items-center justify-center z-10 shadow-sm border-4 border-amber-100">
                    <Ionicons name="flag" size={20} color="white" />
                  </View>
                ) : (
                  <View className="w-14 h-14 rounded-full bg-slate-100 z-10 shadow-sm overflow-hidden border-2 border-slate-200">
                    <Image source={{ uri: ms.image }} className="w-full h-full" />
                  </View>
                )}
                {!isLast && (
                  <View className="w-0.5 flex-1 bg-slate-200 my-1" />
                )}
              </View>
              <View className="flex-1 pb-12">
                <View style={{ minHeight: 56, justifyContent: 'center' }}>
                  <Text className={`text-xs font-bold mb-1 uppercase ${isStart ? 'text-blue-600' : isFinish ? 'text-amber-600' : 'text-slate-400'}`}>{ms.title}</Text>
                  {ms.desc ? <Text className="text-sm font-bold text-slate-800 leading-5">{ms.desc}</Text> : null}
                </View>
                {!isStart && !isFinish && (
                  <View className="flex-row items-center bg-slate-100 px-3 py-1.5 rounded-lg self-start mt-2">
                    <Ionicons name="book-outline" size={14} color="#64748b" />
                    <Text className="text-xs text-slate-500 ml-1.5 font-medium">Chưa Bắt Đầu</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <MilestoneModal visible={!!selectedMilestone} milestone={selectedMilestone} onClose={() => setSelectedMilestone(null)} isLocked={false} />
    </View>
  );
}

// 2. LỘ TRÌNH KẾ CẬN (DỌC - KHÓA)
function SuccessionRoadmap() {
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);

  const milestones = [
    { title: 'XUẤT PHÁT', desc: '', status: 'start', image: null },
    { title: 'CHẶNG 1', desc: 'Bakery & Confectionery Sanitation Protocols', status: 'locked', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&h=150&fit=crop', code: 'BCS-001' },
    { title: 'CHẶNG 2', desc: 'Dairy & Delicatessen Temperature Assurance', status: 'locked', image: 'https://images.unsplash.com/photo-1555507036-ab1d4075cff8?w=150&h=150&fit=crop', code: 'DDT-002' },
    { title: 'VỀ ĐÍCH', desc: '', status: 'finish', image: null },
  ];
  return (
    <View>
      <View className="bg-red-50 p-3 rounded-lg flex-row mb-4 border border-red-100 items-center">
        <Ionicons name="lock-closed" size={18} color="#ef4444" />
        <Text className="text-red-600 text-xs ml-2 font-medium flex-1 leading-5">Bạn phải hoàn thành 100% Lộ trình hiện tại (Level 7) để tham gia lộ trình này.</Text>
      </View>
      <View className="bg-white p-4 rounded-xl shadow-sm">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-lg font-bold text-slate-800">Kế Cận Level 6</Text>
          <Text className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">0% Hoàn Thành</Text>
        </View>
        <View className="flex-row justify-center items-center mb-8 border-b border-slate-100 pb-4">
          <Text className="text-sm font-semibold text-slate-500">Tiến độ: 0/20 chặng</Text>
        </View>
        <View className="ml-2">
          {milestones.map((ms, idx) => {
            const isLast = idx === milestones.length - 1;
            const isStart = ms.status === 'start';
            const isFinish = ms.status === 'finish';
            return (
              <TouchableOpacity 
                key={idx} 
                className="flex-row" 
                activeOpacity={0.7}
                onPress={() => { if(!isStart && !isFinish) setSelectedMilestone(ms); }}
              >
                <View className="items-center mr-4">
                  {isStart ? (
                    <View className="w-14 h-14 bg-blue-500 rounded-full items-center justify-center z-10 shadow-sm border-4 border-blue-100">
                      <Ionicons name="play" size={20} color="white" className="ml-1" />
                    </View>
                  ) : isFinish ? (
                    <View className="w-14 h-14 bg-amber-500 rounded-full items-center justify-center z-10 shadow-sm border-4 border-amber-100">
                      <Ionicons name="flag" size={20} color="white" />
                    </View>
                  ) : (
                    <View className="w-14 h-14 rounded-full bg-slate-200 z-10 shadow-sm overflow-hidden border-2 border-slate-300 opacity-60 items-center justify-center">
                      <Image source={{ uri: ms.image }} className="w-full h-full absolute top-0 left-0" style={{ opacity: 0.4 }} />
                      <Ionicons name="lock-closed" size={20} color="#64748b" />
                    </View>
                  )}
                  {!isLast && (
                    <View className="w-0.5 flex-1 bg-slate-200 my-1" />
                  )}
                </View>
                <View className="flex-1 pb-12">
                  <View style={{ minHeight: 56, justifyContent: 'center' }}>
                    <Text className={`text-xs font-bold mb-1 uppercase ${isStart ? 'text-blue-600' : isFinish ? 'text-amber-600' : 'text-slate-400'}`}>{ms.title}</Text>
                    {ms.desc ? <Text className="text-sm font-bold text-slate-500 leading-5">{ms.desc}</Text> : null}
                  </View>
                  {!isStart && !isFinish && (
                    <View className="flex-row items-center bg-slate-100 px-3 py-1.5 rounded-lg self-start mt-2 opacity-70">
                      <Ionicons name="lock-closed" size={14} color="#64748b" />
                      <Text className="text-xs text-slate-500 ml-1.5 font-medium">Đang Khóa</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <MilestoneModal visible={!!selectedMilestone} milestone={selectedMilestone} onClose={() => setSelectedMilestone(null)} isLocked={true} />
    </View>
  );
}

// 3. LỘ TRÌNH TỰ ĐỀ XUẤT
function SuggestedRoadmap() {
  const tracks = [
    { title: 'Chuỗi Cung Ứng & Logistics', desc: 'Vận hành kho vận, quản trị đội xe và tối ưu chuỗi cung ứng.', tags: ['SCM-059', 'SCM-060', 'SCM-061'], icon: 'bus' },
    { title: 'Bán Lẻ Số & Thương Mại Điện Tử', desc: 'Omnichannel, thanh toán số và trải nghiệm khách hàng trực tuyến.', tags: ['ECOM-075', 'ECOM-076'], icon: 'laptop' },
    { title: 'Văn Hóa & Phát Triển Bản Thân', desc: 'Văn hóa doanh nghiệp, phát triển bền vững và chăm sóc sức khỏe tinh thần.', tags: ['CULT-083', 'CULT-084'], icon: 'heart' }
  ];
  return (
    <View>
      <View className="bg-mm-green/10 p-3 rounded-lg flex-row mb-4 border border-mm-green/20 items-center">
        <Ionicons name="information-circle" size={18} color="#009E49" />
        <Text className="text-mm-green text-xs ml-2 font-medium flex-1 leading-5">Các lộ trình chuyên đề mở rộng ngoài định biên — tự chọn theo định hướng phát triển bản thân, hoặc do Quản lý trực tiếp giao thêm.</Text>
      </View>
      {tracks.map((track, idx) => (
        <View key={idx} className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
          <View className="flex-row items-start mb-3">
            <View className="w-10 h-10 bg-mm-green/10 rounded-lg items-center justify-center mr-3">
              <Ionicons name={track.icon as any} size={20} color="#009E49" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-slate-800 text-base mb-1">{track.title}</Text>
              <Text className="text-sm text-slate-500 mb-3">{track.desc}</Text>
              <View className="flex-row flex-wrap">
                {track.tags.map(t => (
                  <View key={t} className="flex-row items-center bg-slate-100 px-2 py-1 rounded mr-2 mb-2">
                    <Ionicons name="book-outline" size={10} color="#64748b" />
                    <Text className="text-[10px] text-slate-600 ml-1 font-medium">{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          <TouchableOpacity className="border border-slate-200 rounded-lg py-3 flex-row justify-center items-center mt-2">
            <Ionicons name="add" size={16} color="#334155" />
            <Text className="font-bold text-slate-700 ml-1 text-sm">Bắt Đầu Track Này</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

// 4. KHÓA HỌC GỢI Ý
function RecommendedCourses() {
  const navigation = useNavigation<any>();
  const courses = [
    { code: 'CSERV-087', title: 'Customer Care Excellence & Horeca Client Service', category: 'Customer Service - Level 7', image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&h=200&fit=crop' },
    { code: 'CSERV-088', title: 'Handling Difficult Customer Demands with Empathy', category: 'Customer Service - Level 7', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=200&fit=crop' },
    { code: 'CSERV-089', title: 'Telephone Etiquette & Professional Email Writing', category: 'Customer Service - Level 7', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&h=200&fit=crop' }
  ];
  return (
    <View>
      <View className="bg-amber-100 p-3 rounded-lg flex-row mb-4 border border-amber-200 items-center">
        <Ionicons name="sparkles" size={18} color="#d97706" />
        <Text className="text-amber-800 text-xs ml-2 font-medium flex-1 leading-5">Gợi ý dựa trên cấp bậc, khối công tác hiện tại và các khóa học chưa hoàn thành.</Text>
      </View>
      {courses.map((course, idx) => (
        <View key={idx} className="bg-white rounded-xl shadow-sm mb-5 border border-slate-100 overflow-hidden">
          <Image source={{ uri: course.image }} className="w-full h-32 bg-slate-200" />
          <View className="p-4">
            <Text className="text-xs font-bold text-slate-400 mb-1">{course.code}</Text>
            <Text className="font-bold text-slate-800 text-base mb-2">{course.title}</Text>
            <Text className="text-xs text-slate-500 mb-4">{course.category}</Text>
            <TouchableOpacity 
              className="border border-slate-200 rounded-lg py-3 flex-row justify-center items-center"
              onPress={() => navigation.navigate('CourseOverview', { course })}
            >
              <Ionicons name="play-outline" size={16} color="#334155" />
              <Text className="font-bold text-slate-700 ml-1 text-sm">Xem Khóa Học</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

// 5. MODAL POPUP (Chi Tiết Chặng)
function MilestoneModal({ visible, milestone, onClose, isLocked }: { visible: boolean, milestone: any, onClose: () => void, isLocked: boolean }) {
  const navigation = useNavigation<any>();
  if (!milestone) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/60 justify-center items-center p-4" activeOpacity={1} onPress={onClose}>
        <TouchableWithoutFeedback>
          <View className="bg-white rounded-2xl w-full p-5 shadow-xl">
            {/* Header info */}
            <View className="flex-row items-start mb-4">
               <View className="w-20 h-20 rounded-xl bg-slate-200 overflow-hidden">
                 <Image source={{uri: milestone.image}} className="w-full h-full" style={isLocked ? {opacity: 0.5, tintColor: 'gray'} : {}} />
               </View>
               <View className="flex-1 ml-4 justify-center">
                 <View className="flex-row items-center mb-1.5">
                   <Text className="text-xs font-bold text-slate-400 mr-2">{milestone.code}</Text>
                   <View className="bg-slate-100 px-2 py-0.5 rounded"><Text className="text-[10px] font-bold text-slate-500">Level 7</Text></View>
                 </View>
                 <Text className="font-bold text-slate-800 text-base leading-6">{milestone.desc}</Text>
               </View>
            </View>

            {/* Status */}
            <View className={`flex-row items-center px-3 py-1.5 rounded-lg self-start mb-4 ${isLocked ? 'bg-slate-100' : 'bg-amber-50'}`}>
               <Ionicons name={isLocked ? 'lock-closed' : 'time-outline'} size={14} color={isLocked ? '#64748b' : '#d97706'} />
               <Text className={`text-xs ml-1.5 font-semibold ${isLocked ? 'text-slate-500' : 'text-amber-700'}`}>{isLocked ? 'Đang Khóa' : 'Chưa Bắt Đầu'}</Text>
            </View>

            <Text className="text-xs text-slate-500 mb-2 font-medium">Thời lượng: 3h - Điểm đạt: 80%</Text>
            <Text className="text-sm text-slate-600 mb-6 leading-5">Khóa học này cung cấp kiến thức nền tảng và các tiêu chuẩn bắt buộc theo quy định của MMVN. Sau khi hoàn thành, học viên sẽ nắm rõ các quy trình vận hành cốt lõi.</Text>
            
            <TouchableOpacity 
              className={`rounded-xl py-3.5 flex-row justify-center items-center ${isLocked ? 'bg-slate-200' : 'bg-mm-green'}`} 
              onPress={() => { onClose(); navigation.navigate('CourseOverview', { course: { title: milestone.desc, code: milestone.code, image: milestone.image, category: 'Store Operations', duration: '3h', version: 'v1.0' } }); }}
              disabled={isLocked}
            >
              <Ionicons name={isLocked ? "lock-closed" : "play"} size={18} color={isLocked ? "#94a3b8" : "white"} />
              <Text className={`font-bold ml-2 text-base ${isLocked ? 'text-slate-400' : 'text-white'}`}>
                {isLocked ? 'Khóa Học Đang Bị Khóa' : 'Vào Học Ngay'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="absolute top-2 right-2 p-2" onPress={onClose}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  )
}
