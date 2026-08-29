import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  Badge,
  ProgressBar,
  Button,
  StatTile,
  BarChart,
  DonutChart,
  LineChart,
} from '../components/ui';
import RoadmapTabsPanel from '../components/RoadmapTabsPanel';
import { useCourseStore } from '../store/CourseStore';
import { levelDefinition } from '../data/levelSystem';
import {
  deriveCertificates,
  totalLearningHours,
  weeklyStudyHours,
} from '../data/mockData';
import { computeCourseRecertification } from '../utils/recertification';
import { getCourseImage } from '../data/courseImages';

export default function LearnerDashboard() {
  const navigation = useNavigation<any>();
  const {
    currentUser,
    courses: allCourses,
    myEnrollments,
    myCourses,
    classrooms,
  } = useCourseStore();

  const [activeChartType, setActiveChartType] = useState<'BAR' | 'DONUT' | 'LINE'>('BAR');
  const [refreshing, setRefreshing] = useState(false);

  const user = currentUser;
  const levelDef = levelDefinition(user?.level || 7);
  const courses = myCourses(allCourses, user);
  const certificates = deriveCertificates(allCourses, user);

  // Recertification Alerts
  const recertAlerts = courses
    .map((c: any) => {
      const cert = certificates.find((cert: any) => cert.courseId === c.id);
      const recert = computeCourseRecertification(c, c.enrollment, cert);
      return { course: c, recert };
    })
    .filter((item: any) => item.recert.needsRecertification);

  const mandatoryCourses = courses.filter((c: any) => c.courseType === 'MANDATORY');
  const mandatoryCount = mandatoryCourses.length;
  const mandatoryOutstanding = mandatoryCourses.filter((c: any) => c.enrollment?.status !== 'COMPLETED').length;
  const inProgressCourses = courses.filter((c: any) => c.enrollment?.status === 'IN_PROGRESS');
  const completedCourses = courses.filter((c: any) => c.enrollment?.status === 'COMPLETED');
  const completedCount = completedCourses.length;
  const learningHours = totalLearningHours(allCourses, user) || 12.5;

  const competencyScore = courses.length > 0
    ? Math.min(100, Math.round(((completedCount * 1.0 + inProgressCourses.length * 0.4) / Math.max(1, mandatoryCount || courses.length)) * 100))
    : 75;

  const streakDays = user?.streakDays || 8;
  const weeklyHours = weeklyStudyHours(user);

  // Donut chart category distribution
  const donutData = [
    { label: 'An Toàn Thực Phẩm', value: 4, tone: 'sage' },
    { label: 'Vận Hành Siêu Thị', value: 3, tone: 'amber' },
    { label: 'An Toàn Lao Động', value: 2, tone: 'rust' },
    { label: 'Dịch Vụ Khách Hàng', value: 3, tone: 'blue' },
    { label: 'Kỹ Năng Số', value: 2, tone: 'rail' },
  ];

  // 4-Week trend data
  const lineTrendData = [
    { label: 'Tuần 1', value: Math.max(1, Math.round(learningHours * 0.2)) },
    { label: 'Tuần 2', value: Math.max(2, Math.round(learningHours * 0.45)) },
    { label: 'Tuần 3', value: Math.max(3, Math.round(learningHours * 0.75)) },
    { label: 'Tuần 4', value: Math.max(4, Math.round(learningHours)) },
  ];

  const upcomingClassrooms = (classrooms || []).filter((s: any) => s.isEnrolled || s.status === 'UPCOMING' || s.status === 'OPEN').slice(0, 2);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#009E49']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HERO PROFILE & LEARNING STATUS BANNER */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            shadowColor: '#009E49',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: '#0F766E',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  shadowColor: '#0F766E',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>
                  {user.avatar || (user.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'MT')}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }} numberOfLines={1}>
                  Xin chào, {user.fullName ? user.fullName.split(' ').pop() : 'Học viên'}! 👋
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
                  {user.position} &middot; {user.departmentName || 'MM An Phú'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('LearnerCalendar')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="calendar-outline" size={18} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Badges Bar */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            <Badge tone="rail" icon="shield-checkmark">
              Level {user.level} &middot; {levelDef.shortVi}
            </Badge>
            <Badge tone="amber" icon="flame">
              🔥 Chuỗi {streakDays} Ngày
            </Badge>
            <Badge tone="sage" icon="ribbon">
              📜 {certificates.length} Chứng Chỉ
            </Badge>
          </View>

          {/* Quick Action Button */}
          <Button
            variant="primary"
            icon="book"
            onPress={() => navigation.navigate('CoursesTab')}
          >
            Khóa Học Của Tôi ({courses.length})
          </Button>
        </View>

        {/* RECERTIFICATION ALERT BANNER (IF ANY) */}
        {recertAlerts.length > 0 && (
          <TouchableOpacity
            style={{
              backgroundColor: recertAlerts.some((a: any) => a.recert.isExpired) ? '#FEF2F2' : '#FFFBEB',
              borderLeftWidth: 4,
              borderLeftColor: recertAlerts.some((a: any) => a.recert.isExpired) ? '#DC2626' : '#D97706',
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: recertAlerts.some((a: any) => a.recert.isExpired) ? '#FECACA' : '#FDE68A',
            }}
            onPress={() => navigation.navigate('AchievementsTab')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons
                name={recertAlerts.some((a: any) => a.recert.isExpired) ? 'alert-circle' : 'time'}
                size={18}
                color={recertAlerts.some((a: any) => a.recert.isExpired) ? '#DC2626' : '#D97706'}
                style={{ marginRight: 6 }}
              />
              <Text style={{ fontSize: 13, fontWeight: '800', color: recertAlerts.some((a: any) => a.recert.isExpired) ? '#991B1B' : '#92400E', flex: 1 }}>
                Cần sát hạch tái cấp {recertAlerts.length} chứng chỉ!
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: '#64748B', lineHeight: 16 }}>
              {recertAlerts.map((a: any) => a.course.title).join(' · ')}
            </Text>
          </TouchableOpacity>
        )}

        {/* 2. FOUR HERO METRIC TILES */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 }}>
          <StatTile
            label="Giờ Học"
            value={`${learningHours.toFixed(1)}h`}
            subtext="+2.5h trong 7 ngày qua"
            tone="blue"
            icon="time"
            onClick={() => navigation.navigate('LearningHistory')}
          />
          <StatTile
            label="Đã Hoàn Thành"
            value={completedCount}
            subtext={`${Math.round((completedCount / Math.max(1, courses.length)) * 100)}% tổng số khóa`}
            tone="sage"
            icon="checkmark-circle"
            onClick={() => navigation.navigate('CoursesTab')}
          />
          <StatTile
            label="Khóa Bắt Buộc"
            value={mandatoryCount}
            subtext={`${mandatoryOutstanding} khóa chưa xong`}
            tone="amber"
            icon="alert-circle"
            onClick={() => navigation.navigate('CoursesTab')}
          />
          <StatTile
            label="Chỉ Số Năng Lực"
            value={`${competencyScore}%`}
            subtext={`Khung Level ${user.level}`}
            tone="rail"
            icon="ribbon"
            onClick={() => navigation.navigate('Roadmap')}
          />
        </View>

        {/* 3. IN-PROGRESS COURSES (CONTINUE LEARNING) */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="play-circle" size={20} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>
                Đang Theo Dõi ({inProgressCourses.length})
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('CoursesTab')}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#009E49' }}>Tất Cả</Text>
            </TouchableOpacity>
          </View>

          {inProgressCourses.length === 0 ? (
            <View style={{ padding: 16, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12 }}>
              <Ionicons name="checkmark-circle" size={32} color="#009E49" style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center' }}>
                Bạn đã hoàn thành hết các khóa đang ghi danh!
              </Text>
            </View>
          ) : (
            inProgressCourses.map((course: any) => (
              <TouchableOpacity
                key={course.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginBottom: 8,
                }}
                onPress={() => navigation.navigate('CourseOverview', { course, courseId: course.id })}
              >
                <Image
                  source={{ uri: getCourseImage(course) }}
                  style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12, backgroundColor: '#CBD5E1' }}
                />
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 2 }} numberOfLines={1}>
                    {course.title}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}>{course.code}</Text>
                    <Text style={{ fontSize: 10, color: '#94A3B8' }}>&bull;</Text>
                    <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '700' }}>{course.enrollment?.progress || 45}%</Text>
                  </View>
                  <ProgressBar value={course.enrollment?.progress || 45} tone="amber" size="sm" />
                </View>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#009E49', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* 4. 4-TAB CAREER ROADMAP PANEL */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="git-network" size={18} color="#0F766E" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>
                Trục Lộ Trình &amp; Định Biên
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Roadmap')}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#009E49' }}>Chi Tiết</Text>
            </TouchableOpacity>
          </View>
          <RoadmapTabsPanel user={user} />
        </View>

        {/* 5. MULTI-CHART ANALYTICS (BAR / DONUT / LINE) */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="stats-chart" size={18} color="#009E49" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>
                Thời Lượng &amp; Phân Bổ
              </Text>
            </View>

            {/* Chart Switcher */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 2 }}>
              {(['BAR', 'DONUT', 'LINE'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setActiveChartType(type)}
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 6,
                    backgroundColor: activeChartType === type ? '#009E49' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: activeChartType === type ? '#FFFFFF' : '#64748B' }}>
                    {type === 'BAR' ? '📊 Cột' : type === 'DONUT' ? '🍩 Tròn' : '📈 Xu hướng'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {activeChartType === 'BAR' && <BarChart data={weeklyHours} valueSuffix="h" tone="sage" />}
          {activeChartType === 'DONUT' && <DonutChart data={donutData} />}
          {activeChartType === 'LINE' && <LineChart data={lineTrendData} valueSuffix="h" tone="rail" />}
        </View>

        {/* 6. UPCOMING LIVE WORKSHOPS */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="easel" size={18} color="#2563EB" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>
                Lớp Thực Hành Sắp Diễn Ra
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ClassroomsTab')}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#009E49' }}>Tất Cả</Text>
            </TouchableOpacity>
          </View>

          {upcomingClassrooms.map((ws: any) => (
            <TouchableOpacity
              key={ws.id}
              style={{
                backgroundColor: '#F8FAFC',
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 8,
              }}
              onPress={() => navigation.navigate('ClassroomsTab')}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Badge tone={ws.modality === 'OFFLINE_STORE' ? 'amber' : 'blue'} size="sm">
                  {ws.modality === 'OFFLINE_STORE' ? 'Thực Hành Xưởng' : 'Teams Webinar'}
                </Badge>
                <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600' }}>{ws.code}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 4 }} numberOfLines={1}>
                {ws.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, color: '#64748B' }}>{ws.date || '2026-08-28'} &middot; {ws.time || '08:30 - 11:30'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
