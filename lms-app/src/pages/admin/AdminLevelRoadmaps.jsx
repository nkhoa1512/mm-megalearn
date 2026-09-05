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

/** A readable hierarchical label for one Scope Key, e.g. "Store Operations › Merchandise Division › Processed Fresh Food › Level 7". */
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
  { id: 'DIVISION', label: 'By Division' },
  { id: 'DEPARTMENT', label: 'By Department' },
  { id: 'LEVEL', label: 'By Job Level' },
  { id: 'STATUS', label: 'By Roadmap Status' },
  { id: 'NONE', label: 'No grouping' },
];

/** The course list of one roadmap plus Add/Remove buttons — shared by the Edit & Create modals. */
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
        <div style={{ fontWeight: 700, fontSize: 13 }}>{courseIds.length} courses in the roadmap</div>
        <Button size="sm" variant="primary" icon="ti-plus" onClick={() => setPickerOpen((v) => !v)}>
          {pickerOpen ? 'Close The Catalog' : 'Add Course'}
        </Button>
      </div>

      {pickerOpen && (
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 14, background: 'var(--paper-sunken)' }}>
          <input
            type="text"
            className="field-input"
            placeholder="Search by course name, code or area..."
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            style={{ width: '100%', marginBottom: 10 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
            {candidates.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', padding: 14 }}>No matching course found.</div>
            ) : (
              candidates.map((course) => (
                <div key={course.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--paper-raised)' }}>
                  <img src={getCourseImage(course)} alt={course.title} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>{course.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{course.code} · {course.domain || course.category} · Level {course.targetLevel}</div>
                  </div>
                  <Button size="sm" variant="primary" icon="ti-plus" onClick={() => onChange([...courseIds, course.id])}>Add</Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {courseIds.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--ink-faint)', padding: '16px 0', textAlign: 'center' }}>No course yet — click &quot;Add Course&quot; to start.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {courseIds.map((id, idx) => {
            const course = courseById(id);
            if (!course) return null;
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--rail, #005BAA)', color: '#fff', textAlign: 'center', lineHeight: '22px', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
                <img
                  src={getCourseImage(course)}
                  alt={course.title}
                  style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0, cursor: onCustomizeImage ? 'pointer' : 'default' }}
                  onClick={() => onCustomizeImage && onCustomizeImage(course)}
                  title={onCustomizeImage ? 'Click to change the roadmap milestone image' : undefined}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>{course.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{course.code} · {course.domain || course.category} · Level {course.targetLevel}</div>
                </div>
                <Button size="sm" variant="ghost" icon="ti-trash" onClick={() => onChange(courseIds.filter((cid) => cid !== id))} title="Remove from the roadmap" />
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
        <p>{language === 'en' ? 'You do not have permission to manage Level Roadmaps.' : 'You do not have permission to manage level roadmaps.'}</p>
        <Link to="/">{language === 'en' ? 'Back to Home' : 'Back to home'}</Link>
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
    if (groupBy === 'DIVISION') return { key: r.divisionId || 'NONE', label: r.divisionId ? labelForDivision(r.divisionId) : 'Whole Business Unit (no division attached)', icon: 'ti-building' };
    if (groupBy === 'DEPARTMENT') return { key: r.departmentId || 'NONE', label: r.departmentId ? labelForDepartment(r.departmentId) : 'Whole Division (no department attached)', icon: 'ti-stack-2' };
    if (groupBy === 'LEVEL') return { key: r.level, label: `Level ${r.level} — ${levelShortLabel(r.level)}`, icon: 'ti-stairs-up' };
    if (groupBy === 'STATUS') return { key: r.isInherited ? 'INHERITED' : 'CUSTOM', label: r.isInherited ? 'Roadmap Inherits The Standard' : 'Roadmap Customized Separately', icon: r.isInherited ? 'ti-git-branch' : 'ti-award' };
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
      <div className="card" style={{ overflowX: 'auto', background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Parent Org Position</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', width: 110, fontWeight: 700 }}>Job Level</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', width: 90, fontWeight: 700 }}>Employee</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', width: 90, fontWeight: 700 }}>Course</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', width: 180, fontWeight: 700 }}>Roadmap Status</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', width: 170, fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-soft)' }}>No position matches the filters.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.scopeKey} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={positionLabel(r)}>
                    {positionLabel(r)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <Badge tone="blue">Level {r.level}</Badge>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, fontWeight: 700 }}>
                    {r.headcount}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--blue, #005BAA)' }}>
                    {r.courseCount}
                  </td>
                  <td style={{ padding: '12px 14px' }} title={r.isInherited ? `Inherited from: ${scopeBreadcrumb(r.resolvedScopeKey)}` : undefined}>
                    {r.isInherited ? (
                      <Badge tone="amber">Inherited</Badge>
                    ) : (
                      <Badge tone="sage">Own · {r.currentVersion}</Badge>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setDetailRow(r)}>Xem</Button>
                      <Button size="sm" variant="primary" icon="ti-pencil" onClick={() => setEditRow(r)}>Edit</Button>
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
              background: 'var(--paper-raised)',
              borderRadius: 10,
              border: '1px solid var(--line)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <Badge tone="blue">Level {r.level}</Badge>
                {r.isInherited ? (
                  <Badge tone="amber">Inherited</Badge>
                ) : (
                  <Badge tone="sage">Own · {r.currentVersion}</Badge>
                )}
              </div>

              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.4 }} title={positionLabel(r)}>
                {positionLabel(r)}
              </div>

              <div style={{ background: 'var(--paper-sunken)', padding: '8px 10px', borderRadius: 6, fontSize: 12, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span>Learners studying: <strong>{r.headcount}</strong></span>
                <span style={{ color: 'var(--blue, #005BAA)', fontWeight: 700 }}>{r.courseCount} courses</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 6 }}>
              <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setDetailRow(r)}>Xem</Button>
              <Button size="sm" variant="primary" icon="ti-pencil" onClick={() => setEditRow(r)}>Edit</Button>
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
            <h1>Level Roadmap Directory</h1>
            <Badge tone="blue">{directoryRows.length} Roadmap</Badge>
          </div>
          <p>
            Every learning roadmap by Job Level × Position (Division / Department / Section-Counter) that learners actually
            occupy — filter/group to find one fast, click &quot;View&quot; to see all its courses, &quot;Edit&quot; to change it
            (a new version is created automatically, leaving completed/in-progress learners untouched).
          </p>
        </div>
        <Button variant="primary" icon="ti-plus" onClick={() => setCreateOpen(true)}>Create A New Roadmap</Button>
      </div>

      {/* STANDARDIZED FILTER TOOLBAR CARD */}
      <div className="card card-pad" style={{ marginBottom: 18, background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
        {/* ROW 1: SEARCH, GROUP BY, FILTER TOGGLE, VIEW MODE */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: 240 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
              placeholder="Search by position name, level, unit..."
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
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Group by:</span>
              <select
                value={groupBy}
                onChange={(e) => { setGroupBy(e.target.value); setCollapsedGroups(new Set()); }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
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
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span style={{ background: 'var(--paper-raised)', color: 'var(--rail, #005BAA)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
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
                title="List View"
              >
                <i className="ti ti-list" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`btn btn-sm ${viewMode === 'GRID' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                title="Grid View"
              >
                <i className="ti ti-layout-grid" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: COLLAPSIBLE FILTER PANEL WITH TOP LABELS */}
        {showFilters && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {/* Filter 1: Business Unit */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Business Unit
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: filterBuId !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: filterBuId !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: filterBuId !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: filterBuId !== 'ALL' ? 700 : 500,
                  }}
                  value={filterBuId}
                  onChange={(e) => setFilterBuId(e.target.value)}
                >
                  <option value="ALL">All Division ({SCOPE_BUSINESS_UNITS.length})</option>
                  {SCOPE_BUSINESS_UNITS.map((bu) => (
                    <option key={bu.id} value={bu.id}>{bu.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Division */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Division
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: filterDivisionId !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: filterDivisionId !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: filterDivisionId !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: filterDivisionId !== 'ALL' ? 700 : 500,
                  }}
                  value={filterDivisionId}
                  onChange={(e) => handleDivisionFilterChange(e.target.value)}
                >
                  <option value="ALL">All Division ({divisions.length})</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter 3: Department */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Parent Department
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: filterDepartmentId !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: filterDepartmentId !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: filterDepartmentId !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: filterDepartmentId !== 'ALL' ? 700 : 500,
                  }}
                  value={filterDepartmentId}
                  onChange={(e) => setFilterDepartmentId(e.target.value)}
                >
                  <option value="ALL">
                    {filterDivisionId !== 'ALL' ? `All Departments (${departmentFilterOptions.length})` : `All Departments (${departments.length})`}
                  </option>
                  {departmentFilterOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Job Level */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Job Level
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: filterLevel !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: filterLevel !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: filterLevel !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: filterLevel !== 'ALL' ? 700 : 500,
                  }}
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                >
                  <option value="ALL">All levels (7 levels)</option>
                  {[...LEVEL_DEFINITIONS].map((def) => (
                    <option key={def.level} value={def.level}>
                      Level {def.level} — {def.titleVi || def.shortVi}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 5: Roadmap Status */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Roadmap Status
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: filterStatus !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: filterStatus !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: filterStatus !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: filterStatus !== 'ALL' ? 700 : 500,
                  }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">All statuses</option>
                  <option value="CUSTOM">Own roadmap (customized)</option>
                  <option value="INHERITED">Inherited from the parent</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE FILTER TAGS & RESET BAR */}
        {(search || activeFiltersCount > 0 || groupBy !== 'DIVISION') && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Filtering by:</span>

              {search && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Search term: <strong>"{search}"</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                </span>
              )}

              {filterBuId !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Division: <strong>{SCOPE_BUSINESS_UNITS.find(b => b.id === filterBuId)?.name}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFilterBuId('ALL')} />
                </span>
              )}

              {filterDivisionId !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Division: <strong>{labelForDivision(filterDivisionId)}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFilterDivisionId('ALL')} />
                </span>
              )}

              {filterDepartmentId !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Department: <strong>{labelForDepartment(filterDepartmentId)}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFilterDepartmentId('ALL')} />
                </span>
              )}

              {filterLevel !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Job level: <strong>Level {filterLevel}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFilterLevel('ALL')} />
                </span>
              )}

              {filterStatus !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Status: <strong>{filterStatus === 'CUSTOM' ? 'Own roadmap' : 'Inherited'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('ALL')} />
                </span>
              )}

              {groupBy !== 'DIVISION' && (
                <span className="badge" style={{ background: 'var(--paper-sunken)', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Group by: <strong>{ROADMAP_GROUP_BY_OPTIONS.find(o => o.id === groupBy)?.label}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setGroupBy('DIVISION')} />
                </span>
              )}

              <button
                type="button"
                onClick={resetAllFilters}
                style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
              >
                Clear all filters
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Found <strong>{filteredRows.length}</strong> / {directoryRows.length} level roadmaps
            </div>
          </div>
        )}
      </div>

      {/* CONTENT: RENDER GROUPED OR FLAT LIST */}
      {filteredRows.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--paper-raised)', padding: 40, borderRadius: 10, border: '1px solid var(--line)' }}>
          <i className="ti ti-stairs-up" aria-hidden="true" style={{ fontSize: 36, color: 'var(--ink-faint)' }} />
          <p style={{ marginTop: 10, color: 'var(--ink-soft)' }}>
            No position or level roadmap matches the current filters.
          </p>
          <div style={{ marginTop: 14 }}>
            <Button size="sm" variant="outline" onClick={resetAllFilters}>Clear Filters</Button>
          </div>
        </div>
      ) : groupBy === 'NONE' || !groups ? (
        viewMode === 'TABLE' ? renderTable(filteredRows) : renderGrid(filteredRows)
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map((g) => {
            const isCollapsed = collapsedGroups.has(g.key);
            return (
              <div key={g.key} className="card" style={{ overflow: 'hidden', background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
                <button
                  onClick={() => toggleCollapsed(g.key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 18px',
                    background: 'var(--paper-sunken)',
                    border: 'none',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ color: 'var(--ink-faint)' }} />
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue-soft)', color: 'var(--blue, #005BAA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${g.icon}`} style={{ fontSize: 16 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{g.label}</div>
                  <Badge tone="slate">{g.rows.length} roadmaps</Badge>
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

      {/* MODAL: VIEW DETAILS (READ-ONLY) */}
      <Modal isOpen={Boolean(detailRow)} onClose={() => setDetailRow(null)} title="Roadmap Details" subtitle={detailRow ? positionLabel(detailRow) + ` · Level ${detailRow.level}` : ''} size="lg">
        {detailRow && (() => {
          const entry = roadmapsConfig[detailRow.resolvedScopeKey];
          const courseIds = entry?.courseIds || [];
          const milestones = courseIds.map((id) => courses.find((c) => c.id === id)).filter(Boolean).map((course, idx) => ({ course, status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED', completed: false }));
          return (
            <div>
              {detailRow.isInherited && (
                <div style={{ fontSize: 12, background: 'var(--paper-sunken)', padding: '8px 12px', borderRadius: 6, marginBottom: 14 }}>
                  This position has no roadmap of its own — it is <strong>inherited</strong> from: <strong>{scopeBreadcrumb(detailRow.resolvedScopeKey)}</strong>.
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                <Badge tone="blue">{courseIds.length} courses</Badge>
                {entry?.currentVersion && <Badge tone="sage">Version {entry.currentVersion}</Badge>}
              </div>
              <VisualRoadmapTimeline milestones={milestones} />
              {entry?.versionHistory?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Version History</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entry.versionHistory.map((h, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6 }}>
                        <strong>{h.version}</strong> · {h.updatedBy} · {h.updatedAt} — {h.note}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <Button variant="outline" onClick={() => setDetailRow(null)}>Close</Button>
                <Button variant="primary" icon="ti-pencil" onClick={() => { setEditRow(detailRow); setDetailRow(null); }}>Edit</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL: EDIT */}
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

      {/* MODAL: CREATE A NEW ROADMAP */}
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

      {/* MODAL: CUSTOMIZE THE ROADMAP MILESTONE IMAGE */}
      {imageModalCourse && (
        <Modal isOpen={Boolean(imageModalCourse)} onClose={() => setImageModalCourse(null)} title="Customize The Roadmap Milestone Image" subtitle={imageModalCourse.title} size="lg">
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
            <Button variant="outline" onClick={() => setImageModalCourse(null)}>Cancel</Button>
            <Button variant="primary" icon="ti-check" onClick={() => handleSaveMilestoneImage(customImageUrl)}>Save The Milestone Image</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

/** Edit modal: the scope is fixed by `row`, seeding the list from the roadmap in effect (inherited or its own). */
function EditRoadmapModal({ row, courses, roadmapsConfig, onClose, onCustomizeImage, onSave }) {
  const [courseIds, setCourseIds] = useState(() => {
    const pseudoUser = { branch: branchForBuId(row.buId), divisionId: row.divisionId, departmentId: row.departmentId, subDepartmentId: row.subDepartmentId };
    return getRoadmapForScope(roadmapsConfig, pseudoUser, row.level).courseIds;
  });
  const [note, setNote] = useState('');

  return (
    <Modal isOpen onClose={onClose} title="Edit Roadmap" subtitle={positionLabel(row) + ` · Level ${row.level}`} size="lg">
      {row.isInherited && (
        <div style={{ fontSize: 12, background: 'var(--paper-sunken)', padding: '8px 12px', borderRadius: 6, marginBottom: 14 }}>
          This position currently inherits its roadmap from a parent level. Saving will create a roadmap <strong>own</strong> for this exact position,
          starting from the inherited list.
        </div>
      )}
      <CourseListEditor courseIds={courseIds} onChange={setCourseIds} courses={courses} onCustomizeImage={onCustomizeImage} />
      <div style={{ marginTop: 16 }}>
        <label className="field-label">Change note (optional)</label>
        <input type="text" className="field-input" style={{ width: '100%' }} placeholder="E.g. Added the newly issued Food Safety course..." value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, lineHeight: 1.5 }}>
        Saving automatically publishes a new version — learners who completed or are part-way through this roadmap keep seeing the
        content they started with; only learners who have never joined see this new list.
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon="ti-check" onClick={() => onSave(courseIds, note)}>Save Changes</Button>
      </div>
    </Modal>
  );
}

/** Create modal: the admin picks the Level + BU/Division/Department/Sub-Department. */
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
      setError('This roadmap already exists — use "Edit" in the Roadmap Directory instead of creating a new one.');
      return;
    }
    if (courseIds.length === 0) {
      setError('Please add at least 1 course to the new roadmap.');
      return;
    }
    onCreate(scopeKey, courseIds, note);
  }

  return (
    <Modal isOpen onClose={onClose} title="Create A New Roadmap" subtitle="Choose the job level and the organizational position (Division / Department / Section-Counter), then add courses." size="lg">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>Business Unit</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {SCOPE_BUSINESS_UNITS.map((bu) => (
              <button key={bu.id} onClick={() => setBuId(bu.id)} className="btn btn-sm" style={{ background: buId === bu.id ? 'var(--rail, #005BAA)' : 'var(--paper-raised)', color: buId === bu.id ? '#fff' : 'var(--ink)', borderColor: buId === bu.id ? 'var(--rail)' : 'var(--line-strong)' }}>{bu.name}</button>
            ))}
          </div>
        </div>
        <div style={{ minWidth: 180 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Division</div>
          <select className="field-select" style={{ width: '100%', height: 34, fontSize: 13 }} value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setDepartmentId(''); setSubDepartmentId(''); }}>
            <option value="">— Whole Business Unit —</option>
            {divisions.map((d) => (<option key={d.id} value={d.id}>{d.code} · {d.name}</option>))}
          </select>
        </div>
        <div style={{ minWidth: 180 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Department</div>
          <select className="field-select" style={{ width: '100%', height: 34, fontSize: 13 }} value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setSubDepartmentId(''); }} disabled={!divisionId}>
            <option value="">{divisionId ? '— Whole Division —' : 'Choose a division first'}</option>
            {departmentOptions.map((d) => (<option key={d.id} value={d.id}>{d.code} · {d.name}</option>))}
          </select>
        </div>
        <div style={{ minWidth: 200 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Sub-Department</div>
          <select className="field-select" style={{ width: '100%', height: 34, fontSize: 13 }} value={subDepartmentId} onChange={(e) => setSubDepartmentId(e.target.value)} disabled={!departmentId || subDepartmentOptions.length === 0}>
            <option value="">{!departmentId ? 'Choose a department first' : subDepartmentOptions.length === 0 ? 'No child section/counter' : '— Whole Department —'}</option>
            {subDepartmentOptions.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="field-label" style={{ marginBottom: 6 }}>Job Level</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {LEVEL_DEFINITIONS.map((lvl) => (
            <button key={lvl.level} onClick={() => setLevel(lvl.level)} className="btn btn-sm" style={{ background: level === lvl.level ? 'var(--rail, #005BAA)' : 'var(--paper-raised)', color: level === lvl.level ? '#fff' : 'var(--ink)', borderColor: level === lvl.level ? 'var(--rail)' : 'var(--line-strong)' }}>{lvl.emoji} Level {lvl.level}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, marginBottom: 14, padding: '8px 12px', borderRadius: 6, background: alreadyExists ? 'var(--rust-soft)' : 'var(--paper-sunken)', color: alreadyExists ? 'var(--rust-soft-text)' : 'var(--ink-soft)' }}>
        Position: <strong>{scopeBreadcrumb(scopeKey)}</strong>
        {alreadyExists && ' — this roadmap already exists; use "Edit" instead of creating a new one.'}
      </div>

      <CourseListEditor courseIds={courseIds} onChange={setCourseIds} courses={courses} />

      <div style={{ marginTop: 16 }}>
        <label className="field-label">Note (optional)</label>
        <input type="text" className="field-input" style={{ width: '100%' }} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && <div style={{ color: 'var(--rust)', fontSize: 12, marginTop: 10 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon="ti-plus" onClick={handleCreate}>Create Roadmap</Button>
      </div>
    </Modal>
  );
}
