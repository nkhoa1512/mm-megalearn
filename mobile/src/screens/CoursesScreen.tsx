import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function CoursesScreen() {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState('Tất Cả Khóa Đã Gắn');
  const [selectedCurriculum, setSelectedCurriculum] = useState<any>(null);

  const filters = [
    { label: 'Tất Cả Khóa Đã Gắn', count: 18 },
    { label: 'Đang Học', count: 5 },
    { label: 'Đã Hoàn Thành', count: 3 },
    { label: 'Quá Hạn', count: 2 },
    { label: 'Bắt Buộc Tuân Thủ', count: 15 },
    { label: 'Theo Giáo Trình', count: 10 }
  ];

  const curriculums = [
    { title: 'Chương Trình Nền Tảng An Toàn Thực Phẩm', desc: 'Giáo trình E-Learning tổng hợp các khóa an toàn & vệ sinh thực phẩm bắt buộc cho toàn bộ nhân sự khối Tươi Sống.', tags: ['Food Safety & Hygiene', '4 khóa học E-Learning'], deadline: '2026-09-30', progress: 1, total: 4, status: 'Đang Học' },
    { title: 'Giáo Trình An Ninh Thông Tin Doanh Nghiệp', desc: 'Giáo trình E-Learning bắt buộc toàn công ty về nhận thức an ninh mạng và bảo vệ dữ liệu khách hàng.', tags: ['Information Security', '3 khóa học E-Learning'], deadline: '2026-09-15', progress: 1, total: 3, status: 'Đang Học' },
    { title: 'Giáo Trình Tuân Thủ & Đạo Đức Doanh Nghiệp', desc: 'Giáo trình E-Learning bắt buộc: quy tắc ứng xử, chống tham nhũng, và các quy định pháp lý cạnh tranh công bằng.', tags: ['Compliance & Ethics', '3 khóa học E-Learning'], deadline: '2026-09-25', progress: 0, total: 3, status: 'Chưa Bắt Đầu' }
  ];

  const coursesList = [
    {
      code: 'FSH-001', title: 'Food Safety & Hygiene Standards (HACCP)', category: 'Food Safety & Hygiene', duration: '3h',
      image: 'https://images.unsplash.com/photo-1574629810360-7efbb1925845?w=200&h=150&fit=crop',
      curriculum: 'Giáo trình: Chương Trình Nền Tảng An Toàn Thực Phẩm',
      access: 'Đúng cấp', format: 'E-Learning', type: 'SCORM 2004',
      progress: 47, status: 'Đang Học', action: 'Tiếp Tục', actionIcon: 'play'
    },
    {
      code: 'FSH-002', title: 'Fresh Meat & Poultry Cold Storage Procedures', category: 'Food Safety & Hygiene', duration: '3h',
      image: 'https://images.unsplash.com/photo-1607006411066-574d6c701d81?w=200&h=150&fit=crop',
      curriculum: null,
      access: 'Đúng cấp', format: 'E-Learning', type: 'SCORM 2004',
      progress: 100, status: 'Đã Hoàn Thành', action: 'Ôn Tập', actionIcon: 'refresh'
    },
    {
      code: 'FSH-003', title: 'Seafood Quality Inspection & Cross-Contamination Control', category: 'Food Safety & Hygiene', duration: '3h',
      image: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=200&h=150&fit=crop',
      curriculum: 'Giáo trình: Chương Trình Nền Tảng An Toàn Thực Phẩm',
      access: 'Đúng cấp', format: 'E-Learning', type: 'SCORM 2004',
      progress: 100, status: 'Cần Thi Lại', action: 'Thi Lại', actionIcon: 'refresh-circle'
    },
    {
      code: 'ISA-012', title: 'Customer Data Privacy & Personal Data Protection (PDPD)', category: 'Information Security', duration: '2h',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=200&h=150&fit=crop',
      curriculum: 'Giáo trình: Giáo Trình An Ninh Thông Tin Doanh Nghiệp',
      access: 'Đúng cấp', format: 'E-Learning', type: 'Interactive Video',
      progress: 25, status: 'Quá Hạn', action: 'Tiếp Tục', actionIcon: 'play'
    },
    {
      code: 'HSE-019', title: 'On-site Fire Safety & Emergency Evacuation (PCCC)', category: 'Health & Safety', duration: '3h',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=150&fit=crop',
      curriculum: null,
      access: 'Đúng cấp', format: 'Trực Tiếp (ILT)', type: 'Store Practical Lab / ILT\nGV: Nguyen Van Hung',
      progress: 80, status: 'Đang Học', action: 'Xem Lịch QR', actionIcon: 'qr-code'
    },
    {
      code: 'FSH-004', title: 'Bakery & Confectionery Sanitation Protocols', category: 'Food Safety & Hygiene', duration: '3h',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=150&fit=crop',
      curriculum: 'Giáo trình: Chương Trình Nền Tảng An Toàn Thực Phẩm',
      access: 'Cần xin duyệt', format: 'E-Learning', type: 'SCORM 2004',
      progress: 0, status: 'Chưa Bắt Đầu', action: 'Xin Duyệt Vượt Cấp', actionIcon: 'lock-closed',
      requiresApproval: true,
      approvalMsg: 'Khóa học Level 6 cao hơn cấp bậc hiện tại (Level 7). Bạn cần gửi yêu cầu để Manager phê duyệt học vượt cấp.'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đang Học': return 'text-amber-600 bg-amber-50';
      case 'Đã Hoàn Thành': return 'text-green-700 bg-green-50';
      case 'Cần Thi Lại': return 'text-red-600 bg-red-50';
      case 'Quá Hạn': return 'text-red-600 bg-red-50';
      case 'Chưa Bắt Đầu': return 'text-slate-500 bg-slate-100';
      default: return 'text-slate-500 bg-slate-100';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'Đang Học': return 'bg-amber-500';
      case 'Đã Hoàn Thành': return 'bg-green-600';
      case 'Cần Thi Lại': return 'bg-red-500';
      case 'Quá Hạn': return 'bg-amber-500';
      default: return 'bg-slate-200';
    }
  };

  const getActionButtonStyle = (action: string) => {
    switch (action) {
      case 'Tiếp Tục': return 'bg-mm-green text-white border-mm-green';
      case 'Ôn Tập': return 'border border-slate-300 bg-white text-slate-700';
      case 'Thi Lại': return 'bg-mm-green text-white border-mm-green';
      case 'Xem Lịch QR': return 'bg-mm-green text-white border-mm-green';
      case 'Xin Duyệt Vượt Cấp': return 'bg-green-800 text-white border-green-800';
      default: return 'bg-mm-green text-white border-mm-green';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="bg-white border-b border-slate-200 pt-2 pb-3 px-4 shadow-sm z-10">
        <Text className="text-xl font-bold text-slate-800 mb-1">Chương Trình Đào Tạo & Khóa Học Của Tôi</Text>
        <Text className="text-xs text-slate-500 leading-5">Học viên: <Text className="font-bold text-slate-700">Minh Tran</Text> - Junior Bakery Associate • Cấp bậc hiện tại: <Text className="font-bold text-slate-700">Level 7</Text></Text>
      </View>

      <ScrollView className="flex-1">
        
        {/* Lộ Trình Học Vượt Cấp Tuần Tự */}
        <View className="p-4">
          <View className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
            <View className="bg-blue-50 px-4 py-3 flex-row items-center border-b border-blue-100">
               <Ionicons name="trending-up" size={18} color="#2563eb" />
               <Text className="text-blue-800 font-bold ml-2 flex-1 leading-5">Lộ Trình Học Vượt Cấp Tuần Tự (Sequential Level Gate)</Text>
            </View>
            <View className="p-4 flex-row flex-wrap">
               <View className="w-1/2 mb-4">
                 <Text className="text-[9px] text-slate-500 uppercase font-semibold mb-1">Tiến độ chương trình Level 7</Text>
                 <Text className="text-lg font-bold text-blue-700">3/13 khóa <Text className="text-sm font-normal text-slate-500">- 23%</Text></Text>
               </View>
               <View className="w-1/2 mb-4">
                 <Text className="text-[9px] text-slate-500 uppercase font-semibold mb-1">Được phép xin học vượt (Level 6)</Text>
                 <Text className="text-lg font-bold text-blue-700">39</Text>
               </View>
               <View className="w-1/2">
                 <Text className="text-[9px] text-slate-500 uppercase font-semibold mb-1">Chờ duyệt / Đã duyệt</Text>
                 <Text className="text-lg font-bold text-amber-600">0 / 0</Text>
               </View>
               <View className="w-1/2">
                 <Text className="text-[9px] text-slate-500 uppercase font-semibold mb-1">Ẩn khỏi danh mục (nhảy cóc ≥ 2 cấp)</Text>
                 <Text className="text-lg font-bold text-red-600">62</Text>
               </View>
            </View>
            <View className="bg-slate-50 px-4 py-3 border-t border-slate-100">
              <Text className="text-[10px] text-slate-500 leading-5">Khóa <Text className="font-bold">Level 7</Text> trở xuống: học ngay. Khóa <Text className="font-bold">Level 6</Text> (vượt đúng 1 cấp): phải gửi đơn và được Quản lý phê duyệt từng khóa. Khóa từ <Text className="font-bold">2 cấp trở lên</Text>: ẩn hoàn toàn — bắt buộc hoàn thành toàn bộ chương trình Level 6 trước mới xuất hiện.</Text>
            </View>
          </View>
        </View>

        {/* Giáo Trình Bắt Buộc */}
        <View className="pb-4">
           <View className="px-4 flex-row items-center mb-3">
             <Ionicons name="bookmarks" size={18} color="#009E49" />
             <Text className="text-base font-bold text-slate-800 ml-2">Giáo Trình Bắt Buộc Của Bạn (3)</Text>
           </View>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
             {curriculums.map((curr, idx) => (
               <View key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm w-[300px] mr-4 overflow-hidden">
                 <View className="p-4">
                   <View className="flex-row justify-between items-start mb-2">
                     <Text className="font-bold text-slate-800 text-sm flex-1 mr-2 leading-5">{curr.title}</Text>
                     <View className={`px-2 py-1 rounded mt-1 ${getStatusColor(curr.status)}`}>
                       <Text className={`text-[10px] font-bold`}>{curr.status}</Text>
                     </View>
                   </View>
                   <Text className="text-[11px] text-slate-500 mb-4 leading-5">{curr.desc}</Text>
                   <View className="flex-row items-center mb-1">
                     <Ionicons name="ellipse" size={6} color="#64748b" />
                     <Text className="text-[10px] font-bold text-slate-600 ml-1">{curr.tags[0]}</Text>
                   </View>
                   <View className="flex-row items-center mb-1">
                     <Ionicons name="time" size={12} color="#ef4444" />
                     <Text className="text-[10px] font-bold text-red-600 ml-1">Hạn chót: {curr.deadline}</Text>
                   </View>
                   
                   <View className="flex-row justify-between items-end mt-4 mb-1">
                     <Text className="text-[10px] text-slate-500">Tiến độ giáo trình:</Text>
                     <Text className="text-[10px] font-bold text-slate-700">{curr.progress}/{curr.total} khóa ({Math.round(curr.progress/curr.total * 100)}%)</Text>
                   </View>
                   <View className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-4">
                     <View className="h-full bg-mm-green" style={{ width: `${(curr.progress/curr.total) * 100}%` }} />
                   </View>
                   
                   <TouchableOpacity 
                     className="border border-slate-300 rounded-lg py-2 flex-row justify-center items-center"
                     onPress={() => setSelectedCurriculum(curr)}
                   >
                     <Ionicons name="map-outline" size={14} color="#334155" />
                     <Text className="text-xs font-bold text-slate-700 ml-1">Xem Lộ Trình</Text>
                   </TouchableOpacity>
                 </View>
               </View>
             ))}
           </ScrollView>
        </View>

        {/* Filters */}
        <View className="border-y border-slate-200 bg-white py-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {filters.map((f, i) => (
              <TouchableOpacity 
                key={i} 
                onPress={() => setActiveFilter(f.label)}
                className={`flex-row items-center px-3 py-1.5 rounded-full mr-2 border ${activeFilter === f.label ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-200'}`}
              >
                <Text className={`text-xs font-semibold ${activeFilter === f.label ? 'text-white' : 'text-slate-600'}`}>{f.label}</Text>
                <View className={`ml-2 px-1.5 py-0.5 rounded-full ${activeFilter === f.label ? 'bg-blue-500' : 'bg-slate-200'}`}>
                  <Text className={`text-[9px] font-bold ${activeFilter === f.label ? 'text-white' : 'text-slate-500'}`}>{f.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Course List */}
        <View className="p-4 pb-12">
           {coursesList.map((course, idx) => (
             <View key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
                {course.requiresApproval && (
                  <View className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex-row">
                    <Ionicons name="information-circle" size={16} color="#2563eb" className="mr-2 mt-0.5" />
                    <Text className="text-[10px] text-blue-800 flex-1 leading-4">{course.approvalMsg}</Text>
                  </View>
                )}
                <View className="p-4">
                   <View className="flex-row mb-3">
                     <Image source={{ uri: course.image }} className="w-20 h-16 rounded-lg bg-slate-200 mr-3" />
                     <View className="flex-1">
                       <Text className="font-bold text-slate-800 text-sm mb-1 leading-5" numberOfLines={2}>{course.title}</Text>
                       <Text className="text-[10px] text-slate-500">{course.code} • {course.category} • {course.duration}</Text>
                     </View>
                   </View>
                   
                   {course.curriculum && (
                     <View className="flex-row items-center bg-slate-50 px-2 py-1.5 rounded-lg mb-3 self-start border border-slate-100">
                       <Ionicons name="bookmarks" size={10} color="#3b82f6" />
                       <Text className="text-[9px] text-slate-600 font-medium ml-1" numberOfLines={1}>{course.curriculum}</Text>
                     </View>
                   )}

                   <View className="flex-row mb-4 flex-wrap">
                      <View className={`flex-row items-center px-2 py-1 rounded mr-2 mb-2 ${course.access === 'Đúng cấp' ? 'bg-green-50' : 'bg-slate-50 border border-slate-200'}`}>
                        <Ionicons name={course.access === 'Đúng cấp' ? 'lock-open' : 'lock-closed'} size={10} color={course.access === 'Đúng cấp' ? '#15803d' : '#64748b'} />
                        <Text className={`text-[10px] font-bold ml-1 ${course.access === 'Đúng cấp' ? 'text-green-700' : 'text-slate-600'}`}>{course.access}</Text>
                      </View>
                      <View className="flex-row items-center px-2 py-1 rounded bg-blue-50 mb-2">
                        <Ionicons name={course.format === 'E-Learning' ? 'globe' : 'people'} size={10} color="#2563eb" />
                        <Text className="text-[10px] font-bold text-blue-700 ml-1">{course.format}</Text>
                      </View>
                   </View>

                   <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                      <View className="flex-1 pr-4">
                         <View className="flex-row items-center justify-between mb-1">
                           <View className={`px-2 py-0.5 rounded ${getStatusColor(course.status)}`}>
                             <Text className="text-[10px] font-bold">{course.status}</Text>
                           </View>
                           <Text className="text-[10px] font-bold text-slate-700">{course.progress}%</Text>
                         </View>
                         <View className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                           <View className={`h-full ${getProgressColor(course.status)}`} style={{ width: `${course.progress}%` }} />
                         </View>
                         <Text className="text-[9px] text-slate-400 mt-1" numberOfLines={1}>{course.type}</Text>
                      </View>
                      
                      <TouchableOpacity 
                        className={`px-3 py-2 border rounded-lg flex-row items-center ${getActionButtonStyle(course.action)}`}
                        onPress={() => {
                          if (course.action === 'Tiếp Tục' || course.action === 'Ôn Tập') {
                            navigation.navigate('DashboardTab', { screen: 'CourseOverview', params: { course } });
                          } else if (course.action === 'Xem Lịch QR') {
                            navigation.navigate('DashboardTab', { screen: 'ClassroomSchedule' });
                          }
                        }}
                      >
                        <Ionicons name={course.actionIcon as any} size={14} color={course.action === 'Ôn Tập' ? '#334155' : 'white'} />
                        <Text className={`text-[10px] font-bold ml-1 ${course.action === 'Ôn Tập' ? 'text-slate-700' : 'text-white'}`}>{course.action}</Text>
                      </TouchableOpacity>
                   </View>
                </View>
             </View>
           ))}
        </View>
      </ScrollView>

      {/* Curriculum Details Modal */}
      <CurriculumModal visible={!!selectedCurriculum} curriculum={selectedCurriculum} onClose={() => setSelectedCurriculum(null)} />
    </SafeAreaView>
  );
}

// ----------------------------------------------------------------------
// Curriculum Details Modal Component
// ----------------------------------------------------------------------
function CurriculumModal({ visible, curriculum, onClose }: { visible: boolean, curriculum: any, onClose: () => void }) {
  if (!curriculum) return null;

  const [expandedCourses, setExpandedCourses] = useState<{[key: number]: boolean}>({ 0: true, 1: true });

  const toggleCourse = (index: number) => {
    setExpandedCourses(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const courses = [
    {
      title: 'Food Safety & Hygiene Standards (HACCP)', code: 'FSH-001', category: 'Food Safety & Hygiene', status: '47% Đang học', btn: 'Học tiếp',
      modules: [
        {
          title: 'Mô-đun 1: Module 1: Principles & Regulatory Framework',
          lessons: [
            { title: '1.1 Industry Standards & Legal Foundations', req: 'Bắt buộc', duration: '15 mins' },
            { title: '1.2 Standard Operating Guidelines & Checklists', req: 'Bắt buộc', duration: '20 mins' }
          ]
        },
        {
          title: 'Mô-đun 2: Module 2: Practical Execution & Store Floor Application',
          lessons: [
            { title: '2.1 Step-by-Step Practical Workflow Simulation', req: 'Bắt buộc', duration: '25 mins' },
            { title: '2.2 Incident Response & Corrective Actions', req: 'Bắt buộc', duration: '15 mins' }
          ]
        }
      ]
    },
    {
      title: 'Seafood Quality Inspection & Cross-Contamination Control', code: 'FSH-003', category: 'Food Safety & Hygiene', status: 'Chưa bắt đầu', btn: 'Bắt đầu học',
      modules: [
        {
          title: 'Mô-đun 1: Module 1: Principles & Regulatory Framework',
          lessons: [
            { title: '1.1 Industry Standards & Legal Foundations', req: 'Bắt buộc', duration: '15 mins' },
            { title: '1.2 Standard Operating Guidelines & Checklists', req: 'Bắt buộc', duration: '20 mins' }
          ]
        }
      ]
    }
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl h-[85%]">
          {/* Header */}
          <View className="px-5 py-4 border-b border-slate-200 flex-row justify-between items-start">
             <View className="flex-1 mr-4">
               <Text className="font-bold text-lg text-slate-800 mb-1">{curriculum.title}</Text>
               <Text className="text-xs text-slate-500 leading-5">{curriculum.desc}</Text>
             </View>
             <TouchableOpacity onPress={onClose} className="p-2 bg-slate-100 rounded-full">
               <Ionicons name="close" size={20} color="#64748b" />
             </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 p-4 pb-12">
             {courses.map((c, i) => (
               <View key={i} className="mb-6 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Course Header */}
                  <TouchableOpacity 
                    className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex-row justify-between items-center"
                    onPress={() => toggleCourse(i)}
                  >
                     <View className="flex-1 pr-4">
                        <Text className="font-bold text-slate-800 text-sm mb-1">{c.title}</Text>
                        <View className="flex-row items-center flex-wrap">
                           <Text className="text-[10px] text-slate-400 font-bold mr-2">{c.code}</Text>
                           <View className="flex-row items-center mr-2">
                             <Ionicons name="ellipse" size={4} color="#64748b" />
                             <Text className="text-[10px] text-slate-500 ml-1">{c.category}</Text>
                           </View>
                           {c.status.includes('Đang học') && (
                             <View className="flex-row items-center mt-1 sm:mt-0">
                               <Ionicons name="ellipse" size={4} color="#d97706" />
                               <Text className="text-[10px] text-amber-600 font-bold ml-1">{c.status}</Text>
                             </View>
                           )}
                           {c.status.includes('Chưa bắt đầu') && (
                             <View className="flex-row items-center mt-1 sm:mt-0">
                               <Ionicons name="ellipse" size={4} color="#64748b" />
                               <Text className="text-[10px] text-slate-500 font-bold ml-1">{c.status}</Text>
                             </View>
                           )}
                        </View>
                     </View>
                     <View className="flex-row items-center">
                       <TouchableOpacity className={`px-3 py-2 rounded-lg flex-row items-center shadow-sm ${c.btn === 'Học tiếp' ? 'bg-green-700' : 'bg-mm-green'} mr-2`}>
                          <Ionicons name="play" size={14} color="white" />
                          <Text className="text-white text-[10px] font-bold ml-1">{c.btn}</Text>
                       </TouchableOpacity>
                       <Ionicons name={expandedCourses[i] ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
                     </View>
                  </TouchableOpacity>
                  
                  {/* Modules */}
                  {expandedCourses[i] && (
                    <View className="p-3">
                       {c.modules.map((m, j) => (
                       <View key={j} className="mb-4 last:mb-0">
                         <View className="flex-row items-center mb-2 bg-green-50 px-2 py-1 rounded">
                           <Ionicons name="folder-open-outline" size={14} color="#15803d" />
                           <Text className="font-bold text-green-800 text-xs ml-2">{m.title}</Text>
                         </View>
                         {m.lessons.map((l, k) => (
                           <View key={k} className="flex-row items-center justify-between pl-4 py-1.5 border-l-2 border-slate-100 ml-3 mb-1">
                             <View className="flex-row items-center flex-1 pr-4">
                               <Ionicons name="play-circle-outline" size={14} color="#64748b" />
                               <Text className="text-xs text-slate-600 ml-2 leading-5" numberOfLines={2}>{l.title}</Text>
                               <View className="bg-amber-100 px-1.5 py-0.5 rounded ml-2">
                                 <Text className="text-[8px] font-bold text-amber-700">{l.req}</Text>
                               </View>
                             </View>
                             <Text className="text-[10px] text-slate-400 font-medium">{l.duration}</Text>
                           </View>
                         ))}
                       </View>
                       ))}
                    </View>
                  )}
               </View>
             ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
