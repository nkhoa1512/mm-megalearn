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
} from '../data/mockData';
import { checkCourseAccessRule, ACCESS_STATE, normalizeLevel } from '../data/levelSystem';
import { normalizeRole, hasCapability } from '../data/roles';
import { SCOPE_ROADMAP_MATRIX, computeUserRoadmapTabs } from '../data/levelRoadmapMatrix';
import { publishRoadmapScope } from '../data/roadmapScopeMatrix';
import { translate, translateDomain, translateStatus, translateDelivery, getLocalizedCourse } from '../data/i18n';
import { curricula as initialCurricula } from '../data/mockData';
import { DEFAULT_COMPANY_CATEGORIES } from '../utils/courseCatalog';
import { getAssignedCurriculaForUser } from '../utils/curriculumAssignment';
import { INITIAL_ASSESSMENTS, QUESTION_BANK, INITIAL_ASSESSMENT_ATTEMPTS } from '../data/assessmentData';

// v6: thang 7 cấp bậc đảo ngược + mô hình 6 role. Bump key để bỏ cache v5 cũ
// (role `admin` và level 1-5 của bản trước sẽ không còn hợp lệ).
const AUTH_KEY = 'mm-megalearn-auth-v6';
const STORAGE_KEY = 'mm-megalearn-courses-v6';
const CLASSROOM_KEY = 'mm-megalearn-classrooms-v6';
const APPROVAL_KEY = 'mm-megalearn-approvals-v6';
const GAMIFICATION_KEY = 'mm-megalearn-gamification-v6';
const ACTION_PLAN_KEY = 'mm-megalearn-actionplans-v6';
const ENROLLMENT_KEY = 'mm-megalearn-enrollments-v6';
const USERS_KEY = 'mm-megalearn-users-v7';
// v7: cấu hình lộ trình chuyển từ ma trận Level x Branch phẳng sang Scope Key
// đa tầng (BU -> Division -> Department -> Sub-Department x Level). Bump key
// để không nạp nhầm shape cũ từ localStorage.
const ROADMAP_KEY = 'mm-megalearn-roadmaps-v7';
// Curriculum (Curriculum -> Courses -> Modules -> Lessons) và danh mục lĩnh
// vực công ty (Category) do System Admin quản lý — hai domain mới, chưa từng
// tồn tại trước bản Catalog 5-Phân-Hệ này.
const CURRICULUM_KEY = 'mm-megalearn-curriculum-v2';
const CATEGORY_KEY = 'mm-megalearn-categories-v1';
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
const JOBLEVELS_KEY = 'mm-megalearn-joblevels-v3';
const THEME_KEY = 'mm-megalearn-theme';
const LANG_KEY = 'mm-megalearn-lang';

export const DEFAULT_INTERVENTIONS = [
  {
    id: 'ITV-2026-001',
    unit: 'Quầy Bánh & Tươi Sống (MM An Phú)',
    departmentCode: 'PPF',
    skill: 'HACCP & Cold-Chain Storage Protocols',
    courseId: 'CRS-FSH-001',
    courseTitle: 'Food Safety & Hygiene Standards (HACCP)',
    urgency: 'HIGH',
    impact: 'Tỷ lệ hao hụt quầy bánh tăng 3.2% trong tháng 7. Cần mở lớp thực hành kỹ năng chuẩn hóa quy trình.',
    requestedBy: 'Le Thi Mai (HRBP)',
    requesterRole: 'hrbp',
    requestedAt: '2026-08-20',
    status: 'PENDING_REVIEW', // PENDING_REVIEW | SCHEDULED | COMPLETED | CANCELLED
    scheduledDate: null,
    trainerName: 'Nguyen Van Hung (Master Trainer)',
  },
  {
    id: 'ITV-2026-002',
    unit: 'Bộ Phận Thu Ngân & Dịch Vụ Khách Hàng (MM Bình Phú)',
    departmentCode: 'FE',
    skill: 'Cash Handling, POS Speed & Shrinkage Control',
    courseId: 'CRS-CSERV-087',
    courseTitle: 'Service Mindset & Cashier POS Fast Operation',
    urgency: 'MEDIUM',
    impact: 'Thời gian thanh toán trung bình tăng 15s/giao dịch trong giờ cao điểm.',
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
    currentRole: 'Trưởng Quầy Tươi Sống',
    store: 'MM An Phú',
    storeId: 'store-an-phu',
    targetRole: 'Phó Giám Đốc Siêu Thị (Deputy SGM)',
    readiness: 'READY_NOW',
    readinessLabel: 'Sẵn Sàng Ngay',
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
    currentRole: 'Chuyên viên Bánh Mì Tuyến Đầu',
    store: 'MM An Phú',
    storeId: 'store-an-phu',
    targetRole: 'Trưởng Bộ Phận Bánh Mì & Thực Phẩm Chế Biến',
    readiness: 'READY_IN_6_MONTHS',
    readinessLabel: 'Sẵn Sàng trong 6 Tháng',
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
    store: 'MM An Phú',
    storeId: 'store-an-phu',
    targetRole: 'Trưởng Nhóm Kỹ Thuật Bánh Tươi',
    readiness: 'READY_1_YEAR',
    readinessLabel: 'Sẵn Sàng trong 1 Năm',
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
    currentRole: 'Trưởng Ca Dịch Vụ Thu Ngân',
    store: 'MM Bình Phú',
    storeId: 'store-binh-phu',
    targetRole: 'Trưởng Phòng Dịch Vụ Khách Hàng',
    readiness: 'READY_NOW',
    readinessLabel: 'Sẵn Sàng Ngay',
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
    currentRole: 'Giám Sát Kiểm Soát Hao Hụt (QA)',
    store: 'MM Thăng Long',
    storeId: 'store-thang-long',
    targetRole: 'Trưởng Bộ Phận QA & An Toàn Thực Phẩm Miền Bắc',
    readiness: 'READY_NOW',
    readinessLabel: 'Sẵn Sàng Ngay',
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
    targetRole: 'Trưởng Bộ Phận Bánh Mì & Thực Phẩm Chế Biến',
    mentorName: 'Trần Minh Quang (SGM)',
    managerName: 'David Tran',
    ojt70Progress: 80,
    mentoring20Progress: 75,
    course10Progress: 70,
    readiness: 'READY_IN_6_MONTHS',
    notes: 'Ứng viên nắm vững kỹ thuật nướng bánh Artisan, đang kèm cặp 2 nhân viên mới. Cần thêm 10 giờ thực hành quản trị ca đêm.',
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

// Hồ sơ đăng nhập lưu trong localStorage có thể còn role/level của bản cũ hoặc thiếu subDepartment.
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

  // Ghi danh phát sinh trong phiên: { [userId]: { [courseId]: enrollment } }.
  // Chồng lên ma trận ghi danh tĩnh của HRIS.
  const [enrollments, setEnrollments] = useState(() => loadItem(ENROLLMENT_KEY, {}));

  // Cấu hình Lộ trình Cấp bậc (Tab 1 "Hiện tại" / Tab 2 "Kế cận" tra cứu chéo
  // từ đây) — chỉ User Admin/SysAdmin sửa (UI gate), mọi role đọc.
  const [roadmapsConfig, setRoadmapsConfig] = useState(() => loadItem(ROADMAP_KEY, SCOPE_ROADMAP_MATRIX));

  // Giáo trình (Curriculum): tập hợp nhiều khóa E-Learning tự học theo cấu
  // trúc Curriculum -> Courses -> Modules -> Lessons (chỉ tham chiếu courseIds,
  // không sao chép lại module/lesson).
  const [curricula, setCurricula] = useState(() => loadItem(CURRICULUM_KEY, initialCurricula));

  // Danh mục Lĩnh Vực Công Ty (Category): danh sách chuẩn, System Admin có thể
  // xem toàn bộ & thêm mới từ System Configuration — không giới hạn số lượng.
  const [companyCategories, setCompanyCategories] = useState(() => loadItem(CATEGORY_KEY, DEFAULT_COMPANY_CATEGORIES));

  // Enterprise Org Hierarchy & Job Levels States (BU, Division, Department, Sub-Department, Job Levels)
  const [businessUnits, setBusinessUnits] = useState(() => loadItem(BU_KEY, initialBusinessUnits));
  const [divisions, setDivisions] = useState(() => loadItem(DIV_KEY, initialDivisions));
  const [departments, setDepartments] = useState(() => loadItem(DEPT_KEY, initialDepartments));
  const [subDepartments, setSubDepartments] = useState(() => loadItem(SUBDEPT_KEY, initialSubDepartments));
  const [jobLevels, setJobLevels] = useState(() => loadItem(JOBLEVELS_KEY, initialJobLevels));

  // HRBP Strategic Operations states (Interventions, Succession, 1-on-1 Alignments, Compliance Nudges)
  const [interventions, setInterventions] = useState(() => loadItem(INTERVENTION_KEY, DEFAULT_INTERVENTIONS));
  const [successionTalents, setSuccessionTalents] = useState(() => loadItem(SUCCESSION_KEY, DEFAULT_SUCCESSION_TALENTS));
  const [successionAlignments, setSuccessionAlignments] = useState(() => loadItem(ALIGNMENT_KEY, DEFAULT_ALIGNMENTS));
  const [complianceNudges, setComplianceNudges] = useState(() => loadItem(COMPLIANCE_NUDGES_KEY, []));

  // Enterprise Assessment system (Quiz, Assignment, Survey, Question Bank, Attempts)
  const [assessments, setAssessments] = useState(() => loadItem(ASSESSMENT_KEY, INITIAL_ASSESSMENTS));
  const [questionBanks, setQuestionBanks] = useState(() => loadItem(QUESTION_BANK_KEY, QUESTION_BANK));
  const [assessmentAttempts, setAssessmentAttempts] = useState(() => loadItem(ATTEMPT_KEY, INITIAL_ASSESSMENT_ATTEMPTS));

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
      localStorage.setItem(ROADMAP_KEY, JSON.stringify(roadmapsConfig));
      localStorage.setItem(CURRICULUM_KEY, JSON.stringify(curricula));
      localStorage.setItem(CATEGORY_KEY, JSON.stringify(companyCategories));
      localStorage.setItem(BU_KEY, JSON.stringify(businessUnits));
      localStorage.setItem(DIV_KEY, JSON.stringify(divisions));
      localStorage.setItem(DEPT_KEY, JSON.stringify(departments));
      localStorage.setItem(SUBDEPT_KEY, JSON.stringify(subDepartments));
      localStorage.setItem(JOBLEVELS_KEY, JSON.stringify(jobLevels));
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
  }, [isAuthenticated, currentUser, users, courses, classrooms, approvals, gamification, actionPlans, enrollments, roadmapsConfig, curricula, companyCategories, interventions, successionTalents, successionAlignments, complianceNudges, assessments, questionBanks, assessmentAttempts, theme, language]);

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

  /** Thăng cấp bậc (Job Level Promotion) - Chỉ User Admin & SysAdmin được gọi */
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
              promotionReason: reason || 'Hoàn thành chương trình đào tạo & thẩm định năng lực đạt chuẩn.',
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

  /** Cập nhật thông tin nhân sự (User Master Data: Tên, Email, Chức danh, Phòng ban, Sub-Department, Role...) */
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

  /** Thêm nhân viên mới */
  const addUser = useCallback((newUser) => {
    const rawNum = Math.floor(1000 + Math.random() * 9000);
    const id = newUser.userId || `USR-${rawNum}`;
    const empCode = newUser.employeeCode || `MMVN-${rawNum}`;
    const created = {
      userId: id,
      employeeCode: empCode,
      fullName: newUser.fullName || 'Nhân Viên Mới',
      email: newUser.email || `employee_${rawNum}@mmvietnam.com`,
      position: newUser.position || newUser.title || 'Store Associate',
      title: newUser.title || newUser.position || 'Store Associate',
      level: normalizeLevel(newUser.level || '7'),
      levelTitle: levelTitle(normalizeLevel(newUser.level || '7')),
      role: normalizeRole(newUser.role || 'learner'),
      branch: newUser.branch || 'SUPPORTING',
      branchName: newUser.branchName || (newUser.branch === 'OPERATIONS' ? 'Siêu thị Vận hành' : 'Trụ sở Head Office'),
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
      description: newUser.description || 'Hồ sơ nhân sự MM Mega Market.',
      ...newUser,
    };
    setUsers((prev) => [created, ...prev]);
    return created;
  }, []);

  /** Xóa nhân sự khỏi danh mục */
  const deleteUser = useCallback((userId) => {
    setUsers((prev) => prev.filter((u) => u.userId !== userId && u.employeeCode !== userId));
    return { ok: true };
  }, []);

  /** Import hàng loạt nhân sự từ file CSV / JSON */
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
          fullName: incoming.fullName || 'Nhân Viên Mới',
          email: incoming.email || `${id.toLowerCase()}@mmvietnam.com`,
          position: incoming.position || incoming.title || 'Specialist',
          title: incoming.title || incoming.position || 'Specialist',
          level: normalizeLevel(incoming.level || '7'),
          levelTitle: levelTitle(normalizeLevel(incoming.level || '7')),
          role: normalizeRole(incoming.role || 'learner'),
          branch: incoming.branch || 'SUPPORTING',
          branchName: incoming.branchName || (incoming.branch === 'OPERATIONS' ? 'Siêu thị Vận hành' : 'Trụ sở Head Office'),
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
          storeName: incoming.storeName || (incoming.branch === 'OPERATIONS' ? incoming.divisionName || 'Siêu thị MM' : 'Head Office (An Phú)'),
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
      descVi: levelObj.descVi || 'Cấp bậc trong hệ thống MM Mega Market.',
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
          courseType: 'MANDATORY',
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

  const addCompanyCategory = useCallback((name) => {
    const clean = (name || '').trim();
    if (!clean) return;
    setCompanyCategories((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
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

  // -------------------------------------------------------------------------
  // Sequential Level Gate: đơn xin học vượt cấp & trạng thái truy cập khóa học
  // -------------------------------------------------------------------------

  const role = normalizeRole(currentUser?.role);

  /** Các khóa mà `user` đã được duyệt / đang chờ / bị từ chối học vượt. */
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

  /** Trạng thái truy cập của một khóa học với người đang đăng nhập. */
  const accessFor = useCallback(
    (course, user = currentUser) => {
      const buckets = user === currentUser ? myRequestBuckets : requestBuckets(user);
      return checkCourseAccessRule(course, user, buckets);
    },
    [currentUser, myRequestBuckets, requestBuckets]
  );

  /** Ghi danh khóa học cho người đang đăng nhập (chỉ khi quy tắc cấp bậc cho phép). */
  const enrollCourse = useCallback(
    (courseId, user = currentUser) => {
      if (!user) return { ok: false, reason: 'Chưa đăng nhập.' };
      const course = courses.find((c) => c.id === courseId);
      if (!course) return { ok: false, reason: 'Không tìm thấy khóa học.' };

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
              // Khóa chặt với phiên bản nội dung tại thời điểm ghi danh — nếu
              // Admin "Phát Hành Phiên Bản Mới" sau đó, học viên này vẫn tiếp
              // tục học/được tính điểm theo đúng cấu trúc bài giảng lúc ghi
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
      return { ok: true, access };
    },
    [courses, currentUser, accessFor]
  );

  /**
   * Lưu tiến độ học: cập nhật cả object khóa học (trạng thái từng bài) lẫn
   * overlay ghi danh của học viên, để mọi màn hình đọc ra cùng một con số.
   *
   * `enrolledVersion` (đa phiên bản): nếu học viên đang ở đúng phiên bản đang
   * sống của khóa học (hoặc không truyền), ghi thẳng vào course.modules như
   * trước giờ. Nếu học viên đang học dở một phiên bản CŨ đã bị "Phát Hành
   * Phiên Bản Mới" thay thế, CHỈ cập nhật snapshot đóng băng tương ứng trong
   * course.versions[enrolledVersion] — tuyệt đối không đụng vào course.modules
   * (đang thuộc phiên bản mới), tránh làm hỏng nội dung Admin đang biên soạn.
   */
  const saveCourseProgress = useCallback(
    (courseId, nextCourse, user = currentUser, enrolledVersion) => {
      setCourses((prev) => prev.map((c) => {
        if (c.id !== courseId) return c;
        const current = c.currentVersion || c.version || 'v1.0';
        // Ghi danh không có enrolledVersion (dữ liệu mẫu HRIS gốc, tạo trước
        // khi có tính năng đa phiên bản) mặc định là v1.0 — khớp với quy tắc
        // fallback trong resolveCourseView() ở mockData.js.
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
   * Đóng băng phiên bản hiện tại thành một snapshot bất biến trong
   * course.versions[oldVersion] rồi tăng currentVersion lên 1 bậc (v1.0 ->
   * v2.0 -> v3.0 -> ... không giới hạn số lần). course.modules/configuration
   * giữ nguyên nội dung (Admin đã biên soạn xong) và từ giờ thuộc về phiên
   * bản MỚI — học viên đã ghi danh dưới oldVersion (dù đã hoàn thành hay đang
   * học dở) tiếp tục được phục vụ đúng snapshot đã đóng băng, không bị ảnh
   * hưởng bởi các chỉnh sửa tiếp theo trên phiên bản mới.
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
        changeLog: changeLog || `Phiên bản ${oldVersion} được đóng băng khi phát hành ${newVersion}.`,
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
          { version: newVersion, updatedBy: currentUser?.fullName || 'L&D Administrator', updatedAt: todayIso(), note: changeLog || `Phát hành phiên bản ${newVersion}.` },
          ...(c.versionHistory || []),
        ],
      };
    }));
  }, [currentUser]);

  /** Học viên gửi đơn xin học vượt đúng 1 cấp liền kề. */
  const requestLevelAdvanceApproval = useCallback(
    (course, justification = '', user = currentUser) => {
      if (!user || !course) return { ok: false, reason: 'Thiếu thông tin học viên hoặc khóa học.' };
      const access = accessFor(course, user);
      if (!access.requiresApproval) {
        return { ok: false, reason: access.reason || 'Khóa học này không thuộc diện xin học vượt cấp.', access };
      }

      // Người duyệt cố định là User Admin / System Admin cho MỌI người gửi đơn
      // (Learner, Manager, Trainer/L&D, HRBP đều xin vượt cấp cho chính mình
      // và đều gửi tới cùng 1 hàng đợi) — không còn theo chuỗi role liền trên
      // như trước, vì Manager/Trainer/HRBP đã bị bỏ quyền duyệt.
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
          `Xin phê duyệt học vượt lên Level ${access.courseLevel} để chuẩn bị lộ trình thăng tiến.`,
        courseCost: course.modality === 'EXTERNAL_PLATFORM' ? 'Included in enterprise license package' : 'Internal MMVN complimentary',
        status: 'PENDING',
      };

      // Gửi lại sau khi bị từ chối: thay thế đơn cũ của đúng khóa học đó.
      setApprovals((prev) => [
        request,
        ...prev.filter((a) => !(a.courseId === course.id && (a.userId === user.userId || a.employeeId === user.employeeCode))),
      ]);
      return { ok: true, request };
    },
    [currentUser, accessFor]
  );

  /**
   * HRBP (hoặc Line Manager) gửi đơn đề xuất phân bổ Giáo trình cho nhân viên/bộ phận lên User Admin duyệt.
   */
  const proposeCurriculumAssignment = useCallback(
    (curriculumId, assignmentData, justification = '') => {
      const cur = curricula.find((c) => c.id === curriculumId);
      if (!cur) return { ok: false, reason: 'Không tìm thấy giáo trình.' };

      const userRole = normalizeRole(currentUser?.role);
      const canManage = hasCapability(userRole, 'canManageCurriculum');
      const canPropose = hasCapability(userRole, 'canProposeCurriculum');
      if (!canManage && !canPropose) {
        return { ok: false, reason: 'Bạn không có quyền đề xuất phân bổ giáo trình.' };
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
          `HRBP ${currentUser?.fullName || 'Lê Thị Mai'} đề xuất phân bổ Giáo trình "${cur.title}" cho ${assignmentData.targetLabel || assignmentData.targetId} nhằm nâng cao năng lực định biên.`,
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
   * User Admin / Manager duyệt đơn:
   * - CURRICULUM_ASSIGNMENT: gán giáo trình chính thức cho học viên/đơn vị
   * - ROADMAP_PROMOTION: thăng cấp lộ trình
   * - LEVEL_ADVANCE: mở khóa và ghi danh khóa học vượt cấp
   */
  const approveRequest = useCallback(
    (reqId) => {
      const target = approvals.find((r) => r.id === reqId);

      setApprovals((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: 'APPROVED', decidedAt: todayIso() } : r))
      );

      if (!target) return;

      // Đề xuất gán giáo trình từ HRBP được User Admin phê duyệt:
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

      // Đơn Đề xuất Đánh giá Thăng cấp (Tab 2 Lộ trình kế cận) không gắn với
      // 1 khóa học cụ thể như LEVEL_ADVANCE — duyệt xong là thăng cấp thật
      // cho học viên luôn, tái dùng promoteUserLevel đã có sẵn.
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
   * Lưu (Tạo mới / Chỉnh sửa) danh sách khóa học của đúng 1 Scope Key. Nếu
   * scope đã tồn tại và danh sách thực sự đổi, phiên bản hiện tại được đóng
   * băng và tăng lên phiên bản mới (v1.0 -> v2.0 -> ...) — học viên đã hoàn
   * thành/đang học dở tiếp tục thấy đúng phiên bản họ đã bắt đầu (xem
   * resolveUserRoadmapVersion trong roadmapScopeMatrix.js); chỉ học viên chưa
   * từng động vào lộ trình này mới thấy phiên bản mới.
   */
  const publishRoadmapScopeAction = useCallback(
    (scopeKey, courseIds, note = '') =>
      setRoadmapsConfig((prev) =>
        publishRoadmapScope(prev, scopeKey, courseIds, { updatedBy: currentUser?.fullName || 'Admin', updatedAt: todayIso(), note })
      ),
    [currentUser]
  );

  /**
   * Gửi Hồ Sơ Đề Xuất Đánh Giá Thăng Cấp: học viên đã hoàn thành 100% Tab 1
   * (Lộ trình hiện tại) VÀ 100% Tab 2 (Lộ trình kế cận) — gửi 1 đơn
   * ROADMAP_PROMOTION vào cùng hàng đợi approvals với LEVEL_ADVANCE, chỉ
   * User Admin/System Admin thấy & duyệt (canApproveLevelSkip).
   */
  const requestRoadmapPromotion = useCallback(
    (user = currentUser) => {
      const roadmap = computeUserRoadmapTabs(user, roadmapsConfig, enrollments, courses);
      if (!roadmap.readyForPromotion) {
        return { ok: false, reason: 'Chưa hoàn thành 100% Lộ trình hiện tại và Lộ trình kế cận.' };
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
        justification: 'Đã hoàn thành 100% Lộ trình hiện tại và Lộ trình kế cận (Tab 1 & Tab 2).',
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
   * Đơn xin học vượt cấp, thăng cấp lộ trình và đề xuất gán giáo trình mà `approver` có quyền xử lý.
   * Chỉ User Admin và System Admin có capability `canApproveLevelSkip` và thấy TOÀN BỘ hàng đợi.
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

  /** Đơn đề xuất phân bổ giáo trình do `user` gửi (dành cho HRBP theo dõi tiến độ phê duyệt). */
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

  /** "Khóa học của tôi" đã gộp cả ghi danh phát sinh trong phiên & các khóa thuộc Giáo Trình được gán. */
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

      // Bổ sung thông tin Giáo trình cho các khóa đã có trong danh sách
      const enrichedBase = base.map((c) => {
        if (curriculumMap[c.id]) {
          return {
            ...c,
            courseType: 'MANDATORY',
            isCurriculum: true,
            curriculumId: curriculumMap[c.id].curriculumId,
            curriculumTitle: curriculumMap[c.id].curriculumTitle,
            curriculumDueDate: curriculumMap[c.id].curriculumDueDate,
            enrollment: {
              ...(c.enrollment || {}),
              isMandatory: true,
              dueDate: curriculumMap[c.id].curriculumDueDate || c.enrollment?.dueDate,
            },
          };
        }
        return c;
      });

      // Tự động gán thêm các khóa học thuộc Giáo trình nếu học viên chưa có ghi danh
      const extraCourses = [];
      Object.entries(curriculumMap).forEach(([cId, meta]) => {
        if (!baseIds.has(cId)) {
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
              },
            });
          }
        }
      });

      return [...enrichedBase, ...extraCourses];
    },
    [courses, currentUser, enrollments, curricula]
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
    // Award 150 XP for attending classroom
    setGamification((prev) => ({
      ...prev,
      userStats: {
        ...prev.userStats,
        points: prev.userStats.points + 150,
      },
    }));
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

  /** User Admin phân công Giảng viên đứng lớp cho một khóa học trực tiếp. */
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
        companyCategories,
        addCompanyCategory,
        accessFor,
        enrollCourse,
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
