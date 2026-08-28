// src/utils/recertification.js
//
// Quản lý chu kỳ tái đào tạo & tái cấp chứng chỉ định kỳ (Recertification Engine)
// Quy chuẩn ngành bán lẻ / siêu thị MM Mega Market & Big C:
// - Cho phép cấu hình thời hạn hiệu lực (validityPeriodMonths): 6, 12, 24, 36 tháng hoặc Vĩnh viễn (0).
// - Cho phép cấu hình số ngày cảnh báo trước hạn (recertificationWarningDays): 15, 30, 45, 60 ngày.
// - Cho phép cấu hình hình thức tái cấp (recertificationMethod):
//     * RETAKE_FULL_COURSE: Học lại toàn bộ nội dung & bài giảng + Thi sát hạch
//     * ASSESSMENT_ONLY: Chỉ thi sát hạch chuẩn hóa (Fast-track Exam)
//     * IN_PERSON_WORKSHOP: Tham gia workshop / lớp huấn luyện trực tiếp

import { todayDateString, parseDateString } from './calendarDate';

export const RECERTIFICATION_STATE = {
  ACTIVE: 'ACTIVE',
  DUE_SOON: 'DUE_SOON',
  EXPIRED: 'EXPIRED',
  NONE: 'NONE',
};

export const RECERTIFICATION_METHODS = {
  RETAKE_FULL_COURSE: 'RETAKE_FULL_COURSE',
  ASSESSMENT_ONLY: 'ASSESSMENT_ONLY',
  IN_PERSON_WORKSHOP: 'IN_PERSON_WORKSHOP',
};

export const RECERTIFICATION_METHOD_LABELS = {
  RETAKE_FULL_COURSE: {
    vi: 'Học lại toàn bộ nội dung & Thi sát hạch',
    en: 'Retake Full Course & Assessment',
    badge: 'Học Lại Toàn Bộ',
  },
  ASSESSMENT_ONLY: {
    vi: 'Chỉ thi sát hạch nhanh (Fast-track Exam)',
    en: 'Fast-track Assessment Only',
    badge: 'Thi Sát Hạch',
  },
  IN_PERSON_WORKSHOP: {
    vi: 'Tham gia lớp huấn luyện trực tiếp (Workshop)',
    en: 'In-person Training Workshop',
    badge: 'Lớp Trực Tiếp',
  },
};

/**
 * Tính toán ngày hết hạn dựa vào completedAt và số tháng hiệu lực
 */
export function computeValidUntilDate(completedAtDateStr, validityPeriodMonths = 12) {
  if (!completedAtDateStr || validityPeriodMonths === 0) return null;
  const d = new Date(completedAtDateStr);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + parseInt(validityPeriodMonths, 10));
  return d.toISOString().slice(0, 10);
}

/**
 * Tính toán trạng thái tái cấp chứng chỉ cho một khóa học
 */
export function computeCourseRecertification(course, enrollment, certificate) {
  if (!course || !course.configuration?.certificateEnabled) {
    return {
      state: RECERTIFICATION_STATE.NONE,
      isExpired: false,
      isDueSoon: false,
      needsRecertification: false,
      validUntil: null,
      diffDays: null,
      statusLabel: null,
      badgeTone: 'slate',
      actionLabel: null,
      warningDays: 30,
      validityMonths: 12,
      recertMethod: RECERTIFICATION_METHODS.ASSESSMENT_ONLY,
    };
  }

  const cfg = course.configuration || {};
  const validityMonths = cfg.validityPeriodMonths !== undefined ? parseInt(cfg.validityPeriodMonths, 10) : 12;
  const warningDays = cfg.recertificationWarningDays !== undefined ? parseInt(cfg.recertificationWarningDays, 10) : 30;
  const recertMethod = cfg.recertificationMethod || RECERTIFICATION_METHODS.RETAKE_FULL_COURSE;

  // Nếu chứng chỉ vĩnh viễn (validityMonths === 0)
  if (validityMonths === 0) {
    return {
      state: RECERTIFICATION_STATE.ACTIVE,
      isExpired: false,
      isDueSoon: false,
      needsRecertification: false,
      validUntil: null,
      isLifetime: true,
      diffDays: null,
      statusLabel: 'Chứng Chỉ Vĩnh Viễn',
      statusLabelEn: 'Lifetime Credential',
      badgeTone: 'sage',
      actionLabel: 'Xem Lại Bài Học',
      actionLabelEn: 'Review Course',
      alertMessage: null,
      warningDays,
      validityMonths: 0,
      recertMethod,
    };
  }

  // Lấy ngày hết hạn từ chứng chỉ hoặc từ enrollment
  const validUntil = certificate?.validUntil || enrollment?.validUntil || (
    enrollment?.completedAt ? computeValidUntilDate(enrollment.completedAt, validityMonths) : null
  );

  if (!validUntil) {
    return {
      state: RECERTIFICATION_STATE.NONE,
      isExpired: false,
      isDueSoon: false,
      needsRecertification: false,
      validUntil: null,
      diffDays: null,
      statusLabel: null,
      badgeTone: 'slate',
      actionLabel: null,
      warningDays,
      validityMonths,
      recertMethod,
    };
  }

  const today = todayDateString();
  const { y: y1, m: m1, d: d1 } = parseDateString(today);
  const { y: y2, m: m2, d: d2 } = parseDateString(validUntil);
  const diffDays = Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / (1000 * 60 * 60 * 24));

  const isFullCourse = recertMethod === RECERTIFICATION_METHODS.RETAKE_FULL_COURSE;

  if (diffDays < 0) {
    // Đã hết hạn (EXPIRED)
    const overdueDays = Math.abs(diffDays);
    const statusLabel = isFullCourse ? 'Học & Tái Cấp Chứng Chỉ' : 'Thi Tái Cấp Chứng Chỉ';
    const actionLabel = isFullCourse ? 'Học Lại & Tái Cấp Ngay' : 'Làm Bài Thi Tái Cấp';

    return {
      state: RECERTIFICATION_STATE.EXPIRED,
      isExpired: true,
      isDueSoon: false,
      needsRecertification: true,
      validUntil,
      diffDays: overdueDays,
      warningDays,
      validityMonths,
      recertMethod,
      isFullCourse,
      statusLabel,
      statusLabelEn: isFullCourse ? 'Retake & Recertify' : 'Exam Recertification Required',
      badgeTone: 'rust',
      actionLabel,
      actionLabelEn: isFullCourse ? 'Retake Course Now' : 'Take Recertification Exam',
      alertMessage: isFullCourse
        ? `Chứng chỉ của khóa học này đã hết hiệu lực vào ngày ${validUntil} (quá hạn ${overdueDays} ngày). Khóa học đã mở lại toàn bộ nội dung để bạn ôn tập và tham gia sát hạch tái cấp.`
        : `Chứng chỉ của khóa học này đã hết hiệu lực vào ngày ${validUntil} (quá hạn ${overdueDays} ngày). Vui lòng hoàn thành bài thi sát hạch để được cấp chứng chỉ mới.`,
    };
  }

  if (diffDays <= warningDays) {
    // Cận hạn trong vòng warningDays
    const statusLabel = isFullCourse
      ? `Học Tái Cấp (Còn ${diffDays} ngày)`
      : `Cận Hạn Tái Cấp (Còn ${diffDays} ngày)`;
    const actionLabel = isFullCourse
      ? 'Học Lại & Tái Cấp Sớm'
      : 'Ôn Tập & Thi Sớm';

    return {
      state: RECERTIFICATION_STATE.DUE_SOON,
      isExpired: false,
      isDueSoon: true,
      needsRecertification: true,
      validUntil,
      diffDays,
      warningDays,
      validityMonths,
      recertMethod,
      isFullCourse,
      statusLabel,
      statusLabelEn: `Due for Recertification (In ${diffDays} days)`,
      badgeTone: 'amber',
      actionLabel,
      actionLabelEn: isFullCourse ? 'Retake & Recertify Early' : 'Review & Take Exam Early',
      alertMessage: isFullCourse
        ? `Chứng chỉ sẽ hết hiệu lực vào ngày ${validUntil} (còn ${diffDays} ngày). Hệ thống đã mở khóa lại bài học để bạn chủ động ôn tập và hoàn thành tái cấp sớm.`
        : `Chứng chỉ sẽ hết hiệu lực vào ngày ${validUntil} (còn ${diffDays} ngày). Bạn có thể làm bài sát hạch tái cấp ngay bây giờ để gia hạn thêm ${validityMonths} tháng.`,
    };
  }

  // Còn hiệu lực dài hạn
  return {
    state: RECERTIFICATION_STATE.ACTIVE,
    isExpired: false,
    isDueSoon: false,
    needsRecertification: false,
    validUntil,
    diffDays,
    warningDays,
    validityMonths,
    recertMethod,
    isFullCourse,
    statusLabel: 'Chứng Chỉ Còn Hiệu Lực',
    statusLabelEn: 'Certificate Valid',
    badgeTone: 'sage',
    actionLabel: 'Xem Lại Bài Học',
    actionLabelEn: 'Review Course',
    alertMessage: null,
  };
}
