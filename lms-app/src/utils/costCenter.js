// ===========================================================================
// Cost Center (Trung Tâm Chi Phí) — logic thuần, không phụ thuộc React.
//
// Mô hình thu/chi của MMVN L&D:
//   • Mỗi Division sở hữu ĐÚNG MỘT Trung Tâm Chi Phí, định danh bằng mã HR 5
//     số cố định (orgHierarchy.divisions[].costCenter). Nhân sự thuộc bất kỳ
//     Department hay Sub-Department nào của Division đều quy về đúng mã đó, nên
//     điều chuyển nội bộ trong Division không làm chi phí nhảy sang mã khác.
//   • Ngân sách đào tạo năm cấp cho từng mã theo đầu người của khối
//     (Operations / Supporting).
//   • THU (INCOME)  = ngân sách được cấp đầu năm (+ hoàn phí khi hủy ghi danh).
//   • CHI (EXPENSE) = mỗi lượt ghi danh khóa CÓ PHÍ ghi nợ vào cost center của
//     chính học viên (theo divisionId). Học viên KHÔNG tự trả: toàn bộ học phí
//     do công ty chi từ ngân sách đào tạo của mã đó. Khóa miễn phí vẫn ghi 1
//     dòng 0 đồng để báo cáo đếm được lượt học nội bộ so với lượt học tốn tiền.
//   • Mỗi bút toán lưu kèm Division / Department / Sub-Department và mã nhân
//     viên của học viên, đủ để kiểm toán truy ngược từng đồng chi.
//   • Số dư = THU - CHI; tỷ lệ sử dụng ngân sách = CHI / THU.
//
// Giá khóa học suy ra từ hình thức tổ chức (modality) nếu khóa chưa được gán
// giá thủ công — xem derivePricing(). Admin gán giá riêng thì `course.pricing`
// được ưu tiên tuyệt đối (pricingOf()).
// ===========================================================================

import { hrExportRow, costCenterCodeOf } from '../data/hrProfile';

export const CURRENCY = 'VND';
export const FISCAL_YEAR = 2026;

// ---------------------------------------------------------------------------
// 1. LOẠI CHI PHÍ
// ---------------------------------------------------------------------------

export const COST_TYPE = {
  INTERNAL_FREE: 'INTERNAL_FREE',
  EXTERNAL_LICENSE: 'EXTERNAL_LICENSE',
  VENDOR_CLASSROOM: 'VENDOR_CLASSROOM',
  CERTIFICATION_FEE: 'CERTIFICATION_FEE',
};

export const COST_TYPE_META = {
  INTERNAL_FREE: {
    labelVi: 'Nội Bộ — Miễn Phí',
    labelEn: 'Internal — Free',
    tone: 'sage',
    icon: 'ti-gift',
    noteVi: 'Nội dung do L&D MMVN tự sản xuất, không phát sinh chi phí trên mỗi lượt ghi danh.',
  },
  EXTERNAL_LICENSE: {
    labelVi: 'License Nền Tảng Ngoài',
    labelEn: 'External Platform License',
    tone: 'blue',
    icon: 'ti-external-link',
    noteVi: 'Mua theo suất (seat) từ LinkedIn Learning / Coursera / Udemy Business.',
  },
  VENDOR_CLASSROOM: {
    labelVi: 'Lớp Trực Tiếp — Chi Phí Tổ Chức',
    labelEn: 'In-Person Classroom Cost',
    tone: 'amber',
    icon: 'ti-chalkboard',
    noteVi: 'Chi phí giảng viên, phòng/xưởng thực hành, vật tư tiêu hao trên mỗi học viên.',
  },
  CERTIFICATION_FEE: {
    labelVi: 'Phí Thi & Cấp Chứng Chỉ',
    labelEn: 'Certification Fee',
    tone: 'rust',
    icon: 'ti-certificate',
    noteVi: 'Lệ phí thi và cấp chứng chỉ do tổ chức bên ngoài thu.',
  },
};

// ---------------------------------------------------------------------------
// 2. BẢNG GIÁ CHUẨN (VNĐ / suất học viên)
// ---------------------------------------------------------------------------

// Khớp với costPerSeat trong costTrackingData (mockData.js) để hai báo cáo
// không mâu thuẫn số liệu.
export const PLATFORM_SEAT_PRICE = [
  { match: 'linkedin', price: 2500000, platform: 'LinkedIn Learning Enterprise' },
  { match: 'udemy', price: 3600000, platform: 'Udemy Business' },
  { match: 'coursera', price: 4800000, platform: 'Coursera for Business' },
];
const DEFAULT_PLATFORM_SEAT_PRICE = 3000000;

// Lớp trực tiếp: chi phí tổ chức trên mỗi học viên tính theo thời lượng.
export const CLASSROOM_COST_PER_HOUR = 250000;

// Ngân sách đào tạo cấp cho mỗi cost center = đầu người × định mức năm. Định
// mức được cân để tỷ lệ sử dụng toàn công ty rơi vào ~60%, khớp với con số
// budgetUtilization 63.3% mà costTrackingData (mockData.js) đang công bố.
export const ANNUAL_ALLOWANCE_PER_HEAD = {
  OPERATIONS: 2000000,
  SUPPORTING: 3500000,
};
// Sàn ngân sách cho các đơn vị ít nhân sự — vẫn phải đủ cho các khóa tuân thủ
// bắt buộc dù chỉ có vài người.
export const MIN_ANNUAL_BUDGET = 12000000;

// ---------------------------------------------------------------------------
// 3. ĐỊNH GIÁ KHÓA HỌC
// ---------------------------------------------------------------------------

/** '3h' | '3.5h' | 3 -> 3 (số giờ). Trả 2 nếu không đọc được. */
export function hoursOf(estimatedHours) {
  if (typeof estimatedHours === 'number' && Number.isFinite(estimatedHours)) return estimatedHours;
  const parsed = parseFloat(String(estimatedHours ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

/** Làm tròn tiền lên bội số 50.000đ cho gọn bảng giá. */
export function roundPrice(amount) {
  return Math.round(amount / 50000) * 50000;
}

/**
 * Suy ra giá mặc định của khóa học từ hình thức tổ chức. Đây chỉ là giá gợi ý
 * ban đầu — Admin sửa lại trong tab "Bảng Giá Khóa Học" thì `course.pricing`
 * ghi đè hoàn toàn kết quả hàm này.
 */
export function derivePricing(course) {
  if (!course) {
    return { isFree: true, price: 0, currency: CURRENCY, costType: COST_TYPE.INTERNAL_FREE, vendor: null, source: 'DERIVED' };
  }

  if (course.modality === 'EXTERNAL_PLATFORM') {
    const src = String(course.platformSource || '').toLowerCase();
    const hit = PLATFORM_SEAT_PRICE.find((p) => src.includes(p.match));
    return {
      isFree: false,
      price: hit ? hit.price : DEFAULT_PLATFORM_SEAT_PRICE,
      currency: CURRENCY,
      costType: COST_TYPE.EXTERNAL_LICENSE,
      vendor: hit ? hit.platform : (course.platformSource || 'External Platform'),
      source: 'DERIVED',
    };
  }

  if (course.modality === 'CLASSROOM_LAB' || course.deliveryType === 'IN_PERSON_CLASSROOM') {
    return {
      isFree: false,
      price: roundPrice(hoursOf(course.estimatedHours) * CLASSROOM_COST_PER_HOUR),
      currency: CURRENCY,
      costType: COST_TYPE.VENDOR_CLASSROOM,
      vendor: course.venue || 'MMVN Training Venue',
      source: 'DERIVED',
    };
  }

  return {
    isFree: true,
    price: 0,
    currency: CURRENCY,
    costType: COST_TYPE.INTERNAL_FREE,
    vendor: null,
    source: 'DERIVED',
  };
}

/** Giá hiệu lực của khóa học: ưu tiên giá Admin gán, không có thì suy ra. */
export function pricingOf(course) {
  const manual = course?.pricing;
  if (manual && typeof manual === 'object') {
    const price = Number(manual.price) || 0;
    const isFree = manual.isFree ?? price <= 0;
    return {
      isFree,
      price: isFree ? 0 : price,
      currency: manual.currency || CURRENCY,
      costType: isFree ? COST_TYPE.INTERNAL_FREE : (manual.costType || COST_TYPE.EXTERNAL_LICENSE),
      vendor: manual.vendor || null,
      source: 'MANUAL',
    };
  }
  return derivePricing(course);
}

/** Khóa này có thu phí khi tham gia không? */
export function isPaidCourse(course) {
  const p = pricingOf(course);
  return !p.isFree && p.price > 0;
}

// ---------------------------------------------------------------------------
// 4. ĐỊNH DẠNG TIỀN TỆ
// ---------------------------------------------------------------------------

const vndFormatter = new Intl.NumberFormat('vi-VN');

export function formatVnd(amount) {
  return `${vndFormatter.format(Math.round(Number(amount) || 0))} ₫`;
}

/** Rút gọn cho thẻ KPI: 4.500.000.000 -> "4,5 tỷ ₫"; 2.500.000 -> "2,5 tr ₫". */
export function formatVndShort(amount) {
  const n = Number(amount) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1).replace('.', ',')} tỷ ₫`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(abs >= 1e8 ? 0 : 1).replace('.', ',')} tr ₫`;
  if (abs >= 1e3) return `${sign}${vndFormatter.format(abs)} ₫`;
  return `${sign}${abs} ₫`;
}

export function priceLabel(course) {
  const p = pricingOf(course);
  return p.isFree ? 'Miễn Phí' : formatVnd(p.price);
}

// ---------------------------------------------------------------------------
// 5. TRUNG TÂM CHI PHÍ
// ---------------------------------------------------------------------------

export const UNASSIGNED_COST_CENTER = {
  id: 'CC-UNASSIGNED',
  divisionId: null,
  divisionCode: null,
  code: 'UNASSIGNED',
  name: 'Chưa Gán Trung Tâm Chi Phí',
  branch: 'SUPPORTING',
  location: null,
  headcount: 0,
  budgetAnnual: 0,
};

/**
 * Dựng danh sách cost center từ cơ cấu Division + nhân sự thực tế.
 * Mỗi Division ra đúng một cost center, `code` là mã HR 5 số của Division.
 * Ngân sách năm = đầu người × định mức khối, tối thiểu MIN_ANNUAL_BUDGET.
 */
export function buildCostCenters(divisions = [], users = []) {
  const headcountByDivision = users.reduce((acc, u) => {
    const key = u.divisionId || 'UNASSIGNED';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const centers = divisions.map((d) => {
    const headcount = headcountByDivision[d.id] || 0;
    const allowance = ANNUAL_ALLOWANCE_PER_HEAD[d.branch] ?? ANNUAL_ALLOWANCE_PER_HEAD.SUPPORTING;
    return {
      // Mã 5 số chính là danh tính kế toán của trung tâm chi phí.
      id: `CC-${d.costCenter || d.code}`,
      divisionId: d.id,
      divisionCode: d.code,
      code: d.costCenter || d.code,
      name: d.name,
      branch: d.branch,
      branchName: d.branch === 'OPERATIONS' ? 'Khối Vận Hành Siêu Thị' : 'Khối Chức Năng Hỗ Trợ',
      location: d.location || null,
      headcount,
      budgetAnnual: Math.max(MIN_ANNUAL_BUDGET, headcount * allowance),
      budgetPerHead: allowance,
    };
  });

  const unassignedHead = headcountByDivision.UNASSIGNED || 0;
  if (unassignedHead > 0) {
    centers.push({ ...UNASSIGNED_COST_CENTER, headcount: unassignedHead });
  }
  return centers;
}

/**
 * Cost center chịu chi phí cho 1 học viên = cost center của Division họ thuộc,
 * bất kể họ nằm ở Department hay Sub-Department nào bên trong Division đó.
 */
export function costCenterForUser(user, costCenters = []) {
  if (!user) return null;
  return (
    costCenters.find((c) => c.divisionId && c.divisionId === user.divisionId) ||
    costCenters.find((c) => user.costCenterCode && c.code === user.costCenterCode) ||
    costCenters.find((c) => c.divisionCode && c.divisionCode === user.divisionCode) ||
    costCenters.find((c) => c.id === UNASSIGNED_COST_CENTER.id) ||
    null
  );
}

// ---------------------------------------------------------------------------
// 6. SỔ CÁI GIAO DỊCH
// ---------------------------------------------------------------------------

export const TXN_TYPE = { INCOME: 'INCOME', EXPENSE: 'EXPENSE' };
export const TXN_SOURCE = {
  BUDGET_ALLOCATION: 'BUDGET_ALLOCATION',
  ENROLLMENT: 'ENROLLMENT',
  REFUND: 'REFUND',
  MANUAL: 'MANUAL',
};

export const TXN_SOURCE_META = {
  BUDGET_ALLOCATION: { labelVi: 'Cấp Ngân Sách Đào Tạo', tone: 'sage', icon: 'ti-wallet' },
  ENROLLMENT: { labelVi: 'Ghi Danh Khóa Học', tone: 'blue', icon: 'ti-user-plus' },
  REFUND: { labelVi: 'Hoàn Phí Hủy Ghi Danh', tone: 'amber', icon: 'ti-receipt-refund' },
  MANUAL: { labelVi: 'Điều Chỉnh Thủ Công', tone: 'slate', icon: 'ti-pencil' },
};

/**
 * Tạo 1 bút toán chi cho lượt ghi danh. Khóa miễn phí vẫn sinh bút toán với
 * amount = 0 và isFree = true, để báo cáo tách được "lượt học nội bộ 0 đồng"
 * khỏi "lượt học tốn ngân sách" mà không phải dò ngược danh mục khóa học.
 */
export function buildEnrollmentTransaction({ course, user, costCenters = [], date, enrolledVia = 'SELF_ENROLL', id }) {
  if (!course || !user) return null;
  const pricing = pricingOf(course);
  const cc = costCenterForUser(user, costCenters);
  const txnDate = date || new Date().toISOString().slice(0, 10);

  return {
    id: id || `TXN-ENR-${user.userId}-${course.id}`,
    date: txnDate,
    fiscalYear: Number(txnDate.slice(0, 4)) || FISCAL_YEAR,
    type: TXN_TYPE.EXPENSE,
    source: TXN_SOURCE.ENROLLMENT,
    costCenterId: cc?.id || UNASSIGNED_COST_CENTER.id,
    costCenterCode: cc?.code || UNASSIGNED_COST_CENTER.code,
    costCenterName: cc?.name || UNASSIGNED_COST_CENTER.name,
    branch: cc?.branch || 'SUPPORTING',
    // Chiều tổ chức của học viên tại thời điểm ghi danh — giữ trong bút toán để
    // báo cáo sau này không phải join ngược danh bạ nhân sự (vốn có thể đã đổi).
    divisionId: user.divisionId || cc?.divisionId || null,
    divisionName: user.divisionName || cc?.name || null,
    departmentName: user.departmentName || null,
    subDepartmentName: user.subDepartmentName || null,
    courseId: course.id,
    courseCode: course.code || course.id,
    courseTitle: course.title,
    courseCategory: course.category || null,
    costType: pricing.costType,
    vendor: pricing.vendor,
    userId: user.userId,
    userName: user.fullName || user.userId,
    personnelNumber: user.personnelNumber || null,
    amount: pricing.price,
    currency: pricing.currency,
    isFree: pricing.isFree,
    enrolledVia,
    note: pricing.isFree
      ? 'Khóa nội bộ miễn phí — ghi nhận lượt học, không trừ ngân sách.'
      : `Ghi danh khóa có phí (${COST_TYPE_META[pricing.costType]?.labelVi || pricing.costType}).`,
  };
}

/** Bút toán thu: cấp ngân sách đào tạo năm cho 1 cost center. */
export function buildBudgetTransaction(costCenter, fiscalYear = FISCAL_YEAR) {
  return {
    id: `TXN-BUD-${fiscalYear}-${costCenter.id}`,
    date: `${fiscalYear}-01-01`,
    fiscalYear,
    type: TXN_TYPE.INCOME,
    source: TXN_SOURCE.BUDGET_ALLOCATION,
    costCenterId: costCenter.id,
    costCenterCode: costCenter.code,
    costCenterName: costCenter.name,
    branch: costCenter.branch,
    divisionId: costCenter.divisionId || null,
    divisionName: costCenter.name,
    departmentName: null,
    subDepartmentName: null,
    courseId: null,
    courseCode: null,
    courseTitle: null,
    courseCategory: null,
    costType: null,
    vendor: null,
    userId: null,
    userName: null,
    personnelNumber: null,
    amount: costCenter.budgetAnnual,
    currency: CURRENCY,
    isFree: false,
    note: `Ngân sách đào tạo năm ${fiscalYear} cấp cho ${costCenter.headcount} nhân sự.`,
  };
}

// Trải đều ngày ghi danh lịch sử ra 8 tháng đầu năm tài chính để biểu đồ xu
// hướng có dữ liệu thật thay vì dồn hết vào một mốc.
function seededHistoricalDate(seed, fiscalYear = FISCAL_YEAR) {
  const month = (seed % 8) + 1;
  const day = ((seed * 7) % 27) + 1;
  return `${fiscalYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Sổ cái mở đầu, suy ra từ dữ liệu tĩnh HRIS (ma trận ghi danh + ngân sách).
 * KHÔNG lưu xuống localStorage — chỉ giao dịch phát sinh trong phiên mới lưu,
 * đúng mô hình overlay của `enrollments` trong CourseStore.
 */
export function seedOpeningLedger({ costCenters = [], courses = [], users = [], enrollmentMatrix = {}, fiscalYear = FISCAL_YEAR }) {
  const ledger = costCenters.filter((c) => c.budgetAnnual > 0).map((c) => buildBudgetTransaction(c, fiscalYear));
  const courseById = new Map(courses.map((c) => [c.id, c]));

  users.forEach((user, uIdx) => {
    const enrolled = enrollmentMatrix[user.userId] || {};
    Object.keys(enrolled).forEach((courseId, cIdx) => {
      const course = courseById.get(courseId);
      if (!course) return;
      const txn = buildEnrollmentTransaction({
        course,
        user,
        costCenters,
        date: seededHistoricalDate(uIdx * 13 + cIdx * 5, fiscalYear),
        enrolledVia: enrolled[courseId]?.enrolledVia || 'HRIS_ASSIGNMENT',
        id: `TXN-ENR-${user.userId}-${courseId}`,
      });
      if (txn) ledger.push(txn);
    });
  });

  return ledger;
}

// ---------------------------------------------------------------------------
// 7. TỔNG HỢP BÁO CÁO
// ---------------------------------------------------------------------------

function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/**
 * Gộp sổ cái thành các lát cắt báo cáo: tổng thu/chi, theo cost center, theo
 * khóa học, theo tháng và theo loại chi phí.
 */
export function summarizeLedger(ledger = [], { costCenters = [], courses = [] } = {}) {
  const totals = {
    income: 0,
    expense: 0,
    balance: 0,
    utilization: 0,
    txnCount: ledger.length,
    paidEnrollments: 0,
    freeEnrollments: 0,
    totalEnrollments: 0,
    distinctLearners: 0,
    costPerLearner: 0,
  };

  const ccMap = new Map(
    costCenters.map((c) => [
      c.id,
      { ...c, budget: c.budgetAnnual, income: 0, spent: 0, remaining: 0, utilization: 0, paidEnrollments: 0, freeEnrollments: 0, learners: new Set(), txnCount: 0 },
    ])
  );
  const courseMap = new Map();
  const byMonth = new Map();
  const byCostType = new Map();
  const learners = new Set();

  // Bút toán trỏ tới một cost center không có trong danh sách (nhân sự chưa gán
  // Division, hoặc Division bị xóa sau khi đã ghi sổ) vẫn phải xuất hiện trong
  // báo cáo — nếu bỏ qua thì tổng bóc theo cost center sẽ không khớp tổng chi.
  function bucketFor(t) {
    if (!t.costCenterId) return null;
    let cc = ccMap.get(t.costCenterId);
    if (!cc) {
      cc = {
        id: t.costCenterId,
        code: t.costCenterCode || t.costCenterId,
        name: t.costCenterName || t.costCenterId,
        branch: t.branch || null,
        branchName: null,
        headcount: 0,
        budgetAnnual: 0,
        budget: 0,
        income: 0,
        spent: 0,
        remaining: 0,
        utilization: 0,
        paidEnrollments: 0,
        freeEnrollments: 0,
        learners: new Set(),
        txnCount: 0,
      };
      ccMap.set(t.costCenterId, cc);
    }
    return cc;
  }

  ledger.forEach((t) => {
    const cc = bucketFor(t);

    if (t.type === TXN_TYPE.INCOME) {
      totals.income += t.amount;
      if (cc) {
        cc.income += t.amount;
        cc.txnCount += 1;
      }
      return;
    }

    totals.expense += t.amount;
    if (cc) {
      cc.spent += t.amount;
      cc.txnCount += 1;
    }

    if (t.source === TXN_SOURCE.ENROLLMENT) {
      totals.totalEnrollments += 1;
      if (t.isFree) totals.freeEnrollments += 1;
      else totals.paidEnrollments += 1;
      if (t.userId) learners.add(t.userId);
      if (cc) {
        if (t.isFree) cc.freeEnrollments += 1;
        else cc.paidEnrollments += 1;
        if (t.userId) cc.learners.add(t.userId);
      }

      const row = courseMap.get(t.courseId) || {
        courseId: t.courseId,
        courseCode: t.courseCode,
        title: t.courseTitle,
        category: t.courseCategory,
        costType: t.costType,
        isFree: t.isFree,
        unitPrice: t.amount,
        seats: 0,
        spent: 0,
      };
      row.seats += 1;
      row.spent += t.amount;
      courseMap.set(t.courseId, row);
    }

    const monthKey = String(t.date || '').slice(0, 7);
    if (monthKey) byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + t.amount);

    if (t.costType) {
      const bucket = byCostType.get(t.costType) || { costType: t.costType, amount: 0, count: 0 };
      bucket.amount += t.amount;
      bucket.count += 1;
      byCostType.set(t.costType, bucket);
    }
  });

  totals.balance = totals.income - totals.expense;
  totals.utilization = percent(totals.expense, totals.income);
  totals.distinctLearners = learners.size;
  totals.costPerLearner = learners.size ? Math.round(totals.expense / learners.size) : 0;

  const byCostCenter = Array.from(ccMap.values())
    .map((c) => ({
      ...c,
      learners: c.learners.size,
      remaining: c.income - c.spent,
      utilization: percent(c.spent, c.income),
    }))
    .sort((a, b) => b.spent - a.spent);

  // Khóa học chưa ai ghi danh vẫn nên có mặt trong bảng giá, seats = 0.
  const priced = new Map(courseMap);
  courses.forEach((c) => {
    if (priced.has(c.id)) return;
    const p = pricingOf(c);
    priced.set(c.id, {
      courseId: c.id,
      courseCode: c.code || c.id,
      title: c.title,
      category: c.category || null,
      costType: p.costType,
      isFree: p.isFree,
      unitPrice: p.price,
      seats: 0,
      spent: 0,
    });
  });

  const byCourse = Array.from(priced.values()).sort((a, b) => b.spent - a.spent || b.seats - a.seats);

  return {
    totals,
    byCostCenter,
    byCourse,
    byMonth: Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({ key, label: `T${Number(key.slice(5, 7))}`, value })),
    byCostType: Array.from(byCostType.values()).sort((a, b) => b.amount - a.amount),
  };
}

/**
 * Giới hạn sổ cái theo quyền xem: Manager chỉ thấy cost center của mình.
 * Lọc theo divisionId trước rồi mới tới mã 5 số — `divisionCode` trên hồ sơ
 * nhân sự không phải lúc nào cũng trùng `code` của Division, nên không dùng để
 * dựng id cost center.
 */
export function scopeLedgerForUser(ledger = [], user, { seeAll = true } = {}) {
  if (seeAll || !user) return ledger;
  const divisionId = user.divisionId || null;
  const code = user.costCenterCode || null;
  if (!divisionId && !code) return [];
  return ledger.filter(
    (t) => (divisionId && t.divisionId === divisionId) || (code && t.costCenterCode === code)
  );
}

// ---------------------------------------------------------------------------
// 8. CHI PHÍ THEO TỪNG HỌC VIÊN (phục vụ kiểm toán & file HR)
// ---------------------------------------------------------------------------

/**
 * Gộp sổ cái về mức từng nhân sự: công ty đã chi bao nhiêu cho việc học của
 * người này, thuộc mã cost center nào. Nhân sự chưa học buổi nào vẫn xuất hiện
 * với 0 đồng — file kiểm toán cần đủ đầu người của cost center, không chỉ những
 * người có phát sinh.
 */
export function summarizeLearnerCosts(ledger = [], users = []) {
  const rows = new Map();

  users.forEach((u) => {
    rows.set(u.userId, {
      user: u,
      userId: u.userId,
      personnelNumber: u.personnelNumber || null,
      fullName: u.fullName || u.userId,
      // Nhân sự mới thêm qua User Admin chưa chắc đã có costCenterCode ghi sẵn —
      // suy ra từ Division của họ để bảng không hiện UNASSIGNED một cách giả tạo.
      costCenterCode: u.costCenterCode || costCenterCodeOf(u) || null,
      divisionId: u.divisionId || null,
      divisionName: u.divisionName || null,
      departmentName: u.departmentName || null,
      subDepartmentName: u.subDepartmentName || null,
      position: u.position || u.title || null,
      level: u.level || null,
      paidEnrollments: 0,
      freeEnrollments: 0,
      totalEnrollments: 0,
      companyPaid: 0,
    });
  });

  ledger.forEach((t) => {
    if (t.source !== TXN_SOURCE.ENROLLMENT || !t.userId) return;
    let row = rows.get(t.userId);
    if (!row) {
      // Bút toán của người đã rời danh bạ vẫn phải nằm trong báo cáo, nếu không
      // tổng cộng theo học viên sẽ nhỏ hơn tổng chi của cost center.
      row = {
        user: null,
        userId: t.userId,
        personnelNumber: t.personnelNumber || null,
        fullName: t.userName || t.userId,
        costCenterCode: t.costCenterCode || null,
        divisionId: t.divisionId || null,
        divisionName: t.divisionName || null,
        departmentName: t.departmentName || null,
        subDepartmentName: t.subDepartmentName || null,
        position: null,
        level: null,
        paidEnrollments: 0,
        freeEnrollments: 0,
        totalEnrollments: 0,
        companyPaid: 0,
      };
      rows.set(t.userId, row);
    }
    row.totalEnrollments += 1;
    if (t.isFree) row.freeEnrollments += 1;
    else {
      row.paidEnrollments += 1;
      row.companyPaid += t.amount;
    }
  });

  return Array.from(rows.values()).sort(
    (a, b) => b.companyPaid - a.companyPaid || b.totalEnrollments - a.totalEnrollments
  );
}

/**
 * File xuất cho Kế toán / Kiểm toán: 15 cột hồ sơ nhân sự chuẩn của HR, nối
 * thêm phần chi phí đào tạo mà CÔNG TY đã chi cho chính nhân sự đó. Giữ nguyên
 * thứ tự và tên cột HR để file ghép thẳng vào bảng lương / bảng phân bổ chi phí.
 */
export function buildEmployeeCostExportRows(learnerRows = [], { fiscalYear = FISCAL_YEAR } = {}) {
  return learnerRows.map((row) => ({
    ...hrExportRow(row.user || {
      fullName: row.fullName,
      personnelNumber: row.personnelNumber,
      costCenterCode: row.costCenterCode,
      divisionName: row.divisionName,
      departmentName: row.departmentName,
      subDepartmentName: row.subDepartmentName,
      position: row.position,
      level: row.level,
    }),
    'Fiscal Year': fiscalYear,
    'Paid Enrollments': row.paidEnrollments,
    'Free Enrollments': row.freeEnrollments,
    'Company Paid (VND)': row.companyPaid,
    Currency: CURRENCY,
  }));
}
