import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Button, JobLevelBadge } from './ui';
import { getCourseImage } from '../data/courseImages';
import { useCourseStore } from '../state/CourseStore';

const NODE_SIZE = 64;
const COLUMN_WIDTH = 180;
const POPOVER_WIDTH = 300;

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

// Node ảnh tròn dùng chung cho Start / Milestone / Finish. Lớp icon nền luôn
// được vẽ trước — nếu ảnh minh họa (hotlink Unsplash) load lỗi thì <img> tự ẩn
// và icon nền lộ ra, tránh vòng tròn trống trơn.
function NodeCircle({ size = NODE_SIZE, borderColor, bg, iconColor, icon, imageSrc, imageAlt, grayscale, scale = 1 }) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `3px solid ${borderColor}`,
        background: bg,
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow: scale > 1 ? '0 6px 16px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.08)',
        transform: `scale(${scale})`,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          fontSize: size * 0.4,
        }}
      >
        <i className={`ti ${icon}`} aria-hidden="true" />
      </div>
      {imageSrc && (
        <img
          src={imageSrc}
          alt={imageAlt}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: grayscale ? 'grayscale(80%) opacity(60%)' : 'none',
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
    </div>
  );
}

// Đường nối ngang giữa 2 node, cao bằng NODE_SIZE và tự canh giữa theo tâm
// node (nhờ alignItems: 'center') để không bị lệch khi nhãn bên dưới xuống dòng.
function HConnector({ color }) {
  return (
    <div style={{ flex: 1, minWidth: 28, height: NODE_SIZE, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ width: '100%', height: 4, background: color, borderRadius: 2 }} />
    </div>
  );
}

const clampStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

export default function VisualRoadmapTimeline({ milestones = [], locked = false, onOpenCourse }) {
  const { t, language } = useCourseStore();
  const [hovered, setHovered] = useState(null);
  const [popoverPos, setPopoverPos] = useState(null);
  const wrapperRef = useRef(null);
  const hideTimer = useRef(null);

  // Popover được portal thẳng ra document.body (position: fixed theo toạ độ
  // viewport) vì thẻ ".card" cha có overflow: hidden — nếu render lồng bên
  // trong khung cuộn, popover sẽ bị cắt cụt ở đúng biên dưới của thẻ card.
  useEffect(() => {
    if (!hovered) return;
    function handleDismiss() { setHovered(null); }
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [hovered]);

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
  const neutralLine = locked ? 'var(--line)' : 'var(--line-strong)';
  const doneLine = locked ? 'var(--line)' : '#10b981';

  // Hover vào 1 mốc: tính vị trí popover ngay bên dưới node đó theo toạ độ
  // viewport (dùng position: fixed qua portal), canh giữa theo tâm node và
  // kẹp trong biên màn hình để không tràn ra ngoài; nếu không đủ chỗ phía
  // dưới thì tự lật lên phía trên node.
  const POPOVER_EST_HEIGHT = 260;
  function showPopover(m, evt) {
    if (locked) return;
    clearTimeout(hideTimer.current);
    const nodeRect = evt.currentTarget.getBoundingClientRect();
    const rawLeft = nodeRect.left + nodeRect.width / 2;
    const minLeft = POPOVER_WIDTH / 2 + 8;
    const maxLeft = window.innerWidth - POPOVER_WIDTH / 2 - 8;
    const fitsBelow = nodeRect.bottom + 10 + POPOVER_EST_HEIGHT <= window.innerHeight;
    setPopoverPos({
      left: Math.min(Math.max(rawLeft, minLeft), maxLeft),
      top: fitsBelow ? nodeRect.bottom + 10 : undefined,
      bottom: fitsBelow ? undefined : window.innerHeight - nodeRect.top + 10,
    });
    setHovered(m);
  }
  function hidePopoverDelayed() {
    hideTimer.current = setTimeout(() => setHovered(null), 150);
  }
  function cancelHide() {
    clearTimeout(hideTimer.current);
  }

  return (
    <div>
      <style>{`
        .roadmap-h-scroll { scrollbar-width: auto; scrollbar-color: var(--line-strong) var(--paper-sunken); }
        .roadmap-h-scroll::-webkit-scrollbar { height: 12px; }
        .roadmap-h-scroll::-webkit-scrollbar-track { background: var(--paper-sunken); border-radius: 8px; }
        .roadmap-h-scroll::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 8px; border: 2px solid var(--paper-sunken); }
        .roadmap-h-scroll::-webkit-scrollbar-thumb:hover { background: var(--ink-faint); }
      `}</style>

      {/* Progress Summary Ribbon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, color: 'var(--ink-soft)', flexWrap: 'wrap', gap: 8 }}>
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

      {/* Horizontal Scrollable Path — thanh cuộn ngang rõ ở đáy khung,
          nhãn luôn nằm cố định phía dưới node (không zigzag) để dễ đọc.
          Hover vào 1 mốc hiện popover thông tin ngay tại đó thay vì phải bấm. */}
      <div ref={wrapperRef} style={{ position: 'relative' }}>
        <div
          className="roadmap-h-scroll"
          style={{ overflowX: 'auto', padding: '26px 52px 20px', background: 'var(--paper-raised)', borderRadius: 12, border: '1px solid var(--line)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* START NODE */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: COLUMN_WIDTH, flexShrink: 0 }}>
              <NodeCircle
                borderColor="#1d4ed8"
                bg="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                iconColor="#fff"
                icon="ti-player-play-filled"
              />
              <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#2563eb', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                {language === 'en' ? 'Start' : 'Xuất Phát'}
              </div>
            </div>

            <HConnector color={milestones[0].completed ? doneLine : neutralLine} />

            {/* MILESTONE NODES */}
            {milestones.map((m, idx) => {
              const meta = locked ? LOCKED_META : (STATUS_META[m.status] || STATUS_META.NOT_STARTED);
              const isHovered = hovered?.course.id === m.course.id;
              const isLastMilestone = idx === milestones.length - 1;
              const stageText = language === 'en' ? `STAGE ${idx + 1}` : `CHẶNG ${idx + 1}`;
              const statusLabel = language === 'en' ? t(meta.labelKey, meta.labelVi) : meta.labelVi;

              return (
                <React.Fragment key={m.course.id}>
                  <button
                    type="button"
                    onMouseEnter={(e) => showPopover(m, e)}
                    onMouseLeave={hidePopoverDelayed}
                    onFocus={(e) => showPopover(m, e)}
                    onBlur={hidePopoverDelayed}
                    onClick={() => !locked && onOpenCourse && onOpenCourse(m.course)}
                    disabled={locked}
                    title={m.course.title}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', width: COLUMN_WIDTH, flexShrink: 0,
                      background: 'none', border: 'none', padding: 0, cursor: locked ? 'default' : 'pointer',
                    }}
                  >
                    <NodeCircle
                      borderColor={meta.border}
                      bg={meta.bg}
                      iconColor={meta.color}
                      icon={meta.icon}
                      imageSrc={getCourseImage(m.course)}
                      imageAlt={m.course.title}
                      grayscale={locked}
                      scale={isHovered ? 1.1 : 1}
                    />
                    <div
                      style={{
                        marginTop: 10,
                        textAlign: 'center',
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 8,
                        background: isHovered ? 'var(--paper-sunken)' : 'transparent',
                        border: isHovered ? '1px solid var(--blue)' : '1px solid transparent',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, marginBottom: 3 }}>
                        {stageText}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isHovered ? 'var(--blue)' : 'var(--ink)', lineHeight: 1.35, ...clampStyle }}>
                        {m.course.title}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <Badge tone={locked ? 'slate' : m.completed ? 'sage' : m.status === 'IN_PROGRESS' ? 'amber' : 'slate'} icon={meta.icon}>
                          {statusLabel}
                        </Badge>
                      </div>
                    </div>
                  </button>

                  {!isLastMilestone && <HConnector color={m.completed ? doneLine : neutralLine} />}
                </React.Fragment>
              );
            })}

            <HConnector color={allCompleted ? doneLine : neutralLine} />

            {/* FINISH NODE */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: COLUMN_WIDTH, flexShrink: 0 }}>
              <NodeCircle
                borderColor={allCompleted ? '#059669' : '#d97706'}
                bg={allCompleted ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}
                iconColor="#fff"
                icon={allCompleted ? 'ti-trophy' : 'ti-flag-filled'}
              />
              <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, fontWeight: 800, color: allCompleted ? '#059669' : '#d97706', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                {language === 'en' ? 'Finish' : 'Về Đích'}
              </div>
            </div>
          </div>
        </div>

        {/* HOVER POPOVER — thông tin nhanh về mốc đang hover, neo ngay dưới
            node đó. Portal ra document.body vì thẻ ".card" cha có overflow:
            hidden nên popover lồng bên trong sẽ bị cắt cụt ở biên card. */}
        {hovered && popoverPos && createPortal(
          <div
            onMouseEnter={cancelHide}
            onMouseLeave={hidePopoverDelayed}
            className="card"
            style={{
              position: 'fixed',
              left: popoverPos.left,
              top: popoverPos.top,
              bottom: popoverPos.bottom,
              transform: 'translateX(-50%)',
              width: POPOVER_WIDTH,
              zIndex: 9999,
              borderColor: 'var(--blue)',
              borderWidth: 1.5,
              background: 'var(--paper-raised)',
              boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
              padding: 14,
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 72, height: 54, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                  border: '1px solid var(--line)', background: 'var(--paper-sunken)',
                }}
              >
                <img
                  src={getCourseImage(hovered.course)}
                  alt={hovered.course.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
                    {hovered.course.code}
                  </span>
                  <JobLevelBadge level={hovered.course.targetLevel} compact />
                </div>
                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink)', lineHeight: 1.3 }}>
                  {hovered.course.title}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <Badge
                tone={hovered.completed ? 'sage' : hovered.status === 'IN_PROGRESS' ? 'amber' : 'slate'}
                icon={hovered.completed ? 'ti-check' : 'ti-clock'}
              >
                {hovered.completed
                  ? (language === 'en' ? 'Completed' : 'Đã hoàn thành')
                  : hovered.status === 'IN_PROGRESS'
                  ? (language === 'en' ? 'In Progress' : 'Đang học')
                  : (language === 'en' ? 'Not Started' : 'Chưa bắt đầu')}
              </Badge>
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 8 }}>
              {hovered.course.domain || hovered.course.category} &middot; {language === 'en' ? 'Duration: ' : 'Thời lượng: '}{hovered.course.estimatedHours || '2.5h'} &middot; {language === 'en' ? 'Pass: ' : 'Điểm đạt: '}{hovered.course.passingScore || 80}%
            </div>

            <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 8, marginBottom: 10, lineHeight: 1.5, ...clampStyle }}>
              {hovered.course.description}
            </p>

            <Button
              variant="primary"
              size="sm"
              block
              icon={hovered.completed ? 'ti-rotate' : 'ti-player-play'}
              onClick={() => onOpenCourse && onOpenCourse(hovered.course)}
            >
              {hovered.completed
                ? (language === 'en' ? 'Review Lesson' : 'Xem Lại Bài Giảng')
                : (language === 'en' ? 'Start Learning' : 'Vào Học Ngay')}
            </Button>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
