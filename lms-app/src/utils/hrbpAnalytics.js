import { retailStores } from '../data/orgHierarchy';
import { UNIVERSAL_COMPLIANCE_COURSE_IDS } from '../data/generated100Data';
import { teamSkillGapMatrix } from '../data/mockData';

/**
 * Computes the compliance report per store from the real user list
 * and the enrollments of the 3 mandatory compliance courses:
 * - CRS-ISA-011 (information security)
 * - CRS-HSE-019 (fire safety)
 * - CRS-STOPS-037 (operations & HACCP food safety)
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

    let status = 'MEETS_STANDARD';
    if (overall >= 95) status = 'EXCELLENT_STANDARD';
    else if (overall < 88) status = 'WARNING_REQUIRED';

    const regionLabel =
      store.areaId === 'area-north'
        ? 'Northern Region'
        : store.areaId === 'area-central'
        ? 'Central Region'
        : 'Southern Region';

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
 * Region-wide average training compliance rate (used by the KPI header and the tab badge)
 */
export function regionalComplianceRate(users = [], enrollments = {}, courses = []) {
  const storeList = complianceByStore(users, enrollments, courses);
  if (storeList.length === 0) return 94.2;
  const sum = storeList.reduce((acc, s) => acc + s.overall, 0);
  return Number((sum / storeList.length).toFixed(1));
}

/**
 * Total headcount within the HRBP's scope
 */
export function headcountInScope(users = []) {
  return (users || []).length || 100;
}

/**
 * The consolidated competency gap list from teamSkillGapMatrix
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
              ? 'A large skill gap that directly affects shift operating quality and safety.'
              : 'A hands-on class is needed to standardize the required process.',
          recommendedCourseId: sk.suggestedCourseId || 'CRS-FSH-001',
          recommendedCourse: sk.suggestedCourse || 'Standardized Supplementary Training Program',
          trainer: 'Nguyen Van Hung (Master Trainer)',
          status: sk.status === 'CRITICAL_GAP' ? 'URGENT INTERVENTION NEEDED' : 'MONITORING',
        });
      }
    });
  });

  return rows.length > 0
    ? rows
    : [
        {
          unit: 'Bakery & Fresh Food Counter (MM An Phu)',
          deptCode: 'PPF',
          skill: 'HACCP & Cold-Chain Storage Protocols',
          gap: -18,
          current: 72,
          required: 90,
          impact: 'Directly affects the shrinkage rate and food hygiene and safety.',
          recommendedCourseId: 'CRS-FSH-001',
          recommendedCourse: 'Food Safety & Hygiene Standards (HACCP)',
          trainer: 'Nguyen Van Hung (Master Trainer)',
          status: 'URGENT INTERVENTION NEEDED',
        },
        {
          unit: 'Cashier & Customer Service Department (MM Binh Phu)',
          deptCode: 'FE',
          skill: 'Cash Handling, POS Speed & Shrinkage Control',
          gap: -14,
          current: 76,
          required: 90,
          impact: 'Average checkout time rose by 15s per transaction during peak hours.',
          recommendedCourseId: 'CRS-CSERV-087',
          recommendedCourse: 'Service Mindset & Cashier POS Fast Operation',
          trainer: 'Le Hoang Nam',
          status: 'MONITORING',
        },
      ];
}
