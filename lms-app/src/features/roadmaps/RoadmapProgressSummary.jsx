import React from 'react';
import { Badge, ProgressBar } from '../common/ui';

// A summary of Tab 1 (current roadmap) + Tab 2 (succession roadmap) for one employee,
// reused in ManagerTeam.jsx and UserTranscriptModal.jsx so Manager/HRBP/User
// Admin can review progress before approving a promotion proposal.
export default function RoadmapProgressSummary({ roadmap }) {
  if (!roadmap) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Tab 1 &middot; Current Roadmap (Level {roadmap.level})</span>
          <Badge tone={roadmap.current.done ? 'sage' : 'amber'}>{roadmap.current.percent}%</Badge>
        </div>
        <ProgressBar value={roadmap.current.percent} tone={roadmap.current.done ? 'sage' : 'rail'} size="sm" />
      </div>

      {roadmap.nextLevel && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Tab 2 &middot; Succession Roadmap (Level {roadmap.nextLevel})</span>
            <Badge tone={roadmap.succession.percent >= 100 ? 'sage' : roadmap.succession.locked ? 'slate' : 'amber'}>
              {roadmap.succession.locked ? 'Locked' : `${roadmap.succession.percent}%`}
            </Badge>
          </div>
          <ProgressBar value={roadmap.succession.locked ? 0 : roadmap.succession.percent} tone="rail" size="sm" />
        </div>
      )}

      {roadmap.current.done && roadmap.nextLevel && (
        <div style={{ background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-lock-open" aria-hidden="true" />
          Eligible to unlock the succession roadmap
        </div>
      )}
    </div>
  );
}
