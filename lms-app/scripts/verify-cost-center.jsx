/* Verification harness cho phân hệ Trung Tâm Chi Phí (Cost Center).
 *
 * Kiểm 2 lớp:
 *   A. Toán sổ cái thuần (không React): định giá, dựng cost center, seed sổ cái
 *      mở đầu, tổng hợp báo cáo, ghi danh mới có/không phí, chống tính 2 lần.
 *   B. SSR: trang AdminCostCenter render được cho từng role, không nổ.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const {
  buildCostCenters,
  buildEnrollmentTransaction,
  seedOpeningLedger,
  summarizeLedger,
  pricingOf,
  derivePricing,
  isPaidCourse,
  costCenterForUser,
  scopeLedgerForUser,
  formatVnd,
  formatVndShort,
  COST_TYPE,
  TXN_TYPE,
  TXN_SOURCE,
  CURRENCY,
} = await import('../src/utils/costCenter');

const { courses, allUsers: allUsersFn, userEnrollmentsMap, divisions } = await import('../src/data/mockData');
const allUsers = allUsersFn();

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks += 1;
  if (condition) {
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

// ===========================================================================
// A. TOÁN SỔ CÁI
// ===========================================================================

section('A1. Định giá khóa học theo hình thức tổ chức');

const paid = courses.filter(isPaidCourse);
const free = courses.filter((c) => !isPaidCourse(c));

check('Danh mục có cả khóa có phí lẫn khóa miễn phí', paid.length > 0 && free.length > 0,
  `${paid.length} có phí / ${free.length} miễn phí / ${courses.length} tổng`);

const externalSample = courses.find((c) => c.modality === 'EXTERNAL_PLATFORM');
const classroomSample = courses.find((c) => c.modality === 'CLASSROOM_LAB');
const scormSample = courses.find((c) => c.modality === 'SCORM_PACKAGE');

check('Khóa nền tảng ngoài tính phí theo suất license',
  pricingOf(externalSample).costType === COST_TYPE.EXTERNAL_LICENSE && pricingOf(externalSample).price > 0,
  `${externalSample.code} = ${formatVnd(pricingOf(externalSample).price)}`);

check('Khóa lớp trực tiếp tính chi phí tổ chức trên đầu học viên',
  pricingOf(classroomSample).costType === COST_TYPE.VENDOR_CLASSROOM && pricingOf(classroomSample).price > 0,
  `${classroomSample.code} = ${formatVnd(pricingOf(classroomSample).price)}`);

check('Khóa e-learning nội bộ là miễn phí (0 đồng)',
  pricingOf(scormSample).isFree && pricingOf(scormSample).price === 0,
  `${scormSample.code} = ${formatVnd(0)}`);

const manualPriced = { ...scormSample, pricing: { isFree: false, price: 1234000, costType: COST_TYPE.CERTIFICATION_FEE } };
check('Giá Admin gán thủ công ghi đè giá suy ra',
  pricingOf(manualPriced).price === 1234000 && pricingOf(manualPriced).source === 'MANUAL',
  `${formatVnd(pricingOf(manualPriced).price)} thay cho ${formatVnd(derivePricing(scormSample).price)}`);

const manualFree = { ...externalSample, pricing: { isFree: true, price: 0 } };
check('Admin chuyển khóa có phí thành miễn phí được',
  pricingOf(manualFree).isFree && !isPaidCourse(manualFree));

// ---------------------------------------------------------------------------

section('A2. Trung tâm chi phí & ngân sách');

const costCenters = buildCostCenters(divisions, allUsers);
const totalBudget = costCenters.reduce((s, c) => s + c.budgetAnnual, 0);
const totalHead = costCenters.reduce((s, c) => s + c.headcount, 0);

check('Mỗi Division là một cost center', costCenters.length >= divisions.length,
  `${costCenters.length} cost center / ${divisions.length} division`);
check('Tổng đầu người khớp danh sách nhân sự', totalHead === allUsers.length,
  `${totalHead} = ${allUsers.length}`);
check('Mọi cost center đều có ngân sách dương', costCenters.every((c) => c.budgetAnnual > 0),
  `tổng ngân sách ${formatVndShort(totalBudget)}`);

const sampleUser = allUsers.find((u) => u.divisionId);
const sampleCc = costCenterForUser(sampleUser, costCenters);
check('Học viên được quy về đúng cost center của Division mình',
  sampleCc && sampleCc.divisionId === sampleUser.divisionId,
  `${sampleUser.fullName} -> ${sampleCc?.code} ${sampleCc?.name}`);

// ---------------------------------------------------------------------------

section('A3. Sổ cái mở đầu & báo cáo tổng hợp');

const ledger = seedOpeningLedger({ costCenters, courses, users: allUsers, enrollmentMatrix: userEnrollmentsMap });
const report = summarizeLedger(ledger, { costCenters, courses });
const { totals } = report;

const incomeTxns = ledger.filter((t) => t.type === TXN_TYPE.INCOME);
const enrollTxns = ledger.filter((t) => t.source === TXN_SOURCE.ENROLLMENT);

check('Sổ cái có cả bút toán THU (cấp ngân sách) và CHI (ghi danh)',
  incomeTxns.length > 0 && enrollTxns.length > 0,
  `${incomeTxns.length} thu / ${enrollTxns.length} chi`);

check('Tổng THU = tổng ngân sách các cost center', totals.income === totalBudget,
  formatVndShort(totals.income));

check('Lượt ghi danh chia đúng thành có phí + miễn phí',
  totals.paidEnrollments + totals.freeEnrollments === totals.totalEnrollments,
  `${totals.paidEnrollments} có phí + ${totals.freeEnrollments} miễn phí = ${totals.totalEnrollments}`);

check('Khóa miễn phí không làm phát sinh chi phí',
  enrollTxns.filter((t) => t.isFree).every((t) => t.amount === 0),
  `${totals.freeEnrollments} lượt học nội bộ 0 đồng`);

check('Mọi lượt ghi danh có phí đều ghi số tiền dương',
  enrollTxns.filter((t) => !t.isFree).every((t) => t.amount > 0));

const expenseSum = ledger.filter((t) => t.type === TXN_TYPE.EXPENSE).reduce((s, t) => s + t.amount, 0);
check('Tổng CHI khớp tổng các bút toán chi', totals.expense === expenseSum, formatVndShort(totals.expense));
check('Số dư = THU - CHI', totals.balance === totals.income - totals.expense, formatVndShort(totals.balance));
check('Ngân sách chưa bị bội chi ở cấp toàn công ty', totals.expense < totals.income,
  `sử dụng ${totals.utilization}%`);

const ccSum = report.byCostCenter.reduce((s, c) => s + c.spent, 0);
check('Chi bóc theo cost center cộng lại bằng tổng chi', ccSum === totals.expense, formatVndShort(ccSum));

// Nhân sự chưa gán Division: bút toán vẫn phải vào báo cáo, không được rơi mất.
const orphanUser = { userId: 'USR-ORPHAN', fullName: 'Nhân Sự Chưa Gán Phòng Ban', divisionId: null, divisionCode: null };
const orphanTxn = buildEnrollmentTransaction({ course: paid[0], user: orphanUser, costCenters, date: '2026-08-31' });
const orphanReport = summarizeLedger([...ledger, orphanTxn], { costCenters, courses });
check('Bút toán của nhân sự chưa gán Division không bị rơi khỏi báo cáo',
  orphanReport.byCostCenter.reduce((s, c) => s + c.spent, 0) === orphanReport.totals.expense &&
    orphanReport.totals.expense === totals.expense + orphanTxn.amount,
  `${orphanTxn.costCenterName} · ${formatVnd(orphanTxn.amount)}`);

const courseSum = report.byCourse.reduce((s, c) => s + c.spent, 0);
check('Chi bóc theo khóa học cộng lại bằng tổng chi', courseSum === totals.expense, formatVndShort(courseSum));

check('Bảng giá liệt kê đủ 100% khóa học (kể cả khóa chưa ai học)',
  report.byCourse.length === courses.length, `${report.byCourse.length}/${courses.length}`);

check('Biểu đồ chi theo tháng có dữ liệu trải nhiều tháng', report.byMonth.length >= 6,
  report.byMonth.map((m) => `${m.label}:${formatVndShort(m.value)}`).join(' · '));

const overspent = report.byCostCenter.filter((c) => c.remaining < 0);
console.log(`  ℹ ${overspent.length} cost center vượt ngân sách: ${overspent.slice(0, 3).map((c) => `${c.code} (${c.utilization}%)`).join(', ') || 'không có'}`);

// ---------------------------------------------------------------------------

section('A4. Ghi danh mới đẩy giao dịch vào sổ cái');

const learner = allUsers.find((u) => u.divisionId && u.role === 'learner') || allUsers[0];
const learnerCc = costCenterForUser(learner, costCenters);
const paidCourse = paid[0];
const freeCourse = free[0];

const paidTxn = buildEnrollmentTransaction({ course: paidCourse, user: learner, costCenters, date: '2026-08-31' });
const freeTxn = buildEnrollmentTransaction({ course: freeCourse, user: learner, costCenters, date: '2026-08-31' });

check('Ghi danh khóa CÓ PHÍ ghi nợ đúng cost center của học viên',
  paidTxn.costCenterId === learnerCc.id && paidTxn.amount === pricingOf(paidCourse).price && !paidTxn.isFree,
  `${learner.fullName} · ${paidCourse.code} · ${formatVnd(paidTxn.amount)} -> ${paidTxn.costCenterName}`);

check('Ghi danh khóa MIỄN PHÍ ghi 0 đồng nhưng vẫn có bút toán',
  freeTxn.isFree && freeTxn.amount === 0 && freeTxn.source === TXN_SOURCE.ENROLLMENT,
  `${freeCourse.code} · ${formatVnd(0)}`);

const afterLedger = [...ledger.filter((t) => t.id !== paidTxn.id && t.id !== freeTxn.id), paidTxn, freeTxn];
const afterReport = summarizeLedger(afterLedger, { costCenters, courses });
check('Tổng chi tăng đúng bằng giá khóa vừa ghi danh',
  afterReport.totals.expense - summarizeLedger(ledger.filter((t) => t.id !== paidTxn.id && t.id !== freeTxn.id), { costCenters, courses }).totals.expense === paidTxn.amount,
  `+${formatVnd(paidTxn.amount)}`);

const dupTxn = buildEnrollmentTransaction({ course: paidCourse, user: learner, costCenters, date: '2026-09-01' });
check('Ghi danh lại cùng khóa không sinh bút toán mới (id tất định)',
  dupTxn.id === paidTxn.id, dupTxn.id);

// ---------------------------------------------------------------------------

section('A5. Tạo khóa học mới kèm giá ngay lúc tạo (như AdminCourseBuilder)');

// Mô phỏng đúng field mà CoursePricingSection ghi vào draft.pricing khi Admin
// gõ giá trong lúc tạo khóa — KHÔNG qua tab "Bảng Giá" sửa sau.
const brandNewCourse = {
  id: 'CRS-DEMO-NEW-001',
  code: 'DEMO-001',
  title: 'Khóa Demo Vừa Tạo Có Phí',
  category: 'Leadership & Management',
  modality: 'SCORM_PACKAGE', // mặc định sẽ MIỄN PHÍ nếu không set pricing thủ công
  pricing: { isFree: false, price: 1500000, currency: CURRENCY, costType: COST_TYPE.CERTIFICATION_FEE, vendor: 'PMI Vietnam' },
};

check('Khóa mới tạo lấy giá từ pricing đã nhập, không rơi về suy luận theo modality',
  pricingOf(brandNewCourse).price === 1500000 && !pricingOf(brandNewCourse).isFree,
  `${formatVnd(pricingOf(brandNewCourse).price)} (nếu không set sẽ là Miễn Phí vì modality=SCORM_PACKAGE)`);

const demoLearner = allUsers.find((u) => u.divisionId) || allUsers[0];
const demoTxn = buildEnrollmentTransaction({ course: brandNewCourse, user: demoLearner, costCenters, date: '2026-08-31' });
const ledgerWithNewCourse = [...ledger, demoTxn];
const reportWithNewCourse = summarizeLedger(ledgerWithNewCourse, { costCenters, courses: [...courses, brandNewCourse] });
const newCourseRow = reportWithNewCourse.byCourse.find((r) => r.courseId === brandNewCourse.id);

check('Ghi danh khóa mới tạo được tính đúng giá vào sổ giao dịch',
  demoTxn.amount === 1500000 && !demoTxn.isFree,
  `${demoTxn.userName} ghi danh ${brandNewCourse.title} -> ${formatVnd(demoTxn.amount)}`);

check('Khóa mới tạo xuất hiện trong Bảng Giá / báo cáo Cost Center với đúng số tiền',
  newCourseRow && newCourseRow.spent === 1500000 && newCourseRow.seats === 1,
  `${newCourseRow?.title}: ${newCourseRow?.seats} suất, tổng chi ${formatVnd(newCourseRow?.spent || 0)}`);

check('Tổng chi toàn công ty tăng đúng bằng học phí của khóa mới',
  reportWithNewCourse.totals.expense === totals.expense + 1500000,
  `+${formatVnd(1500000)}`);

// ===========================================================================
// B. SSR TRANG BÁO CÁO
// ===========================================================================

section('B. Render trang Cost Center cho từng role');

const { CourseStoreProvider } = await import('../src/store/CourseStore');
const { personaForRole } = await import('../src/data/mockData');
const { ROLE_ORDER } = await import('../src/data/roles');
const AdminCostCenter = (await import('../src/pages/admin/AdminCostCenter')).default;

const AUTH_KEY = 'mm-megalearn-auth-v6';

const { hasCapability } = await import('../src/data/roles');

ROLE_ORDER.forEach((role) => {
  store.clear();
  store.set(AUTH_KEY, JSON.stringify(personaForRole(role)));
  const shouldSee = hasCapability(role, 'canViewCostCenter');
  try {
    const html = renderToStaticMarkup(
      <CourseStoreProvider>
        <MemoryRouter initialEntries={['/admin/cost-center']}>
          <Routes>
            <Route path="/admin/cost-center" element={<AdminCostCenter />} />
          </Routes>
        </MemoryRouter>
      </CourseStoreProvider>
    );

    if (shouldSee) {
      check(`role=${role} xem được báo cáo thu chi`, html.length > 2000 && html.includes('₫'),
        `${html.length} ký tự HTML`);
    } else {
      // Học viên thường không được xem báo cáo tài chính đào tạo.
      check(`role=${role} bị chặn khỏi báo cáo tài chính`,
        html.includes('không có quyền xem') && !html.includes('₫'),
        'hiện thẻ khóa quyền thay vì số liệu');
    }
  } catch (err) {
    check(`role=${role} render trang Cost Center`, false, err.message);
  }
});

// Manager chỉ được thấy cost center của Division mình.
store.clear();
store.set(AUTH_KEY, JSON.stringify(personaForRole('manager')));
const managerPersona = personaForRole('manager');
const managerLedger = scopeLedgerForUser(ledger, managerPersona, { seeAll: false });
check('Manager chỉ thấy bút toán của Division mình',
  managerLedger.length > 0 && managerLedger.every((t) => t.costCenterId === `CC-${managerPersona.divisionCode}`),
  `${managerLedger.length}/${ledger.length} bút toán · ${managerPersona.divisionName}`);

// ===========================================================================

console.log(`\n${'='.repeat(60)}`);
console.log(failures === 0 ? `PASS — ${checks}/${checks} kiểm tra thành công.` : `FAIL — ${failures}/${checks} kiểm tra thất bại.`);
console.log('='.repeat(60));
process.exit(failures === 0 ? 0 : 1);
