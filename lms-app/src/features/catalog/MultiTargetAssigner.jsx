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
import { isInPersonCourse, completionDueDateOf, formatSessionDate } from '../../utils/classSchedule';

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
  // An in-person course carries its own timetable, and attending the last training day IS
  // the completion — so the deadline is read off the schedule instead of being typed twice.
  const scheduleDrivenDueDate = isInPersonCourse(course) ? completionDueDateOf(course) : null;
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
          `🚫 Cannot allocate: ${invalidUsers.length} employees (${invalidUsers.map((i) => `${i.user.fullName} - Lvl ${i.user.level}`).join(', ')}) do not meet the course level requirement (Level ${lowestCourseLevel}). Please deselect them or turn off the Strict Filter.`
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
      dueDate: scheduleDrivenDueDate || dueDate,
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
    { id: 'BUSINESS_UNIT', label: '0. Company-Wide (BU)', icon: 'ti-building-skyscraper' },
    { id: 'DIVISION', label: '1. Division', icon: 'ti-building' },
    { id: 'DEPARTMENT', label: '2. Department (Dept)', icon: 'ti-building-community' },
    { id: 'SUBDEPARTMENT', label: '3. Sub-Dept', icon: 'ti-git-branch' },
    { id: 'LEVEL', label: '4. Job Level', icon: 'ti-stairs-up' },
    { id: 'STORE', label: '5. Branch / Store', icon: 'ti-map-pin' },
    { id: 'USER', label: '6. Individual User', icon: 'ti-user' },
    { id: 'GROUP', label: '👥 Custom Group', icon: 'ti-users-group' },
  ];

  return (
    <div className="card card-pad" style={{ background: 'var(--paper-sunken)', marginBottom: 16, border: '1px solid var(--line-strong)' }}>
      {/* Header */}
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, color: isHrbp ? '#0369A1' : 'var(--rail)' }}>
        <i className={isHrbp ? 'ti ti-send' : 'ti-sitemap'} />
        {isHrbp ? 'Propose A Drill-Down Allocation (Sent To User Admin For Approval)' : 'Cascading Drill-Down Allocation By Org Structure'}
      </div>

      {/* Course Target Level Banner */}
      {courseTargetLevels.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'var(--blue-soft)',
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
            <div style={{ fontSize: 12, color: 'var(--blue-soft-text)' }}>
              <strong>Required Job Level: {courseTargetLevels.map((l) => `Level ${l}`).join(', ')}</strong> — employees at Level 1..${lowestCourseLevel} may enroll freely.
            </div>
          </div>
          <Badge tone="blue" size="sm">Required: Lvl {courseTargetLevels.join(' & ')}</Badge>
        </div>
      )}

      {/* Validation Error Alert */}
      {validationError && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--rust-soft)',
            border: '1px solid #FECACA',
            color: 'var(--rust-soft-text)',
            fontSize: 13,
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
          <label className="field-label" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
            Choose The Target Allocation Level (whichever level you stop at &rarr; assign the audience there):
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
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    border: active ? '1.5px solid var(--rail, #007A38)' : '1px solid var(--line)',
                    background: active ? 'var(--rail-soft, #ECFDF5)' : 'var(--paper-raised)',
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
          <div style={{ padding: '10px 12px', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-filter" style={{ color: 'var(--blue)' }} />
              <span>Filter by Business Unit:</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                (Choose a BU to filter the Divisions below it)
              </span>
            </div>
            <div style={{ maxWidth: 450 }}>
              <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                🏢 Choose Business Unit (BU)
              </label>
              <select
                className="field-select"
                style={{ fontSize: 12, height: 32, width: '100%', borderColor: buFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                value={buFilter}
                onChange={(e) => handleBuFilterChange(e.target.value)}
              >
                <option value="ALL">-- All Business Unit ({businessUnits.length}) --</option>
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
          <div style={{ padding: '10px 12px', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-filter" style={{ color: 'var(--blue)' }} />
              <span>Parent-Level Cascading Filters:</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                (Choosing a Division automatically links to its parent BU)
              </span>
            </div>
            <div className="grid grid-2" style={{ gap: 10 }}>
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏢 1. Business Unit (BU)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 12, height: 32, width: '100%', borderColor: buFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={buFilter}
                  onChange={(e) => handleBuFilterChange(e.target.value)}
                >
                  <option value="ALL">-- All Business Unit ({businessUnits.length}) --</option>
                  {businessUnits.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.code || 'BU'}] {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏢 2. Division
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 12, height: 32, width: '100%', borderColor: divisionFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={divisionFilter}
                  onChange={(e) => handleDivisionFilterChange(e.target.value)}
                >
                  <option value="ALL">-- All Division ({availableDivisions.length}) --</option>
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
          <div style={{ padding: '10px 12px', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-filter" style={{ color: 'var(--blue)' }} />
              <span>Parent-Level Cascading Filters:</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                (Choosing a Department automatically resolves its parent Division and BU)
              </span>
            </div>
            <div className="grid grid-3" style={{ gap: 10 }}>
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏢 1. Business Unit (BU)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 12, height: 32, width: '100%', borderColor: buFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={buFilter}
                  onChange={(e) => handleBuFilterChange(e.target.value)}
                >
                  <option value="ALL">-- All Business Unit ({businessUnits.length}) --</option>
                  {businessUnits.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.code || 'BU'}] {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏢 2. Division
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 12, height: 32, width: '100%', borderColor: divisionFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={divisionFilter}
                  onChange={(e) => handleDivisionFilterChange(e.target.value)}
                >
                  <option value="ALL">-- All Division ({availableDivisions.length}) --</option>
                  {availableDivisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  🏛️ 3. Department
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 12, height: 32, width: '100%', borderColor: deptFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={deptFilter}
                  onChange={(e) => handleDeptFilterChange(e.target.value)}
                >
                  <option value="ALL">-- All Department ({availableDepts.length}) --</option>
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
          <div style={{ padding: '10px 12px', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-filter" style={{ color: 'var(--blue)' }} />
              <span>Cascading User Filters:</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                (Automatically links both ways BU &rarr; Division &rarr; Department &rarr; Sub-Dept)
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
                  style={{ fontSize: 12, height: 32, width: '100%', borderColor: buFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={buFilter}
                  onChange={(e) => handleBuFilterChange(e.target.value)}
                >
                  <option value="ALL">-- All BU ({businessUnits.length}) --</option>
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
                  🏢 2. Division
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 12, height: 32, width: '100%', borderColor: divisionFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={divisionFilter}
                  onChange={(e) => handleDivisionFilterChange(e.target.value)}
                >
                  <option value="ALL">-- All Division ({availableDivisions.length}) --</option>
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
                  🏛️ 3. Department
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 12, height: 32, width: '100%', borderColor: deptFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={deptFilter}
                  onChange={(e) => handleDeptFilterChange(e.target.value)}
                >
                  <option value="ALL">-- All Department ({availableDepts.length}) --</option>
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
                  🌿 4. Sub-Dept
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 12, height: 32, width: '100%', borderColor: subDeptFilter !== 'ALL' ? 'var(--rail)' : 'var(--line)' }}
                  value={subDeptFilter}
                  onChange={(e) => handleSubDeptFilterChange(e.target.value)}
                >
                  <option value="ALL">-- All Sub-Dept ({availableSubDepts.length}) --</option>
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
                  🎯 5. Job Level
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 12, height: 32, width: '100%', borderColor: levelFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)' }}
                  value={levelFilter}
                  onChange={(e) => {
                    setLevelFilter(e.target.value);
                    setSelectedIds([]);
                  }}
                >
                  <option value="ALL">-- All Levels (Level 1 - 7) --</option>
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
                  📍 6. Branch / Store (Location)
                </label>
                <select
                  className="field-select"
                  style={{ fontSize: 12, height: 32, width: '100%', borderColor: storeFilter !== 'ALL' ? 'var(--amber)' : 'var(--line)' }}
                  value={storeFilter}
                  onChange={(e) => {
                    setStoreFilter(e.target.value);
                    setSelectedIds([]);
                  }}
                >
                  <option value="ALL">-- All Branches ({retailStores.length}) --</option>
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
        <div style={{ padding: '8px 12px', background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink)' }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <span>
              Currently stopped at &amp; listing the audience to assign at level: <strong>{assignmentTypeLabel(assignScope)}</strong>
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
            {visibleOptions.length} items available under the filters
          </span>
        </div>

        {/* USER: Strict Level Filter Toggle */}
        {assignScope === 'USER' && course && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '8px 12px', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)', flexWrap: 'wrap', gap: 6 }}>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700, color: strictLevelFilter ? '#1D4ED8' : 'var(--ink)' }}>
              <input
                type="checkbox"
                checked={strictLevelFilter}
                onChange={(e) => setStrictLevelFilter(e.target.checked)}
                style={{ accentColor: '#1D4ED8' }}
              />
              <span>🛡️ Strict Level Filter (hide employees below the required level)</span>
            </label>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Eligible: Level 1..${lowestCourseLevel} {Number(lowestCourseLevel) < 7 ? `& Level ${Number(lowestCourseLevel) + 1} (One grade above)` : ''}
            </span>
          </div>
        )}

        {/* GROUP: Member Breakdown & Policy Selector */}
        {assignScope === 'GROUP' && course && (
          <div style={{ padding: '10px 14px', background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              Group Member Allocation Policy:
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="groupPolicy"
                  checked={groupPolicy === 'ELIGIBLE_ONLY'}
                  onChange={() => setGroupPolicy('ELIGIBLE_ONLY')}
                />
                <span>🟢 <strong>Only assign to members who meet the level</strong> (Automatically drops members &ge; 2 grades away - recommended)</span>
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="groupPolicy"
                  checked={groupPolicy === 'ALL_MEMBERS'}
                  onChange={() => setGroupPolicy('ALL_MEMBERS')}
                />
                <span>🟡 <strong>Assign the whole group</strong> (Includes members below the level - Admin Override)</span>
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
              placeholder={`Quick search across ${visibleOptions.length} ${assignmentTypeLabel(assignScope)}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Selection Checklist Box */}
        <div style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--line-light)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
              Options list ({visibleOptions.length} items) &middot; <span style={{ color: 'var(--rail, #15803d)' }}>Selected: {selectedIds.length} targets</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={selectAll}
                disabled={visibleOptions.length === 0}
              >
                Select all ({visibleOptions.length})
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={clearAll}
                disabled={selectedIds.length === 0}
              >
                Deselect
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
                    tagText = `✅ Lvl ${opt.level} (correct level)`;
                  } else if (evalRes.matchType === 'HIGHER_LEVEL') {
                    tone = 'blue';
                    tagText = `👑 Lvl ${opt.level} (higher level)`;
                  } else if (evalRes.matchType === 'GAP_ONE_STEP') {
                    tone = 'amber';
                    tagText = `⚠️ Lvl ${opt.level} (one grade above)`;
                  } else {
                    tone = 'crimson';
                    tagText = `🚫 Lvl ${opt.level} (${evalRes.gap} grades away)`;
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
                      background: checked ? (isBlocked ? 'var(--rust-soft)' : 'var(--rail-soft, #f0fdf4)') : (isBlocked ? 'var(--rust-soft)' : 'transparent'),
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
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>
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
                        <span style={{ fontSize: 12, color: groupEval.ineligibleCount > 0 ? 'var(--amber-soft-text)' : 'var(--sage-soft-text)', fontWeight: 600 }}>
                          ({groupEval.eligibleCount}/{groupEval.totalMembers} eligible{groupEval.ineligibleCount > 0 ? ` · ⚠️ ${groupEval.ineligibleCount} below level` : ''})
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
                let tag = isTarget ? '✅ Target level' : isHigher ? '👑 Higher level' : isGap1 ? '⚠️ One grade above' : '🚫 Below level';

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
                No audience matches the search filter or the level requirement.
              </div>
            )}
          </div>
        </div>

        {/* An in-person class is completed by attending it, so its deadline is the last
            training day of the intake — there is nothing to type in here. */}
        {scheduleDrivenDueDate ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--blue-soft)', border: '1px solid #BFDBFE',
              fontSize: 12, color: 'var(--blue-soft-text)',
            }}
          >
            <i className="ti ti-calendar-check" style={{ fontSize: 15 }} />
            <span>
              <strong>Completion deadline: {formatSessionDate(scheduleDrivenDueDate)}</strong> — taken from the last
              training day of this course&apos;s schedule. Change it in the Training Schedule section above.
            </span>
          </div>
        ) : (
          <div className="grid grid-2" style={{ gap: 10, marginBottom: 14 }}>
            <div>
              <label className="field-label" style={{ fontSize: 12 }}>Completion Due Date</label>
              <input
                type="date"
                className="field-input"
                style={{ fontSize: 12, height: 34, width: '100%' }}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 12 }}>Notes / Allocation reason</label>
              <input
                type="text"
                className="field-input"
                style={{ fontSize: 12, height: 34, width: '100%' }}
                placeholder="E.g. 2026 recurring training, safety standardization..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            icon="ti-check"
            type="submit"
            disabled={selectedIds.length === 0}
          >
            {saveButtonLabel || `Save Allocation (${selectedIds.length} targets)`}
          </Button>
        </div>
      </form>
    </div>
  );
}
