// ===========================================================================
// HRBP INSIGHTS — presentational layer for the HRBP business-rules engine.
//
// Every component here renders a value produced by src/utils/hrbpRules.js and
// cites the rule that produced it, so an HRBP (or an auditor) can always see
// why a number says what it says.
// ===========================================================================

import React, { useState } from 'react';
import { Badge, Button, ProgressBar } from '../../features/common/ui';
import {
  HRBP_RULES,
  HRBP_RULE_GROUPS,
  PORTFOLIO_MODE,
  COMPLIANCE_BAND_LABELS,
  MANDATORY_COURSE_LABELS,
  SLA_STATE_LABELS,
  READY_SUCCESSOR_TARGET,
  NINE_BOX,
} from '../../utils/hrbpRules';

const BAND_TONE = {
  EXCELLENT_STANDARD: 'sage',
  MEETS_STANDARD: 'blue',
  WARNING_REQUIRED: 'amber',
  CRITICAL: 'rust',
  NO_HEADCOUNT: 'slate',
};

const SLA_TONE = {
  ON_TRACK: 'sage',
  DUE_SOON: 'amber',
  BREACHED: 'rust',
  SETTLED: 'blue',
  CLOSED: 'slate',
};

const RISK_TONE = {
  COVERED: 'sage',
  THIN: 'amber',
  AT_RISK: 'rust',
  SINGLE_POINT_OF_FAILURE: 'rust',
};

const RISK_LABEL = {
  COVERED: 'Covered',
  THIN: 'Thin bench',
  AT_RISK: 'At risk',
  SINGLE_POINT_OF_FAILURE: 'Single point of failure',
};

/** A small inline citation, e.g. "BR-HRBP-011". */
export function RuleTag({ id }) {
  return (
    <span
      title={`Derived by rule ${id}`}
      style={{
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--ink-faint)',
        background: 'var(--paper-sunken)',
        border: '1px solid var(--line)',
        borderRadius: 4,
        padding: '1px 5px',
        whiteSpace: 'nowrap',
      }}
    >
      {id}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Portfolio scope bar (BR-HRBP-001 / 002 / 003)
// ---------------------------------------------------------------------------
export function PortfolioBar({ portfolio, mode, onModeChange, headcount, totalHeadcount }) {
  const options = [
    { id: PORTFOLIO_MODE.OPERATIONS, label: 'Store Operations', hint: '23 stores & depots' },
    { id: PORTFOLIO_MODE.SUPPORTING, label: 'Head Office', hint: '19 support divisions' },
    { id: PORTFOLIO_MODE.COMPANY, label: 'Company-wide', hint: 'all 42 divisions' },
  ];

  return (
    <div
      className="card card-pad"
      style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-target-arrow" style={{ color: 'var(--blue)', fontSize: 18 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Portfolio in scope</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
            Every figure below is computed over this scope only <RuleTag id="BR-HRBP-001" />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className="btn btn-sm"
            onClick={() => onModeChange(opt.id)}
            style={{
              background: mode === opt.id ? 'var(--blue)' : 'var(--paper-raised)',
              // --blue stays a solid brand blue in both themes, so white reads correctly on it.
              color: mode === opt.id ? '#fff' : 'var(--ink)',
              borderColor: mode === opt.id ? 'var(--blue)' : 'var(--line-strong)',
              fontWeight: mode === opt.id ? 700 : 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              lineHeight: 1.25,
              padding: '5px 12px',
            }}
          >
            <span style={{ fontSize: 12 }}>{opt.label}</span>
            <span style={{ fontSize: 10, opacity: 0.8 }}>{opt.hint}</span>
          </button>
        ))}
      </div>

      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
          {headcount}
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-faint)' }}> / {totalHeadcount} employees</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{portfolio?.label}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI row — the four numbers an HRBP is actually accountable for
// ---------------------------------------------------------------------------
function KpiTile({ icon, tone, value, label, sub, ruleId }) {
  return (
    <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div
        className="stat-icon-badge"
        style={{ background: `var(--${tone}-soft)`, color: `var(--${tone}-soft-text)`, width: 40, height: 40, fontSize: 20, flexShrink: 0 }}
      >
        <i className={`ti ${icon}`} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: `var(--${tone})` }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.35 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{sub}</div>}
        {ruleId && <div style={{ marginTop: 4 }}><RuleTag id={ruleId} /></div>}
      </div>
    </div>
  );
}

export function HrbpKpiRow({ compliance, criticalGapCells, bench, slaBreaches }) {
  const complianceTone = compliance.compliancePercent >= 88 ? 'sage' : compliance.compliancePercent >= 70 ? 'amber' : 'rust';
  const atRisk = bench.filter((b) => b.risk === 'AT_RISK' || b.risk === 'SINGLE_POINT_OF_FAILURE').length;

  return (
    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <KpiTile
        icon="ti-shield-check"
        tone={complianceTone}
        value={`${compliance.compliancePercent}%`}
        label="Mandatory training compliance"
        sub={`${compliance.nonCompliantPeople} of ${compliance.headcount} employees outstanding`}
        ruleId="BR-HRBP-010"
      />
      <KpiTile
        icon="ti-clipboard-list"
        tone={compliance.coveragePercent >= 99 ? 'sage' : 'amber'}
        value={`${compliance.coveragePercent}%`}
        label="Mandatory course coverage"
        sub={
          compliance.notAssignedPeople > 0
            ? `${compliance.notAssignedPeople} never assigned — allocation defect`
            : 'Every employee in scope is assigned all three'
        }
        ruleId="BR-HRBP-011"
      />
      <KpiTile
        icon="ti-chart-dots"
        tone={criticalGapCells > 0 ? 'rust' : 'sage'}
        value={criticalGapCells}
        label="Critical competency gaps"
        sub="unit x domain cells at -15 or worse"
        ruleId="BR-HRBP-023"
      />
      <KpiTile
        icon="ti-git-branch"
        tone={atRisk > 0 ? 'amber' : 'sage'}
        value={atRisk}
        label="Key roles without a ready successor"
        sub={slaBreaches > 0 ? `${slaBreaches} L&D ticket(s) past SLA` : 'All L&D tickets within SLA'}
        ruleId="BR-HRBP-051"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance matrix per division (BR-HRBP-012 / 013)
// ---------------------------------------------------------------------------
export function ComplianceMatrix({ rows, onDrilldown, onNudge }) {
  const withHeadcount = rows.filter((r) => r.headcount > 0);
  const empty = rows.length - withHeadcount.length;

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            Mandatory compliance by division ({withHeadcount.length} with headcount)
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '3px 0 0', maxWidth: 720 }}>
            Compliance counts only completed mandatory courses. Coverage counts how many were assigned in the first place.
            The two are separated on purpose: coverage failures belong to User Admin, completion failures belong to the line.
            {' '}<RuleTag id="BR-HRBP-011" />
          </p>
        </div>
        {empty > 0 && (
          <Badge tone="slate" size="sm">{empty} division(s) with no headcount, excluded</Badge>
        )}
      </div>

      <table className="table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Division (store / depot)</th>
            <th style={{ width: 70 }}>Staff</th>
            <th style={{ minWidth: 150 }}>Compliance</th>
            <th style={{ width: 90 }}>Coverage</th>
            <th style={{ width: 130 }}>Band</th>
            <th style={{ width: 120 }}>Outstanding</th>
            <th style={{ textAlign: 'right', width: 150 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {withHeadcount.map((row) => (
            <tr key={row.id} style={row.escalate ? { background: 'var(--rust-soft)' } : undefined}>
              <td>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{row.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                  <span style={{ fontFamily: 'monospace' }}>{row.code}</span> &middot; {row.location}
                </div>
              </td>
              <td style={{ fontWeight: 600 }}>{row.headcount}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <ProgressBar
                      value={row.compliancePercent}
                      tone={row.compliancePercent >= 88 ? 'sage' : row.compliancePercent >= 70 ? 'amber' : 'rust'}
                      size="sm"
                    />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 42 }}>{row.compliancePercent}%</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>
                  {row.fullyCompliant} of {row.headcount} fully compliant
                </div>
              </td>
              <td style={{ fontSize: 12, fontWeight: 600 }}>{row.coveragePercent}%</td>
              <td>
                <Badge tone={BAND_TONE[row.band] || 'slate'} size="sm">
                  {COMPLIANCE_BAND_LABELS[row.band] || row.band}
                </Badge>
                {row.escalate && (
                  <div style={{ marginTop: 4 }}>
                    <Badge tone="rust" size="sm" icon="ti-alert-triangle">Escalate</Badge>
                  </div>
                )}
              </td>
              <td>
                <div style={{ fontSize: 12, fontWeight: 700, color: row.nonCompliantPeople > 0 ? 'var(--rust)' : 'var(--ink-soft)' }}>
                  {row.nonCompliantPeople} people
                </div>
                {row.overduePeople > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--amber-soft-text)' }}>{row.overduePeople} overdue</div>
                )}
                {row.notAssignedPeople > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--rust)' }}>Never assigned: {row.notAssignedPeople}</div>
                )}
              </td>
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button size="sm" variant="ghost" icon="ti-eye" onClick={() => onDrilldown(row)}>Details</Button>
                  <Button size="sm" variant="outline" icon="ti-send" onClick={() => onNudge(row)}>Alert</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Per-course breakdown inside the division drill-down. */
export function ComplianceCourseBreakdown({ row }) {
  const entries = Object.entries(row?.perCourse || {});
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entries.map(([courseId, slot]) => {
        const pct = slot.total > 0 ? Math.round((slot.completed / slot.total) * 100) : 0;
        const coverage = slot.total > 0 ? Math.round((slot.assigned / slot.total) * 100) : 0;
        return (
          <div key={courseId} style={{ padding: '10px 12px', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{MANDATORY_COURSE_LABELS[courseId] || courseId}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: pct >= 88 ? 'var(--sage)' : 'var(--rust)' }}>{pct}%</div>
            </div>
            <ProgressBar value={pct} tone={pct >= 88 ? 'sage' : pct >= 70 ? 'amber' : 'rust'} size="sm" />
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
              <span style={{ fontFamily: 'monospace' }}>{courseId}</span> &middot; {slot.completed} completed &middot; {slot.assigned} assigned of {slot.total} staff &middot; coverage {coverage}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Competency gap cells (BR-HRBP-020 → 024)
// ---------------------------------------------------------------------------
export function GapCellTable({ cells, unmeasured, onRaiseTicket }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card card-pad">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            Competency gaps by division and skill domain ({cells.length} cells)
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '3px 0 0', maxWidth: 760 }}>
            Actual competency is the mean credit across every course assigned in that domain — a completed course credits its
            assessment score, a course still in progress credits only its progress against the pass mark. The required standard
            comes from the job level of the people in the unit. <RuleTag id="BR-HRBP-021" /> <RuleTag id="BR-HRBP-022" />
          </p>
        </div>

        {cells.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
            No competency gap beyond tolerance in this portfolio.
          </div>
        ) : (
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Division</th>
                <th>Skill domain</th>
                <th style={{ minWidth: 160 }}>Actual vs required</th>
                <th style={{ width: 80 }}>Gap</th>
                <th style={{ width: 130 }}>People affected</th>
                <th style={{ width: 120 }}>Severity</th>
                <th style={{ textAlign: 'right', width: 130 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cells.map((cell) => (
                <tr key={`${cell.divisionId}-${cell.domainId}`}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{cell.divisionName}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>{cell.divisionCode}</div>
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>{cell.domainLabel}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      <span>Actual <strong>{cell.actual}</strong></span>
                      <span>Required <strong>{cell.required}</strong></span>
                    </div>
                    <ProgressBar value={cell.actual} tone={cell.gap <= -15 ? 'rust' : 'amber'} size="sm" />
                  </td>
                  <td>
                    <Badge tone={cell.gap <= -15 ? 'rust' : 'amber'} size="sm">{cell.gap}</Badge>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {cell.affected} of {cell.headcount}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{cell.affectedPercent}% of the unit affected</div>
                  </td>
                  <td>
                    <Badge tone={cell.severity === 'CRITICAL_GAP' ? 'rust' : 'amber'} size="sm">
                      {cell.severity === 'CRITICAL_GAP' ? 'Critical' : 'Monitoring'}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Button size="sm" variant="primary" icon="ti-send" onClick={() => onRaiseTicket(cell)}>
                      Raise ticket
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {unmeasured.length > 0 && (
        <div className="card card-pad">
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              Unmeasured domains ({unmeasured.length}) — learning assigned, nothing completed yet
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '3px 0 0', maxWidth: 760 }}>
              These units hold assigned courses in a domain but not a single completion, so there is no evidence to score.
              They are listed as a coverage problem rather than reported as a competency gap, because a precise negative
              number from an empty evidence base would be invented. <RuleTag id="BR-HRBP-024" />
            </p>
          </div>
          <div className="grid grid-3" style={{ gap: 10 }}>
            {unmeasured.slice(0, 12).map((cell) => (
              <div
                key={`${cell.divisionId}-${cell.domainId}`}
                style={{ padding: '10px 12px', background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8 }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{cell.domainLabel}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>{cell.divisionName}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
                  {cell.people} employee(s) &middot; {cell.assignedCourses} assigned course(s)
                  {cell.overdue > 0 && <span style={{ color: 'var(--rust)' }}> &middot; {cell.overdue} overdue</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Intervention SLA (BR-HRBP-060 → 062)
// ---------------------------------------------------------------------------
export function SlaBadge({ sla }) {
  if (!sla) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start', maxWidth: 150 }}>
      <Badge tone={SLA_TONE[sla.state] || 'slate'} size="sm">
        {SLA_STATE_LABELS[sla.state] || sla.state}
      </Badge>
      <span style={{ fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.35 }}>
        Due {sla.dueDate || '—'}
        {sla.state !== 'SETTLED' && sla.state !== 'CLOSED' && typeof sla.daysRemaining === 'number' && (
          <> &middot; {sla.daysRemaining < 0 ? `${Math.abs(sla.daysRemaining)}d late` : `${sla.daysRemaining}d left`}</>
        )}
      </span>
      {sla.escalated && (
        <span
          style={{ fontSize: 11, fontWeight: 700, color: 'var(--rust)', lineHeight: 1.35 }}
          title="A breached urgent ticket escalates to the L&D Director (BR-HRBP-062)"
        >
          <i className="ti ti-arrow-up-right" /> Escalated to L&amp;D
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nine-box talent grid (BR-HRBP-040 → 042)
// ---------------------------------------------------------------------------
const PERF_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High' };

export function NineBoxGrid({ placements, onSelectBox, selectedBoxKey }) {
  // placements: [{ user, placement }]
  const buckets = {};
  placements.forEach((p) => {
    const key = `${p.placement.performanceBand}-${p.placement.potentialBand}`;
    buckets[key] = buckets[key] || [];
    buckets[key].push(p);
  });

  return (
    <div className="card card-pad">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Nine-Box talent grid ({placements.length} employees in scope)</div>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '3px 0 0', maxWidth: 760 }}>
          Performance is measured from delivery: mandatory compliance, mean assessment score and on-time completion.
          Potential is measured from learning behaviour: completions per year of service, breadth across skill domains,
          and the share of learning at or above the employee&apos;s own job level. Both are platform-derived proxies and are
          advisory input to the HRBP conversation, never an automated decision.
          {' '}<RuleTag id="BR-HRBP-040" /> <RuleTag id="BR-HRBP-041" />
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--ink-faint)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            paddingBottom: 22,
          }}
        >
          Performance
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[3, 2, 1].map((perfBand) =>
              [1, 2, 3].map((potBand) => {
                const key = `${perfBand}-${potBand}`;
                const box = NINE_BOX[key];
                const people = buckets[key] || [];
                const active = selectedBoxKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectBox(active ? null : key)}
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      padding: '10px 12px',
                      minHeight: 84,
                      borderRadius: 8,
                      border: active ? '2px solid var(--blue)' : '1px solid var(--line)',
                      background: people.length > 0 ? `var(--${box.tone}-soft)` : 'var(--paper-sunken)',
                      color: people.length > 0 ? `var(--${box.tone}-soft-text)` : 'var(--ink-faint)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{box.label}</span>
                    <span style={{ fontSize: 22, fontWeight: 800 }}>{people.length}</span>
                  </button>
                );
              })
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 6 }}>
            {[1, 2, 3].map((b) => (
              <div key={b} style={{ fontSize: 11, textAlign: 'center', color: 'var(--ink-faint)', fontWeight: 600 }}>
                {PERF_LABELS[b]} potential
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedBoxKey && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            {NINE_BOX[selectedBoxKey]?.label} &middot; {(buckets[selectedBoxKey] || []).length} employee(s)
          </div>
          <div className="grid grid-3" style={{ gap: 8 }}>
            {(buckets[selectedBoxKey] || []).slice(0, 12).map(({ user, placement }) => (
              <div key={user.userId} style={{ padding: '8px 10px', background: 'var(--paper-sunken)', borderRadius: 6, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{user.fullName}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{user.position}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>
                  Performance {placement.performance.score} &middot; Potential {placement.potential.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bench strength (BR-HRBP-050 → 052)
// ---------------------------------------------------------------------------
export function BenchStrengthPanel({ bench, concentration }) {
  return (
    <div className="card card-pad">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Bench strength by target role ({bench.length} key roles)</div>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '3px 0 0', maxWidth: 760 }}>
          Coverage is measured against a target of {READY_SUCCESSOR_TARGET} ready successors per key role, using the derived
          readiness rather than the stored one, so the bench obeys the same gates as the pipeline.
          {' '}<RuleTag id="BR-HRBP-050" /> <RuleTag id="BR-HRBP-051" />
        </p>
      </div>

      <table className="table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Target role</th>
            <th style={{ width: 110 }}>Candidates</th>
            <th style={{ width: 110 }}>Ready now</th>
            <th style={{ minWidth: 150 }}>Coverage vs target</th>
            <th style={{ width: 180 }}>Risk</th>
          </tr>
        </thead>
        <tbody>
          {bench.map((row) => (
            <tr key={row.targetRole}>
              <td>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{row.targetRole}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                  Mentor(s): {row.mentors.join(', ') || 'none assigned'}
                </div>
              </td>
              <td style={{ fontWeight: 600 }}>{row.candidateCount}</td>
              <td style={{ fontWeight: 700, color: row.readyNow > 0 ? 'var(--sage)' : 'var(--rust)' }}>{row.readyNow}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <ProgressBar value={row.coverage} tone={row.coverage >= 100 ? 'sage' : row.coverage > 0 ? 'amber' : 'rust'} size="sm" />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 38 }}>{row.coverage}%</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>
                  {row.readyNow} of {READY_SUCCESSOR_TARGET} required
                </div>
              </td>
              <td>
                <Badge tone={RISK_TONE[row.risk] || 'slate'} size="sm">{RISK_LABEL[row.risk] || row.risk}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {concentration.length > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', borderRadius: 8, fontSize: 12 }}>
          <strong>Mentor concentration risk</strong> <RuleTag id="BR-HRBP-052" />
          <div style={{ marginTop: 4 }}>
            {concentration.map((c) => `${c.mentor} carries ${c.count} candidates`).join(' · ')} — the development plan depends
            on a single person&apos;s availability.
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Derived readiness cell for the succession table (BR-HRBP-033 → 035)
// ---------------------------------------------------------------------------
export function ReadinessCell({ derived }) {
  if (!derived) return null;
  const tone =
    derived.readiness === 'READY_NOW' ? 'sage' : derived.readiness === 'READY_IN_6_MONTHS' ? 'amber' : 'blue';

  return (
    <div>
      <Badge tone={tone} size="sm">{derived.label}</Badge>
      {derived.divergesFromStored && (
        <div style={{ fontSize: 11, color: 'var(--rust)', marginTop: 4, fontWeight: 600 }}>
          <i className="ti ti-alert-triangle" /> HRBP entry said {derived.storedReadiness}
        </div>
      )}
      {derived.blockers.length > 0 && (
        <div style={{ marginTop: 5 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>
            {derived.blockers.length} blocker(s):
          </div>
          <ul style={{ margin: '2px 0 0', paddingLeft: 14 }}>
            {derived.blockers.map((b) => (
              <li key={b.code} style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                {b.label} <RuleTag id={b.rule} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {derived.blockers.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 4, fontWeight: 600 }}>
          <i className="ti ti-check" /> Every readiness gate met
        </div>
      )}
    </div>
  );
}

/** The 70-20-10 split, showing which component the platform actually measured. */
export function BlendCell({ derived, formal }) {
  if (!derived) return null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <ProgressBar value={derived.blended} tone={derived.blended >= 85 ? 'sage' : derived.blended >= 70 ? 'amber' : 'blue'} size="sm" />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 32 }}>{derived.blended}%</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3, lineHeight: 1.45 }}>
        <span title="Captured by the HRBP in the 1-on-1 review">70% OJT: {derived.ojt70}%</span> &middot;{' '}
        <span title="Captured by the HRBP in the 1-on-1 review">20% Mentoring: {derived.mentoring20}%</span> &middot;{' '}
        <strong style={{ color: 'var(--blue)' }} title="Derived from the assigned curriculum — the only component the LMS can measure">
          10% Formal: {derived.formal10}%
        </strong>
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 2 }}>
        {formal?.curriculumTitle ? `Curriculum: ${formal.curriculumTitle}` : 'No curriculum assigned'} <RuleTag id="BR-HRBP-031" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Business rule reference
// ---------------------------------------------------------------------------
export function HrbpRuleReference() {
  const [open, setOpen] = useState(false);

  return (
    <div className="card card-pad" style={{ marginTop: 20 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          padding: 0,
          color: 'var(--ink)',
        }}
      >
        <span style={{ textAlign: 'left' }}>
          <span style={{ fontSize: 15, fontWeight: 800, display: 'block' }}>
            HRBP business rules ({HRBP_RULES.length} rules)
          </span>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 400 }}>
            Every number on these four tabs is produced by one of these rules. Each rule id is cited next to the figure it drives.
          </span>
        </span>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 18, color: 'var(--ink-soft)' }} />
      </button>

      {open && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {HRBP_RULE_GROUPS.map((group) => {
            const rules = HRBP_RULES.filter((r) => r.group === group);
            if (rules.length === 0) return null;
            return (
              <div key={group}>
                <div className="section-label" style={{ marginBottom: 8 }}>{group}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      style={{ padding: '10px 14px', background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <RuleTag id={rule.id} />
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{rule.title}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.55 }}>{rule.statement}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
