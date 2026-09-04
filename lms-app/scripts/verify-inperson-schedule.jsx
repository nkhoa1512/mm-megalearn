/* Verification harness for in-person intake scheduling and the learner Library.
 *
 * Layers checked:
 *   A. Schedule maths — session hours, totals, day counts, legacy upgrades.
 *   B. Intake model — several runs of one course, statuses, next open intake.
 *   C. Validation — missing dates, inverted windows, overlaps, clashing intakes.
 *   D. Derived fields — total hours are computed, never declared; the enrollment
 *      window is never overwritten by the timetable.
 *   E. Seed data — every generated in-person course carries a coherent timetable.
 *   F. Ownership — a trainer owns the in-person courses they lead.
 *   G. Downstream wiring — calendar events, cost pricing, completion deadline.
 *   H. SSR — the Course Builder, the trainer's own-course tab and the learner
 *      Library all render, and show the right things for the right role.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const {
  sessionHours, courseSessions, courseIntakes, deriveScheduleFields, validateIntakes,
  totalScheduledHours, trainingDayCount, scheduleSummary, isInPersonCourse,
  minutesToTime, timeToMinutes, intakeHours, intakeDays, intakeDateRange, intakeStatus,
  intakeLabel, nextOpenIntake, completionDueDateOf, makeIntake, makeSession,
  INTAKE_STATUS, TIME_SLOTS, DURATION_OPTIONS,
  DEFAULT_SESSION_START, DEFAULT_SESSION_END,
} = await import('../src/utils/classSchedule');

const { personaForRole } = await import('../src/data/mockData');
const { generated100Courses } = await import('../src/data/generated100Data');
const { buildCalendarEvents } = await import('../src/utils/calendarEvents');
const { derivePricing } = await import('../src/utils/costCenter');
const { CourseStoreProvider } = await import('../src/store/CourseStore');
const AdminCourses = (await import('../src/pages/admin/AdminCourses')).default;
const LearnerCourseDetail = (await import('../src/pages/learner/LearnerCourseDetail')).default;
const AdminCourseBuilder = (await import('../src/pages/admin/AdminCourseBuilder')).default;
const TrainerHub = (await import('../src/pages/trainer/TrainerHub')).default;

const AUTH_KEY = 'mm-megalearn-auth-v6';

let passed = 0;
const failures = [];
function check(label, ok, extra = '') {
  if (ok) { passed += 1; console.log(`  PASS  ${label}`); }
  else { failures.push(label); console.log(`  FAIL  ${label}${extra ? ' :: ' + extra : ''}`); }
}
function section(title) { console.log(`\n=== ${title} ===`); }

function actAs(role) {
  store.set(AUTH_KEY, JSON.stringify(personaForRole(role)));
}

function render(label, element, path, pattern) {
  try {
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={[path]}>
        <CourseStoreProvider>
          <Routes><Route path={pattern} element={element} /></Routes>
        </CourseStoreProvider>
      </MemoryRouter>
    );
  } catch (err) {
    failures.push(`RENDER ERROR [${label}]`);
    console.log(`  FAIL  render ${label} :: ${err.stack || err.message}`);
    return '';
  }
}

const intakeOf = (name, sessions) => ({ ...makeIntake({ name, sessions: [] }), name, sessions });
const day = (date, startTime, endTime, topic = '') => makeSession({ date, startTime, endTime, topic });

// ---------------------------------------------------------------------------
section('A. Schedule maths');
check('a 3-hour morning block is 3.0h', sessionHours('08:30', '11:30') === 3);
check('a 3.5-hour block keeps the half hour', sessionHours('08:30', '12:00') === 3.5);
check('an inverted window is 0h, never negative', sessionHours('12:00', '08:00') === 0);
check('an unparseable time is 0h', sessionHours('lunchtime', '11:30') === 0);
check('timeToMinutes rejects an impossible clock time', timeToMinutes('25:00') === null);
check('minutesToTime round-trips', minutesToTime(timeToMinutes('13:45')) === '13:45');

const twoDays = [day('2026-09-10', '08:00', '16:00'), day('2026-09-11', '08:00', '16:00')];
check('a 16-hour course split 8h + 8h totals 16h', totalScheduledHours(twoDays) === 16);
check('...and counts as 2 training days', trainingDayCount(twoDays) === 2);

const splitDay = [day('2026-09-10', '08:30', '12:00'), day('2026-09-10', '13:30', '17:00')];
check('two blocks on one date are still a single training day', trainingDayCount(splitDay) === 1);
check('...and their hours add up', totalScheduledHours(splitDay) === 7);

section('A1b. Time is picked from a list, never typed');
// A native <input type="time"> formats itself from the BROWSER locale, so a Vietnamese
// Chrome renders 13:30 as "01:30 CH" and invites mis-entry. Every offered slot must be an
// unambiguous 24-hour string the app controls itself.
check('every offered slot is a 24-hour HH:MM string',
  TIME_SLOTS.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)));
check('no slot carries an AM/PM marker of any language',
  TIME_SLOTS.every((t) => !/[a-zA-Z]/.test(t)));
check('the slots run in quarter-hour steps',
  TIME_SLOTS.every((t, i) => i === 0 || timeToMinutes(t) - timeToMinutes(TIME_SLOTS[i - 1]) === 15));
check('the slots cover a full working day', TIME_SLOTS[0] === '06:00' && TIME_SLOTS[TIME_SLOTS.length - 1] === '22:00');
check('the slots are strictly increasing, with no duplicate',
  new Set(TIME_SLOTS).size === TIME_SLOTS.length);
check('the default session window is selectable from the list',
  TIME_SLOTS.includes(DEFAULT_SESSION_START) && TIME_SLOTS.includes(DEFAULT_SESSION_END));
check('every seed session starts on an offered slot',
  generated100Courses.filter(isInPersonCourse).every((c) => courseSessions(c).every((s) => TIME_SLOTS.includes(s.startTime))));
check('every seed session ends on an offered slot',
  generated100Courses.filter(isInPersonCourse).every((c) => courseSessions(c).every((s) => TIME_SLOTS.includes(s.endTime))));
check('the online duration presets are all parseable hour values',
  DURATION_OPTIONS.every((d) => /^\d+\.\d h$/.test(d.replace('h', ' h'))));

section('A2. Legacy shapes upgrade in place');
const legacyFlat = { sessions: [day('2026-08-28', '08:30', '11:30')] };
check('a flat session list becomes one intake', courseIntakes(legacyFlat).length === 1);
check('...keeping its session', courseIntakes(legacyFlat)[0].sessions.length === 1);

const legacySingle = { scheduleDate: '2026-08-28', scheduleTime: '08:30 - 11:30 (3.0 hours)' };
const upgraded = courseIntakes(legacySingle);
check('a legacy single-date course becomes one intake', upgraded.length === 1);
check('...with the start time parsed out of the free-text window', upgraded[0].sessions[0].startTime === '08:30');
check('...and the end time too', upgraded[0].sessions[0].endTime === '11:30');
check('a course with no schedule at all yields no intake', courseIntakes({}).length === 0);

// Ids are React keys and the handle every edit is addressed by. Re-reading the same course
// must return the same ids, or the editor remounts on every keystroke and edits miss.
check('reading a legacy course twice returns identical intake ids',
  courseIntakes({ id: 'CRS-1', ...legacySingle })[0].id === courseIntakes({ id: 'CRS-1', ...legacySingle })[0].id);
check('reading a legacy course twice returns identical session ids',
  courseIntakes({ id: 'CRS-1', ...legacySingle })[0].sessions[0].id
    === courseIntakes({ id: 'CRS-1', ...legacySingle })[0].sessions[0].id);
check('two different courses never share a synthesized intake id',
  courseIntakes({ id: 'CRS-1', ...legacySingle })[0].id !== courseIntakes({ id: 'CRS-2', ...legacySingle })[0].id);
check('a stored id is always preferred over a synthesized one',
  courseIntakes({ id: 'CRS-1', intakes: [{ id: 'kept', sessions: [day('2026-09-10', '08:00', '10:00')] }] })[0].id === 'kept');

// ---------------------------------------------------------------------------
section('B. Intakes — running the same course more than once');
const reRun = {
  intakes: [
    intakeOf('Intake 1', twoDays),
    intakeOf('Intake 2', [day('2026-10-01', '08:00', '16:00'), day('2026-10-02', '08:00', '16:00')]),
  ],
};
const runs = courseIntakes(reRun);
check('both intakes are read back', runs.length === 2);
check('each intake keeps its own dates', intakeDateRange(runs[0]).start === '2026-09-10' && intakeDateRange(runs[1]).start === '2026-10-01');
check('each intake reports its own hours', intakeHours(runs[0]) === 16 && intakeHours(runs[1]) === 16);
check('each intake reports its own day count', intakeDays(runs[0]) === 2);
check('the flattened session list spans every intake', courseSessions(reRun).length === 4);
check('flattened sessions carry the intake they belong to', courseSessions(reRun).every((s) => s.intakeId));
check('an unnamed intake falls back to a positional label', intakeLabel({}, 2) === 'Intake 3');
check('a named intake keeps its name', intakeLabel({ name: 'October cohort' }, 0) === 'October cohort');

section('B2. Intake status against a reference date');
check('an intake in the future is Upcoming',
  intakeStatus(runs[1], new Date('2026-09-01')).id === INTAKE_STATUS.UPCOMING.id);
check('an intake being taught today is Running',
  intakeStatus(runs[0], new Date('2026-09-10')).id === INTAKE_STATUS.IN_PROGRESS.id);
check('an intake whose last day has passed is Completed',
  intakeStatus(runs[0], new Date('2026-09-20')).id === INTAKE_STATUS.COMPLETED.id);
check('an intake with no dates is Not scheduled',
  intakeStatus(intakeOf('Draft', [day('', '08:30', '11:30')])).id === INTAKE_STATUS.UNSCHEDULED.id);

check('the next open intake is the first that has not finished',
  nextOpenIntake(reRun, new Date('2026-09-20'))?.name === 'Intake 2');
check('once every intake is over there is none left to join',
  nextOpenIntake(reRun, new Date('2026-12-01')) === null);
check('before anything starts the next intake is the earliest one',
  nextOpenIntake(reRun, new Date('2026-08-01'))?.name === 'Intake 1');

// ---------------------------------------------------------------------------
section('C. Validation');
check('a course with no intake is rejected', validateIntakes([]).ok === false);
check('an intake with no training day is rejected',
  validateIntakes([intakeOf('Empty', [])]).ok === false);
check('a session with no date is rejected',
  validateIntakes([intakeOf('A', [day('', '08:00', '10:00')])]).ok === false);
check('an end time before the start time is rejected',
  validateIntakes([intakeOf('A', [day('2026-09-10', '15:00', '09:00')])]).ok === false);
check('two overlapping sessions inside one intake are rejected',
  validateIntakes([intakeOf('A', [day('2026-09-10', '08:00', '12:00'), day('2026-09-10', '11:00', '15:00')])]).ok === false);
check('a morning + afternoon split on one day is accepted',
  validateIntakes([intakeOf('A', splitDay)]).ok === true);
check('back-to-back sessions do not count as an overlap',
  validateIntakes([intakeOf('A', [day('2026-09-10', '08:00', '12:00'), day('2026-09-10', '12:00', '15:00')])]).ok === true);
check('two intakes running at the same moment are rejected',
  validateIntakes([intakeOf('A', [day('2026-09-10', '08:00', '12:00')]), intakeOf('B', [day('2026-09-10', '10:00', '14:00')])]).ok === false);
check('two intakes on the same day at different times are fine',
  validateIntakes([intakeOf('A', [day('2026-09-10', '08:00', '12:00')]), intakeOf('B', [day('2026-09-10', '13:00', '17:00')])]).ok === true);
check('a valid multi-intake schedule raises no warning',
  validateIntakes(runs).warnings.length === 0);
check('an intake shorter than the others warns but still saves', (() => {
  const res = validateIntakes([intakeOf('Full', twoDays), intakeOf('Short', [day('2026-10-01', '08:00', '10:00')])]);
  return res.ok === true && res.warnings.length === 1;
})());
// The Duplicate button copies a day's window onto the NEXT free date. Copying it onto the
// same date would collide with the row it came from and fail validation instantly.
check('duplicating a day onto the following date stays valid',
  validateIntakes([intakeOf('A', [day('2026-09-10', '08:30', '11:30'), day('2026-09-11', '08:30', '11:30')])]).ok === true);
check('...whereas copying it onto the same date would not',
  validateIntakes([intakeOf('A', [day('2026-09-10', '08:30', '11:30'), day('2026-09-10', '08:30', '11:30')])]).ok === false);

// ---------------------------------------------------------------------------
section('D. Derived fields');
const derived = deriveScheduleFields(runs);
check('total hours are computed from the schedule, never declared', derived.totalTrainingHours === 16);
check('training days come from the primary intake', derived.trainingDays === 2);
check('the intake count is recorded', derived.intakeCount === 2);
check('every session across every intake is flattened out', derived.sessionCount === 4);
check('scheduleDate mirrors the very first session', derived.scheduleDate === '2026-09-10');
check('scheduleTime is rebuilt for legacy readers', derived.scheduleTime === '08:00 - 16:00 (8.0h)', derived.scheduleTime);
check('startDate is left alone (it is the enrollment window, not the timetable)', !('startDate' in derived));
check('endDate is left alone as well', !('endDate' in derived));
check('estimatedHours tracks the computed total', derived.estimatedHours === '16.0h');
check('sessions come back in chronological order across intakes',
  deriveScheduleFields([runs[1], runs[0]]).sessions[0].date === '2026-09-10');
check('the summary counts intakes, days and hours',
  scheduleSummary(reRun) === '2 intakes · 2 days · 16.0h', scheduleSummary(reRun));
check('a single-run course reads as one intake',
  scheduleSummary({ intakes: [runs[0]] }) === '1 intake · 2 days · 16.0h');

// A course with a manually declared total can no longer disagree with its schedule,
// because the declared field is not read at all any more.
const stale = { totalTrainingHours: 3, intakes: [intakeOf('A', splitDay)] };
check('a stale declared total is ignored in favour of the schedule',
  deriveScheduleFields(courseIntakes(stale)).totalTrainingHours === 7);
check('...and produces no mismatch warning', validateIntakes(courseIntakes(stale)).warnings.length === 0);

// ---------------------------------------------------------------------------
section('E. Seed catalog');
const inPerson = generated100Courses.filter(isInPersonCourse);
const online = generated100Courses.filter((c) => !isInPersonCourse(c));
check('the catalog contains in-person courses', inPerson.length > 0, String(inPerson.length));
check('every in-person course has at least one intake',
  inPerson.every((c) => courseIntakes(c).length > 0));
check('every in-person schedule passes validation',
  inPerson.every((c) => validateIntakes(courseIntakes(c)).ok),
  inPerson.filter((c) => !validateIntakes(courseIntakes(c)).ok).map((c) => c.code).join(','));
check('no in-person course raises a schedule warning',
  inPerson.every((c) => validateIntakes(courseIntakes(c)).warnings.length === 0));
check('the catalog includes courses re-run for a second cohort',
  inPerson.some((c) => courseIntakes(c).length > 1));
check('the catalog includes single-run courses too',
  inPerson.some((c) => courseIntakes(c).length === 1));
check('the catalog includes multi-day intakes',
  inPerson.some((c) => intakeDays(courseIntakes(c)[0]) > 1));
check('the catalog includes an intake running three days',
  inPerson.some((c) => intakeDays(courseIntakes(c)[0]) >= 3));
check('every intake of a course runs the same number of hours',
  inPerson.every((c) => {
    const hrs = courseIntakes(c).map(intakeHours);
    return hrs.every((h) => Math.abs(h - hrs[0]) < 0.5);
  }));
check('the declared total matches the computed one everywhere',
  inPerson.every((c) => Math.abs((c.totalTrainingHours || 0) - intakeHours(courseIntakes(c)[0])) < 0.01),
  inPerson.filter((c) => Math.abs((c.totalTrainingHours || 0) - intakeHours(courseIntakes(c)[0])) >= 0.01).map((c) => c.code).join(','));
check('scheduleDate still mirrors the first session for legacy readers',
  inPerson.every((c) => c.scheduleDate === courseSessions(c)[0].date));
// The catalog, the cost report and the course card all read estimatedHours. For an
// in-person course it has to be the schedule, not a separate hand-written estimate.
check('estimatedHours agrees with the timetable on every in-person course',
  inPerson.every((c) => c.estimatedHours === `${intakeHours(courseIntakes(c)[0]).toFixed(1)}h`),
  inPerson.filter((c) => c.estimatedHours !== `${intakeHours(courseIntakes(c)[0]).toFixed(1)}h`)
    .map((c) => `${c.code}:${c.estimatedHours}`).slice(0, 3).join(' '));
check('an online course keeps its own estimate', online.every((c) => Boolean(c.estimatedHours)));
check('online courses are untouched — no intakes, no schedule date',
  online.every((c) => (c.intakes || []).length === 0 && !c.scheduleDate));

section('F. In-person course ownership');
check('every in-person course names the trainer who owns it',
  inPerson.every((c) => c.createdBy && c.createdBy === c.trainerId));
check('online courses stay unowned, so they belong to the L&D admin',
  online.every((c) => !c.createdBy));
const trainerPersona = personaForRole('trainer');
const ownedByPersona = inPerson.filter((c) => c.createdBy === trainerPersona.userId);
check('the demo trainer owns at least one in-person course to manage',
  ownedByPersona.length > 0, `${trainerPersona.fullName} owns ${ownedByPersona.length}`);
check('the demo trainer does not own the whole catalog',
  ownedByPersona.length < inPerson.length);

// ---------------------------------------------------------------------------
section('G. Downstream wiring');
const sampleCourse = inPerson.find((c) => courseIntakes(c).length > 1);
check('a re-run course exists to test the downstream wiring with', Boolean(sampleCourse));

const enrolled = { [sampleCourse.id]: { status: 'IN_PROGRESS', progressPercent: 20 } };
const calendar = buildCalendarEvents({
  courses: [sampleCourse],
  myEnrollments: enrolled,
  role: 'learner',
  currentUser: personaForRole('learner'),
});
const iltEvents = calendar.allEvents.filter((e) => e.id.startsWith('ilt-'));
check('every training day of an enrolled class reaches the calendar',
  iltEvents.length === courseSessions(sampleCourse).length,
  `${iltEvents.length} events vs ${courseSessions(sampleCourse).length} sessions`);
check('each calendar entry carries its real time window',
  iltEvents.every((e) => /^\d{2}:\d{2} - \d{2}:\d{2}$/.test(e.time)));
check('each calendar entry names the intake it belongs to',
  iltEvents.every((e) => e.intakeId));
check('a course nobody enrolled in adds no personal training day',
  buildCalendarEvents({ courses: [sampleCourse], myEnrollments: {}, role: 'learner', currentUser: personaForRole('learner') })
    .allEvents.filter((e) => e.id.startsWith('ilt-')).length === 0);

const teachCal = buildCalendarEvents({
  courses: ownedByPersona,
  myEnrollments: {},
  role: 'trainer',
  currentUser: trainerPersona,
});
const teachEvents = teachCal.allEvents.filter((e) => e.id.startsWith('teach-'));
check('a trainer sees every day of every intake they run on their calendar',
  teachEvents.length === ownedByPersona.reduce((n, c) => n + courseSessions(c).length, 0));
check('the teaching calendar links back to the trainer hub',
  teachEvents.every((e) => e.actionUrl === '/trainer'));

check('an in-person seat is priced off the real contact hours', (() => {
  const short = derivePricing({ deliveryType: 'IN_PERSON_CLASSROOM', totalTrainingHours: 3, estimatedHours: '3h' });
  const long = derivePricing({ deliveryType: 'IN_PERSON_CLASSROOM', totalTrainingHours: 21, estimatedHours: '3h' });
  return long.price > short.price;
})());
check('...and a course with no declared total still falls back to its schedule', (() => {
  const priced = derivePricing({ deliveryType: 'IN_PERSON_CLASSROOM', intakes: [intakeOf('A', twoDays)], estimatedHours: '2h' });
  const fallback = derivePricing({ deliveryType: 'IN_PERSON_CLASSROOM', estimatedHours: '2h' });
  return priced.price > fallback.price;
})());

check('the completion deadline is the last training day, not a typed-in date',
  completionDueDateOf(reRun) === '2026-10-02');
check('a course with no schedule has no derived deadline', completionDueDateOf({}) === null);

section('G2. Enrolling into an in-person course picks an intake');
{
  const enrollStore = new Map();
  const realLs = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (enrollStore.has(k) ? enrollStore.get(k) : null),
    setItem: (k, v) => enrollStore.set(k, String(v)),
    removeItem: (k) => enrollStore.delete(k),
    clear: () => enrollStore.clear(),
  };
  globalThis.localStorage = realLs;

  // The store wires enrollment to nextOpenIntake; assert the rule it relies on directly,
  // since driving the provider's enrollCourse from here would need a full React tree.
  const future = {
    id: 'CRS-FUTURE',
    deliveryType: 'IN_PERSON_CLASSROOM',
    intakes: [
      intakeOf('Intake 1', [day('2026-09-10', '08:00', '16:00')]),
      intakeOf('Intake 2', [day('2026-11-10', '08:00', '16:00')]),
    ],
  };
  const picked = nextOpenIntake(future, new Date('2026-10-01'));
  check('a learner joining after intake 1 finished is placed in intake 2', picked?.name === 'Intake 2');
  check('their deadline is that intake\'s last training day', intakeDateRange(picked).end === '2026-11-10');
  check('a learner joining before anything starts is placed in intake 1',
    nextOpenIntake(future, new Date('2026-08-01'))?.name === 'Intake 1');

  const calWithIntake = buildCalendarEvents({
    courses: [future],
    myEnrollments: { 'CRS-FUTURE': { status: 'NOT_STARTED', intakeId: picked.id } },
    role: 'learner',
    currentUser: personaForRole('learner'),
  });
  const mine = calWithIntake.allEvents.filter((e) => e.id.startsWith('ilt-'));
  check('the calendar shows only the intake the learner actually joined', mine.length === 1);
  check('...and it is the right one', mine[0].date === '2026-11-10');
}

// ---------------------------------------------------------------------------
section('H. SSR — Course Builder intake editor');
actAs('useradmin');
const builderHtml = render(
  'course builder (new in-person course)',
  <AdminCourseBuilder />,
  '/admin/courses/new?scope=classroom&deliveryType=IN_PERSON_CLASSROOM',
  '/admin/courses/new'
);
check('the builder offers an intake-based training schedule', builderHtml.includes('Intakes &amp; Training Days'));
check('the builder can add another intake', builderHtml.includes('Add Intake'));
check('the builder can add a training day', builderHtml.includes('Add Training Day'));
check('the builder explains what an intake is', builderHtml.includes('one group of employees'));
check('total training hours are shown as computed, not as an input',
  builderHtml.includes('Total Training Hours') && builderHtml.includes('Added up from the training days'));
check('the old free-typed hours input is gone', !builderHtml.includes('placeholder="e.g. 16"'));
check('the old single "Time Window" dropdown is still gone', !builderHtml.includes('>Time Window<'));
check('an intake can override the trainer', builderHtml.includes('Trainer for this intake'));
check('an intake can override the venue', builderHtml.includes('Venue for this intake'));
check('the builder still asks for a default seat count', builderHtml.includes('Default Seats Per Intake'));

// The duration typed at the top of the form used to contradict the timetable computed at
// the bottom of it — 4.0h declared against a 6.0h schedule. There is now one source only.
check('an in-person course cannot have its duration typed in by hand',
  builderHtml.includes('Duration (from the schedule)'));
check('...and it points at where the duration actually comes from',
  builderHtml.includes('set in Training Schedule'));
check('the free-text duration box is gone', !builderHtml.includes('E.g. 3h or 2.5 hours'));
check('the duration shown at the top matches the schedule below', (() => {
  const top = builderHtml.match(/Duration \(from the schedule\)[\s\S]{0,400}?(\d+\.\d)h/);
  const bottom = builderHtml.match(/Total Training Hours[\s\S]{0,400}?(\d+\.\d)h/);
  return Boolean(top && bottom) && top[1] === bottom[1];
})());
check('the enrollment window is labelled apart from the training days',
  builderHtml.includes('Enrollment Opens') && builderHtml.includes('Enrollment Closes'));
check('...and says so in as many words',
  builderHtml.includes('Training days are set in the schedule below'));
check('start/end date no longer read as the class dates for an in-person course',
  !builderHtml.includes('>Start Date<') && !builderHtml.includes('>End Date<'));

section('H1b. Times are chosen from a dropdown, not typed');
check('the schedule rows render no native time input', !/type="time"/.test(builderHtml));
check('the schedule rows offer the quarter-hour slots',
  builderHtml.includes('>08:30<') && builderHtml.includes('>13:30<') && builderHtml.includes('>17:00<'));
check('no AM/PM marker can reach the schedule rows',
  !/\b(AM|PM|SA|CH)\b/.test(builderHtml.match(/Intakes &amp; Training Days[\s\S]*/)?.[0] || ''));
check('the in-person allocation panel drops the manual due date',
  !builderHtml.includes('>Completion Due Date<'));
check('...and explains the deadline comes from the schedule',
  builderHtml.includes('Completion deadline:'));
check('...and drops the allocation notes field too',
  !builderHtml.includes('Notes / Allocation reason'));

section('H2. SSR — the online builder keeps its own due date field');
const onlineBuilderHtml = render(
  'course builder (new online course)',
  <AdminCourseBuilder />,
  '/admin/courses/new?scope=online&deliveryType=ONLINE_ELEARNING',
  '/admin/courses/new'
);
check('an online course still offers a Completion Due Date', onlineBuilderHtml.includes('Completion Due Date'));
check('an online course still offers the allocation notes', onlineBuilderHtml.includes('Notes / Allocation reason'));
check('an online course shows no intake editor', !onlineBuilderHtml.includes('Add Intake'));
check('an online course keeps a plain Start Date / End Date',
  onlineBuilderHtml.includes('>Start Date<') && onlineBuilderHtml.includes('>End Date<'));
check('an online course picks its duration from presets, not free text',
  onlineBuilderHtml.includes('Estimated duration') && !onlineBuilderHtml.includes('E.g. 3h or 2.5 hours'));
check('...and the presets are offered as options',
  DURATION_OPTIONS.every((d) => onlineBuilderHtml.includes(`>${d}<`)));

section('H3. SSR — Trainer manages their own in-person courses');
actAs('trainer');
const trainerHtml = render('trainer my-courses tab', <TrainerHub initialTab="MY_COURSES" />, '/trainer/my-courses', '/trainer/my-courses');
check('the trainer hub exposes a "My In-Person Courses" tab', trainerHtml.includes('My In-Person Courses'));
check('the trainer can create an in-person course from there', trainerHtml.includes('Create In-Person Course'));
check('the tab explains the courses shown are the trainer\'s own', trainerHtml.includes('you created'));
check('the trainer sees Edit actions on their own courses', trainerHtml.includes('>Edit<'));
check('the trainer sees Delete actions on their own courses', trainerHtml.includes('>Delete<'));
check('the listing shows a training schedule column', trainerHtml.includes('Training Schedule'));
check('the listing counts the intakes of each course', /\d+ intakes?</.test(trainerHtml));
check('the hub links to the teaching schedule page', trainerHtml.includes('Teaching Schedule'));
check('the hub links to the training reports page', trainerHtml.includes('Training Reports'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
check('every course the trainer owns is listed',
  ownedByPersona.every((c) => trainerHtml.includes(esc(c.title))),
  ownedByPersona.filter((c) => !trainerHtml.includes(esc(c.title))).map((c) => c.code).join(','));
const notOwned = inPerson.filter((c) => c.createdBy !== trainerPersona.userId);
check('no course owned by another trainer leaks into the list',
  notOwned.length > 0 && notOwned.every((c) => !trainerHtml.includes(esc(c.title))),
  notOwned.filter((c) => trainerHtml.includes(esc(c.title))).map((c) => c.code).join(','));

section('H4. SSR — Learner Library');
for (const role of ['learner', 'manager', 'hrbp']) {
  actAs(role);
  const html = render(`${role} library`, <AdminCourses />, '/learner/catalog?tab=domain-library', '/learner/catalog');
  check(`${role} reaches the Library instead of being redirected away`, html.includes('Open Library'));
  check(`${role} sees the library reading as curated collections`, html.includes('curated collections'));
  check(`${role} sees their own progress on each library`, html.includes('My progress'));
  check(`${role} gets no library authoring controls`,
    !html.includes('Create New Library') && !html.includes('>Manager<'));
}

actAs('useradmin');
const adminLibraryHtml = render('useradmin library', <AdminCourses />, '/admin/courses?tab=domain-library', '/admin/courses');
check('a User Admin still gets the authoring view', adminLibraryHtml.includes('Create New Library'));
check('...and not the learner browse view', !adminLibraryHtml.includes('Open Library'));

section('H4b. SSR — course materials are gated behind registration');
{
  const COURSES_KEY = 'mm-megalearn-courses-v14';
  const ENROLLMENT_KEY = 'mm-megalearn-enrollments-v6';
  // A fresh id, so no seeded enrollment from the static matrix can make the learner look
  // registered and quietly hide the very thing being tested.
  const withMaterials = {
    ...sampleCourse,
    id: 'CRS-MATERIALS-GATE-TEST',
    code: 'MAT-GATE-001',
    status: 'PUBLISHED',
    materials: [
      { id: 'm1', name: 'SOP-MMVN-HSE Operating Guide (PDF)', type: 'PDF', size: '3.8 MB', url: '#' },
      { id: 'm2', name: 'Training Slides & Scenario (PPT)', type: 'PPT', size: '7.6 MB', url: '#' },
    ],
  };
  const learner = personaForRole('learner');
  actAs('learner');
  store.set(COURSES_KEY, JSON.stringify([withMaterials]));

  // Not registered: the file list is informative, but nothing may be opened.
  store.delete(ENROLLMENT_KEY);
  const anon = render('learner detail (not registered)', <LearnerCourseDetail />, `/learner/courses/${withMaterials.id}`, '/learner/courses/:courseId');
  check('a learner who has not registered still sees what materials exist',
    anon.includes('SOP-MMVN-HSE Operating Guide'));
  check('...but gets no View Online button', !anon.includes('View Online'));
  check('...and no Download button', !anon.includes('>Download<'));
  check('...and is told the materials unlock after registering',
    anon.includes('Available after registration'));
  check('...and the section header says so too', anon.includes('Register for this class to open the materials'));

  // Registered: the same files become openable.
  store.set(ENROLLMENT_KEY, JSON.stringify({
    [learner.userId]: {
      [withMaterials.id]: {
        courseId: withMaterials.id, userId: learner.userId, status: 'NOT_STARTED',
        progressPercent: 0, enrolledVersion: withMaterials.currentVersion || 'v1.0',
      },
    },
  }));
  const joined = render('learner detail (registered)', <LearnerCourseDetail />, `/learner/courses/${withMaterials.id}`, '/learner/courses/:courseId');
  check('a registered learner can open the materials online', joined.includes('View Online'));
  check('...and download them', joined.includes('>Download<'));
  check('...and is no longer shown the lock', !joined.includes('Available after registration'));

  store.delete(COURSES_KEY);
  store.delete(ENROLLMENT_KEY);
}

section('H5. SSR — the catalog surfaces the schedule');
const classroomHtml = render('useradmin classroom tab', <AdminCourses />, '/admin/courses?tab=classroom', '/admin/courses');
check('the classroom listing shows how many intakes a course runs', /\d+ intakes? ·/.test(classroomHtml));
check('the classroom listing shows the hours per intake', /\d+\.\d+h/.test(classroomHtml));

// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
if (failures.length === 0) {
  console.log(`PASS — ${passed}/${passed} checks passed.`);
} else {
  console.log(`FAIL — ${failures.length} of ${passed + failures.length} checks failed:`);
  failures.forEach((f) => console.log(`  · ${f}`));
}
console.log('='.repeat(60));
process.exit(failures.length === 0 ? 0 : 1);
