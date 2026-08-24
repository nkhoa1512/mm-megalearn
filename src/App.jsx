import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AiAssistantDrawer from './components/AiAssistantDrawer';
import TalentProfileModal from './components/TalentProfileModal';
import PostTrainingSurveyModal from './components/PostTrainingSurveyModal';
import ManagerNominateModal from './components/ManagerNominateModal';
import { CourseStoreProvider, useCourseStore } from './state/CourseStore';
import LoginPage from './pages/auth/LoginPage';

import LearnerDashboard from './pages/learner/LearnerDashboard';
import LearnerCourses from './pages/learner/LearnerCourses';
import LearnerCourseDetail from './pages/learner/LearnerCourseDetail';
import LearnerCertificates from './pages/learner/LearnerCertificates';
import LearnerHistory from './pages/learner/LearnerHistory';
import LearnerClassrooms from './pages/learner/LearnerClassrooms';
import LearnerLearningPaths from './pages/learner/LearnerLearningPaths';
import AiLearningHub from './pages/learner/AiLearningHub';

import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerTeam from './pages/manager/ManagerTeam';
import ManagerLearning from './pages/manager/ManagerLearning';
import ManagerCertificates from './pages/manager/ManagerCertificates';
import ManagerCourses from './pages/manager/ManagerCourses';
import ManagerReports from './pages/manager/ManagerReports';

import LessonPlayer from './pages/player/LessonPlayer';
import AssessmentPlayer from './pages/player/AssessmentPlayer';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCourses from './pages/admin/AdminCourses';
import AdminCourseBuilder from './pages/admin/AdminCourseBuilder';
import AdminConfig from './pages/admin/AdminConfig';
import AdminReports from './pages/admin/AdminReports';
import AdminTrainingOps from './pages/admin/AdminTrainingOps';
import TrainerHub from './pages/trainer/TrainerHub';
import HrbpDashboard from './pages/hrbp/HrbpDashboard';
import UserAdminPortal from './pages/useradmin/UserAdminPortal';
import SysAdminPortal from './pages/sysadmin/SysAdminPortal';

const PAGE_META = {
  '/learner': { title: 'Personal Learning Dashboard & Milestones', crumb: 'Learner (Store & HO)' },
  '/learner/courses': { title: 'Course Curriculum & Training Catalog', crumb: 'Learner (Store & HO)' },
  '/learner/classrooms': { title: 'Classroom Workshops & QR Check-in', crumb: 'Learner (Store & HO)' },
  '/learner/paths': { title: 'Career Learning Paths & 70-20-10 Framework', crumb: 'Learner (Store & HO)' },
  '/learner/ai-hub': { title: 'AI Learning Tutor & Standard SOP Retrieval', crumb: 'AI Knowledge Engine' },
  '/learner/leaderboard': { title: 'Honor Roll & Gamification XP', crumb: 'Learner (Store & HO)' },
  '/learner/certificates': { title: 'Digital Credentials & Recertification Schedule', crumb: 'Learner (Store & HO)' },
  '/learner/history': { title: 'Learning Transcript & Completed Records', crumb: 'Learner (Store & HO)' },

  '/trainer': { title: 'Trainer Command & In-Person Faculty Portal', crumb: 'Faculty & Instructor (L&OD)' },

  '/hrbp': { title: 'HRBP Strategic Talent & Regional Workforce Portal', crumb: 'HR Business Partner (HRD)' },

  '/user-admin': { title: 'User Administration & Dual-Branch Org Structure', crumb: 'User Administrator (HR Ops)' },

  '/sysadmin': { title: 'IT Security, HRIS Integration & Infrastructure Command', crumb: 'System Administrator (IT)' },

  '/manager': { title: 'Team Operations Command Dashboard', crumb: 'Line Manager & HRBP' },
  '/manager/team': { title: 'Direct Reports, Skill Gaps & Level 3 Review', crumb: 'Line Manager & HRBP' },
  '/manager/approvals': { title: 'Course Approvals & Training Budget Sign-off', crumb: 'Line Manager & HRBP' },
  '/manager/courses': { title: 'Department Mandatory Training Curriculum', crumb: 'Line Manager & HRBP' },
  '/manager/reports': { title: 'Associate Progress & Compliance Reports', crumb: 'Line Manager & HRBP' },
  '/manager/learning': { title: 'Manager Personal Curriculum', crumb: 'Line Manager & HRBP' },
  '/manager/certificates': { title: 'Leadership Credentials & Badges', crumb: 'Line Manager & HRBP' },

  '/admin': { title: 'Executive L&D Command & Strategic AI Hub', crumb: 'L&D Admin (Level 1)' },
  '/admin/courses': { title: 'Multi-Modal Course Catalog & SCORM Builder', crumb: 'L&D Admin (Level 1)' },
  '/admin/training-ops': { title: 'Faculty Command, Store Labs & Calendar', crumb: 'L&D Admin (Level 1)' },
  '/admin/config': { title: 'Dual-Branch Org Architecture & HRIS Sync', crumb: 'L&D Admin (Level 1)' },
  '/admin/reports': { title: 'Kirkpatrick ROI, Dual-Branch Heatmap & Budget', crumb: 'L&D Admin (Level 1)' },
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("MM MegaLearn ErrorBoundary caught an error:", error, errorInfo);
  }
  handleReset() {
    try {
      localStorage.clear();
    } catch {}
    window.location.reload();
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#F8FAFC', color: '#1E293B' }}>
          <div style={{ maxWidth: 500, width: '100%', background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
              An unexpected render issue occurred. You can reset your session cache and reload the application.
            </p>
            <div style={{ background: '#F1F5F9', padding: 12, borderRadius: 8, fontSize: 12, fontFamily: 'monospace', color: '#475569', textAlign: 'left', marginBottom: 20, overflowX: 'auto' }}>
              {this.state.error?.message || 'Unknown render error'}
            </div>
            <button
              onClick={this.handleReset}
              style={{ background: '#007A38', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              Reset Session Cache &amp; Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Shell({ role, setRole }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const safeRole = role || 'learner';
  const meta = PAGE_META[location.pathname] || { title: 'MM MegaLearn Platform', crumb: safeRole.charAt(0).toUpperCase() + safeRole.slice(1) };

  return (
    <div className="app-shell">
      <Sidebar role={role} collapsed={collapsed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          role={role}
          onRoleChange={setRole}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          title={meta.title}
          crumb={meta.crumb}
        />
        <div className="main-scroll">
          <div className="content">
            <Routes>
              {/* Learner Routes */}
              <Route path="/learner" element={<LearnerDashboard />} />
              <Route path="/learner/courses" element={<LearnerCourses />} />
              <Route path="/learner/courses/:courseId" element={<LearnerCourseDetail />} />
              <Route path="/learner/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
              <Route path="/learner/courses/:courseId/assessment" element={<AssessmentPlayer />} />
              <Route path="/learner/classrooms" element={<LearnerClassrooms />} />
              <Route path="/learner/paths" element={<LearnerLearningPaths />} />
              <Route path="/learner/ai-hub" element={<AiLearningHub />} />
              <Route path="/learner/certificates" element={<LearnerCertificates />} />
              <Route path="/learner/history" element={<LearnerHistory />} />

              {/* Manager Routes */}
              <Route path="/manager" element={<ManagerDashboard />} />
              <Route path="/manager/team" element={<ManagerTeam />} />
              <Route path="/manager/courses" element={<ManagerCourses />} />
              <Route path="/manager/reports" element={<ManagerReports />} />
              <Route path="/manager/learning" element={<ManagerLearning />} />
              <Route path="/manager/learning/:courseId" element={<LearnerCourseDetail basePath="/manager/learning" />} />
              <Route path="/manager/learning/:courseId/lessons/:lessonId" element={<LessonPlayer basePath="/manager/learning" />} />
              <Route path="/manager/learning/:courseId/assessment" element={<AssessmentPlayer basePath="/manager/learning" />} />
              <Route path="/manager/certificates" element={<ManagerCertificates />} />

              {/* HRBP Routes */}
              <Route path="/hrbp" element={<HrbpDashboard />} />

              {/* User Admin Routes */}
              <Route path="/user-admin" element={<UserAdminPortal />} />

              {/* System Admin (IT) Routes */}
              <Route path="/sysadmin" element={<SysAdminPortal />} />

              {/* Trainer Routes */}
              <Route path="/trainer" element={<TrainerHub />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/courses" element={<AdminCourses />} />
              <Route path="/admin/courses/new" element={<AdminCourseBuilder />} />
              <Route path="/admin/courses/:courseId" element={<AdminCourseBuilder />} />
              <Route path="/admin/training-ops" element={<AdminTrainingOps />} />
              <Route path="/admin/config" element={<AdminConfig />} />
              <Route path="/admin/reports" element={<AdminReports />} />

              <Route path="*" element={<Navigate to="/learner" replace />} />
            </Routes>
          </div>
        </div>
      </div>

      {/* Global AI Assistant Floating Drawer */}
      <AiAssistantDrawer />

      {/* Global Modals: Talent Profile, L1/L3 Surveys, Manager Nominate */}
      <TalentProfileModal />
      <PostTrainingSurveyModal />
      <ManagerNominateModal />
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, currentUser } = useCourseStore();
  const [role, setRole] = useState(() => currentUser?.role || 'learner');
  const location = useLocation();

  // Sync role with active user
  useEffect(() => {
    if (currentUser?.role) {
      setRole(currentUser.role);
    }
  }, [currentUser]);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // If authenticated and on /login, redirect to role home
  if (location.pathname === '/login') {
    const targetPath = currentUser?.role === 'admin' ? '/admin' : currentUser?.role === 'manager' ? '/manager' : '/learner';
    return <Navigate to={targetPath} replace />;
  }

  return <Shell role={role} setRole={setRole} />;
}

export default function App() {
  return (
    <HashRouter>
      <CourseStoreProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </CourseStoreProvider>
    </HashRouter>
  );
}
