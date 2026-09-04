// src/utils/classSchedule.js
//
// Scheduling for In-Person (ILT) courses.
//
// A classroom course is delivered as one or more INTAKES (class runs). One intake is
// one delivery of the course to one cohort, and it owns the training days it runs over:
// a 16-hour course can run 8 hours on day 1 and 8 hours on day 2. When the same course
// has to be taught again to a new group of employees, a second intake is added with its
// own dates — the course itself is not duplicated.
//
//   course.intakes[] -> intake.sessions[] -> { date, startTime, endTime, topic }
//
// The total duration is always COMPUTED from the sessions; it is never typed in by hand,
// so the schedule and the stated length can never drift apart.
//
// Online E-Learning and Virtual Class courses are untouched — they keep using
// startDate/endDate and virtualMeeting.scheduleDate/scheduleTime respectively.

export const DEFAULT_SESSION_START = '08:30';
export const DEFAULT_SESSION_END = '11:30';

export const INTAKE_STATUS = {
  UPCOMING: { id: 'UPCOMING', label: 'Upcoming', tone: 'blue', icon: 'ti-clock' },
  IN_PROGRESS: { id: 'IN_PROGRESS', label: 'Running', tone: 'amber', icon: 'ti-player-play' },
  COMPLETED: { id: 'COMPLETED', label: 'Completed', tone: 'sage', icon: 'ti-circle-check' },
  UNSCHEDULED: { id: 'UNSCHEDULED', label: 'Not scheduled', tone: 'slate', icon: 'ti-calendar-off' },
};

export function isInPersonCourse(course) {
  return course?.deliveryType === 'IN_PERSON_CLASSROOM' || course?.modality === 'CLASSROOM_LAB';
}

// ---------------------------------------------------------------------------
// Clock helpers
// ---------------------------------------------------------------------------

/** '08:30' -> 510. Returns null when unparseable. */
export function timeToMinutes(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const mins = Number(m[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

/** 510 -> '08:30'. */
export function minutesToTime(total) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

/** Duration of one session in hours (0 when the window is invalid or inverted). */
export function sessionHours(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start == null || end == null || end <= start) return 0;
  return Math.round(((end - start) / 60) * 100) / 100;
}

export function formatHours(hours) {
  const n = Number(hours) || 0;
  return `${n.toFixed(1)}h`;
}

/** '08:30 - 11:30 (3.0h)' */
export function formatSessionWindow(session) {
  if (!session) return '';
  return `${session.startTime} - ${session.endTime} (${formatHours(sessionHours(session.startTime, session.endTime))})`;
}

/**
 * The clock times a class may start or end at, as 24-hour strings.
 *
 * These are rendered in a <select> rather than an <input type="time"> on purpose: a native
 * time input formats itself from the BROWSER's locale, so a Vietnamese Chrome shows
 * "01:30 CH" instead of "13:30", which reads as half past one and invites mis-entry.
 * A select owns its own option text, so the app stays 24-hour and English everywhere.
 */
export const TIME_SLOTS = (() => {
  const slots = [];
  for (let minutes = 6 * 60; minutes <= 22 * 60; minutes += 15) {
    slots.push(minutesToTime(minutes));
  }
  return slots;
})();

/** Preset lengths for a self-paced online course, whose duration is not driven by a timetable. */
export const DURATION_OPTIONS = [
  '0.5h', '1.0h', '1.5h', '2.0h', '2.5h', '3.0h', '4.0h',
  '6.0h', '8.0h', '12.0h', '16.0h', '24.0h', '40.0h',
];

export function formatSessionDate(iso, { withWeekday = true } = {}) {
  if (!iso) return 'Date to be confirmed';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    ...(withWeekday ? { weekday: 'short' } : {}),
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

let seq = 0;
function uid(prefix) {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}-${Math.random().toString(36).slice(2, 6)}`;
}

export function makeSession(overrides = {}) {
  return {
    id: uid('ses'),
    date: '',
    startTime: DEFAULT_SESSION_START,
    endTime: DEFAULT_SESSION_END,
    topic: '',
    ...overrides,
  };
}

export function makeIntake(overrides = {}) {
  const { sessions, ...rest } = overrides;
  return {
    id: uid('intake'),
    name: '',
    trainerId: '',
    trainerName: '',
    venueId: '',
    venue: '',
    maxCapacity: null,
    sessions: sessions && sessions.length ? sessions.map((s) => makeSession(s)) : [makeSession()],
    ...rest,
  };
}

/** 'Intake 3' — the default label when the admin does not name a class run. */
export function intakeLabel(intake, index) {
  return intake?.name?.trim() || `Intake ${index + 1}`;
}

// ---------------------------------------------------------------------------
// Reading a course
// ---------------------------------------------------------------------------

// The oldest courses stored a single `scheduleDate` plus a free-text `scheduleTime`
// such as '08:30 - 11:30 (3.0 hours)'. Pull the two clock times back out of it.
function parseLegacyWindow(scheduleTime) {
  const m = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(String(scheduleTime || ''));
  if (!m) return { startTime: DEFAULT_SESSION_START, endTime: DEFAULT_SESSION_END };
  return { startTime: m[1].padStart(5, '0'), endTime: m[2].padStart(5, '0') };
}

/**
 * The canonical intake list of an in-person course. Upgrades both older shapes on read:
 * a flat `sessions` array becomes a single intake, and a legacy scheduleDate/scheduleTime
 * pair becomes a single intake with a single session.
 */
export function courseIntakes(course) {
  // Ids must be stable across renders: they are React keys and the handle every edit is
  // addressed by. A random id per read would remount the editor on every keystroke, so
  // anything without a stored id gets one derived from the course and its position.
  const base = course?.id || course?.code || 'course';

  if (Array.isArray(course?.intakes) && course.intakes.length > 0) {
    return course.intakes.map((it, i) => ({
      ...makeIntake({ sessions: [] }),
      id: it.id || `${base}-intake-${i + 1}`,
      ...it,
      sessions: sortSessions(
        (it.sessions || []).map((s, j) => ({ ...makeSession(), id: s.id || `${base}-i${i + 1}-s${j + 1}`, ...s }))
      ),
    }));
  }
  if (Array.isArray(course?.sessions) && course.sessions.length > 0) {
    return [{
      ...makeIntake({ sessions: [] }),
      id: `${base}-intake-1`,
      name: 'Intake 1',
      sessions: sortSessions(
        course.sessions.map((s, j) => ({ ...makeSession(), id: s.id || `${base}-i1-s${j + 1}`, ...s }))
      ),
    }];
  }
  if (course?.scheduleDate || course?.startDate) {
    const { startTime, endTime } = parseLegacyWindow(course?.scheduleTime);
    return [{
      ...makeIntake({ sessions: [] }),
      id: `${base}-intake-1`,
      name: 'Intake 1',
      sessions: [{
        ...makeSession(),
        id: `${base}-i1-s1`,
        date: course.scheduleDate || course.startDate,
        startTime,
        endTime,
      }],
    }];
  }
  return [];
}

/** Every session of every intake, flattened and tagged with the intake it belongs to. */
export function courseSessions(course) {
  const intakes = courseIntakes(course);
  return sortSessions(
    intakes.flatMap((it, idx) =>
      (it.sessions || []).map((s) => ({ ...s, intakeId: it.id, intakeName: intakeLabel(it, idx) }))
    )
  );
}

export function sortSessions(sessions = []) {
  return [...sessions].sort((a, b) => {
    const byDate = String(a.date || '').localeCompare(String(b.date || ''));
    if (byDate !== 0) return byDate;
    return (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0);
  });
}

export function totalScheduledHours(sessions = []) {
  return Math.round(sessions.reduce((sum, s) => sum + sessionHours(s.startTime, s.endTime), 0) * 100) / 100;
}

/** Distinct calendar days covered by a session list. */
export function trainingDayCount(sessions = []) {
  return new Set(sessions.map((s) => s.date).filter(Boolean)).size;
}

// ---------------------------------------------------------------------------
// Intake-level derivations
// ---------------------------------------------------------------------------

export function intakeHours(intake) {
  return totalScheduledHours(intake?.sessions || []);
}

export function intakeDays(intake) {
  return trainingDayCount(intake?.sessions || []);
}

export function intakeDateRange(intake) {
  const ordered = sortSessions((intake?.sessions || []).filter((s) => s.date));
  if (ordered.length === 0) return { start: '', end: '' };
  return { start: ordered[0].date, end: ordered[ordered.length - 1].date };
}

/** Where an intake sits relative to today: not scheduled, upcoming, running, or finished. */
export function intakeStatus(intake, today = new Date()) {
  const { start, end } = intakeDateRange(intake);
  if (!start) return INTAKE_STATUS.UNSCHEDULED;
  const iso = today instanceof Date ? today.toISOString().slice(0, 10) : String(today);
  if (iso < start) return INTAKE_STATUS.UPCOMING;
  if (iso > end) return INTAKE_STATUS.COMPLETED;
  return INTAKE_STATUS.IN_PROGRESS;
}

/** The intake a learner would join next — the first that has not finished yet. */
export function nextOpenIntake(course, today = new Date()) {
  const intakes = courseIntakes(course);
  const iso = today instanceof Date ? today.toISOString().slice(0, 10) : String(today);
  const open = intakes
    .filter((it) => {
      const { end } = intakeDateRange(it);
      return end && end >= iso;
    })
    .sort((a, b) => intakeDateRange(a).start.localeCompare(intakeDateRange(b).start));
  return open[0] || null;
}

/**
 * The completion deadline of an in-person course is the last day of training — there is
 * no separate due date to type in, because attending the class IS the completion.
 */
export function completionDueDateOf(course) {
  const sessions = courseSessions(course);
  if (sessions.length === 0) return null;
  return sessions[sessions.length - 1].date || null;
}

// ---------------------------------------------------------------------------
// Writing back to a course
// ---------------------------------------------------------------------------

/**
 * The denormalized fields kept in sync on the course so every screen that still reads
 * scheduleDate/scheduleTime/sessions keeps working.
 *
 * Deliberately does NOT touch startDate/endDate: those are the enrollment window that
 * drives the catalog lifecycle (Upcoming / Open / Closed), which is a separate concept
 * from when the class physically meets.
 */
export function deriveScheduleFields(intakes = []) {
  const clean = intakes.map((it) => ({ ...it, sessions: sortSessions(it.sessions || []) }));
  const flat = sortSessions(clean.flatMap((it) => it.sessions).filter((s) => s.date));
  const first = flat[0];
  const last = flat[flat.length - 1];
  // Every intake teaches the same course, so its length is the course length. The first
  // scheduled intake is the reference; validateIntakes flags any that disagree.
  const primary = clean.find((it) => intakeHours(it) > 0) || clean[0];
  return {
    intakes: clean,
    sessions: flat,
    scheduleDate: first?.date || '',
    scheduleTime: first ? formatSessionWindow(first) : '',
    firstSessionDate: first?.date || '',
    lastSessionDate: last?.date || '',
    intakeCount: clean.length,
    sessionCount: flat.length,
    trainingDays: primary ? intakeDays(primary) : 0,
    totalTrainingHours: primary ? intakeHours(primary) : 0,
    estimatedHours: `${(primary ? intakeHours(primary) : 0).toFixed(1)}h`,
  };
}

/** '2 intakes · 2 days · 7.0h each' */
export function scheduleSummary(course) {
  const intakes = courseIntakes(course);
  if (intakes.length === 0) return 'Not scheduled yet';
  const primary = intakes.find((it) => intakeHours(it) > 0) || intakes[0];
  const days = intakeDays(primary);
  const hours = intakeHours(primary);
  const dayLabel = days === 1 ? '1 day' : `${days} days`;
  const runLabel = intakes.length === 1 ? '1 intake' : `${intakes.length} intakes`;
  return `${runLabel} · ${dayLabel} · ${formatHours(hours)}`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Blocking problems inside a single intake. */
function validateIntake(intake, index) {
  const errors = [];
  const label = intakeLabel(intake, index);
  const sessions = intake.sessions || [];

  if (sessions.length === 0) {
    errors.push(`${label}: add at least one training day.`);
    return errors;
  }

  sessions.forEach((s, i) => {
    if (!s.date) errors.push(`${label}, day ${i + 1}: pick a training date.`);
    if (sessionHours(s.startTime, s.endTime) <= 0) {
      errors.push(`${label}, day ${i + 1}: the end time must come after the start time.`);
    }
  });

  const byDate = new Map();
  sortSessions(sessions).forEach((s) => {
    if (!s.date) return;
    const start = timeToMinutes(s.startTime);
    const end = timeToMinutes(s.endTime);
    if (start == null || end == null) return;
    const sameDay = byDate.get(s.date) || [];
    if (sameDay.some((prev) => start < prev.end && end > prev.start)) {
      errors.push(`${label}: two sessions on ${s.date} overlap each other.`);
    }
    byDate.set(s.date, [...sameDay, { start, end }]);
  });

  return errors;
}

/**
 * Validates the whole schedule of a course.
 *
 * Errors block a save. Warnings do not: an intake that runs shorter than the others is
 * worth flagging, but an admin may legitimately compress a make-up run.
 */
export function validateIntakes(intakes = []) {
  const errors = [];
  const warnings = [];

  if (intakes.length === 0) {
    errors.push('An in-person course needs at least one intake with a training day.');
    return { errors, warnings, ok: false };
  }

  intakes.forEach((it, i) => errors.push(...validateIntake(it, i)));

  // Two intakes of the same course must not be taught at the same moment by one trainer.
  intakes.forEach((a, i) => {
    intakes.slice(i + 1).forEach((b, j) => {
      const clash = (a.sessions || []).some((sa) =>
        (b.sessions || []).some((sb) => {
          if (!sa.date || !sb.date || sa.date !== sb.date) return false;
          const aStart = timeToMinutes(sa.startTime);
          const aEnd = timeToMinutes(sa.endTime);
          const bStart = timeToMinutes(sb.startTime);
          const bEnd = timeToMinutes(sb.endTime);
          if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false;
          return aStart < bEnd && bStart < aEnd;
        })
      );
      if (clash) {
        errors.push(`${intakeLabel(a, i)} and ${intakeLabel(b, i + j + 1)} are scheduled at the same time.`);
      }
    });
  });

  const scheduled = intakes.filter((it) => intakeHours(it) > 0);
  if (scheduled.length > 1) {
    const reference = intakeHours(scheduled[0]);
    scheduled.slice(1).forEach((it, i) => {
      if (Math.abs(intakeHours(it) - reference) >= 0.5) {
        warnings.push(
          `${intakeLabel(it, i + 1)} runs ${formatHours(intakeHours(it))} while ${intakeLabel(scheduled[0], 0)} runs ${formatHours(reference)} — the same course usually runs the same length.`
        );
      }
    });
  }

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)], ok: errors.length === 0 };
}
