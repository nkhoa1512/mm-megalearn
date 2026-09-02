import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser } from '../../data/mockData';
import { Badge, ProgressBar, Button, Modal, JobLevelBadge, LevelAccessBadge } from '../../features/common/ui';
import {
  ACCESS_STATE,
  levelDefinition,
  levelShortLabel,
  nextLevelUp,
  normalizeLevel,
} from '../../data/levelSystem';
import { useCourseStore } from '../../store/CourseStore';
import { getCourseImage } from '../../data/courseImages';
import {
  courseFormatBadge, courseGroupOf, courseOrgUnitGroups, buildCourseGroups, courseMatchesCategory,
} from '../../utils/courseCatalog';
import CurriculumTree from '../../features/catalog/CurriculumTree';
import { getAssignedCurriculaForUser, getCurriculumProgress } from '../../utils/curriculumAssignment';

// Group By feature: collects "My Courses" into sections/accordions by
// 5 criteria — Department & Division (the assigning source), Job Level & Roadmap, Learning
// Status, Delivery Format and Specialization.
const GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'No Grouping', icon: 'ti-list' },
  { id: 'ORG_UNIT', label: 'Department & Division', icon: 'ti-building' },
  { id: 'LEVEL', label: 'Job Level & Roadmap', icon: 'ti-stairs-up' },
  { id: 'STATUS', label: 'Learning Status', icon: 'ti-progress-check' },
  { id: 'MODALITY', label: 'Delivery Format', icon: 'ti-device-desktop' },
  { id: 'DOMAIN', label: 'Specialization', icon: 'ti-category' },
];

import { computeCourseRecertification, RECERTIFICATION_STATE } from '../../utils/recertification';
import { deriveCertificates } from '../../data/mockData';

// The old export names are kept so other screens keep importing successfully.
export { JobLevelBadge };

// courseFormatBadge / courseGroupOf / buildCourseGroups are now shared from
// src/utils/courseCatalog.js (previously duplicated verbatim in AdminCourses.jsx).

const statusMap = {
  IN_PROGRESS: { tone: 'amber', label: 'In Progress' },
  NOT_STARTED: { tone: 'slate', label: 'Not Started' },
  COMPLETED: { tone: 'sage', label: 'Completed' },
  FAILED: { tone: 'rust', label: 'Retake Required' },
  OVERDUE: { tone: 'rust', label: 'Overdue' },
};


export default function LearnerCourses({ user: propUser, basePath = '/learner/courses' }) {
  const navigate = useNavigate();
  const {
    courses: allCourses,
    currentUser: authUser,
    enrollCourse,
    accessFor,
    requestLevelAdvanceApproval,
    myCourses,
    myEnrollments,
    language,
    t,
    curricula,
    companyCategories,
    certificateTemplates,
  } = useCourseStore();
  const [viewingCurriculum, setViewingCurriculum] = useState(null);

  const user = propUser || authUser || currentUser;
  const userLevel = normalizeLevel(user.level);
  const userLevelDef = levelDefinition(userLevel);
  const oneLevelUp = nextLevelUp(userLevel);

  const enrolledCourses = myCourses(allCourses, user);
  const assignedCurricula = getAssignedCurriculaForUser(curricula, user);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [orgUnitFilter, setOrgUnitFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('TABLE');
  const [groupBy, setGroupBy] = useState('NONE');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const activeFiltersCount = (
    (categoryFilter !== 'ALL' ? 1 : 0) +
    (orgUnitFilter !== 'ALL' ? 1 : 0) +
    (formatFilter !== 'ALL' ? 1 : 0)
  );

  function resetAllFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setOrgUnitFilter('ALL');
    setFormatFilter('ALL');
  }

  function toggleGroupCollapsed(key) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Level skip request modal
  const [requestModal, setRequestModal] = useState({ open: false, course: null, access: null });
  const [justification, setJustification] = useState('');
  const [toast, setToast] = useState(null);

  function openRequestModal(course, access) {
    setRequestModal({ open: true, course, access });
    setJustification('');
  }

  function submitRequest() {
    const { course } = requestModal;
    const result = requestLevelAdvanceApproval(course, justification, user);
    setRequestModal({ open: false, course: null, access: null });
    setToast(
      result.ok
        ? `Your level skip request for "${course.title}" has been sent to your line manager. Please await approval.`
        : result.reason
    );
    setTimeout(() => setToast(null), 6000);
  }

  function handleStart(course, access) {
    if (!access.canAccess) return;
    enrollCourse(course.id, user);
    navigate(`${basePath}/${course.id}`);
  }

  const activeCourseList = enrolledCourses;

  const userCertificates = React.useMemo(() => deriveCertificates(allCourses, user, myEnrollments, certificateTemplates), [allCourses, user, myEnrollments, certificateTemplates]);
  const recertByCourseId = React.useMemo(() => {
    const map = {};
    enrolledCourses.forEach((c) => {
      const cert = userCertificates.find((cert) => cert.courseId === c.id);
      map[c.id] = computeCourseRecertification(c, c.enrollment, cert);
    });
    return map;
  }, [enrolledCourses, userCertificates]);

  // A lookup table of level access status for the currently displayed list.
  const accessById = {};
  activeCourseList.forEach((c) => { accessById[c.id] = accessFor(c, user); });

  const filtered = activeCourseList.filter((c) => {
    const s = c.enrollment?.status;
    const access = accessById[c.id];
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'RECERTIFICATION' && recertByCourseId[c.id]?.needsRecertification) ||
      (statusFilter === 'MANDATORY' && c.courseType === 'MANDATORY') ||
      (statusFilter === 'CURRICULUM' && (c.isCurriculum || Boolean(c.curriculumTitle))) ||
      (statusFilter === 'IN_PERSON' && (c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB')) ||
      (statusFilter === 'VIRTUAL_CLASS' && c.onlineClassType === 'VIRTUAL_CLASS') ||
      (statusFilter === 'LEVEL_UP' && access.state === ACCESS_STATE.REQUESTABLE) ||
      (statusFilter === 'PENDING_APPROVAL' && access.state === ACCESS_STATE.PENDING_APPROVAL) ||
      s === statusFilter;

    const matchCategory = courseMatchesCategory(c, categoryFilter);
    const matchOrgUnit = orgUnitFilter === 'ALL' || courseOrgUnitGroups(c).some((g) => g.key === orgUnitFilter);
    const matchFormat = formatFilter === 'ALL' || c.format?.includes(formatFilter) || c.modality === formatFilter
      || (formatFilter === 'VIRTUAL_CLASS' && c.onlineClassType === 'VIRTUAL_CLASS');
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      (c.domain && c.domain.toLowerCase().includes(search.toLowerCase()));

    return matchStatus && matchCategory && matchOrgUnit && matchFormat && matchSearch;
  });

  const categoryOptions = [...new Set(allCourses.flatMap((c) => (c.categories && c.categories.length ? c.categories : [c.category])).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const orgUnitOptionsMap = new Map();
  allCourses.forEach((c) => {
    const gList = courseOrgUnitGroups(c);
    gList.forEach((g) => {
      if (!orgUnitOptionsMap.has(g.key)) orgUnitOptionsMap.set(g.key, g.label);
    });
  });
  const orgUnitOptions = Array.from(orgUnitOptionsMap.entries());

  const groups = buildCourseGroups(filtered, groupBy);

  const completedCount = enrolledCourses.filter((c) => c.enrollment?.status === 'COMPLETED').length;
  const inProgressCount = enrolledCourses.filter((c) => c.enrollment?.status === 'IN_PROGRESS').length;
  const overdueCount = enrolledCourses.filter((c) => c.enrollment?.status === 'OVERDUE').length;
  const mandatoryCount = enrolledCourses.filter((c) => c.courseType === 'MANDATORY').length;
  const recertCount = enrolledCourses.filter((c) => recertByCourseId[c.id]?.needsRecertification).length;


  // Whole-library statistics under the level rules
  const catalogAccess = allCourses.map((c) => accessFor(c, user));
  const requestableCount = catalogAccess.filter((a) => a.state === ACCESS_STATE.REQUESTABLE).length;
  const pendingCount = catalogAccess.filter((a) => a.state === ACCESS_STATE.PENDING_APPROVAL).length;
  const approvedCount = catalogAccess.filter((a) => a.state === ACCESS_STATE.APPROVED).length;
  const hardLockedCount = catalogAccess.filter((a) => a.state === ACCESS_STATE.LOCKED_LEVEL_GAP).length;

  // Progress on the current level program (the real condition for climbing to the next level)
  const myLevelCourses = enrolledCourses.filter((c) => normalizeLevel(c.targetLevel) === userLevel);
  const myLevelDone = myLevelCourses.filter((c) => c.enrollment?.status === 'COMPLETED').length;
  const myLevelPct = myLevelCourses.length ? Math.round((myLevelDone / myLevelCourses.length) * 100) : 0;

  /** A course's action button, decided entirely by `access.state`. */
  function renderAction(c, access, size = 'sm') {
    const enr = c.enrollment;
    const isInPerson = c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB';
    const isCompleted = enr?.status === 'COMPLETED';
    const isFailed = enr?.status === 'FAILED';

    switch (access.state) {
      case ACCESS_STATE.LOCKED_LEVEL_GAP:
        return (
          <Button size={size} variant="outline" icon="ti-ban" disabled
            title={access.reason}>
            ⛔ Grade Skipping Blocked
          </Button>
        );
      case ACCESS_STATE.PENDING_APPROVAL:
        return (
          <Button size={size} variant="outline" icon="ti-clock" disabled title={access.reason}>
            ⏳ Pending Approval
          </Button>
        );
      case ACCESS_STATE.REJECTED:
      case ACCESS_STATE.REQUESTABLE:
        return (
          <Button size={size} variant="primary" icon="ti-lock"
            onClick={() => openRequestModal(c, access)}>
            🔒 Request Level Skip Approval
          </Button>
        );
      default:
        break;
    }

    const recert = recertByCourseId[c.id];
    if (recert?.needsRecertification) {
      return (
        <Button
          size={size}
          variant="primary"
          tone={recert.isExpired ? 'danger' : 'primary'}
          icon="ti-refresh"
          onClick={() => navigate(`${basePath}/${c.id}`)}
        >
          {recert.actionLabel}
        </Button>
      );
    }

    if (isInPerson) {
      return (
        <Button size={size} variant="primary" icon="ti-calendar-event" onClick={() => navigate('/learner/classrooms')}>
          View The QR Schedule
        </Button>
      );
    }
    if (enr) {
      return (
        <Button
          size={size}
          variant={isCompleted ? 'outline' : 'primary'}
          icon={isCompleted ? 'ti-rotate' : isFailed ? 'ti-reload' : 'ti-player-play'}
          onClick={() => navigate(`${basePath}/${c.id}`)}
        >
          {isCompleted ? 'Revise' : isFailed ? 'Retake' : enr.progressPercent > 0 ? 'Continue' : 'Start'}
        </Button>
      );
    }
    return (
      <Button
        size={size}
        variant={access.state === ACCESS_STATE.APPROVED ? 'primary' : 'outline'}
        icon={access.state === ACCESS_STATE.APPROVED ? 'ti-player-play' : 'ti-plus'}
        onClick={() => handleStart(c, access)}
      >
        {access.state === ACCESS_STATE.APPROVED ? 'Start Learning' : 'Enroll'}
      </Button>
    );
  }


  return (
    <>
      {/* PAGE HEADER */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1>My Training Programs &amp; Courses</h1>
          <Badge tone="rail">{enrolledCourses.length} Courses In Progress</Badge>
        </div>
        <p style={{ margin: 0 }}>
          Learner: <strong>{user.fullName}</strong> &middot; {user.position} &middot; Current job level:{' '}
          <strong>{levelShortLabel(userLevel)}</strong> — {userLevelDef.titleVi}
        </p>
      </div>

      {toast && (
        <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '4px solid var(--sage)', background: 'var(--sage-soft)', fontSize: 13, color: 'var(--sage-soft-text)', fontWeight: 600 }}>
          <i className="ti ti-circle-check" style={{ marginRight: 6 }} />
          {toast}
        </div>
      )}

      {/* SEQUENTIAL LEVEL ROADMAP DASHBOARD */}
      <div className="card card-pad" style={{ marginBottom: 20, borderLeft: '4px solid var(--blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>
            <i className="ti ti-stairs-up" style={{ marginRight: 6, color: 'var(--blue)' }} />
            Sequential Level Gate
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <JobLevelBadge level={userLevel} />
            <i className="ti ti-arrow-right" style={{ color: 'var(--ink-faint)' }} />
            {oneLevelUp ? <JobLevelBadge level={oneLevelUp} /> : <Badge tone="sage">Already at the highest level</Badge>}
          </div>
        </div>

        <div className="grid grid-4" style={{ gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>
              My Level {userLevel} program progress
            </div>
            <ProgressBar value={myLevelPct} tone={myLevelPct === 100 ? 'sage' : 'blue'} size="sm" />
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>
              {myLevelDone}/{myLevelCourses.length} course &middot; {myLevelPct}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Level skip request allowed (Level {oneLevelUp || '—'})</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)' }}>{requestableCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Pending / Approved</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--amber)' }}>{pendingCount} / {approvedCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Hidden from the catalog (2+ grades away)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--rust)' }}>{hardLockedCount}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 12, lineHeight: 1.5, background: 'var(--paper-sunken)', padding: '8px 12px', borderRadius: 6 }}>
          Locked <strong>Level {userLevel}</strong> and below: start now. A course <strong>Level {oneLevelUp || '—'}</strong> (exactly one grade above):
          you must submit a request and have your manager approve each course. Courses from <strong>2 or more grades</strong>: hidden entirely from the catalog —
          you must complete the whole Level {oneLevelUp || '—'} program before they appear.
        </div>
      </div>

      {/* MANDATORY CURRICULA ASSIGNED TO YOU (MY ASSIGNED CURRICULA) */}
      {assignedCurricula.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 20, background: 'linear-gradient(135deg, var(--paper-raised) 0%, rgba(99,102,241,0.06) 100%)', border: '1px solid var(--rail-soft, #c7d2fe)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)' }}>
              <i className="ti ti-books" style={{ color: 'var(--rail)', fontSize: 18 }} />
              <span>📚 Your Mandatory Curricula ({assignedCurricula.length})</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              The E-Learning roadmaps allocated to your unit or your job level
            </div>
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            {assignedCurricula.map((cur) => {
              const prog = getCurriculumProgress(cur, user, myEnrollments, allCourses);
              return (
                <div key={cur.id} className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{cur.title}</div>
                      <Badge tone={prog.status === 'COMPLETED' ? 'sage' : prog.status === 'IN_PROGRESS' ? 'amber' : 'rail'} size="sm">
                        {prog.status === 'COMPLETED' ? 'Completed' : prog.status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, lineHeight: 1.4 }}>
                      {cur.description}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Badge tone="slate" size="sm">{cur.category || 'Curriculum'}</Badge>
                      <span>&middot;</span>
                      <span>{prog.totalCourses} courses E-Learning</span>
                      {cur.assignedVia?.dueDate && (
                        <>
                          <span>&middot;</span>
                          <span style={{ color: 'var(--rust)', fontWeight: 600 }}>
                            <i className="ti ti-clock" /> Deadline: {cur.assignedVia.dueDate}
                          </span>
                        </>
                      )}
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        <span>Curriculum progress:</span>
                        <strong>{prog.completedCourses}/{prog.totalCourses} course ({prog.progressPercent}%)</strong>
                      </div>
                      <ProgressBar value={prog.progressPercent} tone={prog.status === 'COMPLETED' ? 'sage' : 'rail'} size="sm" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="outline" icon="ti-sitemap" onClick={() => setViewingCurriculum(cur)}>
                      View The Curriculum Roadmap
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STANDARDIZED FILTER TOOLBAR CARD */}
      <div className="card card-pad" style={{ marginBottom: 20, background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
        {/* STATUS QUICK FILTER PILLS */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
          {[
            { id: 'ALL', label: 'All Assigned Courses', count: enrolledCourses.length },
            ...(recertCount > 0 ? [{ id: 'RECERTIFICATION', label: '🔴 Recertification Required', count: recertCount, highlight: true }] : []),
            { id: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
            { id: 'COMPLETED', label: 'Completed', count: completedCount },
            { id: 'OVERDUE', label: 'Overdue', count: overdueCount },
            { id: 'MANDATORY', label: 'Compliance Mandatory', count: mandatoryCount },
            { id: 'CURRICULUM', label: '📚 By Curriculum', count: enrolledCourses.filter((c) => c.isCurriculum || Boolean(c.curriculumTitle)).length },
            { id: 'IN_PERSON', label: '🏢 In-Person Training', count: enrolledCourses.filter((c) => c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB').length },
            { id: 'VIRTUAL_CLASS', label: '💻 Online Class (Webinar/Live Class)', count: enrolledCourses.filter((c) => c.onlineClassType === 'VIRTUAL_CLASS').length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-outline'}`}
              style={{
                fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                borderColor: statusFilter === tab.id ? 'var(--blue)' : tab.highlight ? 'var(--rust)' : 'var(--line)',
                background: statusFilter === tab.id ? (tab.highlight ? 'var(--rust)' : 'var(--blue)') : tab.highlight ? 'var(--rust-soft)' : 'transparent',
                color: statusFilter === tab.id ? '#fff' : tab.highlight ? 'var(--rust-soft-text)' : 'var(--ink)',
                fontWeight: tab.highlight ? 700 : 600,
                borderRadius: 20,
              }}
            >
              {tab.label}
              <span style={{
                background: statusFilter === tab.id ? 'rgba(255,255,255,0.3)' : tab.highlight ? 'var(--rust)' : 'var(--paper-sunken)',
                color: statusFilter === tab.id || tab.highlight ? '#fff' : 'var(--ink-soft)',
                padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700,
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ROW 1: SEARCH, GROUP BY, FILTER TOGGLE, VIEW MODE */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
              placeholder={language === 'en' ? 'Search course code, title, domain...' : 'Search by course code, title, specialization...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Group By Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Group by:</span>
              <select
                value={groupBy}
                onChange={(e) => { setGroupBy(e.target.value); setCollapsedGroups(new Set()); }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: groupBy !== 'NONE' ? 700 : 500,
                  color: groupBy !== 'NONE' ? 'var(--blue, #005BAA)' : 'var(--ink)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {GROUP_BY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-sm ${activeFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
              style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
            >
              <i className="ti ti-filter" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span style={{ background: 'var(--paper-raised)', color: 'var(--rail, #005BAA)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                  {activeFiltersCount}
                </span>
              )}
              <i className={`ti ${showFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
            </button>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`btn btn-sm ${viewMode === 'TABLE' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                title="List View"
              >
                <i className="ti ti-list" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`btn btn-sm ${viewMode === 'GRID' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                title="Grid View"
              >
                <i className="ti ti-layout-grid" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: COLLAPSIBLE FILTER PANEL WITH TOP LABELS */}
        {showFilters && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {/* Filter 1: Category */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Category
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: categoryFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: categoryFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: categoryFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: categoryFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Category ({categoryOptions.length})</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Org Unit / Source */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Assigning Org Unit / Source
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: orgUnitFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: orgUnitFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: orgUnitFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: orgUnitFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={orgUnitFilter}
                  onChange={(e) => setOrgUnitFilter(e.target.value)}
                >
                  <option value="ALL">All Department Giao ({orgUnitOptions.length})</option>
                  {orgUnitOptions.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Filter 3: Format */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Delivery Format
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: formatFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: formatFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: formatFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: formatFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                >
                  <option value="ALL">All formats</option>
                  <option value="SCORM">SCORM Package</option>
                  <option value="Video">Interactive Video</option>
                  <option value="PPT">Interactive PPT</option>
                  <option value="CLASSROOM_LAB">Workshop Practice (ILT)</option>
                  <option value="EXTERNAL_PLATFORM">LinkedIn / Coursera</option>
                  <option value="VIRTUAL_CLASS">💻 Online Class (Webinar/Live Class)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE FILTER TAGS & RESET BAR */}
        {(search || activeFiltersCount > 0 || statusFilter !== 'ALL' || groupBy !== 'NONE') && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Filtering by:</span>

              {search && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Search term: <strong>"{search}"</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                </span>
              )}

              {statusFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Status: <strong>{statusFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
                </span>
              )}

              {categoryFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Area: <strong>{categoryFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setCategoryFilter('ALL')} />
                </span>
              )}

              {orgUnitFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Department: <strong>{orgUnitOptionsMap.get(orgUnitFilter) || orgUnitFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setOrgUnitFilter('ALL')} />
                </span>
              )}

              {formatFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Format: <strong>{formatFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFormatFilter('ALL')} />
                </span>
              )}

              {groupBy !== 'NONE' && (
                <span className="badge" style={{ background: 'var(--paper-sunken)', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Group by: <strong>{GROUP_BY_OPTIONS.find(o => o.id === groupBy)?.label}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setGroupBy('NONE')} />
                </span>
              )}

              <button
                type="button"
                onClick={resetAllFilters}
                style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
              >
                Clear all filters
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Found <strong>{filtered.length}</strong> / {enrolledCourses.length} courses
            </div>
          </div>
        )}
      </div>

      {(() => {
        /** A table for one set of courses (reused for both grouped and ungrouped modes). */
        function renderTable(items) {
          return (
            <div className="card" style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>{language === 'en' ? 'Course Program' : 'Course'}</th>
                    <th style={{ width: 118 }}>{language === 'en' ? 'Access' : 'Access'}</th>
                    <th style={{ width: 150 }}>{language === 'en' ? 'Format' : 'Format'}</th>
                    <th style={{ width: 112 }}>{language === 'en' ? 'Progress' : 'Progress'}</th>
                    <th style={{ width: 104 }}>{language === 'en' ? 'Status' : 'Status'}</th>
                    <th style={{ textAlign: 'right' }}>{language === 'en' ? 'Actions' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)' }}>
                        No course matches the filters.
                      </td>
                    </tr>
                  ) : (
                    items.map((c) => {
                      const enr = c.enrollment;
                  const access = accessById[c.id];
                  const status = enr?.status || 'NOT_STARTED';
                  const stConfig = statusMap[status] || statusMap.NOT_STARTED;
                  const isCompleted = status === 'COMPLETED';
                  const isFailed = status === 'FAILED';
                  const isInPerson = c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB';
                  const isBlocked = access.state === ACCESS_STATE.LOCKED_LEVEL_GAP;

                  return (
                    <tr key={c.id} style={isBlocked ? { opacity: 0.62 } : undefined}>
                      <td>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <img
                            src={getCourseImage(c)}
                            alt={c.title}
                            style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--line)' }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{c.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'var(--font-mono)' }}>{c.code}</span>
                              <span>&middot;</span>
                              <span>{c.category || c.domain}</span>
                              <span>&middot;</span>
                              <span>{c.estimatedHours || '3h'}</span>
                              {(c.isCurriculum || c.curriculumTitle) && (
                                <Badge tone="ai" size="sm">
                                  <i className="ti ti-books" /> {c.curriculumTitle ? `Curriculum: ${c.curriculumTitle}` : 'By Curriculum'}
                                </Badge>
                              )}
                            </div>
                            {access.isLevelLocked && (
                              <div style={{ fontSize: 11, color: isBlocked ? 'var(--rust)' : 'var(--blue)', marginTop: 4, maxWidth: 320, lineHeight: 1.4 }}>
                                <i className={`ti ${isBlocked ? 'ti-ban' : 'ti-lock'}`} style={{ marginRight: 4 }} />
                                {access.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td><LevelAccessBadge access={access} /></td>

                      <td>
                        <div style={{ marginBottom: 3 }}>
                          <Badge tone={courseFormatBadge(c).tone}>{courseFormatBadge(c).icon} {courseFormatBadge(c).label}</Badge>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{c.format || 'E-learning Online'}</div>
                        {(isInPerson || c.onlineClassType === 'VIRTUAL_CLASS') && c.trainerName && (
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Trainer: {c.trainerName}</div>
                        )}
                      </td>

                      <td>
                        {enr ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <ProgressBar value={enr.progressPercent || 0} tone={isCompleted ? 'sage' : isFailed ? 'rust' : 'amber'} size="sm" />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 32 }}>{enr.progressPercent || 0}%</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Not registered</span>
                        )}
                      </td>

                      <td>
                        {(() => {
                          const recert = recertByCourseId[c.id];
                          if (recert?.needsRecertification) {
                            return (
                              <Badge tone={recert.badgeTone} icon={recert.isExpired ? 'ti-alert-circle' : 'ti-clock'}>
                                {recert.statusLabel}
                              </Badge>
                            );
                          }
                          return enr ? (
                            <Badge tone={stConfig.tone} icon={isCompleted ? 'ti-circle-check' : isFailed ? 'ti-alert-circle' : undefined}>
                              {stConfig.label}
                            </Badge>
                          ) : (
                            <Badge tone="slate">Not Enrolled</Badge>
                          );
                        })()}
                      </td>

                      <td style={{ textAlign: 'right' }}>{renderAction(c, access)}</td>
                    </tr>
                  );
                })
                  )}
                </tbody>
              </table>
            </div>
          );
        }

        /** A card grid for one set of courses (reused for both grouped and ungrouped modes). */
        function renderGrid(items) {
          return (
            <div className="grid grid-3" style={{ gap: 16, marginBottom: 20 }}>
              {items.map((c) => {
            const enr = c.enrollment;
            const access = accessById[c.id];
            const isCompleted = enr?.status === 'COMPLETED';
            const def = levelDefinition(c.targetLevel);
            const isBlocked = access.state === ACCESS_STATE.LOCKED_LEVEL_GAP;
            const courseImg = getCourseImage(c);

            return (
              <div
                key={c.id}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  borderTop: `3px solid ${def.colors.border}`,
                  opacity: isBlocked ? 0.62 : 1,
                  overflow: 'hidden',
                }}
              >
                {/* Course Banner Image */}
                <div style={{ position: 'relative', width: '100%', height: 130, background: 'var(--paper-sunken)' }}>
                  <img
                    src={courseImg}
                    alt={c.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <Badge tone={courseFormatBadge(c).tone}>{courseFormatBadge(c).icon} {courseFormatBadge(c).label}</Badge>
                  </div>
                  <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    {c.code}
                  </div>
                </div>

                <div style={{ padding: '14px 16px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.4 }}>{c.title}</div>
                    {(c.isCurriculum || c.curriculumTitle) && (
                      <div style={{ marginBottom: 6 }}>
                        <Badge tone="ai" size="sm">
                          <i className="ti ti-books" /> {c.curriculumTitle ? `Curriculum: ${c.curriculumTitle}` : 'By Curriculum'}
                        </Badge>
                      </div>
                    )}
                    <div style={{ marginBottom: 8 }}><LevelAccessBadge access={access} /></div>
                    <p style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 12 }}>
                      {access.isLevelLocked ? access.reason : (c.description || 'A professional training program built to MM Mega Market standards.')}
                    </p>
                  </div>

                  <div>
                    {enr && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>
                          <span>Progress:</span>
                          <strong>{enr.progressPercent || 0}%</strong>
                        </div>
                        <ProgressBar value={enr.progressPercent || 0} tone={isCompleted ? 'sage' : 'amber'} size="sm" />
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 10, gap: 8 }}>
                      {(() => {
                        const recert = recertByCourseId[c.id];
                        if (recert?.needsRecertification) {
                          return (
                            <Badge tone={recert.badgeTone} icon={recert.isExpired ? 'ti-alert-circle' : 'ti-clock'} size="sm">
                              {recert.statusLabel}
                            </Badge>
                          );
                        }
                        return <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.estimatedHours || '3h'}</span>;
                      })()}
                      {renderAction(c, access)}
                    </div>
                  </div>
                </div>
              </div>

            );
              })}
            </div>
          );
        }

        const renderList = viewMode === 'TABLE' ? renderTable : renderGrid;

        if (groupBy === 'NONE' || !groups) {
          return renderList(filtered);
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 6 }}>
            {groups.map((g) => {
              const isCollapsed = collapsedGroups.has(g.key);
              return (
                <div key={g.key} className="card" style={{ overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleGroupCollapsed(g.key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 18px', background: 'var(--paper-raised)', border: 'none',
                      borderBottom: isCollapsed ? 'none' : '1px solid var(--line)', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ color: 'var(--ink-faint)' }} />
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--rail-soft)', color: 'var(--rail)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${g.icon}`} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{g.label}</div>
                    <Badge tone="slate">{g.items.length} course</Badge>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 130 }}>
                      <div style={{ width: 80 }}>
                        <ProgressBar value={g.percent} tone={g.percent === 100 ? 'sage' : 'amber'} size="sm" />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>{g.percent}%</span>
                    </div>
                  </button>
                  {!isCollapsed && (
                    <div style={{ padding: viewMode === 'GRID' ? '16px 16px 0' : 0 }}>
                      {renderList(g.items)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* MODAL: SUBMIT A LEVEL SKIP REQUEST */}
      <Modal
        isOpen={requestModal.open}
        onClose={() => setRequestModal({ open: false, course: null, access: null })}
        title="Level Skip Approval Request"
        subtitle="The request goes to your line manager for approval, covering this course only."
        size="md"
      >
        {requestModal.course && (
          <div>
            <div style={{ background: 'var(--paper-sunken)', padding: '14px 16px', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{requestModal.course.title}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Your job level:</span>
                <JobLevelBadge level={requestModal.access?.userLevel} />
                <i className="ti ti-arrow-right" style={{ color: 'var(--ink-faint)' }} />
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Course job level:</span>
                <JobLevelBadge level={requestModal.access?.courseLevel} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                This course is above your level <strong>exactly one grade above</strong> — eligible to request approval. Approved by:{' '}
                <strong>Your line manager ({user.managerId || 'Line Manager'})</strong>.
              </div>
            </div>

            <label className="field-label">Reason for the level skip request (sent to your manager)</label>
            <textarea
              className="field-input"
              rows={4}
              style={{ resize: 'vertical', marginBottom: 16 }}
              placeholder="Example: I have completed the mandatory courses for my current level and want to build capability for the Operations Specialist role..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={() => setRequestModal({ open: false, course: null, access: null })}>Cancel</Button>
              <Button variant="primary" icon="ti-send" onClick={submitRequest}>Send The Request To My Manager</Button>
            </div>
          </div>
        )}
      </Modal>

      {viewingCurriculum && (
        <Modal isOpen title={viewingCurriculum.title} subtitle={viewingCurriculum.description} onClose={() => setViewingCurriculum(null)} size="lg">
          <CurriculumTree curriculum={viewingCurriculum} courses={allCourses} enrollmentsMap={myEnrollments} />
        </Modal>
      )}
    </>
  );
}
