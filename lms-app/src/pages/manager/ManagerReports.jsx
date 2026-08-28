import React from 'react';
import { teamMembers } from '../../data/mockData';
import { StatCard, BarChart } from '../../components/ui';

export default function ManagerReports() {
  const avgProgress = Math.round(teamMembers.reduce((s, m) => s + m.progress, 0) / teamMembers.length);
  const completed = teamMembers.filter((m) => m.status === 'COMPLETED').length;
  const scored = teamMembers.filter((m) => m.score != null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, m) => s + m.score, 0) / scored.length) : null;

  return (
    <>
      <div className="page-header">
        <h1>Team reports</h1>
        <p>Progress, completion and assessment results across employees in your scope. Assignments cannot be changed here (BR-025).</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        <StatCard label="Team size" value={teamMembers.length} />
        <StatCard label="Avg. progress" value={`${avgProgress}%`} tone="rail" />
        <StatCard label="Avg. score" value={avgScore != null ? `${avgScore}%` : '—'} tone="sage" />
        <StatCard label="Needs attention" value={teamMembers.filter((m) => m.status === 'OVERDUE' || m.inactiveDays >= 3).length} tone="rust" />
      </div>

      <div className="section-label">Individual progress</div>
      <div className="card card-pad">
        <BarChart
          valueSuffix="%"
          data={teamMembers.map((m) => ({
            label: m.name, value: m.progress,
            tone: m.status === 'COMPLETED' ? 'sage' : m.status === 'OVERDUE' || m.status === 'FAILED' ? 'rust' : 'rail',
            detail: `${m.name}: ${m.course} — ${m.progress}% (${m.status.replace('_', ' ').toLowerCase()})`,
          }))}
        />
      </div>
    </>
  );
}
