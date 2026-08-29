import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal as RNModal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Badge, Button, ProgressBar } from '../components/ui';
import { useCourseStore } from '../store/CourseStore';
import { levelDefinition, nextLevelUp, normalizeLevel } from '../data/levelSystem';
import { getCourseImage } from '../data/courseImages';

export default function RoadmapScreen() {
  const navigation = useNavigation<any>();
  const { currentUser, courses: allCourses, myCourses } = useCourseStore();
  const user = currentUser;
  const userLevel = normalizeLevel(user?.level || 7);
  const nextLvl = nextLevelUp(userLevel);

  const [activeTab, setActiveTab] = useState<'HIEN_TAI' | 'KE_CAN' | 'DE_XUAT' | 'GOI_Y'>('HIEN_TAI');

  const tabs = [
    { id: 'HIEN_TAI', label: `Định Biên Level ${userLevel}`, icon: 'map' },
    { id: 'KE_CAN', label: `Kế Cận Level ${nextLvl}`, icon: 'git-network' },
    { id: 'DE_XUAT', label: 'Chuyên Đề Mở Rộng', icon: 'options' },
    { id: 'GOI_Y', label: 'Gợi Ý AI', icon: 'sparkles' },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header Bar */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>
            Trục Lộ Trình &amp; Khung Năng Lực
          </Text>
          <Text style={{ fontSize: 11, color: '#64748B' }}>
            Chuẩn hóa chức danh theo cấp bậc và kế hoạch phát triển cá nhân
          </Text>
        </View>
      </View>

      {/* Horizontal Tabs Bar */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderBottomWidth: 2,
                  borderColor: isActive ? '#009E49' : 'transparent',
                }}
              >
                <Ionicons name={tab.icon as any} size={15} color={isActive ? '#009E49' : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#009E49' : '#64748B' }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content Area */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'HIEN_TAI' && <CurrentRoadmap userLevel={userLevel} />}
        {activeTab === 'KE_CAN' && <SuccessionRoadmap nextLvl={nextLvl} />}
        {activeTab === 'DE_XUAT' && <SuggestedRoadmap />}
        {activeTab === 'GOI_Y' && <RecommendedCourses />}
      </ScrollView>
    </SafeAreaView>
  );
}

// 1. LỘ TRÌNH ĐỊNH BIÊN HIỆN TẠI
function CurrentRoadmap({ userLevel }: { userLevel: number }) {
  const navigation = useNavigation<any>();
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);

  const milestones = [
    { title: 'XUẤT PHÁT', desc: 'Bắt đầu lộ trình chuẩn hóa chuyên môn', status: 'start', image: null },
    { title: 'CHẶNG 1', desc: 'Food Safety & Hygiene Standards (HACCP)', status: 'in_progress', image: 'https://images.unsplash.com/photo-1574629810360-7efbb1925845?w=150&h=150&fit=crop', code: 'FSH-001', progress: 47 },
    { title: 'CHẶNG 2', desc: 'Fresh Meat & Cold Chain Storage', status: 'pending', image: 'https://images.unsplash.com/photo-1607006411066-574d6c701d81?w=150&h=150&fit=crop', code: 'FSH-002', progress: 0 },
    { title: 'CHẶNG 3', desc: 'Seafood Quality Inspection & Sanitation', status: 'pending', image: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=150&h=150&fit=crop', code: 'FSH-003', progress: 0 },
    { title: 'CHẶNG 4', desc: 'Bakery & Confectionery Sanitation Protocols', status: 'pending', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&h=150&fit=crop', code: 'FSH-004', progress: 0 },
    { title: 'VỀ ĐÍCH', desc: 'Đạt chuẩn 100% Năng lực Level 7', status: 'finish', image: null },
  ];

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B' }}>Định Biên Level {userLevel}</Text>
        <Badge tone="amber">1/5 Hoàn Thành</Badge>
      </View>

      <View style={{ gap: 12 }}>
        {milestones.map((ms, idx) => {
          const isStart = ms.status === 'start';
          const isFinish = ms.status === 'finish';
          return (
            <TouchableOpacity
              key={idx}
              style={{ flexDirection: 'row', alignItems: 'center' }}
              onPress={() => {
                if (!isStart && !isFinish) {
                  setSelectedMilestone(ms);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={{ alignItems: 'center', marginRight: 12 }}>
                {isStart ? (
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="flag" size={18} color="#FFFFFF" />
                  </View>
                ) : isFinish ? (
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="trophy" size={18} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1' }}>
                    {ms.image && <Image source={{ uri: ms.image }} style={{ width: '100%', height: '100%' }} />}
                  </View>
                )}
              </View>

              <View style={{ flex: 1, paddingVertical: 6, borderBottomWidth: idx < milestones.length - 1 ? 1 : 0, borderColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: isStart ? '#2563EB' : isFinish ? '#D97706' : '#64748B' }}>
                  {ms.title}
                </Text>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>
                  {ms.desc}
                </Text>
                {ms.progress !== undefined && (
                  <View style={{ marginTop: 4 }}>
                    <ProgressBar value={ms.progress} size="sm" tone={ms.progress > 0 ? 'amber' : 'sage'} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* MILESTONE MODAL */}
      {selectedMilestone && (
        <RNModal visible={Boolean(selectedMilestone)} transparent animationType="slide" onRequestClose={() => setSelectedMilestone(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 6 }}>{selectedMilestone.desc}</Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>
                Khóa học chuẩn hóa chuyên môn thuộc khung Level {userLevel}.
              </Text>
              <Button
                variant="primary"
                onPress={() => {
                  const courseId = selectedMilestone.code ? `CRS-${selectedMilestone.code}` : 'CRS-FSH-001';
                  setSelectedMilestone(null);
                  navigation.navigate('CourseOverview', { courseId });
                }}
              >
                Vào Học Khóa Này
              </Button>
            </View>
          </View>
        </RNModal>
      )}
    </View>
  );
}

// 2. LỘ TRÌNH KẾ CẬN (LEVEL TIẾP THEO)
function SuccessionRoadmap({ nextLvl }: { nextLvl: any }) {
  return (
    <View>
      <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="lock-closed" size={16} color="#D97706" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 11.5, color: '#92400E', fontWeight: '600', flex: 1 }}>
          Chương trình kế cận Level {nextLvl}. Bạn cần gửi đơn xin phê duyệt để được học trước các môn này.
        </Text>
      </View>

      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 12 }}>
          Các Môn Học Quy Hoạch Kế Cận Level {nextLvl}:
        </Text>

        {[
          { code: 'LEAD-01', title: 'Kỹ Năng Quản Lý Đội Ngũ Tuyến Đầu', duration: '4h' },
          { code: 'OPS-02', title: 'Tối Ưu Hao Hụt & Kiểm Soát Tồn Kho', duration: '3h' },
          { code: 'CS-03', title: 'Xử Lý Khiếu Nại Phức Tạp & Trải Nghiệm Khách Hàng', duration: '3h' },
        ].map((c, i) => (
          <View key={i} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Ionicons name="lock-closed" size={14} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>{c.title}</Text>
              <Text style={{ fontSize: 10.5, color: '#64748B' }}>{c.code} &middot; {c.duration}</Text>
            </View>
            <Badge tone="amber" size="sm">Cần Xin Duyệt</Badge>
          </View>
        ))}
      </View>
    </View>
  );
}

// 3. CHUYÊN ĐỀ TỰ CHỌN
function SuggestedRoadmap() {
  const tracks = [
    { title: 'Chuỗi Cung Ứng & Logistics Siêu Thị', desc: 'Vận hành kho lạnh và tối ưu vận tải giao nhận.', icon: 'bus', count: 3 },
    { title: 'Bán Lẻ Số & Thương Mại Điện Tử MM', desc: 'Quy trình xử lý đơn hàng đa kênh Omnichannel.', icon: 'globe', count: 2 },
    { title: 'Văn Hóa Phục Vụ Tận Tâm (CS Mindset)', desc: 'Nghệ thuật thấu hiểu và xử lý khiếu nại khách hàng.', icon: 'heart', count: 2 },
  ];

  return (
    <View style={{ gap: 10 }}>
      {tracks.map((t, idx) => (
        <View key={idx} style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Ionicons name={t.icon as any} size={18} color="#009E49" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>{t.title}</Text>
              <Text style={{ fontSize: 11, color: '#64748B' }}>{t.desc}</Text>
            </View>
          </View>
          <Badge tone="slate" size="sm">{t.count} Khóa Tự Chọn</Badge>
        </View>
      ))}
    </View>
  );
}

// 4. KHÓA HỌC GỢI Ý AI
function RecommendedCourses() {
  const navigation = useNavigation<any>();
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
      <Ionicons name="sparkles" size={36} color="#7C3AED" style={{ marginBottom: 8 }} />
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>
        Trợ Lý AI Gợi Ý Khóa Học Cá Nhân Hóa
      </Text>
      <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 14 }}>
        Hệ thống AI tự động phân tích chức danh của bạn để đề xuất các bài giảng nâng cao chuyên môn phù hợp nhất.
      </Text>
      <Button variant="primary" icon="sparkles" onPress={() => navigation.navigate('AiLearningHub')}>
        Mở AI Learning Hub
      </Button>
    </View>
  );
}
