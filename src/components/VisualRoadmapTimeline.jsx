import React, { useState } from 'react';
import { Badge, Button, JobLevelBadge } from './ui';
import { getCourseImage } from '../data/courseImages';
import { useCourseStore } from '../state/CourseStore';

const STATUS_META = {
  COMPLETED: {
    color: 'var(--sage)',
    bg: 'var(--sage-soft)',
    border: '#10b981',
    icon: 'ti-check',
    labelKey: 'timeline_completed',
    labelVi: 'Đã Hoàn Thành',
  },
  IN_PROGRESS: {
    color: '#d97706',
    bg: '#fef3c7',
    border: '#f59e0b',
    icon: 'ti-player-play',
    labelKey: 'timeline_in_progress',
    labelVi: 'Đang Học',
  },
  NOT_STARTED: {
    color: 'var(--slate)',
    bg: 'var(--slate-soft)',
    border: 'var(--line-strong)',
    icon: 'ti-book-2',
    labelKey: 'timeline_not_started',
    labelVi: 'Chưa Bắt Đầu',
  },
};
const LOCKED_META = {
  color: 'var(--ink-faint)',
  bg: 'var(--paper-sunken)',
  border: 'var(--line)',
  icon: 'ti-lock',
  labelKey: 'timeline_locked',
  labelVi: 'Đang Khóa',
};

export default function VisualRoadmapTimeline({ milestones = [], locked = false, onOpenCourse }) {
  const { t, language } = useCourseStore();
  const [selected, setSelected] = useState(null);

  if (milestones.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', padding: '28px 0', textAlign: 'center' }}>
        <i className="ti ti-map-pin-off" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--ink-faint)' }} />
        {t('timeline_empty', 'Chưa có khóa học nào được cấu hình cho lộ trình này.')}
      </div>
    );
  }

  const allCompleted = !locked && milestones.every((m) => m.completed);
  const completedCount = milestones.filter((m) => m.completed).length;

  return (
    <div>
      {/* Visual Progress Bar Ribbon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12, color: 'var(--ink-soft)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--blue)' }}>
          <i className="ti ti-rocket" /> {language === 'en' ? 'Starting Point' : 'Điểm Xuất Phát'}
        </span>
        <span style={{ fontWeight: 600 }}>
          {language === 'en' ? 'Progress: ' : 'Tiến độ: '}<strong style={{ color: allCompleted ? 'var(--sage)' : 'var(--ink)' }}>{completedCount}/{milestones.length} {language === 'en' ? 'stages' : 'chặng'}</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: allCompleted ? 'var(--sage)' : 'var(--amber)' }}>
          <i className="ti ti-flag-filled" /> {language === 'en' ? 'Goal' : 'Cờ Về Đích'}
        </span>
      </div>

      {/* Horizontal Scrollable Timeline */}
      <div style={{ overflowX: 'auto', padding: '52px 16px 20px', background: 'var(--paper-raised)', borderRadius: 12, border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: milestones.length * 150 + 180, position: 'relative' }}>
          {/* Connector Line */}
          <div
            style={{
              position: 'absolute',
              left: 50,
              right: 50,
              top: '50%',
              height: 4,
              background: 'linear-gradient(90deg, #3b82f6 0%, #f59e0b 50%, #10b981 100%)',
              opacity: locked ? 0.35 : 0.85,
              borderRadius: 2,
              zIndex: 0,
            }}
          />

          {/* 1. START NODE (XUẤT PHÁT) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2, flexShrink: 0, width: 80 }}>
            <div
              style={{
                marginBottom: 8,
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: '#2563eb',
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
                background: '#eff6ff',
                padding: '2px 8px',
                borderRadius: 10,
                border: '1px solid #bfdbfe',
              }}
            >
              {language === 'en' ? 'Start' : 'Xuất Phát'}
            </div>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                fontSize: 22,
                cursor: 'default',
              }}
              title={language === 'en' ? 'Learning roadmap start node' : 'Điểm xuất phát lộ trình học tập'}
            >
              <i className="ti ti-player-play-filled" aria-hidden="true" />
            </div>
            <div style={{ marginTop: 6, fontSize: 10.5, fontWeight: 600, color: 'var(--ink-soft)' }}>
              {language === 'en' ? 'Start' : 'Khởi đầu'}
            </div>
          </div>

          {/* 2. MILESTONE NODES (CÁC MỐC TRÊN LỘ TRÌNH VỚI ẢNH) */}
          {milestones.map((m, idx) => {
            const isTop = idx % 2 === 0;
            const meta = locked ? LOCKED_META : (STATUS_META[m.status] || STATUS_META.NOT_STARTED);
            const isSelected = selected?.course.id === m.course.id;
            const courseImage = getCourseImage(m.course);
            const stageText = language === 'en' ? `STAGE ${idx + 1}` : `CHẶNG ${idx + 1}`;
            const statusLabel = language === 'en' ? t(meta.labelKey, meta.labelVi) : meta.labelVi;

            return (
              <div
                key={m.course.id}
                style={{
                  flex: 1,
                  minWidth: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {/* TOP LABEL */}
                {isTop && (
                  <div style={{ marginBottom: 10, textAlign: 'center', width: 130 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, marginBottom: 2 }}>
                      {stageText}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: isSelected ? 'var(--blue)' : 'var(--ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={m.course.title}
                    >
                      {m.course.title}
                    </div>
                  </div>
                )}

                {/* CIRCULAR IMAGE NODE */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => !locked && setSelected(isSelected ? null : m)}
                    disabled={locked}
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      padding: 0,
                      border: `3px solid ${meta.border}`,
                      boxShadow: isSelected
                        ? `0 0 0 4px ${meta.bg}, 0 6px 16px rgba(0,0,0,0.15)`
                        : '0 2px 8px rgba(0,0,0,0.08)',
                      background: meta.bg,
                      overflow: 'hidden',
                      cursor: locked ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                    }}
                    title={`${m.course.title} (${statusLabel})`}
                  >
                    <img
                      src={courseImage}
                      alt={m.course.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: locked ? 'grayscale(80%) opacity(60%)' : 'none',
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </button>

                  {/* MINI STATUS BADGE */}
                  <div
                    style={{
                      position: 'absolute',
                      right: -3,
                      bottom: -3,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: meta.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      border: '2px solid #fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  >
                    <i className={`ti ${meta.icon}`} aria-hidden="true" />
                  </div>
                </div>

                {/* BOTTOM LABEL */}
                {!isTop && (
                  <div style={{ marginTop: 10, textAlign: 'center', width: 130 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, marginBottom: 2 }}>
                      {stageText}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: isSelected ? 'var(--blue)' : 'var(--ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={m.course.title}
                    >
                      {m.course.title}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 3. FINISH NODE (CỜ VỀ ĐÍCH) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2, flexShrink: 0, width: 80 }}>
            <div
              style={{
                marginBottom: 8,
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: allCompleted ? '#059669' : '#d97706',
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
                background: allCompleted ? '#ecfdf5' : '#fef3c7',
                padding: '2px 8px',
                borderRadius: 10,
                border: `1px solid ${allCompleted ? '#a7f3d0' : '#fde68a'}`,
              }}
            >
              {language === 'en' ? 'Finish' : 'Về Đích'}
            </div>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: allCompleted
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: allCompleted
                  ? '0 4px 16px rgba(16, 185, 129, 0.4)'
                  : '0 4px 12px rgba(245, 158, 11, 0.3)',
                fontSize: 22,
                cursor: 'default',
              }}
              title={allCompleted ? (language === 'en' ? 'All Completed!' : 'Chúc mừng! Đã hoàn thành toàn bộ lộ trình') : (language === 'en' ? 'Finish Line' : 'Cờ về đích - Mục tiêu hoàn thành')}
            >
              <i className={allCompleted ? 'ti ti-trophy' : 'ti ti-flag-filled'} aria-hidden="true" />
            </div>
            <div style={{ marginTop: 6, fontSize: 10.5, fontWeight: 600, color: 'var(--ink-soft)' }}>
              {allCompleted ? (language === 'en' ? 'Completed' : 'Hoàn thành') : (language === 'en' ? 'Goal' : 'Đích đến')}
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED MILESTONE MODAL / CARD */}
      {selected && (
        <div
          className="card card-pad"
          style={{
            marginTop: 16,
            borderColor: 'var(--blue)',
            borderWidth: 1.5,
            background: 'var(--paper-raised)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
              {/* Milestone Image Thumbnail */}
              <div
                style={{
                  width: 110,
                  height: 75,
                  borderRadius: 8,
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  border: '1px solid var(--line)',
                }}
              >
                <img
                  src={getCourseImage(selected.course)}
                  alt={selected.course.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Milestone Details */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
                    {selected.course.code}
                  </span>
                  <JobLevelBadge level={selected.course.targetLevel} compact />
                  <Badge
                    tone={selected.completed ? 'sage' : selected.status === 'IN_PROGRESS' ? 'amber' : 'slate'}
                    icon={selected.completed ? 'ti-check' : 'ti-clock'}
                  >
                    {selected.completed
                      ? (language === 'en' ? 'Completed' : 'Đã hoàn thành')
                      : selected.status === 'IN_PROGRESS'
                      ? (language === 'en' ? 'In Progress' : 'Đang học')
                      : (language === 'en' ? 'Not Started' : 'Chưa bắt đầu')}
                  </Badge>
                </div>

                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', lineHeight: 1.35 }}>
                  {selected.course.title}
                </div>

                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                  {selected.course.domain || selected.course.category} &middot; {language === 'en' ? 'Duration: ' : 'Thời lượng: '}{selected.course.estimatedHours || '2.5h'} &middot; {language === 'en' ? 'Pass: ' : 'Điểm đạt: '}{selected.course.passingScore || 80}%
                </div>
              </div>
            </div>

            <button onClick={() => setSelected(null)} className="icon-btn" aria-label="Close">
              <i className="ti ti-x" />
            </button>
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 12, lineHeight: 1.6, marginBottom: 12 }}>
            {selected.course.description}
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(null)}
            >
              {t('close', 'Đóng')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={selected.completed ? 'ti-rotate' : 'ti-player-play'}
              onClick={() => onOpenCourse && onOpenCourse(selected.course)}
            >
              {selected.completed
                ? (language === 'en' ? 'Review Lesson' : 'Xem Lại Bài Giảng')
                : (language === 'en' ? 'Start Learning' : 'Vào Học Ngay')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
