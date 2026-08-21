import React, { useState } from 'react';
import {
  orgReport,
  kirkpatrickROI,
  competencySkillHeatmap,
  divisionComplianceLeague,
} from '../../data/mockData';
import { StatCard, Badge, Button } from '../../components/ui';

export default function AdminReports() {
  const [selectedInspectionPackage, setSelectedInspectionPackage] = useState('HACCP');
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  function handleExportDossier() {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 3000);
    }, 1500);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Strategic Training ROI &amp; Compliance Audit Center</h1>
            <Badge tone="ai" icon="ti-calculator">Kirkpatrick 4-Level ROI</Badge>
          </div>
          <p>
            Executive financial impact evaluation, cross-divisional competency skill gap heatmaps, and 1-click audit dossier export for government regulatory inspections.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="primary"
            icon={exportComplete ? 'ti-check' : isExporting ? 'ti-loader ti-spin' : 'ti-file-certificate'}
            onClick={handleExportDossier}
            disabled={isExporting}
          >
            {exportComplete ? 'Audit Dossier Exported!' : isExporting ? 'Generating Signed PDF...' : 'Export Formal Audit Package'}
          </Button>
        </div>
      </div>

      {/* SECTION 1: KIRKPATRICK 4-LEVEL ROI EVALUATION MODEL */}
      <div className="section-label">Enterprise Training ROI &middot; Kirkpatrick 4-Level Impact Framework</div>
      <div className="grid grid-2" style={{ marginBottom: 28 }}>
        {/* Level 1 */}
        <div className="card card-pad" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#1D4ED8', textTransform: 'uppercase' }}>
              Level 1: Learner Reaction &amp; CSAT
            </span>
            <Badge tone="blue">{kirkpatrickROI.level1.netPromoter}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Overall Satisfaction</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{kirkpatrickROI.level1.csatScore}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Practical Application</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sage)' }}>{kirkpatrickROI.level1.usefulRate}</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0 }}>
            {kirkpatrickROI.level1.summary}
          </p>
        </div>

        {/* Level 2 */}
        <div className="card card-pad" style={{ borderLeft: '4px solid #10B981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#047857', textTransform: 'uppercase' }}>
              Level 2: Learning &amp; Knowledge Mastery
            </span>
            <Badge tone="sage">{kirkpatrickROI.level2.assessmentsCompleted} Quizzes Passed</Badge>
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Average Exam Score</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sage)' }}>{kirkpatrickROI.level2.avgScore}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>First-Attempt Pass Rate</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{kirkpatrickROI.level2.firstAttemptPass}</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0 }}>
            {kirkpatrickROI.level2.summary}
          </p>
        </div>

        {/* Level 3 */}
        <div className="card card-pad" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#B45309', textTransform: 'uppercase' }}>
              Level 3: On-the-Floor Behavioral Compliance
            </span>
            <Badge tone="amber">Internal Audit Verified</Badge>
          </div>
          <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
              &bull; {kirkpatrickROI.level3.metric1}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
              &bull; {kirkpatrickROI.level3.metric2}
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0 }}>
            {kirkpatrickROI.level3.summary}
          </p>
        </div>

        {/* Level 4 */}
        <div className="card card-pad" style={{ borderLeft: '4px solid #8B5CF6', background: 'linear-gradient(135deg, #FAF5FF 0%, #F5F3FF 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#6D28D9', textTransform: 'uppercase' }}>
              Level 4: Business Results &amp; Financial ROI
            </span>
            <Badge tone="ai">{kirkpatrickROI.level4.roiRatio}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Annual Cost Savings</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#5B21B6' }}>{kirkpatrickROI.level4.costSavingsEstimated}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Shrink Reduction</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sage)' }}>{kirkpatrickROI.level4.spoilageReduction}</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0 }}>
            {kirkpatrickROI.level4.summary}
          </p>
        </div>
      </div>

      {/* SECTION 2: COMPETENCY & SKILL GAP HEATMAP MATRIX */}
      <div className="section-label">Cross-Division Competency &amp; Skill Gap Heatmap (%)</div>
      <div className="card" style={{ marginBottom: 28, overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 220 }}>Division</th>
              <th>Food Safety &amp; HACCP</th>
              <th>InfoSec &amp; Privacy</th>
              <th>Risk &amp; SOP</th>
              <th>Cold Chain Storage</th>
              <th>Leadership &amp; Coaching</th>
              <th>Customer Service &amp; POS</th>
            </tr>
          </thead>
          <tbody>
            {competencySkillHeatmap.map((row) => (
              <tr key={row.division}>
                <td style={{ fontWeight: 700, fontSize: 13 }}>{row.division}</td>
                <td><HeatmapCell value={row.foodSafety} /></td>
                <td><HeatmapCell value={row.infoSec} /></td>
                <td><HeatmapCell value={row.riskMgmt} /></td>
                <td><HeatmapCell value={row.coldChain} /></td>
                <td><HeatmapCell value={row.leadership} /></td>
                <td><HeatmapCell value={row.customerService} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECTION 3: OFFICIAL REGULATORY INSPECTION AUDIT PACKAGES */}
      <div className="section-label">Government &amp; Regulatory Inspection Audit Packages</div>
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
              1-Click Formal Compliance Inspection Dossier
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Pre-compiled, cryptographically hashed training completion packages formatted for state regulators and external certifiers.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'HACCP', label: 'Food Safety (HACCP/ISO-22000)' },
              { id: 'FIRE', label: 'Fire Safety & HSE (PCCC)' },
              { id: 'LABOR', label: 'Ministry of Labor Audit' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedInspectionPackage(p.id)}
                className="btn btn-sm"
                style={{
                  background: selectedInspectionPackage === p.id ? 'var(--rail)' : 'var(--paper-raised)',
                  color: selectedInspectionPackage === p.id ? '#fff' : 'var(--ink)',
                  borderColor: selectedInspectionPackage === p.id ? 'var(--rail)' : 'var(--line-strong)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--paper-sunken)', padding: '16px 20px', borderRadius: 8, border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {selectedInspectionPackage === 'HACCP'
                  ? 'Official HACCP Food Safety Compliance Dossier (ISO-22000 Standards)'
                  : selectedInspectionPackage === 'FIRE'
                  ? 'Fire Prevention, Evacuation & HSE Mandatory Certification Dossier'
                  : 'Labor Safety & Compulsory Workplace Regulatory Dossier'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
                Coverage: <strong>100% of applicable Fresh Food &amp; Store Associates (890 employees)</strong> &middot; Cryptographic SHA-256 Hash Verified.
              </div>
            </div>
            <Button size="sm" variant="primary" icon="ti-download" onClick={handleExportDossier}>
              Download Official Signed Dossier (.PDF)
            </Button>
          </div>
        </div>
      </div>

      {/* SECTION 4: LINE MANAGER LEADERSHIP & COACHING ACCOUNTABILITY */}
      <div className="section-label">Department Manager Leadership &amp; Coaching Accountability</div>
      <div className="card" style={{ marginBottom: 28 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Department Manager</th>
              <th>Division / Department</th>
              <th>Team Size</th>
              <th>Completed</th>
              <th>Overdue</th>
              <th>Avg Score</th>
              <th>Completion Rate</th>
              <th>Accountability Status</th>
            </tr>
          </thead>
          <tbody>
            {orgReport.managerPerformance.map((mp) => (
              <tr key={mp.employeeCode}>
                <td>
                  <div style={{ fontWeight: 700 }}>{mp.manager}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{mp.employeeCode}</div>
                </td>
                <td style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>
                  {mp.division} / {mp.department}
                </td>
                <td>{mp.teamSize}</td>
                <td style={{ color: 'var(--sage)', fontWeight: 700 }}>{mp.completed}</td>
                <td style={{ color: mp.overdue > 0 ? 'var(--rust)' : 'var(--sage)', fontWeight: mp.overdue > 0 ? 700 : 500 }}>
                  {mp.overdue}
                </td>
                <td><strong>{mp.avgScore}%</strong></td>
                <td>
                  <strong style={{ color: mp.completionRate >= 80 ? 'var(--sage)' : 'var(--amber)' }}>
                    {mp.completionRate}%
                  </strong>
                </td>
                <td>
                  <Badge tone={mp.status === 'EXCELLENT' ? 'sage' : mp.status === 'GOOD' ? 'rail' : 'amber'}>
                    {mp.status === 'EXCELLENT' ? 'Top Coach' : mp.status === 'GOOD' ? 'On Track' : 'Needs Follow-up'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function HeatmapCell({ value }) {
  const bg =
    value >= 90
      ? '#D1FAE5'
      : value >= 80
      ? '#ECFDF5'
      : value >= 70
      ? '#FEF3C7'
      : '#FEE2E2';
  const color =
    value >= 90
      ? '#065F46'
      : value >= 80
      ? '#047857'
      : value >= 70
      ? '#B45309'
      : '#991B1B';

  return (
    <div
      style={{
        background: bg,
        color: color,
        fontWeight: 700,
        fontSize: 12.5,
        textAlign: 'center',
        padding: '6px 10px',
        borderRadius: 6,
        display: 'inline-block',
        minWidth: 54,
      }}
    >
      {value}%
    </div>
  );
}
