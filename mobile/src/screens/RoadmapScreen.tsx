import React, { useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import { levelDefinition } from '../data/levelSystem';
// @ts-ignore
import { getCourseImage } from '../data/courseImages';
import { Badge, Button, ProgressBar } from '../components/ui';
import { Screen, Card, COLORS, EmptyState } from '../components/layout';

const TABS = [
  { id: 'CURRENT', label: 'Hiện tại', icon: 'location-outline' },
  { id: 'SUCCESSION', label: 'Kế cận', icon: 'arrow-up-circle-outline' },
  { id: 'SELF_PROPOSED', label: 'Chuyên đề', icon: 'list-outline' },
  { id: 'RECOMMENDED', label: 'Gợi ý', icon: 'sparkles-outline' },
];

export default function RoadmapScreen() {
  const navigation = useNavigation<any>();
  const {
    currentUser: user,
    getUserRoadmapTabs,
    requestRoadmapPromotion,
    levelAdvanceRequestsFor,
    enrollCourse,
  } = useCourseStore();

  const [activeTab, setActiveTab] = useState('CURRENT');
  const [requestState, setRequestState] = useState<null | 'ok' | 'not-ready'>(null);

  const roadmap = getUserRoadmapTabs(user);
  const levelDef = levelDefinition(user?.level);

  const alreadyRequested = (levelAdvanceRequestsFor(user) || []).some(
    (a: any) => a.requestType === 'ROADMAP_PROMOTION' && a.userId === user?.userId && a.status === 'PENDING'
  );

  function openCourse(course: any) {
    navigation.navigate('CourseOverview', { courseId: course.id });
  }

  function joinTrack(track: any) {
    track.milestones.forEach(({ course, completed }: any) => {
      if (!completed) enrollCourse(course.id, user);
    });
  }

  function requestPromotion() {
    const result = requestRoadmapPromotion(user);
    setRequestState(result.ok ? 'ok' : 'not-ready');
  }

  return (
    <Screen
      title="Lộ Trình Học Tập"
      subtitle={`${levelDef.emoji} Level ${user?.level} · ${levelDef.shortVi}`}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 13,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? COLORS.rail : COLORS.line,
                backgroundColor: active ? COLORS.rail : COLORS.paper,
                marginRight: 7,
              }}
            >
              <Ionicons name={tab.icon as any} size={14} color={active ? '#FFFFFF' : COLORS.inkSoft} />
              <Text
                style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : COLORS.inkSoft, marginLeft: 5 }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeTab === 'CURRENT' && (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.ink }}>
                Định biên Level {roadmap.level}
              </Text>
              <Badge tone={roadmap.current.done ? 'sage' : 'amber'} size="sm">
                {roadmap.current.percent}% hoàn thành
              </Badge>
            </View>
            <ProgressBar value={roadmap.current.percent} tone={roadmap.current.done ? 'sage' : 'rail'} />
          </Card>

          <Timeline milestones={roadmap.current.milestones} onOpen={openCourse} />
        </>
      )}

      {activeTab === 'SUCCESSION' &&
        (!roadmap.nextLevel ? (
          <EmptyState
            icon="trophy-outline"
            title="Đã ở cấp bậc cao nhất"
            hint="Bạn đang ở Level 1 — không còn lộ trình kế cận phía trên."
          />
        ) : (
          <>
            <Card
              style={{
                backgroundColor: roadmap.succession.locked ? COLORS.redSoft : COLORS.greenSoft,
                borderColor: roadmap.succession.locked ? '#FECACA' : '#A7F3D0',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons
                  name={roadmap.succession.locked ? 'lock-closed' : 'sparkles'}
                  size={19}
                  color={roadmap.succession.locked ? COLORS.red : COLORS.green}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: roadmap.succession.locked ? '#991B1B' : '#166534',
                    flex: 1,
                    lineHeight: 17,
                    fontWeight: '600',
                  }}
                >
                  {roadmap.succession.locked
                    ? `Bạn phải hoàn thành 100% lộ trình hiện tại (Level ${roadmap.level}) để tham gia lộ trình kế cận.`
                    : `Đã hoàn thành định biên Level ${roadmap.level}. Lộ trình kế cận Level ${roadmap.nextLevel} đã mở khóa!`}
                </Text>
              </View>
            </Card>

            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.ink }}>
                  Kế cận Level {roadmap.nextLevel}
                </Text>
                <Badge tone={roadmap.succession.percent >= 100 ? 'sage' : 'amber'} size="sm">
                  {roadmap.succession.percent}%
                </Badge>
              </View>
              <ProgressBar value={roadmap.succession.percent} tone={roadmap.succession.percent >= 100 ? 'sage' : 'rail'} />
            </Card>

            <Timeline milestones={roadmap.succession.milestones} locked={roadmap.succession.locked} onOpen={openCourse} />

            {roadmap.succession.unlocked && (
              <Card>
                {roadmap.succession.percent >= 100 ? (
                  alreadyRequested || requestState === 'ok' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time" size={17} color={COLORS.green} style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 12, color: COLORS.greenDark, fontWeight: '700', flex: 1, lineHeight: 17 }}>
                        Hồ sơ đề xuất thăng cấp đang chờ User Admin / System Admin duyệt.
                      </Text>
                    </View>
                  ) : (
                    <Button variant="primary" icon="trophy-outline" onPress={requestPromotion}>
                      Gửi hồ sơ đề xuất đánh giá thăng cấp
                    </Button>
                  )
                ) : (
                  <Text style={{ fontSize: 12, color: COLORS.inkSoft, lineHeight: 17 }}>
                    Hoàn thành 100% các khóa ở trên để mở nút đề xuất thăng cấp.
                  </Text>
                )}
                {requestState === 'not-ready' && (
                  <Text style={{ fontSize: 11.5, color: COLORS.red, marginTop: 8, lineHeight: 16 }}>
                    Chưa đủ điều kiện gửi hồ sơ. Hãy hoàn tất toàn bộ khóa học của lộ trình kế cận.
                  </Text>
                )}
              </Card>
            )}
          </>
        ))}

      {activeTab === 'SELF_PROPOSED' && (
        <>
          <Card style={{ backgroundColor: COLORS.railSoft, borderColor: '#99F6E4' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="git-branch" size={18} color={COLORS.rail} style={{ marginRight: 9 }} />
              <Text style={{ fontSize: 11.5, color: COLORS.rail, flex: 1, lineHeight: 17 }}>
                Lộ trình chuyên đề tự chọn được cá nhân hóa theo Phòng ban (
                {user?.departmentName || user?.departmentCode || 'Bộ phận'}), chức danh và cấp bậc hiện tại của bạn.
              </Text>
            </View>
          </Card>

          {roadmap.selfProposed.tracks.length === 0 ? (
            <EmptyState icon="file-tray-outline" title="Chưa có chuyên đề phù hợp cấp bậc hiện tại" />
          ) : (
            roadmap.selfProposed.tracks.map((track: any) => (
              <Card key={track.id}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: COLORS.railSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 11,
                    }}
                  >
                    <Ionicons name="school-outline" size={18} color={COLORS.rail} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.ink, lineHeight: 19 }}>
                      {track.titleVi}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 3, lineHeight: 16 }}>
                      {track.description}
                    </Text>
                  </View>
                </View>

                {track.joined ? (
                  <View style={{ marginBottom: 11 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={{ fontSize: 11, color: COLORS.inkFaint }}>Tiến độ chuyên đề</Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.rail }}>{track.percent}%</Text>
                    </View>
                    <ProgressBar value={track.percent} tone={track.percent >= 100 ? 'sage' : 'rail'} size="sm" />
                  </View>
                ) : (
                  <Button size="sm" variant="primary" icon="add-outline" style={{ marginBottom: 11 }} onPress={() => joinTrack(track)}>
                    Bắt đầu chuyên đề này
                  </Button>
                )}

                <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.inkFaint, marginBottom: 7 }}>
                  {track.milestones.length} khóa học trong lộ trình
                </Text>
                {track.milestones.map(({ course, completed, status }: any) => (
                  <TouchableOpacity
                    key={course.id}
                    onPress={() => openCourse(course)}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: completed
                        ? COLORS.greenSoft
                        : status === 'IN_PROGRESS'
                        ? COLORS.amberSoft
                        : COLORS.sunken,
                      borderWidth: 1,
                      borderColor: completed ? '#BBF7D0' : status === 'IN_PROGRESS' ? '#FDE68A' : COLORS.line,
                      borderRadius: 8,
                      padding: 9,
                      marginBottom: 6,
                    }}
                  >
                    <Ionicons
                      name={completed ? 'checkmark-circle' : status === 'IN_PROGRESS' ? 'time' : 'book-outline'}
                      size={15}
                      color={completed ? COLORS.green : status === 'IN_PROGRESS' ? COLORS.amber : COLORS.inkFaint}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ fontSize: 11.5, color: COLORS.ink, flex: 1, lineHeight: 16 }} numberOfLines={2}>
                      {course.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Card>
            ))
          )}
        </>
      )}

      {activeTab === 'RECOMMENDED' && (
        <>
          <Card style={{ backgroundColor: COLORS.amberSoft, borderColor: '#FDE68A' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="sparkles" size={18} color={COLORS.amber} style={{ marginRight: 9 }} />
              <Text style={{ fontSize: 11.5, color: '#B45309', flex: 1, lineHeight: 17 }}>
                Gợi ý dựa trên cấp bậc, khối công tác hiện tại và các khóa học bạn chưa hoàn thành.
              </Text>
            </View>
          </Card>

          {roadmap.recommended.length === 0 ? (
            <EmptyState
              icon="checkmark-done-outline"
              title="Không có gợi ý mới"
              hint="Bạn đã hoàn thành hầu hết các khóa phù hợp với vị trí hiện tại."
            />
          ) : (
            roadmap.recommended.map((course: any) => (
              <Card key={course.id} onPress={() => openCourse(course)} style={{ padding: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={{ uri: getCourseImage(course) }}
                    style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: COLORS.sunken, marginRight: 11 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.ink, lineHeight: 17 }} numberOfLines={2}>
                      {course.title}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginTop: 3 }} numberOfLines={1}>
                      {course.code} · {course.category || course.domain}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.inkFaint} />
                </View>
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

/** Dòng thời gian các cột mốc khóa học — thay cho VisualRoadmapTimeline của web. */
function Timeline({
  milestones = [],
  locked = false,
  onOpen,
}: {
  milestones: any[];
  locked?: boolean;
  onOpen: (course: any) => void;
}) {
  if (!milestones.length) {
    return <EmptyState icon="map-outline" title="Lộ trình chưa có khóa học nào" />;
  }

  return (
    <View>
      {milestones.map(({ course, completed, status }: any, idx: number) => {
        const isLast = idx === milestones.length - 1;
        const dotColor = locked
          ? COLORS.inkFaint
          : completed
          ? COLORS.green
          : status === 'IN_PROGRESS'
          ? COLORS.amber
          : COLORS.line;

        return (
          <View key={course.id} style={{ flexDirection: 'row' }}>
            {/* Rail */}
            <View style={{ width: 30, alignItems: 'center' }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: completed && !locked ? COLORS.green : COLORS.paper,
                  borderWidth: 2,
                  borderColor: dotColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {locked ? (
                  <Ionicons name="lock-closed" size={10} color={COLORS.inkFaint} />
                ) : completed ? (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 9.5, fontWeight: '900', color: COLORS.inkFaint }}>{idx + 1}</Text>
                )}
              </View>
              {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: COLORS.line, marginVertical: 2 }} />}
            </View>

            {/* Card */}
            <View style={{ flex: 1, paddingBottom: 10 }}>
              <TouchableOpacity
                onPress={() => !locked && onOpen(course)}
                activeOpacity={locked ? 1 : 0.8}
                style={{
                  backgroundColor: COLORS.paper,
                  borderWidth: 1,
                  borderColor: COLORS.line,
                  borderRadius: 12,
                  padding: 12,
                  opacity: locked ? 0.65 : 1,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.ink, lineHeight: 18 }} numberOfLines={2}>
                  {course.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                  <Badge tone={completed ? 'sage' : status === 'IN_PROGRESS' ? 'amber' : 'slate'} size="sm">
                    {completed ? 'Hoàn thành' : status === 'IN_PROGRESS' ? 'Đang học' : 'Chưa bắt đầu'}
                  </Badge>
                  <Text style={{ fontSize: 10.5, color: COLORS.inkFaint }}>{course.code}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}
