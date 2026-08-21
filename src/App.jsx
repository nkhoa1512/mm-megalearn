import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { CourseStoreProvider } from './state/CourseStore';

import LearnerDashboard from './pages/learner/LearnerDashboard';
import LearnerCourses from './pages/learner/LearnerCourses';
import LearnerCourseDetail from './pages/learner/LearnerCourseDetail';
import LearnerCertificates from './pages/learner/LearnerCertificates';
import LearnerHistory from './pages/learner/LearnerHistory';

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

const PAGE_META = {
  '/learner': { title: 'Dashboard', crumb: 'User Learn' },
  '/learner/courses': { title: 'My courses', crumb: 'User Learn' },
  '/learner/certificates': { title: 'Certificates', crumb: 'User Learn' },
  '/learner/history': { title: 'Learning history', crumb: 'User Learn' },
  '/manager': { title: 'Dashboard', crumb: 'Manager' },
  '/manager/learning': { title: 'My learning', crumb: 'Manager' },
  '/manager/certificates': { title: 'Certificates', crumb: 'Manager' },
  '/manager/team': { title: 'Team', crumb: 'Manager' },
  '/manager/courses': { title: 'Team courses', crumb: 'Manager' },
  '/manager/reports': { title: 'Reports', crumb: 'Manager' },
  '/admin': { title: 'Dashboard', crumb: 'Admin' },
  '/admin/courses': { title: 'Courses', crumb: 'Admin' },
  '/admin/config': { title: 'Configuration', crumb: 'Admin' },
  '/admin/reports': { title: 'Analytics', crumb: 'Admin' },
};

function Shell({ role, setRole }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const meta = PAGE_META[location.pathname] || { title: 'Course', crumb: role.charAt(0).toUpperCase() + role.slice(1) };

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
              <Route path="/learner" element={<LearnerDashboard />} />
              <Route path="/learner/courses" element={<LearnerCourses />} />
              <Route path="/learner/courses/:courseId" element={<LearnerCourseDetail />} />
              <Route path="/learner/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
              <Route path="/learner/courses/:courseId/assessment" element={<AssessmentPlayer />} />
              <Route path="/learner/certificates" element={<LearnerCertificates />} />
              <Route path="/learner/history" element={<LearnerHistory />} />

              <Route path="/manager" element={<ManagerDashboard />} />
              <Route path="/manager/learning" element={<ManagerLearning />} />
              <Route path="/manager/learning/:courseId" element={<LearnerCourseDetail basePath="/manager/learning" />} />
              <Route path="/manager/learning/:courseId/lessons/:lessonId" element={<LessonPlayer basePath="/manager/learning" />} />
              <Route path="/manager/learning/:courseId/assessment" element={<AssessmentPlayer basePath="/manager/learning" />} />
              <Route path="/manager/certificates" element={<ManagerCertificates />} />
              <Route path="/manager/team" element={<ManagerTeam />} />
              <Route path="/manager/courses" element={<ManagerCourses />} />
              <Route path="/manager/reports" element={<ManagerReports />} />

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
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState('learner');
  return (
    <HashRouter>
      <CourseStoreProvider>
        <Shell role={role} setRole={setRole} />
      </CourseStoreProvider>
    </HashRouter>
  );
}
