import React, { useMemo, useState } from 'react';
import { Share, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import { currentUser as fallbackUser } from '../data/mockData';
// @ts-ignore
import { buildCalendarEvents as buildCalendarEventsRaw, EVENT_CATEGORIES as EVENT_CATEGORIES_RAW } from '../utils/calendarEvents';

// buildCalendarEvents() trả về một Map có gắn thêm các thuộc tính phụ
// (personalEvents / operationalEvents), thứ TypeScript không suy luận được từ JS.
const buildCalendarEvents = buildCalendarEventsRaw as unknown as (args: any) => {
  personalEvents: any[];
  operationalEvents: any[];
};
const EVENT_CATEGORIES: Record<string, any> = EVENT_CATEGORIES_RAW;
// @ts-ignore
import {
  todayDateString,
  firstOfMonth,
  addMonths,
  getMonthGridWeeks,
  formatMonthLabel,
  formatFullDateLabel,
  formatRelativeDay,
  generateIcsFile,
} from '../utils/calendarDate';
import { Badge } from '../components/ui';
import { Screen, Card, COLORS, ChipRow, EmptyState, HeaderIconButton, Segmented, useColors } from '../components/layout';

// getMonthGridWeeks() dựng lưới bắt đầu từ Chủ Nhật (dayIdx 0), nên thứ tự
// tiêu đề cột phải khớp — nếu để T2 trước sẽ lệch nhãn cả tháng.
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const CATEGORY_COLOR: Record<string, string> = {
  ELEARNING: COLORS.blue,
  CLASSROOM_ILT: COLORS.green,
  VIRTUAL_CLASS: COLORS.purple,
  ASSESSMENT: COLORS.amber,
  CERTIFICATE: COLORS.red,
  OPERATIONAL: COLORS.rail,
};

const CATEGORY_ICON: Record<string, string> = {
  ELEARNING: 'book-outline',
  CLASSROOM_ILT: 'easel-outline',
  VIRTUAL_CLASS: 'videocam-outline',
  ASSESSMENT: 'trophy-outline',
  CERTIFICATE: 'ribbon-outline',
  OPERATIONAL: 'briefcase-outline',
};

export default function LearnerCalendarScreen() {
  const COLORS = useColors();
  const navigation = useNavigation<any>();
  const { courses, myEnrollments, classrooms, assessments, currentUser: authUser, users } = useCourseStore();
  const user = authUser || fallbackUser;

  const today = todayDateString();
  // Giữ nguyên quy ước của bản web: chuỗi ngày đầy đủ 'YYYY-MM-01', vì addMonths()
  // cũng trả về dạng này.
  const [month, setMonth] = useState(() => firstOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [category, setCategory] = useState('ALL');
  const [mode, setMode] = useState<'MONTH' | 'AGENDA'>('MONTH');

  const eventsByDate = useMemo(
    () =>
      buildCalendarEvents({
        courses,
        myEnrollments,
        classrooms,
        assessments,
        role: 'learner',
        currentUser: user,
        users,
      }),
    [courses, myEnrollments, classrooms, assessments, user, users]
  );

  // Học viên chỉ quan tâm lịch cá nhân — bỏ nhánh OPERATIONAL vốn dành cho
  // manager/trainer trong bản web.
  const personalEvents = useMemo(
    () => (eventsByDate.personalEvents || []).filter((e: any) => category === 'ALL' || e.category === category),
    [eventsByDate, category]
  );

  const filteredByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    personalEvents.forEach((e: any) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [personalEvents]);

  const weeks = useMemo(() => getMonthGridWeeks(month), [month]);
  const selectedEvents = filteredByDate[selectedDate] || [];

  const upcoming = useMemo(
    () =>
      personalEvents
        .filter((e: any) => e.date >= today)
        .sort((a: any, b: any) => a.date.localeCompare(b.date))
        .slice(0, 25),
    [personalEvents, today]
  );

  const categoryOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    (eventsByDate.personalEvents || []).forEach((e: any) => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return [
      { value: 'ALL', label: 'Tất cả', count: (eventsByDate.personalEvents || []).length },
      ...Object.keys(EVENT_CATEGORIES)
        .filter((k) => k !== 'ALL' && k !== 'OPERATIONAL' && counts[k])
        .map((k) => ({ value: k, label: EVENT_CATEGORIES[k].labelVi, count: counts[k] })),
    ];
  }, [eventsByDate]);

  async function exportIcs() {
    const ics = generateIcsFile(upcoming, `Lich hoc ${user.fullName}`);
    try {
      await Share.share({ title: ics.fileName, message: ics.content });
    } catch {
      // Người dùng huỷ share sheet — không cần xử lý gì thêm.
    }
  }

  return (
    <Screen
      title="Lịch Học Tập"
      subtitle={`${personalEvents.length} sự kiện cá nhân`}
      right={
        <>
          <HeaderIconButton icon="share-outline" onPress={exportIcs} />
          <HeaderIconButton icon="easel-outline" tone="green" onPress={() => navigation.navigate('Classrooms')} />
        </>
      }
    >
      <Segmented
        options={[
          { value: 'MONTH', label: '📅 Theo tháng' },
          { value: 'AGENDA', label: '📋 Sắp tới' },
        ]}
        value={mode}
        onChange={(v) => setMode(v as any)}
      />

      <ChipRow options={categoryOptions} value={category} onChange={setCategory} />

      {mode === 'MONTH' ? (
        <>
          <Card padded={false} style={{ padding: 10 }}>
            {/* Month switcher */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                paddingHorizontal: 2,
              }}
            >
              <TouchableOpacity
                onPress={() => setMonth(addMonths(month, -1))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <Ionicons name="chevron-back" size={19} color={COLORS.inkSoft} />
              </TouchableOpacity>
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.ink }}>
                {formatMonthLabel(month, 'vi')}
              </Text>
              <TouchableOpacity
                onPress={() => setMonth(addMonths(month, 1))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <Ionicons name="chevron-forward" size={19} color={COLORS.inkSoft} />
              </TouchableOpacity>
            </View>

            {/* Weekday header */}
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              {WEEKDAYS.map((d) => (
                <Text
                  key={d}
                  style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: '800', color: COLORS.inkFaint }}
                >
                  {d}
                </Text>
              ))}
            </View>

            {/* Day grid */}
            {weeks.map((week: any[], wi: number) => (
              <View key={wi} style={{ flexDirection: 'row' }}>
                {week.map((day: any, di: number) => {
                  const dateStr = day.date;
                  const inMonth = day.inMonth;
                  const dayEvents = filteredByDate[dateStr] || [];
                  const isSelected = dateStr === selectedDate;
                  const isToday = dateStr === today;
                  return (
                    <TouchableOpacity
                      key={di}
                      onPress={() => setSelectedDate(dateStr)}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        aspectRatio: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: 1.5,
                        borderRadius: 9,
                        backgroundColor: isSelected ? COLORS.green : isToday ? COLORS.greenSoft : 'transparent',
                        borderWidth: isToday && !isSelected ? 1 : 0,
                        borderColor: COLORS.green,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontWeight: isSelected || isToday ? '800' : '600',
                          color: isSelected ? '#FFFFFF' : inMonth ? COLORS.ink : COLORS.inkFaint,
                        }}
                      >
                        {Number(dateStr.slice(8, 10))}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 2, height: 5, marginTop: 2 }}>
                        {dayEvents.slice(0, 3).map((e: any, idx: number) => (
                          <View
                            key={idx}
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: isSelected ? '#FFFFFF' : CATEGORY_COLOR[e.category] || COLORS.rail,
                            }}
                          />
                        ))}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </Card>

          <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink, marginBottom: 3, marginTop: 4 }}>
            {formatFullDateLabel(selectedDate, 'vi')}
          </Text>
          <Text style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 10 }}>
            {formatRelativeDay(selectedDate, 'vi')} · {selectedEvents.length} sự kiện
          </Text>

          {selectedEvents.length === 0 ? (
            <EmptyState icon="calendar-clear-outline" title="Không có lịch trong ngày này" />
          ) : (
            selectedEvents.map((e: any) => <EventCard key={e.id} event={e} navigation={navigation} />)
          )}
        </>
      ) : upcoming.length === 0 ? (
        <EmptyState icon="calendar-clear-outline" title="Chưa có sự kiện sắp tới" />
      ) : (
        upcoming.map((e: any) => (
          <View key={e.id}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.inkFaint, marginBottom: 5, marginTop: 4 }}>
              {formatFullDateLabel(e.date, 'vi').toUpperCase()} · {formatRelativeDay(e.date, 'vi')}
            </Text>
            <EventCard event={e} navigation={navigation} />
          </View>
        ))
      )}
    </Screen>
  );
}

function EventCard({ event, navigation }: { event: any; navigation: any }) {
  const COLORS = useColors();
  const color = CATEGORY_COLOR[event.category] || COLORS.rail;
  const icon = CATEGORY_ICON[event.category] || 'calendar-outline';

  function open() {
    if (event.courseId) navigation.navigate('CourseOverview', { courseId: event.courseId });
    else if (event.category === 'CLASSROOM_ILT') navigation.navigate('Classrooms');
    else if (event.category === 'CERTIFICATE') navigation.navigate('Certificates');
  }

  return (
    <Card onPress={open} style={{ padding: 12, borderLeftWidth: 3, borderLeftColor: color }}>
      <View style={{ flexDirection: 'row' }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: `${color}18`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Ionicons name={icon as any} size={16} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.ink, lineHeight: 17 }} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={{ fontSize: 11, color: COLORS.inkSoft, marginTop: 3 }} numberOfLines={2}>
            {event.subtitle}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 6 }}>
            <Badge tone={(event.tone || 'slate') as any} size="sm">
              {event.categoryLabel || EVENT_CATEGORIES[event.category]?.labelVi || event.category}
            </Badge>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time-outline" size={11} color={COLORS.inkFaint} />
              <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginLeft: 3 }}>{event.time}</Text>
            </View>
          </View>
          {!!event.venue && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="location-outline" size={11} color={COLORS.inkFaint} />
              <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginLeft: 3, flex: 1 }} numberOfLines={1}>
                {event.venue}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}
