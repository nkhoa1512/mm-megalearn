import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Badge } from '../components/ui';
import { useCourseStore } from '../store/CourseStore';
import { getUserLearningHistory, totalLearningHours } from '../data/mockData';

export default function LearningHistoryScreen() {
  const navigation = useNavigation<any>();
  const { currentUser, courses: allCourses, myEnrollments } = useCourseStore();
  const user = currentUser;

  const historyLogs = getUserLearningHistory(user);
  const learningHours = totalLearningHours(allCourses, user) || 12.5;

  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = historyLogs.filter((log: any) => {
    const matchType = selectedType === 'ALL' || log.type === selectedType;
    const matchSearch =
      !searchQuery ||
      log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.moduleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.auditCode && log.auditCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchType && matchSearch;
  });

  const totalAssessments = historyLogs.filter((l: any) => l.type === 'ASSESSMENT').length;
  const assessmentScores = historyLogs
    .filter((l: any) => l.type === 'ASSESSMENT' && l.score != null)
    .map((l: any) => l.score);
  const avgScore = assessmentScores.length > 0
    ? Math.round(assessmentScores.reduce((a: number, b: number) => a + b, 0) / assessmentScores.length)
    : 92;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'ASSESSMENT':
        return <Badge tone="amber" icon="trophy" size="sm">Bài Đánh Giá</Badge>;
      case 'CLASSROOM_CHECKIN':
        return <Badge tone="blue" icon="qr-code" size="sm">Quét QR Lớp Học</Badge>;
      case 'LESSON':
      default:
        return <Badge tone="rail" icon="book" size="sm">Bài Học &amp; SOP</Badge>;
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
            Nhật Ký &amp; Kiểm Toán Học Tập
          </Text>
          <Text style={{ fontSize: 11, color: '#64748B' }}>
            Hồ sơ kiểm toán bất biến &middot; Kiểm định bởi Ban HRD &amp; Internal Audit
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 1. STAT TILES */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 }}>
          <View style={{ width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 10 }}>
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>Tổng Sự Kiện Đã Lưu</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginTop: 2 }}>{historyLogs.length} Bản ghi</Text>
          </View>

          <View style={{ width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 10 }}>
            <Text style={{ fontSize: 11, color: '#047857', fontWeight: '700' }}>Điểm Đánh Giá TB</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#009E49', marginTop: 2 }}>{avgScore}%</Text>
          </View>

          <View style={{ width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 12 }}>
            <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '700' }}>Kỳ Sát Hạch Đã Thi</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#D97706', marginTop: 2 }}>{totalAssessments} Lượt</Text>
          </View>

          <View style={{ width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 12 }}>
            <Text style={{ fontSize: 11, color: '#1E40AF', fontWeight: '700' }}>Tổng Giờ Tích Lũy</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#2563EB', marginTop: 2 }}>{learningHours.toFixed(1)}h</Text>
          </View>
        </View>

        {/* 2. SEARCH & FILTER */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
          {/* Search Box */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, height: 36, marginBottom: 10 }}>
            <Ionicons name="search" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
            <TextInput
              placeholder="Tìm theo tên bài học, mã kiểm toán..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, fontSize: 12, color: '#1E293B', padding: 0 }}
            />
          </View>

          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {[
              { id: 'ALL', label: 'Tất Cả' },
              { id: 'ASSESSMENT', label: 'Bài Đánh Giá' },
              { id: 'LESSON', label: 'Bài Học & SOP' },
              { id: 'CLASSROOM_CHECKIN', label: 'Quét QR Lớp Học' },
            ].map((f) => {
              const isActive = selectedType === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setSelectedType(f.id)}
                  style={{
                    backgroundColor: isActive ? '#009E49' : '#F1F5F9',
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderRadius: 14,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#FFFFFF' : '#475569' }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. ACTIVITY LOG LIST */}
        <View style={{ gap: 10 }}>
          {filtered.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Ionicons name="document-text-outline" size={36} color="#94A3B8" style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>Không tìm thấy bản ghi kiểm toán phù hợp</Text>
            </View>
          ) : (
            filtered.map((log: any) => (
              <View
                key={log.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  {getTypeBadge(log.type)}
                  <Text style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>
                    {log.auditCode || 'AUDIT-LOG'}
                  </Text>
                </View>

                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 2 }}>
                  {log.title}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>
                  {log.moduleTitle}
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#F1F5F9', paddingTop: 8, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {log.score != null && (
                      <Badge tone="sage" size="sm">Điểm: {log.score}%</Badge>
                    )}
                    {log.attempt && (
                      <Text style={{ fontSize: 10.5, color: '#64748B' }}>Lần thi #{log.attempt}</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 10.5, color: '#94A3B8' }}>{log.timestamp || '2026-08-28'}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
