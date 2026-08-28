// src/utils/calendarEvents.js
//
// Gom sự kiện lịch học cá nhân từ 2 nguồn dữ liệu đã có sẵn trong CourseStore:
// (a) myEnrollments — hạn hoàn thành khóa e-learning đang/đã tham gia hoặc
//     được assign; (b) classrooms — buổi học trực tiếp/ILT đã ghi danh
//     (đúng filter "My Sessions" mà LearnerClassrooms.jsx đã dùng: isEnrolled).
// Mỗi khóa chỉ tạo ĐÚNG 1 sự kiện (không lặp giữa ngày assign/due/complete) —
// xem quy tắc chọn ngày trong buildDeadlineEvents().

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

function buildDeadlineEvents(courses, myEnrollments) {
  const events = [];
  for (const courseId of Object.keys(myEnrollments)) {
    const enrollment = myEnrollments[courseId];
    const course = courses.find((c) => c.id === courseId);
    // Bảo vệ: bỏ qua nếu enrollment trỏ tới 1 courseId không còn tồn tại
    // trong catalog (dữ liệu mock có thể lệch), không được crash cả trang.
    if (!course) continue;

    // Khóa đã xong -> gắn đúng ngày hoàn thành thật (lịch thành nhật ký học
    // tập). Khóa còn hạn -> gắn ngày hạn (nhắc việc). Khóa tự chọn học không
    // có hạn (enrollCourse() gán dueDate: null cho elective) -> gắn vào lần
    // hoạt động gần nhất (lastActivityAt luôn có giá trị ngay từ lúc ghi danh
    // và được cập nhật mỗi lần lưu tiến độ), để không bị biến mất khỏi lịch.
    const date = enrollment.completedAt || enrollment.dueDate || enrollment.lastActivityAt;
    if (!date) continue;

    const tone = DEADLINE_TONE_BY_STATUS[enrollment.status] || 'slate';
    const statusLabel = DEADLINE_STATUS_LABEL[enrollment.status] || DEADLINE_STATUS_LABEL.NOT_STARTED;

    events.push({
      id: `deadline-${courseId}`,
      date,
      kind: 'DEADLINE',
      title: course.title,
      subtitle: enrollment.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Hạn hoàn thành',
      statusLabel,
      tone,
      courseId,
    });
  }
  return events;
}

const SESSION_TONE_BY_ATTENDANCE = {
  CHECKED_IN: 'sage',
  ABSENT: 'rust',
};

const SESSION_STATUS_LABEL = {
  CHECKED_IN: 'Đã Điểm Danh',
  ABSENT: 'Vắng Mặt',
};

function buildLiveSessionEvents(classrooms) {
  const events = [];
  for (const session of classrooms) {
    if (!session.isEnrolled) continue;

    const tone = SESSION_TONE_BY_ATTENDANCE[session.attendanceStatus] || 'blue';
    const statusLabel = SESSION_STATUS_LABEL[session.attendanceStatus] || 'Sắp Diễn Ra';

    events.push({
      id: `session-${session.id}`,
      date: session.date,
      kind: 'LIVE_SESSION',
      title: session.title,
      subtitle: `${session.time} · ${session.venue}`,
      statusLabel,
      tone,
      sessionId: session.id,
    });
  }
  return events;
}

export function buildCalendarEvents({ courses, myEnrollments, classrooms }) {
  const allEvents = [
    ...buildDeadlineEvents(courses || [], myEnrollments || {}),
    ...buildLiveSessionEvents(classrooms || []),
  ];

  const byDate = new Map();
  for (const event of allEvents) {
    if (!byDate.has(event.date)) byDate.set(event.date, []);
    byDate.get(event.date).push(event);
  }
  return byDate;
}
