import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, ProgressBar } from '../common/ui';
import VisualRoadmapTimeline from './VisualRoadmapTimeline';
import { getCourseImage } from '../../data/courseImages';

const TABS = [
  { id: 'CURRENT', label: 'Lộ Trình Hiện Tại', labelVi: 'Lộ Trình Hiện Tại', labelEn: 'Current Level Roadmap', icon: 'ti-map-pin' },
  { id: 'SUCCESSION', label: 'Lộ Trình Kế Cận', labelVi: 'Lộ Trình Kế Cận', labelEn: 'Succession Roadmap', icon: 'ti-arrow-up-circle' },
  { id: 'SELF_PROPOSED', label: 'Lộ Trình Tự Đề Xuất', labelVi: 'Lộ Trình Tự Đề Xuất', labelEn: 'Self-Proposed Tracks', icon: 'ti-list-details' },
  { id: 'RECOMMENDED', label: 'Khóa Học Gợi Ý', labelVi: 'Khóa Học Gợi Ý', labelEn: 'Recommended Courses', icon: 'ti-sparkles' },
];

// 4 tab lộ trình học tập dùng chung — dùng ở cả trang /learner/paths riêng
// lẫn nhúng trực tiếp trên Personal Learning Dashboard.
export default function RoadmapTabsPanel({ user, initialTab = 'CURRENT' }) {
  const navigate = useNavigate();
  const { getUserRoadmapTabs, requestRoadmapPromotion, levelAdvanceRequestsFor, enrollCourse, language, t } = useCourseStore();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [requestState, setRequestState] = useState(null); // null | 'ok' | 'not-ready'

  const roadmap = getUserRoadmapTabs(user);

  const alreadyRequested = (levelAdvanceRequestsFor(user) || []).some(
    (a) => a.requestType === 'ROADMAP_PROMOTION' && a.userId === user?.userId && a.status === 'PENDING'
  );

  function handleRequestPromotion() {
    const result = requestRoadmapPromotion(user);
    setRequestState(result.ok ? 'ok' : 'not-ready');
  }

  function openCourse(course) {
    navigate(`/my-learning/${course.id}`);
  }

  function joinTrack(track) {
    track.milestones.forEach(({ course, completed }) => {
      if (!completed) enrollCourse(course.id, user);
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map((tab) => {
          const tabLabel = language === 'en' ? tab.labelEn : tab.labelVi;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn btn-sm"
              style={{
                background: activeTab === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
                color: activeTab === tab.id ? '#fff' : 'var(--ink)',
                borderColor: activeTab === tab.id ? 'var(--rail)' : 'var(--line-strong)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <i className={`ti ${tab.icon}`} />
              {tabLabel}
            </button>
          );
        })}
      </div>

      {activeTab === 'CURRENT' && (
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>
              {language === 'en' ? `Level ${roadmap.level} Framework` : `Định Biên Level ${roadmap.level}`}
            </div>
            <Badge tone={roadmap.current.done ? 'sage' : 'amber'}>
              {roadmap.current.percent}% {language === 'en' ? 'Completed' : 'Hoàn Thành'}
            </Badge>
          </div>
          <ProgressBar value={roadmap.current.percent} tone={roadmap.current.done ? 'sage' : 'rail'} />
          <div style={{ marginTop: 20 }}>
            <VisualRoadmapTimeline milestones={roadmap.current.milestones} onOpenCourse={openCourse} />
          </div>
        </div>
      )}

      {activeTab === 'SUCCESSION' && (
        <div className="card card-pad">
          {!roadmap.nextLevel ? (
            <div className="empty-state">
              <i className="ti ti-crown" style={{ color: 'var(--amber)' }} />
              <p>{language === 'en' ? 'Already at the highest level (Level 1) — no succession roadmap.' : 'Đã ở cấp bậc cao nhất (Level 1) — không còn Lộ trình kế cận.'}</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18, padding: '12px 16px', borderRadius: 8, background: roadmap.succession.locked ? '#FEF2F2' : '#F0FDF4', color: roadmap.succession.locked ? '#991B1B' : '#166534' }}>
                <i className={`ti ${roadmap.succession.locked ? 'ti-lock' : 'ti-confetti'}`} style={{ fontSize: 20 }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {roadmap.succession.locked
                    ? (language === 'en'
                        ? `You must complete 100% of your Current Level Roadmap (Level ${roadmap.level}) to participate in this track.`
                        : `Bạn phải hoàn thành 100% Lộ trình hiện tại (Level ${roadmap.level}) để tham gia lộ trình này.`)
                    : (language === 'en'
                        ? `Completed Level ${roadmap.level}! Succession Roadmap Level ${roadmap.nextLevel} is now unlocked.`
                        : `Đã hoàn thành định biên Level ${roadmap.level}. Lộ trình kế cận Level ${roadmap.nextLevel} đã được mở khóa!`)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  {language === 'en' ? `Succession Level ${roadmap.nextLevel}` : `Kế Cận Level ${roadmap.nextLevel}`}
                </div>
                <Badge tone={roadmap.succession.percent >= 100 ? 'sage' : 'amber'}>
                  {roadmap.succession.percent}% {language === 'en' ? 'Completed' : 'Hoàn Thành'}
                </Badge>
              </div>
              <ProgressBar value={roadmap.succession.percent} tone={roadmap.succession.percent >= 100 ? 'sage' : 'rail'} />

              <div style={{ marginTop: 20 }}>
                <VisualRoadmapTimeline milestones={roadmap.succession.milestones} locked={roadmap.succession.locked} onOpenCourse={openCourse} />
              </div>

              {roadmap.succession.unlocked && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  {roadmap.succession.percent >= 100 ? (
                    alreadyRequested || requestState === 'ok' ? (
                      <Badge tone="sage" icon="ti-clock">
                        {language === 'en' ? 'Promotion review request is pending Admin approval' : 'Hồ sơ đề xuất đang chờ User Admin / System Admin duyệt'}
                      </Badge>
                    ) : (
                      <Button variant="primary" icon="ti-award" onClick={handleRequestPromotion}>
                        {language === 'en' ? 'Submit Promotion & Succession Review Request' : 'Gửi Hồ Sơ Đề Xuất Đánh Giá Thăng Cấp'}
                      </Button>
                    )
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {language === 'en' ? 'Complete 100% of courses above to unlock the promotion request button.' : 'Hoàn thành 100% các khóa trên để mở nút đề xuất thăng cấp.'}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'SELF_PROPOSED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-route-2" style={{ fontSize: 18 }} />
              <span>
                {language === 'en'
                  ? 'Specialized elective career tracks automatically tailored to your Department, Job Role and Level.'
                  : `Lộ trình chuyên đề tự chọn được cá nhân hóa tự động theo đúng Phòng Ban (${user?.departmentName || user?.departmentCode || 'Bộ phận'}), Chức danh và Cấp bậc hiện tại.`}
              </span>
            </div>
            <Badge tone="rail">{roadmap.selfProposed.tracks.length} Chuyên Đề Nâng Cao</Badge>
          </div>

          {roadmap.selfProposed.tracks.length === 0 ? (
            <div className="card empty-state">
              <i className="ti ti-mood-empty" />
              <p>{language === 'en' ? 'No tracks available for current level.' : 'Chưa có track nào phù hợp cấp bậc hiện tại.'}</p>
            </div>
          ) : (
            roadmap.selfProposed.tracks.map((track) => (
              <div key={track.id} className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--rail-soft)', color: 'var(--rail)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
                      <i className={`ti ${track.icon}`} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--ink)' }}>{language === 'en' ? (track.titleEn || track.titleVi) : track.titleVi}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{track.description}</div>
                    </div>
                  </div>
                  {track.joined ? (
                    <Badge tone={track.percent >= 100 ? 'sage' : 'amber'}>
                      {track.percent}% {language === 'en' ? 'Completed' : 'Hoàn Thành'}
                    </Badge>
                  ) : (
                    <Button size="sm" variant="primary" icon="ti-plus" onClick={() => joinTrack(track)}>
                      {language === 'en' ? 'Enroll This Track' : 'Bắt Đầu Lộ Trình Này'}
                    </Button>
                  )}
                </div>

                {track.joined && (
                  <div style={{ marginBottom: 12 }}>
                    <ProgressBar value={track.percent} tone={track.percent >= 100 ? 'sage' : 'rail'} size="sm" />
                  </div>
                )}

                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 6 }}>
                  {language === 'en' ? 'Courses in this track (click to study):' : 'Các khóa học trong lộ trình (bấm để xem chi tiết & vào học):'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {track.milestones.map(({ course, completed, status }) => (
                    <button
                      type="button"
                      key={course.id}
                      onClick={() => openCourse(course)}
                      className="card-interactive"
                      style={{
                        background: completed ? '#F0FDF4' : status === 'IN_PROGRESS' ? '#FEF3C7' : 'var(--paper-sunken)',
                        border: `1px solid ${completed ? '#BBF7D0' : status === 'IN_PROGRESS' ? '#FDE68A' : 'var(--line)'}`,
                        borderRadius: 6,
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      title={course.title}
                    >
                      <i
                        className={`ti ${completed ? 'ti-circle-check' : status === 'IN_PROGRESS' ? 'ti-clock' : 'ti-book-2'}`}
                        style={{ color: completed ? 'var(--sage)' : status === 'IN_PROGRESS' ? 'var(--amber)' : 'var(--ink-soft)' }}
                      />
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)' }}>{course.code}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {course.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'RECOMMENDED' && (
        <div>
          <div style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 12.5, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-sparkles" style={{ fontSize: 18, color: 'var(--amber)' }} />
              <span>
                {language === 'en'
                  ? 'Smart AI recommendations matched with your Department, Job Position, and Target Level.'
                  : `Gợi ý thông minh phù hợp theo Khối ${user?.branchName || ''}, Phòng ${user?.departmentName || user?.departmentCode || 'Ban'} và Vị trí ${user?.position || ''}.`}
              </span>
            </div>
            <Badge tone="amber">{roadmap.recommended.length} Khóa Phù Hợp</Badge>
          </div>

          {roadmap.recommended.length === 0 ? (
            <div className="card empty-state">
              <i className="ti ti-mood-empty" />
              <p>{language === 'en' ? 'No new recommendations — you have completed most relevant courses.' : 'Không có gợi ý mới — bạn đã hoàn thành hầu hết các khóa phù hợp.'}</p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: 16 }}>
              {roadmap.recommended.map((course) => (
                <div key={course.id} className="card card-interactive" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--line)' }}>
                  <div style={{ position: 'relative', height: 110, width: '100%', background: 'var(--paper-sunken)' }}>
                    <img
                      src={getCourseImage(course)}
                      alt={course.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', top: 6, left: 6 }}>
                      <Badge tone="rail" size="sm">Level {course.targetLevel}</Badge>
                    </div>
                    {course.recommendationReason && (
                      <div style={{ position: 'absolute', bottom: 6, left: 6, right: 6 }}>
                        <span style={{ background: 'rgba(15, 23, 42, 0.85)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <i className="ti ti-sparkles" style={{ color: '#FBBF24', marginRight: 4 }} />
                          {course.recommendationReason}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginBottom: 4 }}>
                        <span>{course.code}</span>
                        <span>{course.duration || '2-4h'} &middot; +100 XP</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.35, minHeight: 36 }}>
                        {course.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 12 }}>
                        <i className="ti ti-category" style={{ marginRight: 4 }} />
                        {course.domain} &middot; {course.modality === 'IN_PERSON_CLASSROOM' ? 'Lớp Trực Tiếp' : 'E-Learning'}
                      </div>
                    </div>
                    <Button size="sm" variant="primary" icon="ti-player-play" block onClick={() => openCourse(course)}>
                      {language === 'en' ? 'Start Course' : 'Bắt Đầu Học Ngay'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
