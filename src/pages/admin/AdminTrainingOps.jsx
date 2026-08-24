import React, { useState } from 'react';
import {
  trainersDirectory,
  meetingRoomsAndLabs,
  classroomSessions,
} from '../../data/mockData';
import { useCourseStore } from '../../state/CourseStore';
import { Badge, Button, Modal, ProgressBar } from '../../components/ui';

export default function AdminTrainingOps() {
  const { classrooms, batchEnrollStudents } = useCourseStore();
  const [activeTab, setActiveTab] = useState('TRAINERS'); // TRAINERS, VENUES, CALENDAR, BATCH_ENROLL

  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [batchClassId, setBatchClassId] = useState(classrooms[0]?.id || 'ilt-001');
  const [csvInput, setCsvInput] = useState(
    'MMVN-1042, Minh Tran, Bakery Specialist, MM An Phu\nMMVN-1078, Sarah Johnson, Pastry Chef Associate, MM An Phu\nMMVN-1120, Carlos Reyes, Dough Prep Associate, MM An Phu'
  );
  const [batchSuccess, setBatchSuccess] = useState(false);

  function handleBatchUpload() {
    const lines = csvInput.split('\n').filter((l) => l.trim().length > 0);
    const students = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        id: parts[0] || `MMVN-${Math.floor(1000 + Math.random() * 9000)}`,
        name: parts[1] || 'Learner',
        position: parts[2] || 'Store Associate',
        store: parts[3] || 'MM An Phu',
        attendance: 'CONFIRMED',
      };
    });

    batchEnrollStudents(batchClassId, students);
    setBatchSuccess(true);
    setTimeout(() => setBatchSuccess(false), 2500);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>L&amp;D Training Operations &amp; Faculty Command Center</h1>
            <Badge tone="rail" icon="ti-school">Faculty &amp; Operations Hub</Badge>
          </div>
          <p>
            Manage certified faculty credentials, instructor CSAT ratings, store practical labs, enterprise master calendars, and batch student enrollment tools.
          </p>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'TRAINERS', label: 'Faculty Directory & CSAT Ratings', icon: 'ti-user-star' },
          { id: 'VENUES', label: 'Store Practical Labs & Venues', icon: 'ti-building' },
          { id: 'CALENDAR', label: 'Enterprise Master Training Calendar', icon: 'ti-calendar' },
          { id: 'BATCH_ENROLL', label: 'Batch Student Upload (CSV / Roster)', icon: 'ti-users-plus' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
              color: activeTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: activeTab === tab.id ? 'var(--rail)' : 'var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TRAINERS DIRECTORY & RATINGS */}
      {activeTab === 'TRAINERS' && (
        <div>
          <div className="grid grid-2" style={{ gap: 16, marginBottom: 28 }}>
            {trainersDirectory.map((t) => (
              <div key={t.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'var(--rail-soft)',
                          color: 'var(--rail-soft-text)',
                          fontWeight: 800,
                          fontSize: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                          {t.role} &middot; <span style={{ fontFamily: 'var(--font-mono)' }}>{t.level}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        ★ {t.rating}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Learner CSAT</div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12 }}>
                    <div style={{ color: 'var(--ink-soft)', marginBottom: 4 }}>Certified Teaching Disciplines &amp; Topics:</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {t.subjects.map((s, idx) => (
                        <span key={idx} style={{ background: '#fff', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--line)', fontWeight: 600, fontSize: 11.5 }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
                    <span>Classes Delivered: <strong>{t.totalClassesTaught} sessions</strong></span>
                    <span>Total Learners: <strong>{t.totalLearners.toLocaleString()} trainees</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                    <i className="ti ti-mail" style={{ marginRight: 4 }} />{t.email}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setSelectedTrainer(t)}>
                    View Faculty Dossier
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MEETING ROOMS & STORE LABS */}
      {activeTab === 'VENUES' && (
        <div style={{ marginBottom: 28 }}>
          <div className="grid grid-2" style={{ gap: 16 }}>
            {meetingRoomsAndLabs.map((v) => (
              <div key={v.id} className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--ink)' }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                      <i className="ti ti-map-pin" style={{ color: 'var(--amber)', marginRight: 4 }} />
                      {v.location}
                    </div>
                  </div>
                  <Badge tone={v.id.includes('lab') ? 'amber' : 'blue'}>
                    Capacity: {v.capacity} seats
                  </Badge>
                </div>

                <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>Equipment &amp; Facilities Available:</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {v.equipment.map((eq, i) => (
                      <span key={i} style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--line)', fontSize: 11.5 }}>
                        • {eq}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: 'var(--sage)', fontWeight: 600 }}>
                    <i className="ti ti-circle-check" style={{ marginRight: 4 }} /> Available (No Conflict)
                  </span>
                  <Button size="sm" variant="ghost" icon="ti-calendar-plus" onClick={() => setSelectedVenue(v)}>
                    Reserve Room
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MASTER TRAINING CALENDAR */}
      {activeTab === 'CALENDAR' && (
        <div style={{ marginBottom: 28 }}>
          <div className="card card-pad" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>
              Enterprise Classroom Workshops &amp; Webinar Schedule (August &amp; September 2026)
            </div>
            <Button size="sm" variant="primary" icon="ti-plus">
              Schedule New Cohort
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {classrooms.map((session) => (
              <div key={session.id} className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>Aug</span>
                    <span style={{ fontSize: 18, fontWeight: 800 }}>{session.date.split('-')[2] || '28'}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14.5 }}>{session.title}</span>
                      <Badge tone={session.modality === 'OFFLINE_STORE' ? 'amber' : 'blue'}>
                        {session.modality === 'OFFLINE_STORE' ? 'Store Lab (In-Person)' : 'Teams Live Webinar'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span><i className="ti ti-clock" style={{ marginRight: 4 }} />{session.time}</span>
                      <span><i className="ti ti-map-pin" style={{ marginRight: 4 }} />{session.venue}</span>
                      <span><i className="ti ti-user" style={{ marginRight: 4 }} />Instructor: <strong>{session.trainerName}</strong></span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>
                    Enrolled: <strong>{session.enrolledCount} / {session.maxCapacity}</strong> seats
                  </div>
                  <div style={{ width: 140 }}>
                    <ProgressBar value={Math.round((session.enrolledCount / session.maxCapacity) * 100)} tone="rail" size="sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BATCH STUDENT ENROLLMENT */}
      {activeTab === 'BATCH_ENROLL' && (
        <div className="card card-pad" style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
            Batch Student Enrollment Tool (CSV / Roster Import)
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 16 }}>
            For Trainers &amp; L&amp;D Administrators to batch-enroll specialized cohorts into mandatory HACCP, PCCC, or leadership workshops.
          </p>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Select Training Session / Workshop:
            </label>
            <select
              className="field-input"
              value={batchClassId}
              onChange={(e) => setBatchClassId(e.target.value)}
              style={{ width: '100%', fontSize: 13 }}
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.title} ({c.date} · {c.venue})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Paste Associate Roster (Format: Employee ID, Full Name, Position, Store):
            </label>
            <textarea
              className="field-input"
              rows={6}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Detected: <strong>{csvInput.split('\n').filter((l) => l.trim()).length} associates</strong>
            </span>
            <Button variant="primary" icon={batchSuccess ? 'ti-check' : 'ti-upload'} onClick={handleBatchUpload}>
              {batchSuccess ? 'Roster Uploaded Successfully!' : 'Upload & Enroll Cohort'}
            </Button>
          </div>
        </div>
      )}

      {/* Trainer Detail Modal */}
      <Modal
        isOpen={Boolean(selectedTrainer)}
        onClose={() => setSelectedTrainer(null)}
        title="Certified Faculty Dossier"
        subtitle={selectedTrainer ? `${selectedTrainer.name} · ${selectedTrainer.role}` : ''}
        size="md"
        footer={<Button variant="primary" onClick={() => setSelectedTrainer(null)}>Close</Button>}
      >
        {selectedTrainer && (
          <div>
            <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div><strong>Department:</strong> {selectedTrainer.department}</div>
              <div><strong>Email:</strong> {selectedTrainer.email}</div>
              <div><strong>Phone:</strong> {selectedTrainer.phone}</div>
              <div style={{ marginTop: 6, color: 'var(--amber)', fontWeight: 700 }}>
                Average CSAT: ★ {selectedTrainer.rating} / 5.0 (from {selectedTrainer.totalLearners} learners)
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Certified Disciplines:</div>
            <ul style={{ fontSize: 12.5, color: 'var(--ink-soft)', paddingLeft: 20 }}>
              {selectedTrainer.subjects.map((s, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      {/* Venue Modal */}
      <Modal
        isOpen={Boolean(selectedVenue)}
        onClose={() => setSelectedVenue(null)}
        title="Reserve Training Room / Store Lab"
        subtitle={selectedVenue ? selectedVenue.name : ''}
        size="sm"
        footer={<Button variant="primary" onClick={() => setSelectedVenue(null)}>Confirm Reservation</Button>}
      >
        {selectedVenue && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Select cohort date and workshop title to schedule this venue.
            </p>
            <input type="date" className="field-input" defaultValue="2026-09-15" style={{ width: '100%', marginBottom: 10 }} />
            <input type="text" className="field-input" placeholder="Workshop Name (e.g. Store Lab HACCP)" style={{ width: '100%' }} />
          </div>
        )}
      </Modal>
    </>
  );
}
