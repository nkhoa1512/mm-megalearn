import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser, myLearningCourses } from '../../data/mockData';
import { Badge, ProgressBar, Button, CourseTypeBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

const statusMap = {
  IN_PROGRESS: { tone: 'amber', label: 'In Progress' },
  NOT_STARTED: { tone: 'slate', label: 'Not Started' },
  COMPLETED: { tone: 'sage', label: 'Completed' },
  FAILED: { tone: 'rust', label: 'Failed' },
  OVERDUE: { tone: 'rust', label: 'Overdue' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function LearnerCourses({ user: propUser, basePath = '/learner/courses' }) {
  const navigate = useNavigate();
  const { courses: allCourses, currentUser: authUser } = useCourseStore();
  const user = propUser || authUser || currentUser;
  const courses = myLearningCourses(allCourses, user);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('TABLE'); // TABLE, GRID

  // Filter logic
  const filtered = courses.filter((c) => {
    const s = c.enrollment?.status;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'MANDATORY' && c.courseType === 'MANDATORY') ||
      s === statusFilter;
    const matchDomain = domainFilter === 'ALL' || c.domain === domainFilter || c.category === domainFilter;
    const matchFormat = formatFilter === 'ALL' || c.format?.includes(formatFilter) || c.modality === formatFilter;
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      (c.domain && c.domain.toLowerCase().includes(search.toLowerCase()));

    return matchStatus && matchDomain && matchFormat && matchSearch;
  });

  const completedCount = courses.filter((c) => c.enrollment?.status === 'COMPLETED').length;
  const inProgressCount = courses.filter((c) => c.enrollment?.status === 'IN_PROGRESS').length;
  const overdueCount = courses.filter((c) => c.enrollment?.status === 'OVERDUE').length;
  const mandatoryCount = courses.filter((c) => c.courseType === 'MANDATORY').length;

  // Smart Recommendations for User
  const isManager = user?.role === 'manager' || user?.level <= '4';
  const isLevel6Or7 = user?.level === '6' || user?.level === '7' || user?.level === 'CL';
  const isNewHire = user?.status === 'NEW_JOINER';

  const recommendations = allCourses.filter((c) => {
    if (isNewHire) return c.code.includes('CULT') || c.code.includes('FSH');
    if (isManager) return c.code.includes('LEAD') || c.code.includes('STOPS');
    if (isLevel6Or7) return c.code.includes('FSH') || c.code.includes('COLD') || c.code.includes('STOPS');
    return c.courseType === 'MANDATORY';
  }).slice(0, 3);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Course Catalog &amp; Training Curriculum</h1>
            <Badge tone="rail">{courses.length} Enrolled Courses</Badge>
          </div>
          <p>
            Mandatory certifications tailored for {user.position} ({user.branchName || 'Operations Branch'}), plus self-paced catalog electives (SCORM, Video, PPT, LinkedIn Learning).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewMode(viewMode === 'TABLE' ? 'GRID' : 'TABLE')}
            className="btn btn-sm btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className={`ti ${viewMode === 'TABLE' ? 'ti-layout-grid' : 'ti-list'}`} />
            {viewMode === 'TABLE' ? 'Grid View' : 'Table View'}
          </button>
        </div>
      </div>

      {/* SMART RECOMMENDATION BANNER */}
      <div
        className="card card-pad"
        style={{
          background: 'linear-gradient(135deg, #FAFDF5 0%, #F0FDF4 100%)',
          borderLeft: '4px solid var(--sage)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sage-soft)', color: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-sparkles" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--sage)' }}>
              Smart Recommendations for: <strong>{user.position}</strong> (Level {user.level})
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            {isManager ? 'Recommended Leadership & 70/20/10 Coaching Tracks' : 'Recommended Fresh Food & Cold Chain Operations Tracks'}
          </span>
        </div>

        <div className="grid grid-3" style={{ gap: 12 }}>
          {recommendations.map((rec) => (
            <div key={rec.id} className="card card-pad" style={{ background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{rec.code}</span>
                  <Badge tone={rec.modality === 'EXTERNAL_PLATFORM' ? 'blue' : 'sage'}>
                    {rec.format || 'SCORM'}
                  </Badge>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.4 }}>
                  {rec.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 10 }}>
                  Duration: {rec.estimatedHours || '2.5h'} &middot; Passing Score: {rec.passingScore || 80}%
                </div>
              </div>
              <Button size="sm" variant="outline" icon="ti-player-play" onClick={() => navigate(`${basePath}/${rec.id}`)}>
                Start Learning
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* MULTI-FACETED FILTER BAR */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Courses', count: courses.length },
              { id: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
              { id: 'COMPLETED', label: 'Completed', count: completedCount },
              { id: 'OVERDUE', label: 'Overdue', count: overdueCount },
              { id: 'MANDATORY', label: 'Mandatory', count: mandatoryCount },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className="btn btn-sm"
                style={{
                  background: statusFilter === f.id ? 'var(--rail)' : 'var(--paper-raised)',
                  color: statusFilter === f.id ? '#fff' : 'var(--ink)',
                  borderColor: statusFilter === f.id ? 'var(--rail)' : 'var(--line-strong)',
                }}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: 260 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)', fontSize: 14 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 32, height: 34, fontSize: 12.5 }}
              placeholder="Search by code, title, skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Facet Dropdowns: Domain, Format */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>Domain / Topic:</span>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="field-select"
              style={{ padding: '4px 24px 4px 8px', fontSize: 12, height: 28 }}
            >
              <option value="ALL">All Domains</option>
              <option value="Food Safety & Hygiene">Food Safety &amp; HACCP</option>
              <option value="Cold Chain">Cold Chain Operations</option>
              <option value="Store Operations">Store Operations &amp; Inventory</option>
              <option value="Information Security">Information Security</option>
              <option value="Health & Safety">HSE &amp; Fire Safety</option>
              <option value="Leadership">Leadership &amp; Management</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>Format:</span>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="field-select"
              style={{ padding: '4px 24px 4px 8px', fontSize: 12, height: 28 }}
            >
              <option value="ALL">All Formats</option>
              <option value="SCORM">SCORM 2004</option>
              <option value="Video">Interactive Video</option>
              <option value="PPT">PowerPoint Slide</option>
              <option value="LinkedIn">LinkedIn Learning / Coursera</option>
            </select>
          </div>
        </div>
      </div>

      {/* Course List: Table View */}
      {viewMode === 'TABLE' && (
        <div className="card" style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Course Program</th>
                <th style={{ width: 140 }}>Type</th>
                <th style={{ width: 140 }}>Format</th>
                <th style={{ minWidth: 160 }}>Progress</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 120 }}>Due Date</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const s = statusMap[c.enrollment?.status] || statusMap.NOT_STARTED;
                const percent = c.enrollment?.progressPercent || 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{c.code}</span> &middot; {c.domain || c.category} &middot; {c.estimatedHours || '2h'}
                      </div>
                    </td>
                    <td><CourseTypeBadge courseType={c.courseType} /></td>
                    <td>
                      <Badge tone={c.modality === 'EXTERNAL_PLATFORM' ? 'blue' : 'slate'}>
                        {c.format || 'SCORM 2004'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar
                            value={percent}
                            tone={c.enrollment?.status === 'COMPLETED' ? 'sage' : c.enrollment?.status === 'OVERDUE' ? 'rust' : 'rail'}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', minWidth: 36 }}>{percent}%</span>
                      </div>
                    </td>
                    <td><Badge tone={s.tone}>{s.label}</Badge></td>
                    <td style={{ color: c.enrollment?.status === 'OVERDUE' ? 'var(--rust)' : 'var(--ink-soft)', fontSize: 12.5, fontWeight: c.enrollment?.status === 'OVERDUE' ? 700 : 400 }}>
                      {formatDate(c.enrollment?.dueDate)}
                    </td>
                    <td>
                      <Button size="sm" variant="primary" onClick={() => navigate(`${basePath}/${c.id}`)}>
                        {c.enrollment?.status === 'COMPLETED' ? 'Review' : 'Continue'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Course List: Grid View */}
      {viewMode === 'GRID' && (
        <div className="grid grid-3" style={{ gap: 16, marginBottom: 28 }}>
          {filtered.map((c) => {
            const s = statusMap[c.enrollment?.status] || statusMap.NOT_STARTED;
            const percent = c.enrollment?.progressPercent || 0;
            return (
              <div key={c.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <CourseTypeBadge courseType={c.courseType} />
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.4 }}>
                    {c.description}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 12, display: 'flex', gap: 10 }}>
                    <span><i className="ti ti-clock" style={{ marginRight: 4 }} />{c.estimatedHours || '2h'}</span>
                    <span><i className="ti ti-file" style={{ marginRight: 4 }} />{c.format || 'SCORM'}</span>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                      <span>Progress</span>
                      <strong>{percent}%</strong>
                    </div>
                    <ProgressBar value={percent} tone={c.enrollment?.status === 'COMPLETED' ? 'sage' : 'rail'} size="sm" />
                  </div>
                </div>
                <Button size="sm" variant="primary" block onClick={() => navigate(`${basePath}/${c.id}`)}>
                  {c.enrollment?.status === 'COMPLETED' ? 'Review Course' : 'Continue'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
