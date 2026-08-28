import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, MonthCalendarGrid } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { buildCalendarEvents } from '../../utils/calendarEvents';
import { firstOfMonth, todayDateString } from '../../utils/calendarDate';

export default function LearnerCalendar({ basePath = '/my-learning' }) {
  const navigate = useNavigate();
  const { courses, myEnrollments, classrooms, language } = useCourseStore();
  const today = todayDateString();
  const [viewMonth, setViewMonth] = useState(() => firstOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);

  const eventsByDate = useMemo(
    () => buildCalendarEvents({ courses, myEnrollments, classrooms }),
    [courses, myEnrollments, classrooms]
  );

  const monthEventCount = useMemo(() => {
    let count = 0;
    for (const [date, events] of eventsByDate) {
      if (date.slice(0, 7) === viewMonth.slice(0, 7)) count += events.length;
    }
    return count;
  }, [eventsByDate, viewMonth]);

  function handleMonthChange(nextMonth) {
    setViewMonth(nextMonth);
    if (selectedDate.slice(0, 7) !== nextMonth.slice(0, 7)) {
      setSelectedDate(nextMonth);
    }
  }

  function handleEventClick(event) {
    if (event.kind === 'DEADLINE') {
      navigate(`${basePath}/${event.courseId}`);
    } else {
      navigate('/learner/classrooms');
    }
  }

  const selectedEvents = eventsByDate.get(selectedDate) || [];

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1>Lịch Học Tập</h1>
          <Badge tone="rail" icon="ti-calendar-event">{monthEventCount} sự kiện tháng này</Badge>
        </div>
        <p style={{ margin: 0 }}>Theo dõi hạn hoàn thành khóa học và các buổi học trực tiếp bạn đã đăng ký.</p>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'flex-start' }}>
        <MonthCalendarGrid
          viewMonth={viewMonth}
          selectedDate={selectedDate}
          eventsByDate={eventsByDate}
          onSelectDate={setSelectedDate}
          onMonthChange={handleMonthChange}
          language={language}
        />

        <div className="card card-pad">
          <div className="section-label" style={{ margin: '0 0 10px' }}>{selectedDate}</div>
          {selectedEvents.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-calendar-off" aria-hidden="true" />
              <p>Không có khóa học nào vào ngày này.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedEvents.map((event) => (
                <div key={event.id} className="cal-day-panel-row" onClick={() => handleEventClick(event)}>
                  <i className={`ti ${event.kind === 'LIVE_SESSION' ? 'ti-chalkboard' : 'ti-book-2'}`} aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{event.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{event.subtitle}</div>
                  </div>
                  <Badge tone={event.tone}>{event.statusLabel}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
