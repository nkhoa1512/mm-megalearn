import React, { useState, useMemo } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, Modal, ProgressBar } from '../../features/common/ui';

export default function LearnerClassrooms() {
  const { classrooms = [], checkInClassroom, enrollClassroom, currentUser, openSurveyModal } = useCourseStore();

  // Quick Filter Pills (Top)
  const [quickFilter, setQuickFilter] = useState('ALL'); // ALL, MY_SESSIONS, UPCOMING, STORE, WEBINAR, CHECKED_IN

  // Search & Detailed Filters
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState('NONE'); // NONE, MODALITY, STATUS, VENUE, TRAINER
  const [viewMode, setViewMode] = useState('GRID'); // GRID, TABLE
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  const [modalityFilter, setModalityFilter] = useState('ALL'); // ALL, OFFLINE_STORE, ONLINE_WEBINAR
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, OPEN, ENROLLED, CHECKED_IN, COMPLETED
  const [venueFilter, setVenueFilter] = useState('ALL');
  const [trainerFilter, setTrainerFilter] = useState('ALL');

  // Scanner Modal state (Simulated Camera Viewfinder)
  const [scanningSession, setScanningSession] = useState(null);
  const [scanState, setScanState] = useState('SCANNING'); // SCANNING, VERIFYING, SUCCESS

  // Syllabus & Materials Modal state
  const [viewingMaterialsSession, setViewingMaterialsSession] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Extract unique venues & trainers for filter dropdowns
  const venueList = useMemo(() => {
    const set = new Set();
    classrooms.forEach((c) => { if (c.venue) set.add(c.venue); });
    return Array.from(set);
  }, [classrooms]);

  const trainerList = useMemo(() => {
    const set = new Set();
    classrooms.forEach((c) => { if (c.trainerName) set.add(c.trainerName); });
    return Array.from(set);
  }, [classrooms]);

  // Compute active filters count (excluding quickFilter pill and search)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (modalityFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (venueFilter !== 'ALL') count++;
    if (trainerFilter !== 'ALL') count++;
    return count;
  }, [modalityFilter, statusFilter, venueFilter, trainerFilter]);

  // Main filter logic
  const filteredSessions = useMemo(() => {
    return classrooms.filter((s) => {
      // 1. Quick filter pill
      if (quickFilter === 'UPCOMING' && !(s.status === 'UPCOMING' || s.status === 'OPEN')) return false;
      if (quickFilter === 'MY_SESSIONS' && !s.isEnrolled) return false;
      if (quickFilter === 'STORE' && s.modality !== 'OFFLINE_STORE') return false;
      if (quickFilter === 'WEBINAR' && s.modality !== 'ONLINE_WEBINAR') return false;
      if (quickFilter === 'CHECKED_IN' && s.attendanceStatus !== 'CHECKED_IN') return false;

      // 2. Dropdown panel filters
      if (modalityFilter !== 'ALL' && s.modality !== modalityFilter) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ENROLLED' && !s.isEnrolled) return false;
        if (statusFilter === 'CHECKED_IN' && s.attendanceStatus !== 'CHECKED_IN') return false;
        if (statusFilter === 'OPEN' && !(s.status === 'OPEN' || s.status === 'UPCOMING')) return false;
        if (statusFilter === 'COMPLETED' && s.status !== 'COMPLETED') return false;
      }
      if (venueFilter !== 'ALL' && s.venue !== venueFilter) return false;
      if (trainerFilter !== 'ALL' && s.trainerName !== trainerFilter) return false;

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const titleMatch = s.title?.toLowerCase().includes(q);
        const codeMatch = s.code?.toLowerCase().includes(q);
        const trainerMatch = s.trainerName?.toLowerCase().includes(q);
        const venueMatch = s.venue?.toLowerCase().includes(q);
        const descMatch = s.description?.toLowerCase().includes(q);
        if (!titleMatch && !codeMatch && !trainerMatch && !venueMatch && !descMatch) return false;
      }

      return true;
    });
  }, [classrooms, quickFilter, modalityFilter, statusFilter, venueFilter, trainerFilter, search]);

  // Grouped sessions
  const groupedSessions = useMemo(() => {
    if (groupBy === 'NONE') return { 'Tất Cả Lớp': filteredSessions };
    const groups = {};

    filteredSessions.forEach((s) => {
      let key = 'Khác';
      if (groupBy === 'MODALITY') {
        key = s.modality === 'OFFLINE_STORE' ? '🏪 Thực Hành Tại Xưởng Siêu Thị' : '💻 Hội Thảo Trực Tuyến (Teams Webinar)';
      } else if (groupBy === 'STATUS') {
        if (s.attendanceStatus === 'CHECKED_IN') key = '✅ Đã Điểm Danh';
        else if (s.isEnrolled) key = '⏳ Chờ Đến Lớp Quét QR';
        else if (s.status === 'COMPLETED') key = '🏁 Đã Kết Thúc';
        else key = '🟢 Mở Đăng Ký';
      } else if (groupBy === 'VENUE') {
        key = s.venue || 'Chưa xác định địa điểm';
      } else if (groupBy === 'TRAINER') {
        key = `👨‍🏫 ${s.trainerName || 'Chưa phân công'}`;
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    return groups;
  }, [filteredSessions, groupBy]);

  function toggleGroup(key) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleResetAllFilters() {
    setSearch('');
    setQuickFilter('ALL');
    setModalityFilter('ALL');
    setStatusFilter('ALL');
    setVenueFilter('ALL');
    setTrainerFilter('ALL');
    setGroupBy('NONE');
  }

  function handleOpenScanner(session) {
    setScanningSession(session);
    setScanState('SCANNING');
  }

  function handleOpenSurvey(session) {
    openSurveyModal(session, 'CLASSROOM_CSAT');
  }

  function handleSimulateScan() {
    setScanState('VERIFYING');
    setTimeout(() => {
      if (scanningSession) {
        checkInClassroom(scanningSession.id);
      }
      setScanState('SUCCESS');
      setTimeout(() => {
        const checkedInSession = scanningSession;
        setScanningSession(null);
        setScanState('SCANNING');
        if (checkedInSession) handleOpenSurvey(checkedInSession);
      }, 1500);
    }, 1000);
  }

  // Helper render for single session card in Grid
  function renderSessionCard(session) {
    const isFull = session.enrolledCount >= session.maxCapacity;
    const isCheckedIn = session.attendanceStatus === 'CHECKED_IN';

    return (
      <div key={session.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20 }}>
        <div>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge tone={session.modality === 'OFFLINE_STORE' ? 'amber' : 'blue'} icon={session.modality === 'OFFLINE_STORE' ? 'ti-building-store' : 'ti-video'}>
                {session.modality === 'OFFLINE_STORE' ? 'Thực Hành Tại Xưởng' : 'Teams Webinar'}
              </Badge>
              <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{session.code}</span>
            </div>

            {isCheckedIn ? (
              <Badge tone="sage" icon="ti-circle-check">Đã Điểm Danh</Badge>
            ) : session.isEnrolled ? (
              <Badge tone="amber" icon="ti-clock">Chờ Đến Lớp Quét QR</Badge>
            ) : (
              <Badge tone={session.status === 'COMPLETED' ? 'slate' : 'rail'}>
                {session.status === 'COMPLETED' ? 'Đã Kết Thúc' : 'Mở Đăng Ký'}
              </Badge>
            )}
          </div>

          {/* Title & Description */}
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>{session.title}</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 14 }}>
            {session.description}
          </p>

          {/* Session Meta Specs */}
          <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <i className="ti ti-calendar-event" style={{ color: 'var(--blue)', fontSize: 16 }} />
              <span style={{ fontWeight: 700 }}>{session.date}</span> &middot; <span style={{ color: 'var(--ink-soft)' }}>{session.time}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <i className="ti ti-map-pin" style={{ color: 'var(--rust)', fontSize: 16 }} />
              <span style={{ color: 'var(--ink-soft)' }}>{session.venue}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <i className="ti ti-user-check" style={{ color: 'var(--sage)', fontSize: 16 }} />
              <span>Giảng viên đứng lớp: <strong>{session.trainerName}</strong> ({session.trainerTitle})</span>
            </div>
          </div>

          {/* Capacity Progress */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 4 }}>
              <span>Sĩ số lớp: <strong>{session.enrolledCount}/{session.maxCapacity} Học viên</strong></span>
              <span>{isFull ? 'Lớp đã đủ chỗ' : `Còn trống ${session.maxCapacity - session.enrolledCount} chỗ`}</span>
            </div>
            <ProgressBar value={Math.round((session.enrolledCount / session.maxCapacity) * 100)} tone={isFull ? 'rust' : 'rail'} size="sm" />
          </div>
        </div>

        {/* Card Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
            <i className="ti ti-award" style={{ marginRight: 4, color: 'var(--sage)' }} />
            Chứng nhận tham gia &amp; Ghi nhận hồ sơ đào tạo
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* PRE-CLASS MATERIALS & SYLLABUS BUTTON */}
            <Button
              variant="outline"
              size="sm"
              icon="ti-file-description"
              onClick={() => setViewingMaterialsSession(session)}
            >
              Giáo Trình &amp; Slide
            </Button>

            {/* CASE 1: Learner is enrolled and needs to scan Trainer's QR */}
            {session.isEnrolled && !isCheckedIn && session.status !== 'COMPLETED' && (
              <Button variant="primary" size="sm" icon="ti-camera" onClick={() => handleOpenScanner(session)}>
                📷 Quét QR Điểm Danh
              </Button>
            )}

            {/* CASE 2: Learner not enrolled yet */}
            {!session.isEnrolled && session.status !== 'COMPLETED' && (
              <Button
                variant="primary"
                size="sm"
                icon="ti-plus"
                disabled={isFull}
                onClick={() => enrollClassroom(session.id)}
              >
                {isFull ? 'Lớp Đã Đủ Chỗ' : 'Đăng Ký Tham Gia'}
              </Button>
            )}

            {/* CASE 3: Learner has checked in -> Can submit CSAT rating */}
            {isCheckedIn && (
              <Button variant="outline" size="sm" icon="ti-star" onClick={() => handleOpenSurvey(session)}>
                ⭐ Đánh Giá Buổi Học (CSAT)
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Helper render for Table view
  function renderSessionTable(sessionsList) {
    return (
      <div className="card" style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--line)', marginBottom: 16 }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ width: 100 }}>Mã Lớp</th>
              <th>Buổi Đào Tạo &amp; Nội Dung</th>
              <th style={{ width: 140 }}>Hình Thức</th>
              <th style={{ width: 160 }}>Địa Điểm / Siêu Thị</th>
              <th style={{ width: 140 }}>Thời Gian</th>
              <th style={{ width: 150 }}>Giảng Viên</th>
              <th style={{ width: 120 }}>Sĩ Số</th>
              <th style={{ width: 130 }}>Trạng Thái</th>
              <th style={{ textAlign: 'right', width: 220 }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {sessionsList.map((s) => {
              const isFull = s.enrolledCount >= s.maxCapacity;
              const isCheckedIn = s.attendanceStatus === 'CHECKED_IN';
              return (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, color: 'var(--blue)' }}>
                    {s.code}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{s.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {s.description}
                    </div>
                  </td>
                  <td>
                    <Badge tone={s.modality === 'OFFLINE_STORE' ? 'amber' : 'blue'} size="sm" icon={s.modality === 'OFFLINE_STORE' ? 'ti-building-store' : 'ti-video'}>
                      {s.modality === 'OFFLINE_STORE' ? 'Xưởng Siêu Thị' : 'Webinar'}
                    </Badge>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ink)' }}>
                    <i className="ti ti-map-pin" style={{ color: 'var(--rust)', marginRight: 4 }} />
                    {s.venue}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 600 }}>{s.date}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{s.time}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <strong>{s.trainerName}</strong>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{s.trainerTitle}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>{s.enrolledCount}/{s.maxCapacity}</div>
                    <ProgressBar value={Math.round((s.enrolledCount / s.maxCapacity) * 100)} tone={isFull ? 'rust' : 'rail'} size="sm" />
                  </td>
                  <td>
                    {isCheckedIn ? (
                      <Badge tone="sage" size="sm" icon="ti-circle-check">Đã Điểm Danh</Badge>
                    ) : s.isEnrolled ? (
                      <Badge tone="amber" size="sm" icon="ti-clock">Đã Đăng Ký</Badge>
                    ) : (
                      <Badge tone={s.status === 'COMPLETED' ? 'slate' : 'rail'} size="sm">
                        {s.status === 'COMPLETED' ? 'Đã Kết Thúc' : 'Mở Đăng Ký'}
                      </Badge>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Button variant="ghost" size="sm" icon="ti-file-description" title="Giáo Trình & Slide" onClick={() => setViewingMaterialsSession(s)}>
                        Slide
                      </Button>
                      {s.isEnrolled && !isCheckedIn && s.status !== 'COMPLETED' && (
                        <Button variant="primary" size="sm" icon="ti-camera" onClick={() => handleOpenScanner(s)}>
                          Quét QR
                        </Button>
                      )}
                      {!s.isEnrolled && s.status !== 'COMPLETED' && (
                        <Button variant="primary" size="sm" icon="ti-plus" disabled={isFull} onClick={() => enrollClassroom(s.id)}>
                          Đăng Ký
                        </Button>
                      )}
                      {isCheckedIn && (
                        <Button variant="outline" size="sm" icon="ti-star" onClick={() => handleOpenSurvey(s)}>
                          CSAT
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
            <h1>Lớp Đào Tạo Trực Tiếp &amp; Quét QR Điểm Danh (ILT Workshops)</h1>
            <Badge tone="blue" icon="ti-chalkboard">Đào Tạo Trực Tiếp Tại Siêu Thị</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Lớp học thực hành tại xưởng bánh, bãi tập PCCC siêu thị và hội thảo trực tuyến do Giảng viên chuyên trách (Trainer) đứng lớp.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" icon="ti-camera" onClick={() => handleOpenScanner(classrooms[0])}>
            📷 Mở Camera Quét QR Giảng Viên
          </Button>
        </div>
      </div>

      {/* STANDARDIZED FILTER TOOLBAR CARD */}
      <div className="card card-pad" style={{ marginBottom: 20, background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
        {/* ROW 0: QUICK FILTER PILLS */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
          {[
            { id: 'ALL', label: 'Tất Cả Buổi Đào Tạo', count: classrooms.length },
            { id: 'MY_SESSIONS', label: 'Lớp Tôi Được Gán / Đã Đăng Ký', count: classrooms.filter(s => s.isEnrolled).length },
            { id: 'UPCOMING', label: 'Lớp Sắp Diễn Ra', count: classrooms.filter(s => s.status === 'UPCOMING' || s.status === 'OPEN').length },
            { id: 'STORE', label: 'Thực Hành Xưởng Siêu Thị', count: classrooms.filter(s => s.modality === 'OFFLINE_STORE').length },
            { id: 'WEBINAR', label: 'Hội Thảo Trực Tuyến (Webinar)', count: classrooms.filter(s => s.modality === 'ONLINE_WEBINAR').length },
            { id: 'CHECKED_IN', label: 'Đã Điểm Danh', count: classrooms.filter(s => s.attendanceStatus === 'CHECKED_IN').length },
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
                borderColor: quickFilter === f.id ? 'var(--blue)' : 'var(--line)',
                background: quickFilter === f.id ? 'var(--blue)' : 'transparent',
                color: quickFilter === f.id ? '#fff' : 'var(--ink)',
                fontWeight: quickFilter === f.id ? 700 : 500,
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

        {/* ROW 1: SEARCH, GROUP BY, FILTER TOGGLE, VIEW MODE */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search input */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
              placeholder="Tìm theo tên lớp, mã lớp, giảng viên, phòng lab, siêu thị..."
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
                <option value="MODALITY">Theo Hình Thức Đào Tạo</option>
                <option value="STATUS">Theo Trạng Thái Lớp</option>
                <option value="VENUE">Theo Địa Điểm / Siêu Thị</option>
                <option value="TRAINER">Theo Giảng Viên Đứng Lớp</option>
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

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`btn btn-sm ${viewMode === 'TABLE' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                title="Dạng Bảng (List View)"
              >
                <i className="ti ti-list" />
                <span>Bảng</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`btn btn-sm ${viewMode === 'GRID' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                title="Dạng Lưới (Grid View)"
              >
                <i className="ti ti-layout-grid" />
                <span>Lưới</span>
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: COLLAPSIBLE FILTER PANEL WITH TOP LABELS */}
        {showFilters && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {/* Dropdown 1: Modality */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  HÌNH THỨC ĐÀO TẠO
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: modalityFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: modalityFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: modalityFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: modalityFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={modalityFilter}
                  onChange={(e) => setModalityFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả hình thức</option>
                  <option value="OFFLINE_STORE">🏪 Thực hành tại xưởng siêu thị (Store Lab)</option>
                  <option value="ONLINE_WEBINAR">💻 Trực tuyến Teams Webinar</option>
                </select>
              </div>

              {/* Dropdown 2: Status */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  TRẠNG THÁI BUỔI HỌC
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: statusFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: statusFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: statusFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: statusFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ENROLLED">⏳ Đã đăng ký / Được gán</option>
                  <option value="CHECKED_IN">✅ Đã điểm danh thành công</option>
                  <option value="OPEN">🟢 Mở đăng ký / Sắp diễn ra</option>
                  <option value="COMPLETED">🏁 Đã hoàn thành / Kết thúc</option>
                </select>
              </div>

              {/* Dropdown 3: Venue */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  ĐỊA ĐIỂM / SIÊU THỊ
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: venueFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: venueFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: venueFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: venueFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={venueFilter}
                  onChange={(e) => setVenueFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả địa điểm</option>
                  {venueList.map((ven) => (
                    <option key={ven} value={ven}>{ven}</option>
                  ))}
                </select>
              </div>

              {/* Dropdown 4: Trainer */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  GIẢNG VIÊN ĐỨNG LỚP
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: trainerFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: trainerFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: trainerFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: trainerFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={trainerFilter}
                  onChange={(e) => setTrainerFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả giảng viên</option>
                  {trainerList.map((tr) => (
                    <option key={tr} value={tr}>{tr}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ROW 3: ACTIVE FILTER TAGS & RESET SUMMARY */}
        {(search || quickFilter !== 'ALL' || modalityFilter !== 'ALL' || statusFilter !== 'ALL' || venueFilter !== 'ALL' || trainerFilter !== 'ALL' || groupBy !== 'NONE') && (
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
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
                  Dải chọn nhanh: <strong>{quickFilter === 'MY_SESSIONS' ? 'Lớp của tôi' : quickFilter === 'UPCOMING' ? 'Sắp diễn ra' : quickFilter === 'STORE' ? 'Xưởng siêu thị' : quickFilter === 'WEBINAR' ? 'Webinar' : 'Đã điểm danh'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setQuickFilter('ALL')} />
                </span>
              )}
              {modalityFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Hình thức: <strong>{modalityFilter === 'OFFLINE_STORE' ? 'Xưởng Siêu Thị' : 'Webinar'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setModalityFilter('ALL')} />
                </span>
              )}
              {statusFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Trạng thái: <strong>{statusFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
                </span>
              )}
              {venueFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Địa điểm: <strong>{venueFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setVenueFilter('ALL')} />
                </span>
              )}
              {trainerFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Giảng viên: <strong>{trainerFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setTrainerFilter('ALL')} />
                </span>
              )}
              {groupBy !== 'NONE' && (
                <span className="badge" style={{ background: '#F3E8FF', color: '#6B21A8', border: '1px solid #DDD6FE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
              Tìm thấy <strong>{filteredSessions.length}</strong> / {classrooms.length} buổi đào tạo
            </div>
          </div>
        )}
      </div>

      {/* SESSIONS CONTENT: GROUPED / UNGROUPED - GRID / TABLE */}
      {filteredSessions.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px 16px', textAlign: 'center' }}>
          <i className="ti ti-chalkboard-off" style={{ fontSize: 36, color: 'var(--ink-faint)', display: 'block', marginBottom: 10 }} />
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>
            Không tìm thấy buổi đào tạo nào phù hợp
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', maxWidth: 450, margin: '0 auto 16px' }}>
            Không có lớp đào tạo trực tiếp hoặc webinar nào khớp với các tiêu chí tìm kiếm và bộ lọc hiện tại của bạn.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetAllFilters}>
            Xóa Tất Cả Bộ Lọc
          </Button>
        </div>
      ) : groupBy === 'NONE' ? (
        viewMode === 'GRID' ? (
          <div className="grid grid-2" style={{ gap: 16 }}>
            {filteredSessions.map((session) => renderSessionCard(session))}
          </div>
        ) : (
          renderSessionTable(filteredSessions)
        )
      ) : (
        /* ACCORDION GROUPS */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(groupedSessions).map(([groupTitle, list]) => {
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
                      {list.length} buổi đào tạo
                    </span>
                  </div>
                </div>

                {!isCollapsed && (
                  <div style={{ padding: 16 }}>
                    {viewMode === 'GRID' ? (
                      <div className="grid grid-2" style={{ gap: 16 }}>
                        {list.map((session) => renderSessionCard(session))}
                      </div>
                    ) : (
                      renderSessionTable(list)
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: SIMULATED MOBILE CAMERA QR SCANNER */}
      {scanningSession && (
        <Modal
          isOpen={Boolean(scanningSession)}
          onClose={() => setScanningSession(null)}
          title="Quét Mã QR Điểm Danh Tại Lớp Học"
          size="sm"
        >
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
              {scanningSession.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Giảng viên: <strong>{scanningSession.trainerName}</strong> &middot; {scanningSession.venue}
            </div>

            {/* Camera Viewfinder Box */}
            <div style={{
              position: 'relative',
              width: 240,
              height: 240,
              margin: '0 auto 16px',
              borderRadius: 16,
              background: '#0B0F19',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              border: '3px solid var(--blue)',
            }}>
              {scanState === 'SUCCESS' ? (
                <div style={{ color: '#10B981', animation: 'scaleUp 0.3s ease' }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 72 }} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginTop: 8 }}>ĐIỂM DANH THÀNH CÔNG!</div>
                  <div style={{ fontSize: 12, color: '#10B981' }}>Đã Xác Nhận Tham Gia Khóa Học</div>
                </div>
              ) : scanState === 'VERIFYING' ? (
                <div style={{ color: '#fff' }}>
                  <i className="ti ti-loader" style={{ fontSize: 48, animation: 'spin 1s linear infinite' }} />
                  <div style={{ fontSize: 13, marginTop: 10 }}>Đang xác thực mã Token Giảng viên...</div>
                </div>
              ) : (
                <>
                  {/* Viewfinder Target Frame */}
                  <div style={{
                    width: 170,
                    height: 170,
                    border: '2px dashed #60A5FA',
                    borderRadius: 12,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <i className="ti ti-qrcode" style={{ fontSize: 80, color: 'rgba(255,255,255,0.2)' }} />
                    {/* Laser Scanner Line */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: '50%',
                      height: 2,
                      background: '#EF4444',
                      boxShadow: '0 0 10px #EF4444',
                    }} />
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 10, padding: '0 10px' }}>
                    Hướng camera về phía mã QR đang chiếu trên màn hình của Thầy/Cô
                  </div>
                </>
              )}
            </div>

            <p style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45, margin: '0 0 16px' }}>
              Học viên <strong>{currentUser.fullName}</strong> ({currentUser.employeeCode}) đang quét mã điểm danh của lớp <strong>{scanningSession.code}</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <Button variant="ghost" onClick={() => setScanningSession(null)}>Đóng Camera</Button>
              <Button
                variant="primary"
                icon="ti-scan"
                disabled={scanState !== 'SCANNING'}
                onClick={handleSimulateScan}
              >
                {scanState === 'SCANNING' ? 'Bấm Quét Mã QR Giảng Viên' : scanState === 'VERIFYING' ? 'Đang Xử Lý...' : 'Đã Điểm Danh!'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: SESSION SYLLABUS & PRE-CLASS MATERIALS */}
      {viewingMaterialsSession && (
        <Modal
          isOpen={Boolean(viewingMaterialsSession)}
          onClose={() => { setViewingMaterialsSession(null); setPreviewDoc(null); }}
          title={`Giáo Trình & Tài Liệu — ${viewingMaterialsSession.title}`}
          subtitle={`Mã Lớp: ${viewingMaterialsSession.code} · Giảng viên: ${viewingMaterialsSession.trainerName}`}
          size="lg"
        >
          <div>
            {/* Section 1: Syllabus Agenda */}
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--blue)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-list-check" /> Khung Chương Trình Buổi Học (Session Agenda)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {(viewingMaterialsSession.syllabus || []).length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontStyle: 'italic', padding: 8 }}>
                  Khung bài giảng đang được Giảng viên cập nhật.
                </div>
              ) : (
                viewingMaterialsSession.syllabus.map((step, idx) => (
                  <div key={idx} style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--line)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: 'var(--blue)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                        {idx + 1}
                      </span>
                      {step.step}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, marginLeft: 28 }}>
                      {step.detail}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Section 2: Attachments */}
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--bigc-green, #007A38)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-paperclip" /> Tài Liệu &amp; Slide Đính Kèm (Class Attachments)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {(viewingMaterialsSession.materials || []).length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontStyle: 'italic', padding: 8 }}>
                  Chưa có tài liệu hoặc slide đính kèm cho lớp này.
                </div>
              ) : (
                viewingMaterialsSession.materials.map((mat, idx) => (
                  <div key={idx} style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className={`ti ${mat.type === 'PDF' ? 'ti-file-type-pdf' : 'ti-file-type-ppt'}`} style={{ fontSize: 22, color: mat.type === 'PDF' ? 'var(--rust)' : 'var(--amber)' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>{mat.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{mat.size} &middot; Cập nhật bởi {viewingMaterialsSession.trainerName}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setPreviewDoc(mat)}>
                        Xem Trước
                      </Button>
                      <Button size="sm" variant="ghost" icon="ti-download" onClick={() => alert(`Đang tải tài liệu: ${mat.title}`)}>
                        Tải Về
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Document Preview Area */}
            {previewDoc && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Đang xem: {previewDoc.title}</span>
                  <Button size="sm" variant="ghost" icon="ti-x" onClick={() => setPreviewDoc(null)}>Đóng xem trước</Button>
                </div>
                <div style={{ height: 260, background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ink-soft)' }}>
                  <i className="ti ti-file-text" style={{ fontSize: 40, color: 'var(--blue)' }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Khung Xem Trước Slide / Giáo Trình PDF</div>
                  <div style={{ fontSize: 11.5 }}>Trang 1 / 18 &middot; Tài liệu chuẩn hóa nội bộ MM Mega Market</div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
