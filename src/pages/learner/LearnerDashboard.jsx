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
import RoadmapTabsPanel from '../../components/RoadmapTabsPanel';

export default function LearnerDashboard() {
  const navigate = useNavigate();
  const { courses: allCourses, currentUser: authUser } = useCourseStore();
  const user = authUser || currentUser;
  const courses = myLearningCourses(allCourses, user);
  const certificates = deriveCertificates(allCourses, user);
  const mandatoryCourses = courses.filter((c) => c.courseType === 'MANDATORY');
  const mandatoryCount = mandatoryCourses.length;
  const mandatoryOutstanding = mandatoryCourses.filter((c) => c.enrollment.status !== 'COMPLETED').length;
  const inProgressCourses = courses.filter((c) => c.enrollment.status === 'IN_PROGRESS');
  const completedCount = courses.filter((c) => c.enrollment.status === 'COMPLETED').length;
  const learningHours = totalLearningHours(allCourses, user);
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
                <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Xin chào, {user.fullName.split(' ').pop()}! 👋</h1>
                <Badge tone="rail" icon="ti-map-2">{levelDef.emoji} Level {user.level} &middot; {levelDef.shortVi}</Badge>
              </div>
              <p style={{ marginTop: 2, marginBottom: 0 }}><strong>{user.position}</strong> &middot; MM Mega Market</p>
            </div>
          </div>
          <Button variant="primary" icon="ti-book-2" onClick={() => navigate('/learner/courses')}>Khóa Học Của Tôi ({courses.length})</Button>
        </div>
      </div>

      {/* Chỉ 3 thẻ tóm tắt real-data ở đây — "Lộ Trình Kế Cận" đã bỏ vì phía
          dưới đã có đủ 4 tab Lộ trình (trong đó có tab Kế Cận), để 1 thẻ cố
          định lặp lại đúng 1 trong 4 tab đó là dư thừa và gây hiểu lầm. */}
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatTile label="Giờ Học" value={`${learningHours.toFixed(1)}h`} tone="blue" icon="ti-clock-hour-4" onClick={() => navigate('/learner/history')} />
        <StatTile label="Khóa Đã Hoàn Thành" value={completedCount} tone="sage" icon="ti-circle-check" onClick={() => navigate('/learner/courses')} />
        <StatTile label="Khóa Bắt Buộc" value={mandatoryCount} tone="amber" icon="ti-shield-alert" onClick={() => navigate('/learner/courses')} />
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
        <ResourceCard icon="ti-shield-alert" tone="amber" title="Khóa Bắt Buộc Còn Lại" value={`${mandatoryOutstanding} khóa`} onClick={() => navigate('/learner/courses')} />
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
          <div className="stat-icon-badge" style={{ background: `var(--${tone || 'rail'}-soft)`, color: `var(--${tone || 'rail'}-soft-text)` }}>
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
