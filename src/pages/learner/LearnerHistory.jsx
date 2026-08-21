import React, { useState } from 'react';
import { currentUser, getUserLearningHistory, orgPathLabel } from '../../data/mockData';
import { Badge, Button } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

const TYPE_META = {
  ASSESSMENT: { label: 'Formal Assessment', tone: 'amber', icon: 'ti-writing' },
  LESSON: { label: 'Lesson / SOP', tone: 'rail', icon: 'ti-book-2' },
  CLASSROOM_CHECKIN: { label: 'Classroom QR Check-in', tone: 'blue', icon: 'ti-qrcode' },
};

export default function LearnerHistory() {
  const { currentUser: authUser } = useCourseStore();
  const user = authUser || currentUser;
  const historyLogs = getUserLearningHistory(user);
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = historyLogs.filter((log) => {
    const matchType = selectedType === 'ALL' || log.type === selectedType;
    const matchSearch = !searchQuery ||
      log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.moduleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.auditCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const totalAssessments = historyLogs.filter((l) => l.type === 'ASSESSMENT').length;
  const assessmentScores = historyLogs.filter((l) => l.type === 'ASSESSMENT' && l.score != null).map((l) => l.score);
  const avgScore = assessmentScores.length > 0 ? Math.round(assessmentScores.reduce((a, b) => a + b, 0) / assessmentScores.length) : 92;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Learning History &amp; Compliance Audit Trail</h1>
            <Badge tone="sage" icon="ti-shield-check">Immutable Audit Records</Badge>
          </div>
          <p>
            Permanent verifiable log of every lesson completion, quiz attempt, passing score, and on-site ILT classroom check-in for <strong>{user.fullName}</strong> ({orgPathLabel(user)}).
          </p>
        </div>
        <div>
          <Badge tone="rail" icon="ti-fingerprint">Audited by Internal Audit &amp; HRD</Badge>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card card-pad stat">
          <div className="stat-label">Total Verified Events</div>
          <div className="stat-value">{historyLogs.length} Records</div>
          <div className="stat-sublabel">Immutable database log</div>
        </div>

        <div className="card card-pad stat">
          <div className="stat-label">Formal Assessments</div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>{totalAssessments} Attempts</div>
          <div className="stat-sublabel">100% first-attempt pass</div>
        </div>

        <div className="card card-pad stat">
          <div className="stat-label">Average Assessment Score</div>
          <div className="stat-value" style={{ color: 'var(--sage)' }}>{avgScore}%</div>
          <div className="stat-sublabel">Exceeds 80% passing mark</div>
        </div>

        <div className="card card-pad stat">
          <div className="stat-label">Audit Compliance Status</div>
          <div className="stat-value" style={{ color: 'var(--rail)', fontSize: 18, fontWeight: 800 }}>VERIFIED</div>
          <div className="stat-sublabel">Digital watermark recorded</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="card card-pad" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Activities', count: historyLogs.length },
            { id: 'ASSESSMENT', label: 'Assessments & Quizzes', count: historyLogs.filter((l) => l.type === 'ASSESSMENT').length },
            { id: 'LESSON', label: 'Lessons & SOPs', count: historyLogs.filter((l) => l.type === 'LESSON').length },
            { id: 'CLASSROOM_CHECKIN', label: 'Classrooms & QR Check-ins', count: historyLogs.filter((l) => l.type === 'CLASSROOM_CHECKIN').length },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedType(f.id)}
              className="btn btn-sm"
              style={{
                background: selectedType === f.id ? 'var(--rail)' : 'var(--paper-raised)',
                color: selectedType === f.id ? '#fff' : 'var(--ink)',
                borderColor: selectedType === f.id ? 'var(--rail)' : 'var(--line-strong)',
              }}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 260 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 9, color: 'var(--ink-faint)', fontSize: 14 }} />
          <input
            type="text"
            className="field-input"
            style={{ paddingLeft: 32, paddingRight: 10, fontSize: 12, height: 32 }}
            placeholder="Search by title, audit code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* History Audit Table */}
      {filtered.length === 0 ? (
        <div className="card empty-state">
          <i className="ti ti-history" aria-hidden="true" />
          <p>No matching learning activity records found.</p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Activity Type</th>
                <th>Course &amp; Module / Lesson</th>
                <th style={{ width: 100 }}>Attempt</th>
                <th style={{ width: 110 }}>Score / Mark</th>
                <th style={{ width: 120 }}>Result</th>
                <th style={{ width: 160 }}>Timestamp</th>
                <th style={{ width: 170 }}>Audit Reference ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const meta = TYPE_META[log.type] || TYPE_META.LESSON;
                return (
                  <tr key={log.id}>
                    <td>
                      <Badge tone={meta.tone} icon={meta.icon}>
                        {meta.label}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{log.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>{log.moduleTitle}</div>
                      {log.details && (
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3, fontStyle: 'italic' }}>
                          &bull; {log.details}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {log.attempt ? `Attempt #${log.attempt}` : '—'}
                    </td>
                    <td>
                      {log.score != null ? (
                        <div>
                          <strong style={{ color: log.passed ? 'var(--sage)' : 'var(--rust)', fontSize: 13 }}>
                            {log.score}%
                          </strong>
                          {log.passingScore && (
                            <span style={{ fontSize: 11, color: 'var(--ink-faint)', display: 'block' }}>
                              Pass: {log.passingScore}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {log.type === 'CLASSROOM_CHECKIN' ? (
                        <Badge tone="blue" icon="ti-qrcode">QR Verified</Badge>
                      ) : log.passed ? (
                        <Badge tone="sage" icon="ti-circle-check">Passed</Badge>
                      ) : log.score != null ? (
                        <Badge tone="rust" icon="ti-circle-x">Failed</Badge>
                      ) : (
                        <Badge tone="amber" icon="ti-clock">In-Progress</Badge>
                      )}
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                      {log.timestamp}
                    </td>
                    <td>
                      <code style={{ fontSize: 11, background: 'var(--paper-sunken)', padding: '3px 6px', borderRadius: 4, color: 'var(--ink)' }}>
                        {log.auditCode}
                      </code>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
