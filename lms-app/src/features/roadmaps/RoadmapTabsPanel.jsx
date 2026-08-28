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
          <div style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 12.5 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
            {language === 'en'
              ? 'Self-proposed specialized elective tracks for personal career development or assigned by direct manager.'
              : 'Các lộ trình chuyên đề mở rộng ngoài định biên — tự chọn theo định hướng phát triển bản thân, hoặc do Quản lý trực tiếp giao thêm.'}
          </div>
          {roadmap.selfProposed.tracks.length === 0 ? (
            <div className="card empty-state">
              <i className="ti ti-mood-empty" />
              <p>{language === 'en' ? 'No tracks available for current level.' : 'Chưa có track nào phù hợp cấp bậc hiện tại.'}</p>
            </div>
          ) : (
            roadmap.selfProposed.tracks.map((track) => (
              <div key={track.id} className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--rail-soft)', color: 'var(--rail)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${track.icon}`} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{language === 'en' ? (track.titleEn || track.titleVi) : track.titleVi}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{track.description}</div>
                    </div>
                  </div>
                  {track.joined ? (
                    <Badge tone={track.percent >= 100 ? 'sage' : 'amber'}>
                      {track.percent}% {language === 'en' ? 'Completed' : 'Hoàn Thành'}
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" icon="ti-plus" onClick={() => joinTrack(track)}>
                      {language === 'en' ? 'Start This Track' : 'Bắt Đầu Track Này'}
                    </Button>
                  )}
                </div>
                {track.joined && <ProgressBar value={track.percent} tone={track.percent >= 100 ? 'sage' : 'rail'} size="sm" />}
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {track.milestones.map(({ course, completed }) => (
                    <Badge key={course.id} tone={completed ? 'sage' : 'slate'} icon={completed ? 'ti-check' : 'ti-book-2'}>{course.code}</Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'RECOMMENDED' && (
        <div>
          <div style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>
            <i className="ti ti-sparkles" style={{ marginRight: 6 }} />
            {language === 'en'
              ? 'Recommendations based on current job level, operational department, and uncompleted courses.'
              : 'Gợi ý dựa trên cấp bậc, khối công tác hiện tại và các khóa học chưa hoàn thành.'}
          </div>
          {roadmap.recommended.length === 0 ? (
            <div className="card empty-state">
              <i className="ti ti-mood-empty" />
              <p>{language === 'en' ? 'No new recommendations — you have completed most relevant courses.' : 'Không có gợi ý mới — đã hoàn thành phần lớn nội dung phù hợp.'}</p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: 14 }}>
              {roadmap.recommended.map((course) => (
                <div key={course.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ height: 100, width: '100%', background: 'var(--paper-sunken)' }}>
                    <img
                      src={getCourseImage(course)}
                      alt={course.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginBottom: 2 }}>{course.code}</div>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.35, minHeight: 34 }}>{course.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 10 }}>{course.domain} &middot; Level {course.targetLevel}</div>
                    </div>
                    <Button size="sm" variant="outline" icon="ti-player-play" block onClick={() => openCourse(course)}>
                      {language === 'en' ? 'View Course' : 'Xem Khóa Học'}
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
