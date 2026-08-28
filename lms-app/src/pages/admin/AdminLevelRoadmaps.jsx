import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCourseStore } from '../../state/CourseStore';
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
import { Button, Modal, Badge } from '../../components/ui';
import VisualRoadmapTimeline from '../../components/VisualRoadmapTimeline';
import { getCourseImage, COURSE_IMAGE_PRESETS } from '../../data/courseImages';

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

const GROUP_BY_OPTIONS = [
  { id: 'DIVISION', label: 'Division' },
  { id: 'DEPARTMENT', label: 'Department' },
  { id: 'LEVEL', label: 'Cấp Bậc' },
  { id: 'NONE', label: 'Không Gộp Nhóm' },
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
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--rail)', color: '#fff', textAlign: 'center', lineHeight: '22px', fontSize: 10.5, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
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

  const [filterBuId, setFilterBuId] = useState('');
  const [filterDivisionId, setFilterDivisionId] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('DIVISION');
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

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
    setFilterDepartmentId('');
  }

  const departmentFilterOptions = filterDivisionId ? departments.filter((d) => d.divisionId === filterDivisionId) : [];

  const filteredRows = directoryRows.filter((r) => {
    if (filterBuId && r.buId !== filterBuId) return false;
    if (filterDivisionId && r.divisionId !== filterDivisionId) return false;
    if (filterDepartmentId && r.departmentId !== filterDepartmentId) return false;
    if (filterLevel && r.level !== filterLevel) return false;
    if (search && !positionLabel(r).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function groupKeyOf(r) {
    if (groupBy === 'DIVISION') return { key: r.divisionId || 'NONE', label: r.divisionId ? labelForDivision(r.divisionId) : 'Toàn Khối (không gắn Division)', icon: 'ti-building' };
    if (groupBy === 'DEPARTMENT') return { key: r.departmentId || 'NONE', label: r.departmentId ? labelForDepartment(r.departmentId) : 'Toàn Division (không gắn Department)', icon: 'ti-stack-2' };
    if (groupBy === 'LEVEL') return { key: r.level, label: `Level ${r.level} — ${levelShortLabel(r.level)}`, icon: 'ti-stairs-up' };
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
      <div className="card" style={{ overflowX: 'auto', marginBottom: 20 }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Vị Trí</th>
              <th style={{ width: 90 }}>Cấp Bậc</th>
              <th style={{ width: 90 }}>Nhân Sự</th>
              <th style={{ width: 90 }}>Khóa Học</th>
              <th style={{ width: 170 }}>Trạng Thái</th>
              <th style={{ textAlign: 'right', width: 200 }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-soft)' }}>Không có vị trí nào khớp bộ lọc.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.scopeKey}>
                  <td style={{ fontSize: 12.5, fontWeight: 600, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={positionLabel(r)}>
                    {positionLabel(r)}
                  </td>
                  <td><Badge tone="blue">Level {r.level}</Badge></td>
                  <td style={{ fontSize: 12.5 }}>{r.headcount}</td>
                  <td style={{ fontSize: 12.5 }}>{r.courseCount}</td>
                  <td title={r.isInherited ? `Kế thừa từ: ${scopeBreadcrumb(r.resolvedScopeKey)}` : undefined}>
                    {r.isInherited ? (
                      <Badge tone="amber">Kế Thừa</Badge>
                    ) : (
                      <Badge tone="sage">Riêng · {r.currentVersion}</Badge>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
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

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Danh Bạ Lộ Trình Cấp Bậc</h1>
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

      {/* FILTER / GROUP BY BAR */}
      <div className="card card-pad" style={{ marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>Khối (Business Unit)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setFilterBuId('')} className="btn btn-sm" style={{ background: filterBuId === '' ? 'var(--rail)' : 'var(--paper-raised)', color: filterBuId === '' ? '#fff' : 'var(--ink)', borderColor: filterBuId === '' ? 'var(--rail)' : 'var(--line-strong)' }}>Tất cả</button>
            {SCOPE_BUSINESS_UNITS.map((bu) => (
              <button key={bu.id} onClick={() => setFilterBuId(bu.id)} className="btn btn-sm" style={{ background: filterBuId === bu.id ? 'var(--rail)' : 'var(--paper-raised)', color: filterBuId === bu.id ? '#fff' : 'var(--ink)', borderColor: filterBuId === bu.id ? 'var(--rail)' : 'var(--line-strong)' }}>{bu.name}</button>
            ))}
          </div>
        </div>

        <div style={{ minWidth: 190 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Division</div>
          <select aria-label="Filter Division" className="field-select" style={{ width: '100%', height: 34, fontSize: 12.5 }} value={filterDivisionId} onChange={(e) => handleDivisionFilterChange(e.target.value)}>
            <option value="">— Tất cả Division —</option>
            {divisions.map((d) => (<option key={d.id} value={d.id}>{d.code} · {d.name}</option>))}
          </select>
        </div>

        <div style={{ minWidth: 190 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Department</div>
          <select className="field-select" style={{ width: '100%', height: 34, fontSize: 12.5 }} value={filterDepartmentId} onChange={(e) => setFilterDepartmentId(e.target.value)} disabled={!filterDivisionId}>
            <option value="">{filterDivisionId ? '— Tất cả Department —' : 'Chọn Division trước'}</option>
            {departmentFilterOptions.map((d) => (<option key={d.id} value={d.id}>{d.code} · {d.name}</option>))}
          </select>
        </div>

        <div style={{ minWidth: 180 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Cấp Bậc</div>
          <select className="field-select" style={{ width: '100%', height: 34, fontSize: 12.5 }} value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
            <option value="">— Tất cả Level —</option>
            {[...LEVEL_DEFINITIONS].reverse().map((def) => (<option key={def.level} value={def.level}>{def.emoji} Level {def.level}</option>))}
          </select>
        </div>

        <div style={{ minWidth: 200 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Tìm kiếm</div>
          <input type="text" className="field-input" style={{ width: '100%', height: 34, fontSize: 12.5 }} placeholder="Tìm vị trí..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div style={{ minWidth: 190 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Gộp Nhóm</div>
          <select aria-label="Group By" className="field-select" style={{ width: '100%', height: 34, fontSize: 12.5, fontWeight: 600 }} value={groupBy} onChange={(e) => { setGroupBy(e.target.value); setCollapsedGroups(new Set()); }}>
            {GROUP_BY_OPTIONS.map((opt) => (<option key={opt.id} value={opt.id}>🗂️ Gộp nhóm: {opt.label}</option>))}
          </select>
        </div>
      </div>

      {groupBy === 'NONE' || !groups ? (
        renderTable(filteredRows)
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.map((g) => {
            const isCollapsed = collapsedGroups.has(g.key);
            return (
              <div key={g.key} className="card" style={{ overflow: 'hidden' }}>
                <button
                  onClick={() => toggleCollapsed(g.key)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--paper-raised)', border: 'none', borderBottom: isCollapsed ? 'none' : '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ color: 'var(--ink-faint)' }} />
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--rail-soft)', color: 'var(--rail)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${g.icon}`} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 13.5, color: 'var(--ink)' }}>{g.label}</div>
                  <Badge tone="slate">{g.rows.length} lộ trình</Badge>
                </button>
                {!isCollapsed && <div style={{ padding: '12px 16px 0' }}>{renderTable(g.rows)}</div>}
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
        <Modal isOpen={Boolean(imageModalCourse)} onClose={() => setImageModalCourse(null)} title="Tùy Chỉnh Ảnh Mốc Lộ Trình" subtitle={imageModalCourse.title} size="md">
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Nhập URL hình ảnh mới</label>
            <input type="text" className="field-input" value={customImageUrl} onChange={(e) => setCustomImageUrl(e.target.value)} placeholder="https://images.unsplash.com/..." style={{ width: '100%', marginBottom: 10 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Hoặc chọn ảnh đại diện phù hợp từ thư viện MMVN:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {COURSE_IMAGE_PRESETS.map((preset) => {
                const isSelected = customImageUrl === preset.url;
                return (
                  <button key={preset.id} type="button" onClick={() => { setCustomImageUrl(preset.url); handleSaveMilestoneImage(preset.url); }} style={{ padding: 4, borderRadius: 6, border: isSelected ? '2px solid var(--blue)' : '1px solid var(--line)', background: isSelected ? '#eff6ff' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img src={preset.url} alt={preset.label} style={{ width: '100%', height: 48, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }} />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--ink)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.label}</span>
                  </button>
                );
              })}
            </div>
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
              <button key={bu.id} onClick={() => setBuId(bu.id)} className="btn btn-sm" style={{ background: buId === bu.id ? 'var(--rail)' : 'var(--paper-raised)', color: buId === bu.id ? '#fff' : 'var(--ink)', borderColor: buId === bu.id ? 'var(--rail)' : 'var(--line-strong)' }}>{bu.name}</button>
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
            <button key={lvl.level} onClick={() => setLevel(lvl.level)} className="btn btn-sm" style={{ background: level === lvl.level ? 'var(--rail)' : 'var(--paper-raised)', color: level === lvl.level ? '#fff' : 'var(--ink)', borderColor: level === lvl.level ? 'var(--rail)' : 'var(--line-strong)' }}>{lvl.emoji} Level {lvl.level}</button>
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
