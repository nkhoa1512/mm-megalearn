import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal as RNModal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  Badge,
  ProgressBar,
  Button,
  JobLevelBadge,
  LevelAccessBadge,
  CourseTypeBadge,
} from '../components/ui';
import { useCourseStore } from '../store/CourseStore';
import { getCourseImage } from '../data/courseImages';
import { ACCESS_STATE, normalizeLevel, nextLevelUp } from '../data/levelSystem';
import { getAssignedCurriculaForUser } from '../utils/curriculumAssignment';
import { computeCourseRecertification } from '../utils/recertification';
import { deriveCertificates } from '../data/mockData';

export default function CoursesScreen() {
  const navigation = useNavigation<any>();
  const {
    currentUser,
    courses: allCourses,
    myCourses,
    myEnrollments,
    curricula,
    accessFor,
    requestLevelAdvanceApproval,
    enrollCourse,
  } = useCourseStore();

  const user = currentUser;
  const userLevel = normalizeLevel(user?.level || 7);
  const oneLevelUp = nextLevelUp(userLevel);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedCurriculum, setSelectedCurriculum] = useState<any>(null);

  // Modal xin học vượt cấp
  const [requestModal, setRequestModal] = useState<{ open: boolean; course: any }>({
    open: false,
    course: null,
  });
  const [justification, setJustification] = useState('');

  const enrolledCourses = myCourses(allCourses, user);
  const assignedCurricula = getAssignedCurriculaForUser(curricula, user);
  const certificates = useMemo(() => deriveCertificates(allCourses, user), [allCourses, user]);

  const recertByCourseId = useMemo(() => {
    const map: any = {};
    enrolledCourses.forEach((c: any) => {
      const cert = certificates.find((cert: any) => cert.courseId === c.id);
      map[c.id] = computeCourseRecertification(c, c.enrollment, cert);
    });
    return map;
  }, [enrolledCourses, certificates]);

  // Access state by ID
  const accessById = useMemo(() => {
    const map: any = {};
    allCourses.forEach((c: any) => {
      map[c.id] = accessFor(c, user);
    });
    return map;
  }, [allCourses, user, accessFor]);

  const filters = [
    { id: 'ALL', label: 'Tất Cả', count: enrolledCourses.length },
    { id: 'IN_PROGRESS', label: 'Đang Học', count: enrolledCourses.filter((c: any) => c.enrollment?.status === 'IN_PROGRESS').length },
    { id: 'COMPLETED', label: 'Hoàn Thành', count: enrolledCourses.filter((c: any) => c.enrollment?.status === 'COMPLETED').length },
    { id: 'MANDATORY', label: 'Bắt Buộc', count: enrolledCourses.filter((c: any) => c.courseType === 'MANDATORY').length },
    { id: 'CURRICULUM', label: 'Theo Giáo Trình', count: enrolledCourses.filter((c: any) => c.isCurriculum || c.curriculumTitle).length },
    { id: 'RECERTIFICATION', label: 'Cần Tái Cấp', count: enrolledCourses.filter((c: any) => recertByCourseId[c.id]?.needsRecertification).length },
    { id: 'LEVEL_UP', label: 'Xin Duyệt Vượt Cấp', count: allCourses.filter((c: any) => accessById[c.id]?.state === ACCESS_STATE.REQUESTABLE).length },
  ];

  const filteredCourses = enrolledCourses.filter((c: any) => {
    const s = c.enrollment?.status;
    const access = accessById[c.id] || {};
    const matchStatus =
      activeFilter === 'ALL' ||
      (activeFilter === 'RECERTIFICATION' && recertByCourseId[c.id]?.needsRecertification) ||
      (activeFilter === 'MANDATORY' && c.courseType === 'MANDATORY') ||
      (activeFilter === 'CURRICULUM' && (c.isCurriculum || Boolean(c.curriculumTitle))) ||
      (activeFilter === 'LEVEL_UP' && access.state === ACCESS_STATE.REQUESTABLE) ||
      s === activeFilter;

    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.category && c.category.toLowerCase().includes(search.toLowerCase()));

    return matchStatus && matchSearch;
  });

  const handleOpenRequest = (course: any) => {
    setRequestModal({ open: true, course });
    setJustification('');
  };

  const handleSubmitRequest = () => {
    if (!requestModal.course) return;
    const res = requestLevelAdvanceApproval(requestModal.course, justification, user);
    setRequestModal({ open: false, course: null });
    if (res.ok) {
      Alert.alert('Thành Công', `Đã gửi đơn xin học vượt cấp khóa "${requestModal.course.title}" tới Quản lý trực tiếp.`);
    } else {
      Alert.alert('Thông Báo', res.reason || 'Có lỗi xảy ra.');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B' }}>
          Chương Trình Đào Tạo &amp; Khóa Học
        </Text>
        <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
          {user.fullName} &middot; {user.position} &middot; Level {userLevel}
        </Text>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F1F5F9',
            borderRadius: 10,
            paddingHorizontal: 10,
            height: 38,
            marginTop: 10,
          }}
        >
          <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Tìm theo tên khóa, mã số, nghiệp vụ..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontSize: 12.5, color: '#1E293B', padding: 0 }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* 1. LỘ TRÌNH HỌC VƯỢT CẤP TUẦN TỰ (LEVEL GATE BANNER) */}
        <View style={{ padding: 16, paddingBottom: 8 }}>
          <View style={{ backgroundColor: '#EFF6FF', borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFE', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="shield-checkmark" size={18} color="#2563EB" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E40AF', flex: 1 }}>
                Lộ Trình Học Vượt Cấp Tuần Tự (Level Gate)
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View>
                <Text style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>Tiến độ Level {userLevel}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E40AF' }}>3/13 khóa (23%)</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>Vượt Cấp (Level {oneLevelUp})</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#D97706' }}>Cần Xin Duyệt</Text>
              </View>
            </View>
            <Text style={{ fontSize: 10.5, color: '#475569', lineHeight: 15 }}>
              Khóa Level {userLevel} mở tự do. Khóa Level {oneLevelUp} cần gửi đơn xin phê duyệt từ Quản lý. Khóa từ 2 cấp trở lên bị ẩn theo quy chế.
            </Text>
          </View>
        </View>

        {/* 2. GIÁO TRÌNH BẮT BUỘC (ASSIGNED CURRICULA) */}
        {assignedCurricula.length > 0 && (
          <View style={{ paddingBottom: 12 }}>
            <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="bookmarks" size={16} color="#009E49" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>
                Giáo Trình Bắt Buộc Của Bạn ({assignedCurricula.length})
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {assignedCurricula.map((curr: any) => (
                <View
                  key={curr.id}
                  style={{
                    width: 280,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    padding: 14,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', flex: 1, marginRight: 8 }} numberOfLines={2}>
                      {curr.title}
                    </Text>
                    <Badge tone="amber" size="sm">Bắt Buộc</Badge>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 10, lineHeight: 16 }} numberOfLines={2}>
                    {curr.description}
                  </Text>

                  <View style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, color: '#64748B' }}>Tiến độ giáo trình:</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#1E293B' }}>
                        1/{curr.courseIds?.length || 4} khóa (25%)
                      </Text>
                    </View>
                    <ProgressBar value={25} size="sm" />
                  </View>

                  <Button
                    variant="outline"
                    size="sm"
                    icon="map"
                    onPress={() => setSelectedCurriculum(curr)}
                  >
                    Xem Chi Tiết Lộ Trình
                  </Button>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 3. FILTER TABS */}
        <View style={{ backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', paddingVertical: 10, marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {filters.map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setActiveFilter(f.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isActive ? '#009E49' : '#F1F5F9',
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: isActive ? '#009E49' : '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: isActive ? '#FFFFFF' : '#475569' }}>
                    {f.label}
                  </Text>
                  <View
                    style={{
                      marginLeft: 6,
                      backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : '#E2E8F0',
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: isActive ? '#FFFFFF' : '#64748B' }}>
                      {f.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. COURSE CARDS LIST */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {filteredCourses.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Ionicons name="search" size={36} color="#94A3B8" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', textAlign: 'center' }}>
                Không tìm thấy khóa học phù hợp
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                Thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác.
              </Text>
            </View>
          ) : (
            filteredCourses.map((course: any) => {
              const access = accessById[course.id] || {};
              const recert = recertByCourseId[course.id] || {};
              const isCompleted = course.enrollment?.status === 'COMPLETED';
              const isInProgress = course.enrollment?.status === 'IN_PROGRESS';
              const isLocked = access.state === ACCESS_STATE.REQUESTABLE || access.isLevelLocked;

              return (
                <View
                  key={course.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: recert.needsRecertification ? '#FDE68A' : '#E2E8F0',
                    marginBottom: 12,
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  {/* Recertification Warning Ribbon */}
                  {recert.needsRecertification && (
                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time" size={12} color="#D97706" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#92400E' }}>
                        {recert.statusLabel || 'Cần Sát Hạch Tái Cấp Chứng Chỉ'}
                      </Text>
                    </View>
                  )}

                  <View style={{ padding: 14 }}>
                    {/* Top Row: Thumbnail + Info */}
                    <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                      <Image
                        source={{ uri: getCourseImage(course) }}
                        style={{ width: 68, height: 68, borderRadius: 10, marginRight: 12, backgroundColor: '#CBD5E1' }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#1E293B', marginBottom: 2, lineHeight: 18 }} numberOfLines={2}>
                          {course.title}
                        </Text>
                        <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                          {course.code} &middot; {course.category || course.domain} &middot; {course.estimatedDuration || '3h'}
                        </Text>
                        {course.curriculumTitle && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Ionicons name="bookmarks" size={10} color="#2563EB" style={{ marginRight: 3 }} />
                            <Text style={{ fontSize: 9.5, color: '#2563EB', fontWeight: '600' }} numberOfLines={1}>
                              {course.curriculumTitle}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Badges row */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      <CourseTypeBadge courseType={course.courseType} />
                      <LevelAccessBadge state={access.state} />
                      <Badge tone="slate" size="sm">
                        {course.deliveryType === 'IN_PERSON_CLASSROOM' ? 'Thực Hành Xưởng (ILT)' : 'E-Learning'}
                      </Badge>
                    </View>

                    {/* Progress Bar & Status */}
                    <View style={{ borderTopWidth: 1, borderColor: '#F1F5F9', paddingTop: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isCompleted ? '#009E49' : isInProgress ? '#D97706' : '#64748B' }}>
                          {isCompleted ? 'Đã Hoàn Thành' : isInProgress ? 'Đang Học' : 'Chưa Bắt Đầu'}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E293B' }}>
                          {course.enrollment?.progress || 0}%
                        </Text>
                      </View>
                      <ProgressBar value={course.enrollment?.progress || 0} tone={isCompleted ? 'sage' : 'amber'} size="sm" />
                    </View>

                    {/* Action Button */}
                    <View style={{ marginTop: 12 }}>
                      {access.state === ACCESS_STATE.REQUESTABLE ? (
                        <Button
                          variant="outline"
                          tone="warning"
                          icon="key"
                          onPress={() => handleOpenRequest(course)}
                        >
                          Xin Duyệt Học Vượt Cấp
                        </Button>
                      ) : recert.needsRecertification ? (
                        <Button
                          variant="primary"
                          tone="warning"
                          icon="refresh"
                          onPress={() => navigation.navigate('AssessmentPlayer', { courseId: course.id })}
                        >
                          Làm Bài Thi Tái Cấp
                        </Button>
                      ) : isCompleted ? (
                        <Button
                          variant="outline"
                          icon="refresh"
                          onPress={() => navigation.navigate('CourseOverview', { course, courseId: course.id })}
                        >
                          Ôn Tập Lại Bài Giảng
                        </Button>
                      ) : course.deliveryType === 'IN_PERSON_CLASSROOM' ? (
                        <Button
                          variant="primary"
                          icon="qr-code"
                          onPress={() => navigation.navigate('ClassroomsTab')}
                        >
                          Xem Lịch &amp; Quét QR Điểm Danh
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          icon={isInProgress ? 'play' : 'book'}
                          onPress={() => {
                            enrollCourse(course.id, user);
                            navigation.navigate('CourseOverview', { course, courseId: course.id });
                          }}
                        >
                          {isInProgress ? 'Tiếp Tục Học' : 'Bắt Đầu Học'}
                        </Button>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* MODAL: CURRICULUM SYLLABUS */}
      {selectedCurriculum && (
        <RNModal visible={Boolean(selectedCurriculum)} transparent animationType="slide" onRequestClose={() => setSelectedCurriculum(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>{selectedCurriculum.title}</Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{selectedCurriculum.description}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedCurriculum(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ marginBottom: 20 }}>
                {(selectedCurriculum.courses || [
                  { title: 'Food Safety & Hygiene Standards (HACCP)', code: 'FSH-001', duration: '3h', status: '47% Đang học' },
                  { title: 'Fresh Meat & Cold Chain Storage', code: 'FSH-002', duration: '3h', status: 'Chưa bắt đầu' },
                  { title: 'Seafood Quality Inspection & Cross-Contamination', code: 'FSH-003', duration: '3h', status: 'Chưa bắt đầu' },
                ]).map((c: any, i: number) => (
                  <View key={i} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B', flex: 1 }}>{c.title}</Text>
                      <Badge tone="sage" size="sm">{c.code}</Badge>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Thời lượng: {c.duration || '3h'}</Text>
                  </View>
                ))}
              </ScrollView>

              <Button variant="primary" onPress={() => setSelectedCurriculum(null)}>
                Đóng
              </Button>
            </View>
          </View>
        </RNModal>
      )}

      {/* MODAL: LEVEL ADVANCE REQUEST */}
      {requestModal.open && (
        <RNModal visible={requestModal.open} transparent animationType="slide" onRequestClose={() => setRequestModal({ open: false, course: null })}>
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>Đơn Xin Học Vượt Cấp</Text>
                <TouchableOpacity onPress={() => setRequestModal({ open: false, course: null })}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12.5, color: '#475569', marginBottom: 14 }}>
                Khóa: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{requestModal.course?.title}</Text> (Level {oneLevelUp})
              </Text>

              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#1E293B', marginBottom: 6 }}>
                Lý do đề xuất học trước cấp bậc:
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  padding: 10,
                  fontSize: 12.5,
                  color: '#1E293B',
                  minHeight: 80,
                  textAlignVertical: 'top',
                  marginBottom: 16,
                }}
                placeholder="Nhập lý do học vượt cấp (ví dụ: đang chuẩn bị quy hoạch kế cận, phục vụ dự án chuyển đổi...)"
                placeholderTextColor="#94A3B8"
                multiline
                value={justification}
                onChangeText={setJustification}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button variant="outline" style={{ flex: 1 }} onPress={() => setRequestModal({ open: false, course: null })}>
                  Hủy Bỏ
                </Button>
                <Button variant="primary" style={{ flex: 1 }} onPress={handleSubmitRequest}>
                  Gửi Đơn Phê Duyệt
                </Button>
              </View>
            </View>
          </View>
        </RNModal>
      )}
    </SafeAreaView>
  );
}
