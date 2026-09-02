import React, { useMemo, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import {
  currentUser as fallbackUser,
  myLearningCourses,
  notifications,
  deriveCertificates,
  totalLearningHours,
  weeklyStudyHours,
  getCourseImage,
} from '../data/mockData';
// @ts-ignore
import { levelDefinition } from '../data/levelSystem';
// @ts-ignore
import { computeCourseRecertification } from '../utils/recertification';
import { Badge, ProgressBar, Button, BarChart, DonutChart, LineChart } from '../components/ui';
import { Screen, Card, SectionTitle, COLORS, HeaderIconButton, Segmented } from '../components/layout';
import NotificationsSheet from '../components/NotificationsSheet';

export default function LearnerDashboard() {
  const navigation = useNavigation<any>();
  const {
    courses: allCourses,
    currentUser: authUser,
    enrollments,
    classrooms,
    myCourses,
    certificateTemplates,
  } = useCourseStore();

  const user = authUser || fallbackUser;
  const [chartType, setChartType] = useState<'BAR' | 'DONUT' | 'LINE'>('BAR');
  const [inboxOpen, setInboxOpen] = useState(false);

  const courses = useMemo(
    () => (myCourses ? myCourses(allCourses, user) : myLearningCourses(allCourses, user, enrollments)),
    [allCourses, user, enrollments, myCourses]
  );
  const certificates = useMemo(
    () => deriveCertificates(allCourses, user, enrollments, certificateTemplates),
    [allCourses, user, enrollments, certificateTemplates]
  );

  const recertAlerts = useMemo(
    () =>
      courses
        .map((c: any) => ({
          course: c,
          recert: computeCourseRecertification(
            c,
            c.enrollment,
            certificates.find((cert: any) => cert.courseId === c.id)
          ),
        }))
        .filter((item: any) => item.recert.needsRecertification),
    [courses, certificates]
  );

  const mandatoryCourses = courses.filter((c: any) => c.courseType === 'MANDATORY');
  const mandatoryOutstanding = mandatoryCourses.filter((c: any) => c.enrollment.status !== 'COMPLETED').length;
  const inProgressCourses = courses.filter((c: any) => c.enrollment.status === 'IN_PROGRESS');
  const completedCount = courses.filter((c: any) => c.enrollment.status === 'COMPLETED').length;
  const learningHours = totalLearningHours(allCourses, user, enrollments);
  const levelDef = levelDefinition(user.level);
  const weeklyData = weeklyStudyHours(user);
  const inbox = notifications.learnerInbox || [];
  const unreadCount = inbox.filter((n: any) => n.unread).length;

  const upcomingClassrooms = (classrooms || [])
    .filter((s: any) => s.isEnrolled || s.status === 'UPCOMING' || s.status === 'OPEN')
    .slice(0, 3);

  const categoryStats = useMemo(() => computeCategoryDistribution(courses), [courses]);
  const donutData = categoryStats.map((c) => ({ label: c.name, value: Math.max(1, c.completedCount), tone: c.tone }));
  const lineData = [
    { label: 'T1', value: Math.max(1, Math.round(learningHours * 0.2)) },
    { label: 'T2', value: Math.max(2, Math.round(learningHours * 0.45)) },
    { label: 'T3', value: Math.max(3, Math.round(learningHours * 0.75)) },
    { label: 'T4', value: Math.max(4, Math.round(learningHours)) },
  ];

  const competencyScore =
    courses.length > 0
      ? Math.min(
          100,
          Math.round(
            ((completedCount * 1.0 + inProgressCourses.length * 0.4) /
              Math.max(1, mandatoryCourses.length || courses.length)) *
              100
          )
        )
      : 75;

  const streakDays = user.streakDays || 8;
  const hasExpired = recertAlerts.some((a: any) => a.recert.isExpired);

  return (
    <Screen
      title={`Xin chào, ${firstNameOf(user.fullName)} 👋`}
      subtitle={`${user.position || ''}`}
      right={
        <>
          <HeaderIconButton icon="sparkles" tone="ai" onPress={() => navigation.navigate('AiLearningHub')} />
          <HeaderIconButton icon="notifications-outline" badge={unreadCount} onPress={() => setInboxOpen(true)} />
        </>
      }
    >
      {/* Hero */}
      <Card style={{ backgroundColor: COLORS.greenSoft, borderColor: '#A7F3D0' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: COLORS.rail,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>
              {user.avatar || (user.fullName || '').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: COLORS.ink }} numberOfLines={1}>
              {user.fullName}
            </Text>
            <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 1 }} numberOfLines={1}>
              {user.departmentName || user.divisionName || 'MM Mega Market'} · {user.employeeCode}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          <Badge tone="rail" size="sm">
            {levelDef.emoji} Level {user.level} · {levelDef.shortVi}
          </Badge>
          <Badge tone="amber" size="sm">
            🔥 Chuỗi {streakDays} ngày
          </Badge>
          <Badge tone="sage" size="sm">
            📜 {certificates.length} chứng chỉ
          </Badge>
        </View>
      </Card>

      {/* Recertification alert */}
      {recertAlerts.length > 0 && (
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Certificates')}>
          <Card
            style={{
              backgroundColor: hasExpired ? COLORS.redSoft : COLORS.amberSoft,
              borderColor: hasExpired ? '#FECACA' : '#FDE68A',
              borderLeftWidth: 4,
              borderLeftColor: hasExpired ? COLORS.red : COLORS.amber,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons
                name={hasExpired ? 'alert-circle' : 'time'}
                size={20}
                color={hasExpired ? COLORS.red : COLORS.amber}
                style={{ marginRight: 10, marginTop: 1 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: hasExpired ? '#B91C1C' : '#B45309' }}>
                  {recertAlerts.length} khóa cần thi tái cấp chứng chỉ
                </Text>
                <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 3, lineHeight: 16 }} numberOfLines={3}>
                  {recertAlerts.map((a: any) => `${a.course.title} (${a.recert.statusLabel})`).join(' · ')}
                </Text>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: COLORS.green, marginTop: 6 }}>
                  Xem chứng chỉ & thi tái cấp →
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      )}

      {/* Stat tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
        <MetricTile
          label="Giờ Học"
          value={`${learningHours.toFixed(1)}h`}
          sub="+2.5h trong 7 ngày"
          tone="blue"
          icon="time-outline"
          onPress={() => navigation.navigate('LearningHistory')}
        />
        <MetricTile
          label="Đã Hoàn Thành"
          value={completedCount}
          sub={`${Math.round((completedCount / Math.max(1, courses.length)) * 100)}% tổng khóa`}
          tone="sage"
          icon="checkmark-circle-outline"
          onPress={() => navigation.navigate('CoursesTab')}
        />
        <MetricTile
          label="Khóa Bắt Buộc"
          value={mandatoryCourses.length}
          sub={`${mandatoryOutstanding} chưa xong`}
          tone="amber"
          icon="warning-outline"
          onPress={() => navigation.navigate('CoursesTab')}
        />
        <MetricTile
          label="Chỉ Số Năng Lực"
          value={`${competencyScore}%`}
          sub={`Khung Level ${user.level}`}
          tone="rail"
          icon="shield-checkmark-outline"
          onPress={() => navigation.navigate('RoadmapTab')}
        />
      </View>

      {/* In-progress courses */}
      <SectionTitle icon="play-circle" action="Tất cả" onAction={() => navigation.navigate('CoursesTab')}>
        Đang học ({inProgressCourses.length})
      </SectionTitle>

      {inProgressCourses.length === 0 ? (
        <Card style={{ backgroundColor: COLORS.sunken }}>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Ionicons name="checkmark-done-circle" size={30} color={COLORS.green} />
            <Text style={{ fontSize: 12.5, color: COLORS.inkSoft, textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
              Bạn đã hoàn thành hết các khóa đang ghi danh.{'\n'}Chọn thêm khóa mới từ Lộ trình.
            </Text>
          </View>
        </Card>
      ) : (
        inProgressCourses.slice(0, 3).map((c: any) => (
          <Card
            key={c.id}
            onPress={() => navigation.navigate('CourseOverview', { courseId: c.id })}
            style={{ padding: 10 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={{ uri: getCourseImage(c) }}
                style={{ width: 46, height: 46, borderRadius: 8, backgroundColor: COLORS.sunken, marginRight: 11 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.ink }} numberOfLines={2}>
                  {c.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <ProgressBar value={c.enrollment.progressPercent || 0} tone="rail" size="sm" />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.amber }}>
                    {c.enrollment.progressPercent || 0}%
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={17} color={COLORS.inkFaint} style={{ marginLeft: 8 }} />
            </View>
          </Card>
        ))
      )}

      {/* Upcoming classrooms */}
      <SectionTitle icon="people" action="Xem lớp" onAction={() => navigation.navigate('Classrooms')}>
        Lớp trực tiếp sắp diễn ra
      </SectionTitle>

      {upcomingClassrooms.length === 0 ? (
        <Card style={{ backgroundColor: COLORS.sunken }}>
          <Text style={{ fontSize: 12.5, color: COLORS.inkSoft, textAlign: 'center', paddingVertical: 10 }}>
            Chưa có lịch lớp thực hành mới.
          </Text>
        </Card>
      ) : (
        upcomingClassrooms.map((cls: any) => (
          <Card key={cls.id} onPress={() => navigation.navigate('Classrooms')} style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 6 }}>
              <Badge tone={cls.modality === 'OFFLINE_STORE' ? 'rust' : 'blue'} size="sm">
                {cls.modality === 'OFFLINE_STORE' ? 'Thực hành' : 'Webinar'}
              </Badge>
              <Text style={{ fontSize: 10.5, color: COLORS.inkFaint }}>{cls.code}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }} numberOfLines={2}>
              {cls.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
              <Ionicons name="location-outline" size={12} color={COLORS.inkFaint} />
              <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                {cls.venue} · GV {cls.trainerName}
              </Text>
            </View>
          </Card>
        ))
      )}

      {/* Competency distribution */}
      <SectionTitle icon="pie-chart">Phân bổ năng lực theo khối</SectionTitle>
      <Card>
        {categoryStats.map((cat, idx) => (
          <View key={idx} style={{ marginBottom: idx === categoryStats.length - 1 ? 0 : 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                <Ionicons name={cat.icon as any} size={14} color={toneColor(cat.tone)} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: COLORS.ink, flex: 1 }} numberOfLines={1}>
                  {cat.name}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: COLORS.inkFaint }}>
                {cat.completedCount}/{cat.totalCount}
              </Text>
            </View>
            <ProgressBar value={cat.percent} tone={cat.tone as any} size="sm" />
          </View>
        ))}
      </Card>

      {/* Activity charts */}
      <SectionTitle icon="bar-chart">Thời lượng học tập</SectionTitle>
      <Card>
        <Segmented
          options={[
            { value: 'BAR', label: '📊 Cột' },
            { value: 'DONUT', label: '🍩 Tròn' },
            { value: 'LINE', label: '📈 Đường' },
          ]}
          value={chartType}
          onChange={(v) => setChartType(v as any)}
        />
        {chartType === 'BAR' && <BarChart data={weeklyData} valueSuffix="h" tone="sage" />}
        {chartType === 'DONUT' && <DonutChart data={donutData} valueSuffix=" khóa" />}
        {chartType === 'LINE' && <LineChart data={lineData} valueSuffix="h" tone="rail" />}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.greenSoft,
            borderRadius: 8,
            padding: 10,
            marginTop: 10,
          }}
        >
          <Ionicons name="flame" size={17} color={COLORS.amber} style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 11.5, color: COLORS.ink, flex: 1, lineHeight: 16 }}>
            Duy trì <Text style={{ fontWeight: '800' }}>{streakDays} ngày liên tiếp</Text> · đạt 88% mục tiêu tháng.
          </Text>
        </View>
      </Card>

      {/* Shortcuts */}
      <SectionTitle icon="apps">Lối tắt</SectionTitle>
      <ShortcutRow
        icon="ribbon"
        tone="sage"
        title="Chứng chỉ đã đạt"
        value={`${certificates.length} chứng chỉ điện tử`}
        onPress={() => navigation.navigate('Certificates')}
      />
      <ShortcutRow
        icon="trophy"
        tone="amber"
        title="Bảng thi đua học tập"
        value="Xếp hạng phòng ban & XP"
        onPress={() => navigation.navigate('Leaderboard')}
      />
      <ShortcutRow
        icon="time"
        tone="rail"
        title="Lịch sử học tập"
        value="Bảng điểm & hồ sơ đào tạo"
        onPress={() => navigation.navigate('LearningHistory')}
      />
      <ShortcutRow
        icon="sparkles"
        tone="purple"
        title="AI Learning Hub"
        value="Trợ lý tra cứu SOP & gia sư AI"
        onPress={() => navigation.navigate('AiLearningHub')}
      />

      <NotificationsSheet visible={inboxOpen} onClose={() => setInboxOpen(false)} items={inbox} />
    </Screen>
  );
}

function MetricTile({
  label,
  value,
  sub,
  tone,
  icon,
  onPress,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone: string;
  icon: string;
  onPress?: () => void;
}) {
  const color = toneColor(tone);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        width: '47.6%',
        flexGrow: 1,
        backgroundColor: COLORS.paper,
        borderWidth: 1,
        borderColor: COLORS.line,
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 10.5, fontWeight: '800', color: COLORS.inkFaint, letterSpacing: 0.2 }} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
        <Ionicons name={icon as any} size={15} color={color} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '900', color }}>{value}</Text>
      {!!sub && (
        <Text style={{ fontSize: 10, color: COLORS.inkFaint, marginTop: 2 }} numberOfLines={1}>
          {sub}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function ShortcutRow({
  icon,
  tone,
  title,
  value,
  onPress,
}: {
  icon: string;
  tone: string;
  title: string;
  value: string;
  onPress: () => void;
}) {
  const color = toneColor(tone);
  return (
    <Card onPress={onPress} style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: toneSoft(tone),
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 11,
          }}
        >
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }} numberOfLines={1}>
            {title}
          </Text>
          <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 1 }} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.inkFaint} />
      </View>
    </Card>
  );
}

export function toneColor(tone: string) {
  switch (tone) {
    case 'sage':
      return COLORS.green;
    case 'amber':
      return COLORS.amber;
    case 'rust':
      return COLORS.red;
    case 'rail':
      return COLORS.rail;
    case 'purple':
      return COLORS.purple;
    case 'blue':
    default:
      return COLORS.blue;
  }
}

export function toneSoft(tone: string) {
  switch (tone) {
    case 'sage':
      return COLORS.greenSoft;
    case 'amber':
      return COLORS.amberSoft;
    case 'rust':
      return COLORS.redSoft;
    case 'rail':
      return COLORS.railSoft;
    case 'purple':
      return COLORS.purpleSoft;
    case 'blue':
    default:
      return COLORS.blueSoft;
  }
}

/**
 * Cùng 5 nhóm kỹ năng trọng tâm với bản web (LearnerDashboard.jsx) — khớp từ khoá
 * trên title/domain/category để không phải gắn thêm trường mới vào dữ liệu khóa học.
 */
function computeCategoryDistribution(courses: any[]) {
  const groups = [
    {
      name: 'Vận Hành & Quầy Hàng',
      tone: 'rail',
      icon: 'storefront-outline',
      keywords: ['store', 'operation', 'planogram', 'cashier', 'pos', 'shrinkage', 'trolley', 'stock'],
    },
    {
      name: 'An Toàn Thực Phẩm & PCCC',
      tone: 'rust',
      icon: 'shield-half-outline',
      keywords: ['food', 'safety', 'haccp', 'hygiene', 'cold', 'chain', 'fire', 'pccc', 'evacuation', 'hazard'],
    },
    {
      name: 'Chuyên Môn Ngành Hàng & CNTT',
      tone: 'blue',
      icon: 'laptop-outline',
      keywords: ['it', 'security', 'cyber', 'merchandis', 'pricing', 'supply', 'logistics', 'e-commerce', 'forklift'],
    },
    {
      name: 'Lãnh Đạo & Quản Trị',
      tone: 'amber',
      icon: 'ribbon-outline',
      keywords: ['leadership', 'coach', 'conflict', 'management', 'kpi', 'strategic', 'appraisal', 'trainer'],
    },
    {
      name: 'Dịch Vụ Khách Hàng & Văn Hóa',
      tone: 'sage',
      icon: 'heart-outline',
      keywords: ['customer', 'service', 'horeca', 'culture', 'conduct', 'ethics', 'onboarding'],
    },
  ];

  return groups.map((grp) => {
    const matched = courses.filter((c) => {
      const text = `${c.title} ${c.domain || ''} ${c.category || ''}`.toLowerCase();
      return grp.keywords.some((kw) => text.includes(kw));
    });
    const completedCount = matched.filter((c) => c.enrollment?.status === 'COMPLETED').length;
    return {
      name: grp.name,
      tone: grp.tone,
      icon: grp.icon,
      totalCount: matched.length,
      completedCount,
      percent: matched.length === 0 ? 0 : Math.round((completedCount / matched.length) * 100),
    };
  });
}

function firstNameOf(fullName?: string) {
  return (fullName || '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .split(' ')
    .pop();
}
