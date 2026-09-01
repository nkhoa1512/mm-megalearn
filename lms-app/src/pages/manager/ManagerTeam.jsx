import React, { useState, useMemo } from 'react';
import { getTeamMembersForManager, managerUser as defaultManager, teamSkillGapMatrix, allUsers } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import { Badge, ProgressBar, Button, CourseTypeBadge, Modal } from '../../features/common/ui';
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

const MANAGER_GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'Không gộp nhóm' },
  { id: 'STATUS', label: 'Theo Trạng Thái' },
  { id: 'RISK', label: 'Theo Mức Độ Rủi Ro Tuân Thủ' },
  { id: 'COURSE_TYPE', label: 'Theo Phân Loại Khóa Học' },
  { id: 'POSITION', label: 'Theo Chức Danh / Vị Trí' },
  { id: 'LEVEL', label: 'Theo Cấp Bậc (Job Level)' },
];

export default function ManagerTeam() {
  const { currentUser: authUser, openSurveyModal, actionPlans, users } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const rawTeamMembers = useMemo(() => getTeamMembersForManager(activeManager), [activeManager]);

  // Main navigation tabs: ROSTER, SCORE_ANALYTICS, SKILL_GAP, ACTION_PLANS
  const [activeTab, setActiveTab] = useState('ROSTER');

  // Filter States
  const [quickFilter, setQuickFilter] = useState('ALL'); // ALL, COMPLIANT, IN_PROGRESS, COMPLETED, RISK_OVERDUE, FAILED, NOT_STARTED
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('NONE');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const [positionFilter, setPositionFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [courseTypeFilter, setCourseTypeFilter] = useState('ALL');
  const [scoreRangeFilter, setScoreRangeFilter] = useState('ALL'); // ALL, PASS, FAIL, UNGRADED
  const [riskFilter, setRiskFilter] = useState('ALL'); // ALL, SAFE, WARNING, CRITICAL

  // Modals & Action States
  const [transcriptUser, setTranscriptUser] = useState(null);
  const [roadmapUser, setRoadmapUser] = useState(null);
  const [reminderMember, setReminderMember] = useState(null);
  const [batchReminderSent, setBatchReminderSent] = useState(false);
  const [singleReminderSent, setSingleReminderSent] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');

  // Enrich team members with comprehensive risk level & details
  const enrichedTeamMembers = useMemo(() => {
    return rawTeamMembers.map((m) => {
      let riskLevel = 'SAFE'; // SAFE | WARNING | CRITICAL
      let riskLabel = '🟢 Đạt Chuẩn Tuân Thủ';
      let riskDetail = 'Đang học đúng tiến độ hoặc đã hoàn thành chỉ tiêu đào tạo.';

      if (m.status === 'OVERDUE') {
        riskLevel = 'CRITICAL';
        riskLabel = '🔴 Rủi Ro Quá Hạn';
        riskDetail = `Đã trễ hạn chót (${m.dueDate}) — nguy cơ bị ghi nhận vi phạm kiểm toán vận hành.`;
      } else if (m.status === 'FAILED') {
        riskLevel = 'CRITICAL';
        riskLabel = '🔴 Chưa Đạt Điểm';
        riskDetail = `Điểm bài thi ${m.score}% (dưới chuẩn 80%) sau ${m.attempts || 1} lần thi. Cần kèm cặp & mở thi lại.`;
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
  }, [rawTeamMembers]);

  // Executive KPI summary calculations
  const kpis = useMemo(() => {
    const total = enrichedTeamMembers.length;
    const completed = enrichedTeamMembers.filter((m) => m.status === 'COMPLETED').length;
    const inProgress = enrichedTeamMembers.filter((m) => m.status === 'IN_PROGRESS').length;
    const overdue = enrichedTeamMembers.filter((m) => m.status === 'OVERDUE').length;
    const failed = enrichedTeamMembers.filter((m) => m.status === 'FAILED').length;
    const notStarted = enrichedTeamMembers.filter((m) => m.status === 'NOT_STARTED').length;

    const mandatoryList = enrichedTeamMembers.filter((m) => m.courseType === 'MANDATORY');
    const mandatoryCompleted = mandatoryList.filter((m) => m.status === 'COMPLETED').length;
    const mandatoryComplianceRate = mandatoryList.length > 0 ? Math.round((mandatoryCompleted / mandatoryList.length) * 100) : 100;

    const avgProgress = total > 0 ? Math.round(enrichedTeamMembers.reduce((s, m) => s + (m.progress || 0), 0) / total) : 0;

    const scoredList = enrichedTeamMembers.filter((m) => m.score != null);
    const avgScore = scoredList.length > 0 ? Math.round(scoredList.reduce((s, m) => s + m.score, 0) / scoredList.length) : null;
    const passCount = scoredList.filter((m) => m.score >= 80).length;
    const passRate = scoredList.length > 0 ? Math.round((passCount / scoredList.length) * 100) : 100;

    const criticalRisks = enrichedTeamMembers.filter((m) => m.riskLevel === 'CRITICAL');
    const warningRisks = enrichedTeamMembers.filter((m) => m.riskLevel === 'WARNING');
    const totalNeedsAttention = criticalRisks.length + warningRisks.length;

    return {
      total,
      completed,
      inProgress,
      overdue,
      failed,
      notStarted,
      mandatoryListCount: mandatoryList.length,
      mandatoryCompleted,
      mandatoryComplianceRate,
      avgProgress,
      avgScore,
      passRate,
      totalNeedsAttention,
      criticalRisksCount: criticalRisks.length,
      warningRisksCount: warningRisks.length,
    };
  }, [enrichedTeamMembers]);

  // Unique filter lists
  const positionList = useMemo(() => {
    const set = new Set();
    enrichedTeamMembers.forEach((m) => { if (m.position) set.add(m.position); });
    return Array.from(set);
  }, [enrichedTeamMembers]);

  const levelList = useMemo(() => {
    const set = new Set();
    enrichedTeamMembers.forEach((m) => { if (m.level) set.add(String(m.level)); });
    return Array.from(set).sort();
  }, [enrichedTeamMembers]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (positionFilter !== 'ALL') count++;
    if (levelFilter !== 'ALL') count++;
    if (courseTypeFilter !== 'ALL') count++;
    if (scoreRangeFilter !== 'ALL') count++;
    if (riskFilter !== 'ALL') count++;
    return count;
  }, [positionFilter, levelFilter, courseTypeFilter, scoreRangeFilter, riskFilter]);

  // Filtered members list for Roster tab
  const filteredList = useMemo(() => {
    return enrichedTeamMembers.filter((m) => {
      // Quick Filter Pills
      if (quickFilter === 'COMPLIANT' && m.riskLevel !== 'SAFE') return false;
      if (quickFilter === 'IN_PROGRESS' && m.status !== 'IN_PROGRESS') return false;
      if (quickFilter === 'COMPLETED' && m.status !== 'COMPLETED') return false;
      if (quickFilter === 'RISK_OVERDUE' && m.riskLevel === 'SAFE') return false;
      if (quickFilter === 'FAILED' && m.status !== 'FAILED') return false;
      if (quickFilter === 'NOT_STARTED' && m.status !== 'NOT_STARTED') return false;

      // Dropdown Panel Filters
      if (positionFilter !== 'ALL' && m.position !== positionFilter) return false;
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
        const matchLvl = String(m.level || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCourse && !matchPos && !matchLvl) return false;
      }

      return true;
    });
  }, [enrichedTeamMembers, quickFilter, positionFilter, levelFilter, courseTypeFilter, scoreRangeFilter, riskFilter, search]);

  // Group By Logic
  function groupKeyOf(m) {
    if (groupBy === 'STATUS') {
      const meta = STATUS_META[m.status] || STATUS_META.NOT_STARTED;
      return { key: m.status, label: meta.label, icon: 'ti-progress-check' };
    }
    if (groupBy === 'RISK') {
      return {
        key: m.riskLevel,
        label: m.riskLevel === 'CRITICAL' ? '🔴 Rủi Ro Cao (Quá Hạn / Rớt Điểm)' : m.riskLevel === 'WARNING' ? '🟡 Cảnh Báo (Không Hoạt Động)' : '🟢 An Toàn & Đạt Chuẩn',
        icon: m.riskLevel === 'CRITICAL' ? 'ti-alert-octagon' : m.riskLevel === 'WARNING' ? 'ti-alert-triangle' : 'ti-circle-check',
      };
    }
    if (groupBy === 'COURSE_TYPE') {
      return {
        key: m.courseType,
        label: m.courseType === 'MANDATORY' ? '🔒 Khóa Học Bắt Buộc Tuân Thủ' : m.courseType === 'ROADMAP' ? '🏆 Khóa Học Theo Lộ Trình Cấp Bậc' : '✨ Khóa Học Tự Chọn',
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
    if (groupBy === 'LEVEL') {
      return {
        key: String(m.level || '7'),
        label: `Cấp Bậc: Level ${m.level || 7}`,
        icon: 'ti-stairs-up',
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
    setPositionFilter('ALL');
    setLevelFilter('ALL');
    setCourseTypeFilter('ALL');
    setScoreRangeFilter('ALL');
    setRiskFilter('ALL');
    setGroupBy('NONE');
  }

  // Export comprehensive CSV
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
      'Số Lần Thi',
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
      m.attempts || 0,
      m.dueDate || '—',
      m.lastActivity || 'Chưa ghi nhận',
      m.inactiveDays || 0,
      m.riskLabel || '',
    ]);

    downloadCsv(`Bao_Cao_Dao_Tao_Doi_Ngu_${activeManager.divisionCode || 'Team'}_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  }

  // Batch reminder action
  function handleSendBatchReminder() {
    setBatchReminderSent(true);
    setTimeout(() => setBatchReminderSent(false), 3500);
  }

  // Single reminder trigger
  function openReminderModal(member) {
    setReminderMember(member);
    setReminderMessage(
      `Chào ${member.name},\nBạn đang có khóa học "${member.course}" cần hoàn thành trước ngày ${member.dueDate}. Vui lòng sắp xếp thời gian hoàn thành đúng hạn để đảm bảo tiêu chuẩn tuân thủ của phòng ban.`
    );
  }

  function handleSendSingleReminder() {
    setSingleReminderSent(true);
    setTimeout(() => {
      setSingleReminderSent(false);
      setReminderMember(null);
    }, 1500);
  }

  // Render Roster Table component
  function renderRosterTable(members) {
    return (
      <div className="card" style={{ borderRadius: 10, border: '1px solid var(--line)', overflowX: 'auto', marginBottom: 14, background: '#fff' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ width: '22%' }}>Nhân Viên</th>
              <th style={{ width: '22%' }}>Chương Trình / Khóa Học</th>
              <th style={{ width: '8%' }}>Phân Loại</th>
              <th style={{ width: '12%' }}>Tiến Độ</th>
              <th style={{ width: '9%' }}>Trạng Thái</th>
              <th style={{ width: '9%' }}>Điểm Thi</th>
              <th style={{ width: '9%' }}>Hạn Chót</th>
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
                        Level {m.level} &middot; {m.storeName || activeManager.storeName || 'MM An Phú'}
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
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-bell"
                          onClick={() => openReminderModal(m)}
                          title="Gửi email thông báo nhắc nhở tiến độ"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-eye"
                          onClick={() => {
                            const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                            const fullUser = list.find((u) => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
                            setTranscriptUser(fullUser);
                          }}
                          title="Xem toàn bộ khóa học & bảng điểm nhân sự này"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="ti-map-2"
                          onClick={() => {
                            const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                            const fullUser = list.find((u) => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
                            setRoadmapUser(fullUser);
                          }}
                          title="Xem Lộ Trình Cấp Bậc (Tab 1 & Tab 2) của nhân sự này"
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
      {/* 1. COMPREHENSIVE PAGE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Quản Lý Đào Tạo &amp; Phát Triển Năng Lực Đội Ngũ</h1>
            <Badge tone="amber" icon="ti-briefcase">
              {activeManager.storeName || `${activeManager.divisionCode} - ${activeManager.departmentCode}`}
            </Badge>
          </div>
          <p style={{ margin: 0 }}>
            Giám sát toàn diện tiến độ học tập, tỷ lệ tuân thủ kiểm toán, chẩn đoán khoảng cách kỹ năng (Skill Gap) và đánh giá ứng dụng hành vi (Kirkpatrick L3) cho {rawTeamMembers.length} nhân sự trực thuộc {activeManager.fullName}.
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

      {/* 2. TOP 4 EXECUTIVE METRIC CARDS */}
      <div className="grid grid-4" style={{ marginBottom: 24, gap: 14 }}>
        {/* Card 1: Mandatory Compliance */}
        <div className="card card-pad" style={{ borderLeft: '4px solid var(--sage, #10B981)', background: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Tuân Thủ Khóa Bắt Buộc
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--sage)' }}>{kpis.mandatoryComplianceRate}%</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              ({kpis.mandatoryCompleted}/{kpis.mandatoryListCount} hoàn thành)
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
            Đáp ứng tiêu chuẩn kiểm toán MM Mega Market
          </div>
        </div>

        {/* Card 2: Overall Progress */}
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

        {/* Card 3: Competency Score */}
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
            Chuẩn đạt bài thi kiến thức ≥ 80%
          </div>
        </div>

        {/* Card 4: Risk / Attention Required */}
        <div
          className="card card-pad"
          style={{
            borderLeft: '4px solid var(--rust, #EF4444)',
            background: '#fff',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s',
          }}
          onClick={() => {
            setActiveTab('ROSTER');
            setQuickFilter('RISK_OVERDUE');
          }}
          title="Bấm để lọc ngay các ca cần xử lý"
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>Cảnh Báo Cần Xử Lý</span>
            <i className="ti ti-chevron-right" style={{ fontSize: 12, color: 'var(--ink-faint)' }} />
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

      {/* 3. DISTINCT 4 MAIN TABS (NON-REDUNDANT) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'ROSTER', label: 'Tiến Độ & Tuân Thủ Chi Tiết', icon: 'ti-list-check' },
          { id: 'SCORE_ANALYTICS', label: 'Phân Tích Điểm Số & Năng Lực', icon: 'ti-chart-pie' },
          { id: 'SKILL_GAP', label: 'Ma Trận Khoảng Cách Năng Lực (Skill Gap)', icon: 'ti-chart-radar' },
          { id: 'ACTION_PLANS', label: 'Cam Kết Hành Động & Đánh Giá L3', icon: 'ti-checklist' },
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
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TIẾN ĐỘ & TUÂN THỦ CHI TIẾT (ROSTER & COMPLIANCE) */}
      {/* ========================================================================= */}
      {activeTab === 'ROSTER' && (
        <>
          {/* STANDARDIZED FILTER TOOLBAR */}
          <div className="card card-pad" style={{ marginBottom: 18, background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
            {/* ROW 0: QUICK FILTER PILLS */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
              {[
                { id: 'ALL', label: 'Tất Cả Nhân Sự', count: rawTeamMembers.length },
                { id: 'COMPLIANT', label: 'Đạt Chuẩn Tuân Thủ', count: enrichedTeamMembers.filter((m) => m.riskLevel === 'SAFE').length },
                { id: 'IN_PROGRESS', label: 'Đang Học', count: rawTeamMembers.filter((m) => m.status === 'IN_PROGRESS').length },
                { id: 'COMPLETED', label: 'Đã Hoàn Thành', count: rawTeamMembers.filter((m) => m.status === 'COMPLETED').length },
                { id: 'RISK_OVERDUE', label: '🔴 Cần Chú Ý / Quá Hạn', count: kpis.totalNeedsAttention, highlight: true },
                { id: 'FAILED', label: 'Chưa Đạt Điểm', count: rawTeamMembers.filter((m) => m.status === 'FAILED').length },
                { id: 'NOT_STARTED', label: 'Chưa Bắt Đầu', count: rawTeamMembers.filter((m) => m.status === 'NOT_STARTED').length },
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
                    background: quickFilter === f.id ? 'rgba(255,255,255,0.3)' : 'var(--paper-sunken)',
                    color: quickFilter === f.id ? '#fff' : 'var(--ink-soft)',
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

            {/* ROW 1: SEARCH, GROUP BY, FILTER TOGGLE */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              {/* Search Input */}
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                  placeholder="Tìm theo tên NV, mã NV, chức danh, khóa học..."
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

              {/* Group By & Filter Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                    {MANAGER_GROUP_BY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

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

            {/* ROW 2: COLLAPSIBLE ADVANCED FILTER PANEL */}
            {showFilters && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {/* Position */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      CHỨC DANH / VỊ TRÍ
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={positionFilter}
                      onChange={(e) => setPositionFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả chức danh</option>
                      {positionList.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>

                  {/* Level */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      CẤP BẬC (LEVEL)
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả cấp bậc</option>
                      {levelList.map((lvl) => (
                        <option key={lvl} value={lvl}>Level {lvl}</option>
                      ))}
                    </select>
                  </div>

                  {/* Course Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      PHÂN LOẠI KHÓA HỌC
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={courseTypeFilter}
                      onChange={(e) => setCourseTypeFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả phân loại</option>
                      <option value="MANDATORY">Bắt Buộc Tuân Thủ (Mandatory)</option>
                      <option value="ROADMAP">Theo Lộ Trình Cấp Bậc (Roadmap)</option>
                      <option value="ELECTIVE">Tự Chọn (Elective)</option>
                    </select>
                  </div>

                  {/* Score Range */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      KẾT QUẢ ĐIỂM THI
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={scoreRangeFilter}
                      onChange={(e) => setScoreRangeFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả kết quả</option>
                      <option value="PASS">🟢 Đạt chuẩn (&ge; 80%)</option>
                      <option value="FAIL">🔴 Chưa đạt (&lt; 80%)</option>
                      <option value="UNGRADED">⚪ Chưa làm bài kiểm tra</option>
                    </select>
                  </div>

                  {/* Risk Level */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      MỨC ĐỘ RỦI RO
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả mức độ</option>
                      <option value="SAFE">🟢 An toàn / Đạt chuẩn</option>
                      <option value="WARNING">🟡 Cảnh báo / Vắng học &gt; 3 ngày</option>
                      <option value="CRITICAL">🔴 Rủi ro cao / Quá hạn / Rớt thi</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ROW 3: ACTIVE FILTERS SUMMARY BAR */}
            {(search || quickFilter !== 'ALL' || positionFilter !== 'ALL' || levelFilter !== 'ALL' || courseTypeFilter !== 'ALL' || scoreRangeFilter !== 'ALL' || riskFilter !== 'ALL' || groupBy !== 'NONE') && (
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
                      Dải chọn: <strong>{quickFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setQuickFilter('ALL')} />
                    </span>
                  )}
                  {positionFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Chức danh: <strong>{positionFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setPositionFilter('ALL')} />
                    </span>
                  )}
                  {levelFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Cấp bậc: <strong>Level {levelFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setLevelFilter('ALL')} />
                    </span>
                  )}
                  {courseTypeFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Loại: <strong>{courseTypeFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setCourseTypeFilter('ALL')} />
                    </span>
                  )}
                  {scoreRangeFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Điểm: <strong>{scoreRangeFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setScoreRangeFilter('ALL')} />
                    </span>
                  )}
                  {riskFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Rủi ro: <strong>{riskFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setRiskFilter('ALL')} />
                    </span>
                  )}
                  {groupBy !== 'NONE' && (
                    <span className="badge" style={{ background: '#F8FAFC', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Gộp nhóm: <strong>{MANAGER_GROUP_BY_OPTIONS.find((o) => o.id === groupBy)?.label}</strong>
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
                  Tìm thấy <strong>{filteredList.length}</strong> / {rawTeamMembers.length} nhân sự
                </div>
              </div>
            )}
          </div>

          {/* CONTENT: FLAT OR GROUPED TABLE */}
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

      {/* ========================================================================= */}
      {/* TAB 2: PHÂN TÍCH ĐIỂM SỐ & HIỆU QUẢ ĐÀO TẠO (SCORE ANALYTICS) */}
      {/* ========================================================================= */}
      {activeTab === 'SCORE_ANALYTICS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
          <div className="grid grid-2" style={{ gap: 16 }}>
            {/* Phổ Điểm Kiểm Tra Năng Lực */}
            <div className="card card-pad" style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                Phổ Điểm Kiểm Tra Năng Lực Đội Ngũ
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
                Tỷ lệ nhân viên đạt điểm xuất sắc (≥ 90%), đạt chuẩn (80% - 89%), tiệm cận (70% - 79%) và cần cải thiện (&lt; 70%).
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Xuất Sắc (90% - 100%)', count: rawTeamMembers.filter((m) => m.score >= 90).length, tone: 'sage', color: '#10B981' },
                  { label: 'Đạt Chuẩn (80% - 89%)', count: rawTeamMembers.filter((m) => m.score >= 80 && m.score < 90).length, tone: 'rail', color: '#005BAA' },
                  { label: 'Tiệm Cận (70% - 79%)', count: rawTeamMembers.filter((m) => m.score >= 70 && m.score < 80).length, tone: 'amber', color: '#F59E0B' },
                  { label: 'Cần Cải Thiện (< 70%)', count: rawTeamMembers.filter((m) => m.score != null && m.score < 70).length, tone: 'rust', color: '#EF4444' },
                ].map((item) => {
                  const percent = rawTeamMembers.length > 0 ? Math.round((item.count / rawTeamMembers.length) * 100) : 0;
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

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
                <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
                Chuẩn đạt yêu cầu bắt buộc của MM Mega Market là <strong>≥ 80%</strong> điểm bài kiểm tra cuối khóa.
              </div>
            </div>

            {/* Bảng Xếp Hạng Top Nhân Sự Xuất Sắc */}
            <div className="card card-pad" style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                🏆 Top Nhân Sự Xuất Sắc Nhất
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
                Nhân viên có điểm số cao nhất và hoàn thành khóa học sớm nhất trong đợt đào tạo.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rawTeamMembers
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
                        padding: '10px 12px',
                        background: idx === 0 ? '#FEF9C3' : idx === 1 ? '#F1F5F9' : idx === 2 ? '#FFEDD5' : 'var(--paper-sunken)',
                        borderRadius: 8,
                        border: idx === 0 ? '1px solid #FDE047' : '1px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 900, fontSize: 14, color: idx === 0 ? '#CA8A04' : 'var(--ink-soft)', width: 22 }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
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

          {/* Assessment Quality Insights */}
          <div className="card card-pad" style={{ background: '#F8FAFC', border: '1px solid var(--line)', borderRadius: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink)' }}>
              <i className="ti ti-bulb" style={{ color: 'var(--amber)', fontSize: 18 }} />
              Chỉ Số Đánh Giá &amp; Khuyến Nghị Cho Quản Lý
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div style={{ background: '#fff', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>TỶ LỆ VƯỢT QUA LẦN ĐẦU</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--rail)', margin: '4px 0' }}>87.5%</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>7/8 nhân sự đậu bài thi ngay lần kiểm tra 1</div>
              </div>
              <div style={{ background: '#fff', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>SỐ LẦN THI TRUNG BÌNH</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', margin: '4px 0' }}>1.25 lần</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Mức độ tiếp thu kiến thức tốt, ít phải thi lại</div>
              </div>
              <div style={{ background: '#fff', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>CẦN MỞ KHÓA THI LẠI</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--rust)', margin: '4px 0' }}>1 ca (Lisa Wang)</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Rớt 3 lần bài thi Chuỗi lạnh (55% vs chuẩn 80%)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MA TRẬN KHOẢNG CÁCH NĂNG LỰC & KẾ NHIỆM (SKILL GAP MATRIX) */}
      {/* ========================================================================= */}
      {activeTab === 'SKILL_GAP' && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', padding: '14px 18px', borderRadius: 8, fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
            <i className="ti ti-chart-radar" style={{ marginRight: 8, fontSize: 16 }} />
            Ma trận chẩn đoán đối chiếu giữa <strong>Năng Lực Thực Tế Của Nhân Viên</strong> với <strong>Khung Tiêu Chuẩn Năng Lực Của Vị Trí Kế Nhiệm Mục Tiêu (Thánh Gióng Pipeline)</strong>. Gán khóa học bổ trợ cho nhân viên do User Admin/L&amp;D phụ trách.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {teamSkillGapMatrix.map((item, idx) => (
              <div key={idx} className="card card-pad" style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
                {/* Header card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{item.employeeName}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>({item.employeeId})</span>
                      <Badge tone={item.overallGap >= 0 ? 'sage' : item.overallGap > -15 ? 'amber' : 'rust'}>
                        Net Gap: {item.overallGap}%
                      </Badge>
                      <Badge tone={item.readiness === 'READY_IN_6_MONTHS' ? 'sage' : item.readiness === 'DEVELOPING' ? 'amber' : 'rust'}>
                        {item.readiness === 'READY_IN_6_MONTHS' ? 'Sẵn Sàng Trong 6 Tháng' : item.readiness === 'DEVELOPING' ? 'Đang Phát Triển' : 'Cần Kèm Cặp Sát'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                      Vị trí hiện tại: <strong>{item.position}</strong> &rarr; Vị trí kế nhiệm mục tiêu: <strong>{item.targetRole}</strong>
                    </div>
                  </div>
                </div>

                {/* Skills Breakdown Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        <th style={{ width: '30%' }}>Kỹ Năng / Năng Lực Trọng Yếu</th>
                        <th style={{ width: '14%' }}>Chuẩn Yêu Cầu</th>
                        <th style={{ width: '14%' }}>Điểm Thực Tế</th>
                        <th style={{ width: '14%' }}>Khoảng Cách (Gap)</th>
                        <th style={{ width: '28%' }}>Khóa Học Đề Xuất Bổ Trợ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.skills.map((skill, sIdx) => {
                        const isExceeded = skill.status === 'EXCEEDED';
                        const isCritical = skill.status === 'CRITICAL_GAP';
                        return (
                          <tr key={sIdx}>
                            <td style={{ fontWeight: 600 }}>{skill.name}</td>
                            <td>{skill.required}%</td>
                            <td>
                              <span style={{ fontWeight: 700, color: skill.actual >= skill.required ? 'var(--sage)' : 'var(--rust)' }}>
                                {skill.actual}%
                              </span>
                            </td>
                            <td>
                              <Badge tone={isExceeded ? 'sage' : isCritical ? 'rust' : 'amber'}>
                                {isExceeded ? 'Vượt chuẩn (+)' : `${skill.gap}%`}
                              </Badge>
                            </td>
                            <td>
                              {skill.suggestedCourse ? (
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--rail)', fontSize: 12 }}>{skill.suggestedCourse}</div>
                                  <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{skill.suggestedCourseId}</div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>Đã đạt chuẩn, không cần bổ trợ</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CAM KẾT HÀNH ĐỘNG & ĐÁNH GIÁ L3 (KIRKPATRICK ACTION PLANS) */}
      {/* ========================================================================= */}
      {activeTab === 'ACTION_PLANS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '14px 18px', borderRadius: 8, fontSize: 13, lineHeight: 1.5 }}>
            <i className="ti ti-checklist" style={{ marginRight: 8, fontSize: 16 }} />
            Theo dõi kế hoạch hành động ứng dụng thực tế vào vận hành siêu thị và thực hiện <strong>Đánh Giá Tác Động Hành Vi (Kirkpatrick Level 3)</strong> sau 3 - 6 tháng đào tạo.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {actionPlans.map((plan) => (
              <div key={plan.id} className="card card-pad" style={{ borderLeft: '4px solid var(--amber)', background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 14.5 }}>{plan.learnerName}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>&middot; {plan.learnerPosition}</span>
                      <Badge tone={plan.managerReviewL3 ? 'sage' : 'amber'}>
                        {plan.managerReviewL3 ? 'Đã Phê Duyệt Đánh Giá L3' : 'Chờ Quản Lý Đánh Giá L3'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--rail)', fontWeight: 600, marginTop: 4 }}>
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

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Modal Xem Toàn Bộ Khóa Học & Bảng Điểm (Transcript) */}
      {transcriptUser && (
        <UserTranscriptModal
          user={transcriptUser}
          onClose={() => setTranscriptUser(null)}
        />
      )}

      {/* 2. Modal Xem Lộ Trình Cấp Bậc (Roadmap) */}
      {roadmapUser && (
        <Modal
          title={`Lộ Trình Năng Lực Cấp Bậc: ${roadmapUser.fullName || roadmapUser.name} (${roadmapUser.position || 'Nhân Viên'})`}
          onClose={() => setRoadmapUser(null)}
          maxWidth={880}
        >
          <RoadmapProgressSummary user={roadmapUser} />
        </Modal>
      )}

      {/* 3. Modal Gửi Email Đôn Đốc Cá Nhân */}
      {reminderMember && (
        <Modal
          title={`Gửi Email Đôn Đốc Tiến Độ: ${reminderMember.name}`}
          onClose={() => setReminderMember(null)}
          maxWidth={540}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Khóa học: <strong>{reminderMember.course}</strong> &middot; Hạn chót: <strong>{reminderMember.dueDate}</strong>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                Nội dung thông báo gửi đến nhân viên:
              </label>
              <textarea
                className="field-input"
                rows={4}
                style={{ width: '100%', fontSize: 13, lineHeight: 1.5, padding: '8px 12px', borderRadius: 6 }}
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <Button variant="outline" size="sm" onClick={() => setReminderMember(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={singleReminderSent ? 'ti-check' : 'ti-send'}
                onClick={handleSendSingleReminder}
                disabled={singleReminderSent}
              >
                {singleReminderSent ? 'Đã Gửi Thành Công!' : 'Gửi Thông Báo Ngay'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
