import React, { useState } from 'react';
import {
  adminConfig,
  hrisSyncLogs,
  securityComplianceConfig,
  divisions,
  departments,
  jobLevels,
  courses,
} from '../../data/mockData';
import { ROLE_DEFINITIONS, managedScopeLabel } from '../../data/roles';
import { ASSIGNMENT_TYPES, targetOptionsFor, assignmentTypeLabel } from '../../data/assignmentTargets';
import OrgHierarchyBrowser from '../../features/common/OrgHierarchyBrowser';
import { Button, Badge, Tabs } from '../../features/common/ui';
import { useCourseStore } from '../../store/CourseStore';

export default function AdminConfig() {
  const [activeTab, setActiveTab] = useState('auto-rules');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 1. Auto-Assignment Rules State
  const [autoRules, setAutoRules] = useState([
    {
      id: 'rule-1',
      name: 'Fresh Food Onboarding Mandatory Pack',
      triggerType: 'DEPARTMENT',
      triggerTarget: 'dept-ppf',
      triggerLabel: 'Department (Head Office): PPF - Processed Fresh Food',
      assignedCourseId: 'course-fsh-1',
      assignedCourseTitle: 'Food Safety & Hygiene Standards (HACCP)',
      completionDays: 14,
      priority: 'HIGH',
      isActive: true,
    },
    {
      id: 'rule-2',
      name: 'Supply Chain Warehouse Safety Pass',
      triggerType: 'DIVISION',
      triggerTarget: 'div-scm',
      triggerLabel: 'Division (Head Office): SCM - Supply Chain Management',
      assignedCourseId: 'course-scm-1',
      assignedCourseTitle: 'Forklift & Reach Truck Safe Operation Certification',
      completionDays: 10,
      priority: 'HIGH',
      isActive: true,
    },
    {
      id: 'rule-3',
      name: 'Manager Leadership Accreditation',
      triggerType: 'LEVEL',
      triggerTarget: '4',
      triggerLabel: 'Job Level: Level 4 - Line Manager / Store Department Manager',
      assignedCourseId: 'course-ldr-1',
      assignedCourseTitle: 'Leadership Essentials for Managers: Coaching & Feedback',
      completionDays: 30,
      priority: 'MEDIUM',
      isActive: true,
    },
    {
      id: 'rule-4',
      name: 'Enterprise Cybersecurity Defense',
      triggerType: 'ALL_ASSOCIATES',
      triggerTarget: 'MMVN',
      triggerLabel: 'All 100 Associates (Company-wide)',
      assignedCourseId: 'course-isa-1',
      assignedCourseTitle: 'Information Security Awareness & Phishing Defense',
      completionDays: 21,
      priority: 'HIGH',
      isActive: true,
    },
  ]);

  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState('DEPARTMENT');
  const [newRuleTarget, setNewRuleTarget] = useState('dept-ppf');
  const [newRuleCourse, setNewRuleCourse] = useState(courses[0]?.id || 'course-fsh-1');
  const [newRuleDays, setNewRuleDays] = useState(14);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);

  // Inactivity & Thresholds
  const [inactivityDays, setInactivityDays] = useState(adminConfig.inactiveThresholdDays || 3);
  const [maxReminders, setMaxReminders] = useState(adminConfig.maxReminderCount || 3);
  const [managerAlertDays, setManagerAlertDays] = useState(adminConfig.managerAlertAfterDays || 7);
  const [videoWatchPercent, setVideoWatchPercent] = useState(adminConfig.defaultVideoWatchPercent || 90);
  const [pdfReadPercent, setPdfReadPercent] = useState(adminConfig.defaultDocumentReadPercent || 90);
  const [passQuizScore, setPassQuizScore] = useState(adminConfig.defaultPassingScorePercent || 80);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [certValidityDays, setCertValidityDays] = useState(365);
  const [recertWindowDays, setRecertWindowDays] = useState(30);

  // 2. Security & Watermark State
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState(25);
  const [watermarkPosition, setWatermarkPosition] = useState('DIAGONAL_REPEAT');
  const [watermarkIncludeIp, setWatermarkIncludeIp] = useState(true);
  const [watermarkIncludeTime, setWatermarkIncludeTime] = useState(true);
  const [antiCheatSeek, setAntiCheatSeek] = useState(true);
  const [antiCheatMultiTab, setAntiCheatMultiTab] = useState(true);
  const [antiCheatCopyPaste, setAntiCheatCopyPaste] = useState(true);
  const [antiCheatRandomize, setAntiCheatRandomize] = useState(true);
  const [antiCheatTabLimit, setAntiCheatTabLimit] = useState(3);

  // 3. SAP HRIS State
  const [syncLogs, setSyncLogs] = useState(hrisSyncLogs);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sapEndpoint, setSapEndpoint] = useState('https://api.successfactors.eu/v2/UserSync');
  const [sapCompanyId, setSapCompanyId] = useState('MMVN_PROD_SF');
  const [sapClientId, setSapClientId] = useState('lms_integration_client_prod');
  const [sapSchedule, setSapSchedule] = useState('DAILY_0300');
  const [sapAutoDeactivate, setSapAutoDeactivate] = useState(true);

  // 4. Notification Gateways & Templates
  const [activeTemplateTab, setActiveTemplateTab] = useState('OVERDUE_ALERT');
  const [templates, setTemplates] = useState({
    OVERDUE_ALERT: {
      title: 'Overdue Compliance Escalation',
      channel: 'Zalo ZNS + Teams',
      subject: '[ACTION REQUIRED] Mandatory Training Overdue: {COURSE_NAME}',
      body: 'Dear {EMPLOYEE_NAME}, your mandatory course "{COURSE_NAME}" assigned under {DIVISION_CODE} is currently {DAYS_OVERDUE} days overdue. Please log in immediately to complete your assessment to maintain compliance certification. Line Manager: {MANAGER_NAME}.',
    },
    COURSE_ASSIGNED: {
      title: 'New Course Assignment Dispatch',
      channel: 'Email + Teams Webhook',
      subject: '[MMVN LMS] New Training Assigned: {COURSE_NAME}',
      body: 'Hello {EMPLOYEE_NAME}, you have been enrolled in "{COURSE_NAME}" with a completion deadline of {DUE_DATE}. This curriculum is required for your Level {JOB_LEVEL} qualification.',
    },
    CERTIFICATE_ISSUED: {
      title: 'Digital Certificate Award Notice',
      channel: 'Zalo ZNS + Email',
      subject: 'Congratulations! Certificate of Completion for {COURSE_NAME}',
      body: 'Congratulations {EMPLOYEE_NAME}! You have successfully passed "{COURSE_NAME}" with a score of {SCORE}%. Your digital certificate (ID: {CERT_ID}) is now active and verifiable via QR code.',
    },
    MANAGER_DIGEST: {
      title: 'Weekly Manager Team Compliance Digest',
      channel: 'Microsoft Teams Adaptive Card',
      subject: 'Weekly Team Compliance Summary for {MANAGER_NAME}',
      body: 'Manager Report: Your team has {PENDING_COUNT} pending courses and {OVERDUE_COUNT} overdue alerts this week. Please review your direct reports at /manager/team.',
    },
  });

  // 5. Ma trận RBAC — trục là ROLE (6 vai trò), không phải cấp bậc định biên.
  // Cấp bậc (Level 7 -> 1) quyết định học viên được học khóa nào; role quyết định
  // họ được thao tác gì trên hệ thống. Hai trục này độc lập với nhau.
  const [rbacMatrix, setRbacMatrix] = useState({
    learner: { viewReports: false, createCourses: false, approveCourses: false, issueCertificates: false, manageSettings: false, exportAudit: false },
    manager: { viewReports: true, createCourses: false, approveCourses: true, issueCertificates: false, manageSettings: false, exportAudit: false },
    trainer: { viewReports: true, createCourses: true, approveCourses: true, issueCertificates: true, manageSettings: false, exportAudit: false },
    hrbp: { viewReports: true, createCourses: false, approveCourses: true, issueCertificates: true, manageSettings: false, exportAudit: true },
    useradmin: { viewReports: true, createCourses: true, approveCourses: true, issueCertificates: true, manageSettings: true, exportAudit: true },
    sysadmin: { viewReports: true, createCourses: true, approveCourses: true, issueCertificates: true, manageSettings: true, exportAudit: true },
  });

  // 6. Branding & Certificate
  const [portalName, setPortalName] = useState('MM Mega Market Vietnam - MM MegaLearn');
  const [certSignerName, setCertSignerName] = useState('Sarah Nguyen');
  const [certSignerTitle, setCertSignerTitle] = useState('Head of Division - HR Director / BOM');
  const [certIssuerOrg, setCertIssuerOrg] = useState('MM Mega Market Vietnam - Learning & Organizational Development');
  const [certQrPrefix, setCertQrPrefix] = useState('https://megalearn.mmvietnam.com/verify/');

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }

  function handleSaveAll() {
    setSavedSuccess(true);
    showToast('All Enterprise Configuration & Governance Rules successfully persisted!');
    setTimeout(() => setSavedSuccess(false), 2500);
  }

  function handleTriggerSync() {
    setIsSyncing(true);
    setTimeout(() => {
      const newLog = {
        id: `sync-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        source: 'SAP SuccessFactors HRIS API (Manual Trigger)',
        totalRecords: 100,
        insertedCount: 2,
        updatedCount: 5,
        deactivatedCount: 0,
        status: 'SUCCESS',
        durationSeconds: '8.4s',
        fieldsMapped: ['EmployeeID', 'FullName', 'Email', 'Position', 'DeptCode', 'DivisionCode', 'ManagerID', 'StoreLocation', 'JobLevel', 'Status'],
      };
      setSyncLogs([newLog, ...syncLogs]);
      setIsSyncing(false);
      showToast('SAP SuccessFactors synchronization completed! 100 employee profiles validated.');
    }, 1400);
  }

  function handleAddRule(e) {
    e.preventDefault();
    const courseObj = courses.find((c) => c.id === newRuleCourse) || courses[0];
    const targetLabel = newRuleTrigger === 'ALL_ASSOCIATES'
      ? 'All 100 Associates (Company-wide)'
      : targetOptionsFor(newRuleTrigger).find((o) => o.id === newRuleTarget)?.label || newRuleTarget;
    const newRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName || `Auto-Enrollment Rule for ${targetLabel}`,
      triggerType: newRuleTrigger,
      triggerTarget: newRuleTarget,
      triggerLabel: `${assignmentTypeLabel(newRuleTrigger) || 'All Associates'}: ${targetLabel}`,
      assignedCourseId: courseObj.id,
      assignedCourseTitle: courseObj.title,
      completionDays: Number(newRuleDays) || 14,
      priority: 'HIGH',
      isActive: true,
    };
    setAutoRules([newRule, ...autoRules]);
    setShowAddRuleModal(false);
    setNewRuleName('');
    showToast(`Rule "${newRule.name}" created and activated!`);
  }

  function handleDeleteRule(ruleId) {
    setAutoRules(autoRules.filter((r) => r.id !== ruleId));
    showToast('Auto-enrollment rule removed.');
  }

  function handleToggleRule(ruleId) {
    setAutoRules(
      autoRules.map((r) => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r))
    );
  }

  function handleToggleRbac(level, key) {
    setRbacMatrix({
      ...rbacMatrix,
      [level]: {
        ...rbacMatrix[level],
        [key]: !rbacMatrix[level][key],
      },
    });
  }

  function handleSendTestPing(gatewayName) {
    showToast(`[TEST DISPATCH SUCCESS] Verification ping sent via ${gatewayName} gateway!`);
  }

  return (
    <>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'var(--ink)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xl)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 9999,
            fontSize: 13,
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <i className="ti ti-check-circle" style={{ color: 'var(--sage)', fontSize: 18 }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>System Configuration &amp; MMVN Org Governance</h1>
            <Badge tone="ai" icon="ti-crown">HRD Level 1 Supreme Authority</Badge>
          </div>
          <p>
            Central command center to configure auto-assignment automation, SAP SuccessFactors HRIS sync, anti-cheat lockdown, dynamic forensic watermarks, notification templates, and RBAC matrix.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" icon="ti-refresh" onClick={() => showToast('Configuration reloaded from server.')}>
            Reload
          </Button>
          <Button variant="primary" icon={savedSuccess ? 'ti-check' : 'ti-device-floppy'} onClick={handleSaveAll}>
            {savedSuccess ? 'Saved to SAP & DB!' : 'Save All Settings'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'auto-rules', label: 'Auto-Assignment & Learning SLAs', icon: 'ti-wand', count: autoRules.length },
          { id: 'security', label: 'Security, Watermark & Anti-Cheat', icon: 'ti-shield-lock' },
          { id: 'hris', label: 'SAP SuccessFactors HRIS', icon: 'ti-cloud-computing', count: syncLogs.length },
          { id: 'org-structure', label: 'Org Structure (Dual Hierarchy)', icon: 'ti-sitemap' },
          { id: 'gateways', label: 'Notifications & Message Templates', icon: 'ti-bell' },
          { id: 'rbac', label: 'MMVN Matrix & RBAC Permissions', icon: 'ti-users', count: 16 },
          { id: 'branding', label: 'Certificates & System Backup', icon: 'ti-certificate' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* ========================================================================= */}
      {/* TAB 1: AUTO-ASSIGNMENT & LEARNING SLAS */}
      {/* ========================================================================= */}
      {activeTab === 'auto-rules' && (
        <>
          {/* Rules Header Banner */}
          <div className="card card-pad" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)', borderColor: '#86EFAC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#065F46', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-wand" style={{ fontSize: 20 }} />
                  Automated Onboarding &amp; Compliance Dispatch Engine
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                  Automatically triggers mandatory course enrollments whenever new employees are synced from SAP or change division/level.
                </div>
              </div>
              <Button variant="primary" icon="ti-plus" onClick={() => setShowAddRuleModal(true)}>
                Add Auto-Assignment Rule
              </Button>
            </div>
          </div>

          {/* Active Auto Rules Table */}
          <div className="section-label">Active Automated Assignment Policies ({autoRules.length})</div>
          <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Status</th>
                  <th>Rule Name</th>
                  <th style={{ width: 180 }}>Trigger Condition</th>
                  <th>Target Mandatory Curriculum</th>
                  <th style={{ width: 110 }}>SLA Window</th>
                  <th style={{ width: 100 }}>Priority</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {autoRules.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={r.isActive}
                        onChange={() => handleToggleRule(r.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                        title="Toggle rule on/off"
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{r.id}</div>
                    </td>
                    <td>
                      <span style={{ background: 'var(--paper-sunken)', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                        {r.triggerLabel}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--rail-soft-text)' }}>{r.assignedCourseTitle}</div>
                    </td>
                    <td>
                      <Badge tone={r.completionDays <= 14 ? 'amber' : 'slate'}>
                        {r.completionDays} Days SLA
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={r.priority === 'HIGH' ? 'rust' : 'blue'}>{r.priority}</Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button size="sm" variant="danger" icon="ti-trash" onClick={() => handleDeleteRule(r.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Global Cadence & Completion Thresholds Grid */}
          <div className="section-label">Global Compliance Inactivity &amp; Escalation Thresholds</div>
          <div className="grid grid-3" style={{ marginBottom: 20 }}>
            <div className="card card-pad">
              <label className="field-label">Inactivity Threshold</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  className="field-input"
                  value={inactivityDays}
                  onChange={(e) => setInactivityDays(e.target.value)}
                  style={{ width: 90 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>days without login</span>
              </div>
              <div className="field-hint">Shifts learner status to Inactive and initiates auto-reminders.</div>
            </div>

            <div className="card card-pad">
              <label className="field-label">Escalate Alert to Line Manager</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  className="field-input"
                  value={managerAlertDays}
                  onChange={(e) => setManagerAlertDays(e.target.value)}
                  style={{ width: 90 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>inactive days</span>
              </div>
              <div className="field-hint">Sends push notification &amp; Teams alert to direct supervisor.</div>
            </div>

            <div className="card card-pad">
              <label className="field-label">Maximum Automated Reminder Dispatches</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  className="field-input"
                  value={maxReminders}
                  onChange={(e) => setMaxReminders(e.target.value)}
                  style={{ width: 90 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>reminders max</span>
              </div>
              <div className="field-hint">Halts automated robot notifications once limit is reached.</div>
            </div>
          </div>

          {/* Completion Pass Rules */}
          <div className="section-label">Default Curriculum Completion Standards</div>
          <div className="grid grid-4" style={{ marginBottom: 28 }}>
            <div className="card card-pad">
              <label className="field-label">Mandatory Video Watch %</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  className="field-input"
                  value={videoWatchPercent}
                  onChange={(e) => setVideoWatchPercent(e.target.value)}
                  style={{ width: 80 }}
                />
                <span style={{ fontSize: 13, fontWeight: 700 }}>%</span>
              </div>
              <div className="field-hint">Anti-skipping lock enforced.</div>
            </div>

            <div className="card card-pad">
              <label className="field-label">Document/PDF Read %</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  className="field-input"
                  value={pdfReadPercent}
                  onChange={(e) => setPdfReadPercent(e.target.value)}
                  style={{ width: 80 }}
                />
                <span style={{ fontSize: 13, fontWeight: 700 }}>%</span>
              </div>
              <div className="field-hint">Scroll tracking on SOP guides.</div>
            </div>

            <div className="card card-pad">
              <label className="field-label">Passing Quiz Score %</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  className="field-input"
                  value={passQuizScore}
                  onChange={(e) => setPassQuizScore(e.target.value)}
                  style={{ width: 80 }}
                />
                <span style={{ fontSize: 13, fontWeight: 700 }}>%</span>
              </div>
              <div className="field-hint">Standard pass threshold.</div>
            </div>

            <div className="card card-pad">
              <label className="field-label">Max Exam Attempts</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  className="field-input"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  style={{ width: 80 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>attempts</span>
              </div>
              <div className="field-hint">Fails trigger manager review.</div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SECURITY, WATERMARK & ANTI-CHEAT */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <>
          <div className="grid grid-2" style={{ gap: 24, marginBottom: 24 }}>
            {/* Left: Watermark Controls */}
            <div className="card card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-eye-off" style={{ color: 'var(--rail)' }} />
                  Dynamic Forensic Watermarking
                </div>
                <input
                  type="checkbox"
                  checked={watermarkEnabled}
                  onChange={(e) => setWatermarkEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 16 }}>
                Embeds invisible or visible encrypted identifiers into all course videos, PDF manuals, and assessment screens to trace leaks.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Watermark Opacity</span>
                    <strong>{watermarkOpacity}%</strong>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(e.target.value)}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <label className="field-label">Layout Positioning Pattern</label>
                  <select
                    className="field-select"
                    value={watermarkPosition}
                    onChange={(e) => setWatermarkPosition(e.target.value)}
                  >
                    <option value="DIAGONAL_REPEAT">Diagonal 45° Repeating Grid (Recommended)</option>
                    <option value="FLOATING_RANDOM">Floating Random Coordinates (Anti-Cam)</option>
                    <option value="CENTER_FIXED">Fixed Center Overlay</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={watermarkIncludeIp}
                      onChange={(e) => setWatermarkIncludeIp(e.target.checked)}
                    />
                    Include Client IP Address
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={watermarkIncludeTime}
                      onChange={(e) => setWatermarkIncludeTime(e.target.checked)}
                    />
                    Include Real-time Timestamp
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Live Watermark Visual Simulator */}
            <div className="card card-pad" style={{ background: '#0F172A', color: '#F8FAFC', position: 'relative', overflow: 'hidden', minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase' }}>
                  Live Watermark Canvas Simulation
                </span>
                <span style={{ fontSize: 10.5, color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                  {watermarkEnabled ? 'WATERMARK ACTIVE' : 'WATERMARK DISABLED'}
                </span>
              </div>

              {/* Sample Document Content */}
              <div style={{ padding: '20px 10px', position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', marginBottom: 6 }}>
                  MMVN CONFIDENTIAL SOP: FRESH FOOD COLD CHAIN SPECIFICATION
                </div>
                <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                  Standard Operating Procedure 402-A: All dairy and poultry products must maintain constant ambient temperature between 2°C and 4°C during transfer. Unauthorized reproduction or photography of this document is strictly prohibited under MMVN Corporate Security Policy.
                </p>
              </div>

              {/* Simulated Watermark Overlay */}
              {watermarkEnabled && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 40,
                    opacity: watermarkOpacity / 100,
                    transform: watermarkPosition === 'DIAGONAL_REPEAT' ? 'rotate(-25deg) scale(1.1)' : 'none',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.3)', padding: '4px 8px', borderRadius: 4 }}>
                      MMVN-1042 · Minh Tran
                      {watermarkIncludeIp && <div>192.168.1.45</div>}
                      {watermarkIncludeTime && <div>2026-08-22 00:54:12</div>}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 11, color: '#64748B', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span>Simulated Resolution: 1080p FHD</span>
                <span>Forensic Hash: SHA-256 Verified</span>
              </div>
            </div>
          </div>

          {/* Anti-Cheat Lockdown Policies */}
          <div className="section-label">Assessment Anti-Cheating &amp; Lockdown Controls</div>
          <div className="card card-pad" style={{ marginBottom: 28 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={antiCheatSeek}
                  onChange={(e) => setAntiCheatSeek(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Enforce Video Watch (Disable Fast-Forward)</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Prevents dragging the seeker bar beyond verified playback buffer.</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={antiCheatMultiTab}
                  onChange={(e) => setAntiCheatMultiTab(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Multi-Tab &amp; Window Blur Detection</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Suspends exam if tab switched &gt; <strong>{antiCheatTabLimit} times</strong>.
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={antiCheatCopyPaste}
                  onChange={(e) => setAntiCheatCopyPaste(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Block Copy/Paste &amp; Right-Click Inspect</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Disables clipboard copy and developer tools shortcuts during tests.</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={antiCheatRandomize}
                  onChange={(e) => setAntiCheatRandomize(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Randomize Question &amp; Answer Sequence</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Shuffles question bank selections and multiple choice options dynamically.</div>
                </div>
              </label>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SAP SUCCESSFACTORS HRIS */}
      {/* ========================================================================= */}
      {activeTab === 'hris' && (
        <>
          {/* SAP Connection Status */}
          <div className="card card-pad" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', borderColor: '#93C5FD' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22 }}>
                  <i className="ti ti-cloud-computing" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#1E40AF' }}>
                    SAP SuccessFactors HRIS Connector &middot; Connected (OAuth 2.0 Token Valid)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                    Nightly Batch Sync: <strong>Daily at 03:00 AM UTC+7</strong> &middot; Last Success: <strong>Today 03:00:14 AM</strong> (100 Profiles active)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="outline" icon="ti-plug" onClick={() => showToast('SAP API Ping returned HTTP 200 OK (Latency: 42ms)')}>
                  Test Connection
                </Button>
                <Button variant="primary" icon={isSyncing ? 'ti-loader ti-spin' : 'ti-refresh'} disabled={isSyncing} onClick={handleTriggerSync}>
                  {isSyncing ? 'Synchronizing SAP...' : 'Trigger Live Sync Now'}
                </Button>
              </div>
            </div>
          </div>

          {/* SAP Configuration Inputs */}
          <div className="section-label">SAP SuccessFactors API Credentials &amp; Schedule</div>
          <div className="grid grid-2" style={{ marginBottom: 20 }}>
            <div className="card card-pad">
              <label className="field-label">SAP OData v2 Endpoint URL</label>
              <input
                type="text"
                className="field-input"
                value={sapEndpoint}
                onChange={(e) => setSapEndpoint(e.target.value)}
                style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label className="field-label">Company ID</label>
                  <input
                    type="text"
                    className="field-input"
                    value={sapCompanyId}
                    onChange={(e) => setSapCompanyId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Client ID / App Key</label>
                  <input
                    type="text"
                    className="field-input"
                    value={sapClientId}
                    onChange={(e) => setSapClientId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <label className="field-label">Automated Sync Cadence</label>
              <select
                className="field-select"
                value={sapSchedule}
                onChange={(e) => setSapSchedule(e.target.value)}
                style={{ marginBottom: 14 }}
              >
                <option value="DAILY_0300">Daily Nightly Batch (03:00 AM UTC+7) - Recommended</option>
                <option value="HOURLY_DELTA">Hourly Delta Synchronization</option>
                <option value="REALTIME_WEBHOOK">Real-time Webhook Push (Enterprise Plan)</option>
              </select>

              <label style={{ display: 'flex', alignItems: 'start', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sapAutoDeactivate}
                  onChange={(e) => setSapAutoDeactivate(e.target.checked)}
                  style={{ width: 16, height: 16, marginTop: 2 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                  <strong>Auto-Deactivate Terminated Staff:</strong> Instantly revoke active LMS logins and archive learning progress when marked terminated in SAP.
                </span>
              </label>
            </div>
          </div>

          {/* Sync Logs */}
          <div className="section-label">Audit Log of SAP HRIS Batch Runs</div>
          <div className="card" style={{ marginBottom: 28, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Data Source</th>
                  <th>Total Synced</th>
                  <th>Inserted</th>
                  <th>Updated</th>
                  <th>Deactivated</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{log.timestamp}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{log.source}</td>
                    <td><strong>{log.totalRecords} Profiles</strong></td>
                    <td style={{ color: 'var(--sage)', fontWeight: 700 }}>+{log.insertedCount}</td>
                    <td style={{ color: 'var(--blue)', fontWeight: 700 }}>{log.updatedCount}</td>
                    <td style={{ color: 'var(--rust)', fontWeight: 700 }}>{log.deactivatedCount}</td>
                    <td style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{log.durationSeconds}</td>
                    <td><Badge tone="sage">SUCCESS</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB: ORG STRUCTURE (DUAL HIERARCHY) */}
      {/* ========================================================================= */}
      {activeTab === 'org-structure' && (
        <div style={{ marginBottom: 28 }}>
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0 }}>
              Browse MMVN's dual organizational hierarchy: the Supporting Functions branch (Division → Department)
              on the left, and the Operations branch (Area → Cluster → Store) on the right. Employee master records
              synced from SAP SuccessFactors (HRIS tab) attach to nodes in this tree.
            </p>
          </div>
          <OrgHierarchyBrowser />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NOTIFICATIONS & MESSAGE TEMPLATES */}
      {/* ========================================================================= */}
      {activeTab === 'gateways' && (
        <>
          {/* Gateway Status Cards */}
          <div className="grid grid-3" style={{ marginBottom: 24 }}>
            {/* Zalo ZNS */}
            <div className="card card-pad" style={{ borderColor: '#60A5FA', background: '#EFF6FF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-message-dots" /> Zalo ZNS / SMS Gateway
                </div>
                <Badge tone="blue">Connected</Badge>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
                Sends SMS / Zalo ZNS push notifications to store floor associates.
              </p>
              <Button size="sm" variant="outline" onClick={() => handleSendTestPing('Zalo ZNS')}>
                Test Ping Zalo
              </Button>
            </div>

            {/* MS Teams */}
            <div className="card card-pad" style={{ borderColor: '#C084FC', background: '#FAF5FF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#6B21A8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-brand-teams" /> Microsoft Teams Bot
                </div>
                <Badge tone="ai">Webhook Active</Badge>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
                Dispatches course approval requests to Line Managers via Teams Chat.
              </p>
              <Button size="sm" variant="outline" onClick={() => handleSendTestPing('MS Teams')}>
                Test Ping Teams
              </Button>
            </div>

            {/* Corporate SMTP */}
            <div className="card card-pad" style={{ borderColor: '#86EFAC', background: '#F0FDF4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-mail" /> Corporate SMTP Server
                </div>
                <Badge tone="sage">Active (TLS)</Badge>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
                Official email notifications from <code>lms@mmvietnam.com</code>.
              </p>
              <Button size="sm" variant="outline" onClick={() => handleSendTestPing('Corporate SMTP')}>
                Test Ping Email
              </Button>
            </div>
          </div>

          {/* Interactive Message Template Editor */}
          <div className="section-label">Interactive Message Template Editor</div>
          <div className="card card-pad" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12, flexWrap: 'wrap' }}>
              {Object.keys(templates).map((k) => (
                <button
                  key={k}
                  onClick={() => setActiveTemplateTab(k)}
                  className="btn btn-sm"
                  style={{
                    background: activeTemplateTab === k ? 'var(--rail)' : 'var(--paper-raised)',
                    color: activeTemplateTab === k ? '#fff' : 'var(--ink)',
                    borderColor: activeTemplateTab === k ? 'var(--rail)' : 'var(--line-strong)',
                  }}
                >
                  {templates[k].title}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
              <div>
                <div style={{ marginBottom: 12 }}>
                  <label className="field-label">Subject / Header Title</label>
                  <input
                    type="text"
                    className="field-input"
                    value={templates[activeTemplateTab].subject}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        [activeTemplateTab]: { ...templates[activeTemplateTab], subject: e.target.value },
                      })
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Notification Body Copy</label>
                  <textarea
                    className="field-input"
                    rows={5}
                    value={templates[activeTemplateTab].body}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        [activeTemplateTab]: { ...templates[activeTemplateTab], body: e.target.value },
                      })
                    }
                    style={{ fontSize: 13, lineHeight: 1.6 }}
                  />
                </div>

                {/* Tag helper chips */}
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>Available Dynamic Variables: </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {['{EMPLOYEE_NAME}', '{COURSE_NAME}', '{DUE_DATE}', '{DAYS_OVERDUE}', '{MANAGER_NAME}', '{SCORE}', '{CERT_ID}'].map((tag) => (
                      <span key={tag} style={{ background: 'var(--paper-sunken)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div style={{ background: 'var(--paper-sunken)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Simulated Recipient Preview
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', marginBottom: 8 }}>
                    {templates[activeTemplateTab].subject
                      .replace('{COURSE_NAME}', 'HACCP Food Safety Standards')
                      .replace('{EMPLOYEE_NAME}', 'Minh Tran')}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6, background: '#fff', padding: 12, borderRadius: 6, border: '1px solid var(--line)' }}>
                    {templates[activeTemplateTab].body
                      .replace('{EMPLOYEE_NAME}', 'Minh Tran')
                      .replace('{COURSE_NAME}', 'HACCP Food Safety Standards')
                      .replace('{DIVISION_CODE}', 'OMD')
                      .replace('{DAYS_OVERDUE}', '12')
                      .replace('{MANAGER_NAME}', 'David Tran')
                      .replace('{DUE_DATE}', '2026-08-30')
                      .replace('{JOB_LEVEL}', '6')
                      .replace('{SCORE}', '94')
                      .replace('{CERT_ID}', 'CERT-MMVN-FSH-1042')}
                  </div>
                </div>

                <Button size="sm" variant="primary" style={{ marginTop: 12 }} onClick={() => showToast('Template updated & deployed to dispatcher!')}>
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MMVN MATRIX & RBAC PERMISSIONS */}
      {/* ========================================================================= */}
      {activeTab === 'rbac' && (
        <>
          <div className="section-label">Ma Trận Phân Quyền RBAC Theo 6 Vai Trò Hệ Thống</div>
          <div className="card card-pad" style={{ marginBottom: 14, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            Phân quyền thao tác bám theo <strong>vai trò hệ thống</strong> (Learner → System Admin IT), độc lập với{' '}
            <strong>cấp bậc định biên</strong> (Level 7 thấp nhất → Level 1 cao nhất). Cấp bậc chỉ quyết định học viên được
            học khóa nào theo quy tắc học vượt cấp tuần tự.
          </div>
          <div className="card" style={{ marginBottom: 28, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Rank</th>
                  <th>Vai Trò Hệ Thống &amp; Phạm Vi Quản Lý</th>
                  <th style={{ textAlign: 'center', width: 110 }}>View Reports</th>
                  <th style={{ textAlign: 'center', width: 110 }}>Author Courses</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Approve Requests</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Issue Certificates</th>
                  <th style={{ textAlign: 'center', width: 120 }}>System Settings</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Export Audit</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_DEFINITIONS.map((def) => {
                  const perms = rbacMatrix[def.id] || {};
                  return (
                    <tr key={def.id}>
                      <td>
                        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{def.rank}/6</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{def.labelVi}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Quản lý: {managedScopeLabel(def.id)}</div>
                      </td>
                      {['viewReports', 'createCourses', 'approveCourses', 'issueCertificates', 'manageSettings', 'exportAudit'].map((key) => (
                        <td key={key} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(perms[key])}
                            onChange={() => handleToggleRbac(def.id, key)}
                            style={{ width: 16, height: 16 }}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: BRANDING, CERTIFICATES & BACKUP */}
      {/* ========================================================================= */}
      {activeTab === 'branding' && (
        <>
          <div className="grid grid-2" style={{ gap: 24, marginBottom: 24 }}>
            {/* Digital Certificate Signatures */}
            <div className="card card-pad">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-certificate" style={{ color: 'var(--rail)' }} />
                Digital Certificate Signatures &amp; QR Validation
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="field-label">Official Authorized Signer Name</label>
                  <input
                    type="text"
                    className="field-input"
                    value={certSignerName}
                    onChange={(e) => setCertSignerName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Signer Corporate Position</label>
                  <input
                    type="text"
                    className="field-input"
                    value={certSignerTitle}
                    onChange={(e) => setCertSignerTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Issuing Authority Text</label>
                  <input
                    type="text"
                    className="field-input"
                    value={certIssuerOrg}
                    onChange={(e) => setCertIssuerOrg(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Public QR Verification Host Prefix</label>
                  <input
                    type="text"
                    className="field-input"
                    value={certQrPrefix}
                    onChange={(e) => setCertQrPrefix(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* Backup & System Maintenance */}
            <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-database-export" style={{ color: 'var(--rail)' }} />
                  Configuration Backup &amp; System Maintenance
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 16 }}>
                  Export all active rules, RBAC matrices, SAP parameters, and security policies as an immutable JSON configuration file.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Button variant="outline" icon="ti-download" onClick={() => showToast('Exporting mm-megalearn-system-config.json...')}>
                    Export System Configuration JSON
                  </Button>
                  <Button variant="outline" icon="ti-upload" onClick={() => showToast('Config Import dialog opened.')}>
                    Import System Configuration File
                  </Button>
                </div>
              </div>

              <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, color: 'var(--rust)', fontWeight: 600, marginBottom: 6 }}>
                  <i className="ti ti-alert-triangle" /> Danger Zone
                </div>
                <Button size="sm" variant="danger" icon="ti-trash" onClick={() => showToast('LMS Cache purged and synced with SAP database!')}>
                  Purge LMS Local Storage &amp; Re-sync 100 Users
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ADD AUTO-RULE MODAL */}
      {showAddRuleModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setShowAddRuleModal(false)}
        >
          <div
            className="card card-pad"
            style={{ maxWidth: 580, width: '100%', background: 'var(--paper-raised)', boxShadow: 'var(--shadow-xl)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Create New Auto-Assignment Rule</div>
              <button onClick={() => setShowAddRuleModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            <form onSubmit={handleAddRule} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="field-label">Policy Name</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Cashier POS Onboarding Mandatory"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label">Trigger Condition</label>
                  <select
                    className="field-select"
                    value={newRuleTrigger}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setNewRuleTrigger(nextType);
                      setNewRuleTarget(targetOptionsFor(nextType)[0]?.id || 'ALL');
                    }}
                  >
                    {ASSIGNMENT_TYPES.filter((t) => t !== 'USER').map((t) => (
                      <option key={t} value={t}>{assignmentTypeLabel(t)}</option>
                    ))}
                    <option value="ALL_ASSOCIATES">All 100 Associates (Company-wide)</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Target Scope</label>
                  {newRuleTrigger === 'ALL_ASSOCIATES' ? (
                    <input type="text" className="field-input" value="All 100 Associates" disabled />
                  ) : (
                    <select className="field-select" value={newRuleTarget} onChange={(e) => setNewRuleTarget(e.target.value)}>
                      {targetOptionsFor(newRuleTrigger).map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="field-label">Assigned Mandatory Course</label>
                <select
                  className="field-select"
                  value={newRuleCourse}
                  onChange={(e) => setNewRuleCourse(e.target.value)}
                >
                  {courses.slice(0, 30).map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">SLA Window (Days to Complete)</label>
                <input
                  type="number"
                  className="field-input"
                  value={newRuleDays}
                  onChange={(e) => setNewRuleDays(e.target.value)}
                  min="1"
                  max="90"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <Button variant="outline" onClick={() => setShowAddRuleModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" icon="ti-plus">Save &amp; Activate Rule</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
