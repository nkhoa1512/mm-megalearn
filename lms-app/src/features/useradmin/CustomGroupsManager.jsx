import React, { useState, useMemo } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, Modal, JobLevelBadge } from '../common/ui';
import { ROLE_DEFINITIONS, roleDefinition, normalizeRole } from '../../data/roles';
import { normalizeLevel } from '../../data/levelSystem';
import { resolveGroupMembers } from '../../data/customGroupsData';

const COLOR_OPTIONS = [
  { label: 'Xanh Dương', value: '#0EA5E9' },
  { label: 'Tím Indigo', value: '#6366F1' },
  { label: 'Xanh Lá', value: '#10B981' },
  { label: 'Cam Hổ Phách', value: '#F59E0B' },
  { label: 'Tím Đậm', value: '#8B5CF6' },
  { label: 'Hồng Hồng', value: '#EC4899' },
  { label: 'Đỏ Ruby', value: '#EF4444' },
  { label: 'Xanh Lam Cyan', value: '#06B6D4' },
];

const CATEGORY_OPTIONS = [
  { id: 'SPECIAL_COHORT', label: 'Nhóm Đặc Thù / Chuyên Biệt' },
  { id: 'DEMOGRAPHIC', label: 'Nhân Khẩu / Quốc Tịch' },
  { id: 'STRATEGIC_INITIATIVE', label: 'Dự Án & Sáng Kiến Chiến Lược' },
  { id: 'ONBOARDING', label: 'Hội Nhập & Nhân Sự Mới' },
  { id: 'LEADERSHIP', label: 'Cán Bộ Quản Lý & Lãnh Đạo' },
  { id: 'TALENT_POOL', label: 'Nhân Tài Kế Cận & Fast-Track' },
  { id: 'OPERATIONS', label: 'Vận Hành & Chuỗi Cung Ứng' },
  { id: 'CUSTOMER_SERVICE', label: 'Dịch Vụ Khách Hàng & Thu Ngân' },
  { id: 'SAFETY_COMPLIANCE', label: 'An Toàn, PCCC & Tuân Thủ' },
  { id: 'CULTURE_ENGAGEMENT', label: 'Văn Hóa & Gắn Kết Nhân Viên' },
  { id: 'QUALITY_ASSURANCE', label: 'Kiểm Định & Đảm Bảo Chất Lượng' },
];

export default function CustomGroupsManager() {
  const {
    customGroups = [],
    addCustomGroup,
    updateCustomGroup,
    deleteCustomGroup,
    duplicateCustomGroup,
    users = [],
    divisions = [],
    departments = [],
    subDepartments = [],
    businessUnits = [],
    jobLevels = [],
    language,
  } = useCourseStore();

  // Search & Filter
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, DYNAMIC, MANUAL, FILE_IMPORT

  // View Members Modal
  const [viewMembersGroup, setViewMembersGroup] = useState(null);
  const [memberViewSearch, setMemberViewSearch] = useState('');

  // Create / Edit Modal State
  const [groupModal, setGroupModal] = useState({ isOpen: false, mode: 'ADD', data: null });
  const [formTab, setFormTab] = useState('DYNAMIC'); // 'DYNAMIC' | 'MANUAL' | 'FILE_IMPORT'
  const [form, setForm] = useState({
    title: '',
    code: '',
    description: '',
    type: 'DYNAMIC',
    category: 'SPECIAL_COHORT',
    badgeColor: '#0EA5E9',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: 'ALL',
      departmentId: 'ALL',
      subDepartmentId: 'ALL',
      level: 'ALL',
      role: 'ALL',
    },
    memberUserIds: [],
  });

  // Manual Tab Search & Selection
  const [manualSearch, setManualSearch] = useState('');

  // File Import Tab
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState([]);
  const [importFeedback, setImportFeedback] = useState(null);

  // Delete Confirm
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, group: null });

  // Stats calculation
  const totalGroups = customGroups.length;
  const dynamicGroups = customGroups.filter((g) => g.type === 'DYNAMIC').length;
  const manualGroups = customGroups.filter((g) => g.type === 'MANUAL').length;
  const fileGroups = customGroups.filter((g) => g.type === 'FILE_IMPORT').length;

  const totalAssignedHeadcount = useMemo(() => {
    const uniqueUserIds = new Set();
    customGroups.forEach((g) => {
      const members = resolveGroupMembers(g, users);
      members.forEach((m) => uniqueUserIds.add(m.userId));
    });
    return uniqueUserIds.size;
  }, [customGroups, users]);

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return customGroups.filter((g) => {
      const matchType = typeFilter === 'ALL' || g.type === typeFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !search.trim() ||
        (g.title && g.title.toLowerCase().includes(q)) ||
        (g.code && g.code.toLowerCase().includes(q)) ||
        (g.description && g.description.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [customGroups, typeFilter, search]);

  // Members resolved for the currently viewed group
  const currentGroupMembers = useMemo(() => {
    if (!viewMembersGroup) return [];
    return resolveGroupMembers(viewMembersGroup, users);
  }, [viewMembersGroup, users]);

  const filteredGroupMembers = useMemo(() => {
    if (!memberViewSearch.trim()) return currentGroupMembers;
    const q = memberViewSearch.toLowerCase();
    return currentGroupMembers.filter(
      (m) =>
        (m.fullName && m.fullName.toLowerCase().includes(q)) ||
        (m.employeeCode && m.employeeCode.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.departmentName && m.departmentName.toLowerCase().includes(q)) ||
        (m.title && m.title.toLowerCase().includes(q))
    );
  }, [currentGroupMembers, memberViewSearch]);

  // Live Dynamic Members Calculation for Modal
  const liveDynamicMembers = useMemo(() => {
    if (formTab !== 'DYNAMIC') return [];
    const tempGroup = {
      type: 'DYNAMIC',
      criteria: form.criteria,
      memberUserIds: [],
    };
    return resolveGroupMembers(tempGroup, users);
  }, [formTab, form.criteria, users]);

  // Filtered list for Manual Picker Tab
  const manualAvailableUsers = useMemo(() => {
    return users.filter((u) => {
      if (!manualSearch.trim()) return true;
      const q = manualSearch.toLowerCase().trim();
      return (
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.employeeCode && u.employeeCode.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.departmentName && u.departmentName.toLowerCase().includes(q)) ||
        (u.departmentCode && u.departmentCode.toLowerCase().includes(q)) ||
        (u.subDepartmentName && u.subDepartmentName.toLowerCase().includes(q)) ||
        (u.subDepartmentCode && u.subDepartmentCode.toLowerCase().includes(q)) ||
        (u.position && u.position.toLowerCase().includes(q)) ||
        (u.title && u.title.toLowerCase().includes(q)) ||
        (u.level && `level ${u.level}`.includes(q))
      );
    });
  }, [users, manualSearch]);

  // Open Create Modal
  function handleOpenAdd() {
    setForm({
      title: '',
      code: `GRP-${Date.now().toString().slice(-4)}`,
      description: '',
      type: 'DYNAMIC',
      category: 'SPECIAL_COHORT',
      badgeColor: '#0EA5E9',
      criteria: {
        businessUnitId: 'bu-mmvn',
        divisionId: 'ALL',
        departmentId: 'ALL',
        subDepartmentId: 'ALL',
        level: 'ALL',
        role: 'ALL',
      },
      memberUserIds: [],
    });
    setFormTab('DYNAMIC');
    setImportText('');
    setImportPreview([]);
    setImportFeedback(null);
    setGroupModal({ isOpen: true, mode: 'ADD', data: null });
  }

  // Open Edit Modal
  function handleOpenEdit(grp) {
    setForm({
      title: grp.title || grp.name || '',
      code: grp.code || '',
      description: grp.description || '',
      type: grp.type || 'DYNAMIC',
      category: grp.category || 'SPECIAL_COHORT',
      badgeColor: grp.badgeColor || '#0EA5E9',
      criteria: grp.criteria || {
        businessUnitId: 'bu-mmvn',
        divisionId: 'ALL',
        departmentId: 'ALL',
        subDepartmentId: 'ALL',
        level: 'ALL',
        role: 'ALL',
      },
      memberUserIds: grp.memberUserIds || [],
    });
    setFormTab(grp.type || 'DYNAMIC');
    setImportText('');
    setImportPreview([]);
    setImportFeedback(null);
    setGroupModal({ isOpen: true, mode: 'EDIT', data: grp });
  }

  // Submit Save Group
  function handleSaveSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;

    let finalMemberIds = form.memberUserIds;
    if (formTab === 'DYNAMIC') {
      finalMemberIds = liveDynamicMembers.map((u) => u.userId);
    } else if (formTab === 'FILE_IMPORT') {
      finalMemberIds = importPreview.map((u) => u.userId);
    }

    const payload = {
      ...form,
      type: formTab,
      memberUserIds: finalMemberIds,
      memberCount: finalMemberIds.length,
    };

    if (groupModal.mode === 'ADD') {
      addCustomGroup(payload);
    } else if (groupModal.data) {
      updateCustomGroup(groupModal.data.id, payload);
    }

    setGroupModal({ isOpen: false, mode: 'ADD', data: null });
  }

  // Toggle selection in manual picker
  function toggleManualUser(userId) {
    setForm((prev) => {
      const exists = prev.memberUserIds.includes(userId);
      const nextIds = exists
        ? prev.memberUserIds.filter((id) => id !== userId)
        : [...prev.memberUserIds, userId];
      return { ...prev, memberUserIds: nextIds };
    });
  }

  function selectAllManual() {
    const visibleIds = manualAvailableUsers.map((u) => u.userId);
    setForm((prev) => {
      const combined = Array.from(new Set([...prev.memberUserIds, ...visibleIds]));
      return { ...prev, memberUserIds: combined };
    });
  }

  function deselectAllManual() {
    const visibleSet = new Set(manualAvailableUsers.map((u) => u.userId));
    setForm((prev) => ({
      ...prev,
      memberUserIds: prev.memberUserIds.filter((id) => !visibleSet.has(id)),
    }));
  }

  // Parse bulk text / CSV
  function parseImportLines(raw) {
    if (!raw.trim()) {
      setImportPreview([]);
      setImportFeedback(null);
      return;
    }
    const tokens = raw
      .split(/[\r\n,;\t]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const matchedUsers = [];
    const unmatchedTokens = [];

    tokens.forEach((tok) => {
      const u = users.find(
        (user) =>
          user.employeeCode?.toLowerCase() === tok ||
          user.userId?.toLowerCase() === tok ||
          user.email?.toLowerCase() === tok ||
          user.fullName?.toLowerCase() === tok
      );
      if (u && !matchedUsers.some((x) => x.userId === u.userId)) {
        matchedUsers.push(u);
      } else if (!u) {
        unmatchedTokens.push(tok);
      }
    });

    setImportPreview(matchedUsers);
    setImportFeedback({
      total: tokens.length,
      matched: matchedUsers.length,
      unmatched: unmatchedTokens.length,
      unmatchedList: unmatchedTokens.slice(0, 5),
    });
  }

  // Download Sample Template CSV
  function handleDownloadTemplate() {
    const sampleHeaders = 'EmployeeCode,FullName,Email,Department\nMMVN-1001,Nguyen Van A,nguyen.a@mmvietnam.com,Fresh Food\nMMVN-1002,Tran Thi B,tran.b@mmvietnam.com,Operations\nMMVN-1042,Minh Tran,minh.tran@mmvietnam.com,Bakery';
    const blob = new Blob([sampleHeaders], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'MMVN_CustomGroup_Members_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      setImportText(text);
      parseImportLines(text);
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. STATS OVERVIEW CARDS */}
      <div className="grid grid-4" style={{ gap: 12 }}>
        <div className="card card-pad" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600 }}>Tổng Số Nhóm Tùy Chỉnh</span>
            <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '4px 8px', borderRadius: 8, fontSize: 13 }}>
              <i className="ti ti-users-group" />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{totalGroups}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 4 }}>Nhóm quản trị đối tượng học tập</div>
        </div>

        <div className="card card-pad" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600 }}>Tổng Nhân Sự Thuộc Nhóm</span>
            <span style={{ background: '#F0FDF4', color: '#15803D', padding: '4px 8px', borderRadius: 8, fontSize: 13 }}>
              <i className="ti ti-user-check" />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#15803D' }}>{totalAssignedHeadcount}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>Đã phân vào các nhóm mục tiêu</div>
        </div>

        <div className="card card-pad" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600 }}>Nhóm Theo Cơ Cấu (Dynamic)</span>
            <span style={{ background: '#FAF5FF', color: '#7E22CE', padding: '4px 8px', borderRadius: 8, fontSize: 13 }}>
              <i className="ti ti-binary-tree" />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#7E22CE' }}>{dynamicGroups}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 4 }}>Tự động cập nhật theo sơ đồ</div>
        </div>

        <div className="card card-pad" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600 }}>Thủ Công &amp; Import File</span>
            <span style={{ background: '#FFFBEB', color: '#B45309', padding: '4px 8px', borderRadius: 8, fontSize: 13 }}>
              <i className="ti ti-file-spreadsheet" />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#B45309' }}>{manualGroups + fileGroups}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 4 }}>Nhóm đặc biệt theo danh sách</div>
        </div>
      </div>

      {/* 2. SEARCH & ACTION TOOLBAR */}
      <div
        className="card card-pad"
        style={{
          background: '#fff',
          border: '1px solid var(--line)',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
            <i
              className="ti ti-search"
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-faint)',
                fontSize: 14,
              }}
            />
            <input
              type="text"
              className="field-input"
              placeholder="Tìm kiếm nhóm theo Tên, Mã ID, Mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 13 }}
            />
          </div>

          <select
            className="field-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: 220, fontSize: 13 }}
          >
            <option value="ALL">-- Tất cả loại nhóm --</option>
            <option value="DYNAMIC">🏢 Nhóm Theo Cơ Cấu (Dynamic)</option>
            <option value="MANUAL">👤 Nhóm Chọn Thủ Công (Manual)</option>
            <option value="FILE_IMPORT">📄 Nhóm Import Từ File (Template)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" icon="ti-download" onClick={handleDownloadTemplate}>
            Tải File Mẫu (CSV)
          </Button>
          <Button variant="primary" size="sm" icon="ti-plus" onClick={handleOpenAdd}>
            + Tạo Nhóm Mới
          </Button>
        </div>
      </div>

      {/* 3. GROUPS TABLE */}
      <div className="card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>TÊN NHÓM &amp; MÔ TẢ</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, width: 140 }}>MÃ ID</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, width: 180 }}>HÌNH THỨC</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, width: 150 }}>THÀNH VIÊN</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, width: 170 }}>CẬP NHẬT (LAST PROCESSED)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, width: 150 }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-faint)' }}>
                    <i className="ti ti-folder-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                    Không tìm thấy nhóm người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((grp) => {
                  const members = resolveGroupMembers(grp, users);
                  const memberCount = grp.memberCount !== undefined ? grp.memberCount : members.length;
                  const tagColor = grp.badgeColor || '#0EA5E9';

                  return (
                    <tr
                      key={grp.id}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        fontSize: 13,
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Title & Description */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: tagColor,
                              marginTop: 5,
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13.5, marginBottom: 2 }}>
                              {grp.title || grp.name}
                            </div>
                            {grp.description && (
                              <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                                {grp.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code / ID */}
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11.5,
                            background: '#F1F5F9',
                            color: '#334155',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontWeight: 600,
                          }}
                        >
                          {grp.code || grp.id}
                        </span>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '12px 14px' }}>
                        {grp.type === 'DYNAMIC' ? (
                          <Badge tone="purple" icon="ti-binary-tree">Theo Cơ Cấu</Badge>
                        ) : grp.type === 'FILE_IMPORT' ? (
                          <Badge tone="amber" icon="ti-file-spreadsheet">Import File</Badge>
                        ) : (
                          <Badge tone="blue" icon="ti-user-check">Thủ Công</Badge>
                        )}
                      </td>

                      {/* Member Count & View Button */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setViewMembersGroup(grp)}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: 20,
                            padding: '3px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#1E40AF',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                          title="Bấm để xem danh sách thành viên chi tiết"
                        >
                          <i className="ti ti-users" style={{ fontSize: 13 }} />
                          <span>{memberCount} học viên</span>
                        </button>
                      </td>

                      {/* Last Processed */}
                      <td style={{ padding: '12px 14px', color: 'var(--ink-soft)', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="ti ti-clock" style={{ color: 'var(--ink-faint)' }} />
                          <span>{grp.lastProcessed || '10:05 AM 8/29/2026'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="ti-users"
                            onClick={() => setViewMembersGroup(grp)}
                            title="Xem danh sách thành viên"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="ti-edit"
                            onClick={() => handleOpenEdit(grp)}
                            title="Chỉnh sửa nhóm"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="ti-copy"
                            onClick={() => duplicateCustomGroup(grp.id)}
                            title="Nhân bản nhóm"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="ti-trash"
                            onClick={() => setDeleteConfirm({ isOpen: true, group: grp })}
                            style={{ color: '#E11D48' }}
                            title="Xóa nhóm"
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
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: VIEW GROUP MEMBERS */}
      {/* ========================================================================= */}
      {viewMembersGroup && (
        <Modal
          isOpen={Boolean(viewMembersGroup)}
          onClose={() => {
            setViewMembersGroup(null);
            setMemberViewSearch('');
          }}
          title={`👥 Danh Sách Thành Viên: ${viewMembersGroup.title || viewMembersGroup.name}`}
          maxWidth={850}
        >
          <div>
            <div style={{ marginBottom: 14, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{viewMembersGroup.title} ({viewMembersGroup.code})</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{viewMembersGroup.description || 'Không có mô tả.'}</div>
              </div>
              <Badge tone="blue">{filteredGroupMembers.length} thành viên</Badge>
            </div>

            <div style={{ marginBottom: 12, position: 'relative' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 14 }} />
              <input
                type="text"
                className="field-input"
                placeholder="Tìm kiếm thành viên theo tên, mã NV, email, phòng ban..."
                value={memberViewSearch}
                onChange={(e) => setMemberViewSearch(e.target.value)}
                style={{ paddingLeft: 32, fontSize: 13 }}
              />
            </div>

            <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>HỌ VÀ TÊN</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', width: 120 }}>MÃ NHÂN VIÊN</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>PHÒNG BAN / BỘ PHẬN</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 100 }}>CẤP BẬC</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 110 }}>ROLE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroupMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
                        Không có nhân sự nào trong nhóm khớp với từ khóa tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredGroupMembers.map((m) => (
                      <tr key={m.userId || m.employeeCode} style={{ borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{m.fullName}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{m.email}</div>
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{m.employeeCode || m.userId}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--ink-soft)' }}>
                          <div>{m.departmentName || m.department || m.divisionName || 'MMVN'}</div>
                          {m.subDepartmentName && <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>🌿 {m.subDepartmentName}</div>}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <JobLevelBadge level={m.level} />
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <Badge tone="neutral" size="sm">{roleDefinition(m.role).shortVi}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outline" type="button" onClick={() => setViewMembersGroup(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: CREATE / EDIT CUSTOM GROUP */}
      {/* ========================================================================= */}
      {groupModal.isOpen && (
        <Modal
          isOpen={groupModal.isOpen}
          onClose={() => setGroupModal({ isOpen: false, mode: 'ADD', data: null })}
          title={groupModal.mode === 'ADD' ? '✨ Tạo Nhóm Người Dùng Mới' : '✏️ Chỉnh Sửa Nhóm Người Dùng'}
          maxWidth={800}
        >
          <form onSubmit={handleSaveSubmit}>
            {/* Basic Info */}
            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Tên Nhóm Đối Tượng *</label>
                <input
                  className="field-input"
                  placeholder="Ví dụ: ALL_EXPAT, Nhân viên mới..."
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="field-label">Mã Định Danh (Group Code / ID) *</label>
                <input
                  className="field-input"
                  placeholder="Ví dụ: GRP-EXPAT, GRP-NEW-2026..."
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Phân Loại Nhóm (Category)</label>
                <select
                  className="field-select"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Màu Sắc Nhận Diện Tag</label>
                <select
                  className="field-select"
                  value={form.badgeColor}
                  onChange={(e) => setForm((p) => ({ ...p, badgeColor: e.target.value }))}
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Mô Tả Mục Đích Nhóm</label>
              <textarea
                className="field-input"
                rows={2}
                placeholder="Mô tả chi tiết mục tiêu của nhóm hoặc đối tượng nhân sự..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Method Tabs */}
            <div style={{ marginBottom: 14 }}>
              <label className="field-label" style={{ marginBottom: 6 }}>Phương Thức Xác Định Thành Viên</label>
              <div style={{ display: 'flex', gap: 6, background: '#F1F5F9', padding: 4, borderRadius: 8 }}>
                <button
                  type="button"
                  onClick={() => setFormTab('DYNAMIC')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: formTab === 'DYNAMIC' ? '#fff' : 'transparent',
                    color: formTab === 'DYNAMIC' ? 'var(--blue)' : 'var(--ink-soft)',
                    fontWeight: formTab === 'DYNAMIC' ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: formTab === 'DYNAMIC' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <i className="ti ti-binary-tree" /> 🏢 Theo Cơ Cấu Tổ Chức
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('MANUAL')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: formTab === 'MANUAL' ? '#fff' : 'transparent',
                    color: formTab === 'MANUAL' ? 'var(--blue)' : 'var(--ink-soft)',
                    fontWeight: formTab === 'MANUAL' ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: formTab === 'MANUAL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <i className="ti ti-user-check" /> 👤 Chọn Thủ Công
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('FILE_IMPORT')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: formTab === 'FILE_IMPORT' ? '#fff' : 'transparent',
                    color: formTab === 'FILE_IMPORT' ? 'var(--blue)' : 'var(--ink-soft)',
                    fontWeight: formTab === 'FILE_IMPORT' ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: formTab === 'FILE_IMPORT' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <i className="ti ti-file-spreadsheet" /> 📄 Import File / Dán Mã
                </button>
              </div>
            </div>

            {/* TAB 1: DYNAMIC CRITERIA */}
            {formTab === 'DYNAMIC' && (
              <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--line)', marginBottom: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Cấu Hình Tiêu Chí Lọc Tự Động (Org Hierarchy Criteria):
                </div>

                <div className="grid grid-2" style={{ gap: 10, marginBottom: 10 }}>
                  <div>
                    <label className="field-label" style={{ fontSize: 11.5 }}>Khối (Division)</label>
                    <select
                      className="field-select"
                      style={{ fontSize: 12 }}
                      value={form.criteria?.divisionId || 'ALL'}
                      onChange={(e) => {
                        const divId = e.target.value;
                        setForm((p) => ({
                          ...p,
                          criteria: {
                            ...p.criteria,
                            divisionId: divId,
                            departmentId: 'ALL',
                            subDepartmentId: 'ALL',
                          },
                        }));
                      }}
                    >
                      <option value="ALL">-- Tất cả các Khối --</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label" style={{ fontSize: 11.5 }}>Phòng Ban (Department)</label>
                    <select
                      className="field-select"
                      style={{ fontSize: 12 }}
                      value={form.criteria?.departmentId || 'ALL'}
                      onChange={(e) => {
                        const deptId = e.target.value;
                        setForm((p) => ({
                          ...p,
                          criteria: {
                            ...p.criteria,
                            departmentId: deptId,
                            subDepartmentId: 'ALL',
                          },
                        }));
                      }}
                    >
                      <option value="ALL">-- Tất cả Phòng Ban --</option>
                      {departments
                        .filter((dept) => !form.criteria?.divisionId || form.criteria.divisionId === 'ALL' || dept.divisionId === form.criteria.divisionId)
                        .map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.code} — {dept.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-3" style={{ gap: 10, marginBottom: 12 }}>
                  <div>
                    <label className="field-label" style={{ fontSize: 11.5 }}>Bộ Phận Trực Thuộc</label>
                    <select
                      className="field-select"
                      style={{ fontSize: 12 }}
                      value={form.criteria?.subDepartmentId || 'ALL'}
                      onChange={(e) => setForm((p) => ({ ...p, criteria: { ...p.criteria, subDepartmentId: e.target.value } }))}
                    >
                      <option value="ALL">-- Tất cả Bộ Phận --</option>
                      {subDepartments
                        .filter((s) => !form.criteria?.departmentId || form.criteria.departmentId === 'ALL' || s.departmentId === form.criteria.departmentId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>🌿 {s.name}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label" style={{ fontSize: 11.5 }}>Cấp Bậc (Level)</label>
                    <select
                      className="field-select"
                      style={{ fontSize: 12 }}
                      value={form.criteria?.level || 'ALL'}
                      onChange={(e) => setForm((p) => ({ ...p, criteria: { ...p.criteria, level: e.target.value } }))}
                    >
                      <option value="ALL">-- Mọi cấp bậc (1-7) --</option>
                      {jobLevels.map((lvl) => (
                        <option key={lvl.level} value={lvl.level}>Level {lvl.level} - {lvl.viTitle || lvl.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label" style={{ fontSize: 11.5 }}>Vai Trò (Role)</label>
                    <select
                      className="field-select"
                      style={{ fontSize: 12 }}
                      value={form.criteria?.role || 'ALL'}
                      onChange={(e) => setForm((p) => ({ ...p, criteria: { ...p.criteria, role: e.target.value } }))}
                    >
                      <option value="ALL">-- Mọi vai trò --</option>
                      {ROLE_DEFINITIONS.map((r) => (
                        <option key={r.id} value={r.id}>{r.labelVi}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Match Preview */}
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: '#1E40AF' }}>
                    <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
                    Hệ thống đã quét và khớp: <strong>{liveDynamicMembers.length} nhân sự</strong>
                  </div>
                  <span style={{ fontSize: 11.5, color: '#1E40AF', fontStyle: 'italic' }}>
                    Tự động cập nhật khi có nhân sự mới phù hợp
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: MANUAL PICKER */}
            {formTab === 'MANUAL' && (
              <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--line)', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
                    Chọn Từng Nhân Sự Vào Nhóm (Đã chọn: {form.memberUserIds.length})
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button type="button" size="sm" variant="outline" onClick={selectAllManual}>Chọn tất cả lọc</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={deselectAllManual}>Bỏ chọn</Button>
                  </div>
                </div>

                <div style={{ marginBottom: 8, position: 'relative' }}>
                  <i
                    className="ti ti-search"
                    style={{
                      position: 'absolute',
                      left: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--ink-faint)',
                      fontSize: 13,
                    }}
                  />
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Tìm kiếm nhân sự theo Tên, Mã NV, Email, Phòng ban, Chức danh..."
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    style={{ fontSize: 12, paddingLeft: 30, width: '100%', height: 34 }}
                  />
                </div>

                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, background: '#fff' }}>
                  {manualAvailableUsers.map((u) => {
                    const isChecked = form.memberUserIds.includes(u.userId);
                    return (
                      <label
                        key={u.userId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 10px',
                          borderBottom: '1px solid var(--line-soft)',
                          cursor: 'pointer',
                          background: isChecked ? '#EFF6FF' : 'transparent',
                          fontSize: 12,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleManualUser(u.userId)}
                        />
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: isChecked ? 700 : 500, color: 'var(--ink)' }}>
                            {u.fullName} ({u.employeeCode || u.userId})
                          </span>
                          <span style={{ color: 'var(--ink-soft)', fontSize: 11 }}>
                            {u.departmentName || u.department || 'MMVN'} &middot; Lvl {u.level}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: FILE IMPORT */}
            {formTab === 'FILE_IMPORT' && (
              <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--line)', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
                    Nhập Danh Sách Thành Viên (Template / Dán Mã):
                  </div>
                  <Button type="button" size="sm" variant="outline" icon="ti-download" onClick={handleDownloadTemplate}>
                    Tải File Mẫu (CSV)
                  </Button>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <input type="file" accept=".csv,.xlsx,.txt" onChange={handleFileUpload} style={{ fontSize: 12 }} />
                </div>

                <textarea
                  className="field-input"
                  rows={4}
                  placeholder="Hoặc dán danh sách Mã nhân viên / Email / UserID vào đây (mỗi mã 1 dòng hoặc cách nhau bởi dấu phẩy)..."
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    parseImportLines(e.target.value);
                  }}
                  style={{ fontSize: 12, fontFamily: 'monospace' }}
                />

                {importFeedback && (
                  <div style={{ marginTop: 8, fontSize: 12, padding: '6px 10px', borderRadius: 6, background: importFeedback.matched > 0 ? '#F0FDF4' : '#FEF2F2', color: importFeedback.matched > 0 ? '#15803D' : '#B91C1C' }}>
                    <i className="ti ti-check" style={{ marginRight: 4 }} />
                    Khớp thành công: <strong>{importFeedback.matched}</strong> nhân sự (trong tổng số {importFeedback.total} dòng).
                    {importFeedback.unmatched > 0 && (
                      <span style={{ color: '#B91C1C', marginLeft: 8 }}>
                        ({importFeedback.unmatched} mã không tìm thấy trong hệ thống)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <Button type="button" variant="outline" onClick={() => setGroupModal({ isOpen: false, mode: 'ADD', data: null })}>
                Hủy Bỏ
              </Button>
              <Button type="submit" variant="primary">
                {groupModal.mode === 'ADD' ? 'Tạo Nhóm' : 'Lưu Thay Đổi'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: DELETE GROUP CONFIRM */}
      {/* ========================================================================= */}
      {deleteConfirm.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div className="card card-pad" style={{ background: '#fff', borderRadius: 12, maxWidth: 440, width: '90%' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
              Xác Nhận Xóa Nhóm
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa nhóm <strong>"{deleteConfirm.group?.title || deleteConfirm.group?.name}"</strong>?
              Các giáo trình hoặc khóa học đã gán cho nhóm này trước đó sẽ không bị ảnh hưởng.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" type="button" onClick={() => setDeleteConfirm({ isOpen: false, group: null })}>
                Hủy Bỏ
              </Button>
              <Button
                variant="primary"
                type="button"
                style={{ background: '#E11D48', borderColor: '#E11D48' }}
                onClick={() => {
                  if (deleteConfirm.group) {
                    deleteCustomGroup(deleteConfirm.group.id);
                  }
                  setDeleteConfirm({ isOpen: false, group: null });
                }}
              >
                Xác Nhận Xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
