import React, { useMemo, useState } from 'react';
import { FlatList, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import { currentUser as fallbackUser, deriveCertificates } from '../data/mockData';
// @ts-ignore
import { getCourseImage } from '../data/courseImages';
// @ts-ignore
import { ACCESS_STATE, levelDefinition, levelShortLabel, nextLevelUp, normalizeLevel } from '../data/levelSystem';
// @ts-ignore
import { courseFormatBadge, courseMatchesCategory } from '../utils/courseCatalog';
// @ts-ignore
import { computeCourseRecertification } from '../utils/recertification';
// @ts-ignore
import { getAssignedCurriculaForUser, getCurriculumProgress } from '../utils/curriculumAssignment';
import { Badge, ProgressBar, Button, Modal as Sheet } from '../components/ui';
import { Screen, Card, COLORS, ChipRow, Segmented, EmptyState, SectionTitle, InfoRow, useColors } from '../components/layout';

const STATUS_META: Record<string, { tone: string; label: string }> = {
  IN_PROGRESS: { tone: 'amber', label: 'Đang Học' },
  NOT_STARTED: { tone: 'slate', label: 'Chưa Bắt Đầu' },
  COMPLETED: { tone: 'sage', label: 'Hoàn Thành' },
  FAILED: { tone: 'rust', label: 'Cần Thi Lại' },
  OVERDUE: { tone: 'rust', label: 'Quá Hạn' },
};

export default function CoursesScreen() {
  const COLORS = useColors();
  const navigation = useNavigation<any>();
  const {
    courses: allCourses,
    currentUser: authUser,
    enrollCourse,
    accessFor,
    requestLevelAdvanceApproval,
    myCourses,
    myEnrollments,
    curricula,
    companyCategories,
    certificateTemplates,
  } = useCourseStore();

  const user = authUser || fallbackUser;
  const userLevel = normalizeLevel(user.level);
  const userLevelDef = levelDefinition(userLevel);
  const oneLevelUp = nextLevelUp(userLevel);

  const [tab, setTab] = useState<'MINE' | 'CATALOG'>('MINE');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [gateOpen, setGateOpen] = useState(false);
  const [requestCourse, setRequestCourse] = useState<any>(null);
  const [justification, setJustification] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const enrolledCourses = useMemo(() => myCourses(allCourses, user), [allCourses, user, myCourses]);
  const assignedCurricula = useMemo(
    () => getAssignedCurriculaForUser(curricula, user),
    [curricula, user]
  );

  const certificates = useMemo(
    () => deriveCertificates(allCourses, user, myEnrollments, certificateTemplates),
    [allCourses, user, myEnrollments, certificateTemplates]
  );

  const recertById = useMemo(() => {
    const map: Record<string, any> = {};
    enrolledCourses.forEach((c: any) => {
      map[c.id] = computeCourseRecertification(
        c,
        c.enrollment,
        certificates.find((cert: any) => cert.courseId === c.id)
      );
    });
    return map;
  }, [enrolledCourses, certificates]);

  const sourceList = tab === 'MINE' ? enrolledCourses : allCourses;

  const accessById = useMemo(() => {
    const map: Record<string, any> = {};
    sourceList.forEach((c: any) => {
      map[c.id] = accessFor(c, user);
    });
    return map;
  }, [sourceList, accessFor, user]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sourceList.filter((c: any) => {
      const access = accessById[c.id];
      const s = c.enrollment?.status;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'RECERTIFICATION' && recertById[c.id]?.needsRecertification) ||
        (statusFilter === 'MANDATORY' && c.courseType === 'MANDATORY') ||
        (statusFilter === 'IN_PERSON' && (c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB')) ||
        (statusFilter === 'VIRTUAL_CLASS' && c.onlineClassType === 'VIRTUAL_CLASS') ||
        (statusFilter === 'LEVEL_UP' && access?.state === ACCESS_STATE.REQUESTABLE) ||
        (statusFilter === 'PENDING_APPROVAL' && access?.state === ACCESS_STATE.PENDING_APPROVAL) ||
        s === statusFilter;

      const matchCategory = courseMatchesCategory(c, categoryFilter);
      const matchSearch =
        !q ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        (c.domain || '').toLowerCase().includes(q);

      return matchStatus && matchCategory && matchSearch;
    });
  }, [sourceList, accessById, statusFilter, categoryFilter, search, recertById]);

  const statusOptions = useMemo(() => {
    if (tab === 'MINE') {
      return [
        { value: 'ALL', label: 'Tất cả', count: enrolledCourses.length },
        { value: 'IN_PROGRESS', label: 'Đang học', count: countBy(enrolledCourses, 'IN_PROGRESS') },
        { value: 'NOT_STARTED', label: 'Chưa bắt đầu', count: countBy(enrolledCourses, 'NOT_STARTED') },
        { value: 'COMPLETED', label: 'Hoàn thành', count: countBy(enrolledCourses, 'COMPLETED') },
        { value: 'OVERDUE', label: 'Quá hạn', count: countBy(enrolledCourses, 'OVERDUE') },
        {
          value: 'MANDATORY',
          label: 'Bắt buộc',
          count: enrolledCourses.filter((c: any) => c.courseType === 'MANDATORY').length,
        },
        {
          value: 'RECERTIFICATION',
          label: 'Tái cấp',
          count: enrolledCourses.filter((c: any) => recertById[c.id]?.needsRecertification).length,
        },
      ];
    }
    return [
      { value: 'ALL', label: 'Tất cả', count: allCourses.length },
      { value: 'MANDATORY', label: 'Bắt buộc' },
      { value: 'IN_PERSON', label: 'Lớp trực tiếp' },
      { value: 'VIRTUAL_CLASS', label: 'Lớp online' },
      { value: 'LEVEL_UP', label: 'Xin vượt cấp' },
      { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
    ];
  }, [tab, enrolledCourses, allCourses, recertById]);

  const categoryOptions = useMemo(() => {
    const names: string[] = [
      ...new Set(
        allCourses
          .flatMap((c: any) => (c.categories && c.categories.length ? c.categories : [c.category]))
          .filter(Boolean)
      ),
    ] as string[];
    return [
      { value: 'ALL', label: 'Mọi lĩnh vực' },
      ...names.sort((a, b) => a.localeCompare(b)).map((n) => ({ value: n, label: n })),
    ];
  }, [allCourses]);

  // Tiến độ chương trình của đúng cấp bậc hiện tại — điều kiện để lên cấp kế tiếp.
  const myLevelCourses = enrolledCourses.filter((c: any) => normalizeLevel(c.targetLevel) === userLevel);
  const myLevelDone = myLevelCourses.filter((c: any) => c.enrollment?.status === 'COMPLETED').length;
  const myLevelPct = myLevelCourses.length ? Math.round((myLevelDone / myLevelCourses.length) * 100) : 0;

  const catalogAccess = useMemo(() => allCourses.map((c: any) => accessFor(c, user)), [allCourses, accessFor, user]);
  const requestableCount = catalogAccess.filter((a: any) => a.state === ACCESS_STATE.REQUESTABLE).length;
  const pendingCount = catalogAccess.filter((a: any) => a.state === ACCESS_STATE.PENDING_APPROVAL).length;
  const lockedCount = catalogAccess.filter((a: any) => a.state === ACCESS_STATE.LOCKED_LEVEL_GAP).length;

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  }

  function submitRequest() {
    if (!requestCourse) return;
    const result = requestLevelAdvanceApproval(requestCourse, justification, user);
    const title = requestCourse.title;
    setRequestCourse(null);
    setJustification('');
    showToast(
      result.ok
        ? `Đã gửi đơn xin học vượt cấp khóa "${title}" tới Quản lý trực tiếp.`
        : result.reason || 'Không gửi được đơn xin duyệt.'
    );
  }

  function startCourse(course: any, access: any) {
    if (!access?.canAccess) return;
    enrollCourse(course.id, user);
    navigation.navigate('CourseOverview', { courseId: course.id });
  }

  return (
    <Screen
      title="Khóa Học"
      subtitle={`${enrolledCourses.length} khóa đang theo dõi · ${levelShortLabel(userLevel)}`}
      scroll={false}
    >
      <FlatList
        data={filtered}
        keyExtractor={(c: any) => c.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        ListHeaderComponent={
          <View>
            <Segmented
              options={[
                { value: 'MINE', label: `Của tôi (${enrolledCourses.length})` },
                { value: 'CATALOG', label: `Danh mục (${allCourses.length})` },
              ]}
              value={tab}
              onChange={(v) => {
                setTab(v as any);
                setStatusFilter('ALL');
              }}
            />

            {!!toast && (
              <Card style={{ backgroundColor: COLORS.greenSoft, borderColor: COLORS.greenBorder, padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark-circle" size={17} color={COLORS.green} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 12, color: COLORS.greenText, fontWeight: '600', flex: 1, lineHeight: 17 }}>
                    {toast}
                  </Text>
                </View>
              </Card>
            )}

            {/* Level gate summary */}
            <Card onPress={() => setGateOpen(!gateOpen)} style={{ borderLeftWidth: 4, borderLeftColor: COLORS.blue }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="trending-up" size={16} color={COLORS.blue} style={{ marginRight: 7 }} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink, flex: 1 }}>
                  Lộ trình vượt cấp tuần tự
                </Text>
                <Ionicons name={gateOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.inkFaint} />
              </View>

              {/* levelShortLabel trả về chuỗi dài ("🟢 Level 6: Chuyên viên /
                  Nhân viên nghiệp vụ"). Hai badge nằm cùng hàng sẽ vượt mép
                  phải, nên xếp dọc: cấp hiện tại -> mũi tên -> cấp kế tiếp. */}
              <View style={{ marginTop: 9 }}>
                <Badge tone="rail" size="sm">
                  {levelShortLabel(userLevel)}
                </Badge>
                <Ionicons
                  name="arrow-down"
                  size={13}
                  color={COLORS.inkFaint}
                  style={{ marginVertical: 3, marginLeft: 9 }}
                />
                {oneLevelUp ? (
                  <Badge tone="blue" size="sm">
                    {levelShortLabel(oneLevelUp)}
                  </Badge>
                ) : (
                  <Badge tone="sage" size="sm">
                    Đã ở cấp cao nhất
                  </Badge>
                )}
              </View>

              <View style={{ marginTop: 11 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                    Chương trình Level {userLevel} · {userLevelDef.titleVi}
                  </Text>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: COLORS.rail }}>
                    {myLevelDone}/{myLevelCourses.length} ({myLevelPct}%)
                  </Text>
                </View>
                <ProgressBar value={myLevelPct} tone="rail" size="sm" />
              </View>

              {gateOpen && (
                <View style={{ marginTop: 12 }}>
                  <InfoRow label="Được phép xin vượt 1 cấp" value={`${requestableCount} khóa`} icon="key-outline" />
                  <InfoRow label="Đơn đang chờ duyệt" value={`${pendingCount} khóa`} icon="time-outline" />
                  <InfoRow
                    label="Chặn nhảy cóc ≥ 2 cấp"
                    value={`${lockedCount} khóa`}
                    icon="lock-closed-outline"
                    valueColor={COLORS.red}
                  />
                  <Text style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 9, lineHeight: 16 }}>
                    Bạn chỉ được xin học vượt đúng 1 cấp so với cấp bậc hiện tại. Đơn xin sẽ gửi tới Quản lý trực tiếp
                    phê duyệt.
                  </Text>
                </View>
              )}
            </Card>

            {/* Curricula assigned to the learner */}
            {tab === 'MINE' && assignedCurricula.length > 0 && (
              <>
                <SectionTitle icon="albums">Chương trình được giao ({assignedCurricula.length})</SectionTitle>
                {assignedCurricula.slice(0, 3).map((cur: any) => {
                  const progress = getCurriculumProgress(cur, user, myEnrollments, allCourses);
                  return (
                    <Card key={cur.id} style={{ padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="school" size={15} color={COLORS.purple} style={{ marginRight: 7 }} />
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.ink, flex: 1 }} numberOfLines={2}>
                          {cur.title || cur.name}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <ProgressBar value={progress.progressPercent} tone="rail" size="sm" />
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.rail }}>
                          {progress.completedCourses}/{progress.totalCourses}
                        </Text>
                      </View>
                    </Card>
                  );
                })}
              </>
            )}

            {/* Search */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.paper,
                borderWidth: 1,
                borderColor: COLORS.line,
                borderRadius: 10,
                paddingHorizontal: 10,
                marginTop: 6,
                marginBottom: 10,
              }}
            >
              <Ionicons name="search" size={15} color={COLORS.inkFaint} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm khóa học, mã khóa, chuyên ngành…"
                placeholderTextColor={COLORS.inkFaint}
                style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: 13, color: COLORS.ink }}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.inkFaint} />
                </TouchableOpacity>
              )}
            </View>

            <ChipRow options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
            <ChipRow options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} />

            <Text style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 10 }}>
              Hiển thị {filtered.length} khóa học
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="Không có khóa học phù hợp"
            hint="Thử xoá bớt bộ lọc hoặc đổi từ khoá tìm kiếm."
          />
        }
        renderItem={({ item }: { item: any }) => (
          <CourseRow
            course={item}
            access={accessById[item.id]}
            recert={recertById[item.id]}
            onOpen={() => navigation.navigate('CourseOverview', { courseId: item.id })}
            onStart={() => startCourse(item, accessById[item.id])}
            onRequest={() => {
              setRequestCourse(item);
              setJustification('');
            }}
            onClassroom={() => navigation.navigate('Classrooms')}
          />
        )}
      />

      {/* Level-advance request sheet */}
      <Sheet
        visible={!!requestCourse}
        onClose={() => setRequestCourse(null)}
        title="Xin duyệt học vượt cấp"
      >
        {!!requestCourse && (
          <View style={{ paddingBottom: 16 }}>
            <Card style={{ backgroundColor: COLORS.sunken, padding: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink }}>{requestCourse.title}</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 3 }}>
                {requestCourse.code} · Cấp bậc mục tiêu {levelShortLabel(requestCourse.targetLevel)}
              </Text>
            </Card>

            <Text style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 8, lineHeight: 17 }}>
              Khóa này thuộc cấp bậc cao hơn cấp hiện tại của bạn ({levelShortLabel(userLevel)}). Nêu lý do để Quản lý
              trực tiếp xem xét phê duyệt.
            </Text>

            <TextInput
              value={justification}
              onChangeText={setJustification}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholder="VD: Tôi đang được phân công hỗ trợ ca trưởng quầy bánh và cần nắm quy trình cấp cao hơn…"
              placeholderTextColor={COLORS.inkFaint}
              style={{
                borderWidth: 1,
                borderColor: COLORS.line,
                borderRadius: 10,
                padding: 11,
                fontSize: 13,
                color: COLORS.ink,
                minHeight: 110,
                marginBottom: 14,
                backgroundColor: COLORS.paper,
              }}
            />

            <Button
              variant="primary"
              icon="paper-plane-outline"
              disabled={justification.trim().length < 10}
              onPress={submitRequest}
            >
              Gửi đơn xin duyệt
            </Button>
            <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, textAlign: 'center', marginTop: 8 }}>
              Cần ít nhất 10 ký tự lý do.
            </Text>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

function CourseRow({
  course,
  access,
  recert,
  onOpen,
  onStart,
  onRequest,
  onClassroom,
}: {
  course: any;
  access: any;
  recert: any;
  onOpen: () => void;
  onStart: () => void;
  onRequest: () => void;
  onClassroom: () => void;
}) {
  const COLORS = useColors();
  const enr = course.enrollment;
  const status = STATUS_META[enr?.status] || null;
  const format = courseFormatBadge(course);
  const isInPerson = course.deliveryType === 'IN_PERSON_CLASSROOM' || course.modality === 'CLASSROOM_LAB';

  return (
    <Card onPress={onOpen} style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row' }}>
        <Image
          source={{ uri: getCourseImage(course) }}
          style={{ width: 58, height: 58, borderRadius: 9, backgroundColor: COLORS.sunken, marginRight: 11 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink, lineHeight: 18 }} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginTop: 3 }} numberOfLines={1}>
            {/* Không phải khóa nào cũng có số giờ — tránh hiển thị "—h" vô nghĩa. */}
            {course.code} · {course.category || course.domain}
            {course.durationHours || course.duration ? ` · ${course.durationHours || course.duration}h` : ''}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
            <Badge tone={format.tone as any} size="sm">
              {format.icon} {format.label}
            </Badge>
            {course.courseType === 'MANDATORY' && (
              <Badge tone="amber" size="sm">
                Bắt buộc
              </Badge>
            )}
            {!!status && (
              <Badge tone={status.tone as any} size="sm">
                {status.label}
              </Badge>
            )}
            {access?.state === ACCESS_STATE.LOCKED_LEVEL_GAP && (
              <Badge tone="slate" size="sm">
                ⛔ Khóa cấp bậc
              </Badge>
            )}
            {access?.state === ACCESS_STATE.PENDING_APPROVAL && (
              <Badge tone="amber" size="sm">
                ⏳ Chờ duyệt
              </Badge>
            )}
          </View>
        </View>
      </View>

      {!!enr && enr.status !== 'COMPLETED' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <ProgressBar value={enr.progressPercent || 0} tone="rail" size="sm" />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.amber }}>{enr.progressPercent || 0}%</Text>
        </View>
      )}

      {recert?.needsRecertification && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: recert.isExpired ? COLORS.redSoft : COLORS.amberSoft,
            borderRadius: 8,
            padding: 8,
            marginTop: 9,
          }}
        >
          <Ionicons
            name={recert.isExpired ? 'alert-circle' : 'time'}
            size={14}
            color={recert.isExpired ? COLORS.red : COLORS.amber}
            style={{ marginRight: 6 }}
          />
          <Text style={{ fontSize: 11, color: COLORS.inkSoft, flex: 1 }} numberOfLines={2}>
            {recert.statusLabel}
          </Text>
        </View>
      )}

      <View style={{ marginTop: 10 }}>
        {renderAction()}
      </View>
    </Card>
  );

  function renderAction() {
    switch (access?.state) {
      case ACCESS_STATE.LOCKED_LEVEL_GAP:
        return (
          <Button size="sm" variant="outline" icon="ban-outline" disabled>
            Chặn nhảy cóc cấp bậc
          </Button>
        );
      case ACCESS_STATE.PENDING_APPROVAL:
        return (
          <Button size="sm" variant="outline" icon="time-outline" disabled>
            Đang chờ quản lý duyệt
          </Button>
        );
      case ACCESS_STATE.REJECTED:
      case ACCESS_STATE.REQUESTABLE:
        return (
          <Button size="sm" variant="primary" icon="lock-closed-outline" onPress={onRequest}>
            Xin duyệt vượt cấp
          </Button>
        );
      default:
        break;
    }

    if (recert?.needsRecertification) {
      return (
        <Button
          size="sm"
          variant="primary"
          tone={recert.isExpired ? 'danger' : 'primary'}
          icon="refresh-outline"
          onPress={onOpen}
        >
          {recert.actionLabel}
        </Button>
      );
    }

    if (isInPerson) {
      return (
        <Button size="sm" variant="primary" icon="calendar-outline" onPress={onClassroom}>
          Xem lịch & QR điểm danh
        </Button>
      );
    }

    if (enr) {
      const isCompleted = enr.status === 'COMPLETED';
      const isFailed = enr.status === 'FAILED';
      return (
        <Button
          size="sm"
          variant={isCompleted ? 'outline' : 'primary'}
          icon={isCompleted ? 'refresh-outline' : isFailed ? 'reload-outline' : 'play-outline'}
          onPress={onOpen}
        >
          {isCompleted ? 'Ôn tập lại' : isFailed ? 'Thi lại' : enr.progressPercent > 0 ? 'Học tiếp' : 'Bắt đầu học'}
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant={access?.state === ACCESS_STATE.APPROVED ? 'primary' : 'outline'}
        icon={access?.state === ACCESS_STATE.APPROVED ? 'play-outline' : 'add-outline'}
        onPress={onStart}
      >
        {access?.state === ACCESS_STATE.APPROVED ? 'Vào học ngay' : 'Đăng ký học'}
      </Button>
    );
  }
}

function countBy(courses: any[], status: string) {
  return courses.filter((c) => c.enrollment?.status === status).length;
}
