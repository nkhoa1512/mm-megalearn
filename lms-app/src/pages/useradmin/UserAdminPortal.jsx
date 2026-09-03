import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  allUsers,
  userAdminUser,
} from '../../data/mockData';
import OrgHierarchyBrowser from '../../features/common/OrgHierarchyBrowser';
import { Badge, Button, Modal, JobLevelBadge } from '../../features/common/ui';
import { useCourseStore } from '../../store/CourseStore';
import { LEVEL_DEFINITIONS, normalizeLevel, levelDefinition } from '../../data/levelSystem';
import { ROLE_DEFINITIONS, normalizeRole, roleDefinition, managedRolesOf } from '../../data/roles';
import UserTranscriptModal from '../../features/common/UserTranscriptModal';
import CustomGroupsManager from '../../features/useradmin/CustomGroupsManager';

export default function UserAdminPortal({ initialTab = 'DIRECTORY' }) {
  const navigate = useNavigate();
  // 3 Core Tabs: DIRECTORY | HIERARCHY | JOB_LEVELS
  const [activeTab, setActiveTab] = useState(initialTab === 'ALLOCATION' || initialTab === 'TRAINER_ASSIGNMENT' ? 'DIRECTORY' : initialTab);
  useEffect(() => {
    if (initialTab !== 'ALLOCATION' && initialTab !== 'TRAINER_ASSIGNMENT') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const {
    users = [],
    addUser,
    updateUser,
    deleteUser,
    importUsers,
    jobLevels = [],
    addJobLevel,
    updateJobLevel,
    deleteJobLevel,
    divisions = [],
    departments = [],
    subDepartments = [],
    businessUnits = [],
    customGroups = [],
    language,
    t,
  } = useCourseStore();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedDiv, setSelectedDiv] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedSubDept, setSelectedSubDept] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [showUserFilters, setShowUserFilters] = useState(false);
  const [userGroupBy, setUserGroupBy] = useState('NONE');
  const [userViewMode, setUserViewMode] = useState('TABLE');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [transcriptUser, setTranscriptUser] = useState(null);

  const USER_GROUP_BY_OPTIONS = [
    { id: 'NONE', label: 'No grouping' },
    { id: 'DIVISION', label: 'By Division' },
    { id: 'DEPARTMENT', label: 'By Department' },
    { id: 'LEVEL', label: 'By Job Level' },
    { id: 'BRANCH', label: 'By Head Office / Store' },
    { id: 'ROLE', label: 'By System Role' },
  ];

  // User Modal State
  const [userModal, setUserModal] = useState({ isOpen: false, mode: 'ADD' });
  const [userForm, setUserForm] = useState({
    userId: '',
    employeeCode: '',
    fullName: '',
    email: '',
    position: '',
    title: '',
    level: '7',
    role: 'learner',
    branch: 'SUPPORTING',
    businessUnitId: 'bu-mmvn',
    divisionId: '',
    departmentId: '',
    subDepartmentId: '',
    yearsOfService: 1.0,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // "Add Employees" modal: manual entry (one or a handful at a time) or bulk import
  const [addTab, setAddTab] = useState('MANUAL');
  const [stagedUsers, setStagedUsers] = useState([]);
  const [addError, setAddError] = useState(null);
  const [importText, setImportText] = useState('');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [importFeedback, setImportFeedback] = useState(null);

  // Job Level Modal State
  const [levelModal, setLevelModal] = useState({ isOpen: false, mode: 'ADD', data: null });
  const [levelForm, setLevelForm] = useState({
    level: '',
    titleEn: '',
    viTitle: '',
    titleVi: '',
    title: '',
    code: '',
    authority: 'STANDARD',
    band: 'GENERAL',
    descVi: '',
    emoji: '⭐',
    colors: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  });

  // Delete Confirm Modal
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: '', id: null, title: '', message: '' });

  const rawUsers = typeof allUsers === 'function' ? allUsers() : (allUsers || []);
  const userList = users && users.length > 0 ? users : rawUsers;

  const filteredUsers = useMemo(() => {
    return userList.filter((u) => {
      const matchSearch = !search ||
        (u.fullName && u.fullName.toLowerCase().includes(search.toLowerCase())) ||
        (u.userId && u.userId.toLowerCase().includes(search.toLowerCase())) ||
        (u.employeeCode && u.employeeCode.toLowerCase().includes(search.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
        (u.title && u.title.toLowerCase().includes(search.toLowerCase())) ||
        (u.position && u.position.toLowerCase().includes(search.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(search.toLowerCase())) ||
        (u.departmentName && u.departmentName.toLowerCase().includes(search.toLowerCase())) ||
        (u.subDepartmentName && u.subDepartmentName.toLowerCase().includes(search.toLowerCase())) ||
        (u.divisionName && u.divisionName.toLowerCase().includes(search.toLowerCase()));

      const matchBranch = selectedBranch === 'ALL' ||
        (selectedBranch === 'HEAD_OFFICE' && (u.branch === 'HEAD_OFFICE' || u.branch === 'SUPPORTING' || !u.store)) ||
        (selectedBranch === 'OPERATIONS' && (u.branch === 'OPERATIONS' || Boolean(u.store)));

      const matchDiv = selectedDiv === 'ALL' ||
        u.divisionId === selectedDiv ||
        u.divisionCode === selectedDiv;

      const matchDept = selectedDept === 'ALL' ||
        u.departmentId === selectedDept ||
        u.department === selectedDept ||
        u.departmentCode === selectedDept;

      const matchSubDept = selectedSubDept === 'ALL' ||
        u.subDepartmentId === selectedSubDept ||
        u.subDepartmentCode === selectedSubDept;

      const matchLevel = selectedLevel === 'ALL' || String(u.level) === String(selectedLevel);

      const matchRole = selectedRole === 'ALL' || normalizeRole(u.role) === normalizeRole(selectedRole);

      return matchSearch && matchBranch && matchDiv && matchDept && matchSubDept && matchLevel && matchRole;
    });
  }, [userList, search, selectedBranch, selectedDiv, selectedDept, selectedSubDept, selectedLevel, selectedRole]);

  const activeUserFiltersCount =
    (selectedBranch !== 'ALL' ? 1 : 0) +
    (selectedDiv !== 'ALL' ? 1 : 0) +
    (selectedDept !== 'ALL' ? 1 : 0) +
    (selectedSubDept !== 'ALL' ? 1 : 0) +
    (selectedLevel !== 'ALL' ? 1 : 0) +
    (selectedRole !== 'ALL' ? 1 : 0);

  function handleClearAllUserFilters() {
    setSearch('');
    setSelectedBranch('ALL');
    setSelectedDiv('ALL');
    setSelectedDept('ALL');
    setSelectedSubDept('ALL');
    setSelectedLevel('ALL');
    setSelectedRole('ALL');
  }

  function toggleGroupCollapse(groupId) {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  const groupedUsers = useMemo(() => {
    if (userGroupBy === 'NONE') return null;
    const map = {};
    filteredUsers.forEach((u) => {
      let key = 'OTHER';
      let title = 'Uncategorized';
      let icon = 'ti-folder';

      if (userGroupBy === 'DIVISION') {
        key = u.divisionId || u.divisionCode || 'UNKNOWN';
        title = u.divisionName || u.divisionCode || 'Unclassified Division';
        icon = 'ti-building';
      } else if (userGroupBy === 'DEPARTMENT') {
        key = u.departmentId || u.department || 'UNKNOWN';
        title = u.departmentName || u.department || 'General Department';
        icon = 'ti-folders';
      } else if (userGroupBy === 'LEVEL') {
        key = String(u.level || '7');
        const def = levelDefinition(u.level || '7');
        title = `Level ${u.level || '7'} — ${def.shortVi || def.titleVi}`;
        icon = 'ti-id-badge-2';
      } else if (userGroupBy === 'BRANCH') {
        const isOps = u.branch === 'OPERATIONS' || Boolean(u.store);
        key = isOps ? 'OPERATIONS' : 'HEAD_OFFICE';
        title = isOps ? '🛒 Stores & Operations Centers' : '🏢 Head Office';
        icon = isOps ? 'ti-building-store' : 'ti-building';
      } else if (userGroupBy === 'ROLE') {
        key = u.role || 'learner';
        const rDef = roleDefinition(u.role || 'learner');
        title = `Role: ${rDef.titleVi || u.role}`;
        icon = 'ti-shield-check';
      }

      if (!map[key]) {
        map[key] = { id: key, title, icon, users: [] };
      }
      map[key].users.push(u);
    });

    return Object.values(map);
  }, [filteredUsers, userGroupBy]);

  // User Handlers
  function blankUserForm() {
    const rawNum = Math.floor(1000 + Math.random() * 9000);
    return {
      userId: `USR-${rawNum}`,
      employeeCode: `MMVN-${rawNum}`,
      fullName: '',
      email: '',
      position: 'Store Associate',
      title: 'Store Associate',
      level: '7',
      role: 'learner',
      branch: 'SUPPORTING',
      businessUnitId: businessUnits[0]?.id || 'bu-mmvn',
      // The org fields start empty: they are picked top-down, Division first.
      divisionId: '',
      departmentId: '',
      subDepartmentId: '',
      yearsOfService: 1.0,
    };
  }

  function handleOpenAddUser(tab = 'MANUAL') {
    setUserForm(blankUserForm());
    setStagedUsers([]);
    setAddError(null);
    setAddTab(tab);
    setUserModal({ isOpen: true, mode: 'ADD' });
  }

  function handleCloseUserModal() {
    setUserModal({ isOpen: false, mode: 'ADD' });
    setStagedUsers([]);
    setAddError(null);
    setImportText('');
    setParsedPreview([]);
  }

  function handleOpenEditUser(user) {
    setUserForm({
      ...user,
      title: user.title || user.position || '',
      position: user.position || user.title || '',
      level: normalizeLevel(user.level || '7'),
      role: normalizeRole(user.role || 'learner'),
      branch: user.branch || 'SUPPORTING',
    });
    setStagedUsers([]);
    setAddError(null);
    setUserModal({ isOpen: true, mode: 'EDIT' });
  }

  // Fills in the names / codes of the org units the form only stores ids for.
  function buildUserPayload(formData) {
    const deptObj = departments.find((d) => d.id === formData.departmentId);
    const subObj = subDepartments.find((sub) => sub.id === formData.subDepartmentId);
    const divObj = divisions.find((div) => div.id === formData.divisionId || div.id === deptObj?.divisionId);

    return {
      ...formData,
      departmentName: deptObj ? deptObj.name : formData.departmentName,
      departmentCode: deptObj ? deptObj.code : formData.departmentCode,
      subDepartmentName: subObj ? subObj.name : null,
      subDepartmentCode: subObj ? subObj.code : null,
      divisionId: divObj ? divObj.id : formData.divisionId,
      divisionCode: divObj ? divObj.code : null,
      divisionName: divObj ? divObj.name : null,
      businessUnitId: 'bu-mmvn',
      businessUnitCode: 'MMVN',
      businessUnitName: 'MM Mega Market Vietnam',
    };
  }

  const manualFormFilled = Boolean(userForm.fullName?.trim() || userForm.email?.trim());
  const availableSubDepartments = subDepartments.filter((sub) => sub.departmentId === userForm.departmentId);
  // The row on screen counts as one more employee as soon as it has something in it.
  const pendingUserCount = Math.max(1, stagedUsers.length + (manualFormFilled ? 1 : 0));

  // Returns the first problem with the row being typed, or null when it can be created.
  function validateNewUser(formData, alreadyQueued = []) {
    const code = (formData.employeeCode || formData.userId || '').trim();
    const email = (formData.email || '').trim().toLowerCase();
    if (!code) return 'Employee ID is required.';
    if (!formData.fullName?.trim()) return 'Full name is required.';
    if (!email) return 'Business email is required.';
    if (!formData.divisionId) return 'Pick the Parent Division.';
    if (!formData.departmentId) return 'Pick the Parent Department.';

    const takenCode = users.some((u) => u.employeeCode === code || u.userId === code)
      || alreadyQueued.some((u) => u.employeeCode === code || u.userId === code);
    if (takenCode) return `Employee ID ${code} already exists.`;

    const takenEmail = users.some((u) => (u.email || '').toLowerCase() === email)
      || alreadyQueued.some((u) => (u.email || '').toLowerCase() === email);
    if (takenEmail) return `The email ${email} is already used by another employee.`;

    return null;
  }

  // Queues the row on screen and clears it for the next person, keeping the org unit,
  // level and role so a whole team can be typed in without re-picking them.
  function handleStageUser() {
    const problem = validateNewUser(userForm, stagedUsers);
    if (problem) {
      setAddError(problem);
      return;
    }
    setStagedUsers((prev) => [...prev, buildUserPayload(userForm)]);
    setAddError(null);
    const rawNum = Math.floor(1000 + Math.random() * 9000);
    setUserForm((p) => ({
      ...p,
      userId: `USR-${rawNum}`,
      employeeCode: `MMVN-${rawNum}`,
      fullName: '',
      email: '',
    }));
  }

  function handleRemoveStagedUser(code) {
    setStagedUsers((prev) => prev.filter((u) => u.employeeCode !== code));
  }

  function handleSaveUserSubmit(e) {
    e.preventDefault();

    if (userModal.mode === 'EDIT') {
      if (!userForm.fullName.trim() || !userForm.email.trim()) return;
      updateUser(userForm.userId, buildUserPayload(userForm));
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setUserModal({ isOpen: false, mode: 'ADD' });
      }, 900);
      return;
    }

    const toCreate = [...stagedUsers];
    if (manualFormFilled) {
      const problem = validateNewUser(userForm, toCreate);
      if (problem) {
        setAddError(problem);
        return;
      }
      toCreate.push(buildUserPayload(userForm));
    }
    if (toCreate.length === 0) {
      setAddError('Fill in the employee details first.');
      return;
    }

    toCreate.forEach((u) => addUser(u));
    setAddError(null);
    setStagedUsers([]);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      handleCloseUserModal();
    }, 900);
  }

  // Bulk User Import Handlers
  function handleDownloadTemplate(format = 'csv') {
    if (format === 'csv') {
      const csvHeader = 'Employee Code,Full Name,Email,Job Title,Level (1-7),Role (learner/manager/trainer/hrbp/useradmin/sysadmin),Division Code,Dept Code,Sub-Dept Code\n';
      const sampleRows = [
        'MMVN-3001,Nguyen Van An,an.nguyen3001@mmvietnam.com,Bakery Specialist,7,learner,1010_AP,FF_ST,SUB-BAKERY',
        'MMVN-3002,Tran Thi Binh,binh.tran3002@mmvietnam.com,Customer Service Lead,5,learner,1010_AP,CS_ST,SUB-FO',
        'MMVN-3003,Le Hoang Nam,nam.le3003@mmvietnam.com,Store Department Manager,4,manager,1011_BP,FF_ST,SUB-BAKERY',
        'MMVN-3004,Pham Minh Chau,chau.pham3004@mmvietnam.com,L&OD Specialist,3,trainer,HRD,HR_LOD,SUB-SF-NL',
      ].join('\n');

      const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'template_import_nhan_su_mmvn.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const jsonSample = [
        {
          employeeCode: 'MMVN-3001',
          fullName: 'Nguyen Van An',
          email: 'an.nguyen3001@mmvietnam.com',
          title: 'Bakery Specialist',
          level: '7',
          role: 'learner',
          divisionCode: '1010_AP',
          departmentCode: 'FF_ST',
          subDepartmentCode: 'SUB-BAKERY',
        },
      ];
      const blob = new Blob([JSON.stringify(jsonSample, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'template_import_nhan_su_mmvn.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      setImportText(text);
      parseImportContent(text);
    };
    reader.readAsText(file);
  }

  function parseImportContent(raw) {
    if (!raw.trim()) {
      setParsedPreview([]);
      return;
    }

    const trimmed = raw.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const normalized = list.map(mapIncomingUser);
        setParsedPreview(normalized);
        return;
      } catch (err) {}
    }

    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      setParsedPreview([]);
      return;
    }

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('code') || firstLine.includes('code') || firstLine.includes('name') || firstLine.includes('email');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const parsedList = dataLines.map((line, idx) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const empCode = cols[0] || `MMVN-IMP-${1000 + idx}`;
      const fullName = cols[1] || 'New Employee';
      const email = cols[2] || `${empCode.toLowerCase()}@mmvietnam.com`;
      const title = cols[3] || 'Executive';
      const level = cols[4] || '7';
      const role = cols[5] || 'learner';
      const divCode = cols[6] || '';
      const deptCode = cols[7] || '';
      const subDeptCode = cols[8] || '';

      return mapIncomingUser({
        employeeCode: empCode,
        fullName,
        email,
        title,
        position: title,
        level,
        role,
        divisionCode: divCode,
        departmentCode: deptCode,
        subDepartmentCode: subDeptCode,
      });
    });

    setParsedPreview(parsedList);
  }

  function mapIncomingUser(u) {
    let matchedDiv = divisions.find((d) => d.code?.toLowerCase() === u.divisionCode?.toLowerCase() || d.name?.toLowerCase() === u.divisionCode?.toLowerCase());
    let matchedDept = departments.find((d) => d.code?.toLowerCase() === u.departmentCode?.toLowerCase() || d.name?.toLowerCase() === u.departmentCode?.toLowerCase());
    let matchedSub = subDepartments.find((s) => s.code?.toLowerCase() === u.subDepartmentCode?.toLowerCase() || s.name?.toLowerCase() === u.subDepartmentCode?.toLowerCase());

    if (matchedSub && !matchedDept) {
      matchedDept = departments.find((d) => d.id === matchedSub.departmentId);
    }
    if (matchedDept && !matchedDiv) {
      matchedDiv = divisions.find((d) => d.id === matchedDept.divisionId);
    }

    const rawEmpCode = u.employeeCode || u.userId || `MMVN-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      userId: u.userId || rawEmpCode,
      employeeCode: rawEmpCode,
      fullName: u.fullName || 'New Employee',
      email: u.email || `${rawEmpCode.toLowerCase()}@mmvietnam.com`,
      title: u.title || u.position || 'Executive',
      position: u.position || u.title || 'Executive',
      level: normalizeLevel(u.level || '7'),
      role: normalizeRole(u.role || 'learner'),
      branch: matchedDiv?.branch || (matchedDiv?.code && isNaN(parseInt(matchedDiv.code[0])) ? 'SUPPORTING' : 'OPERATIONS'),
      businessUnitId: 'bu-mmvn',
      businessUnitCode: 'MMVN',
      businessUnitName: 'MM Mega Market Vietnam',
      divisionId: matchedDiv?.id || null,
      divisionCode: matchedDiv?.code || u.divisionCode || null,
      divisionName: matchedDiv?.name || u.divisionCode || null,
      departmentId: matchedDept?.id || null,
      departmentCode: matchedDept?.code || u.departmentCode || null,
      departmentName: matchedDept?.name || u.departmentCode || null,
      subDepartmentId: matchedSub?.id || null,
      subDepartmentCode: matchedSub?.code || u.subDepartmentCode || null,
      subDepartmentName: matchedSub?.name || u.subDepartmentCode || null,
      yearsOfService: +(u.yearsOfService || 1.0),
      status: 'ACTIVE',
    };
  }

  function handleExecuteImport() {
    if (!parsedPreview || parsedPreview.length === 0) return;
    importUsers(parsedPreview);
    setImportFeedback(`Successfully loaded ${parsedPreview.length} employees into the system!`);
    setTimeout(() => {
      setImportFeedback(null);
      handleCloseUserModal();
    }, 1500);
  }

  // Job Level Handlers
  function handleOpenAddLevel() {
    const nextLvlNum = String(jobLevels.length + 1);
    setLevelForm({
      level: nextLvlNum,
      titleEn: `Level ${nextLvlNum}`,
      titleVi: `Level ${nextLvlNum} Employee`,
      viTitle: `Level ${nextLvlNum} Employee`,
      title: `Level ${nextLvlNum}`,
      code: `L${nextLvlNum}_STAFF`,
      authority: 'STANDARD',
      band: 'GENERAL',
      descVi: 'The job level within the MM Mega Market competency standard framework.',
      emoji: '⭐',
      headcount: 0,
      colors: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
    });
    setLevelModal({ isOpen: true, mode: 'ADD', data: null });
  }

  function handleOpenEditLevel(lvl) {
    setLevelForm({
      level: String(lvl.level),
      titleEn: lvl.titleEn || lvl.title || '',
      titleVi: lvl.titleVi || lvl.viTitle || '',
      viTitle: lvl.viTitle || lvl.titleVi || lvl.title || '',
      title: lvl.title || lvl.titleEn || '',
      code: lvl.code || `L${lvl.level}_STAFF`,
      authority: lvl.authority || 'STANDARD',
      band: lvl.band || 'GENERAL',
      descVi: lvl.descVi || '',
      emoji: lvl.emoji || '⭐',
      headcount: lvl.headcount || 0,
      colors: lvl.colors || { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
    });
    setLevelModal({ isOpen: true, mode: 'EDIT', data: lvl });
  }

  function handleSaveLevelSubmit(e) {
    e.preventDefault();
    if (!levelForm.level || (!levelForm.viTitle.trim() && !levelForm.titleVi.trim())) return;
    const finalForm = {
      ...levelForm,
      titleVi: levelForm.titleVi || levelForm.viTitle,
      viTitle: levelForm.viTitle || levelForm.titleVi,
      titleEn: levelForm.titleEn || levelForm.title,
      title: levelForm.titleEn || levelForm.title || levelForm.viTitle,
    };
    if (levelModal.mode === 'ADD') {
      addJobLevel(finalForm);
    } else if (levelModal.data) {
      updateJobLevel(levelModal.data.level, finalForm);
    }
    setLevelModal({ isOpen: false, mode: 'ADD', data: null });
  }

  // Delete Action Confirm
  function handleConfirmDelete() {
    const { type, id } = deleteConfirm;
    if (type === 'USER') {
      deleteUser(id);
      if (transcriptUser && (transcriptUser.userId === id || transcriptUser.employeeCode === id)) {
        setTranscriptUser(null);
      }
    }
    if (type === 'JOB_LEVEL') {
      deleteJobLevel(id);
    }
    setDeleteConfirm({ isOpen: false, type: '', id: null, title: '', message: '' });
  }

  const TABS = [
    { id: 'DIRECTORY', labelVi: 'Employee Directory', labelEn: 'Staff Directory', icon: 'ti-address-book', count: userList.length },
    { id: 'GROUPS', labelVi: 'Custom Groups', labelEn: 'Custom Groups', icon: 'ti-users-group', count: customGroups.length },
    { id: 'HIERARCHY', labelVi: 'Organization Tree (42 Divisions)', labelEn: 'Org Hierarchy Tree', icon: 'ti-binary-tree', count: divisions.length },
    { id: 'JOB_LEVELS', labelVi: 'Job Level Framework (7 Levels)', labelEn: 'Job Level Framework', icon: 'ti-id-badge-2', count: jobLevels.length },
  ];

  return (
    <>
      {/* HEADER & QUICK ACTION LINKS */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
              {language === 'en' ? 'User Administration & Org Structure' : 'People Administration & Org Structure'}
            </h1>
            <Badge tone="blue" icon="ti-shield-check">User Administrator</Badge>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
            Administrator: <strong>{userAdminUser.fullName}</strong> &middot; {userAdminUser.departmentName || userAdminUser.department} &middot; Manages employee records &amp; the MM Mega Market org structure
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
            Personal Interface
          </Button>
        </div>
      </div>

      {/* 3 CORE TABS NAVIGATION BAR */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'var(--paper-raised)',
          padding: '6px',
          borderRadius: 12,
          border: '1px solid var(--line)',
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const tabLabel = language === 'en' ? tab.labelEn : tab.labelVi;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                border: 'none',
                background: isActive ? 'var(--blue, #005BAA)' : 'transparent',
                color: isActive ? '#fff' : 'var(--ink)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <i className={`ti ${tab.icon}`} style={{ fontSize: 16 }} />
              <span>{tabLabel}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--paper-sunken, #F1F5F9)',
                    color: isActive ? '#fff' : 'var(--ink-soft)',
                    padding: '1px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DIRECTORY */}
      {activeTab === 'DIRECTORY' && (() => {
        function renderUserTable(usersToRender) {
          return (
            <div className="card" style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper-raised)' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Employee Code</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Full Name</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Job Title &amp; Position</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Structure &amp; Parent Sub-Department</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Job Level</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>System Role</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersToRender.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-soft)' }}>
                        <i className="ti ti-users" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: 'var(--ink-faint)' }} />
                        No employee matches the current filters.
                      </td>
                    </tr>
                  ) : (
                    usersToRender.map((u) => (
                      <tr key={u.userId || u.employeeCode} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue, #005BAA)' }}>
                          {u.employeeCode || u.userId}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{u.fullName}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{u.email}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{u.position || u.title || 'Store Associate'}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                            {u.divisionName || u.storeName || u.departmentName || 'MM Mega Market VN'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                            Department: <strong>{u.departmentName || u.departmentCode || u.department || 'Chung'}</strong>
                          </div>
                          {u.subDepartmentName ? (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'var(--blue-soft-text)',
                              background: 'var(--blue-soft)',
                              border: '1px solid #BFDBFE',
                              padding: '2px 8px',
                              borderRadius: 4,
                              marginTop: 4,
                            }}>
                              <i className="ti ti-git-branch" style={{ fontSize: 12 }} />
                              <span>{u.subDepartmentName}</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontStyle: 'italic', marginTop: 2 }}>
                              No sub-dept assigned
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                            {u.branch === 'HEAD_OFFICE' || u.branch === 'SUPPORTING' ? '🏢 Head Office' : '🛒 Store Operations'}
                          </div>
                        </td>
                        <td>
                          <JobLevelBadge level={u.level} compact />
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 3, lineHeight: 1.35 }}>
                            {levelDefinition(u.level).shortVi}
                          </div>
                        </td>
                        <td>
                          <Badge tone={roleDefinition(u.role).tone}>
                            {roleDefinition(u.role).shortVi}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <Button
                              size="sm"
                              variant="primary"
                              icon="ti-id-badge-2"
                              onClick={() => setTranscriptUser(u)}
                              title="Open the employee profile: details, courses, promotion"
                              style={{
                                background: 'linear-gradient(135deg, #1E40AF 0%, #4338CA 100%)',
                                fontSize: 12,
                              }}
                            >
                              Profile
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              icon="ti-edit"
                              onClick={() => handleOpenEditUser(u)}
                              title="Edit the employee details"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              icon="ti-trash"
                              onClick={() =>
                                setDeleteConfirm({
                                  isOpen: true,
                                  type: 'USER',
                                  id: u.userId,
                                  title: `Delete Employee ${u.fullName}`,
                                  message: `Are you sure you want to remove the employee "${u.fullName}" (${u.employeeCode || u.userId}) from the directory?`,
                                })
                              }
                              style={{ color: '#E11D48' }}
                              title="Delete employee"
                            />
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

        function renderUserGrid(usersToRender) {
          if (usersToRender.length === 0) {
            return (
              <div className="card card-pad" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-soft)', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10 }}>
                <i className="ti ti-users" style={{ fontSize: 36, display: 'block', marginBottom: 8, color: 'var(--ink-faint)' }} />
                No employee matches the current filters.
              </div>
            );
          }

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
              {usersToRender.map((u) => (
                <div
                  key={u.userId || u.employeeCode}
                  className="card card-pad"
                  style={{
                    background: 'var(--paper-raised)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #005BAA 0%, #1E40AF 100%)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 15,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {u.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{u.fullName}</div>
                          <div style={{ fontSize: 12, color: 'var(--blue, #005BAA)', fontFamily: 'monospace', fontWeight: 600 }}>{u.employeeCode || u.userId}</div>
                        </div>
                      </div>
                      <Badge tone={roleDefinition(u.role).tone}>
                        {roleDefinition(u.role).shortVi}
                      </Badge>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
                      {u.position || u.title || 'Store Associate'}
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'var(--paper-sunken, #F8FAFC)', padding: '8px 10px', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 3, border: '1px solid var(--line)' }}>
                      <div>🏢 <strong>{u.divisionName || u.storeName || 'MM Mega Market'}</strong></div>
                      <div>Department: <strong>{u.departmentName || u.departmentCode || u.department || 'Chung'}</strong></div>
                      {u.subDepartmentName ? (
                        <div style={{ color: 'var(--blue-soft-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ti ti-git-branch" style={{ fontSize: 11 }} /> {u.subDepartmentName}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--ink-faint)', fontStyle: 'italic', fontSize: 11 }}>
                          {u.branch === 'HEAD_OFFICE' || u.branch === 'SUPPORTING' ? 'Head Office' : 'Store Operations'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                    <JobLevelBadge level={u.level} compact />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button size="sm" variant="primary" icon="ti-id-badge-2" onClick={() => setTranscriptUser(u)} style={{ fontSize: 11, padding: '4px 8px' }}>
                        Profile
                      </Button>
                      <Button size="sm" variant="outline" icon="ti-edit" onClick={() => handleOpenEditUser(u)} style={{ padding: '4px 6px' }} />
                      <Button size="sm" variant="ghost" icon="ti-trash" onClick={() => setDeleteConfirm({ isOpen: true, type: 'USER', id: u.userId, title: `Delete Employee ${u.fullName}`, message: `Are you sure you want to delete the employee "${u.fullName}"?` })} style={{ color: '#E11D48', padding: '4px 6px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filter & Toolbar Card */}
            <div className="card" style={{ padding: '16px 20px', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 12 }}>
              {/* Row 1: Search + Group By + Filters Toggle + View Mode Switcher + Action Buttons */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {/* Search Input */}
                <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                  <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                  <input
                    type="text"
                    className="field-input"
                    style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                    placeholder="Search by name, employee code, email, job title, department..."
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

                {/* Right controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Group By Select */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken, #F8FAFC)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Group by:</span>
                    <select
                      value={userGroupBy}
                      onChange={(e) => setUserGroupBy(e.target.value)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: 13,
                        fontWeight: userGroupBy !== 'NONE' ? 700 : 500,
                        color: userGroupBy !== 'NONE' ? 'var(--blue, #005BAA)' : 'var(--ink)',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {USER_GROUP_BY_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowUserFilters(!showUserFilters)}
                    className={`btn btn-sm ${activeUserFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
                    style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
                  >
                    <i className="ti ti-filter" />
                    <span>Filters</span>
                    {activeUserFiltersCount > 0 && (
                      <span style={{ background: 'var(--paper-raised)', color: 'var(--blue, #005BAA)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                        {activeUserFiltersCount}
                      </span>
                    )}
                    <i className={`ti ${showUserFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
                  </button>

                  {/* View Mode Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--paper-sunken, #F8FAFC)', padding: 3, borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
                    <button
                      type="button"
                      onClick={() => setUserViewMode('GRID')}
                      className={`btn btn-sm ${userViewMode === 'GRID' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                      title="Grid View"
                    >
                      <i className="ti ti-layout-grid" />
                      <span>Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserViewMode('TABLE')}
                      className={`btn btn-sm ${userViewMode === 'TABLE' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                      title="List View"
                    >
                      <i className="ti ti-list" />
                      <span>Table</span>
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button size="sm" variant="outline" icon="ti-file-import" onClick={() => handleOpenAddUser('IMPORT')} style={{ height: 38 }}>
                      Bulk Import
                    </Button>
                    <Button size="sm" variant="primary" icon="ti-user-plus" onClick={() => handleOpenAddUser('MANUAL')} style={{ height: 38 }}>
                      Add Employees
                    </Button>
                  </div>
                </div>
              </div>

              {/* Row 2: Collapsible Filter Grid with Top Labels */}
              {showUserFilters && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    {/* Filter 1: Head Office / Store */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                        Head Office / Store
                      </label>
                      <select
                        className="field-select"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          fontSize: 13,
                          borderRadius: 6,
                          borderColor: selectedBranch !== 'ALL' ? 'var(--blue, #005BAA)' : 'var(--line)',
                          background: selectedBranch !== 'ALL' ? 'var(--blue-soft, #EFF6FF)' : 'var(--paper-raised)',
                          fontWeight: selectedBranch !== 'ALL' ? 700 : 500,
                        }}
                      >
                        <option value="ALL">All branches</option>
                        <option value="HEAD_OFFICE">🏢 Head Office</option>
                        <option value="OPERATIONS">🛒 Store Operations</option>
                      </select>
                    </div>

                    {/* Filter 2: Division */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                        Division
                      </label>
                      <select
                        className="field-select"
                        value={selectedDiv}
                        onChange={(e) => {
                          setSelectedDiv(e.target.value);
                          setSelectedDept('ALL');
                          setSelectedSubDept('ALL');
                        }}
                        style={{
                          width: '100%',
                          height: 38,
                          fontSize: 13,
                          borderRadius: 6,
                          borderColor: selectedDiv !== 'ALL' ? 'var(--blue, #005BAA)' : 'var(--line)',
                          background: selectedDiv !== 'ALL' ? 'var(--blue-soft, #EFF6FF)' : 'var(--paper-raised)',
                          fontWeight: selectedDiv !== 'ALL' ? 700 : 500,
                        }}
                      >
                        <option value="ALL">All divisions ({divisions.length})</option>
                        {divisions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.code} - {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter 3: Department */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                        Department
                      </label>
                      <select
                        className="field-select"
                        value={selectedDept}
                        onChange={(e) => {
                          setSelectedDept(e.target.value);
                          setSelectedSubDept('ALL');
                        }}
                        style={{
                          width: '100%',
                          height: 38,
                          fontSize: 13,
                          borderRadius: 6,
                          borderColor: selectedDept !== 'ALL' ? 'var(--blue, #005BAA)' : 'var(--line)',
                          background: selectedDept !== 'ALL' ? 'var(--blue-soft, #EFF6FF)' : 'var(--paper-raised)',
                          fontWeight: selectedDept !== 'ALL' ? 700 : 500,
                        }}
                      >
                        <option value="ALL">All departments</option>
                        {(selectedDiv === 'ALL' ? departments : departments.filter((d) => d.divisionId === selectedDiv)).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.code} - {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter 4: Sub-Department */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                        Sub-Department
                      </label>
                      <select
                        className="field-select"
                        value={selectedSubDept}
                        onChange={(e) => setSelectedSubDept(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          fontSize: 13,
                          borderRadius: 6,
                          borderColor: selectedSubDept !== 'ALL' ? 'var(--blue, #005BAA)' : 'var(--line)',
                          background: selectedSubDept !== 'ALL' ? 'var(--blue-soft, #EFF6FF)' : 'var(--paper-raised)',
                          fontWeight: selectedSubDept !== 'ALL' ? 700 : 500,
                        }}
                      >
                        <option value="ALL">All sub-departments</option>
                        {(selectedDept === 'ALL'
                          ? subDepartments
                          : subDepartments.filter((s) => s.departmentId === selectedDept)
                        ).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} - {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter 5: Job level */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                        Job Level
                      </label>
                      <select
                        className="field-select"
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          fontSize: 13,
                          borderRadius: 6,
                          borderColor: selectedLevel !== 'ALL' ? 'var(--blue, #005BAA)' : 'var(--line)',
                          background: selectedLevel !== 'ALL' ? 'var(--blue-soft, #EFF6FF)' : 'var(--paper-raised)',
                          fontWeight: selectedLevel !== 'ALL' ? 700 : 500,
                        }}
                      >
                        <option value="ALL">All job levels</option>
                        {jobLevels.map((lvl) => (
                          <option key={lvl.level} value={lvl.level}>
                            Level {lvl.level} — {lvl.title || lvl.viTitle}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter 6: System role */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                        System Role
                      </label>
                      <select
                        className="field-select"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        style={{
                          width: '100%',
                          height: 38,
                          fontSize: 13,
                          borderRadius: 6,
                          borderColor: selectedRole !== 'ALL' ? 'var(--blue, #005BAA)' : 'var(--line)',
                          background: selectedRole !== 'ALL' ? 'var(--blue-soft, #EFF6FF)' : 'var(--paper-raised)',
                          fontWeight: selectedRole !== 'ALL' ? 700 : 500,
                        }}
                      >
                        <option value="ALL">All roles</option>
                        <option value="learner">Learner</option>
                        <option value="manager">Manager</option>
                        <option value="trainer">Internal Trainer</option>
                        <option value="hrbp">HRBP / People</option>
                        <option value="useradmin">User Administrator</option>
                        <option value="sysadmin">System Administrator</option>
                      </select>
                    </div>
                  </div>

                  {/* Reset Filters / Filter Summary */}
                  {activeUserFiltersCount > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-soft)', paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
                      <span>Applied <strong>{activeUserFiltersCount}</strong> filter criteria</span>
                      <button
                        type="button"
                        onClick={handleClearAllUserFilters}
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

            {/* USER LIST / GROUPED ACCORDIONS */}
            {userGroupBy === 'NONE' ? (
              <div>
                {userViewMode === 'TABLE' ? renderUserTable(filteredUsers) : renderUserGrid(filteredUsers)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {groupedUsers.map((group) => {
                  const isCollapsed = collapsedGroups[group.id];
                  return (
                    <div
                      key={group.id}
                      className="card"
                      style={{
                        background: 'var(--paper-raised)',
                        border: '1px solid var(--line)',
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* Group Header */}
                      <div
                        onClick={() => toggleGroupCollapse(group.id)}
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
                          <i className={`ti ${group.icon || 'ti-folder'}`} style={{ fontSize: 18, color: 'var(--blue, #005BAA)' }} />
                          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                            {group.title}
                          </span>
                          <Badge tone="blue">
                            {group.users.length} employees
                          </Badge>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-soft)' }}>
                          <span style={{ fontSize: 12 }}>{isCollapsed ? 'Expand' : 'Collapse'}</span>
                          <i className={`ti ${isCollapsed ? 'ti-chevron-down' : 'ti-chevron-up'}`} />
                        </div>
                      </div>

                      {/* Group Content */}
                      {!isCollapsed && (
                        <div style={{ padding: userViewMode === 'GRID' ? 16 : 0 }}>
                          {userViewMode === 'TABLE' ? renderUserTable(group.users) : renderUserGrid(group.users)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--ink-soft)', textAlign: 'right' }}>
              Display <strong>{filteredUsers.length}</strong> / {userList.length} employees
            </div>
          </div>
        );
      })()}

      {/* TAB 2: CUSTOMIZED USER GROUPS */}
      {activeTab === 'GROUPS' && (
        <CustomGroupsManager />
      )}

      {/* TAB 3: ORG HIERARCHY TREE */}
      {activeTab === 'HIERARCHY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <OrgHierarchyBrowser />
        </div>
      )}

      {/* TAB 4: JOB LEVEL FRAMEWORK */}
      {activeTab === 'JOB_LEVELS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 12, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                  Job Level Framework — INVERTED Scale (7 → 1)
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
                  <strong>Level 7 is the LOWEST grade</strong> (staff) and <strong>Level 1 is the HIGHEST grade</strong> (Director / senior leadership).
                </p>
              </div>
              <Button size="sm" variant="primary" icon="ti-plus" onClick={handleOpenAddLevel}>
                + Add A New Job Level
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobLevels.map((lvl) => {
              const headcount = userList.filter((u) => String(u.level) === String(lvl.level)).length;
              const roleNames = (lvl.typicalRoles || []).map((r) => roleDefinition(r).shortVi).join(', ');
              const borderColor = lvl.colors?.border || '#CBD5E1';
              return (
                <div
                  key={lvl.level || lvl.id}
                  className="card card-pad"
                  style={{
                    borderLeft: `5px solid ${borderColor}`,
                    borderRadius: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    background: 'var(--paper-raised)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 320 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <JobLevelBadge level={lvl.level} />
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                        {lvl.titleEn || lvl.title} {lvl.titleVi ? `— ${lvl.titleVi}` : (lvl.viTitle ? `— ${lvl.viTitle}` : '')}
                      </span>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--blue-soft-text)',
                          background: 'var(--blue-soft)',
                          border: '1px solid #BFDBFE',
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}
                      >
                        {lvl.code}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                      {lvl.descVi || `${lvl.titleVi || lvl.titleEn || 'Standard job level'}`}
                    </p>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>Level code: <strong style={{ color: 'var(--blue, #005BAA)' }}>{lvl.code}</strong></span>
                      <span>Authority band: <strong>{lvl.authority || lvl.band || 'STANDARD'}</strong></span>
                      {roleNames && <span>Typical system role: <strong>{roleNames}</strong></span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue, #005BAA)' }}>{headcount}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>employees at this level</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="sm" variant="outline" icon="ti-edit" onClick={() => handleOpenEditLevel(lvl)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="ti-trash"
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            type: 'JOB_LEVEL',
                            id: lvl.level,
                            title: `Delete Job Level ${lvl.level}`,
                            message: `Are you sure you want to delete the job level "${lvl.titleEn || lvl.viTitle || lvl.title}" (${lvl.code})?`,
                          })
                        }
                        style={{ color: '#E11D48' }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ADD EMPLOYEES (manual entry + bulk import) / EDIT USER */}
      {userModal.isOpen && (
        <Modal
          title={userModal.mode === 'ADD' ? 'Add Employees' : `Employee Profile — ${userForm.fullName || userForm.employeeCode}`}
          onClose={handleCloseUserModal}
          size={userModal.mode === 'ADD' && addTab === 'IMPORT' ? 'lg' : 'md'}
        >
          {/* Two ways in: type a handful by hand, or load a file */}
          {userModal.mode === 'ADD' && (
            <div style={{ display: 'flex', gap: 6, padding: 4, marginBottom: 14, background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8 }}>
              {[
                { id: 'MANUAL', icon: 'ti-user-plus', label: '✍️ Add Manually', hint: 'One or a few employees' },
                { id: 'IMPORT', icon: 'ti-file-import', label: '📥 Bulk Import File', hint: 'Hundreds of rows at once' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setAddTab(tab.id); setAddError(null); }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    padding: '8px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    border: addTab === tab.id ? '1px solid var(--line-strong)' : '1px solid transparent',
                    background: addTab === tab.id ? 'var(--paper-raised)' : 'transparent',
                    color: addTab === tab.id ? 'var(--ink)' : 'var(--ink-soft)',
                    fontWeight: addTab === tab.id ? 700 : 600,
                    fontSize: 13,
                    boxShadow: addTab === tab.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <span><i className={`ti ${tab.icon}`} style={{ marginRight: 6 }} />{tab.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-faint)' }}>{tab.hint}</span>
                </button>
              ))}
            </div>
          )}

          {userModal.mode === 'ADD' && addTab === 'IMPORT' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-sunken)', padding: '12px 16px', borderRadius: 8, marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Download the standard MMVN template file</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Supports CSV or JSON files with the full BU &gt; Div &gt; Dept &gt; Sub-Dept hierarchy</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" variant="outline" icon="ti-download" onClick={() => handleDownloadTemplate('csv')}>
                    Download The CSV Template
                  </Button>
                  <Button size="sm" variant="outline" icon="ti-download" onClick={() => handleDownloadTemplate('json')}>
                    Download The JSON Template
                  </Button>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="field-label">Choose A File From Your Computer (.csv, .json)</label>
                <input
                  type="file"
                  accept=".csv,.json,.txt"
                  className="field-input"
                  onChange={handleFileUpload}
                  style={{ padding: '6px 10px' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="field-label">Or Paste The CSV / JSON Data Directly</label>
                <textarea
                  className="field-input"
                  rows={4}
                  placeholder="Paste CSV content (employee code, full name, email, job title, level, role, division, dept, sub-dept) or JSON..."
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    parseImportContent(e.target.value);
                  }}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>

              {/* PREVIEW TABLE */}
              {parsedPreview.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>
                      🔍 Preview {parsedPreview.length} valid employees
                    </div>
                    <Badge tone="green" size="sm">Ready To Load</Badge>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6 }}>
                    <table className="table" style={{ width: '100%', fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Employee Code</th>
                          <th>Full Name</th>
                          <th>Email</th>
                          <th>Job Level</th>
                          <th>Role</th>
                          <th>Division</th>
                          <th>Department</th>
                          <th>Sub-Dept</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedPreview.slice(0, 50).map((u, i) => (
                          <tr key={i}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue)' }}>{u.employeeCode}</td>
                            <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                            <td>{u.email}</td>
                            <td>Level {u.level}</td>
                            <td><Badge tone={roleDefinition(u.role).tone} size="sm">{u.role}</Badge></td>
                            <td>{u.divisionCode || '—'}</td>
                            <td>{u.departmentCode || '—'}</td>
                            <td>{u.subDepartmentCode || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importFeedback && (
                <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--sage-soft)', color: '#047857', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                  <i className="ti ti-check" style={{ marginRight: 6 }} />{importFeedback}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { setAddTab('MANUAL'); setAddError(null); }}
                  style={{ border: 'none', background: 'transparent', color: 'var(--rail)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Only a few people? Type them in by hand →
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="ghost" type="button" onClick={handleCloseUserModal}>Cancel</Button>
                  <Button
                    variant="primary"
                    icon="ti-bolt"
                    disabled={parsedPreview.length === 0}
                    onClick={handleExecuteImport}
                  >
                    Confirm Loading {parsedPreview.length} Employees
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveUserSubmit}>
              <div className="grid grid-2" style={{ marginBottom: 12 }}>
                <div>
                  <label className="field-label">Employee ID *</label>
                  <input
                    className="field-input"
                    value={userForm.employeeCode || userForm.userId}
                    onChange={(e) => setUserForm((p) => ({ ...p, employeeCode: e.target.value, userId: e.target.value }))}
                    required={stagedUsers.length === 0}
                  />
                </div>
                <div>
                  <label className="field-label">Full Name *</label>
                  <input
                    className="field-input"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm((p) => ({ ...p, fullName: e.target.value }))}
                    required={stagedUsers.length === 0}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ marginBottom: 12 }}>
                <div>
                  <label className="field-label">Business Email *</label>
                  <input
                    className="field-input"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                    required={stagedUsers.length === 0}
                  />
                </div>
                <div>
                  <label className="field-label">Job Title</label>
                  <input
                    className="field-input"
                    value={userForm.title || userForm.position || ''}
                    onChange={(e) => setUserForm((p) => ({ ...p, title: e.target.value, position: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ marginBottom: 16 }}>
                <div>
                  <label className="field-label">Job Level</label>
                  <select
                    className="field-select"
                    value={normalizeLevel(userForm.level)}
                    onChange={(e) => setUserForm((p) => ({ ...p, level: e.target.value }))}
                  >
                    {jobLevels.map((lvl) => (
                      <option key={lvl.level} value={lvl.level}>
                        Level {lvl.level} — {lvl.viTitle || lvl.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">System Authority Role</label>
                  <select
                    className="field-select"
                    value={normalizeRole(userForm.role)}
                    onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}
                  >
                    {ROLE_DEFINITIONS.map((def) => (
                      <option key={def.id} value={def.id}>
                        {def.rank}. {def.labelVi}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* The org unit is picked top-down: Division -> Department -> Sub-Department */}
              <div className="grid grid-2" style={{ marginBottom: 12 }}>
                <div>
                  <label className="field-label">Parent Division *</label>
                  <select
                    className="field-select"
                    value={userForm.divisionId || ''}
                    onChange={(e) => {
                      const divId = e.target.value;
                      const d = divisions.find((div) => div.id === divId);
                      setUserForm((p) => ({
                        ...p,
                        divisionId: divId,
                        divisionCode: d ? d.code : null,
                        divisionName: d ? d.name : null,
                        departmentId: '',
                        departmentCode: null,
                        departmentName: null,
                        subDepartmentId: '',
                        subDepartmentCode: null,
                        subDepartmentName: null,
                      }));
                    }}
                  >
                    <option value="">-- Choose A Division --</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Parent Department *</label>
                  <select
                    className="field-select"
                    value={userForm.departmentId || ''}
                    disabled={!userForm.divisionId}
                    onChange={(e) => {
                      const deptId = e.target.value;
                      const d = departments.find((dept) => dept.id === deptId);
                      setUserForm((p) => ({
                        ...p,
                        departmentId: deptId,
                        department: deptId,
                        departmentName: d ? d.name : null,
                        departmentCode: d ? d.code : null,
                        subDepartmentId: '',
                        subDepartmentCode: null,
                        subDepartmentName: null,
                      }));
                    }}
                  >
                    <option value="">
                      {userForm.divisionId ? '-- Choose A Department --' : '-- Choose A Division first --'}
                    </option>
                    {departments
                      .filter((d) => d.divisionId === userForm.divisionId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="field-label">Position / Child Sub-Department</label>
                <select
                  className="field-select"
                  value={userForm.subDepartmentId || ''}
                  disabled={!userForm.departmentId || availableSubDepartments.length === 0}
                  onChange={(e) => {
                    const subId = e.target.value;
                    const sub = subDepartments.find((item) => item.id === subId);
                    setUserForm((p) => ({
                      ...p,
                      subDepartmentId: subId || null,
                      subDepartmentCode: sub ? sub.code : null,
                      subDepartmentName: sub ? sub.name : null,
                    }));
                  }}
                >
                  <option value="">
                    {!userForm.departmentId
                      ? '-- Choose A Department first --'
                      : availableSubDepartments.length === 0
                        ? '-- No sub-department --'
                        : '-- Choose A Sub-Department (optional) --'}
                  </option>
                  {availableSubDepartments.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.code} — {sub.name}</option>
                  ))}
                </select>
              </div>

              {/* Queue: several employees can be typed in before saving them together */}
              {userModal.mode === 'ADD' && stagedUsers.length > 0 && (
                <div style={{ marginBottom: 14, border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--paper-sunken)', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                    <span>Queued to create: {stagedUsers.length}</span>
                    <button
                      type="button"
                      onClick={() => setStagedUsers([])}
                      style={{ border: 'none', background: 'transparent', color: 'var(--rail)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Clear list
                    </button>
                  </div>
                  <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {stagedUsers.map((u) => (
                      <div key={u.employeeCode} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderTop: '1px solid var(--line)', fontSize: 12 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue)' }}>{u.employeeCode}</span>
                        <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                        <span style={{ color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                        <span style={{ marginLeft: 'auto', color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>
                          Lvl {u.level} · {u.departmentCode || '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedUser(u.employeeCode)}
                          aria-label={`Remove ${u.fullName}`}
                          style={{ border: 'none', background: 'transparent', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {addError && (
                <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--rust-soft)', color: 'var(--rust-soft-text)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                  <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />{addError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <Button variant="ghost" type="button" onClick={handleCloseUserModal}>Cancel</Button>
                <div style={{ display: 'flex', gap: 8 }}>
                  {userModal.mode === 'ADD' && (
                    <Button variant="outline" type="button" icon="ti-plus" onClick={handleStageUser}>
                      Save &amp; add another
                    </Button>
                  )}
                  <Button variant="primary" icon="ti-check" type="submit">
                    {saveSuccess
                      ? 'Saved Successfully!'
                      : userModal.mode === 'EDIT'
                        ? 'Save Changes'
                        : `Create ${pendingUserCount} employee${pendingUserCount > 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* MODAL: ADD / EDIT JOB LEVEL */}
      {levelModal.isOpen && (
        <Modal
          title={levelModal.mode === 'ADD' ? 'Add A New Job Level' : `Edit Job Level ${levelForm.level}`}
          onClose={() => setLevelModal({ isOpen: false, mode: 'ADD', data: null })}
          size="md"
        >
          <form onSubmit={handleSaveLevelSubmit}>
            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Level Number *</label>
                <input
                  className="field-input"
                  placeholder="e.g. 1, 2, 8, 9..."
                  value={levelForm.level}
                  onChange={(e) => setLevelForm((p) => ({ ...p, level: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="field-label">Job Level Code *</label>
                <input
                  className="field-input"
                  placeholder="e.g. LVL-1, LVL-8..."
                  value={levelForm.code}
                  onChange={(e) => setLevelForm((p) => ({ ...p, code: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">English Title *</label>
                <input
                  className="field-input"
                  placeholder="e.g. Director, Manager, Executive, Staff..."
                  value={levelForm.titleEn}
                  onChange={(e) => setLevelForm((p) => ({ ...p, titleEn: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="field-label">Vietnamese Title *</label>
                <input
                  className="field-input"
                  placeholder="e.g. Director, Manager, Executive, Staff..."
                  value={levelForm.titleVi || levelForm.viTitle}
                  onChange={(e) => setLevelForm((p) => ({ ...p, titleVi: e.target.value, viTitle: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Icon / Emoji</label>
                <input
                  className="field-input"
                  placeholder="e.g. ⭐, 👑, 🎯..."
                  value={levelForm.emoji}
                  onChange={(e) => setLevelForm((p) => ({ ...p, emoji: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label">Badge Border Color (Hex)</label>
                <input
                  className="field-input"
                  placeholder="#3B82F6"
                  value={levelForm.colors?.border || '#3B82F6'}
                  onChange={(e) =>
                    setLevelForm((p) => ({
                      ...p,
                      colors: { ...(p.colors || {}), border: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Authority Band</label>
              <select
                className="field-select"
                value={levelForm.authority}
                onChange={(e) => setLevelForm((p) => ({ ...p, authority: e.target.value }))}
              >
                <option value="EXECUTIVE">EXECUTIVE (Board of Management / BOM)</option>
                <option value="DIRECTOR">DIRECTOR (Division Director)</option>
                <option value="MANAGEMENT">MANAGEMENT (Department Head / Store Manager)</option>
                <option value="SUPERVISORY">SUPERVISORY (Supervisor / Team Leader)</option>
                <option value="PROFESSIONAL">PROFESSIONAL (Executive)</option>
                <option value="STANDARD">STANDARD (Front-Line Staff)</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Competency Standard Description</label>
              <textarea
                className="field-input"
                rows={3}
                placeholder="Describe the responsibilities and level requirements..."
                value={levelForm.descVi}
                onChange={(e) => setLevelForm((p) => ({ ...p, descVi: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setLevelModal({ isOpen: false, mode: 'ADD', data: null })}>
                Cancel
              </Button>
              <Button variant="primary" icon="ti-check" type="submit">
                {levelModal.mode === 'ADD' ? 'Create Job Level' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {deleteConfirm.isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16,
          }}
          onClick={() => setDeleteConfirm({ isOpen: false, type: '', id: null, title: '', message: '' })}
        >
          <div
            className="card card-pad"
            style={{ width: '100%', maxWidth: 420, background: 'var(--paper-raised)', borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#E11D48' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 24 }} />
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{deleteConfirm.title}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
              {deleteConfirm.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" type="button" onClick={() => setDeleteConfirm({ isOpen: false, type: '', id: null, title: '', message: '' })}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                style={{ background: '#E11D48', borderColor: '#E11D48' }}
                onClick={handleConfirmDelete}
              >
                Confirm Deletion
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* USER TRANSCRIPT & PROMOTION MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
        onEdit={(u) => {
          setTranscriptUser(null);
          handleOpenEditUser(u);
        }}
        onDelete={(u) => {
          setTranscriptUser(null);
          setDeleteConfirm({
            isOpen: true,
            type: 'USER',
            id: u.userId,
            title: `Delete Employee ${u.fullName}`,
            message: `Are you sure you want to remove the employee "${u.fullName}" (${u.employeeCode || u.userId}) from the directory?`,
          });
        }}
      />
    </>
  );
}
