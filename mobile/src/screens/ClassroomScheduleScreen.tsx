import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  ProgressBar,
  QrScannerModal,
  PostTrainingSurveyModal,
} from '../components/ui';
import { useCourseStore } from '../store/CourseStore';

export default function ClassroomScheduleScreen() {
  const { classrooms, checkInClassroom, enrollClassroom } = useCourseStore();
  const [filter, setFilter] = useState('ALL');

  // Scanner modal state
  const [scanningSession, setScanningSession] = useState<any>(null);
  // CSAT modal state
  const [surveySession, setSurveySession] = useState<any>(null);

  const filters = [
    { id: 'ALL', label: 'Tất Cả Buổi Đào Tạo' },
    { id: 'MY_SESSIONS', label: 'Lớp Của Tôi' },
    { id: 'UPCOMING', label: 'Lớp Sắp Diễn Ra' },
    { id: 'STORE', label: 'Thực Hành Xưởng Siêu Thị' },
    { id: 'WEBINAR', label: 'Hội Thảo Trực Tuyến' },
  ];

  const filteredSessions = (classrooms || []).filter((s: any) => {
    if (filter === 'UPCOMING') return s.status === 'UPCOMING' || s.status === 'OPEN';
    if (filter === 'MY_SESSIONS') return s.isEnrolled;
    if (filter === 'STORE') return s.modality === 'OFFLINE_STORE';
    if (filter === 'WEBINAR') return s.modality === 'ONLINE_WEBINAR';
    return true;
  });

  const handleScanSuccess = () => {
    if (scanningSession) {
      checkInClassroom(scanningSession.id);
      const doneSession = scanningSession;
      setScanningSession(null);
      Alert.alert('Điểm Danh Thành Công!', `Bạn đã điểm danh thành công buổi học "${doneSession.title}".`);
      // Open CSAT evaluation
      setTimeout(() => {
        setSurveySession(doneSession);
      }, 500);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B' }}>
          Lớp Đào Tạo Trực Tiếp &amp; Quét QR
        </Text>
        <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
          Huấn luyện thực hành tại xưởng siêu thị &amp; Webinar trực tuyến
        </Text>
      </View>

      {/* Top Action Bar: Open Scanner */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
        <Button
          variant="outline"
          icon="scan"
          onPress={() => setScanningSession(classrooms[0] || { id: 'WS-01', title: 'Thực Hành Vệ Sinh Quầy Bánh', trainerName: 'Nguyen Van Hung' })}
        >
          Mở Camera Quét QR Giảng Viên Điểm Danh
        </Button>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Filters */}
        <View style={{ backgroundColor: '#FFFFFF', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {filters.map((f) => {
              const isActive = filter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  style={{
                    backgroundColor: isActive ? '#009E49' : '#F1F5F9',
                    borderColor: isActive ? '#009E49' : '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 20,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: isActive ? '#FFFFFF' : '#475569' }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Sessions List */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {filteredSessions.map((session: any) => {
            const isCheckedIn = session.attendanceStatus === 'CHECKED_IN';
            const isEnrolled = session.isEnrolled;
            const isFull = (session.enrolledCount || 0) >= (session.maxCapacity || 25);

            return (
              <View
                key={session.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isCheckedIn ? '#A7F3D0' : '#E2E8F0',
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                {/* Header Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Badge tone={session.modality === 'OFFLINE_STORE' ? 'amber' : 'blue'} size="sm">
                      {session.modality === 'OFFLINE_STORE' ? 'Thực Hành Xưởng' : 'Teams Webinar'}
                    </Badge>
                    <Text style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: '700' }}>{session.code || session.id}</Text>
                  </View>

                  {isCheckedIn ? (
                    <Badge tone="sage" size="sm" icon="checkmark-circle">Đã Điểm Danh</Badge>
                  ) : isEnrolled ? (
                    <Badge tone="amber" size="sm" icon="time">Chờ Quét QR</Badge>
                  ) : (
                    <Badge tone="slate" size="sm">Mở Đăng Ký</Badge>
                  )}
                </View>

                {/* Title & Description */}
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 4, lineHeight: 20 }}>
                  {session.title}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', lineHeight: 16, marginBottom: 12 }}>
                  {session.description || 'Lớp huấn luyện thực tế tuân thủ tiêu chuẩn an toàn MMVN.'}
                </Text>

                {/* Session Meta */}
                <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="calendar-outline" size={13} color="#2563EB" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11.5, color: '#334155', fontWeight: '600' }}>
                      {session.date || '2026-08-28'} &middot; {session.time || '08:30 - 11:30'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="location-outline" size={13} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11.5, color: '#334155' }} numberOfLines={1}>
                      {session.venue || 'Xưởng Thực Hành MM An Phú'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="person-outline" size={13} color="#009E49" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11.5, color: '#334155' }} numberOfLines={1}>
                      GV: {session.trainerName || 'Nguyen Van Hung (Master Trainer)'}
                    </Text>
                  </View>
                </View>

                {/* Capacity Progress */}
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                      Sĩ số: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{session.enrolledCount || 18}/{session.maxCapacity || 25}</Text> học viên
                    </Text>
                    <Text style={{ fontSize: 10.5, color: '#009E49', fontWeight: '700' }}>+150 XP</Text>
                  </View>
                  <ProgressBar value={((session.enrolledCount || 18) / (session.maxCapacity || 25)) * 100} size="sm" />
                </View>

                {/* Action Buttons */}
                {isCheckedIn ? (
                  <Button
                    variant="outline"
                    icon="star"
                    size="sm"
                    onPress={() => setSurveySession(session)}
                  >
                    Đánh Giá Khảo Sát Lớp Học (CSAT)
                  </Button>
                ) : isEnrolled ? (
                  <Button
                    variant="primary"
                    icon="scan"
                    size="sm"
                    onPress={() => setScanningSession(session)}
                  >
                    Quét QR Giảng Viên Điểm Danh
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    icon="add"
                    size="sm"
                    disabled={isFull}
                    onPress={() => {
                      enrollClassroom(session.id);
                      Alert.alert('Thành Công', `Bạn đã đăng ký tham gia lớp "${session.title}".`);
                    }}
                  >
                    {isFull ? 'Lớp Đã Đầy' : 'Đăng Ký Tham Gia Ngay'}
                  </Button>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* QR SCANNER MODAL */}
      <QrScannerModal
        visible={Boolean(scanningSession)}
        session={scanningSession}
        onClose={() => setScanningSession(null)}
        onSuccess={handleScanSuccess}
      />

      {/* CSAT SURVEY MODAL */}
      <PostTrainingSurveyModal
        visible={Boolean(surveySession)}
        course={surveySession}
        type="CLASSROOM_CSAT"
        onClose={() => setSurveySession(null)}
        onSubmit={(rating) => {
          Alert.alert('Cảm Ơn!', `Bạn đã gửi đánh giá CSAT ${rating}/5 sao cho lớp học này.`);
        }}
      />
    </SafeAreaView>
  );
}
