import React, { useState } from 'react';
import { Badge, Button, Modal } from './ui';

const STATUS_META = {
  COMPLETED: { color: 'var(--sage)', bg: 'var(--sage-soft)', icon: 'ti-check' },
  IN_PROGRESS: { color: 'var(--amber)', bg: 'var(--amber-soft)', icon: 'ti-player-play' },
  NOT_STARTED: { color: 'var(--slate)', bg: 'var(--slate-soft)', icon: 'ti-book-2' },
};
const LOCKED_META = { color: 'var(--ink-faint)', bg: 'var(--paper-sunken)', icon: 'ti-lock' };

// Bản đồ hành trình dạng timeline ngang: avatar học viên -> các chặng môn học
// so le trên/dưới, nối bằng 1 đường thẳng -> cờ đích. Bấm vào 1 chặng mở popup
// chi tiết khóa học kèm nút Vào Học Ngay / Xem Lại Bài Giảng.
export default function VisualRoadmapTimeline({ milestones, locked = false, onOpenCourse }) {
  const [selected, setSelected] = useState(null);

  if (milestones.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', padding: '24px 0', textAlign: 'center' }}>
        Chưa có khóa học nào được cấu hình cho lộ trình này.
      </div>
    );
  }

  const allCompleted = !locked && milestones.every((m) => m.completed);

  return (
    <>
      <div style={{ overflowX: 'auto', padding: '44px 10px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: milestones.length * 140 + 120, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 44, right: 44, top: '50%', height: 3, background: 'var(--line-strong)', zIndex: 0 }} />

          <div style={{ zIndex: 1, width: 40, height: 40, borderRadius: '50%', background: 'var(--rail)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Bạn">
            <i className="ti ti-user" aria-hidden="true" />
          </div>

          {milestones.map((m, idx) => {
            const isTop = idx % 2 === 0;
            const meta = locked ? LOCKED_META : (STATUS_META[m.status] || STATUS_META.NOT_STARTED);
            return (
              <div key={m.course.id} style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                {isTop && (
                  <div
                    style={{ marginBottom: 8, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink)', maxWidth: 118, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={m.course.title}
                  >
                    {m.course.title}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => !locked && setSelected(m)}
                  disabled={locked}
                  style={{
                    width: 46, height: 46, borderRadius: '50%', border: `3px solid ${meta.color}`,
                    background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, cursor: locked ? 'default' : 'pointer', flexShrink: 0,
                  }}
                  title={m.course.title}
                >
                  <i className={`ti ${meta.icon}`} aria-hidden="true" />
                </button>
                {!isTop && (
                  <div
                    style={{ marginTop: 8, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink)', maxWidth: 118, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={m.course.title}
                  >
                    {m.course.title}
                  </div>
                )}
              </div>
            );
          })}

          <div
            style={{
              zIndex: 1, width: 40, height: 40, borderRadius: '50%',
              background: allCompleted ? 'var(--sage)' : 'var(--paper-raised)',
              border: `2px solid ${allCompleted ? 'var(--sage)' : 'var(--line-strong)'}`,
              color: allCompleted ? '#fff' : 'var(--ink-faint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
            title="Đích đến"
          >
            <i className="ti ti-flag" aria-hidden="true" />
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.course.title}
        subtitle={selected ? `${selected.course.code} · ${selected.course.estimatedHours || ''}` : ''}
      >
        {selected && (
          <div>
            <Badge tone={selected.completed ? 'sage' : selected.status === 'IN_PROGRESS' ? 'amber' : 'slate'} icon={selected.completed ? 'ti-check' : 'ti-clock'}>
              {selected.completed ? 'Đã hoàn thành' : selected.status === 'IN_PROGRESS' ? 'Đang học' : 'Chưa bắt đầu'}
            </Badge>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 10, lineHeight: 1.6 }}>{selected.course.description}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button
                variant="primary"
                icon={selected.completed ? 'ti-rotate' : 'ti-player-play'}
                onClick={() => onOpenCourse && onOpenCourse(selected.course)}
              >
                {selected.completed ? 'Xem Lại Bài Giảng' : 'Vào Học Ngay'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
