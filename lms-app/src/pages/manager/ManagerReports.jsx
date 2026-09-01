import React, { useState, useMemo } from 'react';
import { getTeamMembersForManager, managerUser as defaultManager, allUsers } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import { Badge, ProgressBar, Button, CourseTypeBadge, StatCard, Modal } from '../../features/common/ui';
import { downloadCsv } from '../../lib/exportCsv';
import UserTranscriptModal from '../../features/common/UserTranscriptModal';
import RoadmapProgressSummary from '../../features/roadmaps/RoadmapProgressSummary';

const STATUS_META = {
  NOT_STARTED: { tone: 'slate', label: 'Chưa Bắt Đầu', enLabel: 'Not Started' },
  IN_PROGRESS: { tone: 'rail', label: 'Đang Học', enLabel: 'In Progress' },
  COMPLETED: { tone: 'sage', label: 'Đã Hoàn Thành', enLabel: 'Completed' },
  FAILED: { tone: 'rust', label: 'Chưa Đạt Điểm', enLabel: 'Failed' },
  OVERDUE: { tone: 'rust', label: 'Quá Hạn', enLabel: 'Overdue' },
};

const GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'Không gộp nhóm' },
  { id: 'STATUS', label: 'Theo Trạng Thái' },
  { id: 'RISK', label: 'Theo Mức Độ Rủi Ro Tuân Thủ' },
  { id: 'COURSE_TYPE', label: 'Theo Phân Loại Khóa Học' },
  { id: 'POSITION', label: 'Theo Chức Danh' },
];

export default function ManagerReports() {
  const { currentUser: authUser, users, actionPlans, openSurveyModal, getUserRoadmapTabs } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const teamMembers = useMemo(() => getTeamMembersForManager(activeManager), [activeManager]);

  // Main Tabs
  const [activeTab, setActiveTab] = useState('COMPLIANCE_ROSTER'); // COMPLIANCE_ROSTER | SCORE_ANALYTICS | RISK_ALERTS | ACTION_PLANS

  // Filters
  const [quickFilter, setQuickFilter] = useState('ALL'); // ALL | COMPLIANT | IN_PROGRESS | COMPLETED | RISK_OVERDUE
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('NONE');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const [levelFilter, setLevelFilter] = useState('ALL');
  const [courseTypeFilter, setCourseTypeFilter] = useState('ALL');
  const [scoreRangeFilter, setScoreRangeFilter] = useState('ALL'); // ALL | PASS | FAIL | UNGRADED
  const [riskFilter, setRiskFilter] = useState('ALL'); // ALL | SAFE | WARNING | CRITICAL

  // Modals & Actions
  const [transcriptUser, setTranscriptUser] = useState(null);
  const [roadmapUser, setRoadmapUser] = useState(null);
  const [reminderMember, setReminderMember] = useState(null);
  const [batchReminderSent, setBatchReminderSent] = useState(false);
  const [singleReminderSent, setSingleReminderSent] = useState(false);

  // Computed Team Summary KPIs
  const kpis = useMemo(() => {
    const total = teamMembers.length;
    const completed = teamMembers.filter((m) => m.status === 'COMPLETED').length;
    const inProgress = teamMembers.filter((m) => m.status === 'IN_PROGRESS').length;
    const overdue = teamMembers.filter((m) => m.status === 'OVERDUE').length;
    const failed = teamMembers.filter((m) => m.status === 'FAILED').length;
    const notStarted = teamMembers.filter((m) => m.status === 'NOT_STARTED').length;

    const mandatoryList = teamMembers.filter((m) => m.courseType === 'MANDATORY');
    const mandatoryCompleted = mandatoryList.filter((m) => m.status === 'COMPLETED').length;
    const mandatoryComplianceRate = mandatoryList.length > 0 ? Math.round((mandatoryCompleted / mandatoryList.length) * 100) : 100;

    const avgProgress = total > 0 ? Math.round(teamMembers.reduce((s, m) => s + (m.progress || 0), 0) / total) : 0;

    const scoredList = teamMembers.filter((m) => m.score != null);
    const avgScore = scoredList.length > 0 ? Math.round(scoredList.reduce((s, m) => s + m.score, 0) / scoredList.length) : null;
    const passCount = scoredList.filter((m) => m.score >= 80).length;
    const passRate = scoredList.length > 0 ? Math.round((passCount / scoredList.length) * 100) : 100;

    const criticalRisks = teamMembers.filter((m) => m.status === 'OVERDUE' || m.status === 'FAILED');
    const warningRisks = teamMembers.filter((m) => m.inactiveDays >= 3 && m.status !== 'COMPLETED' && m.status !== 'OVERDUE' && m.status !== 'FAILED');
    const totalNeedsAttention = criticalRisks.length + warningRisks.length;

    return {
      total,
      completed,
      inProgress,
      overdue,
      failed,
      notStarted,
      mandatoryListCount: mandatoryList.length,
      mandatoryComplianceRate,
      avgProgress,
      avgScore,
      passRate,
      totalNeedsAttention,
      criticalRisksCount: criticalRisks.length,
      warningRisksCount: warningRisks.length,
    };
  }, [teamMembers]);

  // Tag each member with a normalized Risk Level
  const enrichedTeamMembers = useMemo(() => {
    return teamMembers.map((m) => {
      let riskLevel = 'SAFE'; // SAFE | WARNING | CRITICAL
      let riskLabel = '🟢 Đạt Chuẩn Tuân Thủ';
      let riskDetail = 'Đang học đúng tiến độ hoặc đã hoàn thành khóa học.';

      if (m.status === 'OVERDUE') {
        riskLevel = 'CRITICAL';
        riskLabel = '🔴 Rủi Ro Quá Hạn';
        riskDetail = `Đã trễ hạn chót (${m.dueDate}) — nguy cơ bị ghi nhận vi phạm kiểm toán tuân thủ.`;
      } else if (m.status === 'FAILED') {
        riskLevel = 'CRITICAL';
        riskLabel = '🔴 Chưa Đạt Điểm';
        riskDetail = `Điểm bài thi ${m.score}% (dưới chuẩn 80%) sau ${m.attempts || 1} lần thi. Cần mở thi lại.`;
      } else if (m.inactiveDays >= 3 && m.status !== 'COMPLETED') {
        riskLevel = 'WARNING';
        riskLabel = '🟡 Cần Nhắc Nhở';
        riskDetail = `Đã ${m.inactiveDays} ngày không đăng nhập học tập.`;
      }

      return {
        ...m,
        riskLevel,
        riskLabel,
        riskDetail,
      };
    });
  }, [teamMembers]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (levelFilter !== 'ALL') count++;
    if (courseTypeFilter !== 'ALL') count++;
    if (scoreRangeFilter !== 'ALL') count++;
    if (riskFilter !== 'ALL') count++;
    return count;
  }, [levelFilter, courseTypeFilter, scoreRangeFilter, riskFilter]);

  // Filtered List
  const filteredList = useMemo(() => {
    return enrichedTeamMembers.filter((m) => {
      // Quick Filter Pills
      if (quickFilter === 'COMPLIANT' && m.riskLevel !== 'SAFE') return false;
      if (quickFilter === 'IN_PROGRESS' && m.status !== 'IN_PROGRESS') return false;
      if (quickFilter === 'COMPLETED' && m.status !== 'COMPLETED') return false;
      if (quickFilter === 'RISK_OVERDUE' && m.riskLevel === 'SAFE') return false;

      // Dropdown Panel Filters
      if (levelFilter !== 'ALL' && String(m.level) !== levelFilter) return false;
      if (courseTypeFilter !== 'ALL' && m.courseType !== courseTypeFilter) return false;
      if (scoreRangeFilter !== 'ALL') {
        if (scoreRangeFilter === 'PASS' && (m.score == null || m.score < 80)) return false;
        if (scoreRangeFilter === 'FAIL' && (m.score == null || m.score >= 80)) return false;
        if (scoreRangeFilter === 'UNGRADED' && m.score != null) return false;
      }
      if (riskFilter !== 'ALL' && m.riskLevel !== riskFilter) return false;

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchId = m.employeeId?.toLowerCase().includes(q);
        const matchCourse = m.course?.toLowerCase().includes(q);
        const matchPos = m.position?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCourse && !matchPos) return false;
      }

      return true;
    });
  }, [enrichedTeamMembers, quickFilter, levelFilter, courseTypeFilter, scoreRangeFilter, riskFilter, search]);

  // Grouping logic
  function groupKeyOf(m) {
    if (groupBy === 'STATUS') {
      const meta = STATUS_META[m.status] || STATUS_META.NOT_STARTED;
      return { key: m.status, label: meta.label, icon: 'ti-progress-check' };
    }
    if (groupBy === 'RISK') {
      return {
        key: m.riskLevel,
        label: m.riskLevel === 'CRITICAL' ? '🔴 Rủi Ro Cao (Quá Hạn / Rớt Điểm)' : m.riskLevel === 'WARNING' ? '🟡 Cảnh Báo (Không Hoạt Động)' : '🟢 An Toàn & Tuân Thủ Tốt',
        icon: m.riskLevel === 'CRITICAL' ? 'ti-alert-octagon' : m.riskLevel === 'WARNING' ? 'ti-alert-triangle' : 'ti-circle-check',
      };
    }
    if (groupBy === 'COURSE_TYPE') {
      return {
        key: m.courseType,
        label: m.courseType === 'MANDATORY' ? '🔒 Khóa Học Bắt Buộc Tuân Thủ' : m.courseType === 'ROADMAP' ? '🏆 Khóa Học Theo Lộ Trình' : '✨ Khóa Học Tự Chọn',
        icon: 'ti-certificate',
      };
    }
    if (groupBy === 'POSITION') {
      return {
        key: m.position || 'OTHER',
        label: m.position || 'Chưa Phân Vị Trí',
        icon: 'ti-briefcase',
      };
    }
    return { key: 'ALL', label: '', icon: '' };
  }

  const groups = useMemo(() => {
    if (groupBy === 'NONE') return null;
    const map = new Map();
    filteredList.forEach((m) => {
      const g = groupKeyOf(m);
      if (!map.has(g.key)) map.set(g.key, { ...g, rows: [] });
      map.get(g.key).rows.push(m);
    });
    return Array.from(map.values());
  }, [filteredList, groupBy]);

  function toggleGroup(key) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleResetAllFilters() {
    setSearch('');
    setQuickFilter('ALL');
    setLevelFilter('ALL');
    setCourseTypeFilter('ALL');
    setScoreRangeFilter('ALL');
    setRiskFilter('ALL');
    setGroupBy('NONE');
  }

  function handleExportCsv() {
    const headers = [
      'Mã Nhân Viên',
      'Họ Và Tên',
      'Chức Danh',
      'Cấp Bậc',
      'Khóa Học Phân Bổ',
      'Phân Loại',
      'Tiến Độ (%)',
      'Trạng Thái',
      'Điểm Số (%)',
      'Hạn Chót',
      'Ngày Học Gần Nhất',
      'Số Ngày Không Vào Học',
      'Đánh Giá Rủi Ro Tuân Thủ',
    ];

    const rows = filteredList.map((m) => [
      m.employeeId || '',
      m.name || '',
      m.position || '',
      `Level ${m.level || 7}`,
      m.course || '',
      m.courseType === 'MANDATORY' ? 'Bắt Buộc' : m.courseType === 'ROADMAP' ? 'Lộ Trình' : 'Tự Chọn',
      `${m.progress || 0}%`,
      STATUS_META[m.status]?.label || m.status,
      m.score != null ? `${m.score}%` : 'Chưa thi',
      m.dueDate || '—',
      m.lastActivity || 'Chưa ghi nhận',
      m.inactiveDays || 0,
      m.riskLabel || '',
    ]);

    downloadCsv(`Bao_Cao_Tuan_Thu_Dao_Tao_${activeManager.divisionCode || 'Team'}_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  }

  function handleSendBatchReminder() {
    setBatchReminderSent(true);
    setTimeout(() => setBatchReminderSent(false), 3000);
  }

  function handleSendSingleReminder() {
    setSingleReminderSent(true);
    setTimeout(() => {
      setSingleReminderSent(false);
      setReminderMember(null);
    }, 1500);
  }

  function renderRosterTable(members) {
    return (
      <div className="card" style={{ borderRadius: 10, border: '1px solid var(--line)', overflowX: 'auto', marginBottom: 14 }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ width: '22%' }}>Nhân Viên</th>
              <th style={{ width: '22%' }}>Khóa Học Phân Bổ</th>
              <th style={{ width: '8%' }}>Phân Loại</th>
              <th style={{ width: '12%' }}>Tiến Độ</th>
              <th style={{ width: '9%' }}>Trạng Thái</th>
              <th style={{ width: '8%' }}>Điểm Thi</th>
              <th style={{ width: '10%' }}>Hạn Chót</th>
              <th style={{ width: '9%', textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-faint)' }}>
                  <i className="ti ti-users" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                  Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const meta = STATUS_META[m.status] || STATUS_META.NOT_STARTED;
                const isCritical = m.riskLevel === 'CRITICAL';
                const isWarning = m.riskLevel === 'WARNING';

                return (
                  <tr key={m.employeeId} style={{ background: isCritical ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: isCritical ? '#FEE2E2' : isWarning ? '#FEF3C7' : '#EFF6FF',
                            color: isCritical ? '#DC2626' : isWarning ? '#D97706' : '#1D4ED8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 12,
                            flexShrink: 0,
                          }}
                        >
                          {(m.name || 'NV').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{m.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{m.employeeId}</span> &middot; {m.position}
                          </div>
                          <div style={{ fontSize: 11, color: isCritical ? 'var(--rust)' : isWarning ? '#B45309' : 'var(--sage)', fontWeight: 600, marginTop: 2 }}>
                            {m.riskLabel}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{m.course}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                        Level {m.level} &middot; {m.divisionCode}
                      </div>
                    </td>

                    <td>
                      <CourseTypeBadge courseType={m.courseType} />
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar
                            value={m.progress}
                            tone={m.progress >= 100 ? 'sage' : m.status === 'OVERDUE' || m.status === 'FAILED' ? 'rust' : 'rail'}
                            size="sm"
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', minWidth: 32 }}>
                          {m.progress}%
                        </span>
                      </div>
                    </td>

                    <td>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>

                    <td>
                      {m.score !== null ? (
                        <div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: m.score >= 80 ? 'var(--sage)' : 'var(--rust)' }}>
                            {m.score}%
                          </span>
                          {m.attempts && (
                            <span style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginLeft: 4 }}>
                              ({m.attempts}L)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: 12, fontWeight: m.overdue ? 700 : 500, color: m.overdue ? 'var(--rust)' : 'var(--ink)' }}>
                        {m.dueDate}
                      </div>
                      {m.inactiveDays > 0 && m.status !== 'COMPLETED' && (
                        <div style={{ fontSize: 11, color: m.inactiveDays >= 3 ? '#D97706' : 'var(--ink-faint)' }}>
                          Vắng {m.inactiveDays} ngày
                        </div>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-bell"
                          onClick={() => setReminderMember(m)}
                          title="Gửi email thông báo nhắc nhở tiến độ"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="ti-file-certificate"
                          onClick={() => {
                            const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                            const fullUser = list.find((u) => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
                            setTranscriptUser(fullUser);
                          }}
                          title="Xem toàn bộ bảng điểm & khóa học nhân sự này"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Báo Cáo &amp; Phân Tích Tuân Thủ Đào Tạo Đội Ngũ</h1>
            <Badge tone="amber" icon="ti-report-analytics">
              {activeManager.storeName || `${activeManager.divisionCode} - ${activeManager.departmentCode}`}
            </Badge>
          </div>
          <p style={{ margin: 0 }}>
            Giám sát mức độ tuân thủ bắt buộc, phân tích phổ điểm thi, theo dõi các ca trễ hạn và quản lý cam kết hành động ứng dụng thực tế (Kirkpatrick L3) của {teamMembers.length} nhân sự trực thuộc {activeManager.fullName}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            icon="ti-download"
            onClick={handleExportCsv}
          >
            Xuất Báo Cáo Excel / CSV
          </Button>
          <Button
            variant="primary"
            icon={batchReminderSent ? 'ti-check' : 'ti-bell-ringing'}
            onClick={handleSendBatchReminder}
            disabled={batchReminderSent || kpis.totalNeedsAttention === 0}
          >
            {batchReminderSent ? 'Đã Gửi Nhắc Nhở Hàng Loạt!' : `Đôn Đốc ${kpis.totalNeedsAttention} Ca Cần Chú Ý`}
          </Button>
        </div>
      </div>

      {/* TOP 4 EXECUTIVE METRIC CARDS */}
      <div className="grid grid-4" style={{ marginBottom: 24, gap: 14 }}>
        <div className="card card-pad" style={{ borderLeft: '4px solid var(--sage, #10B981)', background: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Tuân Thủ Khóa Bắt Buộc
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--sage)' }}>{kpis.mandatoryComplianceRate}%</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              ({kpis.mandatoryListCount} khóa tuân thủ)
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
            Đáp ứng tiêu chuẩn kiểm toán MM Mega Market
          </div>
        </div>

        <div className="card card-pad" style={{ borderLeft: '4px solid var(--rail, #005BAA)', background: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Tiến Độ Hoàn Thành Chung
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--rail)' }}>{kpis.avgProgress}%</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              ({kpis.completed}/{kpis.total} xong)
            </span>
          </div>
          <ProgressBar value={kpis.avgProgress} tone="rail" size="sm" />
        </div>

        <div className="card card-pad" style={{ borderLeft: '4px solid #8B5CF6', background: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Điểm Đánh Giá Năng Lực TB
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#8B5CF6' }}>
              {kpis.avgScore != null ? `${kpis.avgScore}%` : '—'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              (Tỷ lệ đạt: {kpis.passRate}%)
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
            Chuẩn đạt bài thi ≥ 80%
          </div>
        </div>

        <div className="card card-pad" style={{ borderLeft: '4px solid var(--rust, #EF4444)', background: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Cảnh Báo Cần Xử Lý
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: kpis.totalNeedsAttention > 0 ? 'var(--rust)' : 'var(--sage)' }}>
              {kpis.totalNeedsAttention}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              ca rủi ro
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
            {kpis.criticalRisksCount} quá hạn/rớt &middot; {kpis.warningRisksCount} vắng học
          </div>
        </div>
      </div>

      {/* SUB-TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'COMPLIANCE_ROSTER', label: 'Báo Cáo Chi Tiết Từng Nhân Sự', icon: 'ti-list-check' },
          { id: 'SCORE_ANALYTICS', label: 'Phân Tích Điểm Số & Năng Lực', icon: 'ti-chart-pie' },
          { id: 'RISK_ALERTS', label: 'Giám Sát Rủi Ro & Đôn Đốc Hạn Chót', icon: 'ti-alert-triangle', badge: kpis.totalNeedsAttention },
          { id: 'ACTION_PLANS', label: 'Cam Kết Hành Động Thực Tế (L3)', icon: 'ti-checklist' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
              color: activeTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: activeTab === tab.id ? 'var(--rail)' : 'var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: activeTab === tab.id ? 700 : 500,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <span style={{
                background: activeTab === tab.id ? '#fff' : 'var(--rust)',
                color: activeTab === tab.id ? 'var(--rust)' : '#fff',
                padding: '1px 6px',
                borderRadius: 10,
                fontSize: 10.5,
                fontWeight: 800,
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: BÁO CÁO CHI TIẾT TỪNG NHÂN SỰ (COMPLIANCE ROSTER) */}
      {activeTab === 'COMPLIANCE_ROSTER' && (
        <>
          {/* STANDARDIZED FILTER TOOLBAR CARD */}
          <div className="card card-pad" style={{ marginBottom: 18, background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
            {/* Row 0: Quick filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
              {[
                { id: 'ALL', label: 'Tất Cả Nhân Sự', count: teamMembers.length },
                { id: 'COMPLIANT', label: 'Đạt Chuẩn Tuân Thủ', count: enrichedTeamMembers.filter((m) => m.riskLevel === 'SAFE').length },
                { id: 'IN_PROGRESS', label: 'Đang Học', count: teamMembers.filter((m) => m.status === 'IN_PROGRESS').length },
                { id: 'COMPLETED', label: 'Đã Xong 100%', count: teamMembers.filter((m) => m.status === 'COMPLETED').length },
                { id: 'RISK_OVERDUE', label: '🔴 Cần Chú Ý / Quá Hạn', count: kpis.totalNeedsAttention, highlight: true },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setQuickFilter(f.id)}
                  className={`btn btn-sm ${quickFilter === f.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    borderRadius: 20,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderColor: quickFilter === f.id ? 'var(--blue)' : f.highlight && f.count > 0 ? 'var(--rust)' : 'var(--line)',
                    background: quickFilter === f.id ? (f.highlight ? 'var(--rust)' : 'var(--blue)') : f.highlight && f.count > 0 ? 'var(--rust-soft)' : 'transparent',
                    color: quickFilter === f.id ? '#fff' : f.highlight && f.count > 0 ? 'var(--rust-soft-text)' : 'var(--ink)',
                    fontWeight: quickFilter === f.id || f.highlight ? 700 : 500,
                  }}
                >
                  {f.label}
                  <span style={{
                    background: quickFilter === f.id ? 'rgba(255,255,255,0.3)' : f.highlight && f.count > 0 ? 'var(--rust)' : 'var(--paper-sunken)',
                    color: quickFilter === f.id || (f.highlight && f.count > 0) ? '#fff' : 'var(--ink-soft)',
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontSize: 10.5,
                    fontWeight: 700,
                  }}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Row 1: Search, Group By & Filter Toggle */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              {/* Search input */}
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                  placeholder="Tìm theo tên NV, mã NV, khóa học, chức danh..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
                  >
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>

              {/* Right controls: Group By & Filter Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Group By select */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Gộp nhóm:</span>
                  <select
                    value={groupBy}
                    onChange={(e) => { setGroupBy(e.target.value); setCollapsedGroups(new Set()); }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: 12.5,
                      fontWeight: groupBy !== 'NONE' ? 700 : 500,
                      color: groupBy !== 'NONE' ? 'var(--blue, #005BAA)' : 'var(--ink)',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {GROUP_BY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`btn btn-sm ${activeFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
                  style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
                >
                  <i className="ti ti-filter" />
                  <span>Bộ Lọc</span>
                  {activeFiltersCount > 0 && (
                    <span style={{ background: '#fff', color: 'var(--rail, #005BAA)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                      {activeFiltersCount}
                    </span>
                  )}
                  <i className={`ti ${showFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
                </button>
              </div>
            </div>

            {/* Row 2: Collapsible Filter Panel */}
            {showFilters && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  {/* Risk Level Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      MỨC ĐỘ RỦI RO TUÂN THỦ
                    </label>
                    <select
                      className="field-select"
                      style={{
                        width: '100%',
                        height: 36,
                        fontSize: 12,
                        borderRadius: 6,
                        background: riskFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                        borderColor: riskFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                        color: riskFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                        fontWeight: riskFilter !== 'ALL' ? 700 : 500,
                      }}
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả mức độ</option>
                      <option value="SAFE">🟢 An toàn / Đạt chuẩn tuân thủ</option>
                      <option value="WARNING">🟡 Cảnh báo / Vắng học &gt; 3 ngày</option>
                      <option value="CRITICAL">🔴 Rủi ro cao / Quá hạn hoặc rớt điểm</option>
                    </select>
                  </div>

                  {/* Course Type Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      PHÂN LOẠI KHÓA HỌC
                    </label>
                    <select
                      className="field-select"
                      style={{
                        width: '100%',
                        height: 36,
                        fontSize: 12,
                        borderRadius: 6,
                        background: courseTypeFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                        borderColor: courseTypeFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                        color: courseTypeFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                        fontWeight: courseTypeFilter !== 'ALL' ? 700 : 500,
                      }}
                      value={courseTypeFilter}
                      onChange={(e) => setCourseTypeFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả phân loại</option>
                      <option value="MANDATORY">Bắt Buộc Tuân Thủ (Mandatory)</option>
                      <option value="ROADMAP">Theo Lộ Trình Cấp Bậc (Roadmap)</option>
                      <option value="ELECTIVE">Tự Chọn (Elective)</option>
                    </select>
                  </div>

                  {/* Score Range Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      KẾT QUẢ ĐIỂM THI
                    </label>
                    <select
                      className="field-select"
                      style={{
                        width: '100%',
                        height: 36,
                        fontSize: 12,
                        borderRadius: 6,
                        background: scoreRangeFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                        borderColor: scoreRangeFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                        color: scoreRangeFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                        fontWeight: scoreRangeFilter !== 'ALL' ? 700 : 500,
                      }}
                      value={scoreRangeFilter}
                      onChange={(e) => setScoreRangeFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả kết quả</option>
                      <option value="PASS">🟢 Đạt chuẩn (&ge; 80%)</option>
                      <option value="FAIL">🔴 Chưa đạt (&lt; 80%)</option>
                      <option value="UNGRADED">⚪ Chưa làm bài kiểm tra</option>
                    </select>
                  </div>

                  {/* Level Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      CẤP BẬC NHÂN SỰ
                    </label>
                    <select
                      className="field-select"
                      style={{
                        width: '100%',
                        height: 36,
                        fontSize: 12,
                        borderRadius: 6,
                        background: levelFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                        borderColor: levelFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                        color: levelFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                        fontWeight: levelFilter !== 'ALL' ? 700 : 500,
                      }}
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả cấp bậc</option>
                      <option value="5">Level 5 (Supervisor)</option>
                      <option value="6">Level 6 (Specialist / Officer)</option>
                      <option value="7">Level 7 (Staff)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Row 3: Active Filters Summary Bar */}
            {(search || quickFilter !== 'ALL' || levelFilter !== 'ALL' || courseTypeFilter !== 'ALL' || scoreRangeFilter !== 'ALL' || riskFilter !== 'ALL' || groupBy !== 'NONE') && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Đang lọc theo:</span>
                  {search && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Từ khóa: <strong>"{search}"</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                    </span>
                  )}
                  {quickFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Dải chọn nhanh: <strong>{quickFilter === 'COMPLIANT' ? 'Đạt chuẩn' : quickFilter === 'IN_PROGRESS' ? 'Đang học' : quickFilter === 'COMPLETED' ? 'Đã xong' : 'Cảnh báo'}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setQuickFilter('ALL')} />
                    </span>
                  )}
                  {riskFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Rủi ro: <strong>{riskFilter === 'SAFE' ? 'An toàn' : riskFilter === 'WARNING' ? 'Cảnh báo' : 'Rủi ro cao'}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setRiskFilter('ALL')} />
                    </span>
                  )}
                  {courseTypeFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Loại khóa: <strong>{courseTypeFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setCourseTypeFilter('ALL')} />
                    </span>
                  )}
                  {scoreRangeFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Điểm: <strong>{scoreRangeFilter === 'PASS' ? '>=80%' : scoreRangeFilter === 'FAIL' ? '<80%' : 'Chưa thi'}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setScoreRangeFilter('ALL')} />
                    </span>
                  )}
                  {levelFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Cấp bậc: <strong>Level {levelFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setLevelFilter('ALL')} />
                    </span>
                  )}
                  {groupBy !== 'NONE' && (
                    <span className="badge" style={{ background: '#F8FAFC', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Gộp nhóm: <strong>{GROUP_BY_OPTIONS.find((o) => o.id === groupBy)?.label}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setGroupBy('NONE')} />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
                  >
                    Xóa tất cả bộ lọc
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Tìm thấy <strong>{filteredList.length}</strong> / {teamMembers.length} nhân sự
                </div>
              </div>
            )}
          </div>

          {/* TABLE CONTENT */}
          {groupBy === 'NONE' || !groups ? (
            renderRosterTable(filteredList)
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {groups.map((g) => {
                const isCollapsed = collapsedGroups.has(g.key);
                return (
                  <div key={g.key} className="card" style={{ overflow: 'hidden', background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
                    <button
                      onClick={() => toggleGroup(g.key)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        background: '#F8FAFC',
                        border: 'none',
                        borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ color: 'var(--ink-faint)' }} />
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EFF6FF', color: 'var(--blue, #005BAA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`ti ${g.icon}`} style={{ fontSize: 15 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 13.5, color: '#0F172A' }}>{g.label}</div>
                      <Badge tone="slate">{g.rows.length} nhân sự</Badge>
                    </button>
                    {!isCollapsed && (
                      <div style={{ padding: '8px 12px 0' }}>
                        {renderRosterTable(g.rows)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: PHÂN TÍCH ĐIỂM SỐ & NĂNG LỰC (SCORE ANALYTICS) */}
      {activeTab === 'SCORE_ANALYTICS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
          <div className="grid grid-2" style={{ gap: 16 }}>
            {/* Phổ điểm kiểm tra */}
            <div className="card card-pad">
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                Phổ Điểm Kiểm Tra Năng Lực Đội Ngũ
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
                Tỷ lệ nhân viên đạt điểm xuất sắc (≥ 90%), đạt chuẩn (80% - 89%) và cần cải thiện (&lt; 80%).
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Xuất Sắc (90% - 100%)', count: teamMembers.filter((m) => m.score >= 90).length, tone: 'sage', color: '#10B981' },
                  { label: 'Đạt Chuẩn (80% - 89%)', count: teamMembers.filter((m) => m.score >= 80 && m.score < 90).length, tone: 'rail', color: '#005BAA' },
                  { label: 'Tiệm Cận (70% - 79%)', count: teamMembers.filter((m) => m.score >= 70 && m.score < 80).length, tone: 'amber', color: '#F59E0B' },
                  { label: 'Cần Cải Thiện (< 70%)', count: teamMembers.filter((m) => m.score != null && m.score < 70).length, tone: 'rust', color: '#EF4444' },
                ].map((item) => {
                  const percent = teamMembers.length > 0 ? Math.round((item.count / teamMembers.length) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{item.label}</span>
                        <span><strong>{item.count}</strong> nhân sự ({percent}%)</span>
                      </div>
                      <div style={{ width: '100%', height: 8, background: 'var(--paper-sunken)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: item.color, borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bảng Xếp Hạng Thành Tích Học Tập */}
            <div className="card card-pad">
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                🏆 Top Nhân Sự Xuất Sắc Nhất
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
                Nhân viên có điểm số cao nhất và hoàn thành khóa học sớm nhất.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {teamMembers
                  .slice()
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .slice(0, 5)
                  .map((m, idx) => (
                    <div
                      key={m.employeeId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: idx === 0 ? '#FEF9C3' : idx === 1 ? '#F1F5F9' : idx === 2 ? '#FFEDD5' : 'var(--paper-sunken)',
                        borderRadius: 8,
                        border: idx === 0 ? '1px solid #FDE047' : '1px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 900, fontSize: 14, color: idx === 0 ? '#CA8A04' : 'var(--ink-soft)', width: 20 }}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{m.position} &middot; {m.course}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: m.score >= 80 ? 'var(--sage)' : 'var(--rust)' }}>
                          {m.score != null ? `${m.score}%` : `${m.progress}%`}
                        </div>
                        <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
                          {m.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang học'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GIÁM SÁT RỦI RO & ĐÔN ĐỐC (RISK ALERTS) */}
      {activeTab === 'RISK_ALERTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '14px 18px', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-alert-octagon" style={{ fontSize: 18 }} />
              Cảnh Báo Kiểm Toán Tuân Thủ Định Kỳ (Compliance Audit Notice)
            </div>
            Có <strong>{kpis.criticalRisksCount} nhân sự trễ hạn/chưa đạt</strong> và <strong>{kpis.warningRisksCount} nhân sự vắng mặt lâu ngày</strong>. Quản lý cần chủ động gửi nhắc nhở hoặc tổ chức kèm cặp trực tiếp để đảm bảo 100% tỷ lệ hoàn thành trước kỳ kiểm toán.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {enrichedTeamMembers
              .filter((m) => m.riskLevel !== 'SAFE')
              .map((m) => (
                <div
                  key={m.employeeId}
                  className="card card-pad"
                  style={{
                    borderLeft: `5px solid ${m.riskLevel === 'CRITICAL' ? 'var(--rust)' : '#F59E0B'}`,
                    background: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 14.5 }}>{m.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>({m.employeeId})</span>
                        <Badge tone={m.riskLevel === 'CRITICAL' ? 'rust' : 'amber'}>{m.riskLabel}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                        {m.position} &middot; Cấp bậc: Level {m.level} &middot; Khóa: <strong>{m.course}</strong>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      icon="ti-bell-ringing"
                      onClick={() => setReminderMember(m)}
                    >
                      Gửi Thông Báo Đôn Đốc
                    </Button>
                  </div>

                  <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--ink)' }}>
                    <strong>Nguyên nhân cảnh báo:</strong> {m.riskDetail}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: CAM KẾT HÀNH ĐỘNG THỰC TẾ (KIRKPATRICK L3) */}
      {activeTab === 'ACTION_PLANS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 12.5 }}>
            <i className="ti ti-checklist" style={{ marginRight: 6 }} />
            Theo dõi kế hoạch hành động ứng dụng thực tế vào vận hành và hoàn thành <strong>Đánh Giá Tác Động Hành Vi (Kirkpatrick Level 3)</strong> sau 3-6 tháng.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {actionPlans.map((plan) => (
              <div key={plan.id} className="card card-pad" style={{ borderLeft: '4px solid var(--amber)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 14.5 }}>{plan.learnerName}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>&middot; {plan.learnerPosition}</span>
                      <Badge tone={plan.managerReviewL3 ? 'sage' : 'amber'}>
                        {plan.managerReviewL3 ? 'Level 3 Review Signed-off' : 'Pending Level 3 Review'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--rail)', fontWeight: 600, marginTop: 3 }}>
                      Khóa học liên kết: {plan.courseName}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={plan.managerReviewL3 ? 'outline' : 'primary'}
                    icon="ti-award"
                    onClick={() => openSurveyModal({ title: plan.courseName }, 'L3', { name: plan.learnerName, fullName: plan.learnerName })}
                  >
                    {plan.managerReviewL3 ? 'Sửa Đánh Giá L3' : 'Đánh Giá Hành Vi (3-6 Tháng)'}
                  </Button>
                </div>

                <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 2 }}>
                    Cam kết hành động tại nơi làm việc:
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, marginBottom: 6 }}>
                    "{plan.targetCommitment}"
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    KPI Mục Tiêu: <strong>{plan.kpiTarget}</strong> &middot; Hạn Đánh Giá: <strong>{plan.evaluationDate}</strong>
                  </div>
                </div>

                {plan.managerReviewL3 && (
                  <div style={{ background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                      ✓ Đánh giá của Quản lý ({plan.managerReviewL3.score}/5.0 Sao):
                    </div>
                    <div>{plan.managerReviewL3.behaviorChange} - {plan.managerReviewL3.productivityGain}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SINGLE REMINDER MODAL */}
      <Modal
        isOpen={Boolean(reminderMember)}
        onClose={() => setReminderMember(null)}
        title="Gửi Thông Báo Đôn Đốc Tiến Độ Học Tập"
        subtitle={reminderMember ? `${reminderMember.name} (${reminderMember.employeeId}) · ${reminderMember.position}` : ''}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Button variant="ghost" onClick={() => setReminderMember(null)}>Đóng</Button>
            <Button
              variant="primary"
              icon={singleReminderSent ? 'ti-check' : 'ti-send'}
              onClick={handleSendSingleReminder}
              disabled={singleReminderSent}
            >
              {singleReminderSent ? 'Đã Gửi Email Thành Công!' : 'Gửi Email & Thông Báo App'}
            </Button>
          </div>
        }
      >
        {reminderMember && (
          <div>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{reminderMember.course}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>Phân loại: <strong>{reminderMember.courseType}</strong></span>
                <span>Hạn chót: <strong style={{ color: reminderMember.overdue ? 'var(--rust)' : 'inherit' }}>{reminderMember.dueDate}</strong></span>
                <span>Tiến độ: <strong>{reminderMember.progress}%</strong></span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                Nội Dung Thông Báo Nhắc Nhở Từ Quản Lý:
              </label>
              <textarea
                className="field-input"
                rows={4}
                style={{ width: '100%', fontSize: 12.5, borderRadius: 8, padding: 10 }}
                defaultValue={`Chào ${reminderMember.name}, quản lý nhận thấy tiến độ khóa "${reminderMember.course}" của bạn hiện đang ở mức ${reminderMember.progress}%. Vui lòng sắp xếp thời gian hoàn thành bài học và bài kiểm tra trước hạn ${reminderMember.dueDate} để đảm bảo tuân thủ tiêu chuẩn vận hành siêu thị.`}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* USER TRANSCRIPT MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
      />

      {/* ROADMAP MODAL */}
      <Modal
        isOpen={Boolean(roadmapUser)}
        onClose={() => setRoadmapUser(null)}
        title="Lộ Trình Cấp Bậc Của Nhân Sự"
        subtitle={roadmapUser ? `${roadmapUser.fullName} · Level ${roadmapUser.level}` : ''}
        size="md"
      >
        {roadmapUser && <RoadmapProgressSummary roadmap={getUserRoadmapTabs(roadmapUser)} />}
      </Modal>
    </>
  );
}
