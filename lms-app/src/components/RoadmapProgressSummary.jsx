import React from 'react';
import { Badge, ProgressBar } from './ui';

// Tóm tắt Tab 1 (Lộ trình hiện tại) + Tab 2 (Lộ trình kế cận) của 1 nhân sự,
// dùng lại ở ManagerTeam.jsx và UserTranscriptModal.jsx cho Manager/HRBP/User
// Admin xem tiến độ trước khi duyệt đề xuất thăng cấp.
export default function RoadmapProgressSummary({ roadmap }) {
  if (!roadmap) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Tab 1 &middot; Lộ Trình Hiện Tại (Level {roadmap.level})</span>
          <Badge tone={roadmap.current.done ? 'sage' : 'amber'}>{roadmap.current.percent}%</Badge>
        </div>
        <ProgressBar value={roadmap.current.percent} tone={roadmap.current.done ? 'sage' : 'rail'} size="sm" />
      </div>

      {roadmap.nextLevel && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>Tab 2 &middot; Lộ Trình Kế Cận (Level {roadmap.nextLevel})</span>
            <Badge tone={roadmap.succession.percent >= 100 ? 'sage' : roadmap.succession.locked ? 'slate' : 'amber'}>
              {roadmap.succession.locked ? 'Đang khóa' : `${roadmap.succession.percent}%`}
            </Badge>
          </div>
          <ProgressBar value={roadmap.succession.locked ? 0 : roadmap.succession.percent} tone="rail" size="sm" />
        </div>
      )}

      {roadmap.current.done && roadmap.nextLevel && (
        <div style={{ background: '#F0FDF4', color: '#166534', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-lock-open" aria-hidden="true" />
          Đã đủ điều kiện mở khóa Lộ trình kế cận
        </div>
      )}
    </div>
  );
}
