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
import { useNavigation } from '@react-navigation/native';
import { Badge, Button } from '../components/ui';
import { useCourseStore } from '../store/CourseStore';
import { levelDefinition } from '../data/levelSystem';
import { deriveCertificates, totalLearningHours } from '../data/mockData';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const {
    currentUser,
    switchUser,
    demoUsers,
    courses: allCourses,
    myEnrollments,
    language,
    toggleLanguage,
  } = useCourseStore();

  const user = currentUser;
  const levelDef = levelDefinition(user?.level || 7);
  const certificates = deriveCertificates(allCourses, user);
  const learningHours = totalLearningHours(allCourses, user) || 12.5;

  const [showUserSwitcher, setShowUserSwitcher] = useState(false);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B' }}>
          Tài Khoản &amp; Hồ Sơ Nhân Sự
        </Text>
        <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
          Hệ thống đào tạo nội bộ MM Mega Market Vietnam
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 1. PROFILE HERO CARD */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#0F766E',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
              borderWidth: 3,
              borderColor: '#CCFBF1',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF' }}>
              {user.avatar || (user.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'MT')}
            </Text>
          </View>

          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>
            {user.fullName || 'Minh Tran'}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 2 }}>
            {user.position} &middot; {user.departmentName || 'Quầy Bánh'} &middot; {user.employeeCode || 'MMVN-1042'}
          </Text>

          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            <Badge tone="rail" icon="shield-checkmark">
              Level {user.level} &middot; {levelDef.shortVi}
            </Badge>
            <Badge tone="sage">MM An Phú</Badge>
          </View>
        </View>

        {/* 2. LEARNING STATS OVERVIEW */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}
            onPress={() => navigation.navigate('AchievementsTab')}
          >
            <Ionicons name="ribbon" size={20} color="#009E49" style={{ marginBottom: 4 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>{certificates.length}</Text>
            <Text style={{ fontSize: 10.5, color: '#64748B' }}>Chứng Chỉ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}
            onPress={() => navigation.navigate('LearningHistory')}
          >
            <Ionicons name="time" size={20} color="#2563EB" style={{ marginBottom: 4 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>{learningHours.toFixed(1)}h</Text>
            <Text style={{ fontSize: 10.5, color: '#64748B' }}>Giờ Học</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}
            onPress={() => navigation.navigate('AchievementsTab')}
          >
            <Ionicons name="trophy" size={20} color="#D97706" style={{ marginBottom: 4 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>1,450</Text>
            <Text style={{ fontSize: 10.5, color: '#64748B' }}>Điểm XP</Text>
          </TouchableOpacity>
        </View>

        {/* 3. SWITCH DEMO USER CARD (FOR TESTING MULTI-ROLES) */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            onPress={() => setShowUserSwitcher(!showUserSwitcher)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="people-outline" size={20} color="#009E49" style={{ marginRight: 10 }} />
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#1E293B' }}>Chuyển Đổi Tài Khoản Demo</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>Đang đăng nhập: {user.fullName} ({user.role})</Text>
              </View>
            </View>
            <Ionicons name={showUserSwitcher ? 'chevron-up' : 'chevron-down'} size={18} color="#94A3B8" />
          </TouchableOpacity>

          {showUserSwitcher && (
            <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: '#F1F5F9', paddingTop: 10, gap: 8 }}>
              {demoUsers.map((u: any) => {
                const isSelected = u.id === user.id;
                return (
                  <TouchableOpacity
                    key={u.id}
                    onPress={() => {
                      switchUser(u.id);
                      setShowUserSwitcher(false);
                      Alert.alert('Đã Chuyển Đổi', `Đang đăng nhập vai trò: ${u.fullName} (${u.role})`);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSelected ? '#ECFDF5' : '#F8FAFC',
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isSelected ? '#009E49' : '#E2E8F0',
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>{u.fullName}</Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>{u.position} &middot; Level {u.level || 7}</Text>
                    </View>
                    <Badge tone={isSelected ? 'sage' : 'slate'} size="sm">
                      {u.role}
                    </Badge>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 4. NAVIGATION SHORTCUTS */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginBottom: 16 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: '#F1F5F9' }}
            onPress={() => navigation.navigate('AiLearningHub')}
          >
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="sparkles" size={18} color="#7C3AED" />
            </View>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' }}>Trợ Lý AI Hub &amp; Tutor</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: '#F1F5F9' }}
            onPress={() => navigation.navigate('LearningHistory')}
          >
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="finger-print" size={18} color="#2563EB" />
            </View>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' }}>Sổ Nhật Ký Kiểm Toán Học Tập</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: '#F1F5F9' }}
            onPress={() => navigation.navigate('LearnerCalendar')}
          >
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="calendar" size={18} color="#D97706" />
            </View>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' }}>Lịch Đào Tạo Doanh Nghiệp</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
            onPress={toggleLanguage}
          >
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="globe-outline" size={18} color="#475569" />
            </View>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
              Ngôn Ngữ: {language === 'vi' ? 'Tiếng Việt (VI)' : 'English (EN)'}
            </Text>
            <Badge tone="slate" size="sm">Đổi</Badge>
          </TouchableOpacity>
        </View>

        {/* 5. LOGOUT */}
        <Button
          variant="outline"
          tone="danger"
          icon="log-out-outline"
          onPress={() => Alert.alert('Đăng Xuất', 'Bạn có chắc chắn muốn đăng xuất?')}
        >
          Đăng Xuất Khỏi Tài Khoản
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
