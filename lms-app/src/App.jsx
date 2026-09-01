import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './features/layout/Layout';
import { AppProvider, useAppStore } from './store/AppProvider';
import { normalizeRole, ROLE_HOME } from './data/roles';
import LoginPage from './pages/auth/LoginPage';

import LearnerDashboard from './pages/learner/LearnerDashboard';
import LearnerCourses from './pages/learner/LearnerCourses';
import LearnerCourseDetail from './pages/learner/LearnerCourseDetail';
import LearnerCertificates from './pages/learner/LearnerCertificates';
import LearnerHistory from './pages/learner/LearnerHistory';
import LearnerClassrooms from './pages/learner/LearnerClassrooms';
import LearnerLearningPaths from './pages/learner/LearnerLearningPaths';
import AiLearningHub from './pages/learner/AiLearningHub';
import LearnerCalendar from './pages/learner/LearnerCalendar';

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
import AdminCostCenter from './pages/admin/AdminCostCenter';
import AdminLevelRoadmaps from './pages/admin/AdminLevelRoadmaps';
import AdminCertifications from './pages/admin/AdminCertifications';
import AdminCategoryManager from './pages/admin/AdminCategoryManager';
import TrainerHub from './pages/trainer/TrainerHub';
import MyLearning from './pages/shared/MyLearning';
import MyCertificates from './pages/shared/MyCertificates';
import TrainerRatingsDirectory from './features/ratings/TrainerRatingsDirectory';
import ManagerApprovals from './pages/manager/ManagerApprovals';
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
  '/learner/catalog': { title: 'Danh Mục Toàn Bộ Khóa Học (Chỉ Xem & Tham Gia Học)', crumb: 'Learner (Store & HO)' },
  '/learner/calendar': { title: 'Lịch Học Tập Cá Nhân', crumb: 'Learner (Store & HO)' },

  '/my-learning': { title: 'Cổng Học Tập Cá Nhân — Mọi Role Đều Là Learner', crumb: 'Học tập của tôi' },
  '/my-learning-calendar': { title: 'Lịch Học Tập Cá Nhân — Mọi Role', crumb: 'Học tập của tôi' },
  '/my-learning-dashboard': { title: 'Bảng Điều Khiển Học Tập Cá Nhân — Mọi Role', crumb: 'Học tập của tôi' },
  '/my-learning-path': { title: 'Lộ Trình Học Tập Của Tôi — Mọi Role', crumb: 'Học tập của tôi' },
  '/my-certificates': { title: 'Chứng Chỉ & Văn Bằng Số Của Tôi', crumb: 'Học tập của tôi' },
  '/trainer-ratings': { title: 'Đánh Giá Giảng Viên (CSAT) — Công Khai Cho Mọi Role', crumb: 'Học tập của tôi' },
  '/approvals': { title: 'Phê Duyệt Đơn Xin Học Vượt Cấp (Sequential Level Gate)', crumb: 'Cấp quản lý' },

  '/trainer': { title: 'Lớp Giảng Dạy & Mã Live QR Điểm Danh', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/attendance': { title: 'Quản Lý Điểm Danh Học Viên Theo Lớp', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/feedback': { title: 'Báo Cáo Đánh Giá CSAT Từ Học Viên', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/courses': { title: 'Tạo & Quản Lý Khóa Học (SCORM, ILT, Lab)', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/training-ops': { title: 'Lịch Giảng Dạy, Xưởng Thực Hành & Phòng Lab', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/dashboard': { title: 'Bảng Điều Khiển L&D & Trợ Lý AI Chiến Lược', crumb: 'Trainer / L&D (Level 3)' },
  '/trainer/reports': { title: 'Kirkpatrick ROI, Heatmap & Ngân Sách Đào Tạo', crumb: 'Trainer / L&D (Level 3)' },

  '/hrbp': { title: 'Ma Trận Khoảng Cách Năng Lực (Skill Gap Matrix)', crumb: 'HRBP (Level 2)' },
  '/hrbp/succession': { title: 'Lộ Trình Kế Nhiệm 70-20-10 & Thánh Gióng Pipeline', crumb: 'HRBP (Level 2)' },
  '/hrbp/compliance': { title: 'Báo Cáo Tuân Thủ Đào Tạo Theo Vùng & Siêu Thị', crumb: 'HRBP (Level 2)' },
  '/hrbp/curriculum': { title: 'Giáo Trình Phân Bổ & Đề Xuất Nhân Tài', crumb: 'HRBP (Level 2)' },
  '/hrbp/catalog': { title: 'Danh Mục Toàn Bộ Khóa Học (Chỉ Xem & Tham Gia Học)', crumb: 'HRBP (Level 2)' },

  '/user-admin': { title: 'Quản Trị Danh Mục 100+ Nhân Sự (Employee Master)', crumb: 'User Admin (Level 2)' },
  '/user-admin/hierarchy': { title: 'Cây Cơ Cấu Tổ Chức 2 Nhánh (Dual-Branch Org Tree)', crumb: 'User Admin (Level 2)' },
  '/user-admin/job-levels': { title: 'Khung 7 Cấp Bậc Định Biên (Level 7 → Level 1)', crumb: 'User Admin (Level 2)' },
  '/user-admin/allocation': { title: 'Phân Bổ Khóa Học Cho Khối / Phòng Ban', crumb: 'User Admin (Level 2)' },
  '/user-admin/trainers': { title: 'Phân Công Giảng Viên Đứng Lớp Tại Chi Nhánh', crumb: 'User Admin (Level 2)' },

  '/sysadmin': { title: 'Hạ Tầng IT & API Pipeline Đồng Bộ SAP HRIS', crumb: 'System Admin IT (Level 1)' },
  '/sysadmin/audit': { title: 'Nhật Ký Bảo Mật & Giám Sát Phiên (ISO 27001)', crumb: 'System Admin IT (Level 1)' },
  '/sysadmin/policies': { title: 'Chính Sách Chống Gian Lận & Watermark', crumb: 'System Admin IT (Level 1)' },
  '/sysadmin/roles': { title: 'Quản Trị Toàn Bộ 6 Role & Ma Trận Phân Quyền', crumb: 'System Admin IT (Level 1)' },
  '/sysadmin/org-config': { title: 'Cấu Hình Cây Tổ Chức & Đồng Bộ HRIS', crumb: 'System Admin IT (Level 1)' },

  '/manager': { title: 'Bảng Điều Khiển Vận Hành Đội Ngũ', crumb: 'Manager (Level 4)' },
  '/manager/team': { title: 'Quản Lý Đào Tạo & Năng Lực Đội Ngũ', crumb: 'Manager (Level 4)' },
  '/manager/approvals': { title: 'Phê Duyệt Đơn Xin Học Vượt Cấp (Sequential Level Gate)', crumb: 'Manager (Level 4)' },
  '/manager/courses': { title: 'Chương Trình Bắt Buộc Của Phòng Ban', crumb: 'Manager (Level 4)' },
  '/manager/reports': { title: 'Quản Lý Đào Tạo & Năng Lực Đội Ngũ', crumb: 'Manager (Level 4)' },
  '/manager/catalog': { title: 'Danh Mục Toàn Bộ Khóa Học (Chỉ Xem & Tham Gia Học)', crumb: 'Manager (Level 4)' },

  '/admin': { title: 'Executive L&D Command & Strategic AI Hub', crumb: 'L&D Faculty' },
  '/admin/courses': { title: 'Multi-Modal Course Catalog & SCORM Builder', crumb: 'L&D Faculty' },
  '/admin/training-ops': { title: 'Đặt Phòng Thực Hành & Upload Danh Sách Học Viên', crumb: 'L&D Faculty' },
  '/admin/roadmaps': { title: 'Quản Lý Lộ Trình Cấp Bậc (Level Roadmaps)', crumb: 'L&D Faculty' },
  '/user-admin/roadmaps': { title: 'Quản Lý Lộ Trình Cấp Bậc (Level Roadmaps)', crumb: 'User Admin (Level 2)' },
  '/admin/config': { title: 'Dual-Branch Org Architecture & HRIS Sync', crumb: 'System Admin IT' },
  '/admin/certifications': { title: 'Quản Lý Chứng Chỉ (Certificate Templates)', crumb: 'System Administration' },
  '/admin/categories': { title: 'Quản Lý Danh Mục (Category Taxonomy)', crumb: 'System Administration' },
  '/admin/reports': { title: 'Kirkpatrick ROI, Dual-Branch Heatmap & Budget', crumb: 'L&D Faculty' },
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
  const location = useLocation();
  const safeRole = normalizeRole(role);
  const roleHome = ROLE_HOME[safeRole] || '/learner';
  const meta = PAGE_META[location.pathname] || { title: 'MM MegaLearn Platform', crumb: safeRole.charAt(0).toUpperCase() + safeRole.slice(1) };

  return (
    <Layout
      role={role}
      setRole={setRole}
      title={meta.title}
      crumb={meta.crumb}
    >
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

        {/* Cổng học tập cá nhân dùng chung cho cả 6 role */}
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

        {/* Phê duyệt học vượt cấp: mọi role từ Manager trở lên */}
        <Route path="/approvals" element={<ManagerApprovals />} />

        {/* Manager Routes */}
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/manager/team" element={<ManagerTeam />} />
        <Route path="/manager/approvals" element={<ManagerApprovals />} />
        <Route path="/manager/courses" element={<ManagerCourses />} />
        <Route path="/manager/reports" element={<ManagerTeam />} />
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
        <Route path="/trainer/dashboard" element={<AdminDashboard />} />
        <Route path="/trainer/reports" element={<AdminReports />} />

        {/* Đường dẫn /admin/* của bản cũ (role admin nay là trainer) */}
        <Route path="/admin" element={<AdminDashboard />} />
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
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
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
