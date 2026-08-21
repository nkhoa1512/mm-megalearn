import React, { useState } from 'react';
import { useCourseStore } from '../../state/CourseStore';
import { Badge, Button, Modal, ProgressBar, QRCodeView } from '../../components/ui';

export default function LearnerClassrooms() {
  const { classrooms, checkInClassroom, enrollClassroom } = useCourseStore();
  const [filter, setFilter] = useState('ALL');
  const [selectedSessionForQR, setSelectedSessionForQR] = useState(null);
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  const filteredSessions = classrooms.filter((s) => {
    if (filter === 'UPCOMING') return s.status === 'UPCOMING' || s.status === 'OPEN';
    if (filter === 'MY_SESSIONS') return s.isEnrolled;
    if (filter === 'STORE') return s.modality === 'OFFLINE_STORE';
    if (filter === 'WEBINAR') return s.modality === 'ONLINE_WEBINAR';
    return true;
  });

  function handleTriggerCheckIn(session) {
    setSelectedSessionForQR(session);
    setCheckInSuccess(false);
  }

  function handlePerformCheckIn() {
    if (selectedSessionForQR) {
      checkInClassroom(selectedSessionForQR.id);
      setCheckInSuccess(true);
      setTimeout(() => {
        setSelectedSessionForQR(null);
        setCheckInSuccess(false);
      }, 1400);
    }
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Instructor-Led Training &amp; QR Attendance</h1>
            <Badge tone="blue" icon="ti-chalkboard">ILT / Blended Learning</Badge>
          </div>
          <p>
            Hands-on practical training in Store Labs, on-site HSE emergency drills, and interactive live webinars led by master instructors.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" icon="ti-qrcode" onClick={() => handleTriggerCheckIn(classrooms[0])}>
            Quick QR Check-in
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { id: 'ALL', label: 'All Sessions' },
          { id: 'MY_SESSIONS', label: 'My Enrolled Sessions' },
          { id: 'UPCOMING', label: 'Upcoming' },
          { id: 'STORE', label: 'In-Store Practical Labs' },
          { id: 'WEBINAR', label: 'Live Online Webinars' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: filter === f.id ? 'var(--rail)' : 'var(--line)',
              background: filter === f.id ? 'var(--rail-soft)' : 'var(--paper-raised)',
              color: filter === f.id ? 'var(--rail-soft-text)' : 'var(--ink-soft)',
              fontWeight: filter === f.id ? 600 : 400,
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-2">
        {filteredSessions.map((session) => {
          const isFull = session.enrolledCount >= session.maxCapacity;
          const isCheckedIn = session.attendanceStatus === 'CHECKED_IN';

          return (
            <div key={session.id} className="ilt-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge tone={session.modality === 'OFFLINE_STORE' ? 'amber' : 'blue'} icon={session.modality === 'OFFLINE_STORE' ? 'ti-building-store' : 'ti-video'}>
                      {session.modality === 'OFFLINE_STORE' ? 'In-Store Workshop' : 'Teams Webinar'}
                    </Badge>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{session.code}</span>
                  </div>

                  {isCheckedIn ? (
                    <Badge tone="sage" icon="ti-circle-check">Checked In</Badge>
                  ) : session.isEnrolled ? (
                    <Badge tone="amber" icon="ti-clock">Pending Check-in</Badge>
                  ) : (
                    <Badge tone={session.status === 'COMPLETED' ? 'slate' : 'rail'}>
                      {session.status === 'COMPLETED' ? 'Completed' : 'Open for Enrollment'}
                    </Badge>
                  )}
                </div>

                {/* Title & Description */}
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{session.title}</div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 14 }}>
                  {session.description}
                </p>

                {/* Session Meta Specs */}
                <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                    <i className="ti ti-calendar-event" style={{ color: 'var(--rail)', fontSize: 16 }} />
                    <span style={{ fontWeight: 600 }}>{session.date}</span> &middot; <span style={{ color: 'var(--ink-soft)' }}>{session.time}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <i className="ti ti-map-pin" style={{ color: 'var(--amber)', fontSize: 16 }} />
                    <span style={{ color: 'var(--ink-soft)' }}>{session.venue}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <i className="ti ti-user-check" style={{ color: 'var(--sage)', fontSize: 16 }} />
                    <span>Instructor: <strong>{session.trainerName}</strong> ({session.trainerTitle})</span>
                  </div>
                </div>

                {/* Capacity Progress */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 4 }}>
                    <span>Enrollment Capacity: <strong>{session.enrolledCount}/{session.maxCapacity} Seats</strong></span>
                    <span>{isFull ? 'Session Full' : `${session.maxCapacity - session.enrolledCount} spots left`}</span>
                  </div>
                  <ProgressBar value={Math.round((session.enrolledCount / session.maxCapacity) * 100)} tone={isFull ? 'rust' : 'rail'} size="sm" />
                </div>
              </div>

              {/* Card Action Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                  <i className="ti ti-award" style={{ marginRight: 4, color: 'var(--amber)' }} />
                  Rewards: +150 XP &amp; Attendance Certificate
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {session.isEnrolled && !isCheckedIn && session.status !== 'COMPLETED' && (
                    <Button variant="primary" size="sm" icon="ti-qrcode" onClick={() => handleTriggerCheckIn(session)}>
                      QR Check-in
                    </Button>
                  )}

                  {!session.isEnrolled && session.status !== 'COMPLETED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon="ti-plus"
                      disabled={isFull}
                      onClick={() => enrollClassroom(session.id)}
                    >
                      {isFull ? 'Session Full' : 'Enroll in Session'}
                    </Button>
                  )}

                  {isCheckedIn && (
                    <Button variant="ghost" size="sm" icon="ti-check" disabled>
                      Attendance Recorded
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Attendance Modal */}
      <Modal
        isOpen={Boolean(selectedSessionForQR)}
        onClose={() => setSelectedSessionForQR(null)}
        title="Classroom QR Attendance Check-in"
        subtitle={selectedSessionForQR ? `${selectedSessionForQR.title} (${selectedSessionForQR.code})` : ''}
        size="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Button variant="ghost" onClick={() => setSelectedSessionForQR(null)}>Close</Button>
            <Button variant="primary" icon="ti-camera-selfie" onClick={handlePerformCheckIn}>
              {checkInSuccess ? 'Verified Successfully!' : 'Simulate QR Check-in'}
            </Button>
          </div>
        }
      >
        {selectedSessionForQR && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {checkInSuccess ? (
              <div style={{ padding: '24px 10px', animation: 'scaleUp 0.2s ease' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sage-soft)', color: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>
                  <i className="ti ti-check" />
                </div>
                <h3 style={{ fontSize: 17, color: 'var(--sage)', marginBottom: 6 }}>Attendance Recorded!</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  Your physical presence has been verified for <strong>{currentUser.fullName}</strong>. You have received <strong>+150 XP</strong>.
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <QRCodeView value={selectedSessionForQR.qrToken} size={150} label="CLASSROOM ATTENDANCE TOKEN" />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, maxWidth: 320 }}>
                  <i className="ti ti-info-circle" style={{ color: 'var(--rail)', marginRight: 4 }} />
                  Scan this token at the Store Lab check-in kiosk or click the button below to simulate live check-in.
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

