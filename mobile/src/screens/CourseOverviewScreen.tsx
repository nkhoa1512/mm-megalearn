import React, { useMemo, useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import {
  currentUser as fallbackUser,
  resolveCourseView,
  deriveCertificates,
  deriveLessonStatuses,
} from '../data/mockData';
// @ts-ignore
import { ACCESS_STATE, levelShortLabel } from '../data/levelSystem';
// @ts-ignore
import { getCourseImage } from '../data/courseImages';
// @ts-ignore
import { getAssignedCurriculaForUser } from '../utils/curriculumAssignment';
// @ts-ignore
import { computeLifecycleStatus } from '../utils/courseCatalog';
// @ts-ignore
import { computeCourseRecertification } from '../utils/recertification';
// @ts-ignore
import { pricingOf, formatVnd } from '../utils/costCenter';
import { Badge, ProgressBar, Button, Modal as Sheet, CertificateModal } from '../components/ui';
import { Screen, Card, COLORS, SectionTitle, InfoRow, EmptyState, useColors } from '../components/layout';

const LESSON_ICON: Record<string, string> = {
  SCORM: 'cube-outline',
  VIDEO: 'play-circle-outline',
  PDF: 'document-text-outline',
  PPT: 'easel-outline',
  EXTERNAL_LINK: 'link-outline',
  ASSESSMENT: 'clipboard-outline',
};

const LESSON_TYPE_LABEL: Record<string, string> = {
  SCORM: 'SCORM',
  VIDEO: 'Video',
  PDF: 'Tài liệu PDF',
  PPT: 'Trình chiếu',
  EXTERNAL_LINK: 'Liên kết ngoài',
  ASSESSMENT: 'Bài kiểm tra',
};

const LESSON_STATUS_META: Record<string, { tone: string; label: string }> = {
  COMPLETED: { tone: 'sage', label: 'Xong' },
  IN_PROGRESS: { tone: 'amber', label: 'Đang học' },
  NOT_STARTED: { tone: 'slate', label: 'Chưa học' },
  LOCKED: { tone: 'slate', label: 'Khóa' },
};

export default function CourseOverviewScreen() {
  const COLORS = useColors();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const courseId = route.params?.courseId;

  const {
    courses,
    currentUser: authUser,
    enrollCourse,
    accessFor,
    requestLevelAdvanceApproval,
    myEnrollments,
    curricula,
    certificateTemplates,
  } = useCourseStore();

  const user = authUser || fallbackUser;
  const rawCourse = courses.find((c: any) => c.id === courseId);

  const [requestOpen, setRequestOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [openModules, setOpenModules] = useState<Set<string>>(() => new Set());

  const rawEnrollment = rawCourse ? myEnrollments[rawCourse.id] || rawCourse.enrollment : null;

  // Người đã ghi danh xem snapshot phiên bản đã đóng băng; người chưa ghi danh
  // luôn thấy phiên bản mới nhất (giống bản web).
  const course = useMemo(() => {
    if (!rawCourse) return null;
    const versioned = rawEnrollment ? resolveCourseView(rawCourse, rawEnrollment.enrolledVersion) : rawCourse;
    return {
      ...versioned,
      enrollment: rawEnrollment,
      modules: deriveLessonStatuses(versioned.modules, rawEnrollment),
    };
  }, [rawCourse, rawEnrollment]);

  const certificate = useMemo(() => {
    if (!course) return null;
    return (
      deriveCertificates(courses, user, myEnrollments, certificateTemplates).find(
        (cert: any) => cert.courseId === course.id
      ) || null
    );
  }, [courses, user, course, myEnrollments, certificateTemplates]);

  const recert = useMemo(
    () => computeCourseRecertification(course, course?.enrollment, certificate),
    [course, certificate]
  );

  const parentCurriculum = useMemo(() => {
    if (!courseId) return null;
    return getAssignedCurriculaForUser(curricula, user).find((cur: any) =>
      (cur.courseIds || []).includes(courseId)
    );
  }, [curricula, user, courseId]);

  if (!course) {
    return (
      <Screen title="Khóa học" back>
        <EmptyState icon="alert-circle-outline" title="Không tìm thấy khóa học" hint="Khóa học có thể đã bị gỡ khỏi danh mục." />
      </Screen>
    );
  }

  const pricing = pricingOf(rawCourse);
  const cfg = course.configuration || {};
  const access = accessFor(course, user);

  const allRequiredLessons = (course.modules || []).flatMap((m: any) =>
    (m.lessons || []).filter((l: any) => l.isRequired && l.lessonType !== 'ASSESSMENT')
  );
  const completedRequired = allRequiredLessons.filter((l: any) => l.status === 'COMPLETED').length;
  const completionPct = allRequiredLessons.length
    ? Math.round((completedRequired / allRequiredLessons.length) * 100)
    : 100;

  const unmetPrerequisites = (course.prerequisites || []).filter((pid: string) => {
    const p = courses.find((c: any) => c.id === pid);
    return !p || myEnrollments[pid]?.status !== 'COMPLETED';
  });
  const isPrereqLocked = unmetPrerequisites.length > 0;
  const isLevelLocked = access.isLevelLocked;
  const isRegistrationClosed = !course.enrollment && computeLifecycleStatus(course) === 'CLOSED';
  const assessmentUnlocked =
    ((!isPrereqLocked && !isLevelLocked && completionPct >= 100) || recert.needsRecertification) &&
    cfg.assessmentEnabled;

  const isInPerson = course.deliveryType === 'IN_PERSON_CLASSROOM' || course.modality === 'CLASSROOM_LAB';

  function submitRequest() {
    const result = requestLevelAdvanceApproval(course, justification, user);
    setRequestOpen(false);
    setJustification('');
    setNotice(
      result.ok
        ? 'Đã gửi đơn xin học vượt cấp tới Quản lý trực tiếp. Khóa học sẽ mở ngay khi được phê duyệt.'
        : result.reason || 'Không gửi được đơn xin duyệt.'
    );
  }

  function doEnroll() {
    enrollCourse(course.id, user);
    setPayConfirmOpen(false);
    setNotice('Ghi danh thành công. Bạn có thể bắt đầu bài học đầu tiên ngay bây giờ.');
  }

  function handleEnrollPress() {
    if (pricing.isFree) doEnroll();
    else setPayConfirmOpen(true);
  }

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openLesson(lesson: any) {
    if (!course.enrollment || isLevelLocked || isPrereqLocked) return;
    navigation.navigate('LessonViewer', { courseId: course.id, lessonId: lesson.id });
  }

  return (
    <Screen title={course.title} subtitle={course.code} back>
      {/* Cover */}
      <Card padded={false} style={{ overflow: 'hidden' }}>
        <View style={{ height: 150, backgroundColor: COLORS.sunken }}>
          <Image source={{ uri: getCourseImage(course) }} style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={{ padding: 13 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            <Badge tone={course.courseType === 'MANDATORY' ? 'amber' : 'blue'} size="sm">
              {course.courseType === 'MANDATORY' ? 'Bắt buộc' : 'Tự chọn'}
            </Badge>
            {pricing.isFree ? (
              <Badge tone="sage" size="sm">
                🎁 Miễn phí
              </Badge>
            ) : (
              <Badge tone="amber" size="sm">
                💰 {formatVnd(pricing.price)}
              </Badge>
            )}
            <Badge tone="slate" size="sm">
              {levelShortLabel(course.targetLevel)}
            </Badge>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.ink, lineHeight: 22 }}>{course.title}</Text>
          <Text style={{ fontSize: 11.5, color: COLORS.inkFaint, marginTop: 5 }}>
            {course.category || course.domain} · {course.estimatedDuration || `${course.durationHours || 3}h`} ·{' '}
            {course.version || 'v1.0'}
          </Text>
          {!!course.description && (
            <Text style={{ fontSize: 12.5, color: COLORS.inkSoft, marginTop: 9, lineHeight: 18 }}>
              {course.description}
            </Text>
          )}
        </View>
      </Card>

      {!!notice && (
        <Card style={{ backgroundColor: COLORS.greenSoft, borderColor: COLORS.greenBorder, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="information-circle" size={17} color={COLORS.green} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 12, color: COLORS.greenText, flex: 1, lineHeight: 17 }}>{notice}</Text>
          </View>
        </Card>
      )}

      {/* Recertification banner */}
      {recert.needsRecertification && (
        <Card
          style={{
            backgroundColor: recert.isExpired ? COLORS.redSoft : COLORS.amberSoft,
            borderColor: recert.isExpired ? COLORS.redBorder : COLORS.amberBorder,
            borderLeftWidth: 4,
            borderLeftColor: recert.isExpired ? COLORS.red : COLORS.amber,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons
              name={recert.isExpired ? 'alert-circle' : 'time'}
              size={20}
              color={recert.isExpired ? COLORS.red : COLORS.amber}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: recert.isExpired ? COLORS.redText : COLORS.amberText }}>
                {recert.statusLabel}
              </Text>
              {!!recert.alertMessage && (
                <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 4, lineHeight: 16 }}>
                  {recert.alertMessage}
                </Text>
              )}
            </View>
          </View>
        </Card>
      )}

      {/* Access / enrollment state */}
      {isRegistrationClosed ? (
        <Card style={{ backgroundColor: COLORS.sunken }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="lock-closed" size={18} color={COLORS.inkFaint} style={{ marginRight: 9 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.inkSoft }}>Đã qua thời gian tham gia</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.inkFaint, marginTop: 3, lineHeight: 16 }}>
                Cửa sổ ghi danh của khóa này đã đóng. Bạn vẫn có thể xem cấu trúc chương trình để tham khảo.
              </Text>
            </View>
          </View>
        </Card>
      ) : isLevelLocked ? (
        <Card
          style={{
            backgroundColor: access.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? COLORS.redSoft : COLORS.blueSoft,
            borderColor: access.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? COLORS.redBorder : COLORS.blueBorder,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 11 }}>
            <Ionicons
              name={access.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? 'ban' : 'key'}
              size={20}
              color={access.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? COLORS.red : COLORS.blue}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: '800',
                  color: access.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? COLORS.redText : '#1E40AF',
                }}
              >
                {access.state === ACCESS_STATE.LOCKED_LEVEL_GAP
                  ? 'Chặn nhảy cóc cấp bậc'
                  : access.state === ACCESS_STATE.PENDING_APPROVAL
                  ? 'Đơn xin học vượt cấp đang chờ duyệt'
                  : 'Khóa học thuộc cấp bậc cao hơn'}
              </Text>
              <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 4, lineHeight: 16 }}>
                {access.reason}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 11 }}>
            <Badge tone="rail" size="sm">
              Bạn: {levelShortLabel(user.level)}
            </Badge>
            <Ionicons name="arrow-forward" size={13} color={COLORS.inkFaint} />
            <Badge tone="blue" size="sm">
              Khóa: {levelShortLabel(course.targetLevel)}
            </Badge>
          </View>

          {(access.state === ACCESS_STATE.REQUESTABLE || access.state === ACCESS_STATE.REJECTED) && (
            <Button variant="primary" icon="lock-closed-outline" onPress={() => setRequestOpen(true)}>
              Xin duyệt học vượt cấp
            </Button>
          )}
        </Card>
      ) : isPrereqLocked ? (
        <Card style={{ backgroundColor: COLORS.amberSoft, borderColor: COLORS.amberBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="git-network" size={19} color={COLORS.amber} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.amberText }}>Chưa đủ điều kiện tiên quyết</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 5, lineHeight: 17 }}>
                Cần hoàn thành trước:{' '}
                {unmetPrerequisites
                  .map((pid: string) => courses.find((c: any) => c.id === pid)?.title || pid)
                  .join(' · ')}
              </Text>
            </View>
          </View>
        </Card>
      ) : !course.enrollment ? (
        <Card style={{ backgroundColor: COLORS.greenSoft, borderColor: COLORS.greenBorder }}>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.greenText, marginBottom: 5 }}>
            {access.state === ACCESS_STATE.APPROVED ? 'Đã được duyệt học vượt cấp' : 'Bạn đủ điều kiện tham gia'}
          </Text>
          <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginBottom: 11, lineHeight: 17 }}>
            {pricing.isFree
              ? 'Khóa học nội bộ miễn phí — ghi danh và bắt đầu học ngay.'
              : `Học phí ${formatVnd(pricing.price)}/học viên do trung tâm chi phí của đơn vị bạn chi trả, bạn không phải trả tiền cá nhân.`}
          </Text>
          <Button variant="primary" icon="add-circle-outline" onPress={handleEnrollPress}>
            Ghi danh khóa học
          </Button>
        </Card>
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink }}>Tiến độ của tôi</Text>
            <Badge
              tone={
                recert.needsRecertification
                  ? (recert.badgeTone as any)
                  : course.enrollment.status === 'COMPLETED'
                  ? 'sage'
                  : course.enrollment.status === 'OVERDUE'
                  ? 'rust'
                  : 'amber'
              }
              size="sm"
            >
              {statusLabel(course.enrollment.status)}
            </Badge>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <ProgressBar value={course.enrollment.progressPercent || 0} tone="rail" />
            </View>
            <Text style={{ fontSize: 13.5, fontWeight: '900', color: COLORS.rail }}>
              {course.enrollment.progressPercent || 0}%
            </Text>
          </View>

          <InfoRow label="Bài bắt buộc đã xong" value={`${completedRequired}/${allRequiredLessons.length}`} icon="checkmark-done-outline" />
          <InfoRow label="Ngày ghi danh" value={formatDate(course.enrollment.enrolledAt)} icon="calendar-outline" />
          <InfoRow label="Hạn hoàn thành" value={formatDate(course.enrollment.dueDate)} icon="alarm-outline" />
          {!!parentCurriculum && (
            <InfoRow label="Thuộc chương trình" value={parentCurriculum.title || parentCurriculum.name} icon="albums-outline" />
          )}

          {!!certificate && (
            <Button variant="outline" icon="ribbon-outline" style={{ marginTop: 12 }} onPress={() => setShowCertificate(true)}>
              Xem chứng chỉ đã cấp
            </Button>
          )}
        </Card>
      )}

      {/* In-person workshop pointer */}
      {isInPerson && (
        <Card onPress={() => navigation.navigate('Classrooms')} style={{ backgroundColor: COLORS.railSoft, borderColor: COLORS.railBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="easel" size={19} color={COLORS.rail} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.rail }}>Lớp thực hành trực tiếp (ILT)</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 3, lineHeight: 16 }}>
                Khóa này học tại siêu thị/xưởng. Xem lịch buổi học và quét QR điểm danh.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.rail} />
          </View>
        </Card>
      )}

      {/* Modules & lessons */}
      <SectionTitle icon="list">Cấu trúc chương trình ({(course.modules || []).length} học phần)</SectionTitle>

      {(course.modules || []).map((m: any, idx: number) => {
        const expanded = openModules.has(m.id) || idx === 0;
        const lessons = m.lessons || [];
        const done = lessons.filter((l: any) => l.status === 'COMPLETED').length;
        return (
          <Card key={m.id} padded={false} style={{ overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => toggleModule(m.id)}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 13, backgroundColor: COLORS.sunken }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: COLORS.rail,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.ink }} numberOfLines={2}>
                  {m.title}
                </Text>
                <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginTop: 2 }}>
                  {done}/{lessons.length} bài đã hoàn thành
                </Text>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.inkFaint} />
            </TouchableOpacity>

            {expanded &&
              lessons.map((l: any) => {
                const locked = !course.enrollment || isLevelLocked || isPrereqLocked;
                const meta = LESSON_STATUS_META[locked ? 'LOCKED' : l.status] || LESSON_STATUS_META.NOT_STARTED;
                return (
                  <TouchableOpacity
                    key={l.id}
                    onPress={() => openLesson(l)}
                    activeOpacity={locked ? 1 : 0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 13,
                      paddingVertical: 11,
                      borderTopWidth: 1,
                      borderColor: COLORS.line,
                    }}
                  >
                    <Ionicons
                      name={(LESSON_ICON[l.lessonType] || 'document-outline') as any}
                      size={17}
                      color={locked ? COLORS.inkFaint : COLORS.rail}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: locked ? COLORS.inkFaint : COLORS.ink }} numberOfLines={2}>
                        {l.title}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginTop: 2 }}>
                        {LESSON_TYPE_LABEL[l.lessonType] || l.lessonType} · {l.isRequired ? 'Bắt buộc' : 'Tự chọn'}
                        {l.durationMinutes ? ` · ${l.durationMinutes} phút` : ''}
                      </Text>
                    </View>
                    <Badge tone={meta.tone as any} size="sm">
                      {meta.label}
                    </Badge>
                  </TouchableOpacity>
                );
              })}
          </Card>
        );
      })}

      {/* Final assessment */}
      {cfg.assessmentEnabled && (
        <>
          <SectionTitle icon="clipboard">Bài sát hạch cuối khóa</SectionTitle>
          <Card>
            <InfoRow label="Điểm đạt" value={`${cfg.passingScore || 80}%`} icon="trophy-outline" />
            <InfoRow label="Số lần thi tối đa" value={`${cfg.maxAttempts || 3} lần`} icon="repeat-outline" />
            <InfoRow label="Thời lượng" value={`${cfg.timeLimitMinutes || 30} phút`} icon="stopwatch-outline" />

            <View style={{ marginTop: 12 }}>
              {assessmentUnlocked ? (
                <Button
                  variant="primary"
                  icon="create-outline"
                  onPress={() => navigation.navigate('AssessmentPlayer', { courseId: course.id })}
                >
                  {recert.needsRecertification ? 'Thi tái cấp chứng chỉ' : 'Vào thi sát hạch'}
                </Button>
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.sunken,
                    borderRadius: 9,
                    padding: 11,
                  }}
                >
                  <Ionicons name="lock-closed" size={15} color={COLORS.inkFaint} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, flex: 1, lineHeight: 16 }}>
                    Hoàn thành 100% bài học bắt buộc để mở khóa bài thi ({completionPct}% hiện tại).
                  </Text>
                </View>
              )}
            </View>
          </Card>
        </>
      )}

      {/* Level-advance request sheet */}
      <Sheet visible={requestOpen} onClose={() => setRequestOpen(false)} title="Xin duyệt học vượt cấp">
        <View style={{ paddingBottom: 16 }}>
          <Card style={{ backgroundColor: COLORS.sunken, padding: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink }}>{course.title}</Text>
            <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 3 }}>
              {course.code} · Cấp bậc mục tiêu {levelShortLabel(course.targetLevel)}
            </Text>
          </Card>
          <TextInput
            value={justification}
            onChangeText={setJustification}
            multiline
            textAlignVertical="top"
            placeholder="Nêu lý do bạn cần học vượt cấp khóa này…"
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
          <Button variant="primary" icon="paper-plane-outline" disabled={justification.trim().length < 10} onPress={submitRequest}>
            Gửi đơn xin duyệt
          </Button>
        </View>
      </Sheet>

      {/* Paid-enrollment confirmation */}
      <Sheet visible={payConfirmOpen} onClose={() => setPayConfirmOpen(false)} title="Xác nhận ghi danh khóa có phí">
        <View style={{ paddingBottom: 16 }}>
          <Card style={{ backgroundColor: COLORS.amberSoft, borderColor: COLORS.amberBorder }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.amberText, marginBottom: 6 }}>
              Học phí {formatVnd(pricing.price)}
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.inkSoft, lineHeight: 17 }}>
              Chi phí này do <Text style={{ fontWeight: '800' }}>công ty chi trả</Text> từ ngân sách trung tâm chi phí
              của Khối {user.divisionName || user.divisionCode}. Bạn không phải thanh toán cá nhân — khoản chi sẽ được
              ghi nhận vào sổ chi phí đào tạo của đơn vị.
            </Text>
          </Card>
          <Button variant="primary" icon="checkmark-circle-outline" onPress={doEnroll}>
            Xác nhận ghi danh
          </Button>
        </View>
      </Sheet>

      <CertificateModal
        visible={showCertificate}
        certificate={certificate}
        onClose={() => setShowCertificate(false)}
        onRetake={() => {
          setShowCertificate(false);
          navigation.navigate('AssessmentPlayer', { courseId: course.id });
        }}
      />
    </Screen>
  );
}

function statusLabel(status?: string) {
  switch (status) {
    case 'COMPLETED':
      return 'Đã hoàn thành';
    case 'IN_PROGRESS':
      return 'Đang học';
    case 'OVERDUE':
      return 'Quá hạn';
    case 'FAILED':
      return 'Cần thi lại';
    default:
      return 'Chưa bắt đầu';
  }
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}
