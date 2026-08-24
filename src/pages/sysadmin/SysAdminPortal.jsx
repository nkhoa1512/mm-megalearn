import React, { useState } from 'react';
import {
  sysAdminUser,
  hrisSyncLogs,
  securityComplianceConfig,
} from '../../data/mockData';
import { Badge, Button, Modal, ProgressBar } from '../../components/ui';

export default function SysAdminPortal() {
  const [activeTab, setActiveTab] = useState('HRIS'); // HRIS, AUDIT_LOGS, POLICIES
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Security Policy States
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

        {/* Quick Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage)' }}>99.98%</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Hạ tầng SLA<br />Uptime Health</div>
          </div>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>CONNECTED</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>SAP HRIS Sync<br />REST API Pipeline</div>
          </div>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>0 Cảnh Báo</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Sự cố Bảo mật<br />Trong 24 giờ qua</div>
          </div>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
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
          { id: 'POLICIES', label: 'Chính Sách Bảo Mật & Chống Gian Lận (Security Policies)', icon: 'ti-lock-access', count: 'Standard' },
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
      {activeTab === 'AUDIT_LOGS' && (
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

          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Thời Gian</th>
                  <th>Địa Chỉ IP</th>
                  <th>Tài Khoản / Người Dùng</th>
                  <th>Hành Động Hệ Thống (Event Action)</th>
                  <th>Kết Quả / Mức Độ</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: '2026-08-24 16:15:22', ip: '113.161.42.18 (HCMC)', user: 'Tran Quoc Bao (sysadmin)', action: 'Phê duyệt cấu hình chính sách bảo mật hệ thống v2.1', level: 'INFO', tone: 'blue' },
                  { time: '2026-08-24 15:40:10', ip: '14.169.88.204 (HCMC)', user: 'Sarah Nguyen (admin)', action: 'Xuất bản khóa học: Thực hành Lò nướng Bánh & HACCP', level: 'NOTICE', tone: 'sage' },
                  { time: '2026-08-24 14:20:05', ip: '171.244.12.90 (Hanoi)', user: 'Minh Tran (learner)', action: 'Hoàn thành bài thi trắc nghiệm HACCP đạt 100/100 điểm', level: 'INFO', tone: 'blue' },
                  { time: '2026-08-24 11:10:45', ip: '42.112.30.15 (HCMC)', user: 'Le Thi Mai (useradmin)', action: 'Cập nhật chức danh nhân sự cho 3 cán bộ quầy thu ngân', level: 'NOTICE', tone: 'sage' },
                  { time: '2026-08-24 09:05:12', ip: '118.69.182.50 (Danang)', user: 'Nguyen Van Hung (trainer)', action: 'Kích hoạt mã Live QR Điểm danh Lớp Thực hành Quầy Bánh', level: 'INFO', tone: 'blue' },
                ].map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.time}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-soft)' }}>{item.ip}</td>
                    <td><strong>{item.user}</strong></td>
                    <td style={{ color: 'var(--ink)' }}>{item.action}</td>
                    <td><Badge tone={item.tone}>{item.level}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
    </>
  );
}
