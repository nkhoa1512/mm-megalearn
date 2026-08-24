import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  courses as initialCourses,
  classroomSessions as initialClassrooms,
  pendingApprovalRequests as initialApprovals,
  gamificationData as initialGamification,
  actionPlans as initialActionPlans,
  demoUsers,
  adminUser,
} from '../data/mockData';

const AUTH_KEY = 'mm-megalearn-auth-v5';
const STORAGE_KEY = 'mm-megalearn-courses-v5';
const CLASSROOM_KEY = 'mm-megalearn-classrooms-v5';
const APPROVAL_KEY = 'mm-megalearn-approvals-v5';
const GAMIFICATION_KEY = 'mm-megalearn-gamification-v5';
const ACTION_PLAN_KEY = 'mm-megalearn-actionplans-v5';

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

export function CourseStoreProvider({ children }) {
  // Auth state
  const [currentUser, setCurrentUser] = useState(() => loadItem(AUTH_KEY, adminUser));
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(loadItem(AUTH_KEY, adminUser)));

  // App data state
  const [courses, setCourses] = useState(() => loadItem(STORAGE_KEY, initialCourses));
  const [classrooms, setClassrooms] = useState(() => loadItem(CLASSROOM_KEY, initialClassrooms));
  const [approvals, setApprovals] = useState(() => loadItem(APPROVAL_KEY, initialApprovals));
  const [gamification, setGamification] = useState(() => loadItem(GAMIFICATION_KEY, initialGamification));
  const [actionPlans, setActionPlans] = useState(() => loadItem(ACTION_PLAN_KEY, initialActionPlans));

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
    } catch {
      // ignore quota / private browsing
    }
  }, [isAuthenticated, currentUser, courses, classrooms, approvals, gamification, actionPlans]);

  // Auth actions
  const login = useCallback((userObj) => {
    setCurrentUser(userObj);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, []);

  const switchUser = useCallback((userId) => {
    const found = demoUsers.find((u) => u.userId === userId || u.employeeCode === userId);
    if (found) {
      setCurrentUser(found);
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

  // Approval actions
  const approveRequest = useCallback((reqId) => {
    setApprovals((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'APPROVED' } : r))
    );
  }, []);

  const rejectRequest = useCallback((reqId) => {
    setApprovals((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'REJECTED' } : r))
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
      employeeId: member.employeeId || member.userId,
      employeeName: member.name || member.fullName,
      position: member.position,
      department: member.departmentName || member.departmentCode || 'Operations',
      courseId: course.id,
      courseName: course.title,
      requestDate: new Date().toISOString().slice(0, 10),
      justification: `Nominated by Line Manager for competency development and career succession roadmap.`,
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
        isAuthenticated,
        login,
        logout,
        switchUser,
        demoUsers,
        courses,
        addCourse,
        updateCourse,
        removeCourse,
        classrooms,
        checkInClassroom,
        enrollClassroom,
        batchEnrollStudents,
        approvals,
        approveRequest,
        rejectRequest,
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
