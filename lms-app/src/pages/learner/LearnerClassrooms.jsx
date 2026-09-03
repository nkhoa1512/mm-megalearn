import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, Modal, ProgressBar } from '../../features/common/ui';
import {
  deriveAttendanceWindows,
  generateQrToken,
  isQrTokenValid,
  currentBucket,
  sessionQrSecret,
} from '../../utils/qrAttendance';

export default function LearnerClassrooms() {
  const navigate = useNavigate();
  const { classrooms = [], checkInClassroom, enrollClassroom, currentUser, openSurveyModal } = useCourseStore();

  // Quick Filter Pills (Top)
  const [quickFilter, setQuickFilter] = useState('ALL'); // ALL, MY_SESSIONS, UPCOMING, STORE, WEBINAR, CHECKED_IN

  // Search & Detailed Filters
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState('NONE'); // NONE, MODALITY, STATUS, VENUE, TRAINER
  const [viewMode, setViewMode] = useState('GRID'); // GRID, TABLE
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  const [modalityFilter, setModalityFilter] = useState('ALL'); // ALL, OFFLINE_STORE, ONLINE_WEBINAR
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, OPEN, ENROLLED, CHECKED_IN, COMPLETED
  const [venueFilter, setVenueFilter] = useState('ALL');
  const [trainerFilter, setTrainerFilter] = useState('ALL');

  // Scanner Modal state (Simulated Camera Viewfinder)
  const [scanningSession, setScanningSession] = useState(null);
  const [scanPhase, setScanPhase] = useState('CHECKIN'); // 'CHECKIN' | 'CHECKOUT'
  const [scanState, setScanState] = useState('SCANNING'); // SCANNING, VERIFYING, SUCCESS
  const [scanError, setScanError] = useState('');

  // Syllabus & Materials Modal state
  const [viewingMaterialsSession, setViewingMaterialsSession] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Extract unique venues & trainers for filter dropdowns
  const venueList = useMemo(() => {
    const set = new Set();
    classrooms.forEach((c) => { if (c.venue) set.add(c.venue); });
    return Array.from(set);
  }, [classrooms]);

  const trainerList = useMemo(() => {
    const set = new Set();
    classrooms.forEach((c) => { if (c.trainerName) set.add(c.trainerName); });
    return Array.from(set);
  }, [classrooms]);

  // Compute active filters count (excluding quickFilter pill and search)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (modalityFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (venueFilter !== 'ALL') count++;
    if (trainerFilter !== 'ALL') count++;
    return count;
  }, [modalityFilter, statusFilter, venueFilter, trainerFilter]);

  // Main filter logic
  const filteredSessions = useMemo(() => {
    return classrooms.filter((s) => {
      // 1. Quick filter pill
      if (quickFilter === 'UPCOMING' && !(s.status === 'UPCOMING' || s.status === 'OPEN')) return false;
      if (quickFilter === 'MY_SESSIONS' && !s.isEnrolled) return false;
      if (quickFilter === 'STORE' && s.modality !== 'OFFLINE_STORE') return false;
      if (quickFilter === 'WEBINAR' && s.modality !== 'ONLINE_WEBINAR') return false;
      if (quickFilter === 'CHECKED_IN' && s.attendanceStatus !== 'CHECKED_IN') return false;

      // 2. Dropdown panel filters
      if (modalityFilter !== 'ALL' && s.modality !== modalityFilter) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ENROLLED' && !s.isEnrolled) return false;
        if (statusFilter === 'CHECKED_IN' && s.attendanceStatus !== 'CHECKED_IN') return false;
        if (statusFilter === 'OPEN' && !(s.status === 'OPEN' || s.status === 'UPCOMING')) return false;
        if (statusFilter === 'COMPLETED' && s.status !== 'COMPLETED') return false;
      }
      if (venueFilter !== 'ALL' && s.venue !== venueFilter) return false;
      if (trainerFilter !== 'ALL' && s.trainerName !== trainerFilter) return false;

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const titleMatch = s.title?.toLowerCase().includes(q);
        const codeMatch = s.code?.toLowerCase().includes(q);
        const trainerMatch = s.trainerName?.toLowerCase().includes(q);
        const venueMatch = s.venue?.toLowerCase().includes(q);
        const descMatch = s.description?.toLowerCase().includes(q);
        if (!titleMatch && !codeMatch && !trainerMatch && !venueMatch && !descMatch) return false;
      }

      return true;
    });
  }, [classrooms, quickFilter, modalityFilter, statusFilter, venueFilter, trainerFilter, search]);

  // Grouped sessions
  const groupedSessions = useMemo(() => {
    if (groupBy === 'NONE') return { 'All Classes': filteredSessions };
    const groups = {};

    filteredSessions.forEach((s) => {
      let key = 'Other';
      if (groupBy === 'MODALITY') {
        key = s.modality === 'OFFLINE_STORE' ? '🏪 Hands-On At The Store Workshop' : '💻 Online Webinar (Teams Webinar)';
      } else if (groupBy === 'STATUS') {
        if (s.attendanceStatus === 'CHECKED_IN') key = '✅ Attendance Recorded';
        else if (s.isEnrolled) key = '⏳ Awaiting In-Class QR Scan';
        else if (s.status === 'COMPLETED') key = '🏁 Finished';
        else key = '🟢 Open For Registration';
      } else if (groupBy === 'VENUE') {
        key = s.venue || 'Venue not yet decided';
      } else if (groupBy === 'TRAINER') {
        key = `👨‍🏫 ${s.trainerName || 'Not assigned'}`;
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    return groups;
  }, [filteredSessions, groupBy]);

  function toggleGroup(key) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleResetAllFilters() {
    setSearch('');
    setQuickFilter('ALL');
    setModalityFilter('ALL');
    setStatusFilter('ALL');
    setVenueFilter('ALL');
    setTrainerFilter('ALL');
    setGroupBy('NONE');
  }

  function handleOpenScanner(session, phase = 'CHECKIN') {
    setScanningSession(session);
    setScanPhase(phase);
    setScanState('SCANNING');
    setScanError('');
  }

  function handleOpenSurvey(session) {
    openSurveyModal(session, 'CLASSROOM_CSAT');
  }

  function handleSimulateScan() {
    setScanError('');
    setScanState('VERIFYING');
    setTimeout(() => {
      if (scanPhase === 'CHECKIN') {
        if (scanningSession) {
          checkInClassroom(scanningSession.id);
        }
        setScanState('SUCCESS');
        setTimeout(() => {
          setScanningSession(null);
          setScanState('SCANNING');
        }, 1500);
      } else {
        // CHECKOUT: do not mutate attendance yet — the survey submit is what finalizes it
        setScanState('SUCCESS');
        setTimeout(() => {
          const sessionToSurvey = scanningSession;
          setScanningSession(null);
          setScanState('SCANNING');
          if (sessionToSurvey) {
            openSurveyModal(sessionToSurvey, 'CLASSROOM_CSAT');
          }
        }, 1500);
      }
    }, 1000);
  }

  function handleSimulateExpiredScan() {
    if (!scanningSession) return;
    const staleBucket = currentBucket() - 5;
    const staleToken = generateQrToken(scanningSession.id, sessionQrSecret(scanningSession), scanPhase, staleBucket);
    const isValid = isQrTokenValid(staleToken, scanningSession.id, sessionQrSecret(scanningSession), scanPhase);
    if (!isValid) {
      setScanError('This QR code has expired. Please scan the live screen currently being projected.');
    }
  }

  // Helper render for single session card in Grid
  function renderSessionCard(session) {
    const isFull = session.enrolledCount >= session.maxCapacity;
    const isCheckedOut = session.attendanceStatus === 'CHECKED_OUT';
    const isCheckedIn = session.attendanceStatus === 'CHECKED_IN';
    const isPendingCheckin = session.isEnrolled && (session.attendanceStatus === 'PENDING_CHECKIN' || (!isCheckedIn && !isCheckedOut));
    const windows = deriveAttendanceWindows(session);
    const now = Date.now();
    const inCheckInWindow = !windows || (new Date(windows.checkIn.start).getTime() <= now && now <= new Date(windows.checkIn.end).getTime());
    const inCheckOutWindow = !windows || (new Date(windows.checkOut.start).getTime() <= now && now <= new Date(windows.checkOut.end).getTime());

    return (
      <div key={session.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20 }}>
        <div>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge tone={session.modality === 'OFFLINE_STORE' ? 'amber' : 'blue'} icon={session.modality === 'OFFLINE_STORE' ? 'ti-building-store' : 'ti-video'}>
                {session.modality === 'OFFLINE_STORE' ? 'Workshop Practice' : 'Teams Webinar'}
              </Badge>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{session.code}</span>
            </div>

            {isCheckedOut ? (
              <Badge tone="sage" icon="ti-certificate">Completed · Certificate Unlocked</Badge>
            ) : isCheckedIn ? (
              <Badge tone="sage" icon="ti-circle-check">Attendance Recorded</Badge>
            ) : session.isEnrolled ? (
              <Badge tone="amber" icon="ti-clock">Awaiting In-Class QR Scan</Badge>
            ) : (
              <Badge tone={session.status === 'COMPLETED' ? 'slate' : 'rail'}>
                {session.status === 'COMPLETED' ? 'Finished' : 'Open For Registration'}
              </Badge>
            )}
          </div>

          {/* Title & Description */}
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>{session.title}</div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 14 }}>
            {session.description}
          </p>

          {/* Session Meta Specs */}
          <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <i className="ti ti-calendar-event" style={{ color: 'var(--blue)', fontSize: 16 }} />
              <span style={{ fontWeight: 700 }}>{session.date}</span> &middot; <span style={{ color: 'var(--ink-soft)' }}>{session.time}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <i className="ti ti-map-pin" style={{ color: 'var(--rust)', fontSize: 16 }} />
              <span style={{ color: 'var(--ink-soft)' }}>{session.venue}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <i className="ti ti-user-check" style={{ color: 'var(--sage)', fontSize: 16 }} />
              <span>Teaching trainer: <strong>{session.trainerName}</strong> ({session.trainerTitle})</span>
            </div>
          </div>

          {/* Capacity Progress */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>
              <span>Class size: <strong>{session.enrolledCount}/{session.maxCapacity} Learner</strong></span>
              <span>{isFull ? 'The class is full' : `${session.maxCapacity - session.enrolledCount} seats left`}</span>
            </div>
            <ProgressBar value={Math.round((session.enrolledCount / session.maxCapacity) * 100)} tone={isFull ? 'rust' : 'rail'} size="sm" />
          </div>
        </div>

        {/* Card Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
            <i className="ti ti-award" style={{ marginRight: 4, color: 'var(--sage)' }} />
            Attendance certificate &amp; training record entry
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* PRE-CLASS MATERIALS & SYLLABUS BUTTON */}
            <Button
              variant="outline"
              size="sm"
              icon="ti-file-description"
              onClick={() => setViewingMaterialsSession(session)}
            >
              Syllabus &amp; Slides
            </Button>

            {/* CASE 1: Learner completed and checked out -> View Certificate */}
            {isCheckedOut && (
              <Button
                variant="outline"
                size="sm"
                icon="ti-certificate"
                onClick={() => navigate('/learner/certificates')}
              >
                View Certificate
              </Button>
            )}

            {/* CASE 2: Learner has checked in -> Can scan Check-out QR & trigger CSAT */}
            {isCheckedIn && (
              <Button
                variant="primary"
                size="sm"
                icon="ti-camera"
                disabled={!inCheckOutWindow}
                title={!inCheckOutWindow ? 'Check-out window is not active' : 'Scan check-out QR to complete class and survey'}
                onClick={() => handleOpenScanner(session, 'CHECKOUT')}
              >
                📷 Scan Check-out QR &amp; Survey
              </Button>
            )}

            {/* CASE 3: Learner is enrolled and needs to scan Check-in QR */}
            {isPendingCheckin && session.status !== 'COMPLETED' && (
              <Button
                variant="primary"
                size="sm"
                icon="ti-camera"
                disabled={!inCheckInWindow}
                title={!inCheckInWindow ? 'Check-in window is not active' : 'Scan check-in QR'}
                onClick={() => handleOpenScanner(session, 'CHECKIN')}
              >
                📷 Scan Check-in QR
              </Button>
            )}

            {/* CASE 4: Learner not enrolled yet */}
            {!session.isEnrolled && session.status !== 'COMPLETED' && (
              <Button
                variant="primary"
                size="sm"
                icon="ti-plus"
                disabled={isFull}
                onClick={() => enrollClassroom(session.id)}
              >
                {isFull ? 'Class Full' : 'Register To Attend'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Helper render for Table view
  function renderSessionTable(sessionsList) {
    return (
      <div className="card" style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--line)', marginBottom: 16 }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--paper-sunken)' }}>
              <th style={{ width: 100 }}>Class Code</th>
              <th>Training Session &amp; Content</th>
              <th style={{ width: 140 }}>Format</th>
              <th style={{ width: 160 }}>Venue / Store</th>
              <th style={{ width: 140 }}>Time</th>
              <th style={{ width: 150 }}>Trainer</th>
              <th style={{ width: 120 }}>Class Size</th>
              <th style={{ width: 130 }}>Status</th>
              <th style={{ textAlign: 'right', width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessionsList.map((s) => {
              const isFull = s.enrolledCount >= s.maxCapacity;
              const isCheckedOut = s.attendanceStatus === 'CHECKED_OUT';
              const isCheckedIn = s.attendanceStatus === 'CHECKED_IN';
              const isPendingCheckin = s.isEnrolled && (s.attendanceStatus === 'PENDING_CHECKIN' || (!isCheckedIn && !isCheckedOut));
              const windows = deriveAttendanceWindows(s);
              const now = Date.now();
              const inCheckInWindow = !windows || (new Date(windows.checkIn.start).getTime() <= now && now <= new Date(windows.checkIn.end).getTime());
              const inCheckOutWindow = !windows || (new Date(windows.checkOut.start).getTime() <= now && now <= new Date(windows.checkOut.end).getTime());

              return (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>
                    {s.code}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {s.description}
                    </div>
                  </td>
                  <td>
                    <Badge tone={s.modality === 'OFFLINE_STORE' ? 'amber' : 'blue'} size="sm" icon={s.modality === 'OFFLINE_STORE' ? 'ti-building-store' : 'ti-video'}>
                      {s.modality === 'OFFLINE_STORE' ? 'Store Workshop' : 'Webinar'}
                    </Badge>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ink)' }}>
                    <i className="ti ti-map-pin" style={{ color: 'var(--rust)', marginRight: 4 }} />
                    {s.venue}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 600 }}>{s.date}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{s.time}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <strong>{s.trainerName}</strong>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{s.trainerTitle}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{s.enrolledCount}/{s.maxCapacity}</div>
                    <ProgressBar value={Math.round((s.enrolledCount / s.maxCapacity) * 100)} tone={isFull ? 'rust' : 'rail'} size="sm" />
                  </td>
                  <td>
                    {isCheckedOut ? (
                      <Badge tone="sage" size="sm" icon="ti-certificate">Completed · Certificate Unlocked</Badge>
                    ) : isCheckedIn ? (
                      <Badge tone="sage" size="sm" icon="ti-circle-check">Attendance Recorded</Badge>
                    ) : s.isEnrolled ? (
                      <Badge tone="amber" size="sm" icon="ti-clock">Registered</Badge>
                    ) : (
                      <Badge tone={s.status === 'COMPLETED' ? 'slate' : 'rail'} size="sm">
                        {s.status === 'COMPLETED' ? 'Finished' : 'Open For Registration'}
                      </Badge>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Button variant="ghost" size="sm" icon="ti-file-description" title="Syllabus & Slides" onClick={() => setViewingMaterialsSession(s)}>
                        Slide
                      </Button>
                      {isCheckedOut && (
                        <Button variant="outline" size="sm" icon="ti-certificate" onClick={() => navigate('/learner/certificates')}>
                          Certificate
                        </Button>
                      )}
                      {isCheckedIn && (
                        <Button variant="primary" size="sm" icon="ti-camera" disabled={!inCheckOutWindow} onClick={() => handleOpenScanner(s, 'CHECKOUT')}>
                          Check-out QR
                        </Button>
                      )}
                      {isPendingCheckin && s.status !== 'COMPLETED' && (
                        <Button variant="primary" size="sm" icon="ti-camera" disabled={!inCheckInWindow} onClick={() => handleOpenScanner(s, 'CHECKIN')}>
                          Check-in QR
                        </Button>
                      )}
                      {!s.isEnrolled && s.status !== 'COMPLETED' && (
                        <Button variant="primary" size="sm" icon="ti-plus" disabled={isFull} onClick={() => enrollClassroom(s.id)}>
                          Register
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>In-Person Classes &amp; QR Attendance Scanning (ILT Workshops)</h1>
            <Badge tone="blue" icon="ti-chalkboard">In-Person Training At The Store</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Hands-on classes in the bakery workshop, the store fire drill ground and online webinars, delivered by a dedicated trainer.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" icon="ti-camera" onClick={() => handleOpenScanner(classrooms[0])}>
            📷 Open The Camera To Scan The Trainer QR
          </Button>
        </div>
      </div>

      {/* STANDARDIZED FILTER TOOLBAR CARD */}
      <div className="card card-pad" style={{ marginBottom: 20, background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
        {/* ROW 0: QUICK FILTER PILLS */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
          {[
            { id: 'ALL', label: 'All Training Sessions', count: classrooms.length },
            { id: 'MY_SESSIONS', label: 'Classes Assigned / Registered', count: classrooms.filter(s => s.isEnrolled).length },
            { id: 'UPCOMING', label: 'Upcoming Classes', count: classrooms.filter(s => s.status === 'UPCOMING' || s.status === 'OPEN').length },
            { id: 'STORE', label: 'Store Workshop Practice', count: classrooms.filter(s => s.modality === 'OFFLINE_STORE').length },
            { id: 'WEBINAR', label: 'Online Webinar', count: classrooms.filter(s => s.modality === 'ONLINE_WEBINAR').length },
            { id: 'CHECKED_IN', label: 'Attendance Recorded', count: classrooms.filter(s => s.attendanceStatus === 'CHECKED_IN').length },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setQuickFilter(f.id)}
              className={`btn btn-sm ${quickFilter === f.id ? 'btn-primary' : 'btn-outline'}`}
              style={{
                borderRadius: 20,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderColor: quickFilter === f.id ? 'var(--blue)' : 'var(--line)',
                background: quickFilter === f.id ? 'var(--blue)' : 'transparent',
                color: quickFilter === f.id ? '#fff' : 'var(--ink)',
                fontWeight: quickFilter === f.id ? 700 : 500,
              }}
            >
              {f.label}
              <span style={{
                background: quickFilter === f.id ? 'rgba(255,255,255,0.3)' : 'var(--paper-sunken)',
                color: quickFilter === f.id ? '#fff' : 'var(--ink-soft)',
                padding: '1px 6px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
              }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* ROW 1: SEARCH, GROUP BY, FILTER TOGGLE, VIEW MODE */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search input */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
              placeholder="Search by class name, class code, trainer, lab, store..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Group By Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Group by:</span>
              <select
                value={groupBy}
                onChange={(e) => { setGroupBy(e.target.value); setCollapsedGroups(new Set()); }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: groupBy !== 'NONE' ? 700 : 500,
                  color: groupBy !== 'NONE' ? 'var(--blue, #005BAA)' : 'var(--ink)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="NONE">No grouping</option>
                <option value="MODALITY">By Delivery Format</option>
                <option value="STATUS">By Class Status</option>
                <option value="VENUE">By Venue / Store</option>
                <option value="TRAINER">By Teaching Trainer</option>
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-sm ${activeFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
              style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
            >
              <i className="ti ti-filter" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span style={{ background: 'var(--paper-raised)', color: 'var(--rail, #005BAA)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                  {activeFiltersCount}
                </span>
              )}
              <i className={`ti ${showFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
            </button>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`btn btn-sm ${viewMode === 'TABLE' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                title="List View"
              >
                <i className="ti ti-list" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`btn btn-sm ${viewMode === 'GRID' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                title="Grid View"
              >
                <i className="ti ti-layout-grid" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: COLLAPSIBLE FILTER PANEL WITH TOP LABELS */}
        {showFilters && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {/* Dropdown 1: Modality */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  DELIVERY FORMAT
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: modalityFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: modalityFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: modalityFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: modalityFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={modalityFilter}
                  onChange={(e) => setModalityFilter(e.target.value)}
                >
                  <option value="ALL">All types</option>
                  <option value="OFFLINE_STORE">🏪 Hands-on at the store workshop (Store Lab)</option>
                  <option value="ONLINE_WEBINAR">💻 Online Teams Webinar</option>
                </select>
              </div>

              {/* Dropdown 2: Status */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  SESSION STATUS
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: statusFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: statusFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: statusFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: statusFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All statuses</option>
                  <option value="ENROLLED">⏳ Registered / Assigned</option>
                  <option value="CHECKED_IN">✅ Attendance recorded successfully</option>
                  <option value="OPEN">🟢 Open For Registration / Upcoming</option>
                  <option value="COMPLETED">🏁 Completed / Finished</option>
                </select>
              </div>

              {/* Dropdown 3: Venue */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  VENUE / STORE
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: venueFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: venueFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: venueFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: venueFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={venueFilter}
                  onChange={(e) => setVenueFilter(e.target.value)}
                >
                  <option value="ALL">All venues</option>
                  {venueList.map((ven) => (
                    <option key={ven} value={ven}>{ven}</option>
                  ))}
                </select>
              </div>

              {/* Dropdown 4: Trainer */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  TEACHING TRAINER
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 12,
                    borderRadius: 6,
                    background: trainerFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: trainerFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                    color: trainerFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: trainerFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={trainerFilter}
                  onChange={(e) => setTrainerFilter(e.target.value)}
                >
                  <option value="ALL">All trainers</option>
                  {trainerList.map((tr) => (
                    <option key={tr} value={tr}>{tr}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ROW 3: ACTIVE FILTER TAGS & RESET SUMMARY */}
        {(search || quickFilter !== 'ALL' || modalityFilter !== 'ALL' || statusFilter !== 'ALL' || venueFilter !== 'ALL' || trainerFilter !== 'ALL' || groupBy !== 'NONE') && (
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Filtering by:</span>
              {search && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Search term: <strong>"{search}"</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                </span>
              )}
              {quickFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Quick range: <strong>{quickFilter === 'MY_SESSIONS' ? 'My classes' : quickFilter === 'UPCOMING' ? 'Upcoming' : quickFilter === 'STORE' ? 'Store workshop' : quickFilter === 'WEBINAR' ? 'Webinar' : 'Attendance recorded'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setQuickFilter('ALL')} />
                </span>
              )}
              {modalityFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Format: <strong>{modalityFilter === 'OFFLINE_STORE' ? 'Store Workshop' : 'Webinar'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setModalityFilter('ALL')} />
                </span>
              )}
              {statusFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Status: <strong>{statusFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
                </span>
              )}
              {venueFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Location: <strong>{venueFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setVenueFilter('ALL')} />
                </span>
              )}
              {trainerFilter !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Trainer: <strong>{trainerFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setTrainerFilter('ALL')} />
                </span>
              )}
              {groupBy !== 'NONE' && (
                <span className="badge" style={{ background: '#F3E8FF', color: '#6B21A8', border: '1px solid #DDD6FE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Group by: <strong>{groupBy}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setGroupBy('NONE')} />
                </span>
              )}
              <button
                type="button"
                onClick={handleResetAllFilters}
                style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
              >
                Clear all filters
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Found <strong>{filteredSessions.length}</strong> / {classrooms.length} training sessions
            </div>
          </div>
        )}
      </div>

      {/* SESSIONS CONTENT: GROUPED / UNGROUPED - GRID / TABLE */}
      {filteredSessions.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px 16px', textAlign: 'center' }}>
          <i className="ti ti-chalkboard-off" style={{ fontSize: 36, color: 'var(--ink-faint)', display: 'block', marginBottom: 10 }} />
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>
            No matching training session found
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 450, margin: '0 auto 16px' }}>
            No in-person class or webinar matches your current search and filters.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetAllFilters}>
            Clear All Filters
          </Button>
        </div>
      ) : groupBy === 'NONE' ? (
        viewMode === 'GRID' ? (
          <div className="grid grid-2" style={{ gap: 16 }}>
            {filteredSessions.map((session) => renderSessionCard(session))}
          </div>
        ) : (
          renderSessionTable(filteredSessions)
        )
      ) : (
        /* ACCORDION GROUPS */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(groupedSessions).map(([groupTitle, list]) => {
            const isCollapsed = collapsedGroups.has(groupTitle);
            return (
              <div key={groupTitle} className="card" style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                <div
                  onClick={() => toggleGroup(groupTitle)}
                  style={{
                    padding: '12px 18px',
                    background: 'var(--paper-sunken)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ fontSize: 14, color: 'var(--ink-soft)' }} />
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{groupTitle}</span>
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue)', fontWeight: 700, fontSize: 11 }}>
                      {list.length} training sessions
                    </span>
                  </div>
                </div>

                {!isCollapsed && (
                  <div style={{ padding: 16 }}>
                    {viewMode === 'GRID' ? (
                      <div className="grid grid-2" style={{ gap: 16 }}>
                        {list.map((session) => renderSessionCard(session))}
                      </div>
                    ) : (
                      renderSessionTable(list)
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: SIMULATED MOBILE CAMERA QR SCANNER */}
      {scanningSession && (
        <Modal
          isOpen={Boolean(scanningSession)}
          onClose={() => setScanningSession(null)}
          title={scanPhase === 'CHECKIN' ? 'Scan Check-in QR Code (Class Start)' : 'Scan Check-out QR Code (Class End)'}
          size="sm"
        >
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
              {scanningSession.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Trainer: <strong>{scanningSession.trainerName}</strong> &middot; {scanningSession.venue}
            </div>

            {/* Camera Viewfinder Box */}
            <div style={{
              position: 'relative',
              width: 240,
              height: 240,
              margin: '0 auto 16px',
              borderRadius: 16,
              background: '#0B0F19',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              border: scanError ? '3px solid var(--rust)' : '3px solid var(--blue)',
            }}>
              {scanError ? (
                <div style={{ color: '#EF4444', padding: '16px', textAlign: 'center' }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: 56, marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Scan Failed</div>
                  <div style={{ fontSize: 12, color: '#F87171', marginTop: 6, lineHeight: 1.4 }}>{scanError}</div>
                </div>
              ) : scanState === 'SUCCESS' ? (
                <div style={{ color: '#10B981', animation: 'scaleUp 0.3s ease' }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 72 }} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginTop: 8 }}>
                    {scanPhase === 'CHECKIN' ? 'CHECK-IN RECORDED!' : 'CHECK-OUT RECORDED!'}
                  </div>
                  <div style={{ fontSize: 12, color: '#10B981' }}>
                    {scanPhase === 'CHECKIN' ? 'Attendance Confirmed' : 'Proceeding to Training Survey...'}
                  </div>
                </div>
              ) : scanState === 'VERIFYING' ? (
                <div style={{ color: '#fff' }}>
                  <i className="ti ti-loader" style={{ fontSize: 48, animation: 'spin 1s linear infinite' }} />
                  <div style={{ fontSize: 13, marginTop: 10 }}>Verifying live rotating token...</div>
                </div>
              ) : (
                <>
                  {/* Viewfinder Target Frame */}
                  <div style={{
                    width: 170,
                    height: 170,
                    border: '2px dashed #60A5FA',
                    borderRadius: 12,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <i className="ti ti-qrcode" style={{ fontSize: 80, color: 'rgba(255,255,255,0.2)' }} />
                    {/* Laser Scanner Line */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: '50%',
                      height: 2,
                      background: '#EF4444',
                      boxShadow: '0 0 10px #EF4444',
                    }} />
                  </div>
                  <div style={{ color: 'var(--ink-faint)', fontSize: 11, marginTop: 10, padding: '0 10px' }}>
                    Point your camera at the 30s rotating QR code on the trainer's screen
                  </div>
                </>
              )}
            </div>

            <p style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45, margin: '0 0 16px' }}>
              Learner <strong>{currentUser?.fullName}</strong> ({currentUser?.employeeCode}) is scanning the {scanPhase === 'CHECKIN' ? 'check-in' : 'check-out'} code for class <strong>{scanningSession.code}</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="ghost" onClick={() => setScanningSession(null)}>Close The Camera</Button>
              <Button
                variant="primary"
                icon="ti-scan"
                disabled={scanState !== 'SCANNING'}
                onClick={handleSimulateScan}
              >
                {scanState === 'SCANNING'
                  ? (scanPhase === 'CHECKIN' ? 'Tap To Scan Check-in QR' : 'Tap To Scan Check-out QR')
                  : scanState === 'VERIFYING' ? 'Processing...' : 'Recorded!'}
              </Button>
              <Button
                variant="outline"
                icon="ti-alert-circle"
                disabled={scanState !== 'SCANNING'}
                onClick={handleSimulateExpiredScan}
                title="Simulate scanning an expired/outdated QR token"
              >
                Simulate an Expired Scan
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: SESSION SYLLABUS & PRE-CLASS MATERIALS */}
      {viewingMaterialsSession && (
        <Modal
          isOpen={Boolean(viewingMaterialsSession)}
          onClose={() => { setViewingMaterialsSession(null); setPreviewDoc(null); }}
          title={`Syllabus & Materials — ${viewingMaterialsSession.title}`}
          subtitle={`Class code: ${viewingMaterialsSession.code} · Trainer: ${viewingMaterialsSession.trainerName}`}
          size="lg"
        >
          <div>
            {/* Section 1: Syllabus Agenda */}
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--blue)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-list-check" /> Session Agenda
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {(viewingMaterialsSession.syllabus || []).length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', padding: 8 }}>
                  The trainer is still updating the syllabus.
                </div>
              ) : (
                viewingMaterialsSession.syllabus.map((step, idx) => (
                  <div key={idx} style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--line)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: 'var(--blue)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                        {idx + 1}
                      </span>
                      {step.step}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, marginLeft: 28 }}>
                      {step.detail}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Section 2: Attachments */}
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--bigc-green, #007A38)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-paperclip" /> Attached Materials &amp; Slides (Class Attachments)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {(viewingMaterialsSession.materials || []).length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', padding: 8 }}>
                  No material or slide is attached to this class yet.
                </div>
              ) : (
                viewingMaterialsSession.materials.map((mat, idx) => (
                  <div key={idx} style={{ background: 'var(--paper-raised)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className={`ti ${mat.type === 'PDF' ? 'ti-file-type-pdf' : 'ti-file-type-ppt'}`} style={{ fontSize: 22, color: mat.type === 'PDF' ? 'var(--rust)' : 'var(--amber)' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{mat.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{mat.size} &middot; Updated by {viewingMaterialsSession.trainerName}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setPreviewDoc(mat)}>
                        Preview
                      </Button>
                      <Button size="sm" variant="ghost" icon="ti-download" onClick={() => alert(`Loading material: ${mat.title}`)}>
                        Download
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Document Preview Area */}
            {previewDoc && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Viewing: {previewDoc.title}</span>
                  <Button size="sm" variant="ghost" icon="ti-x" onClick={() => setPreviewDoc(null)}>Close the preview</Button>
                </div>
                <div style={{ height: 260, background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ink-soft)' }}>
                  <i className="ti ti-file-text" style={{ fontSize: 40, color: 'var(--blue)' }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Slide / Syllabus PDF Preview</div>
                  <div style={{ fontSize: 12 }}>Page 1 / 18 &middot; MM Mega Market internal standard material</div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
