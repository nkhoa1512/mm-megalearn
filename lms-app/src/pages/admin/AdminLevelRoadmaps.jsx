import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { normalizeRole, hasCapability } from '../../data/roles';
import { LEVEL_DEFINITIONS, levelShortLabel } from '../../data/levelSystem';
import { divisions, departments, subDepartments } from '../../data/orgHierarchy';
import {
  SCOPE_BUSINESS_UNITS,
  buildScopeKey,
  parseScopeKey,
  branchForBuId,
  getRoadmapForScope,
  listRealOrgPositions,
} from '../../data/roadmapScopeMatrix';
import { Button, Modal, Badge } from '../../features/common/ui';
import VisualRoadmapTimeline from '../../features/roadmaps/VisualRoadmapTimeline';
import { getCourseImage, COURSE_IMAGE_PRESETS } from '../../data/courseImages';
import CourseImagePickerStudio from '../../features/common/CourseImagePickerStudio';

function labelForDivision(id) {
  return divisions.find((d) => d.id === id)?.name || id;
}
function labelForDepartment(id) {
  return departments.find((d) => d.id === id)?.name || id;
}
function labelForSubDepartment(id) {
  return subDepartments.find((d) => d.id === id)?.name || id;
}

/** Nhãn phân tầng dễ đọc cho 1 Scope Key, vd. "Khối Vận Hành Siêu Thị › Merchandise Division › Processed Fresh Food › Level 7". */
function scopeBreadcrumb(scopeKey) {
  const { buId, divisionId, departmentId, subDepartmentId, level } = parseScopeKey(scopeKey);
  const bu = SCOPE_BUSINESS_UNITS.find((b) => b.id === buId);
  const parts = [bu?.name || buId];
  if (divisionId) parts.push(labelForDivision(divisionId));
  if (departmentId) parts.push(labelForDepartment(departmentId));
  if (subDepartmentId) parts.push(labelForSubDepartment(subDepartmentId));
  parts.push('Level ' + level);
  return parts.join(' › ');
}

function positionLabel(row) {
  const bu = SCOPE_BUSINESS_UNITS.find((b) => b.id === row.buId);
  const parts = [bu?.name || row.buId];
  if (row.divisionId) parts.push(labelForDivision(row.divisionId));
  if (row.departmentId) parts.push(labelForDepartment(row.departmentId));
  if (row.subDepartmentId) parts.push(labelForSubDepartment(row.subDepartmentId));
  return parts.join(' › ');
}

const ROADMAP_GROUP_BY_OPTIONS = [
  { id: 'DIVISION', label: 'Theo Division (Phòng/Ban)' },
  { id: 'DEPARTMENT', label: 'Theo Department (Bộ Phận)' },
  { id: 'LEVEL', label: 'Theo Cấp Bậc (Level)' },
  { id: 'STATUS', label: 'Theo Trạng Thái Lộ Trình' },
  { id: 'NONE', label: 'Không gộp nhóm' },
];

/** Danh sách khóa học của 1 lộ trình + nút Thêm/Xóa — dùng chung cho modal Chỉnh Sửa & Tạo Mới. */
function CourseListEditor({ courseIds, onChange, courses, onCustomizeImage }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const courseById = (id) => courses.find((c) => c.id === id);
  const candidates = courses
    .filter((c) => !courseIds.includes(c.id))
    .filter(
      (c) =>
        !pickerSearch ||
        c.title.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        (c.domain && c.domain.toLowerCase().includes(pickerSearch.toLowerCase()))
    )
    .slice(0, 30);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{courseIds.length} khóa học trong lộ trình</div>
        <Button size="sm" variant="primary" icon="ti-plus" onClick={() => setPickerOpen((v) => !v)}>
          {pickerOpen ? 'Đóng Danh Mục' : 'Thêm Khóa Học'}
        </Button>
      </div>

      {pickerOpen && (
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 14, background: 'var(--paper-sunken)' }}>
          <input
            type="text"
            className="field-input"
            placeholder="Tìm theo tên, mã hoặc lĩnh vực khóa học..."
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            style={{ width: '100%', marginBottom: 10 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
            {candidates.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', padding: 14 }}>Không tìm thấy khóa học phù hợp.</div>
            ) : (
              candidates.map((course) => (
                <div key={course.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6, background: '#fff' }}>
                  <img src={getCourseImage(course)} alt={course.title} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>{course.title}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{course.code} · {course.domain || course.category} · Level {course.targetLevel}</div>
                  </div>
                  <Button size="sm" variant="primary" icon="ti-plus" onClick={() => onChange([...courseIds, course.id])}>Thêm</Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {courseIds.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', padding: '16px 0', textAlign: 'center' }}>Chưa có khóa học nào — bấm &quot;Thêm Khóa Học&quot; để bắt đầu.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {courseIds.map((id, idx) => {
            const course = courseById(id);
            if (!course) return null;
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--rail, #005BAA)', color: '#fff', textAlign: 'center', lineHeight: '22px', fontSize: 10.5, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
                <img
                  src={getCourseImage(course)}
                  alt={course.title}
                  style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0, cursor: onCustomizeImage ? 'pointer' : 'default' }}
                  onClick={() => onCustomizeImage && onCustomizeImage(course)}
                  title={onCustomizeImage ? 'Bấm để đổi ảnh mốc lộ trình' : undefined}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>{course.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{course.code} · {course.domain || course.category} · Level {course.targetLevel}</div>
                </div>
                <Button size="sm" variant="ghost" icon="ti-trash" onClick={() => onChange(courseIds.filter((cid) => cid !== id))} title="Xóa khỏi lộ trình" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminLevelRoadmaps() {
  const { currentUser, courses, users, roadmapsConfig, publishRoadmapScope, updateCourse, language } = useCourseStore();

  const role = normalizeRole(currentUser?.role);
  const canManage = hasCapability(role, 'canManageLevelRoadmaps');

  // Filter & Toolbar States
  const [filterBuId, setFilterBuId] = useState('ALL');
  const [filterDivisionId, setFilterDivisionId] = useState('ALL');
  const [filterDepartmentId, setFilterDepartmentId] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('DIVISION');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'GRID'
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  // Modals
  const [detailRow, setDetailRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [imageModalCourse, setImageModalCourse] = useState(null);
  const [customImageUrl, setCustomImageUrl] = useState('');

  const positions = useMemo(() => listRealOrgPositions(users), [users]);

  const directoryRows = useMemo(() => {
    const rows = [];
    positions.forEach((pos) => {
      Object.keys(pos.levelCounts).forEach((level) => {
        const scopeKey = buildScopeKey({ buId: pos.buId, divisionId: pos.divisionId, departmentId: pos.departmentId, subDepartmentId: pos.subDepartmentId, level });
        const pseudoUser = { branch: branchForBuId(pos.buId), divisionId: pos.divisionId, departmentId: pos.departmentId, subDepartmentId: pos.subDepartmentId };
        const resolved = getRoadmapForScope(roadmapsConfig, pseudoUser, level);
        rows.push({
          scopeKey,
          buId: pos.buId,
          divisionId: pos.divisionId,
          departmentId: pos.departmentId,
          subDepartmentId: pos.subDepartmentId,
          level,
          headcount: pos.levelCounts[level],
          courseCount: resolved.courseIds.length,
          hasOwnOverride: Boolean(roadmapsConfig[scopeKey]),
          isInherited: resolved.scopeKey !== scopeKey,
          resolvedScopeKey: resolved.scopeKey,
          currentVersion: roadmapsConfig[scopeKey]?.currentVersion || null,
        });
      });
    });
    return rows.sort((a, b) => Number(a.level) - Number(b.level));
  }, [positions, roadmapsConfig]);

  // Counts
  const totalHeadcount = useMemo(() => {
    return directoryRows.reduce((sum, r) => sum + (r.headcount || 0), 0);
  }, [directoryRows]);

  const activeFiltersCount = (
    (filterBuId !== 'ALL' ? 1 : 0) +
    (filterDivisionId !== 'ALL' ? 1 : 0) +
    (filterDepartmentId !== 'ALL' ? 1 : 0) +
    (filterLevel !== 'ALL' ? 1 : 0) +
    (filterStatus !== 'ALL' ? 1 : 0)
  );

  function resetAllFilters() {
    setFilterBuId('ALL');
    setFilterDivisionId('ALL');
    setFilterDepartmentId('ALL');
    setFilterLevel('ALL');
    setFilterStatus('ALL');
    setSearch('');
  }

  if (!canManage) {
    return (
      <div className="empty-state">
        <i className="ti ti-lock" aria-hidden="true" style={{ color: 'var(--rust)' }} />
        <p>{language === 'en' ? 'You do not have permission to manage Level Roadmaps.' : 'Bạn không có quyền quản lý Lộ trình Cấp bậc.'}</p>
        <Link to="/">{language === 'en' ? 'Back to Home' : 'Về trang chủ'}</Link>
      </div>
    );
  }

  function handleDivisionFilterChange(nextId) {
    setFilterDivisionId(nextId);
    setFilterDepartmentId('ALL');
  }

  const departmentFilterOptions = filterDivisionId !== 'ALL'
    ? departments.filter((d) => d.divisionId === filterDivisionId)
    : departments;

  const filteredRows = directoryRows.filter((r) => {
    if (filterBuId !== 'ALL' && r.buId !== filterBuId) return false;
    if (filterDivisionId !== 'ALL' && r.divisionId !== filterDivisionId) return false;
    if (filterDepartmentId !== 'ALL' && r.departmentId !== filterDepartmentId) return false;
    if (filterLevel !== 'ALL' && r.level !== filterLevel) return false;
    if (filterStatus === 'CUSTOM' && !r.hasOwnOverride) return false;
    if (filterStatus === 'INHERITED' && !r.isInherited) return false;
    if (search) {
      const q = search.toLowerCase().trim();
      const posText = positionLabel(r).toLowerCase();
      const levelText = `level ${r.level}`;
      if (!posText.includes(q) && !levelText.includes(q)) return false;
    }
    return true;
  });

  function groupKeyOf(r) {
    if (groupBy === 'DIVISION') return { key: r.divisionId || 'NONE', label: r.divisionId ? labelForDivision(r.divisionId) : 'Toàn Khối (không gắn Division)', icon: 'ti-building' };
    if (groupBy === 'DEPARTMENT') return { key: r.departmentId || 'NONE', label: r.departmentId ? labelForDepartment(r.departmentId) : 'Toàn Division (không gắn Department)', icon: 'ti-stack-2' };
    if (groupBy === 'LEVEL') return { key: r.level, label: `Level ${r.level} — ${levelShortLabel(r.level)}`, icon: 'ti-stairs-up' };
    if (groupBy === 'STATUS') return { key: r.isInherited ? 'INHERITED' : 'CUSTOM', label: r.isInherited ? 'Lộ Trình Đang Kế Thừa Chuẩn' : 'Lộ Trình Đã Tùy Biến Riêng', icon: r.isInherited ? 'ti-git-branch' : 'ti-award' };
    return { key: 'ALL', label: '', icon: '' };
  }

  const groups = groupBy === 'NONE' ? null : (() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      const g = groupKeyOf(r);
      if (!map.has(g.key)) map.set(g.key, { ...g, rows: [] });
      map.get(g.key).rows.push(r);
    });
    const arr = Array.from(map.values());
    if (groupBy === 'LEVEL') arr.sort((a, b) => Number(b.key) - Number(a.key));
    else arr.sort((a, b) => b.rows.length - a.rows.length);
    return arr;
  })();

  function toggleCollapsed(key) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function openImageCustomizer(course) {
    setImageModalCourse(course);
    setCustomImageUrl(course.milestoneImage || course.thumbnail || '');
  }
  function handleSaveMilestoneImage(url) {
    if (!imageModalCourse) return;
    const targetUrl = url || customImageUrl;
    updateCourse(imageModalCourse.id, { ...imageModalCourse, milestoneImage: targetUrl, thumbnail: targetUrl, imageUrl: targetUrl });
    setImageModalCourse(null);
  }

  function renderTable(rows) {
    return (
      <div className="card" style={{ overflowX: 'auto', background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Vị Trí Cơ Cấu Trực Thuộc</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', width: 110, fontWeight: 700 }}>Cấp Bậc</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', width: 90, fontWeight: 700 }}>Nhân Sự</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', width: 90, fontWeight: 700 }}>Khóa Học</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', width: 180, fontWeight: 700 }}>Trạng Thái Lộ Trình</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', width: 170, fontWeight: 700 }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-soft)' }}>Không có vị trí nào khớp bộ lọc.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.scopeKey} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 600, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={positionLabel(r)}>
                    {positionLabel(r)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <Badge tone="blue">Level {r.level}</Badge>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12.5, fontWeight: 700 }}>
                    {r.headcount}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: 'var(--blue, #005BAA)' }}>
                    {r.courseCount}
                  </td>
                  <td style={{ padding: '12px 14px' }} title={r.isInherited ? `Kế thừa từ: ${scopeBreadcrumb(r.resolvedScopeKey)}` : undefined}>
                    {r.isInherited ? (
                      <Badge tone="amber">Kế Thừa</Badge>
                    ) : (
                      <Badge tone="sage">Riêng · {r.currentVersion}</Badge>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setDetailRow(r)}>Xem</Button>
                      <Button size="sm" variant="primary" icon="ti-pencil" onClick={() => setEditRow(r)}>Sửa</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderGrid(rows) {
    return (
      <div className="grid grid-3" style={{ gap: 14 }}>
        {rows.map((r) => (
          <div
            key={r.scopeKey}
            className="card card-pad"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: '#fff',
              borderRadius: 10,
              border: '1px solid var(--line)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <Badge tone="blue">Level {r.level}</Badge>
                {r.isInherited ? (
                  <Badge tone="amber">Kế Thừa</Badge>
                ) : (
                  <Badge tone="sage">Riêng · {r.currentVersion}</Badge>
                )}
              </div>

              <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0F172A', marginBottom: 8, lineHeight: 1.4 }} title={positionLabel(r)}>
                {positionLabel(r)}
              </div>

              <div style={{ background: 'var(--paper-sunken)', padding: '8px 10px', borderRadius: 6, fontSize: 12, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span>Nhân sự đang học: <strong>{r.headcount}</strong></span>
                <span style={{ color: 'var(--blue, #005BAA)', fontWeight: 700 }}>{r.courseCount} Khóa học</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 6 }}>
              <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setDetailRow(r)}>Xem</Button>
              <Button size="sm" variant="primary" icon="ti-pencil" onClick={() => setEditRow(r)}>Sửa</Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Danh Bạ Lộ Trình Cấp Bậc (Level Roadmaps)</h1>
            <Badge tone="blue">{directoryRows.length} Lộ Trình</Badge>
          </div>
          <p>
            Toàn bộ lộ trình học tập theo từng Cấp Bậc × Vị trí (Khối / Division / Department / Tổ-Quầy) mà học viên thực tế
            đang có mặt — lọc/gộp nhóm để tìm nhanh, bấm &quot;Xem&quot; để xem toàn bộ khóa học, &quot;Sửa&quot; để chỉnh sửa
            (tự động tạo phiên bản mới, không ảnh hưởng học viên đã hoàn thành/đang học dở).
          </p>
        </div>
        <Button variant="primary" icon="ti-plus" onClick={() => setCreateOpen(true)}>Tạo Lộ Trình Mới</Button>
      </div>

      {/* METRICS ROW */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="card card-pad" style={{ background: '#fff' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Tổng Vị Trí &amp; Cấp Bậc</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue, #005BAA)', marginTop: 2 }}>{directoryRows.length}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>Bao phủ 2 khối lớn &middot; 7 cấp bậc MMVN</div>
        </div>

        <div className="card card-pad" style={{ background: '#fff' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Đã Tùy Biến Lộ Trình Riêng</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#16A34A', marginTop: 2 }}>
            {directoryRows.filter((r) => r.hasOwnOverride).length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>Có phiên bản quản lý riêng theo bộ phận</div>
        </div>

        <div className="card card-pad" style={{ background: '#fff' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Đang Kế Thừa Lộ Trình Chuẩn</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#D97706', marginTop: 2 }}>
            {directoryRows.filter((r) => r.isInherited).length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>Tự động kế thừa từ Division / Cấp Cha</div>
        </div>

        <div className="card card-pad" style={{ background: '#fff' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Tổng Nhân Sự Đang Áp Dụng</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#7C3AED', marginTop: 2 }}>{totalHeadcount}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>Học viên thực tế trên toàn hệ thống</div>
        </div>
      </div>

      {/* STANDARDIZED FILTER TOOLBAR CARD */}
      <div className="card card-pad" style={{ marginBottom: 18, background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
        {/* ROW 1: SEARCH, GROUP BY, FILTER TOGGLE, VIEW MODE */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: 240 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
              placeholder="Tìm theo tên vị trí, cấp bậc, đơn vị..."
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
                {ROADMAP_GROUP_BY_OPTIONS.map((opt) => (
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
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {/* Filter 1: Khối (Business Unit) */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Khối (Business Unit)
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 12.5,
                    borderRadius: 6,
                    background: filterBuId !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: filterBuId !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: filterBuId !== 'ALL' ? '#005BAA' : 'var(--ink)',
                    fontWeight: filterBuId !== 'ALL' ? 700 : 500,
                  }}
                  value={filterBuId}
                  onChange={(e) => setFilterBuId(e.target.value)}
                >
                  <option value="ALL">Tất cả Khối ({SCOPE_BUSINESS_UNITS.length})</option>
                  {SCOPE_BUSINESS_UNITS.map((bu) => (
                    <option key={bu.id} value={bu.id}>{bu.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Division */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Phòng / Ban Lớn (Division)
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 12.5,
                    borderRadius: 6,
                    background: filterDivisionId !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: filterDivisionId !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: filterDivisionId !== 'ALL' ? '#005BAA' : 'var(--ink)',
                    fontWeight: filterDivisionId !== 'ALL' ? 700 : 500,
                  }}
                  value={filterDivisionId}
                  onChange={(e) => handleDivisionFilterChange(e.target.value)}
                >
                  <option value="ALL">Tất cả Division ({divisions.length})</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter 3: Department */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Bộ Phận Trực Thuộc (Department)
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 12.5,
                    borderRadius: 6,
                    background: filterDepartmentId !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: filterDepartmentId !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: filterDepartmentId !== 'ALL' ? '#005BAA' : 'var(--ink)',
                    fontWeight: filterDepartmentId !== 'ALL' ? 700 : 500,
                  }}
                  value={filterDepartmentId}
                  onChange={(e) => setFilterDepartmentId(e.target.value)}
                >
                  <option value="ALL">
                    {filterDivisionId !== 'ALL' ? `Tất cả Department (${departmentFilterOptions.length})` : `Tất cả Department (${departments.length})`}
                  </option>
                  {departmentFilterOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Cấp Bậc (Level) */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Cấp Bậc (Job Level)
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 12.5,
                    borderRadius: 6,
                    background: filterLevel !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: filterLevel !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: filterLevel !== 'ALL' ? '#005BAA' : 'var(--ink)',
                    fontWeight: filterLevel !== 'ALL' ? 700 : 500,
                  }}
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                >
                  <option value="ALL">Tất cả cấp bậc (7 Levels)</option>
                  {[...LEVEL_DEFINITIONS].map((def) => (
                    <option key={def.level} value={def.level}>
                      Level {def.level} — {def.titleVi || def.shortVi}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 5: Trạng Thái Lộ Trình */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Trạng Thái Lộ Trình
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 12.5,
                    borderRadius: 6,
                    background: filterStatus !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: filterStatus !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: filterStatus !== 'ALL' ? '#005BAA' : 'var(--ink)',
                    fontWeight: filterStatus !== 'ALL' ? 700 : 500,
                  }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="CUSTOM">Lộ trình riêng (Đã tùy biến)</option>
                  <option value="INHERITED">Kế thừa từ cấp cha</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE FILTER TAGS & RESET BAR */}
        {(search || activeFiltersCount > 0 || groupBy !== 'DIVISION') && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Đang lọc theo:</span>

              {search && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Từ khóa: <strong>"{search}"</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                </span>
              )}

              {filterBuId !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Khối: <strong>{SCOPE_BUSINESS_UNITS.find(b => b.id === filterBuId)?.name}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFilterBuId('ALL')} />
                </span>
              )}

              {filterDivisionId !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Division: <strong>{labelForDivision(filterDivisionId)}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFilterDivisionId('ALL')} />
                </span>
              )}

              {filterDepartmentId !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Department: <strong>{labelForDepartment(filterDepartmentId)}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFilterDepartmentId('ALL')} />
                </span>
              )}

              {filterLevel !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Cấp bậc: <strong>Level {filterLevel}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFilterLevel('ALL')} />
                </span>
              )}

              {filterStatus !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Trạng thái: <strong>{filterStatus === 'CUSTOM' ? 'Lộ trình riêng' : 'Kế thừa'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('ALL')} />
                </span>
              )}

              {groupBy !== 'DIVISION' && (
                <span className="badge" style={{ background: '#F8FAFC', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Gộp nhóm: <strong>{ROADMAP_GROUP_BY_OPTIONS.find(o => o.id === groupBy)?.label}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setGroupBy('DIVISION')} />
                </span>
              )}

              <button
                type="button"
                onClick={resetAllFilters}
                style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
              >
                Xóa tất cả bộ lọc
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Tìm thấy <strong>{filteredRows.length}</strong> / {directoryRows.length} lộ trình cấp bậc
            </div>
          </div>
        )}
      </div>

      {/* CONTENT: RENDER GROUPED OR FLAT LIST */}
      {filteredRows.length === 0 ? (
        <div className="empty-state" style={{ background: '#fff', padding: 40, borderRadius: 10, border: '1px solid var(--line)' }}>
          <i className="ti ti-stairs-up" aria-hidden="true" style={{ fontSize: 36, color: 'var(--ink-faint)' }} />
          <p style={{ marginTop: 10, color: 'var(--ink-soft)' }}>
            Không tìm thấy vị trí hoặc lộ trình cấp bậc nào phù hợp với bộ lọc hiện tại.
          </p>
          <div style={{ marginTop: 14 }}>
            <Button size="sm" variant="outline" onClick={resetAllFilters}>Xóa Bộ Lọc</Button>
          </div>
        </div>
      ) : groupBy === 'NONE' || !groups ? (
        viewMode === 'TABLE' ? renderTable(filteredRows) : renderGrid(filteredRows)
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    padding: '14px 18px',
                    background: '#F8FAFC',
                    border: 'none',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ color: 'var(--ink-faint)' }} />
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', color: 'var(--blue, #005BAA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${g.icon}`} style={{ fontSize: 16 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 14, color: '#0F172A' }}>{g.label}</div>
                  <Badge tone="slate">{g.rows.length} lộ trình</Badge>
                </button>
                {!isCollapsed && (
                  <div style={{ padding: 12 }}>
                    {viewMode === 'TABLE' ? renderTable(g.rows) : renderGrid(g.rows)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: XEM CHI TIẾT (READ-ONLY) */}
      <Modal isOpen={Boolean(detailRow)} onClose={() => setDetailRow(null)} title="Chi Tiết Lộ Trình" subtitle={detailRow ? positionLabel(detailRow) + ` · Level ${detailRow.level}` : ''} size="lg">
        {detailRow && (() => {
          const entry = roadmapsConfig[detailRow.resolvedScopeKey];
          const courseIds = entry?.courseIds || [];
          const milestones = courseIds.map((id) => courses.find((c) => c.id === id)).filter(Boolean).map((course, idx) => ({ course, status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED', completed: false }));
          return (
            <div>
              {detailRow.isInherited && (
                <div style={{ fontSize: 12, background: 'var(--paper-sunken)', padding: '8px 12px', borderRadius: 6, marginBottom: 14 }}>
                  Vị trí này chưa có lộ trình riêng — đang <strong>kế thừa</strong> từ: <strong>{scopeBreadcrumb(detailRow.resolvedScopeKey)}</strong>.
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                <Badge tone="blue">{courseIds.length} khóa học</Badge>
                {entry?.currentVersion && <Badge tone="sage">Phiên bản {entry.currentVersion}</Badge>}
              </div>
              <VisualRoadmapTimeline milestones={milestones} />
              {entry?.versionHistory?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8 }}>Lịch Sử Phiên Bản</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entry.versionHistory.map((h, i) => (
                      <div key={i} style={{ fontSize: 11.5, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6 }}>
                        <strong>{h.version}</strong> · {h.updatedBy} · {h.updatedAt} — {h.note}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <Button variant="outline" onClick={() => setDetailRow(null)}>Đóng</Button>
                <Button variant="primary" icon="ti-pencil" onClick={() => { setEditRow(detailRow); setDetailRow(null); }}>Chỉnh Sửa</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL: CHỈNH SỬA (EDIT) */}
      {editRow && (
        <EditRoadmapModal
          row={editRow}
          courses={courses}
          roadmapsConfig={roadmapsConfig}
          onClose={() => setEditRow(null)}
          onCustomizeImage={openImageCustomizer}
          onSave={(courseIds, note) => {
            publishRoadmapScope(editRow.scopeKey, courseIds, note);
            setEditRow(null);
          }}
        />
      )}

      {/* MODAL: TẠO LỘ TRÌNH MỚI */}
      {createOpen && (
        <CreateRoadmapModal
          courses={courses}
          roadmapsConfig={roadmapsConfig}
          onClose={() => setCreateOpen(false)}
          onCreate={(scopeKey, courseIds, note) => {
            publishRoadmapScope(scopeKey, courseIds, note);
            setCreateOpen(false);
          }}
        />
      )}

      {/* MODAL: TÙY CHỈNH ẢNH MỐC LỘ TRÌNH */}
      {imageModalCourse && (
        <Modal isOpen={Boolean(imageModalCourse)} onClose={() => setImageModalCourse(null)} title="Tùy Chỉnh Ảnh Mốc Lộ Trình" subtitle={imageModalCourse.title} size="lg">
          <div style={{ marginBottom: 16 }}>
            <CourseImagePickerStudio
              imageUrl={customImageUrl}
              onChange={(url) => setCustomImageUrl(url)}
              courseTitle={imageModalCourse.title}
              courseCode={imageModalCourse.code}
              courseCategory={imageModalCourse.domain || imageModalCourse.category}
              courseType={imageModalCourse.courseType}
              estimatedHours={imageModalCourse.estimatedHours || '2.0h'}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="outline" onClick={() => setImageModalCourse(null)}>Hủy</Button>
            <Button variant="primary" icon="ti-check" onClick={() => handleSaveMilestoneImage(customImageUrl)}>Lưu Ảnh Mốc</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

/** Modal Chỉnh Sửa: scope cố định theo `row`, seed danh sách từ lộ trình đang hiệu lực (kế thừa hoặc riêng). */
function EditRoadmapModal({ row, courses, roadmapsConfig, onClose, onCustomizeImage, onSave }) {
  const [courseIds, setCourseIds] = useState(() => {
    const pseudoUser = { branch: branchForBuId(row.buId), divisionId: row.divisionId, departmentId: row.departmentId, subDepartmentId: row.subDepartmentId };
    return getRoadmapForScope(roadmapsConfig, pseudoUser, row.level).courseIds;
  });
  const [note, setNote] = useState('');

  return (
    <Modal isOpen onClose={onClose} title="Chỉnh Sửa Lộ Trình" subtitle={positionLabel(row) + ` · Level ${row.level}`} size="lg">
      {row.isInherited && (
        <div style={{ fontSize: 12, background: 'var(--paper-sunken)', padding: '8px 12px', borderRadius: 6, marginBottom: 14 }}>
          Vị trí này đang kế thừa lộ trình từ cấp cha. Lưu thay đổi sẽ tạo một lộ trình <strong>riêng</strong> cho đúng vị trí này,
          bắt đầu từ danh sách đang kế thừa.
        </div>
      )}
      <CourseListEditor courseIds={courseIds} onChange={setCourseIds} courses={courses} onCustomizeImage={onCustomizeImage} />
      <div style={{ marginTop: 16 }}>
        <label className="field-label">Ghi chú thay đổi (tùy chọn)</label>
        <input type="text" className="field-input" style={{ width: '100%' }} placeholder="Vd: Thêm khóa An Toàn Thực Phẩm mới ban hành..." value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 10, lineHeight: 1.5 }}>
        Lưu sẽ tự động phát hành phiên bản mới — học viên đã hoàn thành hoặc đang học dở lộ trình này tiếp tục thấy đúng nội
        dung cũ họ đã bắt đầu; chỉ học viên chưa từng tham gia mới thấy danh sách mới này.
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Button variant="outline" onClick={onClose}>Hủy</Button>
        <Button variant="primary" icon="ti-check" onClick={() => onSave(courseIds, note)}>Lưu Thay Đổi</Button>
      </div>
    </Modal>
  );
}

/** Modal Tạo Mới: admin tự chọn Level + BU/Division/Department/Sub-Department. */
function CreateRoadmapModal({ courses, roadmapsConfig, onClose, onCreate }) {
  const [buId, setBuId] = useState(SCOPE_BUSINESS_UNITS[1].id);
  const [divisionId, setDivisionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [subDepartmentId, setSubDepartmentId] = useState('');
  const [level, setLevel] = useState('7');
  const [courseIds, setCourseIds] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const departmentOptions = divisionId ? departments.filter((d) => d.divisionId === divisionId) : [];
  const subDepartmentOptions = departmentId ? subDepartments.filter((d) => d.departmentId === departmentId) : [];
  const scopeKey = buildScopeKey({ buId, divisionId, departmentId, subDepartmentId, level });
  const alreadyExists = Boolean(roadmapsConfig[scopeKey]);

  function handleCreate() {
    if (alreadyExists) {
      setError('Lộ trình này đã tồn tại — hãy dùng "Sửa" trên Danh Bạ Lộ Trình thay vì tạo mới.');
      return;
    }
    if (courseIds.length === 0) {
      setError('Hãy thêm ít nhất 1 khóa học cho lộ trình mới.');
      return;
    }
    onCreate(scopeKey, courseIds, note);
  }

  return (
    <Modal isOpen onClose={onClose} title="Tạo Lộ Trình Mới" subtitle="Chọn Cấp Bậc và Vị Trí Tổ Chức (Khối / Division / Department / Tổ-Quầy), sau đó thêm khóa học." size="lg">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>Khối (Business Unit)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {SCOPE_BUSINESS_UNITS.map((bu) => (
              <button key={bu.id} onClick={() => setBuId(bu.id)} className="btn btn-sm" style={{ background: buId === bu.id ? 'var(--rail, #005BAA)' : 'var(--paper-raised)', color: buId === bu.id ? '#fff' : 'var(--ink)', borderColor: buId === bu.id ? 'var(--rail)' : 'var(--line-strong)' }}>{bu.name}</button>
            ))}
          </div>
        </div>
        <div style={{ minWidth: 180 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Division</div>
          <select className="field-select" style={{ width: '100%', height: 34, fontSize: 12.5 }} value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setDepartmentId(''); setSubDepartmentId(''); }}>
            <option value="">— Toàn Khối —</option>
            {divisions.map((d) => (<option key={d.id} value={d.id}>{d.code} · {d.name}</option>))}
          </select>
        </div>
        <div style={{ minWidth: 180 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Department</div>
          <select className="field-select" style={{ width: '100%', height: 34, fontSize: 12.5 }} value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setSubDepartmentId(''); }} disabled={!divisionId}>
            <option value="">{divisionId ? '— Toàn Division —' : 'Chọn Division trước'}</option>
            {departmentOptions.map((d) => (<option key={d.id} value={d.id}>{d.code} · {d.name}</option>))}
          </select>
        </div>
        <div style={{ minWidth: 200 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Sub-Department</div>
          <select className="field-select" style={{ width: '100%', height: 34, fontSize: 12.5 }} value={subDepartmentId} onChange={(e) => setSubDepartmentId(e.target.value)} disabled={!departmentId || subDepartmentOptions.length === 0}>
            <option value="">{!departmentId ? 'Chọn Department trước' : subDepartmentOptions.length === 0 ? 'Không có Tổ/Quầy con' : '— Toàn Department —'}</option>
            {subDepartmentOptions.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="field-label" style={{ marginBottom: 6 }}>Cấp Bậc</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {LEVEL_DEFINITIONS.map((lvl) => (
            <button key={lvl.level} onClick={() => setLevel(lvl.level)} className="btn btn-sm" style={{ background: level === lvl.level ? 'var(--rail, #005BAA)' : 'var(--paper-raised)', color: level === lvl.level ? '#fff' : 'var(--ink)', borderColor: level === lvl.level ? 'var(--rail)' : 'var(--line-strong)' }}>{lvl.emoji} Level {lvl.level}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, marginBottom: 14, padding: '8px 12px', borderRadius: 6, background: alreadyExists ? '#FEF2F2' : 'var(--paper-sunken)', color: alreadyExists ? '#991B1B' : 'var(--ink-soft)' }}>
        Vị trí: <strong>{scopeBreadcrumb(scopeKey)}</strong>
        {alreadyExists && ' — lộ trình này đã tồn tại, hãy dùng "Sửa" thay vì tạo mới.'}
      </div>

      <CourseListEditor courseIds={courseIds} onChange={setCourseIds} courses={courses} />

      <div style={{ marginTop: 16 }}>
        <label className="field-label">Ghi chú (tùy chọn)</label>
        <input type="text" className="field-input" style={{ width: '100%' }} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && <div style={{ color: 'var(--rust)', fontSize: 12, marginTop: 10 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Button variant="outline" onClick={onClose}>Hủy</Button>
        <Button variant="primary" icon="ti-plus" onClick={handleCreate}>Tạo Lộ Trình</Button>
      </div>
    </Modal>
  );
}
