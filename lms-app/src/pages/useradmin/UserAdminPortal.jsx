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

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedDiv, setSelectedDiv] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedSubDept, setSelectedSubDept] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [transcriptUser, setTranscriptUser] = useState(null);

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

  // Bulk User Import Modal
  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [importFeedback, setImportFeedback] = useState(null);

  // Job Level Modal
  const [levelModal, setLevelModal] = useState({ isOpen: false, mode: 'ADD', data: null });
  const [levelForm, setLevelForm] = useState({
    level: '',
    viTitle: '',
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
        (u.title && u.title.toLowerCase().includes(search.toLowerCase())) ||
        (u.position && u.position.toLowerCase().includes(search.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(search.toLowerCase())) ||
        (u.departmentName && u.departmentName.toLowerCase().includes(search.toLowerCase())) ||
        (u.subDepartmentName && u.subDepartmentName.toLowerCase().includes(search.toLowerCase()));

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

      return matchSearch && matchBranch && matchDiv && matchDept && matchSubDept && matchLevel;
    });
  }, [userList, search, selectedBranch, selectedDiv, selectedDept, selectedSubDept, selectedLevel]);

  // User Handlers
  function handleOpenAddUser() {
    const rawNum = Math.floor(1000 + Math.random() * 9000);
    setUserForm({
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
      divisionId: divisions[0]?.id || '',
      departmentId: departments[0]?.id || '',
      subDepartmentId: '',
      yearsOfService: 1.0,
    });
    setUserModal({ isOpen: true, mode: 'ADD' });
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
    setUserModal({ isOpen: true, mode: 'EDIT' });
  }

  function handleSaveUserSubmit(e) {
    e.preventDefault();
    if (!userForm.fullName.trim() || !userForm.email.trim()) return;

    const deptObj = departments.find((d) => d.id === userForm.departmentId);
    const subObj = subDepartments.find((s) => s.id === userForm.subDepartmentId);
    const divObj = divisions.find((div) => div.id === userForm.divisionId || div.id === deptObj?.divisionId);

    const payload = {
      ...userForm,
      departmentName: deptObj ? deptObj.name : userForm.departmentName,
      departmentCode: deptObj ? deptObj.code : userForm.departmentCode,
      subDepartmentName: subObj ? subObj.name : null,
      subDepartmentCode: subObj ? subObj.code : null,
      divisionId: divObj ? divObj.id : userForm.divisionId,
      divisionCode: divObj ? divObj.code : null,
      divisionName: divObj ? divObj.name : null,
      businessUnitId: 'bu-mmvn',
      businessUnitCode: 'MMVN',
      businessUnitName: 'MM Mega Market Vietnam',
    };

    if (userModal.mode === 'ADD') {
      addUser(payload);
    } else {
      updateUser(userForm.userId, payload);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setUserModal({ isOpen: false, mode: 'ADD' });
    }, 900);
  }

  // Bulk User Import Handlers
  function handleDownloadTemplate(format = 'csv') {
    if (format === 'csv') {
      const csvHeader = 'Mã Nhân Viên,Họ và Tên,Email,Chức Danh,Cấp Bậc (1-7),Vai Trò (learner/manager/trainer/hrbp/useradmin/sysadmin),Mã Khối (Division Code),Mã Phòng Ban (Dept Code),Mã Sub-Dept (Sub-Dept Code)\n';
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
    const hasHeader = firstLine.includes('mã') || firstLine.includes('code') || firstLine.includes('tên') || firstLine.includes('email');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const parsedList = dataLines.map((line, idx) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const empCode = cols[0] || `MMVN-IMP-${1000 + idx}`;
      const fullName = cols[1] || 'Nhân Viên Mới';
      const email = cols[2] || `${empCode.toLowerCase()}@mmvietnam.com`;
      const title = cols[3] || 'Chuyên Viên';
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
      fullName: u.fullName || 'Nhân Viên Mới',
      email: u.email || `${rawEmpCode.toLowerCase()}@mmvietnam.com`,
      title: u.title || u.position || 'Chuyên Viên',
      position: u.position || u.title || 'Chuyên Viên',
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
    setImportFeedback(`Đã nạp thành công ${parsedPreview.length} nhân sự vào hệ thống!`);
    setTimeout(() => {
      setImportFeedback(null);
      setImportModal(false);
      setImportText('');
      setParsedPreview([]);
    }, 1500);
  }

  // Job Level Handlers
  function handleOpenAddLevel() {
    const nextLvlNum = String(jobLevels.length + 1);
    setLevelForm({
      level: nextLvlNum,
      viTitle: `Level ${nextLvlNum} — Chuyên Viên / Cán Bộ Mới`,
      title: `Level ${nextLvlNum}`,
      code: `LVL-${nextLvlNum}`,
      authority: 'STANDARD',
      band: 'GENERAL',
      descVi: 'Cấp bậc định biên trong thang tiêu chuẩn năng lực MM Mega Market.',
      emoji: '⭐',
      headcount: 0,
      colors: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
    });
    setLevelModal({ isOpen: true, mode: 'ADD', data: null });
  }

  function handleOpenEditLevel(lvl) {
    setLevelForm({
      level: String(lvl.level),
      viTitle: lvl.viTitle || lvl.title || '',
      title: lvl.title || '',
      code: lvl.code || `LVL-${lvl.level}`,
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
    if (!levelForm.level || !levelForm.viTitle.trim()) return;
    if (levelModal.mode === 'ADD') {
      addJobLevel(levelForm);
    } else if (levelModal.data) {
      updateJobLevel(levelModal.data.level, levelForm);
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
    { id: 'DIRECTORY', labelVi: 'Danh Mục Nhân Sự', labelEn: 'Staff Directory', icon: 'ti-address-book', count: userList.length },
    { id: 'GROUPS', labelVi: 'Nhóm Tùy Chỉnh (Custom Groups)', labelEn: 'Custom Groups', icon: 'ti-users-group', count: customGroups.length },
    { id: 'HIERARCHY', labelVi: 'Cây Cơ Cấu Tổ Chức (42 Khối)', labelEn: 'Org Hierarchy Tree', icon: 'ti-binary-tree', count: divisions.length },
    { id: 'JOB_LEVELS', labelVi: 'Khung Cấp Bậc (7 Cấp)', labelEn: 'Job Level Framework', icon: 'ti-id-badge-2', count: jobLevels.length },
  ];

  return (
    <>
      {/* HEADER & QUICK ACTION LINKS */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
              {language === 'en' ? 'User Administration & Org Structure' : 'Quản Trị Nhân Sự & Cơ Cấu Tổ Chức'}
            </h1>
            <Badge tone="blue" icon="ti-shield-check">User Administrator</Badge>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
            Quản trị viên: <strong>{userAdminUser.fullName}</strong> &middot; {userAdminUser.departmentName || userAdminUser.department} &middot; Quản lý hồ sơ nhân sự &amp; định biên sơ đồ MM Mega Market
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
            Giao Diện Cá Nhân
          </Button>
        </div>
      </div>

      {/* 3 CORE TABS NAVIGATION BAR */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: '#fff',
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
                fontSize: 13.5,
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
      {activeTab === 'DIRECTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: 200, flex: 1 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 14 }} />
                <input
                  type="text"
                  className="field-input"
                  placeholder="Tìm kiếm theo tên, mã NV, chức danh..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 32, borderRadius: 8, height: 38 }}
                />
              </div>

              <select
                className="field-select"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{ width: 160, borderRadius: 8, height: 38 }}
              >
                <option value="ALL">🏢 Tất cả Khối</option>
                <option value="HEAD_OFFICE">Trụ sở Head Office</option>
                <option value="OPERATIONS">Siêu thị Vận hành</option>
              </select>

              <select
                className="field-select"
                value={selectedDiv}
                onChange={(e) => {
                  setSelectedDiv(e.target.value);
                  setSelectedDept('ALL');
                  setSelectedSubDept('ALL');
                }}
                style={{ width: 160, borderRadius: 8, height: 38 }}
              >
                <option value="ALL">Tất cả Khối (Divisions)</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>

              <select
                className="field-select"
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedSubDept('ALL');
                }}
                style={{ width: 160, borderRadius: 8, height: 38 }}
              >
                <option value="ALL">Tất cả Phòng ban (Depts)</option>
                {(selectedDiv === 'ALL' ? departments : departments.filter((d) => d.divisionId === selectedDiv)).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>

              <select
                className="field-select"
                value={selectedSubDept}
                onChange={(e) => setSelectedSubDept(e.target.value)}
                style={{ width: 160, borderRadius: 8, height: 38 }}
              >
                <option value="ALL">🌿 Tất cả Sub-Dept</option>
                {(selectedDept === 'ALL'
                  ? subDepartments
                  : subDepartments.filter((s) => s.departmentId === selectedDept)
                ).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>

              <select
                className="field-select"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={{ width: 130, borderRadius: 8, height: 38 }}
              >
                <option value="ALL">Tất cả Cấp bậc</option>
                {jobLevels.map((lvl) => (
                  <option key={lvl.level} value={lvl.level}>
                    Level {lvl.level}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button size="sm" variant="outline" icon="ti-file-import" onClick={() => setImportModal(true)}>
                Import Hàng Loạt
              </Button>
              <Button size="sm" variant="primary" icon="ti-user-plus" onClick={handleOpenAddUser}>
                Thêm Nhân Viên
              </Button>
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--line)', background: '#fff' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Mã Nhân Viên</th>
                  <th>Họ và Tên</th>
                  <th>Chức Danh &amp; Vị Trí</th>
                  <th>Cơ Cấu &amp; Bộ Phận Trực Thuộc</th>
                  <th>Cấp Bậc (Level)</th>
                  <th>Vai Trò Hệ Thống</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 30).map((u) => (
                  <tr key={u.userId || u.employeeCode}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue)' }}>{u.employeeCode || u.userId}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{u.fullName}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{u.email}</div>
                    </td>
                    <td>{u.position || u.title || 'Store Associate'}</td>
                    <td>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
                        {u.divisionName || u.storeName || u.departmentName || 'MM Mega Market VN'}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                        Phòng: <strong>{u.departmentName || u.departmentCode || u.department || 'Chung'}</strong>
                      </div>
                      {u.subDepartmentName ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#1E40AF',
                          background: '#EFF6FF',
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
                          Chưa gán sub-dept
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 2 }}>
                        {u.branch === 'HEAD_OFFICE' || u.branch === 'SUPPORTING' ? '🏢 Trụ sở Head Office' : '🛒 Siêu thị Vận hành'}
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
                          title="Mở hồ sơ nhân sự: thông tin, khóa học, thăng cấp"
                          style={{
                            background: 'linear-gradient(135deg, #1E40AF 0%, #4338CA 100%)',
                            fontSize: 11.5,
                          }}
                        >
                          Hồ Sơ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-edit"
                          onClick={() => handleOpenEditUser(u)}
                          title="Chỉnh sửa thông tin nhân sự"
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
                              title: `Xóa Nhân Sự ${u.fullName}`,
                              message: `Bạn có chắc chắn muốn xóa nhân sự "${u.fullName}" (${u.employeeCode || u.userId}) khỏi danh mục?`,
                            })
                          }
                          style={{ color: '#E11D48' }}
                          title="Xóa nhân sự"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', textAlign: 'right' }}>
            Hiển thị <strong>{filteredUsers.length}</strong> / {userList.length} nhân sự
          </div>
        </div>
      )}

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

      {/* TAB 4: KHUNG CẤP BẬC */}
      {activeTab === 'JOB_LEVELS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                  Khung Cấp Bậc Định Biên — Thang ĐẢO NGƯỢC (7 → 1)
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
                  <strong>Level 7 là cấp THẤP NHẤT</strong> (nhân viên mới vào) và <strong>Level 1 là cấp CAO NHẤT</strong> (Ban điều hành).
                </p>
              </div>
              <Button size="sm" variant="primary" icon="ti-plus" onClick={handleOpenAddLevel}>
                Thêm Cấp Bậc Mới
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
                  style={{ borderLeft: `5px solid ${borderColor}`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: '#fff' }}
                >
                  <div style={{ flex: 1, minWidth: 320 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <JobLevelBadge level={lvl.level} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{lvl.viTitle || lvl.title}</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>{lvl.descVi}</p>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 6 }}>
                      Mã định biên: <strong>{lvl.code}</strong> &middot; Nhóm quyền: <strong>{lvl.authority}</strong>
                      {roleNames && <> &middot; Role hệ thống điển hình: <strong>{roleNames}</strong></>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>{headcount}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>nhân sự ở cấp này</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="sm" variant="outline" icon="ti-edit" onClick={() => handleOpenEditLevel(lvl)}>
                        Sửa
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
                            title: `Xóa Cấp Bậc ${lvl.level}`,
                            message: `Bạn có chắc chắn muốn xóa cấp bậc "${lvl.viTitle || lvl.title}"?`,
                          })
                        }
                        style={{ color: '#E11D48' }}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT USER */}
      {userModal.isOpen && (
        <Modal
          title={userModal.mode === 'ADD' ? 'Thêm Nhân Viên Mới' : `Hồ Sơ Nhân Sự — ${userForm.fullName || userForm.employeeCode}`}
          onClose={() => setUserModal({ isOpen: false, mode: 'ADD' })}
          size="md"
        >
          <form onSubmit={handleSaveUserSubmit}>
            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Mã Nhân Viên (Employee ID) *</label>
                <input
                  className="field-input"
                  value={userForm.employeeCode || userForm.userId}
                  onChange={(e) => setUserForm((p) => ({ ...p, employeeCode: e.target.value, userId: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="field-label">Họ và Tên *</label>
                <input
                  className="field-input"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm((p) => ({ ...p, fullName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Email Doanh Nghiệp *</label>
                <input
                  className="field-input"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="field-label">Chức Danh Công Việc</label>
                <input
                  className="field-input"
                  value={userForm.title || userForm.position || ''}
                  onChange={(e) => setUserForm((p) => ({ ...p, title: e.target.value, position: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 16 }}>
              <div>
                <label className="field-label">Cấp Bậc Định Biên (Job Level)</label>
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
                <label className="field-label">Vai Trò Quyền Hạn Hệ Thống</label>
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

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Khối Trực Thuộc (Division)</label>
                <select
                  className="field-select"
                  value={userForm.divisionId || ''}
                  onChange={(e) => {
                    const divId = e.target.value;
                    const d = divisions.find((div) => div.id === divId);
                    const deptList = departments.filter((dept) => dept.divisionId === divId);
                    const defaultDept = deptList[0] || null;
                    const subList = defaultDept ? subDepartments.filter((s) => s.departmentId === defaultDept.id) : [];
                    const defaultSub = subList[0] || null;
                    setUserForm((p) => ({
                      ...p,
                      divisionId: divId,
                      divisionCode: d ? d.code : null,
                      divisionName: d ? d.name : null,
                      departmentId: defaultDept ? defaultDept.id : '',
                      departmentCode: defaultDept ? defaultDept.code : null,
                      departmentName: defaultDept ? defaultDept.name : null,
                      subDepartmentId: defaultSub ? defaultSub.id : '',
                      subDepartmentCode: defaultSub ? defaultSub.code : null,
                      subDepartmentName: defaultSub ? defaultSub.name : null,
                    }));
                  }}
                >
                  <option value="">-- Chọn Khối (Division) --</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Phòng Ban Trực Thuộc (Department)</label>
                <select
                  className="field-select"
                  value={userForm.departmentId || ''}
                  onChange={(e) => {
                    const deptId = e.target.value;
                    const d = departments.find((dept) => dept.id === deptId);
                    const subList = subDepartments.filter((s) => s.departmentId === deptId);
                    const defaultSub = subList[0] || null;
                    setUserForm((p) => ({
                      ...p,
                      departmentId: deptId,
                      department: deptId,
                      departmentName: d ? d.name : p.departmentName,
                      departmentCode: d ? d.code : p.departmentCode,
                      divisionId: d ? d.divisionId : p.divisionId,
                      subDepartmentId: defaultSub ? defaultSub.id : '',
                      subDepartmentCode: defaultSub ? defaultSub.code : null,
                      subDepartmentName: defaultSub ? defaultSub.name : null,
                    }));
                  }}
                >
                  <option value="">-- Chọn phòng ban --</option>
                  {(userForm.divisionId
                    ? departments.filter((d) => d.divisionId === userForm.divisionId)
                    : departments
                  ).map((d) => (
                    <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Vị Trí / Sub-Department Con</label>
              <select
                className="field-select"
                value={userForm.subDepartmentId || ''}
                onChange={(e) => {
                  const subId = e.target.value;
                  const s = subDepartments.find((sub) => sub.id === subId);
                  setUserForm((p) => ({
                    ...p,
                    subDepartmentId: subId || null,
                    subDepartmentCode: s ? s.code : null,
                    subDepartmentName: s ? s.name : null,
                  }));
                }}
              >
                <option value="">-- Chọn Sub-Department --</option>
                {(userForm.departmentId
                  ? subDepartments.filter((s) => s.departmentId === userForm.departmentId)
                  : subDepartments
                ).map((s) => (
                  <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setUserModal({ isOpen: false, mode: 'ADD' })}>Hủy</Button>
              <Button variant="primary" icon="ti-check" type="submit">
                {saveSuccess ? 'Đã Lưu Thành Công!' : userModal.mode === 'ADD' ? 'Tạo Nhân Sự' : 'Lưu Thay Đổi'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: BULK USER IMPORT */}
      {importModal && (
        <Modal
          title="📥 Import Hàng Loạt Danh Sách Nhân Sự"
          onClose={() => setImportModal(false)}
          size="lg"
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderRadius: 8, marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Tải file mẫu định dạng chuẩn MMVN</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Hỗ trợ file CSV hoặc JSON với đầy đủ thông tin phân cấp BU &gt; Div &gt; Dept &gt; Sub-Dept</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="outline" icon="ti-download" onClick={() => handleDownloadTemplate('csv')}>
                  Tải Mẫu CSV
                </Button>
                <Button size="sm" variant="outline" icon="ti-download" onClick={() => handleDownloadTemplate('json')}>
                  Tải Mẫu JSON
                </Button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Chọn File Từ Máy Tính (.csv, .json)</label>
              <input
                type="file"
                accept=".csv,.json,.txt"
                className="field-input"
                onChange={handleFileUpload}
                style={{ padding: '6px 10px' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Hoặc Dán Nội Dung Dữ Liệu CSV / JSON Trực Tiếp</label>
              <textarea
                className="field-input"
                rows={4}
                placeholder="Dán nội dung CSV (Mã NV, Họ Tên, Email, Chức Danh, Level, Role, Division, Dept, Sub-Dept) hoặc JSON..."
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
                    🔍 Xem trước {parsedPreview.length} nhân sự hợp lệ
                  </div>
                  <Badge tone="green" size="sm">Sẵn Sàng Nạp</Badge>
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6 }}>
                  <table className="table" style={{ width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Mã NV</th>
                        <th>Họ và Tên</th>
                        <th>Email</th>
                        <th>Cấp Bậc</th>
                        <th>Role</th>
                        <th>Khối (Div)</th>
                        <th>Phòng Ban (Dept)</th>
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
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#ECFDF5', color: '#047857', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                <i className="ti ti-check" style={{ marginRight: 6 }} />{importFeedback}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setImportModal(false)}>Hủy</Button>
              <Button
                variant="primary"
                icon="ti-bolt"
                disabled={parsedPreview.length === 0}
                onClick={handleExecuteImport}
              >
                Xác Nhận Nạp {parsedPreview.length} Nhân Sự
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: ADD / EDIT JOB LEVEL */}
      {levelModal.isOpen && (
        <Modal
          title={levelModal.mode === 'ADD' ? 'Thêm Cấp Bậc Định Biên Mới' : `Chỉnh Sửa Cấp Bậc ${levelForm.level}`}
          onClose={() => setLevelModal({ isOpen: false, mode: 'ADD', data: null })}
          size="md"
        >
          <form onSubmit={handleSaveLevelSubmit}>
            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Cấp Bậc Số (Level Number) *</label>
                <input
                  className="field-input"
                  placeholder="e.g. 1, 2, 8, 9..."
                  value={levelForm.level}
                  onChange={(e) => setLevelForm((p) => ({ ...p, level: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="field-label">Mã Cấp Bậc (Code) *</label>
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
                <label className="field-label">Tên Tiếng Việt *</label>
                <input
                  className="field-input"
                  placeholder="e.g. Level 8 — Chuyên Viên Tập Sự"
                  value={levelForm.viTitle}
                  onChange={(e) => setLevelForm((p) => ({ ...p, viTitle: e.target.value, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="field-label">Icon / Emoji</label>
                <input
                  className="field-input"
                  placeholder="e.g. ⭐, 👑, 🎯..."
                  value={levelForm.emoji}
                  onChange={(e) => setLevelForm((p) => ({ ...p, emoji: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Nhóm Quyền (Authority Band)</label>
                <select
                  className="field-select"
                  value={levelForm.authority}
                  onChange={(e) => setLevelForm((p) => ({ ...p, authority: e.target.value }))}
                >
                  <option value="EXECUTIVE">EXECUTIVE (Ban Điều Hành / BOM)</option>
                  <option value="DIRECTOR">DIRECTOR (Giám Đốc Khối)</option>
                  <option value="MANAGEMENT">MANAGEMENT (Trưởng Phòng / Store Manager)</option>
                  <option value="SUPERVISORY">SUPERVISORY (Giám Sát / Trưởng Nhóm)</option>
                  <option value="PROFESSIONAL">PROFESSIONAL (Chuyên Viên)</option>
                  <option value="STANDARD">STANDARD (Nhân Viên Tuyến Đầu)</option>
                </select>
              </div>
              <div>
                <label className="field-label">Màu Viền Huy Hiệu (Hex)</label>
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

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Mô Tả Tiêu Chuẩn Năng Lực</label>
              <textarea
                className="field-input"
                rows={3}
                placeholder="Mô tả trách nhiệm và yêu cầu cấp bậc..."
                value={levelForm.descVi}
                onChange={(e) => setLevelForm((p) => ({ ...p, descVi: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setLevelModal({ isOpen: false, mode: 'ADD', data: null })}>
                Hủy
              </Button>
              <Button variant="primary" icon="ti-check" type="submit">
                {levelModal.mode === 'ADD' ? 'Tạo Cấp Bậc' : 'Lưu Thay Đổi'}
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
            style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}
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
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                type="button"
                style={{ background: '#E11D48', borderColor: '#E11D48' }}
                onClick={handleConfirmDelete}
              >
                Xác nhận Xóa
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
            title: `Xóa Nhân Sự ${u.fullName}`,
            message: `Bạn có chắc chắn muốn xóa nhân sự "${u.fullName}" (${u.employeeCode || u.userId}) khỏi danh mục?`,
          });
        }}
      />
    </>
  );
}
