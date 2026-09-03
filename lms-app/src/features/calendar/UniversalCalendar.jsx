import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useCourseStore } from '../../store/CourseStore';
import {
  todayDateString,
  firstOfMonth,
  addMonths,
  addWeeks,
  addDays,
  getMonthGridWeeks,
  getWeekDays,
  formatMonthLabel,
  formatFullDateLabel,
  formatRelativeDay,
  generateIcsFile,
} from '../../utils/calendarDate';
import { buildCalendarEvents, buildOrganizationMonthlyEvents, EVENT_CATEGORIES } from '../../utils/calendarEvents';
import { Badge, Button, Modal, ProgressBar } from '../common/ui';
import { normalizeRole, roleDefinition, hasCapability } from '../../data/roles';
import MultiTargetAssigner from '../catalog/MultiTargetAssigner';

export default function UniversalCalendar({ basePath = '/my-learning' }) {
  const navigate = useNavigate();
  const {
    courses = [],
    myEnrollments = {},
    classrooms = [],
    assessments = [],
    currentUser,
    users = [],
    language = 'vi',
    checkInClassroom,
    openSurveyModal,
    enrollCourse,
    extendEnrollmentDueDate,
    assignCourse,
  } = useCourseStore();

  const role = normalizeRole(currentUser?.role || 'learner');
  const roleDef = roleDefinition(role);
  const isLearnerOnly = role === 'learner';
  const today = todayDateString();

  // Navigation & View state
  const [viewMode, setViewMode] = useState('MONTH'); // MONTH | WEEK | AGENDA
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMonth, setViewMonth] = useState(() => firstOfMonth(today));
  const [scope, setScope] = useState(isLearnerOnly ? 'PERSONAL' : 'ALL'); // ALL | PERSONAL | OPERATIONAL
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [orgFilter, setOrgFilter] = useState('ALL'); // ALL | MANDATORY | OPTIONAL | ENROLLED | ACTION_REQUIRED
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Tooltips
  const [hoverCell, setHoverCell] = useState(null); // { date, top, left, events }
  const [detailModalEvent, setDetailModalEvent] = useState(null);
  const [scannerSession, setScannerSession] = useState(null);
  const [scanState, setScanState] = useState('SCANNING'); // SCANNING | VERIFYING | SUCCESS
  const [liveQrSession, setLiveQrSession] = useState(null);
  const [extendingEvent, setExtendingEvent] = useState(null);
  const [customExtensionDate, setCustomExtensionDate] = useState('');
  const [extensionFeedback, setExtensionFeedback] = useState('');
  const [assigningCourse, setAssigningCourse] = useState(null);
  const [assignFeedback, setAssignFeedback] = useState('');
  const [dayEventsModalDate, setDayEventsModalDate] = useState(null);
  const [dayEventsFilterQuery, setDayEventsFilterQuery] = useState('');
  const hoverTimerRef = useRef(null);

  const handleCellMouseEnter = (date, allDayItems, targetElement) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (allDayItems.length > 0) {
      const rect = targetElement.getBoundingClientRect();
      const popoverHeight = 360;
      const popoverWidth = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < popoverHeight && rect.top > popoverHeight
        ? rect.top - popoverHeight - 6
        : Math.max(10, Math.min(rect.bottom + 4, window.innerHeight - popoverHeight - 10));
      const left = Math.max(10, Math.min(rect.left, window.innerWidth - popoverWidth - 10));
      setHoverCell({
        date,
        top,
        left,
        events: allDayItems,
      });
    }
  };

  const handleCellMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoverCell(null);
    }, 280);
  };

  const handlePopoverMouseEnter = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoverCell(null);
    }, 200);
  };

  // Build calendar events for the user
  const { allEvents, personalEvents, operationalEvents, byDate } = useMemo(() => {
    return buildCalendarEvents({
      courses,
      myEnrollments,
      classrooms,
      assessments,
      role,
      currentUser,
      users,
    });
  }, [courses, myEnrollments, classrooms, assessments, role, currentUser, users]);

  // Organization-wide monthly course events (mandatory/optional courses across the whole org)
  const orgEvents = useMemo(
    () => buildOrganizationMonthlyEvents({ courses, myEnrollments, viewMonth, currentUser }),
    [courses, myEnrollments, viewMonth, currentUser]
  );
  // Org events narrowed by the quick filter chips (Mandatory / Optional / Enrolled / Action Required)
  const filteredOrgEvents = useMemo(() => {
    return orgEvents.filter((ev) => {
      if (orgFilter === 'MANDATORY') return ev.courseType === 'MANDATORY';
      if (orgFilter === 'OPTIONAL') return ev.courseType === 'OPTIONAL';
      if (orgFilter === 'ENROLLED') return ev.isEnrolled;
      if (orgFilter === 'ACTION_REQUIRED') return !ev.isEnrolled;
      return true;
    });
  }, [orgEvents, orgFilter]);
  const filteredOrgEventsByDate = useMemo(() => {
    const map = {};
    filteredOrgEvents.forEach((ev) => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [filteredOrgEvents]);

  // Operational tab label based on role
  const operationalScopeLabel = useMemo(() => {
    switch (role) {
      case 'manager': return language === 'en' ? 'Team Schedule' : 'Team Training Calendar';
      case 'trainer': return language === 'en' ? 'Teaching & Lab Ops' : 'Teaching & Lab Schedule';
      case 'hrbp': return language === 'en' ? 'Regional & Succession' : 'Regional & Succession Calendar';
      case 'useradmin': return language === 'en' ? 'Enterprise Ops' : 'Company-Wide Training Calendar';
      case 'sysadmin': return language === 'en' ? 'System Ops & Audit' : 'IT Operations & Audit Calendar';
      default: return language === 'en' ? 'Operations' : 'Operations Calendar';
    }
  }, [role, language]);

  // Active events based on scope, category, and search query
  const scopedEvents = useMemo(() => {
    if (scope === 'PERSONAL') return personalEvents;
    if (scope === 'OPERATIONAL') return operationalEvents;
    return allEvents;
  }, [scope, personalEvents, operationalEvents, allEvents]);

  const filteredEvents = useMemo(() => {
    return scopedEvents.filter((ev) => {
      // Category filter
      if (categoryFilter !== 'ALL' && ev.category !== categoryFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (ev.title || '').toLowerCase().includes(q);
        const matchSubtitle = (ev.subtitle || '').toLowerCase().includes(q);
        const matchInstructor = (ev.instructor || '').toLowerCase().includes(q);
        const matchVenue = (ev.venue || '').toLowerCase().includes(q);
        const matchCode = (ev.courseCode || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSubtitle && !matchInstructor && !matchVenue && !matchCode) {
          return false;
        }
      }
      return true;
    });
  }, [scopedEvents, categoryFilter, searchQuery]);

  // Group filtered events by date
  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const ev of filteredEvents) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date).push(ev);
    }
    return map;
  }, [filteredEvents]);

  // Selected date events (combining personal, operational & organization events)
  const selectedEvents = useMemo(() => {
    const personalAndOps = eventsByDate.get(selectedDate) || [];
    const orgItems = filteredOrgEventsByDate[selectedDate] || [];
    const map = new Map();
    personalAndOps.forEach((e) => map.set(e.courseId ? `course-${e.courseId}` : e.id, e));
    orgItems.forEach((e) => {
      const key = `course-${e.courseId}`;
      if (!map.has(key)) map.set(key, e);
    });
    return Array.from(map.values());
  }, [eventsByDate, filteredOrgEventsByDate, selectedDate]);

  // Events on the day opened in Full Day Modal
  const dayModalEvents = useMemo(() => {
    if (!dayEventsModalDate) return [];
    const personalAndOps = eventsByDate.get(dayEventsModalDate) || [];
    const orgItems = filteredOrgEventsByDate[dayEventsModalDate] || [];
    const map = new Map();
    personalAndOps.forEach((e) => map.set(e.courseId ? `course-${e.courseId}` : e.id, e));
    orgItems.forEach((e) => {
      const key = `course-${e.courseId}`;
      if (!map.has(key)) map.set(key, e);
    });
    const list = Array.from(map.values());
    if (!dayEventsFilterQuery.trim()) return list;
    const q = dayEventsFilterQuery.toLowerCase();
    return list.filter((e) => (e.title || '').toLowerCase().includes(q) || (e.courseCode || '').toLowerCase().includes(q));
  }, [dayEventsModalDate, eventsByDate, filteredOrgEventsByDate, dayEventsFilterQuery]);

  // Month event count
  const monthEventCount = useMemo(() => {
    const monthPrefix = viewMonth.slice(0, 7);
    const personalCount = filteredEvents.filter((ev) => (ev.date || '').startsWith(monthPrefix)).length;
    const orgCount = filteredOrgEvents.filter((ev) => (ev.date || '').startsWith(monthPrefix)).length;
    return personalCount + orgCount;
  }, [filteredEvents, filteredOrgEvents, viewMonth]);

  // Upcoming events within next 14 days (for right panel preview when day is empty)
  const upcomingEvents = useMemo(() => {
    const sorted = [...filteredEvents].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.filter((ev) => ev.date >= today).slice(0, 4);
  }, [filteredEvents, today]);

  // Navigation handlers
  function handlePrev() {
    if (viewMode === 'MONTH') {
      const nextMonth = addMonths(viewMonth, -1);
      setViewMonth(nextMonth);
      setSelectedDate(nextMonth);
    } else if (viewMode === 'WEEK') {
      const nextDate = addWeeks(selectedDate, -1);
      setSelectedDate(nextDate);
      setViewMonth(firstOfMonth(nextDate));
    } else {
      const nextDate = addMonths(selectedDate, -1);
      setSelectedDate(nextDate);
      setViewMonth(firstOfMonth(nextDate));
    }
  }

  function handleNext() {
    if (viewMode === 'MONTH') {
      const nextMonth = addMonths(viewMonth, 1);
      setViewMonth(nextMonth);
      setSelectedDate(nextMonth);
    } else if (viewMode === 'WEEK') {
      const nextDate = addWeeks(selectedDate, 1);
      setSelectedDate(nextDate);
      setViewMonth(firstOfMonth(nextDate));
    } else {
      const nextDate = addMonths(selectedDate, 1);
      setSelectedDate(nextDate);
      setViewMonth(firstOfMonth(nextDate));
    }
  }

  function handleToday() {
    setSelectedDate(today);
    setViewMonth(firstOfMonth(today));
  }

  function handleSelectDate(date) {
    setSelectedDate(date);
    if (date.slice(0, 7) !== viewMonth.slice(0, 7)) {
      setViewMonth(firstOfMonth(date));
    }
  }

  // Handle Event Action
  function handleEventAction(event, e) {
    if (e) e.stopPropagation();

    switch (event.actionType) {
      case 'START_COURSE':
        if (event.courseId) navigate(`${basePath}/${event.courseId}`);
        else if (event.actionUrl) navigate(event.actionUrl);
        break;
      case 'SCAN_QR':
        setScannerSession(event);
        setScanState('SCANNING');
        break;
      case 'PROJECT_QR':
        setLiveQrSession(event);
        break;
      case 'HOST_MEETING':
        if (event.meetingUrl && event.meetingUrl.startsWith('http')) {
          window.open(event.meetingUrl, '_blank');
        } else {
          setDetailModalEvent(event);
        }
        break;
      case 'START_ASSESSMENT':
        navigate(event.actionUrl || '/learner/catalog?tab=assessment');
        break;
      case 'ENROLL_COURSE':
        if (event.courseId) {
          enrollCourse(event.courseId, currentUser);
        }
        break;
      case 'SYNC_HRIS':
        navigate('/sysadmin');
        break;
      case 'VIEW_DETAIL':
      default:
        if (event.actionUrl && event.actionUrl.startsWith('/')) {
          navigate(event.actionUrl);
        } else {
          setDetailModalEvent(event);
        }
        break;
    }
  }

  function handleSimulateScan() {
    setScanState('VERIFYING');
    setTimeout(() => {
      if (scannerSession?.sessionId) {
        checkInClassroom(scannerSession.sessionId);
      }
      setScanState('SUCCESS');
      setTimeout(() => {
        const checkedIn = scannerSession;
        setScannerSession(null);
        setScanState('SCANNING');
        if (checkedIn && openSurveyModal) {
          openSurveyModal(checkedIn, 'CLASSROOM_CSAT');
        }
      }, 1200);
    }, 900);
  }

  function handleExportIcs() {
    const calendarTitle = `MMLearn - Training Calendar (${roleDef.shortVi})`;
    generateIcsFile(filteredEvents, calendarTitle);
  }

  function handleOpenExtendModal(ev, e) {
    if (e) e.stopPropagation();
    setExtendingEvent(ev);
    const currDate = ev.date || today;
    setCustomExtensionDate(addDays(currDate, 7));
    setExtensionFeedback('');
  }

  function handleConfirmExtension(daysOffset = 0) {
    if (!extendingEvent || !extendingEvent.courseId) return;
    const baseDate = extendingEvent.date || today;
    const targetDate = daysOffset > 0 ? addDays(baseDate, daysOffset) : customExtensionDate;
    if (!targetDate) return;

    extendEnrollmentDueDate(extendingEvent.courseId, targetDate, currentUser);
    setExtensionFeedback(
      language === 'en'
        ? `Successfully extended course deadline to ${targetDate}!`
        : `Đã gia hạn thành công thời hạn khóa học đến ngày ${targetDate}!`
    );
    setTimeout(() => {
      setExtendingEvent(null);
      setExtensionFeedback('');
      if (detailModalEvent && detailModalEvent.courseId === extendingEvent.courseId) {
        setDetailModalEvent(null);
      }
    }, 1200);
  }

  const weeks = useMemo(() => getMonthGridWeeks(viewMonth), [viewMonth]);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const weekdayLabels = language === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className="cal-page-wrapper">
      {/* 1. TOP HEADER & METRICS */}
      <div className="cal-header-bar">
        <div className="cal-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="cal-main-title">
              <i className="ti ti-calendar-event" style={{ color: 'var(--bigc-green)', marginRight: 6 }} />
              {language === 'en' ? 'Learning & Operations Calendar' : 'Learning & Operations Training Calendar'}
            </h1>
            <Badge tone="rail" icon="ti-sparkles">
              {monthEventCount} {language === 'en' ? 'events this month' : 'events this month'}
            </Badge>
          </div>
          <p className="cal-sub-title">
            {language === 'en'
              ? 'Track your personal course milestones, workshop schedules, and operational team deadlines.'
              : 'Track your own course deadlines, the store practice schedule and the team training plan.'}
          </p>
        </div>

        <div className="cal-header-right">
          <Button variant="outline" size="sm" icon="ti-download" onClick={handleExportIcs}>
            {language === 'en' ? 'Export iCal (.ics)' : 'Export Calendar (.ics)'}
          </Button>
          <div className="cal-view-switchers">
            <button
              className={`cal-view-btn ${viewMode === 'MONTH' ? 'active' : ''}`}
              onClick={() => setViewMode('MONTH')}
              title={language === 'en' ? 'Month Grid View' : 'Month Grid'}
            >
              <i className="ti ti-layout-grid" />
              <span>{language === 'en' ? 'Month' : 'Month'}</span>
            </button>
            <button
              className={`cal-view-btn ${viewMode === 'WEEK' ? 'active' : ''}`}
              onClick={() => setViewMode('WEEK')}
              title={language === 'en' ? 'Week Timeline View' : 'Week Grid'}
            >
              <i className="ti ti-layout-columns" />
              <span>{language === 'en' ? 'Week' : 'Week'}</span>
            </button>
            <button
              className={`cal-view-btn ${viewMode === 'AGENDA' ? 'active' : ''}`}
              onClick={() => setViewMode('AGENDA')}
              title={language === 'en' ? 'Agenda List View' : 'Schedule'}
            >
              <i className="ti ti-list-details" />
              <span>{language === 'en' ? 'Agenda' : 'Schedule'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ROLE SCOPE TABS (If not plain learner) */}
      {!isLearnerOnly && (
        <div className="cal-scope-tabs">
          <button
            className={`cal-scope-tab ${scope === 'ALL' ? 'active' : ''}`}
            onClick={() => setScope('ALL')}
          >
            <i className="ti ti-calendar-stats" />
            <span>{language === 'en' ? 'All Events' : 'Full Calendar'}</span>
            <span className="cal-scope-count">{allEvents.length}</span>
          </button>
          <button
            className={`cal-scope-tab ${scope === 'PERSONAL' ? 'active' : ''}`}
            onClick={() => setScope('PERSONAL')}
          >
            <i className="ti ti-user" />
            <span>{language === 'en' ? 'Personal Learning' : 'Personal Learning Calendar'}</span>
            <span className="cal-scope-count">{personalEvents.length}</span>
          </button>
          <button
            className={`cal-scope-tab ${scope === 'OPERATIONAL' ? 'active' : ''}`}
            onClick={() => setScope('OPERATIONAL')}
          >
            <i className="ti ti-briefcase" />
            <span>{operationalScopeLabel}</span>
            <span className="cal-scope-count">{operationalEvents.length}</span>
          </button>
        </div>
      )}

      {/* 3. CONTROLS BAR: DATE NAVIGATOR + SEARCH + CATEGORY FILTERS */}
      <div className="cal-controls-bar">
        <div className="cal-nav-group">
          <button type="button" className="icon-btn" onClick={handlePrev} aria-label="Previous">
            <i className="ti ti-chevron-left" />
          </button>
          <div className="cal-current-label">
            {viewMode === 'WEEK'
              ? `${formatFullDateLabel(weekDays[0]?.date, language).split(',')[0]} - ${formatFullDateLabel(weekDays[6]?.date, language)}`
              : formatMonthLabel(viewMonth, language)}
          </div>
          <button type="button" className="icon-btn" onClick={handleNext} aria-label="Next">
            <i className="ti ti-chevron-right" />
          </button>
          <Button size="sm" variant="outline" onClick={handleToday}>
            {language === 'en' ? 'Today' : 'Today'}
          </Button>
        </div>

        <div className="cal-search-box">
          <i className="ti ti-search cal-search-icon" />
          <input
            type="text"
            className="cal-search-input"
            placeholder={language === 'en' ? 'Search course, trainer, venue...' : 'Search courses, trainers, practice workshops...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="cal-search-clear" onClick={() => setSearchQuery('')}>
              <i className="ti ti-x" />
            </button>
          )}
        </div>
      </div>

      {/* 3B. ORGANIZATION-WIDE MONTHLY METRIC BAR */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {[
          { label: 'Total Monthly Events', value: orgEvents.length, tone: 'slate' },
          { label: 'Mandatory', value: orgEvents.filter((e) => e.courseType === 'MANDATORY').length, tone: 'rust' },
          { label: 'Optional', value: orgEvents.filter((e) => e.courseType === 'OPTIONAL').length, tone: 'sage' },
          { label: 'Enrolled', value: orgEvents.filter((e) => e.isEnrolled).length, tone: 'blue' },
          { label: 'Action Required', value: orgEvents.filter((e) => !e.isEnrolled).length, tone: 'amber' },
        ].map((m) => (
          <div key={m.label} className="card card-pad" style={{ flex: '1 1 140px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: `var(--${m.tone})` }}>{m.value}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* 4. CATEGORY FILTER CHIPS ROW */}
      <div className="cal-filter-chips">
        {Object.values(EVENT_CATEGORIES).map((cat) => {
          const isActive = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              className={`cal-filter-chip ${isActive ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              <i className={`ti ${cat.icon}`} style={{ color: isActive ? 'inherit' : cat.color }} />
              <span>{language === 'en' ? cat.labelEn : cat.labelVi}</span>
            </button>
          );
        })}
      </div>

      {/* 4B. ORGANIZATION EVENT QUICK FILTER CHIPS */}
      <div className="cal-filter-chips">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'MANDATORY', label: '🔴 Mandatory' },
          { id: 'OPTIONAL', label: '🟢 Optional' },
          { id: 'ENROLLED', label: '✅ Enrolled' },
          { id: 'ACTION_REQUIRED', label: '⏳ Action Required' },
        ].map((chip) => {
          const isActive = orgFilter === chip.id;
          return (
            <button
              key={chip.id}
              className={`cal-filter-chip ${isActive ? 'active' : ''}`}
              onClick={() => setOrgFilter(chip.id)}
            >
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. MAIN CONTENT LAYOUT: 70% CALENDAR CANVAS | 30% RIGHT DETAIL PANEL */}
      <div className="cal-main-grid">
        {/* LEFT COLUMN: THE ACTIVE CALENDAR VIEW */}
        <div className="cal-canvas-card cal-grid-card">
          {/* VIEW A: MONTH VIEW */}
          {viewMode === 'MONTH' && (
            <div className="cal-month-view">
              <div className="cal-weekday-header">
                {weekdayLabels.map((wd, i) => (
                  <div key={wd} className={`cal-weekday-cell ${i === 0 || i === 6 ? 'weekend' : ''}`}>
                    {wd}
                  </div>
                ))}
              </div>

              <div className="cal-month-grid-body">
                {weeks.map((week, wIdx) => (
                  <div className="cal-week-row-seamless" key={wIdx}>
                    {week.map((cell) => {
                      const dayEvents = eventsByDate.get(cell.date) || [];
                      const dayOrgEvents = filteredOrgEventsByDate[cell.date] || [];

                      // Combine without duplicate course items
                      const map = new Map();
                      dayEvents.forEach((e) => map.set(e.courseId ? `course-${e.courseId}` : e.id, e));
                      dayOrgEvents.forEach((e) => {
                        const key = `course-${e.courseId}`;
                        if (!map.has(key)) map.set(key, e);
                      });
                      const allDayItems = Array.from(map.values());
                      const MAX_VISIBLE_PILLS = 3;
                      const visibleEvents = allDayItems.slice(0, MAX_VISIBLE_PILLS);
                      const overflowCount = allDayItems.length - visibleEvents.length;

                      const isToday = cell.date === today;
                      const isSelected = cell.date === selectedDate;

                      let cellCls = 'cal-seamless-cell';
                      if (!cell.inMonth) cellCls += ' other-month';
                      if (isToday) cellCls += ' is-today';
                      if (isSelected) cellCls += ' is-selected';
                      if (allDayItems.length > 0) cellCls += ' has-events';

                      return (
                        <div
                          key={cell.date}
                          className={cellCls}
                          onClick={() => handleSelectDate(cell.date)}
                          onMouseEnter={(e) => handleCellMouseEnter(cell.date, allDayItems, e.currentTarget)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          <div className="cal-cell-header">
                            <span className={`cal-day-number ${isToday ? 'today-pill' : ''}`}>
                              {Number(cell.date.slice(8, 10))}
                            </span>
                            {allDayItems.length > 0 && (
                              <span className="cal-day-density-dot" title={`${allDayItems.length} events`} />
                            )}
                          </div>

                          <div className="cal-cell-events-stack">
                            {visibleEvents.map((ev) => (
                              <div
                                key={ev.id}
                                className={`cal-event-pill tone-${ev.tone}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailModalEvent(ev);
                                }}
                                title={`${ev.title} (${ev.statusLabel || ev.time})`}
                              >
                                <i className={`ti ${ev.icon}`} />
                                <span className="cal-pill-text">{ev.title}</span>
                              </div>
                            ))}
                            {overflowCount > 0 && (
                              <button
                                type="button"
                                className="cal-overflow-badge"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectDate(cell.date);
                                  setDayEventsModalDate(cell.date);
                                  setDayEventsFilterQuery('');
                                }}
                                title={language === 'en' ? 'Click to view and scroll all courses on this day' : 'Nhấp để xem và cuộn toàn bộ khóa học trong ngày này'}
                              >
                                +{overflowCount} {language === 'en' ? 'more' : 'khóa khác'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW B: WEEK VIEW */}
          {viewMode === 'WEEK' && (
            <div className="cal-week-view">
              <div className="cal-week-columns-grid">
                {weekDays.map((d) => {
                  const isToday = d.date === today;
                  const isSelected = d.date === selectedDate;
                  const dayEvents = eventsByDate.get(d.date) || [];
                  const dayOrgEvents = filteredOrgEventsByDate[d.date] || [];
                  const map = new Map();
                  dayEvents.forEach((e) => map.set(e.courseId ? `course-${e.courseId}` : e.id, e));
                  dayOrgEvents.forEach((e) => {
                    const key = `course-${e.courseId}`;
                    if (!map.has(key)) map.set(key, e);
                  });
                  const allDayEvents = Array.from(map.values());

                  return (
                    <div
                      key={d.date}
                      className={`cal-week-col ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                      onClick={() => handleSelectDate(d.date)}
                    >
                      <div className="cal-week-col-header">
                        <span className="cal-week-col-name">{weekdayLabels[d.dayOfWeek]}</span>
                        <span className={`cal-week-col-num ${isToday ? 'today-pill' : ''}`}>
                          {d.dayNum}
                        </span>
                        <span className="cal-week-col-count">
                          {allDayEvents.length} {language === 'en' ? 'events' : 'events'}
                        </span>
                      </div>

                      <div className="cal-week-col-body">
                        {allDayEvents.length === 0 ? (
                          <div className="cal-week-empty-col">
                            <i className="ti ti-circle-dashed" />
                            <span>{language === 'en' ? 'No items' : 'No events'}</span>
                          </div>
                        ) : (
                          allDayEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className={`cal-week-event-card tone-${ev.tone}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailModalEvent(ev);
                              }}
                            >
                              <div className="cal-week-event-time">
                                <i className="ti ti-clock" /> {ev.time}
                              </div>
                              <div className="cal-week-event-title">{ev.title}</div>
                              <div className="cal-week-event-venue">
                                <i className="ti ti-map-pin" /> {ev.venue || 'MMLearn'}
                              </div>
                              <div className="cal-week-event-footer">
                                <Badge tone={ev.tone} size="sm">{ev.statusLabel}</Badge>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {ev.canExtend && (
                                    <button
                                      type="button"
                                      className="cal-btn-mini-action"
                                      style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}
                                      onClick={(e) => handleOpenExtendModal(ev, e)}
                                      title={language === 'en' ? 'Extend deadline' : 'Xin gia hạn'}
                                    >
                                      <i className="ti ti-calendar-plus" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="cal-btn-mini-action"
                                    onClick={(e) => handleEventAction(ev, e)}
                                  >
                                    {ev.actionLabel}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW C: AGENDA LIST VIEW */}
          {viewMode === 'AGENDA' && (
            <div className="cal-agenda-view">
              {filteredEvents.length === 0 ? (
                <div className="cal-agenda-empty">
                  <i className="ti ti-calendar-off" />
                  <h3>{language === 'en' ? 'No scheduled events found' : 'No events found'}</h3>
                  <p>{language === 'en' ? 'Try adjusting your filters or search keywords.' : 'Try a different category or clear the search term.'}</p>
                </div>
              ) : (
                <div className="cal-agenda-list">
                  {Array.from(eventsByDate.entries())
                    .sort(([d1], [d2]) => d1.localeCompare(d2))
                    .map(([dateKey, eventsList]) => (
                      <div key={dateKey} className="cal-agenda-group">
                        <div className="cal-agenda-group-header">
                          <div className="cal-agenda-date-badge">
                            <span className="cal-agenda-date-day">{dateKey.slice(8, 10)}</span>
                            <span className="cal-agenda-date-month">Thg {Number(dateKey.slice(5, 7))}</span>
                          </div>
                          <div className="cal-agenda-date-text">
                            <h4>{formatFullDateLabel(dateKey, language)}</h4>
                            <span className="cal-agenda-relative-tag">{formatRelativeDay(dateKey, language)}</span>
                          </div>
                        </div>

                        <div className="cal-agenda-items">
                          {eventsList.map((ev) => (
                            <div
                              key={ev.id}
                              className="cal-agenda-card"
                              onClick={() => setDetailModalEvent(ev)}
                            >
                              <div className={`cal-agenda-card-icon tone-${ev.tone}`}>
                                <i className={`ti ${ev.icon}`} />
                              </div>

                              <div className="cal-agenda-card-main">
                                <div className="cal-agenda-meta-row">
                                  <span className="cal-agenda-category">{ev.categoryLabel}</span>
                                  {ev.courseCode && <span className="cal-agenda-code">{ev.courseCode}</span>}
                                  <Badge tone={ev.tone} size="sm">{ev.statusLabel}</Badge>
                                </div>
                                <h3 className="cal-agenda-title">{ev.title}</h3>
                                <div className="cal-agenda-details">
                                  <span><i className="ti ti-clock" /> {ev.time}</span>
                                  <span><i className="ti ti-map-pin" /> {ev.venue}</span>
                                  <span><i className="ti ti-user-circle" /> {ev.instructor}</span>
                                </div>
                              </div>

                              <div className="cal-agenda-card-actions">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  tone={ev.tone === 'rust' ? 'danger' : 'primary'}
                                  onClick={(e) => handleEventAction(ev, e)}
                                >
                                  {ev.actionLabel}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SELECTED DAY DETAIL & ACTIONS PANEL (30% WIDTH) */}
        <div className="cal-side-panel-card">
          <div className="cal-panel-header">
            <div>
              <div className="cal-panel-relative-pill">{formatRelativeDay(selectedDate, language)}</div>
              <h2 className="cal-panel-date-title">{formatFullDateLabel(selectedDate, language)}</h2>
            </div>
            <span className="cal-panel-events-badge">
              {selectedEvents.length} {language === 'en' ? 'events' : 'events'}
            </span>
          </div>

          <div className="cal-panel-body">
            {selectedEvents.length === 0 ? (
              <div className="cal-panel-empty-box">
                <div className="cal-panel-empty-icon">
                  <i className="ti ti-calendar-heart" />
                </div>
                <div className="cal-panel-empty-title">
                  {language === 'en' ? 'No events on this day' : 'No sessions scheduled on this day'}
                </div>
                <p className="cal-panel-empty-desc">
                  {language === 'en'
                    ? 'You have no scheduled classes or pending deadlines.'
                    : 'You have no in-person sessions or deadlines on the selected day.'}
                </p>

                {/* UPCOMING EVENTS SUGGESTION PREVIEW */}
                <div className="cal-upcoming-preview-box">
                  <div className="cal-upcoming-preview-label">
                    <i className="ti ti-clock-forward" /> {language === 'en' ? 'Upcoming This Month' : 'Next Upcoming Sessions'}
                  </div>
                  <div className="cal-upcoming-preview-list">
                    {upcomingEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="cal-upcoming-mini-row"
                        onClick={() => handleSelectDate(ev.date)}
                      >
                        <div className="cal-upcoming-mini-date">
                          {ev.date.slice(8, 10)}/{ev.date.slice(5, 7)}
                        </div>
                        <div className="cal-upcoming-mini-info">
                          <div className="cal-upcoming-mini-title">{ev.title}</div>
                          <div className="cal-upcoming-mini-time">{ev.time}</div>
                        </div>
                        <i className="ti ti-chevron-right" style={{ color: 'var(--ink-faint)', fontSize: 13 }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="cal-panel-events-list">
                {selectedEvents.map((ev) => (
                  <div key={ev.id} className="cal-detail-event-card">
                    <div className="cal-detail-card-top">
                      <span className="cal-detail-badge-pill">
                        <i className={`ti ${ev.icon}`} /> {ev.categoryLabel}
                      </span>
                      <Badge tone={ev.tone} size="sm">{ev.statusLabel}</Badge>
                    </div>

                    <h3 className="cal-detail-card-title" onClick={() => setDetailModalEvent(ev)}>
                      {ev.title}
                    </h3>
                    <p className="cal-detail-card-subtitle">{ev.subtitle}</p>

                    <div className="cal-detail-card-meta">
                      <div className="cal-detail-meta-item">
                        <i className="ti ti-clock" />
                        <span><strong>{language === 'en' ? 'Time:' : 'Time:'}</strong> {ev.time}</span>
                      </div>
                      <div className="cal-detail-meta-item">
                        <i className="ti ti-map-pin" />
                        <span><strong>{language === 'en' ? 'Venue:' : 'Location:'}</strong> {ev.venue}</span>
                      </div>
                      <div className="cal-detail-meta-item">
                        <i className="ti ti-user" />
                        <span><strong>{language === 'en' ? 'Instructor:' : 'Trainer:'}</strong> {ev.instructor}</span>
                      </div>
                    </div>

                    <div className="cal-detail-card-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        tone={ev.tone === 'rust' ? 'danger' : 'primary'}
                        icon={ev.icon}
                        onClick={(e) => handleEventAction(ev, e)}
                        style={{ flex: 1 }}
                      >
                        {ev.actionLabel}
                      </Button>
                      {ev.canExtend && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon="ti-calendar-plus"
                          onClick={(e) => handleOpenExtendModal(ev, e)}
                          title={language === 'en' ? 'Extend course deadline' : 'Xin gia hạn thời gian hoàn thành khóa học'}
                        >
                          {language === 'en' ? 'Extend' : 'Gia hạn'}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        icon="ti-info-circle"
                        onClick={() => setDetailModalEvent(ev)}
                        title={language === 'en' ? 'View Details' : 'View Details'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cal-panel-footer">
            <button className="cal-sync-link-btn" onClick={handleExportIcs}>
              <i className="ti ti-calendar-plus" />
              <span>{language === 'en' ? 'Sync with Outlook / Google Calendar' : 'Sync To Google / Outlook Calendar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. HOVER TOOLTIP PORTAL */}
      {hoverCell && createPortal(
        <div
          className="cal-day-popover"
          style={{ top: hoverCell.top, left: hoverCell.left }}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
        >
          <div className="cal-popover-header">
            <strong>{formatFullDateLabel(hoverCell.date, language)}</strong>
            <span style={{ fontWeight: 700, color: 'var(--mm-blue)' }}>{hoverCell.events.length} {language === 'en' ? 'courses' : 'khóa học'}</span>
          </div>
          <div className="cal-popover-list">
            {hoverCell.events.map((ev) => (
              <div
                key={ev.id}
                className="cal-popover-row"
                onClick={() => {
                  setHoverCell(null);
                  setDetailModalEvent(ev);
                }}
              >
                <i className={`ti ${ev.icon}`} style={{ color: `var(--${ev.tone})`, fontSize: 14 }} />
                <div className="cal-popover-info">
                  <div className="cal-popover-title">{ev.title}</div>
                  <div className="cal-popover-time">{ev.statusLabel || ev.time}</div>
                </div>
                <Badge tone={ev.tone} size="sm">{ev.statusLabel}</Badge>
              </div>
            ))}
          </div>
          {hoverCell.events.length > 3 && (
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--line)', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ width: '100%', fontSize: 11, padding: '3px 8px' }}
                onClick={() => {
                  const d = hoverCell.date;
                  setHoverCell(null);
                  handleSelectDate(d);
                  setDayEventsModalDate(d);
                  setDayEventsFilterQuery('');
                }}
              >
                <i className="ti ti-arrows-maximize" style={{ marginRight: 4 }} />
                {language === 'en' ? 'View all in scrollable modal' : 'Xem & cuộn toàn bộ danh sách'}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* 7. EVENT DETAIL MODAL */}
      {detailModalEvent && (
        <Modal
          isOpen={true}
          onClose={() => setDetailModalEvent(null)}
          title={detailModalEvent.title}
          subtitle={
            detailModalEvent.scope === 'ORGANIZATION'
              ? (detailModalEvent.courseType === 'MANDATORY' ? 'Mandatory Course' : 'Optional Course')
              : `${detailModalEvent.categoryLabel} · ${detailModalEvent.venue}`
          }
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button variant="outline" onClick={() => setDetailModalEvent(null)}>
                {language === 'en' ? 'Close' : 'Close'}
              </Button>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button
                  variant="outline"
                  icon="ti-download"
                  onClick={() => generateIcsFile([detailModalEvent], detailModalEvent.title)}
                >
                  {language === 'en' ? 'Export Event (.ics)' : 'Export Event'}
                </Button>
                {detailModalEvent.canExtend && (
                  <Button
                    variant="outline"
                    icon="ti-calendar-plus"
                    onClick={() => handleOpenExtendModal(detailModalEvent)}
                  >
                    {language === 'en' ? 'Extend Deadline' : 'Xin gia hạn'}
                  </Button>
                )}
                {detailModalEvent.actionType !== 'ENROLL_COURSE' && (
                  <Button
                    variant="primary"
                    tone={detailModalEvent.tone === 'rust' ? 'danger' : 'primary'}
                    onClick={(e) => {
                      setDetailModalEvent(null);
                      handleEventAction(detailModalEvent, e);
                    }}
                  >
                    {detailModalEvent.actionLabel}
                  </Button>
                )}
                {detailModalEvent.scope === 'ORGANIZATION' && !detailModalEvent.isEnrolled && (
                  <Button
                    variant="primary"
                    icon="ti-circle-check"
                    onClick={() => {
                      enrollCourse(detailModalEvent.courseId, currentUser);
                      setDetailModalEvent(null);
                    }}
                  >
                    {language === 'en' ? 'Enroll Now' : 'Enroll Now'}
                  </Button>
                )}
                {detailModalEvent.scope === 'ORGANIZATION' && hasCapability(role, 'canAllocateCourses') && (
                  <Button
                    variant="outline"
                    icon="ti-users"
                    onClick={() => {
                      const found = courses.find((c) => c.id === detailModalEvent.courseId);
                      setAssigningCourse(
                        found || {
                          id: detailModalEvent.courseId,
                          title: detailModalEvent.title,
                          code: detailModalEvent.courseCode,
                        }
                      );
                    }}
                  >
                    {language === 'en' ? 'Assign to Team' : 'Gán cho nhân viên'}
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge tone={detailModalEvent.tone} icon={detailModalEvent.icon}>
                {detailModalEvent.statusLabel || (detailModalEvent.isEnrolled ? 'Enrolled' : 'Action Required')}
              </Badge>
              <Badge tone="slate" icon="ti-barcode">{detailModalEvent.courseCode || detailModalEvent.id}</Badge>
              <Badge tone="blue" icon="ti-calendar-event">{detailModalEvent.date}</Badge>
              {detailModalEvent.time && (
                <Badge tone="amber" icon="ti-clock">{detailModalEvent.time}</Badge>
              )}
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {language === 'en' ? 'Venue / Platform' : 'Location / Classroom'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>
                  <i className="ti ti-map-pin" style={{ color: 'var(--bigc-green)', marginRight: 4 }} />
                  {detailModalEvent.venue}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {language === 'en' ? 'Instructor / Organizer' : 'Trainer / Organizer'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>
                  <i className="ti ti-user-check" style={{ color: 'var(--mm-blue)', marginRight: 4 }} />
                  {detailModalEvent.instructor}
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700 }}>
                {language === 'en' ? 'Course & Session Overview' : 'Training Program Content'}
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                {detailModalEvent.subtitle || 'A program that standardizes operational competency against the MM Mega Market 7-Level Framework.'}
              </p>
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: 'var(--blue-soft)', border: '1px solid #BFDBFE', fontSize: 13, color: 'var(--blue-soft-text)' }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
              <strong>{language === 'en' ? 'Attendance Requirement:' : 'Attendance requirement:'}</strong> Please arrive on time and scan the QR code or sign in to your MMLearn account so your attendance is recorded officially.
            </div>
          </div>
        </Modal>
      )}

      {/* 8. QR SCANNER SIMULATION MODAL (Learner Check-in) */}
      {scannerSession && (
        <Modal
          isOpen={true}
          onClose={() => setScannerSession(null)}
          title={language === 'en' ? 'Live QR Check-in' : 'Scan The Live QR Attendance Code'}
          subtitle={scannerSession.title}
          size="md"
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div className="scanner-viewfinder" style={{ width: 240, height: 240, margin: '0 auto 16px', position: 'relative', background: '#000', borderRadius: 16, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {scanState === 'SCANNING' && (
                <>
                  <div className="scanner-laser" />
                  <div style={{ color: '#fff', fontSize: 13, zIndex: 2 }}>
                    <i className="ti ti-camera" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                    {language === 'en' ? 'Point camera at classroom QR' : 'Point your camera at the QR code on the projector'}
                  </div>
                </>
              )}
              {scanState === 'VERIFYING' && (
                <div style={{ color: '#fff', fontSize: 14 }}>
                  <i className="ti ti-loader animate-spin" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                  {language === 'en' ? 'Verifying attendance...' : 'Verifying attendance...'}
                </div>
              )}
              {scanState === 'SUCCESS' && (
                <div style={{ color: 'var(--sage)', fontSize: 14, fontWeight: 700 }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 48, display: 'block', marginBottom: 8 }} />
                  {language === 'en' ? 'Checked-in Successfully!' : 'Attendance Recorded!'}
                </div>
              )}
            </div>

            <Button
              variant="primary"
              tone="success"
              icon="ti-qrcode"
              disabled={scanState !== 'SCANNING'}
              onClick={handleSimulateScan}
            >
              {language === 'en' ? 'Simulate Camera QR Scan' : 'QR Scan Simulation'}
            </Button>
          </div>
        </Modal>
      )}

      {/* 9. LIVE QR PROJECTION MODAL (Trainer / Admin) */}
      {liveQrSession && (
        <Modal
          isOpen={true}
          onClose={() => setLiveQrSession(null)}
          title={language === 'en' ? 'Project Live QR Code' : 'Show The Live QR Attendance Code'}
          subtitle={`${liveQrSession.title} · ${liveQrSession.venue}`}
          size="md"
        >
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 200, height: 200, margin: '0 auto 16px', background: 'var(--paper-raised)', padding: 12, borderRadius: 12, border: '2px solid var(--bigc-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <rect width="100" height="100" fill="#fff" />
                <path d="M10 10 h30 v30 h-30 z M15 15 v20 h20 v-20 z M20 20 h10 v10 h-10 z" fill="#007A38" />
                <path d="M60 10 h30 v30 h-30 z M65 15 v20 h20 v-20 z M70 20 h10 v10 h-10 z" fill="#007A38" />
                <path d="M10 60 h30 v30 h-30 z M15 65 v20 h20 v-20 z M20 70 h10 v10 h-10 z" fill="#007A38" />
                <rect x="50" y="50" width="10" height="10" fill="#111827" />
                <rect x="70" y="60" width="15" height="10" fill="#111827" />
                <rect x="55" y="75" width="25" height="10" fill="#111827" />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>
              {liveQrSession.qrToken || 'MMVN-LIVE-QR-2026'}
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 16px' }}>
              {language === 'en'
                ? 'Display this QR code on the classroom projector for learners to check in.'
                : 'Project this QR code in the classroom so learners can scan to check in.'}
            </p>
            <Button variant="outline" icon="ti-copy" onClick={() => alert('Attendance code copied!')}>
              {language === 'en' ? 'Copy QR Token' : 'Copy The Attendance Code'}
            </Button>
          </div>
        </Modal>
      )}

      {/* 10. EXTEND DEADLINE MODAL */}
      {extendingEvent && (
        <Modal
          isOpen={true}
          onClose={() => { setExtendingEvent(null); setExtensionFeedback(''); }}
          title={language === 'en' ? 'Extend Course Deadline' : 'Gia Hạn Thời Gian Hoàn Thành Khóa Học'}
          subtitle={`${extendingEvent.title} · Mã: ${extendingEvent.courseCode || extendingEvent.courseId || extendingEvent.id}`}
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
              <Button
                variant="outline"
                onClick={() => { setExtendingEvent(null); setExtensionFeedback(''); }}
              >
                {language === 'en' ? 'Cancel' : 'Hủy bỏ'}
              </Button>
              <Button
                variant="primary"
                tone="primary"
                icon="ti-check"
                disabled={!customExtensionDate}
                onClick={() => handleConfirmExtension(0)}
              >
                {language === 'en' ? 'Confirm Extension' : 'Xác nhận gia hạn'}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {extensionFeedback ? (
              <div style={{ padding: 14, borderRadius: 8, background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
                <i className="ti ti-circle-check" style={{ fontSize: 20 }} />
                <span>{extensionFeedback}</span>
              </div>
            ) : (
              <>
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--paper-sunken)', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {language === 'en' ? 'Current Course & Status' : 'Khóa học & Trạng thái hiện tại'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginTop: 4 }}>
                    {extendingEvent.title}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    <Badge tone={extendingEvent.tone} icon={extendingEvent.icon}>{extendingEvent.statusLabel}</Badge>
                    <Badge tone="slate" icon="ti-calendar">{language === 'en' ? 'Current Deadline:' : 'Hạn hiện tại:'} {extendingEvent.date}</Badge>
                    {extendingEvent.progress !== undefined && extendingEvent.progress > 0 && (
                      <Badge tone="blue" icon="ti-progress">{language === 'en' ? `Progress: ${extendingEvent.progress}%` : `Tiến độ: ${extendingEvent.progress}%`}</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'block' }}>
                    {language === 'en' ? 'Quick Extension Presets:' : 'Chọn nhanh thời gian gia hạn:'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="ti-calendar-plus"
                      onClick={() => handleConfirmExtension(7)}
                    >
                      +7 {language === 'en' ? 'Days (1 Wk)' : 'Ngày (1 Tuần)'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="ti-calendar-plus"
                      onClick={() => handleConfirmExtension(14)}
                    >
                      +14 {language === 'en' ? 'Days (2 Wks)' : 'Ngày (2 Tuần)'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="ti-calendar-plus"
                      onClick={() => handleConfirmExtension(30)}
                    >
                      +30 {language === 'en' ? 'Days (1 Mo)' : 'Ngày (1 Tháng)'}
                    </Button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, display: 'block' }}>
                    {language === 'en' ? 'Or Select Custom Target Deadline Date:' : 'Hoặc chọn ngày hết hạn mới:'}
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)' }}
                    value={customExtensionDate}
                    min={today}
                    onChange={(e) => setCustomExtensionDate(e.target.value)}
                  />
                </div>

                <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5, background: 'var(--blue-soft)', padding: 10, borderRadius: 6, border: '1px solid #BFDBFE' }}>
                  <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
                  {language === 'en'
                    ? 'Extending the course will update your learning deadline, clear any overdue status, and automatically shift the calendar schedule.'
                    : 'Gia hạn thời hạn khóa học sẽ cập nhật trực tiếp tiến độ học tập, xóa bỏ trạng thái quá hạn nếu ngày mới ở tương lai và tự động dời lịch trên Calendar của bạn.'}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* 11. ASSIGN TO TEAM / AUDIENCE MODAL */}
      {assigningCourse && (
        <Modal
          isOpen={true}
          onClose={() => { setAssigningCourse(null); setAssignFeedback(''); }}
          title={language === 'en' ? 'Assign Course to Team / Audience' : 'Phân Bổ Khóa Học Cho Nhân Viên / Đội Ngũ'}
          subtitle={`${assigningCourse.title} · Mã: ${assigningCourse.code || assigningCourse.courseCode || assigningCourse.id}`}
          size="lg"
        >
          {assignFeedback ? (
            <div style={{ padding: 16, borderRadius: 8, background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 22 }} />
              <span>{assignFeedback}</span>
            </div>
          ) : (
            <MultiTargetAssigner
              course={assigningCourse}
              onSave={({ assignmentType, targets, dueDate, justification, groupPolicy, assignedLevelEligibility }) => {
                const toAdd = (targets || []).map((t) => ({
                  assignmentType,
                  targetId: t.targetId,
                  targetLabel: t.targetLabel,
                  dueDate: dueDate || '',
                  justification: justification || '',
                  groupPolicy: groupPolicy || 'ELIGIBLE_ONLY',
                  assignedLevelEligibility,
                }));
                assignCourse(assigningCourse.id, toAdd);
                setAssignFeedback(
                  language === 'en'
                    ? `Course successfully assigned to ${targets.length} target audiences!`
                    : `Đã phân bổ khóa học thành công cho ${targets.length} đối tượng / nhân viên!`
                );
                setTimeout(() => {
                  setAssigningCourse(null);
                  setAssignFeedback('');
                  setDetailModalEvent(null);
                }, 1400);
              }}
              onCancel={() => setAssigningCourse(null)}
              initialAssignType={role === 'manager' ? 'DEPARTMENT' : 'DIVISION'}
              saveButtonLabel={language === 'en' ? 'Confirm Assignment' : 'Xác Nhận Phân Bổ'}
            />
          )}
        </Modal>
      )}

      {/* 12. FULL DAY COURSES / EVENTS MODAL */}
      {dayEventsModalDate && (
        <Modal
          isOpen={true}
          onClose={() => { setDayEventsModalDate(null); setDayEventsFilterQuery(''); }}
          title={
            language === 'en'
              ? `Courses & Schedules — ${formatFullDateLabel(dayEventsModalDate, language)}`
              : `Toàn Bộ Khóa Học & Lịch Trình — ${formatFullDateLabel(dayEventsModalDate, language)}`
          }
          subtitle={
            language === 'en'
              ? `${dayModalEvents.length} scheduled sessions / courses on this day`
              : `Tổng cộng ${dayModalEvents.length} khóa học và lịch đào tạo trong ngày này`
          }
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="outline" onClick={() => { setDayEventsModalDate(null); setDayEventsFilterQuery(''); }}>
                {language === 'en' ? 'Close' : 'Đóng'}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="cal-search-box" style={{ maxWidth: '100%' }}>
              <i className="ti ti-search cal-search-icon" />
              <input
                type="text"
                className="cal-search-input"
                placeholder={language === 'en' ? 'Search courses on this day...' : 'Tìm kiếm nhanh khóa học trong ngày này...'}
                value={dayEventsFilterQuery}
                onChange={(e) => setDayEventsFilterQuery(e.target.value)}
              />
              {dayEventsFilterQuery && (
                <button className="cal-search-clear" onClick={() => setDayEventsFilterQuery('')}>
                  <i className="ti ti-x" />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '55vh', overflowY: 'auto', paddingRight: 6 }}>
              {dayModalEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--ink-faint)' }}>
                  <i className="ti ti-search" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
                  {language === 'en' ? 'No matching courses found.' : 'Không tìm thấy khóa học phù hợp.'}
                </div>
              ) : (
                dayModalEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="cal-day-modal-card"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="cal-detail-badge-pill" style={{ fontSize: 11 }}>
                          <i className={`ti ${ev.icon}`} /> {ev.categoryLabel || (ev.courseType === 'MANDATORY' ? (language === 'en' ? 'Mandatory' : 'Bắt buộc') : (language === 'en' ? 'Optional' : 'Tự chọn'))}
                        </span>
                        {ev.courseCode && <Badge tone="slate" size="sm">{ev.courseCode}</Badge>}
                        <Badge tone={ev.tone} size="sm">{ev.statusLabel}</Badge>
                      </div>
                      {ev.time && (
                        <div style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ti ti-clock" />
                          <span>{ev.time}</span>
                        </div>
                      )}
                    </div>

                    <div
                      style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', cursor: 'pointer', lineHeight: 1.4 }}
                      onClick={() => setDetailModalEvent(ev)}
                    >
                      {ev.title}
                    </div>
                    {ev.subtitle && (
                      <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>{ev.subtitle}</div>
                    )}

                    {ev.progress !== undefined && ev.progress > 0 && (
                      <div style={{ marginTop: 2 }}>
                        <ProgressBar value={ev.progress} max={100} size="sm" tone={ev.tone === 'sage' ? 'success' : 'primary'} />
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                        {ev.isEnrolled ? (
                          <span style={{ color: 'var(--sage)', fontWeight: 600 }}>
                            <i className="ti ti-check" style={{ marginRight: 4 }} />
                            {language === 'en' ? 'Enrolled in course' : 'Đã ghi danh'}
                          </span>
                        ) : (
                          <span>{language === 'en' ? 'Open for enrollment' : 'Sẵn sàng tham gia'}</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {ev.canExtend && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon="ti-calendar-plus"
                            onClick={() => handleOpenExtendModal(ev)}
                          >
                            {language === 'en' ? 'Extend' : 'Xin gia hạn'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          icon="ti-info-circle"
                          onClick={() => setDetailModalEvent(ev)}
                        >
                          {language === 'en' ? 'Details' : 'Chi tiết'}
                        </Button>
                        {ev.scope === 'ORGANIZATION' && !ev.isEnrolled ? (
                          <Button
                            variant="primary"
                            size="sm"
                            icon="ti-circle-check"
                            onClick={() => {
                              enrollCourse(ev.courseId, currentUser);
                            }}
                          >
                            {language === 'en' ? 'Enroll Now' : 'Ghi danh ngay'}
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            tone={ev.tone === 'rust' ? 'danger' : 'primary'}
                            onClick={(e) => handleEventAction(ev, e)}
                          >
                            {ev.actionLabel}
                          </Button>
                        )}
                        {ev.scope === 'ORGANIZATION' && hasCapability(role, 'canAllocateCourses') && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon="ti-users"
                            onClick={() => {
                              const found = courses.find((c) => c.id === ev.courseId);
                              setAssigningCourse(
                                found || {
                                  id: ev.courseId,
                                  title: ev.title,
                                  code: ev.courseCode,
                                }
                              );
                            }}
                          >
                            {language === 'en' ? 'Assign' : 'Gán'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
