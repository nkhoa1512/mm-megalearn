import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Badge,
  Button,
  ProgressBar,
  PostTrainingSurveyModal,
} from '../components/ui';
import { useCourseStore } from '../store/CourseStore';
import { applyLessonProgress, deriveLessonStatuses } from '../data/mockData';

export default function LessonViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    currentUser,
    courses: allCourses,
    myEnrollments,
    saveCourseProgress,
  } = useCourseStore();

  const user = currentUser;
  const courseId = route.params?.courseId || 'CRS-FSH-001';
  const lessonId = route.params?.lessonId || 'LES-FSH-101';

  const rawCourse = allCourses.find((c: any) => c.id === courseId) || allCourses[0];
  const rawEnrollment = rawCourse ? (myEnrollments[rawCourse.id] || rawCourse.enrollment) : null;
  const course = rawCourse
    ? { ...rawCourse, enrollment: rawEnrollment, modules: deriveLessonStatuses(rawCourse.modules || [], rawEnrollment) }
    : null;

  const flatLessons = useMemo(() => {
    if (!course || !course.modules) return [];
    return course.modules.flatMap((m: any) => m.lessons || []);
  }, [course]);

  const currentIndex = flatLessons.findIndex((l: any) => l.id === lessonId);
  const lesson = currentIndex >= 0 ? flatLessons[currentIndex] : flatLessons[0] || {
    id: lessonId,
    title: 'Standard Operating Guidelines & Checklists',
    lessonType: 'VIDEO',
    isRequired: true,
    status: 'IN_PROGRESS',
  };

  const nextLesson = currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;

  // Simulator states
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(15);
  const [pdfPage, setPdfPage] = useState(1);
  const totalPdfPages = 6;
  const [pptSlide, setPptSlide] = useState(1);
  const totalPptSlides = 5;
  const [scormStep, setScormStep] = useState(1);
  const totalScormSteps = 4;

  const [surveyOpen, setSurveyOpen] = useState(false);

  // Video playback simulation
  useEffect(() => {
    let timer: any;
    if (isPlaying && videoProgress < 100) {
      timer = setInterval(() => {
        setVideoProgress((p) => {
          if (p >= 90) {
            handleComplete();
          }
          return Math.min(100, p + 5);
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, videoProgress]);

  const handleComplete = () => {
    if (!course || !lesson) return;
    const updated = applyLessonProgress(course, lesson.id, { status: 'COMPLETED', progressPercent: 100 });
    saveCourseProgress(course.id, updated, user);
  };

  const isCompleted = lesson.status === 'COMPLETED' || videoProgress >= 90;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header Bar */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>
            {course?.title || 'Khóa Học'}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }} numberOfLines={1}>
            {lesson.title}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setSurveyOpen(true)}
          style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="star" size={12} color="#D97706" style={{ marginRight: 4 }} />
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#B45309' }}>CSAT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Lesson Status Badge Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Badge tone="rail" size="sm">{lesson.lessonType || 'VIDEO'}</Badge>
            <Badge tone={lesson.isRequired ? 'amber' : 'slate'} size="sm">
              {lesson.isRequired ? 'Bắt Buộc' : 'Tự Chọn'}
            </Badge>
          </View>
          <Badge tone={isCompleted ? 'sage' : 'amber'}>
            {isCompleted ? 'Đã Hoàn Thành' : 'Đang Học'}
          </Badge>
        </View>

        {/* 1. DYNAMIC PLAYER CANVAS */}
        {/* VIDEO PLAYER */}
        {(lesson.lessonType === 'VIDEO' || !lesson.lessonType) && (
          <View style={{ backgroundColor: '#0F172A', borderRadius: 16, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
            <View style={{ height: 200, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <TouchableOpacity
                onPress={() => setIsPlaying(!isPlaying)}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#FFFFFF" style={isPlaying ? {} : { marginLeft: 3 }} />
              </TouchableOpacity>
            </View>

            {/* Video Controls Bar */}
            <View style={{ backgroundColor: '#1E293B', padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                  {isPlaying ? 'Đang phát video bài giảng...' : 'Tạm dừng'}
                </Text>
                <Text style={{ color: '#009E49', fontSize: 11, fontWeight: '700' }}>
                  {videoProgress}% (Cần &gt;=90% để hoàn thành)
                </Text>
              </View>
              <ProgressBar value={videoProgress} size="sm" tone={videoProgress >= 90 ? 'sage' : 'amber'} />
            </View>
          </View>
        )}

        {/* PPT SLIDE DECK */}
        {lesson.lessonType === 'PPT' && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 20, alignItems: 'center', minHeight: 180, justifyContent: 'center', marginBottom: 14 }}>
              <Badge tone="blue" size="sm" style={{ marginBottom: 10 }}>Slide {pptSlide} / {totalPptSlides}</Badge>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E40AF', textAlign: 'center', marginBottom: 8 }}>
                Quy Trình Chuẩn Hóa Quầy Kệ &amp; Phân Luồng Khách Hàng
              </Text>
              <Text style={{ fontSize: 12, color: '#475569', textAlign: 'center', lineHeight: 18 }}>
                Quy tắc luân chuyển hàng hóa FIFO/FEFO và đảm bảo lối thoát hiểm tối thiểu 90cm theo tiêu chuẩn MM Mega Market.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={pptSlide <= 1}
                onPress={() => setPptSlide((s) => Math.max(1, s - 1))}
              >
                Slide Trước
              </Button>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                {pptSlide} / {totalPptSlides}
              </Text>
              <Button
                variant="primary"
                size="sm"
                onPress={() => {
                  if (pptSlide < totalPptSlides) {
                    setPptSlide((s) => s + 1);
                  } else {
                    handleComplete();
                    Alert.alert('Hoàn Thành', 'Bạn đã xem xong toàn bộ slide bài giảng.');
                  }
                }}
              >
                {pptSlide < totalPptSlides ? 'Slide Kế' : 'Xong Bài Học'}
              </Button>
            </View>
          </View>
        )}

        {/* PDF / SOP DOCUMENT */}
        {lesson.lessonType === 'PDF' && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="document-text" size={24} color="#EF4444" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>Tài Liệu SOP Chuẩn Hóa MMVN</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Trang {pdfPage} / {totalPdfPages}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                Tài liệu hướng dẫn vận hành chuẩn (Standard Operating Procedure) do Ban Đào tạo L&amp;OD ban hành. Vui lòng đọc kỹ các quy chuẩn trước khi chuyển tiếp.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={pdfPage <= 1}
                onPress={() => setPdfPage((p) => Math.max(1, p - 1))}
              >
                Trang Trước
              </Button>
              <Button
                variant="primary"
                size="sm"
                onPress={() => {
                  if (pdfPage < totalPdfPages) {
                    setPdfPage((p) => p + 1);
                  } else {
                    handleComplete();
                    Alert.alert('Hoàn Thành', 'Bạn đã đọc xong tài liệu SOP.');
                  }
                }}
              >
                {pdfPage < totalPdfPages ? 'Trang Kế' : 'Xác Nhận Đã Đọc'}
              </Button>
            </View>
          </View>
        )}

        {/* SCORM PACKAGE */}
        {lesson.lessonType === 'SCORM' && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
            <View style={{ backgroundColor: '#F0FDFA', borderRadius: 12, borderWidth: 1, borderColor: '#99F6E4', padding: 16, marginBottom: 14 }}>
              <Badge tone="rail" size="sm" style={{ marginBottom: 8 }}>SCORM 2004 Module ({scormStep}/{totalScormSteps})</Badge>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F766E', marginBottom: 6 }}>
                Mô Phỏng Tương Tác: Thao Tác Xử Lý Vệ Sinh An Toàn
              </Text>
              <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                Thực hiện các bước tương tác để hoàn thành chứng chỉ gói bài giảng SCORM chuẩn hóa.
              </Text>
            </View>

            <Button
              variant="primary"
              icon="checkmark-circle"
              onPress={() => {
                if (scormStep < totalScormSteps) {
                  setScormStep((s) => s + 1);
                } else {
                  handleComplete();
                  Alert.alert('Hoàn Thành', 'Gói SCORM đã ghi nhận đạt yêu cầu 100%.');
                }
              }}
            >
              {scormStep < totalScormSteps ? `Tiếp Tục Bước ${scormStep + 1}` : 'Ghi Nhận Hoàn Thành SCORM'}
            </Button>
          </View>
        )}

        {/* Manual Mark as Complete Button */}
        {!isCompleted && (
          <Button
            variant="outline"
            icon="checkmark-circle-outline"
            onPress={handleComplete}
            style={{ marginBottom: 16 }}
          >
            Đánh Dấu Hoàn Thành Bài Này
          </Button>
        )}
      </ScrollView>

      {/* Navigation Footer Bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderColor: '#E2E8F0',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={!prevLesson}
          onPress={() => {
            if (prevLesson) {
              navigation.replace('LessonViewer', { courseId: course.id, lessonId: prevLesson.id });
            }
          }}
        >
          &larr; Bài Trước
        </Button>

        {nextLesson ? (
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              navigation.replace('LessonViewer', { courseId: course.id, lessonId: nextLesson.id });
            }}
          >
            Bài Kế Tiếp &rarr;
          </Button>
        ) : (
          <Button
            variant="primary"
            tone="warning"
            icon="trophy"
            size="sm"
            onPress={() => {
              if (course?.configuration?.assessmentEnabled) {
                navigation.navigate('AssessmentPlayer', { courseId: course.id });
              } else {
                navigation.navigate('CourseOverview', { courseId: course.id });
              }
            }}
          >
            Vào Thi Cuối Khóa
          </Button>
        )}
      </View>

      {/* CSAT MODAL */}
      <PostTrainingSurveyModal
        visible={surveyOpen}
        course={course}
        type="L1"
        onClose={() => setSurveyOpen(false)}
        onSubmit={(rating) => {
          Alert.alert('Cảm Ơn!', `Bạn đã đánh giá ${rating}/5 sao cho bài giảng này.`);
        }}
      />
    </SafeAreaView>
  );
}
