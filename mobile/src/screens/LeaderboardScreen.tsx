import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
import { Badge, ProgressBar } from '../components/ui';
import { Screen, Card, COLORS, SectionTitle, Segmented, EmptyState } from '../components/layout';

const TIER_COLOR: Record<string, string> = {
  Gold: '#D97706',
  Silver: '#64748B',
  Bronze: '#B45309',
  Platinum: '#0F766E',
};

export default function LeaderboardScreen() {
  const { gamification } = useCourseStore();
  const { userStats, badges = [], leaderboard = [] } = gamification || {};
  const [tab, setTab] = useState<'RANK' | 'BADGES'>('RANK');

  if (!userStats) {
    return (
      <Screen title="Bảng Thi Đua" back>
        <EmptyState icon="trophy-outline" title="Chưa có dữ liệu thi đua" />
      </Screen>
    );
  }

  const xpProgress = Math.round((userStats.points / Math.max(1, userStats.nextLevelXp)) * 100);
  const earnedBadges = badges.filter((b: any) => b.earned);

  return (
    <Screen title="Bảng Thi Đua & Thành Tích" subtitle={`${userStats.points} XP · hạng ${userStats.rankInDept} phòng ban`} back>
      {/* Level / XP hero */}
      <Card style={{ backgroundColor: COLORS.rail, borderColor: '#0D9488' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 11 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.85)', fontWeight: '800', letterSpacing: 0.5 }}>
              BẬC NĂNG LỰC
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginTop: 2 }}>
              Level {userStats.currentLevel}
            </Text>
            <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 3 }}>
              {userStats.levelTitle}
            </Text>
          </View>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="trophy" size={20} color="#FFFFFF" />
          </View>
        </View>

        <ProgressBar value={xpProgress} tone="amber" size="sm" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
          <Text style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)' }}>{userStats.points} XP</Text>
          <Text style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)' }}>
            Còn {Math.max(0, userStats.nextLevelXp - userStats.points)} XP lên cấp
          </Text>
        </View>
      </Card>

      {/* Quick stats */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <StatBox icon="flame" label="Chuỗi ngày học" value={`${userStats.streakDays}`} color="#C2410C" />
        <StatBox icon="podium" label="Hạng phòng ban" value={`#${userStats.rankInDept}`} color={COLORS.rail} />
        <StatBox icon="business" label="Hạng toàn công ty" value={`#${userStats.rankInCompany}`} color={COLORS.blue} />
        <StatBox icon="medal" label="Huy hiệu đạt được" value={`${userStats.totalBadgesEarned}`} color={COLORS.amber} />
      </View>

      <Segmented
        options={[
          { value: 'RANK', label: `🏆 Xếp hạng (${leaderboard.length})` },
          { value: 'BADGES', label: `🎖 Huy hiệu (${earnedBadges.length}/${badges.length})` },
        ]}
        value={tab}
        onChange={(v) => setTab(v as any)}
      />

      {tab === 'RANK' ? (
        <>
          <SectionTitle icon="podium">Bảng xếp hạng học tập</SectionTitle>
          {leaderboard.map((row: any) => (
            <Card
              key={row.rank}
              style={{
                padding: 12,
                backgroundColor: row.isCurrent ? COLORS.greenSoft : COLORS.paper,
                borderColor: row.isCurrent ? '#A7F3D0' : COLORS.line,
                borderWidth: row.isCurrent ? 1.5 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: rankColor(row.rank),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '900', color: row.rank <= 3 ? '#FFFFFF' : COLORS.inkSoft }}>
                    {row.rank}
                  </Text>
                </View>

                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: COLORS.railSoft,
                    borderWidth: 1,
                    borderColor: '#99F6E4',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '900', color: COLORS.rail }}>{row.avatar}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink }} numberOfLines={1}>
                      {row.name}
                    </Text>
                    {row.isCurrent && (
                      <View
                        style={{
                          marginLeft: 6,
                          backgroundColor: COLORS.green,
                          paddingHorizontal: 6,
                          paddingVertical: 1.5,
                          borderRadius: 999,
                        }}
                      >
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>BẠN</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginTop: 2 }} numberOfLines={1}>
                    {row.department}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '900', color: COLORS.rail }}>{row.points}</Text>
                  <Text style={{ fontSize: 9.5, color: COLORS.inkFaint }}>XP · 🔥{row.streak}</Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      ) : (
        <>
          <SectionTitle icon="medal">Bộ sưu tập huy hiệu</SectionTitle>
          {badges.map((badge: any) => (
            <Card
              key={badge.id}
              style={{
                padding: 12,
                opacity: badge.earned ? 1 : 0.55,
                borderColor: badge.earned ? TIER_COLOR[badge.tier] || COLORS.line : COLORS.line,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: badge.earned ? `${TIER_COLOR[badge.tier] || COLORS.rail}20` : COLORS.sunken,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 11,
                  }}
                >
                  <Ionicons
                    name={badge.earned ? 'medal' : 'lock-closed'}
                    size={20}
                    color={badge.earned ? TIER_COLOR[badge.tier] || COLORS.rail : COLORS.inkFaint}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink }}>{badge.name}</Text>
                    {!!badge.tier && (
                      <Badge tone={badge.tier === 'Gold' ? 'amber' : badge.tier === 'Platinum' ? 'rail' : 'slate'} size="sm">
                        {badge.tier}
                      </Badge>
                    )}
                  </View>
                  <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 4, lineHeight: 16 }}>
                    {badge.description}
                  </Text>
                  {badge.earned && !!badge.earnedDate && (
                    <Text style={{ fontSize: 10.5, color: COLORS.green, marginTop: 5, fontWeight: '700' }}>
                      ✓ Đạt ngày {badge.earnedDate}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.inkFaint }} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <Text style={{ fontSize: 19, fontWeight: '900', color }}>{value}</Text>
    </View>
  );
}

function rankColor(rank: number) {
  if (rank === 1) return '#D97706';
  if (rank === 2) return '#94A3B8';
  if (rank === 3) return '#B45309';
  return COLORS.sunken;
}
