import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, Modal, JobLevelBadge } from '../common/ui';
import { ROLE_DEFINITIONS, roleDefinition, normalizeRole } from '../../data/roles';
import { normalizeLevel } from '../../data/levelSystem';
import { resolveGroupMembers, criteriaValues, DEFAULT_GROUP_CATEGORIES } from '../../data/customGroupsData';

const COLOR_OPTIONS = [
  { label: 'Blue', value: '#0EA5E9' },
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Green', value: '#10B981' },
  { label: 'Amber Orange', value: '#F59E0B' },
  { label: 'Deep Purple', value: '#8B5CF6' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Ruby Red', value: '#EF4444' },
  { label: 'Xanh Lam Cyan', value: '#06B6D4' },
];

const CHIP_PREVIEW_LIMIT = 12;

function optionLabel(options, id) {
  const found = options.find((o) => String(o.id) === String(id));
  return found ? found.label : String(id);
}

function emptyCriteria() {
  return {
    businessUnitId: 'bu-mmvn',
    divisionId: [],
    departmentId: [],
    subDepartmentId: [],
    level: [],
    role: [],
  };
}

// Dropdown that accepts several values at once - same footprint as a .field-select.
// Long lists can be searched, and everything on screen can be picked in one click.
function MultiSelectField({ label, options, selectedIds, onChange, disabled = false, allLabel, lockedLabel, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (boxRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
    if (!open) setQuery('');
  }, [disabled, open]);

  const selectedSet = new Set(selectedIds.map(String));
  const chosen = options.filter((o) => selectedSet.has(String(o.id)));
  const chosenLabels = chosen.map((o) => o.label).join(', ');
  const q = query.trim().toLowerCase();
  const visibleOptions = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const allVisibleSelected = visibleOptions.length > 0 && visibleOptions.every((o) => selectedSet.has(String(o.id)));
  const summary = disabled
    ? lockedLabel
    : chosen.length === 0
      ? allLabel
      : chosen.length === options.length
        ? `All ${options.length} selected`
        : `(${chosen.length}) ${chosenLabels}`;

  function toggleOption(id) {
    const key = String(id);
    onChange(selectedSet.has(key) ? selectedIds.filter((v) => String(v) !== key) : [...selectedIds, key]);
  }

  // Acts on what the search box currently shows, so it doubles as "select all".
  function toggleVisible() {
    const visibleIds = visibleOptions.map((o) => String(o.id));
    if (allVisibleSelected) {
      const visibleSet = new Set(visibleIds);
      onChange(selectedIds.filter((v) => !visibleSet.has(String(v))));
      return;
    }
    onChange(Array.from(new Set([...selectedIds.map(String), ...visibleIds])));
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <label className="field-label" style={{ fontSize: 12 }}>{label}</label>
      <button
        type="button"
        className="field-select"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={chosen.length > 0 ? chosenLabels : undefined}
        style={{ fontSize: 12, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        {summary}
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          style={{ position: 'absolute', zIndex: 40, top: '100%', [align]: 0, minWidth: '100%', maxWidth: 320, marginTop: 4, background: 'var(--paper-raised)', border: '1px solid var(--line-strong)', borderRadius: 8, boxShadow: '0 10px 24px rgba(15,23,42,0.16)', overflow: 'hidden' }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid var(--line)', background: 'var(--paper-sunken)' }}>
            {options.length > 6 && (
              <input
                className="field-input"
                style={{ fontSize: 12, padding: '6px 10px', marginBottom: 6 }}
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button
                type="button"
                onClick={toggleVisible}
                disabled={visibleOptions.length === 0}
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 12, fontWeight: 600, color: 'var(--rail)', cursor: visibleOptions.length === 0 ? 'not-allowed' : 'pointer' }}
              >
                {allVisibleSelected
                  ? `Clear these ${visibleOptions.length}`
                  : q
                    ? `Select ${visibleOptions.length} matching`
                    : `Select all (${options.length})`}
              </button>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                {chosen.length > 0 ? `${chosen.length} selected` : 'No filter'}
              </span>
            </div>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: 6 }}>
            {visibleOptions.length === 0 && (
              <div style={{ padding: '6px 8px', fontSize: 12, color: 'var(--ink-faint)' }}>No matching option</div>
            )}
            {visibleOptions.map((o) => (
              <label
                key={o.id}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', borderRadius: 6, fontSize: 12, color: 'var(--ink)', cursor: 'pointer' }}
              >
                <input type="checkbox" checked={selectedSet.has(String(o.id))} onChange={() => toggleOption(o.id)} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomGroupsManager() {
  const {
    customGroups = [],
    addCustomGroup,
    updateCustomGroup,
    deleteCustomGroup,
    duplicateCustomGroup,
    customGroupCategories = [],
    addCustomGroupCategory,
    updateCustomGroupCategory,
    deleteCustomGroupCategory,
    users = [],
    divisions = [],
    departments = [],
    subDepartments = [],
    businessUnits = [],
    jobLevels = [],
    language,
  } = useCourseStore();

  // The catalog is admin-managed; the defaults are only a fallback for an empty store.
  const CATEGORY_OPTIONS = customGroupCategories.length > 0 ? customGroupCategories : DEFAULT_GROUP_CATEGORIES;

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [categoryModal, setCategoryModal] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [categoryError, setCategoryError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, DYNAMIC, MANUAL, FILE_IMPORT
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [customGroupGroupBy, setCustomGroupGroupBy] = useState('NONE');
  const [showGroupFilters, setShowGroupFilters] = useState(false);
  const [collapsedGroupSections, setCollapsedGroupSections] = useState({});

  const CUSTOM_GROUP_GROUP_BY_OPTIONS = [
    { id: 'NONE', label: 'No grouping' },
    { id: 'TYPE', label: 'By Type' },
    { id: 'CATEGORY', label: 'By Area / Category' },
  ];

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
    criteria: emptyCriteria(),
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
      const matchCategory = categoryFilter === 'ALL' || (g.category || 'SPECIAL_COHORT') === categoryFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !search.trim() ||
        (g.title && g.title.toLowerCase().includes(q)) ||
        (g.code && g.code.toLowerCase().includes(q)) ||
        (g.description && g.description.toLowerCase().includes(q));
      return matchType && matchCategory && matchSearch;
    });
  }, [customGroups, typeFilter, categoryFilter, search]);

  const activeGroupFiltersCount = (typeFilter !== 'ALL' ? 1 : 0) + (categoryFilter !== 'ALL' ? 1 : 0);

  function handleClearAllGroupFilters() {
    setSearch('');
    setTypeFilter('ALL');
    setCategoryFilter('ALL');
  }

  function commitCategoryRename(cat) {
    const draft = categoryDrafts[cat.id];
    setCategoryDrafts((prev) => {
      const next = { ...prev };
      delete next[cat.id];
      return next;
    });
    if (draft === undefined || draft.trim() === cat.label) {
      setCategoryError(null);
      return;
    }
    const result = updateCustomGroupCategory(cat.id, draft);
    if (result?.ok) {
      setCategoryError(null);
      return;
    }
    setCategoryError(result?.reason === 'DUPLICATE'
      ? 'Another category already uses that name.'
      : 'The category name cannot be empty.');
  }

  function handleDeleteCategory(cat) {
    const result = deleteCustomGroupCategory(cat.id);
    if (!result?.ok) {
      setCategoryError('At least one category has to stay.');
      return;
    }
    setCategoryError(null);
    // The list would otherwise keep filtering on an id nobody can pick any more.
    if (categoryFilter === cat.id) setCategoryFilter('ALL');
  }

  function handleAddCategory() {
    const result = addCustomGroupCategory(newCategoryLabel);
    if (result?.ok) {
      setNewCategoryLabel('');
      setCategoryError(null);
      return;
    }
    setCategoryError(result?.reason === 'DUPLICATE' ? 'That category already exists.' : 'Type a category name first.');
  }

  function toggleGroupSectionCollapse(secId) {
    setCollapsedGroupSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  }

  const groupedCustomGroups = useMemo(() => {
    if (customGroupGroupBy === 'NONE') return null;
    const map = {};
    filteredGroups.forEach((grp) => {
      let key = 'OTHER';
      let title = 'Other';
      let icon = 'ti-folder';

      if (customGroupGroupBy === 'TYPE') {
        key = grp.type || 'DYNAMIC';
        if (key === 'DYNAMIC') {
          title = '🏢 Structural Group (Dynamic)';
          icon = 'ti-binary-tree';
        } else if (key === 'MANUAL') {
          title = '👤 Manually Selected User Group';
          icon = 'ti-users';
        } else {
          title = '📄 Group Imported From File (Template)';
          icon = 'ti-file-spreadsheet';
        }
      } else if (customGroupGroupBy === 'CATEGORY') {
        key = grp.category || 'SPECIAL_COHORT';
        const cat = CATEGORY_OPTIONS.find((c) => c.id === key);
        title = cat ? cat.label : 'Specialized / Dedicated Group';
        icon = 'ti-tag';
      }

      if (!map[key]) {
        map[key] = { id: key, title, icon, groups: [] };
      }
      map[key].groups.push(grp);
    });

    return Object.values(map);
  }, [filteredGroups, customGroupGroupBy, CATEGORY_OPTIONS]);

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

  // Org hierarchy is picked top-down: Division -> Department -> Sub-Department,
  // and every level accepts several values at once.
  const selectedDivisionIds = useMemo(() => criteriaValues(form.criteria?.divisionId), [form.criteria]);
  const selectedDepartmentIds = useMemo(() => criteriaValues(form.criteria?.departmentId), [form.criteria]);
  const selectedSubDepartmentIds = useMemo(() => criteriaValues(form.criteria?.subDepartmentId), [form.criteria]);
  const selectedLevels = useMemo(() => criteriaValues(form.criteria?.level), [form.criteria]);
  const selectedRoles = useMemo(() => criteriaValues(form.criteria?.role), [form.criteria]);

  const divisionOptions = useMemo(
    () => divisions.map((d) => ({ id: d.id, label: `${d.code} — ${d.name}` })),
    [divisions]
  );
  const departmentOptions = useMemo(() => {
    const divisionById = new Map(divisions.map((d) => [String(d.id), d]));
    const showParent = selectedDivisionIds.length > 1;
    return departments
      .filter((dept) => selectedDivisionIds.includes(String(dept.divisionId)))
      .map((dept) => {
        const parent = divisionById.get(String(dept.divisionId));
        return {
          id: dept.id,
          label: showParent && parent ? `${parent.code} · ${dept.code} — ${dept.name}` : `${dept.code} — ${dept.name}`,
        };
      });
  }, [divisions, departments, selectedDivisionIds]);
  const subDepartmentOptions = useMemo(() => {
    const departmentById = new Map(departments.map((d) => [String(d.id), d]));
    const showParent = selectedDepartmentIds.length > 1;
    return subDepartments
      .filter((sub) => selectedDepartmentIds.includes(String(sub.departmentId)))
      .map((sub) => {
        const parent = departmentById.get(String(sub.departmentId));
        return {
          id: sub.id,
          label: showParent && parent ? `${parent.code} · 🌿 ${sub.name}` : `🌿 ${sub.name}`,
        };
      });
  }, [departments, subDepartments, selectedDepartmentIds]);
  const levelOptions = useMemo(
    () => jobLevels.map((lvl) => ({ id: String(lvl.level), label: `Level ${lvl.level} - ${lvl.viTitle || lvl.title}` })),
    [jobLevels]
  );
  const roleOptions = useMemo(
    () => ROLE_DEFINITIONS.map((r) => ({ id: r.id, label: r.labelVi })),
    []
  );

  // Every criteria field holds an array of ids, so several divisions / departments / levels
  // can be picked at once; legacy groups storing a single id or 'ALL' are converted here.
  // The hierarchy is chosen top-down, so a saved child selection pulls its parent in rather
  // than being dropped, and anything left dangling is removed.
  function hydrateCriteria(rawCriteria = {}) {
    let divisionIds = criteriaValues(rawCriteria.divisionId);
    let departmentIds = criteriaValues(rawCriteria.departmentId);
    const subIds = criteriaValues(rawCriteria.subDepartmentId);

    departmentIds = Array.from(new Set([
      ...departmentIds,
      ...subDepartments.filter((sub) => subIds.includes(String(sub.id))).map((sub) => String(sub.departmentId)),
    ]));
    divisionIds = Array.from(new Set([
      ...divisionIds,
      ...departments.filter((dept) => departmentIds.includes(String(dept.id))).map((dept) => String(dept.divisionId)),
    ]));

    const keptDepartments = departments
      .filter((dept) => divisionIds.includes(String(dept.divisionId)) && departmentIds.includes(String(dept.id)))
      .map((dept) => String(dept.id));
    const keptSubs = subDepartments
      .filter((sub) => keptDepartments.includes(String(sub.departmentId)) && subIds.includes(String(sub.id)))
      .map((sub) => String(sub.id));

    return {
      ...rawCriteria,
      divisionId: divisionIds,
      departmentId: keptDepartments,
      subDepartmentId: keptSubs,
      level: criteriaValues(rawCriteria.level),
      role: criteriaValues(rawCriteria.role),
    };
  }

  // One removable chip per picked value, so the whole filter is readable without
  // opening the five dropdowns again.
  const criteriaChips = [
    ...selectedDivisionIds.map((id) => ({
      key: `division:${id}`,
      field: 'Division',
      label: optionLabel(divisionOptions, id),
      onRemove: () => handleDivisionsChange(selectedDivisionIds.filter((v) => v !== id)),
    })),
    ...selectedDepartmentIds.map((id) => ({
      key: `department:${id}`,
      field: 'Department',
      label: optionLabel(departmentOptions, id),
      onRemove: () => handleDepartmentsChange(selectedDepartmentIds.filter((v) => v !== id)),
    })),
    ...selectedSubDepartmentIds.map((id) => ({
      key: `sub:${id}`,
      field: 'Sub-Dept',
      label: optionLabel(subDepartmentOptions, id),
      onRemove: () => updateCriteria({ subDepartmentId: selectedSubDepartmentIds.filter((v) => v !== id) }),
    })),
    ...selectedLevels.map((id) => ({
      key: `level:${id}`,
      field: 'Level',
      label: optionLabel(levelOptions, id),
      onRemove: () => updateCriteria({ level: selectedLevels.filter((v) => v !== id) }),
    })),
    ...selectedRoles.map((id) => ({
      key: `role:${id}`,
      field: 'Role',
      label: optionLabel(roleOptions, id),
      onRemove: () => updateCriteria({ role: selectedRoles.filter((v) => v !== id) }),
    })),
  ];

  function updateCriteria(patch) {
    setForm((prev) => ({ ...prev, criteria: { ...prev.criteria, ...patch } }));
  }

  // Dropping a parent also drops the children that no longer hang under it.
  function handleDivisionsChange(ids) {
    const keptDepartments = departments
      .filter((dept) => ids.includes(String(dept.divisionId)) && selectedDepartmentIds.includes(String(dept.id)))
      .map((dept) => String(dept.id));
    const keptSubs = subDepartments
      .filter((sub) => keptDepartments.includes(String(sub.departmentId)) && selectedSubDepartmentIds.includes(String(sub.id)))
      .map((sub) => String(sub.id));
    updateCriteria({ divisionId: ids, departmentId: keptDepartments, subDepartmentId: keptSubs });
  }

  function handleDepartmentsChange(ids) {
    const keptSubs = subDepartments
      .filter((sub) => ids.includes(String(sub.departmentId)) && selectedSubDepartmentIds.includes(String(sub.id)))
      .map((sub) => String(sub.id));
    updateCriteria({ departmentId: ids, subDepartmentId: keptSubs });
  }

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
      criteria: emptyCriteria(),
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
      criteria: hydrateCriteria(grp.criteria || emptyCriteria()),
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
        <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>Total Custom Groups</span>
            <span style={{ background: 'var(--blue-soft)', color: '#1D4ED8', padding: '4px 8px', borderRadius: 8, fontSize: 13 }}>
              <i className="ti ti-users-group" />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{totalGroups}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>A group for administering learning audiences</div>
        </div>

        <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>Total Employees In Group</span>
            <span style={{ background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', padding: '4px 8px', borderRadius: 8, fontSize: 13 }}>
              <i className="ti ti-user-check" />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--sage-soft-text)' }}>{totalAssignedHeadcount}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>Assigned to the target groups</div>
        </div>

        <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>Structural Group (Dynamic)</span>
            <span style={{ background: '#FAF5FF', color: '#7E22CE', padding: '4px 8px', borderRadius: 8, fontSize: 13 }}>
              <i className="ti ti-binary-tree" />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#7E22CE' }}>{dynamicGroups}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>Updates automatically with the org chart</div>
        </div>

        <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>Manual &amp; File Import</span>
            <span style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '4px 8px', borderRadius: 8, fontSize: 13 }}>
              <i className="ti ti-file-spreadsheet" />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber-soft-text)' }}>{manualGroups + fileGroups}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>A special group defined by list</div>
        </div>
      </div>

      {/* 2. SEARCH & ACTION TOOLBAR (ENTERPRISE 2-ROW) */}
      <div
        className="card"
        style={{
          background: 'var(--paper-raised)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 16,
        }}
      >
        {/* Row 1: Search + Group By + Filter Toggle + Action Buttons */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
            <i
              className="ti ti-search"
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-faint)',
                fontSize: 15,
              }}
            />
            <input
              type="text"
              className="field-input"
              placeholder="Search groups by name, ID, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
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

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Group By Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken, #F8FAFC)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Group by:</span>
              <select
                value={customGroupGroupBy}
                onChange={(e) => setCustomGroupGroupBy(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: customGroupGroupBy !== 'NONE' ? 700 : 500,
                  color: customGroupGroupBy !== 'NONE' ? 'var(--blue, #005BAA)' : 'var(--ink)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {CUSTOM_GROUP_GROUP_BY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowGroupFilters(!showGroupFilters)}
              className={`btn btn-sm ${activeGroupFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
              style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
            >
              <i className="ti ti-filter" />
              <span>Filters</span>
              {activeGroupFiltersCount > 0 && (
                <span style={{ background: 'var(--paper-raised)', color: 'var(--blue, #005BAA)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                  {activeGroupFiltersCount}
                </span>
              )}
              <i className={`ti ${showGroupFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
            </button>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button variant="outline" size="sm" icon="ti-settings" onClick={() => { setCategoryModal(true); setCategoryError(null); setNewCategoryLabel(''); setCategoryDrafts({}); }} style={{ height: 38 }}>
                Manage Categories
              </Button>
              <Button variant="outline" size="sm" icon="ti-download" onClick={handleDownloadTemplate} style={{ height: 38 }}>
                Download The Template (CSV)
              </Button>
              <Button variant="primary" size="sm" icon="ti-plus" onClick={handleOpenAdd} style={{ height: 38 }}>
                Create New Group
              </Button>
            </div>
          </div>
        </div>

        {/* Row 2: Collapsible Filter Grid with Top Labels */}
        {showGroupFilters && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {/* Filter 1: Group Type */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Group Type
                </label>
                <select
                  className="field-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    borderColor: typeFilter !== 'ALL' ? 'var(--blue, #005BAA)' : 'var(--line)',
                    background: typeFilter !== 'ALL' ? 'var(--blue-soft, #EFF6FF)' : 'var(--paper-raised)',
                    fontWeight: typeFilter !== 'ALL' ? 700 : 500,
                  }}
                >
                  <option value="ALL">All types</option>
                  <option value="DYNAMIC">🏢 Structural Group (Dynamic)</option>
                  <option value="MANUAL">👤 Manually Selected User Group</option>
                  <option value="FILE_IMPORT">📄 Group Imported From File (Template)</option>
                </select>
              </div>

              {/* Filter 2: Category */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Area / Category
                </label>
                <select
                  className="field-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    borderColor: categoryFilter !== 'ALL' ? 'var(--blue, #005BAA)' : 'var(--line)',
                    background: categoryFilter !== 'ALL' ? 'var(--blue-soft, #EFF6FF)' : 'var(--paper-raised)',
                    fontWeight: categoryFilter !== 'ALL' ? 700 : 500,
                  }}
                >
                  <option value="ALL">All categories ({CATEGORY_OPTIONS.length})</option>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reset Filters */}
            {activeGroupFiltersCount > 0 && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-soft)', paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
                <span>Applied <strong>{activeGroupFiltersCount}</strong> filter criteria</span>
                <button
                  type="button"
                  onClick={handleClearAllGroupFilters}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#E11D48',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  <i className="ti ti-trash-x" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. GROUPS TABLE & GROUPED ACCORDIONS */}
      {(() => {
        function renderGroupsTable(groupsToRender) {
          return (
            <div className="card" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>GROUP NAME &amp; DESCRIPTION</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, width: 140 }}>GROUP ID</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, width: 180 }}>TYPE</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, width: 150 }}>MEMBERS</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, width: 170 }}>UPDATED (LAST PROCESSED)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, width: 150 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupsToRender.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-faint)' }}>
                          <i className="ti ti-folder-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                          No matching user group found.
                        </td>
                      </tr>
                    ) : (
                      groupsToRender.map((grp) => {
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
                                  <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14, marginBottom: 2 }}>
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
                                  fontSize: 12,
                                  background: 'var(--slate-soft)',
                                  color: 'var(--ink-soft)',
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
                                <Badge tone="purple" icon="ti-binary-tree">By Structure</Badge>
                              ) : grp.type === 'FILE_IMPORT' ? (
                                <Badge tone="amber" icon="ti-file-spreadsheet">Import File</Badge>
                              ) : (
                                <Badge tone="blue" icon="ti-user-check">Select Users</Badge>
                              )}
                            </td>

                            {/* Member Count & View Button */}
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => setViewMembersGroup(grp)}
                                style={{
                                  background: 'var(--blue-soft)',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: 20,
                                  padding: '3px 10px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: 'var(--blue-soft-text)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}
                                title="Click to see the detailed member list"
                              >
                                <i className="ti ti-users" style={{ fontSize: 13 }} />
                                <span>{memberCount} learners</span>
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
                                  title="View the member list"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon="ti-edit"
                                  onClick={() => handleOpenEdit(grp)}
                                  title="Edit group"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon="ti-copy"
                                  onClick={() => duplicateCustomGroup(grp.id)}
                                  title="Duplicate group"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon="ti-trash"
                                  onClick={() => setDeleteConfirm({ isOpen: true, group: grp })}
                                  style={{ color: '#E11D48' }}
                                  title="Delete group"
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
          );
        }

        if (customGroupGroupBy === 'NONE') {
          return renderGroupsTable(filteredGroups);
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {groupedCustomGroups.map((sec) => {
              const isCollapsed = collapsedGroupSections[sec.id];
              return (
                <div
                  key={sec.id}
                  className="card"
                  style={{
                    background: 'var(--paper-raised)',
                    border: '1px solid var(--line)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Section Header */}
                  <div
                    onClick={() => toggleGroupSectionCollapse(sec.id)}
                    style={{
                      padding: '12px 18px',
                      background: 'var(--paper-sunken, #F8FAFC)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className={`ti ${sec.icon}`} style={{ fontSize: 18, color: 'var(--blue, #005BAA)' }} />
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                        {sec.title}
                      </span>
                      <Badge tone="blue">
                        {sec.groups.length} groups
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-soft)' }}>
                      <span style={{ fontSize: 12 }}>{isCollapsed ? 'Expand' : 'Collapse'}</span>
                      <i className={`ti ${isCollapsed ? 'ti-chevron-down' : 'ti-chevron-up'}`} />
                    </div>
                  </div>

                  {/* Section Content */}
                  {!isCollapsed && renderGroupsTable(sec.groups)}
                </div>
              );
            })}
          </div>
        );
      })()}

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
          title={`👥 Member List: ${viewMembersGroup.title || viewMembersGroup.name}`}
          maxWidth={1040}
        >
          <div>
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{viewMembersGroup.title} ({viewMembersGroup.code})</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{viewMembersGroup.description || 'No description.'}</div>
              </div>
              <Badge tone="blue">{filteredGroupMembers.length} members</Badge>
            </div>

            <div style={{ marginBottom: 12, position: 'relative' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 14 }} />
              <input
                type="text"
                className="field-input"
                placeholder="Search members by name, employee code, email, department..."
                value={memberViewSearch}
                onChange={(e) => setMemberViewSearch(e.target.value)}
                style={{ paddingLeft: 32, fontSize: 13 }}
              />
            </div>

            <div style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
              <table className="table" style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>FULL NAME</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', width: 120 }}>EMPLOYEE CODE</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>DEPARTMENT / SUB-DEPARTMENT</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 100 }}>JOB LEVEL</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 110 }}>ROLE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroupMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
                        No employee in this group matches the search term.
                      </td>
                    </tr>
                  ) : (
                    filteredGroupMembers.map((m) => (
                      <tr key={m.userId || m.employeeCode} style={{ borderBottom: '1px solid var(--line)', fontSize: 13 }}>
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
                Close
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
          title={groupModal.mode === 'ADD' ? '✨ Create A New User Group' : '✏️ Edit User Group'}
          maxWidth={800}
        >
          <form onSubmit={handleSaveSubmit}>
            {/* Basic Info */}
            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Audience Group Name *</label>
                <input
                  className="field-input"
                  placeholder="E.g. ALL_EXPAT, New employees..."
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="field-label">Group Code / ID *</label>
                <input
                  className="field-input"
                  placeholder="E.g. GRP-EXPAT, GRP-NEW-2026..."
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Group Category</label>
                <select
                  className="field-select"
                  value={CATEGORY_OPTIONS.some((c) => c.id === form.category) ? form.category : (CATEGORY_OPTIONS[0]?.id || '')}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Tag Identity Color</label>
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
              <label className="field-label">Group Purpose Description</label>
              <textarea
                className="field-input"
                rows={2}
                placeholder="Describe the group's purpose or its target audience in detail..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Method Tabs */}
            <div style={{ marginBottom: 14 }}>
              <label className="field-label" style={{ marginBottom: 6 }}>Membership Determination Method</label>
              <div style={{ display: 'flex', gap: 6, background: 'var(--slate-soft)', padding: 4, borderRadius: 8 }}>
                <button
                  type="button"
                  onClick={() => setFormTab('DYNAMIC')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: formTab === 'DYNAMIC' ? 'var(--paper-raised)' : 'transparent',
                    color: formTab === 'DYNAMIC' ? 'var(--blue)' : 'var(--ink-soft)',
                    fontWeight: formTab === 'DYNAMIC' ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: formTab === 'DYNAMIC' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <i className="ti ti-binary-tree" /> 🏢 By Org Structure
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('MANUAL')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: formTab === 'MANUAL' ? 'var(--paper-raised)' : 'transparent',
                    color: formTab === 'MANUAL' ? 'var(--blue)' : 'var(--ink-soft)',
                    fontWeight: formTab === 'MANUAL' ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: formTab === 'MANUAL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <i className="ti ti-user-check" /> Select Users
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('FILE_IMPORT')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: formTab === 'FILE_IMPORT' ? 'var(--paper-raised)' : 'transparent',
                    color: formTab === 'FILE_IMPORT' ? 'var(--blue)' : 'var(--ink-soft)',
                    fontWeight: formTab === 'FILE_IMPORT' ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: formTab === 'FILE_IMPORT' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <i className="ti ti-file-spreadsheet" /> 📄 Import File / Paste Codes
                </button>
              </div>
            </div>

            {/* TAB 1: DYNAMIC CRITERIA */}
            {formTab === 'DYNAMIC' && (
              <div style={{ padding: '12px 14px', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Configure The Automatic Filter Criteria (Org Hierarchy Criteria):
                </div>

                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 }}>
                  Each field takes several values — pick them one by one, or use
                  <strong> Select all</strong> inside the dropdown. A member matches when they
                  hit one of the values of every field that has a selection.
                </div>

                <div className="grid grid-3" style={{ gap: 10, marginBottom: 10 }}>
                  <MultiSelectField
                    label="Division"
                    options={divisionOptions}
                    selectedIds={selectedDivisionIds}
                    onChange={handleDivisionsChange}
                    allLabel="-- All Divisions --"
                  />

                  <MultiSelectField
                    label="Department"
                    options={departmentOptions}
                    selectedIds={selectedDepartmentIds}
                    onChange={handleDepartmentsChange}
                    disabled={selectedDivisionIds.length === 0}
                    allLabel="-- All Departments of the selected Divisions --"
                    lockedLabel="-- Select a Division first --"
                  />

                  <MultiSelectField
                    label="Parent Sub-Department"
                    options={subDepartmentOptions}
                    selectedIds={selectedSubDepartmentIds}
                    onChange={(ids) => updateCriteria({ subDepartmentId: ids })}
                    disabled={selectedDepartmentIds.length === 0 || subDepartmentOptions.length === 0}
                    allLabel="-- All Sub-Departments of the selected Departments --"
                    lockedLabel={selectedDepartmentIds.length === 0 ? '-- Select a Department first --' : '-- No sub-department --'}
                    align="right"
                  />
                </div>

                <div className="grid grid-2" style={{ gap: 10, marginBottom: 10 }}>
                  <MultiSelectField
                    label="Job Level"
                    options={levelOptions}
                    selectedIds={selectedLevels}
                    onChange={(ids) => updateCriteria({ level: ids })}
                    allLabel="-- Any level (1-7) --"
                  />

                  <MultiSelectField
                    label="Role"
                    options={roleOptions}
                    selectedIds={selectedRoles}
                    onChange={(ids) => updateCriteria({ role: ids })}
                    allLabel="-- Any role --"
                    align="right"
                  />
                </div>

                {criteriaChips.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
                    {criteriaChips.slice(0, CHIP_PREVIEW_LIMIT).map((chip) => (
                      <span
                        key={chip.key}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--paper-raised)', border: '1px solid var(--line-strong)', borderRadius: 999, padding: '3px 6px 3px 10px', fontSize: 11, color: 'var(--ink)' }}
                        title={`${chip.field}: ${chip.label}`}
                      >
                        <span style={{ color: 'var(--ink-faint)' }}>{chip.field}</span>
                        {chip.label}
                        <button
                          type="button"
                          onClick={chip.onRemove}
                          aria-label={`Remove ${chip.label}`}
                          style={{ border: 'none', background: 'transparent', color: 'var(--ink-faint)', cursor: 'pointer', lineHeight: 1, padding: 0, fontSize: 13 }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {criteriaChips.length > CHIP_PREVIEW_LIMIT && (
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                        +{criteriaChips.length - CHIP_PREVIEW_LIMIT} more
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, criteria: emptyCriteria() }))}
                      style={{ border: 'none', background: 'transparent', color: 'var(--rail)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
                    >
                      Clear all criteria
                    </button>
                  </div>
                )}

                {/* Live Match Preview */}
                <div style={{ background: 'var(--blue-soft)', border: '1px solid #BFDBFE', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--blue-soft-text)' }}>
                    <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
                    {criteriaChips.length === 0
                      ? 'No criteria picked yet — the group stays empty until at least one value is selected.'
                      : <>The system scanned and matched: <strong>{liveDynamicMembers.length} employees</strong></>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--blue-soft-text)', fontStyle: 'italic' }}>
                    Updates automatically when a matching new employee joins
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: MANUAL PICKER */}
            {formTab === 'MANUAL' && (
              <div style={{ padding: '12px 14px', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                    Select Individual Employees For The Group (Selected: {form.memberUserIds.length})
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button type="button" size="sm" variant="outline" onClick={selectAllManual}>Select all filters</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={deselectAllManual}>Deselect</Button>
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
                    placeholder="Search employees by name, employee code, email, department, job title..."
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    style={{ fontSize: 12, paddingLeft: 30, width: '100%', height: 34 }}
                  />
                </div>

                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--paper-raised)' }}>
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
                          background: isChecked ? 'var(--blue-soft)' : 'transparent',
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
              <div style={{ padding: '12px 14px', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                    Import The Member List (Template / Paste Codes):
                  </div>
                  <Button type="button" size="sm" variant="outline" icon="ti-download" onClick={handleDownloadTemplate}>
                    Download The Template (CSV)
                  </Button>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <input type="file" accept=".csv,.xlsx,.txt" onChange={handleFileUpload} style={{ fontSize: 12 }} />
                </div>

                <textarea
                  className="field-input"
                  rows={4}
                  placeholder="Or paste a list of employee codes / emails / user IDs here (one per line or comma-separated)..."
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    parseImportLines(e.target.value);
                  }}
                  style={{ fontSize: 12, fontFamily: 'monospace' }}
                />

                {importFeedback && (
                  <div style={{ marginTop: 8, fontSize: 12, padding: '6px 10px', borderRadius: 6, background: importFeedback.matched > 0 ? 'var(--sage-soft)' : 'var(--rust-soft)', color: importFeedback.matched > 0 ? 'var(--sage-soft-text)' : 'var(--rust-soft-text)' }}>
                    <i className="ti ti-check" style={{ marginRight: 4 }} />
                    Matched successfully: <strong>{importFeedback.matched}</strong> employees (out of {importFeedback.total} rows).
                    {importFeedback.unmatched > 0 && (
                      <span style={{ color: 'var(--rust-soft-text)', marginLeft: 8 }}>
                        ({importFeedback.unmatched} codes not found in the system)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <Button type="button" variant="outline" onClick={() => setGroupModal({ isOpen: false, mode: 'ADD', data: null })}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {groupModal.mode === 'ADD' ? 'Create Group' : 'Save Changes'}
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
          <div className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 12, maxWidth: 440, width: '90%' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
              Confirm Group Deletion
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
              Are you sure you want to delete the group <strong>"{deleteConfirm.group?.title || deleteConfirm.group?.name}"</strong>?
              Curricula or courses already assigned to this group are unaffected.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" type="button" onClick={() => setDeleteConfirm({ isOpen: false, group: null })}>
                Cancel
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
                Confirm Deletion
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE THE AREA / CATEGORY CATALOG */}
      {categoryModal && (
        <Modal
          title="⚙️ Manage Group Categories"
          onClose={() => setCategoryModal(false)}
          size="md"
        >
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
            These are the areas the group list is filtered and grouped by. Renaming one keeps the
            groups that use it; deleting one moves its groups to the first category in the list.
          </div>

          <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
            {CATEGORY_OPTIONS.map((cat, index) => {
              const usage = customGroups.filter((g) => (g.category || 'SPECIAL_COHORT') === cat.id).length;
              return (
                <div
                  key={cat.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: index === 0 ? 'none' : '1px solid var(--line)' }}
                >
                  <input
                    className="field-input"
                    style={{ fontSize: 13, flex: 1 }}
                    value={categoryDrafts[cat.id] ?? cat.label}
                    onChange={(e) => setCategoryDrafts((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                    onBlur={() => commitCategoryRename(cat)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>
                    {usage} group{usage === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    disabled={CATEGORY_OPTIONS.length <= 1}
                    aria-label={`Delete ${cat.label}`}
                    title={CATEGORY_OPTIONS.length <= 1 ? 'At least one category has to stay' : `Delete ${cat.label}`}
                    style={{ border: 'none', background: 'transparent', color: CATEGORY_OPTIONS.length <= 1 ? 'var(--ink-faint)' : '#E11D48', cursor: CATEGORY_OPTIONS.length <= 1 ? 'not-allowed' : 'pointer', fontSize: 15 }}
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              );
            })}
          </div>

          <label className="field-label" style={{ fontSize: 12 }}>Add a new category</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              className="field-input"
              style={{ fontSize: 13, flex: 1 }}
              placeholder="e.g. Sustainability & ESG"
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                handleAddCategory();
              }}
            />
            <Button variant="primary" size="sm" icon="ti-plus" type="button" onClick={handleAddCategory}>
              Add
            </Button>
          </div>

          {categoryError && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--rust-soft)', color: 'var(--rust-soft-text)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />{categoryError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" type="button" onClick={() => setCategoryModal(false)}>Done</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
