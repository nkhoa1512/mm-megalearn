import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './features/layout/Layout';
import { AppProvider, useAppStore } from './store/AppProvider';
import { normalizeRole, ROLE_HOME } from './data/roles';

// Every screen is loaded on demand. The authoring screens alone (course builder,
// course catalog, assessment editor) are ~480KB of source that a Learner — the
// role most people sign in as — never opens, and shipping them in the first
// bundle delayed every single session's first paint.
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));

const LearnerDashboard = lazy(() => import('./pages/learner/LearnerDashboard'));
const LearnerCourses = lazy(() => import('./pages/learner/LearnerCourses'));
const LearnerCourseDetail = lazy(() => import('./pages/learner/LearnerCourseDetail'));
const LearnerCertificates = lazy(() => import('./pages/learner/LearnerCertificates'));
const LearnerHistory = lazy(() => import('./pages/learner/LearnerHistory'));
const LearnerClassrooms = lazy(() => import('./pages/learner/LearnerClassrooms'));
const LearnerLearningPaths = lazy(() => import('./pages/learner/LearnerLearningPaths'));
const AiLearningHub = lazy(() => import('./pages/learner/AiLearningHub'));
const LearnerCalendar = lazy(() => import('./pages/learner/LearnerCalendar'));

const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const ManagerTeam = lazy(() => import('./pages/manager/ManagerTeam'));
const ManagerLearning = lazy(() => import('./pages/manager/ManagerLearning'));
const ManagerCertificates = lazy(() => import('./pages/manager/ManagerCertificates'));
const ManagerCourses = lazy(() => import('./pages/manager/ManagerCourses'));

const LessonPlayer = lazy(() => import('./pages/player/LessonPlayer'));
const AssessmentPlayer = lazy(() => import('./pages/player/AssessmentPlayer'));

const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));
const AdminCourseBuilder = lazy(() => import('./pages/admin/AdminCourseBuilder'));
const AdminConfig = lazy(() => import('./pages/admin/AdminConfig'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminTrainingOps = lazy(() => import('./pages/admin/AdminTrainingOps'));
const AdminCostCenter = lazy(() => import('./pages/admin/AdminCostCenter'));
const AdminLevelRoadmaps = lazy(() => import('./pages/admin/AdminLevelRoadmaps'));
const AdminCertifications = lazy(() => import('./pages/admin/AdminCertifications'));
const AdminCategoryManager = lazy(() => import('./pages/admin/AdminCategoryManager'));
const TrainerHub = lazy(() => import('./pages/trainer/TrainerHub'));
const MyLearning = lazy(() => import('./pages/shared/MyLearning'));
const MyCertificates = lazy(() => import('./pages/shared/MyCertificates'));
const TrainerRatingsDirectory = lazy(() => import('./features/ratings/TrainerRatingsDirectory'));
const ManagerApprovals = lazy(() => import('./pages/manager/ManagerApprovals'));
const HrbpDashboard = lazy(() => import('./pages/hrbp/HrbpDashboard'));
const UserAdminPortal = lazy(() => import('./pages/useradmin/UserAdminPortal'));
const SysAdminPortal = lazy(() => import('./pages/sysadmin/SysAdminPortal'));

/**
 * Shown while a screen's code is fetched. It sits inside the app shell, so the
 * header and navigation stay put and only the content area changes — a full-page
 * spinner would make every navigation look like a page reload.
 */
function RouteFallback() {
  return (
    <div className="empty-state" style={{ animation: 'fadeIn 0.2s ease' }} role="status" aria-live="polite">
      <i className="ti ti-loader ti-spin" aria-hidden="true" />
      <p style={{ margin: 0 }}>Loading…</p>
    </div>
  );
}

const PAGE_META = {
  '/learner': { title: 'Personal Learning Dashboard & Milestones', crumb: 'Learner (Store & HO)' },
  '/learner/courses': { title: 'Course Curriculum & Training Catalog', crumb: 'Learner (Store & HO)' },
  '/learner/classrooms': { title: 'Classroom Workshops & QR Check-in', crumb: 'Learner (Store & HO)' },
  '/learner/paths': { title: 'Career Learning Paths & 70-20-10 Framework', crumb: 'Learner (Store & HO)' },
  '/learner/ai-hub': { title: 'AI Learning Tutor & Standard SOP Retrieval', crumb: 'AI Knowledge Engine' },
  '/learner/certificates': { title: 'Digital Credentials & Recertification Schedule', crumb: 'Learner (Store & HO)' },
  '/learner/history': { title: 'Learning Transcript & Completed Records', crumb: 'Learner (Store & HO)' },
  '/learner/catalog': { title: 'Full Course Catalog (View & Enroll Only)', crumb: 'Learner (Store & HO)' },
  '/learner/calendar': { title: 'Personal Learning Calendar', crumb: 'Learner (Store & HO)' },

  '/my-learning': { title: 'Personal Learning Portal — Every Role Is A Learner', crumb: 'My Learning' },
  '/my-learning-calendar': { title: 'Personal Learning Calendar — Every Role', crumb: 'My Learning' },
  '/my-learning-dashboard': { title: 'Personal Learning Dashboard — Every Role', crumb: 'My Learning' },
  '/my-learning-path': { title: 'My Learning Roadmap — Every Role', crumb: 'My Learning' },
  '/my-certificates': { title: 'My Certificates & Digital Credentials', crumb: 'My Learning' },
  '/trainer-ratings': { title: 'Trainer Ratings (CSAT) — Visible To Every Role', crumb: 'My Learning' },
  '/approvals': { title: 'Level Skip Request Approvals (Sequential Level Gate)', crumb: 'Management' },

  '/trainer': { title: 'Teaching Classes & Live QR Attendance Code', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/attendance': { title: 'Learner Attendance Management By Class', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/feedback': { title: 'Learner CSAT Feedback Report', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/courses': { title: 'Create & Manage Courses (SCORM, ILT, Lab)', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/training-ops': { title: 'Teaching Schedule, Practice Workshops & Labs', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/dashboard': { title: 'My Teaching Command Center', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/reports': { title: 'My Teaching Command Center', crumb: 'Trainer / L&D (Level 3)' },

  '/hrbp': { title: 'Competency Gap Matrix (Skill Gap Matrix)', crumb: 'HRBP (Level 2)' },
  '/hrbp/succession': { title: '70-20-10 Succession Roadmap & Thanh Giong Pipeline', crumb: 'HRBP (Level 2)' },
  '/hrbp/compliance': { title: 'Training Compliance Report By Region & Store', crumb: 'HRBP (Level 2)' },
  '/hrbp/curriculum': { title: 'Curriculum Allocation & Talent Nomination', crumb: 'HRBP (Level 2)' },
  '/hrbp/catalog': { title: 'Full Course Catalog (View & Enroll Only)', crumb: 'HRBP (Level 2)' },

  '/user-admin': { title: 'Employee Master — 100+ Personnel Directory', crumb: 'User Admin (Level 2)' },
  '/user-admin/hierarchy': { title: 'Dual-Branch Organization Tree', crumb: 'User Admin (Level 2)' },
  '/user-admin/job-levels': { title: '7-Level Job Grade Framework (Level 7 → Level 1)', crumb: 'User Admin (Level 2)' },
  '/user-admin/allocation': { title: 'Course Allocation By Division / Department', crumb: 'User Admin (Level 2)' },
  '/user-admin/trainers': { title: 'Trainer Assignment By Branch', crumb: 'User Admin (Level 2)' },

  '/sysadmin': { title: 'IT Infrastructure & SAP HRIS Sync API Pipeline', crumb: 'System Admin IT (Level 1)' },
  '/sysadmin/audit': { title: 'Security Audit Log & Session Monitoring (ISO 27001)', crumb: 'System Admin IT (Level 1)' },
  '/sysadmin/policies': { title: 'Anti-Cheating Policy & Watermark', crumb: 'System Admin IT (Level 1)' },
  '/sysadmin/roles': { title: 'Governance For All 6 Roles & Permission Matrix', crumb: 'System Admin IT (Level 1)' },
  '/sysadmin/org-config': { title: 'Org Tree Configuration & HRIS Sync', crumb: 'System Admin IT (Level 1)' },

  '/manager': { title: 'Team Operations Dashboard', crumb: 'Manager (Level 4)' },
  '/manager/team': { title: 'Team Training & Competency Management', crumb: 'Manager (Level 4)' },
  '/manager/approvals': { title: 'Level Skip Request Approvals (Sequential Level Gate)', crumb: 'Manager (Level 4)' },
  '/manager/courses': { title: 'Department Mandatory Programs', crumb: 'Manager (Level 4)' },
  '/manager/reports': { title: 'Team Training & Competency Management', crumb: 'Manager (Level 4)' },
  '/manager/catalog': { title: 'Full Course Catalog (View & Enroll Only)', crumb: 'Manager (Level 4)' },

  '/admin': { title: 'Executive L&D Command & Reports Center', crumb: 'L&D Faculty' },
  '/admin/courses': { title: 'Multi-Modal Course Catalog & SCORM Builder', crumb: 'L&D Faculty' },
  '/admin/training-ops': { title: 'Lab Room Booking & Participant List Upload', crumb: 'L&D Faculty' },
  '/admin/roadmaps': { title: 'Level Roadmap Management (Level Roadmaps)', crumb: 'L&D Faculty' },
  '/user-admin/roadmaps': { title: 'Level Roadmap Management (Level Roadmaps)', crumb: 'User Admin (Level 2)' },
  '/admin/config': { title: 'Dual-Branch Org Architecture & HRIS Sync', crumb: 'System Admin IT' },
  '/admin/certifications': { title: 'Certificate Management (Certificate Templates)', crumb: 'System Administration' },
  '/admin/categories': { title: 'Category Management (Category Taxonomy)', crumb: 'System Administration' },
  '/admin/reports': { title: 'Executive L&D Command & Reports Center', crumb: 'L&D Faculty' },
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
    console.error("MMLearn ErrorBoundary caught an error:", error, errorInfo);
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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: 'var(--paper-sunken)', color: 'var(--ink)' }}>
          <div style={{ maxWidth: 500, width: '100%', background: 'var(--paper-raised)', borderRadius: 12, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--rust-soft)', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 20px', lineHeight: 1.5 }}>
              An unexpected render issue occurred. You can reset your session cache and reload the application.
            </p>
            <div style={{ background: 'var(--slate-soft)', padding: 12, borderRadius: 8, fontSize: 12, fontFamily: 'monospace', color: 'var(--ink-soft)', textAlign: 'left', marginBottom: 20, overflowX: 'auto' }}>
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
  const location = useLocation();
  const safeRole = normalizeRole(role);
  const roleHome = ROLE_HOME[safeRole] || '/learner';
  const meta = PAGE_META[location.pathname] || { title: 'MMLearn Platform', crumb: safeRole.charAt(0).toUpperCase() + safeRole.slice(1) };

  return (
    <Layout
      role={role}
      setRole={setRole}
      title={meta.title}
      crumb={meta.crumb}
    >
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Learner Routes */}
        <Route path="/learner" element={<LearnerDashboard />} />
        <Route path="/learner/courses" element={<LearnerCourses />} />
        <Route path="/learner/courses/:courseId" element={<LearnerCourseDetail />} />
        <Route path="/learner/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
        <Route path="/learner/courses/:courseId/assessment" element={<AssessmentPlayer />} />
        <Route path="/learner/assessment/:assessmentId" element={<AssessmentPlayer basePath="/learner/catalog?tab=assessment" />} />
        <Route path="/learner/classrooms" element={<LearnerClassrooms />} />
        <Route path="/learner/paths" element={<LearnerLearningPaths />} />
        <Route path="/learner/ai-hub" element={<AiLearningHub />} />
        <Route path="/learner/certificates" element={<LearnerCertificates />} />
        <Route path="/learner/history" element={<LearnerHistory />} />
        <Route path="/learner/catalog" element={<AdminCourses />} />
        <Route path="/learner/calendar" element={<LearnerCalendar basePath="/learner/courses" />} />

        {/* Shared personal learning portal for all 6 roles */}
        <Route path="/my-learning" element={<MyLearning />} />
        <Route path="/my-learning/:courseId" element={<LearnerCourseDetail basePath="/my-learning" />} />
        <Route path="/my-learning/:courseId/lessons/:lessonId" element={<LessonPlayer basePath="/my-learning" />} />
        <Route path="/my-learning/:courseId/assessment" element={<AssessmentPlayer basePath="/my-learning" />} />
        <Route path="/my-learning/assessment/:assessmentId" element={<AssessmentPlayer basePath="/my-learning" />} />
        <Route path="/my-learning-dashboard" element={<LearnerDashboard />} />
        <Route path="/my-learning-path" element={<LearnerLearningPaths />} />
        <Route path="/my-learning-calendar" element={<LearnerCalendar />} />
        <Route path="/my-certificates" element={<MyCertificates />} />
        <Route path="/trainer-ratings" element={<TrainerRatingsDirectory />} />

        {/* Level skip approvals: every role from Manager upward */}
        <Route path="/approvals" element={<ManagerApprovals />} />

        {/* Manager Routes */}
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/manager/team" element={<ManagerTeam />} />
        <Route path="/manager/approvals" element={<ManagerApprovals />} />
        <Route path="/manager/courses" element={<ManagerCourses />} />
        <Route path="/manager/reports" element={<Navigate to="/manager/team" replace />} />
        <Route path="/manager/learning" element={<ManagerLearning />} />
        <Route path="/manager/learning/:courseId" element={<LearnerCourseDetail basePath="/manager/learning" />} />
        <Route path="/manager/learning/:courseId/lessons/:lessonId" element={<LessonPlayer basePath="/manager/learning" />} />
        <Route path="/manager/learning/:courseId/assessment" element={<AssessmentPlayer basePath="/manager/learning" />} />
        <Route path="/manager/assessment/:assessmentId" element={<AssessmentPlayer basePath="/manager/catalog?tab=assessment" />} />
        <Route path="/manager/certificates" element={<ManagerCertificates />} />
        <Route path="/manager/catalog" element={<AdminCourses />} />

        <Route path="/assessment/:assessmentId" element={<AssessmentPlayer basePath="/admin/courses?tab=assessment" />} />

        {/* HRBP Routes */}
        <Route path="/hrbp" element={<HrbpDashboard initialTab="SKILL_GAP" />} />
        <Route path="/hrbp/succession" element={<HrbpDashboard initialTab="SUCCESSION" />} />
        <Route path="/hrbp/compliance" element={<HrbpDashboard initialTab="COMPLIANCE" />} />
        <Route path="/hrbp/curriculum" element={<HrbpDashboard initialTab="CURRICULUM" />} />
        <Route path="/hrbp/catalog" element={<AdminCourses />} />

        {/* User Admin Routes */}
        <Route path="/user-admin" element={<UserAdminPortal initialTab="DIRECTORY" />} />
        <Route path="/user-admin/hierarchy" element={<UserAdminPortal initialTab="HIERARCHY" />} />
        <Route path="/user-admin/job-levels" element={<UserAdminPortal initialTab="JOB_LEVELS" />} />
        <Route path="/user-admin/allocation" element={<UserAdminPortal initialTab="ALLOCATION" />} />
        <Route path="/user-admin/trainers" element={<UserAdminPortal initialTab="TRAINER_ASSIGNMENT" />} />
        <Route path="/user-admin/roadmaps" element={<AdminLevelRoadmaps />} />

        {/* System Admin (IT) Routes */}
        <Route path="/sysadmin" element={<SysAdminPortal initialTab="HRIS" />} />
        <Route path="/sysadmin/audit" element={<SysAdminPortal initialTab="AUDIT_LOGS" />} />
        <Route path="/sysadmin/policies" element={<SysAdminPortal initialTab="POLICIES" />} />
        <Route path="/sysadmin/roles" element={<SysAdminPortal initialTab="ROLE_GOVERNANCE" />} />
        <Route path="/sysadmin/org-config" element={<AdminConfig />} />

        {/* Trainer / L&D Routes */}
        <Route path="/trainer" element={<TrainerHub initialTab="CLASSES" />} />
        <Route path="/trainer/attendance" element={<TrainerHub initialTab="ATTENDANCE" />} />
        <Route path="/trainer/feedback" element={<TrainerHub initialTab="FEEDBACK" />} />
        <Route path="/trainer/labs" element={<TrainerHub initialTab="LABS" />} />
        <Route path="/trainer/courses" element={<AdminCourses />} />
        <Route path="/trainer/courses/new" element={<AdminCourseBuilder />} />
        <Route path="/trainer/courses/:courseId" element={<AdminCourseBuilder />} />
        <Route path="/trainer/training-ops" element={<AdminTrainingOps />} />
        <Route path="/trainer/dashboard" element={<AdminReports />} />
        <Route path="/trainer/reports" element={<AdminReports />} />

        {/* Legacy /admin/* paths (the former admin role is now trainer) */}
        {/* One page: the command overview and the five reports are tabs of AdminReports. */}
        <Route path="/admin" element={<AdminReports />} />
        <Route path="/admin/courses" element={<AdminCourses />} />
        <Route path="/admin/courses/new" element={<AdminCourseBuilder />} />
        <Route path="/admin/courses/:courseId" element={<AdminCourseBuilder />} />
        <Route path="/admin/training-ops" element={<AdminTrainingOps />} />
        <Route path="/admin/config" element={<AdminConfig />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/cost-center" element={<AdminCostCenter />} />
        <Route path="/admin/roadmaps" element={<AdminLevelRoadmaps />} />
        <Route path="/admin/certifications" element={<AdminCertifications />} />
        <Route path="/admin/categories" element={<AdminCategoryManager />} />

        <Route path="*" element={<Navigate to={roleHome} replace />} />
      </Routes>
      </Suspense>
    </Layout>
  );
}

function AppRoutes() {
  const { isAuthenticated, currentUser } = useAppStore();
  const [role, setRole] = useState(() => normalizeRole(currentUser?.role));
  const location = useLocation();

  // Sync role with active user
  useEffect(() => {
    if (currentUser?.role) {
      setRole(normalizeRole(currentUser.role));
    }
  }, [currentUser]);

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // If authenticated and on /login, redirect to the home page of that role
  if (location.pathname === '/login') {
    return <Navigate to={ROLE_HOME[normalizeRole(currentUser?.role)] || '/learner'} replace />;
  }

  return <Shell role={role} setRole={setRole} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </AppProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
