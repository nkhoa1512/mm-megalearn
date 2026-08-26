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
  myLearningCourses,
  enrollmentsForUser,
  nextMajorVersion,
} from '../data/mockData';
import { checkCourseAccessRule, ACCESS_STATE, normalizeLevel } from '../data/levelSystem';
import { normalizeRole, hasCapability } from '../data/roles';
import { SCOPE_ROADMAP_MATRIX, computeUserRoadmapTabs } from '../data/levelRoadmapMatrix';
import { publishRoadmapScope } from '../data/roadmapScopeMatrix';
import { translate, translateDomain, translateStatus, translateDelivery, getLocalizedCourse } from '../data/i18n';

// v6: thang 7 cấp bậc đảo ngược + mô hình 6 role. Bump key để bỏ cache v5 cũ
// (role `admin` và level 1-5 của bản trước sẽ không còn hợp lệ).
const AUTH_KEY = 'mm-megalearn-auth-v6';
const STORAGE_KEY = 'mm-megalearn-courses-v6';
const CLASSROOM_KEY = 'mm-megalearn-classrooms-v6';
const APPROVAL_KEY = 'mm-megalearn-approvals-v6';
const GAMIFICATION_KEY = 'mm-megalearn-gamification-v6';
const ACTION_PLAN_KEY = 'mm-megalearn-actionplans-v6';
const ENROLLMENT_KEY = 'mm-megalearn-enrollments-v6';
const USERS_KEY = 'mm-megalearn-users-v6';
// v7: cấu hình lộ trình chuyển từ ma trận Level x Branch phẳng sang Scope Key
// đa tầng (BU -> Division -> Department -> Sub-Department x Level). Bump key
// để không nạp nhầm shape cũ từ localStorage.
const ROADMAP_KEY = 'mm-megalearn-roadmaps-v7';
const THEME_KEY = 'mm-megalearn-theme';
const LANG_KEY = 'mm-megalearn-lang';

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

// Hồ sơ đăng nhập lưu trong localStorage có thể còn role/level của bản cũ.
function hydrateUser(user) {
  if (!user) return null;
  return { ...user, role: normalizeRole(user.role), level: normalizeLevel(user.level) };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function CourseStoreProvider({ children }) {
  // Auth state
  const [currentUser, setCurrentUser] = useState(() => hydrateUser(loadItem(AUTH_KEY, defaultUser)));
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(loadItem(AUTH_KEY, defaultUser)));

  // App data state
  const [users, setUsers] = useState(() => loadItem(USERS_KEY, allUsers()));
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
      localStorage.setItem(THEME_KEY, JSON.stringify(theme));
      localStorage.setItem(LANG_KEY, JSON.stringify(language));
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch {
      // ignore quota / private browsing
    }
  }, [isAuthenticated, currentUser, users, courses, classrooms, approvals, gamification, actionPlans, enrollments, roadmapsConfig, theme, language]);

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

  const addCourse = useCallback((course) => {
    setCourses((prev) => [...prev, course]);
  }, []);

  const updateCourse = useCallback((courseId, nextCourse) => {
    setCourses((prev) => prev.map((c) => (c.id === courseId ? nextCourse : c)));
  }, []);

  const removeCourse = useCallback((courseId) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
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
   * Manager duyệt đơn: mở khóa đúng khóa học đó cho học viên và ghi danh luôn
   * để khóa xuất hiện ngay trong "Khóa học của tôi".
   */
  const approveRequest = useCallback(
    (reqId) => {
      const target = approvals.find((r) => r.id === reqId);

      setApprovals((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: 'APPROVED', decidedAt: todayIso() } : r))
      );

      if (!target) return;

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
    [approvals, courses, promoteUserLevel]
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
   * Đơn xin học vượt cấp mà `approver` có quyền xử lý. Chỉ User Admin và
   * System Admin có capability `canApproveLevelSkip` (Manager/Trainer/HRBP đã
   * bị bỏ quyền này), và cả hai thấy TOÀN BỘ hàng đợi — không chia theo cấp
   * bậc/role người gửi nữa.
   */
  const levelAdvanceRequestsFor = useCallback(
    (approver = currentUser) => {
      const approverRole = normalizeRole(approver?.role);
      if (!approver || !hasCapability(approverRole, 'canApproveLevelSkip')) return [];
      return approvals.filter((a) => a.requestType === 'LEVEL_ADVANCE' || a.requestType === 'ROADMAP_PROMOTION');
    },
    [approvals, currentUser]
  );

  /** "Khóa học của tôi" đã gộp cả ghi danh phát sinh trong phiên. */
  const myCourses = useCallback(
    (courseList = courses, user = currentUser) => myLearningCourses(courseList, user, enrollments),
    [courses, currentUser, enrollments]
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
        promoteUserLevel,
        courses,
        addCourse,
        updateCourse,
        removeCourse,
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
