import React, { useState, useMemo } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button } from '../common/ui';
import {
  ASSIGNMENT_TYPES,
  assignmentTypeLabel,
  targetOptionsFor,
  getCascadingTargetOptions,
  businessUnits,
  divisions,
  departments,
  subDepartments,
  jobLevels,
  retailStores,
} from '../../data/assignmentTargets';
import {
  getCourseTargetLevels,
  evaluateUserEligibilityForCourse,
  evaluateGroupEligibilityForCourse,
} from '../../data/levelSystem';

export default function MultiTargetAssigner({
  course = null,
  curriculum = null,
  onSave,
  onCancel,
  isHrbp = false,
  initialAssignType = 'DIVISION',
  saveButtonLabel = null,
}) {
  // Cascading Scope & Filter States
  const [assignScope, setAssignScope] = useState(initialAssignType); // 'BUSINESS_UNIT' | 'DIVISION' | 'DEPARTMENT' | 'SUBDEPARTMENT' | 'LEVEL' | 'STORE' | 'USER' | 'GROUP'
  const [buFilter, setBuFilter] = useState('ALL');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [subDeptFilter, setSubDeptFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [storeFilter, setStoreFilter] = useState('ALL');

  const [selectedIds, setSelectedIds] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [justification, setJustification] = useState('');
  const [search, setSearch] = useState('');
  const [strictLevelFilter, setStrictLevelFilter] = useState(true);
  const [groupPolicy, setGroupPolicy] = useState('ELIGIBLE_ONLY'); // 'ELIGIBLE_ONLY' | 'ALL_MEMBERS'
  const [validationError, setValidationError] = useState('');

  const { customGroups = [], users = [] } = useCourseStore();

  // Target Levels of the course / curriculum
  const courseTargetLevels = useMemo(() => {
    if (course) return getCourseTargetLevels(course);
    if (curriculum && curriculum.targetLevels) return curriculum.targetLevels;
    return [];
  }, [course, curriculum]);

  const lowestCourseLevel = useMemo(() => {
    if (courseTargetLevels.length === 0) return null;
    return String(Math.max(...courseTargetLevels.map(Number)));
  }, [courseTargetLevels]);

  // Dependent divisions based on BU
  const availableDivisions = useMemo(() => {
    if (buFilter === 'ALL') return divisions;
    return divisions.filter((d) => d.businessUnitId === buFilter);
  }, [buFilter]);

  // Dependent departments based on chosen Division & BU
  const availableDepts = useMemo(() => {
    return departments.filter((d) => {
      if (divisionFilter !== 'ALL') return d.divisionId === divisionFilter;
      if (buFilter !== 'ALL') {
        const div = divisions.find((di) => di.id === d.divisionId);
        return div && div.businessUnitId === buFilter;
      }
      return true;
    });
  }, [divisionFilter, buFilter]);

  // Dependent sub-departments based on chosen Department, Division & BU
  const availableSubDepts = useMemo(() => {
    return subDepartments.filter((s) => {
      if (deptFilter !== 'ALL') return s.departmentId === deptFilter;
      if (divisionFilter !== 'ALL') {
        const parentDept = departments.find((d) => d.id === s.departmentId);
        return parentDept && parentDept.divisionId === divisionFilter;
      }
      if (buFilter !== 'ALL') {
        const parentDept = departments.find((d) => d.id === s.departmentId);
        const parentDiv = parentDept && divisions.find((di) => di.id === parentDept.divisionId);
        return parentDiv && parentDiv.businessUnitId === buFilter;
      }
      return true;
    });
  }, [deptFilter, divisionFilter, buFilter]);

  // Dynamically resolve target options based on active Scope & Cascading filters
  const visibleOptions = useMemo(() => {
    const raw = getCascadingTargetOptions({
      scope: assignScope,
      buFilter,
      divisionFilter,
      deptFilter,
      subDeptFilter,
      levelFilter,
      storeFilter,
      search,
      customGroups,
      usersList: users,
    });

    if (assignScope === 'USER' && strictLevelFilter && course) {
      return raw.filter((u) => {
        const evalRes = evaluateUserEligibilityForCourse(u, course);
        return evalRes.canAssign;
      });
    }

    return raw;
  }, [
    assignScope,
    buFilter,
    divisionFilter,
    deptFilter,
    subDeptFilter,
    levelFilter,
    storeFilter,
    search,
    customGroups,
    users,
    strictLevelFilter,
    course,
  ]);

  // Scope switcher: reset child filters & selections cleanly
  function handleScopeChange(nextScope) {
    setAssignScope(nextScope);
    setBuFilter('ALL');
    setDivisionFilter('ALL');
    setDeptFilter('ALL');
    setSubDeptFilter('ALL');
    setLevelFilter('ALL');
    setStoreFilter('ALL');
    setSelectedIds([]);
    setSearch('');
    setValidationError('');
  }

  function handleBuFilterChange(buId) {
    setBuFilter(buId);
    setDivisionFilter('ALL');
    setDeptFilter('ALL');
    setSubDeptFilter('ALL');
    setSelectedIds([]);
    setValidationError('');
  }

  function handleDivisionFilterChange(divId) {
    setDivisionFilter(divId);
    if (divId !== 'ALL') {
      const div = divisions.find((d) => d.id === divId);
      if (div && div.businessUnitId) setBuFilter(div.businessUnitId);
    }
    setDeptFilter('ALL');
    setSubDeptFilter('ALL');
    setSelectedIds([]);
    setValidationError('');
  }

  function handleDeptFilterChange(deptId) {
    setDeptFilter(deptId);
    if (deptId !== 'ALL') {
      const dept = departments.find((d) => d.id === deptId);
      if (dept && dept.divisionId) {
        setDivisionFilter(dept.divisionId);
        const div = divisions.find((d) => d.id === dept.divisionId);
        if (div && div.businessUnitId) setBuFilter(div.businessUnitId);
      }
    }
    setSubDeptFilter('ALL');
    setSelectedIds([]);
    setValidationError('');
  }

  function handleSubDeptFilterChange(subId) {
    setSubDeptFilter(subId);
    if (subId !== 'ALL') {
      const sub = subDepartments.find((s) => s.id === subId);
      if (sub && sub.departmentId) {
        setDeptFilter(sub.departmentId);
        const dept = departments.find((d) => d.id === sub.departmentId);
        if (dept && dept.divisionId) {
          setDivisionFilter(dept.divisionId);
          const div = divisions.find((d) => d.id === dept.divisionId);
          if (div && div.businessUnitId) setBuFilter(div.businessUnitId);
        }
      }
    }
    setSelectedIds([]);
    setValidationError('');
  }

  function toggleId(id) {
    setValidationError('');
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setValidationError('');
    setSelectedIds(visibleOptions.map((o) => o.id));
  }

  function clearAll() {
    setValidationError('');
    setSelectedIds([]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setValidationError('');

    // Validate individual users if selected
    if (assignScope === 'USER' && course) {
      const invalidUsers = selectedIds
        .map((id) => {
          const u = visibleOptions.find((o) => o.id === id);
          const evalRes = u ? evaluateUserEligibilityForCourse(u, course) : null;
          return { user: u, eval: evalRes };
        })
        .filter((item) => item.eval && !item.eval.canAssign);

      if (invalidUsers.length > 0 && strictLevelFilter) {
        setValidationError(
          `🚫 Không thể phân bổ: Có ${invalidUsers.length} nhân sự (${invalidUsers.map((i) => `${i.user.fullName} - Lvl ${i.user.level}`).join(', ')}) không đủ điều kiện cấp bậc so với định biên khóa học (Level ${lowestCourseLevel}). Vui lòng bỏ chọn các nhân sự này hoặc tắt Bộ Lọc Nghiêm Ngặt.`
        );
        return;
      }
    }

    const targets = selectedIds.map((id) => {
      const opt = visibleOptions.find((o) => o.id === id);
      return {
        targetId: id,
        targetLabel: opt ? opt.label : id,
      };
    });

    onSave({
      assignmentType: assignScope,
      targets,
      dueDate,
      justification,
      groupPolicy,
      assignedLevelEligibility: {
        courseTargetLevels,
        lowestCourseLevel,
        strictLevelFilter,
      },
    });
  }

  // Define the cascading scopes list
  const SCOPE_BUTTONS = [
    { id: 'BUSINESS_UNIT', label: '0. Toàn Cty (BU)', icon: 'ti-building-skyscraper' },
    { id: 'DIVISION', label: '1. Khối (Division)', icon: 'ti-building' },
    { id: 'DEPARTMENT', label: '2. Phòng Ban (Dept)', icon: 'ti-building-community' },
    { id: 'SUBDEPARTMENT', label: '3. Sub-Dept (Bộ Phận)', icon: 'ti-git-branch' },
    { id: 'LEVEL', label: '4. Cấp Bậc (Level)', icon: 'ti-stairs-up' },
    { id: 'STORE', label: '5. Chi Nhánh / Siêu Thị', icon: 'ti-map-pin' },
    { id: 'USER', label: '6. Từng Nhân Sự (User)', icon: 'ti-user' },
    { id: 'GROUP', label: '👥 Nhóm Tùy Chỉnh', icon: 'ti-users-group' },
  ];

  return (
    <div className="card card-pad" style={{ background: 'var(--paper-sunken)', marginBottom: 16, border: '1px solid var(--line-strong)' }}>
      {/* Header */}
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, color: isHrbp ? '#0369A1' : 'var(--rail)' }}>
        <i className={isHrbp ? 'ti ti-send' : 'ti-sitemap'} />
        {isHrbp ? 'Đề Xuất Phân Bổ Phân Tầng (Gửi Lên User Admin Phê Duyệt)' : 'Phân Bổ Phân Tầng Theo Cơ Cấu Tổ Chức (Cascading Drill-Down)'}
      </div>

      {/* Course Target Level Banner */}
      {courseTargetLevels.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            marginBottom: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <div style={{ fontSize: 12, color: '#1E40AF' }}>
              <strong>Định Biên Cấp Bậc: {courseTargetLevels.map((l) => `Level ${l}`).join(', ')}</strong> — Nhân sự Level 1..${lowestCourseLevel} đủ điều kiện học tự do.
            </div>
          </div>
          <Badge tone="blue" size="sm">Định Biên: Lvl {courseTargetLevels.join(' & ')}</Badge>
        </div>
      )}

      {/* Validation Error Alert */}
      {validationError && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            fontSize: 12.5,
            fontWeight: 600,
            marginBottom: 12,
            lineHeight: 1.4,
          }}
        >
          <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
          {validationError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* STEP 1: CASCADING SCOPE SELECTION TABS */}
        <div style={{ marginBottom: 12 }}>
          <label className="field-label" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
            Chọn Cấp Độ Phân Bổ Mục Tiêu (Dừng ở cấp nào &rarr; Gán đối tượng ở cấp đó):
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SCOPE_BUTTONS.map((btn) => {
              const active = assignScope === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => handleScopeChange(btn.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 500,
                    border: active ? '1.5px solid var(--rail, #007A38)' : '1px solid var(--line)',
                    background: active ? 'var(--rail-soft, #ECFDF5)' : '#fff',
                    color: active ? 'var(--rail, #007A38)' : 'var(--ink)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i className={btn.icon} />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: CONDITIONALLY RENDERED CASCADING FILTERS ACCORDING TO ACTIVE SCOPE */}

        {/* Case A1: DIVISION Scope Filter (BU Filter for multiple BU scalability) */}
        {assignScope === 'DIVISION' && (
          <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-filter" style={{ color: 'var(--blue)' }} />
              <span>Bộ Lọc Doanh Nghiệp / BU (Filter by Business Unit):</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                (Chọn BU để lọc danh sách các Khối trực thuộc)
              </span>
            </div>
            <div style={{ maxWidth: 450 }}>
              <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                🏢 Chọn Business Unit (BU)
              </label>
              <select
                className="field-select"
                style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: buFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                value={buFilter}
                onChange={(e) => handleBuFilterChange(e.target.value)}
              >
                <option value="ALL">-- Tất Cả Business Unit ({businessUnits.length}) --</option>
                {businessUnits.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.code || 'BU'}] {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Case A2: DEPARTMENT Scope Filter (BU & Division Filters) */}
        {assignScope === 'DEPARTMENT' && (
          <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-filter" style={{ color: 'var(--blue)' }} />
              <span>Bộ Lọc Phân Tầng Cấp Trên (Cascading Filters):</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                (Chọn Khối sẽ tự động link sang BU cha tương ứng)
              </span>
            </div>
            <div className="grid grid-2" style={{ gap: 10 }}>
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏢 1. Business Unit (BU)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: buFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={buFilter}
                  onChange={(e) => handleBuFilterChange(e.target.value)}
                >
                  <option value="ALL">-- Tất Cả Business Unit ({businessUnits.length}) --</option>
                  {businessUnits.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.code || 'BU'}] {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏢 2. Khối (Division)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: divisionFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={divisionFilter}
                  onChange={(e) => handleDivisionFilterChange(e.target.value)}
                >
                  <option value="ALL">-- Tất Cả Khối ({availableDivisions.length}) --</option>
                  {availableDivisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Case B: SUBDEPARTMENT Scope Filters (BU, Division & Department Filters) */}
        {assignScope === 'SUBDEPARTMENT' && (
          <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-filter" style={{ color: 'var(--blue)' }} />
              <span>Bộ Lọc Phân Tầng Cấp Trên (Cascading Filters):</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                (Chọn Phòng ban sẽ tự động nhận diện Khối và BU cha)
              </span>
            </div>
            <div className="grid grid-3" style={{ gap: 10 }}>
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏢 1. Business Unit (BU)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: buFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={buFilter}
                  onChange={(e) => handleBuFilterChange(e.target.value)}
                >
                  <option value="ALL">-- Tất Cả Business Unit ({businessUnits.length}) --</option>
                  {businessUnits.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.code || 'BU'}] {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏢 2. Khối (Division)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: divisionFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={divisionFilter}
                  onChange={(e) => handleDivisionFilterChange(e.target.value)}
                >
                  <option value="ALL">-- Tất Cả Khối ({availableDivisions.length}) --</option>
                  {availableDivisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏛️ 3. Phòng Ban (Department)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: deptFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={deptFilter}
                  onChange={(e) => handleDeptFilterChange(e.target.value)}
                >
                  <option value="ALL">-- Tất Cả Phòng Ban ({availableDepts.length}) --</option>
                  {availableDepts.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Case C: USER Scope Filters (Full Cascading Multi-Filter Matrix with BU) */}
        {assignScope === 'USER' && (
          <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-filter" style={{ color: 'var(--blue)' }} />
              <span>Bộ Lọc Nhân Sự Phân Tầng Liên Hoàn (Cascading User Filters):</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                (Tự động liên kết 2 chiều BU &rarr; Khối &rarr; Phòng Ban &rarr; Sub-Dept)
              </span>
            </div>

            <div className="grid grid-4" style={{ gap: 10, marginBottom: 8 }}>
              {/* BU Filter */}
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏢 1. BU
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: buFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={buFilter}
                  onChange={(e) => handleBuFilterChange(e.target.value)}
                >
                  <option value="ALL">-- Tất Cả BU ({businessUnits.length}) --</option>
                  {businessUnits.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.code || 'BU'}] {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Division Filter */}
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏢 2. Khối (Division)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: divisionFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={divisionFilter}
                  onChange={(e) => handleDivisionFilterChange(e.target.value)}
                >
                  <option value="ALL">-- Tất Cả Khối ({availableDivisions.length}) --</option>
                  {availableDivisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏛️ 3. Phòng Ban (Department)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: deptFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={deptFilter}
                  onChange={(e) => handleDeptFilterChange(e.target.value)}
                >
                  <option value="ALL">-- Tất Cả Phòng Ban ({availableDepts.length}) --</option>
                  {availableDepts.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Department Filter */}
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🌿 4. Sub-Dept (Bộ phận)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: subDeptFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={subDeptFilter}
                  onChange={(e) => handleSubDeptFilterChange(e.target.value)}
                >
                  <option value="ALL">-- Tất Cả Sub-Dept ({availableSubDepts.length}) --</option>
                  {availableSubDepts.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: 10 }}>
              {/* Job Level Filter */}
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🎯 5. Cấp Bậc (Job Level)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: levelFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)' }}
                  value={levelFilter}
                  onChange={(e) => {
                    setLevelFilter(e.target.value);
                    setSelectedIds([]);
                  }}
                >
                  <option value="ALL">-- Tất Cả Cấp Bậc (Level 1 - 7) --</option>
                  {jobLevels.map((l) => (
                    <option key={l.level} value={String(l.level)}>
                      Level {l.level} — {l.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location / Store Filter */}
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  📍 6. Chi Nhánh / Siêu Thị (Location)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 11.5, height: 32, width: '100%', borderColor: storeFilter !== 'ALL' ? 'var(--amber)' : 'var(--line)' }}
                  value={storeFilter}
                  onChange={(e) => {
                    setStoreFilter(e.target.value);
                    setSelectedIds([]);
                  }}
                >
                  <option value="ALL">-- Tất Cả Chi Nhánh ({retailStores.length}) --</option>
                  {retailStores.map((st) => (
                    <option key={st.id} value={st.id}>
                      [{st.code}] {st.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* GUIDANCE / STOPPING LEVEL BANNER */}
        <div style={{ padding: '8px 12px', background: '#F8FAFC', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink)' }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <span>
              Đang dừng &amp; hiển thị danh sách để gán ở cấp: <strong>{assignmentTypeLabel(assignScope)}</strong>
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
            {visibleOptions.length} mục khả dụng theo bộ lọc
          </span>
        </div>

        {/* USER: Strict Level Filter Toggle */}
        {assignScope === 'USER' && course && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--line)', flexWrap: 'wrap', gap: 6 }}>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700, color: strictLevelFilter ? '#1D4ED8' : 'var(--ink)' }}>
              <input
                type="checkbox"
                checked={strictLevelFilter}
                onChange={(e) => setStrictLevelFilter(e.target.checked)}
                style={{ accentColor: '#1D4ED8' }}
              />
              <span>🛡️ Bộ Lọc Cấp Bậc Nghiêm Ngặt (Ẩn nhân sự không đủ cấp bậc)</span>
            </label>
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
              Đủ điều kiện: Level 1..${lowestCourseLevel} {Number(lowestCourseLevel) < 7 ? `& Level ${Number(lowestCourseLevel) + 1} (Vượt 1 cấp)` : ''}
            </span>
          </div>
        )}

        {/* GROUP: Member Breakdown & Policy Selector */}
        {assignScope === 'GROUP' && course && (
          <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              Chính Sách Phân Bổ Thành Viên Trong Nhóm (Group Policy):
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="groupPolicy"
                  checked={groupPolicy === 'ELIGIBLE_ONLY'}
                  onChange={() => setGroupPolicy('ELIGIBLE_ONLY')}
                />
                <span>🟢 <strong>Chỉ gán cho thành viên đủ cấp bậc</strong> (Tự động lọc bỏ thành viên lệch &ge; 2 cấp - Khuyến nghị)</span>
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="groupPolicy"
                  checked={groupPolicy === 'ALL_MEMBERS'}
                  onChange={() => setGroupPolicy('ALL_MEMBERS')}
                />
                <span>🟡 <strong>Gán toàn bộ nhóm</strong> (Bao gồm thành viên lệch cấp - Admin Override)</span>
              </label>
            </div>
          </div>
        )}

        {/* Quick Search */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: 9, color: 'var(--ink-faint)', fontSize: 13 }} />
            <input
              type="text"
              className="field-input"
              style={{ fontSize: 12, height: 34, paddingLeft: 28, width: '100%' }}
              placeholder={`Tìm kiếm nhanh trong ${visibleOptions.length} ${assignmentTypeLabel(assignScope)}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Selection Checklist Box */}
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--line-light)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
              Danh sách lựa chọn ({visibleOptions.length} mục) &middot; <span style={{ color: 'var(--rail, #15803d)' }}>Đã chọn: {selectedIds.length} đối tượng</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={selectAll}
                disabled={visibleOptions.length === 0}
              >
                Chọn tất cả ({visibleOptions.length})
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={clearAll}
                disabled={selectedIds.length === 0}
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {visibleOptions.map((opt) => {
              const checked = selectedIds.includes(opt.id);

              if (assignScope === 'USER') {
                const evalRes = evaluateUserEligibilityForCourse(opt, course);
                const isBlocked = course && !evalRes.canAssign;

                let tone = 'rail';
                let tagText = `Lv ${opt.level || '7'}`;
                if (course) {
                  if (evalRes.matchType === 'EXACT_MATCH') {
                    tone = 'sage';
                    tagText = `✅ Lvl ${opt.level} (Đúng cấp)`;
                  } else if (evalRes.matchType === 'HIGHER_LEVEL') {
                    tone = 'blue';
                    tagText = `👑 Lvl ${opt.level} (Cấp cao hơn)`;
                  } else if (evalRes.matchType === 'GAP_ONE_STEP') {
                    tone = 'amber';
                    tagText = `⚠️ Lvl ${opt.level} (Vượt 1 cấp)`;
                  } else {
                    tone = 'crimson';
                    tagText = `🚫 Lvl ${opt.level} (Lệch ${evalRes.gap} cấp)`;
                  }
                }

                return (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 6,
                      background: checked ? (isBlocked ? '#FEF2F2' : 'var(--rail-soft, #f0fdf4)') : (isBlocked ? '#FFF1F2' : 'transparent'),
                      border: checked ? (isBlocked ? '1px solid #FECACA' : '1px solid #bbf7d0') : '1px solid transparent',
                      cursor: isBlocked && strictLevelFilter ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      userSelect: 'none',
                      opacity: isBlocked && strictLevelFilter ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isBlocked && strictLevelFilter}
                      onChange={() => toggleId(opt.id)}
                      style={{ cursor: isBlocked && strictLevelFilter ? 'not-allowed' : 'pointer', accentColor: isBlocked ? '#E11D48' : 'var(--rail)' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--ink)' }}>
                        {opt.avatar || (opt.fullName ? opt.fullName.slice(0, 2).toUpperCase() : 'NV')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{opt.fullName || opt.label}</span>
                        <span style={{ color: 'var(--ink-faint)', marginLeft: 6, fontSize: 11 }}>({opt.employeeCode || opt.id})</span>
                        <span style={{ color: 'var(--ink-soft)', marginLeft: 6, fontSize: 11 }}>· {opt.subtitle || opt.subDepartmentName || opt.departmentName || opt.position || ''}</span>
                      </div>
                      <Badge tone={tone} size="sm">{tagText}</Badge>
                    </div>
                  </label>
                );
              }

              if (assignScope === 'GROUP') {
                const grp = customGroups.find((g) => g.id === opt.id);
                const groupEval = grp && course ? evaluateGroupEligibilityForCourse(grp, course, users) : null;

                return (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 6,
                      background: checked ? 'var(--rail-soft, #f0fdf4)' : 'transparent',
                      border: checked ? '1px solid #bbf7d0' : '1px solid transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleId(opt.id)}
                      style={{ cursor: 'pointer', accentColor: 'var(--rail)' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                      <div>
                        <span style={{ fontWeight: checked ? 600 : 400, color: 'var(--ink)' }}>
                          {opt.label}
                        </span>
                        {opt.subtitle && (
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{opt.subtitle}</div>
                        )}
                      </div>
                      {groupEval && (
                        <span style={{ fontSize: 11.5, color: groupEval.ineligibleCount > 0 ? '#B45309' : '#15803D', fontWeight: 600 }}>
                          ({groupEval.eligibleCount}/{groupEval.totalMembers} hợp lệ{groupEval.ineligibleCount > 0 ? ` · ⚠️ ${groupEval.ineligibleCount} lệch cấp` : ''})
                        </span>
                      )}
                    </div>
                  </label>
                );
              }

              if (assignScope === 'LEVEL' && courseTargetLevels.length > 0) {
                const lvlStr = String(opt.id);
                const isTarget = courseTargetLevels.includes(lvlStr);
                const isHigher = Number(lvlStr) < Number(lowestCourseLevel);
                const isGap1 = Number(lvlStr) === Number(lowestCourseLevel) + 1;

                let tone = isTarget ? 'sage' : isHigher ? 'blue' : isGap1 ? 'amber' : 'crimson';
                let tag = isTarget ? '✅ Cấp mục tiêu' : isHigher ? '👑 Cấp cao hơn' : isGap1 ? '⚠️ Vượt 1 cấp' : '🚫 Lệch cấp';

                return (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 6,
                      background: checked ? 'var(--rail-soft, #f0fdf4)' : 'transparent',
                      border: checked ? '1px solid #bbf7d0' : '1px solid transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleId(opt.id)}
                      style={{ cursor: 'pointer', accentColor: 'var(--rail)' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                      <div>
                        <span style={{ fontWeight: checked ? 600 : 400, color: 'var(--ink)' }}>
                          {opt.label}
                        </span>
                        {opt.subtitle && (
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{opt.subtitle}</div>
                        )}
                      </div>
                      <Badge tone={tone} size="sm">{tag}</Badge>
                    </div>
                  </label>
                );
              }

              return (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: checked ? 'var(--rail-soft, #f0fdf4)' : 'transparent',
                    border: checked ? '1px solid #bbf7d0' : '1px solid transparent',
                    cursor: 'pointer',
                    fontSize: 12,
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleId(opt.id)}
                    style={{ cursor: 'pointer', accentColor: 'var(--rail)' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                    <div>
                      <span style={{ fontWeight: checked ? 600 : 400, color: 'var(--ink)' }}>
                        {opt.label}
                      </span>
                      {opt.subtitle && (
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{opt.subtitle}</div>
                      )}
                    </div>
                    {opt.badge && (
                      <Badge tone="rail" size="sm">{opt.badge}</Badge>
                    )}
                  </div>
                </label>
              );
            })}
            {visibleOptions.length === 0 && (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12 }}>
                Không có đối tượng nào phù hợp bộ lọc tìm kiếm hoặc tiêu chuẩn cấp bậc.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: 10, marginBottom: 14 }}>
          <div>
            <label className="field-label" style={{ fontSize: 11.5 }}>Hạn hoàn thành (Due Date)</label>
            <input
              type="date"
              className="field-input"
              style={{ fontSize: 12, height: 34, width: '100%' }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" style={{ fontSize: 11.5 }}>Ghi chú / Lý do phân bổ</label>
            <input
              type="text"
              className="field-input"
              style={{ fontSize: 12, height: 34, width: '100%' }}
              placeholder="VD: Đào tạo định kỳ 2026, Chuẩn hóa an toàn..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Hủy
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            icon="ti-check"
            type="submit"
            disabled={selectedIds.length === 0}
          >
            {saveButtonLabel || `Lưu Phân Bổ (${selectedIds.length} đối tượng)`}
          </Button>
        </div>
      </form>
    </div>
  );
}
