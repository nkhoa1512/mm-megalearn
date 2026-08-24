# LMS Requirement Gap Closure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 6 gaps found by the LMS mockup audit (2026-08-24) between the client's written requirement table and the current `mm-megalearn` clickable mockup, without changing the project's scope from "frontend mockup, mock data only, no backend."

**Architecture:** Every task extends the existing mock-data + React-component pattern already used throughout the codebase (local `useState` for editable mock state, plain data arrays in `src/data/*.js`, the shared `src/components/ui.jsx` design system, CSS custom properties from `src/styles/tokens.css`). No new runtime dependencies, no backend, no persistence beyond what already exists (localStorage-backed `CourseStore`).

**Tech Stack:** React 18, react-router-dom 6 (HashRouter), Vite 5. No test runner is configured in this repo (`package.json` has no `test` script and no Jest/Vitest/RTL dependency) — verification for every task is manual, via `npm run dev` and a browser, not automated tests. This is a deliberate adaptation of the standard TDD-flavored task template to match how the rest of this codebase is actually verified.

**Spec:** The 6 gaps come from a prior audit turn in this conversation (no separate spec file); each task below restates the exact gap it closes. The client's original requirement table (image, translated) and the full audit (COVERED/PARTIAL/MISSING per line item) are summarized in this conversation, not saved to a file.

## Global Constraints

- No new npm dependencies. `package.json` currently only has `react`, `react-dom`, `react-router-dom` as deps and `@vitejs/plugin-react`, `vite` as devDeps — keep it that way (CSV export, PDF export, and the org-tree UI must be hand-rolled).
- No backend calls of any kind — every "save" is local React state, matching how `AdminConfig.jsx`'s `autoRules`, `AdminCourseBuilder.jsx`'s `questionBank`, etc. already work (edits live only for the session, optionally mirrored into `localStorage` the same way `CourseStore.jsx` already persists `courses`/`classrooms`/etc.).
- Match existing code style: no semicolon-less ASI tricks, 2-space indent, inline `style={{...}}` objects (this codebase does not use a CSS-in-JS lib or Tailwind), `ti ti-*` Tabler icon classes, `var(--token)` colors from `src/styles/tokens.css`.
- Every task ends with a working `npm run dev` session where the new/changed screen can be clicked through manually — that is this project's only verification method, so each task's last code step is followed by an explicit manual-check step describing exactly what to click and what to expect.
- Follow the existing "role switch" pattern (`Sidebar.jsx` `NAV_BY_ROLE`/`ROLE_META`/`PROFILE_BY_ROLE`, `Topbar.jsx` `handleRoleChange`) exactly when adding the new role in Task 3 — do not introduce a different role-modeling mechanism.
- Vietnamese UI strings elsewhere in the app (e.g. classroom venue names, cost tracking department names) are already mixed with English; keep new UI copy in the same register the surrounding screen already uses (mostly English with Vietnamese proper nouns) rather than translating whole screens.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/data/assignmentTargets.js` | **Create** | Single source of truth for course/rule assignment targeting: `ASSIGNMENT_TYPES`, `TARGET_ID_FIELD`, `targetOptionsFor()`, `assignmentTypeLabel()` — used by both `AdminCourseBuilder.jsx` (course targeting) and `AdminConfig.jsx` (auto-assignment rules). Extracted so both places support the same target types instead of duplicating/diverging logic. |
| `src/pages/admin/AdminCourseBuilder.jsx` | Modify | Course target-audience picker — switch to the shared module, gaining AREA/STORE_TYPE/CLUSTER/STORE; add YouTube modality + URL field. |
| `src/data/mockData.js` | Modify | `isCourseAssignedToUser()` gains matching for the 4 new assignment types. |
| `src/pages/admin/AdminConfig.jsx` | Modify | Auto-assignment rule trigger picker switches to the shared module; new "Org Structure" tab renders `OrgHierarchyBrowser`; RBAC tab gains a `manageUsers` permission column; new `useradmin`-relevant copy. |
| `src/components/OrgHierarchyBrowser.jsx` | **Create** | Renders the two-branch org tree (Supporting Functions: Division→Department; Operations: Area→Cluster→Store, with Store Type as a badge) with expand/collapse and a lightweight "add node" mock-CRUD form per level. |
| `src/components/Sidebar.jsx` | Modify | Add `useradmin` to `NAV_BY_ROLE`, `ROLE_META`, `PROFILE_BY_ROLE`. |
| `src/components/Topbar.jsx` | Modify | Add `useradmin` option to the role `<select>` and its branch in `handleRoleChange`. |
| `src/pages/player/LessonPlayer.jsx` | Modify | Add a `YoutubeLesson` renderer wired to a real per-course YouTube URL instead of the hardcoded iframe `src`. |
| `src/data/roomBookings.js` | **Create** | Mock bookings for `meetingRoomsAndLabs`, seeded so the calendar/conflict UI has something to show on first render. |
| `src/pages/admin/AdminTrainingOps.jsx` | Modify | Venues tab gains a per-room booking list + working conflict check in the Reserve modal. |
| `src/lib/exportCsv.js` | **Create** | Tiny dependency-free CSV/Blob-download helper, reused by the reports export buttons. |
| `src/pages/admin/AdminReports.jsx` | Modify | "Export Excel Report" downloads a real `.csv` of the currently active report tab; "Export Audit Dossier (PDF)" opens a real print-formatted view via `window.print()`. |

---

## Task 1: Shared assignment-target module + Operations-branch course/rule targeting

**Closes gap:** Course assignment (`AdminCourseBuilder.jsx`) and mandatory auto-assignment rules (`AdminConfig.jsx`) only target Business Unit/Division/Department/Level/Role/User — the Operations-side nodes (Area, Store Type, Cluster, Store) from the requirement's second hierarchy branch aren't assignable targets anywhere.

**Files:**
- Create: `src/data/assignmentTargets.js`
- Modify: `src/pages/admin/AdminCourseBuilder.jsx:1-30, 384-414, 898-900`
- Modify: `src/data/mockData.js:288-303`
- Modify: `src/pages/admin/AdminConfig.jsx:70-74, 190-209, 1162-1188`

**Interfaces:**
- Produces (consumed by Tasks 3 and by any future targeting UI): `ASSIGNMENT_TYPES: string[]`, `TARGET_ID_FIELD: Record<string,string>`, `targetOptionsFor(assignmentType: string): {id: string, label: string}[]`, `assignmentTypeLabel(t: string): string` — all named exports of `src/data/assignmentTargets.js`.
- Consumes: `businessUnits, divisions, departments, jobLevels, operationsAreas, storeTypes, clusters, retailStores, demoUsers, allUsers` from `src/data/mockData.js` (all already exported there — `operationsAreas/storeTypes/clusters/retailStores` are re-exported from `orgHierarchy.js` at `mockData.js:9-12`).

- [ ] **Step 1: Create the shared assignment-targets module**

```js
// src/data/assignmentTargets.js
import {
  businessUnits, divisions, departments, jobLevels,
  operationsAreas, storeTypes, clusters, retailStores,
  demoUsers, allUsers,
} from './mockData';

export const ASSIGNMENT_TYPES = [
  'BUSINESS_UNIT', 'DIVISION', 'DEPARTMENT',
  'AREA', 'STORE_TYPE', 'CLUSTER', 'STORE',
  'LEVEL', 'ROLE', 'USER',
];

export const TARGET_ID_FIELD = {
  BUSINESS_UNIT: 'targetBusinessUnitId',
  DIVISION: 'targetDivisionId',
  DEPARTMENT: 'targetDepartmentId',
  AREA: 'targetAreaId',
  STORE_TYPE: 'targetStoreTypeId',
  CLUSTER: 'targetClusterId',
  STORE: 'targetStoreId',
  LEVEL: 'targetLevel',
  ROLE: 'targetRole',
  USER: 'targetUserId',
};

export function targetOptionsFor(assignmentType) {
  switch (assignmentType) {
    case 'BUSINESS_UNIT': return businessUnits.map((b) => ({ id: b.id, label: b.name }));
    case 'DIVISION': return divisions.map((d) => ({ id: d.id, label: `${d.code} - ${d.name}` }));
    case 'DEPARTMENT': return departments.map((d) => ({ id: d.id, label: `${d.code} - ${d.name}` }));
    case 'AREA': return operationsAreas.map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }));
    case 'STORE_TYPE': return storeTypes.map((t) => ({ id: t.id, label: `${t.code} - ${t.name}` }));
    case 'CLUSTER': return clusters.map((c) => ({ id: c.id, label: `${c.code} - ${c.name}` }));
    case 'STORE': return retailStores.map((s) => ({ id: s.id, label: `${s.code} - ${s.name}` }));
    case 'LEVEL': return jobLevels.map((l) => ({ id: l.level, label: `Level ${l.level} - ${l.title}` }));
    case 'ROLE': return [
      { id: 'admin', label: 'Admin (HRD Director Level 1)' },
      { id: 'manager', label: 'Line Manager (Level 4-5)' },
      { id: 'learner', label: 'Learner (Level 6-7, CL, IN)' },
    ];
    case 'USER': return (demoUsers || allUsers())
      .filter((u) => u.role !== 'admin')
      .map((u) => ({ id: u.userId, label: `${u.fullName} (${u.employeeCode} · Lvl ${u.level} · ${u.divisionCode}-${u.departmentCode})` }));
    default: return [];
  }
}

export function assignmentTypeLabel(t) {
  return {
    BUSINESS_UNIT: 'Business Unit',
    DIVISION: 'Division (Head Office)',
    DEPARTMENT: 'Department (Head Office)',
    AREA: 'Operations Area (North/Central/South)',
    STORE_TYPE: 'Store Type (C&C / Super Center / Food Service / Depot)',
    CLUSTER: 'Store Cluster',
    STORE: 'Specific Store',
    LEVEL: 'Job Level',
    ROLE: 'Role',
    USER: 'Individual User',
  }[t] || t;
}
```

- [ ] **Step 2: Point `AdminCourseBuilder.jsx` at the shared module**

Replace `src/pages/admin/AdminCourseBuilder.jsx:1-30` (the local `ASSIGNMENT_TYPES`, `TARGET_ID_FIELD`, `targetOptionsFor` definitions) with:

```js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  businessUnits, divisions, departments, jobLevels, demoUsers, allUsers, createBlankCourse,
} from '../../data/mockData';
import { ASSIGNMENT_TYPES, TARGET_ID_FIELD, targetOptionsFor, assignmentTypeLabel } from '../../data/assignmentTargets';
import { Badge, Button, CourseTypeBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

const LESSON_ICON = {
  VIDEO: 'ti-video', DOCUMENT: 'ti-file-text', IMAGE: 'ti-photo',
  TEXT: 'ti-align-left', SCRIPT: 'ti-article', ASSESSMENT: 'ti-writing',
};

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.round(Math.random() * 1e4)}`;
}

function cloneCourse(course) {
  return typeof structuredClone === 'function' ? structuredClone(course) : JSON.parse(JSON.stringify(course));
}
```

(`businessUnits`, `divisions`, `departments`, `jobLevels` stay imported here because other parts of the file may still reference them directly; if a lint pass flags any of the four as unused after this edit, drop the unused ones from the import list.)

Delete the old `function assignmentTypeLabel(t) { ... }` at `AdminCourseBuilder.jsx:898-900` — it's now imported from the shared module instead.

- [ ] **Step 3: Update the "Target audience" hint copy**

In `AdminCourseBuilder.jsx` around line 407, change:

```jsx
<div className="field-hint">Business Unit, Division, Department, Role, or a specific user.</div>
```

to:

```jsx
<div className="field-hint">Head Office (Business Unit / Division / Department), Operations (Area / Store Type / Cluster / Store), Level, Role, or a specific user.</div>
```

- [ ] **Step 4: Manual verification — course targeting**

Run `npm run dev`, sign in as admin (role switcher → "L&D Admin"), open **Course Catalog & Builder → New course**, set **Course type = Mandatory**. In **Assignment type**, confirm the dropdown now lists 10 options including "Operations Area (North/Central/South)", "Store Type (...)", "Store Cluster", "Specific Store" — and that picking each one populates the **Target** dropdown with real area/store-type/cluster/store names (not blank).

- [ ] **Step 5: Extend `isCourseAssignedToUser` for the new target types**

In `src/data/mockData.js`, replace the `switch` body at lines 294-301:

```js
  switch (a.assignmentType) {
    case 'BUSINESS_UNIT': return user.businessUnitId === a.targetBusinessUnitId || user.businessUnitCode === a.targetBusinessUnitCode;
    case 'DIVISION': return user.divisionId === a.targetDivisionId || user.divisionCode === a.targetDivisionCode;
    case 'DEPARTMENT': return user.departmentId === a.targetDepartmentId || user.departmentCode === a.targetDepartmentCode;
    case 'AREA': return user.areaId === a.targetAreaId;
    case 'STORE_TYPE': return user.storeTypeId === a.targetStoreTypeId;
    case 'CLUSTER': return user.clusterId === a.targetClusterId;
    case 'STORE': return user.storeId === a.targetStoreId;
    case 'LEVEL': return user.level === a.targetLevel;
    case 'ROLE': return user.role === a.targetRole || (a.targetRole === 'MANAGER' && (user.role === 'manager' || user.role === 'admin')) || (a.targetRole === 'USER_LEARN' && user.role === 'learner');
    case 'USER': return user.userId === a.targetUserId || user.employeeCode === a.targetEmployeeCode;
    default: return true;
  }
```

(`user.areaId`, `user.storeId`, `user.clusterId`, `user.storeTypeId` already exist on every generated user — confirmed in `src/data/generated100Data.js:378-383`.)

- [ ] **Step 6: Manual verification — assignment actually filters learners**

Still in the admin course builder, create a Mandatory course targeted at `Assignment type = Store`, `Target = MM Mega Market An Phú (Flagship)`, save it. Switch role to "Employee / Learner" via the role switcher (which lands on a demo user assigned to store `store-an-phu` per `Sidebar.jsx`'s `PROFILE_BY_ROLE`/`generated100Data.js`), open **My Courses**, and confirm the new course appears in that learner's list. Then switch to a different demo persona known to be Head Office (no `storeId`) via the profile switcher in the Topbar and confirm the course does **not** appear for them.

- [ ] **Step 7: Wire the shared module into `AdminConfig.jsx`'s auto-assignment rule form**

In `src/pages/admin/AdminConfig.jsx`, add the import near the top (after the existing `mockData` import block, ~line 10):

```js
import { ASSIGNMENT_TYPES, targetOptionsFor, assignmentTypeLabel } from '../../data/assignmentTargets';
```

Replace the free-text target input with a dependent dropdown. Change the state at lines 71-72 from:

```js
  const [newRuleTrigger, setNewRuleTrigger] = useState('DEPARTMENT');
  const [newRuleTarget, setNewRuleTarget] = useState('PPF');
```

to:

```js
  const [newRuleTrigger, setNewRuleTrigger] = useState('DEPARTMENT');
  const [newRuleTarget, setNewRuleTarget] = useState('dept-ppf');
```

Replace the "Trigger Condition" / "Target Scope Value" fields (currently `AdminConfig.jsx:1162-1188`) with:

```jsx
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label">Trigger Condition</label>
                  <select
                    className="field-select"
                    value={newRuleTrigger}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setNewRuleTrigger(nextType);
                      setNewRuleTarget(targetOptionsFor(nextType)[0]?.id || 'ALL');
                    }}
                  >
                    {ASSIGNMENT_TYPES.filter((t) => t !== 'USER').map((t) => (
                      <option key={t} value={t}>{assignmentTypeLabel(t)}</option>
                    ))}
                    <option value="ALL_ASSOCIATES">All 100 Associates (Company-wide)</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Target Scope</label>
                  {newRuleTrigger === 'ALL_ASSOCIATES' ? (
                    <input type="text" className="field-input" value="All 100 Associates" disabled />
                  ) : (
                    <select className="field-select" value={newRuleTarget} onChange={(e) => setNewRuleTarget(e.target.value)}>
                      {targetOptionsFor(newRuleTrigger).map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
```

Update `handleAddRule` (lines 190-209) so `triggerLabel` reads from the real option label instead of echoing the raw code:

```js
  function handleAddRule(e) {
    e.preventDefault();
    const courseObj = courses.find((c) => c.id === newRuleCourse) || courses[0];
    const targetLabel = newRuleTrigger === 'ALL_ASSOCIATES'
      ? 'All 100 Associates (Company-wide)'
      : targetOptionsFor(newRuleTrigger).find((o) => o.id === newRuleTarget)?.label || newRuleTarget;
    const newRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName || `Auto-Enrollment Rule for ${targetLabel}`,
      triggerType: newRuleTrigger,
      triggerTarget: newRuleTarget,
      triggerLabel: `${assignmentTypeLabel(newRuleTrigger) || 'All Associates'}: ${targetLabel}`,
      assignedCourseId: courseObj.id,
      assignedCourseTitle: courseObj.title,
      completionDays: Number(newRuleDays) || 14,
      priority: 'HIGH',
      isActive: true,
    };
    setAutoRules([newRule, ...autoRules]);
    setShowAddRuleModal(false);
    setNewRuleName('');
    showToast(`Rule "${newRule.name}" created and activated!`);
  }
```

- [ ] **Step 8: Manual verification — auto-rule targeting**

In **HRIS & MMVN Dual Hierarchy → Auto-Assignment & Learning SLAs → Add Auto-Assignment Rule**, confirm the "Trigger Condition" dropdown includes the Operations types, and picking "Operations Area" then a specific area populates a real target dropdown (not a free-text box). Submit the form and confirm the new row's "Trigger Condition" column shows a readable label like `Operations Area (North/Central/South): NORTH - Area North (Northern Vietnam)`.

- [ ] **Step 9: Commit**

```bash
git add src/data/assignmentTargets.js src/pages/admin/AdminCourseBuilder.jsx src/data/mockData.js src/pages/admin/AdminConfig.jsx
git commit -m "feat: extend course/rule assignment targeting to Operations branch (Area/Store Type/Cluster/Store)"
```

---

## Task 2: Org Hierarchy Browser (admin screen to view the dual org tree)

**Closes gap:** No admin screen shows the org structure itself — the Supporting Functions tree (Division→Department) and the Operations tree (Area→Cluster→Store, with Store Type) exist only as flat data arrays with no browsing UI, and there's no "add node" affordance anywhere.

**Depends on:** none (independent of Task 1, but conventionally landed after it since Task 3's `useradmin` nav links into the tab this task creates).

**Files:**
- Create: `src/components/OrgHierarchyBrowser.jsx`
- Modify: `src/pages/admin/AdminConfig.jsx:286-293` (add tab), plus a new `activeTab === 'org-structure'` render block.

**Interfaces:**
- Produces: default export `OrgHierarchyBrowser` (no props — reads `divisions, departments, operationsAreas, storeTypes, clusters, retailStores, storeDepartments, storeSections` directly from `src/data/mockData.js`).
- Consumes: nothing from other tasks.

- [ ] **Step 1: Create the browser component**

```jsx
// src/components/OrgHierarchyBrowser.jsx
import React, { useState } from 'react';
import {
  divisions, departments, operationsAreas, storeTypes, clusters, retailStores,
  storeDepartments, storeSections,
} from '../data/mockData';
import { Badge, Button } from './ui';

function storeTypeFor(typeId) {
  return storeTypes.find((t) => t.id === typeId);
}

export default function OrgHierarchyBrowser() {
  const [expandedDivisionId, setExpandedDivisionId] = useState(null);
  const [expandedAreaId, setExpandedAreaId] = useState(null);
  const [expandedClusterId, setExpandedClusterId] = useState(null);

  const [localDepartments, setLocalDepartments] = useState(departments);
  const [localStores, setLocalStores] = useState(retailStores);

  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDeptForDivisionId, setAddingDeptForDivisionId] = useState(null);

  const [newStoreCode, setNewStoreCode] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [addingStoreForClusterId, setAddingStoreForClusterId] = useState(null);

  function toggleDivision(id) {
    setExpandedDivisionId((cur) => (cur === id ? null : id));
  }
  function toggleArea(id) {
    setExpandedAreaId((cur) => (cur === id ? null : id));
    setExpandedClusterId(null);
  }
  function toggleCluster(id) {
    setExpandedClusterId((cur) => (cur === id ? null : id));
  }

  function submitNewDepartment(e, divisionId) {
    e.preventDefault();
    if (!newDeptCode.trim() || !newDeptName.trim()) return;
    setLocalDepartments((prev) => [
      ...prev,
      { id: `dept-${Date.now()}`, divisionId, code: newDeptCode.trim().toUpperCase(), name: newDeptName.trim() },
    ]);
    setNewDeptCode('');
    setNewDeptName('');
    setAddingDeptForDivisionId(null);
  }

  function submitNewStore(e, clusterId, areaId) {
    e.preventDefault();
    if (!newStoreCode.trim() || !newStoreName.trim()) return;
    setLocalStores((prev) => [
      ...prev,
      {
        id: `store-${Date.now()}`, clusterId, areaId, typeId: storeTypes[0].id,
        code: newStoreCode.trim().toUpperCase(), name: newStoreName.trim(), address: '',
      },
    ]);
    setNewStoreCode('');
    setNewStoreName('');
    setAddingStoreForClusterId(null);
  }

  return (
    <div className="grid grid-2" style={{ gap: 16, alignItems: 'start' }}>
      {/* SUPPORTING FUNCTIONS BRANCH */}
      <div className="card card-pad">
        <div className="section-label" style={{ margin: '0 0 12px' }}>
          Supporting Functions Branch (Head Office) &middot; {divisions.length} Divisions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {divisions.map((div) => {
            const depts = localDepartments.filter((d) => d.divisionId === div.id);
            const isOpen = expandedDivisionId === div.id;
            return (
              <div key={div.id} style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
                <button
                  onClick={() => toggleDivision(div.id)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    <i className={`ti ${isOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ marginRight: 8, color: 'var(--ink-faint)' }} />
                    {div.code} &middot; {div.name}
                  </span>
                  <Badge tone="slate" size="sm">{depts.length} depts</Badge>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 12px 12px 34px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {depts.map((d) => (
                      <div key={d.id} style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                        <i className="ti ti-corner-down-right" style={{ marginRight: 6, color: 'var(--ink-faint)' }} />
                        {d.code} &middot; {d.name}
                      </div>
                    ))}
                    {addingDeptForDivisionId === div.id ? (
                      <form onSubmit={(e) => submitNewDepartment(e, div.id)} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input className="field-input" placeholder="Code" value={newDeptCode} onChange={(e) => setNewDeptCode(e.target.value)} style={{ width: 80, fontSize: 12 }} />
                        <input className="field-input" placeholder="Department name" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
                        <Button size="sm" type="submit" variant="primary">Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingDeptForDivisionId(null)}>Cancel</Button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setAddingDeptForDivisionId(div.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: 4 }}
                      >
                        <i className="ti ti-plus" style={{ marginRight: 4 }} />Add department
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* OPERATIONS BRANCH */}
      <div className="card card-pad">
        <div className="section-label" style={{ margin: '0 0 12px' }}>
          Operations Branch (Stores) &middot; {operationsAreas.length} Areas &middot; {localStores.length} Stores
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {operationsAreas.map((area) => {
            const areaClusters = clusters.filter((c) => c.areaId === area.id);
            const isAreaOpen = expandedAreaId === area.id;
            return (
              <div key={area.id} style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
                <button
                  onClick={() => toggleArea(area.id)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    <i className={`ti ${isAreaOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ marginRight: 8, color: 'var(--ink-faint)' }} />
                    {area.name}
                  </span>
                  <Badge tone="slate" size="sm">{areaClusters.length} clusters</Badge>
                </button>
                {isAreaOpen && (
                  <div style={{ padding: '0 12px 12px 34px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {areaClusters.map((cluster) => {
                      const clusterStores = localStores.filter((s) => s.clusterId === cluster.id);
                      const isClusterOpen = expandedClusterId === cluster.id;
                      return (
                        <div key={cluster.id}>
                          <button
                            onClick={() => toggleCluster(cluster.id)}
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}
                          >
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                              <i className={`ti ${isClusterOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ marginRight: 6, color: 'var(--ink-faint)' }} />
                              {cluster.name}
                            </span>
                            <Badge tone="slate" size="sm">{clusterStores.length} stores</Badge>
                          </button>
                          {isClusterOpen && (
                            <div style={{ paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                              {clusterStores.map((store) => (
                                <div key={store.id} style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <i className="ti ti-building-store" style={{ color: 'var(--ink-faint)' }} />
                                  {store.name}
                                  <Badge tone="blue" size="sm">{storeTypeFor(store.typeId)?.code}</Badge>
                                </div>
                              ))}
                              {addingStoreForClusterId === cluster.id ? (
                                <form onSubmit={(e) => submitNewStore(e, cluster.id, area.id)} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                  <input className="field-input" placeholder="Code" value={newStoreCode} onChange={(e) => setNewStoreCode(e.target.value)} style={{ width: 80, fontSize: 12 }} />
                                  <input className="field-input" placeholder="Store name" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
                                  <Button size="sm" type="submit" variant="primary">Add</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setAddingStoreForClusterId(null)}>Cancel</Button>
                                </form>
                              ) : (
                                <button
                                  onClick={() => setAddingStoreForClusterId(cluster.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: 2 }}
                                >
                                  <i className="ti ti-plus" style={{ marginRight: 4 }} />Add store
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SHARED DEPARTMENT/SECTION/POSITION TEMPLATE (applied under every store, per the requirement's "...-> phong ban -> bo phan -> vi tri") */}
      <div className="card card-pad" style={{ gridColumn: '1 / -1' }}>
        <div className="section-label" style={{ margin: '0 0 12px' }}>
          In-Store Department &amp; Section Template (applied under every store above)
        </div>
        <div className="grid grid-3" style={{ gap: 10 }}>
          {storeDepartments.map((dept) => (
            <div key={dept.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5 }}>{dept.name}</div>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {storeSections.filter((s) => s.departmentId === dept.id).map((s) => (
                  <div key={s.id} style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                    <i className="ti ti-corner-down-right" style={{ marginRight: 4, color: 'var(--ink-faint)' }} />{s.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the new tab into `AdminConfig.jsx`**

Add the import near the top of `src/pages/admin/AdminConfig.jsx`:

```js
import OrgHierarchyBrowser from '../../components/OrgHierarchyBrowser';
```

In the `<Tabs>` array (`AdminConfig.jsx:286-293`), insert a new tab right after `'hris'`:

```jsx
          { id: 'org-structure', label: 'Org Structure (Dual Hierarchy)', icon: 'ti-sitemap' },
```

Add the render block right after the `{activeTab === 'hris' && ( ... )}` block closes (before the `{activeTab === 'gateways' && (`):

```jsx
      {activeTab === 'org-structure' && (
        <div style={{ marginBottom: 28 }}>
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0 }}>
              Browse MMVN's dual organizational hierarchy: the Supporting Functions branch (Division → Department)
              on the left, and the Operations branch (Area → Cluster → Store) on the right. Employee master records
              synced from SAP SuccessFactors (HRIS tab) attach to nodes in this tree.
            </p>
          </div>
          <OrgHierarchyBrowser />
        </div>
      )}
```

- [ ] **Step 3: Manual verification**

`npm run dev`, sign in as admin, open **HRIS & MMVN Dual Hierarchy**, click the new **Org Structure (Dual Hierarchy)** tab. Expand a division (e.g. `OMD - Merchandise Division`) and confirm its 7 departments list. Expand `Area South` → a cluster (e.g. `Cluster TP.HCM Đông`) and confirm it lists real stores (`MM Mega Market An Phú (Flagship)`, etc.) each tagged with a store-type badge. Click "Add department" under any division, submit a fake code/name, and confirm it appears in that division's list immediately (session-only, no persistence needed). Do the same for "Add store" under a cluster.

- [ ] **Step 4: Commit**

```bash
git add src/components/OrgHierarchyBrowser.jsx src/pages/admin/AdminConfig.jsx
git commit -m "feat: add Org Structure tab browsing the dual (Supporting/Operations) hierarchy"
```

---

## Task 3: "User Admin" role persona

**Closes gap:** The requirement's role list is Employee/Manager/L&D/HRBP/**User Admin**/System Admin (IT). The mockup has `learner/manager/hrbp/trainer/admin/sysadmin` — there's no distinct "User Admin" persona (its closest relative, employee/org-structure administration, is currently buried inside the generic `admin` role).

**Depends on:** Task 2 (this task's nav links into the Org Structure tab Task 2 creates — do this task after Task 2 so the link target exists; if done standalone, the link still resolves, it just lands on a tab that doesn't exist yet).

**Files:**
- Modify: `src/components/Sidebar.jsx:6-66`
- Modify: `src/components/Topbar.jsx:30-107`

**Interfaces:**
- Consumes: `adminUser` (already imported in `Sidebar.jsx` from `mockData.js`), `demoUsers` (already available in `Topbar.jsx` via `useCourseStore()`).
- Produces: nothing consumed by other tasks — this is a leaf UI addition.

- [ ] **Step 1: Add the role to `Sidebar.jsx`**

In `PROFILE_BY_ROLE` (`Sidebar.jsx:6-13`), add:

```js
const PROFILE_BY_ROLE = {
  learner: currentUser,
  manager: managerUser,
  admin: adminUser,
  hrbp: managerUser,
  trainer: adminUser,
  sysadmin: adminUser,
  useradmin: adminUser,
};
```

In `NAV_BY_ROLE` (`Sidebar.jsx:15-57`), add a new entry after `sysadmin`:

```js
  useradmin: [
    { to: '/admin/config', label: 'Employee Master & Org Structure', icon: 'ti-users-group', end: true },
    { to: '/admin/reports', label: 'Workforce Compliance Reports', icon: 'ti-chart-histogram' },
    { to: '/admin', label: 'System Overview', icon: 'ti-layout-dashboard' },
  ],
```

In `ROLE_META` (`Sidebar.jsx:59-66`), add:

```js
  useradmin: { label: 'User Administrator (HR Ops)', icon: 'ti-users-group', tone: 'blue' },
```

- [ ] **Step 2: Add the role to `Topbar.jsx`**

In the role `<select>` (`Topbar.jsx:100-107`), add an option after `sysadmin`:

```jsx
            <option value="useradmin">User Admin (Employee & Org Records)</option>
```

In `handleRoleChange` (`Topbar.jsx:30-51`), add a branch before the final `else`:

```js
  function handleRoleChange(e) {
    const nextRole = e.target.value;
    onRoleChange(nextRole);
    // Switch to a suitable demo user for this role if needed
    if (nextRole === 'admin' || nextRole === 'sysadmin' || nextRole === 'useradmin') {
      switchUser(demoUsers[0].userId);
      navigate('/admin/config');
    } else if (nextRole === 'manager') {
      switchUser(demoUsers[1].userId);
      navigate('/manager');
    } else if (nextRole === 'hrbp') {
      const hrbpUser = demoUsers.find((u) => u.departmentCode === 'HRBP') || demoUsers[1];
      switchUser(hrbpUser.userId);
      navigate('/admin/reports');
    } else if (nextRole === 'trainer') {
      switchUser(demoUsers[2].userId);
      navigate('/admin/training-ops');
    } else {
      switchUser(demoUsers[3].userId);
      navigate('/learner');
    }
  }
```

(`useradmin` shares `demoUsers[0]`, the same seed admin persona `admin`/`sysadmin` already reuse — matching how `trainer`/`sysadmin` already borrow existing personas instead of requiring new demo user records, per `PROFILE_BY_ROLE` in Sidebar.)

- [ ] **Step 3: Manual verification**

`npm run dev`, use the Topbar role switcher to pick **"User Admin (Employee & Org Records)"**. Confirm: the sidebar role pill reads "User Administrator (HR Ops)"; the nav shows exactly 3 items (Employee Master & Org Structure, Workforce Compliance Reports, System Overview); clicking the first nav item lands on `/admin/config` (and, once Task 2 is done, defaults there to the Org Structure content being reachable via its tab).

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.jsx src/components/Topbar.jsx
git commit -m "feat: add distinct User Admin role persona alongside System Admin"
```

---

## Task 4: YouTube link as an explicit e-course format

**Closes gap:** Requirement asks for e-course support for "SCORM, video, PDF, PPT... link các khóa học... link youtube." Every other external format (LinkedIn/Coursera/Udemy) is a selectable modality with review-ready content; a bare YouTube link is not — `LessonPlayer.jsx`'s `ExternalPlatformPlayer` already has YouTube-branded fallback styling but the embedded video ID (`dQw4w9WgXcQ`) is hardcoded, and there is no way for an admin to set a real YouTube URL per course.

**Files:**
- Modify: `src/pages/admin/AdminCourseBuilder.jsx:344-357`
- Modify: `src/pages/player/LessonPlayer.jsx:11-23, 52-54, 346-399`

**Interfaces:**
- Produces: `course.modality === 'YOUTUBE_LINK'` and `course.content.youtubeUrl: string` — a new course-level field read by `LessonPlayer.jsx`.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Add the modality option and URL field in the course builder**

In `AdminCourseBuilder.jsx`, replace the "Modality & Format" `<select>` block (lines 344-357):

```jsx
          <div>
            <label className="field-label">Modality &amp; Format</label>
            <select
              className="field-select"
              value={draft.modality || 'SCORM_PACKAGE'}
              onChange={(e) => {
                const modality = e.target.value;
                const format = modality === 'SCORM_PACKAGE' ? 'SCORM 2004'
                  : modality === 'PPT_PRESENTATION' ? 'Interactive PPT Slides'
                  : modality === 'EXTERNAL_PLATFORM' ? 'LinkedIn Learning / Coursera Embed'
                  : modality === 'YOUTUBE_LINK' ? 'YouTube Video (External Link)'
                  : 'Interactive Video';
                patch({ modality, format });
              }}
            >
              <option value="SCORM_PACKAGE">SCORM 2004 Package</option>
              <option value="INTERACTIVE_VIDEO">Interactive Video Stream</option>
              <option value="PPT_PRESENTATION">PowerPoint Slide Deck</option>
              <option value="EXTERNAL_PLATFORM">External Platform (LinkedIn / Coursera / Udemy)</option>
              <option value="YOUTUBE_LINK">YouTube Video (Link)</option>
              <option value="CLASSROOM_LAB">Store Practical Lab (ILT)</option>
            </select>
          </div>
```

Immediately after the closing `</div>` of the `grid grid-3` block that contains the field above (right after line ~366, before the "Version Audit Trail" panel), add a conditional URL field:

```jsx
        {draft.modality === 'YOUTUBE_LINK' && (
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">YouTube Video URL</label>
            <input
              className="field-input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={draft.content?.youtubeUrl || ''}
              onChange={(e) => patch({ content: { ...draft.content, youtubeUrl: e.target.value } })}
            />
            <div className="field-hint">Paste a full YouTube watch/share/embed URL — learners will see it played inline on the lesson screen.</div>
          </div>
        )}
```

- [ ] **Step 2: Add a YouTube video-ID parser and renderer in `LessonPlayer.jsx`**

Add a helper near the top of `src/pages/player/LessonPlayer.jsx`, after `flattenLessons` (line 9) and before `lessonTypeLabel` (line 11):

```js
function youtubeVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}
```

Extend `lessonTypeLabel` (lines 11-23) with a `YOUTUBE` case:

```js
function lessonTypeLabel(t) {
  switch (t) {
    case 'VIDEO': return 'Video Lecture';
    case 'SCORM': return 'SCORM 2004 Interactive Package';
    case 'PPT': return 'PowerPoint Presentation Deck';
    case 'EXTERNAL': return 'External Platform (LinkedIn / Coursera)';
    case 'YOUTUBE': return 'YouTube Video (External Link)';
    case 'DOCUMENT': return 'Standard Operating Procedure (SOP PDF)';
    case 'SCRIPT': return 'Operational Scenario Script';
    case 'IMAGE': return 'Visual Process Gallery';
    case 'TEXT': return 'Reference Reading';
    default: return 'Lesson';
  }
}
```

In the component body (lines 52-54), add an `isYoutube` flag next to the existing `isScorm`/`isPpt`/`isExternal`:

```js
  const isScorm = course.modality === 'SCORM_PACKAGE' || lesson.lessonType === 'SCORM';
  const isPpt = course.modality === 'PPT_PRESENTATION' || lesson.lessonType === 'PPT';
  const isExternal = course.modality === 'EXTERNAL_PLATFORM' || lesson.lessonType === 'EXTERNAL';
  const isYoutube = course.modality === 'YOUTUBE_LINK' || lesson.lessonType === 'YOUTUBE';
```

Update the header label line (line 74) to account for the new type:

```jsx
            {lessonTypeLabel(isScorm ? 'SCORM' : isPpt ? 'PPT' : isExternal ? 'EXTERNAL' : isYoutube ? 'YOUTUBE' : lesson.lessonType)} &middot; {lesson.isRequired ? 'Mandatory' : 'Optional'} &middot; Version: <strong>{course.configuration?.version || 'v2.1'}</strong>
```

Update the player-canvas switch (lines 94-108) to route to a new `YoutubeLesson` component before the `isExternal` branch:

```jsx
        {isScorm ? (
          <ScormPlayerSimulator course={course} lesson={lesson} onComplete={complete} />
        ) : isPpt ? (
          <PptSlidePlayer course={course} lesson={lesson} onComplete={complete} />
        ) : isYoutube ? (
          <YoutubeLesson course={course} onComplete={complete} />
        ) : isExternal ? (
          <ExternalPlatformPlayer course={course} lesson={lesson} onComplete={complete} />
        ) : lesson.lessonType === 'VIDEO' ? (
          <VideoLesson lesson={lesson} onComplete={complete} />
        ) : lesson.lessonType === 'DOCUMENT' || lesson.lessonType === 'SCRIPT' ? (
          <DocumentLesson lesson={lesson} onComplete={complete} />
        ) : lesson.lessonType === 'IMAGE' ? (
          <ImageLesson lesson={lesson} onComplete={complete} />
        ) : (
          <TextLesson lesson={lesson} onComplete={complete} />
        )}
```

Add the `YoutubeLesson` component right before `ExternalPlatformPlayer` (before line 346):

```jsx
function YoutubeLesson({ course, onComplete }) {
  const videoId = youtubeVideoId(course.content?.youtubeUrl) || 'dQw4w9WgXcQ';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          background: '#E31B23', color: '#fff', padding: '14px 20px', borderRadius: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-brand-youtube" style={{ fontSize: 24 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>YouTube Training Video</div>
            <div style={{ fontSize: 11.5, opacity: 0.9 }}>External Link &middot; MMVN L&amp;D Hub</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', height: 380 }}>
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube Training Video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
          Watch the video, then confirm completion to record it on your transcript.
        </span>
        <Button variant="primary" icon="ti-check" onClick={() => onComplete({ progressPercent: 100 })}>
          Confirm Video Watched
        </Button>
      </div>
    </div>
  );
}
```

(`Button` is already imported at the top of `LessonPlayer.jsx` — confirm the import list includes it before adding this component; it does, per the existing `Badge, Button, ProgressBar` import.)

- [ ] **Step 3: Manual verification**

`npm run dev`, sign in as admin, create/open a course, set **Modality & Format = YouTube Video (Link)**, paste a real URL (e.g. `https://www.youtube.com/watch?v=dQw4w9WgXcQ`), save. Switch to a learner assigned to that course, open its lesson player, and confirm the red YouTube-branded header renders and the embedded iframe's `src` uses the pasted video ID (inspect via browser devtools or just confirm the correct video plays). Click "Confirm Video Watched" and confirm the lesson marks Completed.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminCourseBuilder.jsx src/pages/player/LessonPlayer.jsx
git commit -m "feat: add YouTube link as an explicit e-course modality"
```

---

## Task 5: Meeting-room booking calendar + conflict detection

**Closes gap:** "Tích hợp danh sách phòng họp trong công ty" — the Venues tab lists rooms/labs and has a "Reserve Room" button, but the modal only captures a date + workshop name with no persistence, no visible existing bookings, and no double-booking check.

**Files:**
- Create: `src/data/roomBookings.js`
- Modify: `src/pages/admin/AdminTrainingOps.jsx:1-20, 153-195, 328-346`

**Interfaces:**
- Produces: nothing consumed by other tasks (leaf feature).
- Consumes: `meetingRoomsAndLabs` from `src/data/mockData.js` (already imported in `AdminTrainingOps.jsx`).

- [ ] **Step 1: Seed mock bookings**

```js
// src/data/roomBookings.js
export const initialRoomBookings = [
  { id: 'book-1', roomId: 'room-ho-dia', date: '2026-08-28', workshopName: 'Q3 Leadership Offsite Kickoff' },
  { id: 'book-2', roomId: 'room-ho-saph', date: '2026-08-29', workshopName: 'New Manager Onboarding Cohort 12' },
  { id: 'book-3', roomId: 'lab-ap-fresh', date: '2026-09-02', workshopName: 'Bakery & Fresh Food Practical Lab' },
  { id: 'book-4', roomId: 'lab-tl-fire', date: '2026-09-05', workshopName: 'HSE Fire Drill - Thang Long' },
];
```

- [ ] **Step 2: Add booking state, a per-room booking list, and conflict-checked reservation to `AdminTrainingOps.jsx`**

Add the import at the top of `src/pages/admin/AdminTrainingOps.jsx` (near the existing `meetingRoomsAndLabs` import):

```js
import { initialRoomBookings } from '../../data/roomBookings';
```

Add booking state near the component's other `useState` declarations (where `selectedVenue` is declared, ~line 15):

```js
  const [roomBookings, setRoomBookings] = useState(initialRoomBookings);
  const [reserveDate, setReserveDate] = useState('2026-09-15');
  const [reserveWorkshopName, setReserveWorkshopName] = useState('');
  const [reserveError, setReserveError] = useState('');

  function bookingsForRoom(roomId) {
    return roomBookings.filter((b) => b.roomId === roomId).sort((a, b) => a.date.localeCompare(b.date));
  }

  function openReserveModal(venue) {
    setSelectedVenue(venue);
    setReserveDate('2026-09-15');
    setReserveWorkshopName('');
    setReserveError('');
  }

  function confirmReservation() {
    if (!reserveWorkshopName.trim()) {
      setReserveError('Enter a workshop name before confirming.');
      return;
    }
    const conflict = roomBookings.find((b) => b.roomId === selectedVenue.id && b.date === reserveDate);
    if (conflict) {
      setReserveError(`Conflict: "${conflict.workshopName}" already booked in this room on ${reserveDate}.`);
      return;
    }
    setRoomBookings((prev) => [...prev, { id: `book-${Date.now()}`, roomId: selectedVenue.id, date: reserveDate, workshopName: reserveWorkshopName.trim() }]);
    setSelectedVenue(null);
  }
```

Replace the `Reserve Room` button's `onClick` in the venue card loop (`AdminTrainingOps.jsx:187-189`) from `onClick={() => setSelectedVenue(v)}` to `onClick={() => openReserveModal(v)}`.

Add an upcoming-bookings list to each venue card — insert it right after the equipment block (after line 181, before the "Available (No Conflict)" row):

```jsx
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>Upcoming Bookings:</div>
                  {bookingsForRoom(v.id).length === 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>No bookings scheduled.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {bookingsForRoom(v.id).map((b) => (
                        <div key={b.id} style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                          <i className="ti ti-calendar-event" style={{ marginRight: 4, color: 'var(--amber)' }} />
                          {b.date} &middot; {b.workshopName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
```

- [ ] **Step 3: Rewrite the Reserve modal to use real, validated fields**

Replace the "Venue Modal" block (`AdminTrainingOps.jsx:328-346`):

```jsx
      {/* Venue Modal */}
      <Modal
        isOpen={Boolean(selectedVenue)}
        onClose={() => setSelectedVenue(null)}
        title="Reserve Training Room / Store Lab"
        subtitle={selectedVenue ? selectedVenue.name : ''}
        size="sm"
        footer={<Button variant="primary" onClick={confirmReservation}>Confirm Reservation</Button>}
      >
        {selectedVenue && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Select cohort date and workshop title to schedule this venue.
            </p>
            <input
              type="date"
              className="field-input"
              value={reserveDate}
              onChange={(e) => setReserveDate(e.target.value)}
              style={{ width: '100%', marginBottom: 10 }}
            />
            <input
              type="text"
              className="field-input"
              placeholder="Workshop Name (e.g. Store Lab HACCP)"
              value={reserveWorkshopName}
              onChange={(e) => setReserveWorkshopName(e.target.value)}
              style={{ width: '100%' }}
            />
            {reserveError && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--rust)' }}>
                <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />{reserveError}
              </div>
            )}
          </div>
        )}
      </Modal>
```

- [ ] **Step 4: Manual verification**

`npm run dev`, sign in as admin, open **Training Ops, Trainers & Labs → Store Practical Labs & Venues**. Confirm each room card shows an "Upcoming Bookings" list matching the seed data (e.g. Diamond Auditorium shows "2026-08-28 · Q3 Leadership Offsite Kickoff"). Click **Reserve Room** on that same room, set the date to `2026-08-28` (a date already booked), enter any workshop name, click **Confirm Reservation**, and confirm a red conflict message appears and the modal stays open. Change the date to an open date, confirm, and verify the modal closes and the new booking now appears in that room's "Upcoming Bookings" list.

- [ ] **Step 5: Commit**

```bash
git add src/data/roomBookings.js src/pages/admin/AdminTrainingOps.jsx
git commit -m "feat: add meeting-room booking list and double-booking conflict check"
```

---

## Task 6: Real report exports (CSV download + print-based PDF)

**Closes gap:** "Export Excel Report" and "Export Audit Dossier (Signed PDF)" on the Admin Reports page are pure UI stubs (`setTimeout` + toast) — no file is ever produced.

**Files:**
- Create: `src/lib/exportCsv.js`
- Modify: `src/pages/admin/AdminReports.jsx:1-24, 38-54`

**Interfaces:**
- Produces: `downloadCsv(filename: string, rows: Record<string,any>[]): void` — exported from `src/lib/exportCsv.js`.
- Consumes: `companyHeatmapData`, `costTrackingData`, `divisionComplianceLeague` (already imported in `AdminReports.jsx`).

- [ ] **Step 1: Write the dependency-free CSV export helper**

```js
// src/lib/exportCsv.js
function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsv(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(',')),
  ];
  const csvContent = lines.join('\r\n');
  const blob = new Blob([`﻿${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

(The `﻿` BOM prefix is so Excel on Windows opens UTF-8 Vietnamese diacritics correctly instead of mangling them — relevant here since department/store names in this data are Vietnamese.)

- [ ] **Step 2: Wire real exports into `AdminReports.jsx`**

Replace the imports and `handleExportDossier` (`AdminReports.jsx:1-24`):

```js
import React, { useState } from 'react';
import {
  orgReport,
  kirkpatrickROI,
  companyHeatmapData,
  costTrackingData,
  divisionComplianceLeague,
} from '../../data/mockData';
import { StatCard, Badge, Button, ProgressBar } from '../../components/ui';
import { downloadCsv } from '../../lib/exportCsv';

export default function AdminReports() {
  const [selectedInspectionPackage, setSelectedInspectionPackage] = useState('HACCP');
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState('ROI_KIRKPATRICK'); // ROI_KIRKPATRICK, HEATMAP, COST_BUDGET, COMPLIANCE_LEAGUE

  function activeReportRows() {
    if (activeReportTab === 'HEATMAP') {
      return [...companyHeatmapData.operations, ...companyHeatmapData.supportingOffice];
    }
    if (activeReportTab === 'COST_BUDGET') {
      return costTrackingData.departmentSpend;
    }
    if (activeReportTab === 'COMPLIANCE_LEAGUE') {
      return divisionComplianceLeague;
    }
    return [
      { level: 'Level 1 - Reaction', ...kirkpatrickROI.level1 },
      { level: 'Level 2 - Learning', ...kirkpatrickROI.level2 },
    ];
  }

  function handleExportExcel() {
    setIsExporting(true);
    setTimeout(() => {
      downloadCsv(`mmvn-lms-${activeReportTab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, activeReportRows());
      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 3000);
    }, 800);
  }

  function handleExportDossier() {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      window.print();
    }, 800);
  }
```

Replace the two export buttons (`AdminReports.jsx:38-54`):

```jsx
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            icon={exportComplete ? 'ti-check' : isExporting ? 'ti-loader ti-spin' : 'ti-file-spreadsheet'}
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            {exportComplete ? 'CSV Downloaded!' : 'Export Excel Report (CSV)'}
          </Button>
          <Button
            variant="primary"
            icon={isExporting ? 'ti-loader ti-spin' : 'ti-file-certificate'}
            onClick={handleExportDossier}
            disabled={isExporting}
          >
            {isExporting ? 'Preparing Print View...' : 'Export Audit Dossier (Print / Save as PDF)'}
          </Button>
        </div>
```

(`window.print()` is the same zero-dependency "real PDF" mechanism already used elsewhere in this codebase — `src/components/ui.jsx:207`'s certificate modal's "Print Certificate" button calls `window.print()` too, so this matches an established pattern rather than introducing a new one.)

- [ ] **Step 3: Manual verification**

`npm run dev`, sign in as admin, open **Strategic ROI & Audit Center**. Switch to the **Competency Gap Heatmap** tab, click **Export Excel Report (CSV)**, and confirm a `mmvn-lms-heatmap-....csv` file downloads and opens in a spreadsheet app with the store/office heatmap rows and Vietnamese names intact. Switch to **Training Cost Tracking & L&D Budget**, export again, and confirm the downloaded CSV instead contains `departmentSpend` rows. Click **Export Audit Dossier (Print / Save as PDF)** and confirm the browser's print dialog opens (from which "Save as PDF" produces a real PDF — this is the same mechanism the codebase already uses for certificates).

- [ ] **Step 4: Commit**

```bash
git add src/lib/exportCsv.js src/pages/admin/AdminReports.jsx
git commit -m "feat: make report exports real (CSV download, print-based PDF) instead of UI stubs"
```

---

## Self-Review Notes

- **Coverage:** All 6 audited gaps have a task. Org structure edit affordance (mock CRUD) is intentionally shallow (add-only, session-only state, no delete/rename) — matches the mockup's existing depth for similar "admin edits a list" features (e.g. `autoRules` in `AdminConfig.jsx` also has no rename, only add/toggle/delete).
- **Placeholder scan:** No task contains TBD/TODO markers; every code block is complete, working code against the file paths and line numbers read directly from the current repo state during planning (2026-08-24).
- **Type/name consistency:** `TARGET_ID_FIELD`/`ASSIGNMENT_TYPES`/`targetOptionsFor`/`assignmentTypeLabel` names are identical between their `assignmentTargets.js` definition (Task 1, Step 1) and every consumer (Task 1 Steps 2 and 7). `isCourseAssignedToUser`'s new field names (`areaId`, `storeTypeId`, `clusterId`, `storeId`) match the exact field names already written onto every generated user object in `src/data/generated100Data.js:378-383` — verified by reading that file directly rather than assuming.
- **Not done:** `docs/MM_MEGALEARN_FUNCTIONAL_SPECIFICATION.md` and root `SRS.md` were not cross-checked against this plan (per the original audit's own caveat) — worth a follow-up read if the client's requirement table needs reconciling against those two internal docs as well.
