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
  { id: 'OVERVIEW', label: 'Tổng Quan Thu Chi', icon: 'ti-report-money' },
  { id: 'CENTERS', label: 'Theo Trung Tâm Chi Phí', icon: 'ti-building-bank' },
  { id: 'PRICING', label: 'Bảng Giá Khóa Học', icon: 'ti-tag' },
  { id: 'EMPLOYEES', label: 'Theo Nhân Sự (Xuất HR)', icon: 'ti-users' },
  { id: 'LEDGER', label: 'Sổ Giao Dịch', icon: 'ti-list-details' },
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

  // Manager chỉ được nhìn chi phí đào tạo của chính Division mình.
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
  // Chỉ xuất/liệt kê nhân sự trong đúng Division của Manager — cùng phạm vi với sổ cái.
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
      <div className="card card-pad empty-state">
        <i className="ti ti-lock" aria-hidden="true" />
        <p>
          Trung Tâm Chi Phí là báo cáo tài chính đào tạo, chỉ dành cho Quản Lý, Giảng Viên/L&amp;D, HRBP,
          User Admin và System Admin. Tài khoản của bạn không có quyền xem.
        </p>
      </div>
    );
  }

  const { totals } = report;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Trung Tâm Chi Phí Đào Tạo</h1>
            <Badge tone="amber" icon="ti-report-money">Cost Center · Năm tài chính {FISCAL_YEAR}</Badge>
            {!seeAll && (
              <Badge tone="blue" icon="ti-filter">
                Phạm vi: {currentUser?.divisionName || 'Phòng ban của bạn'}
                {currentUser?.costCenterCode ? ` · Mã ${currentUser.costCenterCode}` : ''}
              </Badge>
            )}
          </div>
          <p>
            Mỗi Division sở hữu đúng một mã Trung Tâm Chi Phí (5 số) do HR cấp. Khi học viên ghi danh khóa{' '}
            <strong>có phí</strong>, toàn bộ học phí do <strong>công ty chi trả</strong> — ghi nợ thẳng vào mã của
            Division học viên đó, học viên không phải thanh toán. Khóa <strong>miễn phí</strong> vẫn được ghi nhận
            lượt học với giá trị 0 đồng để so sánh hiệu quả giữa nội dung nội bộ và nội dung mua ngoài.
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
// TAB 1 — TỔNG QUAN
// ===========================================================================

function OverviewTab({ report, totals }) {
  const topCenters = report.byCostCenter.filter((c) => c.spent > 0).slice(0, 8);
  const topCourses = report.byCourse.filter((c) => c.spent > 0).slice(0, 8);

  return (
    <>
      <div className="grid grid-4" style={{ gap: 16, marginBottom: 20 }}>
        <StatCard
          label="Tổng Thu (Ngân Sách Được Cấp)"
          value={formatVndShort(totals.income)}
          tone="sage"
          icon="ti-wallet"
          sublabel={`Năm tài chính ${FISCAL_YEAR}`}
        />
        <StatCard
          label="Tổng Chi (Đã Sử Dụng)"
          value={formatVndShort(totals.expense)}
          tone="rust"
          icon="ti-cash-off"
          sublabel={`${totals.paidEnrollments.toLocaleString('vi-VN')} lượt ghi danh có phí`}
        />
        <StatCard
          label="Số Dư Còn Lại"
          value={formatVndShort(totals.balance)}
          tone={totals.balance < 0 ? 'rust' : 'blue'}
          icon="ti-pig-money"
          sublabel={totals.balance < 0 ? 'Đã bội chi ngân sách' : 'Còn khả dụng đến cuối năm'}
        />
        <StatCard
          label="Tỷ Lệ Sử Dụng Ngân Sách"
          value={`${totals.utilization}%`}
          tone={utilizationTone(totals.utilization)}
          icon="ti-percentage"
          sublabel={`Chi phí bình quân ${formatVndShort(totals.costPerLearner)} / học viên`}
        />
      </div>

      <div className="grid grid-3" style={{ gap: 16, marginBottom: 20 }}>
        <StatCard
          label="Lượt Ghi Danh Có Phí"
          value={totals.paidEnrollments.toLocaleString('vi-VN')}
          tone="amber"
          icon="ti-coin"
          sublabel="Tốn ngân sách đào tạo"
        />
        <StatCard
          label="Lượt Ghi Danh Miễn Phí"
          value={totals.freeEnrollments.toLocaleString('vi-VN')}
          tone="sage"
          icon="ti-gift"
          sublabel="Nội dung nội bộ MMVN · 0 đồng"
        />
        <StatCard
          label="Học Viên Phát Sinh Chi Phí"
          value={totals.distinctLearners.toLocaleString('vi-VN')}
          tone="blue"
          icon="ti-users"
          sublabel={`${totals.txnCount.toLocaleString('vi-VN')} bút toán trong sổ cái`}
        />
      </div>

      <div className="grid grid-2" style={{ gap: 16, marginBottom: 20 }}>
        <div className="card card-pad">
          <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>Chi Phí Đào Tạo Theo Tháng</div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 0, marginBottom: 14 }}>
            Tổng số tiền ghi nợ vào các trung tâm chi phí trong từng tháng (triệu đồng).
          </p>
          <BarChart
            data={report.byMonth.map((m) => ({ label: m.label, value: Math.round(m.value / 1e6), detail: `${m.label}: ${formatVnd(m.value)}` }))}
            valueSuffix=" tr"
            tone="amber"
          />
        </div>

        <div className="card card-pad">
          <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>Cơ Cấu Chi Theo Loại Chi Phí</div>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 0, marginBottom: 14 }}>
            Tiền chảy về đâu: license nền tảng ngoài hay chi phí tổ chức lớp trực tiếp.
          </p>
          {report.byCostType.filter((t) => t.amount > 0).length === 0 ? (
            <div className="empty-state" style={{ padding: 12 }}><p>Chưa phát sinh chi phí nào.</p></div>
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
                  <div key={t.costType} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span>
                      <i className={`ti ${COST_TYPE_META[t.costType]?.icon || 'ti-coin'}`} style={{ marginRight: 6, color: 'var(--ink-soft)' }} />
                      {COST_TYPE_META[t.costType]?.labelVi || t.costType} &middot; {t.count.toLocaleString('vi-VN')} lượt
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
          <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 14 }}>Top Trung Tâm Chi Phí Chi Nhiều Nhất</div>
          {topCenters.length === 0 ? (
            <div className="empty-state" style={{ padding: 12 }}><p>Chưa có trung tâm chi phí nào phát sinh chi.</p></div>
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
          <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 14 }}>Top Khóa Học Tốn Ngân Sách Nhất</div>
          {topCourses.length === 0 ? (
            <div className="empty-state" style={{ padding: 12 }}><p>Chưa có khóa học có phí nào được ghi danh.</p></div>
          ) : (
            <BarChart
              data={topCourses.map((c) => ({
                label: c.title,
                value: Math.round(c.spent / 1e6),
                detail: `${c.title}: ${c.seats} suất × ${formatVnd(c.unitPrice)} = ${formatVnd(c.spent)}`,
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
// TAB 2 — THEO TRUNG TÂM CHI PHÍ
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
        'Mã Cost Center (5 số)': c.code,
        'Trung Tâm Chi Phí (Division)': c.name,
        Khối: c.branchName || c.branch,
        'Location': c.location || '',
        'Nhân Sự': c.headcount,
        'Ngân Sách (VND)': c.budget,
        'Đã Chi (VND)': c.spent,
        'Còn Lại (VND)': c.remaining,
        'Sử Dụng (%)': c.utilization,
        'Lượt Có Phí': c.paidEnrollments,
        'Lượt Miễn Phí': c.freeEnrollments,
        'Học Viên': c.learners,
      }))
    );
  }

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Ngân Sách &amp; Mức Sử Dụng Theo Trung Tâm Chi Phí</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
            Mỗi Division sở hữu đúng một mã Trung Tâm Chi Phí 5 số do HR cấp. Ngân sách năm được cấp theo đầu người của khối.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="field-input" value={branch} onChange={(e) => setBranch(e.target.value)} style={{ fontSize: 12.5 }}>
            <option value="ALL">Tất cả khối</option>
            <option value="OPERATIONS">Khối Vận Hành Siêu Thị</option>
            <option value="SUPPORTING">Khối Chức Năng Hỗ Trợ</option>
          </select>
          <input
            className="field-input"
            placeholder="Tìm mã / tên trung tâm..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ fontSize: 12.5, minWidth: 220 }}
          />
          <Button size="sm" variant="outline" icon="ti-download" onClick={exportRows}>Xuất CSV</Button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Trung Tâm Chi Phí</th>
              <th style={{ textAlign: 'right' }}>Nhân Sự</th>
              <th style={{ textAlign: 'right' }}>Ngân Sách</th>
              <th style={{ textAlign: 'right' }}>Đã Chi</th>
              <th style={{ textAlign: 'right' }}>Còn Lại</th>
              <th style={{ minWidth: 150 }}>Mức Sử Dụng</th>
              <th style={{ textAlign: 'right' }}>Lượt Ghi Danh</th>
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
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
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
                  {' có phí · '}
                  <span style={{ color: 'var(--sage)', fontWeight: 700 }}>{c.freeEnrollments}</span>
                  {' miễn phí'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 20 }}>
                  Không có trung tâm chi phí nào khớp bộ lọc.
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
// TAB 3 — BẢNG GIÁ KHÓA HỌC
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
        'Mã Khóa': c.courseCode,
        'Tên Khóa Học': c.title,
        'Lĩnh Vực': c.category || '',
        'Loại Chi Phí': COST_TYPE_META[c.costType]?.labelVi || c.costType || '',
        'Miễn Phí': c.isFree ? 'Có' : 'Không',
        'Giá / Suất (VND)': c.unitPrice,
        'Lượt Ghi Danh': c.seats,
        'Tổng Chi (VND)': c.spent,
      }))
    );
  }

  return (
    <>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Bảng Giá Khóa Học (Công Ty Chi Trả)</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
              {paidCount} khóa có phí &middot; {freeCount} khóa miễn phí. Giá dưới đây là chi phí công ty phải trả cho
              mỗi suất học — học viên không thanh toán.{' '}
              {canManage
                ? 'Bấm "Sửa giá" để đặt giá hoặc chuyển khóa về miễn phí — giá mới chỉ áp dụng cho lượt ghi danh sau đó.'
                : 'Chỉ User Admin / System Admin được sửa giá.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="field-input" value={filter} onChange={(e) => resetPage(setFilter)(e.target.value)} style={{ fontSize: 12.5 }}>
              <option value="ALL">Tất cả khóa học</option>
              <option value="PAID">Chỉ khóa có phí</option>
              <option value="FREE">Chỉ khóa miễn phí</option>
            </select>
            <input
              className="field-input"
              placeholder="Tìm mã / tên khóa học..."
              value={query}
              onChange={(e) => resetPage(setQuery)(e.target.value)}
              style={{ fontSize: 12.5, minWidth: 220 }}
            />
            <Button size="sm" variant="outline" icon="ti-download" onClick={exportRows}>Xuất CSV</Button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Khóa Học</th>
                <th>Loại Chi Phí</th>
                <th style={{ textAlign: 'right' }}>Công Ty Trả / Học Viên</th>
                <th style={{ textAlign: 'right' }}>Lượt Ghi Danh</th>
                <th style={{ textAlign: 'right' }}>Tổng Chi</th>
                {canManage && <th style={{ textAlign: 'right' }}>Thao Tác</th>}
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.courseId}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{c.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                      {c.courseCode}{c.category ? ` · ${c.category}` : ''}
                    </div>
                  </td>
                  <td>
                    <Badge tone={COST_TYPE_META[c.costType]?.tone || 'slate'} icon={COST_TYPE_META[c.costType]?.icon} size="sm">
                      {COST_TYPE_META[c.costType]?.labelVi || c.costType}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: c.isFree ? 'var(--sage)' : 'var(--ink)' }}>
                    {c.isFree ? 'Miễn Phí' : formatVnd(c.unitPrice)}
                  </td>
                  <td style={{ textAlign: 'right' }}>{c.seats.toLocaleString('vi-VN')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.spent > 0 ? formatVndShort(c.spent) : '—'}</td>
                  {canManage && (
                    <td style={{ textAlign: 'right' }}>
                      <Button size="sm" variant="ghost" icon="ti-pencil" onClick={() => setEditing(courseById.get(c.courseId) || null)}>
                        Sửa giá
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 20 }}>
                    Không có khóa học nào khớp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageCount={pageCount} total={rows.length} onChange={setPage} />
      </div>

      {/* key theo khóa học: mở khóa khác thì modal remount, form tự nạp lại giá. */}
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
      title="Đặt Giá Khóa Học"
      subtitle={`${course.code} · ${course.title}`}
      size="sm"
      footer={
        <Button variant="primary" icon="ti-device-floppy" onClick={() => onSave({ isFree, price: parsedPrice, costType, vendor })}>
          Lưu Bảng Giá
        </Button>
      }
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
        <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
        Khóa học miễn phí (không trừ ngân sách khi học viên ghi danh)
      </label>

      {!isFree && (
        <>
          <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>
            Chi phí công ty trả trên mỗi học viên (VNĐ)
          </label>
          <input
            className="field-input"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ width: '100%', marginBottom: 4 }}
          />
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
            Thành tiền: <strong>{formatVnd(parsedPrice)}</strong>
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Loại chi phí</label>
          <select className="field-input" value={costType} onChange={(e) => setCostType(e.target.value)} style={{ width: '100%', marginBottom: 14 }}>
            {Object.entries(COST_TYPE_META)
              .filter(([id]) => id !== COST_TYPE.INTERNAL_FREE)
              .map(([id, meta]) => (
                <option key={id} value={id}>{meta.labelVi}</option>
              ))}
          </select>

          <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>Nhà cung cấp / Đơn vị tổ chức</label>
          <input
            className="field-input"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="VD: Coursera for Business"
            style={{ width: '100%', marginBottom: 14 }}
          />
        </>
      )}

      <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--ink-soft)' }}>
        <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--blue)' }} />
        Toàn bộ chi phí do Trung Tâm Chi Phí (mã 5 số) của Division học viên chi trả — học viên không thanh toán.
        Giá mới chỉ áp dụng cho các lượt ghi danh phát sinh sau khi lưu; các bút toán đã ghi trong sổ cái giữ nguyên
        giá tại thời điểm ghi danh để báo cáo quá khứ không bị sai lệch.
      </div>
    </Modal>
  );
}

// ===========================================================================
// TAB 4 — THEO NHÂN SỰ (file xuất cho HR / Kế toán / Kiểm toán)
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
          <div style={{ fontSize: 15, fontWeight: 800 }}>Chi Phí Đào Tạo Theo Từng Nhân Sự</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
            {rows.length.toLocaleString('vi-VN')} nhân sự &middot; Công ty đã chi{' '}
            <strong style={{ color: 'var(--rust)' }}>{formatVndShort(totalCompanyPaid)}</strong> cho các khóa có phí.
            Xuất CSV theo đúng 15 cột hồ sơ HR (Employee Status, Personnel Number, Cost center, Full Name, Entry
            Date, Gender, Date of birth, Business Email Address, Position, Level, HO/Store, Division, Department,
            Sub Department, Location) kèm phần chi phí đào tạo để nộp Kế toán / Kiểm toán.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="field-input" value={filter} onChange={(e) => resetPage(setFilter)(e.target.value)} style={{ fontSize: 12.5 }}>
            <option value="ALL">Tất cả nhân sự</option>
            <option value="PAID">Đã phát sinh chi phí có phí</option>
            <option value="UNPAID">Chưa từng học khóa có phí</option>
          </select>
          <input
            className="field-input"
            placeholder="Tìm mã NV / tên / mã cost center..."
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            style={{ fontSize: 12.5, minWidth: 240 }}
          />
          <Button size="sm" variant="outline" icon="ti-download" onClick={exportRows}>Xuất CSV (HR)</Button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nhân Sự</th>
              <th>Mã Cost Center</th>
              <th>Division / Department</th>
              <th style={{ textAlign: 'right' }}>Lượt Có Phí</th>
              <th style={{ textAlign: 'right' }}>Lượt Miễn Phí</th>
              <th style={{ textAlign: 'right' }}>Công Ty Đã Chi</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.userId}>
                <td>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{r.fullName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                    {r.personnelNumber || r.userId}{r.position ? ` · ${r.position}` : ''}
                  </div>
                </td>
                <td>
                  <Badge tone="slate" size="sm">{r.costCenterCode || 'UNASSIGNED'}</Badge>
                </td>
                <td style={{ fontSize: 12.5 }}>
                  {r.divisionName || '—'}
                  {r.departmentName ? <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{r.departmentName}</div> : null}
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
                  Không có nhân sự nào khớp bộ lọc.
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
// TAB 5 — SỔ GIAO DỊCH
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
        'Mã Bút Toán': t.id,
        Ngày: t.date,
        'Thu/Chi': t.type === TXN_TYPE.INCOME ? 'THU' : 'CHI',
        'Nghiệp Vụ': TXN_SOURCE_META[t.source]?.labelVi || t.source,
        'Trung Tâm Chi Phí': t.costCenterName || '',
        'Khóa Học': t.courseTitle || '',
        'Học Viên': t.userName || '',
        'Loại Chi Phí': COST_TYPE_META[t.costType]?.labelVi || '',
        'Miễn Phí': t.source === TXN_SOURCE.ENROLLMENT ? (t.isFree ? 'Có' : 'Không') : '',
        'Số Tiền (VND)': t.amount,
      }))
    );
  }

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Sổ Giao Dịch Thu &ndash; Chi</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
            {rows.length.toLocaleString('vi-VN')} bút toán &middot; Thu <strong style={{ color: 'var(--sage)' }}>{formatVndShort(filteredIncome)}</strong>
            {' '}&middot; Chi <strong style={{ color: 'var(--rust)' }}>{formatVndShort(filteredExpense)}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="field-input" value={type} onChange={(e) => resetPage(setType)(e.target.value)} style={{ fontSize: 12.5 }}>
            <option value="ALL">Tất cả bút toán</option>
            <option value="INCOME">Chỉ khoản THU</option>
            <option value="EXPENSE">Chỉ khoản CHI</option>
            <option value="PAID">Ghi danh có phí</option>
            <option value="FREE">Ghi danh miễn phí</option>
          </select>
          <select className="field-input" value={centerId} onChange={(e) => resetPage(setCenterId)(e.target.value)} style={{ fontSize: 12.5, maxWidth: 220 }}>
            <option value="ALL">Tất cả trung tâm chi phí</option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            className="field-input"
            placeholder="Tìm khóa học / học viên..."
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            style={{ fontSize: 12.5, minWidth: 200 }}
          />
          <Button size="sm" variant="outline" icon="ti-download" onClick={exportRows}>Xuất CSV</Button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Nghiệp Vụ</th>
              <th>Trung Tâm Chi Phí</th>
              <th>Nội Dung</th>
              <th style={{ textAlign: 'right' }}>Số Tiền</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((t) => (
              <tr key={t.id}>
                <td style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>{t.date}</td>
                <td>
                  <Badge tone={TXN_SOURCE_META[t.source]?.tone || 'slate'} icon={TXN_SOURCE_META[t.source]?.icon} size="sm">
                    {TXN_SOURCE_META[t.source]?.labelVi || t.source}
                  </Badge>
                </td>
                <td style={{ fontSize: 12.5 }}>{t.costCenterName}</td>
                <td>
                  {t.courseTitle ? (
                    <>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.courseTitle}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                        {t.userName}
                        {t.source === TXN_SOURCE.ENROLLMENT && (
                          <>
                            {' · '}
                            <span style={{ color: t.isFree ? 'var(--sage)' : 'var(--amber)', fontWeight: 700 }}>
                              {t.isFree ? 'Miễn phí' : COST_TYPE_META[t.costType]?.labelVi || 'Có phí'}
                            </span>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{t.note}</div>
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
                  Không có bút toán nào khớp bộ lọc.
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
        Trang {page + 1} / {pageCount} &middot; {total.toLocaleString('vi-VN')} dòng
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <Button size="sm" variant="outline" icon="ti-chevron-left" disabled={page === 0} onClick={() => onChange(page - 1)}>
          Trước
        </Button>
        <Button size="sm" variant="outline" icon="ti-chevron-right" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>
          Sau
        </Button>
      </div>
    </div>
  );
}
