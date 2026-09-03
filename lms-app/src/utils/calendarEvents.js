// src/utils/calendarEvents.js
//
// Collects personal learning events and training operations events for all 6 roles:
// (1) Learner: e-learning courses, ILT/workshop sessions, Teams/Zoom virtual classes, assessments, certificate deadlines.
// (2) Manager: personal calendar + the training schedule & deadlines of their direct reports.
// (3) Trainer: personal calendar + teaching schedule, Live QR, practice lab bookings.
// (4) HRBP: personal calendar + store intervention training schedule, 70-20-10 succession, compliance audits.
// (5) User Admin: personal calendar + the enterprise training calendar and Level Gate examination rounds.
// (6) SysAdmin: personal calendar + SAP HRIS sync schedule, system maintenance, ISO 27001 audits.

import { initialRoomBookings } from '../data/roomBookings';
import { normalizeRole } from '../data/roles';

export const EVENT_CATEGORIES = {
  ALL: { id: 'ALL', labelVi: 'All', labelEn: 'All Events', icon: 'ti-calendar' },
  ELEARNING: { id: 'ELEARNING', labelVi: 'E-Learning & Deadlines', labelEn: 'E-Learning & Deadlines', icon: 'ti-book-2', color: 'var(--mm-blue)' },
  CLASSROOM_ILT: { id: 'CLASSROOM_ILT', labelVi: 'In-Store Practice (ILT)', labelEn: 'In-Person Workshops', icon: 'ti-chalkboard', color: 'var(--bigc-green)' },
  VIRTUAL_CLASS: { id: 'VIRTUAL_CLASS', labelVi: 'Online Class (Teams/Zoom)', labelEn: 'Virtual Classes', icon: 'ti-video', color: '#7C3AED' },
  ASSESSMENT: { id: 'ASSESSMENT', labelVi: 'Job Level Examinations & Reviews', labelEn: 'Assessments & Exams', icon: 'ti-trophy', color: '#D97706' },
  CERTIFICATE: { id: 'CERTIFICATE', labelVi: 'Expiry & Recertification', labelEn: 'Certifications', icon: 'ti-certificate', color: '#DC2626' },
  OPERATIONAL: { id: 'OPERATIONAL', labelVi: 'Operations / Team Training Calendar', labelEn: 'Operational Schedules', icon: 'ti-briefcase', color: '#0F766E' },
};

const DEADLINE_TONE_BY_STATUS = {
  COMPLETED: 'sage',
  OVERDUE: 'rust',
  FAILED: 'rust',
  IN_PROGRESS: 'blue',
  NOT_STARTED: 'slate',
};

const DEADLINE_STATUS_LABEL = {
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  FAILED: 'Retake Required',
  IN_PROGRESS: 'In Progress',
  NOT_STARTED: 'Not Started',
};

function getDeterministicDayOfMonth(str, maxDays = 28) {
  let hash = 0;
  const s = String(str || 'CRS-001');
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  const day = (Math.abs(hash) % maxDays) + 1;
  return String(day).padStart(2, '0');
}

/**
 * 1. Personal e-learning deadline events
 */
function buildPersonalDeadlineEvents(courses = [], myEnrollments = {}) {
  const events = [];
  for (const courseId of Object.keys(myEnrollments)) {
    const enrollment = myEnrollments[courseId];
    const course = courses.find((c) => c.id === courseId);
    if (!course) continue;

    const date = enrollment.completedAt || enrollment.dueDate || enrollment.lastActivityAt || '2026-09-15';
    const isCompleted = enrollment.status === 'COMPLETED';
    const isOverdue = enrollment.status === 'OVERDUE';
    const isInProgress = enrollment.status === 'IN_PROGRESS';
    const tone = DEADLINE_TONE_BY_STATUS[enrollment.status] || 'slate';
    const statusLabel = DEADLINE_STATUS_LABEL[enrollment.status] || 'Not Started';

    events.push({
      id: `deadline-${courseId}`,
      scope: 'PERSONAL',
      category: 'ELEARNING',
      categoryLabel: 'E-Learning Course',
      icon: isCompleted ? 'ti-circle-check' : (isOverdue ? 'ti-alert-triangle' : (isInProgress ? 'ti-player-play' : 'ti-book-2')),
      date,
      time: '23:59 (deadline)',
      title: course.title,
      subtitle: isCompleted
        ? `Completed on ${date}`
        : (isOverdue ? `Overdue deadline: ${date}` : (isInProgress ? `In progress (${enrollment.progressPercent || 0}%) · Deadline: ${date}` : `Course deadline: ${date}`)),
      courseCode: course.code,
      courseId: course.id,
      venue: 'Online Learning (E-Learning Portal)',
      instructor: course.trainerName || 'MMVN Training Board',
      status: enrollment.status,
      statusLabel,
      tone,
      actionType: 'START_COURSE',
      actionLabel: isCompleted ? 'Review The Lesson' : (isInProgress ? 'Continue Learning' : 'Start Learning'),
      actionUrl: `/learner/courses/${courseId}`,
      progress: enrollment.progressPercent ?? enrollment.progress ?? (isCompleted ? 100 : 0),
      isMandatory: course.courseType === 'MANDATORY',
      canExtend: !isCompleted,
    });
  }
  return events;
}

/**
 * 2. In-person practice sessions (ILT workshops) the user has enrolled in
 */
function buildPersonalClassroomEvents(classrooms = []) {
  const events = [];
  for (const session of classrooms) {
    if (!session.isEnrolled) continue;

    const isAttended = session.attendanceStatus === 'CHECKED_IN';
    const tone = isAttended ? 'sage' : session.attendanceStatus === 'ABSENT' ? 'rust' : 'blue';
    const statusLabel = isAttended ? 'Attendance Recorded' : session.attendanceStatus === 'ABSENT' ? 'Absent' : 'Registered (Awaiting Check-In)';

    events.push({
      id: `session-${session.id}`,
      scope: 'PERSONAL',
      category: 'CLASSROOM_ILT',
      categoryLabel: 'In-Person Practice Class',
      icon: 'ti-chalkboard',
      date: session.date || '2026-08-28',
      time: session.time || '08:30 - 11:30',
      title: session.title,
      subtitle: `${session.time} · ${session.venue}`,
      courseCode: session.courseCode || session.id,
      venue: session.venue || 'MM An Phu Practice Workshop',
      instructor: session.trainerName || 'Dedicated Trainer',
      status: session.attendanceStatus || 'ENROLLED',
      statusLabel,
      tone,
      actionType: 'SCAN_QR',
      actionLabel: isAttended ? 'Attendance Recorded' : 'Open The Check-In QR',
      actionUrl: '/learner/classrooms',
      sessionId: session.id,
      qrToken: session.qrToken,
    });
  }
  return events;
}

/**
 * 3. Virtual classes (MS Teams / Zoom)
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
      categoryLabel: `Online Class (${platform})`,
      icon: 'ti-video',
      date,
      time,
      title: course.title,
      subtitle: `${time} · ${platform} online meeting room`,
      courseCode: course.code,
      courseId: course.id,
      venue: `${platform} Live Virtual Room`,
      instructor: meeting.instructorName || course.trainerName || 'Online Training Board',
      status: meeting.status || 'UPCOMING',
      statusLabel: 'Live Virtual Class',
      tone: 'blue',
      actionType: 'HOST_MEETING',
      actionLabel: 'Join The Meeting Room',
      actionUrl: meeting.meetingUrl || '#',
      meetingUrl: meeting.meetingUrl,
    });
  }
  return events;
}

/**
 * 4. Job level examinations & competency reviews
 */
function buildPersonalAssessmentEvents(assessments = []) {
  return [
    {
      id: 'assess-gate-2026-08',
      scope: 'PERSONAL',
      category: 'ASSESSMENT',
      categoryLabel: 'Competency Examination',
      icon: 'ti-trophy',
      date: '2026-08-29',
      time: '09:00 - 10:30 (90 minutes)',
      title: 'Job Level Competency Standard Examination (Level Gate Exam Q3)',
      subtitle: 'A 30-question quiz & store operations scenario handling',
      courseCode: 'ASM-GATE-Q3',
      venue: 'Online Examination Lab',
      instructor: 'MMVN Examination Supervisory Board',
      status: 'UPCOMING',
      statusLabel: 'Attendance Mandatory',
      tone: 'amber',
      actionType: 'START_ASSESSMENT',
      actionLabel: 'Enter The Examination Room',
      actionUrl: '/learner/catalog?tab=assessment',
    },
    {
      id: 'cert-renew-pccc',
      scope: 'PERSONAL',
      category: 'CERTIFICATE',
      categoryLabel: 'Recurring Recertification',
      icon: 'ti-certificate',
      date: '2026-09-10',
      time: 'Recertification due: 2026-09-10',
      title: '2026 Recurring Store Occupational Safety & Fire Certification',
      subtitle: 'Requires retraining and re-examination before the 12-month validity expires',
      courseCode: 'CERT-HSE-PCCC',
      venue: 'Store Fire Drill & Evacuation Ground',
      instructor: 'HSE Safety & District Fire Brigade Team Leader',
      status: 'NEEDS_RENEWAL',
      statusLabel: 'Recertification Due (12 Days)',
      tone: 'rust',
      actionType: 'START_COURSE',
      actionLabel: 'View The Revision Course',
      actionUrl: '/learner/certificates',
    }
  ];
}

/**
 * 5. Operational & team schedules for the 6 roles
 */
function buildOperationalEventsByRole(role, { courses = [], classrooms = [], users = [], currentUser }) {
  const norm = normalizeRole(role);
  const events = [];

  // MANAGER: Team Calendar
  if (norm === 'manager' || norm === 'useradmin' || norm === 'sysadmin') {
    events.push(
      {
        id: 'mgr-team-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: 'Team Training Deadline',
        icon: 'ti-users',
        date: '2026-08-28',
        time: '23:59 Deadline',
        title: 'Food Safety & HACCP Bakery Counter Deadline (Minh Tran & Sarah Johnson)',
        subtitle: 'Bakery & Pastry Sub-Department (MM An Phu) · 2/4 employees unfinished',
        venue: 'MM An Phu - PPF Sub-Department',
        instructor: 'Line Manager Supervision',
        status: 'URGENT',
        statusLabel: 'Due Today',
        tone: 'rust',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'Send A Reminder',
        actionUrl: '/manager/team',
      },
      {
        id: 'mgr-team-2',
        scope: 'OPERATIONAL',
        category: 'CLASSROOM_ILT',
        categoryLabel: 'Send Employees To ILT Training',
        icon: 'ti-school',
        date: '2026-09-02',
        time: '08:30 - 11:30',
        title: 'Tray Washer Operation & Bakery Tray Sanitizing Practice (Carlos Reyes)',
        subtitle: 'Send 2 morning-shift employees to the practice workshop',
        venue: 'MM An Phu Fresh Bakery Workshop',
        instructor: 'Nguyễn Văn Hùng (Trainer)',
        status: 'SCHEDULED',
        statusLabel: 'Attendance Confirmed',
        tone: 'blue',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'View The Shift Schedule',
        actionUrl: '/manager/team',
      }
    );
  }

  // TRAINER / L&D: Teaching & Lab Calendar
  if (norm === 'trainer' || norm === 'useradmin' || norm === 'sysadmin') {
    events.push(
      {
        id: 'tr-teach-1',
        scope: 'OPERATIONAL',
        category: 'CLASSROOM_ILT',
        categoryLabel: 'In-Person Class (ILT)',
        icon: 'ti-school',
        date: '2026-08-28',
        time: '08:30 - 11:30 (3.0 hours)',
        title: 'Hygiene Safety Standards & Industrial Deck Oven Practice',
        subtitle: 'Class size: 21/25 learners · automatic Live QR attendance',
        venue: 'Fresh Food & Bakery Practical Lab (MM An Phu)',
        instructor: currentUser?.fullName || 'Nguyễn Văn Hùng (Host)',
        status: 'UPCOMING',
        statusLabel: 'Classes I Teach Today',
        tone: 'sage',
        actionType: 'PROJECT_QR',
        actionLabel: 'Project The Live Attendance QR',
        actionUrl: '/trainer',
        qrToken: 'MMVN-QR-CRS-BAKERY-LIVE',
      },
      {
        id: 'tr-teach-2',
        scope: 'OPERATIONAL',
        category: 'VIRTUAL_CLASS',
        categoryLabel: 'Virtual Class',
        icon: 'ti-video',
        date: '2026-08-30',
        time: '14:00 - 16:30 (2.5 hours)',
        title: 'Online Webinar: Inventory Management & Store Shrinkage Control',
        subtitle: 'MS Teams webinar · 45 learners from 12 southern stores',
        venue: 'Microsoft Teams Live Meeting',
        instructor: currentUser?.fullName || 'Nguyễn Văn Hùng (Host)',
        status: 'SCHEDULED',
        statusLabel: 'Host The Meeting',
        tone: 'blue',
        actionType: 'HOST_MEETING',
        actionLabel: 'Open The Teams Meeting',
        actionUrl: 'https://teams.microsoft.com',
      },
      {
        id: 'tr-lab-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: 'Book A Lab / Workshop Slot',
        icon: 'ti-tools',
        date: '2026-09-02',
        time: '08:00 - 12:00',
        title: 'Book The Practice Workshop: Bakery & Fresh Food Practical Lab (MM An Phu)',
        subtitle: 'A workshop on meat/fish trimming and baking technique for new employees',
        venue: 'MM An Phu Bakery & Fresh Food Workshop',
        instructor: 'L&D Faculty',
        status: 'CONFIRMED',
        statusLabel: 'Workshop Reserved',
        tone: 'blue',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'View The Room Details',
        actionUrl: '/trainer/training-ops',
      }
    );
  }

  // HRBP: Regional Training & 70-20-10 Succession Calendar
  if (norm === 'hrbp' || norm === 'useradmin' || norm === 'sysadmin') {
    events.push(
      {
        id: 'hrbp-itv-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: 'Skill Intervention Training Round',
        icon: 'ti-chart-radar',
        date: '2026-09-05',
        time: '09:00 - 16:00',
        title: 'POS Speed & Cashier Service Intervention Program (MM Binh Phu)',
        subtitle: 'An intervention to cut peak-hour checkout waiting time, proposed by the HRBP',
        venue: 'MM Binh Phu - Training Room 2',
        instructor: 'Lê Hoàng Nam (Cashier Trainer)',
        status: 'SCHEDULED',
        statusLabel: 'Rollout Approved',
        tone: 'sage',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'View The Intervention Record',
        actionUrl: '/hrbp',
      },
      {
        id: 'hrbp-succ-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: '70-20-10 Succession Coaching (Thanh Giong Cohort)',
        icon: 'ti-star',
        date: '2026-09-12',
        time: '13:30 - 17:00',
        title: 'Deputy Store General Manager Succession Competency Review (Trần Quốc Bảo - MM An Phu)',
        subtitle: 'The HRBP board & regional directors assess leadership capability',
        venue: 'Head Office - Diamond Boardroom',
        instructor: 'Lê Thị Mai (HRBP) & Regional Director',
        status: 'SCHEDULED',
        statusLabel: 'Key Succession',
        tone: 'amber',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'View The 70-20-10 Record',
        actionUrl: '/hrbp/succession',
      }
    );
  }

  // USER ADMIN: Enterprise-Wide Training Calendar
  if (norm === 'useradmin' || norm === 'sysadmin') {
    events.push(
      {
        id: 'uadm-exam-1',
        scope: 'OPERATIONAL',
        category: 'ASSESSMENT',
        categoryLabel: 'Enterprise-Wide Promotion Examination Round',
        icon: 'ti-trophy',
        date: '2026-09-15',
        time: '08:00 - 17:00',
        title: 'Opening Of The Q3 Level Gate Examination: Level 7 → Level 6 & Level 5 → Level 4',
        subtitle: '120 employees nationwide are eligible to sit the promotion exam',
        venue: 'Online System Across 16 Store Branches',
        instructor: 'Level Gate Board & User Admin',
        status: 'SCHEDULED',
        statusLabel: 'Company-Wide Examination',
        tone: 'sage',
        actionType: 'VIEW_DETAIL',
        actionLabel: 'Manage The Examination Roster',
        actionUrl: '/user-admin/roadmaps',
      }
    );
  }

  // SYSADMIN: Maintenance & SAP HRIS Sync Calendar
  if (norm === 'sysadmin') {
    events.push(
      {
        id: 'sys-sync-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: 'Automatic SAP HRIS Data Sync',
        icon: 'ti-server-cog',
        date: '2026-08-28',
        time: '00:00 - 01:00 (Daily)',
        title: 'Batch Sync: Employee Records, Job Levels & Org Structure From SAP HRIS',
        subtitle: 'Automatically updates job titles, branch transfers and newly mandated courses',
        venue: 'Data Center & API Gateway',
        instructor: 'Automated System (Cron Job)',
        status: 'COMPLETED',
        statusLabel: 'Sync Completed Successfully',
        tone: 'sage',
        actionType: 'SYNC_HRIS',
        actionLabel: 'Run The Sync Now',
        actionUrl: '/sysadmin',
      },
      {
        id: 'sys-iso-1',
        scope: 'OPERATIONAL',
        category: 'OPERATIONAL',
        categoryLabel: 'ISO 27001 Information Security Audit',
        icon: 'ti-shield-lock',
        date: '2026-09-08',
        time: '08:30 - 17:00',
        title: 'Review The Audit Log, 6-Role Permissions & Watermark Security',
        subtitle: 'An independent cybersecurity auditor assesses the LMS infrastructure',
        venue: 'IT Security Command Center',
        instructor: 'Trần Quốc Bảo (IT Lead)',
        status: 'UPCOMING',
        statusLabel: 'Mandatory Plan',
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
 * Organization-wide monthly course events (consumed by Task 3's UniversalCalendar)
 */
export function buildOrganizationMonthlyEvents({ courses = [], myEnrollments = {}, viewMonth, currentUser }) {
  if (!viewMonth) return [];
  const [viewYear, viewMonthNum] = viewMonth.split('-').map(Number);
  const viewMonthPrefix = `${viewYear}-${String(viewMonthNum).padStart(2, '0')}`;

  return (courses || [])
    .filter((course) => course.published !== false && (course.courseType === 'MANDATORY' || course.courseType === 'OPTIONAL'))
    .map((course) => {
      const enrollment = myEnrollments[course.id];
      const isEnrolled = Boolean(enrollment);
      const enrollmentDueDate = enrollment?.dueDate;
      const courseDueDate = course.assignment?.dueDate || null;

      let eventDate;
      if (enrollmentDueDate) {
        eventDate = enrollmentDueDate;
      } else if (courseDueDate) {
        const [dy, dm] = courseDueDate.split('-').map(Number);
        if (dy === viewYear && dm === viewMonthNum) {
          eventDate = courseDueDate;
        } else {
          // If course due date is outside the view month, scatter it across the view month days
          const day = getDeterministicDayOfMonth(course.id, 28);
          eventDate = `${viewMonthPrefix}-${day}`;
        }
      } else {
        // No due date (optional course) — distribute across days 1..28 of the month
        const day = getDeterministicDayOfMonth(course.id, 28);
        eventDate = `${viewMonthPrefix}-${day}`;
      }

      const isMandatory = course.courseType === 'MANDATORY';
      const status = enrollment?.status || (isMandatory ? 'NOT_STARTED' : 'AVAILABLE');
      const isOverdue = status === 'OVERDUE';
      const isCompleted = status === 'COMPLETED';
      const isInProgress = status === 'IN_PROGRESS';

      let tone = 'slate';
      let statusLabel = 'Available to Join';
      if (isCompleted) {
        tone = 'sage';
        statusLabel = 'Completed';
      } else if (isOverdue) {
        tone = 'rust';
        statusLabel = 'Overdue';
      } else if (isInProgress) {
        tone = 'blue';
        statusLabel = `In Progress (${enrollment?.progressPercent || 0}%)`;
      } else if (isMandatory) {
        tone = isEnrolled ? 'blue' : 'rust';
        statusLabel = isEnrolled ? 'Assigned · Not Started' : 'Mandatory · Not Enrolled';
      } else if (isEnrolled) {
        tone = 'blue';
        statusLabel = 'Enrolled';
      } else {
        tone = 'sage';
        statusLabel = 'Optional Course';
      }

      return {
        id: `org-${course.id}`,
        scope: 'ORGANIZATION',
        date: eventDate,
        courseId: course.id,
        courseCode: course.code,
        title: course.title,
        courseType: course.courseType,
        isEnrolled,
        status,
        statusLabel,
        progress: enrollment?.progressPercent ?? (isCompleted ? 100 : 0),
        tone,
        color: isCompleted ? 'var(--sage)' : (isOverdue ? '#DC2626' : (isMandatory ? '#DC2626' : 'var(--bigc-green)')),
        icon: isCompleted ? 'ti-circle-check' : (isOverdue ? 'ti-alert-triangle' : (isInProgress ? 'ti-player-play' : (isMandatory ? 'ti-alert-circle' : 'ti-sparkles'))),
        subtitle: isMandatory
          ? (isCompleted ? 'Mandatory · Completed' : (isOverdue ? `Mandatory · OVERDUE (${eventDate})` : (isEnrolled ? `Mandatory · In Progress (${enrollment?.progressPercent || 0}%)` : 'Mandatory · Action Required (Not Enrolled)')))
          : (isCompleted ? 'Optional · Completed' : (isEnrolled ? `Optional · In Progress (${enrollment?.progressPercent || 0}%)` : 'Optional · Available to Join')),
        actionType: isEnrolled ? 'START_COURSE' : 'ENROLL_COURSE',
        actionLabel: isEnrolled
          ? (isCompleted ? 'Review Lesson' : (isInProgress ? 'Continue Learning' : 'Start Course'))
          : 'Enroll in Course',
        canExtend: Boolean(isEnrolled && !isCompleted),
      };
    })
    .filter(Boolean);
}

/**
 * Aggregates every event by user and context
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

  byDate.allEvents = allEvents;
  byDate.personalEvents = personalEvents;
  byDate.operationalEvents = operationalEvents;
  byDate.byDate = byDate;

  return byDate;
}

