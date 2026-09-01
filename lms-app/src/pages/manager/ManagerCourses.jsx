import React, { useState, useMemo } from 'react';
import { getTeamMembersForManager, managerUser as defaultManager, courses as allCourses, classroomSessions } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import { Badge, ProgressBar, CourseTypeBadge, Button, Modal } from '../../features/common/ui';
import { downloadCsv } from '../../lib/exportCsv';

function groupByCourse(members, courseList = []) {
  const map = new Map();
  for (const m of members) {
    if (!map.has(m.course)) {
      const matchedCourse = courseList.find((c) => c.title === m.course || c.id === m.courseId) || {};
      map.set(m.course, {
        course: m.course,
        courseId: matchedCourse.id || `CRS-${Math.abs(m.course.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)).toString().slice(0, 6)}`,
        courseType: m.courseType || matchedCourse.courseType || 'MANDATORY',
        domain: matchedCourse.domain || matchedCourse.category || 'Vận Hành Siêu Thị',
        deliveryType: matchedCourse.deliveryType || (matchedCourse.modality === 'CLASSROOM_LAB' ? 'IN_PERSON_CLASSROOM' : 'ONLINE_ELEARNING'),
        modality: matchedCourse.modality || 'E_LEARNING',
        estimatedHours: matchedCourse.estimatedHours || '2.0h',
        passingScore: matchedCourse.passingScore || 80,
        trainerName: matchedCourse.trainerName || 'Phòng Đào Tạo L&OD',
        thumbnail: matchedCourse.thumbnail || matchedCourse.imageUrl,
        members: [],
      });
    }
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
    const completionRate = Math.round((completed / Math.max(1, assigned)) * 100);

    const hoursNumeric = parseFloat(String(g.estimatedHours).replace(/[^\d.]/g, '')) || 2.0;
    const totalHoursCompleted = Math.round(completed * hoursNumeric * 10) / 10;

    return {
      ...g,
      assigned,
      completed,
      inProgress,
      notStarted,
      overdue,
      failed,
      avgScore,
      completionRate,
      hoursNumeric,
      totalHoursCompleted,
    };
  });
}

export default function ManagerCourses() {
  const { currentUser: authUser, courses: storeCourses } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const teamMembers = useMemo(() => getTeamMembersForManager(activeManager), [activeManager]);
  const courseList = storeCourses && storeCourses.length > 0 ? storeCourses : allCourses;

  const groups = useMemo(() => groupByCourse(teamMembers, courseList), [teamMembers, courseList]);

  // Main Tabs: CURRICULUM_ROSTER, DOMAIN_ANALYTICS, LIVE_WORKSHOPS
  const [activeTab, setActiveTab] = useState('CURRICULUM_ROSTER');

  // Quick Filter Pills
  const [quickFilter, setQuickFilter] = useState('ALL'); // ALL, MANDATORY, OPTIONAL, COMPLETED_100, HAS_OVERDUE

  // Search & Detailed Filters
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState('NONE'); // NONE, TYPE, DOMAIN, RATE
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState('ALL');
  const [rateFilter, setRateFilter] = useState('ALL'); // ALL, 100, 50-99, <50, 0
  const [overdueFilter, setOverdueFilter] = useState('ALL'); // ALL, HAS_OVERDUE, ON_TRACK

  // Modal drill-down state
  const [selectedCourseDrilldown, setSelectedCourseDrilldown] = useState(null);
  const [drilldownReminderSent, setDrilldownReminderSent] = useState(false);

  // Executive KPI summary calculations
  const curriculumKpis = useMemo(() => {
    const totalCoursesCount = groups.length;
    const mandatoryCount = groups.filter((g) => g.courseType === 'MANDATORY').length;
    const optionalCount = totalCoursesCount - mandatoryCount;

    const totalHoursSpent = groups.reduce((acc, g) => acc + g.totalHoursCompleted, 0);

    const totalAssignedSlots = groups.reduce((acc, g) => acc + g.assigned, 0);
    const totalCompletedSlots = groups.reduce((acc, g) => acc + g.completed, 0);
    const avgCompletion = totalAssignedSlots > 0 ? Math.round((totalCompletedSlots / totalAssignedSlots) * 100) : 0;

    const bottleneckCourses = groups.filter((g) => g.overdue > 0 || g.failed > 0);

    return {
      totalCoursesCount,
      mandatoryCount,
      optionalCount,
      totalHoursSpent: Math.round(totalHoursSpent),
      avgCompletion,
      bottleneckCount: bottleneckCourses.length,
      bottleneckCourses,
    };
  }, [groups]);

  // Unique domains list
  const domainList = useMemo(() => {
    const set = new Set();
    groups.forEach((g) => { if (g.domain) set.add(g.domain); });
    return Array.from(set);
  }, [groups]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'ALL') count++;
    if (domainFilter !== 'ALL') count++;
    if (deliveryFilter !== 'ALL') count++;
    if (rateFilter !== 'ALL') count++;
    if (overdueFilter !== 'ALL') count++;
    return count;
  }, [typeFilter, domainFilter, deliveryFilter, rateFilter, overdueFilter]);

  // Filtered Course Groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // Quick filter pill
      if (quickFilter === 'MANDATORY' && g.courseType !== 'MANDATORY') return false;
      if (quickFilter === 'OPTIONAL' && g.courseType === 'MANDATORY') return false;
      if (quickFilter === 'COMPLETED_100' && g.completionRate < 100) return false;
      if (quickFilter === 'HAS_OVERDUE' && g.overdue === 0) return false;

      // Dropdown filters
      if (typeFilter !== 'ALL' && g.courseType !== typeFilter) return false;
      if (domainFilter !== 'ALL' && g.domain !== domainFilter) return false;
      if (deliveryFilter !== 'ALL') {
        if (deliveryFilter === 'IN_PERSON' && g.deliveryType !== 'IN_PERSON_CLASSROOM' && g.modality !== 'CLASSROOM_LAB') return false;
        if (deliveryFilter === 'ONLINE' && g.deliveryType !== 'ONLINE_ELEARNING') return false;
      }
      if (rateFilter !== 'ALL') {
        if (rateFilter === '100' && g.completionRate < 100) return false;
        if (rateFilter === '50-99' && (g.completionRate < 50 || g.completionRate >= 100)) return false;
        if (rateFilter === '<50' && (g.completionRate === 0 || g.completionRate >= 50)) return false;
        if (rateFilter === '0' && g.completionRate > 0) return false;
      }
      if (overdueFilter !== 'ALL') {
        if (overdueFilter === 'HAS_OVERDUE' && g.overdue === 0) return false;
        if (overdueFilter === 'ON_TRACK' && g.overdue > 0) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchTitle = g.course.toLowerCase().includes(q);
        const matchCode = g.courseId?.toLowerCase().includes(q);
        const matchDomain = g.domain?.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchDomain) return false;
      }

      return true;
    });
  }, [groups, quickFilter, typeFilter, domainFilter, deliveryFilter, rateFilter, overdueFilter, search]);

  // Grouped Course Map
  const groupedCourseMap = useMemo(() => {
    if (groupBy === 'NONE') return { 'Tất Cả Khóa Học': filteredGroups };
    const res = {};

    filteredGroups.forEach((g) => {
      let key = 'Khác';
      if (groupBy === 'TYPE') {
        key = g.courseType === 'MANDATORY' ? '🔒 Khóa Học Bắt Buộc Tuân Thủ' : '✨ Khóa Học Tự Chọn & Lộ Trình';
      } else if (groupBy === 'DOMAIN') {
        key = `📂 Chuyên Đề: ${g.domain || 'Vận Hành Siêu Thị'}`;
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
    setDomainFilter('ALL');
    setDeliveryFilter('ALL');
    setRateFilter('ALL');
    setOverdueFilter('ALL');
    setGroupBy('NONE');
  }

  // Export CSV
  function handleExportCsv() {
    const headers = [
      'Mã Khóa Học',
      'Tên Khóa Học',
      'Chuyên Đề / Domain',
      'Hình Thức',
      'Thời Lượng',
      'Phân Loại',
      'Số NV Được Gán',
      'Đã Hoàn Thành',
      'Tỷ Lệ Hoàn Thành (%)',
      'Đang Học',
      'Quá Hạn',
      'Chưa Đạt',
      'Điểm TB (%)',
    ];

    const rows = filteredGroups.map((g) => [
      g.courseId || '',
      g.course || '',
      g.domain || '',
      g.deliveryType === 'IN_PERSON_CLASSROOM' ? 'Lớp Trực Tiếp (ILT)' : 'E-Learning',
      g.estimatedHours || '2.0h',
      g.courseType === 'MANDATORY' ? 'Bắt Buộc' : 'Tự Chọn',
      g.assigned,
      g.completed,
      `${g.completionRate}%`,
      g.inProgress,
      g.overdue,
      g.failed,
      g.avgScore != null ? `${g.avgScore}%` : 'Chưa thi',
    ]);

    downloadCsv(`Danh_Muc_Khoa_Hoc_Bo_Phan_${activeManager.divisionCode || 'MMVN'}_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  }

  function handleSendDrilldownReminder() {
    setDrilldownReminderSent(true);
    setTimeout(() => setDrilldownReminderSent(false), 3000);
  }

  // Render Table
  function renderTable(courseList) {
    return (
      <div className="card" style={{ borderRadius: 10, border: '1px solid var(--line)', overflowX: 'auto', marginBottom: 14, background: '#fff' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ width: '28%' }}>Chương Trình / Khóa Học</th>
              <th style={{ width: '12%' }}>Chuyên Đề</th>
              <th style={{ width: '10%' }}>Thời Lượng</th>
              <th style={{ width: '10%' }}>Phân Loại</th>
              <th style={{ width: '8%' }}>Được Gán</th>
              <th style={{ width: '14%' }}>Tiến Độ &amp; Tỷ Lệ</th>
              <th style={{ width: '8%' }}>Điểm TB</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {courseList.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-faint)' }}>
                  <i className="ti ti-stack-2" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                  Không tìm thấy khóa học nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              courseList.map((g) => {
                const hasOverdue = g.overdue > 0;
                const hasFailed = g.failed > 0;
                const isComplete = g.completionRate === 100;

                return (
                  <tr key={g.course} style={{ background: hasOverdue ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: isComplete ? '#F0FDF4' : hasOverdue ? '#FEE2E2' : '#EFF6FF',
                            color: isComplete ? '#166534' : hasOverdue ? '#DC2626' : '#1D4ED8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            flexShrink: 0,
                          }}
                        >
                          <i className={`ti ${g.deliveryType === 'IN_PERSON_CLASSROOM' ? 'ti-school' : 'ti-device-laptop'}`} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{g.course}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                            {g.courseId} &middot; {g.deliveryType === 'IN_PERSON_CLASSROOM' ? 'Lớp Thực Hành (ILT)' : 'E-Learning'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="badge" style={{ background: '#F1F5F9', color: '#334155', fontSize: 11 }}>
                        {g.domain}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>
                        <i className="ti ti-clock" style={{ marginRight: 4, fontSize: 12 }} />
                        {g.estimatedHours}
                      </div>
                    </td>

                    <td>
                      <CourseTypeBadge courseType={g.courseType} />
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{g.assigned} NV</div>
                    </td>

                    <td>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: isComplete ? 'var(--sage)' : hasOverdue ? 'var(--rust)' : 'var(--rail)' }}>
                            {g.completed} / {g.assigned} xong
                          </span>
                          <span style={{ fontWeight: 800, color: 'var(--ink)' }}>{g.completionRate}%</span>
                        </div>
                        <ProgressBar
                          value={g.completionRate}
                          tone={isComplete ? 'sage' : hasOverdue ? 'rust' : 'rail'}
                          size="sm"
                        />
                        {(hasOverdue || hasFailed) && (
                          <div style={{ fontSize: 10.5, color: 'var(--rust)', marginTop: 3, fontWeight: 600 }}>
                            {hasOverdue && `• ${g.overdue} trễ hạn `}
                            {hasFailed && `• ${g.failed} trượt thi`}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      {g.avgScore !== null ? (
                        <div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: g.avgScore >= 80 ? 'var(--sage)' : 'var(--rust)' }}>
                            {g.avgScore}%
                          </span>
                          <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                            {g.avgScore >= 80 ? 'Đạt chuẩn' : 'Dưới 80%'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant="primary"
                        icon="ti-users-group"
                        onClick={() => setSelectedCourseDrilldown(g)}
                        title="Xem danh sách chi tiết nhân viên đang học khóa này"
                      >
                        Chi Tiết
                      </Button>
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
      {/* 1. PAGE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Chương Trình &amp; Khóa Học Đào Tạo Bộ Phận</h1>
            <Badge tone="amber" icon="ti-stack-2">
              {activeManager.storeName || `${activeManager.divisionCode} - ${activeManager.departmentCode}`}
            </Badge>
          </div>
          <p style={{ margin: 0 }}>
            Quản trị danh mục chương trình đào tạo chuyên môn, theo dõi tiến độ hấp thụ kiến thức theo ngành hàng và quản lý lớp học thực hành tại chi nhánh cho đội ngũ {teamMembers.length} nhân sự dưới quyền {activeManager.fullName}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            icon="ti-download"
            onClick={handleExportCsv}
          >
            Xuất Danh Mục Excel / CSV
          </Button>
        </div>
      </div>

      {/* 2. TOP 4 EXECUTIVE CURRICULUM METRICS */}
      <div className="grid grid-4" style={{ marginBottom: 24, gap: 14 }}>
        {/* Card 1: Total Courses */}
        <div className="card card-pad" style={{ borderLeft: '4px solid var(--blue, #005BAA)', background: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Tổng Khóa Đang Phân Bổ
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--blue)' }}>{curriculumKpis.totalCoursesCount}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              ({curriculumKpis.mandatoryCount} Bắt buộc &middot; {curriculumKpis.optionalCount} Tự chọn)
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
            Bao phủ 100% định biên ngành hàng
          </div>
        </div>

        {/* Card 2: Training Hours */}
        <div className="card card-pad" style={{ borderLeft: '4px solid var(--sage, #10B981)', background: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Thời Lượng Tích Lũy Đội Ngũ
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--sage)' }}>{curriculumKpis.totalHoursSpent}h</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              giờ đào tạo thực tế
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
            Đạt ~{Math.round(curriculumKpis.totalHoursSpent / Math.max(1, teamMembers.length))} giờ / nhân viên
          </div>
        </div>

        {/* Card 3: Completion Rate */}
        <div className="card card-pad" style={{ borderLeft: '4px solid #8B5CF6', background: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Tỷ Lệ Hoàn Thành TB
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#8B5CF6' }}>{curriculumKpis.avgCompletion}%</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              toàn bộ chương trình
            </span>
          </div>
          <ProgressBar value={curriculumKpis.avgCompletion} tone="rail" size="sm" />
        </div>

        {/* Card 4: Bottleneck Courses */}
        <div
          className="card card-pad"
          style={{
            borderLeft: '4px solid var(--rust, #EF4444)',
            background: '#fff',
            cursor: 'pointer',
          }}
          onClick={() => {
            setActiveTab('CURRICULUM_ROSTER');
            setQuickFilter('HAS_OVERDUE');
          }}
          title="Bấm để lọc ngay các khóa có vấn đề"
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>Khóa Cần Hỗ Trợ</span>
            <i className="ti ti-chevron-right" style={{ fontSize: 12, color: 'var(--ink-faint)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: curriculumKpis.bottleneckCount > 0 ? 'var(--rust)' : 'var(--sage)' }}>
              {curriculumKpis.bottleneckCount}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              khóa có rủi ro
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
            Có nhân sự trễ hạn hoặc thi rớt
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'CURRICULUM_ROSTER', label: 'Danh Mục Khóa Học & Tiến Độ Đội Ngũ', icon: 'ti-list-details' },
          { id: 'DOMAIN_ANALYTICS', label: 'Phân Tích Chuyên Đề & Thời Lượng', icon: 'ti-chart-donut' },
          { id: 'LIVE_WORKSHOPS', label: 'Lớp Học Thực Hành & Live Workshop', icon: 'ti-school' },
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
      {/* TAB 1: DANH MỤC KHÓA HỌC & TIẾN ĐỘ ĐỘI NGŨ */}
      {/* ========================================================================= */}
      {activeTab === 'CURRICULUM_ROSTER' && (
        <>
          {/* FILTER TOOLBAR */}
          <div className="card card-pad" style={{ marginBottom: 16, background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
            {/* ROW 0: QUICK FILTER PILLS */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
              {[
                { id: 'ALL', label: 'Tất Cả Khóa Học', count: groups.length },
                { id: 'MANDATORY', label: 'Bắt Buộc Tuân Thủ', count: groups.filter((g) => g.courseType === 'MANDATORY').length },
                { id: 'OPTIONAL', label: 'Tự Chọn / Bổ Sung', count: groups.filter((g) => g.courseType !== 'MANDATORY').length },
                { id: 'COMPLETED_100', label: 'Đạt 100% Hoàn Thành', count: groups.filter((g) => g.completionRate === 100).length },
                { id: 'HAS_OVERDUE', label: '🔴 Có Nhân Sự Quá Hạn', count: groups.filter((g) => g.overdue > 0).length, highlight: true },
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
                    fontWeight: f.highlight || quickFilter === f.id ? 700 : 500,
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
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                  placeholder="Tìm theo tên khóa học, mã khóa, chuyên đề..."
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
                    <option value="NONE">Không gộp nhóm</option>
                    <option value="TYPE">Theo Phân Loại Khóa Học</option>
                    <option value="DOMAIN">Theo Chuyên Đề (Domain)</option>
                    <option value="RATE">Theo Tỷ Lệ Hoàn Thành</option>
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

            {/* ROW 2: COLLAPSIBLE FILTER PANEL */}
            {showFilters && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {/* Domain */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      CHUYÊN ĐỀ / DOMAIN
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={domainFilter}
                      onChange={(e) => setDomainFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả chuyên đề</option>
                      {domainList.map((dom) => (
                        <option key={dom} value={dom}>{dom}</option>
                      ))}
                    </select>
                  </div>

                  {/* Course Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      PHÂN LOẠI
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả phân loại</option>
                      <option value="MANDATORY">Bắt Buộc Tuân Thủ (Mandatory)</option>
                      <option value="OPTIONAL">Tự Chọn / Bổ Sung (Optional)</option>
                    </select>
                  </div>

                  {/* Delivery Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      HÌNH THỨC ĐÀO TẠO
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={deliveryFilter}
                      onChange={(e) => setDeliveryFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả hình thức</option>
                      <option value="ONLINE">E-Learning Tự Học</option>
                      <option value="IN_PERSON">Lớp Thực Hành / Live Workshop</option>
                    </select>
                  </div>

                  {/* Rate */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      TỶ LỆ HOÀN THÀNH
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={rateFilter}
                      onChange={(e) => setRateFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả mức độ</option>
                      <option value="100">🏆 Hoàn thành 100%</option>
                      <option value="50-99">📈 Đang học (50% - 99%)</option>
                      <option value="<50">⚠️ Dưới 50%</option>
                      <option value="0">⏳ 0% (Chưa bắt đầu)</option>
                    </select>
                  </div>

                  {/* Overdue Status */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      TÌNH TRẠNG RỦI RO
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={overdueFilter}
                      onChange={(e) => setOverdueFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả tình trạng</option>
                      <option value="HAS_OVERDUE">🔴 Có học viên quá hạn</option>
                      <option value="ON_TRACK">🟢 Đúng tiến độ</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ROW 3: ACTIVE TAGS */}
            {(search || quickFilter !== 'ALL' || typeFilter !== 'ALL' || domainFilter !== 'ALL' || deliveryFilter !== 'ALL' || rateFilter !== 'ALL' || overdueFilter !== 'ALL' || groupBy !== 'NONE') && (
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
                  {domainFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Chuyên đề: <strong>{domainFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setDomainFilter('ALL')} />
                    </span>
                  )}
                  {typeFilter !== 'ALL' && (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Loại: <strong>{typeFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setTypeFilter('ALL')} />
                    </span>
                  )}
                  {groupBy !== 'NONE' && (
                    <span className="badge" style={{ background: '#F8FAFC', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Gộp nhóm: <strong>{groupBy}</strong>
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

          {/* CONTENT: TABLE */}
          {groupBy === 'NONE' ? (
            renderTable(filteredGroups)
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {Object.entries(groupedCourseMap).map(([groupTitle, list]) => {
                const isCollapsed = collapsedGroups.has(groupTitle);
                return (
                  <div key={groupTitle} className="card" style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PHÂN TÍCH CHUYÊN ĐỀ & THỜI LƯỢNG ĐÀO TẠO */}
      {/* ========================================================================= */}
      {activeTab === 'DOMAIN_ANALYTICS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
          <div className="grid grid-2" style={{ gap: 16 }}>
            {/* Phân bổ theo Chuyên Đề / Domain */}
            <div className="card card-pad" style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                Tiến Độ Theo Chuyên Đề Ngành Hàng (Curriculum Domains)
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16 }}>
                Tỷ lệ hoàn thành trung bình của đội ngũ phân bổ theo từng nhóm nghiệp vụ chuyên môn.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {domainList.map((dom) => {
                  const domCourses = groups.filter((g) => g.domain === dom);
                  const totalAssigned = domCourses.reduce((s, c) => s + c.assigned, 0);
                  const totalDone = domCourses.reduce((s, c) => s + c.completed, 0);
                  const rate = totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : 0;

                  return (
                    <div key={dom}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{dom}</span>
                        <span><strong>{rate}%</strong> ({totalDone}/{totalAssigned} học viên xong)</span>
                      </div>
                      <ProgressBar value={rate} tone={rate === 100 ? 'sage' : rate >= 50 ? 'rail' : 'amber'} size="sm" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phân bổ Hình Thức Đào Tạo */}
            <div className="card card-pad" style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                Cơ Cấu Hình Thức Đào Tạo (Delivery Modality)
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16 }}>
                Phân bổ các khóa học theo phương thức triển khai tại MM Mega Market.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: '#EFF6FF', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ti ti-device-laptop" style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>E-Learning Tự Học (Micro-learning)</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Học trên điện thoại &amp; thiết bị PDA</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{groups.filter((g) => g.deliveryType !== 'IN_PERSON_CLASSROOM').length} Khóa</div>
                    <div style={{ fontSize: 10.5, color: 'var(--sage)', fontWeight: 600 }}>Tự động cấp chứng chỉ</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ti ti-school" style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>Workshop Thực Hành Tại Xưởng / Siêu Thị</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Điểm danh QR &amp; Chấm thi thao tác</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{groups.filter((g) => g.deliveryType === 'IN_PERSON_CLASSROOM' || g.modality === 'CLASSROOM_LAB').length || 2} Khóa</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>Giảng viên hướng dẫn trực tiếp</div>
                  </div>
                </div>
              </div>

              {/* Assessment Difficulty Insights */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--ink)' }}>
                  💡 Đánh Giá Khóa Học Nổi Bật
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--sage)' }}>
                    <span>✓ Tỷ lệ đậu cao nhất:</span>
                    <strong>Food Safety (HACCP) - 100% đậu</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--rust)' }}>
                    <span>⚠ Cần mở ôn tập thêm:</span>
                    <strong>Cold Storage Procedures - 1 ca rớt 3 lần</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LỊCH ĐÀO TẠO THỰC HÀNH & LIVE WORKSHOP */}
      {/* ========================================================================= */}
      {activeTab === 'LIVE_WORKSHOPS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', padding: '14px 18px', borderRadius: 8, fontSize: 13, lineHeight: 1.5 }}>
            <i className="ti ti-school" style={{ marginRight: 8, fontSize: 16 }} />
            Theo dõi các buổi thực hành trực tiếp tại Xưởng Thực Hành (Fresh Food Lab) và hội thảo trực tuyến (Live Webinar) do Ban Giảng Viên (Faculty) tổ chức tại siêu thị MM Mega Market An Phú.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {classroomSessions.map((session) => (
              <div key={session.id} className="card card-pad" style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{session.title}</span>
                      <Badge tone="amber">{session.code}</Badge>
                      <Badge tone="sage">Đang Mở Điểm Danh QR</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      Giảng viên: <strong>{session.trainerName}</strong> ({session.trainerTitle}) &middot; Địa điểm: <strong>{session.venue}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--rail)' }}>
                      <i className="ti ti-calendar" style={{ marginRight: 4 }} />
                      {session.date}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{session.time}</div>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12.5, color: 'var(--ink)' }}>
                  <strong>Nội dung thực hành:</strong> {session.description}
                </div>

                {/* Enrolled Direct Reports */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 6 }}>
                    Nhân Sự Thuộc Đội Ngũ Tham Gia ({session.enrolledStudents?.length || 0} học viên):
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(session.enrolledStudents || []).map((stu) => (
                      <div
                        key={stu.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#fff',
                          border: '1px solid var(--line)',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 11.5,
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{stu.name}</span>
                        <span style={{ color: 'var(--ink-faint)', fontSize: 10.5 }}>({stu.position})</span>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: stu.attendance === 'CONFIRMED' ? 'var(--sage)' : '#F59E0B',
                          }}
                          title={stu.attendance === 'CONFIRMED' ? 'Đã điểm danh' : 'Chờ check-in'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DRILL-DOWN CHI TIẾT HỌC VIÊN THEO KHÓA HỌC */}
      {/* ========================================================================= */}
      {selectedCourseDrilldown && (
        <Modal
          title={`Chi Tiết Học Viên Theo Khóa: ${selectedCourseDrilldown.course}`}
          onClose={() => setSelectedCourseDrilldown(null)}
          maxWidth={820}
        >
          <div>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderRadius: 8, marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Mã khóa: <strong>{selectedCourseDrilldown.courseId}</strong> &middot; Chuyên đề: <strong>{selectedCourseDrilldown.domain}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                  Thời lượng: <strong>{selectedCourseDrilldown.estimatedHours}</strong> &middot; Chuẩn đạt bài thi: <strong>≥ 80%</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: selectedCourseDrilldown.completionRate === 100 ? 'var(--sage)' : 'var(--rail)' }}>
                  {selectedCourseDrilldown.completionRate}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  ({selectedCourseDrilldown.completed}/{selectedCourseDrilldown.assigned} hoàn thành)
                </div>
              </div>
            </div>

            {/* Members table */}
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table className="table" style={{ width: '100%', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th>Nhân Viên</th>
                    <th>Chức Danh</th>
                    <th>Tiến Độ</th>
                    <th>Trạng Thái</th>
                    <th>Điểm Thi</th>
                    <th>Hạn Chót</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCourseDrilldown.members.map((m) => (
                    <tr key={m.employeeId}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{m.employeeId}</div>
                      </td>
                      <td>{m.position}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ProgressBar value={m.progress} tone={m.progress >= 100 ? 'sage' : m.status === 'OVERDUE' ? 'rust' : 'rail'} size="sm" />
                          <span style={{ fontWeight: 700, minWidth: 28 }}>{m.progress}%</span>
                        </div>
                      </td>
                      <td>
                        <Badge tone={m.status === 'COMPLETED' ? 'sage' : m.status === 'OVERDUE' || m.status === 'FAILED' ? 'rust' : 'rail'}>
                          {m.status === 'COMPLETED' ? 'Hoàn Thành' : m.status === 'IN_PROGRESS' ? 'Đang Học' : m.status === 'OVERDUE' ? 'Quá Hạn' : m.status === 'FAILED' ? 'Chưa Đạt' : 'Chưa Học'}
                        </Badge>
                      </td>
                      <td>
                        {m.score != null ? (
                          <span style={{ fontWeight: 800, color: m.score >= 80 ? 'var(--sage)' : 'var(--rust)' }}>
                            {m.score}% {m.attempts > 1 && `(${m.attempts}L)`}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)' }}>—</span>
                        )}
                      </td>
                      <td style={{ color: m.overdue ? 'var(--rust)' : 'inherit', fontWeight: m.overdue ? 700 : 400 }}>
                        {m.dueDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                {selectedCourseDrilldown.overdue > 0 ? (
                  <span style={{ color: 'var(--rust)', fontWeight: 600 }}>
                    ⚠️ Có {selectedCourseDrilldown.overdue} nhân viên đang trễ hạn khóa học này
                  </span>
                ) : (
                  <span>🟢 Toàn bộ nhân sự đang học đúng tiến độ</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="outline" size="sm" onClick={() => setSelectedCourseDrilldown(null)}>
                  Đóng
                </Button>
                {selectedCourseDrilldown.completionRate < 100 && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={drilldownReminderSent ? 'ti-check' : 'ti-bell'}
                    onClick={handleSendDrilldownReminder}
                    disabled={drilldownReminderSent}
                  >
                    {drilldownReminderSent ? 'Đã Gửi Nhắc Nhở!' : 'Đôn Đốc Học Viên Chưa Xong'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
