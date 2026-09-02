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
  const [formUnit, setFormUnit] = useState('Bakery & Fresh Food Counter (MM An Phu)');
  const [formDeptCode, setFormDeptCode] = useState('PPF');
  const [formSkill, setFormSkill] = useState('HACCP & Cold-Chain Storage Protocols');
  const [formCourseId, setFormCourseId] = useState('CRS-FSH-001');
  const [formCourseTitle, setFormCourseTitle] = useState('Food Safety & Hygiene Standards (HACCP)');
  const [formUrgency, setFormUrgency] = useState('HIGH');
  const [formImpact, setFormImpact] = useState('Bakery counter shrinkage rose 3.2% in July. A hands-on class on standardizing the process is needed.');
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
    showToast('✅ L&D intervention ticket created successfully!');
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
      `HRBP proposes adding a competency development curriculum for succession candidate ${assignCurriculumModal.name}.`
    );
    if (result && result.ok && updateSuccessionTalent) {
      updateSuccessionTalent(assignCurriculumModal.id, {
        curriculumId: selectedCurriculumId,
        curriculumProposalId: result.request?.id,
      });
    }
    setAssignCurriculumModal(null);
    showToast(`📋 Sent the curriculum allocation request for candidate ${assignCurriculumModal.name} to the User Admin for approval!`);
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
      readinessLabel: alnReadiness === 'READY_NOW' ? 'Ready Now' : alnReadiness === 'READY_IN_6_MONTHS' ? 'Ready In 6 Months' : 'Ready In 1 Year',
      notes: alnNotes,
    });
    setAlignmentModal(null);
    showToast(`🤝 Recorded the 1-on-1 alignment meeting minutes for ${alignmentModal.name}!`);
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
      store: foundUser.storeName || 'MM Mega Market An Phu',
      storeId: foundUser.storeId || 'store-an-phu',
      targetRole: nominateTargetRole.trim(),
      readiness: 'DEVELOPING',
      readinessLabel: 'Developing',
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
    showToast(`🌟 Successfully nominated ${foundUser.fullName} to the Talent Pool!`);
  }

  // Handle Send SGM Nudge
  function handleSendSgmNudge(e) {
    e.preventDefault();
    if (!nudgeModal) return;
    sendComplianceNudge(nudgeModal.storeId || nudgeModal.code || nudgeModal.store, {
      storeName: nudgeModal.store,
      sgmName: 'Store General Manager (SGM)',
      deadline: nudgeDeadline,
      message: nudgeMessage || `Requires 100% completion of the mandatory food safety/HACCP and fire safety certifications before ${nudgeDeadline}.`,
    });
    setNudgeModal(null);
    showToast(`⚠️ Formal alert sent to the Store General Manager of ${nudgeModal.store}!`);
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
    showToast('📥 Compliance audit report exported successfully!');
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
            background: '#111827',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            fontSize: 14,
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
            Strategic HR Business Partner: <strong>{currentUser?.fullName || hrbpUser.fullName}</strong> &middot; {currentUser?.departmentName || hrbpUser.departmentName || 'HR Business Partnering'} &middot; Responsible for: Store Operations Division, Southern Region
          </p>
        </div>

        <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
          View The Personal Learning Interface
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
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Compliance Rate<br />Regional Training</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-chart-pie" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>
              {successionTalents.length} Candidate
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Succession Planning<br />(Talent Pool)</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-alert-triangle" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>{interventions.length}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Intervention Request<br />L&amp;D Monitoring</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-users" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>{headcount}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Employees in scope<br />Responsible HRBP</div>
          </div>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'SKILL_GAP', label: 'Competency Gap & L&D Recommendations (Skill Gap Matrix)', icon: 'ti-chart-dots', count: `${interventions.length} Ticket` },
          { id: 'SUCCESSION', label: 'Succession Planning & Talent Pool (70-20-10 Pipeline)', icon: 'ti-git-branch', count: `${successionTalents.length} successors` },
          { id: 'COMPLIANCE', label: 'Mandatory Compliance Map By Store (Regional Heatmap)', icon: 'ti-shield-check', count: `${overallComplianceRate}%` },
          { id: 'CURRICULUM', label: 'Curriculum & Talent Nomination', icon: 'ti-books', count: `${(curricula || []).filter(c => c.status === 'PUBLISHED').length} curricula` },
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
              fontSize: 11,
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
              Competency Gap Matrix Requiring Intervention By Division / Sub-Department:
            </div>

            <div className="grid grid-2" style={{ gap: 16 }}>
              {skillGapList.map((item, idx) => (
                <div key={idx} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{item.unit}</div>
                        <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, marginTop: 2 }}>{item.skill}</div>
                      </div>
                      <Badge tone={item.gap <= -15 ? 'rust' : 'amber'}>Gap: {item.gap}%</Badge>
                    </div>

                    <div style={{ margin: '12px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        <span>Actual competency: <strong>{item.current}%</strong></span>
                        <span>Required standard: <strong>{item.required}%</strong></span>
                      </div>
                      <ProgressBar value={item.current} tone={item.current >= 80 ? 'sage' : item.current >= 70 ? 'amber' : 'rust'} size="sm" />
                    </div>

                    <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 10px', lineHeight: 1.45 }}>
                      <strong>Business impact:</strong> {item.impact}
                    </p>
                    <div style={{ fontSize: 12, color: 'var(--rail)', background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Recommended course: <strong>{item.recommendedCourse}</strong></span>
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Trainer: {item.trainer}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      icon="ti-eye"
                      onClick={() => navigate(`/courses/${item.recommendedCourseId}`)}
                    >
                      View Course
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
                      Send The L&amp;D Request
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
                  Intervention Requests Sent To L&amp;D ({interventions.length} requests)
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
                  Tracks whether the L&amp;D department has picked up the reported skill gaps and how far the training scheduling has progressed.
                </p>
              </div>
            </div>

            {interventions.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                No intervention request has been sent. Click <strong>+ Ask L&amp;D To Run An Intervention Class</strong> above to create a new ticket.
              </div>
            ) : (
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Sub-Department &amp; Division</th>
                    <th>Skills &amp; Recommended Courses</th>
                    <th>Urgency</th>
                    <th>Submitted On</th>
                    <th>Handling Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interventions.map((itv) => (
                    <tr key={itv.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: 'var(--blue)' }}>{itv.id}</strong>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>By: {itv.requestedBy}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{itv.unit}</div>
                        <Badge tone="slate" size="sm">{itv.departmentCode}</Badge>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{itv.skill}</div>
                        <div style={{ fontSize: 12, color: 'var(--rail)' }}>
                          Locked: {itv.courseTitle}
                        </div>
                      </td>
                      <td>
                        <Badge tone={itv.urgency === 'HIGH' ? 'rust' : itv.urgency === 'MEDIUM' ? 'amber' : 'blue'}>
                          {itv.urgency === 'HIGH' ? '🔴 Urgent' : itv.urgency === 'MEDIUM' ? '🟡 Moderate' : '🔵 Normal'}
                        </Badge>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        {itv.requestedAt}
                      </td>
                      <td>
                        {itv.status === 'SCHEDULED' ? (
                          <Badge tone="sage" icon="ti-calendar">Scheduled: {itv.scheduledDate || '05/09/2026'}</Badge>
                        ) : itv.status === 'COMPLETED' ? (
                          <Badge tone="sage" icon="ti-check">Completed</Badge>
                        ) : itv.status === 'CANCELLED' ? (
                          <Badge tone="slate">Cancelled</Badge>
                        ) : (
                          <Badge tone="amber" icon="ti-clock">⏳ Awaiting L&D Pickup</Badge>
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
                              showToast(`Ticket ${itv.id} cancelled`);
                            }}
                          >
                            Cancel
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
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--sage-soft-text)' }}>
                    Store Operations Succession Talent Pool
                  </div>
                  <p style={{ fontSize: 13, color: '#14532D', margin: '4px 0 0' }}>
                    Tracks 70-20-10 competency development progress for candidates succeeding into Store General Manager (SGM) and category counter manager roles.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Badge tone="sage">{successionTalents.length} Employee Trong Talent Pool</Badge>
                  <Button variant="primary" icon="ti-user-plus" onClick={() => setNominateModal(true)}>
                    Nominate A New Candidate
                  </Button>
                </div>
              </div>
            </div>

            {/* STANDARDIZED FILTER TOOLBAR */}
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 12 }}>
                {/* Search input */}
                <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                  <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                  <input
                    type="text"
                    className="field-input"
                    style={{ paddingLeft: 36, paddingRight: successionSearch ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                    placeholder="Search by employee name, code, job title, store..."
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
                      fontSize: 13,
                      borderRadius: 8,
                      background: successionReadinessFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                      borderColor: successionReadinessFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                      color: successionReadinessFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                      fontWeight: successionReadinessFilter !== 'ALL' ? 700 : 500,
                    }}
                    value={successionReadinessFilter}
                    onChange={(e) => setSuccessionReadinessFilter(e.target.value)}
                  >
                    <option value="ALL">All readiness levels</option>
                    <option value="READY_NOW">🟢 Ready Now</option>
                    <option value="READY_IN_6_MONTHS">🟡 Ready in 6 Months</option>
                    <option value="READY_IN_1_YEAR">🔵 Ready in 1-2 Years</option>
                    <option value="DEVELOPING">⚪ Developing</option>
                  </select>
                </div>
              </div>

              {/* ACTIVE FILTER TAGS & RESET */}
              {(successionSearch || successionReadinessFilter !== 'ALL') && (
                <div style={{ paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Filtering by:</span>
                    {successionSearch && (
                      <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Search term: <strong>"{successionSearch}"</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSuccessionSearch('')} />
                      </span>
                    )}
                    {successionReadinessFilter !== 'ALL' && (
                      <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Readiness: <strong>{successionReadinessFilter}</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSuccessionReadinessFilter('ALL')} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => { setSuccessionSearch(''); setSuccessionReadinessFilter('ALL'); }}
                      style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
                    >
                      Clear all filters
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Found <strong>{filteredTalents.length}</strong> / {successionTalents.length} candidates
                  </div>
                </div>
              )}
            </div>

            <div className="card card-pad">
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>High-Potential Employees</th>
                  <th>Current Job Title &amp; Store</th>
                  <th>Target Succession Role</th>
                  <th style={{ width: 140 }}>Readiness Level</th>
                  <th style={{ minWidth: 160 }}>70-20-10 Progress</th>
                  <th style={{ textAlign: 'right' }}>HRBP Operations</th>
                </tr>
              </thead>
              <tbody>
                {filteredTalents.map((talent) => (
                  <tr key={talent.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{talent.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>{talent.id}</div>
                    </td>
                    <td>
                      <div>{talent.currentRole}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{talent.store}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--blue)' }}>{talent.targetRole}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Mentor: {talent.mentor}</div>
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
                              fontSize: 11,
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
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 32 }}>{talent.progress702010}%</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                        70% OJT: {talent.ojt70 || 70}% &middot; 20% Mentor: {talent.mentoring20 || 70}% &middot; 10% Locked: {talent.formal10 || 70}%
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-books"
                          title="Assign A Mandatory Curriculum To The Succession Candidate"
                          onClick={() => {
                            setAssignCurriculumModal(talent);
                            setSelectedCurriculumId(curricula[0]?.id || '');
                          }}
                        >
                          Assign Curriculum
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-notes"
                          title="Record 1-on-1 Alignment Meeting Minutes With The Mentor & Manager"
                          onClick={() => {
                            setAlignmentModal(talent);
                            setAlnOjt(talent.ojt70 || 80);
                            setAlnMentor(talent.mentoring20 || 75);
                            setAlnFormal(talent.formal10 || 70);
                            setAlnReadiness(talent.readiness || 'READY_IN_6_MONTHS');
                            setAlnNotes('');
                          }}
                        >
                          1-on-1 Meeting
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
                          Profile
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
              Recurring 1-on-1 Alignment Meeting Minutes With The SGM &amp; Mentor ({successionAlignments.length} records)
            </div>
            {successionAlignments.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '12px 0' }}>
                No meeting minutes yet. Click the button <strong>1-on-1 Meeting</strong> on each candidate in the table above to record the 70-20-10 review.
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
                        {aln.notes || 'Reviewed real OJT project progress and new-employee coaching skills.'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                        Mentor: <strong>{aln.mentorName}</strong> &middot; Recorded by: <strong>{aln.managerName}</strong> &middot; Date: {aln.updatedAt}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 140 }}>
                      <Badge tone={aln.readiness === 'READY_NOW' ? 'sage' : 'amber'} size="sm">
                        {aln.readinessLabel || aln.readiness}
                      </Badge>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                        OJT: {aln.ojt70Progress}% &middot; Mentor: {aln.mentoring20Progress}% &middot; Locked: {aln.course10Progress}%
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
                Mandatory Training Compliance Rate By Store Branch (Regional Compliance Heatmap)
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
                Monitors the % completion of legally mandated certifications (HACCP, fire safety, occupational safety, POS security).
                Click a store to drill down into the list of overdue employees.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                variant="outline"
                icon="ti-download"
                onClick={handleExportAuditReport}
              >
                Export The Compliance Report (JSON/Audit)
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
                  background: st.overall < 85 ? 'var(--rust-soft)' : 'var(--paper-raised)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onClick={() => setStoreDrilldown(st)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{st.store}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{st.region} &middot; {st.totalStaff} employees</div>
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
                    <span style={{ color: 'var(--ink-soft)' }}>Fire Safety &amp; Occupational Safety:</span>
                    <strong>{st.pccc}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>POS &amp; Information Security:</span>
                    <strong>{st.sec}%</strong>
                  </div>
                </div>

                <ProgressBar value={st.overall} tone={st.overall >= 95 ? 'sage' : st.overall >= 90 ? 'blue' : 'rust'} size="sm" />

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed var(--line)' }}>
                  <span style={{ fontSize: 12, color: st.overdueCount > 10 ? 'var(--rust)' : 'var(--ink-soft)', fontWeight: 600 }}>
                    <i className="ti ti-alert-circle" style={{ marginRight: 4 }} />
                    {st.overdueCount} employees overdue
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
                    Details &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* NUDGES LOG TABLE */}
          {complianceNudges.length > 0 && (
            <div className="card card-pad">
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
                History Of Compliance Alerts Sent To Store General Managers (SGM)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {complianceNudges.map((ndg) => (
                  <div key={ndg.id} style={{ padding: '8px 12px', background: 'var(--paper-sunken)', borderRadius: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{ndg.storeName}</strong>: {ndg.message}
                    </div>
                    <div style={{ color: 'var(--ink-soft)', fontSize: 11 }}>
                      Deadline: <strong>{ndg.deadline}</strong> &middot; Send days: {ndg.sentAt}
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
          title="Ask L&D To Run A Competency Intervention Course"
          onClose={() => setInterventionModal(false)}
          size="md"
        >
          <form onSubmit={handleSubmitIntervention}>
            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Division / Sub-Department / Store Needing Intervention:</label>
              <input
                className="field-input"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div>
                <label className="field-label">Department Code:</label>
                <input
                  className="field-input"
                  value={formDeptCode}
                  onChange={(e) => setFormDeptCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label className="field-label">Urgency:</label>
                <select className="field-select" value={formUrgency} onChange={(e) => setFormUrgency(e.target.value)}>
                  <option value="HIGH">🔴 Urgent (critical shortfall)</option>
                  <option value="MEDIUM">🟡 Moderate (watch closely)</option>
                  <option value="LOW">🔵 Scheduled Plan</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Skill Gap:</label>
              <input
                className="field-input"
                value={formSkill}
                onChange={(e) => setFormSkill(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Recommended Course:</label>
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
              <label className="field-label">Reason &amp; Business Impact:</label>
              <textarea
                className="field-input"
                rows={3}
                value={formImpact}
                onChange={(e) => setFormImpact(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setInterventionModal(false)}>Cancel</Button>
              <Button variant="primary" icon="ti-send" type="submit">
                Confirm And Send The Request To L&amp;D
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ASSIGN CURRICULUM TO SUCCESSION TALENT */}
      {assignCurriculumModal && (
        <Modal
          title={`Assign A Succession Curriculum To Candidate: ${assignCurriculumModal.name}`}
          onClose={() => setAssignCurriculumModal(null)}
          size="md"
        >
          <div>
            <div style={{ marginBottom: 14, background: 'var(--paper-sunken)', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{assignCurriculumModal.name} ({assignCurriculumModal.id})</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Target role: <strong>{assignCurriculumModal.targetRole}</strong> &middot; Store: {assignCurriculumModal.store}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Choose The Succession Curriculum:</label>
              <select
                className="field-select"
                value={selectedCurriculumId}
                onChange={(e) => setSelectedCurriculumId(e.target.value)}
              >
                {curricula.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title} ({c.courseIds?.length || 0} courses)</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Deadline To Complete The Whole Curriculum:</label>
              <input
                type="date"
                className="field-input"
                value={curriculumDueDate}
                onChange={(e) => setCurriculumDueDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={() => setAssignCurriculumModal(null)}>Cancel</Button>
              <Button variant="primary" icon="ti-check" onClick={handleAssignCurriculumToCandidate}>
                Confirm The Curriculum Assignment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: 1-ON-1 SUCCESSION ALIGNMENT SESSION */}
      {alignmentModal && (
        <Modal
          title={`1-on-1 Alignment Meeting Minutes: ${alignmentModal.name}`}
          onClose={() => setAlignmentModal(null)}
          size="md"
        >
          <form onSubmit={handleSaveAlignment}>
            <div style={{ marginBottom: 14, background: 'var(--paper-sunken)', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{alignmentModal.name} &middot; {alignmentModal.currentRole}</div>
              <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
                Target role: {alignmentModal.targetRole} (Mentor: {alignmentModal.mentor})
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  <span>70% Real Projects &amp; Experience (OJT Project):</span>
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
                  <span>20% Coaching With The SGM Mentor &amp; Manager:</span>
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
                  <span>10% E-Learning Courses &amp; Certifications / Classes:</span>
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
              <label className="field-label">Appointment Readiness:</label>
              <select className="field-select" value={alnReadiness} onChange={(e) => setAlnReadiness(e.target.value)}>
                <option value="READY_NOW">🟢 Ready Now</option>
                <option value="READY_IN_6_MONTHS">🟡 Ready in 6 Months</option>
                <option value="READY_1_YEAR">🔵 Ready in 1 Year</option>
                <option value="DEVELOPING">⚪ Developing Foundations</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Meeting Notes &amp; Next Action Plan:</label>
              <textarea
                className="field-input"
                rows={3}
                placeholder="Enter the mentor's and HRBP's comments on strengths and areas to improve..."
                value={alnNotes}
                onChange={(e) => setAlnNotes(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setAlignmentModal(null)}>Cancel</Button>
              <Button variant="primary" icon="ti-device-floppy" type="submit">
                Save The Meeting Minutes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: NOMINATE TALENT INTO TALENT POOL */}
      {nominateModal && (
        <Modal
          title="Nominate An Employee To The Talent Pool"
          onClose={() => setNominateModal(false)}
          size="md"
        >
          <form onSubmit={handleNominateCandidate}>
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Choose The Nominee:</label>
              <select
                className="field-select"
                value={nominateUserId}
                onChange={(e) => setNominateUserId(e.target.value)}
                required
              >
                <option value="">— Choose an employee —</option>
                {(users && users.length > 0 ? users : allUsers ? allUsers() : []).slice(0, 40).map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.employeeCode || u.userId} — {u.fullName} ({u.position || u.role} - Level {u.level})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Target Succession Role:</label>
              <input
                className="field-input"
                placeholder="E.g. Bakery Department Head, Deputy Store General Manager..."
                value={nominateTargetRole}
                onChange={(e) => setNominateTargetRole(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Assigned Mentor:</label>
              <input
                className="field-input"
                value={nominateMentor}
                onChange={(e) => setNominateMentor(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setNominateModal(false)}>Cancel</Button>
              <Button variant="primary" icon="ti-user-check" type="submit">
                Confirm Addition To The Talent Pool
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: DRILLDOWN STORE COMPLIANCE ASSOCIATES */}
      {storeDrilldown && (
        <Modal
          title={`Training Compliance Detail: ${storeDrilldown.store}`}
          onClose={() => setStoreDrilldown(null)}
          size="lg"
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, background: 'var(--paper-sunken)', padding: 12, borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Store-wide compliance rate: {storeDrilldown.overall}%</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Total headcount: {storeDrilldown.totalStaff} &middot; Employees with overdue certifications: <strong>{storeDrilldown.overdueCount}</strong>
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon="ti-bell"
                onClick={() => {
                  setNudgeModal(storeDrilldown);
                  setNudgeMessage(`Requires the Store General Manager of ${storeDrilldown.store} to urgently direct the counters to complete fire safety and HACCP training for ${storeDrilldown.overdueCount} overdue employees.`);
                }}
              >
                Send An Alert To The SGM
              </Button>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Employees With Incomplete / Overdue Certifications:
            </div>

            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Employee Code &amp; Full Name</th>
                    <th>Counter / Sub-Department</th>
                    <th>Certifications Not Passed</th>
                    <th>Original Deadline</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const storeUsers = (users || []).filter((u) => u.storeId === storeDrilldown.id);
                    const list = storeUsers.length > 0 ? storeUsers.slice(0, 10) : [
                      { employeeCode: 'MMVN-1042', fullName: 'Minh Tran', departmentName: 'Fresh Bakery Counter (PPF)', userId: 'USR-1042' },
                      { employeeCode: 'MMVN-2041', fullName: 'Quoc Bao', departmentName: 'Meat Preparation (PPF)', userId: 'USR-2041' },
                    ];
                    return list.map((emp, i) => {
                      const uEnr = enrollments[emp.userId] || {};
                      const incompleteCourse = (courses || []).find((c) => {
                        const enr = uEnr[c.id];
                        return enr && enr.status !== 'COMPLETED';
                      }) || { title: 'Fresh Counter Food Safety & HACCP' };
                      const enrInfo = uEnr[incompleteCourse.id] || { status: 'OVERDUE', dueDate: '2026-08-15' };
                      return (
                        <tr key={emp.userId || i}>
                          <td>
                            <strong>{emp.fullName}</strong>
                            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>{emp.employeeCode || emp.userId}</div>
                          </td>
                          <td style={{ fontSize: 12 }}>{emp.departmentName || emp.department || 'Operations'}</td>
                          <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--rail)' }}>{incompleteCourse.title}</td>
                          <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{enrInfo.dueDate || '2026-08-30'}</td>
                          <td>
                            <Badge tone={enrInfo.status === 'OVERDUE' ? 'rust' : 'amber'}>
                              {enrInfo.status === 'OVERDUE' ? 'Overdue' : 'In Progress'}
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
              <Button variant="ghost" onClick={() => setStoreDrilldown(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: SEND SGM COMPLIANCE WARNING */}
      {nudgeModal && (
        <Modal
          title={`Send A Compliance Alert To The Store General Manager (SGM): ${nudgeModal.store}`}
          onClose={() => setNudgeModal(null)}
          size="md"
        >
          <form onSubmit={handleSendSgmNudge}>
            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Store Branch:</label>
              <input className="field-input" value={nudgeModal.store} disabled />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Compliance Remediation Deadline:</label>
              <input
                type="date"
                className="field-input"
                value={nudgeDeadline}
                onChange={(e) => setNudgeDeadline(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Direction &amp; Alert Content:</label>
              <textarea
                className="field-input"
                rows={3}
                value={nudgeMessage}
                onChange={(e) => setNudgeMessage(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" type="button" onClick={() => setNudgeModal(null)}>Cancel</Button>
              <Button variant="primary" icon="ti-send" type="submit">
                Confirm And Send The Alert To The SGM
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
