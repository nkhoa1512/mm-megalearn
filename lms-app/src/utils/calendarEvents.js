// src/utils/calendarEvents.js
//
// Gom sự kiện lịch học cá nhân và lịch vận hành đào tạo cho toàn bộ 6 Role:
// (1) Learner: Khóa e-learning, Buổi ILT/Workshop, Lớp học ảo Teams/Zoom, Thi đánh giá, Hạn chứng chỉ.
// (2) Manager: Lịch cá nhân + Lịch đào tạo & Hạn hoàn thành của Đội ngũ nhân viên trực thuộc.
// (3) Trainer: Lịch cá nhân + Lịch Giảng dạy đứng lớp, Live QR, Đặt phòng thực hành Lab.
// (4) HRBP: Lịch cá nhân + Lịch đào tạo can thiệp siêu thị, Kế nhiệm 70-20-10, Kiểm toán tuân thủ.
// (5) User Admin: Lịch cá nhân + Tổng lịch đào tạo doanh nghiệp, Đợt thi cấp bậc Level Gate.
// (6) SysAdmin: Lịch cá nhân + Lịch đồng bộ SAP HRIS, Bảo trì hệ thống, Kiểm toán ISO 27001.

import { initialRoomBookings } from '../data/roomBookings';
import { normalizeRole } from '../data/roles';

export const EVENT_CATEGORIES = {
  ALL: { id: 'ALL', labelVi: 'Tất Cả', labelEn: 'All Events', icon: 'ti-calendar' },
  ELEARNING: { id: 'ELEARNING', labelVi: 'E-Learning & Hạn Nộp', labelEn: 'E-Learning & Deadlines', icon: 'ti-book-2', color: 'var(--mm-blue)' },
  CLASSROOM_ILT: { id: 'CLASSROOM_ILT', labelVi: 'Thực Hành Tại Siêu Thị (ILT)', labelEn: 'In-Person Workshops', icon: 'ti-chalkboard', color: 'var(--bigc-green)' },
  VIRTUAL_CLASS: { id: 'VIRTUAL_CLASS', labelVi: 'Lớp Trực Tuyến (Teams/Zoom)', labelEn: 'Virtual Classes', icon: 'ti-video', color: '#7C3AED' },
  ASSESSMENT: { id: 'ASSESSMENT', labelVi: 'Kỳ Thi & Đánh Giá Cấp Bậc', labelEn: 'Assessments & Exams', icon: 'ti-trophy', color: '#D97706' },
  CERTIFICATE: { id: 'CERTIFICATE', labelVi: 'Hết Hạn & Tái Chứng Chỉ', labelEn: 'Certifications', icon: 'ti-certificate', color: '#DC2626' },
  OPERATIONAL: { id: 'OPERATIONAL', labelVi: 'Lịch Đào Tạo Vận Hành / Đội Ngũ', labelEn: 'Operational Schedules', icon: 'ti-briefcase', color: '#0F766E' },
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
function buildPersonalDeadlineEvents(courses = [], myEnrollments = {}) {
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
      icon: 'ti-book-2',
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
      actionUrl: `/learner/courses/${courseId}`,
      progress: enrollment.progress || (isCompleted ? 100 : 0),
      isMandatory: course.courseType === 'MANDATORY',
    });
  }
  return events;
}

/**
 * 2. Buổi Thực Hành Trực Tiếp (ILT Workshops) Cá Nhân Đã Ghi Danh
 */
function buildPersonalClassroomEvents(classrooms = []) {
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
      icon: 'ti-chalkboard',
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
      actionUrl: '/learner/classrooms',
      sessionId: session.id,
      qrToken: session.qrToken,
    });
  }
  return events;
}

/**
 * 3. Lớp Học Ảo Trực Tuyến (Virtual Class MS Teams / Zoom)
 */
function buildPersonalVirtualClassEvents(courses = []) {
  const events = [];
  const virtualCourses = courses.filter((c) => c.deliveryType === 'ONLINE_ELEARNING' && c.onlineClassType === 'VIRTUAL_CLASS' && c.virtualMeeting);

  for (const course of virtualCourses) {
    const meeting = course.virtualMeeting;
    const date = meeting.scheduleDate || '2026-08-30';
    const time = meeting.scheduleTime || '14:00 - 16:30';
    const platform = meeting.platform || 'Teams';

    events.push({
      id: `virtual-${course.id}`,
      scope: 'PERSONAL',
      category: 'VIRTUAL_CLASS',
      categoryLabel: `Lớp Trực Tuyến (${platform})`,
      icon: 'ti-video',
      date,
      time,
      title: course.title,
      subtitle: `${time} · Phòng họp trực tuyến ${platform}`,
      courseCode: course.code,
      courseId: course.id,
      venue: `${platform} Live Virtual Room`,
      instructor: meeting.instructorName || course.trainerName || 'Ban Đào Tạo Trực Tuyến',
      status: meeting.status || 'UPCOMING',
      statusLabel: 'Lớp Học Ảo Trực Tiếp',
      tone: 'blue',
      actionType: 'HOST_MEETING',
      actionLabel: 'Tham Gia Phòng Họp',
      actionUrl: meeting.meetingUrl || '#',
      meetingUrl: meeting.meetingUrl,
    });
  }
  return events;
}

/**
 * 4. Kỳ Thi & Đánh Giá Năng Lực Cấp Bậc
 */
function buildPersonalAssessmentEvents(assessments = []) {
  return [
    {
      id: 'assess-gate-2026-08',
      scope: 'PERSONAL',
      category: 'ASSESSMENT',
      categoryLabel: 'Thi Đánh Giá Năng Lực',
      icon: 'ti-trophy',
      date: '2026-08-29',
      time: '09:00 - 10:30 (90 phút)',
      title: 'Kỳ Thi Đánh Giá Tiêu Chuẩn Nghiệp Vụ Cấp Bậc (Level Gate Exam Q3)',
      subtitle: 'Bài kiểm tra trắc nghiệm 30 câu & Xử lý tình huống vận hành siêu thị',
      courseCode: 'ASM-GATE-Q3',
      venue: 'Phòng Lab Khảo Thí Trực Tuyến',
      instructor: 'Hội Đồng Giám Sát Khảo Thí MMVN',
      status: 'UPCOMING',
      statusLabel: 'Bắt Buộc Tham Gia',
      tone: 'amber',
      actionType: 'START_ASSESSMENT',
      actionLabel: 'Vào Phòng Khảo Thí',
      actionUrl: '/learner/catalog?tab=assessment',
    },
    {
      id: 'cert-renew-pccc',
      scope: 'PERSONAL',
      category: 'CERTIFICATE',
      categoryLabel: 'Tái Chứng Chỉ Định Kỳ',
      icon: 'ti-certificate',
      date: '2026-09-10',
      time: 'Hạn tái cấp: 2026-09-10',
      title: 'Chứng Chỉ An Toàn Lao Động & PCCC Siêu Thị Định Kỳ 2026',
      subtitle: 'Yêu cầu tái đào tạo và sát hạch lại trước khi hết hiệu lực 12 tháng',
      courseCode: 'CERT-HSE-PCCC',
      venue: 'Sân Tập PCCC & Thoát Hiểm Siêu Thị',
      instructor: 'Đội Trưởng An Toàn HSE & Lực Lượng PCCC Quận',
      status: 'NEEDS_RENEWAL',
      statusLabel: 'Cận Hạn Tái Cấp (12 Ngày)',
      tone: 'rust',
      actionType: 'START_COURSE',
      actionLabel: 'Xem Khóa Ôn Tập',
      actionUrl: '/learner/certificates',
    }
  ];
}

/**
 * 5. Lịch Vận Hành Theo 6 Role (Operational & Team Schedule)
 */
function buildOperationalEventsByRole(role, { courses = [], classrooms = [], users = [], currentUser }) {
  const norm = normalizeRole(role);
  const events = [];

  // MANAGER: Lịch Đội Ngũ Nhân Viên
  if (norm === 'manager' || norm === 'useradmin' || norm === 'sysadmin') {
    events.push(
      {
        id: 'mgr-team-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: 'Hạn Đào Tạo Đội Ngũ',
        icon: 'ti-users',
        date: '2026-08-28',
        time: '23:59 Hạn Chót',
        title: 'Hạn Hoàn Thành ATVSTP & HACCP Quầy Bánh (Minh Tran & Sarah Johnson)',
        subtitle: 'Bộ Phận Bánh Mì & Bánh Ngọt (MM An Phú) · 2/4 Nhân viên chưa xong',
        venue: 'MM An Phú - Bộ Phận PPF',
        instructor: 'Quản Lý Trực Tiếp Giám Sát',
        status: 'URGENT',
        statusLabel: 'Hạn Hôm Nay',
        tone: 'rust',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'Gửi Nhắc Nhở',
        actionUrl: '/manager/team',
      },
      {
        id: 'mgr-team-2',
        scope: 'OPERATIONAL',
        category: 'CLASSROOM_ILT',
        categoryLabel: 'Cử Nhân Viên Đi Học ILT',
        icon: 'ti-school',
        date: '2026-09-02',
        time: '08:30 - 11:30',
        title: 'Thực Hành Vận Hành Máy Rửa Khay & Khử Trùng Khay Bánh (Carlos Reyes)',
        subtitle: 'Cử 2 nhân viên ca sáng tham gia xưởng thực hành',
        venue: 'Xưởng Bánh Tươi MM An Phú',
        instructor: 'Nguyễn Văn Hùng (Trainer)',
        status: 'SCHEDULED',
        statusLabel: 'Đã Xác Nhận Đi Học',
        tone: 'blue',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'Xem Lịch Ca Học',
        actionUrl: '/manager/team',
      }
    );
  }

  // TRAINER / L&D: Lịch Giảng Dạy & Phòng Lab
  if (norm === 'trainer' || norm === 'useradmin' || norm === 'sysadmin') {
    events.push(
      {
        id: 'tr-teach-1',
        scope: 'OPERATIONAL',
        category: 'CLASSROOM_ILT',
        categoryLabel: 'Lớp Giảng Dạy Trực Tiếp (ILT)',
        icon: 'ti-school',
        date: '2026-08-28',
        time: '08:30 - 11:30 (3.0 Giờ)',
        title: 'Thực Hành Tiêu Chuẩn An Toàn Vệ Sinh & Lò Nướng Deck Oven Công Nghiệp',
        subtitle: 'Sĩ số: 21/25 Học Viên · Điểm danh tự động qua Live QR',
        venue: 'Fresh Food & Bakery Practical Lab (MM An Phú)',
        instructor: currentUser?.fullName || 'Nguyễn Văn Hùng (Chủ Trì)',
        status: 'UPCOMING',
        statusLabel: 'Lớp Đứng Hôm Nay',
        tone: 'sage',
        actionType: 'PROJECT_QR',
        actionLabel: 'Chiếu Live QR Điểm Danh',
        actionUrl: '/trainer',
        qrToken: 'MMVN-QR-CRS-BAKERY-LIVE',
      },
      {
        id: 'tr-teach-2',
        scope: 'OPERATIONAL',
        category: 'VIRTUAL_CLASS',
        categoryLabel: 'Lớp Giảng Dạy Trực Tuyến (Virtual Class)',
        icon: 'ti-video',
        date: '2026-08-30',
        time: '14:00 - 16:30 (2.5 Giờ)',
        title: 'Hội Thảo Trực Tuyến: Quản Trị Tồn Kho & Kiểm Soát Tỷ Lệ Hao Hụt Siêu Thị',
        subtitle: 'MS Teams Webinar · 45 Học viên từ 12 Siêu thị Miền Nam',
        venue: 'Microsoft Teams Live Meeting',
        instructor: currentUser?.fullName || 'Nguyễn Văn Hùng (Host)',
        status: 'SCHEDULED',
        statusLabel: 'Chủ Trì Cuộc Họp',
        tone: 'blue',
        actionType: 'HOST_MEETING',
        actionLabel: 'Mở Phòng Họp Teams',
        actionUrl: 'https://teams.microsoft.com',
      },
      {
        id: 'tr-lab-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: 'Đặt Lịch Phòng Lab / Xưởng',
        icon: 'ti-tools',
        date: '2026-09-02',
        time: '08:00 - 12:00',
        title: 'Đặt Xưởng Thực Hành: Bakery & Fresh Food Practical Lab (MM An Phú)',
        subtitle: 'Workshop đào tạo kỹ thuật cắt tỉa thịt cá & nướng bánh cho nhân viên mới',
        venue: 'Xưởng Bánh & Tươi Sống MM An Phú',
        instructor: 'L&D Faculty',
        status: 'CONFIRMED',
        statusLabel: 'Đã Giữ Chỗ Xưởng',
        tone: 'blue',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'Xem Chi Tiết Phòng',
        actionUrl: '/trainer/training-ops',
      }
    );
  }

  // HRBP: Lịch Đào Tạo Vùng & Kế Nhiệm 70-20-10
  if (norm === 'hrbp' || norm === 'useradmin' || norm === 'sysadmin') {
    events.push(
      {
        id: 'hrbp-itv-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: 'Đợt Đào Tạo Can Thiệp Kỹ Năng (Skill Intervention)',
        icon: 'ti-chart-radar',
        date: '2026-09-05',
        time: '09:00 - 16:00',
        title: 'Chương Trình Can Thiệp Nâng Cao Tốc Độ POS & Dịch Vụ Thu Ngân (MM Bình Phú)',
        subtitle: 'Can thiệp giảm thời gian chờ quầy thu ngân giờ cao điểm theo đề xuất HRBP',
        venue: 'MM Bình Phú - Training Room 2',
        instructor: 'Lê Hoàng Nam (Trainer Thu Ngân)',
        status: 'SCHEDULED',
        statusLabel: 'Đã Duyệt Triển Khai',
        tone: 'sage',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'Xem Hồ Sơ Can Thiệp',
        actionUrl: '/hrbp',
      },
      {
        id: 'hrbp-succ-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: 'Huấn Luyện Kế Nhiệm 70-20-10 (Thánh Gióng Cohort)',
        icon: 'ti-star',
        date: '2026-09-12',
        time: '13:30 - 17:00',
        title: 'Kỳ Đánh Giá Năng Lực Kế Nhiệm Phó Giám Đốc Siêu Thị (Trần Quốc Bảo - MM An Phú)',
        subtitle: 'Hội đồng HRBP & Giám Đốc Vùng thẩm định năng lực lãnh đạo',
        venue: 'Head Office - Diamond Boardroom',
        instructor: 'Lê Thị Mai (HRBP) & Giám Đốc Vùng',
        status: 'SCHEDULED',
        statusLabel: 'Kế Nhiệm Trọng Điểm',
        tone: 'amber',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'Xem Hồ Sơ 70-20-10',
        actionUrl: '/hrbp/succession',
      }
    );
  }

  // USER ADMIN: Tổng Lịch Đào Tạo Toàn Doanh Nghiệp
  if (norm === 'useradmin' || norm === 'sysadmin') {
    events.push(
      {
        id: 'uadm-exam-1',
        scope: 'OPERATIONAL',
        category: 'ASSESSMENT',
        categoryLabel: 'Đợt Thi Nâng Cấp Bậc Toàn Doanh Nghiệp',
        icon: 'ti-trophy',
        date: '2026-09-15',
        time: '08:00 - 17:00',
        title: 'Khai Mạc Đợt Sát Hạch Cấp Bậc Q3: Level 7 → Level 6 & Level 5 → Level 4',
        subtitle: '120 Nhân viên toàn quốc đủ điều kiện dự thi thăng bậc',
        venue: 'Hệ Thống Trực Tuyến 16 Chi Nhánh Siêu Thị',
        instructor: 'Ban Tổ Chức Cấp Bậc & User Admin',
        status: 'SCHEDULED',
        statusLabel: 'Kỳ Thi Toàn Công Ty',
        tone: 'sage',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'Quản Trị Danh Sách Thi',
        actionUrl: '/user-admin/roadmaps',
      }
    );
  }

  // SYSADMIN: Lịch Bảo Trì & Đồng Bộ SAP HRIS
  if (norm === 'sysadmin') {
    events.push(
      {
        id: 'sys-sync-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: 'Đồng Bộ Dữ Liệu Tự Động SAP HRIS',
        icon: 'ti-server-cog',
        date: '2026-08-28',
        time: '00:00 - 01:00 (Hàng Ngày)',
        title: 'Batch Sync: Đồng Bộ Hồ Sơ Nhân Sự, Cấp Bậc & Cơ Cấu Tổ Chức Từ SAP HRIS',
        subtitle: 'Tự động cập nhật chức danh, chuyển chi nhánh và khóa học bắt buộc mới',
        venue: 'Data Center & API Gateway',
        instructor: 'Hệ Thống Tự Động (Cron Job)',
        status: 'COMPLETED',
        statusLabel: 'Đã Đồng Bộ Thành Công',
        tone: 'sage',
        actionType: 'SYNC_HRIS',
        actionLabel: 'Chạy Đồng Bộ Ngay',
        actionUrl: '/sysadmin',
      },
      {
        id: 'sys-iso-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: 'Kiểm Toán An Toàn Thông Tin ISO 27001',
        icon: 'ti-shield-lock',
        date: '2026-09-08',
        time: '08:30 - 17:00',
        title: 'Kiểm Tra Nhật Ký Audit Log, Phân Quyền 6 Role & Bảo Mật Watermark',
        subtitle: 'Đơn vị kiểm toán an ninh mạng độc lập đánh giá hạ tầng LMS',
        venue: 'IT Security Command Center',
        instructor: 'Trần Quốc Bảo (IT Lead)',
        status: 'UPCOMING',
        statusLabel: 'Kế Hoạch Bắt Buộc',
        tone: 'rust',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'Xem Audit Logs',
        actionUrl: '/sysadmin/audit',
      }
    );
  }

  return events;
}

/**
 * Tổng hợp toàn bộ sự kiện theo người dùng và ngữ cảnh
 */
export function buildCalendarEvents({
  courses = [],
  myEnrollments = {},
  classrooms = [],
  assessments = [],
  role = 'learner',
  currentUser,
  users = [],
}) {
  const personalEvents = [
    ...buildPersonalDeadlineEvents(courses, myEnrollments),
    ...buildPersonalClassroomEvents(classrooms),
    ...buildPersonalVirtualClassEvents(courses),
    ...buildPersonalAssessmentEvents(assessments),
  ];

  const operationalEvents = buildOperationalEventsByRole(role, {
    courses,
    classrooms,
    users,
    currentUser,
  });

  const allEvents = [...personalEvents, ...operationalEvents];

  const byDate = new Map();
  for (const event of allEvents) {
    if (!byDate.has(event.date)) byDate.set(event.date, []);
    byDate.get(event.date).push(event);
  }

  return {
    allEvents,
    personalEvents,
    operationalEvents,
    byDate,
  };
}

