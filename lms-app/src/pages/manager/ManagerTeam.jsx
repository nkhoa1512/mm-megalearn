import React, { useState, useMemo } from 'react';
import { getTeamMembersForManager, managerUser as defaultManager, teamSkillGapMatrix, allUsers } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import { Badge, ProgressBar, Button, CourseTypeBadge, Modal } from '../../features/common/ui';
import UserTranscriptModal from '../../features/common/UserTranscriptModal';
import RoadmapProgressSummary from '../../features/roadmaps/RoadmapProgressSummary';

const STATUS_META = {
  NOT_STARTED: { tone: 'slate', label: 'Not Started' },
  IN_PROGRESS: { tone: 'rail', label: 'In Progress' },
  COMPLETED: { tone: 'sage', label: 'Completed' },
  FAILED: { tone: 'rust', label: 'Failed' },
  OVERDUE: { tone: 'rust', label: 'Overdue' },
};

const MANAGER_GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'Không gộp nhóm' },
  { id: 'STATUS', label: 'Theo Trạng Thái' },
  { id: 'POSITION', label: 'Theo Chức Danh / Vị Trí' },
  { id: 'LEVEL', label: 'Theo Cấp Bậc (Level)' },
];

export default function ManagerTeam() {
  const { currentUser: authUser, openSurveyModal, actionPlans, updateActionPlan, users, getUserRoadmapTabs } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const teamMembers = getTeamMembersForManager(activeManager);

  const [activeTab, setActiveTab] = useState('ROSTER'); // ROSTER, SKILL_GAP, ACTION_PLANS
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('NONE');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
  const [selectedMember, setSelectedMember] = useState(null);
  const [transcriptUser, setTranscriptUser] = useState(null);
  const [roadmapUser, setRoadmapUser] = useState(null);
  const [reminderSent, setReminderSent] = useState(false);

  // Detailed Filter States
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [courseTypeFilter, setCourseTypeFilter] = useState('ALL');
  const [progressFilter, setProgressFilter] = useState('ALL');

  // Extract unique positions and levels
  const positionList = useMemo(() => {
    const set = new Set();
    teamMembers.forEach((m) => { if (m.position) set.add(m.position); });
    return Array.from(set);
  }, [teamMembers]);

  const levelList = useMemo(() => {
    const set = new Set();
    teamMembers.forEach((m) => { if (m.level) set.add(String(m.level)); });
    return Array.from(set).sort();
  }, [teamMembers]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (positionFilter !== 'ALL') count++;
    if (levelFilter !== 'ALL') count++;
    if (courseTypeFilter !== 'ALL') count++;
    if (progressFilter !== 'ALL') count++;
    return count;
  }, [positionFilter, levelFilter, courseTypeFilter, progressFilter]);

  const filtered = useMemo(() => {
    return teamMembers.filter((m) => {
      const meta = STATUS_META[m.status]?.label;
      const matchFilter = filter === 'All' || meta === filter;
      if (!matchFilter) return false;

      if (positionFilter !== 'ALL' && m.position !== positionFilter) return false;
      if (levelFilter !== 'ALL' && String(m.level) !== levelFilter) return false;
      if (courseTypeFilter !== 'ALL' && m.courseType !== courseTypeFilter) return false;
      if (progressFilter !== 'ALL') {
        if (progressFilter === '<50' && m.progress >= 50) return false;
        if (progressFilter === '50-99' && (m.progress < 50 || m.progress >= 100)) return false;
        if (progressFilter === '100' && m.progress < 100) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchSearch =
          m.name?.toLowerCase().includes(q) ||
          m.employeeId?.toLowerCase().includes(q) ||
          m.course?.toLowerCase().includes(q) ||
          m.position?.toLowerCase().includes(q) ||
          String(m.level || '').toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      return true;
    });
  }, [teamMembers, filter, positionFilter, levelFilter, courseTypeFilter, progressFilter, search]);

  function handleResetAllFilters() {
    setSearch('');
    setFilter('All');
    setPositionFilter('ALL');
    setLevelFilter('ALL');
    setCourseTypeFilter('ALL');
    setProgressFilter('ALL');
    setGroupBy('NONE');
  }

  function groupKeyOf(m) {
    if (groupBy === 'STATUS') return { key: m.status, label: STATUS_META[m.status]?.label || m.status, icon: 'ti-progress-check' };
    if (groupBy === 'POSITION') return { key: m.position || 'OTHER', label: m.position || 'Chưa phân vị trí', icon: 'ti-briefcase' };
    if (groupBy === 'LEVEL') return { key: String(m.level || '7'), label: `Level ${m.level || 7}`, icon: 'ti-stairs-up' };
    return { key: 'ALL', label: '', icon: '' };
  }

  const groups = groupBy === 'NONE' ? null : (() => {
    const map = new Map();
    filtered.forEach((m) => {
      const g = groupKeyOf(m);
      if (!map.has(g.key)) map.set(g.key, { ...g, rows: [] });
      map.get(g.key).rows.push(m);
    });
    return Array.from(map.values());
  })();

  function toggleCollapsed(key) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleSendReminder() {
    setReminderSent(true);
    setTimeout(() => {
      setReminderSent(false);
      setSelectedMember(null);
    }, 1500);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Direct Reports &amp; Team Competency Management</h1>
            <Badge tone="amber" icon="ti-briefcase">
              {activeManager.storeName || `${activeManager.divisionCode} - ${activeManager.departmentCode}`}
            </Badge>
          </div>
          <p>
            Monitor learning progress, analyze team skill gaps, and conduct 3-6 month Level 3 behavioral evaluations for {teamMembers.length} direct reports under {activeManager.fullName}. Course assignment is handled by User Admin.
          </p>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'ROSTER', label: 'Direct Reports Roster & Progress', icon: 'ti-users' },
          { id: 'SKILL_GAP', label: 'Team Skill Gap Analysis Matrix', icon: 'ti-chart-bar' },
          { id: 'ACTION_PLANS', label: 'Action Plans & Level 3 Review (3-6 Months)', icon: 'ti-checklist' },
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
            }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TEAM ROSTER & ACTIONS */}
      {activeTab === 'ROSTER' && (() => {
        function renderMembersTable(membersList) {
          return (
            <div className="card" style={{ overflowX: 'auto', marginBottom: 14, width: '100%', borderRadius: 8, border: '1px solid var(--line)' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th style={{ width: '21%' }}>Nhân Viên</th>
                    <th style={{ width: '23%' }}>Chương Trình / Khóa Học</th>
                    <th style={{ width: '9%' }}>Loại</th>
                    <th style={{ width: '13%' }}>Tiến Độ</th>
                    <th style={{ width: '10%' }}>Trạng Thái</th>
                    <th style={{ width: '6%' }}>Điểm</th>
                    <th style={{ width: '9%' }}>Hạn Chót</th>
                    <th style={{ width: '9%', textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>

                <tbody>
                  {membersList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-faint)' }}>
                        <i className="ti ti-users" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                        Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    membersList.map((m) => {
                      const meta = STATUS_META[m.status] || STATUS_META.NOT_STARTED;
                      return (
                        <tr key={m.employeeId}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                              <span style={{ fontFamily: 'var(--font-mono)' }}>{m.employeeId}</span> &middot; {m.position}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{m.course}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                              Lvl {m.level} &middot; {m.storeName || 'MM An Phu'}
                            </div>
                          </td>
                          <td><CourseTypeBadge courseType={m.courseType} /></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <ProgressBar
                                  value={m.progress}
                                  tone={meta.tone === 'rust' ? 'rust' : meta.tone === 'sage' ? 'sage' : 'rail'}
                                />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', minWidth: 32 }}>
                                {m.progress}%
                              </span>
                            </div>
                          </td>
                          <td><Badge tone={meta.tone}>{meta.label}</Badge></td>
                          <td>
                            {m.score !== null ? (
                              <span style={{ fontWeight: 700, color: m.score >= 80 ? 'var(--sage)' : 'var(--rust)', fontSize: 12.5 }}>
                                {m.score}%
                              </span>
                            ) : (
                              <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>—</span>
                            )}
                          </td>
                          <td style={{ color: m.overdue ? 'var(--rust)' : 'var(--ink-soft)', fontSize: 12, fontWeight: m.overdue ? 700 : 400 }}>
                            {m.dueDate}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <Button
                                size="sm"
                                variant="outline"
                                icon="ti-eye"
                                onClick={() => {
                                  const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                                  const fullUser = list.find(u => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
                                  setTranscriptUser(fullUser);
                                }}
                                title="Xem toàn bộ khóa học nhân sự này đang học"
                              >
                                Chi Tiết
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                icon="ti-map-2"
                                onClick={() => {
                                  const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                                  const fullUser = list.find(u => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
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
            {/* STANDARDIZED FILTER TOOLBAR */}
            <div className="card card-pad" style={{ marginBottom: 20, background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
              {/* ROW 0: STATUS QUICK FILTER PILLS */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
                {[
                  { id: 'All', label: 'Tất Cả Nhân Sự', count: teamMembers.length },
                  { id: 'In Progress', label: 'Đang Học', count: teamMembers.filter(m => m.status === 'IN_PROGRESS').length },
                  { id: 'Completed', label: 'Đã Hoàn Thành', count: teamMembers.filter(m => m.status === 'COMPLETED').length },
                  { id: 'Not Started', label: 'Chưa Bắt Đầu', count: teamMembers.filter(m => m.status === 'NOT_STARTED').length },
                  { id: 'Overdue', label: 'Quá Hạn', count: teamMembers.filter(m => m.status === 'OVERDUE').length },
                  { id: 'Failed', label: 'Chưa Đạt', count: teamMembers.filter(m => m.status === 'FAILED').length },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`btn btn-sm ${filter === f.id ? 'btn-primary' : 'btn-outline'}`}
                    style={{
                      borderRadius: 20,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      borderColor: filter === f.id ? 'var(--blue)' : 'var(--line)',
                      background: filter === f.id ? 'var(--blue)' : 'transparent',
                      color: filter === f.id ? '#fff' : 'var(--ink)',
                      fontWeight: filter === f.id ? 700 : 500,
                    }}
                  >
                    {f.label}
                    <span style={{
                      background: filter === f.id ? 'rgba(255,255,255,0.3)' : 'var(--paper-sunken)',
                      color: filter === f.id ? '#fff' : 'var(--ink-soft)',
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

                {/* Right controls: Group By & Filter Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Group By */}
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

              {/* ROW 2: COLLAPSIBLE FILTER PANEL */}
              {showFilters && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {/* Position Filter */}
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        CHỨC DANH / VỊ TRÍ
                      </label>
                      <select
                        className="field-select"
                        style={{
                          width: '100%',
                          height: 36,
                          fontSize: 12,
                          borderRadius: 6,
                          background: positionFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                          borderColor: positionFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                          color: positionFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                          fontWeight: positionFilter !== 'ALL' ? 700 : 500,
                        }}
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                      >
                        <option value="ALL">Tất cả chức danh</option>
                        {positionList.map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>

                    {/* Level Filter */}
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        CẤP BẬC (JOB LEVEL)
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
                        {levelList.map((lvl) => (
                          <option key={lvl} value={lvl}>Level {lvl}</option>
                        ))}
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

                    {/* Progress Range Filter */}
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        MỨC ĐỘ TIẾN ĐỘ
                      </label>
                      <select
                        className="field-select"
                        style={{
                          width: '100%',
                          height: 36,
                          fontSize: 12,
                          borderRadius: 6,
                          background: progressFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                          borderColor: progressFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                          color: progressFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                          fontWeight: progressFilter !== 'ALL' ? 700 : 500,
                        }}
                        value={progressFilter}
                        onChange={(e) => setProgressFilter(e.target.value)}
                      >
                        <option value="ALL">Tất cả mức tiến độ</option>
                        <option value="<50">Dưới 50% tiến độ</option>
                        <option value="50-99">Từ 50% - 99% tiến độ</option>
                        <option value="100">Đã hoàn thành 100%</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ROW 3: Active Filters Bar */}
              {(search || filter !== 'All' || positionFilter !== 'ALL' || levelFilter !== 'ALL' || courseTypeFilter !== 'ALL' || progressFilter !== 'ALL' || groupBy !== 'NONE') && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Đang lọc theo:</span>
                    {search && (
                      <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Từ khóa: <strong>"{search}"</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                      </span>
                    )}
                    {filter !== 'All' && (
                      <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Trạng thái: <strong>{filter}</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFilter('All')} />
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
                        Phân loại: <strong>{courseTypeFilter}</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setCourseTypeFilter('ALL')} />
                      </span>
                    )}
                    {progressFilter !== 'ALL' && (
                      <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Tiến độ: <strong>{progressFilter === '<50' ? '<50%' : progressFilter === '50-99' ? '50-99%' : '100%'}</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setProgressFilter('ALL')} />
                      </span>
                    )}
                    {groupBy !== 'NONE' && (
                      <span className="badge" style={{ background: '#F8FAFC', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Gộp nhóm: <strong>{MANAGER_GROUP_BY_OPTIONS.find(o => o.id === groupBy)?.label}</strong>
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
                    Tìm thấy <strong>{filtered.length}</strong> / {teamMembers.length} nhân sự
                  </div>
                </div>
              )}
            </div>

            {/* CONTENT: FLAT OR GROUPED */}
            {groupBy === 'NONE' || !groups ? (
              renderMembersTable(filtered)
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                {groups.map((g) => {
                  const isCollapsed = collapsedGroups.has(g.key);
                  return (
                    <div key={g.key} className="card" style={{ overflow: 'hidden', background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
                      <button
                        onClick={() => toggleCollapsed(g.key)}
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
                          {renderMembersTable(g.rows)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}

      {/* TAB 2: TEAM SKILL GAP ANALYSIS MATRIX */}
      {activeTab === 'SKILL_GAP' && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 12.5, marginBottom: 18 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
            Diagnostic matrix comparing <strong>Required Competencies for Target Succession Roles</strong> against <strong>Actual Demonstrated Skill Scores</strong>. Assigning the suggested course is done by User Admin.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {teamSkillGapMatrix.map((item, idx) => (
              <div key={idx} className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{item.employeeName}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>({item.employeeId})</span>
                      <Badge tone={item.overallGap >= 0 ? 'sage' : item.overallGap > -15 ? 'amber' : 'rust'}>
                        Net Gap: {item.overallGap}%
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                      Current Role: <strong>{item.position}</strong> &rarr; Target Succession: <strong>{item.targetRole}</strong>
                    </div>
                  </div>
                </div>

                {/* Skill Items Breakdown */}
                <div className="grid grid-2" style={{ gap: 12 }}>
                  {item.skills.map((sk, sIdx) => {
                    const isGap = sk.gap < 0;
                    return (
                      <div
                        key={sIdx}
                        style={{
                          background: 'var(--paper-sunken)',
                          borderRadius: 8,
                          padding: '10px 14px',
                          borderLeft: isGap ? '4px solid var(--rust)' : '4px solid var(--sage)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{sk.name}</span>
                          <Badge tone={sk.status === 'EXCEEDED' ? 'sage' : sk.status === 'CRITICAL_GAP' ? 'rust' : 'amber'}>
                            {sk.status === 'EXCEEDED' ? 'Standard Met' : `Gap ${sk.gap}%`}
                          </Badge>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 6 }}>
                          <span>Required: <strong>{sk.required}%</strong></span>
                          <span>Demonstrated: <strong style={{ color: isGap ? 'var(--rust)' : 'var(--sage)' }}>{sk.actual}%</strong></span>
                        </div>
                        <ProgressBar value={sk.actual} tone={isGap ? 'rust' : 'sage'} size="sm" />

                        {sk.suggestedCourse && (
                          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--rail)' }}>
                            Suggested Course: <strong>{sk.suggestedCourse}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TEAM ACTION PLANS & 3-6 MONTH L3 REVIEW */}
      {activeTab === 'ACTION_PLANS' && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 12.5, marginBottom: 18 }}>
            <i className="ti ti-checklist" style={{ marginRight: 6 }} />
            Monitor Direct Reports' Action Plan Commitments and complete <strong>Post-Training Behavioral Impact Evaluations (Kirkpatrick Level 3)</strong>.
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
                      Linked Course: {plan.courseName}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={plan.managerReviewL3 ? 'outline' : 'primary'}
                    icon="ti-award"
                    onClick={() => openSurveyModal({ title: plan.courseName }, 'L3', { name: plan.learnerName, fullName: plan.learnerName })}
                  >
                    {plan.managerReviewL3 ? 'Edit Level 3 Review' : 'Conduct Level 3 Review (3-6 Mos)'}
                  </Button>
                </div>

                <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 2 }}>
                    Workplace Commitment &amp; Action Plan Target:
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, marginBottom: 6 }}>
                    "{plan.targetCommitment}"
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Target KPI: <strong>{plan.kpiTarget}</strong> &middot; Review Deadline: <strong>{plan.evaluationDate}</strong>
                  </div>
                </div>

                {plan.managerReviewL3 && (
                  <div style={{ background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                      ✓ Manager Review Rating ({plan.managerReviewL3.score}/5.0 Stars):
                    </div>
                    <div>{plan.managerReviewL3.behaviorChange} - {plan.managerReviewL3.productivityGain}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      <Modal
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title="Direct Report Learning Detail"
        subtitle={selectedMember ? `${selectedMember.name} (${selectedMember.employeeId}) · ${selectedMember.position}` : ''}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Button variant="ghost" onClick={() => setSelectedMember(null)}>Close</Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="primary"
                icon={reminderSent ? 'ti-check' : 'ti-bell-ringing'}
                onClick={handleSendReminder}
                disabled={reminderSent}
              >
                {reminderSent ? 'Reminder Dispatched!' : 'Send Learning Reminder'}
              </Button>
            </div>
          </div>
        }
      >
        {selectedMember && (
          <div>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{selectedMember.course}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', gap: 12 }}>
                <span>Type: <strong>{selectedMember.courseType}</strong></span>
                <span>Due Date: <strong>{selectedMember.dueDate}</strong></span>
                <span>Status: <strong>{selectedMember.status}</strong></span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>Curriculum Progress</span>
                <strong>{selectedMember.progress}%</strong>
              </div>
              <ProgressBar value={selectedMember.progress} tone={selectedMember.progress >= 100 ? 'sage' : 'rail'} />
            </div>

            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Last activity recorded: <strong>{selectedMember.lastActivity || 'No recent activity'}</strong> ({selectedMember.inactiveDays || 0} days inactive).
            </div>
          </div>
        )}
      </Modal>

      {/* USER TRANSCRIPT DRILL-DOWN MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
      />

      {/* ROADMAP DRILL-DOWN MODAL (Tab 1 & Tab 2 progress) */}
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
