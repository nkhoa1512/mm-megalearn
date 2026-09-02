import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import {
  applyLessonProgress,
  currentUser as fallbackUser,
  resolveCourseView,
  deriveLessonStatuses,
} from '../data/mockData';
// @ts-ignore
import { levelShortLabel } from '../data/levelSystem';
// @ts-ignore
import { computeLifecycleStatus } from '../utils/courseCatalog';
import { Badge, Button, ProgressBar, PostTrainingSurveyModal } from '../components/ui';
import { Screen, Card, COLORS, EmptyState, InfoRow, useColors } from '../components/layout';

const TYPE_LABEL: Record<string, string> = {
  SCORM: 'Gói tương tác SCORM 2004',
  VIDEO: 'Bài giảng video',
  PDF: 'Quy trình chuẩn (SOP PDF)',
  PPT: 'Bộ trình chiếu',
  EXTERNAL_LINK: 'Nền tảng ngoài (Udemy / LinkedIn / Coursera)',
};

export default function LessonViewerScreen() {
  const COLORS = useColors();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { courseId, lessonId } = route.params || {};

  const { courses, saveCourseProgress, currentUser: authUser, accessFor, myEnrollments } = useCourseStore();
  const user = authUser || fallbackUser;
  const [surveyOpen, setSurveyOpen] = useState(false);

  const rawCourse = courses.find((c: any) => c.id === courseId);
  const enrollment = rawCourse ? myEnrollments[rawCourse.id] || rawCourse.enrollment : null;

  const course = useMemo(() => {
    if (!rawCourse) return null;
    const versioned = enrollment ? resolveCourseView(rawCourse, enrollment.enrolledVersion) : rawCourse;
    return { ...versioned, enrollment, modules: deriveLessonStatuses(versioned.modules, enrollment) };
  }, [rawCourse, enrollment]);

  const flat = useMemo(
    () =>
      course
        ? (course.modules || []).flatMap((m: any) => (m.lessons || []).map((l: any) => ({ ...l, moduleId: m.id })))
        : [],
    [course]
  );
  const lesson = flat.find((l: any) => l.id === lessonId);
  const currentIndex = flat.findIndex((l: any) => l.id === lessonId);
  const nextLesson = currentIndex >= 0 ? flat[currentIndex + 1] : null;

  if (!course || !lesson) {
    return (
      <Screen title="Bài học" back>
        <EmptyState icon="alert-circle-outline" title="Không tìm thấy bài học" />
      </Screen>
    );
  }

  const access = accessFor(course, user);
  if (access.isLevelLocked) {
    return (
      <Screen title="Bài học bị khóa" back>
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Ionicons name="lock-closed" size={42} color={COLORS.red} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.ink, marginTop: 12, textAlign: 'center' }}>
            Khóa học chưa mở theo quy tắc cấp bậc
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 11 }}>
            <Badge tone="rail" size="sm">
              {levelShortLabel(access.userLevel)}
            </Badge>
            <Ionicons name="arrow-forward" size={13} color={COLORS.inkFaint} />
            <Badge tone="blue" size="sm">
              {levelShortLabel(access.courseLevel)}
            </Badge>
          </View>
          <Text style={{ fontSize: 12, color: COLORS.inkSoft, textAlign: 'center', marginBottom: 16, lineHeight: 17 }}>
            {access.reason}
          </Text>
          <Button variant="primary" onPress={() => navigation.navigate('CourseOverview', { courseId: course.id })}>
            Xem chi tiết & xin phê duyệt
          </Button>
        </Card>
      </Screen>
    );
  }

  if (!enrollment && computeLifecycleStatus(course) === 'CLOSED') {
    return (
      <Screen title="Bài học" back>
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Ionicons name="lock-closed" size={42} color={COLORS.red} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.ink, marginTop: 12, textAlign: 'center' }}>
            Khóa học đã qua thời gian tham gia
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.inkSoft, textAlign: 'center', marginTop: 8, marginBottom: 16, lineHeight: 17 }}>
            Cửa sổ ghi danh đã hết hạn và bạn chưa từng đăng ký, nên không thể vào học.
          </Text>
          <Button variant="primary" onPress={() => navigation.navigate('CourseOverview', { courseId: course.id })}>
            Quay lại chi tiết khóa học
          </Button>
        </Card>
      </Screen>
    );
  }

  function complete(extra?: any) {
    const updated = applyLessonProgress(course, lesson.id, {
      status: 'COMPLETED',
      progressPercent: 100,
      ...extra,
    });
    saveCourseProgress(course.id, updated, user, enrollment?.enrolledVersion);
  }

  const isComplete = lesson.status === 'COMPLETED';

  return (
    <Screen title={lesson.title} subtitle={course.title} back>
      <Card style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          <Badge tone={isComplete ? 'sage' : 'amber'} size="sm">
            {isComplete ? 'Đã hoàn thành' : 'Đang học'}
          </Badge>
          <Badge tone={course.courseType === 'MANDATORY' ? 'amber' : 'rail'} size="sm">
            {course.courseType === 'MANDATORY' ? 'Bắt buộc' : 'Tự chọn'}
          </Badge>
          <Badge tone="slate" size="sm">
            {course.version || course.currentVersion || 'v1.0'}
          </Badge>
        </View>
        <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, lineHeight: 16 }}>
          {TYPE_LABEL[lesson.lessonType] || 'Bài học'} · {lesson.isRequired ? 'Bắt buộc' : 'Tự chọn'}
          {lesson.durationMinutes ? ` · ${lesson.durationMinutes} phút` : ''}
        </Text>
        {course.isArchivedVersionView && (
          <Text style={{ fontSize: 11, color: COLORS.amber, marginTop: 6, lineHeight: 16 }}>
            Bạn đang học theo cấu trúc bài giảng của phiên bản đã ghi danh, không phải bản cập nhật mới nhất.
          </Text>
        )}
      </Card>

      {/* Player canvas theo đúng 5 định dạng chuẩn hóa của lesson.lessonType */}
      {lesson.lessonType === 'SCORM' ? (
        <ScormPlayer lesson={lesson} onComplete={complete} />
      ) : lesson.lessonType === 'PPT' ? (
        <SlidePlayer lesson={lesson} onComplete={complete} />
      ) : lesson.lessonType === 'EXTERNAL_LINK' ? (
        <ExternalPlayer lesson={lesson} onComplete={complete} />
      ) : lesson.lessonType === 'PDF' ? (
        <PdfPlayer lesson={lesson} onComplete={complete} />
      ) : (
        <VideoPlayer lesson={lesson} onComplete={complete} />
      )}

      <Button variant="outline" icon="star-outline" onPress={() => setSurveyOpen(true)} style={{ marginTop: 4 }}>
        Đánh giá bài học (L1 CSAT)
      </Button>

      {/* Bottom navigation */}
      <View style={{ marginTop: 14, gap: 9 }}>
        {isComplete && nextLesson && nextLesson.lessonType !== 'ASSESSMENT' && (
          <Button
            variant="primary"
            icon="arrow-forward"
            iconPosition="right"
            onPress={() =>
              navigation.replace('LessonViewer', { courseId: course.id, lessonId: nextLesson.id })
            }
          >
            Bài học tiếp theo
          </Button>
        )}
        {isComplete && (!nextLesson || nextLesson.lessonType === 'ASSESSMENT') && (
          <Button
            variant="primary"
            icon="create-outline"
            onPress={() => navigation.navigate('AssessmentPlayer', { courseId: course.id })}
          >
            Vào bài thi cuối khóa
          </Button>
        )}
        <Button variant="outline" icon="arrow-back" onPress={() => navigation.navigate('CourseOverview', { courseId: course.id })}>
          Quay lại tổng quan khóa học
        </Button>
      </View>

      <PostTrainingSurveyModal
        visible={surveyOpen}
        course={course}
        type="L1"
        onClose={() => setSurveyOpen(false)}
        onSubmit={() => {}}
      />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// SCORM — mô phỏng gói tương tác 5 slide, có 1 slide câu hỏi tình huống.
// ---------------------------------------------------------------------------
const SCORM_SLIDES = [
  {
    title: 'Slide 1/5 · Giới thiệu & Tiêu chuẩn HACCP chuỗi lạnh',
    content:
      'Gói SCORM 2004 chuẩn quốc tế của MM Mega Market & Big C. Hệ thống tự ghi nhận thời lượng học, tương tác câu hỏi và điểm đánh dấu để bạn học tiếp từ chỗ đang dở.',
    tip: 'Khu chế biến bánh và thực phẩm tươi phải duy trì liên tục nhiệt độ 18°C – 22°C.',
  },
  {
    title: 'Slide 2/5 · Quy trình chuỗi lạnh & nhật ký kiểm tra',
    content:
      'Kiểm tra cảm biến nhiệt kho lạnh mỗi 120 phút. Nếu lệch quá ±2°C, ghi vào biểu mẫu SOP-OMD-04B và báo ngay Giám sát ca.',
    tip: 'Không để cửa kho đông mở quá 3 phút liên tục trong giờ cao điểm châm hàng.',
  },
  {
    title: 'Slide 3/5 · Tình huống vận hành tương tác',
    interactive: true,
    question: 'Phát hiện mẻ bánh vừa ra lò có nhiệt độ lõi dưới 75°C, thao tác bắt buộc theo SOP là gì?',
    options: [
      { text: 'Đóng gói và bày bán ngay với giá giảm', correct: false },
      { text: 'Cách ly mẻ bánh, đo lại nhiệt độ lõi và báo Giám sát để nướng lại', correct: true },
      { text: 'Bỏ qua nếu vỏ bánh trông đã vàng đều', correct: false },
    ],
  },
  {
    title: 'Slide 4/5 · Khử trùng thiết bị & vệ sinh bề mặt',
    content:
      'Khử trùng máy trộn bột và dụng cụ cắt bằng dung dịch chlorine 100ppm vào cuối mỗi ca, lau khô hoàn toàn bằng khăn microfiber vô trùng.',
    tip: 'Luôn đeo găng tay vệ sinh và lưới tóc khi tiếp xúc thực phẩm hở.',
  },
  {
    title: 'Slide 5/5 · Hoàn tất gói SCORM & ghi nhận CMI5',
    content:
      'Chúc mừng bạn đã hoàn thành gói SCORM. Thời lượng học, điểm đánh dấu và kết quả tương tác đã được ghi vào mô hình dữ liệu CMI của LMS.',
  },
];

function ScormPlayer({ lesson, onComplete }: { lesson: any; onComplete: (extra?: any) => void }) {
  const COLORS = useColors();
  const [slide, setSlide] = useState(1);
  const [answered, setAnswered] = useState<number | null>(null);
  const current = SCORM_SLIDES[slide - 1];
  const total = SCORM_SLIDES.length;

  function next() {
    if (slide < total) {
      setSlide(slide + 1);
      setAnswered(null);
    } else {
      onComplete({ progressPercent: 100 });
    }
  }

  return (
    <Card padded={false} style={{ backgroundColor: '#0F172A', borderColor: '#1E293B', padding: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
          paddingBottom: 10,
          marginBottom: 14,
        }}
      >
        <View style={{ backgroundColor: COLORS.green, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' }}>SCORM 2004</Text>
        </View>
        <Text style={{ color: COLORS.inkFaint, fontSize: 11 }}>
          Slide {slide}/{total}
        </Text>
      </View>

      <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.bg, marginBottom: 10, lineHeight: 21 }}>
        {current.title}
      </Text>

      {!!current.content && (
        <Text style={{ fontSize: 13, color: COLORS.lineStrong, lineHeight: 20, marginBottom: 12 }}>{current.content}</Text>
      )}

      {!!current.tip && (
        <View
          style={{
            backgroundColor: 'rgba(0,158,73,0.22)',
            borderLeftWidth: 3,
            borderLeftColor: COLORS.green,
            padding: 11,
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: COLORS.line, lineHeight: 18 }}>💡 {current.tip}</Text>
        </View>
      )}

      {current.interactive && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.bg, marginBottom: 10, lineHeight: 19 }}>
            {current.question}
          </Text>
          {current.options?.map((opt: any, i: number) => {
            const picked = answered === i;
            const reveal = answered !== null;
            const bg = !reveal
              ? 'rgba(255,255,255,0.08)'
              : opt.correct
              ? 'rgba(0,158,73,0.3)'
              : picked
              ? 'rgba(220,38,38,0.3)'
              : 'rgba(255,255,255,0.06)';
            return (
              <TouchableOpacity
                key={i}
                onPress={() => answered === null && setAnswered(i)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: bg,
                  borderRadius: 8,
                  padding: 11,
                  marginBottom: 7,
                  borderWidth: 1,
                  borderColor: reveal && opt.correct ? COLORS.green : 'rgba(255,255,255,0.12)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {reveal && (
                    <Ionicons
                      name={opt.correct ? 'checkmark-circle' : picked ? 'close-circle' : 'ellipse-outline'}
                      size={15}
                      color={opt.correct ? '#4ADE80' : picked ? '#F87171' : COLORS.inkSoft}
                      style={{ marginRight: 7, marginTop: 1 }}
                    />
                  )}
                  <Text style={{ fontSize: 12.5, color: COLORS.line, flex: 1, lineHeight: 18 }}>{opt.text}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Button
        variant="primary"
        icon={slide < total ? 'arrow-forward' : 'checkmark-circle'}
        iconPosition={slide < total ? 'right' : 'left'}
        disabled={!!current.interactive && answered === null}
        onPress={next}
      >
        {slide < total ? 'Slide tiếp theo' : 'Hoàn tất gói SCORM'}
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PPT — trình chiếu từng trang.
// ---------------------------------------------------------------------------
function SlidePlayer({ lesson, onComplete }: { lesson: any; onComplete: (extra?: any) => void }) {
  const COLORS = useColors();
  const total = lesson.slideCount || 12;
  const [slide, setSlide] = useState(1);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="easel" size={16} color={COLORS.amber} style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.ink }}>Bộ trình chiếu</Text>
        </View>
        <Text style={{ fontSize: 11.5, color: COLORS.inkFaint }}>
          Trang {slide}/{total}
        </Text>
      </View>

      <View
        style={{
          aspectRatio: 4 / 3,
          backgroundColor: COLORS.sunken,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: COLORS.line,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          marginBottom: 12,
        }}
      >
        <Ionicons name="document-text-outline" size={40} color={COLORS.inkFaint} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.inkSoft, marginTop: 10, textAlign: 'center' }}>
          {lesson.title}
        </Text>
        <Text style={{ fontSize: 11.5, color: COLORS.inkFaint, marginTop: 6, textAlign: 'center' }}>
          Trang {slide} / {total}
        </Text>
      </View>

      <ProgressBar value={(slide / total) * 100} tone="amber" size="sm" />

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Button
          size="sm"
          variant="outline"
          icon="chevron-back"
          style={{ flex: 1 }}
          disabled={slide <= 1}
          onPress={() => setSlide((s) => Math.max(1, s - 1))}
        >
          Trước
        </Button>
        {slide < total ? (
          <Button size="sm" variant="primary" icon="chevron-forward" iconPosition="right" style={{ flex: 1 }} onPress={() => setSlide((s) => s + 1)}>
            Tiếp
          </Button>
        ) : (
          <Button size="sm" variant="primary" icon="checkmark" style={{ flex: 1 }} onPress={() => onComplete({ progressPercent: 100 })}>
            Hoàn thành
          </Button>
        )}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// VIDEO — mô phỏng phát video, tự đánh dấu hoàn thành khi đạt ngưỡng xem.
// ---------------------------------------------------------------------------
function VideoPlayer({ lesson, onComplete }: { lesson: any; onComplete: (extra?: any) => void }) {
  const COLORS = useColors();
  const [playing, setPlaying] = useState(false);
  const [percent, setPercent] = useState(lesson.progressPercent || 0);
  const required = lesson.requiredWatchPercent || 90;
  const completedRef = useRef(lesson.status === 'COMPLETED');

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      setPercent((prev: number) => {
        const next = Math.min(100, prev + 4);
        if (next >= required && !completedRef.current) {
          completedRef.current = true;
          onComplete({ progressPercent: next });
        }
        if (next >= 100) setPlaying(false);
        return next;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [playing, required, onComplete]);

  return (
    <Card>
      <View
        style={{
          aspectRatio: 16 / 9,
          backgroundColor: '#0F172A',
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <TouchableOpacity onPress={() => setPlaying((p) => !p)} activeOpacity={0.8}>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: 'rgba(255,255,255,0.16)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={playing ? 'pause' : 'play'} size={27} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={{ color: COLORS.inkFaint, fontSize: 11.5, marginTop: 11 }}>
          {playing ? 'Đang phát…' : percent > 0 ? 'Tạm dừng' : 'Nhấn để phát bài giảng'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flex: 1, marginRight: 9 }}>
          <ProgressBar value={percent} tone="rail" size="sm" />
        </View>
        <Text style={{ fontSize: 11.5, fontWeight: '800', color: COLORS.rail }}>{Math.round(percent)}%</Text>
      </View>

      <InfoRow label="Ngưỡng ghi nhận hoàn thành" value={`${required}%`} icon="checkmark-done-outline" />

      <Button variant="primary" icon="checkmark" style={{ marginTop: 12 }} onPress={() => onComplete({ progressPercent: 100 })}>
        Đánh dấu đã xem xong
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PDF — tài liệu quy trình chuẩn.
// ---------------------------------------------------------------------------
function PdfPlayer({ lesson, onComplete }: { lesson: any; onComplete: (extra?: any) => void }) {
  const COLORS = useColors();
  return (
    <Card>
      <View
        style={{
          backgroundColor: COLORS.sunken,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: COLORS.line,
          padding: 24,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons name="document-text" size={44} color={COLORS.red} />
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.ink, marginTop: 11, textAlign: 'center' }}>
          {lesson.title}
        </Text>
        <Text style={{ fontSize: 11.5, color: COLORS.inkFaint, marginTop: 5, textAlign: 'center' }}>
          Tài liệu quy trình chuẩn (SOP) · {lesson.pageCount || 14} trang
        </Text>
        {!!lesson.contentUrl && (
          <Button size="sm" variant="outline" icon="open-outline" style={{ marginTop: 13 }} onPress={() => Linking.openURL(lesson.contentUrl)}>
            Mở tài liệu
          </Button>
        )}
      </View>

      <Button variant="primary" icon="checkmark" onPress={() => onComplete({ progressPercent: 100 })}>
        Xác nhận đã đọc xong
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// EXTERNAL_LINK — nền tảng học bên ngoài.
// ---------------------------------------------------------------------------
function ExternalPlayer({ lesson, onComplete }: { lesson: any; onComplete: (extra?: any) => void }) {
  const COLORS = useColors();
  const url = lesson.contentUrl || lesson.externalUrl || 'https://www.linkedin.com/learning/';
  const platform = lesson.platform || detectPlatform(url);

  return (
    <Card>
      <View
        style={{
          backgroundColor: COLORS.blueSoft,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: COLORS.blueBorder,
          padding: 20,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons name="globe-outline" size={40} color={COLORS.blue} />
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.ink, marginTop: 11, textAlign: 'center' }}>
          {platform}
        </Text>
        <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 6, textAlign: 'center', lineHeight: 17 }}>
          Bài học này được cung cấp trên nền tảng ngoài. Mở liên kết để học, sau đó quay lại đây xác nhận hoàn thành.
        </Text>
        <Button size="sm" variant="primary" icon="open-outline" style={{ marginTop: 13 }} onPress={() => Linking.openURL(url)}>
          Mở nền tảng học
        </Button>
      </View>

      <Button variant="outline" icon="checkmark" onPress={() => onComplete({ progressPercent: 100 })}>
        Tôi đã hoàn thành bài học ngoài
      </Button>
    </Card>
  );
}

function detectPlatform(url = '') {
  if (url.includes('udemy')) return 'Udemy';
  if (url.includes('linkedin')) return 'LinkedIn Learning';
  if (url.includes('coursera')) return 'Coursera';
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube';
  return 'Nền tảng ngoài';
}
