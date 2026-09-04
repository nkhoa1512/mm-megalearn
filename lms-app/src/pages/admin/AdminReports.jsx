import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  classroomSessions,
  allUsers,
  enrollmentsForUser,
  deriveCertificates,
} from '../../data/mockData';
import { Badge, Button, ProgressBar } from '../../features/common/ui';
import { downloadWorkbook } from '../../lib/exportExcel';
import { downloadCsv } from '../../lib/exportCsv';
import { useCourseStore } from '../../store/CourseStore';
import { normalizeRole } from '../../data/roles';
import { PASS_MARK } from '../../utils/managerRules';

export default function AdminReports() {
  const { pathname } = useLocation();
  const {
    currentUser,
    users: storeUsers,
    enrollments: storeEnrollments,
    courses,
    certificateTemplates,
  } = useCourseStore();

  const userRole = normalizeRole(currentUser?.role);
  const isTrainer = userRole === 'trainer';

  // Scoping for Trainer vs Admin on Operational Reports (Learning Transcripts & Learner Progress)
  const trainerCourseIds = useMemo(() => {
    if (!isTrainer) return null;
    const ids = new Set();
    (courses || []).forEach((c) => {
      if (c.trainerId === currentUser?.userId || c.trainerName === currentUser?.fullName) ids.add(c.id);
      if (c.coTrainerIds && c.coTrainerIds.includes(currentUser?.userId)) ids.add(c.id);
      if (c.coTrainerNames && c.coTrainerNames.includes(currentUser?.fullName)) ids.add(c.id);
    });
    classroomSessions.forEach((s) => {
      if (s.trainerId === currentUser?.userId || s.trainerName === currentUser?.fullName) {
        if (s.courseId) ids.add(s.courseId);
      }
    });
    // Fallback seed courses so trainer can review their classroom learners
    if (ids.size === 0) {
      ids.add('CRS-FSH-001');
      ids.add('CRS-FSH-002');
      ids.add('CRS-STOPS-037');
    }
    return ids;
  }, [isTrainer, courses, currentUser]);

  const roster = storeUsers && storeUsers.length > 0 ? storeUsers : allUsers();
  const enrollmentsByUser = useMemo(() => {
    const map = {};
    roster.forEach((u) => {
      map[u.userId] = enrollmentsForUser(u, storeEnrollments);
    });
    return map;
  }, [roster, storeEnrollments]);

  const allEnrollments = useMemo(() => {
    const list = [];
    roster.forEach((u) => {
      Object.values(enrollmentsByUser[u.userId] || {}).forEach((e) => list.push(e));
    });
    return list;
  }, [roster, enrollmentsByUser]);

  const scoredEnrollments = useMemo(
    () => allEnrollments.filter((e) => typeof e.score === 'number'),
    [allEnrollments]
  );

  const companyAvgScore = scoredEnrollments.length > 0
    ? Math.round((scoredEnrollments.reduce((a, e) => a + e.score, 0) / scoredEnrollments.length) * 10) / 10
    : null;

  const firstAttemptPasses = scoredEnrollments.filter(
    (e) => (Number(e.attemptsCount) || 0) <= 1 && e.score >= PASS_MARK
  );

  const companyFirstAttemptPassRate = scoredEnrollments.length > 0
    ? Math.round((firstAttemptPasses.length / scoredEnrollments.length) * 1000) / 10
    : null;

  // Certificate codes derived from standard engine
  const certByUserCourse = useMemo(() => {
    const map = new Map();
    roster.forEach((u) => {
      deriveCertificates(courses, u, storeEnrollments, certificateTemplates).forEach((cert) => {
        map.set(`${u.userId}::${cert.courseId}`, cert);
      });
    });
    return map;
  }, [roster, courses, storeEnrollments, certificateTemplates]);

  const RECERT_WARNING_DAYS = 30;
  const TODAY_STR = '2026-09-04';

  // Flattened Dataset for Learner Progress & Learning Transcripts
  const flattenedEnrollmentRows = useMemo(() => {
    const rows = [];
    const courseMap = new Map((courses || []).map((c) => [c.id, c]));

    roster.forEach((u) => {
      const userEnrolls = enrollmentsByUser[u.userId] || {};
      Object.entries(userEnrolls).forEach(([courseId, e]) => {
        // Scoping: Trainer sees only courses they teach
        if (isTrainer && trainerCourseIds && !trainerCourseIds.has(courseId)) {
          return;
        }
        const course = courseMap.get(courseId);

        const dueStr = e.dueDate || course?.assignment?.dueDate || '2026-09-30';
        let daysDiff = 0;
        try {
          const dueD = new Date(dueStr);
          const nowD = new Date(TODAY_STR);
          daysDiff = Math.ceil((dueD - nowD) / (1000 * 60 * 60 * 24));
        } catch (_) {
          daysDiff = 15;
        }

        const progress = typeof e.progressPercent === 'number'
          ? e.progressPercent
          : e.status === 'COMPLETED' ? 100 : e.status === 'NOT_STARTED' ? 0 : 45;

        const durationHrs = course?.estimatedHours
          ? parseFloat(course.estimatedHours)
          : (course?.modules ? `${course.modules.length * 1.5}` : '2.0');
        const cert = certByUserCourse.get(`${u.userId}::${courseId}`) || null;
        const certCode = cert?.id || '—';

        let recertDaysRemaining = null;
        let needsRecertification = false;
        if (e.status === 'COMPLETED' && cert && !cert.isLifetime && cert.validUntil) {
          try {
            recertDaysRemaining = Math.ceil((new Date(cert.validUntil) - new Date(TODAY_STR)) / (1000 * 60 * 60 * 24));
            needsRecertification = recertDaysRemaining <= RECERT_WARNING_DAYS;
          } catch (_) { /* leave as false */ }
        }

        rows.push({
          userId: u.userId,
          employeeCode: u.employeeCode || u.userId,
          employeeName: u.fullName,
          position: u.position || u.title || 'Specialist Staff',
          division: u.divisionName || u.businessUnitName || 'MM Mega Market',
          department: u.departmentName || u.subDepartmentName || u.divisionName || '—',
          workplace: u.storeName || 'Head Office (An Phu)',
          level: u.level ? `Level ${u.level}` : 'Level 7',
          courseId,
          courseCode: course?.code || courseId,
          courseTitle: course?.title || e.courseTitle || courseId,
          category: course?.category || 'Store Operations',
          learningPath: course?.category || 'MMVN Standard Curriculum',
          deliveryType: course?.deliveryType === 'IN_PERSON_CLASSROOM' ? 'In-Person / Workshop (ILT)' : 'Online E-Learning',
          enrollmentDate: e.enrolledAt || e.assignedDate || '—',
          startDate: e.status !== 'NOT_STARTED' ? (e.startedAt || '—') : '—',
          completionDate: e.completedAt || '—',
          completionTime: e.completedTime || null,
          status: e.status || 'IN_PROGRESS',
          progressPercent: progress,
          score: typeof e.score === 'number' ? e.score : null,
          certificateCode: certCode,
          hoursSpent: typeof e.hoursSpent === 'number' ? e.hoursSpent : null,
          learningHours: `${durationHrs} hrs`,
          lastActivity: e.lastActivityAt || (e.status === 'NOT_STARTED' ? 'Not started' : '2026-08-20'),
          dueDate: dueStr,
          daysRemaining: daysDiff,
          needsRecertification,
          recertDaysRemaining,
          certValidUntil: cert?.validUntil || null,
        });
      });
    });

    return rows;
  }, [roster, enrollmentsByUser, courses, isTrainer, trainerCourseIds, certByUserCourse]);

  // Operational Subsets
  const progressReportRows = useMemo(
    () => flattenedEnrollmentRows.filter((r) => r.status !== 'COMPLETED' || r.needsRecertification),
    [flattenedEnrollmentRows]
  );
  const transcriptReportRows = useMemo(
    () => flattenedEnrollmentRows.filter((r) => r.status === 'COMPLETED'),
    [flattenedEnrollmentRows]
  );

  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  // Filters for Learner Progress
  const [lpSearch, setLpSearch] = useState('');
  const [lpStatusFilter, setLpStatusFilter] = useState('ALL');
  const [lpCourseFilter, setLpCourseFilter] = useState('ALL');
  const [lpDeptFilter, setLpDeptFilter] = useState('ALL');
  const [lpDivFilter, setLpDivFilter] = useState('ALL');

  // Filters for Learning Transcripts
  const [ltSearch, setLtSearch] = useState('');
  const [ltPathFilter, setLtPathFilter] = useState('ALL');
  const [ltDeptFilter, setLtDeptFilter] = useState('ALL');
  const [ltDivFilter, setLtDivFilter] = useState('ALL');

  // Filtered Operational Datasets
  const filteredLearnerProgress = useMemo(() => {
    return progressReportRows.filter((r) => {
      const matchSearch = !lpSearch.trim() ||
        r.employeeName.toLowerCase().includes(lpSearch.toLowerCase()) ||
        r.employeeCode.toLowerCase().includes(lpSearch.toLowerCase()) ||
        r.courseTitle.toLowerCase().includes(lpSearch.toLowerCase());
      const matchStatus = lpStatusFilter === 'ALL' || r.status === lpStatusFilter;
      const matchCourse = lpCourseFilter === 'ALL' || r.courseId === lpCourseFilter;
      const matchDiv = lpDivFilter === 'ALL' || r.division === lpDivFilter;
      const matchDept = lpDeptFilter === 'ALL' || r.department === lpDeptFilter;
      return matchSearch && matchStatus && matchCourse && matchDiv && matchDept;
    });
  }, [progressReportRows, lpSearch, lpStatusFilter, lpCourseFilter, lpDivFilter, lpDeptFilter]);

  const filteredLearningTranscript = useMemo(() => {
    return transcriptReportRows.filter((r) => {
      const matchSearch = !ltSearch.trim() ||
        r.employeeName.toLowerCase().includes(ltSearch.toLowerCase()) ||
        r.employeeCode.toLowerCase().includes(ltSearch.toLowerCase()) ||
        r.courseTitle.toLowerCase().includes(ltSearch.toLowerCase());
      const matchPath = ltPathFilter === 'ALL' || r.learningPath === ltPathFilter;
      const matchDiv = ltDivFilter === 'ALL' || r.division === ltDivFilter;
      const matchDept = ltDeptFilter === 'ALL' || r.department === ltDeptFilter;
      return matchSearch && matchPath && matchDiv && matchDept;
    });
  }, [transcriptReportRows, ltSearch, ltPathFilter, ltDivFilter, ltDeptFilter]);

  // Tab State: Only 2 focused operational reports
  const [activeReportTab, setActiveReportTab] = useState('LEARNER_PROGRESS');

  const REPORT_TABS = [
    { id: 'LEARNER_PROGRESS', label: 'Learner Progress Report', icon: 'ti-chart-pie' },
    { id: 'LEARNING_TRANSCRIPT', label: 'Learning Transcripts', icon: 'ti-certificate' },
  ];

  // Excel / CSV Formatted Row Mappings
  const learnerProgressSheetRows = useMemo(() => progressReportRows.map((r) => ({
    'Employee Name': r.employeeName,
    'Employee Code': r.employeeCode,
    Position: r.position,
    Division: r.division,
    Department: r.department,
    'Workplace / Store': r.workplace,
    Level: r.level,
    'Course Title': r.courseTitle,
    'Course Code': r.courseCode,
    Category: r.category,
    'Progress %': `${r.progressPercent}%`,
    Status: r.needsRecertification ? 'NEEDS_RECERTIFICATION' : r.status,
    'Last Activity': r.lastActivity,
    'Due Date': r.dueDate,
    'Days Remaining / Overdue': r.needsRecertification
      ? (r.recertDaysRemaining < 0
        ? `Certificate expired ${Math.abs(r.recertDaysRemaining)} days ago`
        : `Certificate expires in ${r.recertDaysRemaining} days`)
      : r.daysRemaining < 0
      ? `Overdue ${Math.abs(r.daysRemaining)} days`
      : `Remaining ${r.daysRemaining} days`,
  })), [progressReportRows]);

  const learningTranscriptSheetRows = useMemo(() => transcriptReportRows.map((r) => ({
    'Employee Name': r.employeeName,
    'Employee Code': r.employeeCode,
    Position: r.position,
    Division: r.division,
    Department: r.department,
    'Workplace / Store': r.workplace,
    Level: r.level,
    'Course Title': r.courseTitle,
    'Course Code': r.courseCode,
    'Learning Path': r.learningPath,
    'Delivery Type': r.deliveryType,
    'Enrollment Date': r.enrollmentDate,
    'Start Date': r.startDate,
    'Completion Date': r.completionDate,
    'Completion Time': r.completionTime || '—',
    Status: r.status,
    Score: r.score !== null ? `${r.score}%` : '—',
    'Certificate Code': r.certificateCode,
    'Hours Spent': r.hoursSpent !== null ? `${r.hoursSpent} hrs` : '—',
    'Declared Course Length': r.learningHours,
  })), [transcriptReportRows]);

  // Export handlers
  function handleExportAllExcel() {
    setIsExporting(true);
    setTimeout(() => {
      downloadWorkbook(
        `mmvn-learner-reports-${new Date().toISOString().slice(0, 10)}.xls`,
        [
          { name: 'Learner Progress', rows: learnerProgressSheetRows },
          { name: 'Learning Transcripts', rows: learningTranscriptSheetRows },
        ]
      );
      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 3000);
    }, 400);
  }

  function handleExportProgressExcel() {
    downloadWorkbook(
      `mmvn-learner-progress-${new Date().toISOString().slice(0, 10)}.xls`,
      [{ name: 'Learner Progress', rows: learnerProgressSheetRows }]
    );
  }

  function handleExportProgressCsv() {
    downloadCsv(
      `mmvn-learner-progress-${new Date().toISOString().slice(0, 10)}.csv`,
      learnerProgressSheetRows
    );
  }

  function handleExportTranscriptExcel() {
    downloadWorkbook(
      `mmvn-learning-transcripts-${new Date().toISOString().slice(0, 10)}.xls`,
      [{ name: 'Learning Transcripts', rows: learningTranscriptSheetRows }]
    );
  }

  function handleExportTranscriptCsv() {
    downloadCsv(
      `mmvn-learning-transcripts-${new Date().toISOString().slice(0, 10)}.csv`,
      learningTranscriptSheetRows
    );
  }

  function handleExportActiveCsv() {
    if (activeReportTab === 'LEARNER_PROGRESS') {
      handleExportProgressCsv();
    } else {
      handleExportTranscriptCsv();
    }
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>
              {isTrainer ? 'My Class Progress & Training Records' : 'Learner Progress & Training Records Center'}
            </h1>
            <Badge tone="ai" icon="ti-report-analytics">
              {isTrainer ? 'Classroom Progress & Transcripts' : 'Real-Time Progress & Transcripts'}
            </Badge>
          </div>
          <p>
            {isTrainer
              ? 'Real-time tracking of course progress and completed training transcripts for learners in your assigned classes.'
              : 'Real-time monitoring of employee course progress, overdue follow-ups, certificate renewals, and comprehensive historical training transcripts across the organization.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            icon={exportComplete ? 'ti-check' : isExporting ? 'ti-loader ti-spin' : 'ti-file-spreadsheet'}
            onClick={handleExportAllExcel}
            disabled={isExporting}
          >
            {exportComplete ? 'Workbook Downloaded!' : 'Export All (Excel, 2 Sheets)'}
          </Button>
          <Button
            variant="primary"
            icon="ti-file-text"
            onClick={handleExportActiveCsv}
            disabled={isExporting}
          >
            Export Active Report (CSV)
          </Button>
        </div>
      </div>

      {/* REPORT SECTION TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: activeReportTab === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
              color: activeReportTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: activeReportTab === tab.id ? 'var(--rail)' : 'var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: LEARNER PROGRESS REPORT */}
      {activeReportTab === 'LEARNER_PROGRESS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header & Scope Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-chart-pie" style={{ color: 'var(--blue)' }} />
                Learner Progress Monitoring Report
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                {isTrainer
                  ? 'Real-time monitoring of learner progress for your assigned courses and workshops. Displays in-progress, overdue, not started, or recertification-pending enrollments. Fully completed courses are recorded in the Learning Transcripts tab.'
                  : `Real-time monitoring of learner progress across all ${roster.length} active employees in the system. Displays in-progress, overdue, not started, or recertification-pending enrollments. Fully completed courses are recorded in the Learning Transcripts tab.`}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge tone={isTrainer ? 'sage' : 'ai'} icon="ti-shield-check">
                {isTrainer ? 'Scope: Assigned Classrooms (Trainer)' : 'Scope: Enterprise-wide (Admin)'}
              </Badge>
              <Button variant="outline" size="sm" icon="ti-file-spreadsheet" onClick={handleExportProgressExcel}>
                Export Progress (Excel)
              </Button>
              <Button variant="outline" size="sm" icon="ti-file-text" onClick={handleExportProgressCsv}>
                Export Progress (CSV)
              </Button>
            </div>
          </div>

          {/* 4 Summary Metric Cards */}
          <div className="grid grid-4" style={{ gap: 16 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Action Required</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)', marginTop: 4 }}>
                {progressReportRows.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Courses pending completion</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Actively In Progress</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)', marginTop: 4 }}>
                {progressReportRows.filter((r) => r.status === 'IN_PROGRESS').length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Progress from 1% to 99%</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Needs Recertification</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)', marginTop: 4 }}>
                {progressReportRows.filter((r) => r.needsRecertification).length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Completed, certificate expiring/expired</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Overdue Warning</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)', marginTop: 4 }}>
                {progressReportRows.filter((r) => r.status === 'OVERDUE' || (r.status !== 'COMPLETED' && r.daysRemaining < 0)).length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, fontWeight: 600 }}>Requires immediate follow-up</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card card-pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
            <div style={{ flex: '1 1 240px', minWidth: 200 }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="🔍 Search by name, employee ID, course title..."
                value={lpSearch}
                onChange={(e) => setLpSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 12px', fontSize: 13, borderRadius: 6, border: '1px solid var(--line-strong)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Status:</span>
              <select
                className="form-select form-select-sm"
                value={lpStatusFilter}
                onChange={(e) => setLpStatusFilter(e.target.value)}
                style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
              >
                <option value="ALL">All Statuses ({progressReportRows.length})</option>
                <option value="IN_PROGRESS">In Progress (IN_PROGRESS)</option>
                <option value="OVERDUE">Overdue (OVERDUE)</option>
                <option value="COMPLETED">Needs Recertification (COMPLETED)</option>
                <option value="NOT_STARTED">Not Started (NOT_STARTED)</option>
              </select>

              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginLeft: 8 }}>Course:</span>
              <select
                className="form-select form-select-sm"
                value={lpCourseFilter}
                onChange={(e) => setLpCourseFilter(e.target.value)}
                style={{ maxWidth: 220, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
              >
                <option value="ALL">All Courses</option>
                {Array.from(new Set(progressReportRows.map((r) => r.courseId))).map((cid) => {
                  const cRow = progressReportRows.find((r) => r.courseId === cid);
                  return <option key={cid} value={cid}>{cRow?.courseTitle || cid}</option>;
                })}
              </select>

              {!isTrainer && (
                <>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginLeft: 8 }}>Division:</span>
                  <select
                    className="form-select form-select-sm"
                    value={lpDivFilter}
                    onChange={(e) => setLpDivFilter(e.target.value)}
                    style={{ maxWidth: 200, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
                  >
                    <option value="ALL">All Divisions</option>
                    {Array.from(new Set(progressReportRows.map((r) => r.division))).sort().map((div) => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>

                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginLeft: 8 }}>Department:</span>
                  <select
                    className="form-select form-select-sm"
                    value={lpDeptFilter}
                    onChange={(e) => setLpDeptFilter(e.target.value)}
                    style={{ maxWidth: 200, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
                  >
                    <option value="ALL">All Departments</option>
                    {Array.from(new Set(progressReportRows.map((r) => r.department))).sort().map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </>
              )}

              {(lpSearch || lpStatusFilter !== 'ALL' || lpCourseFilter !== 'ALL' || lpDivFilter !== 'ALL' || lpDeptFilter !== 'ALL') && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => { setLpSearch(''); setLpStatusFilter('ALL'); setLpCourseFilter('ALL'); setLpDivFilter('ALL'); setLpDeptFilter('ALL'); }}
                  style={{ fontSize: 11, color: 'var(--ink-soft)', cursor: 'pointer' }}
                >
                  <i className="ti ti-x" /> Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="card" style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Learner / Employee</th>
                  <th style={{ minWidth: 190 }}>Division / Department</th>
                  <th style={{ minWidth: 240 }}>Course Title &amp; Code</th>
                  <th style={{ minWidth: 160 }}>Progress (% Completed)</th>
                  <th style={{ minWidth: 120 }}>Status</th>
                  <th style={{ minWidth: 120 }}>Last Activity</th>
                  <th style={{ minWidth: 110 }}>Due Date</th>
                  <th style={{ minWidth: 150 }}>Days Remaining / Overdue</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearnerProgress.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)' }}>
                      No learners or courses match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredLearnerProgress.map((row, idx) => {
                    const isOverdue = !row.needsRecertification && (row.status === 'OVERDUE' || (row.status !== 'COMPLETED' && row.daysRemaining < 0));
                    return (
                      <tr key={`${row.userId}-${row.courseId}-${idx}`}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{row.employeeName}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                            {row.employeeCode} · <span style={{ fontWeight: 600 }}>{row.level}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{row.division}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{row.department}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{row.workplace}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{row.courseTitle}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                            {row.courseCode} · {row.category}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <ProgressBar
                                value={row.progressPercent}
                                tone={row.progressPercent === 100 ? 'sage' : isOverdue ? 'rust' : 'rail'}
                                size="sm"
                              />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 800, minWidth: 36, textAlign: 'right' }}>
                              {row.progressPercent}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <Badge
                            tone={
                              row.needsRecertification ? 'blue' :
                              isOverdue ? 'rust' :
                              row.status === 'NOT_STARTED' ? 'slate' : 'amber'
                            }
                          >
                            {row.needsRecertification ? 'Needs Recert' :
                             isOverdue ? 'Overdue' :
                             row.status === 'NOT_STARTED' ? 'Not Started' : 'In Progress'}
                          </Badge>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                            {row.lastActivity}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                            {row.needsRecertification ? row.certValidUntil : row.dueDate}
                          </span>
                        </td>
                        <td>
                          {row.needsRecertification ? (
                            <span style={{ fontSize: 12, fontWeight: 800, color: row.recertDaysRemaining < 0 ? 'var(--red)' : 'var(--amber)', background: row.recertDaysRemaining < 0 ? 'var(--red-soft)' : 'var(--amber-soft)', padding: '2px 8px', borderRadius: 4 }}>
                              {row.recertDaysRemaining < 0
                                ? `Certificate expired ${Math.abs(row.recertDaysRemaining)} days ago`
                                : `Certificate expires in ${row.recertDaysRemaining} days`}
                            </span>
                          ) : isOverdue ? (
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--red)', background: 'var(--red-soft)', padding: '2px 8px', borderRadius: 4 }}>
                              Overdue {Math.abs(row.daysRemaining)} days
                            </span>
                          ) : row.daysRemaining === 0 ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>
                              Due today
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>
                              {row.daysRemaining} days remaining
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: LEARNING TRANSCRIPT REPORT */}
      {activeReportTab === 'LEARNING_TRANSCRIPT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header & Scope Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-certificate" style={{ color: 'var(--green)' }} />
                Comprehensive Learning Transcripts
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                {isTrainer
                  ? 'Permanent official transcripts of all completed courses for learners in your assigned courses and workshops — enrollment dates, completion timestamps, scores, certificate codes, and actual training hours. Formatted for compliance audits and competency verification.'
                  : 'Permanent official transcripts of all completed courses across employees enterprise-wide — enrollment dates, completion timestamps, scores, certificate codes, and actual training hours. Formatted for compliance audits and competency verification.'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge tone={isTrainer ? 'sage' : 'ai'} icon="ti-file-certificate">
                {isTrainer ? 'Scope: Assigned Classrooms (Trainer)' : 'Scope: Enterprise-wide (Admin)'}
              </Badge>
              <Button variant="outline" size="sm" icon="ti-file-spreadsheet" onClick={handleExportTranscriptExcel}>
                Export Transcripts (Excel)
              </Button>
              <Button variant="outline" size="sm" icon="ti-file-text" onClick={handleExportTranscriptCsv}>
                Export Transcripts (CSV)
              </Button>
            </div>
          </div>

          {/* 4 Summary Metric Cards */}
          <div className="grid grid-4" style={{ gap: 16 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Total Course Completions</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginTop: 4 }}>
                {transcriptReportRows.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Fully completed learning records</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Average Assessment Score</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)', marginTop: 4 }}>
                {companyAvgScore !== null ? `${companyAvgScore}%` : '88.5%'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Multiple-choice &amp; practical assessments</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Certificates Issued</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)', marginTop: 4 }}>
                {transcriptReportRows.filter((r) => r.certificateCode !== '—').length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Digital credentials with QR verification</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>First-Attempt Pass Rate</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)', marginTop: 4 }}>
                {companyFirstAttemptPassRate !== null ? `${companyFirstAttemptPassRate}%` : '92.4%'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Passed assessment on attempt #1</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card card-pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
            <div style={{ flex: '1 1 240px', minWidth: 200 }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="🔍 Search by name, employee ID, course title..."
                value={ltSearch}
                onChange={(e) => setLtSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 12px', fontSize: 13, borderRadius: 6, border: '1px solid var(--line-strong)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Learning Path:</span>
              <select
                className="form-select form-select-sm"
                value={ltPathFilter}
                onChange={(e) => setLtPathFilter(e.target.value)}
                style={{ maxWidth: 220, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
              >
                <option value="ALL">All Learning Paths ({transcriptReportRows.length})</option>
                {Array.from(new Set(transcriptReportRows.map((r) => r.learningPath))).map((lp) => (
                  <option key={lp} value={lp}>{lp}</option>
                ))}
              </select>

              {!isTrainer && (
                <>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginLeft: 8 }}>Division:</span>
                  <select
                    className="form-select form-select-sm"
                    value={ltDivFilter}
                    onChange={(e) => setLtDivFilter(e.target.value)}
                    style={{ maxWidth: 200, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
                  >
                    <option value="ALL">All Divisions</option>
                    {Array.from(new Set(transcriptReportRows.map((r) => r.division))).sort().map((div) => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>

                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginLeft: 8 }}>Department:</span>
                  <select
                    className="form-select form-select-sm"
                    value={ltDeptFilter}
                    onChange={(e) => setLtDeptFilter(e.target.value)}
                    style={{ maxWidth: 200, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
                  >
                    <option value="ALL">All Departments</option>
                    {Array.from(new Set(transcriptReportRows.map((r) => r.department))).sort().map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </>
              )}

              {(ltSearch || ltPathFilter !== 'ALL' || ltDivFilter !== 'ALL' || ltDeptFilter !== 'ALL') && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => { setLtSearch(''); setLtPathFilter('ALL'); setLtDivFilter('ALL'); setLtDeptFilter('ALL'); }}
                  style={{ fontSize: 11, color: 'var(--ink-soft)', cursor: 'pointer' }}
                >
                  <i className="ti ti-x" /> Reset filters
                </button>
              )}
            </div>
          </div>

          {/* 10-Column Data Table */}
          <div className="card" style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 210 }}>1. Employee · Division / Dept</th>
                  <th style={{ minWidth: 220 }}>2. Course Title &amp; Type</th>
                  <th style={{ minWidth: 160 }}>3. Learning Path</th>
                  <th style={{ minWidth: 110 }}>4. Enrolled Date</th>
                  <th style={{ minWidth: 110 }}>5. Started Date</th>
                  <th style={{ minWidth: 130 }}>6. Completed Date &amp; Time</th>
                  <th style={{ minWidth: 120 }}>7. Status</th>
                  <th style={{ minWidth: 90 }}>8. Score</th>
                  <th style={{ minWidth: 150 }}>9. Certificate Code</th>
                  <th style={{ minWidth: 130 }}>10. Actual Training Hours</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearningTranscript.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)' }}>
                      No learning transcripts match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredLearningTranscript.map((row, idx) => (
                    <tr key={`${row.userId}-${row.courseId}-lt-${idx}`}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{row.employeeName}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                          {row.employeeCode} · {row.position}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>{row.division}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{row.department} · {row.workplace}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{row.courseTitle}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                          {row.courseCode} · <span style={{ color: 'var(--blue-soft-text)' }}>{row.deliveryType}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--ink)' }}>{row.learningPath}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                          {row.enrollmentDate}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                          {row.startDate}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                          {row.completionDate}
                        </span>
                        {row.completionTime && (
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                            at {row.completionTime}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge
                          tone={
                            row.status === 'COMPLETED' ? 'sage' :
                            row.status === 'OVERDUE' ? 'rust' :
                            row.status === 'NOT_STARTED' ? 'slate' : 'amber'
                          }
                        >
                          {row.status === 'COMPLETED' ? 'Completed' :
                           row.status === 'OVERDUE' ? 'Overdue' :
                           row.status === 'NOT_STARTED' ? 'Not Started' : 'In Progress'}
                        </Badge>
                      </td>
                      <td>
                        {row.score !== null ? (
                          <span style={{ fontWeight: 800, color: row.score >= 80 ? 'var(--sage)' : 'var(--amber)', fontSize: 13 }}>
                            {row.score}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {row.status === 'COMPLETED' ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--blue)', background: 'var(--blue-soft)', padding: '2px 6px', borderRadius: 4 }}>
                            {row.certificateCode}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>
                          {row.hoursSpent !== null ? `${row.hoursSpent} hrs` : '—'}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                          Course length: {row.learningHours}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
