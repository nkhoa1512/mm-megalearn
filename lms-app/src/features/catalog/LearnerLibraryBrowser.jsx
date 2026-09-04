import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, ProgressBar } from '../common/ui';
import { getCourseImage } from '../../data/courseImages';
import { courseFormatBadge } from '../../utils/courseCatalog';
import { computeCourseRecertification, RECERTIFICATION_STATE } from '../../utils/recertification';
import { scheduleSummary, isInPersonCourse } from '../../utils/classSchedule';
import { ACCESS_STATE } from '../../data/levelSystem';

const LEARNING_STATE = {
  COMPLETED: { label: 'Completed', tone: 'sage', icon: 'ti-circle-check' },
  IN_PROGRESS: { label: 'In Progress', tone: 'blue', icon: 'ti-player-play' },
  OVERDUE: { label: 'Overdue', tone: 'amber', icon: 'ti-alert-triangle' },
  NOT_STARTED: { label: 'Not Started', tone: 'slate', icon: 'ti-circle-dashed' },
};

function learningStateOf(enrollment) {
  if (!enrollment) return 'NOT_STARTED';
  if (enrollment.status === 'COMPLETED') return 'COMPLETED';
  if (enrollment.status === 'OVERDUE') return 'OVERDUE';
  return 'IN_PROGRESS';
}

/**
 * The read-only Library for every role that is not a User Admin / System Admin.
 * A library is browsed, never edited here: open one, walk its areas, and see for each
 * course whether you may join it and where you stand on it.
 */
export default function LearnerLibraryBrowser({
  libraries,
  courses,
  myEnrollments,
  certificates = [],
  accessFor,
  user,
}) {
  const navigate = useNavigate();
  const [openLibraryId, setOpenLibraryId] = useState(null);
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const courseById = useMemo(() => {
    const map = new Map();
    courses.forEach((c) => map.set(c.id, { ...c, enrollment: myEnrollments?.[c.id] || null }));
    return map;
  }, [courses, myEnrollments]);

  const certByCourseId = useMemo(() => {
    const map = new Map();
    (certificates || []).forEach((cert) => {
      if (cert?.courseId) map.set(cert.courseId, cert);
    });
    return map;
  }, [certificates]);

  /** Resolves a library's areas into real course objects plus the viewer's own state. */
  function resolveLibrary(lib) {
    const areas = (lib.domains || []).map((d) => {
      const items = (d.courseIds || [])
        .map((id) => courseById.get(id))
        .filter(Boolean)
        .map((course) => {
          const enrollment = course.enrollment;
          const access = accessFor(course, user);
          const recert = computeCourseRecertification(course, enrollment, certByCourseId.get(course.id));
          return { course, enrollment, access, recert, state: learningStateOf(enrollment) };
        });
      return { ...d, items };
    });
    const allItems = areas.flatMap((a) => a.items);
    const completed = allItems.filter((i) => i.state === 'COMPLETED').length;
    const inProgress = allItems.filter((i) => i.state === 'IN_PROGRESS' || i.state === 'OVERDUE').length;
    const eligible = allItems.filter((i) => i.access?.canAccess).length;
    const needsRecert = allItems.filter((i) => i.recert?.needsRecertification).length;
    return {
      areas,
      total: allItems.length,
      completed,
      inProgress,
      eligible,
      needsRecert,
      percent: allItems.length === 0 ? 0 : Math.round((completed / allItems.length) * 100),
    };
  }

  const openLibrary = libraries.find((l) => l.id === openLibraryId) || null;

  // ---------------------------------------------------------------- LIST VIEW
  if (!openLibrary) {
    return (
      <>
        <div className="card card-pad" style={{ marginBottom: 16, fontSize: 13, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-folders" style={{ color: 'var(--rail)', fontSize: 16 }} />
          <div>
            <strong>Library</strong> — curated collections built by the L&amp;D team. Open one to browse its
            areas, see which courses you are eligible to join, and track what you have already completed.
          </div>
        </div>

        {libraries.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-folders" aria-hidden="true" />
            <p>No library has been published yet. Check back once the L&amp;D team publishes one.</p>
          </div>
        ) : (
          <div className="grid grid-3" style={{ gap: 14 }}>
            {libraries.map((lib) => {
              const stats = resolveLibrary(lib);
              return (
                <div key={lib.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', marginBottom: 6 }}>
                      {lib.name || 'Untitled Library'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10, minHeight: 34 }}>
                      {lib.description}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      <Badge tone="slate" size="sm">{(lib.domains || []).length} areas</Badge>
                      <Badge tone="slate" size="sm">{stats.total} courses</Badge>
                      {stats.needsRecert > 0 && (
                        <Badge tone="rust" size="sm">{stats.needsRecert} to recertify</Badge>
                      )}
                    </div>
                    <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-soft)' }}>
                      <span>My progress</span>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{stats.completed} / {stats.total} completed</span>
                    </div>
                    <ProgressBar value={stats.percent} />
                  </div>
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 12 }}>
                    <Button
                      size="sm"
                      variant="primary"
                      icon="ti-arrow-right"
                      onClick={() => { setOpenLibraryId(lib.id); setAreaFilter('ALL'); setStatusFilter('ALL'); }}
                    >
                      Open Library
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // -------------------------------------------------------------- DETAIL VIEW
  const stats = resolveLibrary(openLibrary);
  const visibleAreas = stats.areas
    .filter((a) => areaFilter === 'ALL' || a.category === areaFilter)
    .map((a) => ({
      ...a,
      items: a.items.filter((i) => {
        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'ELIGIBLE') return i.access?.canAccess && i.state === 'NOT_STARTED';
        if (statusFilter === 'RECERT') return i.recert?.needsRecertification;
        return i.state === statusFilter;
      }),
    }))
    .filter((a) => a.items.length > 0 || statusFilter === 'ALL');

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <Button size="sm" variant="ghost" icon="ti-arrow-left" onClick={() => setOpenLibraryId(null)}>
          Back to all libraries
        </Button>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>{openLibrary.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>{openLibrary.description}</div>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {[
              { label: 'Courses', value: stats.total },
              { label: 'Completed', value: stats.completed },
              { label: 'In progress', value: stats.inProgress },
              { label: 'Open to me', value: stats.eligible },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressBar value={stats.percent} />
        </div>
      </div>

      {/* FILTERS */}
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Area:</span>
          <select className="field-select" style={{ height: 34, fontSize: 12, minWidth: 190 }} value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="ALL">All areas ({stats.areas.length})</option>
            {stats.areas.map((a) => (
              <option key={a.id} value={a.category}>{a.category} ({a.items.length})</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'ELIGIBLE', label: 'Open to me' },
            { id: 'IN_PROGRESS', label: 'In progress' },
            { id: 'COMPLETED', label: 'Completed' },
            ...(stats.needsRecert > 0 ? [{ id: 'RECERT', label: 'Recertification due' }] : []),
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`btn btn-sm ${statusFilter === f.id ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 20, fontSize: 12 }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* AREAS */}
      {visibleAreas.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-search-off" aria-hidden="true" />
          <p>No course in this library matches the current filter.</p>
        </div>
      ) : (
        visibleAreas.map((area) => (
          <div key={area.id} className="card card-pad" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-category" style={{ color: 'var(--rail)' }} />
                {area.category}
              </div>
              <Badge tone="slate" size="sm">{area.items.length} courses</Badge>
            </div>

            {area.items.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                No course in this area yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {area.items.map(({ course, enrollment, access, recert, state }) => {
                  const st = LEARNING_STATE[state];
                  const fmt = courseFormatBadge(course);
                  const locked = !access?.canAccess;
                  const needsRecert = recert?.needsRecertification;
                  return (
                    <div
                      key={course.id}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        padding: 10,
                        border: `1px solid ${needsRecert ? 'var(--rust)' : 'var(--line)'}`,
                        borderRadius: 10,
                        background: 'var(--paper-raised)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <img
                        src={getCourseImage(course)}
                        alt={course.title}
                        style={{ width: 74, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                      />
                      <div style={{ flex: '1 1 260px', minWidth: 200 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 3 }}>
                          {course.title}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>{course.code}</span>
                          <Badge tone={fmt.tone} size="sm">{fmt.icon} {fmt.label}</Badge>
                          {course.courseType === 'MANDATORY' && <Badge tone="amber" size="sm">Mandatory</Badge>}
                        </div>
                        {isInPersonCourse(course) && (
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                            <i className="ti ti-calendar-time" style={{ marginRight: 4 }} />
                            {scheduleSummary(course)}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', flex: '0 0 auto', minWidth: 150 }}>
                        <Badge tone={st.tone} size="sm" icon={st.icon}>{st.label}</Badge>
                        {locked ? (
                          <Badge tone="rust" size="sm" icon="ti-lock">
                            {access?.state === ACCESS_STATE.REQUESTABLE ? 'Approval required' : 'Not eligible yet'}
                          </Badge>
                        ) : (
                          state === 'NOT_STARTED' && <Badge tone="sage" size="sm" icon="ti-check">You can join</Badge>
                        )}
                        {needsRecert && (
                          <Badge tone="rust" size="sm" icon="ti-refresh">
                            {recert.state === RECERTIFICATION_STATE.EXPIRED ? 'Certificate expired' : 'Recertification due'}
                          </Badge>
                        )}
                        {enrollment?.progressPercent > 0 && state !== 'COMPLETED' && (
                          <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{enrollment.progressPercent}% complete</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <Button
                          size="sm"
                          variant={state === 'COMPLETED' && !needsRecert ? 'outline' : 'primary'}
                          icon={state === 'COMPLETED' ? 'ti-eye' : locked ? 'ti-info-circle' : 'ti-player-play'}
                          onClick={() => navigate(`/learner/courses/${course.id}`)}
                        >
                          {state === 'COMPLETED'
                            ? (needsRecert ? 'Retake' : 'View Details')
                            : state === 'IN_PROGRESS' || state === 'OVERDUE'
                            ? 'Continue'
                            : locked
                            ? 'View Details'
                            : 'View Course'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}
    </>
  );
}
