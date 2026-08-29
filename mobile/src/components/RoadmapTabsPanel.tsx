import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Badge, ProgressBar, Button } from './ui';
import { useCourseStore } from '../store/CourseStore';
import { levelDefinition, nextLevelUp, normalizeLevel } from '../data/levelSystem';
import { getCourseImage } from '../data/courseImages';

export default function RoadmapTabsPanel({ user: propUser }: { user?: any }) {
  const navigation = useNavigation<any>();
  const { currentUser, courses: allCourses, myCourses } = useCourseStore();
  const user = propUser || currentUser;
  const userLevel = normalizeLevel(user?.level || 7);
  const nextLvl = nextLevelUp(userLevel);

  const [activeTab, setActiveTab] = useState<'CURRENT' | 'SUCCESSION' | 'ELECTIVE' | 'AI'>('CURRENT');

  const enrolled = myCourses(allCourses, user);
  const currentLevelCourses = enrolled.filter((c: any) => c.level === userLevel || !c.level).slice(0, 3);
  const nextLevelCourses = allCourses.filter((c: any) => c.level === nextLvl).slice(0, 3);

  const electiveTracks = [
    { title: 'Chuỗi Cung Ứng & Logistics Siêu Thị', desc: 'Vận hành kho lạnh và tối ưu vận tải giao nhận.', icon: 'bus', count: 3 },
    { title: 'Bán Lẻ Số & Thương Mại Điện Tử MM', desc: 'Quy trình xử lý đơn hàng đa kênh Omnichannel.', icon: 'globe', count: 2 },
    { title: 'Văn Hóa Phục Vụ Tận Tâm (CS Mindset)', desc: 'Nghệ thuật thấu hiểu và xử lý khiếu nại khách hàng.', icon: 'heart', count: 2 },
  ];

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
      {/* 4 Tabs Header */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
        {[
          { id: 'CURRENT', label: `Level ${userLevel} Hiện Tại`, icon: 'map' },
          { id: 'SUCCESSION', label: `Kế Cận Level ${nextLvl}`, icon: 'trending-up' },
          { id: 'ELECTIVE', label: 'Chuyên Đề Tự Chọn', icon: 'options' },
          { id: 'AI', label: 'AI Gợi Ý', icon: 'sparkles' },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setActiveTab(t.id as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isActive ? '#009E49' : '#F1F5F9',
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
              }}
            >
              <Ionicons name={t.icon as any} size={12} color={isActive ? '#FFFFFF' : '#64748B'} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#FFFFFF' : '#64748B' }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* TAB 1: CURRENT LEVEL ROADMAP */}
      {activeTab === 'CURRENT' && (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>
              Khung Định Biên Vị Trí: {user.position}
            </Text>
            <Badge tone="sage">Đang Áp Dụng</Badge>
          </View>
          <Text style={{ fontSize: 11.5, color: '#64748B', marginBottom: 12 }}>
            Hoàn thành các học phần bắt buộc dưới đây để đáp ứng 100% chuẩn năng lực chức danh.
          </Text>

          {currentLevelCourses.map((c: any) => (
            <TouchableOpacity
              key={c.id}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 }}
              onPress={() => navigation.navigate('CourseOverview', { course: c, courseId: c.id })}
            >
              <Image source={{ uri: getCourseImage(c) }} style={{ width: 44, height: 44, borderRadius: 6, marginRight: 10, backgroundColor: '#CBD5E1' }} />
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 2 }} numberOfLines={1}>
                  {c.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600' }}>{c.code}</Text>
                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>&bull;</Text>
                  <Text style={{ fontSize: 10, color: '#009E49', fontWeight: '700' }}>{c.enrollment?.progress || 0}%</Text>
                </View>
                <View style={{ marginTop: 4 }}>
                  <ProgressBar value={c.enrollment?.progress || 0} size="sm" />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* TAB 2: SUCCESSION LEVEL ROADMAP */}
      {activeTab === 'SUCCESSION' && (
        <View>
          <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="lock-closed" size={14} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '600', flex: 1 }}>
              Khóa học vượt cấp cần gửi đơn xin phê duyệt từ Quản lý trực tiếp trước khi mở.
            </Text>
          </View>

          {nextLevelCourses.map((c: any) => (
            <TouchableOpacity
              key={c.id}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 }}
              onPress={() => navigation.navigate('CourseOverview', { course: c, courseId: c.id })}
            >
              <Image source={{ uri: getCourseImage(c) }} style={{ width: 44, height: 44, borderRadius: 6, marginRight: 10, opacity: 0.8, backgroundColor: '#CBD5E1' }} />
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 2 }} numberOfLines={1}>
                  {c.title}
                </Text>
                <Badge tone="amber" size="sm">Cần Xin Duyệt Level {nextLvl}</Badge>
              </View>
              <Ionicons name="key-outline" size={16} color="#D97706" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* TAB 3: ELECTIVE TRACKS */}
      {activeTab === 'ELECTIVE' && (
        <View>
          {electiveTracks.map((track, i) => (
            <View key={i} style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Ionicons name={track.icon as any} size={18} color="#009E49" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 2 }}>{track.title}</Text>
                <Text style={{ fontSize: 10.5, color: '#64748B' }}>{track.desc}</Text>
              </View>
              <Badge tone="slate" size="sm">{track.count} Khóa</Badge>
            </View>
          ))}
        </View>
      )}

      {/* TAB 4: AI RECOMMENDATIONS */}
      {activeTab === 'AI' && (
        <View>
          <View style={{ backgroundColor: '#EDE9FE', padding: 8, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="sparkles" size={14} color="#7C3AED" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 11, color: '#6D28D9', fontWeight: '600', flex: 1 }}>
              Gợi ý dựa trên chức danh {user.position} và tiêu chuẩn vận hành an toàn thực phẩm.
            </Text>
          </View>
          <Button
            variant="outline"
            size="sm"
            icon="sparkles"
            onPress={() => navigation.navigate('AiLearningHub')}
          >
            Mở Trợ Lý AI Hub & Gợi Ý Khóa Học
          </Button>
        </View>
      )}
    </View>
  );
}
