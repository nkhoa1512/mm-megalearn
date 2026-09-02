import React, { useState } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Button, ProgressBar } from '../../features/common/ui';

export default function LearnerLeaderboard() {
  const { gamification } = useCourseStore();
  const [scope, setScope] = useState('DEPT'); // DEPT or COMPANY
  const { userStats, badges, leaderboard } = gamification;

  const xpProgress = Math.round((userStats.points / userStats.nextLevelXp) * 100);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Leaderboard &amp; Achievements</h1>
            <span className="streak-pill">
              <i className="ti ti-flame" /> {userStats.streakDays}-Day Streak
            </span>
          </div>
          <p>
            Earn Experience Points (XP) through lesson completions, maintain your daily learning streak, and compete across store branches.
          </p>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        {/* Level Card */}
        <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)', color: '#ffffff', borderColor: '#0D9488' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>Competency Tier</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Level {userStats.currentLevel}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              <i className="ti ti-crown" />
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{userStats.levelTitle}</div>
          <ProgressBar value={xpProgress} tone="amber" size="sm" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.9, marginTop: 6 }}>
            <span>{userStats.points} XP</span>
            <span>{userStats.nextLevelXp - userStats.points} XP to Level 5</span>
          </div>
        </div>

        {/* Streak Card */}
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Learning Streak</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--amber-soft-text)', marginTop: 4 }}>
                <i className="ti ti-flame" style={{ marginRight: 4 }} />
                {userStats.streakDays} Days
              </div>
            </div>
            <div className="stat-icon-badge" style={{ background: '#FFEDD5', color: 'var(--amber-soft-text)' }}>
              <i className="ti ti-calendar-stats" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
              <div
                key={day}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '6px 0',
                  borderRadius: 6,
                  background: idx < 6 ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' : 'var(--paper-sunken)',
                  color: idx < 6 ? '#ffffff' : 'var(--ink-faint)',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {day}
                <div style={{ fontSize: 10 }}>{idx < 6 ? '✓' : '•'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rank Card */}
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Department Rank (PPF)</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--rail)', marginTop: 4 }}>
                Rank #{userStats.rankInDept} <span style={{ fontSize: 13, color: 'var(--sage)', fontWeight: 600 }}>▲ Top 5%</span>
              </div>
            </div>
            <div className="stat-icon-badge" style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)' }}>
              <i className="ti ti-trophy" />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '8px 12px', borderRadius: 6 }}>
            Company-wide Ranking: <strong>#{userStats.rankInCompany}</strong> / 2,145 associates
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* Left Col: Leaderboard Table */}
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-label" style={{ margin: 0 }}>This Week's Leaderboard</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button size="sm" variant={scope === 'DEPT' ? 'primary' : 'ghost'} onClick={() => setScope('DEPT')}>Department</Button>
              <Button size="sm" variant={scope === 'COMPANY' ? 'primary' : 'ghost'} onClick={() => setScope('COMPANY')}>Company-wide</Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {leaderboard.map((user) => (
              <div key={user.rank} className={`leaderboard-row ${user.isCurrent ? 'current-user' : ''}`}>
                <div className={`rank-badge rank-${user.rank <= 3 ? user.rank : 'other'}`}>
                  {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : user.rank}
                </div>

                <div className="avatar" style={{ background: user.isCurrent ? 'var(--rail)' : 'var(--slate)', color: '#fff', fontSize: 11, fontWeight: 700, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {user.avatar}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {user.name}
                    {user.isCurrent && <span style={{ fontSize: 10, background: 'var(--rail)', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>You</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{user.department} &middot; Level {user.level}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rail)' }}>{user.points} XP</div>
                  <div style={{ fontSize: 11, color: 'var(--amber-soft-text)' }}>
                    <i className="ti ti-flame" /> {user.streak}d
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Badges Collection */}
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-label" style={{ margin: 0 }}>Badges &amp; Accolades ({badges.filter((b) => b.earned).length}/{badges.length})</div>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>5 Badges Unlocked</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {badges.map((badge) => (
              <div
                key={badge.id}
                style={{
                  border: '1px solid',
                  borderColor: badge.earned ? 'var(--line)' : 'var(--paper-sunken)',
                  background: badge.earned ? 'var(--paper-raised)' : 'var(--paper-sunken)',
                  opacity: badge.earned ? 1 : 0.6,
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'start',
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: badge.tier === 'Gold' ? 'var(--amber-soft)' : badge.tier === 'Silver' ? 'var(--slate-soft)' : '#FFEDD5',
                    color: badge.tier === 'Gold' ? 'var(--amber-soft-text)' : badge.tier === 'Silver' ? 'var(--ink-soft)' : '#9A3412',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  <i className={`ti ${badge.icon}`} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {badge.name}
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: badge.tier === 'Gold' ? 'var(--amber-soft)' : 'var(--slate-soft)', color: badge.tier === 'Gold' ? 'var(--amber-soft-text)' : 'var(--ink-soft)' }}>
                      {badge.tier}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.4 }}>
                    {badge.description}
                  </div>
                  {badge.earned ? (
                    <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 6, fontWeight: 600 }}>
                      ✓ Earned {badge.earnedDate}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 }}>
                      🔒 Locked
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

