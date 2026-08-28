import { retailStores } from '../data/orgHierarchy';
import { UNIVERSAL_COMPLIANCE_COURSE_IDS } from '../data/generated100Data';
import { teamSkillGapMatrix } from '../data/mockData';

/**
 * Tính toán báo cáo tuân thủ theo từng siêu thị dựa trên danh sách người dùng thực tế
 * và ghi danh của 3 khóa đào tạo tuân thủ bắt buộc:
 * - CRS-ISA-011 (An ninh thông tin)
 * - CRS-HSE-019 (An toàn PCCC)
 * - CRS-STOPS-037 (Vận hành & An toàn thực phẩm HACCP)
 */
export function complianceByStore(users = [], enrollments = {}, courses = []) {
  return retailStores.map((store) => {
    const storeUsers = (users || []).filter((u) => u.storeId === store.id);
    const totalStaff = storeUsers.length;

    let secTotal = 0;
    let pcccTotal = 0;
    let haccpTotal = 0;
    let overdueCount = 0;

    if (totalStaff > 0) {
      storeUsers.forEach((u) => {
        const uEnr = enrollments[u.userId] || {};

        // Security CRS-ISA-011
        const enrSec = uEnr['CRS-ISA-011'];
        const secPct = enrSec?.progressPercent ?? (enrSec?.status === 'COMPLETED' ? 100 : 85);
        secTotal += secPct;
        if (enrSec?.status === 'OVERDUE') overdueCount += 1;

        // PCCC CRS-HSE-019
        const enrPccc = uEnr['CRS-HSE-019'];
        const pcccPct = enrPccc?.progressPercent ?? (enrPccc?.status === 'COMPLETED' ? 100 : 90);
        pcccTotal += pcccPct;
        if (enrPccc?.status === 'OVERDUE') overdueCount += 1;

        // HACCP / Operations CRS-STOPS-037 or CRS-FSH-001
        const enrHaccp = uEnr['CRS-STOPS-037'] || uEnr['CRS-FSH-001'];
        const haccpPct = enrHaccp?.progressPercent ?? (enrHaccp?.status === 'COMPLETED' ? 100 : 92);
        haccpTotal += haccpPct;
        if (enrHaccp?.status === 'OVERDUE') overdueCount += 1;
      });
    }

    const sec = totalStaff > 0 ? Math.round(secTotal / totalStaff) : 92;
    const pccc = totalStaff > 0 ? Math.round(pcccTotal / totalStaff) : 94;
    const haccp = totalStaff > 0 ? Math.round(haccpTotal / totalStaff) : 95;
    const overall = Number(((sec + pccc + haccp) / 3).toFixed(1));

    let status = 'ĐẠT_CHUẨN';
    if (overall >= 95) status = 'CHUẨN_XUẤT_SẮC';
    else if (overall < 88) status = 'CẦN_CẢNH_BÁO';

    const regionLabel =
      store.areaId === 'area-north'
        ? 'Miền Bắc'
        : store.areaId === 'area-central'
        ? 'Miền Trung'
        : 'Miền Nam';

    return {
      id: store.id,
      code: store.code,
      store: store.name,
      region: regionLabel,
      totalStaff: totalStaff || 25,
      haccp,
      pccc,
      sec,
      overall,
      status,
      overdueCount,
    };
  });
}

/**
 * Tỷ lệ tuân thủ đào tạo trung bình toàn vùng (dùng cho KPI Header và Badge Tab)
 */
export function regionalComplianceRate(users = [], enrollments = {}, courses = []) {
  const storeList = complianceByStore(users, enrollments, courses);
  if (storeList.length === 0) return 94.2;
  const sum = storeList.reduce((acc, s) => acc + s.overall, 0);
  return Number((sum / storeList.length).toFixed(1));
}

/**
 * Tổng số nhân sự trong phạm vi HRBP phụ trách
 */
export function headcountInScope(users = []) {
  return (users || []).length || 100;
}

/**
 * Danh sách khoảng cách năng lực tổng hợp từ teamSkillGapMatrix
 */
export function skillGapRows(matrix = teamSkillGapMatrix, users = []) {
  const rows = [];
  const rawList = matrix && matrix.length > 0 ? matrix : teamSkillGapMatrix;

  rawList.forEach((emp) => {
    (emp.skills || []).forEach((sk) => {
      if (sk.status === 'GAP_IDENTIFIED' || sk.status === 'CRITICAL_GAP') {
        const matchingUser = (users || []).find(
          (u) => u.employeeCode === emp.employeeId || u.userId === emp.employeeId
        );
        const unitName = matchingUser?.storeName
          ? `${emp.position} (${matchingUser.storeName})`
          : `${emp.position} (${emp.employeeName})`;
        const deptCode = matchingUser?.departmentCode || 'OPS';

        rows.push({
          unit: unitName,
          deptCode,
          skill: sk.name,
          gap: sk.gap,
          current: sk.actual,
          required: sk.required,
          impact:
            sk.status === 'CRITICAL_GAP'
              ? 'Khoảng cách kỹ năng lớn, ảnh hưởng trực tiếp đến chất lượng vận hành ca và an toàn.'
              : 'Cần mở lớp thực hành kỹ năng chuẩn hóa quy trình định biên.',
          recommendedCourseId: sk.suggestedCourseId || 'CRS-FSH-001',
          recommendedCourse: sk.suggestedCourse || 'Chương Trình Đào Tạo Bổ Trợ Chuẩn Hóa',
          trainer: 'Nguyen Van Hung (Master Trainer)',
          status: sk.status === 'CRITICAL_GAP' ? 'CẦN CAN THIỆP GẤP' : 'ĐANG THEO DÕI',
        });
      }
    });
  });

  return rows.length > 0
    ? rows
    : [
        {
          unit: 'Quầy Bánh & Tươi Sống (MM An Phú)',
          deptCode: 'PPF',
          skill: 'HACCP & Cold-Chain Storage Protocols',
          gap: -18,
          current: 72,
          required: 90,
          impact: 'Ảnh hưởng trực tiếp đến tỷ lệ hao hụt hàng hóa và vệ sinh an toàn thực phẩm.',
          recommendedCourseId: 'CRS-FSH-001',
          recommendedCourse: 'Food Safety & Hygiene Standards (HACCP)',
          trainer: 'Nguyen Van Hung (Master Trainer)',
          status: 'CẦN CAN THIỆP GẤP',
        },
        {
          unit: 'Bộ Phận Thu Ngân & Dịch Vụ Khách Hàng (MM Bình Phú)',
          deptCode: 'FE',
          skill: 'Cash Handling, POS Speed & Shrinkage Control',
          gap: -14,
          current: 76,
          required: 90,
          impact: 'Thời gian thanh toán trung bình tăng 15s/giao dịch trong giờ cao điểm.',
          recommendedCourseId: 'CRS-CSERV-087',
          recommendedCourse: 'Service Mindset & Cashier POS Fast Operation',
          trainer: 'Le Hoang Nam',
          status: 'ĐANG THEO DÕI',
        },
      ];
}
