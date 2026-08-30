import React, { useState, useMemo } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, Modal, ProgressBar } from '../../features/common/ui';
import CurriculumTree from '../../features/catalog/CurriculumTree';
import { targetOptionsFor } from '../../data/assignmentTargets';
import {
  getCourseTargetLevels,
  evaluateUserEligibilityForCourse,
  evaluateGroupEligibilityForCourse,
} from '../../data/levelSystem';
import {
  hrbpCurriculumBuckets,
  getCurriculumProgress,
} from '../../utils/curriculumAssignment';

export default function HrbpCurriculumTab() {
  const {
    courses,
    curricula,
    currentUser,
    approvals,
    myEnrollments,
    proposeCurriculumAssignment,
    myCurriculumProposals,
    successionTalents,
    updateSuccessionTalent,
    customGroups = [],
    language,
  } = useCourseStore();

  const [activeFilter, setActiveFilter] = useState('MINE'); // 'MINE' | 'PROPOSED' | 'ALL'
  const [search, setSearch] = useState('');
  const [viewingCurriculum, setViewingCurriculum] = useState(null);
  const [nominateModal, setNominateModal] = useState({ open: false, curriculum: null });
  const [toastMessage, setToastMessage] = useState(null);

  // Form states for propose modal
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
  const [candidateSource, setCandidateSource] = useState('SUCCESSION'); // 'SUCCESSION' | 'ALL_USERS' | 'CUSTOM_GROUP'
  const [selectedTalentId, setSelectedTalentId] = useState('');
  const [dueDate, setDueDate] = useState('2026-12-31');
  const [justification, setJustification] = useState('');

  // Proposals tracking filter
  const [proposalStatusFilter, setProposalStatusFilter] = useState('ALL');

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  }

  // Derive buckets
  const { mine, proposed } = useMemo(
    () => hrbpCurriculumBuckets(curricula, currentUser, approvals),
    [curricula, currentUser, approvals]
  );

  const publishedCurricula = useMemo(
    () => (curricula || []).filter((c) => c.status === 'PUBLISHED'),
    [curricula]
  );

  const allUserOptions = useMemo(() => targetOptionsFor('USER') || [], []);

  // Filtered lists for the active tab view
  const currentList = useMemo(() => {
    let list = [];
    if (activeFilter === 'MINE') list = mine;
    else if (activeFilter === 'PROPOSED') list = proposed;
    else list = publishedCurricula;

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [activeFilter, mine, proposed, publishedCurricula, search]);

  const proposalsList = useMemo(() => {
    const raw = myCurriculumProposals ? myCurriculumProposals(currentUser) : [];
    if (proposalStatusFilter === 'ALL') return raw;
    return raw.filter((p) => p.status === proposalStatusFilter);
  }, [myCurriculumProposals, currentUser, proposalStatusFilter]);

  function handleOpenNominate(cur = null) {
    const defaultCurId = cur?.id || publishedCurricula[0]?.id || '';
    setSelectedCurriculumId(defaultCurId);
    setCandidateSource('SUCCESSION');
    setSelectedTalentId(successionTalents[0]?.id || allUserOptions[0]?.id || '');
    setDueDate('2026-12-31');
    setJustification('');
    setNominateModal({ open: true, curriculum: cur });
  }

  function handleCloseNominate() {
    setNominateModal({ open: false, curriculum: null });
  }

  function handleSubmitNominate(e) {
    e.preventDefault();
    if (!selectedCurriculumId || !selectedTalentId) return;

    let targetId = selectedTalentId;
    let targetLabel = selectedTalentId;
    let targetType = 'USER';
    let matchedTalent = null;

    if (candidateSource === 'SUCCESSION') {
      matchedTalent = successionTalents.find((t) => t.id === selectedTalentId);
      if (matchedTalent) {
        targetId = matchedTalent.userId || matchedTalent.id;
        targetLabel = `${matchedTalent.name} (${matchedTalent.currentRole} · ${matchedTalent.store})`;
      }
    } else if (candidateSource === 'CUSTOM_GROUP') {
      targetType = 'GROUP';
      const grp = customGroups.find((g) => g.id === selectedTalentId);
      if (grp) {
        targetId = grp.id;
        targetLabel = `👥 ${grp.title || grp.name} (${grp.memberCount || grp.memberUserIds?.length || 0} thành viên)`;
      }
    } else {
      const u = allUserOptions.find((opt) => opt.id === selectedTalentId);
      if (u) {
        targetId = u.id;
        targetLabel = u.label;
      }
      matchedTalent = successionTalents.find((t) => t.id === targetId || t.userId === targetId);
    }

    const cur = curricula.find((c) => c.id === selectedCurriculumId);
    const result = proposeCurriculumAssignment(
      selectedCurriculumId,
      {
        assignmentType: targetType,
        targetId,
        targetLabel,
        dueDate,
      },
      justification ||
        `HRBP ${currentUser?.fullName || 'Lê Thị Mai'} đề xuất phân bổ Giáo trình "${cur?.title}" cho đối tượng ${targetLabel} nhằm phát triển năng lực định biên.`
    );

    if (result && result.ok) {
      if (matchedTalent && updateSuccessionTalent) {
        updateSuccessionTalent(matchedTalent.id, {
          curriculumId: selectedCurriculumId,
          curriculumProposalId: result.request?.id,
        });
      }
      showToast(`📋 Đã gửi đơn đề xuất gán Giáo Trình "${cur?.title}" cho ${targetLabel} lên User Admin phê duyệt!`);
    }

    handleCloseNominate();
  }

  return (
    <div>
      {toastMessage && (
        <div
          className="card card-pad"
          style={{
            marginBottom: 16,
            borderLeft: '4px solid var(--blue)',
            background: '#EFF6FF',
            fontSize: 13,
            color: '#1E40AF',
            fontWeight: 600,
          }}
        >
          <i className="ti ti-circle-check" style={{ marginRight: 6 }} />
          {toastMessage}
        </div>
      )}

      {/* Header Banner & Guidance */}
      <div
        className="card card-pad"
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, var(--paper-raised) 0%, rgba(59, 130, 246, 0.05) 100%)',
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)', marginBottom: 4 }}>
              <i className="ti ti-books" style={{ color: 'var(--blue)', fontSize: 18 }} />
              <span>Phân Bổ Giáo Trình &amp; Đề Xuất Phát Triển Nhân Tài</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              HRBP có quyền xem <strong>Toàn bộ Giáo trình đã phát hành</strong> và gửi <strong>Đơn đề xuất phân bổ</strong> cho các ứng viên kế nhiệm/nhân sự vùng lên User Admin phê duyệt.
            </div>
          </div>
          <Button variant="primary" icon="ti-send" onClick={() => handleOpenNominate(null)}>
            Đề Xuất Gán Giáo Trình Mới
          </Button>
        </div>
      </div>

      {/* Filter Selector & Search */}
      <div
        className="card card-pad"
        style={{
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'MINE', label: 'Giáo Trình Của Bản Thân', icon: 'ti-user-check', count: mine.length },
            { id: 'PROPOSED', label: 'Giáo Trình Tôi Đã Đề Xuất', icon: 'ti-send', count: proposed.length },
            { id: 'ALL', label: 'Toàn Bộ Giáo Trình (Chỉ Xem & Đề Xuất)', icon: 'ti-books', count: publishedCurricula.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveFilter(tab.id);
                setSearch('');
              }}
              className="btn btn-sm"
              style={{
                background: activeFilter === tab.id ? 'var(--blue)' : 'var(--paper-raised)',
                color: activeFilter === tab.id ? '#fff' : 'var(--ink)',
                borderColor: activeFilter === tab.id ? 'var(--blue)' : 'var(--line-strong)',
                fontWeight: activeFilter === tab.id ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className={`ti ${tab.icon}`} />
              <span>{tab.label}</span>
              <span
                style={{
                  background: activeFilter === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--paper-sunken)',
                  color: activeFilter === tab.id ? '#fff' : 'var(--ink-soft)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  fontWeight: 700,
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 240, flexShrink: 0 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 9, color: 'var(--ink-faint)', fontSize: 13 }} />
          <input
            type="text"
            className="field-input"
            style={{ paddingLeft: 30, height: 32, fontSize: 12, width: '100%' }}
            placeholder="Tìm theo tên giáo trình, lĩnh vực..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Curricula Cards */}
      <div className="grid grid-3" style={{ gap: 14, marginBottom: 28 }}>
        {currentList.map((cur) => {
          if (activeFilter === 'MINE') {
            const prog = getCurriculumProgress(cur, currentUser, myEnrollments, courses);
            return (
              <div
                key={cur.id}
                className="card card-pad"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: 'var(--paper-raised)',
                  border: '1px solid var(--line)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink)' }}>{cur.title}</div>
                    <Badge tone={prog.status === 'COMPLETED' ? 'sage' : prog.status === 'IN_PROGRESS' ? 'amber' : 'rail'} size="sm">
                      {prog.status === 'COMPLETED' ? 'Đã Hoàn Thành' : prog.status === 'IN_PROGRESS' ? 'Đang Học' : 'Chưa Bắt Đầu'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, minHeight: 32, lineHeight: 1.4 }}>
                    {cur.description}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Badge tone="slate" size="sm">{cur.category || 'Chung'}</Badge>
                    <span>&middot;</span>
                    <span>{prog.totalCourses} khóa E-Learning</span>
                    {cur.assignedVia?.dueDate && (
                      <>
                        <span>&middot;</span>
                        <span style={{ color: 'var(--rust)', fontWeight: 600 }}>
                          <i className="ti ti-clock" /> Hạn: {cur.assignedVia.dueDate}
                        </span>
                      </>
                    )}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      <span>Tiến độ cá nhân:</span>
                      <strong>{prog.completedCourses}/{prog.totalCourses} khóa ({prog.progressPercent}%)</strong>
                    </div>
                    <ProgressBar value={prog.progressPercent} tone={prog.status === 'COMPLETED' ? 'sage' : 'blue'} size="sm" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                  <Button size="sm" variant="outline" icon="ti-sitemap" onClick={() => setViewingCurriculum(cur)}>
                    Xem Lộ Trình
                  </Button>
                </div>
              </div>
            );
          }

          if (activeFilter === 'PROPOSED') {
            const req = cur.proposalRequest;
            const asg = cur.proposalAssignment;
            const status = req ? req.status : 'APPROVED';
            const targetLabel = req?.targetLabel || asg?.targetLabel || 'Ứng viên';
            const dueDateText = req?.dueDate || asg?.dueDate || 'Không hạn';

            return (
              <div
                key={`${cur.id}-${req?.id || asg?.id}`}
                className="card card-pad"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: 'var(--paper-raised)',
                  border: '1px solid var(--line)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink)' }}>{cur.title}</div>
                    <Badge tone={status === 'APPROVED' ? 'sage' : status === 'REJECTED' ? 'rust' : 'amber'} size="sm">
                      {status === 'APPROVED' ? 'Đã Duyệt' : status === 'REJECTED' ? 'Bị Từ Chối' : 'Chờ Duyệt'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, minHeight: 32, lineHeight: 1.4 }}>
                    {cur.description}
                  </div>
                  <div style={{ fontSize: 11.5, background: 'var(--paper-sunken)', padding: '8px 10px', borderRadius: 6, marginBottom: 10 }}>
                    <div style={{ color: 'var(--ink)', fontWeight: 600, marginBottom: 2 }}>
                      <i className="ti ti-user" style={{ color: 'var(--blue)', marginRight: 4 }} />
                      Ứng viên: {targetLabel}
                    </div>
                    <div style={{ color: 'var(--ink-soft)', fontSize: 11 }}>
                      <span>Hạn chót: {dueDateText}</span>
                      {req?.requestDate && <span> &middot; Ngày gửi: {req.requestDate}</span>}
                    </div>
                    {req?.justification && (
                      <div style={{ color: 'var(--ink-soft)', fontSize: 11, fontStyle: 'italic', marginTop: 4, borderTop: '1px dashed var(--line)', paddingTop: 4 }}>
                        &ldquo;{req.justification}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                  <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setViewingCurriculum(cur)}>
                    Xem Chi Tiết
                  </Button>
                  <Button size="sm" variant="ghost" icon="ti-send" onClick={() => handleOpenNominate(cur)}>
                    Đề Xuất Thêm
                  </Button>
                </div>
              </div>
            );
          }

          // ALL published curricula
          return (
            <div
              key={cur.id}
              className="card card-pad"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'var(--paper-raised)',
                border: '1px solid var(--line)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink)' }}>{cur.title}</div>
                  <Badge tone="sage" size="sm">Published</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, minHeight: 32, lineHeight: 1.4 }}>
                  {cur.description}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Badge tone="slate" size="sm">{cur.category || 'Chung'}</Badge>
                  <span>&middot;</span>
                  <span>{(cur.courseIds || []).length} khóa E-Learning</span>
                  <span>&middot;</span>
                  <span>{(cur.assignments || []).length} đối tượng chính thức</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setViewingCurriculum(cur)}>
                  Xem Chi Tiết
                </Button>
                <Button size="sm" variant="primary" icon="ti-send" onClick={() => handleOpenNominate(cur)}>
                  Đề Xuất Cho Ứng Viên
                </Button>
              </div>
            </div>
          );
        })}

        {currentList.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '36px 16px' }}>
            <i className="ti ti-books" aria-hidden="true" style={{ fontSize: 32, color: 'var(--ink-faint)' }} />
            <p style={{ marginTop: 8, color: 'var(--ink-soft)', fontSize: 13 }}>
              {activeFilter === 'MINE'
                ? 'Bạn chưa được phân bổ giáo trình bắt buộc nào.'
                : activeFilter === 'PROPOSED'
                ? 'Bạn chưa gửi đề xuất giáo trình nào cho nhân viên / ứng viên.'
                : 'Không tìm thấy giáo trình nào phù hợp.'}
            </p>
          </div>
        )}
      </div>

      {/* PROPOSALS TRACKING PANEL */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)' }}>
              <i className="ti ti-clipboard-list" style={{ color: 'var(--blue)' }} />
              <span>Hàng Đợi Theo Dõi Đơn Đề Xuất Của Bạn ({proposalsList.length})</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
              Trạng thái phê duyệt từ User Admin cho các đề xuất gán giáo trình
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-sm ${proposalStatusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setProposalStatusFilter(st)}
                style={{ fontSize: 11.5 }}
              >
                {st === 'ALL' ? 'Tất Cả' : st === 'PENDING' ? 'Chờ Duyệt' : st === 'APPROVED' ? 'Đã Duyệt' : 'Bị Từ Chối'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 220 }}>Giáo Trình</th>
                <th>Ứng Viên / Đối Tượng</th>
                <th style={{ width: 110 }}>Ngày Gửi</th>
                <th style={{ width: 120 }}>Trạng Thái</th>
                <th>Thông Tin Phê Duyệt / Lý Do</th>
              </tr>
            </thead>
            <tbody>
              {proposalsList.map((req) => (
                <tr key={req.id}>
                  <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{req.curriculumTitle}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{req.targetLabel}</div>
                    {req.dueDate && <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Hạn: {req.dueDate}</div>}
                  </td>
                  <td style={{ color: 'var(--ink-soft)' }}>{req.requestDate}</td>
                  <td>
                    <Badge tone={req.status === 'APPROVED' ? 'sage' : req.status === 'REJECTED' ? 'rust' : 'amber'}>
                      {req.status === 'APPROVED' ? 'Đã Duyệt' : req.status === 'REJECTED' ? 'Từ Chối' : 'Chờ Duyệt'}
                    </Badge>
                  </td>
                  <td style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                    {req.status === 'APPROVED' && (
                      <span style={{ color: 'var(--sage)', fontWeight: 600 }}>
                        <i className="ti ti-check" /> Đã duyệt vào hệ thống ({req.decidedAt || req.requestDate})
                      </span>
                    )}
                    {req.status === 'REJECTED' && (
                      <span style={{ color: 'var(--rust)' }}>
                        <i className="ti ti-x" /> {req.decisionNote || 'User Admin đã từ chối đơn đề xuất.'}
                      </span>
                    )}
                    {req.status === 'PENDING' && (
                      <span style={{ color: 'var(--amber)' }}>
                        <i className="ti ti-clock" /> Đang chờ User Admin xem xét
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {proposalsList.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '18px 0', color: 'var(--ink-faint)' }}>
                    Không có đơn đề xuất nào trong danh mục này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NOMINATE MODAL */}
      <Modal
        isOpen={nominateModal.open}
        title="Đề Xuất Gán Giáo Trình Cho Nhân Viên"
        subtitle="Gửi đơn đề xuất lên User Admin để phân bổ giáo trình chính thức cho ứng viên nhân tài."
        onClose={handleCloseNominate}
        size="md"
      >
        <form onSubmit={handleSubmitNominate}>
          <div style={{ marginBottom: 12 }}>
            <label className="field-label">Chọn Giáo Trình</label>
            <select
              className="field-select"
              style={{ width: '100%', height: 36, fontSize: 12.5 }}
              value={selectedCurriculumId}
              onChange={(e) => setSelectedCurriculumId(e.target.value)}
              required
            >
              {publishedCurricula.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.category || 'Chung'} · {(c.courseIds || []).length} khóa)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="field-label">Nguồn Đối Tượng / Ứng Viên</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="candidateSrc"
                  checked={candidateSource === 'SUCCESSION'}
                  onChange={() => {
                    setCandidateSource('SUCCESSION');
                    setSelectedTalentId(successionTalents[0]?.id || '');
                  }}
                />
                Ứng viên Quy hoạch Kế nhiệm ({successionTalents.length})
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="candidateSrc"
                  checked={candidateSource === 'CUSTOM_GROUP'}
                  onChange={() => {
                    setCandidateSource('CUSTOM_GROUP');
                    setSelectedTalentId(customGroups[0]?.id || '');
                  }}
                />
                👥 Nhóm Tùy Chỉnh ({customGroups.length} nhóm)
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="candidateSrc"
                  checked={candidateSource === 'ALL_USERS'}
                  onChange={() => {
                    setCandidateSource('ALL_USERS');
                    setSelectedTalentId(allUserOptions[0]?.id || '');
                  }}
                />
                Từng Nhân sự Cá nhân
              </label>
            </div>

            {candidateSource === 'SUCCESSION' ? (
              <select
                className="field-select"
                style={{ width: '100%', height: 36, fontSize: 12.5 }}
                value={selectedTalentId}
                onChange={(e) => setSelectedTalentId(e.target.value)}
                required
              >
                {successionTalents.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.currentRole} ({t.store}) &rarr; {t.targetRole}
                  </option>
                ))}
              </select>
            ) : candidateSource === 'CUSTOM_GROUP' ? (
              <select
                className="field-select"
                style={{ width: '100%', height: 36, fontSize: 12.5 }}
                value={selectedTalentId}
                onChange={(e) => setSelectedTalentId(e.target.value)}
                required
              >
                {customGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    👥 {g.title || g.name} ({g.memberCount || g.memberUserIds?.length || 0} thành viên · {g.code})
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="field-select"
                style={{ width: '100%', height: 36, fontSize: 12.5 }}
                value={selectedTalentId}
                onChange={(e) => setSelectedTalentId(e.target.value)}
                required
              >
                {allUserOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="field-label">Hạn Chót Hoàn Thành (Due Date)</label>
            <input
              type="date"
              className="field-input"
              style={{ width: '100%', height: 36, fontSize: 12.5 }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="field-label">Lý do &amp; Thuyết minh Đề xuất (Gửi User Admin)</label>
            <textarea
              className="field-input"
              rows={3}
              style={{ resize: 'vertical', fontSize: 12.5 }}
              placeholder="Thuyết minh nhu cầu phát triển năng lực định biên của ứng viên..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" onClick={handleCloseNominate}>
              Hủy
            </Button>
            <Button variant="primary" icon="ti-send" type="submit">
              Gửi Đơn Đề Xuất
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEWING CURRICULUM DETAIL MODAL */}
      {viewingCurriculum && (
        <Modal
          isOpen
          title={viewingCurriculum.title}
          subtitle={`${viewingCurriculum.category || 'General'} · ${(viewingCurriculum.courseIds || []).length} khóa học E-Learning`}
          onClose={() => setViewingCurriculum(null)}
          size="lg"
          footer={(
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Badge tone="sage">Published</Badge>
              <Button variant="ghost" onClick={() => setViewingCurriculum(null)}>
                Đóng
              </Button>
            </div>
          )}
        >
          <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            {viewingCurriculum.description}
          </div>
          <CurriculumTree curriculum={viewingCurriculum} courses={courses} />
        </Modal>
      )}
    </div>
  );
}
