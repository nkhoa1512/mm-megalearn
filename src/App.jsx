import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AiAssistantDrawer from './components/AiAssistantDrawer';
import { CourseStoreProvider, useCourseStore } from './state/CourseStore';
import LoginPage from './pages/auth/LoginPage';


import LearnerDashboard from './pages/learner/LearnerDashboard';
import LearnerCourses from './pages/learner/LearnerCourses';
import LearnerCourseDetail from './pages/learner/LearnerCourseDetail';
import LearnerCertificates from './pages/learner/LearnerCertificates';
import LearnerHistory from './pages/learner/LearnerHistory';
import LearnerClassrooms from './pages/learner/LearnerClassrooms';
import LearnerLearningPaths from './pages/learner/LearnerLearningPaths';
import LearnerLeaderboard from './pages/learner/LearnerLeaderboard';
import AiLearningHub from './pages/learner/AiLearningHub';

import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerTeam from './pages/manager/ManagerTeam';
import ManagerLearning from './pages/manager/ManagerLearning';
import ManagerCertificates from './pages/manager/ManagerCertificates';
import ManagerCourses from './pages/manager/ManagerCourses';
import ManagerReports from './pages/manager/ManagerReports';
import ManagerApprovals from './pages/manager/ManagerApprovals';

import LessonPlayer from './pages/player/LessonPlayer';
import AssessmentPlayer from './pages/player/AssessmentPlayer';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCourses from './pages/admin/AdminCourses';
import AdminCourseBuilder from './pages/admin/AdminCourseBuilder';
import AdminConfig from './pages/admin/AdminConfig';
import AdminReports from './pages/admin/AdminReports';

const PAGE_META = {
  '/learner': { title: 'Dashboard', crumb: 'Learner (Store / HO)' },
  '/learner/courses': { title: 'My Courses', crumb: 'Learner (Store / HO)' },
  '/learner/classrooms': { title: 'Classrooms & QR Check-in', crumb: 'Learner (Store / HO)' },
  '/learner/paths': { title: 'Career Learning Paths', crumb: 'Learner (Store / HO)' },
  '/learner/ai-hub': { title: 'AI Learning Hub & SOPs', crumb: 'Phase 2 AI Engine' },
  '/learner/leaderboard': { title: 'Leaderboard & Gamification XP', crumb: 'Learner (Store / HO)' },
  '/learner/certificates': { title: 'Digital Certificates & Recertification', crumb: 'Learner (Store / HO)' },
  '/learner/history': { title: 'Learning History', crumb: 'Learner (Store / HO)' },

  '/manager': { title: 'Team Dashboard', crumb: 'Line Manager' },
  '/manager/team': { title: 'Direct Reports', crumb: 'Line Manager' },
  '/manager/approvals': { title: 'Course Approvals', crumb: 'Line Manager' },
  '/manager/courses': { title: 'Department Courses', crumb: 'Line Manager' },
  '/manager/reports': { title: 'Reports & Compliance', crumb: 'Line Manager' },
  '/manager/learning': { title: 'My Personal Courses', crumb: 'Line Manager' },
  '/manager/certificates': { title: 'My Certificates', crumb: 'Line Manager' },

  '/admin': { title: 'Executive Command & AI Hub', crumb: 'L&D Admin (Level 1)' },
  '/admin/courses': { title: 'Course Catalog & Builder', crumb: 'L&D Admin (Level 1)' },
  '/admin/config': { title: 'HRIS, Security & MMVN Governance', crumb: 'L&D Admin (Level 1)' },
  '/admin/reports': { title: 'Strategic Training ROI & Audit Center', crumb: 'L&D Admin (Level 1)' },
};



function Shell({ role, setRole }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const meta = PAGE_META[location.pathname] || { title: 'Khóa học', crumb: role.charAt(0).toUpperCase() + role.slice(1) };

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
              <Route path="/learner/leaderboard" element={<LearnerLeaderboard />} />
              <Route path="/learner/certificates" element={<LearnerCertificates />} />
              <Route path="/learner/history" element={<LearnerHistory />} />

              {/* Manager Routes */}
              <Route path="/manager" element={<ManagerDashboard />} />
              <Route path="/manager/team" element={<ManagerTeam />} />
              <Route path="/manager/approvals" element={<ManagerApprovals />} />
              <Route path="/manager/courses" element={<ManagerCourses />} />
              <Route path="/manager/reports" element={<ManagerReports />} />
              <Route path="/manager/learning" element={<ManagerLearning />} />
              <Route path="/manager/learning/:courseId" element={<LearnerCourseDetail basePath="/manager/learning" />} />
              <Route path="/manager/learning/:courseId/lessons/:lessonId" element={<LessonPlayer basePath="/manager/learning" />} />
              <Route path="/manager/learning/:courseId/assessment" element={<AssessmentPlayer basePath="/manager/learning" />} />
              <Route path="/manager/certificates" element={<ManagerCertificates />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/courses" element={<AdminCourses />} />
              <Route path="/admin/courses/new" element={<AdminCourseBuilder />} />
              <Route path="/admin/courses/:courseId" element={<AdminCourseBuilder />} />
              <Route path="/admin/config" element={<AdminConfig />} />
              <Route path="/admin/reports" element={<AdminReports />} />

              <Route path="*" element={<Navigate to="/learner" replace />} />
            </Routes>
          </div>
        </div>
      </div>

      {/* Global AI Assistant Floating Drawer */}
      <AiAssistantDrawer />
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
        <AppRoutes />
      </CourseStoreProvider>
    </HashRouter>
  );
}


