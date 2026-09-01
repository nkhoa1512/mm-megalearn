import React, { useState } from 'react';
import { meetingRoomsAndLabs } from '../../data/mockData';
import { initialRoomBookings } from '../../data/roomBookings';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, Modal } from '../../features/common/ui';

// Chỉ giữ 2 chức năng cốt lõi: Đặt phòng/xưởng thực hành & Upload danh sách
// học viên khóa bắt buộc. Faculty Directory & CSAT chuyển sang component dùng
// chung TrainerRatingsDirectory (công khai cho cả 6 role); tab Calendar bỏ vì
// trùng lặp với lịch lớp trực tiếp đã có ở "Lớp Giảng Dạy & Live QR".
export default function AdminTrainingOps() {
  const { classrooms = [], batchEnrollStudents } = useCourseStore();
  const [activeTab, setActiveTab] = useState('ROOM_BOOKING'); // ROOM_BOOKING, BATCH_UPLOAD

  const [roomSearch, setRoomSearch] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [roomBookings, setRoomBookings] = useState(initialRoomBookings);
  const [reserveDate, setReserveDate] = useState('2026-09-15');
  const [reserveWorkshopName, setReserveWorkshopName] = useState('');
  const [reserveError, setReserveError] = useState('');

  function bookingsForRoom(roomId) {
    return roomBookings.filter((b) => b.roomId === roomId).sort((a, b) => a.date.localeCompare(b.date));
  }

  function openReserveModal(venue) {
    setSelectedVenue(venue);
    setReserveDate('2026-09-15');
    setReserveWorkshopName('');
    setReserveError('');
  }

  function confirmReservation() {
    if (!reserveWorkshopName.trim()) {
      setReserveError('Enter a workshop name before confirming.');
      return;
    }
    const conflict = roomBookings.find((b) => b.roomId === selectedVenue.id && b.date === reserveDate);
    if (conflict) {
      setReserveError(`Conflict: "${conflict.workshopName}" already booked in this room on ${reserveDate}.`);
      return;
    }
    setRoomBookings((prev) => [...prev, { id: `book-${Date.now()}`, roomId: selectedVenue.id, date: reserveDate, workshopName: reserveWorkshopName.trim() }]);
    setSelectedVenue(null);
  }

  const [batchClassId, setBatchClassId] = useState((classrooms || [])[0]?.id || 'ilt-001');
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
            <h1>Lịch Giảng &amp; Xưởng Thực Hành</h1>
            <Badge tone="rail" icon="ti-building">Room Booking &amp; Batch Upload</Badge>
          </div>
          <p>
            Đặt phòng học / xưởng thực hành cho lớp trực tiếp, và tải danh sách học viên cho các khóa bắt buộc theo lô.
          </p>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'ROOM_BOOKING', label: 'Đặt Phòng / Xưởng Thực Hành (Room Booking)', icon: 'ti-building' },
          { id: 'BATCH_UPLOAD', label: 'Upload Danh Sách Học Viên Khóa Bắt Buộc (Batch Upload)', icon: 'ti-users-plus' },
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

      {/* TAB 2: MEETING ROOMS & STORE LABS */}
      {activeTab === 'ROOM_BOOKING' && (() => {
        const filteredVenues = meetingRoomsAndLabs.filter((v) => {
          const isLab = v.id.includes('lab') || v.name.toLowerCase().includes('xưởng') || v.name.toLowerCase().includes('lab');
          if (roomTypeFilter === 'LAB' && !isLab) return false;
          if (roomTypeFilter === 'ROOM' && isLab) return false;
          if (roomSearch) {
            const q = roomSearch.toLowerCase().trim();
            const nameMatch = v.name?.toLowerCase().includes(q);
            const locMatch = v.location?.toLowerCase().includes(q);
            const eqMatch = v.equipment?.some(e => e.toLowerCase().includes(q));
            if (!nameMatch && !locMatch && !eqMatch) return false;
          }
          return true;
        });

        return (
          <div style={{ marginBottom: 28 }}>
            {/* STANDARDIZED FILTER TOOLBAR CARD */}
            <div className="card card-pad" style={{ marginBottom: 16, background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {/* Search input */}
                <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                  <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                  <input
                    type="text"
                    className="field-input"
                    style={{ paddingLeft: 36, paddingRight: roomSearch ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                    placeholder="Tìm theo tên phòng, xưởng, địa điểm, trang thiết bị..."
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                  />
                  {roomSearch && (
                    <button
                      type="button"
                      onClick={() => setRoomSearch('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>

                {/* Type Filter */}
                <div style={{ minWidth: 200 }}>
                  <select
                    className="field-select"
                    style={{
                      width: '100%',
                      height: 38,
                      fontSize: 12.5,
                      borderRadius: 8,
                      background: roomTypeFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                      borderColor: roomTypeFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                      color: roomTypeFilter !== 'ALL' ? '#005BAA' : 'var(--ink)',
                      fontWeight: roomTypeFilter !== 'ALL' ? 700 : 500,
                    }}
                    value={roomTypeFilter}
                    onChange={(e) => setRoomTypeFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả loại phòng / xưởng</option>
                    <option value="LAB">🏪 Xưởng Thực Hành (Store Lab)</option>
                    <option value="ROOM">🏢 Phòng Hội Thảo &amp; Đào Tạo</option>
                  </select>
                </div>
              </div>

              {/* ACTIVE FILTER TAGS & RESET */}
              {(roomSearch || roomTypeFilter !== 'ALL') && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Đang lọc theo:</span>
                    {roomSearch && (
                      <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Từ khóa: <strong>"{roomSearch}"</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setRoomSearch('')} />
                      </span>
                    )}
                    {roomTypeFilter !== 'ALL' && (
                      <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Loại phòng: <strong>{roomTypeFilter === 'LAB' ? 'Xưởng Thực Hành' : 'Phòng Hội Thảo'}</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setRoomTypeFilter('ALL')} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => { setRoomSearch(''); setRoomTypeFilter('ALL'); }}
                      style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
                    >
                      Xóa tất cả bộ lọc
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Tìm thấy <strong>{filteredVenues.length}</strong> / {meetingRoomsAndLabs.length} địa điểm
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-2" style={{ gap: 16 }}>
              {filteredVenues.length === 0 ? (
                <div className="card empty-state" style={{ gridColumn: '1 / -1', padding: '32px 16px' }}>
                  <i className="ti ti-building" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--ink-faint)' }} />
                  Không tìm thấy địa điểm hoặc xưởng thực hành phù hợp.
                </div>
              ) : (
                filteredVenues.map((v) => (
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

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>Upcoming Bookings:</div>
                      {bookingsForRoom(v.id).length === 0 ? (
                        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>No bookings scheduled.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {bookingsForRoom(v.id).map((b) => (
                            <div key={b.id} style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                              <i className="ti ti-calendar-event" style={{ marginRight: 4, color: 'var(--amber)' }} />
                              {b.date} &middot; {b.workshopName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ color: 'var(--sage)', fontWeight: 600 }}>
                        <i className="ti ti-circle-check" style={{ marginRight: 4 }} /> Available (No Conflict)
                      </span>
                      <Button size="sm" variant="ghost" icon="ti-calendar-plus" onClick={() => openReserveModal(v)}>
                        Reserve Room
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 4: BATCH STUDENT ENROLLMENT */}
      {activeTab === 'BATCH_UPLOAD' && (
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
              {(classrooms || []).map((c) => (
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


      {/* Venue Modal */}
      <Modal
        isOpen={Boolean(selectedVenue)}
        onClose={() => setSelectedVenue(null)}
        title="Reserve Training Room / Store Lab"
        subtitle={selectedVenue ? selectedVenue.name : ''}
        size="sm"
        footer={<Button variant="primary" onClick={confirmReservation}>Confirm Reservation</Button>}
      >
        {selectedVenue && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Select cohort date and workshop title to schedule this venue.
            </p>
            <input
              type="date"
              className="field-input"
              value={reserveDate}
              onChange={(e) => setReserveDate(e.target.value)}
              style={{ width: '100%', marginBottom: 10 }}
            />
            <input
              type="text"
              className="field-input"
              placeholder="Workshop Name (e.g. Store Lab HACCP)"
              value={reserveWorkshopName}
              onChange={(e) => setReserveWorkshopName(e.target.value)}
              style={{ width: '100%' }}
            />
            {reserveError && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--rust)' }}>
                <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />{reserveError}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
