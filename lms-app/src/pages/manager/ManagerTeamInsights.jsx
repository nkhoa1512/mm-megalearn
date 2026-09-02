// ===========================================================================
// MANAGER TEAM INSIGHTS — presentational layer for the Line Manager rules.
//
// Every figure rendered here comes from src/utils/managerRules.js and cites the
// rule that produced it, so a manager can always see why a number says what it
// says — and why somebody is, or is not, on their list today.
// ===========================================================================

import React, { useState } from 'react';
import { Badge, Button, ProgressBar } from '../../features/common/ui';
import {
  MANAGER_RULES,
  MANAGER_RULE_GROUPS,
  MEMBER_STATUS_LABELS,
  RELATIONSHIP,
  INACTIVITY_THRESHOLD_DAYS,
  NUDGE_COOLDOWN_DAYS,
} from '../../utils/managerRules';

const STATUS_TONE = {
  OVERDUE: 'rust',
  FAILED: 'rust',
  NOT_STARTED: 'slate',
  IN_PROGRESS: 'amber',
  COMPLETED: 'sage',
};

/** A small inline citation, e.g. "BR-MGR-002". */
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
// Team scope (BR-MGR-001 → 004)
// ---------------------------------------------------------------------------
export function TeamScopeBar({ manager, team }) {
  return (
    <div
      className="card card-pad"
      style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-users" style={{ color: 'var(--amber)', fontSize: 18 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Team in scope</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
            {team.departmentName || manager?.departmentName || 'Department'}
            {team.divisionName ? ` · ${team.divisionName}` : ''} <RuleTag id="BR-MGR-001" />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge tone="amber" size="sm">Direct reports: {team.directReports}</Badge>
        <Badge tone="slate" size="sm">Department members: {team.departmentMembers}</Badge>
      </div>

      {team.codeReuse > 1 && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-soft)',
            background: 'var(--paper-sunken)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '6px 10px',
            maxWidth: 460,
            lineHeight: 1.45,
          }}
        >
          Membership is resolved on the department <b>instance</b>, not its code: <code>{team.departmentCode}</code> is
          reused by <b>{team.codeReuse} divisions</b> across the network, so matching the code alone would pull in other
          stores. <RuleTag id="BR-MGR-002" />
        </div>
      )}

      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{team.members.length}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>employees on the roster</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI row
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

export function ManagerKpiRow({ summary, attentionCount }) {
  const mandatoryTone = summary.mandatoryPercent >= 88 ? 'sage' : summary.mandatoryPercent >= 70 ? 'amber' : 'rust';
  return (
    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <KpiTile
        icon="ti-shield-check"
        tone={mandatoryTone}
        value={`${summary.mandatoryPercent}%`}
        label="Mandatory training compliance"
        sub={`${summary.mandatoryCompliantPeople} of ${summary.headcount} fully compliant`}
        ruleId="BR-MGR-012"
      />
      <KpiTile
        icon="ti-progress"
        tone="blue"
        value={`${summary.completionPercent}%`}
        label="Assigned courses completed"
        sub={`${summary.completed} of ${summary.assigned} enrollments across the team`}
        ruleId="BR-MGR-010"
      />
      <KpiTile
        icon="ti-alert-triangle"
        tone={attentionCount > 0 ? 'rust' : 'sage'}
        value={attentionCount}
        label="Employees needing action today"
        sub={`${summary.overduePeople} overdue · ${summary.failedPeople} retake blocked · ${summary.inactivePeople} inactive`}
        ruleId="BR-MGR-020"
      />
      <KpiTile
        icon="ti-star"
        tone="sage"
        value={summary.averageScore === null ? '—' : `${summary.averageScore}%`}
        label="Average assessment score"
        sub={
          summary.averageScore === null
            ? 'No scores recorded for this team yet'
            : `From ${summary.scoredPeople} of ${summary.headcount} employees with recorded scores`
        }
        ruleId="BR-MGR-013"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attention queue (BR-MGR-020 → 024)
// ---------------------------------------------------------------------------
export function AttentionQueue({ items, onRemind, onViewMember, onViewRoadmap, reminderState }) {
  return (
    <div className="card card-pad">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>
          Needs action today ({items.length} employee{items.length === 1 ? '' : 's'})
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '3px 0 0', maxWidth: 780 }}>
          Ranked by what costs the store most: overdue mandatory training first, then exhausted assessment attempts, then
          prolonged inactivity, then deadlines inside two weeks that nobody has started. Each employee appears once, under
          their most severe reason. <RuleTag id="BR-MGR-020" /> <RuleTag id="BR-MGR-024" />
        </p>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
          Nobody on this team has an open item. Nothing to chase today.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item) => {
            const reminder = reminderState ? reminderState(item) : { allowed: true, label: 'Send a reminder' };
            return (
              <div
                key={item.userId}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--paper-sunken)',
                  border: '1px solid var(--line)',
                  borderLeft: `3px solid var(--${item.tone})`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>{item.employeeCode}</span>
                    <Badge tone={item.tone} size="sm">{item.label}</Badge>
                    {item.relationship === RELATIONSHIP.DIRECT_REPORT && (
                      <Badge tone="amber" size="sm">Direct report</Badge>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{item.reason}</div>

                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
                    {item.state.completed} of {item.state.assigned} assigned course(s) complete
                    {' · '}mandatory {item.state.mandatoryCompleted}/{item.state.mandatoryRequired}
                    {item.state.averageScore !== null && <> · average score {item.state.averageScore}%</>}
                  </div>

                  <div style={{ fontSize: 12, marginTop: 5, color: 'var(--ink)' }}>
                    <i className="ti ti-arrow-narrow-right" style={{ color: `var(--${item.tone})` }} />{' '}
                    <b>Recommended action:</b> {item.action} <RuleTag id={item.rule} />
                  </div>

                  {item.alsoFlagged?.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 5 }}>
                      Also flagged: {item.alsoFlagged.map((a) => a.label).join(' · ')}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button size="sm" variant="ghost" icon="ti-eye" onClick={() => onViewMember(item)}>Detail</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="ti-map-2"
                      title="View this employee's job level roadmap"
                      onClick={() => onViewRoadmap(item)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant={reminder.allowed ? 'primary' : 'outline'}
                    icon="ti-bell"
                    disabled={!reminder.allowed}
                    title={reminder.label}
                    onClick={() => reminder.allowed && onRemind(item)}
                  >
                    Remind
                  </Button>
                  {!reminder.allowed && (
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)', maxWidth: 130, textAlign: 'right', lineHeight: 1.3 }}>
                      {reminder.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roster (BR-MGR-010 → 015)
// ---------------------------------------------------------------------------
export function TeamRoster({ members, onViewTranscript, onViewRoadmap }) {
  return (
    <div className="card card-pad">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Team roster ({members.length})</div>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '3px 0 0', maxWidth: 780 }}>
          Every figure below counts the employee&apos;s whole assigned course load, not one sampled course. A member with
          nothing scored shows no average rather than a placeholder. <RuleTag id="BR-MGR-010" /> <RuleTag id="BR-MGR-013" />
        </p>
      </div>

      {members.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
          No employee resolves to this manager&apos;s team. Nobody is shown rather than borrowing another department&apos;s
          staff to fill the page. <RuleTag id="BR-MGR-003" />
        </div>
      ) : (
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Employee</th>
              <th style={{ width: 120 }}>Relationship</th>
              <th style={{ minWidth: 150 }}>Assigned courses</th>
              <th style={{ width: 120 }}>Mandatory</th>
              <th style={{ width: 90 }}>Avg score</th>
              <th style={{ width: 120 }}>Last activity</th>
              <th style={{ width: 120 }}>Status</th>
              <th style={{ textAlign: 'right', width: 90 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(({ user, relationship, relationshipLabel, state }) => (
              <tr key={user.userId}>
                <td>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{user.fullName}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    <span style={{ fontFamily: 'monospace' }}>{user.employeeCode}</span> · {user.position}
                  </div>
                </td>
                <td>
                  <Badge tone={relationship === RELATIONSHIP.DIRECT_REPORT ? 'amber' : 'slate'} size="sm">
                    {relationshipLabel}
                  </Badge>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <ProgressBar
                        value={state.completionPercent}
                        tone={state.completionPercent >= 80 ? 'sage' : state.completionPercent >= 50 ? 'amber' : 'rust'}
                        size="sm"
                      />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 38 }}>{state.completionPercent}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>
                    {state.completed} of {state.assigned} assigned
                    {state.overdue > 0 && <span style={{ color: 'var(--rust)' }}> · {state.overdue} overdue</span>}
                    {state.failed > 0 && <span style={{ color: 'var(--rust)' }}> · {state.failed} retake blocked</span>}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 13, fontWeight: 700, color: state.mandatoryCompliant ? 'var(--sage)' : 'var(--rust)' }}>
                    {state.mandatoryCompleted}/{state.mandatoryRequired}
                  </div>
                  {state.mandatoryNotAssigned > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--rust)' }}>{state.mandatoryNotAssigned} never assigned</div>
                  )}
                </td>
                <td style={{ fontSize: 13, fontWeight: 600 }}>
                  {state.averageScore === null
                    ? <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>Not scored</span>
                    : `${state.averageScore}%`}
                </td>
                <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {state.lastActivity || <span style={{ color: 'var(--ink-faint)' }}>Never</span>}
                  {state.inactiveDays !== null && state.inactiveDays >= INACTIVITY_THRESHOLD_DAYS && state.assigned > state.completed && (
                    <div style={{ fontSize: 11, color: 'var(--amber-soft-text)' }}>{state.inactiveDays} days ago</div>
                  )}
                </td>
                <td>
                  <Badge tone={STATUS_TONE[state.status] || 'slate'} size="sm">
                    {MEMBER_STATUS_LABELS[state.status] || state.status}
                  </Badge>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="ti-file-text"
                      title="Detail — this employee's full course list and transcript"
                      onClick={() => onViewTranscript(user)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="ti-map-2"
                      title="View this employee's job level roadmap"
                      onClick={() => onViewRoadmap(user)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Business rule reference
// ---------------------------------------------------------------------------
export function ManagerRuleReference() {
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
            Line Manager business rules ({MANAGER_RULES.length} rules)
          </span>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 400 }}>
            Every number on this screen is produced by one of these rules, including what a manager may and may not do.
            Reminders carry a {NUDGE_COOLDOWN_DAYS}-day cooldown.
          </span>
        </span>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 18, color: 'var(--ink-soft)' }} />
      </button>

      {open && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {MANAGER_RULE_GROUPS.map((group) => {
            const rules = MANAGER_RULES.filter((r) => r.group === group);
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
