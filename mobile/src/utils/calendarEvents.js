// src/utils/calendarEvents.js
//
// Gom sự kiện lịch học cá nhân và lịch vận hành đào tạo cho Learner:
// Khóa e-learning, Buổi ILT/Workshop, Lớp học ảo Teams/Zoom, Thi đánh giá, Hạn chứng chỉ.

import { initialRoomBookings } from '../data/roomBookings';
import { normalizeRole } from '../data/roles';

export const EVENT_CATEGORIES = {
  ALL: { id: 'ALL', labelVi: 'Tất Cả', labelEn: 'All Events', icon: 'calendar' },
  ELEARNING: { id: 'ELEARNING', labelVi: 'E-Learning & Hạn Nộp', labelEn: 'E-Learning & Deadlines', icon: 'book', color: '#005BAA' },
  CLASSROOM_ILT: { id: 'CLASSROOM_ILT', labelVi: 'Thực Hành Tại Siêu Thị (ILT)', labelEn: 'In-Person Workshops', icon: 'easel', color: '#009E49' },
  VIRTUAL_CLASS: { id: 'VIRTUAL_CLASS', labelVi: 'Lớp Trực Tuyến (Teams/Zoom)', labelEn: 'Virtual Classes', icon: 'videocam', color: '#7C3AED' },
  ASSESSMENT: { id: 'ASSESSMENT', labelVi: 'Kỳ Thi & Đánh Giá Cấp Bậc', labelEn: 'Assessments & Exams', icon: 'trophy', color: '#D97706' },
  CERTIFICATE: { id: 'CERTIFICATE', labelVi: 'Hết Hạn & Tái Chứng Chỉ', labelEn: 'Certifications', icon: 'medal', color: '#DC2626' },
  OPERATIONAL: { id: 'OPERATIONAL', labelVi: 'Lịch Đào Tạo Vận Hành / Đội Ngũ', labelEn: 'Operational Schedules', icon: 'briefcase', color: '#0F766E' },
};

const DEADLINE_TONE_BY_STATUS = {
  COMPLETED: 'sage',
  OVERDUE: 'rust',
  FAILED: 'rust',
  IN_PROGRESS: 'blue',
  NOT_STARTED: 'slate',
};

const DEADLINE_STATUS_LABEL = {
  COMPLETED: 'Đã Hoàn Thành',
  OVERDUE: 'Quá Hạn',
  FAILED: 'Cần Thi Lại',
  IN_PROGRESS: 'Đang Học',
  NOT_STARTED: 'Chưa Bắt Đầu',
};

/**
 * 1. Sự kiện Deadline E-Learning Cá Nhân
 */
export function buildPersonalDeadlineEvents(courses = [], myEnrollments = {}) {
  const events = [];
  for (const courseId of Object.keys(myEnrollments)) {
    const enrollment = myEnrollments[courseId];
    const course = courses.find((c) => c.id === courseId);
    if (!course) continue;

    const date = enrollment.completedAt || enrollment.dueDate || enrollment.lastActivityAt || '2026-08-28';
    const isCompleted = enrollment.status === 'COMPLETED';
    const tone = DEADLINE_TONE_BY_STATUS[enrollment.status] || 'slate';
    const statusLabel = DEADLINE_STATUS_LABEL[enrollment.status] || 'Chưa Bắt Đầu';

    events.push({
      id: `deadline-${courseId}`,
      scope: 'PERSONAL',
      category: 'ELEARNING',
      categoryLabel: 'Khóa E-Learning',
      icon: 'book',
      date,
      time: '23:59 (Hạn chót)',
      title: course.title,
      subtitle: isCompleted ? `Đã hoàn thành ngày ${date}` : `Hạn chót hoàn thành khóa học`,
      courseCode: course.code,
      courseId: course.id,
      venue: 'Học Trực Tuyến (E-Learning Portal)',
      instructor: course.trainerName || 'Hội Đồng Đào Tạo MMVN',
      status: enrollment.status,
      statusLabel,
      tone,
      actionType: 'START_COURSE',
      actionLabel: isCompleted ? 'Xem Lại Bài Học' : 'Vào Học Ngay',
      progress: enrollment.progress || (isCompleted ? 100 : 0),
      isMandatory: course.courseType === 'MANDATORY',
    });
  }
  return events;
}

/**
 * 2. Buổi Thực Hành Trực Tiếp (ILT Workshops) Cá Nhân Đã Ghi Danh
 */
export function buildPersonalClassroomEvents(classrooms = []) {
  const events = [];
  for (const session of classrooms) {
    if (!session.isEnrolled) continue;

    const isAttended = session.attendanceStatus === 'CHECKED_IN';
    const tone = isAttended ? 'sage' : session.attendanceStatus === 'ABSENT' ? 'rust' : 'blue';
    const statusLabel = isAttended ? 'Đã Điểm Danh' : session.attendanceStatus === 'ABSENT' ? 'Vắng Mặt' : 'Đã Đăng Ký (Chờ Điểm Danh)';

    events.push({
      id: `session-${session.id}`,
      scope: 'PERSONAL',
      category: 'CLASSROOM_ILT',
      categoryLabel: 'Lớp Thực Hành Trực Tiếp',
      icon: 'easel',
      date: session.date || '2026-08-28',
      time: session.time || '08:30 - 11:30',
      title: session.title,
      subtitle: `${session.time} · ${session.venue}`,
      courseCode: session.courseCode || session.id,
      venue: session.venue || 'Xưởng Thực Hành MM An Phú',
      instructor: session.trainerName || 'Giảng Viên Chuyên Trách',
      status: session.attendanceStatus || 'ENROLLED',
      statusLabel,
      tone,
      actionType: 'SCAN_QR',
      actionLabel: isAttended ? 'Đã Điểm Danh' : 'Mở QR Check-in',
      sessionId: session.id,
      qrToken: session.qrToken,
    });
  }
  return events;
}

/**
 * Thu thập toàn bộ sự kiện cho Learner
 */
export function collectLearnerCalendarEvents({ courses = [], classrooms = [], myEnrollments = {}, certificates = [] }) {
  const deadlineEvents = buildPersonalDeadlineEvents(courses, myEnrollments);
  const classroomEvents = buildPersonalClassroomEvents(classrooms);
  
  const certEvents = (certificates || []).map(cert => ({
    id: `cert-${cert.id}`,
    scope: 'PERSONAL',
    category: 'CERTIFICATE',
    categoryLabel: 'Chứng Chỉ Tái Cấp',
    icon: 'medal',
    date: cert.validUntil || '2027-08-28',
    time: '00:00 (Hết hạn)',
    title: `Hạn tái cấp: ${cert.courseName}`,
    subtitle: `Mã chứng chỉ: ${cert.id}`,
    status: 'ACTIVE',
    statusLabel: 'Hiệu Lực',
    tone: 'sage',
  }));

  return [...deadlineEvents, ...classroomEvents, ...certEvents];
}
