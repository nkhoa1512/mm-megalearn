import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  kirkpatrickROI,
  costTrackingData,
  classroomSessions,
  allUsers,
  enrollmentsForUser,
  deriveCertificates,
} from '../../data/mockData';
import { StatCard, Badge, Button, ProgressBar } from '../../features/common/ui';
import { downloadWorkbook } from '../../lib/exportExcel';
import { downloadDossierPdf } from '../../lib/exportPdf';
import { useCourseStore } from '../../store/CourseStore';
import { normalizeRole, hasCapability } from '../../data/roles';
import LdCommandOverview from './AdminDashboard';
import { PASS_MARK } from '../../utils/managerRules';
import {
  buildComplianceLeague,
  buildCompetencyHeatmap,
  OPERATIONS_COMPETENCIES,
  OFFICE_COMPETENCIES,
} from '../../utils/reportAnalytics';

const VND = new Intl.NumberFormat('vi-VN');
const formatVnd = (n) => `${VND.format(Math.round(Number(n) || 0))} ₫`;

// The single L&D command page: the compliance / governance overview and the five
// strategic reports are tabs of one screen, not two look-alike pages.
export default function AdminReports() {
  const { pathname } = useLocation();
  const {
    currentUser,
    actionPlans,
    users: storeUsers,
    enrollments: storeEnrollments,
    courses,
    costReport,
    certificateTemplates,
  } = useCourseStore();
  const userRole = normalizeRole(currentUser?.role);
  const isTrainer = userRole === 'trainer';
  // BR-RPT-02 — a Trainer has canViewCsat only, never canViewOrgProgress: they
  // manage the CSAT report for their own classes and nothing enterprise-wide.
  // User Admin and System Admin both carry canViewOrgProgress, so they keep the
  // full strategic report (ROI, heatmap, budget, compliance league).
  const canViewOrgWide = hasCapability(userRole, 'canViewOrgProgress');

  // BR-RPT-01 — a Trainer sees only the classes they personally teach; User Admin
  // and System Admin see every trainer's classes, since they own faculty oversight.
  const trainerSessions = isTrainer
    ? classroomSessions.filter(
        (s) => s.trainerId === currentUser?.userId || s.trainerName === currentUser?.fullName
      )
    : classroomSessions;

  const sessionsTaught = trainerSessions.length;
  const learnersTaught = trainerSessions.reduce((a, s) => a + (s.enrolledCount || 0), 0);
  const capacityOffered = trainerSessions.reduce((a, s) => a + (s.maxCapacity || 0), 0);
  const avgCsat = sessionsTaught > 0
    ? Math.round((trainerSessions.reduce((a, s) => a + (s.trainerRating || 0), 0) / sessionsTaught) * 100) / 100
    : null;
  const seatFillRate = capacityOffered > 0 ? Math.round((learnersTaught / capacityOffered) * 1000) / 10 : 0;

  // ---------------------------------------------------------------------
  // BR-RPT-03 — Kirkpatrick L1-L3, computed live from the real HRIS enrollment
  // matrix, classroom ratings and action-plan sign-offs (not hand-authored
  // copy). L4 stays an authored estimate: nothing in this data model ties a
  // completed course to an actual cost-savings or shrinkage figure.
  // ---------------------------------------------------------------------

  // Level 1 — every recorded satisfaction rating company-wide: in-person
  // class ratings plus the L1 CSAT survey score a learner submits after a
  // course (see PostTrainingSurveyModal).
  const csatRatings = [
    ...classroomSessions.map((s) => s.trainerRating).filter((n) => typeof n === 'number'),
    ...(actionPlans || []).map((p) => p.surveyL1Score).filter((n) => typeof n === 'number'),
  ];
  const companyAvgCsat = csatRatings.length > 0
    ? Math.round((csatRatings.reduce((a, b) => a + b, 0) / csatRatings.length) * 100) / 100
    : null;

  // Level 2 — every enrollment record across every employee (the same HRIS
  // matrix the manager and HRBP screens are built from), not one sampled course.
  const roster = storeUsers && storeUsers.length > 0 ? storeUsers : allUsers();
  const enrollmentsByUser = {};
  roster.forEach((u) => { enrollmentsByUser[u.userId] = enrollmentsForUser(u, storeEnrollments); });
  const allEnrollments = [];
  roster.forEach((u) => {
    Object.values(enrollmentsByUser[u.userId]).forEach((e) => allEnrollments.push(e));
  });
  const scoredEnrollments = allEnrollments.filter((e) => typeof e.score === 'number');
  const companyAvgScore = scoredEnrollments.length > 0
    ? Math.round((scoredEnrollments.reduce((a, e) => a + e.score, 0) / scoredEnrollments.length) * 10) / 10
    : null;
  const firstAttemptPasses = scoredEnrollments.filter(
    (e) => (Number(e.attemptsCount) || 0) <= 1 && e.score >= PASS_MARK
  );
  const companyFirstAttemptPassRate = scoredEnrollments.length > 0
    ? Math.round((firstAttemptPasses.length / scoredEnrollments.length) * 1000) / 10
    : null;
  const completedAssessments = allEnrollments.filter(
    (e) => e.status === 'COMPLETED' && typeof e.score === 'number'
  ).length;

  // Level 3 — every action plan's manager sign-off, company-wide (not one
  // manager's team — see BR-MGR-040 for the team-scoped version on the
  // manager's own page).
  const signedOffPlans = (actionPlans || []).filter((p) => p.managerReviewL3);
  const l3SignOffRate = actionPlans && actionPlans.length > 0
    ? Math.round((signedOffPlans.length / actionPlans.length) * 1000) / 10
    : null;
  const companyAvgL3Score = signedOffPlans.length > 0
    ? Math.round((signedOffPlans.reduce((a, p) => a + (p.managerReviewL3.score || 0), 0) / signedOffPlans.length) * 100) / 100
    : null;
  const l3BehaviorHighlights = signedOffPlans
    .map((p) => p.managerReviewL3.behaviorChange)
    .filter(Boolean)
    .slice(0, 2);
  const l3ProductivityHighlights = signedOffPlans
    .map((p) => p.managerReviewL3.productivityGain)
    .filter(Boolean)
    .slice(0, 2);

  // BR-RPT-04 — the compliance league and the competency heatmap are derived
  // from the same roster and enrollment matrix, so a division that finishes its
  // mandatory courses moves up the table on the next render.
  const complianceLeague = buildComplianceLeague(roster, enrollmentsByUser);
  const heatmap = buildCompetencyHeatmap(roster, enrollmentsByUser, courses);

  // BR-RPT-05 — budget figures come from the live cost ledger (the same engine
  // behind the Training Cost Center), never from a number typed into the report.
  const costTotals = costReport?.totals || {};
  const budgetAllocated = costTotals.income || 0;
  const budgetSpent = costTotals.expense || 0;
  const budgetUtilization = costTotals.utilization || 0;
  const costPerLearner = costTotals.costPerLearner || 0;
  const costCentersRanked = (costReport?.byCostCenter || []).filter((c) => c.budget > 0 || c.spent > 0);

  function qualityGrade(rating) {
    if (rating >= 4.9) return 'Outstanding (Gold)';
    if (rating >= 4.85) return 'Very Good';
    return 'Good';
  }

  // Scoping for Trainer vs Admin on Operational Reports (Learning Transcript & Learner Progress)
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

  // Certificate codes must come from the same deriveCertificates() engine the
  // learner's own Certificates page uses (mockData.js) — a locally-invented ID
  // scheme here would show a different certificate number than the one the
  // employee can actually present, for the same completed course. The same pass
  // also keeps each cert's validUntil, so the Progress report can surface a
  // completed-but-expiring-soon course as something still needing action.
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

  // Flattened Operational Dataset for Learning Transcript & Learner Progress Reports
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

        // estimatedHours is the real field authored on the course (e.g. "3h") —
        // durationHours never existed on this data model, so reading it always
        // fell through to a guessed value instead of the declared course length.
        const durationHrs = course?.estimatedHours ? parseFloat(course.estimatedHours) : (course?.modules ? `${course.modules.length * 1.5}` : '2.0');
        const cert = certByUserCourse.get(`${u.userId}::${courseId}`) || null;
        const certCode = cert?.id || '—';

        // A completed course still needs the learner's attention once its
        // certificate is close to (or past) its expiry — the Progress report
        // surfaces that even though the enrollment itself says COMPLETED.
        let recertDaysRemaining = null;
        let needsRecertification = false;
        if (e.status === 'COMPLETED' && cert && !cert.isLifetime && cert.validUntil) {
          try {
            recertDaysRemaining = Math.ceil((new Date(cert.validUntil) - new Date(TODAY_STR)) / (1000 * 60 * 60 * 24));
            needsRecertification = recertDaysRemaining <= RECERT_WARNING_DAYS;
          } catch (_) { /* leave as not-needing-recertification */ }
        }

        rows.push({
          userId: u.userId,
          employeeCode: u.employeeCode || u.userId,
          employeeName: u.fullName,
          position: u.position || u.title || 'Nhân viên chuyên môn',
          // Division (khối) and Department (phòng ban) are reported as two separate
          // levels — collapsing them into one cell hid which division an employee
          // belongs to, which is the level L&D actually reports against.
          division: u.divisionName || u.businessUnitName || 'MM Mega Market',
          department: u.departmentName || u.subDepartmentName || u.divisionName || '—',
          workplace: u.storeName || 'Head Office (An Phu)',
          level: u.level ? `Level ${u.level}` : 'Level 7',
          courseId,
          courseCode: course?.code || courseId,
          courseTitle: course?.title || e.courseTitle || courseId,
          category: course?.category || 'Chuyên môn vận hành',
          learningPath: course?.category || 'Lộ trình chuẩn hóa MMVN',
          deliveryType: course?.deliveryType === 'IN_PERSON_CLASSROOM' ? 'Trực tiếp / Xưởng (ILT)' : 'E-Learning Online',
          enrollmentDate: e.enrolledAt || e.assignedDate || '—',
          startDate: e.status !== 'NOT_STARTED' ? (e.startedAt || '—') : '—',
          completionDate: e.completedAt || '—',
          completionTime: e.completedTime || null,
          status: e.status || 'IN_PROGRESS',
          progressPercent: progress,
          score: typeof e.score === 'number' ? e.score : null,
          certificateCode: certCode,
          // Hours actually spent by this employee, with the course's declared
          // length kept alongside it for comparison.
          hoursSpent: typeof e.hoursSpent === 'number' ? e.hoursSpent : null,
          learningHours: `${durationHrs} giờ`,
          lastActivity: e.lastActivityAt || (e.status === 'NOT_STARTED' ? 'Chưa học' : '2026-08-20'),
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

  // Progress report = anything not yet cleanly finished: not started, in
  // progress, overdue, or a completed course whose certificate is about to
  // (or has already) expired — i.e. what a manager needs to chase right now.
  // Transcript = the permanent record of what an employee has actually
  // completed, kept even after a certificate later expires.
  const progressReportRows = useMemo(
    () => flattenedEnrollmentRows.filter((r) => r.status !== 'COMPLETED' || r.needsRecertification),
    [flattenedEnrollmentRows]
  );
  const transcriptReportRows = useMemo(
    () => flattenedEnrollmentRows.filter((r) => r.status === 'COMPLETED'),
    [flattenedEnrollmentRows]
  );

  const [selectedInspectionPackage, setSelectedInspectionPackage] = useState('HACCP');
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [dossierComplete, setDossierComplete] = useState(false);

  // Filters for Operational Reports
  const [lpSearch, setLpSearch] = useState('');
  const [lpStatusFilter, setLpStatusFilter] = useState('ALL');
  const [lpCourseFilter, setLpCourseFilter] = useState('ALL');
  const [lpDeptFilter, setLpDeptFilter] = useState('ALL');
  const [lpDivFilter, setLpDivFilter] = useState('ALL');

  const [ltSearch, setLtSearch] = useState('');
  const [ltPathFilter, setLtPathFilter] = useState('ALL');
  const [ltDeptFilter, setLtDeptFilter] = useState('ALL');
  const [ltDivFilter, setLtDivFilter] = useState('ALL');

  // Filtered Lists
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

  const openedOnReports = /reports\/?$/.test(pathname);
  const [activeReportTab, setActiveReportTab] = useState(openedOnReports ? 'LEARNER_PROGRESS' : 'OVERVIEW');

  // Derive active tab safely based on user capability
  const effectiveTab = activeReportTab;

  const ALL_REPORT_TABS = [
    { id: 'OVERVIEW', label: 'Command Overview', icon: 'ti-crown' },
    { id: 'LEARNER_PROGRESS', label: '📊 Learner Progress Report (Tiến độ)', icon: 'ti-chart-pie' },
    { id: 'LEARNING_TRANSCRIPT', label: '📜 Learning Transcript (Hồ sơ học tập)', icon: 'ti-certificate' },
    { id: 'TRAINER_CSAT', label: '⭐ Teaching CSAT Rating (Giảng dạy)', icon: 'ti-star' },
    { id: 'ROI_KIRKPATRICK', label: 'Kirkpatrick 4-Level ROI Framework', icon: 'ti-chart-arrows' },
    { id: 'HEATMAP', label: 'Competency Gap Heatmap (Operations vs Head Office)', icon: 'ti-layout-grid' },
    { id: 'COST_BUDGET', label: 'Training Cost Tracking & L&D Budget', icon: 'ti-coin' },
    { id: 'COMPLIANCE_LEAGUE', label: 'Compliance League Table (16 Divisions & Stores)', icon: 'ti-trophy' },
  ];

  // BR-RPT-02 — Trainer sees Overview, Learner Progress, Learning Transcript, and CSAT (all scoped to their classes)
  const visibleReportTabs = canViewOrgWide
    ? ALL_REPORT_TABS
    : ALL_REPORT_TABS.filter((t) => t.id === 'OVERVIEW' || t.id === 'LEARNER_PROGRESS' || t.id === 'LEARNING_TRANSCRIPT' || t.id === 'TRAINER_CSAT');

  const learnerProgressSheetRows = progressReportRows.map((r) => ({
    'Employee Name': r.employeeName,
    'Employee Code': r.employeeCode,
    Division: r.division,
    Department: r.department,
    'Workplace / Store': r.workplace,
    Level: r.level,
    'Course Title': r.courseTitle,
    'Course Code': r.courseCode,
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
  }));

  const learningTranscriptSheetRows = transcriptReportRows.map((r) => ({
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
    // Kept as two separate columns rather than one combined "date + time"
    // string — Excel silently re-detects a combined value as a date-only
    // cell on open and drops the time portion from what's displayed, even
    // though the underlying cell type is declared as text.
    'Completion Date': r.completionDate,
    'Completion Time': r.completionTime || '—',
    Status: r.status,
    Score: r.score !== null ? `${r.score}%` : '—',
    Certificate: r.certificateCode,
    'Hours Spent': r.hoursSpent !== null ? `${r.hoursSpent} h` : '—',
    'Declared Course Length': r.learningHours,
  }));

  const csatSheetRows = trainerSessions.map((s) => ({
    Class: s.title,
    Trainer: s.trainerName,
    'CSAT rating': s.trainerRating,
    'Learners enrolled': s.enrolledCount,
    Capacity: s.maxCapacity,
    'Seat fill %': s.maxCapacity ? Math.round((s.enrolledCount / s.maxCapacity) * 100) : null,
    'Quality rating': qualityGrade(s.trainerRating || 0),
  }));

  const kirkpatrickSheetRows = [
    { Level: 'Level 1 - Reaction (live)', Metric: 'Average CSAT', Value: companyAvgCsat, Basis: `${csatRatings.length} recorded ratings` },
    { Level: 'Level 2 - Learning (live)', Metric: 'Average assessment score', Value: companyAvgScore, Basis: `${completedAssessments} scored completions` },
    { Level: 'Level 2 - Learning (live)', Metric: 'First-attempt pass rate %', Value: companyFirstAttemptPassRate, Basis: `pass mark ${PASS_MARK}` },
    { Level: 'Level 3 - Behavior (live)', Metric: 'Reviews signed off %', Value: l3SignOffRate, Basis: `${signedOffPlans.length} of ${(actionPlans || []).length} action plans` },
    { Level: 'Level 3 - Behavior (live)', Metric: 'Average L3 rating', Value: companyAvgL3Score, Basis: 'manager sign-offs' },
    { Level: 'Level 4 - Financial ROI', Metric: 'Estimated cost savings', Value: kirkpatrickROI.level4.costSavingsEstimated, Basis: 'ILLUSTRATIVE ESTIMATE - not computed from live data' },
    { Level: 'Level 4 - Financial ROI', Metric: 'ROI ratio', Value: kirkpatrickROI.level4.roiRatio, Basis: 'ILLUSTRATIVE ESTIMATE - not computed from live data' },
  ];

  const heatmapSheetRows = [
    ...heatmap.operations.map((r) => {
      const row = { Branch: 'Operations stores', Unit: r.entity, Region: r.area, Headcount: r.headcount };
      OPERATIONS_COMPETENCIES.forEach((c) => { row[c.label] = r[c.key]; });
      row['Average gap %'] = r.gapAvg;
      row['Audit readiness'] = r.auditReady ? 'Audit ready' : 'Training required';
      return row;
    }),
    ...heatmap.supportingOffice.map((r) => {
      const row = { Branch: 'Head office', Unit: r.entity, Region: r.area, Headcount: r.headcount };
      OFFICE_COMPETENCIES.forEach((c) => { row[c.label] = r[c.key]; });
      row['Average gap %'] = r.gapAvg;
      row['Audit readiness'] = r.auditReady ? 'Audit ready' : 'Training required';
      return row;
    }),
  ];

  const costSheetRows = costCentersRanked.map((c) => ({
    'Cost center': c.name,
    Code: c.code,
    Branch: c.branchName || c.branch || '—',
    Headcount: c.headcount,
    'Allocated budget (VND)': c.income,
    'Disbursed (VND)': c.spent,
    'Remaining (VND)': c.remaining,
    Learners: c.learners,
    'Paid enrollments': c.paidEnrollments,
    'Utilization %': c.utilization,
  }));

  const complianceSheetRows = complianceLeague.map((d) => ({
    Rank: d.rank,
    Division: d.name,
    Code: d.code,
    Lead: d.director,
    Headcount: d.headcount,
    'Fully compliant people': d.fullyCompliantCount,
    'In progress': d.inProgressCount,
    Overdue: d.overdueCount,
    'Mandatory courses completed': d.coursesCompleted,
    'Mandatory courses required': d.coursesRequired,
    'Compliance rate %': d.completionRate,
    'Average score': d.avgScore,
    'Inspection status': d.status,
  }));

  /**
   * Export is always scoped to whichever report tab is currently open — no
   * "export everything" bundle. Each tab maps to exactly one sheet/section;
   * the Overview tab is a live dashboard with no row data, so it has none.
   */
  function activeReportExport() {
    switch (effectiveTab) {
      case 'LEARNER_PROGRESS':
        return { fileBase: 'learner-progress-report', sheetName: 'Learner Progress', rows: learnerProgressSheetRows, pdfTitle: 'Learner Progress Report' };
      case 'LEARNING_TRANSCRIPT':
        return { fileBase: 'learning-transcript', sheetName: 'Learning Transcript', rows: learningTranscriptSheetRows, pdfTitle: 'Learning Transcript' };
      case 'TRAINER_CSAT':
        return { fileBase: 'teaching-csat', sheetName: 'Teaching CSAT', rows: csatSheetRows, pdfTitle: 'Teaching CSAT Rating' };
      case 'ROI_KIRKPATRICK':
        return { fileBase: 'kirkpatrick-roi', sheetName: 'Kirkpatrick ROI', rows: kirkpatrickSheetRows, pdfTitle: 'Kirkpatrick 4-Level ROI Framework' };
      case 'HEATMAP':
        return { fileBase: 'competency-heatmap', sheetName: 'Competency Heatmap', rows: heatmapSheetRows, pdfTitle: 'Competency Gap Heatmap' };
      case 'COST_BUDGET':
        return { fileBase: 'training-cost-budget', sheetName: 'Cost & Budget', rows: costSheetRows, pdfTitle: 'Training Cost Tracking & L&D Budget' };
      case 'COMPLIANCE_LEAGUE':
        return { fileBase: 'compliance-league', sheetName: 'Compliance League', rows: complianceSheetRows, pdfTitle: 'Compliance League Table' };
      default:
        return null;
    }
  }

  function handleExportExcel() {
    const cfg = activeReportExport();
    if (!cfg) return;
    setIsExporting(true);
    setTimeout(() => {
      downloadWorkbook(
        `mmvn-${cfg.fileBase}-${new Date().toISOString().slice(0, 10)}.xls`,
        [{ name: cfg.sheetName, rows: cfg.rows }]
      );
      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 3000);
    }, 800);
  }

  function handleExportDossier() {
    const cfg = activeReportExport();
    if (!cfg) return;
    setIsExporting(true);
    setTimeout(() => {
      downloadDossierPdf(
        `mmvn-${cfg.fileBase}-${new Date().toISOString().slice(0, 10)}.pdf`,
        {
          title: `MM Mega Market Vietnam — ${cfg.pdfTitle}`,
          subtitle: isTrainer
            ? `Report for ${currentUser?.fullName || 'Trainer'} — classes personally taught only.`
            : `Company-wide report (${roster.length} employees).`,
          meta: [
            `Exported by: ${currentUser?.fullName || '—'} (${currentUser?.employeeCode || currentUser?.userId || '—'})`,
            `Exported on: ${new Date().toISOString().slice(0, 10)}`,
            `Scope: ${isTrainer ? 'Classes personally taught' : `Company-wide (${roster.length} employees)`}`,
          ],
          sections: [{ name: cfg.sheetName, rows: cfg.rows }],
        }
      );
      setIsExporting(false);
      setDossierComplete(true);
      setTimeout(() => setDossierComplete(false), 3000);
    }, 800);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>
              {isTrainer ? 'My Teaching Command Center' : 'Executive L&D Command & Reports Center'}
            </h1>
            <Badge tone="ai" icon="ti-calculator">
              {isTrainer ? 'Teaching & CSAT' : 'Compliance · Kirkpatrick ROI · Audit'}
            </Badge>
          </div>
          <p>
            {isTrainer
              ? 'Your teaching workload, seat fill and learner satisfaction across the classes you personally teach — other trainers\' classes and the enterprise reports are not shown here.'
              : 'Compliance monitoring and course governance in the overview tab, plus Kirkpatrick ROI, competency heatmaps, L&D budget and signed audit dossiers in the report tabs — one place instead of two look-alike pages.'}
          </p>
        </div>
        {activeReportExport() && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              icon={exportComplete ? 'ti-check' : isExporting ? 'ti-loader ti-spin' : 'ti-file-spreadsheet'}
              onClick={handleExportExcel}
              disabled={isExporting}
            >
              {exportComplete ? 'Excel downloaded!' : `Export Excel — ${activeReportExport().sheetName}`}
            </Button>
            <Button
              variant="primary"
              icon={dossierComplete ? 'ti-check' : isExporting ? 'ti-loader ti-spin' : 'ti-file-certificate'}
              onClick={handleExportDossier}
              disabled={isExporting}
            >
              {dossierComplete
                ? 'PDF downloaded!'
                : isExporting ? 'Generating PDF...' : `Export PDF — ${activeReportExport().sheetName}`}
            </Button>
          </div>
        )}
      </div>

      {/* REPORT SECTION TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {visibleReportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: effectiveTab === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
              color: effectiveTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: effectiveTab === tab.id ? 'var(--rail)' : 'var(--line-strong)',
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

      {/* TAB 0: COMMAND OVERVIEW (the former Executive L&D Command Hub page) */}
      {effectiveTab === 'OVERVIEW' && <LdCommandOverview onOpenReportTab={setActiveReportTab} />}

      {/* TAB: LEARNER PROGRESS REPORT */}
      {effectiveTab === 'LEARNER_PROGRESS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header & Scope Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-chart-pie" style={{ color: 'var(--blue)' }} />
                Báo Cáo Giám Sát Tiến Độ Học Tập (Learner Progress Report)
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                {isTrainer
                  ? 'Theo dõi & giám sát tiến độ học tập của các học viên thuộc các khóa/lớp bạn trực tiếp giảng dạy. Chỉ hiện các khóa đang học, quá hạn, chưa bắt đầu hoặc cần tái cấp chứng chỉ — khóa đã hoàn thành trọn vẹn xem ở tab Hồ Sơ Học Tập.'
                  : `Giám sát tiến độ học tập theo thời gian thực của toàn bộ ${roster.length} nhân sự trên hệ thống. Chỉ hiện các khóa đang học, quá hạn, chưa bắt đầu hoặc cần tái cấp chứng chỉ — khóa đã hoàn thành trọn vẹn xem ở tab Hồ Sơ Học Tập.`}
              </p>
            </div>
            <Badge tone={isTrainer ? 'sage' : 'ai'} icon="ti-shield-check">
              {isTrainer ? 'Phạm vi: Học viên lớp phụ trách' : 'Phạm vi: Toàn hệ thống (Admin)'}
            </Badge>
          </div>

          {/* 4 Summary Metric Cards */}
          <div className="grid grid-4" style={{ gap: 16 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Đang Cần Theo Dõi</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)', marginTop: 4 }}>
                {progressReportRows.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Khóa chưa hoàn thành trọn vẹn</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Đang Học Tích Cực</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)', marginTop: 4 }}>
                {progressReportRows.filter(r => r.status === 'IN_PROGRESS').length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Tiến độ từ 1% đến 99%</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Cần Tái Cấp Chứng Chỉ</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)', marginTop: 4 }}>
                {progressReportRows.filter(r => r.needsRecertification).length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Đã hoàn thành nhưng chứng chỉ sắp/đã hết hạn</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Cảnh Báo Quá Hạn</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)', marginTop: 4 }}>
                {progressReportRows.filter(r => r.status === 'OVERDUE' || (r.status !== 'COMPLETED' && r.daysRemaining < 0)).length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, fontWeight: 600 }}>Cần đôn đốc giục học</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card card-pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
            <div style={{ flex: '1 1 240px', minWidth: 200 }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="🔍 Tìm theo Tên, Mã NV, Tên khóa học..."
                value={lpSearch}
                onChange={(e) => setLpSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 12px', fontSize: 13, borderRadius: 6, border: '1px solid var(--line-strong)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Trạng thái:</span>
              <select
                className="form-select form-select-sm"
                value={lpStatusFilter}
                onChange={(e) => setLpStatusFilter(e.target.value)}
                style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
              >
                <option value="ALL">Tất cả trạng thái ({progressReportRows.length})</option>
                <option value="IN_PROGRESS">Đang học (IN_PROGRESS)</option>
                <option value="OVERDUE">Quá hạn (OVERDUE)</option>
                <option value="COMPLETED">Cần tái cấp chứng chỉ (COMPLETED)</option>
                <option value="NOT_STARTED">Chưa bắt đầu (NOT_STARTED)</option>
              </select>

              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginLeft: 8 }}>Khóa học:</span>
              <select
                className="form-select form-select-sm"
                value={lpCourseFilter}
                onChange={(e) => setLpCourseFilter(e.target.value)}
                style={{ maxWidth: 220, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
              >
                <option value="ALL">Tất cả khóa học</option>
                {Array.from(new Set(progressReportRows.map(r => r.courseId))).map(cid => {
                  const cRow = progressReportRows.find(r => r.courseId === cid);
                  return <option key={cid} value={cid}>{cRow?.courseTitle || cid}</option>;
                })}
              </select>

              {!isTrainer && (
                <>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginLeft: 8 }}>Khối (Division):</span>
                  <select
                    className="form-select form-select-sm"
                    value={lpDivFilter}
                    onChange={(e) => setLpDivFilter(e.target.value)}
                    style={{ maxWidth: 200, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
                  >
                    <option value="ALL">Tất cả khối</option>
                    {Array.from(new Set(progressReportRows.map(r => r.division))).sort().map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>

                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginLeft: 8 }}>Phòng ban:</span>
                  <select
                    className="form-select form-select-sm"
                    value={lpDeptFilter}
                    onChange={(e) => setLpDeptFilter(e.target.value)}
                    style={{ maxWidth: 200, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
                  >
                    <option value="ALL">Tất cả phòng ban</option>
                    {Array.from(new Set(progressReportRows.map(r => r.department))).sort().map(dept => (
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
                  <i className="ti ti-x" /> Đặt lại
                </button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="card" style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Học Viên (Employee)</th>
                  <th style={{ minWidth: 190 }}>Khối (Division) / Phòng Ban</th>
                  <th style={{ minWidth: 240 }}>Khóa Học (Course)</th>
                  <th style={{ minWidth: 160 }}>Tiến Độ (% Progress)</th>
                  <th style={{ minWidth: 120 }}>Trạng Thái (Status)</th>
                  <th style={{ minWidth: 120 }}>Hoạt Động Gần Nhất</th>
                  <th style={{ minWidth: 110 }}>Hạn Chót (Due Date)</th>
                  <th style={{ minWidth: 140 }}>Hạn Còn Lại / Quá Hạn</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearnerProgress.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)' }}>
                      Không tìm thấy học viên hoặc khóa học nào phù hợp với bộ lọc.
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
                            {row.needsRecertification ? 'Cần tái cấp' :
                             row.status === 'OVERDUE' ? 'Quá hạn' :
                             row.status === 'NOT_STARTED' ? 'Chưa học' : 'Đang học'}
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
                                ? `Chứng chỉ hết hạn ${Math.abs(row.recertDaysRemaining)} ngày trước`
                                : `Chứng chỉ hết hạn sau ${row.recertDaysRemaining} ngày`}
                            </span>
                          ) : isOverdue ? (
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--red)', background: 'var(--red-soft)', padding: '2px 8px', borderRadius: 4 }}>
                              Quá hạn {Math.abs(row.daysRemaining)} ngày
                            </span>
                          ) : row.daysRemaining === 0 ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>
                              Hạn hôm nay
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>
                              Còn {row.daysRemaining} ngày
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
      {effectiveTab === 'LEARNING_TRANSCRIPT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header & Scope Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-certificate" style={{ color: 'var(--green)' }} />
                Hồ Sơ Học Tập Tổng Hợp (Learning Transcript)
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                {isTrainer
                  ? 'Hồ sơ đầy đủ các khóa đã hoàn thành trọn vẹn của học viên tham gia các lớp/khóa giảng viên phụ trách — ngày ghi danh, ngày & giờ hoàn thành, điểm số, chứng chỉ và số giờ học thực tế. Khóa đang học/quá hạn xem ở tab Giám Sát Tiến Độ.'
                  : 'Hồ sơ đầy đủ các khóa đã hoàn thành trọn vẹn của nhân sự toàn công ty — ngày ghi danh, ngày & giờ hoàn thành, điểm số, chứng chỉ và số giờ học thực tế. Phục vụ kiểm toán tuân thủ & xác nhận năng lực. Khóa đang học/quá hạn xem ở tab Giám Sát Tiến Độ.'}
              </p>
            </div>
            <Badge tone={isTrainer ? 'sage' : 'ai'} icon="ti-file-certificate">
              {isTrainer ? 'Phạm vi: Học viên lớp phụ trách' : 'Phạm vi: Toàn hệ thống (Admin)'}
            </Badge>
          </div>

          {/* 4 Summary Metric Cards */}
          <div className="grid grid-4" style={{ gap: 16 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Tổng Khóa Đã Hoàn Thành</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginTop: 4 }}>
                {transcriptReportRows.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Lượt học tập đã hoàn thành trọn vẹn</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Điểm Thi Trung Bình</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)', marginTop: 4 }}>
                {companyAvgScore !== null ? `${companyAvgScore}%` : '88.5%'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Điểm sát hạch trắc nghiệm</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Chứng Chỉ Đã Cấp</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)', marginTop: 4 }}>
                {transcriptReportRows.filter(r => r.certificateCode !== '—').length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Chứng chỉ số kèm mã QR</div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Tỷ Lệ Đạt Lần Đầu</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)', marginTop: 4 }}>
                {companyFirstAttemptPassRate !== null ? `${companyFirstAttemptPassRate}%` : '92.4%'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Vượt qua kỳ sát hạch</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card card-pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
            <div style={{ flex: '1 1 240px', minWidth: 200 }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="🔍 Tìm theo Tên nhân viên, Mã NV, Tên khóa..."
                value={ltSearch}
                onChange={(e) => setLtSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 12px', fontSize: 13, borderRadius: 6, border: '1px solid var(--line-strong)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Lộ trình:</span>
              <select
                className="form-select form-select-sm"
                value={ltPathFilter}
                onChange={(e) => setLtPathFilter(e.target.value)}
                style={{ maxWidth: 220, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
              >
                <option value="ALL">Tất cả lộ trình ({transcriptReportRows.length})</option>
                {Array.from(new Set(transcriptReportRows.map(r => r.learningPath))).map(lp => (
                  <option key={lp} value={lp}>{lp}</option>
                ))}
              </select>

              {!isTrainer && (
                <>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginLeft: 8 }}>Khối (Division):</span>
                  <select
                    className="form-select form-select-sm"
                    value={ltDivFilter}
                    onChange={(e) => setLtDivFilter(e.target.value)}
                    style={{ maxWidth: 200, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
                  >
                    <option value="ALL">Tất cả khối</option>
                    {Array.from(new Set(transcriptReportRows.map(r => r.division))).sort().map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>

                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginLeft: 8 }}>Phòng ban:</span>
                  <select
                    className="form-select form-select-sm"
                    value={ltDeptFilter}
                    onChange={(e) => setLtDeptFilter(e.target.value)}
                    style={{ maxWidth: 200, padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line-strong)' }}
                  >
                    <option value="ALL">Tất cả phòng ban</option>
                    {Array.from(new Set(transcriptReportRows.map(r => r.department))).sort().map(dept => (
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
                  <i className="ti ti-x" /> Đặt lại
                </button>
              )}
            </div>
          </div>

          {/* 10-Column Data Table */}
          <div className="card" style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 210 }}>1. Nhân Viên · Khối / Phòng Ban</th>
                  <th style={{ minWidth: 220 }}>2. Khóa Học (Course)</th>
                  <th style={{ minWidth: 160 }}>3. Lộ Trình (Learning Path)</th>
                  <th style={{ minWidth: 110 }}>4. Ngày Ghi Danh</th>
                  <th style={{ minWidth: 110 }}>5. Ngày Bắt Đầu</th>
                  <th style={{ minWidth: 120 }}>6. Ngày &amp; Giờ Hoàn Thành</th>
                  <th style={{ minWidth: 120 }}>7. Trạng Thái (Status)</th>
                  <th style={{ minWidth: 90 }}>8. Điểm Số (Score)</th>
                  <th style={{ minWidth: 150 }}>9. Chứng Chỉ (Certificate)</th>
                  <th style={{ minWidth: 130 }}>10. Số Giờ Học Thực Tế</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearningTranscript.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)' }}>
                      Không tìm thấy hồ sơ học tập nào phù hợp với bộ lọc.
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
                            lúc {row.completionTime}
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
                          {row.status === 'COMPLETED' ? 'Đã hoàn thành' :
                           row.status === 'OVERDUE' ? 'Quá hạn' :
                           row.status === 'NOT_STARTED' ? 'Chưa học' : 'Đang học'}
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
                          {row.hoursSpent !== null ? `${row.hoursSpent} giờ` : '—'}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                          Thời lượng khóa: {row.learningHours}
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

      {/* TAB 1: TRAINER FACULTY CSAT & TEACHING PERFORMANCE */}
      {effectiveTab === 'TRAINER_CSAT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 4 SUMMARY METRIC CARDS */}
          <div className="grid grid-4" style={{ gap: 16 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Average CSAT Score</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)', marginTop: 4 }}>
                {avgCsat !== null ? `★ ${avgCsat} / 5.0` : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                {isTrainer ? 'Across the classes you teach' : `Across ${sessionsTaught} classes, every trainer`}
              </div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Sessions Delivered</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--sage)', marginTop: 4 }}>{sessionsTaught}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                {isTrainer ? 'Sessions you have led' : 'Sessions across all trainers'}
              </div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Total Learners Trained</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)', marginTop: 4 }}>{learnersTaught}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                Enrolled across those sessions
              </div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Seat Fill Rate</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--rail)', marginTop: 4 }}>{seatFillRate}%</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                Enrolled vs. capacity offered
              </div>
            </div>
          </div>

          {/* 4 PEDAGOGICAL PILLARS */}
          <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', marginBottom: 16 }}>
              <i className="ti ti-chart-radar" style={{ marginRight: 6, color: 'var(--rail)' }} />
              Detailed Ratings Across 4 Teaching &amp; Training Quality Criteria
            </div>
            <div className="grid grid-2" style={{ gap: 16 }}>
              <div style={{ background: 'var(--paper-sunken)', padding: 14, borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>1. Practical applicability at the store counter</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--amber)' }}>4.90 ★</span>
                </div>
                <ProgressBar value={98} tone="amber" size="sm" />
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
                  98% of learners applied it directly on their shift the very next day.
                </div>
              </div>

              <div style={{ background: 'var(--paper-sunken)', padding: 14, borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>2. The trainer's demonstration &amp; interaction skills</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--sage)' }}>4.92 ★</span>
                </div>
                <ProgressBar value={98.4} tone="sage" size="sm" />
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
                  The teaching method was very visual, questions were answered thoroughly and with energy.
                </div>
              </div>

              <div style={{ background: 'var(--paper-sunken)', padding: 14, borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>3. Syllabus, slides &amp; attached SOP forms</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue)' }}>4.82 ★</span>
                </div>
                <ProgressBar value={96.4} tone="blue" size="sm" />
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
                  The materials were clear and standardized to the MM Mega Market chain's operating procedures.
                </div>
              </div>

              <div style={{ background: 'var(--paper-sunken)', padding: 14, borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>4. Lab facilities &amp; practice safety</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--rail)' }}>4.86 ★</span>
                </div>
                <ProgressBar value={97.2} tone="rail" size="sm" />
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
                  The ovens, POS terminals and practice equipment were complete and perfectly safe.
                </div>
              </div>
            </div>
          </div>

          {/* CLASS CSAT BREAKDOWN TABLE */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Practical / Online Course</th>
                  {!isTrainer && <th>Trainer</th>}
                  <th>Learners Enrolled</th>
                  <th>CSAT Rating Score</th>
                  <th>Seat Fill Rate</th>
                  <th>Quality Rating</th>
                </tr>
              </thead>
              <tbody>
                {trainerSessions.length === 0 ? (
                  <tr>
                    <td colSpan={isTrainer ? 4 : 5} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-soft)' }}>
                      {isTrainer ? 'You are not leading any classroom sessions yet.' : 'No classroom sessions recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  trainerSessions.map((s) => {
                    const grade = qualityGrade(s.trainerRating || 0);
                    const fillPct = s.maxCapacity ? Math.round((s.enrolledCount / s.maxCapacity) * 100) : null;
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{s.venue || 'In-person training at the MMVN store workshop'}</div>
                        </td>
                        {!isTrainer && (
                          <td style={{ fontSize: 13, color: 'var(--ink)' }}>{s.trainerName}</td>
                        )}
                        <td><Badge tone="blue">{s.enrolledCount} Learner</Badge></td>
                        <td>
                          <span style={{ fontWeight: 800, color: 'var(--amber)', fontSize: 14 }}>★ {s.trainerRating}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--sage)' }}>{fillPct !== null ? `${fillPct}%` : '—'}</span>
                        </td>
                        <td>
                          <Badge tone={grade.includes('Outstanding') ? 'sage' : 'rail'}>
                            {grade}
                          </Badge>
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

      {/* TAB 1: KIRKPATRICK 4-LEVEL ROI */}
      {effectiveTab === 'ROI_KIRKPATRICK' && (
        <>
          <div className="section-label">Enterprise Training Impact Framework &middot; Kirkpatrick 4-Level Architecture</div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '-8px 0 16px', maxWidth: 900 }}>
            Levels 1-3 below are computed live from the same enrollment matrix, classroom ratings and action-plan
            sign-offs used elsewhere in the app. Level 4 is shown separately because no cost-savings or shrinkage
            figure exists anywhere in this data model to compute it from — it is an authored illustrative estimate,
            not a live number.
          </p>
          <div className="grid grid-2" style={{ marginBottom: 28, gap: 16 }}>
            {/* Level 1 */}
            <div className="card card-pad" style={{ borderLeft: '4px solid #3B82F6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#1D4ED8', textTransform: 'uppercase' }}>
                  Level 1: Learner Reaction &amp; CSAT Satisfaction
                </span>
                <Badge tone="sage" icon="ti-bolt">Live data</Badge>
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Average CSAT Rating</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                    {companyAvgCsat !== null ? `★ ${companyAvgCsat} / 5.0` : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Ratings Counted</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sage)' }}>{csatRatings.length}</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                From every classroom session rating plus every learner's post-course L1 survey score recorded so far.
              </p>
            </div>

            {/* Level 2 */}
            <div className="card card-pad" style={{ borderLeft: '4px solid #009E49' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#006830', textTransform: 'uppercase' }}>
                  Level 2: Knowledge Retention &amp; Assessment Mastery
                </span>
                <Badge tone="sage" icon="ti-bolt">Live data</Badge>
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Average Assessment Score</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sage)' }}>
                    {companyAvgScore !== null ? `${companyAvgScore}%` : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>First-Attempt Pass Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                    {companyFirstAttemptPassRate !== null ? `${companyFirstAttemptPassRate}%` : '—'}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                From {completedAssessments.toLocaleString()} completed, scored enrollments across the full employee
                roster — the same HRIS enrollment matrix the manager and HRBP screens read from, not one sampled course.
              </p>
            </div>

            {/* Level 3 */}
            <div className="card card-pad" style={{ borderLeft: '4px solid #F59E0B' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--amber-soft-text)', textTransform: 'uppercase' }}>
                  Level 3: 3-6 Month Behavioral Change on the Floor
                </span>
                <Badge tone="sage" icon="ti-bolt">Live data</Badge>
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Reviews Signed Off</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                    {signedOffPlans.length} of {(actionPlans || []).length}
                    {l3SignOffRate !== null && ` (${l3SignOffRate}%)`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Average L3 Rating</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--amber)' }}>
                    {companyAvgL3Score !== null ? `★ ${companyAvgL3Score} / 5.0` : '—'}
                  </div>
                </div>
              </div>
              {(l3BehaviorHighlights.length > 0 || l3ProductivityHighlights.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[...l3BehaviorHighlights, ...l3ProductivityHighlights].map((line, i) => (
                    <div key={i} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>&bull; {line}</div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0 }}>
                  No manager has signed off a behavioral review yet.
                </p>
              )}
            </div>

            {/* Level 4 */}
            <div className="card card-pad" style={{ borderLeft: '4px solid #005BAA', background: 'linear-gradient(135deg, #F0F7FF 0%, #E6F0FA 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#003E73', textTransform: 'uppercase' }}>
                  Level 4: Financial Business Results &amp; ROI
                </span>
                <Badge tone="amber" icon="ti-flask">Illustrative estimate</Badge>
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Estimated Cost Savings</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)' }}>{kirkpatrickROI.level4.costSavingsEstimated}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Fresh Spoilage Reduction</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sage)' }}>{kirkpatrickROI.level4.spoilageReduction}</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                {kirkpatrickROI.level4.summary} No cost-savings or shrinkage dataset exists in this system yet to
                compute this figure from — treat it as a directional planning estimate, not a measured result.
              </p>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: DUAL-HIERARCHY COMPETENCY GAP HEATMAP */}
      {effectiveTab === 'HEATMAP' && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 16px', maxWidth: 950 }}>
            Each cell is the average attainment of that unit's employees on the courses in that competency
            category — a recorded score where one exists, otherwise course progress — read straight from the
            enrollment matrix. A blank cell means nobody in that unit has been enrolled on that category yet,
            which is an allocation gap rather than a low score.
          </p>

          {/* Operations Heatmap */}
          <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>1. Store Operations Branch ({heatmap.operations.length} units)</span>
            <Badge tone="sage" icon="ti-bolt">Live data</Badge>
          </div>
          <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 220 }}>Store / Division</th>
                  <th>Headcount</th>
                  {OPERATIONS_COMPETENCIES.map((c) => <th key={c.key}>{c.label}</th>)}
                  <th>Average Gap</th>
                  <th>Audit Readiness</th>
                </tr>
              </thead>
              <tbody>
                {heatmap.operations.length === 0 ? (
                  <tr><td colSpan={OPERATIONS_COMPETENCIES.length + 4} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-soft)' }}>No operations units on the roster.</td></tr>
                ) : heatmap.operations.map((st) => (
                  <tr key={st.entity}>
                    <td><strong>{st.entity}</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{st.headcount}</td>
                    {OPERATIONS_COMPETENCIES.map((c) => <td key={c.key}><HeatCell val={st[c.key]} /></td>)}
                    <td>
                      <strong style={{ color: st.gapAvg === null ? 'var(--ink-faint)' : st.gapAvg <= 10 ? 'var(--sage)' : 'var(--amber)' }}>
                        {st.gapAvg === null ? '—' : `${st.gapAvg}%`}
                      </strong>
                    </td>
                    <td>
                      <Badge tone={st.auditReady ? 'sage' : 'amber'}>
                        {st.auditReady ? 'Audit Ready' : 'Training Required'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Supporting Office Heatmap */}
          <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>2. Head Office Supporting Functions ({heatmap.supportingOffice.length} divisions)</span>
            <Badge tone="sage" icon="ti-bolt">Live data</Badge>
          </div>
          <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 240 }}>Corporate Division</th>
                  <th>Headcount</th>
                  {OFFICE_COMPETENCIES.map((c) => <th key={c.key}>{c.label}</th>)}
                  <th>Average Gap</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {heatmap.supportingOffice.length === 0 ? (
                  <tr><td colSpan={OFFICE_COMPETENCIES.length + 4} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-soft)' }}>No head-office divisions on the roster.</td></tr>
                ) : heatmap.supportingOffice.map((ho) => (
                  <tr key={ho.entity}>
                    <td><strong>{ho.entity}</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{ho.headcount}</td>
                    {OFFICE_COMPETENCIES.map((c) => <td key={c.key}><HeatCell val={ho[c.key]} /></td>)}
                    <td>
                      <strong style={{ color: ho.gapAvg === null ? 'var(--ink-faint)' : ho.gapAvg <= 10 ? 'var(--sage)' : 'var(--rail)' }}>
                        {ho.gapAvg === null ? '—' : `${ho.gapAvg}%`}
                      </strong>
                    </td>
                    <td>
                      <Badge tone={ho.auditReady ? 'sage' : 'amber'}>
                        {ho.auditReady ? 'Audit Ready' : 'Training Required'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COST TRACKING & L&D TRAINING BUDGET */}
      {effectiveTab === 'COST_BUDGET' && (
        <div style={{ marginBottom: 28 }}>
          <div className="grid grid-4" style={{ gap: 14, marginBottom: 20 }}>
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Allocated L&amp;D Budget</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginTop: 4 }}>{formatVnd(budgetAllocated)}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>Across {costCentersRanked.length} cost centers</div>
            </div>
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Disbursed to date</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)', marginTop: 4 }}>{formatVnd(budgetSpent)}</div>
              <div style={{ fontSize: 11, color: 'var(--sage)', fontWeight: 600, marginTop: 2 }}>{budgetUtilization}% utilization</div>
            </div>
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Average Cost / Learner</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)', marginTop: 4 }}>{formatVnd(costPerLearner)}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{costTotals.distinctLearners || 0} charged learners</div>
            </div>
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Paid enrollments</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)', marginTop: 4 }}>{costTotals.paidEnrollments || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                of {costTotals.totalEnrollments || 0} charged transactions
              </div>
            </div>
          </div>

          {/* Cost Center Table — live ledger */}
          <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Cost Center &amp; Budget Allocation Breakdown</span>
            <Badge tone="sage" icon="ti-bolt">Live ledger</Badge>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 12px', maxWidth: 900 }}>
            Every figure here is summed from the training cost ledger — the same engine behind the Training Cost
            Center — so an approval that charges a course to a department moves these numbers immediately.
          </p>
          <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Cost Center</th>
                  <th>Branch</th>
                  <th>Allocated Budget (VND)</th>
                  <th>Disbursed (VND)</th>
                  <th>Charged Learners</th>
                  <th>Budget Utilization</th>
                </tr>
              </thead>
              <tbody>
                {costCentersRanked.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-soft)' }}>
                    No cost center has a budget or any spend recorded yet.
                  </td></tr>
                ) : costCentersRanked.map((c) => (
                  <tr key={c.id || c.code}>
                    <td>
                      <strong>{c.name}</strong>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{c.code}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.branchName || c.branch || '—'}</td>
                    <td>{formatVnd(c.income)}</td>
                    <td><strong>{formatVnd(c.spent)}</strong></td>
                    <td>{c.learners}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={c.utilization} tone={c.utilization > 90 ? 'rust' : 'rail'} size="sm" />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{c.utilization}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* External Platform Subscriptions */}
          <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>External Platform Enterprise License Subscriptions</span>
            <Badge tone="slate" icon="ti-file-text">Contract data</Badge>
          </div>
          <div className="grid grid-3" style={{ gap: 14 }}>
            {costTrackingData.externalPlatformLicenses.map((lic, i) => (
              <div key={i} className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{lic.platform}</span>
                  <Badge tone="blue">{lic.utilizationRate} Active</Badge>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                  {lic.costAnnual.toLocaleString()} ₫ / yr
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {lic.licenses} Enterprise seats &middot; {lic.activeLearners} active trainees
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: COMPLIANCE LEAGUE TABLE */}
      {effectiveTab === 'COMPLIANCE_LEAGUE' && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Enterprise Mandatory Compliance League Table ({complianceLeague.length} divisions)</span>
            <Badge tone="sage" icon="ti-bolt">Live data</Badge>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 12px', maxWidth: 900 }}>
            <strong>Compliance rate</strong> is mandatory course assignments completed — the measure that ranks this
            table. <strong>Fully compliant</strong> counts people who have finished all three mandatory courses,
            which is the stricter measure an audit applies; a course never assigned counts against the employee.
            The lead shown is the most senior employee on that division's roster.
          </p>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Rank</th>
                  <th>Operating Division / Unit</th>
                  <th>Headcount</th>
                  <th>Fully Compliant</th>
                  <th>In Progress</th>
                  <th>Overdue</th>
                  <th style={{ minWidth: 140 }}>Compliance Rate</th>
                  <th>Avg Score</th>
                  <th>Inspection Status</th>
                </tr>
              </thead>
              <tbody>
                {complianceLeague.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-soft)' }}>
                    No active employees on the roster.
                  </td></tr>
                ) : complianceLeague.map((div) => (
                  <tr key={div.code}>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: 13, color: div.rank <= 3 ? 'var(--amber)' : 'var(--ink-faint)' }}>
                        #{div.rank}
                      </span>
                    </td>
                    <td>
                      <strong>{div.name}</strong> ({div.code})
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Division lead: {div.director}</div>
                    </td>
                    <td>{div.headcount}</td>
                    <td><strong style={{ color: div.fullyCompliantCount > 0 ? 'var(--sage)' : 'var(--ink-faint)' }}>{div.fullyCompliantCount}</strong></td>
                    <td>{div.inProgressCount}</td>
                    <td>
                      <span style={{ color: div.overdueCount > 0 ? 'var(--rust)' : 'var(--ink-faint)', fontWeight: div.overdueCount > 0 ? 700 : 400 }}>
                        {div.overdueCount}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={div.completionRate} tone={div.completionRate >= 90 ? 'sage' : div.completionRate >= 75 ? 'amber' : 'rust'} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{div.completionRate}%</span>
                      </div>
                    </td>
                    <td>{div.avgScore === null ? <span style={{ color: 'var(--ink-faint)' }}>—</span> : `${div.avgScore}%`}</td>
                    <td>
                      <Badge tone={div.status === 'AUDIT_READY' ? 'sage' : div.status === 'NEEDS_ATTENTION' ? 'amber' : 'rust'}>
                        {div.status === 'AUDIT_READY' ? 'Audit Ready' : div.status === 'NEEDS_ATTENTION' ? 'Needs Attention' : 'At Risk'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function HeatCell({ val }) {
  // Never trained on this category is not the same finding as scored badly.
  if (val === null || val === undefined) {
    return <span style={{ color: 'var(--ink-faint)', fontSize: 12 }} title="No enrollments in this category yet">—</span>;
  }
  const bg = val >= 92 ? '#DCFCE7' : val >= 82 ? '#FEF3C7' : '#FEE2E2';
  const color = val >= 92 ? '#166534' : val >= 82 ? '#92400E' : '#991B1B';
  return (
    <span style={{ background: bg, color, padding: '3px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>
      {val}%
    </span>
  );
}
