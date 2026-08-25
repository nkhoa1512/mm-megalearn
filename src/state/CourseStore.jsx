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
} from '../data/mockData';
import { checkCourseAccessRule, ACCESS_STATE, normalizeLevel } from '../data/levelSystem';
import { normalizeRole, hasCapability } from '../data/roles';

// v6: thang 7 cấp bậc đảo ngược + mô hình 6 role. Bump key để bỏ cache v5 cũ
// (role `admin` và level 1-5 của bản trước sẽ không còn hợp lệ).
const AUTH_KEY = 'mm-megalearn-auth-v6';
const STORAGE_KEY = 'mm-megalearn-courses-v6';
const CLASSROOM_KEY = 'mm-megalearn-classrooms-v6';
const APPROVAL_KEY = 'mm-megalearn-approvals-v6';
const GAMIFICATION_KEY = 'mm-megalearn-gamification-v6';
const ACTION_PLAN_KEY = 'mm-megalearn-actionplans-v6';
const ENROLLMENT_KEY = 'mm-megalearn-enrollments-v6';

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
  const [courses, setCourses] = useState(() => loadItem(STORAGE_KEY, initialCourses));
  const [classrooms, setClassrooms] = useState(() => loadItem(CLASSROOM_KEY, initialClassrooms));
  const [approvals, setApprovals] = useState(() => loadItem(APPROVAL_KEY, initialApprovals));
  const [gamification, setGamification] = useState(() => loadItem(GAMIFICATION_KEY, initialGamification));
  const [actionPlans, setActionPlans] = useState(() => loadItem(ACTION_PLAN_KEY, initialActionPlans));

  // Ghi danh phát sinh trong phiên: { [userId]: { [courseId]: enrollment } }.
  // Chồng lên ma trận ghi danh tĩnh của HRIS.
  const [enrollments, setEnrollments] = useState(() => loadItem(ENROLLMENT_KEY, {}));

  // Modals & UI States
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [activeAiTab, setActiveAiTab] = useState('tutor');

  const [talentProfileUser, setTalentProfileUser] = useState(null);
  const [surveyModalConfig, setSurveyModalConfig] = useState({ isOpen: false, course: null, type: 'L1', learner: null });
  const [nominateModalConfig, setNominateModalConfig] = useState({ isOpen: false, member: null });

  useEffect(() => {
    try {
      if (isAuthenticated && currentUser) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(AUTH_KEY);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
      localStorage.setItem(CLASSROOM_KEY, JSON.stringify(classrooms));
      localStorage.setItem(APPROVAL_KEY, JSON.stringify(approvals));
      localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(gamification));
      localStorage.setItem(ACTION_PLAN_KEY, JSON.stringify(actionPlans));
      localStorage.setItem(ENROLLMENT_KEY, JSON.stringify(enrollments));
    } catch {
      // ignore quota / private browsing
    }
  }, [isAuthenticated, currentUser, courses, classrooms, approvals, gamification, actionPlans, enrollments]);

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
    const list = allUsers ? allUsers() : demoUsers;
    const found = list.find((u) => u.userId === userId || u.employeeCode === userId);
    if (found) {
      setCurrentUser(hydrateUser(found));
      setIsAuthenticated(true);
    }
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
   */
  const saveCourseProgress = useCallback(
    (courseId, nextCourse, user = currentUser) => {
      setCourses((prev) => prev.map((c) => (c.id === courseId ? nextCourse : c)));
      if (!user || !nextCourse.enrollment) return;
      setEnrollments((prev) => ({
        ...prev,
        [user.userId]: {
          ...(prev[user.userId] || {}),
          [courseId]: { ...(prev[user.userId] || {})[courseId], ...nextCourse.enrollment, courseId, userId: user.userId },
        },
      }));
    },
    [currentUser]
  );

  /** Học viên gửi đơn xin học vượt đúng 1 cấp liền kề. */
  const requestLevelAdvanceApproval = useCallback(
    (course, justification = '', user = currentUser) => {
      if (!user || !course) return { ok: false, reason: 'Thiếu thông tin học viên hoặc khóa học.' };
      const access = accessFor(course, user);
      if (!access.requiresApproval) {
        return { ok: false, reason: access.reason || 'Khóa học này không thuộc diện xin học vượt cấp.', access };
      }

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
        approverRole: 'manager',
        approverId: user.managerId || null,
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
      const course = target ? courses.find((c) => c.id === target.courseId) : null;
      const learnerId = target?.userId;

      setApprovals((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: 'APPROVED', decidedAt: todayIso() } : r))
      );

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
    [approvals, courses]
  );

  const rejectRequest = useCallback((reqId, note = '') => {
    setApprovals((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'REJECTED', decidedAt: todayIso(), decisionNote: note } : r))
    );
  }, []);

  /** Đơn xin học vượt cấp mà `approver` có quyền xử lý. */
  const levelAdvanceRequestsFor = useCallback(
    (approver = currentUser) => {
      if (!approver || !hasCapability(normalizeRole(approver.role), 'canApproveLevelSkip')) return [];
      return approvals.filter((a) => a.requestType === 'LEVEL_ADVANCE');
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

  // Manager Nominate Modal
  const openNominateModal = useCallback((member) => {
    setNominateModalConfig({ isOpen: true, member });
  }, []);

  const closeNominateModal = useCallback(() => {
    setNominateModalConfig({ isOpen: false, member: null });
  }, []);

  const nominateCourse = useCallback((member, course) => {
    const newApproval = {
      id: `req-nom-${Date.now()}`,
      requestType: 'MANAGER_NOMINATION',
      userId: member.userId || null,
      employeeId: member.employeeId || member.employeeCode,
      employeeName: member.name || member.fullName,
      position: member.position,
      department: member.departmentName || member.departmentCode || 'Operations',
      currentLevel: normalizeLevel(member.level),
      courseLevel: normalizeLevel(course.targetLevel),
      courseId: course.id,
      courseName: course.title,
      requestDate: todayIso(),
      justification: 'Nominated by Line Manager for competency development and career succession roadmap.',
      courseCost: course.modality === 'EXTERNAL_PLATFORM' ? 'Included in enterprise license package' : 'Internal MMVN complimentary',
      status: 'APPROVED',
    };
    setApprovals((prev) => [newApproval, ...prev]);
    closeNominateModal();
  }, [closeNominateModal]);

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
        courses,
        addCourse,
        updateCourse,
        removeCourse,
        saveCourseProgress,
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
        nominateModalConfig,
        openNominateModal,
        closeNominateModal,
        nominateCourse,
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
