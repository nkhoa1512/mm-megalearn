import React, { useState } from 'react';
import {
  orgReport,
  kirkpatrickROI,
  companyHeatmapData,
  costTrackingData,
  divisionComplianceLeague,
} from '../../data/mockData';
import { StatCard, Badge, Button, ProgressBar } from '../../components/ui';
import { downloadCsv } from '../../lib/exportCsv';

export default function AdminReports() {
  const [selectedInspectionPackage, setSelectedInspectionPackage] = useState('HACCP');
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState('ROI_KIRKPATRICK'); // ROI_KIRKPATRICK, HEATMAP, COST_BUDGET, COMPLIANCE_LEAGUE

  function activeReportRows() {
    if (activeReportTab === 'HEATMAP') {
      return [...companyHeatmapData.operations, ...companyHeatmapData.supportingOffice];
    }
    if (activeReportTab === 'COST_BUDGET') {
      return costTrackingData.departmentSpend;
    }
    if (activeReportTab === 'COMPLIANCE_LEAGUE') {
      return divisionComplianceLeague;
    }
    return [
      { level: 'Level 1 - Reaction', ...kirkpatrickROI.level1 },
      { level: 'Level 2 - Learning', ...kirkpatrickROI.level2 },
    ];
  }

  function handleExportExcel() {
    setIsExporting(true);
    setTimeout(() => {
      downloadCsv(`mmvn-lms-${activeReportTab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, activeReportRows());
      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 3000);
    }, 800);
  }

  function handleExportDossier() {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      window.print();
    }, 800);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Strategic ROI, L&amp;D Budget &amp; Audit Command Center</h1>
            <Badge tone="ai" icon="ti-calculator">Kirkpatrick 4-Level ROI &amp; Heatmaps</Badge>
          </div>
          <p>
            Measure training business impact and financial return (ROI), track L&amp;D expenditure vs budget, analyze cross-branch competency gap heatmaps, and export signed inspection dossiers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            icon={exportComplete ? 'ti-check' : isExporting ? 'ti-loader ti-spin' : 'ti-file-spreadsheet'}
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            {exportComplete ? 'CSV Downloaded!' : 'Export Excel Report (CSV)'}
          </Button>
          <Button
            variant="primary"
            icon={isExporting ? 'ti-loader ti-spin' : 'ti-file-certificate'}
            onClick={handleExportDossier}
            disabled={isExporting}
          >
            {isExporting ? 'Preparing Print View...' : 'Export Audit Dossier (Print / Save as PDF)'}
          </Button>
        </div>
      </div>

      {/* REPORT SECTION TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'ROI_KIRKPATRICK', label: 'Kirkpatrick 4-Level ROI Framework', icon: 'ti-chart-arrows' },
          { id: 'HEATMAP', label: 'Competency Gap Heatmap (Operations vs Head Office)', icon: 'ti-layout-grid' },
          { id: 'COST_BUDGET', label: 'Training Cost Tracking & L&D Budget', icon: 'ti-coin' },
          { id: 'COMPLIANCE_LEAGUE', label: 'Compliance League Table (16 Divisions & Stores)', icon: 'ti-trophy' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: activeReportTab === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
              color: activeReportTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: activeReportTab === tab.id ? 'var(--rail)' : 'var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: KIRKPATRICK 4-LEVEL ROI */}
      {activeReportTab === 'ROI_KIRKPATRICK' && (
        <>
          <div className="section-label">Enterprise Training Impact Framework &middot; Kirkpatrick 4-Level Architecture</div>
          <div className="grid grid-2" style={{ marginBottom: 28, gap: 16 }}>
            {/* Level 1 */}
            <div className="card card-pad" style={{ borderLeft: '4px solid #3B82F6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#1D4ED8', textTransform: 'uppercase' }}>
                  Level 1: Learner Reaction &amp; CSAT Satisfaction
                </span>
                <Badge tone="blue">{kirkpatrickROI.level1.netPromoter}</Badge>
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Average CSAT Rating</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{kirkpatrickROI.level1.csatScore}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Workplace Applicability</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sage)' }}>{kirkpatrickROI.level1.usefulRate}</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                {kirkpatrickROI.level1.summary}
              </p>
            </div>

            {/* Level 2 */}
            <div className="card card-pad" style={{ borderLeft: '4px solid #009E49' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#006830', textTransform: 'uppercase' }}>
                  Level 2: Knowledge Retention &amp; Assessment Mastery
                </span>
                <Badge tone="sage">{kirkpatrickROI.level2.assessmentsCompleted} Passed Exams</Badge>
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Average Assessment Score</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sage)' }}>{kirkpatrickROI.level2.avgScore}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>First-Attempt Pass Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{kirkpatrickROI.level2.firstAttemptPass}</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                {kirkpatrickROI.level2.summary}
              </p>
            </div>

            {/* Level 3 */}
            <div className="card card-pad" style={{ borderLeft: '4px solid #F59E0B' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#B45309', textTransform: 'uppercase' }}>
                  Level 3: 3-6 Month Behavioral Change on the Floor
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
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                {kirkpatrickROI.level3.summary}
              </p>
            </div>

            {/* Level 4 */}
            <div className="card card-pad" style={{ borderLeft: '4px solid #005BAA', background: 'linear-gradient(135deg, #F0F7FF 0%, #E6F0FA 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#003E73', textTransform: 'uppercase' }}>
                  Level 4: Financial Business Results &amp; ROI
                </span>
                <Badge tone="blue">{kirkpatrickROI.level4.roiRatio}</Badge>
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Estimated Cost Savings</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#005BAA' }}>{kirkpatrickROI.level4.costSavingsEstimated}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Fresh Spoilage Reduction</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sage)' }}>{kirkpatrickROI.level4.spoilageReduction}</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                {kirkpatrickROI.level4.summary}
              </p>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: DUAL-HIERARCHY COMPETENCY GAP HEATMAP */}
      {activeReportTab === 'HEATMAP' && (
        <div style={{ marginBottom: 28 }}>
          {/* Operations Heatmap */}
          <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>1. Hypermarket Store Operations Branch (7 Retail Stores)</span>
            <Badge tone="amber">Operations Stores</Badge>
          </div>
          <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 220 }}>Store Location</th>
                  <th>Region</th>
                  <th>HACCP Food Safety</th>
                  <th>Cold Chain Integrity</th>
                  <th>Shrinkage Control</th>
                  <th>POS Speed</th>
                  <th>Customer Service</th>
                  <th>Leadership</th>
                  <th>Average Gap</th>
                  <th>Audit Readiness</th>
                </tr>
              </thead>
              <tbody>
                {companyHeatmapData.operations.map((st, i) => (
                  <tr key={i}>
                    <td><strong>{st.entity}</strong></td>
                    <td><span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{st.area}</span></td>
                    <td><HeatCell val={st.foodSafety} /></td>
                    <td><HeatCell val={st.coldChain} /></td>
                    <td><HeatCell val={st.shrinkControl} /></td>
                    <td><HeatCell val={st.posSpeed} /></td>
                    <td><HeatCell val={st.customerService} /></td>
                    <td><HeatCell val={st.leadership} /></td>
                    <td>
                      <strong style={{ color: st.gapAvg <= 10 ? 'var(--sage)' : 'var(--amber)' }}>
                        {st.gapAvg}%
                      </strong>
                    </td>
                    <td>
                      <Badge tone={st.auditReady ? 'sage' : 'amber'}>
                        {st.auditReady ? 'Audit Ready' : 'Training Required'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Supporting Office Heatmap */}
          <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>2. Head Office Supporting Functions Branch</span>
            <Badge tone="rail">An Phu Headquarters</Badge>
          </div>
          <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 240 }}>Corporate Division</th>
                  <th>Location</th>
                  <th>QA &amp; Standards</th>
                  <th>Supply Chain</th>
                  <th>Legal Compliance</th>
                  <th>IT InfoSec</th>
                  <th>Collaboration</th>
                  <th>Strategic Leadership</th>
                  <th>Average Gap</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {companyHeatmapData.supportingOffice.map((ho, i) => (
                  <tr key={i}>
                    <td><strong>{ho.entity}</strong></td>
                    <td><span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{ho.branch}</span></td>
                    <td><HeatCell val={ho.foodSafety} /></td>
                    <td><HeatCell val={ho.coldChain} /></td>
                    <td><HeatCell val={ho.shrinkControl} /></td>
                    <td><HeatCell val={ho.posSpeed} /></td>
                    <td><HeatCell val={ho.customerService} /></td>
                    <td><HeatCell val={ho.leadership} /></td>
                    <td>
                      <strong style={{ color: ho.gapAvg <= 5 ? 'var(--sage)' : 'var(--rail)' }}>
                        {ho.gapAvg}%
                      </strong>
                    </td>
                    <td>
                      <Badge tone="sage">Head Office Compliant</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COST TRACKING & L&D TRAINING BUDGET */}
      {activeReportTab === 'COST_BUDGET' && (
        <div style={{ marginBottom: 28 }}>
          <div className="grid grid-4" style={{ gap: 14, marginBottom: 20 }}>
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Annual L&amp;D Budget</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginTop: 4 }}>4,500,000,000 ₫</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>FY2026 Allocation</div>
            </div>
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Disbursed YTD</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)', marginTop: 4 }}>2,850,000,000 ₫</div>
              <div style={{ fontSize: 11, color: 'var(--sage)', fontWeight: 600, marginTop: 2 }}>63.3% Utilization Rate</div>
            </div>
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Average Cost / Learner</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)', marginTop: 4 }}>1,328,000 ₫</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>18% Optimization vs 2025</div>
            </div>
            <div className="card card-pad" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>External Platform Licenses</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#005BAA', marginTop: 4 }}>1,285,000,000 ₫</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>LinkedIn / Coursera / Udemy</div>
            </div>
          </div>

          {/* Department Spend Table */}
          <div className="section-label">Cost Center &amp; Budget Allocation Breakdown</div>
          <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Branch / Program Category</th>
                  <th>Allocated Budget (VND)</th>
                  <th>Disbursed YTD (VND)</th>
                  <th>Participating Trainees</th>
                  <th>Cost per Trainee</th>
                  <th>Budget Utilization</th>
                </tr>
              </thead>
              <tbody>
                {costTrackingData.departmentSpend.map((d, i) => (
                  <tr key={i}>
                    <td><strong>{d.name}</strong></td>
                    <td>{d.budget.toLocaleString()} ₫</td>
                    <td><strong>{d.spent.toLocaleString()} ₫</strong></td>
                    <td>{d.learners.toLocaleString()} trainees</td>
                    <td>{d.costPerHead.toLocaleString()} ₫</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={parseInt(d.utilization)} tone="rail" size="sm" />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{d.utilization}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* External Platform Subscriptions */}
          <div className="section-label">External Platform Enterprise License Subscriptions</div>
          <div className="grid grid-3" style={{ gap: 14 }}>
            {costTrackingData.externalPlatformLicenses.map((lic, i) => (
              <div key={i} className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 13.5 }}>{lic.platform}</span>
                  <Badge tone="blue">{lic.utilizationRate} Active</Badge>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                  {lic.costAnnual.toLocaleString()} ₫ / yr
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {lic.licenses} Enterprise seats &middot; {lic.activeLearners} active trainees
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: COMPLIANCE LEAGUE TABLE */}
      {activeReportTab === 'COMPLIANCE_LEAGUE' && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-label">Enterprise Mandatory Compliance League Table (16 Divisions &amp; Stores)</div>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Rank</th>
                  <th>Operating Division / Unit</th>
                  <th>Headcount</th>
                  <th>Completed</th>
                  <th>In Progress</th>
                  <th>Overdue</th>
                  <th style={{ minWidth: 140 }}>Compliance Rate</th>
                  <th>Avg Score</th>
                  <th>Inspection Status</th>
                </tr>
              </thead>
              <tbody>
                {divisionComplianceLeague.map((div) => (
                  <tr key={div.code}>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: 13, color: div.rank <= 3 ? 'var(--amber)' : 'var(--ink-faint)' }}>
                        #{div.rank}
                      </span>
                    </td>
                    <td>
                      <strong>{div.name}</strong> ({div.code})
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Director: {div.director}</div>
                    </td>
                    <td>{div.headcount}</td>
                    <td><strong style={{ color: 'var(--sage)' }}>{div.completedCount}</strong></td>
                    <td>{div.inProgressCount}</td>
                    <td>
                      <span style={{ color: div.overdueCount > 0 ? 'var(--rust)' : 'var(--ink-faint)', fontWeight: div.overdueCount > 0 ? 700 : 400 }}>
                        {div.overdueCount}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={div.completionRate} tone={div.completionRate >= 90 ? 'sage' : div.completionRate >= 75 ? 'amber' : 'rust'} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{div.completionRate}%</span>
                      </div>
                    </td>
                    <td>{div.avgScore}%</td>
                    <td>
                      <Badge tone={div.status === 'AUDIT_READY' ? 'sage' : div.status === 'NEEDS_ATTENTION' ? 'amber' : 'rust'}>
                        {div.status === 'AUDIT_READY' ? 'Audit Ready' : div.status === 'NEEDS_ATTENTION' ? 'Needs Attention' : 'At Risk'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function HeatCell({ val }) {
  const bg = val >= 92 ? '#DCFCE7' : val >= 82 ? '#FEF3C7' : '#FEE2E2';
  const color = val >= 92 ? '#166534' : val >= 82 ? '#92400E' : '#991B1B';
  return (
    <span style={{ background: bg, color, padding: '3px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>
      {val}%
    </span>
  );
}
