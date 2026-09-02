import React, { useMemo, useState } from 'react';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, StatCard, ProgressBar, BarChart, DonutChart, Modal } from '../../features/common/ui';
import { downloadCsv } from '../../lib/exportCsv';
import { normalizeRole, hasCapability } from '../../data/roles';
import {
  formatVnd,
  formatVndShort,
  pricingOf,
  summarizeLedger,
  scopeLedgerForUser,
  summarizeLearnerCosts,
  buildEmployeeCostExportRows,
  COST_TYPE,
  COST_TYPE_META,
  TXN_TYPE,
  TXN_SOURCE,
  TXN_SOURCE_META,
  FISCAL_YEAR,
} from '../../utils/costCenter';

const PAGE_SIZE = 20;

const TABS = [
  { id: 'OVERVIEW', label: 'Income & Expense Overview', icon: 'ti-report-money' },
  { id: 'CENTERS', label: 'By Cost Center', icon: 'ti-building-bank' },
  { id: 'PRICING', label: 'Course Price List', icon: 'ti-tag' },
  { id: 'EMPLOYEES', label: 'By Employee (HR Export)', icon: 'ti-users' },
  { id: 'LEDGER', label: 'Transaction Ledger', icon: 'ti-list-details' },
];

function utilizationTone(percent) {
  if (percent >= 100) return 'rust';
  if (percent >= 85) return 'amber';
  return 'sage';
}

export default function AdminCostCenter() {
  const {
    currentUser,
    users = [],
    costCenters = [],
    costLedger = [],
    costReport,
    courses = [],
    updateCoursePricing,
  } = useCourseStore();

  const role = normalizeRole(currentUser?.role);
  const canView = hasCapability(role, 'canViewCostCenter');
  const seeAll = hasCapability(role, 'canViewAllCostCenters');
  const canManage = hasCapability(role, 'canManageCostCenter');

  const [activeTab, setActiveTab] = useState('OVERVIEW');

  // A Manager only sees the training cost of their own Division.
  const scopedLedger = useMemo(
    () => scopeLedgerForUser(costLedger, currentUser, { seeAll }),
    [costLedger, currentUser, seeAll]
  );
  const scopedCenters = useMemo(
    () =>
      seeAll
        ? costCenters
        : costCenters.filter(
            (c) => c.divisionId === currentUser?.divisionId || c.code === currentUser?.costCenterCode
          ),
    [costCenters, currentUser, seeAll]
  );
  // Only exports/lists employees within the Manager's own Division — the same scope as the ledger.
  const scopedUsers = useMemo(
    () => (seeAll ? users : users.filter((u) => u.divisionId === currentUser?.divisionId)),
    [users, currentUser, seeAll]
  );
  const report = useMemo(
    () => (seeAll ? costReport : summarizeLedger(scopedLedger, { costCenters: scopedCenters, courses })),
    [seeAll, costReport, scopedLedger, scopedCenters, courses]
  );

  if (!canView) {
    return (
      <div className="card card-pad empty-state" style={{ margin: '40px auto', maxWidth: 540, textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--rust-soft)', color: 'var(--rust)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>
          <i className="ti ti-lock" aria-hidden="true" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
          Access Restricted
        </h2>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          The Training Cost Center is an internal financial report, reserved for <strong>People Administration (User Admin)</strong> and <strong>System Administration (System Admin)</strong>. The other roles (Learner, Manager, Trainer, HRBP) cannot access this page.
        </p>
        <Button variant="primary" icon="ti-arrow-left" onClick={() => window.history.back()}>
          Back To Previous Page
        </Button>
      </div>
    );
  }

  const { totals } = report;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Training Cost Center</h1>
            <Badge tone="amber" icon="ti-report-money">Cost Center · Fiscal year {FISCAL_YEAR}</Badge>
            {!seeAll && (
              <Badge tone="blue" icon="ti-filter">
                Scope: {currentUser?.divisionName || 'Your department'}
                {currentUser?.costCenterCode ? ` · Code ${currentUser.costCenterCode}` : ''}
              </Badge>
            )}
          </div>
          <p>
            Each Division owns exactly one 5-digit Cost Center code issued by HR. When a learner enrolls in a course{' '}
            <strong>paid</strong>, the full tuition is paid by <strong>paid by the company</strong> — debited straight to the code of that
            learner's Division; the learner pays nothing. A course <strong>free</strong> is still recorded
            as an enrollment at zero cost, so internal content can be compared against externally purchased content.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
              color: activeTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: activeTab === tab.id ? 'var(--rail)' : 'var(--line-strong)',
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

      {activeTab === 'OVERVIEW' && <OverviewTab report={report} totals={totals} />}
      {activeTab === 'CENTERS' && <CostCentersTab report={report} />}
      {activeTab === 'PRICING' && (
        <PricingTab report={report} courses={courses} canManage={canManage} updateCoursePricing={updateCoursePricing} />
      )}
      {activeTab === 'EMPLOYEES' && <EmployeesTab ledger={scopedLedger} users={scopedUsers} />}
      {activeTab === 'LEDGER' && <LedgerTab ledger={scopedLedger} centers={scopedCenters} />}
    </>
  );
}

// ===========================================================================
// TAB 1 — OVERVIEW
// ===========================================================================

function OverviewTab({ report, totals }) {
  const topCenters = report.byCostCenter.filter((c) => c.spent > 0).slice(0, 8);
  const topCourses = report.byCourse.filter((c) => c.spent > 0).slice(0, 8);

  return (
    <>
      <div className="grid grid-4" style={{ gap: 16, marginBottom: 20 }}>
        <StatCard
          label="Total Income (Budget Granted)"
          value={formatVndShort(totals.income)}
          tone="sage"
          icon="ti-wallet"
          sublabel={`Fiscal year ${FISCAL_YEAR}`}
        />
        <StatCard
          label="Total Spend (Used)"
          value={formatVndShort(totals.expense)}
          tone="rust"
          icon="ti-cash-off"
          sublabel={`${totals.paidEnrollments.toLocaleString('en-US')} paid enrollments`}
        />
        <StatCard
          label="Remaining Balance"
          value={formatVndShort(totals.balance)}
          tone={totals.balance < 0 ? 'rust' : 'blue'}
          icon="ti-pig-money"
          sublabel={totals.balance < 0 ? 'Budget overspent' : 'Available until year end'}
        />
        <StatCard
          label="Budget Utilization Rate"
          value={`${totals.utilization}%`}
          tone={utilizationTone(totals.utilization)}
          icon="ti-percentage"
          sublabel={`Average cost ${formatVndShort(totals.costPerLearner)} / learner`}
        />
      </div>

      <div className="grid grid-3" style={{ gap: 16, marginBottom: 20 }}>
        <StatCard
          label="Paid Enrollments"
          value={totals.paidEnrollments.toLocaleString('en-US')}
          tone="amber"
          icon="ti-coin"
          sublabel="Draws on the training budget"
        />
        <StatCard
          label="Free Enrollments"
          value={totals.freeEnrollments.toLocaleString('en-US')}
          tone="sage"
          icon="ti-gift"
          sublabel="MMVN internal content · zero cost"
        />
        <StatCard
          label="Learners Incurring Cost"
          value={totals.distinctLearners.toLocaleString('en-US')}
          tone="blue"
          icon="ti-users"
          sublabel={`${totals.txnCount.toLocaleString('en-US')} ledger entries`}
        />
      </div>

      <div className="grid grid-2" style={{ gap: 16, marginBottom: 20 }}>
        <div className="card card-pad">
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Training Cost By Month</div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 0, marginBottom: 14 }}>
            Total amount debited to the cost centers each month (millions of VND).
          </p>
          <BarChart
            data={report.byMonth.map((m) => ({ label: m.label, value: Math.round(m.value / 1e6), detail: `${m.label}: ${formatVnd(m.value)}` }))}
            valueSuffix=" tr"
            tone="amber"
          />
        </div>

        <div className="card card-pad">
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Spend Breakdown By Cost Type</div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 0, marginBottom: 14 }}>
            Where the money goes: external platform licences or the cost of running in-person classes.
          </p>
          {report.byCostType.filter((t) => t.amount > 0).length === 0 ? (
            <div className="empty-state" style={{ padding: 12 }}><p>No cost incurred yet.</p></div>
          ) : (
            <>
              <DonutChart
                data={report.byCostType
                  .filter((t) => t.amount > 0)
                  .map((t) => ({
                    label: COST_TYPE_META[t.costType]?.labelVi || t.costType,
                    value: Math.round(t.amount / 1e6),
                    tone: COST_TYPE_META[t.costType]?.tone || 'rail',
                  }))}
                valueSuffix=" tr"
              />
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {report.byCostType.filter((t) => t.amount > 0).map((t) => (
                  <div key={t.costType} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>
                      <i className={`ti ${COST_TYPE_META[t.costType]?.icon || 'ti-coin'}`} style={{ marginRight: 6, color: 'var(--ink-soft)' }} />
                      {COST_TYPE_META[t.costType]?.labelVi || t.costType} &middot; {t.count.toLocaleString('en-US')} enrollments
                    </span>
                    <strong>{formatVnd(t.amount)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 16 }}>
        <div className="card card-pad">
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Top Spending Cost Centers</div>
          {topCenters.length === 0 ? (
            <div className="empty-state" style={{ padding: 12 }}><p>No cost center has incurred spending yet.</p></div>
          ) : (
            <BarChart
              data={topCenters.map((c) => ({
                label: c.name,
                value: Math.round(c.spent / 1e6),
                detail: `${c.name}: ${formatVnd(c.spent)} / ${formatVnd(c.budget)} (${c.utilization}%)`,
                tone: utilizationTone(c.utilization),
              }))}
              valueSuffix=" tr"
            />
          )}
        </div>

        <div className="card card-pad">
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Most Budget-Intensive Courses</div>
          {topCourses.length === 0 ? (
            <div className="empty-state" style={{ padding: 12 }}><p>No paid course has been enrolled in yet.</p></div>
          ) : (
            <BarChart
              data={topCourses.map((c) => ({
                label: c.title,
                value: Math.round(c.spent / 1e6),
                detail: `${c.title}: ${c.seats} seats × ${formatVnd(c.unitPrice)} = ${formatVnd(c.spent)}`,
                tone: 'blue',
              }))}
              valueSuffix=" tr"
            />
          )}
        </div>
      </div>
    </>
  );
}

// ===========================================================================
// TAB 2 — BY COST CENTER
// ===========================================================================

function CostCentersTab({ report }) {
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('ALL');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return report.byCostCenter.filter((c) => {
      if (branch !== 'ALL' && c.branch !== branch) return false;
      if (!q) return true;
      return `${c.code} ${c.name}`.toLowerCase().includes(q);
    });
  }, [report.byCostCenter, query, branch]);

  function exportRows() {
    downloadCsv(
      `cost-center-summary-${FISCAL_YEAR}.csv`,
      rows.map((c) => ({
        'Cost Center Code (5 digits)': c.code,
        'Cost Center (Division)': c.name,
        Division: c.branchName || c.branch,
        'Location': c.location || '',
        'Employee': c.headcount,
        'Budget (VND)': c.budget,
        'Spent (VND)': c.spent,
        'Remaining (VND)': c.remaining,
        'Utilization (%)': c.utilization,
        'Paid Enrollments': c.paidEnrollments,
        'Free Enrollments': c.freeEnrollments,
        'Learner': c.learners,
      }))
    );
  }

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Budget &amp; Utilization By Cost Center</div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
            Each Division owns exactly one 5-digit Cost Center code issued by HR. The annual budget is granted per head of the division.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="field-input" value={branch} onChange={(e) => setBranch(e.target.value)} style={{ fontSize: 13 }}>
            <option value="ALL">All divisions</option>
            <option value="OPERATIONS">Store Operations Division</option>
            <option value="SUPPORTING">Supporting Functions Division</option>
          </select>
          <input
            className="field-input"
            placeholder="Search center code / name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ fontSize: 13, minWidth: 220 }}
          />
          <Button size="sm" variant="outline" icon="ti-download" onClick={exportRows}>Export CSV</Button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Cost Center</th>
              <th style={{ textAlign: 'right' }}>Employee</th>
              <th style={{ textAlign: 'right' }}>Budget</th>
              <th style={{ textAlign: 'right' }}>Spent</th>
              <th style={{ textAlign: 'right' }}>Remaining</th>
              <th style={{ minWidth: 150 }}>Utilization</th>
              <th style={{ textAlign: 'right' }}>Enrollments</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</span>
                    <Badge tone="slate" size="sm">{c.code}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {c.branchName || c.branch}
                    {c.location ? ` · ${c.location}` : ''}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>{c.headcount}</td>
                <td style={{ textAlign: 'right' }}>{formatVndShort(c.budget)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatVndShort(c.spent)}</td>
                <td style={{ textAlign: 'right', color: c.remaining < 0 ? 'var(--rust)' : 'var(--ink)' }}>
                  {formatVndShort(c.remaining)}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 70 }}>
                      <ProgressBar value={Math.min(100, c.utilization)} tone={utilizationTone(c.utilization)} size="sm" />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 46, textAlign: 'right' }}>{c.utilization}%</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontSize: 12 }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{c.paidEnrollments}</span>
                  {' paid · '}
                  <span style={{ color: 'var(--sage)', fontWeight: 700 }}>{c.freeEnrollments}</span>
                  {' free'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 20 }}>
                  No cost center matches the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===========================================================================
// TAB 3 — COURSE PRICE LIST
// ===========================================================================

function PricingTab({ report, courses, canManage, updateCoursePricing }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | PAID | FREE
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null);

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return report.byCourse.filter((c) => {
      if (filter === 'PAID' && c.isFree) return false;
      if (filter === 'FREE' && !c.isFree) return false;
      if (!q) return true;
      return `${c.courseCode} ${c.title}`.toLowerCase().includes(q);
    });
  }, [report.byCourse, query, filter]);

  const paged = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paidCount = report.byCourse.filter((c) => !c.isFree).length;
  const freeCount = report.byCourse.length - paidCount;

  function resetPage(fn) {
    return (value) => {
      fn(value);
      setPage(0);
    };
  }

  function exportRows() {
    downloadCsv(
      `course-pricing-${FISCAL_YEAR}.csv`,
      rows.map((c) => ({
        'Course Code': c.courseCode,
        'Course Name': c.title,
        'Area': c.category || '',
        'Cost Type': COST_TYPE_META[c.costType]?.labelVi || c.costType || '',
        'Free': c.isFree ? 'Yes' : 'No',
        'Price / Seat (VND)': c.unitPrice,
        'Enrollments': c.seats,
        'Total Spend (VND)': c.spent,
      }))
    );
  }

  return (
    <>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Course Price List (Company-Paid)</div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
              {paidCount} course paid &middot; {freeCount} course free. The prices below are what the company pays for
              each seat — the learner pays nothing.{' '}
              {canManage
                ? 'Click "Edit price" to set a price or make the course free — the new price applies only to later enrollments.'
                : 'Only User Admin / System Admin may edit prices.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="field-input" value={filter} onChange={(e) => resetPage(setFilter)(e.target.value)} style={{ fontSize: 13 }}>
              <option value="ALL">All courses</option>
              <option value="PAID">Paid courses only</option>
              <option value="FREE">Free courses only</option>
            </select>
            <input
              className="field-input"
              placeholder="Search course code / name..."
              value={query}
              onChange={(e) => resetPage(setQuery)(e.target.value)}
              style={{ fontSize: 13, minWidth: 220 }}
            />
            <Button size="sm" variant="outline" icon="ti-download" onClick={exportRows}>Export CSV</Button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Cost Type</th>
                <th style={{ textAlign: 'right' }}>Company Paid / Learner</th>
                <th style={{ textAlign: 'right' }}>Enrollments</th>
                <th style={{ textAlign: 'right' }}>Total Spend</th>
                {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.courseId}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {c.courseCode}{c.category ? ` · ${c.category}` : ''}
                    </div>
                  </td>
                  <td>
                    <Badge tone={COST_TYPE_META[c.costType]?.tone || 'slate'} icon={COST_TYPE_META[c.costType]?.icon} size="sm">
                      {COST_TYPE_META[c.costType]?.labelVi || c.costType}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: c.isFree ? 'var(--sage)' : 'var(--ink)' }}>
                    {c.isFree ? 'Free' : formatVnd(c.unitPrice)}
                  </td>
                  <td style={{ textAlign: 'right' }}>{c.seats.toLocaleString('en-US')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.spent > 0 ? formatVndShort(c.spent) : '—'}</td>
                  {canManage && (
                    <td style={{ textAlign: 'right' }}>
                      <Button size="sm" variant="ghost" icon="ti-pencil" onClick={() => setEditing(courseById.get(c.courseId) || null)}>
                        Edit price
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 20 }}>
                    No course matches the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageCount={pageCount} total={rows.length} onChange={setPage} />
      </div>

      {/* keyed by course: opening a different course remounts the modal so the form reloads the price. */}
      <PricingEditorModal
        key={editing?.id || 'none'}
        course={editing}
        onClose={() => setEditing(null)}
        onSave={(pricing) => {
          updateCoursePricing(editing.id, pricing);
          setEditing(null);
        }}
      />
    </>
  );
}

function PricingEditorModal({ course, onClose, onSave }) {
  const current = course ? pricingOf(course) : null;
  const [isFree, setIsFree] = useState(current?.isFree ?? true);
  const [price, setPrice] = useState(String(current?.price ?? 0));
  const [costType, setCostType] = useState(
    current && !current.isFree ? current.costType : COST_TYPE.EXTERNAL_LICENSE
  );
  const [vendor, setVendor] = useState(current?.vendor || '');

  if (!course) return null;

  const parsedPrice = Math.max(0, Number(String(price).replace(/[^\d]/g, '')) || 0);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Set The Course Price"
      subtitle={`${course.code} · ${course.title}`}
      size="sm"
      footer={
        <Button variant="primary" icon="ti-device-floppy" onClick={() => onSave({ isFree, price: parsedPrice, costType, vendor })}>
          Save Price List
        </Button>
      }
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
        <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
        Free course (no budget is drawn when a learner enrolls)
      </label>

      {!isFree && (
        <>
          <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>
            Cost paid by the company per learner (VND)
          </label>
          <input
            className="field-input"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ width: '100%', marginBottom: 4 }}
          />
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
            Amount: <strong>{formatVnd(parsedPrice)}</strong>
          </div>

          <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>Cost type</label>
          <select className="field-input" value={costType} onChange={(e) => setCostType(e.target.value)} style={{ width: '100%', marginBottom: 14 }}>
            {Object.entries(COST_TYPE_META)
              .filter(([id]) => id !== COST_TYPE.INTERNAL_FREE)
              .map(([id, meta]) => (
                <option key={id} value={id}>{meta.labelVi}</option>
              ))}
          </select>

          <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>Vendor / Organizer</label>
          <input
            className="field-input"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g. Coursera for Business"
            style={{ width: '100%', marginBottom: 14 }}
          />
        </>
      )}

      <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--ink-soft)' }}>
        <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--blue)' }} />
        Every cost is paid by the Cost Center (5-digit code) of the learner's Division — learners never pay.
        A new price applies only to enrollments created after saving; entries already in the ledger keep the
        price at the time of enrollment so historical reports stay accurate.
      </div>
    </Modal>
  );
}

// ===========================================================================
// TAB 4 — BY EMPLOYEE (the export for HR / Accounting / Audit)
// ===========================================================================

function EmployeesTab({ ledger, users }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | PAID | UNPAID
  const [page, setPage] = useState(0);

  const learnerRows = useMemo(() => summarizeLearnerCosts(ledger, users), [ledger, users]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return learnerRows.filter((r) => {
      if (filter === 'PAID' && r.companyPaid <= 0) return false;
      if (filter === 'UNPAID' && r.companyPaid > 0) return false;
      if (!q) return true;
      return `${r.personnelNumber || ''} ${r.fullName} ${r.costCenterCode || ''} ${r.divisionName || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [learnerRows, query, filter]);

  const paged = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const totalCompanyPaid = rows.reduce((s, r) => s + r.companyPaid, 0);

  function resetPage(fn) {
    return (value) => {
      fn(value);
      setPage(0);
    };
  }

  function exportRows() {
    downloadCsv(`employee-training-cost-${FISCAL_YEAR}.csv`, buildEmployeeCostExportRows(rows, { fiscalYear: FISCAL_YEAR }));
  }

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Training Cost By Employee</div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
            {rows.length.toLocaleString('en-US')} employees &middot; The company has spent{' '}
            <strong style={{ color: 'var(--rust)' }}>{formatVndShort(totalCompanyPaid)}</strong> for paid courses.
            Exports a CSV with exactly the 15 HR profile columns (Employee Status, Personnel Number, Cost center, Full Name, Entry
            Date, Gender, Date of birth, Business Email Address, Position, Level, HO/Store, Division, Department,
            Sub Department, Location) plus the training cost, ready for Accounting / Audit.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="field-input" value={filter} onChange={(e) => resetPage(setFilter)(e.target.value)} style={{ fontSize: 13 }}>
            <option value="ALL">All employees</option>
            <option value="PAID">Has incurred paid spending</option>
            <option value="UNPAID">Has never taken a paid course</option>
          </select>
          <input
            className="field-input"
            placeholder="Search employee code / name / cost center code..."
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            style={{ fontSize: 13, minWidth: 240 }}
          />
          <Button size="sm" variant="outline" icon="ti-download" onClick={exportRows}>Export CSV (HR)</Button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Cost Center Code</th>
              <th>Division / Department</th>
              <th style={{ textAlign: 'right' }}>Paid Enrollments</th>
              <th style={{ textAlign: 'right' }}>Free Enrollments</th>
              <th style={{ textAlign: 'right' }}>Company Spend</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.userId}>
                <td>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{r.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {r.personnelNumber || r.userId}{r.position ? ` · ${r.position}` : ''}
                  </div>
                </td>
                <td>
                  <Badge tone="slate" size="sm">{r.costCenterCode || 'UNASSIGNED'}</Badge>
                </td>
                <td style={{ fontSize: 13 }}>
                  {r.divisionName || '—'}
                  {r.departmentName ? <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{r.departmentName}</div> : null}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{r.paidEnrollments}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--sage)', fontWeight: 700 }}>{r.freeEnrollments}</span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: r.companyPaid > 0 ? 'var(--rust)' : 'var(--ink-faint)' }}>
                  {r.companyPaid > 0 ? formatVnd(r.companyPaid) : '—'}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 20 }}>
                  No employee matches the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageCount={pageCount} total={rows.length} onChange={setPage} />
    </div>
  );
}

// ===========================================================================
// TAB 5 — TRANSACTION LEDGER
// ===========================================================================

function LedgerTab({ ledger, centers }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('ALL'); // ALL | INCOME | EXPENSE | PAID | FREE
  const [centerId, setCenterId] = useState('ALL');
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ledger.filter((t) => {
      if (centerId !== 'ALL' && t.costCenterId !== centerId) return false;
      if (type === 'INCOME' && t.type !== TXN_TYPE.INCOME) return false;
      if (type === 'EXPENSE' && t.type !== TXN_TYPE.EXPENSE) return false;
      if (type === 'PAID' && !(t.source === TXN_SOURCE.ENROLLMENT && !t.isFree)) return false;
      if (type === 'FREE' && !(t.source === TXN_SOURCE.ENROLLMENT && t.isFree)) return false;
      if (!q) return true;
      return `${t.courseTitle || ''} ${t.userName || ''} ${t.costCenterName || ''} ${t.id}`.toLowerCase().includes(q);
    });
  }, [ledger, query, type, centerId]);

  const paged = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const filteredExpense = rows.filter((t) => t.type === TXN_TYPE.EXPENSE).reduce((s, t) => s + t.amount, 0);
  const filteredIncome = rows.filter((t) => t.type === TXN_TYPE.INCOME).reduce((s, t) => s + t.amount, 0);

  function resetPage(fn) {
    return (value) => {
      fn(value);
      setPage(0);
    };
  }

  function exportRows() {
    downloadCsv(
      `cost-center-ledger-${FISCAL_YEAR}.csv`,
      rows.map((t) => ({
        'Entry ID': t.id,
        Date: t.date,
        'Thu/Chi': t.type === TXN_TYPE.INCOME ? 'THU' : 'CHI',
        'Operations': TXN_SOURCE_META[t.source]?.labelVi || t.source,
        'Cost Center': t.costCenterName || '',
        'Course': t.courseTitle || '',
        'Learner': t.userName || '',
        'Cost Type': COST_TYPE_META[t.costType]?.labelVi || '',
        'Free': t.source === TXN_SOURCE.ENROLLMENT ? (t.isFree ? 'Yes' : 'No') : '',
        'Amount (VND)': t.amount,
      }))
    );
  }

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Income &ndash; Expense Ledger</div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
            {rows.length.toLocaleString('en-US')} ledger entries &middot; Income <strong style={{ color: 'var(--sage)' }}>{formatVndShort(filteredIncome)}</strong>
            {' '}&middot; Chi <strong style={{ color: 'var(--rust)' }}>{formatVndShort(filteredExpense)}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="field-input" value={type} onChange={(e) => resetPage(setType)(e.target.value)} style={{ fontSize: 13 }}>
            <option value="ALL">All ledger entries</option>
            <option value="INCOME">Income only</option>
            <option value="EXPENSE">Expenses only</option>
            <option value="PAID">Paid enrollment</option>
            <option value="FREE">Free enrollment</option>
          </select>
          <select className="field-input" value={centerId} onChange={(e) => resetPage(setCenterId)(e.target.value)} style={{ fontSize: 13, maxWidth: 220 }}>
            <option value="ALL">All cost centers</option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            className="field-input"
            placeholder="Search courses / learners..."
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            style={{ fontSize: 13, minWidth: 200 }}
          />
          <Button size="sm" variant="outline" icon="ti-download" onClick={exportRows}>Export CSV</Button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Operations</th>
              <th>Cost Center</th>
              <th>Content</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((t) => (
              <tr key={t.id}>
                <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{t.date}</td>
                <td>
                  <Badge tone={TXN_SOURCE_META[t.source]?.tone || 'slate'} icon={TXN_SOURCE_META[t.source]?.icon} size="sm">
                    {TXN_SOURCE_META[t.source]?.labelVi || t.source}
                  </Badge>
                </td>
                <td style={{ fontSize: 13 }}>{t.costCenterName}</td>
                <td>
                  {t.courseTitle ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.courseTitle}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        {t.userName}
                        {t.source === TXN_SOURCE.ENROLLMENT && (
                          <>
                            {' · '}
                            <span style={{ color: t.isFree ? 'var(--sage)' : 'var(--amber)', fontWeight: 700 }}>
                              {t.isFree ? 'Free' : COST_TYPE_META[t.costType]?.labelVi || 'Paid'}
                            </span>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{t.note}</div>
                  )}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    color: t.type === TXN_TYPE.INCOME ? 'var(--sage)' : t.amount === 0 ? 'var(--ink-faint)' : 'var(--rust)',
                  }}
                >
                  {t.type === TXN_TYPE.INCOME ? '+' : '−'} {formatVnd(t.amount)}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 20 }}>
                  No ledger entry matches the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageCount={pageCount} total={rows.length} onChange={setPage} />
    </div>
  );
}

function Pagination({ page, pageCount, total, onChange }) {
  if (pageCount <= 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
        Page {page + 1} / {pageCount} &middot; {total.toLocaleString('en-US')} rows
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <Button size="sm" variant="outline" icon="ti-chevron-left" disabled={page === 0} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="outline" icon="ti-chevron-right" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>
          Sau
        </Button>
      </div>
    </div>
  );
}
