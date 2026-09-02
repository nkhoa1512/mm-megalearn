// src/utils/calendarDate.js
//
// Dates across the codebase are plain 'YYYY-MM-DD' strings (see isoPlusDays()
// in mockData.js) — the functions here must never use new Date(isoString)
// to avoid timezone drift when parsing an ISO string (JS treats 'YYYY-MM-DD' as UTC
// midnight; .getDate() in a negative-offset zone can go back a day). Only use
// the numeric constructor new Date(year, monthIndex, day) for date maths, and always
// format back by manual string concatenation, never .toISOString().

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  }
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] || 2026;
  const m = parts[1] || 1;
  const d = parts[2] || 1;
  return { y, m, d }; // m is the calendar month number (1-12), not zero-indexed
}

export function formatDateString(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function todayDateString() {
  const now = new Date();
  return formatDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function firstOfMonth(dateStr) {
  const { y, m } = parseDateString(dateStr);
  return formatDateString(y, m, 1);
}

export function addDays(dateStr, delta) {
  const { y, m, d } = parseDateString(dateStr);
  const target = new Date(y, m - 1, d + delta);
  return formatDateString(target.getFullYear(), target.getMonth() + 1, target.getDate());
}

export function addMonths(monthStr, delta) {
  const { y, m } = parseDateString(monthStr);
  const target = new Date(y, m - 1 + delta, 1);
  return formatDateString(target.getFullYear(), target.getMonth() + 1, 1);
}

export function addWeeks(dateStr, delta) {
  return addDays(dateStr, delta * 7);
}

export function getMonthGridWeeks(monthStr) {
  const { y, m } = parseDateString(monthStr);
  const startWeekday = new Date(y, m - 1, 1).getDay(); // 0 = Sunday
  const gridStart = new Date(y, m - 1, 1 - startWeekday);

  const weeks = [];
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + week * 7 + dayIdx);
      days.push({
        date: formatDateString(cellDate.getFullYear(), cellDate.getMonth() + 1, cellDate.getDate()),
        inMonth: cellDate.getFullYear() === y && cellDate.getMonth() === m - 1,
        dayOfWeek: dayIdx,
      });
    }
    weeks.push(days);
  }
  return weeks;
}

export function getWeekDays(dateStr) {
  const { y, m, d } = parseDateString(dateStr);
  const curr = new Date(y, m - 1, d);
  const dayOfWeek = curr.getDay(); // 0 = Sunday
  const weekStart = new Date(y, m - 1, d - dayOfWeek);

  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const cellDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    days.push({
      date: formatDateString(cellDate.getFullYear(), cellDate.getMonth() + 1, cellDate.getDate()),
      dayNum: cellDate.getDate(),
      dayOfWeek: i,
    });
  }
  return days;
}

const MONTH_LABELS_VI = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_LABELS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const WEEKDAY_NAMES_VI = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatMonthLabel(monthStr, language = 'vi') {
  const { y, m } = parseDateString(monthStr);
  if (language === 'en') return `${MONTH_LABELS_EN[m - 1]} ${y}`;
  return `${MONTH_LABELS_VI[m - 1]}, ${y}`;
}

export function formatFullDateLabel(dateStr, language = 'vi') {
  if (!dateStr) return '';
  const { y, m, d } = parseDateString(dateStr);
  const dateObj = new Date(y, m - 1, d);
  const weekday = dateObj.getDay();

  if (language === 'en') {
    return `${WEEKDAY_NAMES_EN[weekday]}, ${MONTH_LABELS_EN[m - 1]} ${d}, ${y}`;
  }
  return `${WEEKDAY_NAMES_VI[weekday]}, ${d} ${MONTH_LABELS_VI[m - 1]}, ${y}`;
}

export function formatRelativeDay(dateStr, language = 'vi') {
  const today = todayDateString();
  if (dateStr === today) {
    return language === 'en' ? 'Today' : 'Today';
  }
  const tomorrow = addDays(today, 1);
  if (dateStr === tomorrow) {
    return language === 'en' ? 'Tomorrow' : 'Tomorrow';
  }
  const yesterday = addDays(today, -1);
  if (dateStr === yesterday) {
    return language === 'en' ? 'Yesterday' : 'Yesterday';
  }

  // Calculate day difference
  const { y: y1, m: m1, d: d1 } = parseDateString(today);
  const { y: y2, m: m2, d: d2 } = parseDateString(dateStr);
  const diffDays = Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return language === 'en' ? `In ${diffDays} days` : `${diffDays} days left`;
  }
  return language === 'en' ? `${Math.abs(diffDays)} days ago` : `${Math.abs(diffDays)} days ago`;
}

/**
 * Exports a standard .ics iCalendar file for Outlook, Google Calendar and Apple Calendar
 */
export function generateIcsFile(events = [], calendarTitle = 'MM MegaLearn Calendar') {
  const cleanTitle = calendarTitle.replace(/[^a-zA-Z0-9_\- ]/g, '');
  const now = new Date();
  const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MM Mega Market Vietnam//MegaLearn LMS//VI',
    `X-WR-CALNAME:${calendarTitle}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((ev) => {
    const { y, m, d } = parseDateString(ev.date || todayDateString());
    const dateFormatted = `${y}${pad2(m)}${pad2(d)}`;
    const uid = `${ev.id || Math.random().toString(36).substr(2, 9)}@megalearn.mmvn.com`;
    const summary = (ev.title || 'MM MegaLearn training event').replace(/,/g, '\\,');
    const description = `${ev.subtitle || ''} [MM MegaLearn - Job Levels & Training]`.replace(/\n/g, '\\n');
    const location = (ev.venue || 'MM Mega Market LMS').replace(/,/g, '\\,');

    icsContent.push('BEGIN:VEVENT');
    icsContent.push(`UID:${uid}`);
    icsContent.push(`DTSTAMP:${dtStamp}`);
    icsContent.push(`DTSTART;VALUE=DATE:${dateFormatted}`);
    icsContent.push(`DTEND;VALUE=DATE:${dateFormatted}`);
    icsContent.push(`SUMMARY:${summary}`);
    icsContent.push(`DESCRIPTION:${description}`);
    icsContent.push(`LOCATION:${location}`);
    icsContent.push('STATUS:CONFIRMED');
    icsContent.push('END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');
  const fullIcs = icsContent.join('\r\n');

  const blob = new Blob([fullIcs], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${cleanTitle.toLowerCase().replace(/\s+/g, '_')}_schedule.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
