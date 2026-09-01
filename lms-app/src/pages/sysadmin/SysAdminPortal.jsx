import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  sysAdminUser,
  hrisSyncLogs,
  securityComplianceConfig,
  allUsers,
  personaForRole,
} from '../../data/mockData';
import { Badge, Button, Modal, ProgressBar, JobLevelBadge } from '../../features/common/ui';
import { ROLE_DEFINITIONS, roleDefinition, normalizeRole, managedScopeLabel, capabilitiesOf } from '../../data/roles';
import { normalizeLevel } from '../../data/levelSystem';
import UserTranscriptModal from '../../features/common/UserTranscriptModal';

// Các năng lực hiển thị trên ma trận phân quyền theo role.
const CAPABILITY_ROWS = [
  { key: 'canLearn', label: 'Học khóa học (cổng Learner cá nhân)' },
  { key: 'canRequestLevelSkip', label: 'Gửi đơn xin học vượt cấp' },
  { key: 'canApproveLevelSkip', label: 'Phê duyệt học vượt cấp cho cấp dưới' },
  { key: 'canTeach', label: 'Đứng lớp & chiếu Live QR điểm danh' },
  { key: 'canAuthorOnlineCourses', label: 'Tạo khóa học Trực tuyến (Online)' },
  { key: 'canAuthorOfflineCourses', label: 'Tạo khóa học Trực tiếp (Offline/ILT)' },
  { key: 'canAssignTrainers', label: 'Phân công Giảng viên vào lớp' },
  { key: 'canViewCsat', label: 'Xem đánh giá CSAT của Giảng viên' },
  { key: 'canViewOrgProgress', label: 'Theo dõi tiến độ học toàn tổ chức' },
  { key: 'canManageUsers', label: 'Quản trị hồ sơ nhân sự (master data)' },
  { key: 'canConfigureSystem', label: 'Cấu hình hệ thống (HRIS / SSO / bảo mật)' },
  { key: 'canViewAuditLogs', label: 'Xem nhật ký bảo mật & audit log' },
  { key: 'canDevelopPlatform', label: 'Sửa code, schema & hạ tầng nền tảng' },
];

export default function SysAdminPortal({ initialTab = 'HRIS' }) {
  const navigate = useNavigate();
  // HRIS | AUDIT_LOGS | POLICIES | ROLE_GOVERNANCE
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  // Hồ sơ nhân sự đang mở trong modal (null = đóng).
  const [transcriptUser, setTranscriptUser] = useState(null);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditLevelFilter, setAuditLevelFilter] = useState('ALL');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [windowBlurGuard, setWindowBlurGuard] = useState(true);
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState(30);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [policySaved, setPolicySaved] = useState(false);

  function handleTriggerSync() {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    }, 1500);
  }

  function handleSavePolicy() {
    setPolicySaved(true);
    setTimeout(() => setPolicySaved(false), 2000);
  }

  return (
    <>
      {/* HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>IT Security, HRIS Integration &amp; Infrastructure</h1>
            <Badge tone="rust" icon="ti-shield-lock">IT System Administrator</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Quản trị Kỹ thuật: <strong>{sysAdminUser.fullName}</strong> &middot; {sysAdminUser.department} &middot; Giám sát kết nối API HRIS, bảo mật hệ thống &amp; nhật ký kiểm toán
          </p>
        </div>

        <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
          Xem Giao Diện Học Tập Cá Nhân
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-activity" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage)' }}>99.98%</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Hạ tầng SLA<br />Uptime Health</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-cloud-computing" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>CONNECTED</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>SAP HRIS Sync<br />REST API Pipeline</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-shield-check" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>0 Cảnh Báo</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Sự cố Bảo mật<br />Trong 24 giờ qua</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-user-check" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>24</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Phiên làm việc<br />Đang hoạt động</div>
          </div>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'HRIS', label: 'Tích Hợp & Đồng Bộ Dữ Liệu HRIS (API Pipeline)', icon: 'ti-refresh', count: 'Active' },
          { id: 'AUDIT_LOGS', label: 'Nhật Ký Bảo Mật & Giám Sát Phiên (Security Audit Logs)', icon: 'ti-shield-check', count: '100% Secure' },
          { id: 'POLICIES', label: 'Chính Sách Bảo Mật & Chống Gian Lận (Security Policies)', icon: 'ti-shield-lock', count: 'Standard' },
          { id: 'ROLE_GOVERNANCE', label: 'Quản Trị Toàn Bộ 6 Role & Ma Trận Phân Quyền', icon: 'ti-users-group', count: '6 Role' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.id ? 'var(--rust)' : 'var(--paper-raised)',
              color: activeTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: activeTab === tab.id ? 'var(--rust)' : 'var(--line-strong)',
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

      {/* TAB 1: HRIS API PIPELINE */}
      {activeTab === 'HRIS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', borderColor: 'var(--rust)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#991B1B' }}>
                  Đồng Bộ Dữ Liệu Tự Động Với Hệ Thống Nhân Sự Doanh Nghiệp (SAP SuccessFactors API)
                </div>
                <p style={{ fontSize: 12.5, color: '#7F1D1D', margin: '4px 0 0' }}>
                  Pipeline đồng bộ tự động 02:00 AM hàng ngày: Tự động cập nhật nhân sự mới tuyển dụng, thăng chức, điều chuyển chi nhánh và cập nhật trạng thái nghỉ việc.
                </p>
              </div>
              <Button
                variant="primary"
                icon={isSyncing ? 'ti-loader' : syncSuccess ? 'ti-check' : 'ti-refresh'}
                disabled={isSyncing}
                onClick={handleTriggerSync}
              >
                {isSyncing ? 'Đang Chạy Pipeline...' : syncSuccess ? 'Đồng Bộ Thành Công (100 Hồ Sơ)!' : 'Kích Hoạt Đồng Bộ API Ngay'}
              </Button>
            </div>
          </div>

          <div className="section-label">Lịch Sử Các Đợt Đồng Bộ HRIS Gần Nhất:</div>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Thời Điểm Đồng Bộ</th>
                  <th>Giao Thức &amp; Endpoint</th>
                  <th>Số Lượng Bản Ghi Xử Lý</th>
                  <th>Nhân Sự Mới / Cập Nhật</th>
                  <th>Trạng Thái Pipeline</th>
                  <th style={{ textAlign: 'right' }}>Thời Gian Xử Lý</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: '2026-08-24 02:00:15', endpoint: 'https://hris.mmvietnam.com/api/v2/employees/delta', records: 100, delta: '+3 Mới, 5 Cập nhật', status: 'SUCCESS', duration: '1.2s' },
                  { time: '2026-08-23 02:00:12', endpoint: 'https://hris.mmvietnam.com/api/v2/employees/delta', records: 100, delta: '+0 Mới, 2 Cập nhật', status: 'SUCCESS', duration: '1.1s' },
                  { time: '2026-08-22 02:00:18', endpoint: 'https://hris.mmvietnam.com/api/v2/employees/delta', records: 100, delta: '+1 Mới, 4 Cập nhật', status: 'SUCCESS', duration: '1.3s' },
                  { time: '2026-08-21 02:00:10', endpoint: 'https://hris.mmvietnam.com/api/v2/employees/delta', records: 100, delta: '+2 Mới, 1 Cập nhật', status: 'SUCCESS', duration: '1.2s' },
                ].map((log, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.time}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-soft)' }}>{log.endpoint}</td>
                    <td style={{ fontWeight: 700 }}>{log.records} Hồ sơ</td>
                    <td><Badge tone="blue">{log.delta}</Badge></td>
                    <td><Badge tone="sage" icon="ti-check">{log.status}</Badge></td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{log.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (() => {
        const auditLogData = [
          { time: '2026-08-24 16:15:22', ip: '113.161.42.18 (HCMC)', user: 'Tran Quoc Bao (sysadmin)', action: 'Phê duyệt cấu hình chính sách bảo mật hệ thống v2.1', level: 'INFO', tone: 'blue' },
          { time: '2026-08-24 15:40:10', ip: '14.169.88.204 (HCMC)', user: 'Sarah Nguyen (admin)', action: 'Xuất bản khóa học: Thực hành Lò nướng Bánh & HACCP', level: 'NOTICE', tone: 'sage' },
          { time: '2026-08-24 14:20:05', ip: '171.244.12.90 (Hanoi)', user: 'Minh Tran (learner)', action: 'Hoàn thành bài thi trắc nghiệm HACCP đạt 100/100 điểm', level: 'INFO', tone: 'blue' },
          { time: '2026-08-24 11:10:45', ip: '42.112.30.15 (HCMC)', user: 'Le Thi Mai (useradmin)', action: 'Cập nhật chức danh nhân sự cho 3 cán bộ quầy thu ngân', level: 'NOTICE', tone: 'sage' },
          { time: '2026-08-24 09:05:12', ip: '118.69.182.50 (Danang)', user: 'Nguyen Van Hung (trainer)', action: 'Kích hoạt mã Live QR Điểm danh Lớp Thực hành Quầy Bánh', level: 'INFO', tone: 'blue' },
        ];

        const filteredLogs = auditLogData.filter((item) => {
          if (auditLevelFilter !== 'ALL' && item.level !== auditLevelFilter) return false;
          if (auditSearch) {
            const q = auditSearch.toLowerCase().trim();
            const ipMatch = item.ip.toLowerCase().includes(q);
            const userMatch = item.user.toLowerCase().includes(q);
            const actionMatch = item.action.toLowerCase().includes(q);
            if (!ipMatch && !userMatch && !actionMatch) return false;
          }
          return true;
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                  Nhật Ký Kiểm Toán An Ninh &amp; Giám Sát Truy Cập (Security Audit Logs)
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
                  Ghi nhận 100% các hành động đăng nhập, phân quyền, cấp chứng chỉ và xuất dữ liệu tuân thủ chuẩn ISO 27001.
                </p>
              </div>
              <Button variant="outline" icon="ti-download">
                Xuất File Log Kiểm Toán (.LOG)
              </Button>
            </div>

            {/* STANDARDIZED FILTER TOOLBAR CARD */}
            <div className="card card-pad" style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {/* Search input */}
                <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                  <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                  <input
                    type="text"
                    className="field-input"
                    style={{ paddingLeft: 36, paddingRight: auditSearch ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                    placeholder="Tìm theo địa chỉ IP, người dùng, hành động..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                  />
                  {auditSearch && (
                    <button
                      type="button"
                      onClick={() => setAuditSearch('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>

                {/* Level Filter */}
                <div style={{ minWidth: 180 }}>
                  <select
                    className="field-select"
                    style={{
                      width: '100%',
                      height: 38,
                      fontSize: 12.5,
                      borderRadius: 8,
                      background: auditLevelFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                      borderColor: auditLevelFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                      color: auditLevelFilter !== 'ALL' ? '#005BAA' : 'var(--ink)',
                      fontWeight: auditLevelFilter !== 'ALL' ? 700 : 500,
                    }}
                    value={auditLevelFilter}
                    onChange={(e) => setAuditLevelFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả mức độ</option>
                    <option value="INFO">🔵 INFO</option>
                    <option value="NOTICE">🟢 NOTICE</option>
                    <option value="WARNING">🟡 WARNING</option>
                    <option value="ERROR">🔴 ERROR</option>
                  </select>
                </div>
              </div>

              {/* ACTIVE FILTER TAGS & RESET */}
              {(auditSearch || auditLevelFilter !== 'ALL') && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Đang lọc theo:</span>
                    {auditSearch && (
                      <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Từ khóa: <strong>"{auditSearch}"</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setAuditSearch('')} />
                      </span>
                    )}
                    {auditLevelFilter !== 'ALL' && (
                      <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Mức độ: <strong>{auditLevelFilter}</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setAuditLevelFilter('ALL')} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => { setAuditSearch(''); setAuditLevelFilter('ALL'); }}
                      style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
                    >
                      Xóa tất cả bộ lọc
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Tìm thấy <strong>{filteredLogs.length}</strong> / {auditLogData.length} bản ghi
                  </div>
                </div>
              )}
            </div>

            <div className="card" style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--line)' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th>Thời Gian</th>
                    <th>Địa Chỉ IP</th>
                    <th>Tài Khoản / Người Dùng</th>
                    <th>Hành Động Hệ Thống (Event Action)</th>
                    <th>Kết Quả / Mức Độ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-soft)' }}>
                        Không tìm thấy bản ghi log nào khớp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.time}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-soft)' }}>{item.ip}</td>
                        <td><strong>{item.user}</strong></td>
                        <td style={{ color: 'var(--ink)' }}>{item.action}</td>
                        <td><Badge tone={item.tone}>{item.level}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB 3: SECURITY POLICIES */}
      {activeTab === 'POLICIES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad">
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
              Cấu Hình Chính Sách Bảo Mật &amp; Chống Gian Lận Thi Cử (Security Policies)
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 16 }}>
              Áp dụng chính sách an toàn thông tin bắt buộc trên toàn hệ thống MM MegaLearn.
            </p>

            <div className="grid grid-2" style={{ marginBottom: 16 }}>
              <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Watermark Động Khi Xem Bài Giảng</span>
                  <input type="checkbox" checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Hiển thị mã nhân viên và địa chỉ IP mờ trên màn hình bài học để chống chụp lén tài liệu nội bộ.
                </div>
              </div>

              <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Giám Sát Chuyển Tab Khi Thi (Window Blur Guard)</span>
                  <input type="checkbox" checked={windowBlurGuard} onChange={(e) => setWindowBlurGuard(e.target.checked)} style={{ width: 18, height: 18 }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Cảnh báo và tự động khóa bài thi nếu thí sinh chuyển sang tab trình duyệt khác quá 3 lần.
                </div>
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 16 }}>
              <div>
                <label className="field-label">Thời Gian Tự Động Đăng Xuất Khi Không Hoạt Động (Session Timeout)</label>
                <select className="field-select" value={sessionTimeoutMins} onChange={(e) => setSessionTimeoutMins(Number(e.target.value))}>
                  <option value={15}>15 Phút</option>
                  <option value={30}>30 Phút (Khuyến nghị)</option>
                  <option value={60}>60 Phút</option>
                </select>
              </div>

              <div>
                <label className="field-label">Xác Thực 2 Lớp (2FA) Cho Tài Khoản Quản Trị</label>
                <select className="field-select" value={twoFactorAuth ? 'ENABLE' : 'DISABLE'} onChange={(e) => setTwoFactorAuth(e.target.value === 'ENABLE')}>
                  <option value="ENABLE">Bắt buộc Bật (Enforce 2FA)</option>
                  <option value="DISABLE">Tùy chọn</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {policySaved && <Badge tone="sage" icon="ti-check">Đã Lưu Chính Sách!</Badge>}
              <Button variant="primary" icon="ti-device-floppy" onClick={handleSavePolicy}>
                Lưu Cấu Hình Bảo Mật
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: QUẢN TRỊ TOÀN BỘ 6 ROLE & MA TRẬN PHÂN QUYỀN */}
      {activeTab === 'ROLE_GOVERNANCE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', borderColor: '#FCA5A5' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#991B1B' }}>
              System Admin (IT) — Quyền Cao Nhất Toàn Hệ Thống
            </div>
            <p style={{ fontSize: 12.5, color: '#7F1D1D', margin: '4px 0 0' }}>
              System Admin quản lý được <strong>tất cả 5 role còn lại, kể cả User Admin</strong>. Điểm khác biệt duy nhất so với
              User Admin là quyền <strong>can thiệp code, schema và hạ tầng nền tảng</strong> — User Admin chỉ quản trị nghiệp vụ nhân sự và khóa học.
            </p>
          </div>

          {/* Chuỗi phân cấp 6 role */}
          <div className="card card-pad">
            <div className="section-label">Chuỗi Phân Cấp 6 Role (thấp → cao)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'stretch' }}>
              {ROLE_DEFINITIONS.map((def, idx) => {
                const persona = personaForRole(def.id);
                return (
                  <React.Fragment key={def.id}>
                    {idx > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-faint)' }}>
                        <i className="ti ti-chevron-right" />
                      </div>
                    )}
                    <div
                      className="card card-pad"
                      style={{ flex: '1 1 190px', minWidth: 190, background: `var(--${def.tone}-soft)`, borderColor: 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <i className={`ti ${def.icon}`} />
                        <strong style={{ fontSize: 12.5 }}>{def.rank}. {def.shortVi}</strong>
                      </div>
                      <div style={{ fontSize: 11.5, marginBottom: 6 }}>{persona.fullName}</div>
                      <JobLevelBadge level={persona.level} compact />
                      <div style={{ fontSize: 11, marginTop: 8, lineHeight: 1.45 }}>{def.summaryVi}</div>
                      <div style={{ fontSize: 10.5, marginTop: 8, opacity: 0.85 }}>
                        <strong>Quản lý:</strong> {managedScopeLabel(def.id)}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Ma trận năng lực theo role */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <div className="card-pad" style={{ paddingBottom: 0 }}>
              <div className="section-label">Ma Trận Phân Quyền Theo Role (không theo cấp bậc)</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ minWidth: 280 }}>Năng lực hệ thống</th>
                  {ROLE_DEFINITIONS.map((def) => (
                    <th key={def.id} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {def.rank}. {def.shortVi}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITY_ROWS.map((row) => (
                  <tr key={row.key}>
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>{row.label}</td>
                    {ROLE_DEFINITIONS.map((def) => {
                      const has = capabilitiesOf(def.id).includes(row.key);
                      return (
                        <td key={def.id} style={{ textAlign: 'center' }}>
                          {has
                            ? <i className="ti ti-circle-check" style={{ color: 'var(--sage)', fontSize: 17 }} />
                            : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân bổ tài khoản theo role */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <div className="card-pad" style={{ paddingBottom: 0 }}>
              <div className="section-label">Phân Bổ Tài Khoản Theo Role & Cấp Bậc</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Persona Đại Diện</th>
                  <th>Cấp Bậc Mặc Định</th>
                  <th>Số Tài Khoản</th>
                  <th>Phạm Vi Quản Lý</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_DEFINITIONS.map((def) => {
                  const users = allUsers().filter((u) => normalizeRole(u.role) === def.id);
                  const persona = personaForRole(def.id);
                  return (
                    <tr key={def.id}>
                      <td>
                        <Badge tone={def.tone}>{def.rank}. {def.labelVi}</Badge>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{persona.fullName}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--ink-faint)' }}>{persona.userId}</div>
                      </td>
                      <td><JobLevelBadge level={def.defaultLevel} /></td>
                      <td><Badge tone="blue">{users.length} tài khoản</Badge></td>
                      <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{managedScopeLabel(def.id)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-eye"
                          onClick={() => setTranscriptUser(persona)}
                          style={{ fontSize: 11.5 }}
                        >
                          Chi Tiết &amp; Thăng Level
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Hành động chỉ dành cho System Admin */}
          <div className="card card-pad">
            <div className="section-label">Hành Động Chỉ System Admin (IT) Được Phép</div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              {[
                { icon: 'ti-code', title: 'Thêm Function & Sửa Schema Nền Tảng', desc: 'Triển khai module mới, thay đổi cấu trúc dữ liệu và migration.' },
                { icon: 'ti-plug-connected', title: 'Cấu Hình SAP HRIS REST API & SSO', desc: 'Khóa API, endpoint đồng bộ, chứng chỉ SAML/OIDC.' },
                { icon: 'ti-server-bolt', title: 'Quản Trị Hạ Tầng & Sao Lưu', desc: 'Máy chủ, CDN, lịch backup và khôi phục thảm họa.' },
                { icon: 'ti-shield-lock', title: 'Chính Sách Bảo Mật ISO 27001', desc: 'Watermark, chống gian lận, audit log bất biến.' },
              ].map((item) => (
                <div key={item.title} className="card card-pad" style={{ background: 'var(--paper-sunken)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'start' }}>
                    <i className={`ti ${item.icon}`} style={{ fontSize: 20, color: 'var(--rust)' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{item.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>{item.desc}</div>
                      <div style={{ fontSize: 11, color: 'var(--rust)', marginTop: 6, fontWeight: 600 }}>
                        User Admin bị chặn thao tác này
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* USER TRANSCRIPT & PROMOTION MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
      />
    </>
  );
}
