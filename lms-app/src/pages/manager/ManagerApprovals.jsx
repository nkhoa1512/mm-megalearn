import React, { useState, useMemo } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, Modal, JobLevelBadge, CourseTypeBadge } from '../../features/common/ui';
import { roleDefinition } from '../../data/roles';
import { nextLevelUp, normalizeLevel, levelTitle } from '../../data/levelSystem';

export default function ManagerApprovals() {
  const { approvals, approveRequest, rejectRequest, currentUser, courses, myCourses } = useCourseStore();
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | PROCESSED
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL | LEVEL_ADVANCE | ROADMAP_PROMOTION | CURRICULUM_ASSIGNMENT
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [legalityFilter, setLegalityFilter] = useState('ALL'); // ALL | LEGAL | ILLEGAL
  const [groupBy, setGroupBy] = useState('NONE'); // NONE | TYPE | LEVEL
  const [showFilters, setShowFilters] = useState(false);

  const roleDef = roleDefinition(currentUser.role);
  const canApprove = roleDef.canApproveLevelSkip;
  const myScopeRequests = approvals || [];

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'ALL') count++;
    if (levelFilter !== 'ALL') count++;
    if (legalityFilter !== 'ALL') count++;
    return count;
  }, [typeFilter, levelFilter, legalityFilter]);

  function readinessOf(req) {
    const learner = { userId: req.userId, employeeCode: req.employeeId, level: req.currentLevel };
    const learnerCourses = myCourses(courses, learner);
    const sameLevelMandatory = learnerCourses.filter(
      (c) => normalizeLevel(c.targetLevel) === normalizeLevel(req.currentLevel) && c.courseType === 'MANDATORY'
    );
    const done = sameLevelMandatory.filter((c) => c.enrollment?.status === 'COMPLETED');
    const outstanding = sameLevelMandatory.filter((c) => c.enrollment?.status !== 'COMPLETED');
    return {
      total: sameLevelMandatory.length,
      done: done.length,
      outstanding,
      ready: sameLevelMandatory.length > 0 && outstanding.length === 0,
    };
  }

  const filterRequests = (list) => list.filter((r) => {
    if (typeFilter !== 'ALL' && r.requestType !== typeFilter) return false;
    if (levelFilter !== 'ALL') {
      const targetLvl = r.courseLevel || r.targetLevel || r.currentLevel;
      if (String(targetLvl) !== levelFilter) return false;
    }
    if (legalityFilter !== 'ALL') {
      const isLevelSkip = r.requestType === 'LEVEL_ADVANCE';
      const jumpIsLegal = !isLevelSkip || String(nextLevelUp(r.currentLevel)) === String(normalizeLevel(r.courseLevel));
      if (legalityFilter === 'LEGAL' && !jumpIsLegal) return false;
      if (legalityFilter === 'ILLEGAL' && jumpIsLegal) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const nameMatch = r.employeeName?.toLowerCase().includes(q) || r.targetLabel?.toLowerCase().includes(q);
      const idMatch = r.employeeId?.toLowerCase().includes(q);
      const courseMatch = r.courseTitle?.toLowerCase().includes(q) || r.curriculumTitle?.toLowerCase().includes(q);
      const deptMatch = r.department?.toLowerCase().includes(q) || r.position?.toLowerCase().includes(q);
      if (!nameMatch && !idMatch && !courseMatch && !deptMatch) return false;
    }
    return true;
  });

  const rawPendingList = myScopeRequests.filter((a) => a.status === 'PENDING');
  const rawProcessedList = myScopeRequests.filter((a) => a.status !== 'PENDING');

  const pendingList = filterRequests(rawPendingList);
  const processedList = filterRequests(rawProcessedList);
  const currentList = activeTab === 'PENDING' ? pendingList : processedList;

  function handleResetAllFilters() {
    setSearch('');
    setTypeFilter('ALL');
    setLevelFilter('ALL');
    setLegalityFilter('ALL');
    setGroupBy('NONE');
  }

  if (!canApprove) {
    return (
      <div className="card card-pad empty-state" style={{ margin: '40px auto', maxWidth: 520 }}>
        <i className="ti ti-lock" style={{ fontSize: 44, color: 'var(--rust)' }} />
        <h2 style={{ fontSize: 17, marginTop: 10 }}>Bạn không có quyền phê duyệt học vượt cấp</h2>
        <p style={{ color: 'var(--ink-soft)' }}>
          Chỉ các vai trò từ Quản lý trực tiếp trở lên mới xử lý được đơn xin học vượt cấp của nhân viên.
        </p>
      </div>
    );
  }

  function renderRequestCard(req) {
    const isLevelSkip = req.requestType === 'LEVEL_ADVANCE';
    const isRoadmapPromotion = req.requestType === 'ROADMAP_PROMOTION';
    const isCurriculumAssignment = req.requestType === 'CURRICULUM_ASSIGNMENT';
    const readiness = isLevelSkip ? readinessOf(req) : null;
    const jumpIsLegal = !isLevelSkip
      || String(nextLevelUp(req.currentLevel)) === String(normalizeLevel(req.courseLevel));

    return (
      <div
        key={req.id}
        className="card card-pad"
        style={{
          borderColor: isLevelSkip ? 'var(--blue)' : isRoadmapPromotion ? 'var(--sage)' : isCurriculumAssignment ? '#0284C7' : 'var(--amber)',
          borderWidth: 1.5,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="avatar" style={{ background: isCurriculumAssignment ? '#0284C7' : 'var(--rail)', color: '#fff', fontWeight: 700, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isCurriculumAssignment ? '📚' : (req.employeeName || 'NV').split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                {isCurriculumAssignment ? `Đề Xuất Phân Bổ Giáo Trình: ${req.curriculumTitle}` : `${req.employeeName} (${req.employeeId})`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                {isCurriculumAssignment ? `Người đề xuất: ${req.requesterName} (${req.requesterRole?.toUpperCase() || 'HRBP'})` : `${req.position} · ${req.department}`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {isLevelSkip && <Badge tone="blue" icon="ti-stairs-up">Học vượt cấp</Badge>}
            {isRoadmapPromotion && <Badge tone="sage" icon="ti-trophy">Đề xuất Thăng cấp Lộ trình</Badge>}
            {isCurriculumAssignment && <Badge tone="teal" icon="ti-books">Đề xuất Gán Giáo Trình</Badge>}
            <Badge tone="amber" icon="ti-clock">Gửi ngày: {req.requestDate}</Badge>
          </div>
        </div>

        {/* Cấp hiện tại -> cấp khóa học (LEVEL_ADVANCE) hoặc cấp mục tiêu (ROADMAP_PROMOTION) */}
        {isLevelSkip && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: '#EFF6FF', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#1E3A8A' }}>Cấp bậc hiện tại:</span>
            <JobLevelBadge level={req.currentLevel} />
            <i className="ti ti-arrow-right" style={{ color: '#1E40AF' }} />
            <span style={{ fontSize: 12, color: '#1E3A8A' }}>Xin học khóa cấp:</span>
            <JobLevelBadge level={req.courseLevel} />
            {jumpIsLegal ? (
              <Badge tone="sage" icon="ti-check">Vượt đúng 1 cấp liền kề — hợp lệ</Badge>
            ) : (
              <Badge tone="rust" icon="ti-ban">Nhảy cóc ≥ 2 cấp — không được phép duyệt</Badge>
            )}
          </div>
        )}
        {isRoadmapPromotion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: '#F0FDF4', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#166534' }}>Cấp bậc hiện tại:</span>
            <JobLevelBadge level={req.currentLevel} />
            <i className="ti ti-arrow-right" style={{ color: '#166534' }} />
            <span style={{ fontSize: 12, color: '#166534' }}>Đề xuất thăng lên:</span>
            <JobLevelBadge level={req.targetLevel} />
            <Badge tone="sage" icon="ti-check">Đã hoàn thành Tab 1 &amp; Tab 2 (Lộ trình hiện tại + kế cận)</Badge>
          </div>
        )}
        {isCurriculumAssignment && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD' }}>
            <span style={{ fontSize: 12.5, color: '#0369A1', fontWeight: 600 }}>🎯 Đối tượng được gán:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0C4A6E' }}>{req.targetLabel}</span>
            {req.dueDate && (
              <span style={{ fontSize: 12, color: '#0369A1', marginLeft: 12 }}>
                ⏰ Hạn chót: <strong>{req.dueDate}</strong>
              </span>
            )}
          </div>
        )}

        {/* Khóa học xin học (đối với LEVEL_ADVANCE) */}
        {isLevelSkip && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'var(--paper-sunken)', borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {req.courseCode} — {req.courseTitle}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                {req.category} &middot; {req.modality === 'ONLINE_SELF_PACED' ? 'Trực tuyến' : 'Trực tiếp'} &middot; {req.durationHours} giờ
              </div>
            </div>
            <CourseTypeBadge courseType={req.courseType} />
          </div>
        )}

        {/* Lý do xin học / Đề xuất */}
        <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12.5 }}>
          <strong style={{ color: 'var(--ink)' }}>{isCurriculumAssignment ? 'Lý Do Đề Xuất Phân Bổ (HRBP Justification):' : 'Lý Do Xin Học / Đề Xuất:'}</strong>{' '}
          <span style={{ color: 'var(--ink-soft)' }}>{req.reason || req.justification || '(Không ghi)'}</span>
        </div>

        {/* Tình trạng sẵn sàng (readiness) chỉ áp dụng cho LEVEL_ADVANCE */}
        {isLevelSkip && readiness && (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: readiness.ready ? '#F0FDF4' : '#FEF3C7', borderRadius: 8, border: `1px solid ${readiness.ready ? '#86EFAC' : '#FCD34D'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: readiness.ready ? '#166534' : '#92400E' }}>
                Tiến độ hoàn thành khóa bắt buộc Level {req.currentLevel} hiện tại:
              </span>
              <strong style={{ color: readiness.ready ? '#166534' : '#92400E' }}>
                {readiness.done}/{readiness.total} khóa ({readiness.total ? Math.round((readiness.done / readiness.total) * 100) : 100}%)
              </strong>
            </div>
            {readiness.ready ? (
              <div style={{ fontSize: 12, color: '#166534' }}>
                ✓ Nhân viên đã hoàn thành 100% khóa học bắt buộc của cấp hiện tại. Đủ điều kiện học vượt cấp.
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#92400E' }}>
                ⚠️ Còn {readiness.outstanding.length} khóa bắt buộc cấp {req.currentLevel} chưa hoàn thành:{' '}
                <strong>{readiness.outstanding.map((c) => c.title).slice(0, 2).join(', ')}{readiness.outstanding.length > 2 ? '...' : ''}</strong>. Cân nhắc kỹ trước khi duyệt.
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
            {isCurriculumAssignment
              ? 'Phê duyệt sẽ tự động gán toàn bộ lộ trình bài học trong giáo trình vào tài khoản học viên.'
              : isRoadmapPromotion
              ? 'Phê duyệt sẽ thăng cấp bậc thật cho nhân sự này ngay lập tức.'
              : 'Phê duyệt sẽ mở khóa riêng khóa học này cho học viên và ghi danh ngay — không mở toàn bộ cấp bậc.'}
          </span>
          {canApprove ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" icon="ti-x" onClick={() => rejectRequest(req.id)}>Từ Chối</Button>
              <Button
                variant="primary"
                icon="ti-check"
                disabled={isLevelSkip && !jumpIsLegal}
                title={isLevelSkip && !jumpIsLegal ? 'Không thể duyệt đơn nhảy cóc từ 2 cấp trở lên.' : undefined}
                onClick={() => approveRequest(req.id)}
              >
                {isCurriculumAssignment ? 'Phê Duyệt & Gán Giáo Trình' : isRoadmapPromotion ? 'Phê Duyệt Thăng Cấp Bậc' : 'Phê Duyệt Đơn Học Vượt Cấp'}
              </Button>
            </div>
          ) : (
            <Badge tone="amber" icon="ti-clock">Đang chờ User Admin phê duyệt</Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Phê Duyệt Đơn Xin Học Vượt Cấp</h1>
            <Badge tone="amber" icon="ti-clipboard-check">{pendingList.length} đơn chờ xử lý</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Bạn đang duyệt với vai trò <strong>{roleDef.labelVi}</strong> &middot; Xử lý đơn học vượt cấp và đề xuất phân bổ giáo trình của{' '}
            <strong>toàn bộ nhân sự trong hệ thống</strong> (Learner, Manager, Trainer/L&amp;D, HRBP đều gửi đơn về đây).
          </p>
        </div>
      </div>

      {/* Nhắc lại quy tắc tuần tự */}
      <div className="card card-pad" style={{ marginBottom: 20, borderLeft: '4px solid var(--blue)', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--ink)' }}>Cơ Chế Phê Duyệt Hệ Thống:</strong>
        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          <li><strong>Đề xuất phân bổ Giáo trình (Curriculum):</strong> HRBP gửi đề xuất phân bổ cho nhân sự/bộ phận lên User Admin duyệt. Khi được duyệt, toàn bộ học viên tương ứng sẽ nhận giáo trình bắt buộc.</li>
          <li><strong>Học vượt cấp (Sequential Level Gate):</strong> Nhân viên chỉ được xin học vượt <strong>đúng 1 cấp liền kề</strong>; đơn nhảy cóc ≥ 2 cấp hệ thống tự động chặn.</li>
        </ul>
      </div>

      {/* STANDARDIZED FILTER TOOLBAR CARD */}
      <div className="card card-pad" style={{ marginBottom: 20, background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
        {/* Row 0: Tab Buttons with Badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`btn btn-sm ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              borderRadius: 20,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderColor: activeTab === 'PENDING' ? 'var(--blue)' : 'var(--line)',
              background: activeTab === 'PENDING' ? 'var(--blue)' : 'transparent',
              color: activeTab === 'PENDING' ? '#fff' : 'var(--ink)',
              fontWeight: activeTab === 'PENDING' ? 700 : 500,
            }}
          >
            <i className="ti ti-clock" />
            <span>Đơn Chờ Duyệt</span>
            <span style={{
              background: activeTab === 'PENDING' ? 'rgba(255,255,255,0.3)' : 'var(--paper-sunken)',
              color: activeTab === 'PENDING' ? '#fff' : 'var(--ink-soft)',
              padding: '1px 6px',
              borderRadius: 10,
              fontSize: 10.5,
              fontWeight: 700,
            }}>
              {pendingList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PROCESSED')}
            className={`btn btn-sm ${activeTab === 'PROCESSED' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              borderRadius: 20,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderColor: activeTab === 'PROCESSED' ? 'var(--blue)' : 'var(--line)',
              background: activeTab === 'PROCESSED' ? 'var(--blue)' : 'transparent',
              color: activeTab === 'PROCESSED' ? '#fff' : 'var(--ink)',
              fontWeight: activeTab === 'PROCESSED' ? 700 : 500,
            }}
          >
            <i className="ti ti-history" />
            <span>Lịch Sử Đã Xử Lý</span>
            <span style={{
              background: activeTab === 'PROCESSED' ? 'rgba(255,255,255,0.3)' : 'var(--paper-sunken)',
              color: activeTab === 'PROCESSED' ? '#fff' : 'var(--ink-soft)',
              padding: '1px 6px',
              borderRadius: 10,
              fontSize: 10.5,
              fontWeight: 700,
            }}>
              {processedList.length}
            </span>
          </button>
        </div>

        {/* Row 1: Search, Group By & Filter Toggle */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
              placeholder="Tìm theo tên học viên, mã NV, khóa học, giáo trình..."
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

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Group By Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Gộp nhóm:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
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
                <option value="TYPE">Theo Loại Đơn</option>
                <option value="LEVEL">Theo Cấp Bậc</option>
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
              {/* Type Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  LOẠI ĐƠN PHÊ DUYỆT
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
                  <option value="ALL">Tất cả loại đơn</option>
                  <option value="LEVEL_ADVANCE">🔒 Học Vượt Cấp</option>
                  <option value="ROADMAP_PROMOTION">🏆 Đề Xuất Thăng Cấp</option>
                  <option value="CURRICULUM_ASSIGNMENT">📚 Đề Xuất Giáo Trình</option>
                </select>
              </div>

              {/* Level Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  CẤP BẬC MỤC TIÊU
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
                  <option value="6">Level 6 (Officer / Specialist)</option>
                  <option value="7">Level 7 (Staff)</option>
                </select>
              </div>

              {/* Legality Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  TÍNH HỢP LỆ CỦA ĐƠN
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: legalityFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: legalityFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: legalityFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: legalityFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={legalityFilter}
                  onChange={(e) => setLegalityFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả tính hợp lệ</option>
                  <option value="LEGAL">🟢 Hợp lệ (Đúng 1 cấp liền kề / Đã đủ điều kiện)</option>
                  <option value="ILLEGAL">🔴 Nhảy cóc ≥ 2 cấp (Không được phép duyệt)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Row 3: Active Filters Summary Bar */}
        {(search || typeFilter !== 'ALL' || levelFilter !== 'ALL' || legalityFilter !== 'ALL' || groupBy !== 'NONE') && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Đang lọc theo:</span>
              {search && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Từ khóa: <strong>"{search}"</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                </span>
              )}
              {typeFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Loại đơn: <strong>{typeFilter === 'LEVEL_ADVANCE' ? 'Học vượt cấp' : typeFilter === 'ROADMAP_PROMOTION' ? 'Thăng cấp' : 'Giáo trình'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setTypeFilter('ALL')} />
                </span>
              )}
              {levelFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Cấp bậc: <strong>Level {levelFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setLevelFilter('ALL')} />
                </span>
              )}
              {legalityFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Tính hợp lệ: <strong>{legalityFilter === 'LEGAL' ? 'Hợp lệ' : 'Vi phạm nhảy cóc'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setLegalityFilter('ALL')} />
                </span>
              )}
              {groupBy !== 'NONE' && (
                <span className="badge" style={{ background: '#F8FAFC', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Gộp nhóm: <strong>{groupBy === 'TYPE' ? 'Theo Loại Đơn' : 'Theo Cấp Bậc'}</strong>
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
              Tìm thấy <strong>{currentList.length}</strong> / {activeTab === 'PENDING' ? rawPendingList.length : rawProcessedList.length} đơn
            </div>
          </div>
        )}
      </div>

      {/* Content Rendering */}
      {currentList.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px 16px', textAlign: 'center' }}>
          <i className="ti ti-clipboard-check" style={{ fontSize: 36, color: 'var(--ink-faint)', display: 'block', marginBottom: 10 }} />
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>
            Không có đơn nào khớp với bộ lọc
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '0 auto 16px', maxWidth: 400 }}>
            {activeTab === 'PENDING'
              ? 'Tất cả các đơn xin học vượt cấp hoặc đề xuất giáo trình đã được xử lý xong.'
              : 'Chưa có lịch sử đơn nào phù hợp với các tiêu chí tìm kiếm hiện tại.'}
          </p>
          <Button variant="outline" size="sm" onClick={handleResetAllFilters}>
            Xóa Tất Cả Bộ Lọc
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {currentList.map((req) => renderRequestCard(req))}
        </div>
      )}
    </>
  );
}
