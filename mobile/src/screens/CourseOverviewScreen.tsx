import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Badge,
  ProgressBar,
  Button,
  JobLevelBadge,
  LevelAccessBadge,
  CourseTypeBadge,
  CertificateModal,
} from '../components/ui';
import { useCourseStore } from '../store/CourseStore';
import { getCourseImage } from '../data/courseImages';
import { deriveCertificates, deriveLessonStatuses } from '../data/mockData';
import { computeCourseRecertification } from '../utils/recertification';
import { ACCESS_STATE } from '../data/levelSystem';

export default function CourseOverviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    currentUser,
    courses: allCourses,
    myEnrollments,
    accessFor,
    enrollCourse,
  } = useCourseStore();

  const user = currentUser;
  const courseId = route.params?.courseId || route.params?.course?.id || 'CRS-FSH-001';

  const rawCourse = allCourses.find((c: any) => c.id === courseId) || route.params?.course || allCourses[0];
  const rawEnrollment = rawCourse ? (myEnrollments[rawCourse.id] || rawCourse.enrollment) : null;

  const course = useMemo(() => {
    if (!rawCourse) return null;
    return {
      ...rawCourse,
      enrollment: rawEnrollment,
      modules: deriveLessonStatuses(rawCourse.modules || [], rawEnrollment),
    };
  }, [rawCourse, rawEnrollment]);

  const access = useMemo(() => {
    if (!course) return { canAccess: true, isLevelLocked: false };
    return accessFor(course, user);
  }, [course, user, accessFor]);

  const userCertificates = useMemo(() => deriveCertificates(allCourses, user), [allCourses, user]);
  const certificate = useMemo(() => {
    if (!course) return null;
    return userCertificates.find((cert: any) => cert.courseId === course.id) || null;
  }, [userCertificates, course]);

  const recert = useMemo(() => {
    return computeCourseRecertification(course, course?.enrollment, certificate);
  }, [course, certificate]);

  const [showCertModal, setShowCertModal] = useState(false);

  if (!course) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 10 }}>
          Không tìm thấy khóa học
        </Text>
        <Button style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
          Quay lại danh sách
        </Button>
      </SafeAreaView>
    );
  }

  // Prerequisite check
  const unmetPrerequisites = (course.prerequisites || []).filter((pid: string) => {
    const p = allCourses.find((c: any) => c.id === pid);
    return !p || myEnrollments[pid]?.status !== 'COMPLETED';
  });
  const isPrereqLocked = unmetPrerequisites.length > 0;

  // Calculate required lessons completion
  const allRequiredLessons = (course.modules || []).flatMap((m: any) =>
    (m.lessons || []).filter((l: any) => l.isRequired && l.lessonType !== 'ASSESSMENT')
  );
  const completedRequired = allRequiredLessons.filter((l: any) => l.status === 'COMPLETED').length;
  const completionPct = allRequiredLessons.length
    ? Math.round((completedRequired / allRequiredLessons.length) * 100)
    : 100;

  const cfg = course.configuration || {};
  const assessmentUnlocked =
    ((!isPrereqLocked && !access.isLevelLocked && completionPct >= 100) || recert.needsRecertification) &&
    cfg.assessmentEnabled;

  const attempts = course.enrollment?.attempts || [];
  const maxAttempts = cfg.maxAttempts || 3;
  const attemptsLeft = Math.max(0, maxAttempts - attempts.length);

  const getLessonIcon = (type?: string) => {
    switch (type) {
      case 'VIDEO': return 'videocam';
      case 'PDF': return 'document-text';
      case 'PPT': return 'easel';
      case 'SCORM': return 'cube';
      case 'EXTERNAL_LINK': return 'globe';
      case 'ASSESSMENT': return 'trophy';
      default: return 'book';
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top App Bar */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B', flex: 1 }} numberOfLines={1}>
          {course.title}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 1. COVER HERO BANNER */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
          <View style={{ height: 160, backgroundColor: '#0F172A', position: 'relative' }}>
            <Image source={{ uri: getCourseImage(course) }} style={{ width: '100%', height: '100%', opacity: 0.8 }} />
            <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                <Badge tone="slate" size="sm">{course.code}</Badge>
                <CourseTypeBadge courseType={course.courseType} />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 }}>
                {course.title}
              </Text>
            </View>
          </View>

          <View style={{ padding: 14, backgroundColor: '#FFFFFF' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                {course.category || course.domain} &middot; {course.estimatedDuration || '3h'} &middot; {course.version || 'v2.1'}
              </Text>
              <LevelAccessBadge state={access.state} />
            </View>
          </View>
        </View>

        {/* RECERTIFICATION ALERT BANNER */}
        {recert.needsRecertification && (
          <View
            style={{
              backgroundColor: recert.isExpired ? '#FEF2F2' : '#FFFBEB',
              borderLeftWidth: 4,
              borderLeftColor: recert.isExpired ? '#DC2626' : '#D97706',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="time" size={16} color={recert.isExpired ? '#DC2626' : '#D97706'} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: recert.isExpired ? '#991B1B' : '#92400E' }}>
                {recert.statusLabel}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#64748B' }}>{recert.alertMessage}</Text>
          </View>
        )}

        {/* PREREQUISITE LOCK CARD */}
        {isPrereqLocked && (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', padding: 14, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="lock-closed" size={18} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#991B1B' }}>
                Khóa Học Đang Bị Khóa (Chưa Đạt Điều Kiện Tiên Quyết)
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: '#64748B', lineHeight: 16 }}>
              Bạn cần hoàn thành các khóa học sau trước khi mở khóa bài học này: {unmetPrerequisites.join(', ')}
            </Text>
          </View>
        )}

        {/* 2. COURSE PROGRESS OVERVIEW */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>Tiến Độ Hoàn Thành</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#009E49' }}>
              {course.enrollment?.progress || 0}%
            </Text>
          </View>
          <ProgressBar value={course.enrollment?.progress || 0} size="md" />
          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 8 }}>
            Đã hoàn thành {completedRequired}/{allRequiredLessons.length} bài học bắt buộc ({completionPct}%).
          </Text>
        </View>

        {/* 3. SYLLABUS (MODULES & LESSONS) */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 12 }}>
            Cấu Trúc Chương Trình &amp; Bài Học
          </Text>

          {(course.modules || []).map((mod: any, mIdx: number) => (
            <View key={mod.id || mIdx} style={{ marginBottom: 14 }}>
              {/* Module Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 8, borderRadius: 8, marginBottom: 8 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#009E49', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>{mIdx + 1}</Text>
                </View>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#065F46', flex: 1 }} numberOfLines={1}>
                  {mod.title}
                </Text>
              </View>

              {/* Lessons List */}
              {(mod.lessons || []).map((lesson: any) => {
                const isLessonComplete = lesson.status === 'COMPLETED';
                const isLessonLocked = isPrereqLocked || access.isLevelLocked;

                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderBottomWidth: 1,
                      borderColor: '#F1F5F9',
                    }}
                    onPress={() => {
                      if (isLessonLocked) {
                        Alert.alert('Khóa Học Bị Khóa', 'Bạn chưa đủ điều kiện để truy cập bài học này.');
                        return;
                      }
                      enrollCourse(course.id, user);
                      navigation.navigate('LessonViewer', { courseId: course.id, lessonId: lesson.id });
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: isLessonComplete ? '#ECFDF5' : '#F1F5F9',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                      }}
                    >
                      <Ionicons
                        name={isLessonComplete ? 'checkmark-circle' : getLessonIcon(lesson.lessonType) as any}
                        size={16}
                        color={isLessonComplete ? '#009E49' : '#64748B'}
                      />
                    </View>

                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B', marginBottom: 2 }} numberOfLines={2}>
                        {lesson.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>{lesson.lessonType || 'VIDEO'}</Text>
                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>&bull;</Text>
                        <Text style={{ fontSize: 10, color: lesson.isRequired ? '#D97706' : '#64748B', fontWeight: '600' }}>
                          {lesson.isRequired ? 'Bắt buộc' : 'Tự chọn'}
                        </Text>
                      </View>
                    </View>

                    <Badge tone={isLessonComplete ? 'sage' : 'slate'} size="sm">
                      {isLessonComplete ? 'Hoàn Thành' : 'Bắt Đầu'}
                    </Badge>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* 4. FINAL ASSESSMENT CARD */}
        {cfg.assessmentEnabled && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="trophy" size={20} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>
                  Bài Đánh Giá Cuối Khóa
                </Text>
              </View>
              <Badge tone={assessmentUnlocked ? 'amber' : 'slate'}>
                {assessmentUnlocked ? 'Đã Mở Khóa' : 'Đang Khóa'}
              </Badge>
            </View>

            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: '#64748B' }}>Điểm đạt yêu cầu:</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#009E49' }}>{cfg.passingScorePercent || 80}%</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: '#64748B' }}>Thời gian làm bài:</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>{cfg.assessmentTimeLimit || 15} phút</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: '#64748B' }}>Số lượt thi còn lại:</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: attemptsLeft > 0 ? '#1E293B' : '#DC2626' }}>
                  {attemptsLeft}/{maxAttempts} lượt
                </Text>
              </View>
            </View>

            {assessmentUnlocked ? (
              <Button
                variant="primary"
                icon="play"
                onPress={() => navigation.navigate('AssessmentPlayer', { courseId: course.id })}
              >
                Bắt Đầu Làm Bài Thi Đánh Giá
              </Button>
            ) : (
              <Text style={{ fontSize: 11.5, color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>
                Hoàn thành 100% bài học bắt buộc để mở khóa bài thi đánh giá.
              </Text>
            )}
          </View>
        )}

        {/* 5. DIGITAL CERTIFICATE CARD (IF COMPLETED) */}
        {certificate && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="ribbon" size={20} color="#009E49" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#065F46' }}>
                Chứng Chỉ Số Đã Nhận
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              Bạn đã hoàn thành khóa học và được cấp chứng chỉ điện tử có giá trị toàn hệ thống MMVN.
            </Text>
            <Button
              variant="outline"
              icon="eye"
              onPress={() => setShowCertModal(true)}
            >
              Xem Chi Tiết Chứng Chỉ Số
            </Button>
          </View>
        )}
      </ScrollView>

      {/* CERTIFICATE MODAL */}
      <CertificateModal
        visible={showCertModal}
        certificate={certificate}
        onClose={() => setShowCertModal(false)}
        onRetake={() => {
          setShowCertModal(false);
          navigation.navigate('AssessmentPlayer', { courseId: course.id });
        }}
      />
    </SafeAreaView>
  );
}
