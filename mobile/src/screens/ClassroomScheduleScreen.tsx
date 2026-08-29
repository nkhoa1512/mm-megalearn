import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ClassroomScheduleScreen() {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState('Tất Cả Buổi Đào Tạo');

  const filters = [
    'Tất Cả Buổi Đào Tạo',
    'Lớp Tới Lượt Gắn / Đã Đăng Ký',
    'Lớp Sắp Diễn Ra',
    'Thực Hành Xưởng Siêu Thị',
    'Hội Thảo Trực Tuyến (Webinar)'
  ];

  const workshops = [
    {
      id: 1,
      type: 'Thực Hành Tại Xưởng',
      code: 'WS-FSH-01',
      title: 'Store Practical Lab: Food Safety Standards & Commercial Bakery Deck Operations',
      desc: 'Hands-on sanitation and sterilization of dough mixers, oven pressure calibration, and mechanical jam handling compliant with Gold HACCP standards.',
      date: '2026-08-28 - 08:30 - 11:30 (3.0 hours)',
      location: 'Fresh Food & Bakery Lab - MM Mega Market An Phu (Flagship)',
      trainer: 'Nguyen Van Hung (Master Trainer) (Master Trainer L&ODI)',
      registered: 21,
      capacity: 25,
      reward: '+150 XP & Chứng nhận tham gia',
      status: 'Chờ Đến Lớp Quét QR',
      action: 'Quét QR Điểm Danh',
      actionIcon: 'qr-code-outline'
    },
    {
      id: 2,
      type: 'Thực Hành Tại Xưởng',
      code: 'WS-PCCC-02',
      title: 'Store Emergency Response: Fire Drills, Evacuation & First Aid',
      desc: 'Hands-on gas fire suppression, fire blanket deployment, and peak-hour customer evacuation protocols in hypermarkets.',
      date: '2026-09-05 - 14:00 - 17:00 (3.0 hours)',
      location: 'HSE Fire & Emergency Drill Grounds - MM Mega Market Thang Long (Hanoi)',
      trainer: 'Vu Duc Thanh (HSE Trainer) (Loss Prevention & HSE Director)',
      registered: 53,
      capacity: 60,
      reward: '+150 XP & Chứng nhận tham gia',
      status: 'Chờ Đến Lớp Quét QR',
      action: 'Quét QR Điểm Danh',
      actionIcon: 'qr-code-outline'
    },
    {
      id: 3,
      type: 'Teams Webinar',
      code: 'WEB-SEC-03',
      title: 'Webinar: POS Terminal Information Security & Anti-Phishing Tactics',
      desc: 'Case analysis of 5 phishing incidents identified in Q3/2026 and immediate POS workstation isolation protocols.',
      date: '2026-08-15 - 10:00 - 11:30 (1.5 hours)',
      location: 'Microsoft Teams Live Webinar (An Phu Head Office Studio)',
      trainer: 'Tran Quoc Bao (IT) (Lead IT Systems Administrator & Cybersecurity Lead)',
      registered: 184,
      capacity: 200,
      reward: '+150 XP & Chứng nhận tham gia',
      status: 'Đã Điểm Danh',
      action: 'Đánh Giá Buổi Học (CSAT)',
      actionIcon: 'star-outline'
    },
    {
      id: 4,
      type: 'Thực Hành Tại Xưởng',
      code: 'WS-POS-04',
      title: 'Store Practical Lab: High-Speed POS Checkout & Customer Complaint Handling',
      desc: 'High-speed barcode scanning on physical POS units, digital voucher processing, and L.A.S.T customer complaint resolution.',
      date: '2026-09-12 - 09:00 - 12:00 (3.0 hours)',
      location: 'Cashier & Frontline Service Lab - MM Mega Market An Phu',
      trainer: 'Le Thi Mai (HRBP) (HR Business Partner - Head of People Partnering)',
      registered: 18,
      capacity: 20,
      reward: '+150 XP & Chứng nhận tham gia',
      status: 'Mở Đăng Ký',
      action: 'Đăng Ký Tham Gia',
      actionIcon: 'add-outline'
    }
  ];

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Chờ Đến Lớp Quét QR': return 'text-amber-700 bg-amber-100';
      case 'Đã Điểm Danh': return 'text-green-700 bg-green-100';
      case 'Mở Đăng Ký': return 'text-slate-600 bg-slate-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'Thực Hành Tại Xưởng': return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'Teams Webinar': return 'text-blue-700 bg-blue-50 border border-blue-200';
      default: return 'text-slate-700 bg-slate-50 border border-slate-200';
    }
  };

  const getActionStyle = (action: string) => {
    switch(action) {
      case 'Quét QR Điểm Danh': return 'bg-green-700 text-white border-green-700';
      case 'Đánh Giá Buổi Học (CSAT)': return 'bg-white text-slate-700 border-slate-300';
      case 'Đăng Ký Tham Gia': return 'bg-mm-green text-white border-mm-green';
      default: return 'bg-mm-green text-white border-mm-green';
    }
  };

  const getActionIconColor = (action: string) => {
    return action.includes('Đánh Giá') ? '#334155' : 'white';
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-4 pt-3 pb-3 shadow-sm z-10 flex-row items-center">
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-800 leading-5" numberOfLines={2}>
            Lớp Đào Tạo Trực Tiếp & Quét QR Điểm Danh (ILT Workshops)
          </Text>
        </View>
      </View>
      
      {/* Top Action Button */}
      <View className="bg-white px-4 py-3 border-b border-slate-100">
        <TouchableOpacity 
          className="flex-row items-center justify-center border border-slate-300 rounded-lg py-2.5 bg-slate-50 shadow-sm"
          onPress={() => Alert.alert('Mở Camera', 'Đang kết nối camera để quét mã QR của Giảng viên...')}
        >
          <Ionicons name="scan" size={16} color="#334155" />
          <Text className="font-bold text-slate-700 text-xs ml-2">Mở Camera Quét QR Giảng Viên</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Filters */}
        <View className="bg-white py-3 border-b border-slate-200 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {filters.map((f, i) => (
              <TouchableOpacity 
                key={i} 
                onPress={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-full mr-2 border ${activeFilter === f ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}
              >
                <Text className={`text-xs font-semibold ${activeFilter === f ? 'text-blue-700' : 'text-slate-600'}`}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Workshop Cards List */}
        <View className="px-4 pb-12">
          {workshops.map(ws => (
            <View key={ws.id} className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
              <View className="p-4">
                
                {/* Card Top Row */}
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 flex-row flex-wrap items-center mr-2">
                    <View className={`px-2 py-1 rounded mb-1 mr-2 flex-row items-center ${getTypeStyle(ws.type)}`}>
                       <Ionicons name={ws.type === 'Teams Webinar' ? 'videocam' : 'build'} size={10} color={ws.type === 'Teams Webinar' ? '#1d4ed8' : '#b45309'} />
                       <Text className="text-[9px] font-bold ml-1">{ws.type}</Text>
                    </View>
                    <Text className="text-[10px] text-slate-400 font-bold mb-1">{ws.code}</Text>
                  </View>
                  <View className={`px-2 py-1 rounded flex-row items-center ${getStatusStyle(ws.status)}`}>
                    {ws.status === 'Chờ Đến Lớp Quét QR' && <Ionicons name="time" size={10} color="#b45309" />}
                    {ws.status === 'Đã Điểm Danh' && <Ionicons name="checkmark-circle" size={10} color="#15803d" />}
                    {ws.status === 'Mở Đăng Ký' && <Ionicons name="ellipse" size={10} color="#15803d" />}
                    <Text className="text-[10px] font-bold ml-1">{ws.status}</Text>
                  </View>
                </View>

                {/* Title & Desc */}
                <Text className="font-bold text-slate-800 text-sm mb-2 leading-5">{ws.title}</Text>
                <Text className="text-[11px] text-slate-500 mb-4 leading-5">{ws.desc}</Text>

                {/* Info Box */}
                <View className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-4">
                  <View className="flex-row items-start mb-2">
                    <Ionicons name="calendar-outline" size={14} color="#3b82f6" className="mt-0.5" />
                    <Text className="text-[11px] text-slate-700 font-medium ml-2 flex-1">{ws.date}</Text>
                  </View>
                  <View className="flex-row items-start mb-2">
                    <Ionicons name="location-outline" size={14} color="#ef4444" className="mt-0.5" />
                    <Text className="text-[11px] text-slate-600 ml-2 flex-1">{ws.location}</Text>
                  </View>
                  <View className="flex-row items-start">
                    <Ionicons name="person-outline" size={14} color="#10b981" className="mt-0.5" />
                    <Text className="text-[11px] text-slate-700 font-medium ml-2 flex-1">{ws.trainer}</Text>
                  </View>
                </View>

                {/* Seat Capacity */}
                <View className="mb-4">
                  <View className="flex-row justify-between items-end mb-1.5">
                    <Text className="text-[10px] text-slate-500">Sĩ số lớp: <Text className="font-bold text-slate-800">{ws.registered}/{ws.capacity}</Text> Học viên</Text>
                    <Text className="text-[10px] text-slate-500">Còn trống {ws.capacity - ws.registered} chỗ</Text>
                  </View>
                  <View className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <View className="h-full bg-mm-green" style={{ width: `${(ws.registered / ws.capacity) * 100}%` }} />
                  </View>
                </View>
              </View>

              {/* Footer */}
              <View className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex-row justify-between items-center">
                <View className="flex-row items-center flex-1 pr-2">
                  <Ionicons name="gift-outline" size={14} color="#d97706" />
                  <Text className="text-[9px] text-slate-500 ml-1 leading-3 flex-1" numberOfLines={2}>Phần thưởng: {ws.reward}</Text>
                </View>
                <TouchableOpacity 
                  className={`px-3 py-2 border rounded-lg flex-row items-center shadow-sm ${getActionStyle(ws.action)}`}
                  onPress={() => {
                    if (ws.action.includes('Quét QR')) {
                      Alert.alert('Quét QR', 'Đang kết nối camera để điểm danh...');
                    } else if (ws.action.includes('Đánh Giá')) {
                      Alert.alert('Đánh Giá', 'Đang mở phiếu khảo sát đánh giá...');
                    } else {
                      Alert.alert('Đăng Ký', 'Đăng ký thành công!');
                    }
                  }}
                >
                  <Ionicons name={ws.actionIcon as any} size={14} color={getActionIconColor(ws.action)} />
                  <Text className={`text-[10px] font-bold ml-1 ${ws.action.includes('Đánh Giá') ? 'text-slate-700' : 'text-white'}`}>{ws.action}</Text>
                </TouchableOpacity>
              </View>

            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
