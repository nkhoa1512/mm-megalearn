import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  hrbpUser,
  retailStores,
  allUsers,
} from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, Modal, ProgressBar } from '../../features/common/ui';
import UserTranscriptModal from '../../features/common/UserTranscriptModal';
import HrbpCurriculumTab from './HrbpCurriculumTab';
import {
  complianceByStore,
  regionalComplianceRate,
  headcountInScope,
  skillGapRows,
} from '../../utils/hrbpAnalytics';
import { getCurriculumProgress } from '../../utils/curriculumAssignment';

const TAB_PATH = {
  SKILL_GAP: '/hrbp',
  SUCCESSION: '/hrbp/succession',
  COMPLIANCE: '/hrbp/compliance',
  CURRICULUM: '/hrbp/curriculum',
};

export default function HrbpDashboard({ initialTab = 'SKILL_GAP' }) {
  const {
    courses,
    users,
    curricula,
    assignCurriculum,
    proposeCurriculumAssignment,
    interventions,
    addInterventionRequest,
    cancelIntervention,
    successionTalents,
    addSuccessionTalent,
    updateSuccessionTalent,
    successionAlignments,
    saveSuccessionAlignment,
    complianceNudges,
    sendComplianceNudge,
    currentUser,
    enrollments,
  } = useCourseStore();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  function goToTab(tabId) {
    setActiveTab(tabId);
    navigate(TAB_PATH[tabId] || '/hrbp');
  }

  const [transcriptUser, setTranscriptUser] = useState(null);

  // Tab 1: Intervention Modal States
  const [interventionModal, setInterventionModal] = useState(false);
  const [formUnit, setFormUnit] = useState('Quầy Bánh & Tươi Sống (MM An Phú)');
  const [formDeptCode, setFormDeptCode] = useState('PPF');
  const [formSkill, setFormSkill] = useState('HACCP & Cold-Chain Storage Protocols');
  const [formCourseId, setFormCourseId] = useState('CRS-FSH-001');
  const [formCourseTitle, setFormCourseTitle] = useState('Food Safety & Hygiene Standards (HACCP)');
  const [formUrgency, setFormUrgency] = useState('HIGH');
  const [formImpact, setFormImpact] = useState('Tỷ lệ hao hụt quầy bánh tăng 3.2% trong tháng 7. Cần mở lớp thực hành kỹ năng chuẩn hóa quy trình.');
  const [formTrainer, setFormTrainer] = useState('Nguyen Van Hung (Master Trainer)');
  const [toastMessage, setToastMessage] = useState(null);

  // Tab 2: Succession Actions
  const [assignCurriculumModal, setAssignCurriculumModal] = useState(null); // talent object
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
  const [curriculumDueDate, setCurriculumDueDate] = useState('2026-12-31');

  const [alignmentModal, setAlignmentModal] = useState(null); // talent object
  const [alnOjt, setAlnOjt] = useState(80);
  const [alnMentor, setAlnMentor] = useState(75);
  const [alnFormal, setAlnFormal] = useState(70);
  const [alnReadiness, setAlnReadiness] = useState('READY_IN_6_MONTHS');
  const [alnNotes, setAlnNotes] = useState('');

  const [nominateModal, setNominateModal] = useState(false);
  const [nominateUserId, setNominateUserId] = useState('');
  const [nominateTargetRole, setNominateTargetRole] = useState('');
  const [nominateMentor, setNominateMentor] = useState('Trần Minh Quang (SGM)');
  const [successionSearch, setSuccessionSearch] = useState('');
  const [successionReadinessFilter, setSuccessionReadinessFilter] = useState('ALL');
  const [successionGroupBy, setSuccessionGroupBy] = useState('NONE');

  // Tab 3: Compliance Drilldown & Nudge
  const [storeDrilldown, setStoreDrilldown] = useState(null); // store item
  const [nudgeModal, setNudgeModal] = useState(null); // store item
  const [nudgeDeadline, setNudgeDeadline] = useState('2026-09-15');
  const [nudgeMessage, setNudgeMessage] = useState('');

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Handle submit intervention
  function handleSubmitIntervention(e) {
    e.preventDefault();
    addInterventionRequest({
      unit: formUnit,
      departmentCode: formDeptCode,
      skill: formSkill,
      courseId: formCourseId,
      courseTitle: formCourseTitle,
      urgency: formUrgency,
      impact: formImpact,
      trainerName: formTrainer,
    });
    setInterventionModal(false);
    showToast('✅ Đã tạo Ticket can thiệp L&D thành công!');
  }

  // Handle Propose Curriculum Assignment to Candidate
  function handleAssignCurriculumToCandidate() {
    if (!assignCurriculumModal || !selectedCurriculumId) return;
    const targetUserId = assignCurriculumModal.userId || assignCurriculumModal.id;
    const result = proposeCurriculumAssignment(
      selectedCurriculumId,
      {
        assignmentType: 'USER',
        targetId: targetUserId,
        targetLabel: `${assignCurriculumModal.name} (${assignCurriculumModal.employeeCode || targetUserId})`,
        dueDate: curriculumDueDate,
      },
      `HRBP đề xuất bổ sung Giáo trình phát triển năng lực cho ứng viên kế nhiệm ${assignCurriculumModal.name}.`
    );
    if (result && result.ok && updateSuccessionTalent) {
      updateSuccessionTalent(assignCurriculumModal.id, {
        curriculumId: selectedCurriculumId,
        curriculumProposalId: result.request?.id,
      });
    }
    setAssignCurriculumModal(null);
    showToast(`📋 Đã gửi đơn đề xuất gán Giáo Trình cho ứng viên ${assignCurriculumModal.name} lên User Admin phê duyệt!`);
  }

  // Handle Save 1-on-1 Alignment
  function handleSaveAlignment(e) {
    e.preventDefault();
    if (!alignmentModal) return;
    saveSuccessionAlignment({
      candidateId: alignmentModal.id || alignmentModal.userId,
      candidateName: alignmentModal.name,
      targetRole: alignmentModal.targetRole,
      mentorName: alignmentModal.mentor,
      managerName: currentUser?.fullName || 'HRBP',
      ojt70Progress: Number(alnOjt),
      mentoring20Progress: Number(alnMentor),
      course10Progress: Number(alnFormal),
      readiness: alnReadiness,
      readinessLabel: alnReadiness === 'READY_NOW' ? 'Sẵn Sàng Ngay' : alnReadiness === 'READY_IN_6_MONTHS' ? 'Sẵn Sàng trong 6 Tháng' : 'Sẵn Sàng trong 1 Năm',
      notes: alnNotes,
    });
    setAlignmentModal(null);
    showToast(`🤝 Đã ghi nhận Biên bản họp 1-on-1 Alignment cho ${alignmentModal.name}!`);
  }

  // Handle Nominate Talent
  function handleNominateCandidate(e) {
    e.preventDefault();
    if (!nominateUserId || !nominateTargetRole.trim()) return;
    const allUserList = users && users.length > 0 ? users : allUsers ? allUsers() : [];
    const foundUser = allUserList.find((u) => u.userId === nominateUserId || u.employeeCode === nominateUserId);
    if (!foundUser) return;

    addSuccessionTalent({
      id: foundUser.employeeCode || foundUser.userId,
      userId: foundUser.userId,
      name: foundUser.fullName,
      currentRole: foundUser.position || 'Specialist',
      store: foundUser.storeName || 'MM Mega Market An Phú',
      storeId: foundUser.storeId || 'store-an-phu',
      targetRole: nominateTargetRole.trim(),
      readiness: 'DEVELOPING',
      readinessLabel: 'Đang Đào Tạo Phát Triển',
      progress702010: 60,
      ojt70: 60,
      mentoring20: 60,
      formal10: 60,
      mentor: nominateMentor,
      curriculumId: null,
    });
    setNominateModal(false);
    setNominateUserId('');
    setNominateTargetRole('');
    showToast(`🌟 Đã đề cử thành công ${foundUser.fullName} vào Talent Pool!`);
  }

  // Handle Send SGM Nudge
  function handleSendSgmNudge(e) {
    e.preventDefault();
    if (!nudgeModal) return;
    sendComplianceNudge(nudgeModal.storeId || nudgeModal.code || nudgeModal.store, {
      storeName: nudgeModal.store,
      sgmName: 'Giám Đốc Siêu Thị (SGM)',
      deadline: nudgeDeadline,
      message: nudgeMessage || `Yêu cầu hoàn tất 100% chứng chỉ bắt buộc ATTP/HACCP và PCCC trước ngày ${nudgeDeadline}.`,
    });
    setNudgeModal(null);
    showToast(`⚠️ Đã gửi cảnh báo chính thức tới Giám Đốc Siêu Thị ${nudgeModal.store}!`);
  }

  // Real store compliance list & analytics derived from store users
  const storeComplianceList = useMemo(
    () => complianceByStore(users, enrollments, courses),
    [users, enrollments, courses]
  );

  const overallComplianceRate = useMemo(
    () => regionalComplianceRate(users, enrollments, courses),
    [users, enrollments, courses]
  );

  const skillGapList = useMemo(() => skillGapRows(undefined, users), [users]);

  const headcount = useMemo(() => headcountInScope(users), [users]);

  // Export audit report JSON/CSV
  function handleExportAuditReport() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(storeComplianceList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `MMVN_Compliance_Audit_Report_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('📥 Đã xuất báo cáo kiểm tra tuân thủ thành công!');
  }

  return (
    <>
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: 'var(--ink)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            fontSize: 13.5,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <i className="ti ti-check" style={{ color: 'var(--sage)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HRBP EXECUTIVE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>HRBP Strategic Talent &amp; Workforce Analytics</h1>
            <Badge tone="blue" icon="ti-users">HR Business Partner (Level 2)</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Đối tác Nhân sự Chiến lược: <strong>{currentUser?.fullName || hrbpUser.fullName}</strong> &middot; {currentUser?.departmentName || hrbpUser.departmentName || 'HR Business Partnering'} &middot; Phụ trách: Khối Vận hành Siêu thị Khu vực Miền Nam
          </p>
        </div>

        <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
          Xem Giao Diện Học Tập Cá Nhân
        </Button>
      </div>

      {/* Quick KPI stats */}
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-shield-check" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage)' }}>{overallComplianceRate}%</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Tỷ lệ Tuân thủ<br />Đào tạo Vùng</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-chart-pie" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>
              {successionTalents.length} Ứng viên
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Quy Hoạch Kế Nhiệm<br />(Talent Pool)</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-alert-triangle" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>{interventions.length}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Đề Xuất Can Thiệp<br />L&amp;D Đang Theo Dõi</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-users" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>{headcount}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Nhân sự trong phạm vi<br />HRBP phụ trách</div>
          </div>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'SKILL_GAP', label: 'Khoảng Cách Năng Lực & Đề Xuất L&D (Skill Gap Matrix)', icon: 'ti-chart-dots', count: `${interventions.length} Ticket` },
          { id: 'SUCCESSION', label: 'Quy Hoạch Kế Nhiệm & Talent Pool (70-20-10 Pipeline)', icon: 'ti-git-branch', count: `${successionTalents.length} Kế nhiệm` },
          { id: 'COMPLIANCE', label: 'Bản Đồ Tuân Thủ Bắt Buộc Theo Siêu Thị (Regional Heatmap)', icon: 'ti-shield-check', count: `${overallComplianceRate}%` },
          { id: 'CURRICULUM', label: 'Giáo Trình & Đề Xuất Nhân Tài (Curriculum)', icon: 'ti-books', count: `${(curricula || []).filter(c => c.status === 'PUBLISHED').length} Giáo Trình` },
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 12 }}>
              Ma Trận Thiếu Hụt Năng Lực Cần Can Thiệp Theo Khối / Bộ Phận:
            </div>

            <div className="grid grid-2" style={{ gap: 16 }}>
              {skillGapList.map((item, idx) => (
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
                    <div style={{ fontSize: 11.5, color: 'var(--rail)', background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Khóa học đề xuất: <strong>{item.recommendedCourse}</strong></span>
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Giảng viên: {item.trainer}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      icon="ti-eye"
                      onClick={() => navigate(`/courses/${item.recommendedCourseId}`)}
                    >
                      Xem Khóa Học
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon="ti-send"
                      onClick={() => {
                        setFormUnit(item.unit);
                        setFormDeptCode(item.deptCode);
                        setFormSkill(item.skill);
                        setFormCourseId(item.recommendedCourseId);
                        setFormCourseTitle(item.recommendedCourse);
                        setFormUrgency(item.gap <= -15 ? 'HIGH' : 'MEDIUM');
                        setFormImpact(item.impact);
                        setFormTrainer(item.trainer);
                        setInterventionModal(true);
                      }}
                    >
                      Gửi Yêu Cầu L&amp;D
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TABLE OF ACTIVE INTERVENTION TICKETS */}
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  Quản Lý Danh Sách Đề Xuất Can Thiệp Đã Gửi L&amp;D ({interventions.length} Yêu cầu)
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
                  Theo dõi tình trạng tiếp nhận và tiến độ lên lịch đào tạo của phòng L&amp;D cho các khoảng cách kỹ năng đã báo cáo.
                </p>
              </div>
            </div>

            {interventions.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                Chưa có đề xuất can thiệp nào được gửi. Bấm <strong>+ Đề Xuất L&amp;D Mở Lớp Can Thiệp</strong> ở trên để tạo ticket mới.
              </div>
            ) : (
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Mã Ticket</th>
                    <th>Bộ Phận &amp; Khối</th>
                    <th>Kỹ Năng &amp; Khóa Học Đề Xuất</th>
                    <th>Độ Khẩn</th>
                    <th>Ngày Gửi</th>
                    <th>Trạng Thái Xử Lý</th>
                    <th style={{ textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {interventions.map((itv) => (
                    <tr key={itv.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: 'var(--blue)' }}>{itv.id}</strong>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Bởi: {itv.requestedBy}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{itv.unit}</div>
                        <Badge tone="slate" size="sm">{itv.departmentCode}</Badge>
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{itv.skill}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--rail)' }}>
                          Khóa: {itv.courseTitle}
                        </div>
                      </td>
                      <td>
                        <Badge tone={itv.urgency === 'HIGH' ? 'rust' : itv.urgency === 'MEDIUM' ? 'amber' : 'blue'}>
                          {itv.urgency === 'HIGH' ? '🔴 Khẩn Cấp' : itv.urgency === 'MEDIUM' ? '🟡 Trung Bình' : '🔵 Thường'}
                        </Badge>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        {itv.requestedAt}
                      </td>
                      <td>
                        {itv.status === 'SCHEDULED' ? (
                          <Badge tone="sage" icon="ti-calendar">Đã Lên Lịch: {itv.scheduledDate || '05/09/2026'}</Badge>
                        ) : itv.status === 'COMPLETED' ? (
                          <Badge tone="sage" icon="ti-check">Đã Hoàn Tất</Badge>
                        ) : itv.status === 'CANCELLED' ? (
                          <Badge tone="slate">Đã Hủy</Badge>
                        ) : (
                          <Badge tone="amber" icon="ti-clock">⏳ Chờ L&D Tiếp Nhận</Badge>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {itv.status !== 'CANCELLED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            style={{ color: 'var(--rust)' }}
                            onClick={() => {
                              cancelIntervention(itv.id);
                              showToast(`Đã hủy ticket ${itv.id}`);
                            }}
                          >
                            Hủy
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SUCCESSION PIPELINE & 70-20-10 */}
      {activeTab === 'SUCCESSION' && (() => {
        const filteredTalents = successionTalents.filter((t) => {
          if (successionReadinessFilter !== 'ALL' && t.readiness !== successionReadinessFilter) return false;
          if (successionSearch) {
            const q = successionSearch.toLowerCase().trim();
            const nameMatch = t.name?.toLowerCase().includes(q);
            const idMatch = t.id?.toLowerCase().includes(q);
            const roleMatch = t.currentRole?.toLowerCase().includes(q);
            const targetMatch = t.targetRole?.toLowerCase().includes(q);
            const storeMatch = t.store?.toLowerCase().includes(q);
            if (!nameMatch && !idMatch && !roleMatch && !targetMatch && !storeMatch) return false;
          }
          return true;
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Badge tone="sage">{successionTalents.length} Nhân Sự Trong Talent Pool</Badge>
                  <Button variant="primary" icon="ti-user-plus" onClick={() => setNominateModal(true)}>
                    Đề Cử Ứng Viên Mới
                  </Button>
                </div>
              </div>
            </div>

            {/* STANDARDIZED FILTER TOOLBAR */}
            <div className="card card-pad" style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 12 }}>
                {/* Search input */}
                <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                  <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                  <input
                    type="text"
                    className="field-input"
                    style={{ paddingLeft: 36, paddingRight: successionSearch ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                    placeholder="Tìm theo tên nhân sự, mã NV, chức danh, siêu thị..."
                    value={successionSearch}
                    onChange={(e) => setSuccessionSearch(e.target.value)}
                  />
                  {successionSearch && (
                    <button
                      type="button"
                      onClick={() => setSuccessionSearch('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>

                {/* Readiness filter */}
                <div style={{ minWidth: 200 }}>
                  <select
                    className="field-select"
                    style={{
                      width: '100%',
                      height: 38,
                      fontSize: 12.5,
                      borderRadius: 8,
                      background: successionReadinessFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                      borderColor: successionReadinessFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                      color: successionReadinessFilter !== 'ALL' ? '#005BAA' : 'var(--ink)',
                      fontWeight: successionReadinessFilter !== 'ALL' ? 700 : 500,
                    }}
                    value={successionReadinessFilter}
                    onChange={(e) => setSuccessionReadinessFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả mức độ sẵn sàng</option>
                    <option value="READY_NOW">🟢 Sẵn Sàng Ngay (Ready Now)</option>
                    <option value="READY_IN_6_MONTHS">🟡 Sẵn Sàng Sau 6 Tháng</option>
                    <option value="READY_IN_1_YEAR">🔵 Sẵn Sàng Sau 1-2 Năm</option>
                    <option value="DEVELOPING">⚪ Đang Bồi Dưỡng (Developing)</option>
                  </select>
                </div>
              </div>

              {/* ACTIVE FILTER TAGS & RESET */}
              {(successionSearch || successionReadinessFilter !== 'ALL') && (
                <div style={{ paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Đang lọc theo:</span>
                    {successionSearch && (
                      <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Từ khóa: <strong>"{successionSearch}"</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSuccessionSearch('')} />
                      </span>
                    )}
                    {successionReadinessFilter !== 'ALL' && (
                      <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Mức sẵn sàng: <strong>{successionReadinessFilter}</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSuccessionReadinessFilter('ALL')} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => { setSuccessionSearch(''); setSuccessionReadinessFilter('ALL'); }}
                      style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
                    >
                      Xóa tất cả bộ lọc
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Tìm thấy <strong>{filteredTalents.length}</strong> / {successionTalents.length} ứng viên
                  </div>
                </div>
              )}
            </div>

            <div className="card card-pad">
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Nhân Sự Tiềm Năng</th>
                  <th>Chức Danh Hiện Tại &amp; Siêu Thị</th>
                  <th>Vị Trí Quy Hoạch Kế Nhiệm</th>
                  <th style={{ width: 140 }}>Mức Độ Sẵn Sàng</th>
                  <th style={{ minWidth: 160 }}>Tiến Độ 70-20-10</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác Tác Nghiệp HRBP</th>
                </tr>
              </thead>
              <tbody>
                {filteredTalents.map((talent) => (
                  <tr key={talent.id}>
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
                      {talent.curriculumId && (() => {
                        const cur = (curricula || []).find((c) => c.id === talent.curriculumId);
                        if (!cur) return null;
                        const talentUser = (users || []).find(
                          (u) => u.userId === talent.userId || u.employeeCode === talent.id
                        ) || { userId: talent.userId || talent.id, level: '6' };
                        const curProg = getCurriculumProgress(
                          cur,
                          talentUser,
                          enrollments[talentUser.userId] || {},
                          courses
                        );
                        return (
                          <div
                            style={{
                              marginTop: 4,
                              padding: '4px 6px',
                              background: 'var(--paper-sunken)',
                              borderRadius: 4,
                              fontSize: 10.5,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                color: 'var(--ink-soft)',
                                marginBottom: 2,
                              }}
                            >
                              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                                📚 {cur.title}
                              </span>
                              <span>{curProg.progressPercent}%</span>
                            </div>
                            <ProgressBar
                              value={curProg.progressPercent}
                              tone={curProg.status === 'COMPLETED' ? 'sage' : 'blue'}
                              size="sm"
                            />
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <Badge tone={talent.readiness === 'READY_NOW' ? 'sage' : talent.readiness === 'READY_IN_6_MONTHS' ? 'amber' : 'blue'}>
                        {talent.readinessLabel || talent.readiness}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={talent.progress702010} tone={talent.progress702010 >= 80 ? 'sage' : 'blue'} size="sm" />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 32 }}>{talent.progress702010}%</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 2 }}>
                        70% OJT: {talent.ojt70 || 70}% &middot; 20% Mentor: {talent.mentoring20 || 70}% &middot; 10% Khóa: {talent.formal10 || 70}%
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-books"
                          title="Gán Giáo Trình Bắt Buộc Cho Ứng Viên Kế Nhiệm"
                          onClick={() => {
                            setAssignCurriculumModal(talent);
                            setSelectedCurriculumId(curricula[0]?.id || '');
                          }}
                        >
                          Gán Giáo Trình
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-notes"
                          title="Ghi Nhận Biên Bản Họp 1-on-1 Alignment Với Mentor & Quản Lý"
                          onClick={() => {
                            setAlignmentModal(talent);
                            setAlnOjt(talent.ojt70 || 80);
                            setAlnMentor(talent.mentoring20 || 75);
                            setAlnFormal(talent.formal10 || 70);
                            setAlnReadiness(talent.readiness || 'READY_IN_6_MONTHS');
                            setAlnNotes('');
                          }}
                        >
                          Họp 1-on-1
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
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
                          Hồ Sơ
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TABLE OF RECENT 1-ON-1 ALIGNMENT MINUTES */}
          <div className="card card-pad">
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>
              Biên Bản Họp 1-on-1 Alignment Định Kỳ Với SGM &amp; Mentor ({successionAlignments.length} Biên bản)
            </div>
            {successionAlignments.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', padding: '12px 0' }}>
                Chưa có biên bản họp nào. Bấm nút <strong>Họp 1-on-1</strong> tại từng ứng viên ở bảng trên để ghi nhận đánh giá 70-20-10.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {successionAlignments.map((aln) => (
                  <div
                    key={aln.id}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--paper-sunken)',
                      borderRadius: 8,
                      border: '1px solid var(--line)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                        {aln.candidateName} &middot; <span style={{ color: 'var(--blue)' }}>{aln.targetRole}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '3px 0' }}>
                        {aln.notes || 'Đã rà soát tiến độ dự án thực tế OJT và kỹ năng kèm cặp nhân viên mới.'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                        Mentor: <strong>{aln.mentorName}</strong> &middot; Người ghi nhận: <strong>{aln.managerName}</strong> &middot; Ngày: {aln.updatedAt}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 140 }}>
                      <Badge tone={aln.readiness === 'READY_NOW' ? 'sage' : 'amber'} size="sm">
                        {aln.readinessLabel || aln.readiness}
                      </Badge>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                        OJT: {aln.ojt70Progress}% &middot; Mentor: {aln.mentoring20Progress}% &middot; Khóa: {aln.course10Progress}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* TAB 3: REGIONAL COMPLIANCE MAP & NUDGE */}
      {activeTab === 'COMPLIANCE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                Tỷ Lệ Tuân Thủ Đào Tạo Bắt Buộc Theo Chi Nhánh Siêu Thị (Regional Compliance Heatmap)
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
                Giám sát % hoàn thành các chứng chỉ bắt buộc theo luật định (HACCP, PCCC, An toàn lao động, Bảo mật POS).
                Bấm vào từng siêu thị để drill-down danh sách nhân viên quá hạn.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                variant="outline"
                icon="ti-download"
                onClick={handleExportAuditReport}
              >
                Xuất Báo Cáo Tuân Thủ (JSON/Audit)
              </Button>
            </div>
          </div>

          <div className="grid grid-3" style={{ gap: 16 }}>
            {storeComplianceList.map((st, idx) => (
              <div
                key={idx}
                className="card card-pad"
                style={{
                  borderColor: st.overall < 85 ? 'var(--rust)' : st.overall >= 95 ? 'var(--sage)' : 'var(--line)',
                  background: st.overall < 85 ? '#FEF2F2' : 'var(--paper-raised)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onClick={() => setStoreDrilldown(st)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{st.store}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{st.region} &middot; {st.totalStaff} Nhân sự</div>
                  </div>
                  <Badge tone={st.overall >= 95 ? 'sage' : st.overall >= 90 ? 'blue' : 'rust'}>
                    {st.overall}%
                  </Badge>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, marginBottom: 12 }}>
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

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed var(--line)' }}>
                  <span style={{ fontSize: 11.5, color: st.overdueCount > 10 ? 'var(--rust)' : 'var(--ink-soft)', fontWeight: 600 }}>
                    <i className="ti ti-alert-circle" style={{ marginRight: 4 }} />
                    {st.overdueCount} nhân sự quá hạn
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--blue)', fontWeight: 600 }}>
                    Chi tiết &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* NUDGES LOG TABLE */}
          {complianceNudges.length > 0 && (
            <div className="card card-pad">
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
                Lịch Sử Cảnh Báo Tuân Thủ Đã Gửi Cho Giám Đốc Siêu Thị (SGM)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {complianceNudges.map((ndg) => (
                  <div key={ndg.id} style={{ padding: '8px 12px', background: 'var(--paper-sunken)', borderRadius: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{ndg.storeName}</strong>: {ndg.message}
                    </div>
                    <div style={{ color: 'var(--ink-soft)', fontSize: 11 }}>
                      Hạn chót: <strong>{ndg.deadline}</strong> &middot; Gửi ngày: {ndg.sentAt}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CURRICULUM MANAGEMENT & SUCCESSION PROPOSALS */}
      {activeTab === 'CURRICULUM' && <HrbpCurriculumTab />}

      {/* MODAL: SUBMIT L&D INTERVENTION REQUEST */}
      {interventionModal && (
        <Modal
          title="Đề Xuất L&D Tổ Chức Khóa Đào Tạo Can Thiệp Năng Lực"
          onClose={() => setInterventionModal(false)}
          size="md"
        >
          <form onSubmit={handleSubmitIntervention}>
            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Khối / Bộ Phận / Siêu Thị Cần Can Thiệp:</label>
              <input
                className="field-input"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div>
                <label className="field-label">Mã Phòng Ban (Dept Code):</label>
                <input
                  className="field-input"
                  value={formDeptCode}
                  onChange={(e) => setFormDeptCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label className="field-label">Mức Độ Khẩn:</label>
                <select className="field-select" value={formUrgency} onChange={(e) => setFormUrgency(e.target.value)}>
                  <option value="HIGH">🔴 Khẩn Cấp (Thiếu hụt nghiêm trọng)</option>
                  <option value="MEDIUM">🟡 Trung Bình (Theo dõi sát)</option>
                  <option value="LOW">🔵 Kế Hoạch Định Kỳ</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Kỹ Năng Thiếu Hụt (Skill Gap):</label>
              <input
                className="field-input"
                value={formSkill}
                onChange={(e) => setFormSkill(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Khóa Học Đề Xuất:</label>
              <select
                className="field-select"
                value={formCourseId}
                onChange={(e) => {
                  setFormCourseId(e.target.value);
                  const c = courses.find(item => item.id === e.target.value);
                  if (c) setFormCourseTitle(c.title);
                }}
              >
                {courses.slice(0, 20).map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Lý Do Đề Xuất &amp; Tác Động Kinh Doanh:</label>
              <textarea
                className="field-input"
                rows={3}
                value={formImpact}
                onChange={(e) => setFormImpact(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setInterventionModal(false)}>Hủy</Button>
              <Button variant="primary" icon="ti-send" type="submit">
                Xác Nhận Gửi Yêu Cầu Cho L&amp;D
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ASSIGN CURRICULUM TO SUCCESSION TALENT */}
      {assignCurriculumModal && (
        <Modal
          title={`Gán Giáo Trình Kế Nhiệm Cho Ứng Viên: ${assignCurriculumModal.name}`}
          onClose={() => setAssignCurriculumModal(null)}
          size="md"
        >
          <div>
            <div style={{ marginBottom: 14, background: 'var(--paper-sunken)', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{assignCurriculumModal.name} ({assignCurriculumModal.id})</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Vị trí quy hoạch: <strong>{assignCurriculumModal.targetRole}</strong> &middot; Siêu thị: {assignCurriculumModal.store}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Chọn Giáo Trình Kế Nhiệm:</label>
              <select
                className="field-select"
                value={selectedCurriculumId}
                onChange={(e) => setSelectedCurriculumId(e.target.value)}
              >
                {curricula.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title} ({c.courseIds?.length || 0} khóa học)</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Hạn Chót Hoàn Thành Toàn Bộ Giáo Trình:</label>
              <input
                type="date"
                className="field-input"
                value={curriculumDueDate}
                onChange={(e) => setCurriculumDueDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={() => setAssignCurriculumModal(null)}>Hủy</Button>
              <Button variant="primary" icon="ti-check" onClick={handleAssignCurriculumToCandidate}>
                Xác Nhận Gán Giáo Trình
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: 1-ON-1 SUCCESSION ALIGNMENT SESSION */}
      {alignmentModal && (
        <Modal
          title={`Biên Bản Họp 1-on-1 Alignment: ${alignmentModal.name}`}
          onClose={() => setAlignmentModal(null)}
          size="md"
        >
          <form onSubmit={handleSaveAlignment}>
            <div style={{ marginBottom: 14, background: 'var(--paper-sunken)', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{alignmentModal.name} &middot; {alignmentModal.currentRole}</div>
              <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
                Quy hoạch: {alignmentModal.targetRole} (Mentor: {alignmentModal.mentor})
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  <span>70% Dự Án &amp; Trải Nghiệm Thực Tế (OJT Project):</span>
                  <span style={{ color: 'var(--blue)' }}>{alnOjt}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={alnOjt}
                  onChange={(e) => setAlnOjt(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  <span>20% Kèm Cặp Cùng SGM Mentor &amp; Quản Lý:</span>
                  <span style={{ color: 'var(--sage)' }}>{alnMentor}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={alnMentor}
                  onChange={(e) => setAlnMentor(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  <span>10% Khóa Học &amp; Chứng Chỉ E-Learning / Lớp Học:</span>
                  <span style={{ color: 'var(--rail)' }}>{alnFormal}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={alnFormal}
                  onChange={(e) => setAlnFormal(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Mức Độ Sẵn Sàng Bổ Nhiệm (Readiness):</label>
              <select className="field-select" value={alnReadiness} onChange={(e) => setAlnReadiness(e.target.value)}>
                <option value="READY_NOW">🟢 Sẵn Sàng Bổ Nhiệm Ngay (Ready Now)</option>
                <option value="READY_IN_6_MONTHS">🟡 Sẵn Sàng Trong 6 Tháng (Ready in 6 Months)</option>
                <option value="READY_1_YEAR">🔵 Sẵn Sàng Trong 1 Năm (Ready in 1 Year)</option>
                <option value="DEVELOPING">⚪ Đang Đào Tạo Nền Tảng (Developing)</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Ghi Chú Cuộc Họp &amp; Kế Hoạch Hành Động Tiếp Theo:</label>
              <textarea
                className="field-input"
                rows={3}
                placeholder="Nhập nhận xét của Mentor và HRBP về điểm mạnh, điểm cần cải thiện..."
                value={alnNotes}
                onChange={(e) => setAlnNotes(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setAlignmentModal(null)}>Hủy</Button>
              <Button variant="primary" icon="ti-device-floppy" type="submit">
                Lưu Biên Bản Họp
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: NOMINATE TALENT INTO TALENT POOL */}
      {nominateModal && (
        <Modal
          title="Đề Cử Nhân Sự Vào Danh Sách Kế Nhiệm (Talent Pool)"
          onClose={() => setNominateModal(false)}
          size="md"
        >
          <form onSubmit={handleNominateCandidate}>
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Chọn Nhân Sự Đề Cử:</label>
              <select
                className="field-select"
                value={nominateUserId}
                onChange={(e) => setNominateUserId(e.target.value)}
                required
              >
                <option value="">— Chọn nhân viên —</option>
                {(users && users.length > 0 ? users : allUsers ? allUsers() : []).slice(0, 40).map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.employeeCode || u.userId} — {u.fullName} ({u.position || u.role} - Level {u.level})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Vị Trí Quy Hoạch Kế Nhiệm (Target Succession Role):</label>
              <input
                className="field-input"
                placeholder="VD: Trưởng Bộ Phận Bánh Mì, Phó Giám Đốc Siêu Thị..."
                value={nominateTargetRole}
                onChange={(e) => setNominateTargetRole(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Người Kèm Cặp (Mentor Chỉ Định):</label>
              <input
                className="field-input"
                value={nominateMentor}
                onChange={(e) => setNominateMentor(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setNominateModal(false)}>Hủy</Button>
              <Button variant="primary" icon="ti-user-check" type="submit">
                Xác Nhận Đưa Vào Talent Pool
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: DRILLDOWN STORE COMPLIANCE ASSOCIATES */}
      {storeDrilldown && (
        <Modal
          title={`Chi Tiết Tuân Thủ Đào Tạo: ${storeDrilldown.store}`}
          onClose={() => setStoreDrilldown(null)}
          size="lg"
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, background: 'var(--paper-sunken)', padding: 12, borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Tỷ lệ tuân thủ toàn siêu thị: {storeDrilldown.overall}%</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Tổng quân số: {storeDrilldown.totalStaff} &middot; Số nhân sự quá hạn chứng chỉ: <strong>{storeDrilldown.overdueCount} người</strong>
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon="ti-bell"
                onClick={() => {
                  setNudgeModal(storeDrilldown);
                  setNudgeMessage(`Yêu cầu Giám đốc Siêu thị ${storeDrilldown.store} khẩn trương chỉ đạo các quầy hoàn tất đào tạo PCCC và HACCP cho ${storeDrilldown.overdueCount} nhân viên quá hạn.`);
                }}
              >
                Gửi Cảnh Báo Cho SGM
              </Button>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Danh Sách Nhân Sự Có Chứng Chỉ Chưa Hoàn Thành / Quá Hạn:
            </div>

            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Mã NV &amp; Họ Tên</th>
                    <th>Quầy / Bộ Phận</th>
                    <th>Chứng Chỉ Chưa Đạt</th>
                    <th>Hạn Chót Ban Đầu</th>
                    <th>Tình Trạng</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const storeUsers = (users || []).filter((u) => u.storeId === storeDrilldown.id);
                    const list = storeUsers.length > 0 ? storeUsers.slice(0, 10) : [
                      { employeeCode: 'MMVN-1042', fullName: 'Minh Tran', departmentName: 'Quầy Bánh Tươi (PPF)', userId: 'USR-1042' },
                      { employeeCode: 'MMVN-2041', fullName: 'Quoc Bao', departmentName: 'Sơ Chế Thịt (PPF)', userId: 'USR-2041' },
                    ];
                    return list.map((emp, i) => {
                      const uEnr = enrollments[emp.userId] || {};
                      const incompleteCourse = (courses || []).find((c) => {
                        const enr = uEnr[c.id];
                        return enr && enr.status !== 'COMPLETED';
                      }) || { title: 'ATTP & HACCP Quầy Tươi' };
                      const enrInfo = uEnr[incompleteCourse.id] || { status: 'OVERDUE', dueDate: '2026-08-15' };
                      return (
                        <tr key={emp.userId || i}>
                          <td>
                            <strong>{emp.fullName}</strong>
                            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>{emp.employeeCode || emp.userId}</div>
                          </td>
                          <td style={{ fontSize: 12 }}>{emp.departmentName || emp.department || 'Vận Hành'}</td>
                          <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--rail)' }}>{incompleteCourse.title}</td>
                          <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{enrInfo.dueDate || '2026-08-30'}</td>
                          <td>
                            <Badge tone={enrInfo.status === 'OVERDUE' ? 'rust' : 'amber'}>
                              {enrInfo.status === 'OVERDUE' ? 'Quá Hạn' : 'Đang Học'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <Button variant="ghost" onClick={() => setStoreDrilldown(null)}>Đóng</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: SEND SGM COMPLIANCE WARNING */}
      {nudgeModal && (
        <Modal
          title={`Gửi Cảnh Báo Tuân Thủ Cho Giám Đốc Siêu Thị (SGM): ${nudgeModal.store}`}
          onClose={() => setNudgeModal(null)}
          size="md"
        >
          <form onSubmit={handleSendSgmNudge}>
            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Chi Nhánh Siêu Thị:</label>
              <input className="field-input" value={nudgeModal.store} disabled />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Hạn Chót Khắc Phục Tuân Thủ:</label>
              <input
                type="date"
                className="field-input"
                value={nudgeDeadline}
                onChange={(e) => setNudgeDeadline(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Nội Dung Chỉ Đạo &amp; Cảnh Báo:</label>
              <textarea
                className="field-input"
                rows={3}
                value={nudgeMessage}
                onChange={(e) => setNudgeMessage(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setNudgeModal(null)}>Hủy</Button>
              <Button variant="primary" icon="ti-send" type="submit">
                Xác Nhận Gửi Cảnh Báo Tới SGM
              </Button>
            </div>
          </form>
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
