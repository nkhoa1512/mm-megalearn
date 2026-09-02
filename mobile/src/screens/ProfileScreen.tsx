import React, { useMemo, useState } from 'react';
import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import { currentUser as fallbackUser, deriveCertificates, totalLearningHours, orgPathLabel } from '../data/mockData';
// @ts-ignore
import { levelShortLabel } from '../data/levelSystem';
// @ts-ignore
import { roleDefinition, normalizeRole } from '../data/roles';
// @ts-ignore
import { costCenterForUser } from '../utils/costCenter';
import { Badge } from '../components/ui';
import { Screen, Card, COLORS, SectionTitle, InfoRow, useColors } from '../components/layout';
import { clearCache } from '../store/persistentCache';

export default function ProfileScreen() {
  const COLORS = useColors();
  const navigation = useNavigation<any>();
  const {
    currentUser: authUser,
    courses,
    myCourses,
    enrollments,
    certificateTemplates,
    logout,
    theme,
    toggleTheme,
    language,
    toggleLanguage,
    costCenters,
  } = useCourseStore();

  const user = authUser || fallbackUser;
  const [resetting, setResetting] = useState(false);

  const myList = useMemo(() => myCourses(courses, user), [courses, user, myCourses]);
  const certificates = useMemo(
    () => deriveCertificates(courses, user, enrollments, certificateTemplates),
    [courses, user, enrollments, certificateTemplates]
  );
  const hours = totalLearningHours(courses, user, enrollments);
  const completed = myList.filter((c: any) => c.enrollment?.status === 'COMPLETED').length;
  const roleDef = roleDefinition(user.role);

  const costCenter = useMemo(() => {
    try {
      return costCenterForUser(user, costCenters);
    } catch {
      return null;
    }
  }, [user, costCenters]);

  function confirmLogout() {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn thoát khỏi tài khoản này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  }

  function confirmReset() {
    Alert.alert(
      'Đặt lại dữ liệu demo',
      'Toàn bộ tiến độ học, ghi danh và cài đặt lưu trên máy sẽ bị xoá, đưa app về dữ liệu gốc. Bạn sẽ phải đăng nhập lại.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá & đăng xuất',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            await clearCache();
            logout();
            setResetting(false);
          },
        },
      ]
    );
  }

  return (
    <Screen title="Tài Khoản" subtitle={user.employeeCode}>
      {/* Identity */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: COLORS.rail,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 13,
            }}
          >
            <Text style={{ fontSize: 19, fontWeight: '900', color: '#FFFFFF' }}>
              {user.avatar || (user.fullName || '').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15.5, fontWeight: '900', color: COLORS.ink }} numberOfLines={1}>
              {user.fullName}
            </Text>
            <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 2 }} numberOfLines={2}>
              {user.position}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          <Badge tone={roleDef.tone as any} size="sm">
            {roleDef.shortVi}
          </Badge>
          {/* levelShortLabel đã gồm sẵn emoji + "Level N: <chức danh>", nên
              không ghép thêm emoji/shortVi nữa kẻo lặp hai lần. */}
          <Badge tone="rail" size="sm">
            {levelShortLabel(user.level)}
          </Badge>
          <Badge tone="slate" size="sm">
            {user.divisionCode}
          </Badge>
        </View>
      </Card>

      {/* Learning summary */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <SummaryTile label="Khóa đang theo" value={`${myList.length}`} color={COLORS.rail} />
        <SummaryTile label="Đã hoàn thành" value={`${completed}`} color={COLORS.green} />
        <SummaryTile label="Giờ học tích lũy" value={`${hours.toFixed(1)}h`} color={COLORS.blue} />
        <SummaryTile label="Chứng chỉ" value={`${certificates.length}`} color={COLORS.amber} />
      </View>

      {/* HR profile */}
      <SectionTitle icon="id-card">Hồ sơ nhân sự</SectionTitle>
      <Card>
        <InfoRow label="Mã nhân viên" value={user.employeeCode} icon="barcode-outline" />
        <InfoRow label="Email công ty" value={user.email || '—'} icon="mail-outline" />
        <InfoRow label="Khối / Division" value={user.divisionName || user.divisionCode} icon="business-outline" />
        <InfoRow label="Phòng ban" value={user.departmentName || user.departmentCode || '—'} icon="people-outline" />
        {!!user.subDepartmentName && (
          <InfoRow label="Bộ phận" value={user.subDepartmentName} icon="git-branch-outline" />
        )}
        <InfoRow label="Địa điểm làm việc" value={user.storeName || user.areaName || '—'} icon="location-outline" />
        {!!costCenter && (
          <InfoRow
            label="Trung tâm chi phí"
            value={`${costCenter.code} · ${costCenter.name}`}
            icon="wallet-outline"
          />
        )}
        <InfoRow label="Đường dẫn tổ chức" value={orgPathLabel(user)} icon="trail-sign-outline" />
      </Card>

      {/* Learning shortcuts */}
      <SectionTitle icon="bookmarks">Học tập của tôi</SectionTitle>
      <MenuRow icon="ribbon" tone={COLORS.green} label="Chứng chỉ số" hint={`${certificates.length} chứng chỉ`} onPress={() => navigation.navigate('Certificates')} />
      <MenuRow icon="time" tone={COLORS.rail} label="Lịch sử học tập" hint="Bảng điểm & nhật ký kiểm toán" onPress={() => navigation.navigate('LearningHistory')} />
      <MenuRow icon="trophy" tone={COLORS.amber} label="Bảng thi đua & huy hiệu" hint="Xếp hạng XP và thành tích" onPress={() => navigation.navigate('Leaderboard')} />
      <MenuRow icon="easel" tone={COLORS.blue} label="Lớp thực hành & QR" hint="Lịch buổi học và điểm danh" onPress={() => navigation.navigate('Classrooms')} />
      <MenuRow icon="sparkles" tone={COLORS.purple} label="AI Learning Hub" hint="Gia sư AI & gợi ý khóa học" onPress={() => navigation.navigate('AiLearningHub')} />

      {/* Settings */}
      <SectionTitle icon="settings">Cài đặt</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow
          icon="language"
          label="Ngôn ngữ hiển thị"
          hint={language === 'en' ? 'English' : 'Tiếng Việt'}
          value={language === 'en'}
          onToggle={toggleLanguage}
        />
        <ToggleRow
          icon="moon"
          label="Giao diện tối"
          hint={theme === 'dark' ? 'Đang bật' : 'Đang tắt'}
          value={theme === 'dark'}
          onToggle={toggleTheme}
          last
        />
      </Card>

      {/* Danger zone */}
      <Card style={{ marginTop: 6 }}>
        <TouchableOpacity
          onPress={confirmReset}
          disabled={resetting}
          activeOpacity={0.75}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9 }}
        >
          <Ionicons name="refresh-circle-outline" size={19} color={COLORS.inkSoft} style={{ marginRight: 11 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.inkSoft }}>Đặt lại dữ liệu demo</Text>
            <Text style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 2 }}>
              Xoá tiến độ đã lưu trên máy, đưa app về dữ liệu gốc
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 1, backgroundColor: COLORS.line, marginVertical: 4 }} />

        <TouchableOpacity
          onPress={confirmLogout}
          activeOpacity={0.75}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9 }}
        >
          <Ionicons name="log-out-outline" size={19} color={COLORS.red} style={{ marginRight: 11 }} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.red, flex: 1 }}>Đăng xuất</Text>
        </TouchableOpacity>
      </Card>

      <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, textAlign: 'center', marginTop: 12, lineHeight: 16 }}>
        MM MegaLearn Mobile · phiên bản học viên{'\n'}© 2026 MM Mega Market Vietnam · L&OD
      </Text>
    </Screen>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: string; color: string }) {
  const COLORS = useColors();
  return (
    <View
      style={{
        width: '47.6%',
        flexGrow: 1,
        backgroundColor: COLORS.paper,
        borderWidth: 1,
        borderColor: COLORS.line,
        borderRadius: 12,
        padding: 11,
        marginBottom: 6,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.inkFaint }} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 19, fontWeight: '900', color, marginTop: 3 }}>{value}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  tone,
  label,
  hint,
  onPress,
}: {
  icon: string;
  tone: string;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const COLORS = useColors();
  return (
    <Card onPress={onPress} style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: `${tone}18`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 11,
          }}
        >
          <Ionicons name={icon as any} size={17} color={tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>{label}</Text>
          <Text style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 2 }} numberOfLines={1}>
            {hint}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.inkFaint} />
      </View>
    </Card>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onToggle,
  last,
}: {
  icon: string;
  label: string;
  hint: string;
  value: boolean;
  onToggle: () => void;
  last?: boolean;
}) {
  const COLORS = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        borderBottomWidth: last ? 0 : 1,
        borderColor: COLORS.line,
      }}
    >
      <Ionicons name={icon as any} size={18} color={COLORS.inkSoft} style={{ marginRight: 11 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>{label}</Text>
        <Text style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 2 }}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.line, true: COLORS.greenBorder }}
        thumbColor={value ? COLORS.green : '#FFFFFF'}
      />
    </View>
  );
}
