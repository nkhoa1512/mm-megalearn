import React, { useState, useMemo } from 'react';
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
import { buildCalendarEvents, EVENT_CATEGORIES } from '../../utils/calendarEvents';
import { Badge, Button, Modal, ProgressBar } from '../common/ui';
import { normalizeRole, roleDefinition } from '../../data/roles';

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
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Tooltips
  const [hoverCell, setHoverCell] = useState(null); // { date, top, left, events }
  const [detailModalEvent, setDetailModalEvent] = useState(null);
  const [scannerSession, setScannerSession] = useState(null);
  const [scanState, setScanState] = useState('SCANNING'); // SCANNING | VERIFYING | SUCCESS
  const [liveQrSession, setLiveQrSession] = useState(null);

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

  // Operational tab label based on role
  const operationalScopeLabel = useMemo(() => {
    switch (role) {
      case 'manager': return language === 'en' ? 'Team Schedule' : 'Lịch Đào Tạo Đội Ngũ';
      case 'trainer': return language === 'en' ? 'Teaching & Lab Ops' : 'Lịch Giảng Dạy & Phòng Lab';
      case 'hrbp': return language === 'en' ? 'Regional & Succession' : 'Lịch Vùng & Kế Nhiệm';
      case 'useradmin': return language === 'en' ? 'Enterprise Ops' : 'Tổng Lịch Đào Tạo Toàn Công Ty';
      case 'sysadmin': return language === 'en' ? 'System Ops & Audit' : 'Lịch Vận Hành IT & Audit';
      default: return language === 'en' ? 'Operations' : 'Lịch Vận Hành';
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

  // Selected date events
  const selectedEvents = useMemo(() => {
    return eventsByDate.get(selectedDate) || [];
  }, [eventsByDate, selectedDate]);

  // Month event count
  const monthEventCount = useMemo(() => {
    const monthPrefix = viewMonth.slice(0, 7);
    return filteredEvents.filter((ev) => (ev.date || '').startsWith(monthPrefix)).length;
  }, [filteredEvents, viewMonth]);

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
    const calendarTitle = `MM MegaLearn - Lịch Đào Tạo (${roleDef.shortVi})`;
    generateIcsFile(filteredEvents, calendarTitle);
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
              {language === 'en' ? 'Learning & Operations Calendar' : 'Lịch Học Tập & Đào Tạo Vận Hành'}
            </h1>
            <Badge tone="rail" icon="ti-sparkles">
              {monthEventCount} {language === 'en' ? 'events this month' : 'sự kiện trong tháng'}
            </Badge>
          </div>
          <p className="cal-sub-title">
            {language === 'en'
              ? 'Track your personal course milestones, workshop schedules, and operational team deadlines.'
              : 'Theo dõi hạn hoàn thành khóa học cá nhân, lịch thực hành siêu thị và kế hoạch đào tạo đội ngũ.'}
          </p>
        </div>

        <div className="cal-header-right">
          <Button variant="outline" size="sm" icon="ti-download" onClick={handleExportIcs}>
            {language === 'en' ? 'Export iCal (.ics)' : 'Xuất Lịch (.ics)'}
          </Button>
          <div className="cal-view-switchers">
            <button
              className={`cal-view-btn ${viewMode === 'MONTH' ? 'active' : ''}`}
              onClick={() => setViewMode('MONTH')}
              title={language === 'en' ? 'Month Grid View' : 'Lưới Tháng'}
            >
              <i className="ti ti-layout-grid" />
              <span>{language === 'en' ? 'Month' : 'Tháng'}</span>
            </button>
            <button
              className={`cal-view-btn ${viewMode === 'WEEK' ? 'active' : ''}`}
              onClick={() => setViewMode('WEEK')}
              title={language === 'en' ? 'Week Timeline View' : 'Lưới Tuần'}
            >
              <i className="ti ti-layout-columns" />
              <span>{language === 'en' ? 'Week' : 'Tuần'}</span>
            </button>
            <button
              className={`cal-view-btn ${viewMode === 'AGENDA' ? 'active' : ''}`}
              onClick={() => setViewMode('AGENDA')}
              title={language === 'en' ? 'Agenda List View' : 'Lịch Trình'}
            >
              <i className="ti ti-list-details" />
              <span>{language === 'en' ? 'Agenda' : 'Lịch Trình'}</span>
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
            <span>{language === 'en' ? 'All Events' : 'Toàn Bộ Lịch'}</span>
            <span className="cal-scope-count">{allEvents.length}</span>
          </button>
          <button
            className={`cal-scope-tab ${scope === 'PERSONAL' ? 'active' : ''}`}
            onClick={() => setScope('PERSONAL')}
          >
            <i className="ti ti-user" />
            <span>{language === 'en' ? 'Personal Learning' : 'Lịch Học Cá Nhân'}</span>
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
            {language === 'en' ? 'Today' : 'Hôm Nay'}
          </Button>
        </div>

        <div className="cal-search-box">
          <i className="ti ti-search cal-search-icon" />
          <input
            type="text"
            className="cal-search-input"
            placeholder={language === 'en' ? 'Search course, trainer, venue...' : 'Tìm khóa học, giảng viên, xưởng thực hành...'}
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
                      const visibleEvents = dayEvents.slice(0, 2);
                      const overflowCount = dayEvents.length - visibleEvents.length;
                      const isToday = cell.date === today;
                      const isSelected = cell.date === selectedDate;

                      let cellCls = 'cal-seamless-cell';
                      if (!cell.inMonth) cellCls += ' other-month';
                      if (isToday) cellCls += ' is-today';
                      if (isSelected) cellCls += ' is-selected';
                      if (dayEvents.length > 0) cellCls += ' has-events';

                      return (
                        <div
                          key={cell.date}
                          className={cellCls}
                          onClick={() => handleSelectDate(cell.date)}
                          onMouseEnter={(e) => {
                            if (dayEvents.length > 0) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoverCell({
                                date: cell.date,
                                top: rect.bottom + 6,
                                left: Math.min(rect.left, window.innerWidth - 300),
                                events: dayEvents,
                              });
                            }
                          }}
                          onMouseLeave={() => setHoverCell(null)}
                        >
                          <div className="cal-cell-header">
                            <span className={`cal-day-number ${isToday ? 'today-pill' : ''}`}>
                              {Number(cell.date.slice(8, 10))}
                            </span>
                            {dayEvents.length > 0 && (
                              <span className="cal-day-density-dot" title={`${dayEvents.length} sự kiện`} />
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
                                title={`${ev.title} (${ev.time})`}
                              >
                                <i className={`ti ${ev.icon}`} />
                                <span className="cal-pill-text">{ev.title}</span>
                              </div>
                            ))}
                            {overflowCount > 0 && (
                              <div className="cal-overflow-badge">
                                +{overflowCount} {language === 'en' ? 'more' : 'khác'}
                              </div>
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
                          {dayEvents.length} {language === 'en' ? 'events' : 'sự kiện'}
                        </span>
                      </div>

                      <div className="cal-week-col-body">
                        {dayEvents.length === 0 ? (
                          <div className="cal-week-empty-col">
                            <i className="ti ti-circle-dashed" />
                            <span>{language === 'en' ? 'No items' : 'Trống'}</span>
                          </div>
                        ) : (
                          dayEvents.map((ev) => (
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
                                <i className="ti ti-map-pin" /> {ev.venue}
                              </div>
                              <div className="cal-week-event-footer">
                                <Badge tone={ev.tone} size="sm">{ev.statusLabel}</Badge>
                                <button
                                  className="cal-btn-mini-action"
                                  onClick={(e) => handleEventAction(ev, e)}
                                >
                                  {ev.actionLabel}
                                </button>
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
                  <h3>{language === 'en' ? 'No scheduled events found' : 'Không tìm thấy sự kiện nào'}</h3>
                  <p>{language === 'en' ? 'Try adjusting your filters or search keywords.' : 'Hãy thử chọn danh mục khác hoặc xóa từ khóa tìm kiếm.'}</p>
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
              {selectedEvents.length} {language === 'en' ? 'events' : 'sự kiện'}
            </span>
          </div>

          <div className="cal-panel-body">
            {selectedEvents.length === 0 ? (
              <div className="cal-panel-empty-box">
                <div className="cal-panel-empty-icon">
                  <i className="ti ti-calendar-heart" />
                </div>
                <div className="cal-panel-empty-title">
                  {language === 'en' ? 'No events on this day' : 'Không có lịch học vào ngày này'}
                </div>
                <p className="cal-panel-empty-desc">
                  {language === 'en'
                    ? 'You have no scheduled classes or pending deadlines.'
                    : 'Bạn không có buổi học trực tiếp hoặc hạn chót nào trong ngày đã chọn.'}
                </p>

                {/* UPCOMING EVENTS SUGGESTION PREVIEW */}
                <div className="cal-upcoming-preview-box">
                  <div className="cal-upcoming-preview-label">
                    <i className="ti ti-clock-forward" /> {language === 'en' ? 'Upcoming This Month' : 'Lịch Sắp Diễn Ra Gần Nhất'}
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
                        <span><strong>{language === 'en' ? 'Time:' : 'Thời gian:'}</strong> {ev.time}</span>
                      </div>
                      <div className="cal-detail-meta-item">
                        <i className="ti ti-map-pin" />
                        <span><strong>{language === 'en' ? 'Venue:' : 'Địa điểm:'}</strong> {ev.venue}</span>
                      </div>
                      <div className="cal-detail-meta-item">
                        <i className="ti ti-user" />
                        <span><strong>{language === 'en' ? 'Instructor:' : 'Giảng viên:'}</strong> {ev.instructor}</span>
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
                      <Button
                        variant="outline"
                        size="sm"
                        icon="ti-info-circle"
                        onClick={() => setDetailModalEvent(ev)}
                        title={language === 'en' ? 'View Details' : 'Xem Chi Tiết'}
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
              <span>{language === 'en' ? 'Sync with Outlook / Google Calendar' : 'Đồng Bộ Vào Lịch Google / Outlook'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. HOVER TOOLTIP PORTAL */}
      {hoverCell && createPortal(
        <div
          className="cal-day-popover"
          style={{ top: hoverCell.top, left: hoverCell.left }}
        >
          <div className="cal-popover-header">
            <strong>{formatFullDateLabel(hoverCell.date, language)}</strong>
            <span>{hoverCell.events.length} {language === 'en' ? 'events' : 'sự kiện'}</span>
          </div>
          <div className="cal-popover-list">
            {hoverCell.events.map((ev) => (
              <div key={ev.id} className="cal-popover-row">
                <i className={`ti ${ev.icon}`} style={{ color: `var(--${ev.tone})` }} />
                <div className="cal-popover-info">
                  <div className="cal-popover-title">{ev.title}</div>
                  <div className="cal-popover-time">{ev.time}</div>
                </div>
                <Badge tone={ev.tone} size="sm">{ev.statusLabel}</Badge>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* 7. EVENT DETAIL MODAL */}
      {detailModalEvent && (
        <Modal
          isOpen={true}
          onClose={() => setDetailModalEvent(null)}
          title={detailModalEvent.title}
          subtitle={`${detailModalEvent.categoryLabel} · ${detailModalEvent.venue}`}
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button variant="outline" onClick={() => setDetailModalEvent(null)}>
                {language === 'en' ? 'Close' : 'Đóng'}
              </Button>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button
                  variant="outline"
                  icon="ti-download"
                  onClick={() => generateIcsFile([detailModalEvent], detailModalEvent.title)}
                >
                  {language === 'en' ? 'Export Event (.ics)' : 'Xuất Sự Kiện'}
                </Button>
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
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge tone={detailModalEvent.tone} icon={detailModalEvent.icon}>
                {detailModalEvent.statusLabel}
              </Badge>
              <Badge tone="slate" icon="ti-barcode">{detailModalEvent.courseCode || detailModalEvent.id}</Badge>
              <Badge tone="blue" icon="ti-calendar-event">{detailModalEvent.date}</Badge>
              <Badge tone="amber" icon="ti-clock">{detailModalEvent.time}</Badge>
            </div>

            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {language === 'en' ? 'Venue / Platform' : 'Địa Điểm / Phòng Học'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', marginTop: 2 }}>
                  <i className="ti ti-map-pin" style={{ color: 'var(--bigc-green)', marginRight: 4 }} />
                  {detailModalEvent.venue}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {language === 'en' ? 'Instructor / Organizer' : 'Giảng Viên / Ban Tổ Chức'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', marginTop: 2 }}>
                  <i className="ti ti-user-check" style={{ color: 'var(--mm-blue)', marginRight: 4 }} />
                  {detailModalEvent.instructor}
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700 }}>
                {language === 'en' ? 'Course & Session Overview' : 'Nội Dung Chương Trình Đào Tạo'}
              </h4>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                {detailModalEvent.subtitle || 'Chương trình chuẩn hóa năng lực nghiệp vụ theo Khung 7 Cấp Bậc MM Mega Market.'}
              </p>
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 13, color: '#1E3A8A' }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
              <strong>{language === 'en' ? 'Attendance Requirement:' : 'Yêu cầu tham gia:'}</strong> Vui lòng có mặt đúng giờ và quét mã QR hoặc đăng nhập tài khoản MM MegaLearn để ghi nhận điểm danh chính thức.
            </div>
          </div>
        </Modal>
      )}

      {/* 8. QR SCANNER SIMULATION MODAL (Learner Check-in) */}
      {scannerSession && (
        <Modal
          isOpen={true}
          onClose={() => setScannerSession(null)}
          title={language === 'en' ? 'Live QR Check-in' : 'Quét Mã Live QR Điểm Danh'}
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
                    {language === 'en' ? 'Point camera at classroom QR' : 'Hướng camera vào mã QR trên máy chiếu'}
                  </div>
                </>
              )}
              {scanState === 'VERIFYING' && (
                <div style={{ color: '#fff', fontSize: 14 }}>
                  <i className="ti ti-loader animate-spin" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                  {language === 'en' ? 'Verifying attendance...' : 'Đang xác thực điểm danh...'}
                </div>
              )}
              {scanState === 'SUCCESS' && (
                <div style={{ color: 'var(--sage)', fontSize: 14, fontWeight: 700 }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 48, display: 'block', marginBottom: 8 }} />
                  {language === 'en' ? 'Checked-in Successfully!' : 'Điểm Danh Thành Công!'}
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
              {language === 'en' ? 'Simulate Camera QR Scan' : 'Mô Phỏng Quét Mã QR'}
            </Button>
          </div>
        </Modal>
      )}

      {/* 9. LIVE QR PROJECTION MODAL (Trainer / Admin) */}
      {liveQrSession && (
        <Modal
          isOpen={true}
          onClose={() => setLiveQrSession(null)}
          title={language === 'en' ? 'Project Live QR Code' : 'Chiếu Mã Live QR Điểm Danh'}
          subtitle={`${liveQrSession.title} · ${liveQrSession.venue}`}
          size="md"
        >
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 200, height: 200, margin: '0 auto 16px', background: '#fff', padding: 12, borderRadius: 12, border: '2px solid var(--bigc-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                : 'Chiếu mã QR này lên máy chiếu lớp học để học viên quét điểm danh.'}
            </p>
            <Button variant="outline" icon="ti-copy" onClick={() => alert('Đã sao chép mã điểm danh!')}>
              {language === 'en' ? 'Copy QR Token' : 'Sao Chép Mã Điểm Danh'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
