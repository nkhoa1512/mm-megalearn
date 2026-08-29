import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Badge, ProgressBar } from '../components/ui';
import { useCourseStore } from '../store/CourseStore';

export default function LeaderboardScreen() {
  const { gamification, currentUser } = useCourseStore();
  const [scope, setScope] = useState<'DEPT' | 'COMPANY'>('DEPT');

  const user = currentUser;
  const userStats = gamification?.userStats || {
    points: 1450,
    nextLevelXp: 2000,
    currentLevel: 7,
    levelTitle: 'Chuyên viên Tuyến Đầu',
    streakDays: 8,
    rankInDept: 3,
    rankInCompany: 42,
  };

  const leaderboard = gamification?.leaderboard || [
    { rank: 1, name: 'Trần Quốc Bảo', department: 'Tươi Sống', level: 6, points: 2850, streak: 15, isCurrent: false, avatar: 'TB' },
    { rank: 2, name: 'Lê Hoàng Nam', department: 'Thu Ngân', level: 6, points: 2420, streak: 12, isCurrent: false, avatar: 'LN' },
    { rank: 3, name: user?.fullName || 'Minh Tran', department: 'Quầy Bánh', level: 7, points: 1450, streak: 8, isCurrent: true, avatar: 'MT' },
    { rank: 4, name: 'Sarah Johnson', department: 'Quầy Bánh', level: 7, points: 1380, streak: 7, isCurrent: false, avatar: 'SJ' },
    { rank: 5, name: 'Phạm Thị Thảo', department: 'Kiểm Soát QA', level: 7, points: 1220, streak: 5, isCurrent: false, avatar: 'PT' },
  ];

  const badges = [
    { id: 'b1', name: 'Chiến Binh HACCP', icon: 'shield-checkmark', tone: 'sage', desc: 'Đạt 100% điểm bài thi An toàn thực phẩm' },
    { id: 'b2', name: 'Ngọn Lửa Học Tập', icon: 'flame', tone: 'amber', desc: 'Duy trì chuỗi học tập 7 ngày liên tiếp' },
    { id: 'b3', name: 'Chuyên Gia Tươi Sống', icon: 'ribbon', tone: 'blue', desc: 'Hoàn thành trọn bộ giáo trình Tươi Sống' },
  ];

  const xpProgress = Math.round((userStats.points / (userStats.nextLevelXp || 2000)) * 100);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B' }}>
          Bảng Vinh Danh &amp; Thành Tích
        </Text>
        <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
          Thi đua tích lũy XP, duy trì chuỗi học và thăng hạng kỹ năng
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 1. LEVEL & XP CARD */}
        <View
          style={{
            backgroundColor: '#0F766E',
            borderRadius: 18,
            padding: 16,
            marginBottom: 14,
            shadowColor: '#0F766E',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '700', textTransform: 'uppercase' }}>
                Khung Cấp Bậc Năng Lực
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginTop: 2 }}>
                Level {userStats.currentLevel} &middot; {userStats.levelTitle}
              </Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trophy" size={24} color="#FDE68A" />
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <ProgressBar value={xpProgress} tone="amber" size="md" />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontSize: 11, color: '#FFFFFF', fontWeight: '700' }}>{userStats.points} XP</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
                Còn {userStats.nextLevelXp - userStats.points} XP lên Level 6
              </Text>
            </View>
          </View>
        </View>

        {/* 2. STREAK & RANK TILES */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {/* Streak Card */}
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>Chuỗi Học Tập</Text>
              <Ionicons name="flame" size={18} color="#EA580C" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#EA580C' }}>{userStats.streakDays} Ngày</Text>
            <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Duy trì học mỗi ngày</Text>
          </View>

          {/* Department Rank Card */}
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>Hạng Phòng Ban</Text>
              <Ionicons name="medal" size={18} color="#009E49" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#009E49' }}>Top #{userStats.rankInDept}</Text>
            <Text style={{ fontSize: 10, color: '#047857', fontWeight: '700', marginTop: 2 }}>▲ Top 5% xuất sắc</Text>
          </View>
        </View>

        {/* 3. LEADERBOARD LIST */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>
              Bảng Vàng Tuần Này
            </Text>

            {/* Scope Switcher */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 2 }}>
              <TouchableOpacity
                onPress={() => setScope('DEPT')}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  backgroundColor: scope === 'DEPT' ? '#009E49' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: scope === 'DEPT' ? '#FFFFFF' : '#64748B' }}>Phòng Ban</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setScope('COMPANY')}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  backgroundColor: scope === 'COMPANY' ? '#009E49' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: scope === 'COMPANY' ? '#FFFFFF' : '#64748B' }}>Toàn Công Ty</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* List rows */}
          <View style={{ gap: 8 }}>
            {leaderboard.map((item: any) => {
              const medal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`;
              return (
                <View
                  key={item.rank}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: item.isCurrent ? '#F0FDF4' : '#F8FAFC',
                    borderColor: item.isCurrent ? '#A7F3D0' : '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', width: 28, textAlign: 'center' }}>
                    {medal}
                  </Text>

                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: item.isCurrent ? '#009E49' : '#475569',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                      {item.avatar}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>{item.name}</Text>
                      {item.isCurrent && <Badge tone="sage" size="sm">Bạn</Badge>}
                    </View>
                    <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                      {item.department} &middot; Level {item.level}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F766E' }}>{item.points} XP</Text>
                    <Text style={{ fontSize: 10, color: '#EA580C', fontWeight: '600' }}>🔥 {item.streak}d</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 4. BADGES COLLECTION */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 12 }}>
            Huy Hiệu &amp; Danh Hiệu Đã Đạt
          </Text>
          <View style={{ gap: 10 }}>
            {badges.map((b) => (
              <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name={b.icon as any} size={20} color="#009E49" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>{b.name}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
