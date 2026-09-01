import React, { useState, useMemo } from 'react';
import { getTeamMembersForManager, managerUser as defaultManager } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import { Badge, BarChart, CourseTypeBadge, Button } from '../../features/common/ui';

function groupByCourse(members) {
  const map = new Map();
  for (const m of members) {
    if (!map.has(m.course)) map.set(m.course, { course: m.course, courseType: m.courseType, members: [] });
    map.get(m.course).members.push(m);
  }
  return [...map.values()].map((g) => {
    const assigned = g.members.length;
    const completed = g.members.filter((m) => m.status === 'COMPLETED').length;
    const inProgress = g.members.filter((m) => m.status === 'IN_PROGRESS').length;
    const notStarted = g.members.filter((m) => m.status === 'NOT_STARTED').length;
    const overdue = g.members.filter((m) => m.status === 'OVERDUE').length;
    const failed = g.members.filter((m) => m.status === 'FAILED').length;
    const scored = g.members.filter((m) => m.score != null);
    const avgScore = scored.length ? Math.round(scored.reduce((s, m) => s + m.score, 0) / scored.length) : null;
    return { ...g, assigned, completed, inProgress, notStarted, overdue, failed, avgScore, completionRate: Math.round((completed / assigned) * 100) };
  });
}

export default function ManagerCourses() {
  const { currentUser: authUser } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const teamMembers = getTeamMembersForManager(activeManager);
  const groups = useMemo(() => groupByCourse(teamMembers), [teamMembers]);

  // Quick Filter Pills (Top)
  const [quickFilter, setQuickFilter] = useState('ALL'); // ALL, MANDATORY, OPTIONAL, COMPLETED_100, HAS_OVERDUE

  // Search & Detailed Filters
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState('NONE'); // NONE, TYPE, RATE
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [rateFilter, setRateFilter] = useState('ALL'); // ALL, 100, 50-99, <50, 0
  const [scoreFilter, setScoreFilter] = useState('ALL'); // ALL, GOOD, LOW, NONE
  const [overdueFilter, setOverdueFilter] = useState('ALL'); // ALL, HAS_OVERDUE, ON_TRACK

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'ALL') count++;
    if (rateFilter !== 'ALL') count++;
    if (scoreFilter !== 'ALL') count++;
    if (overdueFilter !== 'ALL') count++;
    return count;
  }, [typeFilter, rateFilter, scoreFilter, overdueFilter]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // Quick filter pill
      if (quickFilter === 'MANDATORY' && g.courseType !== 'MANDATORY') return false;
      if (quickFilter === 'OPTIONAL' && g.courseType !== 'OPTIONAL') return false;
      if (quickFilter === 'COMPLETED_100' && g.completionRate < 100) return false;
      if (quickFilter === 'HAS_OVERDUE' && g.overdue === 0) return false;

      // Dropdown panel filters
      if (typeFilter !== 'ALL' && g.courseType !== typeFilter) return false;
      if (rateFilter !== 'ALL') {
        if (rateFilter === '100' && g.completionRate < 100) return false;
        if (rateFilter === '50-99' && (g.completionRate < 50 || g.completionRate >= 100)) return false;
        if (rateFilter === '<50' && (g.completionRate === 0 || g.completionRate >= 50)) return false;
        if (rateFilter === '0' && g.completionRate > 0) return false;
      }
      if (scoreFilter !== 'ALL') {
        if (scoreFilter === 'GOOD' && (g.avgScore == null || g.avgScore < 80)) return false;
        if (scoreFilter === 'LOW' && (g.avgScore == null || g.avgScore >= 80)) return false;
        if (scoreFilter === 'NONE' && g.avgScore != null) return false;
      }
      if (overdueFilter !== 'ALL') {
        if (overdueFilter === 'HAS_OVERDUE' && g.overdue === 0) return false;
        if (overdueFilter === 'ON_TRACK' && g.overdue > 0) return false;
      }

      // Search query
      if (search.trim() && !g.course.toLowerCase().includes(search.toLowerCase().trim())) return false;

      return true;
    });
  }, [groups, quickFilter, typeFilter, rateFilter, scoreFilter, overdueFilter, search]);

  const groupedCourseMap = useMemo(() => {
    if (groupBy === 'NONE') return { 'Tất Cả Khóa Học': filteredGroups };
    const res = {};

    filteredGroups.forEach((g) => {
      let key = 'Khác';
      if (groupBy === 'TYPE') {
        key = g.courseType === 'MANDATORY' ? '🔒 Khóa Học Bắt Buộc Tuân Thủ' : '✨ Khóa Học Tự Chọn & Bổ Sung';
      } else if (groupBy === 'RATE') {
        if (g.completionRate === 100) key = '🏆 Đã Hoàn Thành 100%';
        else if (g.completionRate >= 50) key = '📈 Đang Tiến Triển Tốt (50% - 99%)';
        else if (g.completionRate > 0) key = '⚠️ Cần Thúc Đẩy (Dưới 50%)';
        else key = '⏳ Chưa Bắt Đầu (0%)';
      }

      if (!res[key]) res[key] = [];
      res[key].push(g);
    });

    return res;
  }, [filteredGroups, groupBy]);

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
    setTypeFilter('ALL');
    setRateFilter('ALL');
    setScoreFilter('ALL');
    setOverdueFilter('ALL');
    setGroupBy('NONE');
  }

  function renderTable(courseList) {
    return (
      <div className="card" style={{ borderRadius: 10, border: '1px solid var(--line)', overflowX: 'auto', marginBottom: 14 }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th>Khóa Học</th>
              <th style={{ width: 140 }}>Phân Loại</th>
              <th style={{ width: 100 }}>Được Gán</th>
              <th style={{ width: 110 }}>Hoàn Thành</th>
              <th style={{ width: 100 }}>Đang Học</th>
              <th style={{ width: 100 }}>Chưa Học</th>
              <th style={{ width: 100 }}>Quá Hạn</th>
              <th style={{ width: 100 }}>Chưa Đạt</th>
              <th style={{ width: 100, textAlign: 'right' }}>Điểm TB</th>
            </tr>
          </thead>
          <tbody>
            {courseList.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-faint)' }}>
                  Không tìm thấy khóa học nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              courseList.map((g) => (
                <tr key={g.course}>
                  <td style={{ fontWeight: 700, color: 'var(--ink)' }}>
                    {g.course}
                  </td>
                  <td><CourseTypeBadge courseType={g.courseType} /></td>
                  <td style={{ fontWeight: 600 }}>{g.assigned}</td>
                  <td>
                    <span style={{ color: 'var(--sage)', fontWeight: 700 }}>{g.completed}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginLeft: 4 }}>({g.completionRate}%)</span>
                  </td>
                  <td>{g.inProgress}</td>
                  <td>{g.notStarted}</td>
                  <td style={{ color: g.overdue ? 'var(--rust)' : 'inherit', fontWeight: g.overdue ? 700 : 400 }}>
                    {g.overdue}
                  </td>
                  <td style={{ color: g.failed ? 'var(--rust)' : 'inherit', fontWeight: g.failed ? 700 : 400 }}>
                    {g.failed}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: g.avgScore && g.avgScore >= 80 ? 'var(--sage)' : 'var(--ink)' }}>
                    {g.avgScore != null ? `${g.avgScore}%` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Team Curriculum &amp; Course Progress</h1>
            <Badge tone="amber">{activeManager.divisionCode} &middot; {activeManager.departmentCode}</Badge>
          </div>
          <p>
            Overview of curriculum modules assigned to direct reports under {activeManager.fullName} ({activeManager.position}).
          </p>
        </div>
      </div>

      <div className="section-label">Completion rate by course</div>
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <BarChart
          valueSuffix="%"
          data={groups.map((g) => ({ label: g.course, value: g.completionRate, detail: `${g.course}: ${g.completed} of ${g.assigned} completed` }))}
        />
      </div>

      <div className="section-label">Bảng chi tiết khóa học phân bổ cho đội ngũ</div>
      
      {/* STANDARDIZED FILTER TOOLBAR CARD */}
      <div className="card card-pad" style={{ marginBottom: 16, background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
        {/* ROW 0: QUICK FILTER PILLS */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
          {[
            { id: 'ALL', label: 'Tất Cả Khóa Học', count: groups.length },
            { id: 'MANDATORY', label: 'Bắt Buộc Tuân Thủ', count: groups.filter(g => g.courseType === 'MANDATORY').length },
            { id: 'OPTIONAL', label: 'Tự Chọn / Bổ Sung', count: groups.filter(g => g.courseType === 'OPTIONAL').length },
            { id: 'COMPLETED_100', label: 'Đạt 100% Hoàn Thành', count: groups.filter(g => g.completionRate === 100).length },
            { id: 'HAS_OVERDUE', label: '🔴 Có Nhân Sự Quá Hạn', count: groups.filter(g => g.overdue > 0).length, highlight: true },
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
                borderColor: quickFilter === f.id ? 'var(--blue)' : f.highlight ? 'var(--rust)' : 'var(--line)',
                background: quickFilter === f.id ? (f.highlight ? 'var(--rust)' : 'var(--blue)') : f.highlight ? 'var(--rust-soft)' : 'transparent',
                color: quickFilter === f.id ? '#fff' : f.highlight ? 'var(--rust-soft-text)' : 'var(--ink)',
                fontWeight: f.highlight ? 700 : 500,
              }}
            >
              {f.label}
              <span style={{
                background: quickFilter === f.id ? 'rgba(255,255,255,0.3)' : f.highlight ? 'var(--rust)' : 'var(--paper-sunken)',
                color: quickFilter === f.id || f.highlight ? '#fff' : 'var(--ink-soft)',
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
          {/* Search input */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
              placeholder="Tìm theo tên khóa học..."
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
                <option value="NONE">Không gộp nhóm</option>
                <option value="TYPE">Theo Phân Loại Khóa Học</option>
                <option value="RATE">Theo Tỷ Lệ Hoàn Thành</option>
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
                    background: typeFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: typeFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: typeFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: typeFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả loại khóa học</option>
                  <option value="MANDATORY">Bắt Buộc Tuân Thủ (Mandatory)</option>
                  <option value="OPTIONAL">Tự Chọn / Bổ Sung (Optional)</option>
                </select>
              </div>

              {/* Completion Rate Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  TỶ LỆ HOÀN THÀNH (%)
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: rateFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: rateFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: rateFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: rateFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={rateFilter}
                  onChange={(e) => setRateFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả tỷ lệ</option>
                  <option value="100">🏆 Hoàn thành 100%</option>
                  <option value="50-99">📈 Đang học (50% - 99%)</option>
                  <option value="<50">⚠️ Dưới 50%</option>
                  <option value="0">⏳ 0% (Chưa học)</option>
                </select>
              </div>

              {/* Score Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  ĐIỂM SỐ TRUNG BÌNH
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: scoreFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: scoreFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: scoreFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: scoreFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={scoreFilter}
                  onChange={(e) => setScoreFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả mức điểm</option>
                  <option value="GOOD">🟢 Đạt giỏi (&ge; 80%)</option>
                  <option value="LOW">🔴 Cần cải thiện (&lt; 80%)</option>
                  <option value="NONE">⚪ Chưa có điểm thi</option>
                </select>
              </div>

              {/* Overdue Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  TÌNH TRẠNG TIẾN ĐỘ
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: overdueFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: overdueFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: overdueFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: overdueFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={overdueFilter}
                  onChange={(e) => setOverdueFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả tình trạng</option>
                  <option value="HAS_OVERDUE">🔴 Có nhân sự quá hạn</option>
                  <option value="ON_TRACK">🟢 Đúng tiến độ / Không quá hạn</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ROW 3: ACTIVE FILTER TAGS & RESET */}
        {(search || quickFilter !== 'ALL' || typeFilter !== 'ALL' || rateFilter !== 'ALL' || scoreFilter !== 'ALL' || overdueFilter !== 'ALL' || groupBy !== 'NONE') && (
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
                  Dải chọn nhanh: <strong>{quickFilter === 'MANDATORY' ? 'Bắt buộc' : quickFilter === 'OPTIONAL' ? 'Tự chọn' : quickFilter === 'COMPLETED_100' ? 'Hoàn thành 100%' : 'Có quá hạn'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setQuickFilter('ALL')} />
                </span>
              )}
              {typeFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Loại khóa: <strong>{typeFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setTypeFilter('ALL')} />
                </span>
              )}
              {rateFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Tỷ lệ: <strong>{rateFilter === '100' ? '100%' : rateFilter === '50-99' ? '50-99%' : rateFilter === '<50' ? '<50%' : '0%'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setRateFilter('ALL')} />
                </span>
              )}
              {scoreFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Điểm: <strong>{scoreFilter === 'GOOD' ? '>=80%' : scoreFilter === 'LOW' ? '<80%' : 'Chưa thi'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setScoreFilter('ALL')} />
                </span>
              )}
              {overdueFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Tiến độ: <strong>{overdueFilter === 'HAS_OVERDUE' ? 'Có quá hạn' : 'Đúng hạn'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setOverdueFilter('ALL')} />
                </span>
              )}
              {groupBy !== 'NONE' && (
                <span className="badge" style={{ background: '#F8FAFC', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Gộp nhóm: <strong>{groupBy === 'TYPE' ? 'Theo Phân Loại' : 'Theo Tỷ Lệ'}</strong>
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
              Tìm thấy <strong>{filteredGroups.length}</strong> / {groups.length} khóa học
            </div>
          </div>
        )}
      </div>

      {/* CONTENT: FLAT OR ACCORDION GROUPED */}
      {groupBy === 'NONE' ? (
        renderTable(filteredGroups)
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {Object.entries(groupedCourseMap).map(([groupTitle, list]) => {
            const isCollapsed = collapsedGroups.has(groupTitle);
            return (
              <div key={groupTitle} className="card" style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                <div
                  onClick={() => toggleGroup(groupTitle)}
                  style={{
                    padding: '12px 18px',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ fontSize: 14, color: 'var(--ink-soft)' }} />
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{groupTitle}</span>
                    <span className="badge" style={{ background: '#EFF6FF', color: 'var(--blue)', fontWeight: 700, fontSize: 11 }}>
                      {list.length} khóa học
                    </span>
                  </div>
                </div>

                {!isCollapsed && (
                  <div style={{ padding: '8px 12px 0' }}>
                    {renderTable(list)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
