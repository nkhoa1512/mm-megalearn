import React, { useState } from 'react';
import { useCourseStore } from '../../state/CourseStore';
import { Badge, Button, Modal, ProgressBar } from '../../components/ui';

export default function LearnerClassrooms() {
  const { classrooms, checkInClassroom, enrollClassroom, currentUser } = useCourseStore();
  const [filter, setFilter] = useState('ALL');

  // Scanner Modal state (Simulated Camera Viewfinder)
  const [scanningSession, setScanningSession] = useState(null);
  const [scanState, setScanState] = useState('SCANNING'); // SCANNING, VERIFYING, SUCCESS

  // CSAT Survey Modal state
  const [surveySession, setSurveySession] = useState(null);
  const [trainerRating, setTrainerRating] = useState(5);
  const [contentRating, setContentRating] = useState(5);
  const [facilityRating, setFacilityRating] = useState(5);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  const filteredSessions = classrooms.filter((s) => {
    if (filter === 'UPCOMING') return s.status === 'UPCOMING' || s.status === 'OPEN';
    if (filter === 'MY_SESSIONS') return s.isEnrolled;
    if (filter === 'STORE') return s.modality === 'OFFLINE_STORE';
    if (filter === 'WEBINAR') return s.modality === 'ONLINE_WEBINAR';
    return true;
  });

  function handleOpenScanner(session) {
    setScanningSession(session);
    setScanState('SCANNING');
  }

  function handleSimulateScan() {
    setScanState('VERIFYING');
    setTimeout(() => {
      if (scanningSession) {
        checkInClassroom(scanningSession.id);
      }
      setScanState('SUCCESS');
      setTimeout(() => {
        setScanningSession(null);
        setScanState('SCANNING');
      }, 1500);
    }, 1000);
  }

  function handleOpenSurvey(session) {
    setSurveySession(session);
    setTrainerRating(5);
    setContentRating(5);
    setFacilityRating(5);
    setSurveyComment('Buổi học thực hành rất trực quan, giảng viên hướng dẫn nhiệt tình và giải thích cặn kẽ từng bước thao tác.');
    setSurveySubmitted(false);
  }

  function handleSubmitSurvey() {
    setSurveySubmitted(true);
    setTimeout(() => {
      setSurveySubmitted(false);
      setSurveySession(null);
    }, 1600);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Lớp Đào Tạo Trực Tiếp &amp; Quét QR Điểm Danh (ILT Workshops)</h1>
            <Badge tone="blue" icon="ti-chalkboard">Đào Tạo Trực Tiếp Tại Siêu Thị</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Lớp học thực hành tại xưởng bánh, bãi tập PCCC siêu thị và hội thảo trực tuyến do Giảng viên chuyên trách (Trainer) đứng lớp.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" icon="ti-camera" onClick={() => handleOpenScanner(classrooms[0])}>
            📷 Mở Camera Quét QR Giảng Viên
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { id: 'ALL', label: 'Tất Cả Buổi Đào Tạo' },
          { id: 'MY_SESSIONS', label: 'Lớp Tôi Được Gán / Đã Đăng Ký' },
          { id: 'UPCOMING', label: 'Lớp Sắp Diễn Ra' },
          { id: 'STORE', label: 'Thực Hành Xưởng Siêu Thị' },
          { id: 'WEBINAR', label: 'Hội Thảo Trực Tuyến (Webinar)' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: filter === f.id ? 'var(--blue)' : 'var(--line)',
              background: filter === f.id ? 'var(--blue-soft)' : 'var(--paper-raised)',
              color: filter === f.id ? 'var(--blue)' : 'var(--ink-soft)',
              fontWeight: filter === f.id ? 700 : 500,
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
            <div key={session.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20 }}>
              <div>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge tone={session.modality === 'OFFLINE_STORE' ? 'amber' : 'blue'} icon={session.modality === 'OFFLINE_STORE' ? 'ti-building-store' : 'ti-video'}>
                      {session.modality === 'OFFLINE_STORE' ? 'Thực Hành Tại Xưởng' : 'Teams Webinar'}
                    </Badge>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{session.code}</span>
                  </div>

                  {isCheckedIn ? (
                    <Badge tone="sage" icon="ti-circle-check">Đã Điểm Danh</Badge>
                  ) : session.isEnrolled ? (
                    <Badge tone="amber" icon="ti-clock">Chờ Đến Lớp Quét QR</Badge>
                  ) : (
                    <Badge tone={session.status === 'COMPLETED' ? 'slate' : 'rail'}>
                      {session.status === 'COMPLETED' ? 'Đã Kết Thúc' : 'Mở Đăng Ký'}
                    </Badge>
                  )}
                </div>

                {/* Title & Description */}
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>{session.title}</div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 14 }}>
                  {session.description}
                </p>

                {/* Session Meta Specs */}
                <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                    <i className="ti ti-calendar-event" style={{ color: 'var(--blue)', fontSize: 16 }} />
                    <span style={{ fontWeight: 700 }}>{session.date}</span> &middot; <span style={{ color: 'var(--ink-soft)' }}>{session.time}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <i className="ti ti-map-pin" style={{ color: 'var(--rust)', fontSize: 16 }} />
                    <span style={{ color: 'var(--ink-soft)' }}>{session.venue}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <i className="ti ti-user-check" style={{ color: 'var(--sage)', fontSize: 16 }} />
                    <span>Giảng viên đứng lớp: <strong>{session.trainerName}</strong> ({session.trainerTitle})</span>
                  </div>
                </div>

                {/* Capacity Progress */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 4 }}>
                    <span>Sĩ số lớp: <strong>{session.enrolledCount}/{session.maxCapacity} Học viên</strong></span>
                    <span>{isFull ? 'Lớp đã đủ chỗ' : `Còn trống ${session.maxCapacity - session.enrolledCount} chỗ`}</span>
                  </div>
                  <ProgressBar value={Math.round((session.enrolledCount / session.maxCapacity) * 100)} tone={isFull ? 'rust' : 'rail'} size="sm" />
                </div>
              </div>

              {/* Card Action Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 14, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                  <i className="ti ti-award" style={{ marginRight: 4, color: 'var(--amber)' }} />
                  Phần thưởng: <strong>+150 XP</strong> &amp; Chứng nhận tham gia
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {/* CASE 1: Learner is enrolled and needs to scan Trainer's QR */}
                  {session.isEnrolled && !isCheckedIn && session.status !== 'COMPLETED' && (
                    <Button variant="primary" size="sm" icon="ti-camera" onClick={() => handleOpenScanner(session)}>
                      📷 Quét QR Điểm Danh
                    </Button>
                  )}

                  {/* CASE 2: Learner not enrolled yet */}
                  {!session.isEnrolled && session.status !== 'COMPLETED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon="ti-plus"
                      disabled={isFull}
                      onClick={() => enrollClassroom(session.id)}
                    >
                      {isFull ? 'Lớp Đã Đủ Chỗ' : 'Đăng Ký Tham Gia'}
                    </Button>
                  )}

                  {/* CASE 3: Learner has checked in -> Can submit CSAT rating */}
                  {isCheckedIn && (
                    <Button variant="outline" size="sm" icon="ti-star" onClick={() => handleOpenSurvey(session)}>
                      ⭐ Đánh Giá Buổi Học (CSAT)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: SIMULATED MOBILE CAMERA QR SCANNER */}
      {scanningSession && (
        <Modal
          isOpen={Boolean(scanningSession)}
          onClose={() => setScanningSession(null)}
          title="Quét Mã QR Điểm Danh Tại Lớp Học"
          size="sm"
        >
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
              {scanningSession.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Giảng viên: <strong>{scanningSession.trainerName}</strong> &middot; {scanningSession.venue}
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
              border: '3px solid var(--blue)',
            }}>
              {scanState === 'SUCCESS' ? (
                <div style={{ color: '#10B981', animation: 'scaleUp 0.3s ease' }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 72 }} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginTop: 8 }}>ĐIỂM DANH THÀNH CÔNG!</div>
                  <div style={{ fontSize: 12, color: '#10B981' }}>+150 XP Đã Cộng Vào Hồ Sơ</div>
                </div>
              ) : scanState === 'VERIFYING' ? (
                <div style={{ color: '#fff' }}>
                  <i className="ti ti-loader" style={{ fontSize: 48, animation: 'spin 1s linear infinite' }} />
                  <div style={{ fontSize: 13, marginTop: 10 }}>Đang xác thực mã Token Giảng viên...</div>
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
                  <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 10, padding: '0 10px' }}>
                    Hướng camera về phía mã QR đang chiếu trên màn hình của Thầy/Cô
                  </div>
                </>
              )}
            </div>

            <p style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45, margin: '0 0 16px' }}>
              Học viên <strong>{currentUser.fullName}</strong> ({currentUser.employeeCode}) đang quét mã điểm danh của lớp <strong>{scanningSession.code}</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <Button variant="ghost" onClick={() => setScanningSession(null)}>Đóng Camera</Button>
              <Button
                variant="primary"
                icon="ti-scan"
                disabled={scanState !== 'SCANNING'}
                onClick={handleSimulateScan}
              >
                {scanState === 'SCANNING' ? 'Bấm Quét Mã QR Giảng Viên' : scanState === 'VERIFYING' ? 'Đang Xử Lý...' : 'Đã Điểm Danh!'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: LEVEL 1 CSAT EVALUATION SURVEY */}
      {surveySession && (
        <Modal
          isOpen={Boolean(surveySession)}
          onClose={() => setSurveySession(null)}
          title="Khảo Sát Đánh Giá Chất Lượng Đào Tạo (Level 1 CSAT)"
          size="md"
        >
          <div>
            <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{surveySession.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Giảng viên: <strong>{surveySession.trainerName}</strong> &middot; Địa điểm: {surveySession.venue}
              </div>
            </div>

            {surveySubmitted ? (
              <div style={{ textAlign: 'center', padding: '24px 10px' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--sage-soft)', color: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 12px' }}>
                  <i className="ti ti-check" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--sage)', marginBottom: 4 }}>
                  Cảm Ơn Bạn Đã Gửi Đánh Giá!
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0 }}>
                  Ý kiến của bạn đã được chuyển trực tiếp cho Giảng viên <strong>{surveySession.trainerName}</strong> và Ban L&amp;D để cải tiến các khóa học tiếp theo (+50 XP).
                </p>
              </div>
            ) : (
              <>
                {/* Metric 1: Trainer Rating */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      1. Mức độ hài lòng về kỹ năng giảng dạy của Thầy/Cô {surveySession.trainerName}:
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--amber)' }}>{trainerRating} ★</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setTrainerRating(star)}
                        className="btn btn-sm"
                        style={{
                          flex: 1,
                          background: trainerRating >= star ? '#FEF3C7' : 'var(--paper-sunken)',
                          color: trainerRating >= star ? '#B45309' : 'var(--ink-soft)',
                          borderColor: trainerRating >= star ? 'var(--amber)' : 'var(--line)',
                          fontWeight: 700,
                        }}
                      >
                        {star} ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metric 2: Practical Content */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      2. Nội dung bài giảng sát thực tế công việc tại siêu thị:
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--amber)' }}>{contentRating} ★</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setContentRating(star)}
                        className="btn btn-sm"
                        style={{
                          flex: 1,
                          background: contentRating >= star ? '#FEF3C7' : 'var(--paper-sunken)',
                          color: contentRating >= star ? '#B45309' : 'var(--ink-soft)',
                          borderColor: contentRating >= star ? 'var(--amber)' : 'var(--line)',
                          fontWeight: 700,
                        }}
                      >
                        {star} ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metric 3: Facilities */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      3. Trang thiết bị &amp; dụng cụ thực hành tại phòng lab / xưởng:
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--amber)' }}>{facilityRating} ★</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFacilityRating(star)}
                        className="btn btn-sm"
                        style={{
                          flex: 1,
                          background: facilityRating >= star ? '#FEF3C7' : 'var(--paper-sunken)',
                          color: facilityRating >= star ? '#B45309' : 'var(--ink-soft)',
                          borderColor: facilityRating >= star ? 'var(--amber)' : 'var(--line)',
                          fontWeight: 700,
                        }}
                      >
                        {star} ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text comment */}
                <div style={{ marginBottom: 16 }}>
                  <label className="field-label">Góp ý hoặc cảm nhận của bạn sau buổi học:</label>
                  <textarea
                    className="field-input"
                    rows={3}
                    value={surveyComment}
                    onChange={(e) => setSurveyComment(e.target.value)}
                    placeholder="Chia sẻ nhận xét của bạn về buổi học..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <Button variant="ghost" onClick={() => setSurveySession(null)}>Đóng</Button>
                  <Button variant="primary" icon="ti-send" onClick={handleSubmitSurvey}>
                    Gửi Đánh Giá (+50 XP)
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
