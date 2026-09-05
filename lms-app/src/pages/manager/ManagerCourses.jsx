import React, { useState, useMemo } from 'react';
import { managerUser as defaultManager, courses as allCourses, classroomSessions, allUsers, enrollmentsForUser } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import { buildTeam, teamAssignments } from '../../utils/managerRules';
import { Badge, ProgressBar, CourseTypeBadge, Button, Modal } from '../../features/common/ui';
import { downloadCsv } from '../../lib/exportCsv';

export default function ManagerCourses() {
  const { currentUser: authUser, courses: storeCourses, users, enrollments } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const courseList = storeCourses && storeCourses.length > 0 ? storeCourses : allCourses;
  const roster = useMemo(() => (users && users.length > 0 ? users : allUsers()), [users]);
  const today = useMemo(() => new Date(), []);

  const effectiveEnrollments = useMemo(() => {
    const map = {};
    roster.forEach((u) => { map[u.userId] = enrollmentsForUser(u, enrollments); });
    return map;
  }, [roster, enrollments]);

  const team = useMemo(
    () => buildTeam(activeManager, roster, effectiveEnrollments, today),
    [activeManager, roster, effectiveEnrollments, today]
  );
  const teamMembers = team.members;

  const groups = useMemo(() => {
    const assignmentRows = teamAssignments(team, effectiveEnrollments, courseList);
    const map = new Map();

    assignmentRows.forEach((r) => {
      const matchedCourse = courseList.find((c) => c.id === r.courseId || c.title === r.course) || {};
      if (!map.has(r.courseId)) {
        map.set(r.courseId, {
          course: r.course,
          courseId: r.courseId,
          courseType: r.mandatory ? 'MANDATORY' : (matchedCourse.courseType || 'OPTIONAL'),
          domain: matchedCourse.category || matchedCourse.domain || 'Store Operations',
          deliveryType: matchedCourse.deliveryType || (matchedCourse.modality === 'CLASSROOM_LAB' ? 'IN_PERSON_CLASSROOM' : 'ONLINE_ELEARNING'),
          modality: matchedCourse.modality || 'E_LEARNING',
          estimatedHours: matchedCourse.estimatedHours || '2.0h',
          passingScore: matchedCourse.passingScore || 80,
          trainerName: matchedCourse.trainerName || 'L&OD Training Department',
          thumbnail: matchedCourse.thumbnail || matchedCourse.imageUrl,
          members: [],
        });
      }
      map.get(r.courseId).members.push({
        employeeId: r.employeeCode || r.userId,
        userId: r.userId,
        name: r.name,
        position: r.relationshipLabel || 'Team Member',
        status: r.status,
        score: r.score,
        progress: r.progressPercent ?? (r.status === 'COMPLETED' ? 100 : 0),
        dueDate: r.dueDate || '2026-09-30',
        attempts: r.attemptsCount || (r.status === 'COMPLETED' ? 1 : 0),
        lastActivity: r.lastActivity,
        overdue: r.status === 'OVERDUE' || r.isOverdue,
        course: r.course,
        courseId: r.courseId,
      });
    });

    return Array.from(map.values()).map((g) => {
      const assigned = g.members.length;
      const completed = g.members.filter((m) => m.status === 'COMPLETED').length;
      const inProgress = g.members.filter((m) => m.status === 'IN_PROGRESS').length;
      const notStarted = g.members.filter((m) => m.status === 'NOT_STARTED').length;
      const overdue = g.members.filter((m) => m.status === 'OVERDUE').length;
      const failed = g.members.filter((m) => m.status === 'FAILED').length;
      const scored = g.members.filter((m) => m.score != null);
      const avgScore = scored.length ? Math.round(scored.reduce((s, m) => s + m.score, 0) / scored.length) : null;
      const completionRate = Math.round((completed / Math.max(1, assigned)) * 100);

      const hoursNumeric = parseFloat(String(g.estimatedHours).replace(/[^\d.]/g, '')) || 2.0;
      const totalHoursCompleted = Math.round(completed * hoursNumeric * 10) / 10;

      return {
        ...g,
        assigned,
        completed,
        inProgress,
        notStarted,
        overdue,
        failed,
        avgScore,
        completionRate,
        hoursNumeric,
        totalHoursCompleted,
      };
    });
  }, [team, effectiveEnrollments, courseList]);

  // Main Tabs: CURRICULUM_ROSTER, DOMAIN_ANALYTICS, LIVE_WORKSHOPS
  const [activeTab, setActiveTab] = useState('CURRICULUM_ROSTER');

  // Quick Filter Pills
  const [quickFilter, setQuickFilter] = useState('ALL'); // ALL, MANDATORY, OPTIONAL, COMPLETED_100, HAS_OVERDUE

  // Search & Detailed Filters
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState('NONE'); // NONE, TYPE, DOMAIN, RATE
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState('ALL');
  const [rateFilter, setRateFilter] = useState('ALL'); // ALL, 100, 50-99, <50, 0
  const [overdueFilter, setOverdueFilter] = useState('ALL'); // ALL, HAS_OVERDUE, ON_TRACK

  // Modal drill-down state
  const [selectedCourseDrilldown, setSelectedCourseDrilldown] = useState(null);
  const [drilldownReminderSent, setDrilldownReminderSent] = useState(false);

  // Executive KPI summary calculations
  const curriculumKpis = useMemo(() => {
    const totalCoursesCount = groups.length;
    const mandatoryCount = groups.filter((g) => g.courseType === 'MANDATORY').length;
    const optionalCount = totalCoursesCount - mandatoryCount;

    const totalHoursSpent = groups.reduce((acc, g) => acc + g.totalHoursCompleted, 0);

    const totalAssignedSlots = groups.reduce((acc, g) => acc + g.assigned, 0);
    const totalCompletedSlots = groups.reduce((acc, g) => acc + g.completed, 0);
    const avgCompletion = totalAssignedSlots > 0 ? Math.round((totalCompletedSlots / totalAssignedSlots) * 100) : 0;

    const bottleneckCourses = groups.filter((g) => g.overdue > 0 || g.failed > 0);

    return {
      totalCoursesCount,
      mandatoryCount,
      optionalCount,
      totalHoursSpent: Math.round(totalHoursSpent),
      avgCompletion,
      bottleneckCount: bottleneckCourses.length,
      bottleneckCourses,
    };
  }, [groups]);

  // Unique domains list
  const domainList = useMemo(() => {
    const set = new Set();
    groups.forEach((g) => { if (g.domain) set.add(g.domain); });
    return Array.from(set);
  }, [groups]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'ALL') count++;
    if (domainFilter !== 'ALL') count++;
    if (deliveryFilter !== 'ALL') count++;
    if (rateFilter !== 'ALL') count++;
    if (overdueFilter !== 'ALL') count++;
    return count;
  }, [typeFilter, domainFilter, deliveryFilter, rateFilter, overdueFilter]);

  // Filtered Course Groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // Quick filter pill
      if (quickFilter === 'MANDATORY' && g.courseType !== 'MANDATORY') return false;
      if (quickFilter === 'OPTIONAL' && g.courseType === 'MANDATORY') return false;
      if (quickFilter === 'COMPLETED_100' && g.completionRate < 100) return false;
      if (quickFilter === 'HAS_OVERDUE' && g.overdue === 0) return false;

      // Dropdown filters
      if (typeFilter !== 'ALL' && g.courseType !== typeFilter) return false;
      if (domainFilter !== 'ALL' && g.domain !== domainFilter) return false;
      if (deliveryFilter !== 'ALL') {
        if (deliveryFilter === 'IN_PERSON' && g.deliveryType !== 'IN_PERSON_CLASSROOM' && g.modality !== 'CLASSROOM_LAB') return false;
        if (deliveryFilter === 'ONLINE' && g.deliveryType !== 'ONLINE_ELEARNING') return false;
      }
      if (rateFilter !== 'ALL') {
        if (rateFilter === '100' && g.completionRate < 100) return false;
        if (rateFilter === '50-99' && (g.completionRate < 50 || g.completionRate >= 100)) return false;
        if (rateFilter === '<50' && (g.completionRate === 0 || g.completionRate >= 50)) return false;
        if (rateFilter === '0' && g.completionRate > 0) return false;
      }
      if (overdueFilter !== 'ALL') {
        if (overdueFilter === 'HAS_OVERDUE' && g.overdue === 0) return false;
        if (overdueFilter === 'ON_TRACK' && g.overdue > 0) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchTitle = g.course.toLowerCase().includes(q);
        const matchCode = g.courseId?.toLowerCase().includes(q);
        const matchDomain = g.domain?.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchDomain) return false;
      }

      return true;
    });
  }, [groups, quickFilter, typeFilter, domainFilter, deliveryFilter, rateFilter, overdueFilter, search]);

  // Grouped Course Map
  const groupedCourseMap = useMemo(() => {
    if (groupBy === 'NONE') return { 'All Courses': filteredGroups };
    const res = {};

    filteredGroups.forEach((g) => {
      let key = 'Other';
      if (groupBy === 'TYPE') {
        key = g.courseType === 'MANDATORY' ? '🔒 Mandatory Compliance Courses' : '✨ Optional Courses & Roadmaps';
      } else if (groupBy === 'DOMAIN') {
        key = `📂 Domain: ${g.domain || 'Store Operations'}`;
      } else if (groupBy === 'RATE') {
        if (g.completionRate === 100) key = '🏆 100% Complete';
        else if (g.completionRate >= 50) key = '📈 Progressing Well (50% - 99%)';
        else if (g.completionRate > 0) key = '⚠️ Needs A Push (Under 50%)';
        else key = '⏳ Not Started (0%)';
      }

      if (!res[key]) res[key] = [];
      res[key].push(g);
    });

    return res;
  }, [filteredGroups, groupBy]);

  function toggleGroup(key) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleResetAllFilters() {
    setSearch('');
    setQuickFilter('ALL');
    setTypeFilter('ALL');
    setDomainFilter('ALL');
    setDeliveryFilter('ALL');
    setRateFilter('ALL');
    setOverdueFilter('ALL');
    setGroupBy('NONE');
  }

  // Export CSV
  function handleExportCsv() {
    const headers = [
      'Course Code',
      'Course Name',
      'Domain',
      'Format',
      'Duration',
      'Classification',
      'Employees Assigned',
      'Completed',
      'Completion Rate (%)',
      'In Progress',
      'Overdue',
      'Not Passed',
      'Avg Score (%)',
    ];

    const rows = filteredGroups.map((g) => [
      g.courseId || '',
      g.course || '',
      g.domain || '',
      g.deliveryType === 'IN_PERSON_CLASSROOM' ? 'In-Person Class (ILT)' : 'E-Learning',
      g.estimatedHours || '2.0h',
      g.courseType === 'MANDATORY' ? 'Mandatory' : 'Optional',
      g.assigned,
      g.completed,
      `${g.completionRate}%`,
      g.inProgress,
      g.overdue,
      g.failed,
      g.avgScore != null ? `${g.avgScore}%` : 'Not taken',
    ]);

    downloadCsv(`Danh_Muc_Khoa_Hoc_Bo_Phan_${activeManager.divisionCode || 'MMVN'}_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  }

  function handleSendDrilldownReminder() {
    setDrilldownReminderSent(true);
    setTimeout(() => setDrilldownReminderSent(false), 3000);
  }

  // Render Table
  function renderTable(courseList) {
    return (
      <div className="card" style={{ borderRadius: 10, border: '1px solid var(--line)', overflowX: 'auto', marginBottom: 14, background: 'var(--paper-raised)' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--paper-sunken)' }}>
              <th style={{ width: '28%' }}>Program / Course</th>
              <th style={{ width: '12%' }}>Domain</th>
              <th style={{ width: '10%' }}>Duration</th>
              <th style={{ width: '10%' }}>Classification</th>
              <th style={{ width: '8%' }}>Assigned</th>
              <th style={{ width: '14%' }}>Progress &amp; Rate</th>
              <th style={{ width: '8%' }}>Avg Score</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courseList.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-faint)' }}>
                  <i className="ti ti-stack-2" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                  No course matches the current filters.
                </td>
              </tr>
            ) : (
              courseList.map((g) => {
                const hasOverdue = g.overdue > 0;
                const hasFailed = g.failed > 0;
                const isComplete = g.completionRate === 100;

                return (
                  <tr key={g.course} style={{ background: hasOverdue ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: isComplete ? 'var(--sage-soft)' : hasOverdue ? 'var(--rust-soft)' : 'var(--blue-soft)',
                            color: isComplete ? 'var(--sage-soft-text)' : hasOverdue ? '#DC2626' : '#1D4ED8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            flexShrink: 0,
                          }}
                        >
                          <i className={`ti ${g.deliveryType === 'IN_PERSON_CLASSROOM' ? 'ti-school' : 'ti-device-laptop'}`} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{g.course}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                            {g.courseId} &middot; {g.deliveryType === 'IN_PERSON_CLASSROOM' ? 'Practice Class (ILT)' : 'E-Learning'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="badge" style={{ background: 'var(--slate-soft)', color: 'var(--ink-soft)', fontSize: 11 }}>
                        {g.domain}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>
                        <i className="ti ti-clock" style={{ marginRight: 4, fontSize: 12 }} />
                        {g.estimatedHours}
                      </div>
                    </td>

                    <td>
                      <CourseTypeBadge courseType={g.courseType} />
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{g.assigned} NV</div>
                    </td>

                    <td>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: isComplete ? 'var(--sage)' : hasOverdue ? 'var(--rust)' : 'var(--rail)' }}>
                            {g.completed} / {g.assigned} xong
                          </span>
                          <span style={{ fontWeight: 800, color: 'var(--ink)' }}>{g.completionRate}%</span>
                        </div>
                        <ProgressBar
                          value={g.completionRate}
                          tone={isComplete ? 'sage' : hasOverdue ? 'rust' : 'rail'}
                          size="sm"
                        />
                        {(hasOverdue || hasFailed) && (
                          <div style={{ fontSize: 11, color: 'var(--rust)', marginTop: 3, fontWeight: 600 }}>
                            {hasOverdue && `• ${g.overdue} overdue `}
                            {hasFailed && `• ${g.failed} failed the exam`}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      {g.avgScore !== null ? (
                        <div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: g.avgScore >= 80 ? 'var(--sage)' : 'var(--rust)' }}>
                            {g.avgScore}%
                          </span>
                          <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                            {g.avgScore >= 80 ? 'Meets the standard' : 'Under 80%'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant="primary"
                        icon="ti-users-group"
                        onClick={() => setSelectedCourseDrilldown(g)}
                        title="View the detailed list of employees taking this course"
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {/* 1. PAGE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Department Training Programs &amp; Courses</h1>
            <Badge tone="amber" icon="ti-stack-2">
              {activeManager.storeName || `${activeManager.divisionCode} - ${activeManager.departmentCode}`}
            </Badge>
          </div>
          <p style={{ margin: 0 }}>
            Manage the professional training catalog, track knowledge uptake by merchandise category and run branch practice classes for the {teamMembers.length} employees reporting to {activeManager.fullName}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            icon="ti-download"
            onClick={handleExportCsv}
          >
            Export The Catalog To Excel / CSV
          </Button>
        </div>
      </div>

      {/* 2. TOP 4 EXECUTIVE CURRICULUM METRICS */}
      <div className="grid grid-4" style={{ marginBottom: 24, gap: 14 }}>
        {/* Card 1: Total Courses */}
        <div className="card card-pad" style={{ borderLeft: '4px solid var(--blue, #005BAA)', background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Total Courses Allocated
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--blue)' }}>{curriculumKpis.totalCoursesCount}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              ({curriculumKpis.mandatoryCount} Mandatory &middot; {curriculumKpis.optionalCount} optional)
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
            Covers 100% of the category requirements
          </div>
        </div>

        {/* Card 2: Training Hours */}
        <div className="card card-pad" style={{ borderLeft: '4px solid var(--sage, #10B981)', background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Cumulative Team Study Hours
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--sage)' }}>{curriculumKpis.totalHoursSpent}h</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              real training hours
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
            About {Math.round(curriculumKpis.totalHoursSpent / Math.max(1, teamMembers.length))} hours / employee
          </div>
        </div>

        {/* Card 3: Completion Rate */}
        <div className="card card-pad" style={{ borderLeft: '4px solid #8B5CF6', background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Avg Completion Rate
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#8B5CF6' }}>{curriculumKpis.avgCompletion}%</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              the whole program
            </span>
          </div>
          <ProgressBar value={curriculumKpis.avgCompletion} tone="rail" size="sm" />
        </div>

        {/* Card 4: Bottleneck Courses */}
        <div
          className="card card-pad"
          style={{
            borderLeft: '4px solid var(--rust, #EF4444)',
            background: 'var(--paper-raised)',
            cursor: 'pointer',
          }}
          onClick={() => {
            setActiveTab('CURRICULUM_ROSTER');
            setQuickFilter('HAS_OVERDUE');
          }}
          title="Click to filter straight to the courses at risk"
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>Courses Needing Support</span>
            <i className="ti ti-chevron-right" style={{ fontSize: 12, color: 'var(--ink-faint)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: curriculumKpis.bottleneckCount > 0 ? 'var(--rust)' : 'var(--sage)' }}>
              {curriculumKpis.bottleneckCount}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              courses at risk
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
            Some employees are overdue or have failed
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'CURRICULUM_ROSTER', label: 'Course Catalog & Team Progress', icon: 'ti-list-details' },
          { id: 'DOMAIN_ANALYTICS', label: 'Domain & Training Hours Analysis', icon: 'ti-chart-donut' },
          { id: 'LIVE_WORKSHOPS', label: 'Practice Classes & Live Workshops', icon: 'ti-school' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
              color: activeTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: activeTab === tab.id ? 'var(--rail)' : 'var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: activeTab === tab.id ? 700 : 500,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COURSE CATALOG & TEAM PROGRESS */}
      {/* ========================================================================= */}
      {activeTab === 'CURRICULUM_ROSTER' && (
        <>
          {/* FILTER TOOLBAR */}
          <div className="card card-pad" style={{ marginBottom: 16, background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
            {/* ROW 0: QUICK FILTER PILLS */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
              {[
                { id: 'ALL', label: 'All Courses', count: groups.length },
                { id: 'MANDATORY', label: 'Compliance Mandatory', count: groups.filter((g) => g.courseType === 'MANDATORY').length },
                { id: 'OPTIONAL', label: 'Optional / Supplementary', count: groups.filter((g) => g.courseType !== 'MANDATORY').length },
                { id: 'COMPLETED_100', label: '100% Complete', count: groups.filter((g) => g.completionRate === 100).length },
                { id: 'HAS_OVERDUE', label: '🔴 Has Overdue Employees', count: groups.filter((g) => g.overdue > 0).length, highlight: true },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setQuickFilter(f.id)}
                  className={`btn btn-sm ${quickFilter === f.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    borderRadius: 20,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderColor: quickFilter === f.id ? 'var(--blue)' : f.highlight ? 'var(--rust)' : 'var(--line)',
                    background: quickFilter === f.id ? (f.highlight ? 'var(--rust)' : 'var(--blue)') : f.highlight ? 'var(--rust-soft)' : 'transparent',
                    color: quickFilter === f.id ? '#fff' : f.highlight ? 'var(--rust-soft-text)' : 'var(--ink)',
                    fontWeight: f.highlight || quickFilter === f.id ? 700 : 500,
                  }}
                >
                  {f.label}
                  <span style={{
                    background: quickFilter === f.id ? 'rgba(255,255,255,0.3)' : f.highlight ? 'var(--rust)' : 'var(--paper-sunken)',
                    color: quickFilter === f.id || f.highlight ? '#fff' : 'var(--ink-soft)',
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* ROW 1: SEARCH, GROUP BY, FILTER TOGGLE */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                  placeholder="Search by course name, code, domain..."
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                    <option value="NONE">No grouping</option>
                    <option value="TYPE">By Course Classification</option>
                    <option value="DOMAIN">By Domain</option>
                    <option value="RATE">By Completion Rate</option>
                  </select>
                </div>

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
              </div>
            </div>

            {/* ROW 2: COLLAPSIBLE FILTER PANEL */}
            {showFilters && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {/* Domain */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      DOMAIN
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={domainFilter}
                      onChange={(e) => setDomainFilter(e.target.value)}
                    >
                      <option value="ALL">All domains</option>
                      {domainList.map((dom) => (
                        <option key={dom} value={dom}>{dom}</option>
                      ))}
                    </select>
                  </div>

                  {/* Course Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      CLASSIFICATION
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="ALL">All classifications</option>
                      <option value="MANDATORY">Compliance Mandatory</option>
                      <option value="OPTIONAL">Optional / Supplementary</option>
                    </select>
                  </div>

                  {/* Delivery Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      DELIVERY FORMAT
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={deliveryFilter}
                      onChange={(e) => setDeliveryFilter(e.target.value)}
                    >
                      <option value="ALL">All types</option>
                      <option value="ONLINE">Self-Paced E-Learning</option>
                      <option value="IN_PERSON">Practice Class / Live Workshop</option>
                    </select>
                  </div>

                  {/* Rate */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      COMPLETION RATE
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={rateFilter}
                      onChange={(e) => setRateFilter(e.target.value)}
                    >
                      <option value="ALL">All levels</option>
                      <option value="100">🏆 100% complete</option>
                      <option value="50-99">📈 In progress (50% - 99%)</option>
                      <option value="<50">⚠️ Under 50%</option>
                      <option value="0">⏳ 0% (not started)</option>
                    </select>
                  </div>

                  {/* Overdue Status */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      RISK STATUS
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={overdueFilter}
                      onChange={(e) => setOverdueFilter(e.target.value)}
                    >
                      <option value="ALL">All statuses</option>
                      <option value="HAS_OVERDUE">🔴 Has overdue learners</option>
                      <option value="ON_TRACK">🟢 On schedule</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ROW 3: ACTIVE TAGS */}
            {(search || quickFilter !== 'ALL' || typeFilter !== 'ALL' || domainFilter !== 'ALL' || deliveryFilter !== 'ALL' || rateFilter !== 'ALL' || overdueFilter !== 'ALL' || groupBy !== 'NONE') && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Filtering by:</span>
                  {search && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Search term: <strong>"{search}"</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                    </span>
                  )}
                  {quickFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Range: <strong>{quickFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setQuickFilter('ALL')} />
                    </span>
                  )}
                  {domainFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Domain: <strong>{domainFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setDomainFilter('ALL')} />
                    </span>
                  )}
                  {typeFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Type: <strong>{typeFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setTypeFilter('ALL')} />
                    </span>
                  )}
                  {groupBy !== 'NONE' && (
                    <span className="badge" style={{ background: 'var(--paper-sunken)', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Group by: <strong>{groupBy}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setGroupBy('NONE')} />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
                  >
                    Clear all filters
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Found <strong>{filteredGroups.length}</strong> / {groups.length} courses
                </div>
              </div>
            )}
          </div>

          {/* CONTENT: TABLE */}
          {groupBy === 'NONE' ? (
            renderTable(filteredGroups)
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {Object.entries(groupedCourseMap).map(([groupTitle, list]) => {
                const isCollapsed = collapsedGroups.has(groupTitle);
                return (
                  <div key={groupTitle} className="card" style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--paper-raised)' }}>
                    <div
                      onClick={() => toggleGroup(groupTitle)}
                      style={{
                        padding: '12px 18px',
                        background: 'var(--paper-sunken)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ fontSize: 14, color: 'var(--ink-soft)' }} />
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{groupTitle}</span>
                        <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue)', fontWeight: 700, fontSize: 11 }}>
                          {list.length} courses
                        </span>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div style={{ padding: '8px 12px 0' }}>
                        {renderTable(list)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DOMAIN & TRAINING HOURS ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === 'DOMAIN_ANALYTICS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
          <div className="grid grid-2" style={{ gap: 16 }}>
            {/* Breakdown by domain */}
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                Progress By Category Domain (Curriculum Domains)
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16 }}>
                The team's average completion rate broken down by professional group.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {domainList.map((dom) => {
                  const domCourses = groups.filter((g) => g.domain === dom);
                  const totalAssigned = domCourses.reduce((s, c) => s + c.assigned, 0);
                  const totalDone = domCourses.reduce((s, c) => s + c.completed, 0);
                  const rate = totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : 0;

                  return (
                    <div key={dom}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{dom}</span>
                        <span><strong>{rate}%</strong> ({totalDone}/{totalAssigned} learners done)</span>
                      </div>
                      <ProgressBar value={rate} tone={rate === 100 ? 'sage' : rate >= 50 ? 'rail' : 'amber'} size="sm" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery Format Breakdown */}
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                Delivery Modality Breakdown
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16 }}>
                Course distribution by delivery method at MM Mega Market.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--blue-soft)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ti ti-device-laptop" style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>Self-Paced E-Learning (Micro-learning)</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Study on a phone &amp; PDA device</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{groups.filter((g) => g.deliveryType !== 'IN_PERSON_CLASSROOM').length} Locked</div>
                    <div style={{ fontSize: 11, color: 'var(--sage)', fontWeight: 600 }}>Certificate issued automatically</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--amber-soft)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ti ti-school" style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>Hands-On Workshop At The Store</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>QR attendance &amp; practical assessment</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{groups.filter((g) => g.deliveryType === 'IN_PERSON_CLASSROOM' || g.modality === 'CLASSROOM_LAB').length || 2} Locked</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Trainer-led in person</div>
                  </div>
                </div>
              </div>

              {/* Assessment Difficulty Insights */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--ink)' }}>
                  💡 Standout Course Highlights
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--sage)' }}>
                    <span>✓ Highest pass rate:</span>
                    <strong>Food Safety (HACCP) - 100% pass</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--rust)' }}>
                    <span>⚠ Needs extra revision:</span>
                    <strong>Cold Storage Procedures - 1 shift failed 3 times</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRACTICE TRAINING & LIVE WORKSHOP SCHEDULE */}
      {/* ========================================================================= */}
      {activeTab === 'LIVE_WORKSHOPS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', padding: '14px 18px', borderRadius: 8, fontSize: 13, lineHeight: 1.5 }}>
            <i className="ti ti-school" style={{ marginRight: 8, fontSize: 16 }} />
            Tracks hands-on sessions in the Fresh Food Lab and live webinars run by the Faculty at MM Mega Market An Phu.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {classroomSessions.map((session) => (
              <div key={session.id} className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{session.title}</span>
                      <Badge tone="amber">{session.code}</Badge>
                      <Badge tone="sage">QR Attendance Open</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      Trainer: <strong>{session.trainerName}</strong> ({session.trainerTitle}) &middot; Location: <strong>{session.venue}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--rail)' }}>
                      <i className="ti ti-calendar" style={{ marginRight: 4 }} />
                      {session.date}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{session.time}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--ink)' }}>
                  <strong>Practical content:</strong> {session.description}
                </div>

                {/* Enrolled Direct Reports */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 6 }}>
                    Team Members Attending ({session.enrolledStudents?.length || 0} learners):
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(session.enrolledStudents || []).map((stu) => (
                      <div
                        key={stu.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'var(--paper-raised)',
                          border: '1px solid var(--line)',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{stu.name}</span>
                        <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>({stu.position})</span>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: stu.attendance === 'CONFIRMED' ? 'var(--sage)' : '#F59E0B',
                          }}
                          title={stu.attendance === 'CONFIRMED' ? 'Attendance recorded' : 'Awaiting check-in'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LEARNER DRILL-DOWN BY COURSE */}
      {/* ========================================================================= */}
      {selectedCourseDrilldown && (
        <Modal
          title={`Learner Detail By Course: ${selectedCourseDrilldown.course}`}
          onClose={() => setSelectedCourseDrilldown(null)}
          maxWidth={820}
        >
          <div>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-sunken)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Course code: <strong>{selectedCourseDrilldown.courseId}</strong> &middot; Domain: <strong>{selectedCourseDrilldown.domain}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                  Duration: <strong>{selectedCourseDrilldown.estimatedHours}</strong> &middot; Exam pass mark: <strong>≥ 80%</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: selectedCourseDrilldown.completionRate === 100 ? 'var(--sage)' : 'var(--rail)' }}>
                  {selectedCourseDrilldown.completionRate}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  ({selectedCourseDrilldown.completed}/{selectedCourseDrilldown.assigned} complete)
                </div>
              </div>
            </div>

            {/* Members table */}
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table className="table" style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--paper-sunken)' }}>
                    <th>Employee</th>
                    <th>Job Title</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Exam Score</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCourseDrilldown.members.map((m) => (
                    <tr key={m.employeeId}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{m.employeeId}</div>
                      </td>
                      <td>{m.position}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ProgressBar value={m.progress} tone={m.progress >= 100 ? 'sage' : m.status === 'OVERDUE' ? 'rust' : 'rail'} size="sm" />
                          <span style={{ fontWeight: 700, minWidth: 28 }}>{m.progress}%</span>
                        </div>
                      </td>
                      <td>
                        <Badge tone={m.status === 'COMPLETED' ? 'sage' : m.status === 'OVERDUE' || m.status === 'FAILED' ? 'rust' : 'rail'}>
                          {m.status === 'COMPLETED' ? 'Complete' : m.status === 'IN_PROGRESS' ? 'In Progress' : m.status === 'OVERDUE' ? 'Overdue' : m.status === 'FAILED' ? 'Not Passed' : 'Not Started'}
                        </Badge>
                      </td>
                      <td>
                        {m.score != null ? (
                          <span style={{ fontWeight: 800, color: m.score >= 80 ? 'var(--sage)' : 'var(--rust)' }}>
                            {m.score}% {m.attempts > 1 && `(${m.attempts}L)`}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)' }}>—</span>
                        )}
                      </td>
                      <td style={{ color: m.overdue ? 'var(--rust)' : 'inherit', fontWeight: m.overdue ? 700 : 400 }}>
                        {m.dueDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                {selectedCourseDrilldown.overdue > 0 ? (
                  <span style={{ color: 'var(--rust)', fontWeight: 600 }}>
                    ⚠️ {selectedCourseDrilldown.overdue} employees are overdue on this course
                  </span>
                ) : (
                  <span>🟢 Every employee is on schedule</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="outline" size="sm" onClick={() => setSelectedCourseDrilldown(null)}>
                  Close
                </Button>
                {selectedCourseDrilldown.completionRate < 100 && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={drilldownReminderSent ? 'ti-check' : 'ti-bell'}
                    onClick={handleSendDrilldownReminder}
                    disabled={drilldownReminderSent}
                  >
                    {drilldownReminderSent ? 'Reminder Sent!' : 'Nudge The Unfinished Learners'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
