import React, { useState } from 'react';
import {
  allUsers,
  userAdminUser,
  businessUnits,
  divisions,
  departments,
  retailStores,
  jobLevels,
} from '../../data/mockData';
import OrgHierarchyBrowser from '../../components/OrgHierarchyBrowser';
import { Badge, Button, Modal } from '../../components/ui';

export default function UserAdminPortal() {
  const [activeTab, setActiveTab] = useState('DIRECTORY'); // DIRECTORY, HIERARCHY, JOB_LEVELS
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL'); // ALL, HEAD_OFFICE, OPERATIONS
  const [selectedLevel, setSelectedLevel] = useState('ALL');

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

  const filteredUsers = rawUsers.filter((u) => {
    const matchSearch = !search ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.userId.toLowerCase().includes(search.toLowerCase()) ||
      (u.title && u.title.toLowerCase().includes(search.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(search.toLowerCase()));

    const matchBranch = selectedBranch === 'ALL' ||
      (selectedBranch === 'HEAD_OFFICE' && (u.branch === 'HEAD_OFFICE' || !u.store)) ||
      (selectedBranch === 'OPERATIONS' && (u.branch === 'OPERATIONS' || Boolean(u.store)));

    const matchLevel = selectedLevel === 'ALL' || String(u.level) === String(selectedLevel);

    return matchSearch && matchBranch && matchLevel;
  });

  return (
    <>
      {/* HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Quản Trị Nhân Sự &amp; Cây Cơ Cấu Tổ Chức</h1>
            <Badge tone="blue" icon="ti-users-group">User Administrator</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Quản trị viên Nhân sự: <strong>{userAdminUser.fullName}</strong> &middot; {userAdminUser.department} &middot; Quản lý hồ sơ nhân viên &amp; định biên sơ đồ tổ chức MM Mega Market
          </p>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>{rawUsers.length}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Hồ sơ Nhân sự<br />Đang quản lý</div>
          </div>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>6</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Chi nhánh Siêu thị<br />Hypermarket</div>
          </div>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>12</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Phòng ban Trụ sở<br />Head Office</div>
          </div>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage)' }}>5</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Cấp bậc Định biên<br />Job Levels (1-5)</div>
          </div>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'DIRECTORY', label: 'Danh Sách 100+ Nhân Sự & Hồ Sơ (Employee Master)', icon: 'ti-address-book', count: rawUsers.length },
          { id: 'HIERARCHY', label: 'Cây Cơ Cấu Tổ Chức 2 Nhánh (Dual-Branch Org Tree)', icon: 'ti-binary-tree', count: '2 Nhánh' },
          { id: 'JOB_LEVELS', label: 'Khung Cấp Bậc & Định Biên Chức Danh (Job Levels)', icon: 'ti-id-badge-2', count: '5 Bậc' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
            <span>{tab.label}</span>
            <span style={{
              background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--line)',
              padding: '1px 6px',
              borderRadius: 10,
              fontSize: 10.5,
              fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: EMPLOYEE DIRECTORY */}
      {activeTab === 'DIRECTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="field-input"
                placeholder="Tìm nhân viên theo tên, mã NV, chức vụ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 280 }}
              />

              <select
                className="field-select"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{ width: 200 }}
              >
                <option value="ALL">Toàn bộ 2 Nhánh</option>
                <option value="HEAD_OFFICE">Khối Trụ Sở (Head Office)</option>
                <option value="OPERATIONS">Khối Siêu Thị (Operations)</option>
              </select>

              <select
                className="field-select"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={{ width: 160 }}
              >
                <option value="ALL">Tất cả Cấp bậc</option>
                <option value="1">Level 1 (Associate)</option>
                <option value="2">Level 2 (Supervisor)</option>
                <option value="3">Level 3 (Section Lead)</option>
                <option value="4">Level 4 (Dept Manager)</option>
                <option value="5">Level 5 (SGM / Director)</option>
              </select>
            </div>

            <Button variant="primary" icon="ti-user-plus" onClick={() => handleOpenEdit({ userId: `MMVN-${Date.now().toString().slice(-4)}`, fullName: '', email: '', title: '', department: 'Fresh Food', level: '1', role: 'learner' })}>
              Thêm Nhân Sự Mới
            </Button>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Mã Nhân Viên</th>
                  <th>Họ và Tên</th>
                  <th>Chức Danh &amp; Vị Trí</th>
                  <th>Cơ Cấu Trực Thuộc</th>
                  <th>Cấp Bậc (Level)</th>
                  <th>Vai Trò Hệ Thống</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 20).map((u) => (
                  <tr key={u.userId}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue)' }}>{u.userId}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{u.fullName}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{u.email}</div>
                    </td>
                    <td>{u.title || 'Store Associate'}</td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{u.store || u.department || 'MM An Phú'}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{u.branch === 'HEAD_OFFICE' ? '🏢 Trụ sở Head Office' : '🛒 Siêu thị Vận hành'}</div>
                    </td>
                    <td>
                      <Badge tone="slate">Level {u.level || '1'}</Badge>
                    </td>
                    <td>
                      <Badge tone={u.role === 'admin' ? 'rust' : u.role === 'manager' ? 'amber' : u.role === 'trainer' ? 'blue' : 'sage'}>
                        {u.role ? u.role.toUpperCase() : 'LEARNER'}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button size="sm" variant="ghost" icon="ti-edit" onClick={() => handleOpenEdit(u)}>
                        Sửa Hồ Sơ
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', textAlign: 'right' }}>
            Hiển thị <strong>{filteredUsers.length}</strong> / {rawUsers.length} nhân sự
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

      {/* TAB 3: JOB LEVELS */}
      {activeTab === 'JOB_LEVELS' && (
        <div className="grid grid-2">
          {[
            { level: 'Level 1', name: 'Nhân viên Tuyến đầu (Store Associate / Specialist)', desc: 'Nhân viên thực hiện các công việc trực tiếp tại quầy bánh, quầy thu ngân, kho vận, giao nhận hàng hóa.', count: '75 Nhân sự' },
            { level: 'Level 2', name: 'Giám sát Ca / Chuyên viên (Supervisor / Officer)', desc: 'Giám sát hoạt động vận hành trong ca, kiểm soát tuân thủ quy trình SOP và an toàn lao động.', count: '15 Nhân sự' },
            { level: 'Level 3', name: 'Trưởng Quầy / Trưởng Bộ phận (Section Lead / Manager)', desc: 'Quản lý toàn diện kết quả kinh doanh và chỉ tiêu hao hụt của ngành hàng/bộ phận chuyên trách.', count: '6 Nhân sự' },
            { level: 'Level 4', name: 'Trưởng Phòng Trụ sở / Trưởng Ngành Hàng (Dept Manager)', desc: 'Hoạch định chiến lược kinh doanh và quy chuẩn vận hành ngành hàng cấp toàn quốc.', count: '3 Nhân sự' },
            { level: 'Level 5', name: 'Giám đốc Siêu thị / Giám đốc Khối (SGM / Functional Director)', desc: 'Lãnh đạo toàn diện chi nhánh siêu thị hypermarket hoặc khối phòng ban chiến lược.', count: '1 Nhân sự' },
          ].map((lvl, idx) => (
            <div key={idx} className="card card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{lvl.level}: {lvl.name}</div>
                <Badge tone="blue">{lvl.count}</Badge>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.45 }}>
                {lvl.desc}
              </p>
            </div>
          ))}
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
                <select className="field-select" value={selectedUser.level || '1'} onChange={(e) => setSelectedUser({ ...selectedUser, level: e.target.value })}>
                  <option value="1">Level 1 - Associate</option>
                  <option value="2">Level 2 - Supervisor</option>
                  <option value="3">Level 3 - Section Manager</option>
                  <option value="4">Level 4 - Dept Manager</option>
                  <option value="5">Level 5 - Director / SGM</option>
                </select>
              </div>
              <div>
                <label className="field-label">Vai Trò Quyền Hạn Hệ Thống</label>
                <select className="field-select" value={selectedUser.role || 'learner'} onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}>
                  <option value="learner">Employee / Learner</option>
                  <option value="manager">Line Manager</option>
                  <option value="trainer">Trainer (Giảng viên)</option>
                  <option value="hrbp">HRBP</option>
                  <option value="useradmin">User Admin</option>
                  <option value="sysadmin">System Admin (IT)</option>
                  <option value="admin">L&amp;D Admin</option>
                </select>
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
    </>
  );
}
