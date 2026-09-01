import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeamMembersForManager, managerUser as defaultManager, notifications } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import {
  Badge,
  Button,
  StatusStackedBar,
  Modal,
  DonutChart,
  BarChart,
  LineChart,
  ProgressBar,
} from '../../features/common/ui';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { approvals, currentUser: authUser, approveRequest, rejectRequest, levelAdvanceRequestsFor } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const teamMembers = getTeamMembersForManager(activeManager);

  const [activeChartTab, setActiveChartTab] = useState('BAR'); // 'BAR' | 'LINE'
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'FAILED' | 'INACTIVE'
  const [remindTarget, setRemindTarget] = useState(null);
  const [isBatchRemind, setIsBatchRemind] = useState(false);
  const [remindSent, setRemindSent] = useState(false);

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const total = teamMembers.length;
  const completed = teamMembers.filter((m) => m.status === 'COMPLETED').length;
  const inProgress = teamMembers.filter((m) => m.status === 'IN_PROGRESS').length;
  const notStarted = teamMembers.filter((m) => m.status === 'NOT_STARTED').length;
  const overdue = teamMembers.filter((m) => m.status === 'OVERDUE').length;
  const failed = teamMembers.filter((m) => m.status === 'FAILED').length;
  const needsAttention = teamMembers.filter((m) => m.status === 'OVERDUE' || m.status === 'FAILED' || m.inactiveDays >= 3);
  const avgCompletion = total > 0 ? Math.round(teamMembers.reduce((s, m) => s + m.progress, 0) / total) : 0;

  // Lọc danh sách nhân sự cần can thiệp theo tab
  const filteredAttentionList = needsAttention.filter((m) => {
    if (filterType === 'OVERDUE') return m.status === 'OVERDUE';
    if (filterType === 'FAILED') return m.status === 'FAILED';
    if (filterType === 'INACTIVE') return m.inactiveDays >= 3 && m.status !== 'OVERDUE' && m.status !== 'FAILED';
    return true;
  });

  // Dữ liệu Biểu đồ Tròn (Donut Chart): Phân bổ trạng thái học tập
  const statusDonutData = [
    { label: 'Hoàn Thành (Completed)', value: completed, tone: 'sage' },
    { label: 'Đang Học (In Progress)', value: inProgress, tone: 'rail' },
    { label: 'Chưa Bắt Đầu (Not Started)', value: notStarted, tone: 'slate' },
    { label: 'Quá Hạn (Overdue)', value: overdue, tone: 'rust' },
    { label: 'Trượt Kỳ Thi (Failed)', value: failed, tone: 'amber' },
  ].filter((d) => d.value > 0);

  // Dữ liệu Biểu đồ Cột (Bar Chart): Tiến độ theo chủ đề đào tạo trọng tâm của Team
  const teamTopicProgress = [
    { label: 'An Toàn VSTP & HACCP', value: 85, tone: 'sage' },
    { label: 'PCCC & Thoát Hiểm Khẩn Cấp', value: 90, tone: 'sage' },
    { label: 'Tiêu Chuẩn Quầy Kệ Fresh', value: 65, tone: 'rail' },
    { label: 'Bảo Mật & Phòng Chống Phishing', value: 55, tone: 'amber' },
    { label: 'Văn Hóa MMVN & Hội Nhập', value: 45, tone: 'rust' },
  ];

  // Dữ liệu Biểu đồ Đường (Line Chart): Xu hướng hoàn thành trung bình của Đội ngũ qua 4 tuần
  const teamWeeklyTrend = [
    { label: 'Tuần 1', value: 35 },
    { label: 'Tuần 2', value: 42 },
    { label: 'Tuần 3', value: 50 },
    { label: 'Tuần 4', value: avgCompletion || 57 },
  ];

  function handleSendReminder() {
    setRemindSent(true);
    setTimeout(() => {
      setRemindTarget(null);
      setIsBatchRemind(false);
      setRemindSent(false);
    }, 1200);
  }

  function handleUnlockRetake(member) {
    alert(`Đã mở khóa thêm 01 lượt thi sát hạch cho ${member.name} (Khóa: ${member.course}). Thông báo đã gửi đến học viên!`);
  }

  return (
    <>
      {/* 1. EXECUTIVE MANAGER PROFILE & OVERVIEW BANNER */}
      <div
        className="card card-pad"
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FEF3C7 100%)',
          borderColor: 'var(--amber, #F59E0B)',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #B45309 0%, var(--amber, #D97706) 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 20,
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                flexShrink: 0,
              }}
            >
              {activeManager.avatar || activeManager.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Bảng Điều Khiển Vận Hành &amp; Giám Sát Đào Tạo Đội Ngũ
                </h1>
                <Badge tone="amber" icon="ti-briefcase">
                  {activeManager.divisionCode} &middot; {activeManager.departmentName || activeManager.departmentCode}
                </Badge>
                <Badge tone="sage" icon="ti-users">
                  {total} Nhân Sự Trực Thuộc
                </Badge>
              </div>
              <p style={{ marginTop: 4, marginBottom: 0, color: 'var(--ink-soft)', fontSize: 13 }}>
                Quản lý: <strong>{activeManager.fullName}</strong> ({activeManager.position}) &middot; Khối vận hành <strong>{activeManager.divisionName || 'Store Operations'}</strong> &middot; Mã QL: <strong>{activeManager.employeeCode || 'MMVN-0245'}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
              Xem Giao Diện Học Tập Cá Nhân
            </Button>
            <Button
              variant="outline"
              tone="amber"
              icon="ti-bell-ringing"
              onClick={() => {
                setIsBatchRemind(true);
                setRemindTarget({ name: `Toàn bộ ${needsAttention.length} nhân sự chậm tiến độ`, course: 'Các khóa học quy định' });
              }}
            >
              Nhắc Nhở Cả Đội Ngũ ({needsAttention.length})
            </Button>
            {pendingApprovals.length > 0 && (
              <Button variant="primary" tone="amber" icon="ti-clipboard-check" onClick={() => navigate('/manager/approvals')}>
                Duyệt {pendingApprovals.length} Yêu Cầu Chờ
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FOUR HERO MANAGEMENT KPI TILES */}
      <div className="grid grid-4" style={{ marginBottom: 24, gap: 16 }}>
        <StatTile
          label="Tổng Nhân Sự Trực Thuộc"
          value={`${total} Nhân Sự`}
          subtext="100% đã được gán lộ trình chuẩn"
          tone="blue"
          icon="ti-users"
          onClick={() => navigate('/manager/team')}
        />
        <StatTile
          label="Khóa Đã Hoàn Thành"
          value={`${completed} / ${total} Khóa`}
          subtext={`${Math.round((completed / Math.max(1, total)) * 100)}% tỷ lệ hoàn thành`}
          tone="sage"
          icon="ti-circle-check"
          onClick={() => navigate('/manager/courses')}
        />
        <StatTile
          label="Tiến Độ Hoàn Thành TB"
          value={`${avgCompletion}%`}
          subtext="Mục tiêu quý: ≥80% hoàn thành"
          tone="rail"
          icon="ti-chart-pie"
          onClick={() => navigate('/manager/team')}
        />
        <StatTile
          label="Cần Quản Lý Can Thiệp"
          value={`${needsAttention.length} Nhân Sự`}
          subtext={`${overdue} quá hạn · ${failed} trượt thi · ${needsAttention.length - overdue - failed} ngừng học`}
          tone="rust"
          icon="ti-alert-triangle"
          onClick={() => navigate('/manager/team')}
        />
      </div>

      {/* 3. DUAL-CHART MANAGEMENT ANALYTICS (DONUT + BAR/LINE SWITCHER) */}
      <div className="grid grid-2" style={{ gap: 20, marginBottom: 24, alignItems: 'start' }}>
        {/* CHART 1: TEAM STATUS DISTRIBUTION (DONUT CHART + STACKED BAR) */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-chart-donut" style={{ marginRight: 6, color: 'var(--amber)' }} />
                Phân Bổ Trạng Thái Học Tập Của Đội Ngũ
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                Tỷ lệ hoàn thành, trễ hạn và kết quả sát hạch thực tế
              </div>
            </div>
            <Badge tone={needsAttention.length > 0 ? 'rust' : 'sage'}>
              {needsAttention.length > 0 ? `${needsAttention.length} Cảnh Báo` : 'Đúng Tiến Độ'}
            </Badge>
          </div>

          {/* DONUT SVG CHART */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, minHeight: 180 }}>
            <DonutChart data={statusDonutData} valueSuffix=" nhân sự" />
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 8 }}>
              Thanh Tổng Quan Tiến Độ Tuyến Tính:
            </div>
            <StatusStackedBar
              segments={[
                { status: 'COMPLETED', value: completed },
                { status: 'IN_PROGRESS', value: inProgress },
                { status: 'NOT_STARTED', value: notStarted },
                { status: 'OVERDUE', value: overdue },
                { status: 'FAILED', value: failed },
              ]}
            />
          </div>
        </div>

        {/* CHART 2: TOPIC PROGRESS & TREND ANALYTICS (BAR & LINE SWITCHER) */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-chart-bar" style={{ marginRight: 6, color: 'var(--rail)' }} />
                Tiến Độ Theo Chuyên Đề &amp; Xu Hướng Tuần
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                Phân tích độ phủ các chuyên đề bắt buộc &amp; nhịp độ hoàn thành
              </div>
            </div>

            {/* TOGGLE SWITCHER */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveChartTab('BAR')}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: activeChartTab === 'BAR' ? 'var(--rail)' : 'transparent',
                  color: activeChartTab === 'BAR' ? '#fff' : 'var(--ink-soft)',
                  border: 'none',
                }}
                title="Biểu đồ cột theo chuyên đề"
              >
                📊 Chuyên Đề
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveChartTab('LINE')}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: activeChartTab === 'LINE' ? 'var(--amber)' : 'transparent',
                  color: activeChartTab === 'LINE' ? '#fff' : 'var(--ink-soft)',
                  border: 'none',
                }}
                title="Biểu đồ đường xu hướng 4 tuần"
              >
                📈 Xu Hướng
              </button>
            </div>
          </div>

          <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            {activeChartTab === 'BAR' ? (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Tỷ Lệ Hoàn Thành Theo 5 Chuyên Đề Trọng Tâm Của Bộ Phận (%)
                </div>
                <BarChart data={teamTopicProgress} valueSuffix="%" tone="rail" />
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Xu Hướng Tỷ Lệ Hoàn Thành Trung Bình Của Team Qua 4 Tuần Gần Nhất
                </div>
                <LineChart data={teamWeeklyTrend} valueSuffix="%" tone="amber" />
              </div>
            )}
          </div>

          <div style={{ background: 'var(--amber-soft)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-info-circle" style={{ color: 'var(--amber)', fontSize: 18 }} />
              <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                Chuyên đề <strong>Văn Hóa MMVN &amp; Hội Nhập</strong> đang có tỷ lệ hoàn thành thấp (45%).
              </div>
            </div>
            <Badge tone="amber">Cần Đôn Đốc</Badge>
          </div>
        </div>
      </div>

      {/* 4. ASSOCIATES REQUIRING MANAGER FOLLOW-UP (ACTION CENTER) */}
      <div className="card" style={{ marginBottom: 24, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>
              <i className="ti ti-user-exclamation" style={{ marginRight: 6, color: 'var(--rust)' }} />
              Danh Sách Nhân Sự Cần Quản Lý Can Thiệp &amp; Đôn Đốc ({needsAttention.length})
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
              Xử lý nhân sự quá hạn đào tạo bắt buộc, trượt bài thi sát hạch hoặc ngừng học dài ngày
            </div>
          </div>

          {/* FILTER TABS */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setFilterType('ALL')}
              style={{
                fontSize: 11.5,
                background: filterType === 'ALL' ? 'var(--ink)' : 'var(--paper-sunken)',
                color: filterType === 'ALL' ? '#fff' : 'var(--ink-soft)',
                border: '1px solid var(--line)',
              }}
            >
              Tất Cả ({needsAttention.length})
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setFilterType('OVERDUE')}
              style={{
                fontSize: 11.5,
                background: filterType === 'OVERDUE' ? 'var(--rust)' : 'var(--paper-sunken)',
                color: filterType === 'OVERDUE' ? '#fff' : 'var(--ink-soft)',
                border: '1px solid var(--line)',
              }}
            >
              🔴 Quá Hạn ({overdue})
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setFilterType('FAILED')}
              style={{
                fontSize: 11.5,
                background: filterType === 'FAILED' ? '#B91C1C' : 'var(--paper-sunken)',
                color: filterType === 'FAILED' ? '#fff' : 'var(--ink-soft)',
                border: '1px solid var(--line)',
              }}
            >
              ⚠️ Trượt Bài Thi ({failed})
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setFilterType('INACTIVE')}
              style={{
                fontSize: 11.5,
                background: filterType === 'INACTIVE' ? 'var(--amber)' : 'var(--paper-sunken)',
                color: filterType === 'INACTIVE' ? '#fff' : 'var(--ink-soft)',
                border: '1px solid var(--line)',
              }}
            >
              🟡 Ngừng Học &gt;3 Ngày ({needsAttention.length - overdue - failed})
            </button>
          </div>
        </div>

        {filteredAttentionList.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 20px', textAlign: 'center' }}>
            <i className="ti ti-square-check" style={{ fontSize: 36, color: 'var(--sage)', marginBottom: 8, display: 'block' }} />
            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>Không có nhân sự nào trong danh mục này!</div>
            <p style={{ color: 'var(--ink-soft)', fontSize: 12.5, margin: '4px 0 0 0' }}>Tất cả thành viên đều đang duy trì tiến độ học tập ổn định.</p>
          </div>
        ) : (
          filteredAttentionList.map((m, i) => (
            <div
              key={m.employeeId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 14,
                padding: '16px 20px',
                borderBottom: i < filteredAttentionList.length - 1 ? '1px solid var(--line)' : 'none',
                background: m.status === 'FAILED' ? '#FEF2F2' : m.status === 'OVERDUE' ? '#FFFBEB' : '#fff',
              }}
            >
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{m.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-faint)', background: 'var(--paper-sunken)', padding: '2px 6px', borderRadius: 4 }}>
                    {m.employeeId}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>&middot; {m.position}</span>
                </div>

                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 6 }}>
                  Khóa học: <strong>{m.course}</strong> &middot; Tiến độ: <strong>{m.progress}%</strong> &middot; Hạn chót: <strong>{m.dueDate || 'Chưa đặt'}</strong>
                </div>

                {m.reason && (
                  <div
                    style={{
                      fontSize: 12,
                      color: m.status === 'FAILED' ? '#B91C1C' : m.status === 'OVERDUE' ? '#B45309' : 'var(--ink-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                    }}
                  >
                    <i className={m.status === 'FAILED' ? 'ti ti-alert-triangle' : m.status === 'OVERDUE' ? 'ti-clock-alert' : 'ti-info-circle'} />
                    {m.reason}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {m.status === 'FAILED' ? (
                  <>
                    <Badge tone="rust" icon="ti-x">
                      Trượt Sát Hạch ({m.score}%)
                    </Badge>
                    <Button size="sm" variant="danger" icon="ti-lock-open" onClick={() => handleUnlockRetake(m)}>
                      Mở Khóa Thi Lại
                    </Button>
                  </>
                ) : m.status === 'OVERDUE' ? (
                  <>
                    <Badge tone="rust" icon="ti-alert-circle">
                      Quá Hạn (Ngừng {m.inactiveDays} ngày)
                    </Badge>
                    <Button size="sm" icon="ti-brand-zalo" variant="primary" tone="danger" onClick={() => setRemindTarget(m)}>
                      Gửi Zalo / Teams Ping
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge tone="amber" icon="ti-clock-pause">
                      Ngừng Học {m.inactiveDays} Ngày
                    </Badge>
                    <Button size="sm" icon="ti-bell" variant="outline" onClick={() => setRemindTarget(m)}>
                      Gửi Nhắc Nhở Đa Kênh
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. QUICK PENDING APPROVALS & SYSTEM AUTOMATED ALERT LOG (DUAL PANELS) */}
      <div className="grid grid-2" style={{ gap: 20, marginBottom: 24, alignItems: 'start' }}>
        {/* PANEL 1: PENDING APPROVAL QUEUE */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-clipboard-check" style={{ marginRight: 6, color: 'var(--rail)' }} />
                Yêu Cầu Chờ Phê Duyệt ({pendingApprovals.length})
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                Đơn xin học vượt cấp và đăng ký khóa học của nhân sự
              </div>
            </div>
            <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/manager/approvals')}>
              Xem Tất Cả
            </Button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', background: 'var(--paper-sunken)', borderRadius: 8, color: 'var(--ink-soft)', fontSize: 12.5 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 32, color: 'var(--sage)', marginBottom: 6, display: 'block' }} />
              Không có yêu cầu nào đang chờ duyệt!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingApprovals.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: 'var(--paper-sunken)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                      {req.learnerName || req.userName} ({req.employeeId || 'MMVN'})
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                      Khóa học: <strong>{req.courseTitle || req.courseName}</strong> &middot; Cấp bậc: Level {req.currentLevel} &rarr; Level {req.targetLevel}
                    </div>
                  </div>
                  <Button size="sm" variant="primary" icon="ti-check" onClick={() => navigate('/manager/approvals')}>
                    Xử Lý Đơn
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PANEL 2: SYSTEM AUTOMATED ALERT LOG */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-bell-ringing" style={{ marginRight: 6, color: 'var(--rust)' }} />
                Nhật Ký Cảnh Báo Tự Động Từ Hệ Thống
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                Ghi nhận vi phạm tiến độ &amp; sát hạch thời gian thực
              </div>
            </div>
            <Badge tone="rust">Thời Gian Thực</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.managerAlerts.slice(0, 3).map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'var(--paper-sunken)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <div
                  className="stat-icon-badge"
                  style={{
                    background: 'var(--rust-soft)',
                    color: 'var(--rust-soft-text)',
                    width: 36,
                    height: 36,
                    fontSize: 16,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className="ti ti-alert-triangle" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{a.employee}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.message}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MULTI-CHANNEL REMINDER MODAL */}
      <Modal
        isOpen={Boolean(remindTarget)}
        onClose={() => {
          setRemindTarget(null);
          setIsBatchRemind(false);
        }}
        title={isBatchRemind ? 'Gửi Thông Báo Đôn Đốc Cho Toàn Bộ Đội Ngũ' : 'Gửi Nhắc Nhở Đào Tạo Đa Kênh Cho Nhân Sự'}
        subtitle={remindTarget ? `Đối tượng nhận: ${remindTarget.name} ${remindTarget.position ? `(${remindTarget.position})` : ''}` : ''}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button
              variant="ghost"
              onClick={() => {
                setRemindTarget(null);
                setIsBatchRemind(false);
              }}
            >
              Hủy
            </Button>
            <Button variant="primary" icon="ti-send" onClick={handleSendReminder}>
              {remindSent ? 'Đã Điều Phối Thông Báo Thành Công!' : 'Gửi Nhắc Nhở Ngay'}
            </Button>
          </div>
        }
      >
        {remindTarget && (
          <div>
            <div style={{ background: 'var(--paper-sunken)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Nội dung tin nhắn mẫu:</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4, fontStyle: 'italic' }}>
                "Nhắc nhở từ Quản lý: Đề nghị bạn hoàn thành khóa học bắt buộc <strong>{remindTarget.course}</strong> trước hạn quy định để đảm bảo tuân thủ pháp quy MMVN."
              </div>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10, color: 'var(--ink)' }}>Kênh điều phối tự động:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" defaultChecked />
                <span><strong>Zalo ZNS / SMS</strong> (Tối ưu cho nhân sự đứng quầy &amp; bếp)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" defaultChecked />
                <span><strong>Microsoft Teams / Email Công Ty</strong> (Thông báo kèm link trực tiếp)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" defaultChecked />
                <span><strong>Thông Báo Đẩy Ứng Dụng (In-App Push)</strong></span>
              </label>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function StatTile({ label, value, subtext, tone, icon, onClick }) {
  const color = tone ? `var(--${tone})` : 'var(--ink)';
  return (
    <div
      className="stat card-interactive"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        background: '#fff',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
        <div className="stat-label" style={{ fontSize: 12.5, fontWeight: 700 }}>
          {label}
        </div>
        {icon && (
          <div
            className="stat-icon-badge"
            style={{
              background: `var(--${tone || 'rail'}-soft)`,
              color: `var(--${tone || 'rail'}-soft-text)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              width: 36,
              height: 36,
              borderRadius: 8,
            }}
          >
            <i className={`ti ${icon}`} />
          </div>
        )}
      </div>
      <div className="stat-value" style={{ color, fontSize: 22, fontWeight: 800 }}>
        {value}
      </div>
      {subtext && <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>{subtext}</div>}
    </div>
  );
}


