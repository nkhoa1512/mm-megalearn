import React, { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import {
  currentUser as fallbackUser,
  getUserLearningHistory,
  orgPathLabel,
  totalLearningHours,
} from '../data/mockData';
import { Badge } from '../components/ui';
import { Screen, Card, COLORS, ChipRow, EmptyState } from '../components/layout';

const TYPE_META: Record<string, { label: string; tone: string; icon: string; color: string }> = {
  ASSESSMENT: { label: 'Bài sát hạch', tone: 'amber', icon: 'create-outline', color: COLORS.amber },
  LESSON: { label: 'Bài học / SOP', tone: 'rail', icon: 'book-outline', color: COLORS.rail },
  CLASSROOM_CHECKIN: { label: 'Điểm danh QR', tone: 'blue', icon: 'qr-code-outline', color: COLORS.blue },
};

export default function LearningHistoryScreen() {
  const { currentUser: authUser, courses: allCourses, enrollments } = useCourseStore();
  const user = authUser || fallbackUser;

  const logs = useMemo(() => getUserLearningHistory(user), [user]);
  const learningHours = totalLearningHours(allCourses, user, enrollments);

  const [type, setType] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return logs.filter((log: any) => {
      if (type !== 'ALL' && log.type !== type) return false;
      if (!q) return true;
      return (
        (log.title || '').toLowerCase().includes(q) ||
        (log.moduleTitle || '').toLowerCase().includes(q) ||
        (log.auditCode || '').toLowerCase().includes(q)
      );
    });
  }, [logs, type, search]);

  const assessments = logs.filter((l: any) => l.type === 'ASSESSMENT');
  const scores = assessments.filter((l: any) => l.score != null).map((l: any) => l.score);
  const avgScore = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

  return (
    <Screen title="Lịch Sử Học Tập" subtitle={orgPathLabel(user)} back scroll={false}>
      <FlatList
        data={filtered}
        keyExtractor={(l: any) => l.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Card style={{ backgroundColor: COLORS.railSoft, borderColor: '#99F6E4' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name="finger-print" size={19} color={COLORS.rail} style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 11.5, color: COLORS.rail, flex: 1, lineHeight: 17 }}>
                  Nhật ký bất biến ghi nhận mọi lần hoàn thành bài học, lượt thi và điểm danh lớp trực tiếp — phục vụ
                  kiểm toán nội bộ & HRD.
                </Text>
              </View>
            </Card>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
              <MiniStat label="Sự kiện đã ghi" value={`${logs.length}`} color={COLORS.ink} />
              <MiniStat label="Tổng giờ học" value={`${learningHours.toFixed(1)}h`} color={COLORS.blue} />
              <MiniStat label="Lượt sát hạch" value={`${assessments.length}`} color={COLORS.amber} />
              <MiniStat label="Điểm trung bình" value={avgScore ? `${avgScore}%` : '—'} color={COLORS.green} />
            </View>

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
                placeholder="Tìm theo tên bài học hoặc mã kiểm toán…"
                placeholderTextColor={COLORS.inkFaint}
                style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: 13, color: COLORS.ink }}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.inkFaint} />
                </TouchableOpacity>
              )}
            </View>

            <ChipRow
              options={[
                { value: 'ALL', label: 'Tất cả', count: logs.length },
                { value: 'ASSESSMENT', label: 'Sát hạch', count: assessments.length },
                {
                  value: 'LESSON',
                  label: 'Bài học',
                  count: logs.filter((l: any) => l.type === 'LESSON').length,
                },
                {
                  value: 'CLASSROOM_CHECKIN',
                  label: 'Điểm danh',
                  count: logs.filter((l: any) => l.type === 'CLASSROOM_CHECKIN').length,
                },
              ]}
              value={type}
              onChange={setType}
            />
          </View>
        }
        ListEmptyComponent={<EmptyState icon="time-outline" title="Chưa có bản ghi phù hợp" />}
        renderItem={({ item }: { item: any }) => {
          const meta = TYPE_META[item.type] || TYPE_META.LESSON;
          return (
            <Card style={{ borderLeftWidth: 3, borderLeftColor: meta.color, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: `${meta.color}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.ink, lineHeight: 17 }} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.inkSoft, marginTop: 3 }} numberOfLines={2}>
                    {item.moduleTitle}
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                    <Badge tone={meta.tone as any} size="sm">
                      {meta.label}
                    </Badge>
                    {item.score != null && (
                      <Badge tone={item.passed ? 'sage' : 'rust'} size="sm">
                        {item.score}% {item.passed ? 'Đạt' : 'Chưa đạt'}
                      </Badge>
                    )}
                    {!!item.attempt && (
                      <Badge tone="slate" size="sm">
                        Lần {item.attempt}
                      </Badge>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time-outline" size={11} color={COLORS.inkFaint} />
                      <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginLeft: 3 }}>{item.timestamp}</Text>
                    </View>
                    {!!item.timeSpent && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="hourglass-outline" size={11} color={COLORS.inkFaint} />
                        <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginLeft: 3 }}>{item.timeSpent}</Text>
                      </View>
                    )}
                  </View>

                  {!!item.auditCode && (
                    <Text style={{ fontSize: 10, color: COLORS.inkFaint, marginTop: 5 }}>🔒 {item.auditCode}</Text>
                  )}
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
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
      <Text style={{ fontSize: 10.5, fontWeight: '800', color: COLORS.inkFaint }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 19, fontWeight: '900', color, marginTop: 3 }}>{value}</Text>
    </View>
  );
}
