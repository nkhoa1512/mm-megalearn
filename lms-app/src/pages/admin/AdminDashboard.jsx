import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  orgReport,
  liveSystemActivity,
  classroomSessions,
} from '../../data/mockData';
import { StatCard, StatusStackedBar, LineChart, DonutChart, Button } from '../../features/common/ui';
import { useCourseStore } from '../../store/CourseStore';
import { normalizeRole, hasCapability } from '../../data/roles';

// Rendered as the first tab of AdminReports — the page header, the export buttons and the
// shortcuts live there, so this component only returns the overview sections.
export default function LdCommandOverview({ onOpenReportTab }) {
  const navigate = useNavigate();
  const { courses: storeCourses, currentUser } = useCourseStore();

  // A Trainer carries canViewCsat but never canViewOrgProgress, so every enterprise-wide
  // block below is replaced by the snapshot of the classes they teach themselves.
  const userRole = normalizeRole(currentUser?.role);
  const canViewOrgWide = hasCapability(userRole, 'canViewOrgProgress');

  const mySessions = classroomSessions.filter(
    (session) => session.trainerId === currentUser?.userId || session.trainerName === currentUser?.fullName
  );
  const myLearners = mySessions.reduce((sum, session) => sum + (session.enrolledCount || 0), 0);
  const myCapacity = mySessions.reduce((sum, session) => sum + (session.maxCapacity || 0), 0);
  const myAvgCsat = mySessions.length > 0
    ? Math.round((mySessions.reduce((sum, session) => sum + (session.trainerRating || 0), 0) / mySessions.length) * 100) / 100
    : null;
  const mySeatFill = myCapacity > 0 ? Math.round((myLearners / myCapacity) * 1000) / 10 : 0;

  const mandatoryCount = storeCourses.filter((c) => c.courseType === 'MANDATORY').length;
  const optionalCount = storeCourses.filter((c) => c.courseType === 'OPTIONAL').length;

  return (
    <>
      {/* Enterprise-wide blocks — canViewOrgProgress only (User Admin, System Admin, HRBP) */}
      {canViewOrgWide && (
        <>
        {/* 6 Executive KPI Stat Cards */}
        <div className="grid grid-3" style={{ marginBottom: 16 }}>
          <StatCard
            label="Total Enterprise Headcount"
            value={`${orgReport.totalEmployees.toLocaleString()} Associates`}
            icon="ti-users"
            sublabel="186 Managers · 1,959 Frontline/Staff"
          />
          <StatCard
            label="Overall Compliance Rate"
            value={`${orgReport.overallCompletionRate}%`}
            tone="sage"
            icon="ti-shield-check"
            sublabel="Target benchmark: ≥80.0%"
          />
          <StatCard
            label="Certified Competencies Issued"
            value={`${orgReport.totalCompleted.toLocaleString()} Credentials`}
            tone="rail"
            icon="ti-certificate"
            sublabel="Verifiable digital QR certificates"
          />
        </div>

        <div className="grid grid-3" style={{ marginBottom: 24 }}>
          <StatCard
            label="Active Catalog Programs"
            value={`${orgReport.totalActiveCourses} Courses`}
            icon="ti-stack-2"
            sublabel={`${mandatoryCount} Mandatory · ${optionalCount} Elective`}
          />
          <StatCard
            label="Overdue Compliance Enrollments"
            value={`${orgReport.totalOverdue} Associates`}
            tone="rust"
            icon="ti-alert-triangle"
            sublabel="Down -14% vs last month"
          />
          <StatCard
            label="Average Assessment Score"
            value={`${orgReport.avgPassingScore}%`}
            tone="amber"
            icon="ti-award"
            sublabel={`${orgReport.firstTimePassRate}% First-attempt pass rate`}
          />
        </div>

        {/* The league table itself lives in the Compliance League tab of this page */}
        <div className="card card-pad" style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
              MMVN Divisions Compliance League &amp; Audit Radar
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
              Ranking of every division by mandatory-course completion, computed live from the
              enrollment matrix — it opens in the Compliance League tab of this page.
            </div>
          </div>
          {onOpenReportTab && (
            <Button variant="outline" icon="ti-trophy" onClick={() => onOpenReportTab('COMPLIANCE_LEAGUE')}>
              Open the Compliance League table
            </Button>
          )}
        </div>

        <div className="section-label">Organization-Wide Enrollment Status Breakdown</div>
        <div className="card card-pad" style={{ marginBottom: 28 }}>
          <StatusStackedBar
            segments={[
              { status: 'COMPLETED', value: orgReport.totalCompleted },
              { status: 'IN_PROGRESS', value: orgReport.totalInProgress },
              { status: 'NOT_STARTED', value: orgReport.totalNotStarted },
              { status: 'OVERDUE', value: orgReport.totalOverdue },
            ]}
          />
        </div>

        <div className="grid grid-2" style={{ marginBottom: 28, alignItems: 'start' }}>
          <div>
            <div className="section-label">Monthly Completion Trajectory</div>
            <div className="card card-pad">
              <LineChart data={orgReport.monthlyCompletions.map((m) => ({ label: m.month, value: m.value }))} />
            </div>
          </div>
          <div>
            <div className="section-label">Course Distribution by Category</div>
            <div className="card card-pad">
              <DonutChart
                data={[
                  { label: 'Mandatory Compliance', value: mandatoryCount, tone: 'amber' },
                  { label: 'Elective Catalog', value: optionalCount, tone: 'slate' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Detailed Course Performance with Friction Analysis */}
        <div className="section-label">Course Program Performance &amp; Friction Diagnostics</div>
        <div className="card" style={{ marginBottom: 28, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Course Program</th>
                <th style={{ width: 100 }}>Assigned</th>
                <th style={{ width: 100 }}>Completed</th>
                <th style={{ width: 90 }}>Overdue</th>
                <th style={{ width: 130 }}>Completion Rate</th>
                <th style={{ width: 100 }}>Avg Score</th>
                <th>AI Diagnostic &amp; Content Friction Note</th>
              </tr>
            </thead>
            <tbody>
              {orgReport.coursePerformance.map((cp) => (
                <tr key={cp.code}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{cp.course}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{cp.code}</div>
                  </td>
                  <td>{cp.assigned.toLocaleString()}</td>
                  <td style={{ color: 'var(--sage)', fontWeight: 700 }}>{cp.completed.toLocaleString()}</td>
                  <td style={{ color: cp.overdue > 0 ? 'var(--rust)' : 'var(--ink-soft)', fontWeight: cp.overdue > 0 ? 700 : 500 }}>
                    {cp.overdue}
                  </td>
                  <td>
                    <strong style={{ fontSize: 13 }}>{cp.completionRate}%</strong>
                  </td>
                  <td>
                    <strong>{cp.avgScore != null ? `${cp.avgScore}%` : '—'}</strong>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                    <i className="ti ti-bulb" style={{ color: 'var(--amber)', marginRight: 4 }} />
                    {cp.frictionNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Real-time Live Enterprise System Audit Stream */}
        <div className="section-label">Live Enterprise System Activity &amp; Audit Feed</div>
        <div className="card card-pad" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {liveSystemActivity.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: act.alert ? 'var(--rust-soft)' : 'var(--paper-sunken)',
                  border: act.alert ? '1px solid #FECACA' : '1px solid var(--line)',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: act.type === 'SAP_SYNC' ? '#EEF2FF' : act.alert ? 'var(--rust-soft)' : 'var(--sage-soft)',
                      color: act.type === 'SAP_SYNC' ? '#4F46E5' : act.alert ? '#DC2626' : '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    <i className={act.type === 'SAP_SYNC' ? 'ti ti-cloud-computing' : act.alert ? 'ti-alert-triangle' : act.type === 'QR_CHECKIN' ? 'ti-qrcode' : 'ti-certificate'} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: act.alert ? 'var(--rust-soft-text)' : 'var(--ink)' }}>
                      {act.user ? `${act.user} (${act.code} · ${act.role})` : act.source}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                      {act.title || act.details}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                  {act.time}
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
      )}

      {!canViewOrgWide && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <StatCard
              label="Classes You Teach"
              value={`${mySessions.length} Sessions`}
              icon="ti-school"
              sublabel="Sessions you are the trainer of"
            />
            <StatCard
              label="Learners Taught"
              value={`${myLearners} Learners`}
              tone="rail"
              icon="ti-users"
              sublabel="Enrolled across those sessions"
            />
            <StatCard
              label="Your Average CSAT"
              value={myAvgCsat != null ? `${myAvgCsat} / 5.0` : '—'}
              tone="amber"
              icon="ti-star"
              sublabel="Learner feedback on your classes"
            />
            <StatCard
              label="Seat Fill Rate"
              value={`${mySeatFill}%`}
              tone="sage"
              icon="ti-chart-bar"
              sublabel="Enrolled vs capacity offered"
            />
          </div>

          <div className="section-label">Your Classes</div>
          <div className="card" style={{ marginBottom: 28, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th style={{ width: 130 }}>Date</th>
                  <th style={{ width: 130 }}>Enrolled / Seats</th>
                  <th style={{ width: 110 }}>CSAT</th>
                </tr>
              </thead>
              <tbody>
                {mySessions.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-soft)' }}>
                      You are not leading any classroom session yet.
                    </td>
                  </tr>
                ) : (
                  mySessions.map((session) => (
                    <tr key={session.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{session.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{session.code}</div>
                      </td>
                      <td>{session.date}</td>
                      <td>{session.enrolledCount || 0} / {session.maxCapacity || 0}</td>
                      <td><strong>{session.trainerRating ? `★ ${session.trainerRating}` : '—'}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="card card-pad" style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Need the live QR attendance code or the full feedback report of a class?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" icon="ti-school" onClick={() => navigate('/trainer')}>
                Teaching Classes &amp; Live QR
              </Button>
              <Button variant="outline" icon="ti-star" onClick={() => navigate('/trainer/feedback')}>
                CSAT Feedback
              </Button>
            </div>
          </div>
        </>
      )}

    </>
  );
}
