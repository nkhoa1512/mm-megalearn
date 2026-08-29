import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Badge, Button } from '../components/ui';
import { useCourseStore } from '../store/CourseStore';
import { collectLearnerCalendarEvents } from '../utils/calendarEvents';
import { deriveCertificates } from '../data/mockData';

export default function LearnerCalendarScreen() {
  const navigation = useNavigation<any>();
  const {
    currentUser,
    courses: allCourses,
    classrooms,
    myEnrollments,
  } = useCourseStore();

  const user = currentUser;
  const certificates = useMemo(() => deriveCertificates(allCourses, user), [allCourses, user]);

  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const events = useMemo(() => {
    return collectLearnerCalendarEvents({
      courses: allCourses,
      classrooms,
      myEnrollments,
      certificates,
    } as any) as any[];
  }, [allCourses, classrooms, myEnrollments, certificates]);

  const filteredEvents = useMemo(() => {
    if (categoryFilter === 'ALL') return events;
    return events.filter((e: any) => e.category === categoryFilter);
  }, [events, categoryFilter]);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'CLASSROOM_ILT':
        return <Badge tone="sage" size="sm" icon="easel">Lớp Thực Hành</Badge>;
      case 'VIRTUAL_CLASS':
        return <Badge tone="purple" size="sm" icon="videocam">Teams Webinar</Badge>;
      case 'CERTIFICATE':
        return <Badge tone="rust" size="sm" icon="medal">Tái Cấp Chứng Chỉ</Badge>;
      case 'ELEARNING':
      default:
        return <Badge tone="blue" size="sm" icon="book">Hạn Chót E-Learning</Badge>;
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>
            Lịch Đào Tạo &amp; Thời Hạn Khóa Học
          </Text>
          <Text style={{ fontSize: 11, color: '#64748B' }}>
            Tổng hợp lịch học, workshop thực hành và hạn chứng chỉ
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14 }}>
          {[
            { id: 'ALL', label: 'Tất Cả' },
            { id: 'ELEARNING', label: 'Khóa E-Learning' },
            { id: 'CLASSROOM_ILT', label: 'Thực Hành Xưởng' },
            { id: 'CERTIFICATE', label: 'Hạn Tái Cấp' },
          ].map((cat) => {
            const isActive = categoryFilter === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategoryFilter(cat.id)}
                style={{
                  backgroundColor: isActive ? '#009E49' : '#FFFFFF',
                  borderColor: isActive ? '#009E49' : '#E2E8F0',
                  borderWidth: 1,
                  borderRadius: 20,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: isActive ? '#FFFFFF' : '#475569' }}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Events List */}
        <View style={{ gap: 12 }}>
          {filteredEvents.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Ionicons name="calendar-outline" size={36} color="#94A3B8" style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>Không có sự kiện trong danh mục này</Text>
            </View>
          ) : (
            filteredEvents.map((ev: any) => (
              <View
                key={ev.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.03,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  {getCategoryBadge(ev.category)}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="time-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                      {ev.date} &middot; {ev.time}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#1E293B', marginBottom: 4 }}>
                  {ev.title}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 10 }}>
                  {ev.subtitle || ev.venue}
                </Text>

                {ev.actionType === 'START_COURSE' && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon="book"
                    onPress={() => navigation.navigate('CourseOverview', { courseId: ev.courseId })}
                  >
                    Vào Học Khóa Này
                  </Button>
                )}

                {ev.actionType === 'SCAN_QR' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon="scan"
                    onPress={() => navigation.navigate('ClassroomsTab')}
                  >
                    Xem Lớp &amp; Quét QR
                  </Button>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
