// src/utils/recertification.js
//
// Manages the retraining & recurring recertification cycle (Recertification Engine)
// MM Mega Market & Big C retail / supermarket industry standards:
// - Allows configuring the validity period (validityPeriodMonths): 6, 12, 24, 36 months or lifetime (0).
// - Allows configuring the advance warning days (recertificationWarningDays): 15, 30, 45, 60 days.
// - Allows configuring the recertification method (recertificationMethod):
//     * RETAKE_FULL_COURSE: retake all content & lessons + sit the examination
//     * ASSESSMENT_ONLY: sit the standardized examination only (fast-track exam)
//     * IN_PERSON_WORKSHOP: attend an in-person workshop / training class

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
    vi: 'Retake all content & sit the examination',
    en: 'Retake Full Course & Assessment',
    badge: 'Retake Everything',
  },
  ASSESSMENT_ONLY: {
    vi: 'Fast-track exam only',
    en: 'Fast-track Assessment Only',
    badge: 'Sit The Examination',
  },
  IN_PERSON_WORKSHOP: {
    vi: 'Attend an in-person training workshop',
    en: 'In-person Training Workshop',
    badge: 'In-Person Class',
  },
};

/**
 * Computes the expiry date from completedAt and the validity in months
 */
export function computeValidUntilDate(completedAtDateStr, validityPeriodMonths = 12) {
  if (!completedAtDateStr || validityPeriodMonths === 0) return null;
  const d = new Date(completedAtDateStr);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + parseInt(validityPeriodMonths, 10));
  return d.toISOString().slice(0, 10);
}

/**
 * Computes the recertification status of a course
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

  // If the certificate is lifetime (validityMonths === 0)
  if (validityMonths === 0) {
    return {
      state: RECERTIFICATION_STATE.ACTIVE,
      isExpired: false,
      isDueSoon: false,
      needsRecertification: false,
      validUntil: null,
      isLifetime: true,
      diffDays: null,
      statusLabel: 'Lifetime Certificate',
      statusLabelEn: 'Lifetime Credential',
      badgeTone: 'sage',
      actionLabel: 'Review The Lesson',
      actionLabelEn: 'Review Course',
      alertMessage: null,
      warningDays,
      validityMonths: 0,
      recertMethod,
    };
  }

  // Take the expiry date from the certificate or from the enrollment
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
    // Expired (EXPIRED)
    const overdueDays = Math.abs(diffDays);
    const statusLabel = isFullCourse ? 'Study & Recertify' : 'Sit The Recertification Exam';
    const actionLabel = isFullCourse ? 'Retake & Recertify Now' : 'Take The Recertification Exam';

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
        ? `This course's certificate expired on ${validUntil} (${overdueDays} days overdue). The course has been fully reopened so you can revise and sit the recertification exam.`
        : `This course's certificate expired on ${validUntil} (${overdueDays} days overdue). Please complete the examination to be issued a new certificate.`,
    };
  }

  if (diffDays <= warningDays) {
    // Due within warningDays
    const statusLabel = isFullCourse
      ? `Recertification Study (${diffDays} days left)`
      : `Recertification Due (${diffDays} days left)`;
    const actionLabel = isFullCourse
      ? 'Retake & Recertify Early'
      : 'Revise & Sit The Exam Early';

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
        ? `The certificate expires on ${validUntil} (${diffDays} days left). The lessons have been reopened so you can revise and recertify early.`
        : `The certificate expires on ${validUntil} (${diffDays} days left). You can sit the recertification exam now to extend it by another ${validityMonths} months.`,
    };
  }

  // Valid long-term
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
    statusLabel: 'Certificate Valid',
    statusLabelEn: 'Certificate Valid',
    badgeTone: 'sage',
    actionLabel: 'Review The Lesson',
    actionLabelEn: 'Review Course',
    alertMessage: null,
  };
}
