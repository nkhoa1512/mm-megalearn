import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  currentUser,
  myLearningCourses,
  notifications,
  deriveCertificates,
  totalLearningHours,
  weeklyStudyHours,
} from '../../data/mockData';
import { Badge, ProgressBar, Button, BarChart } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { levelDefinition } from '../../data/levelSystem';
import { normalizeRole, roleDefinition, ROLE_HOME } from '../../data/roles';
import { computeCourseRecertification } from '../../utils/recertification';
import RoadmapTabsPanel from '../../components/RoadmapTabsPanel';

export default function LearnerDashboard() {
  const navigate = useNavigate();
  const { courses: allCourses, currentUser: authUser, enrollments } = useCourseStore();
  const user = authUser || currentUser;
  // Learner không có Cockpit riêng (đây chính là trang chủ của họ) — 5 role
  // còn lại bấm "Xem Giao Diện Học Tập Cá Nhân" từ Cockpit của mình sang đây,
  // nên cần 1 nút đối xứng để quay lại đúng Cockpit của role đó.
  const userRole = normalizeRole(user.role);
  const isNonLearner = userRole !== 'learner';
  const courses = myLearningCourses(allCourses, user, enrollments);
  const certificates = deriveCertificates(allCourses, user, enrollments);

  const recertAlerts = courses
    .map((c) => {
      const cert = certificates.find((cert) => cert.courseId === c.id);
      const recert = computeCourseRecertification(c, c.enrollment, cert);
      return { course: c, recert };
    })
    .filter((item) => item.recert.needsRecertification);

  const mandatoryCourses = courses.filter((c) => c.courseType === 'MANDATORY');
  const mandatoryCount = mandatoryCourses.length;
  const mandatoryOutstanding = mandatoryCourses.filter((c) => c.enrollment.status !== 'COMPLETED').length;
  const inProgressCourses = courses.filter((c) => c.enrollment.status === 'IN_PROGRESS');
  const completedCount = courses.filter((c) => c.enrollment.status === 'COMPLETED').length;
  const learningHours = totalLearningHours(allCourses, user, enrollments);
  const levelDef = levelDefinition(user.level);
  const chartData = weeklyStudyHours(user);
  const unreadCount = (notifications.learnerInbox || []).filter((n) => n.unread).length;

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #FFFFFF 0%, var(--sage-soft) 100%)', borderColor: 'var(--sage)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--rail)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
              {user.avatar || user.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Xin chào, {firstNameOf(user.fullName)}! 👋</h1>
                <Badge tone="rail" icon="ti-map-2">{levelDef.emoji} Level {user.level} &middot; {levelDef.shortVi}</Badge>
              </div>
              <p style={{ marginTop: 2, marginBottom: 0 }}><strong>{user.position}</strong> &middot; MM Mega Market</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {isNonLearner && (
              <Button variant="outline" icon="ti-layout-dashboard" onClick={() => navigate(ROLE_HOME[userRole] || '/learner')}>
                Mở Bảng Điều Khiển {roleDefinition(userRole).shortVi}
              </Button>
            )}
            <Button variant="primary" icon="ti-book-2" onClick={() => navigate('/learner/courses')}>Khóa Học Của Tôi ({courses.length})</Button>
          </div>
        </div>
      </div>

      {recertAlerts.length > 0 && (
        <div
          className="card card-pad"
          style={{
            marginBottom: 20,
            borderLeft: `4px solid ${recertAlerts.some((a) => a.recert.isExpired) ? 'var(--rust)' : 'var(--amber)'}`,
            background: recertAlerts.some((a) => a.recert.isExpired) ? 'var(--rust-soft)' : 'var(--amber-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <i
              className={`ti ${recertAlerts.some((a) => a.recert.isExpired) ? 'ti-alert-circle' : 'ti-clock'}`}
              style={{ fontSize: 24, color: recertAlerts.some((a) => a.recert.isExpired) ? 'var(--rust)' : 'var(--amber)' }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: recertAlerts.some((a) => a.recert.isExpired) ? 'var(--rust-soft-text)' : 'var(--amber-soft-text)' }}>
                Bạn có {recertAlerts.length} khóa học cần hoàn thành sát hạch tái cấp chứng chỉ!
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                {recertAlerts.map((a) => `${a.course.title} (${a.recert.statusLabel})`).join(' · ')}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            tone={recertAlerts.some((a) => a.recert.isExpired) ? 'danger' : 'primary'}
            icon="ti-refresh"
            onClick={() => navigate('/learner/certificates')}
          >
            Xem Chứng Chỉ &amp; Thi Tái Cấp
          </Button>
        </div>
      )}


      {/* Chỉ 3 thẻ tóm tắt real-data ở đây — "Lộ Trình Kế Cận" đã bỏ vì phía
          dưới đã có đủ 4 tab Lộ trình (trong đó có tab Kế Cận), để 1 thẻ cố
          định lặp lại đúng 1 trong 4 tab đó là dư thừa và gây hiểu lầm. */}
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatTile label="Giờ Học" value={`${learningHours.toFixed(1)}h`} tone="blue" icon="ti-clock-hour-4" onClick={() => navigate('/learner/history')} />
        <StatTile label="Khóa Đã Hoàn Thành" value={completedCount} tone="sage" icon="ti-circle-check" onClick={() => navigate('/learner/courses')} />
        <StatTile label="Khóa Bắt Buộc" value={mandatoryCount} tone="amber" icon="ti-alert-triangle" onClick={() => navigate('/learner/courses')} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="section-label" style={{ margin: 0 }}>
          <i className="ti ti-route" style={{ marginRight: 6 }} />
          Trục Lộ Trình Đào Tạo &amp; Kế Cận Trực Quan
        </div>
        <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/learner/paths')}>Xem Chi Tiết Học Phần</Button>
      </div>
      <div style={{ marginBottom: 28 }}>
        <RoadmapTabsPanel user={user} />
      </div>

      <div className="grid grid-2" style={{ gap: 16, marginBottom: 24 }}>
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}><i className="ti ti-book-2" style={{ marginRight: 6 }} />Khóa Học Đang Theo Dõi ({inProgressCourses.length})</div>
            <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/learner/courses')}>Xem Tất Cả</Button>
          </div>
          {inProgressCourses.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>Không có khóa nào đang học dở.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inProgressCourses.slice(0, 4).map((c) => (
                <div key={c.id} className="card-interactive" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer' }} onClick={() => navigate(`/learner/courses/${c.id}`)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.title}>{c.title}</div>
                    <div style={{ marginTop: 6 }}><ProgressBar value={c.enrollment.progressPercent || 0} tone="rail" size="sm" /></div>
                  </div>
                  <Badge tone="amber">{c.enrollment.progressPercent || 0}%</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}><i className="ti ti-chart-bar" style={{ marginRight: 6 }} />Thời Lượng Học Tập Theo Thứ</div>
            <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/learner/history')}>Chi Tiết</Button>
          </div>
          <BarChart data={chartData} valueSuffix="h" tone="sage" />
        </div>
      </div>

      <div className="grid grid-3" style={{ gap: 16 }}>
        <ResourceCard icon="ti-certificate" tone="sage" title="Chứng Chỉ Đạt Được" value={`${certificates.length} chứng chỉ`} onClick={() => navigate('/learner/certificates')} />
        <ResourceCard icon="ti-alert-triangle" tone="amber" title="Khóa Bắt Buộc Còn Lại" value={`${mandatoryOutstanding} khóa`} onClick={() => navigate('/learner/courses')} />
        {/* Không có trang chi tiết thông báo riêng trong app (chỉ có dropdown
            chuông ở AppHeader, state cục bộ không lift lên được dễ dàng) — thẻ
            này không có onClick, tránh giả vờ điều hướng đến nơi không tồn tại. */}
        <ResourceCard icon="ti-bell-ringing" tone="rail" title="Thông Báo Mới" value={`${unreadCount} thông báo`} />
      </div>
    </>
  );
}

function StatTile({ label, value, tone, icon, onClick }) {
  const color = tone ? `var(--${tone})` : 'var(--ink)';
  return (
    <div className="stat card-interactive" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
        <div className="stat-label">{label}</div>
        {icon && (
          <div className="stat-icon-badge" style={{ background: `var(--${tone || 'rail'}-soft)`, color: `var(--${tone || 'rail'}-soft-text)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            <i className={`ti ${icon}`} />
          </div>
        )}
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

function ResourceCard({ icon, tone, title, value, onClick }) {
  return (
    <div className={`card card-pad ${onClick ? 'card-interactive' : ''}`} onClick={onClick} style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-icon-badge" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone}-soft-text)`, width: 40, height: 40, fontSize: 18 }}>
        <i className={`ti ${icon}`} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{value}</div>
      </div>
    </div>
  );
}

// Vài persona (HRBP, User Admin, SysAdmin, Trainer...) có fullName kèm hậu tố
// vai trò trong ngoặc, vd "Le Thi Mai (HRBP)" — bỏ hậu tố đó trước khi lấy từ
// cuối cùng làm tên gọi thân mật, tránh chào "Xin chào, (HRBP)!".
function firstNameOf(fullName) {
  return (fullName || '').replace(/\s*\([^)]*\)\s*$/, '').trim().split(' ').pop();
}
