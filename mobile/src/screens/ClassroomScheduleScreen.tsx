import React, { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
import { Badge, Button, ProgressBar, Modal as Sheet, QrScannerModal, PostTrainingSurveyModal } from '../components/ui';
import { Screen, Card, COLORS, ChipRow, EmptyState, InfoRow } from '../components/layout';

export default function ClassroomScheduleScreen() {
  const navigation = useNavigation<any>();
  const { classrooms = [], checkInClassroom, enrollClassroom } = useCourseStore();

  const [quickFilter, setQuickFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [scanningSession, setScanningSession] = useState<any>(null);
  const [materialsSession, setMaterialsSession] = useState<any>(null);
  const [surveySession, setSurveySession] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return classrooms.filter((s: any) => {
      if (quickFilter === 'UPCOMING' && !(s.status === 'UPCOMING' || s.status === 'OPEN')) return false;
      if (quickFilter === 'MY_SESSIONS' && !s.isEnrolled) return false;
      if (quickFilter === 'STORE' && s.modality !== 'OFFLINE_STORE') return false;
      if (quickFilter === 'WEBINAR' && s.modality !== 'ONLINE_WEBINAR') return false;
      if (quickFilter === 'CHECKED_IN' && s.attendanceStatus !== 'CHECKED_IN') return false;
      if (!q) return true;
      return (
        (s.title || '').toLowerCase().includes(q) ||
        (s.code || '').toLowerCase().includes(q) ||
        (s.trainerName || '').toLowerCase().includes(q) ||
        (s.venue || '').toLowerCase().includes(q)
      );
    });
  }, [classrooms, quickFilter, search]);

  const filterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Tất cả', count: classrooms.length },
      { value: 'MY_SESSIONS', label: 'Lớp của tôi', count: classrooms.filter((s: any) => s.isEnrolled).length },
      {
        value: 'UPCOMING',
        label: 'Sắp diễn ra',
        count: classrooms.filter((s: any) => s.status === 'UPCOMING' || s.status === 'OPEN').length,
      },
      { value: 'STORE', label: 'Thực hành', count: classrooms.filter((s: any) => s.modality === 'OFFLINE_STORE').length },
      { value: 'WEBINAR', label: 'Webinar', count: classrooms.filter((s: any) => s.modality === 'ONLINE_WEBINAR').length },
      {
        value: 'CHECKED_IN',
        label: 'Đã điểm danh',
        count: classrooms.filter((s: any) => s.attendanceStatus === 'CHECKED_IN').length,
      },
    ],
    [classrooms]
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }

  function handleEnroll(session: any) {
    enrollClassroom(session.id);
    showToast(`Đã đăng ký buổi "${session.title}". Nhớ quét QR để điểm danh khi tới lớp.`);
  }

  function handleScanSuccess() {
    if (!scanningSession) return;
    checkInClassroom(scanningSession.id);
    const session = scanningSession;
    setScanningSession(null);
    showToast('Điểm danh thành công! Giảng viên đã ghi nhận sự có mặt của bạn.');
    // Sau khi điểm danh xong buổi học, mời học viên đánh giá lớp & giảng viên.
    setTimeout(() => setSurveySession(session), 700);
  }

  return (
    <Screen title="Lớp Thực Hành & Webinar" subtitle={`${classrooms.length} buổi học`} back scroll={false}>
      <FlatList
        data={filtered}
        keyExtractor={(s: any) => s.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {!!toast && (
              <Card style={{ backgroundColor: COLORS.greenSoft, borderColor: '#A7F3D0', padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark-circle" size={17} color={COLORS.green} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600', flex: 1, lineHeight: 17 }}>{toast}</Text>
                </View>
              </Card>
            )}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.paper,
                borderWidth: 1,
                borderColor: COLORS.line,
                borderRadius: 10,
                paddingHorizontal: 10,
                marginBottom: 10,
              }}
            >
              <Ionicons name="search" size={15} color={COLORS.inkFaint} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm buổi học, giảng viên, địa điểm…"
                placeholderTextColor={COLORS.inkFaint}
                style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: 13, color: COLORS.ink }}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.inkFaint} />
                </TouchableOpacity>
              )}
            </View>

            <ChipRow options={filterOptions} value={quickFilter} onChange={setQuickFilter} />
          </View>
        }
        ListEmptyComponent={<EmptyState icon="easel-outline" title="Không có buổi học phù hợp" />}
        renderItem={({ item }: { item: any }) => (
          <SessionCard
            session={item}
            onEnroll={() => handleEnroll(item)}
            onScan={() => setScanningSession(item)}
            onMaterials={() => setMaterialsSession(item)}
            onSurvey={() => setSurveySession(item)}
          />
        )}
      />

      <QrScannerModal
        visible={!!scanningSession}
        session={scanningSession}
        onClose={() => setScanningSession(null)}
        onSuccess={handleScanSuccess}
      />

      {/* Syllabus & materials */}
      <Sheet
        visible={!!materialsSession}
        onClose={() => setMaterialsSession(null)}
        title="Giáo trình & Tài liệu"
      >
        {!!materialsSession && (
          <View style={{ paddingBottom: 16 }}>
            <Card style={{ backgroundColor: COLORS.sunken, padding: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink }}>{materialsSession.title}</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 4 }}>
                {materialsSession.date} · {materialsSession.time}
              </Text>
              <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 2 }}>
                GV {materialsSession.trainerName} · {materialsSession.venue}
              </Text>
            </Card>

            <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.ink, marginBottom: 9 }}>
              Nội dung buổi học
            </Text>
            {(materialsSession.syllabus || []).length === 0 ? (
              <Text style={{ fontSize: 12, color: COLORS.inkFaint, marginBottom: 14 }}>
                Giảng viên chưa cập nhật giáo trình cho buổi này.
              </Text>
            ) : (
              materialsSession.syllabus.map((step: any, idx: number) => (
                <View key={idx} style={{ flexDirection: 'row', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: COLORS.rail,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '900', color: '#FFFFFF' }}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.ink, lineHeight: 18 }}>
                      {step.step}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 3, lineHeight: 16 }}>
                      {step.detail}
                    </Text>
                  </View>
                </View>
              ))
            )}

            <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.ink, marginTop: 6, marginBottom: 9 }}>
              Tài liệu đính kèm
            </Text>
            {(materialsSession.materials || []).length === 0 ? (
              <Text style={{ fontSize: 12, color: COLORS.inkFaint }}>Chưa có tài liệu đính kèm.</Text>
            ) : (
              materialsSession.materials.map((mat: any) => (
                <View
                  key={mat.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: COLORS.line,
                    borderRadius: 10,
                    padding: 11,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons
                    name={mat.type === 'PPT' ? 'easel-outline' : 'document-text-outline'}
                    size={18}
                    color={mat.type === 'PPT' ? COLORS.amber : COLORS.red}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.ink, lineHeight: 17 }} numberOfLines={2}>
                      {mat.name}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginTop: 2 }}>
                      {mat.type} · {mat.size}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </Sheet>

      <PostTrainingSurveyModal
        visible={!!surveySession}
        course={surveySession}
        type="CLASSROOM_CSAT"
        onClose={() => setSurveySession(null)}
        onSubmit={() => showToast('Cảm ơn bạn đã gửi đánh giá lớp học!')}
      />
    </Screen>
  );
}

function SessionCard({
  session,
  onEnroll,
  onScan,
  onMaterials,
  onSurvey,
}: {
  session: any;
  onEnroll: () => void;
  onScan: () => void;
  onMaterials: () => void;
  onSurvey: () => void;
}) {
  const isStore = session.modality === 'OFFLINE_STORE';
  const isCheckedIn = session.attendanceStatus === 'CHECKED_IN';
  const isCompleted = session.status === 'COMPLETED';
  const isFull = (session.enrolledCount || 0) >= (session.maxCapacity || 0);
  const fillPct = Math.round(((session.enrolledCount || 0) / Math.max(1, session.maxCapacity || 1)) * 100);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
        <Badge tone={isStore ? 'rust' : 'blue'} size="sm">
          {isStore ? '🏪 Thực hành siêu thị' : '💻 Webinar trực tuyến'}
        </Badge>
        {isCheckedIn && (
          <Badge tone="sage" size="sm">
            ✅ Đã điểm danh
          </Badge>
        )}
        {session.isEnrolled && !isCheckedIn && !isCompleted && (
          <Badge tone="amber" size="sm">
            ⏳ Chờ quét QR
          </Badge>
        )}
        {isCompleted && (
          <Badge tone="slate" size="sm">
            🏁 Đã kết thúc
          </Badge>
        )}
      </View>

      <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.ink, lineHeight: 19 }} numberOfLines={3}>
        {session.title}
      </Text>
      <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginTop: 4 }}>{session.code}</Text>

      <View style={{ marginTop: 10 }}>
        <InfoRow label="Thời gian" value={`${session.date} · ${session.time}`} icon="calendar-outline" />
        <InfoRow label="Địa điểm" value={session.venue} icon="location-outline" />
        <InfoRow label="Giảng viên" value={`${session.trainerName} ⭐ ${session.trainerRating || '—'}`} icon="person-outline" />
      </View>

      <View style={{ marginTop: 11 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
          <Text style={{ fontSize: 11, color: COLORS.inkFaint }}>Sĩ số lớp</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: isFull ? COLORS.red : COLORS.rail }}>
            {session.enrolledCount}/{session.maxCapacity} {isFull ? '· Đã đầy' : ''}
          </Text>
        </View>
        <ProgressBar value={fillPct} tone={isFull ? 'rust' : 'rail'} size="sm" />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Button size="sm" variant="outline" icon="document-text-outline" style={{ flex: 1 }} onPress={onMaterials}>
          Giáo trình
        </Button>

        {isCheckedIn ? (
          <Button size="sm" variant="outline" icon="star-outline" style={{ flex: 1 }} onPress={onSurvey}>
            Đánh giá lớp
          </Button>
        ) : session.isEnrolled ? (
          <Button size="sm" variant="primary" icon="qr-code-outline" style={{ flex: 1 }} onPress={onScan}>
            Quét QR
          </Button>
        ) : (
          <Button size="sm" variant="primary" icon="add-outline" style={{ flex: 1 }} disabled={isFull || isCompleted} onPress={onEnroll}>
            {isFull ? 'Đã đầy' : 'Đăng ký'}
          </Button>
        )}
      </View>
    </Card>
  );
}
