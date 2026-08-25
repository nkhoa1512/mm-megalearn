import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  allUsers,
  userAdminUser,
  teachingEligibleUsers,
  businessUnits,
  divisions,
  departments,
  subDepartments,
  retailStores,
  jobLevels,
} from '../../data/mockData';
import OrgHierarchyBrowser from '../../components/OrgHierarchyBrowser';
import { Badge, Button, Modal, JobLevelBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { LEVEL_DEFINITIONS, normalizeLevel, levelShortLabel, levelDefinition } from '../../data/levelSystem';
import { ROLE_DEFINITIONS, normalizeRole, roleDefinition, managedRolesOf } from '../../data/roles';
import UserTranscriptModal from '../../components/UserTranscriptModal';

export default function UserAdminPortal({ initialTab = 'DIRECTORY' }) {
  const navigate = useNavigate();
  // DIRECTORY | HIERARCHY | JOB_LEVELS | ALLOCATION | TRAINER_ASSIGNMENT
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const { courses, users, promoteUserLevel, assignTrainerToCourse, language, t } = useCourseStore();

  // Nguồn Giảng viên đủ chuẩn: L&D, HRBP, User Admin, System Admin (mọi role
  // có canBeAssignedToClass) — không chỉ riêng role Trainer/L&D như trước.
  const eligibleTrainers = teachingEligibleUsers();

  // Phân bổ khóa học cho khối / phòng ban
  const [allocationCourseId, setAllocationCourseId] = useState('');
  const [allocationTargetType, setAllocationTargetType] = useState('DIVISION');
  const [allocationTargetId, setAllocationTargetId] = useState('');
  const [allocationLog, setAllocationLog] = useState([]);

  // Phân công giảng viên đứng lớp
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignTrainerId, setAssignTrainerId] = useState('');
  const [assignStoreId, setAssignStoreId] = useState('');
  const [assignDate, setAssignDate] = useState('2026-09-15');
  const [assignFeedback, setAssignFeedback] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL'); // ALL, HEAD_OFFICE, OPERATIONS
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedSubDept, setSelectedSubDept] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [transcriptUser, setTranscriptUser] = useState(null);

  const rawUsers = typeof allUsers === 'function' ? allUsers() : (allUsers || []);

  // Edit / Add User Modal
  const [editModal, setEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  function handleOpenEdit(user) {
    setSelectedUser(user);
    setEditModal(true);
  }

  function handleSaveUser() {
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setEditModal(false);
    }, 1500);
  }

  const userList = users && users.length > 0 ? users : rawUsers;

  const filteredUsers = userList.filter((u) => {
    const matchSearch = !search ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.userId.toLowerCase().includes(search.toLowerCase()) ||
      (u.title && u.title.toLowerCase().includes(search.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(search.toLowerCase())) ||
      (u.departmentName && u.departmentName.toLowerCase().includes(search.toLowerCase())) ||
      (u.subDepartmentName && u.subDepartmentName.toLowerCase().includes(search.toLowerCase()));

    const matchBranch = selectedBranch === 'ALL' ||
      (selectedBranch === 'HEAD_OFFICE' && (u.branch === 'HEAD_OFFICE' || u.branch === 'SUPPORTING' || !u.store)) ||
      (selectedBranch === 'OPERATIONS' && (u.branch === 'OPERATIONS' || Boolean(u.store)));

    const matchSubDept = selectedSubDept === 'ALL' || u.subDepartmentId === selectedSubDept || (u.subDepartmentCode && u.subDepartmentCode === selectedSubDept);

    const matchLevel = selectedLevel === 'ALL' || String(u.level) === String(selectedLevel);

    return matchSearch && matchBranch && matchSubDept && matchLevel;
  });

  const TABS = [
    { id: 'DIRECTORY', labelVi: 'Danh Mục 100+ Nhân Sự', labelEn: '100+ Staff Directory', icon: 'ti-address-book' },
    { id: 'HIERARCHY', labelVi: 'Cây Cơ Cấu 2 Nhánh', labelEn: 'Dual Org Hierarchy Tree', icon: 'ti-binary-tree' },
    { id: 'JOB_LEVELS', labelVi: 'Khung 7 Cấp Bậc', labelEn: '7-Level Framework', icon: 'ti-id-badge-2' },
    { id: 'ALLOCATION', labelVi: 'Phân Bổ Khóa Học', labelEn: 'Course Allocation', icon: 'ti-stack-2' },
    { id: 'TRAINER_ASSIGNMENT', labelVi: 'Phân Công Giảng Viên', labelEn: 'Faculty Assignment', icon: 'ti-school' },
  ];

  return (
    <>
      {/* HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{language === 'en' ? 'User Administration & Dual Org Tree' : 'Quản Trị Nhân Sự & Cây Cơ Cấu Tổ Chức'}</h1>
            <Badge tone="blue" icon="ti-users-group">User Administrator</Badge>
          </div>
          <p style={{ margin: 0 }}>
            {language === 'en'
              ? <>HR Administrator: <strong>{userAdminUser.fullName}</strong> &middot; {userAdminUser.department} &middot; Manage employee master &amp; MM Mega Market organization structure</>
              : <>Quản trị viên Nhân sự: <strong>{userAdminUser.fullName}</strong> &middot; {userAdminUser.department} &middot; Quản lý hồ sơ nhân viên &amp; định biên sơ đồ tổ chức MM Mega Market</>}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            icon="ti-plus"
            onClick={() => navigate('/admin/courses/new')}
            style={{
              background: 'linear-gradient(135deg, #007A38 0%, #005A28 100%)',
              borderColor: '#007A38',
              fontWeight: 800,
            }}
          >
            {language === 'en' ? '+ Create Course (Online & In-Person)' : '+ Tạo Khóa Học (Online & Trực Tiếp)'}
          </Button>
          <Button variant="outline" icon="ti-stack-2" onClick={() => navigate('/admin/courses')}>
            {language === 'en' ? 'Manage Course Catalog' : 'Quản Lý Danh Mục Khóa Học'}
          </Button>
          <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
            {language === 'en' ? 'Personal Dashboard' : 'Xem Giao Diện Cá Nhân'}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-users" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>{rawUsers.length}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Hồ sơ Nhân sự<br />Đang quản lý</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-building-store" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>6</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Chi nhánh Siêu thị<br />Hypermarket</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-building" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>12</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Phòng ban Trụ sở<br />Head Office</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-id-badge-2" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage)' }}>7</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{language === 'en' ? 'Levels' : 'Cấp bậc Định biên'}</div>
          </div>
        </div>
      </div>

      {/* 5 TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map((tab) => {
          const tabLabel = language === 'en' ? tab.labelEn : tab.labelVi;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.isNav) navigate(tab.to);
                else setActiveTab(tab.id);
              }}
              className="btn btn-sm"
              style={{
                background: activeTab === tab.id ? 'var(--blue)' : 'var(--paper-raised)',
                color: activeTab === tab.id ? '#fff' : 'var(--ink)',
                borderColor: activeTab === tab.id ? 'var(--blue)' : 'var(--line-strong)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: activeTab === tab.id ? 700 : 500,
              }}
            >
              <i className={`ti ${tab.icon}`} />
              {tabLabel}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DIRECTORY */}
      {activeTab === 'DIRECTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: 240, flex: 1 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)', fontSize: 14 }} />
                <input
                  type="text"
                  className="field-input"
                  placeholder={language === 'en' ? 'Search employee code, name, position...' : 'Tìm kiếm theo tên, mã NV, chức danh...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 32 }}
                />
              </div>

              <select
                className="field-select"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{ width: 180 }}
              >
                <option value="ALL">{language === 'en' ? '🏢 All Branches' : '🏢 Tất cả Khối Cơ Cấu'}</option>
                <option value="HEAD_OFFICE">{language === 'en' ? 'Trụ sở Head Office' : 'Trụ sở Head Office (Khối Hỗ Trợ)'}</option>
                <option value="OPERATIONS">{language === 'en' ? 'Siêu thị Vận hành' : 'Siêu thị Vận hành (Khối Cửa Hàng)'}</option>
              </select>

              <select
                className="field-select"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{ width: 180 }}
              >
                <option value="ALL">{language === 'en' ? 'All Departments' : 'Tất cả Phòng ban'}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                className="field-select"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={{ width: 160 }}
              >
                <option value="ALL">{language === 'en' ? 'All Levels (7 → 1)' : 'Tất cả Cấp bậc (7 → 1)'}</option>
                {[...LEVEL_DEFINITIONS].reverse().map((def) => (
                  <option key={def.level} value={def.level}>
                    {def.emoji} Level {def.level} — {language === 'en' ? (def.shortEn || def.shortVi) : def.shortVi}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{language === 'en' ? 'Employee Code' : 'Mã Nhân Viên'}</th>
                  <th>{language === 'en' ? 'Full Name' : 'Họ và Tên'}</th>
                  <th>{language === 'en' ? 'Job Title & Position' : 'Chức Danh & Vị Trí'}</th>
                  <th>{language === 'en' ? 'Org Unit & Dept' : 'Cơ Cấu & Bộ Phận'}</th>
                  <th>{language === 'en' ? 'Job Level' : 'Cấp Bậc (Level)'}</th>
                  <th>{language === 'en' ? 'System Role' : 'Vai Trò Hệ Thống'}</th>
                  <th style={{ textAlign: 'right' }}>{language === 'en' ? 'Actions' : 'Thao Tác'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 25).map((u) => (
                  <tr key={u.userId}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue)' }}>{u.employeeCode || u.userId}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{u.fullName}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{u.email}</div>
                    </td>
                    <td>{u.position || u.title || 'Store Associate'}</td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{u.storeName || u.departmentName || u.department || 'MM An Phú'}</div>
                      {u.subDepartmentName && (
                        <div style={{ fontSize: 11, color: 'var(--rail)', fontWeight: 600, marginTop: 2 }}>
                          <i className="ti ti-git-branch" style={{ marginRight: 3 }} /> {u.subDepartmentName}
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{u.branch === 'HEAD_OFFICE' || u.branch === 'SUPPORTING' ? '🏢 Trụ sở Head Office' : '🛒 Siêu thị Vận hành'}</div>
                    </td>
                    {/* Huy hiệu gọn + tên cấp bậc ở dòng dưới (được phép xuống dòng),
                        thay vì một nhãn nowrap dài kéo giãn cả bảng. */}
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
                    {/* Một cửa duy nhất: mở hồ sơ nhân sự, mọi thao tác (sửa thông tin,
                        thăng cấp, xem khóa học) nằm gọn bên trong hồ sơ đó. */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button
                        size="sm"
                        variant="primary"
                        icon="ti-id-badge-2"
                        onClick={() => setTranscriptUser(u)}
                        title={language === 'en' ? 'Open staff profile: details, courses, level promotion' : 'Mở hồ sơ nhân sự: thông tin, khóa học, thăng cấp'}
                        style={{
                          background: 'linear-gradient(135deg, #1E40AF 0%, #4338CA 100%)',
                          fontSize: 11.5,
                        }}
                      >
                        {language === 'en' ? 'Staff Profile' : 'Hồ Sơ Nhân Sự'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', textAlign: 'right' }}>
            {language === 'en' ? (
              <>Showing <strong>{filteredUsers.length}</strong> / {userList.length} associates</>
            ) : (
              <>Hiển thị <strong>{filteredUsers.length}</strong> / {userList.length} nhân sự</>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DUAL ORG HIERARCHY TREE */}
      {activeTab === 'HIERARCHY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', borderColor: 'var(--blue)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E40AF' }}>
              Sơ Đồ Cơ Cấu Tổ Chức 2 Nhánh Song Song (Dual-Branch Organization Architecture)
            </div>
            <p style={{ fontSize: 12.5, color: '#1E3A8A', margin: '4px 0 0' }}>
              MM Mega Market vận hành theo cấu trúc 2 nhánh chuyên biệt: <strong>Khối Chức năng Hỗ trợ (Head Office)</strong> và <strong>Khối Vận hành Siêu thị (Operations)</strong>.
            </p>
          </div>

          <OrgHierarchyBrowser />
        </div>
      )}

      {/* TAB 3: KHUNG 7 CẤP BẬC (thang đảo ngược 7 -> 1) */}
      {activeTab === 'JOB_LEVELS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', borderColor: '#FCA5A5' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#991B1B' }}>
              Khung Cấp Bậc Định Biên — Thang ĐẢO NGƯỢC
            </div>
            <p style={{ fontSize: 12.5, color: '#7F1D1D', margin: '4px 0 0' }}>
              <strong>Level 7 là cấp THẤP NHẤT</strong> (nhân viên tuyến đầu mới vào) và <strong>Level 1 là cấp CAO NHẤT</strong> (Ban điều hành).
              Học viên chỉ được xin học vượt đúng 1 cấp liền kề; nhảy cóc từ 2 cấp trở lên bị hệ thống chặn cứng.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobLevels.map((lvl) => {
              const headcount = rawUsers.filter((u) => normalizeLevel(u.level) === lvl.level).length;
              const roleNames = (lvl.typicalRoles || []).map((r) => roleDefinition(r).shortVi).join(', ');
              return (
                <div
                  key={lvl.level}
                  className="card card-pad"
                  style={{ borderLeft: `5px solid ${lvl.colors.border}`, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
                >
                  <div style={{ flex: 1, minWidth: 320 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <JobLevelBadge level={lvl.level} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{lvl.viTitle}</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>{lvl.descVi}</p>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 6 }}>
                      Mã định biên: <strong>{lvl.code}</strong> &middot; Nhóm quyền: <strong>{lvl.authority}</strong>
                      {roleNames && <> &middot; Role hệ thống điển hình: <strong>{roleNames}</strong></>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>{headcount}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>nhân sự đang ở cấp này</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card card-pad" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            <strong style={{ color: 'var(--ink)' }}>Lưu ý dữ liệu HRIS cũ:</strong> các mã cấp bậc <code>CL</code> (Casual Labor) và{' '}
            <code>IN</code> (Internship) được quy chiếu về <strong>Level 7</strong> để không vỡ dữ liệu lịch sử.
          </div>
        </div>
      )}

      {/* TAB 4: PHÂN BỔ KHÓA HỌC */}
      {activeTab === 'ALLOCATION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad">
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Phân Bổ Khóa Học Cho Khối / Phòng Ban</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '0 0 14px' }}>
              Gán một khóa học vào toàn bộ một Khối (Division), Phòng ban (Department) hoặc Chi nhánh siêu thị.
              Học viên vẫn phải tuân thủ quy tắc cấp bậc tuần tự khi vào học.
            </p>

            <div className="grid grid-3" style={{ gap: 12, marginBottom: 14 }}>
              <div>
                <label className="field-label">Khóa học cần phân bổ</label>
                <select className="field-select" value={allocationCourseId} onChange={(e) => setAllocationCourseId(e.target.value)}>
                  <option value="">— Chọn khóa học —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.title} (Level {normalizeLevel(c.targetLevel)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Loại đối tượng</label>
                <select className="field-select" value={allocationTargetType} onChange={(e) => { setAllocationTargetType(e.target.value); setAllocationTargetId(''); }}>
                  <option value="DIVISION">Khối (Division)</option>
                  <option value="DEPARTMENT">Phòng ban (Department)</option>
                  <option value="SUBDEPARTMENT">Bộ phận trực thuộc (Sub-Department)</option>
                  <option value="STORE">Chi nhánh siêu thị (Store)</option>
                </select>
              </div>
              <div>
                <label className="field-label">Đối tượng cụ thể</label>
                <select className="field-select" value={allocationTargetId} onChange={(e) => setAllocationTargetId(e.target.value)}>
                  <option value="">— Chọn —</option>
                  {(allocationTargetType === 'DIVISION' ? divisions : allocationTargetType === 'DEPARTMENT' ? departments : allocationTargetType === 'SUBDEPARTMENT' ? subDepartments : retailStores).map((t) => (
                    <option key={t.id} value={t.id}>{t.code} — {t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              variant="primary"
              icon="ti-send"
              disabled={!allocationCourseId || !allocationTargetId}
              onClick={() => {
                const course = courses.find((c) => c.id === allocationCourseId);
                const pool = allocationTargetType === 'DIVISION' ? divisions : allocationTargetType === 'DEPARTMENT' ? departments : allocationTargetType === 'SUBDEPARTMENT' ? subDepartments : retailStores;
                const target = pool.find((t) => t.id === allocationTargetId);
                const affected = rawUsers.filter((u) =>
                  allocationTargetType === 'DIVISION' ? u.divisionId === target.id
                    : allocationTargetType === 'DEPARTMENT' ? u.departmentId === target.id
                      : allocationTargetType === 'SUBDEPARTMENT' ? u.subDepartmentId === target.id
                        : u.storeId === target.id
                ).length;
                setAllocationLog((prev) => [
                  {
                    id: `alloc-${Date.now()}`,
                    courseTitle: `${course.code} — ${course.title}`,
                    courseLevel: normalizeLevel(course.targetLevel),
                    targetName: target.name,
                    targetType: allocationTargetType,
                    affected,
                    at: new Date().toISOString().slice(0, 16).replace('T', ' '),
                  },
                  ...prev,
                ]);
              }}
            >
              Phân Bổ Khóa Học
            </Button>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Khóa Học</th>
                  <th>Cấp Bậc</th>
                  <th>Đối Tượng Được Gán</th>
                  <th>Số Nhân Sự Ảnh Hưởng</th>
                  <th>Thời Điểm</th>
                </tr>
              </thead>
              <tbody>
                {allocationLog.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-soft)' }}>Chưa có lượt phân bổ nào trong phiên làm việc này.</td></tr>
                ) : allocationLog.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 600 }}>{log.courseTitle}</td>
                    <td><JobLevelBadge level={log.courseLevel} compact /></td>
                    <td>{log.targetName} <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>({log.targetType})</span></td>
                    <td><Badge tone="blue">{log.affected} nhân sự</Badge></td>
                    <td style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{log.at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PHÂN CÔNG GIẢNG VIÊN ĐỨNG LỚP */}
      {activeTab === 'TRAINER_ASSIGNMENT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Phân Công Giảng Viên Vào Lớp Trực Tiếp</div>
              <Link to="/trainer">
                <Button size="sm" variant="outline" icon="ti-school">Xem Khóa Học &amp; Lớp Trực Tiếp Tôi Đứng Dạy</Button>
              </Link>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '0 0 14px' }}>
              User Admin xếp lịch và chỉ định Giảng viên (Trainer/L&amp;D, HRBP, User Admin, System Admin) đứng lớp thực hành tại từng chi nhánh siêu thị.
              Giảng viên sẽ thấy lớp được giao trong cổng "Lớp Giảng Dạy &amp; Live QR" của mình.
            </p>

            <div className="grid grid-4" style={{ gap: 12, marginBottom: 14 }}>
              <div>
                <label className="field-label">Khóa học trực tiếp (ILT / Lab)</label>
                <select className="field-select" value={assignCourseId} onChange={(e) => setAssignCourseId(e.target.value)}>
                  <option value="">— Chọn lớp —</option>
                  {courses.filter((c) => c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB').map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Giảng viên đứng lớp</label>
                <select className="field-select" value={assignTrainerId} onChange={(e) => setAssignTrainerId(e.target.value)}>
                  <option value="">— Chọn giảng viên —</option>
                  {eligibleTrainers.map((t) => (
                    <option key={t.userId} value={t.userId}>
                      {t.fullName} — {roleDefinition(t.role).shortVi} (Level {normalizeLevel(t.level)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Chi nhánh siêu thị</label>
                <select className="field-select" value={assignStoreId} onChange={(e) => setAssignStoreId(e.target.value)}>
                  <option value="">— Chọn chi nhánh —</option>
                  {retailStores.map((st) => (
                    <option key={st.id} value={st.id}>{st.code} — {st.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Ngày giảng dạy</label>
                <input type="date" className="field-input" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                icon="ti-user-check"
                disabled={!assignCourseId || !assignTrainerId || !assignStoreId}
                onClick={() => {
                  const trainer = eligibleTrainers.find((t) => t.userId === assignTrainerId);
                  const store = retailStores.find((st) => st.id === assignStoreId);
                  const course = courses.find((c) => c.id === assignCourseId);
                  assignTrainerToCourse(assignCourseId, trainer, {
                    venue: store.name,
                    venueId: store.id,
                    scheduleDate: assignDate,
                    scheduleTime: '08:30 - 11:30 (3.0 hours)',
                    assignedBy: userAdminUser.fullName,
                  });
                  setAssignFeedback(`Đã phân công ${trainer.fullName} đứng lớp "${course.title}" tại ${store.name} ngày ${assignDate}.`);
                }}
              >
                Phân Công Giảng Viên
              </Button>
              {assignFeedback && (
                <span style={{ fontSize: 12.5, color: '#166534', fontWeight: 600 }}>
                  <i className="ti ti-circle-check" style={{ marginRight: 4 }} /> {assignFeedback}
                </span>
              )}
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Lớp Thực Hành</th>
                  <th>Cấp Bậc</th>
                  <th>Giảng Viên Phụ Trách</th>
                  <th>Địa Điểm</th>
                  <th>Lịch Giảng</th>
                </tr>
              </thead>
              <tbody>
                {courses
                  .filter((c) => c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB')
                  .slice(0, 15)
                  .map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.title}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--ink-faint)' }}>{c.code}</div>
                      </td>
                      <td><JobLevelBadge level={c.targetLevel} compact /></td>
                      <td>
                        {c.trainerName
                          ? <Badge tone="sage" icon="ti-user-check">{c.trainerName}</Badge>
                          : <Badge tone="rust" icon="ti-alert-triangle">Chưa phân công</Badge>}
                      </td>
                      <td style={{ fontSize: 12 }}>{c.venue || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        {c.scheduleDate || '—'}{c.scheduleTime ? ` · ${c.scheduleTime}` : ''}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / ADD USER */}
      {editModal && selectedUser && (
        <Modal
          title={`Hồ Sơ Nhân Sự — ${selectedUser.fullName || 'Thêm Nhân Viên Mới'}`}
          onClose={() => setEditModal(false)}
          size="md"
        >
          <div>
            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Mã Nhân Viên (Employee ID)</label>
                <input className="field-input" value={selectedUser.userId} disabled />
              </div>
              <div>
                <label className="field-label">Họ và Tên</label>
                <input className="field-input" value={selectedUser.fullName} onChange={(e) => setSelectedUser({ ...selectedUser, fullName: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="field-label">Email Doanh Nghiệp</label>
                <input className="field-input" value={selectedUser.email} onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Chức Danh Công Việc</label>
                <input className="field-input" value={selectedUser.title || ''} onChange={(e) => setSelectedUser({ ...selectedUser, title: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 16 }}>
              <div>
                <label className="field-label">Cấp Bậc Định Biên (Job Level)</label>
                <select className="field-select" value={normalizeLevel(selectedUser.level)} onChange={(e) => setSelectedUser({ ...selectedUser, level: e.target.value })}>
                  {[...LEVEL_DEFINITIONS].reverse().map((def) => (
                    <option key={def.level} value={def.level}>
                      Level {def.level} — {def.shortVi}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
                  Thang đảo ngược: Level 7 thấp nhất → Level 1 cao nhất.
                </div>
              </div>
              <div>
                <label className="field-label">Vai Trò Quyền Hạn Hệ Thống</label>
                <select className="field-select" value={normalizeRole(selectedUser.role)} onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}>
                  {ROLE_DEFINITIONS.map((def) => (
                    <option key={def.id} value={def.id}>
                      {def.rank}. {def.labelVi}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
                  Quản lý được: {managedRolesOf(selectedUser.role).map((r) => roleDefinition(r).shortVi).join(', ') || 'không quản lý role nào'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={() => setEditModal(false)}>Hủy</Button>
              <Button variant="primary" icon="ti-check" onClick={handleSaveUser}>
                {saveSuccess ? 'Đã Lưu Thành Công!' : 'Lưu Thay Đổi'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* USER TRANSCRIPT & PROMOTION MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
        onEdit={(u) => {
          setTranscriptUser(null);
          handleOpenEdit(u);
        }}
      />
    </>
  );
}
