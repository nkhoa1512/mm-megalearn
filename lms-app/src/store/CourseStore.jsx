import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  courses as initialCourses,
  classroomSessions as initialClassrooms,
  pendingApprovalRequests as initialApprovals,
  gamificationData as initialGamification,
  actionPlans as initialActionPlans,
  demoUsers,
  allUsers,
  currentUser as defaultUser,
  userAdminUser,
  myLearningCourses,
  enrollmentsForUser,
  nextMajorVersion,
  businessUnits as initialBusinessUnits,
  divisions as initialDivisions,
  departments as initialDepartments,
  subDepartments as initialSubDepartments,
  jobLevels as initialJobLevels,
  curricula as initialCurricula,
  userEnrollmentsMap,
} from '../data/mockData';
import { checkCourseAccessRule, ACCESS_STATE, normalizeLevel, evaluateUserEligibilityForCourse } from '../data/levelSystem';
import { normalizeRole, hasCapability } from '../data/roles';
import { SCOPE_ROADMAP_MATRIX, computeUserRoadmapTabs } from '../data/levelRoadmapMatrix';
import { publishRoadmapScope } from '../data/roadmapScopeMatrix';
import { translate, translateDomain, translateStatus, translateDelivery, getLocalizedCourse } from '../data/i18n';
import {
  DEFAULT_COMPANY_CATEGORIES,
  DEFAULT_CATEGORY_OBJECTS,
  normalizeCategory,
  getCategoryMetadata,
  generateCategoryCode,
  courseMatchesCategory,
} from '../utils/courseCatalog';
import { INITIAL_ASSESSMENTS, QUESTION_BANK, INITIAL_ASSESSMENT_ATTEMPTS } from '../data/assessmentData';
import { DEFAULT_CUSTOM_GROUPS, DEFAULT_GROUP_CATEGORIES, groupCategoryId, resolveGroupMembers, isUserInCustomGroup } from '../data/customGroupsData';
import {
  buildCostCenters,
  buildEnrollmentTransaction,
  seedOpeningLedger,
  summarizeLedger,
  pricingOf,
  CURRENCY,
  TXN_TYPE,
  TXN_SOURCE,
} from '../utils/costCenter';
import { DEFAULT_CERTIFICATE_TEMPLATES } from '../data/certificateTemplatesData';
import { getAssignedCurriculaForUser } from '../utils/curriculumAssignment';

// v6: the inverted 7-level scale + the 6-role model. The key is bumped to drop the old v5 cache
// (the previous build's `admin` role and levels 1-5 are no longer valid).
const AUTH_KEY = 'mm-megalearn-auth-v6';
const STORAGE_KEY = 'mm-megalearn-courses-v11';
const CLASSROOM_KEY = 'mm-megalearn-classrooms-v11';
const APPROVAL_KEY = 'mm-megalearn-approvals-v6';
const GAMIFICATION_KEY = 'mm-megalearn-gamification-v6';
const ACTION_PLAN_KEY = 'mm-megalearn-actionplans-v6';
const ENROLLMENT_KEY = 'mm-megalearn-enrollments-v6';
const USERS_KEY = 'mm-megalearn-users-v7';
// v7: roadmap configuration moves from a flat Level x Branch matrix to a multi-tier
// Scope Key (BU -> Division -> Department -> Sub-Department x Level). The key is bumped
// so the old shape is never loaded from localStorage.
const ROADMAP_KEY = 'mm-megalearn-roadmaps-v7';
// Curriculum (Curriculum -> Courses -> Modules -> Lessons) and the company area
// company areas (Category) managed by the System Admin — two new domains that never
// existed before this 5-section catalog build.
const CURRICULUM_KEY = 'mm-megalearn-curriculum-v2';
// Library (Library -> Area/Domain -> Courses): the admin creates the Library, adds
// the areas (each bound to an existing Category) and then assign courses manually
// to each area for easy lookup — unlike a Curriculum, it is only a view
// a reference/lookup view for User Admin & System Admin, with no allocation/enrollment.
const LIBRARY_KEY = 'mm-megalearn-libraries-v1';

// Sample data for the first few Libraries (demo/first-run) — pre-grouping the seed
// seed courses from mockData.js into the area matching their Category, so the
// Library is not empty the first time a User Admin/SysAdmin opens it. A domain with
// no matching course is skipped (no pointless empty area is created).
function buildSeedLibraries(allCourses) {
  function domainFor(category, limit = 8) {
    const courseIds = allCourses.filter((c) => courseMatchesCategory(c, category)).slice(0, limit).map((c) => c.id);
    return { id: `DOM-SEED-${category.replace(/[^a-zA-Z0-9]/g, '')}`, category, courseIds };
  }
  const seedDate = '2026-01-05';
  return [
    {
      id: 'LIB-SEED-HARDSKILL',
      name: 'Operations Hard Skills Library',
      description: 'Groups professional operations courses by store and warehouse operating area.',
      domains: [
        domainFor('Food Safety & Hygiene'),
        domainFor('Cold Chain'),
        domainFor('Store Operations'),
        domainFor('Loss Prevention & QA'),
        domainFor('Fresh Food Practice'),
      ],
      createdBy: userAdminUser.userId,
      createdAt: seedDate,
      updatedAt: seedDate,
    },
    {
      id: 'LIB-SEED-LEADERSHIP',
      name: 'Soft Skills & Management Library',
      description: 'Leadership, customer service and ethical compliance courses for management.',
      domains: [
        domainFor('Leadership & Management'),
        domainFor('Customer Service'),
        domainFor('Compliance & Ethics'),
        domainFor('Corporate Governance'),
      ],
      createdBy: userAdminUser.userId,
      createdAt: seedDate,
      updatedAt: seedDate,
    },
    {
      id: 'LIB-SEED-DIGITAL',
      name: 'Digital Transformation & Supply Chain Library',
      description: 'Courses on information security, e-commerce, finance and supply chain.',
      domains: [
        domainFor('Information Security'),
        domainFor('Digital & E-Commerce'),
        domainFor('Supply Chain & Logistics'),
        domainFor('Finance & Accounting'),
      ],
      createdBy: userAdminUser.userId,
      createdAt: seedDate,
      updatedAt: seedDate,
    },
  ].map((lib) => ({ ...lib, domains: lib.domains.filter((d) => d.courseIds.length > 0) }))
    .filter((lib) => lib.domains.length > 0);
}
const CATEGORY_KEY = 'mm-megalearn-categories-v1';
// Certificate Template: a template library the admin manages up front; the Course
// Builder & Curriculum Editor only attach a certificateTemplateId referencing
// here (no data copying) — an attached file only stores metadata (name/size),
// is not used for rendering; the remaining fields (signerName/signerTitle/issuerOrg)
// genuinely replaces the default content on the CertificateModal.
const CERT_TEMPLATE_KEY = 'mm-megalearn-cert-templates-v4';
const ASSESSMENT_KEY = 'mm-megalearn-assessments-v1';
const QUESTION_BANK_KEY = 'mm-megalearn-questionbanks-v1';
const ATTEMPT_KEY = 'mm-megalearn-assessment-attempts-v1';
const INTERVENTION_KEY = 'mm-megalearn-interventions-v2';
const SUCCESSION_KEY = 'mm-megalearn-succession-v2';
const ALIGNMENT_KEY = 'mm-megalearn-alignment-v1';
const COMPLIANCE_NUDGES_KEY = 'mm-megalearn-nudges-v2';
const BU_KEY = 'mm-megalearn-bu-v3';
const DIV_KEY = 'mm-megalearn-div-v4';
const DEPT_KEY = 'mm-megalearn-dept-v4';
const SUBDEPT_KEY = 'mm-megalearn-subdept-v3';
const JOBLEVELS_KEY = 'mm-megalearn-joblevels-v4';
const GROUP_KEY = 'mm-megalearn-groups-v1';
const GROUP_CATEGORY_KEY = 'mm-megalearn-group-categories-v1';
// Cost Center: stores only the entries CREATED in this session. The opening ledger (annual
// budget + historical HRIS enrollments) is re-derived at every start-up from static
// data — the same overlay model as `enrollments`, avoiding stuffing thousands of
// transaction rows into the localStorage quota.
const COST_LEDGER_KEY = 'mm-megalearn-cost-ledger-v1';
const THEME_KEY = 'mm-megalearn-theme';
const LANG_KEY = 'mm-megalearn-lang';

export const DEFAULT_INTERVENTIONS = [
  {
    id: 'ITV-2026-001',
    unit: 'Bakery & Fresh Food Counter (MM An Phu)',
    departmentCode: 'PPF',
    skill: 'HACCP & Cold-Chain Storage Protocols',
    courseId: 'CRS-FSH-001',
    courseTitle: 'Food Safety & Hygiene Standards (HACCP)',
    urgency: 'HIGH',
    impact: 'Bakery counter shrinkage rose 3.2% in July. A hands-on class on standardizing the process is needed.',
    requestedBy: 'Le Thi Mai (HRBP)',
    requesterRole: 'hrbp',
    requestedAt: '2026-08-20',
    status: 'PENDING_REVIEW', // PENDING_REVIEW | SCHEDULED | COMPLETED | CANCELLED
    scheduledDate: null,
    trainerName: 'Nguyen Van Hung (Master Trainer)',
  },
  {
    id: 'ITV-2026-002',
    unit: 'Cashier & Customer Service Department (MM Binh Phu)',
    departmentCode: 'FE',
    skill: 'Cash Handling, POS Speed & Shrinkage Control',
    courseId: 'CRS-CSERV-087',
    courseTitle: 'Service Mindset & Cashier POS Fast Operation',
    urgency: 'MEDIUM',
    impact: 'Average checkout time rose by 15s per transaction during peak hours.',
    requestedBy: 'Le Thi Mai (HRBP)',
    requesterRole: 'hrbp',
    requestedAt: '2026-08-22',
    status: 'SCHEDULED',
    scheduledDate: '2026-09-05',
    trainerName: 'Le Hoang Nam',
  },
];

export const DEFAULT_SUCCESSION_TALENTS = [
  {
    id: 'MMVN-2041',
    userId: 'USR-2041',
    name: 'Trần Quốc Bảo',
    currentRole: 'Fresh Counter Manager',
    store: 'MM An Phu',
    storeId: 'store-an-phu',
    targetRole: 'Deputy Store General Manager (Deputy SGM)',
    readiness: 'READY_NOW',
    readinessLabel: 'Ready Now',
    progress702010: 88,
    ojt70: 90,
    mentoring20: 85,
    formal10: 90,
    mentor: 'Trần Minh Quang (SGM)',
    curriculumId: 'CUR-LEAD-TRACK',
  },
  {
    id: 'MMVN-1042',
    userId: 'USR-1042',
    name: 'Minh Tran',
    currentRole: 'Front-Line Bakery Executive',
    store: 'MM An Phu',
    storeId: 'store-an-phu',
    targetRole: 'Bakery & Processed Food Department Head',
    readiness: 'READY_IN_6_MONTHS',
    readinessLabel: 'Ready In 6 Months',
    progress702010: 76,
    ojt70: 80,
    mentoring20: 75,
    formal10: 70,
    mentor: 'Nguyễn Văn Hùng (Master Trainer)',
    curriculumId: 'CUR-FSH-FOUNDATIONS',
  },
  {
    id: 'MMVN-1078',
    userId: 'USR-1078',
    name: 'Sarah Johnson',
    currentRole: 'Pastry Chef Associate',
    store: 'MM An Phu',
    storeId: 'store-an-phu',
    targetRole: 'Fresh Bakery Technical Team Leader',
    readiness: 'READY_1_YEAR',
    readinessLabel: 'Ready In 1 Year',
    progress702010: 72,
    ojt70: 75,
    mentoring20: 70,
    formal10: 70,
    mentor: 'Nguyễn Văn Hùng (Master Trainer)',
    curriculumId: null,
  },
  {
    id: 'MMVN-0312',
    userId: 'USR-0312',
    name: 'Lê Hoàng Nam',
    currentRole: 'Cashier Service Shift Leader',
    store: 'MM Binh Phu',
    storeId: 'store-binh-phu',
    targetRole: 'Head of Customer Service',
    readiness: 'READY_NOW',
    readinessLabel: 'Ready Now',
    progress702010: 92,
    ojt70: 95,
    mentoring20: 90,
    formal10: 90,
    mentor: 'Đặng Thanh Mai (HRBP)',
    curriculumId: 'CUR-LEAD-TRACK',
  },
  {
    id: 'MMVN-4055',
    userId: 'USR-4055',
    name: 'Phạm Thị Thảo',
    currentRole: 'Shrinkage Control Supervisor (QA)',
    store: 'MM Thang Long',
    storeId: 'store-thang-long',
    targetRole: 'Northern Region QA & Food Safety Department Head',
    readiness: 'READY_NOW',
    readinessLabel: 'Ready Now',
    progress702010: 85,
    ojt70: 85,
    mentoring20: 85,
    formal10: 85,
    mentor: 'Vũ Đức Thành (HSE Director)',
    curriculumId: 'CUR-FSH-FOUNDATIONS',
  },
];

export const DEFAULT_ALIGNMENTS = [
  {
    id: 'aln-001',
    candidateId: 'MMVN-1042',
    candidateName: 'Minh Tran',
    targetRole: 'Bakery & Processed Food Department Head',
    mentorName: 'Trần Minh Quang (SGM)',
    managerName: 'David Tran',
    ojt70Progress: 80,
    mentoring20Progress: 75,
    course10Progress: 70,
    readiness: 'READY_IN_6_MONTHS',
    notes: 'The candidate has mastered artisan baking technique and is coaching 2 new staff. Needs another 10 hours of night-shift management practice.',
    updatedAt: '2026-08-25',
  },
];

const CourseStoreContext = createContext(null);

function loadItem(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return fallback;
}

// The sign-in profile stored in localStorage may still carry an old role/level or be missing subDepartment.
function hydrateUser(user) {
  if (!user) return null;
  const canonical = typeof allUsers === 'function' ? allUsers().find((u) => u.userId === user.userId || u.employeeCode === user.employeeCode) : null;
  return {
    ...canonical,
    ...user,
    role: normalizeRole(user.role || canonical?.role),
    level: normalizeLevel(user.level || canonical?.level),
    subDepartmentId: user.subDepartmentId || canonical?.subDepartmentId || null,
    subDepartmentCode: user.subDepartmentCode || canonical?.subDepartmentCode || null,
    subDepartmentName: user.subDepartmentName || canonical?.subDepartmentName || null,
    departmentName: user.departmentName || canonical?.departmentName || null,
    departmentId: user.departmentId || canonical?.departmentId || null,
  };
}

function hydrateCourses(courseList) {
  if (!Array.isArray(courseList)) return courseList;
  const TEACHING_POOL = [
    { id: 'USR-9003', name: 'Nguyễn Văn Hùng', role: 'trainer', title: 'Master Trainer (L&OD)' },
    { id: 'USR-9005', name: 'Vũ Đức Thành', role: 'trainer', title: 'Loss Prevention & HSE Director' },
    { id: 'USR-9006', name: 'Trần Minh Quang', role: 'trainer', title: 'Senior SGM & Mentor' },
    { id: 'USR-9002', name: 'Phạm Thanh Thảo', role: 'useradmin', title: 'HR Master Data & User Admin' },
    { id: 'USR-9004', name: 'Lê Thị Mai', role: 'hrbp', title: 'HR Business Partner Lead' },
    { id: 'USR-9001', name: 'Trần Hoàng Long', role: 'sysadmin', title: 'Lead IT Systems Administrator' },
  ];

  return courseList.map((c, idx) => {
    if (c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB') {
      const lead = TEACHING_POOL[idx % TEACHING_POOL.length];
      const trainerId = c.trainerId || lead.id;
      const trainerName = c.trainerName || c.instructor || lead.name;

      let coTrainers = c.coTrainers && c.coTrainers.length > 0 ? c.coTrainers : [];
      if (coTrainers.length === 0) {
        const coCount = (idx % 2 === 0) ? 2 : 3;
        coTrainers = Array.from({ length: coCount }, (_, cIdx) => {
          const p = TEACHING_POOL[(idx + 1 + cIdx) % TEACHING_POOL.length];
          return {
            id: p.id,
            userId: p.id,
            name: p.name,
            fullName: p.name,
            role: p.role,
            title: p.title,
          };
        });
      }
      const coTrainerIds = coTrainers.map((t) => t.userId || t.id);
      const coTrainerNames = coTrainers.map((t) => t.fullName || t.name);

      return {
        ...c,
        trainerId,
        trainerName,
        instructor: trainerName,
        coTrainers,
        coTrainerIds,
        coTrainerNames,
      };
    }
    return c;
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function CourseStoreProvider({ children }) {
  // Auth state
  const [currentUser, setCurrentUser] = useState(() => hydrateUser(loadItem(AUTH_KEY, defaultUser)));
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(loadItem(AUTH_KEY, defaultUser)));

  // App data state
  const [users, setUsers] = useState(() => {
    const loaded = loadItem(USERS_KEY, null);
    const baseline = typeof allUsers === 'function' ? allUsers() : [];
    if (!loaded || !Array.isArray(loaded)) return baseline;
    return loaded.map((u) => {
      const base = baseline.find((b) => b.userId === u.userId || b.employeeCode === u.employeeCode);
      return {
        ...base,
        ...u,
        role: normalizeRole(u.role || base?.role),
        level: normalizeLevel(u.level || base?.level),
        subDepartmentId: u.subDepartmentId || base?.subDepartmentId || null,
        subDepartmentCode: u.subDepartmentCode || base?.subDepartmentCode || null,
        subDepartmentName: u.subDepartmentName || base?.subDepartmentName || null,
        departmentName: u.departmentName || base?.departmentName || null,
        departmentId: u.departmentId || base?.departmentId || null,
      };
    });
  });
  const [courses, setCourses] = useState(() => loadItem(STORAGE_KEY, initialCourses));
  const [classrooms, setClassrooms] = useState(() => loadItem(CLASSROOM_KEY, initialClassrooms));
  const [approvals, setApprovals] = useState(() => loadItem(APPROVAL_KEY, initialApprovals));
  const [gamification, setGamification] = useState(() => loadItem(GAMIFICATION_KEY, initialGamification));
  const [actionPlans, setActionPlans] = useState(() => loadItem(ACTION_PLAN_KEY, initialActionPlans));

  // Enrollments created in the session: { [userId]: { [courseId]: enrollment } }.
  // Layered on top of the static HRIS enrollment matrix.
  const [enrollments, setEnrollments] = useState(() => loadItem(ENROLLMENT_KEY, {}));

  // Cost Center ledger entries created in this session (new paid/free enrollments,
  // manual adjustments). Layered on top of the opening ledger derived from static data.
  const [costLedgerSession, setCostLedgerSession] = useState(() => loadItem(COST_LEDGER_KEY, []));

  // Level roadmap configuration (Tab 1 "current" / Tab 2 "succession" cross-reference
  // from here) — only User Admin/SysAdmin may edit (UI gate); every role reads.
  const [roadmapsConfig, setRoadmapsConfig] = useState(() => loadItem(ROADMAP_KEY, SCOPE_ROADMAP_MATRIX));

  // Curriculum: a bundle of several self-paced E-Learning courses following the
  // structure Curriculum -> Courses -> Modules -> Lessons (referencing courseIds only,
  // without copying the modules/lessons back).
  const [curricula, setCurricula] = useState(() => loadItem(CURRICULUM_KEY, initialCurricula));

  // Library: an admin-managed Library -> Domain (an area bound to an existing Category) ->
  // courseIds[] (one course may sit in several domains/libraries, they are not
  // mutually exclusive — it is only a reference tag and does not change the source course data).
  const [libraries, setLibraries] = useState(() => loadItem(LIBRARY_KEY, buildSeedLibraries(initialCourses)));

  // The company Category catalog: a standard list of rich objects that the System Admin can
  // view them all & add new ones from System Configuration — with no count limit.
  const [companyCategoryObjects, setCompanyCategoryObjects] = useState(() => {
    const loaded = loadItem(CATEGORY_KEY, DEFAULT_CATEGORY_OBJECTS);
    if (!Array.isArray(loaded)) return DEFAULT_CATEGORY_OBJECTS;
    return loaded.map((cat) => normalizeCategory(cat, DEFAULT_CATEGORY_OBJECTS));
  });

  const companyCategories = useMemo(
    () => companyCategoryObjects.map((c) => (typeof c === 'string' ? c : c.name)),
    [companyCategoryObjects]
  );

  // Certificate Template: see the note at CERT_TEMPLATE_KEY above.
  const [certificateTemplates, setCertificateTemplates] = useState(() => loadItem(CERT_TEMPLATE_KEY, DEFAULT_CERTIFICATE_TEMPLATES));

  // Enterprise Org Hierarchy & Job Levels States (BU, Division, Department, Sub-Department, Job Levels)
  const [businessUnits, setBusinessUnits] = useState(() => loadItem(BU_KEY, initialBusinessUnits));
  const [divisions, setDivisions] = useState(() => loadItem(DIV_KEY, initialDivisions));
  const [departments, setDepartments] = useState(() => loadItem(DEPT_KEY, initialDepartments));
  const [subDepartments, setSubDepartments] = useState(() => loadItem(SUBDEPT_KEY, initialSubDepartments));
  const [jobLevels, setJobLevels] = useState(() => loadItem(JOBLEVELS_KEY, initialJobLevels));
  const [customGroups, setCustomGroups] = useState(() => loadItem(GROUP_KEY, DEFAULT_CUSTOM_GROUPS));
  // Area / Category catalog for the custom groups — editable, because the group list is
  // filtered and grouped by it.
  const [customGroupCategories, setCustomGroupCategories] = useState(() => {
    const loaded = loadItem(GROUP_CATEGORY_KEY, DEFAULT_GROUP_CATEGORIES);
    if (!Array.isArray(loaded) || loaded.length === 0) return DEFAULT_GROUP_CATEGORIES;
    return loaded
      .map((cat) => (typeof cat === 'string' ? { id: groupCategoryId(cat), label: cat } : cat))
      .filter((cat) => cat && cat.id && cat.label);
  });

  // HRBP Strategic Operations states (Interventions, Succession, 1-on-1 Alignments, Compliance Nudges)
  const [interventions, setInterventions] = useState(() => loadItem(INTERVENTION_KEY, DEFAULT_INTERVENTIONS));
  const [successionTalents, setSuccessionTalents] = useState(() => loadItem(SUCCESSION_KEY, DEFAULT_SUCCESSION_TALENTS));
  const [successionAlignments, setSuccessionAlignments] = useState(() => loadItem(ALIGNMENT_KEY, DEFAULT_ALIGNMENTS));
  const [complianceNudges, setComplianceNudges] = useState(() => loadItem(COMPLIANCE_NUDGES_KEY, []));

  // Enterprise Assessment system (Quiz, Assignment, Survey, Question Bank, Attempts)
  const [assessments, setAssessments] = useState(() => loadItem(ASSESSMENT_KEY, INITIAL_ASSESSMENTS));
  const [questionBanks, setQuestionBanks] = useState(() => loadItem(QUESTION_BANK_KEY, QUESTION_BANK));
  const [assessmentAttempts, setAssessmentAttempts] = useState(() => loadItem(ATTEMPT_KEY, INITIAL_ASSESSMENT_ATTEMPTS));
  // Assessment registrations created in the session: { [userId]: { [assessmentId]: { registeredAt } } }.
  // Mirrors the `enrollments` overlay pattern above, but for standalone assessments
  // (no Cost Center transaction — that is specific to paid course enrollment).
  const [assessmentRegistrations, setAssessmentRegistrations] = useState({});

  // Modals & UI States
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [activeAiTab, setActiveAiTab] = useState('tutor');

  const [talentProfileUser, setTalentProfileUser] = useState(null);
  const [surveyModalConfig, setSurveyModalConfig] = useState({ isOpen: false, course: null, type: 'L1', learner: null });

  // Theme (light | dark) & Language (en | vi)
  const [theme, setThemeState] = useState(() => {
    const saved = loadItem(THEME_KEY, null);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  const [language, setLanguageState] = useState(() => {
    const saved = loadItem(LANG_KEY, null);
    if (saved === 'en' || saved === 'vi') return saved;
    // Both copy variants are English now; 'vi' stays the default because that is
    // the branch the UI and the verification suite are written against.
    return 'vi';
  });

  useEffect(() => {
    try {
      if (isAuthenticated && currentUser) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(AUTH_KEY);
      }
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
      localStorage.setItem(CLASSROOM_KEY, JSON.stringify(classrooms));
      localStorage.setItem(APPROVAL_KEY, JSON.stringify(approvals));
      localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(gamification));
      localStorage.setItem(ACTION_PLAN_KEY, JSON.stringify(actionPlans));
      localStorage.setItem(ENROLLMENT_KEY, JSON.stringify(enrollments));
      localStorage.setItem(COST_LEDGER_KEY, JSON.stringify(costLedgerSession));
      localStorage.setItem(ROADMAP_KEY, JSON.stringify(roadmapsConfig));
      localStorage.setItem(CURRICULUM_KEY, JSON.stringify(curricula));
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(libraries));
      localStorage.setItem(CATEGORY_KEY, JSON.stringify(companyCategoryObjects));
      localStorage.setItem(CERT_TEMPLATE_KEY, JSON.stringify(certificateTemplates));
      localStorage.setItem(BU_KEY, JSON.stringify(businessUnits));
      localStorage.setItem(DIV_KEY, JSON.stringify(divisions));
      localStorage.setItem(DEPT_KEY, JSON.stringify(departments));
      localStorage.setItem(SUBDEPT_KEY, JSON.stringify(subDepartments));
      localStorage.setItem(JOBLEVELS_KEY, JSON.stringify(jobLevels));
      localStorage.setItem(GROUP_KEY, JSON.stringify(customGroups));
      localStorage.setItem(GROUP_CATEGORY_KEY, JSON.stringify(customGroupCategories));
      localStorage.setItem(INTERVENTION_KEY, JSON.stringify(interventions));
      localStorage.setItem(SUCCESSION_KEY, JSON.stringify(successionTalents));
      localStorage.setItem(ALIGNMENT_KEY, JSON.stringify(successionAlignments));
      localStorage.setItem(COMPLIANCE_NUDGES_KEY, JSON.stringify(complianceNudges));
      localStorage.setItem(ASSESSMENT_KEY, JSON.stringify(assessments));
      localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(questionBanks));
      localStorage.setItem(ATTEMPT_KEY, JSON.stringify(assessmentAttempts));
      localStorage.setItem(THEME_KEY, JSON.stringify(theme));
      localStorage.setItem(LANG_KEY, JSON.stringify(language));
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch {
      // ignore quota / private browsing
    }
  }, [isAuthenticated, currentUser, users, courses, classrooms, approvals, gamification, actionPlans, enrollments, costLedgerSession, roadmapsConfig, curricula, libraries, companyCategories, certificateTemplates, customGroups, customGroupCategories, interventions, successionTalents, successionAlignments, complianceNudges, assessments, questionBanks, assessmentAttempts, theme, language]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((nextTheme) => {
    if (nextTheme === 'dark' || nextTheme === 'light') setThemeState(nextTheme);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'en' ? 'vi' : 'en'));
  }, []);

  const setLanguage = useCallback((nextLang) => {
    if (nextLang === 'en' || nextLang === 'vi') setLanguageState(nextLang);
  }, []);

  const t = useCallback((key, fallback = '') => {
    return translate(key, language, fallback);
  }, [language]);

  // Auth actions
  const login = useCallback((userObj) => {
    setCurrentUser(hydrateUser(userObj));
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, []);

  const switchUser = useCallback((userId) => {
    const list = users && users.length > 0 ? users : allUsers ? allUsers() : demoUsers;
    const found = list.find((u) => u.userId === userId || u.employeeCode === userId);
    if (found) {
      setCurrentUser(hydrateUser(found));
      setIsAuthenticated(true);
    }
  }, [users]);

  /** Job Level Promotion - only User Admin & SysAdmin may call it */
  const promoteUserLevel = useCallback(
    (userId, newLevel, reason = '') => {
      const normalizedLvl = normalizeLevel(newLevel);
      setUsers((prev) =>
        prev.map((u) => {
          if (u.userId === userId || u.employeeCode === userId) {
            const updated = {
              ...u,
              level: normalizedLvl,
              levelTitle: levelTitle(normalizedLvl),
              lastPromotedAt: todayIso(),
              promotionReason: reason || 'Completed the training program & met the competency standard.',
            };
            if (currentUser && (currentUser.userId === u.userId || currentUser.employeeCode === u.employeeCode)) {
              setCurrentUser(updated);
            }
            return updated;
          }
          return u;
        })
      );
      return { ok: true, newLevel: normalizedLvl };
    },
    [currentUser]
  );

  /** Updates employee details (User Master Data: name, email, job title, department, sub-department, role...) */
  const updateUser = useCallback(
    (userId, patch) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.userId === userId || u.employeeCode === userId) {
            const updated = { ...u, ...patch };
            if (currentUser && (currentUser.userId === u.userId || currentUser.employeeCode === u.employeeCode)) {
              setCurrentUser(updated);
            }
            return updated;
          }
          return u;
        })
      );
      return { ok: true };
    },
    [currentUser]
  );

  /** Adds a new employee */
  const addUser = useCallback((newUser) => {
    const rawNum = Math.floor(1000 + Math.random() * 9000);
    const id = newUser.userId || `USR-${rawNum}`;
    const empCode = newUser.employeeCode || `MMVN-${rawNum}`;
    const created = {
      userId: id,
      employeeCode: empCode,
      fullName: newUser.fullName || 'New Employee',
      email: newUser.email || `employee_${rawNum}@mmvietnam.com`,
      position: newUser.position || newUser.title || 'Store Associate',
      title: newUser.title || newUser.position || 'Store Associate',
      level: normalizeLevel(newUser.level || '7'),
      levelTitle: levelTitle(normalizeLevel(newUser.level || '7')),
      role: normalizeRole(newUser.role || 'learner'),
      branch: newUser.branch || 'SUPPORTING',
      branchName: newUser.branchName || (newUser.branch === 'OPERATIONS' ? 'Store Operations' : 'Head Office'),
      businessUnitId: newUser.businessUnitId || 'bu-mmvn',
      businessUnitCode: newUser.businessUnitCode || 'MMVN',
      divisionId: newUser.divisionId || null,
      divisionCode: newUser.divisionCode || null,
      divisionName: newUser.divisionName || null,
      departmentId: newUser.departmentId || null,
      departmentCode: newUser.departmentCode || null,
      departmentName: newUser.departmentName || null,
      subDepartmentId: newUser.subDepartmentId || null,
      subDepartmentCode: newUser.subDepartmentCode || null,
      subDepartmentName: newUser.subDepartmentName || null,
      storeId: newUser.storeId || null,
      storeName: newUser.storeName || null,
      status: 'ACTIVE',
      yearsOfService: newUser.yearsOfService || 1.0,
      avatar: (newUser.fullName || 'NV').slice(0, 2).toUpperCase(),
      badgeTone: 'blue',
      description: newUser.description || 'MM Mega Market employee profile.',
      ...newUser,
    };
    setUsers((prev) => [created, ...prev]);
    return created;
  }, []);

  /** Removes an employee from the directory */
  const deleteUser = useCallback((userId) => {
    setUsers((prev) => prev.filter((u) => u.userId !== userId && u.employeeCode !== userId));
    return { ok: true };
  }, []);

  /** Bulk import employees from a CSV / JSON file */
  const importUsers = useCallback((importedUserList) => {
    if (!Array.isArray(importedUserList) || importedUserList.length === 0) return { addedCount: 0, updatedCount: 0, total: 0 };
    let added = 0;
    let updated = 0;
    setUsers((prev) => {
      const currentList = [...prev];
      const newItems = [];
      importedUserList.forEach((incoming) => {
        const id = incoming.userId || incoming.employeeCode;
        const idx = currentList.findIndex((u) => u.userId === id || (u.employeeCode && u.employeeCode === id));
        const standardized = {
          userId: id,
          employeeCode: incoming.employeeCode || id,
          fullName: incoming.fullName || 'New Employee',
          email: incoming.email || `${id.toLowerCase()}@mmvietnam.com`,
          position: incoming.position || incoming.title || 'Specialist',
          title: incoming.title || incoming.position || 'Specialist',
          level: normalizeLevel(incoming.level || '7'),
          levelTitle: levelTitle(normalizeLevel(incoming.level || '7')),
          role: normalizeRole(incoming.role || 'learner'),
          branch: incoming.branch || 'SUPPORTING',
          branchName: incoming.branchName || (incoming.branch === 'OPERATIONS' ? 'Store Operations' : 'Head Office'),
          businessUnitId: incoming.businessUnitId || 'bu-mmvn',
          businessUnitCode: incoming.businessUnitCode || 'MMVN',
          businessUnitName: incoming.businessUnitName || 'MM Mega Market Vietnam',
          divisionId: incoming.divisionId || null,
          divisionCode: incoming.divisionCode || null,
          divisionName: incoming.divisionName || null,
          departmentId: incoming.departmentId || null,
          departmentCode: incoming.departmentCode || null,
          departmentName: incoming.departmentName || null,
          subDepartmentId: incoming.subDepartmentId || null,
          subDepartmentCode: incoming.subDepartmentCode || null,
          subDepartmentName: incoming.subDepartmentName || null,
          storeName: incoming.storeName || (incoming.branch === 'OPERATIONS' ? incoming.divisionName || 'MM store' : 'Head Office (An Phu)'),
          status: incoming.status || 'ACTIVE',
          yearsOfService: incoming.yearsOfService || 1.0,
          avatar: (incoming.fullName || 'NV').slice(0, 2).toUpperCase(),
          badgeTone: 'blue',
          ...incoming,
        };
        if (idx >= 0) {
          currentList[idx] = { ...currentList[idx], ...standardized };
          updated++;
        } else {
          newItems.push(standardized);
          added++;
        }
      });
      return [...newItems, ...currentList];
    });
    return { addedCount: added, updatedCount: updated, total: importedUserList.length };
  }, []);

  // -------------------------------------------------------------------------
  // Business Units, Divisions, Departments, Sub-Departments CRUD
  // -------------------------------------------------------------------------

  const addBusinessUnit = useCallback((bu) => {
    const id = bu.id || `bu-${Date.now()}`;
    const newBu = { id, code: (bu.code || 'BU').toUpperCase(), name: bu.name || 'New Business Unit', ...bu };
    setBusinessUnits((prev) => [...prev, newBu]);
    return newBu;
  }, []);

  const updateBusinessUnit = useCallback((id, patch) => {
    setBusinessUnits((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    return { ok: true };
  }, []);

  const deleteBusinessUnit = useCallback((id) => {
    setBusinessUnits((prev) => prev.filter((b) => b.id !== id));
    setDivisions((prev) => prev.filter((d) => d.businessUnitId !== id));
    return { ok: true };
  }, []);

  const addDivision = useCallback((div) => {
    const id = div.id || `div-${Date.now()}`;
    const newDiv = {
      id,
      businessUnitId: div.businessUnitId || 'bu-mmvn',
      branch: div.branch || 'SUPPORTING',
      code: div.code || 'DIV',
      name: div.name || 'New Division',
      ...div,
    };
    setDivisions((prev) => [...prev, newDiv]);
    return newDiv;
  }, []);

  const updateDivision = useCallback((id, patch) => {
    setDivisions((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    return { ok: true };
  }, []);

  const deleteDivision = useCallback((id) => {
    setDivisions((prev) => prev.filter((d) => d.id !== id));
    setDepartments((prev) => prev.filter((dept) => dept.divisionId !== id));
    return { ok: true };
  }, []);

  const addDepartment = useCallback((dept) => {
    const id = dept.id || `dept-${Date.now()}`;
    const newDept = {
      id,
      divisionId: dept.divisionId,
      code: dept.code || 'DEPT',
      name: dept.name || 'New Department',
      ...dept,
    };
    setDepartments((prev) => [...prev, newDept]);
    return newDept;
  }, []);

  const updateDepartment = useCallback((id, patch) => {
    setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    return { ok: true };
  }, []);

  const deleteDepartment = useCallback((id) => {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    setSubDepartments((prev) => prev.filter((sub) => sub.departmentId !== id));
    return { ok: true };
  }, []);

  const addSubDepartment = useCallback((subDept) => {
    const id = subDept.id || `sub-${Date.now()}`;
    const newSub = {
      id,
      departmentId: subDept.departmentId,
      code: subDept.code || 'SUB',
      name: subDept.name || 'New Sub-Department',
      ...subDept,
    };
    setSubDepartments((prev) => [...prev, newSub]);
    return newSub;
  }, []);

  const updateSubDepartment = useCallback((id, patch) => {
    setSubDepartments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    return { ok: true };
  }, []);

  const deleteSubDepartment = useCallback((id) => {
    setSubDepartments((prev) => prev.filter((s) => s.id !== id));
    return { ok: true };
  }, []);

  // -------------------------------------------------------------------------
  // Job Levels CRUD
  // -------------------------------------------------------------------------

  const addJobLevel = useCallback((levelObj) => {
    const lvlStr = String(levelObj.level || '').trim();
    const newLvl = {
      id: `lvl-${lvlStr || Date.now()}`,
      level: lvlStr,
      rank: Number(lvlStr) || 1,
      code: levelObj.code || `LVL-${lvlStr}`,
      emoji: levelObj.emoji || '⭐',
      title: levelObj.title || `Level ${lvlStr}`,
      viTitle: levelObj.viTitle || levelObj.title || `Level ${lvlStr}`,
      shortVi: levelObj.shortVi || levelObj.titleVi || `Level ${lvlStr}`,
      band: levelObj.band || 'GENERAL',
      authority: levelObj.authority || 'STANDARD',
      typicalRoles: levelObj.typicalRoles || ['learner'],
      descVi: levelObj.descVi || 'The job level in the MM Mega Market system.',
      headcount: levelObj.headcount || 0,
      colors: levelObj.colors || { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
      ...levelObj,
    };
    setJobLevels((prev) => {
      const filtered = prev.filter((l) => String(l.level) !== String(newLvl.level));
      return [...filtered, newLvl].sort((a, b) => Number(a.level) - Number(b.level));
    });
    return newLvl;
  }, []);

  const updateJobLevel = useCallback((levelKey, patch) => {
    setJobLevels((prev) => prev.map((l) => (l.level === levelKey || l.id === levelKey ? { ...l, ...patch } : l)));
    return { ok: true };
  }, []);

  const deleteJobLevel = useCallback((levelKey) => {
    setJobLevels((prev) => prev.filter((l) => l.level !== levelKey && l.id !== levelKey));
    return { ok: true };
  }, []);

  const addCourse = useCallback((course) => {
    setCourses((prev) => [...prev, course]);
  }, []);

  const updateCourse = useCallback((courseId, nextCourse) => {
    setCourses((prev) => prev.map((c) => (c.id === courseId ? nextCourse : c)));
  }, []);

  const removeCourse = useCallback((courseId) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  }, []);

  const addCurriculum = useCallback((curriculum) => {
    setCurricula((prev) => [...prev, curriculum]);
  }, []);

  const updateCurriculum = useCallback((curriculumId, nextCurriculum) => {
    setCurricula((prev) => prev.map((c) => (c.id === curriculumId ? nextCurriculum : c)));
  }, []);

  const deleteCurriculum = useCallback((curriculumId) => {
    setCurricula((prev) => prev.filter((c) => c.id !== curriculumId));
  }, []);

  const addLibrary = useCallback((library) => {
    setLibraries((prev) => [...prev, library]);
  }, []);

  const updateLibrary = useCallback((libraryId, nextLibrary) => {
    setLibraries((prev) => prev.map((l) => (l.id === libraryId ? nextLibrary : l)));
  }, []);

  const deleteLibrary = useCallback((libraryId) => {
    setLibraries((prev) => prev.filter((l) => l.id !== libraryId));
  }, []);

  const addCertificateTemplate = useCallback((template) => {
    setCertificateTemplates((prev) => [...prev, template]);
  }, []);

  const updateCertificateTemplate = useCallback((templateId, nextTemplate) => {
    setCertificateTemplates((prev) => prev.map((t) => (t.id === templateId ? nextTemplate : t)));
  }, []);

  // the UI must compute usage itself (which course/curriculum has certificateTemplateId
  // == templateId) and only call it when = 0, like deleteCompanyCategory above —
  // this action does not re-check it itself.
  const deleteCertificateTemplate = useCallback((templateId) => {
    setCertificateTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }, []);

  const assignCurriculum = useCallback((curriculumId, assignmentOrAssignments) => {
    const rawList = Array.isArray(assignmentOrAssignments) ? assignmentOrAssignments : [assignmentOrAssignments];
    const newAsgs = rawList.map((assignment) => ({
      id: `asg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      assignedBy: currentUser?.userId || userAdminUser.userId,
      assignedAt: new Date().toISOString().slice(0, 10),
      ...assignment,
    }));
    setCurricula((prev) =>
      prev.map((c) =>
        c.id === curriculumId
          ? {
              ...c,
              assignments: [...(c.assignments || []), ...newAsgs],
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : c
      )
    );
    return newAsgs.length === 1 ? newAsgs[0] : newAsgs;
  }, [currentUser]);

  const removeCurriculumAssignment = useCallback((curriculumId, assignmentId) => {
    setCurricula((prev) =>
      prev.map((c) =>
        c.id === curriculumId
          ? {
              ...c,
              assignments: (c.assignments || []).filter((a) => a.id !== assignmentId),
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : c
      )
    );
  }, []);

  const assignCourse = useCallback((courseId, assignmentOrAssignments) => {
    const rawList = Array.isArray(assignmentOrAssignments) ? assignmentOrAssignments : [assignmentOrAssignments];
    const newAsgs = rawList.map((asg) => ({
      id: `asg-c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      assignedBy: currentUser?.userId || userAdminUser.userId,
      assignedAt: new Date().toISOString().slice(0, 10),
      ...asg,
    }));
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const currentAsgs = c.assignments || (c.assignment ? [c.assignment] : []);
        return {
          ...c,
          assignments: [...currentAsgs, ...newAsgs],
          updatedAt: new Date().toISOString().slice(0, 10),
        };
      })
    );
    return newAsgs.length === 1 ? newAsgs[0] : newAsgs;
  }, [currentUser]);

  const removeCourseAssignment = useCallback((courseId, assignmentId) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const currentAsgs = c.assignments || (c.assignment ? [c.assignment] : []);
        const updated = currentAsgs.filter((a) => a.id !== assignmentId);
        return {
          ...c,
          assignments: updated,
          updatedAt: new Date().toISOString().slice(0, 10),
        };
      })
    );
  }, []);

  const addCompanyCategory = useCallback((categoryInput) => {
    let catObj;
    if (typeof categoryInput === 'string') {
      const clean = categoryInput.trim();
      if (!clean) return { ok: false, reason: 'The category name cannot be empty.' };
      catObj = {
        id: `cat-${Date.now()}`,
        name: clean,
        code: generateCategoryCode(clean),
        icon: 'ti-folder',
        color: '#3b82f6',
        description: '',
        coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
        createdAt: new Date().toISOString().slice(0, 10),
      };
    } else {
      const cleanName = (categoryInput.name || '').trim();
      if (!cleanName) return { ok: false, reason: 'The category name cannot be empty.' };
      catObj = {
        id: categoryInput.id || `cat-${Date.now()}`,
        name: cleanName,
        code: categoryInput.code || generateCategoryCode(cleanName),
        icon: categoryInput.icon || 'ti-folder',
        color: categoryInput.color || '#3b82f6',
        description: categoryInput.description || '',
        coverImage: categoryInput.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
        createdAt: categoryInput.createdAt || new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
      };
    }

    let alreadyExists = false;
    setCompanyCategoryObjects((prev) => {
      if (prev.some((c) => (typeof c === 'string' ? c : c.name).toLowerCase() === catObj.name.toLowerCase())) {
        alreadyExists = true;
        return prev;
      }
      return [catObj, ...prev];
    });

    return alreadyExists
      ? { ok: false, reason: `The category "${catObj.name}" already exists.` }
      : { ok: true, category: catObj, name: catObj.name };
  }, []);

  const updateCompanyCategory = useCallback((idOrOldName, updatedData) => {
    const cleanName = (updatedData.name || '').trim();
    if (!cleanName) return { ok: false, reason: 'The category name cannot be empty.' };

    let oldName = '';
    let updatedObj = null;

    setCompanyCategoryObjects((prev) => {
      return prev.map((c) => {
        const isMatch = (typeof c === 'object' && (c.id === idOrOldName || c.name === idOrOldName)) || c === idOrOldName;
        if (!isMatch) return c;

        oldName = typeof c === 'string' ? c : c.name;
        updatedObj = {
          ...(typeof c === 'object' ? c : { id: `cat-${Date.now()}` }),
          ...updatedData,
          name: cleanName,
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        return updatedObj;
      });
    });

    if (oldName && oldName !== cleanName) {
      setCourses((prev) => prev.map((c) => ({
        ...c,
        category: c.category === oldName ? cleanName : c.category,
        categories: c.categories ? c.categories.map((cat) => (cat === oldName ? cleanName : cat)) : c.categories,
      })));
      setCurricula((prev) => prev.map((cur) => (cur.category === oldName ? { ...cur, category: cleanName } : cur)));
      setAssessments((prev) => prev.map((a) => ({
        ...a,
        category: a.category === oldName ? cleanName : a.category,
        categories: a.categories ? a.categories.map((cat) => (cat === oldName ? cleanName : cat)) : a.categories,
      })));
      setLibraries((prev) => prev.map((lib) => ({
        ...lib,
        domains: (lib.domains || []).map((d) => (d.category === oldName ? { ...d, category: cleanName } : d)),
      })));
    }

    return { ok: true, category: updatedObj };
  }, []);

  const renameCompanyCategory = useCallback((oldName, newName) => {
    return updateCompanyCategory(oldName, { name: newName });
  }, [updateCompanyCategory]);

  const deleteCompanyCategory = useCallback((idOrName) => {
    setCompanyCategoryObjects((prev) =>
      prev.filter((c) => (typeof c === 'string' ? c !== idOrName : (c.id !== idOrName && c.name !== idOrName)))
    );
  }, []);

  // -------------------------------------------------------------------------
  // HRBP Strategic Operations: Interventions, Succession, Alignments, Nudges
  // -------------------------------------------------------------------------

  const addInterventionRequest = useCallback((req) => {
    const newReq = {
      id: `ITV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      requestedBy: currentUser?.fullName || 'Le Thi Mai (HRBP)',
      requesterRole: currentUser?.role || 'hrbp',
      requestedAt: new Date().toISOString().slice(0, 10),
      status: 'PENDING_REVIEW',
      ...req,
    };
    setInterventions((prev) => [newReq, ...prev]);
    return newReq;
  }, [currentUser]);

  const updateInterventionStatus = useCallback((id, status, extra = {}) => {
    setInterventions((prev) => prev.map((i) => (i.id === id ? { ...i, status, ...extra } : i)));
  }, []);

  const cancelIntervention = useCallback((id) => {
    setInterventions((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'CANCELLED' } : i)));
  }, []);

  const addSuccessionTalent = useCallback((talent) => {
    setSuccessionTalents((prev) => [...prev, { ...talent, progress702010: talent.progress702010 || 70 }]);
  }, []);

  const updateSuccessionTalent = useCallback((id, patch) => {
    setSuccessionTalents((prev) => prev.map((t) => (t.id === id || t.userId === id ? { ...t, ...patch } : t)));
  }, []);

  const saveSuccessionAlignment = useCallback((record) => {
    const newAln = {
      id: `aln-${Date.now()}`,
      updatedAt: new Date().toISOString().slice(0, 10),
      ...record,
    };
    setSuccessionAlignments((prev) => [newAln, ...prev]);
    setSuccessionTalents((prev) => prev.map((t) => {
      if (t.id === record.candidateId || t.userId === record.candidateId) {
        const ojt = Number(record.ojt70 ?? t.ojt70 ?? 70);
        const mentor = Number(record.mentoring20 ?? t.mentoring20 ?? 70);
        const formal = Number(record.formal10 ?? t.formal10 ?? 70);
        const avg = Math.round(ojt * 0.7 + mentor * 0.2 + formal * 0.1);
        return {
          ...t,
          ojt70: ojt,
          mentoring20: mentor,
          formal10: formal,
          progress702010: avg,
          readiness: record.readiness || t.readiness,
          readinessLabel: record.readinessLabel || t.readinessLabel,
        };
      }
      return t;
    }));
    return newAln;
  }, []);

  const sendComplianceNudge = useCallback((storeId, nudgeData) => {
    const newNudge = {
      id: `ndg-${Date.now()}`,
      storeId,
      sentAt: new Date().toISOString().slice(0, 10),
      sentBy: currentUser?.fullName || 'Le Thi Mai (HRBP)',
      ...nudgeData,
    };
    setComplianceNudges((prev) => [newNudge, ...prev]);
    return newNudge;
  }, [currentUser]);

  // -------------------------------------------------------------------------
  // Enterprise Assessment: Quizzes, Assignments, Surveys, Question Bank, Attempts
  // -------------------------------------------------------------------------

  const addAssessment = useCallback((draft) => {
    const newAsm = {
      id: draft.id || `ASM-${Date.now()}`,
      code: draft.code || `ASM-${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      createdBy: currentUser?.userId || 'USR-ADMIN',
      createdByName: currentUser?.fullName || 'Administrator',
      status: draft.status || 'PUBLISHED',
      assignments: draft.assignments || [],
      questionIds: draft.questionIds || [],
      ...draft,
    };
    setAssessments((prev) => [newAsm, ...prev]);
    return newAsm;
  }, [currentUser]);

  const updateAssessment = useCallback((id, patch) => {
    setAssessments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : a)));
  }, []);

  const deleteAssessment = useCallback((id) => {
    setAssessments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const assignAssessmentTarget = useCallback((assessmentId, assignment) => {
    setAssessments((prev) => prev.map((a) => {
      if (a.id !== assessmentId) return a;
      const current = a.assignments || [];
      const updated = [...current.filter((x) => x.targetId !== assignment.targetId), assignment];
      return { ...a, assignments: updated, updatedAt: new Date().toISOString().slice(0, 10) };
    }));
  }, []);

  const removeAssessmentTarget = useCallback((assessmentId, targetId) => {
    setAssessments((prev) => prev.map((a) => {
      if (a.id !== assessmentId) return a;
      return { ...a, assignments: (a.assignments || []).filter((x) => x.targetId !== targetId), updatedAt: new Date().toISOString().slice(0, 10) };
    }));
  }, []);

  const recordAssessmentAttempt = useCallback((attempt) => {
    const newAttempt = {
      attemptId: attempt.attemptId || `ATT-${Date.now()}`,
      startTime: attempt.startTime || new Date().toISOString(),
      endTime: attempt.endTime || new Date().toISOString(),
      userId: attempt.userId || currentUser?.userId,
      userName: attempt.userName || currentUser?.fullName,
      userRole: attempt.userRole || currentUser?.role,
      userLevel: attempt.userLevel || currentUser?.level,
      ...attempt,
    };
    setAssessmentAttempts((prev) => [newAttempt, ...prev]);
    return newAttempt;
  }, [currentUser]);

  const addQuestionToBank = useCallback((question) => {
    const newQ = {
      id: question.id || `QB-${Date.now()}`,
      ...question,
    };
    setQuestionBanks((prev) => [...prev, newQ]);
    return newQ;
  }, []);

  /** Registers the signed-in user for a standalone assessment (no course-level
   *  access rule, no Cost Center transaction — assessments are not paid). */
  const enrollAssessment = useCallback(
    (assessmentId, user = currentUser) => {
      const userId = user?.userId;
      if (!userId) return;
      setAssessmentRegistrations((prev) => ({
        ...prev,
        [userId]: {
          ...(prev[userId] || {}),
          [assessmentId]: { registeredAt: new Date().toISOString() },
        },
      }));
    },
    [currentUser]
  );

  /** Has `user` already registered for this assessment? */
  const isAssessmentRegistered = useCallback(
    (assessmentId, user = currentUser) => {
      const userId = user?.userId;
      if (!userId) return false;
      return Boolean(assessmentRegistrations[userId]?.[assessmentId]);
    },
    [assessmentRegistrations, currentUser]
  );

  // -------------------------------------------------------------------------
  // Sequential Level Gate: level skip requests & course access status
  // -------------------------------------------------------------------------

  const role = normalizeRole(currentUser?.role);

  /** The courses `user` has been approved for / is pending on / was rejected for. */
  const requestBuckets = useCallback(
    (user) => {
      const uid = user?.userId;
      const mine = approvals.filter((a) => a.userId === uid || a.employeeId === user?.employeeCode);
      return {
        approvedCourseIds: mine.filter((a) => a.status === 'APPROVED').map((a) => a.courseId),
        pendingCourseIds: mine.filter((a) => a.status === 'PENDING').map((a) => a.courseId),
        rejectedCourseIds: mine.filter((a) => a.status === 'REJECTED').map((a) => a.courseId),
      };
    },
    [approvals]
  );

  const myRequestBuckets = useMemo(() => requestBuckets(currentUser), [requestBuckets, currentUser]);

  /** The access status of a course for the signed-in user. */
  const accessFor = useCallback(
    (course, user = currentUser) => {
      const buckets = user === currentUser ? myRequestBuckets : requestBuckets(user);
      const asgList = course?.assignments || (course?.assignment ? [course.assignment] : []);
      const isDirectlyAssigned = Boolean(
        asgList.some((a) => {
          if (a.assignmentType === 'USER' && (a.targetId === user?.userId || a.targetId === user?.employeeCode)) return true;
          if (a.assignmentType === 'GROUP') {
            const grp = customGroups.find((g) => g.id === a.targetId);
            if (grp) {
              if (a.groupPolicy === 'ELIGIBLE_ONLY') {
                const evalRes = evaluateUserEligibilityForCourse(user, course);
                if (!evalRes.isEligible && evalRes.matchType !== 'GAP_ONE_STEP') return false;
              }
              return isUserInCustomGroup(user, grp, users);
            }
          }
          if (a.assignmentType === 'SUBDEPARTMENT' && (user?.subDepartmentId === a.targetId || user?.subDepartmentCode === a.targetId)) return true;
          if (a.assignmentType === 'DEPARTMENT' && (user?.departmentId === a.targetId || user?.departmentCode === a.targetId)) return true;
          if (a.assignmentType === 'DIVISION' && (user?.divisionId === a.targetId || user?.divisionCode === a.targetId)) return true;
          if (a.assignmentType === 'STORE' && (user?.storeId === a.targetId || user?.storeCode === a.targetId)) return true;
          if (a.assignmentType === 'BUSINESS_UNIT' && (user?.businessUnitId === a.targetId || user?.businessUnitCode === a.targetId)) return true;
          if (a.assignmentType === 'LEVEL' && String(user?.level) === String(a.targetId)) return true;
          return false;
        })
      );
      return checkCourseAccessRule(course, user, { ...buckets, isDirectlyAssigned });
    },
    [currentUser, myRequestBuckets, requestBuckets, customGroups, users]
  );

  // -------------------------------------------------------------------------
  // COST CENTER
  // -------------------------------------------------------------------------

  /** 42 divisions = 42 cost centers; the annual budget is computed from real headcount. */
  const costCenters = useMemo(() => buildCostCenters(divisions, users), [divisions, users]);

  /** The opening ledger: the annual budget grant + every historical HRIS enrollment. */
  const openingLedger = useMemo(
    () => seedOpeningLedger({ costCenters, courses, users, enrollmentMatrix: userEnrollmentsMap }),
    [costCenters, courses, users]
  );

  /** The effective ledger = the opening ledger + entries created in the session (on an id clash the session wins). */
  const costLedger = useMemo(() => {
    const merged = new Map(openingLedger.map((t) => [t.id, t]));
    costLedgerSession.forEach((t) => merged.set(t.id, t));
    return Array.from(merged.values()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [openingLedger, costLedgerSession]);

  const costReport = useMemo(
    () => summarizeLedger(costLedger, { costCenters, courses }),
    [costLedger, costCenters, courses]
  );

  /**
   * Sets / edits a course's tuition. It writes straight into `course.pricing` so it is
   * saved with the course catalog automatically; ledger entries already written keep
   * the price at the time of enrollment (no retroactive change).
   */
  const updateCoursePricing = useCallback((courseId, pricing) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const isFree = Boolean(pricing?.isFree);
        const price = isFree ? 0 : Math.max(0, Number(pricing?.price) || 0);
        return {
          ...c,
          pricing: {
            isFree: isFree || price === 0,
            price,
            currency: pricing?.currency || CURRENCY,
            costType: pricing?.costType || pricingOf(c).costType,
            vendor: pricing?.vendor ?? pricingOf(c).vendor,
            updatedAt: todayIso(),
          },
        };
      })
    );
  }, []);

  /** Manual ledger entries (budget adjustments, refunds, off-system costs). */
  const recordCostTransaction = useCallback(
    (txn) => {
      const date = txn.date || todayIso();
      const center = costCenters.find((c) => c.id === txn.costCenterId);
      const entry = {
        ...txn,
        id: txn.id || `TXN-MAN-${Date.now()}`,
        date,
        fiscalYear: Number(date.slice(0, 4)),
        type: txn.type === TXN_TYPE.INCOME ? TXN_TYPE.INCOME : TXN_TYPE.EXPENSE,
        source: txn.source || TXN_SOURCE.MANUAL,
        amount: Math.max(0, Number(txn.amount) || 0),
        currency: txn.currency || CURRENCY,
        isFree: false,
        costCenterId: center?.id || txn.costCenterId || null,
        costCenterCode: center?.code || txn.costCenterCode || null,
        costCenterName: center?.name || txn.costCenterName || null,
        branch: center?.branch || txn.branch || null,
      };
      setCostLedgerSession((prev) => [...prev, entry]);
      return entry;
    },
    [costCenters]
  );

  /** Enrolls the signed-in user in a course (only when the level rule allows it). */
  const enrollCourse = useCallback(
    (courseId, user = currentUser) => {
      if (!user) return { ok: false, reason: 'Not signed in.' };
      const course = courses.find((c) => c.id === courseId);
      if (!course) return { ok: false, reason: 'Course not found.' };

      const access = accessFor(course, user);
      if (!access.canAccess) return { ok: false, reason: access.reason, access };

      setEnrollments((prev) => {
        const forUser = prev[user.userId] || {};
        if (forUser[courseId]) return prev;
        return {
          ...prev,
          [user.userId]: {
            ...forUser,
            [courseId]: {
              courseId,
              userId: user.userId,
              courseType: course.courseType,
              // Locked tightly to the content version at enrollment time — if
              // the Admin later runs "Publish New Version", this learner still
              // continues studying/being scored against the syllabus at the time of
              // danh (xem resolveCourseView trong mockData.js).
              enrolledVersion: course.currentVersion || course.version || 'v1.0',
              status: 'NOT_STARTED',
              progressPercent: 0,
              score: null,
              attemptsCount: 0,
              completedAt: null,
              dueDate: course.assignment?.dueDate || null,
              lastLessonTitle: course.modules?.[0]?.lessons?.[0]?.title || null,
              lastActivityAt: todayIso(),
              enrolledVia: access.state === ACCESS_STATE.APPROVED ? 'LEVEL_ADVANCE_APPROVAL' : 'SELF_ENROLL',
            },
          },
        };
      });

      // Writes an expense entry to the learner's Cost Center. A free course still
      // writes a zero-value entry so reports can count internal enrollments. The entry uses an id
      // deterministic on (user, course), so re-enrolling is never charged twice.
      const txn = buildEnrollmentTransaction({
        course,
        user,
        costCenters,
        date: todayIso(),
        enrolledVia: access.state === ACCESS_STATE.APPROVED ? 'LEVEL_ADVANCE_APPROVAL' : 'SELF_ENROLL',
      });
      if (txn) {
        setCostLedgerSession((prev) => (prev.some((t) => t.id === txn.id) ? prev : [...prev, txn]));
      }

      return { ok: true, access, transaction: txn };
    },
    [courses, currentUser, accessFor, costCenters]
  );

  /**
   * Saves learning progress: updates both the course object (each lesson's status) and
   * the learner's enrollment overlay, so every screen reads the same number.
   *
   * `enrolledVersion` (versioning): if the learner is on the live version of the
   * course (or nothing is passed), write straight into course.modules as
   * before. If the learner is part-way through an OLD version replaced by a
   * "Publish New Version", ONLY update the matching frozen snapshot in
   * course.versions[enrolledVersion] — never touch course.modules
   * (which belongs to the new version), so the content the Admin is authoring is not corrupted.
   */
  const saveCourseProgress = useCallback(
    (courseId, nextCourse, user = currentUser, enrolledVersion) => {
      setCourses((prev) => prev.map((c) => {
        if (c.id !== courseId) return c;
        const current = c.currentVersion || c.version || 'v1.0';
        // Enrollments with no enrolledVersion (the original HRIS sample data, created before
        // versioning existed) default to v1.0 — matching the fallback rule
        // fallback in resolveCourseView() in mockData.js.
        const resolvedEnrolledVersion = enrolledVersion || 'v1.0';
        if (resolvedEnrolledVersion === current) {
          return nextCourse;
        }
        const snap = c.versions?.[resolvedEnrolledVersion] || {};
        return {
          ...c,
          versions: {
            ...c.versions,
            [resolvedEnrolledVersion]: { ...snap, modules: nextCourse.modules, configuration: nextCourse.configuration },
          },
        };
      }));
      if (!user || !nextCourse.enrollment) return;
      setEnrollments((prev) => ({
        ...prev,
        [user.userId]: {
          ...(prev[user.userId] || {}),
          [courseId]: { ...(prev[user.userId] || {})[courseId], ...nextCourse.enrollment, courseId, userId: user.userId, enrolledVersion: enrolledVersion || (prev[user.userId] || {})[courseId]?.enrolledVersion },
        },
      }));
    },
    [currentUser]
  );

  /**
   * Freezes the current version into an immutable snapshot in
   * course.versions[oldVersion] and bumps currentVersion by one step (v1.0 ->
   * v2.0 -> v3.0 -> ... with no cap). course.modules/configuration
   * keep their content (the Admin has finished authoring) and from now on belong to the
   * NEW version — learners enrolled under oldVersion (whether completed or part-way
   * through) keep being served exactly the frozen snapshot, unaffected
   * by later edits on the new version.
   */
  const publishNewCourseVersion = useCallback((courseId, changeLog = '') => {
    setCourses((prev) => prev.map((c) => {
      if (c.id !== courseId) return c;
      const oldVersion = c.currentVersion || c.version || 'v1.0';
      const newVersion = nextMajorVersion(oldVersion);
      const snapshot = {
        version: oldVersion,
        publishedAt: c.publishedAt || todayIso(),
        archivedAt: todayIso(),
        updatedBy: currentUser?.fullName || 'L&D Administrator',
        changeLog: changeLog || `Version ${oldVersion} was frozen when ${newVersion} was published.`,
        modules: JSON.parse(JSON.stringify(c.modules)),
        configuration: JSON.parse(JSON.stringify(c.configuration)),
        modality: c.modality,
        format: c.format,
      };
      return {
        ...c,
        currentVersion: newVersion,
        version: newVersion,
        versions: { ...c.versions, [oldVersion]: snapshot },
        versionHistory: [
          { version: newVersion, updatedBy: currentUser?.fullName || 'L&D Administrator', updatedAt: todayIso(), note: changeLog || `Published version ${newVersion}.` },
          ...(c.versionHistory || []),
        ],
      };
    }));
  }, [currentUser]);

  /** A learner submits a request to study exactly one grade above. */
  const requestLevelAdvanceApproval = useCallback(
    (course, justification = '', user = currentUser) => {
      if (!user || !course) return { ok: false, reason: 'Missing learner or course information.' };
      const access = accessFor(course, user);
      if (!access.requiresApproval) {
        return { ok: false, reason: access.reason || 'This course is not eligible for a level skip request.', access };
      }

      // The approver is always the User Admin / System Admin for EVERY requester
      // (Learner, Manager, Trainer/L&D and HRBP all request level skips for themselves
      // and they all go to the same queue) — no longer following the next role up
      // as before, because Manager/Trainer/HRBP no longer have approval rights.
      const requesterRole = normalizeRole(user.role);
      const request = {
        id: `req-lvl-${Date.now()}`,
        requestType: 'LEVEL_ADVANCE',
        userId: user.userId,
        employeeId: user.employeeCode,
        employeeName: user.fullName,
        position: user.position,
        department: `${user.departmentCode || ''} - ${user.departmentName || ''}`.replace(/^ - /, ''),
        currentLevel: access.userLevel,
        courseLevel: access.courseLevel,
        courseId: course.id,
        courseName: course.title,
        requesterRole,
        requestDate: todayIso(),
        justification:
          justification.trim() ||
          `Requesting approval to study up to Level ${access.courseLevel} in preparation for promotion.`,
        courseCost: course.modality === 'EXTERNAL_PLATFORM' ? 'Included in enterprise license package' : 'Internal MMVN complimentary',
        status: 'PENDING',
      };

      // Resubmitting after a rejection: replaces the old request for that same course.
      setApprovals((prev) => [
        request,
        ...prev.filter((a) => !(a.courseId === course.id && (a.userId === user.userId || a.employeeId === user.employeeCode))),
      ]);
      return { ok: true, request };
    },
    [currentUser, accessFor]
  );

  /**
   * The HRBP (or line manager) sends the User Admin a curriculum allocation proposal for an employee/sub-department.
   */
  const proposeCurriculumAssignment = useCallback(
    (curriculumId, assignmentData, justification = '') => {
      const cur = curricula.find((c) => c.id === curriculumId);
      if (!cur) return { ok: false, reason: 'Curriculum not found.' };

      const userRole = normalizeRole(currentUser?.role);
      const canManage = hasCapability(userRole, 'canManageCurriculum');
      const canPropose = hasCapability(userRole, 'canProposeCurriculum');
      if (!canManage && !canPropose) {
        return { ok: false, reason: 'You do not have permission to propose a curriculum allocation.' };
      }

      const request = {
        id: `req-curric-${Date.now()}`,
        requestType: 'CURRICULUM_ASSIGNMENT',
        curriculumId: cur.id,
        curriculumTitle: cur.title,
        assignmentType: assignmentData.assignmentType || 'USER',
        targetId: assignmentData.targetId,
        targetLabel: assignmentData.targetLabel || assignmentData.targetId,
        dueDate: assignmentData.dueDate || '',
        requesterId: currentUser?.userId,
        requesterName: currentUser?.fullName || 'HRBP',
        requesterRole: currentUser?.role || 'hrbp',
        requestDate: todayIso(),
        justification:
          justification.trim() ||
          `HRBP ${currentUser?.fullName || 'Lê Thị Mai'} proposes allocating the curriculum "${cur.title}" to ${assignmentData.targetLabel || assignmentData.targetId} to raise the required competency.`,
        status: 'PENDING',
      };

      setApprovals((prev) => {
        const filtered = prev.filter(
          (a) =>
            !(
              a.requestType === 'CURRICULUM_ASSIGNMENT' &&
              a.status === 'PENDING' &&
              a.curriculumId === cur.id &&
              a.targetId === assignmentData.targetId
            )
        );
        return [request, ...filtered];
      });
      return { ok: true, request };
    },
    [curricula, currentUser]
  );

  /**
   * User Admin / Manager approves a request:
   * - CURRICULUM_ASSIGNMENT: officially allocate the curriculum to the learner/unit
   * - ROADMAP_PROMOTION: promote along the roadmap
   * - LEVEL_ADVANCE: unlock and enroll in the above-level course
   */
  const approveRequest = useCallback(
    (reqId) => {
      const target = approvals.find((r) => r.id === reqId);

      setApprovals((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: 'APPROVED', decidedAt: todayIso() } : r))
      );

      if (!target) return;

      // A curriculum allocation proposal from HRBP approved by the User Admin:
      if (target.requestType === 'CURRICULUM_ASSIGNMENT') {
        assignCurriculum(target.curriculumId, {
          assignmentType: target.assignmentType,
          targetId: target.targetId,
          targetLabel: target.targetLabel,
          dueDate: target.dueDate,
          proposedBy: target.requesterId,
          sourceRequestId: target.id,
        });
        return;
      }

      // A promotion review nomination (Tab 2, the succession roadmap) is not tied to
      // one specific course like LEVEL_ADVANCE — approving it actually promotes
      // the learner right away, reusing the existing promoteUserLevel.
      if (target.requestType === 'ROADMAP_PROMOTION') {
        if (target.targetLevel) promoteUserLevel(target.userId, target.targetLevel, target.justification);
        return;
      }

      const course = courses.find((c) => c.id === target.courseId);
      const learnerId = target.userId;
      if (!learnerId || !course) return;
      setEnrollments((prev) => {
        const forUser = prev[learnerId] || {};
        if (forUser[course.id]) return prev;
        return {
          ...prev,
          [learnerId]: {
            ...forUser,
            [course.id]: {
              courseId: course.id,
              userId: learnerId,
              courseType: course.courseType,
              enrolledVersion: course.currentVersion || course.version || 'v1.0',
              status: 'NOT_STARTED',
              progressPercent: 0,
              score: null,
              attemptsCount: 0,
              completedAt: null,
              dueDate: course.assignment?.dueDate || null,
              lastLessonTitle: course.modules?.[0]?.lessons?.[0]?.title || null,
              lastActivityAt: todayIso(),
              enrolledVia: 'LEVEL_ADVANCE_APPROVAL',
            },
          },
        };
      });
    },
    [approvals, courses, promoteUserLevel, assignCurriculum]
  );

  const getUserRoadmapTabs = useCallback(
    (user = currentUser) => computeUserRoadmapTabs(user, roadmapsConfig, enrollments, courses),
    [roadmapsConfig, enrollments, courses, currentUser]
  );

  /**
   * Saves (creates / edits) the course list of exactly one Scope Key. If the
   * scope already exists and the list genuinely changed, the current version is frozen
   * and bumped to a new version (v1.0 -> v2.0 -> ...) — learners who completed
   * or are part-way through keep seeing the version they started (see
   * resolveUserRoadmapVersion in roadmapScopeMatrix.js); only learners who have
   * never touched this roadmap see the new version.
   */
  const publishRoadmapScopeAction = useCallback(
    (scopeKey, courseIds, note = '') =>
      setRoadmapsConfig((prev) =>
        publishRoadmapScope(prev, scopeKey, courseIds, { updatedBy: currentUser?.fullName || 'Admin', updatedAt: todayIso(), note })
      ),
    [currentUser]
  );

  /**
   * Submit a promotion review nomination: the learner has completed 100% of Tab 1
   * (current roadmap) AND 100% of Tab 2 (succession roadmap) — this files one
   * ROADMAP_PROMOTION request into the same approvals queue as LEVEL_ADVANCE, which only
   * User Admin/System Admin can see & approve (canApproveLevelSkip).
   */
  const requestRoadmapPromotion = useCallback(
    (user = currentUser) => {
      const roadmap = computeUserRoadmapTabs(user, roadmapsConfig, enrollments, courses);
      if (!roadmap.readyForPromotion) {
        return { ok: false, reason: 'The current roadmap and the succession roadmap are not 100% complete.' };
      }
      const request = {
        id: `req-roadmap-${Date.now()}`,
        requestType: 'ROADMAP_PROMOTION',
        userId: user.userId,
        employeeId: user.employeeCode,
        employeeName: user.fullName,
        position: user.position,
        department: `${user.departmentCode || ''} - ${user.departmentName || ''}`.replace(/^ - /, ''),
        currentLevel: roadmap.level,
        targetLevel: roadmap.nextLevel,
        requestDate: todayIso(),
        justification: '100% of the current roadmap and the succession roadmap are complete (Tab 1 & Tab 2).',
        status: 'PENDING',
      };
      setApprovals((prev) => [
        request,
        ...prev.filter((a) => !(a.requestType === 'ROADMAP_PROMOTION' && a.userId === user.userId)),
      ]);
      return { ok: true, request };
    },
    [roadmapsConfig, enrollments, courses, currentUser]
  );

  const rejectRequest = useCallback((reqId, note = '') => {
    setApprovals((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'REJECTED', decidedAt: todayIso(), decisionNote: note } : r))
    );
  }, []);

  /**
   * Level skip requests, roadmap promotions and curriculum allocation proposals that `approver` may handle.
   * Only User Admin and System Admin hold the `canApproveLevelSkip` capability and see the ENTIRE queue.
   */
  const levelAdvanceRequestsFor = useCallback(
    (approver = currentUser) => {
      const approverRole = normalizeRole(approver?.role);
      if (!approver || !hasCapability(approverRole, 'canApproveLevelSkip')) return [];
      return approvals.filter((a) =>
        a.requestType === 'LEVEL_ADVANCE' ||
        a.requestType === 'ROADMAP_PROMOTION' ||
        a.requestType === 'CURRICULUM_ASSIGNMENT'
      );
    },
    [approvals, currentUser]
  );

  /** Curriculum allocation proposals submitted by `user` (so the HRBP can track approval progress). */
  const myCurriculumProposals = useCallback(
    (user = currentUser) => {
      const uid = user?.userId;
      if (!uid) return [];
      return approvals.filter(
        (a) => a.requestType === 'CURRICULUM_ASSIGNMENT' && a.requesterId === uid
      );
    },
    [approvals, currentUser]
  );

  /** "My Courses" already merges enrollments, curriculum courses and courses allocated directly / by group by the Admin/HRBP. */
  const myCourses = useCallback(
    (courseList = courses, user = currentUser) => {
      const base = myLearningCourses(courseList, user, enrollments);
      const baseIds = new Set(base.map((c) => c.id));
      const assignedCurricula = getAssignedCurriculaForUser(curricula, user);

      const curriculumMap = {};
      assignedCurricula.forEach((cur) => {
        (cur.courseIds || []).forEach((cId) => {
          curriculumMap[cId] = {
            curriculumId: cur.id,
            curriculumTitle: cur.title,
            curriculumDueDate: cur.assignedVia?.dueDate,
          };
        });
      });

      // Scan every course allocated by custom group
      const groupAssignmentMap = {};
      (courseList || []).forEach((c) => {
        const asgList = c.assignments || (c.assignment ? [c.assignment] : []);
        for (const a of asgList) {
          if (a.assignmentType === 'GROUP') {
            const grp = customGroups.find((g) => g.id === a.targetId);
            if (grp) {
              let eligible = true;
              if (a.groupPolicy === 'ELIGIBLE_ONLY') {
                const evalRes = evaluateUserEligibilityForCourse(user, c);
                if (!evalRes.isEligible && evalRes.matchType !== 'GAP_ONE_STEP') {
                  eligible = false;
                }
              }
              if (eligible && isUserInCustomGroup(user, grp, users)) {
                groupAssignmentMap[c.id] = {
                  assignment: a,
                  dueDate: a.dueDate,
                  assignedAt: a.assignedAt,
                };
                break;
              }
            }
          }
        }
      });

      // Add curriculum and group-allocation information to courses already in the base
      const enrichedBase = base.map((c) => {
        const curMeta = curriculumMap[c.id];
        const grpMeta = groupAssignmentMap[c.id];

        if (curMeta || grpMeta) {
          const effectiveDueDate = grpMeta?.dueDate || curMeta?.curriculumDueDate || c.enrollment?.dueDate;
          return {
            ...c,
            courseType: 'MANDATORY',
            isCurriculum: Boolean(curMeta),
            curriculumId: curMeta?.curriculumId,
            curriculumTitle: curMeta?.curriculumTitle,
            curriculumDueDate: curMeta?.curriculumDueDate,
            isDirectlyAssigned: Boolean(grpMeta) || c.isDirectlyAssigned,
            assignment: grpMeta?.assignment || c.assignment,
            enrollment: {
              ...(c.enrollment || {}),
              isMandatory: true,
              dueDate: effectiveDueDate,
            },
          };
        }
        return c;
      });

      // Also auto-assign curriculum and group-allocated courses that are missing from the base
      const extraCourses = [];

      // From a curriculum
      Object.entries(curriculumMap).forEach(([cId, meta]) => {
        if (!baseIds.has(cId) && !groupAssignmentMap[cId]) {
          const raw = courseList.find((c) => c.id === cId);
          if (raw) {
            extraCourses.push({
              ...raw,
              courseType: 'MANDATORY',
              isCurriculum: true,
              curriculumId: meta.curriculumId,
              curriculumTitle: meta.curriculumTitle,
              curriculumDueDate: meta.curriculumDueDate,
              enrollment: {
                status: 'NOT_STARTED',
                progressPercent: 0,
                score: null,
                isMandatory: true,
                dueDate: meta.curriculumDueDate,
                enrolledAt: new Date().toISOString().slice(0, 10),
                enrolledVersion: raw.currentVersion || 'v1.0',
                enrolledVia: 'MANDATORY_ASSIGNMENT',
              },
            });
            baseIds.add(cId);
          }
        }
      });

      // From a group allocation (Custom Group)
      Object.entries(groupAssignmentMap).forEach(([cId, meta]) => {
        if (!baseIds.has(cId)) {
          const raw = courseList.find((c) => c.id === cId);
          if (raw) {
            extraCourses.push({
              ...raw,
              courseType: 'MANDATORY',
              isDirectlyAssigned: true,
              assignment: meta.assignment,
              enrollment: {
                status: 'NOT_STARTED',
                progressPercent: 0,
                score: null,
                isMandatory: true,
                dueDate: meta.dueDate || null,
                enrolledAt: meta.assignedAt || new Date().toISOString().slice(0, 10),
                enrolledVersion: raw.currentVersion || 'v1.0',
                enrolledVia: 'MANDATORY_ASSIGNMENT',
              },
            });
            baseIds.add(cId);
          }
        }
      });

      return [...enrichedBase, ...extraCourses];
    },
    [courses, currentUser, enrollments, curricula, customGroups, users]
  );

  const myEnrollments = useMemo(() => enrollmentsForUser(currentUser, enrollments), [currentUser, enrollments]);

  // Classrooms action: Register, Batch Enroll or Check-in via QR
  const checkInClassroom = useCallback((sessionId) => {
    setClassrooms((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, attendanceStatus: 'CHECKED_IN', isEnrolled: true }
          : s
      )
    );
  }, []);

  const enrollClassroom = useCallback((sessionId) => {
    setClassrooms((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              isEnrolled: true,
              enrolledCount: s.enrolledCount + 1,
              attendanceStatus: 'PENDING_CHECKIN',
            }
          : s
      )
    );
  }, []);

  const batchEnrollStudents = useCallback((sessionId, studentList) => {
    setClassrooms((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const currentList = s.enrolledStudents || [];
          return {
            ...s,
            enrolledCount: currentList.length + studentList.length,
            enrolledStudents: [...currentList, ...studentList],
          };
        }
        return s;
      })
    );
  }, []);

  /** The User Admin assigns a trainer to teach an in-person course. */
  const assignTrainerToCourse = useCallback((courseId, trainer, schedule = {}) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? {
              ...c,
              trainerId: trainer.id || trainer.userId,
              trainerName: trainer.name || trainer.fullName,
              venue: schedule.venue ?? c.venue,
              venueId: schedule.venueId ?? c.venueId,
              scheduleDate: schedule.scheduleDate ?? c.scheduleDate,
              scheduleTime: schedule.scheduleTime ?? c.scheduleTime,
              assignedBy: schedule.assignedBy || 'User Admin',
              assignedAt: todayIso(),
            }
          : c
      )
    );
  }, []);

  // Action Plans
  const createActionPlan = useCallback((newPlan) => {
    setActionPlans((prev) => [newPlan, ...prev]);
  }, []);

  const updateActionPlan = useCallback((planId, patch) => {
    setActionPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, ...patch } : p))
    );
  }, []);

  // Customized User Groups Methods
  const addCustomGroup = useCallback((group) => {
    const newId = group.id || `grp-${Date.now()}`;
    const code = group.code || `GRP-${Date.now().toString().slice(-4)}`;
    const newGroup = {
      ...group,
      id: newId,
      code,
      title: group.title || group.name || 'New Group',
      name: group.name || group.title || 'New Group',
      description: group.description || '',
      type: group.type || 'DYNAMIC',
      criteria: group.criteria || {},
      memberUserIds: group.memberUserIds || [],
      memberCount: group.memberUserIds ? group.memberUserIds.length : (group.memberCount || 0),
      createdAt: new Date().toISOString(),
      lastProcessed: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString(),
      createdBy: currentUser ? `${currentUser.userId} (${currentUser.fullName})` : 'User Admin',
      badgeColor: group.badgeColor || '#0EA5E9',
    };
    setCustomGroups((prev) => [newGroup, ...prev]);
    return newGroup;
  }, [currentUser]);

  const updateCustomGroup = useCallback((groupId, patch) => {
    setCustomGroups((prev) => prev.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          ...patch,
          memberCount: patch.memberUserIds ? patch.memberUserIds.length : (patch.memberCount !== undefined ? patch.memberCount : g.memberCount),
          lastProcessed: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString(),
        };
      }
      return g;
    }));
  }, []);

  const deleteCustomGroup = useCallback((groupId) => {
    setCustomGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const duplicateCustomGroup = useCallback((groupId) => {
    const existing = customGroups.find((g) => g.id === groupId);
    if (!existing) return null;
    const dup = {
      ...existing,
      id: `grp-${Date.now()}`,
      code: `${existing.code}_COPY`,
      title: `${existing.title} (Copy)`,
      name: `${existing.name || existing.title} (Copy)`,
      createdAt: new Date().toISOString(),
      lastProcessed: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString(),
      createdBy: currentUser ? `${currentUser.userId} (${currentUser.fullName})` : 'User Admin',
    };
    setCustomGroups((prev) => [dup, ...prev]);
    return dup;
  }, [customGroups, currentUser]);

  /** Adds an Area / Category to the custom-group catalog */
  const addCustomGroupCategory = useCallback((label) => {
    const clean = String(label || '').trim();
    if (!clean) return { ok: false, reason: 'EMPTY' };
    const nameTaken = customGroupCategories.some(
      (c) => c.label.trim().toLowerCase() === clean.toLowerCase()
    );
    if (nameTaken) return { ok: false, reason: 'DUPLICATE' };
    // Two different names can fold to the same slug (or to none at all), so the id is
    // only a starting point — it gets a suffix until it is free.
    const base = groupCategoryId(clean) || `CATEGORY_${Date.now()}`;
    let id = base;
    let suffix = 2;
    while (customGroupCategories.some((c) => c.id === id)) {
      id = `${base}_${suffix}`;
      suffix += 1;
    }
    const created = { id, label: clean };
    setCustomGroupCategories((prev) => [...prev, created]);
    return { ok: true, category: created };
  }, [customGroupCategories]);

  /** Renames a category — groups keep pointing at the same id */
  const updateCustomGroupCategory = useCallback((categoryId, label) => {
    const clean = String(label || '').trim();
    if (!clean) return { ok: false, reason: 'EMPTY' };
    const clash = customGroupCategories.some(
      (c) => c.id !== categoryId && c.label.trim().toLowerCase() === clean.toLowerCase()
    );
    if (clash) return { ok: false, reason: 'DUPLICATE' };
    setCustomGroupCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, label: clean } : c)));
    return { ok: true };
  }, [customGroupCategories]);

  /** Removes a category and moves the groups that used it to the first remaining one */
  const deleteCustomGroupCategory = useCallback((categoryId) => {
    const next = customGroupCategories.filter((c) => c.id !== categoryId);
    if (next.length === customGroupCategories.length) return { ok: false, reason: 'NOT_FOUND' };
    if (next.length === 0) return { ok: false, reason: 'LAST_ONE' };
    const fallbackId = next[0].id;
    setCustomGroupCategories(next);
    setCustomGroups((prev) => prev.map((g) => (g.category === categoryId ? { ...g, category: fallbackId } : g)));
    return { ok: true, movedTo: fallbackId };
  }, [customGroupCategories]);

  const getGroupMembers = useCallback((groupId) => {
    const group = customGroups.find((g) => g.id === groupId);
    if (!group) return [];
    return resolveGroupMembers(group, users);
  }, [customGroups, users]);

  const isUserInGroup = useCallback((userId, groupId) => {
    const user = users.find((u) => u.userId === userId || u.employeeCode === userId);
    const group = customGroups.find((g) => g.id === groupId);
    if (!user || !group) return false;
    return isUserInCustomGroup(user, group, users);
  }, [users, customGroups]);

  // Talent Profile Modal
  const openTalentProfile = useCallback((user) => {
    setTalentProfileUser(user || currentUser);
  }, [currentUser]);

  const closeTalentProfile = useCallback(() => {
    setTalentProfileUser(null);
  }, []);

  // Survey Modal (L1 / L3)
  const openSurveyModal = useCallback((course, type = 'L1', learner = null) => {
    setSurveyModalConfig({ isOpen: true, course, type, learner });
  }, []);

  const closeSurveyModal = useCallback(() => {
    setSurveyModalConfig({ isOpen: false, course: null, type: 'L1', learner: null });
  }, []);

  // AI assistant helpers
  const openAiAssistant = useCallback((tab = 'tutor') => {
    setActiveAiTab(tab);
    setAiDrawerOpen(true);
  }, []);

  const closeAiAssistant = useCallback(() => {
    setAiDrawerOpen(false);
  }, []);

  return (
    <CourseStoreContext.Provider
      value={{
        currentUser,
        role,
        isAuthenticated,
        login,
        logout,
        switchUser,
        demoUsers,
        users,
        setUsers,
        addUser,
        updateUser,
        deleteUser,
        importUsers,
        promoteUserLevel,
        businessUnits,
        setBusinessUnits,
        addBusinessUnit,
        updateBusinessUnit,
        deleteBusinessUnit,
        divisions,
        setDivisions,
        addDivision,
        updateDivision,
        deleteDivision,
        departments,
        setDepartments,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        subDepartments,
        setSubDepartments,
        addSubDepartment,
        updateSubDepartment,
        deleteSubDepartment,
        jobLevels,
        setJobLevels,
        addJobLevel,
        updateJobLevel,
        deleteJobLevel,
        customGroups,
        setCustomGroups,
        customGroupCategories,
        addCustomGroupCategory,
        updateCustomGroupCategory,
        deleteCustomGroupCategory,
        addCustomGroup,
        updateCustomGroup,
        deleteCustomGroup,
        duplicateCustomGroup,
        getGroupMembers,
        isUserInGroup,
        courses,
        addCourse,
        updateCourse,
        removeCourse,
        assignCourse,
        removeCourseAssignment,
        saveCourseProgress,
        publishNewCourseVersion,
        assignTrainerToCourse,
        classrooms,
        checkInClassroom,
        enrollClassroom,
        batchEnrollStudents,
        approvals,
        approveRequest,
        rejectRequest,
        levelAdvanceRequestsFor,
        requestLevelAdvanceApproval,
        roadmapsConfig,
        getUserRoadmapTabs,
        publishRoadmapScope: publishRoadmapScopeAction,
        requestRoadmapPromotion,
        curricula,
        addCurriculum,
        updateCurriculum,
        deleteCurriculum,
        libraries,
        addLibrary,
        updateLibrary,
        deleteLibrary,
        certificateTemplates,
        addCertificateTemplate,
        updateCertificateTemplate,
        deleteCertificateTemplate,
        assignCurriculum,
        proposeCurriculumAssignment,
        removeCurriculumAssignment,
        myCurriculumProposals,
        assessments,
        addAssessment,
        updateAssessment,
        deleteAssessment,
        assignAssessmentTarget,
        removeAssessmentTarget,
        questionBanks,
        addQuestionToBank,
        assessmentAttempts,
        recordAssessmentAttempt,
        assessmentRegistrations,
        enrollAssessment,
        isAssessmentRegistered,
        companyCategories,
        companyCategoryObjects,
        addCompanyCategory,
        updateCompanyCategory,
        renameCompanyCategory,
        deleteCompanyCategory,
        getCategoryMeta: (name) => getCategoryMetadata(name, companyCategoryObjects),
        accessFor,
        enrollCourse,
        // Cost Center
        costCenters,
        costLedger,
        costReport,
        updateCoursePricing,
        recordCostTransaction,
        enrollments,
        myEnrollments,
        myCourses,
        approvedCourseIds: myRequestBuckets.approvedCourseIds,
        pendingCourseIds: myRequestBuckets.pendingCourseIds,
        rejectedCourseIds: myRequestBuckets.rejectedCourseIds,
        actionPlans,
        createActionPlan,
        updateActionPlan,
        interventions,
        addInterventionRequest,
        updateInterventionStatus,
        cancelIntervention,
        successionTalents,
        addSuccessionTalent,
        updateSuccessionTalent,
        successionAlignments,
        saveSuccessionAlignment,
        complianceNudges,
        sendComplianceNudge,
        gamification,
        aiDrawerOpen,
        activeAiTab,
        openAiAssistant,
        closeAiAssistant,
        talentProfileUser,
        openTalentProfile,
        closeTalentProfile,
        surveyModalConfig,
        openSurveyModal,
        closeSurveyModal,
        theme,
        toggleTheme,
        setTheme,
        language,
        toggleLanguage,
        setLanguage,
        t,
        tDomain: (d) => translateDomain(d, language),
        tStatus: (s) => translateStatus(s, language),
        tDelivery: (del) => translateDelivery(del, language),
        localizeCourse: (c) => getLocalizedCourse(c, language),
      }}
    >
      {children}
    </CourseStoreContext.Provider>
  );
}

export function useCourseStore() {
  const ctx = useContext(CourseStoreContext);
  if (!ctx) throw new Error('useCourseStore must be used within a CourseStoreProvider');
  return ctx;
}

export default CourseStoreProvider;
