import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Button, JobLevelBadge } from '../common/ui';
import { getCourseImage } from '../../data/courseImages';
import { useCourseStore } from '../../store/CourseStore';

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
    labelVi: 'Completed',
  },
  IN_PROGRESS: {
    color: '#d97706',
    bg: '#fef3c7',
    border: '#f59e0b',
    icon: 'ti-player-play',
    labelKey: 'timeline_in_progress',
    labelVi: 'In Progress',
  },
  NOT_STARTED: {
    color: 'var(--slate)',
    bg: 'var(--slate-soft)',
    border: 'var(--line-strong)',
    icon: 'ti-book-2',
    labelKey: 'timeline_not_started',
    labelVi: 'Not Started',
  },
};
const LOCKED_META = {
  color: 'var(--ink-faint)',
  bg: 'var(--paper-sunken)',
  border: 'var(--line)',
  icon: 'ti-lock',
  labelKey: 'timeline_locked',
  labelVi: 'Locked',
};

// The round image node shared by Start / Milestone / Finish. The background icon layer is always
// drawn first — if the illustration (an Unsplash hotlink) fails to load, the <img> hides itself
// and the background icon shows through, avoiding an empty circle.
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

// The horizontal connector between two nodes, as tall as NODE_SIZE and auto-centred on the
// node (thanks to alignItems: 'center') so it stays aligned when the label below wraps.
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

  // The popover is portalled straight to document.body (position: fixed using viewport
  // coordinates) because the parent ".card" has overflow: hidden — if it rendered
  // inside the scroll frame, the popover would be clipped exactly at the card's bottom edge.
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
      <div style={{ fontSize: 13, color: 'var(--ink-faint)', padding: '28px 0', textAlign: 'center' }}>
        <i className="ti ti-map-pin-off" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--ink-faint)' }} />
        {t('timeline_empty', 'No courses have been configured for this roadmap yet.')}
      </div>
    );
  }

  const allCompleted = !locked && milestones.every((m) => m.completed);
  const completedCount = milestones.filter((m) => m.completed).length;
  const neutralLine = locked ? 'var(--line)' : 'var(--line-strong)';
  const doneLine = locked ? 'var(--line)' : '#10b981';

  // Hovering a milestone: compute the popover position directly below that node using the
  // viewport coordinates (position: fixed via a portal), centred on the node and
  // clamped inside the screen edges so it never overflows; when there is not enough room
  // below, it flips above the node instead.
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
          <i className="ti ti-rocket" /> {language === 'en' ? 'Starting Point' : 'Starting Point'}
        </span>
        <span style={{ fontWeight: 600 }}>
          {language === 'en' ? 'Progress: ' : 'Progress: '}<strong style={{ color: allCompleted ? 'var(--sage)' : 'var(--ink)' }}>{completedCount}/{milestones.length} {language === 'en' ? 'stages' : 'stages'}</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: allCompleted ? 'var(--sage)' : 'var(--amber)' }}>
          <i className="ti ti-flag-filled" /> {language === 'en' ? 'Goal' : 'Finish Flag'}
        </span>
      </div>

      {/* Horizontal Scrollable Path — a clear horizontal scrollbar at the bottom of the frame,
          with labels fixed below each node (no zigzag) for readability.
          Hovering a milestone shows its information popover in place rather than requiring a click. */}
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
                {language === 'en' ? 'Start' : 'Start'}
              </div>
            </div>

            <HConnector color={milestones[0].completed ? doneLine : neutralLine} />

            {/* MILESTONE NODES */}
            {milestones.map((m, idx) => {
              const meta = locked ? LOCKED_META : (STATUS_META[m.status] || STATUS_META.NOT_STARTED);
              const isHovered = hovered?.course.id === m.course.id;
              const isLastMilestone = idx === milestones.length - 1;
              const stageText = language === 'en' ? `STAGE ${idx + 1}` : `STAGE ${idx + 1}`;
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
                {language === 'en' ? 'Finish' : 'Finish'}
              </div>
            </div>
          </div>
        </div>

        {/* HOVER POPOVER — quick information about the hovered milestone, anchored just below
            that node. Portalled to document.body because the parent ".card" has overflow:
            hidden, so a popover nested inside would be clipped at the card edge. */}
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
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
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
                  ? (language === 'en' ? 'Completed' : 'Completed')
                  : hovered.status === 'IN_PROGRESS'
                  ? (language === 'en' ? 'In Progress' : 'In progress')
                  : (language === 'en' ? 'Not Started' : 'Not started')}
              </Badge>
            </div>

            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8 }}>
              {hovered.course.domain || hovered.course.category} &middot; {language === 'en' ? 'Duration: ' : 'Duration: '}{hovered.course.estimatedHours || '2.5h'} &middot; {language === 'en' ? 'Pass: ' : 'Pass score: '}{hovered.course.passingScore || 80}%
            </div>

            <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8, marginBottom: 10, lineHeight: 1.5, ...clampStyle }}>
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
                ? (language === 'en' ? 'Review Lesson' : 'Review The Lesson')
                : (language === 'en' ? 'Start Learning' : 'Start Learning')}
            </Button>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
