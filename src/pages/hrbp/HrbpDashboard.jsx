import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  hrbpUser,
  retailStores,
  competencyFramework,
  allUsers,
} from '../../data/mockData';
import { useCourseStore } from '../../state/CourseStore';
import { Badge, Button, Modal, ProgressBar } from '../../components/ui';
import UserTranscriptModal from '../../components/UserTranscriptModal';

const TAB_PATH = {
  SKILL_GAP: '/hrbp',
  SUCCESSION: '/hrbp/succession',
  COMPLIANCE: '/hrbp/compliance',
};

export default function HrbpDashboard({ initialTab = 'SKILL_GAP' }) {
  const { courses, users } = useCourseStore();
  const navigate = useNavigate();
  // SKILL_GAP | SUCCESSION | COMPLIANCE — 1 trang, 3 tab. Bấm tab đổi luôn URL
  // (thay vì chỉ đổi state) để tiêu đề trang và nút back của trình duyệt khớp
  // với nội dung đang xem, dù sidebar giờ chỉ còn 1 mục trỏ vào trang này.
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  function goToTab(tabId) {
    setActiveTab(tabId);
    navigate(TAB_PATH[tabId] || '/hrbp');
  }
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [transcriptUser, setTranscriptUser] = useState(null);

  // Modal States
  const [interventionModal, setInterventionModal] = useState(false);
  const [interventionDept, setInterventionDept] = useState('Fresh Food & Bakery (MM An Phú)');
  const [interventionSkill, setInterventionSkill] = useState('HACCP & Cold-Chain Storage Protocols');
  const [interventionReason, setInterventionReason] = useState('Tỷ lệ hao hụt quầy bánh tăng 3.2% trong tháng 7. Cần mở lớp thực hành kỹ năng chuẩn hóa quy trình.');
  const [interventionSent, setInterventionSent] = useState(false);

  const [nudgeSent, setNudgeSent] = useState(false);

  function handleSendIntervention() {
    setInterventionSent(true);
    setTimeout(() => {
      setInterventionSent(false);
      setInterventionModal(false);
    }, 1800);
  }

  function handleSendRegionalNudge() {
    setNudgeSent(true);
    setTimeout(() => setNudgeSent(false), 2500);
  }

  return (
    <>
      {/* HRBP EXECUTIVE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>HRBP Strategic Talent &amp; Workforce Analytics</h1>
            <Badge tone="blue" icon="ti-users">HR Business Partner</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Đối tác Nhân sự Chiến lược: <strong>{hrbpUser.fullName}</strong> &middot; {hrbpUser.department} &middot; Phụ trách: Khối Vận hành Siêu thị Khu vực Miền Nam
          </p>
        </div>

        {/* Quick KPI stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage)' }}>94.2%</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Tỷ lệ Tuân thủ<br />Đào tạo Vùng</div>
          </div>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>78.5%</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Sẵn sàng Kế nhiệm<br />(Talent Readiness)</div>
          </div>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>4</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Khoảng cách Kỹ năng<br />Cần L&amp;D can thiệp</div>
          </div>
          <div className="card card-pad" style={{ padding: '8px 16px', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>1,450</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Nhân sự Phụ trách<br />Khu vực Miền Nam</div>
          </div>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'SKILL_GAP', label: 'Khoảng Cách Năng Lực & Đề Xuất L&D (Skill Gap Matrix)', icon: 'ti-chart-radar', count: '4 Điểm nghẽn' },
          { id: 'SUCCESSION', label: 'Quy Hoạch Kế Nhiệm & Talent Pool (70-20-10 Pipeline)', icon: 'ti-git-branch', count: '12 Kế nhiệm' },
          { id: 'COMPLIANCE', label: 'Bản Đồ Tuân Thủ Bắt Buộc Theo Siêu Thị (Regional Heatmap)', icon: 'ti-shield-check', count: '94.2%' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => goToTab(tab.id)}
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

      {/* TAB 1: REGIONAL SKILL GAP MATRIX & L&D INTERVENTION */}
      {activeTab === 'SKILL_GAP' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', borderColor: 'var(--blue)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1E40AF' }}>
                  Phân Tích Năng Lực Chi Nhánh &amp; Đề Xuất Can Thiệp Đào Tạo Cùng L&amp;D
                </div>
                <p style={{ fontSize: 12.5, color: '#1E3A8A', margin: '4px 0 0', lineHeight: 1.45 }}>
                  HRBP theo dõi khoảng cách giữa năng lực thực tế của nhân sự vs chuẩn định biên để chủ động yêu cầu L&amp;D mở lớp đào tạo thực hành bù đắp kỹ năng.
                </p>
              </div>
              <Button variant="primary" icon="ti-plus" onClick={() => setInterventionModal(true)}>
                Đề Xuất L&amp;D Mở Lớp Can Thiệp
              </Button>
            </div>
          </div>

          <div className="section-label">Ma Trận Thiếu Hụt Năng Lực Cần Can Thiệp Theo Khối / Bộ Phận:</div>

          <div className="grid grid-2">
            {[
              {
                unit: 'Quầy Bánh & Tươi Sống (MM An Phú)',
                skill: 'HACCP & Cold-Chain Storage Protocols',
                gap: -18,
                current: 72,
                required: 90,
                impact: 'Ảnh hưởng trực tiếp đến tỷ lệ hao hụt hàng hóa và vệ sinh an toàn thực phẩm.',
                recommendedCourse: 'Thực hành Lò nướng & Kiểm soát HACCP Quầy Tươi',
                status: 'CẦN CAN THIỆP GẤP',
              },
              {
                unit: 'Bộ Phận Thu Ngân & Dịch Vụ Khách Hàng (MM Bình Phú)',
                skill: 'Cash Handling, POS Speed & Shrinkage Control',
                gap: -14,
                current: 76,
                required: 90,
                impact: 'Thời gian thanh toán trung bình tăng 15s/giao dịch trong giờ cao điểm.',
                recommendedCourse: 'Thao tác Máy POS Tốc độ cao & Xử lý Phàn nàn Khách hàng',
                status: 'ĐANG THEO DÕI',
              },
              {
                unit: 'Đội Ngũ Quản Trị & Giám Sát Ca (MM Rạch Giá)',
                skill: 'Team Coaching & Performance Management',
                gap: -15,
                current: 70,
                required: 85,
                impact: 'Tỷ lệ hoàn thành đánh giá Kirkpatrick Cấp 3 của nhân viên ca đạt dưới 70%.',
                recommendedCourse: 'Kỹ năng Kèm cặp 1-on-1 & Quản trị Mục tiêu Ca',
                status: 'CẦN CAN THIỆP GẤP',
              },
              {
                unit: 'Kho Vận & Giao Nhận B2B (MM Hiệp Phú)',
                skill: 'Data Analytics & Stock Optimization',
                gap: -10,
                current: 75,
                required: 85,
                impact: 'Sai lệch số liệu tồn kho thực tế vs hệ thống ERP trong kỳ kiểm kê Q2.',
                recommendedCourse: 'Tối ưu Hóa Tồn Kho & Kiểm Soát Mã Vạch Kho Vận',
                status: 'KẾ HOẠCH Q3',
              },
            ].map((item, idx) => (
              <div key={idx} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>{item.unit}</div>
                      <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, marginTop: 2 }}>{item.skill}</div>
                    </div>
                    <Badge tone={item.gap <= -15 ? 'rust' : 'amber'}>Gap: {item.gap}%</Badge>
                  </div>

                  <div style={{ margin: '12px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      <span>Năng lực thực tế: <strong>{item.current}%</strong></span>
                      <span>Chuẩn yêu cầu: <strong>{item.required}%</strong></span>
                    </div>
                    <ProgressBar value={item.current} tone={item.current >= 80 ? 'sage' : item.current >= 70 ? 'amber' : 'rust'} size="sm" />
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 10px', lineHeight: 1.45 }}>
                    <strong>Tác động kinh doanh:</strong> {item.impact}
                  </p>
                  <div style={{ fontSize: 11.5, color: 'var(--rail)', background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6, fontWeight: 600 }}>
                    Khóa đào tạo đề xuất: {item.recommendedCourse}
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    size="sm"
                    variant="outline"
                    icon="ti-send"
                    onClick={() => {
                      setInterventionDept(item.unit);
                      setInterventionSkill(item.skill);
                      setInterventionModal(true);
                    }}
                  >
                    Gửi Yêu Cầu Cho L&amp;D
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SUCCESSION PIPELINE & 70-20-10 */}
      {activeTab === 'SUCCESSION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', borderColor: 'var(--sage)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#166534' }}>
                  Quy Hoạch Đội Ngũ Kế Nhiệm Khối Vận Hành Siêu Thị (Succession Talent Pool)
                </div>
                <p style={{ fontSize: 12.5, color: '#14532D', margin: '4px 0 0' }}>
                  Theo dõi tiến độ phát triển năng lực theo mô hình 70-20-10 của các ứng viên kế nhiệm vị trí Giám đốc Siêu thị (SGM) và Trưởng quầy ngành hàng.
                </p>
              </div>
              <Badge tone="sage">12 Nhân Sự Tiềm Năng Sẵn Sàng</Badge>
            </div>
          </div>

          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Nhân Sự Tiềm Năng</th>
                <th>Chức Danh Hiện Tại &amp; Siêu Thị</th>
                <th>Vị Trí Quy Hoạch Kế Nhiệm</th>
                <th style={{ width: 140 }}>Mức Độ Sẵn Sàng</th>
                <th style={{ minWidth: 160 }}>Tiến Độ 70-20-10</th>
                <th style={{ textAlign: 'right' }}>Thao Tác HRBP</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: 'Trần Quốc Bảo',
                  id: 'MMVN-2041',
                  currentRole: 'Trưởng Quầy Tươi Sống',
                  store: 'MM An Phú',
                  targetRole: 'Phó Giám Đốc Siêu Thị (Deputy SGM)',
                  readiness: 'READY_NOW',
                  readinessLabel: 'Sẵn Sàng Ngay',
                  progress702010: 88,
                  mentor: 'Trần Minh Quang (SGM)',
                },
                {
                  name: 'Minh Tran',
                  id: 'MMVN-1042',
                  currentRole: 'Chuyên viên Bánh Mì Cao Cấp',
                  store: 'MM An Phú',
                  targetRole: 'Trưởng Bộ Phận Bánh Mì & Thực Phẩm Chế Biến',
                  readiness: 'READY_1_YEAR',
                  readinessLabel: 'Sẵn Sàng trong 1 Năm',
                  progress702010: 76,
                  mentor: 'Nguyễn Văn Hùng (Master Trainer)',
                },
                {
                  name: 'Sarah Johnson',
                  id: 'MMVN-1078',
                  currentRole: 'Pastry Chef Associate',
                  store: 'MM An Phú',
                  targetRole: 'Trưởng Nhóm Kỹ Thuật Bánh Tươi',
                  readiness: 'READY_1_YEAR',
                  readinessLabel: 'Sẵn Sàng trong 1 Năm',
                  progress702010: 72,
                  mentor: 'Nguyễn Văn Hùng (Master Trainer)',
                },
                {
                  name: 'Lê Hoàng Nam',
                  id: 'MMVN-3012',
                  currentRole: 'Trưởng Ca Dịch Vụ Thu Ngân',
                  store: 'MM Bình Phú',
                  targetRole: 'Trưởng Phòng Dịch Vụ Khách Hàng',
                  readiness: 'READY_NOW',
                  readinessLabel: 'Sẵn Sàng Ngay',
                  progress702010: 92,
                  mentor: 'Đặng Thanh Mai (HRBP)',
                },
                {
                  name: 'Phạm Thị Thảo',
                  id: 'MMVN-4055',
                  currentRole: 'Giám Sát Kiểm Soát Hao Hụt (QA)',
                  store: 'MM Thăng Long',
                  targetRole: 'Trưởng Bộ Phận QA & An Toàn Thực Phẩm Miền Bắc',
                  readiness: 'READY_NOW',
                  readinessLabel: 'Sẵn Sàng Ngay',
                  progress702010: 85,
                  mentor: 'Vũ Đức Thành (HSE Director)',
                },
              ].map((talent, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{talent.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>{talent.id}</div>
                  </td>
                  <td>
                    <div>{talent.currentRole}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{talent.store}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--blue)' }}>{talent.targetRole}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Mentor: {talent.mentor}</div>
                  </td>
                  <td>
                    <Badge tone={talent.readiness === 'READY_NOW' ? 'sage' : 'amber'}>
                      {talent.readinessLabel}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={talent.progress702010} tone={talent.progress702010 >= 80 ? 'sage' : 'blue'} size="sm" />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 32 }}>{talent.progress702010}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Button
                      size="sm"
                      variant="outline"
                      icon="ti-eye"
                      onClick={() => {
                        const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                        const found = list.find(u => u.userId === talent.id || u.employeeCode === talent.id || u.fullName === talent.name) || {
                          userId: talent.id,
                          employeeCode: talent.id,
                          fullName: talent.name,
                          position: talent.currentRole,
                          storeName: talent.store,
                          level: '6',
                        };
                        setTranscriptUser(found);
                      }}
                    >
                      Chi Tiết Khóa Học
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: REGIONAL COMPLIANCE MAP & NUDGE */}
      {activeTab === 'COMPLIANCE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                Tỷ Lệ Tuân Thủ Đào Tạo Bắt Buộc Theo Chi Nhánh Siêu Thị (Regional Compliance Heatmap)
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
                Giám sát % hoàn thành các chứng chỉ bắt buộc theo luật định (HACCP, PCCC, An toàn lao động, Bảo mật POS).
              </p>
            </div>
            <Button
              variant="primary"
              icon={nudgeSent ? 'ti-check' : 'ti-bell'}
              onClick={handleSendRegionalNudge}
            >
              {nudgeSent ? 'Đã Gửi Nhắc Nhở Tới Các Siêu Thị!' : 'Gửi Nhắc Nhở Cho Siêu Thị Dưới Chuẩn'}
            </Button>
          </div>

          <div className="grid grid-3">
            {[
              { store: 'MM Mega Market An Phú (Flagship)', region: 'Miền Nam', totalStaff: 320, haccp: 98, pccc: 96, sec: 95, overall: 96.3, status: 'CHUẨN_XUẤT_SẮC' },
              { store: 'MM Mega Market Bình Phú', region: 'Miền Nam', totalStaff: 240, haccp: 92, pccc: 94, sec: 90, overall: 92.0, status: 'ĐẠT_CHUẨN' },
              { store: 'MM Mega Market Hiệp Phú', region: 'Miền Nam', totalStaff: 210, haccp: 88, pccc: 91, sec: 89, overall: 89.3, status: 'ĐẠT_CHUẨN' },
              { store: 'MM Mega Market Rạch Giá', region: 'Miền Nam (Tỉnh)', totalStaff: 180, haccp: 82, pccc: 85, sec: 84, overall: 83.6, status: 'CẦN_CẢNH_BÁO' },
              { store: 'MM Mega Market Cần Thơ', region: 'Miền Tây', totalStaff: 220, haccp: 95, pccc: 96, sec: 94, overall: 95.0, status: 'CHUẨN_XUẤT_SẮC' },
              { store: 'MM Mega Market Vũng Tàu', region: 'Đông Nam Bộ', totalStaff: 190, haccp: 94, pccc: 90, sec: 92, overall: 92.0, status: 'ĐẠT_CHUẨN' },
            ].map((st, idx) => (
              <div
                key={idx}
                className="card card-pad"
                style={{
                  borderColor: st.overall < 85 ? 'var(--rust)' : st.overall >= 95 ? 'var(--sage)' : 'var(--line)',
                  background: st.overall < 85 ? '#FEF2F2' : '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{st.store}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{st.region} &middot; {st.totalStaff} Nhân viên</div>
                  </div>
                  <Badge tone={st.overall >= 95 ? 'sage' : st.overall >= 90 ? 'blue' : 'rust'}>
                    {st.overall}%
                  </Badge>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>ATTP &amp; HACCP:</span>
                    <strong>{st.haccp}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>PCCC &amp; An Toàn Lao Động:</span>
                    <strong>{st.pccc}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>Bảo Mật POS &amp; Thông Tin:</span>
                    <strong>{st.sec}%</strong>
                  </div>
                </div>

                <ProgressBar value={st.overall} tone={st.overall >= 95 ? 'sage' : st.overall >= 90 ? 'blue' : 'rust'} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT L&D INTERVENTION REQUEST */}
      {interventionModal && (
        <Modal
          title="Đề Xuất L&D Tổ Chức Khóa Đào Tạo Can Thiệp Năng Lực"
          onClose={() => setInterventionModal(false)}
          size="md"
        >
          <div>
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Khối / Bộ Phận / Siêu Thị Cần Can Thiệp:</label>
              <input
                className="field-input"
                value={interventionDept}
                onChange={(e) => setInterventionDept(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Kỹ Năng Thiếu Hụt (Skill Gap):</label>
              <input
                className="field-input"
                value={interventionSkill}
                onChange={(e) => setInterventionSkill(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Lý Do Đề Xuất &amp; Tác Động Kinh Doanh:</label>
              <textarea
                className="field-input"
                rows={4}
                value={interventionReason}
                onChange={(e) => setInterventionReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={() => setInterventionModal(false)}>Hủy</Button>
              <Button variant="primary" icon="ti-send" onClick={handleSendIntervention}>
                {interventionSent ? 'Đã Gửi Thành Công Cho L&D Admin!' : 'Xác Nhận Gửi Yêu Cầu Cho L&D'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* USER TRANSCRIPT DRILL-DOWN MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
      />
    </>
  );
}
