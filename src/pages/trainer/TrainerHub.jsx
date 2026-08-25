import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  meetingRoomsAndLabs,
  classroomSessions,
  allUsers,
  teachingEligibleUsers,
  trainerStatsFor,
} from '../../data/mockData';
import { useCourseStore } from '../../state/CourseStore';
import { Badge, Button, Modal, ProgressBar } from '../../components/ui';
import { normalizeRole, hasCapability, roleDefinition } from '../../data/roles';
import UserTranscriptModal from '../../components/UserTranscriptModal';

export default function TrainerHub({ initialTab = 'CLASSES' }) {
  const navigate = useNavigate();
  const { courses, currentUser: authUser, users } = useCourseStore();
  // CLASSES | ATTENDANCE | FEEDBACK | LABS — chọn qua điều hướng sidebar
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, UPCOMING, COMPLETED
  const [transcriptUser, setTranscriptUser] = useState(null);

  const authRole = normalizeRole(authUser?.role);
  const canBeAssignedToClass = hasCapability(authRole, 'canBeAssignedToClass');

  // Danh sách người đủ chuẩn đứng lớp: Trainer/L&D, HRBP, User Admin, SysAdmin.
  // Mặc định xem lịch dạy của chính người đang đăng nhập; vẫn giữ dropdown để
  // xem thử lịch của người khác (tiện demo), nhưng nguồn dữ liệu giờ là nhân
  // sự thật thay vì hồ sơ tĩnh trainersDirectory.
  const eligibleTrainers = teachingEligibleUsers();
  const [selectedTrainerId, setSelectedTrainerId] = useState(authUser?.userId || eligibleTrainers[0]?.userId);
  useEffect(() => {
    if (authUser?.userId) setSelectedTrainerId(authUser.userId);
  }, [authUser?.userId]);

  const trainerUser = eligibleTrainers.find((t) => t.userId === selectedTrainerId) || eligibleTrainers[0] || authUser;
  const trainerProfile = { ...trainerUser, ...trainerStatsFor(trainerUser?.userId) };

  // Filter in-person courses taught specifically by selected trainer
  const inPersonCourses = courses.filter((c) => c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB');

  const myTeachingClasses = [
    ...classroomSessions.filter((s) => s.trainerId === trainerProfile.userId || s.trainerName === trainerProfile.fullName),
    ...inPersonCourses.filter((c) => (c.trainerId === trainerProfile.userId || c.trainerName === trainerProfile.fullName) && !classroomSessions.some((s) => s.title === c.title)),
  ].map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    category: c.category,
    trainerName: c.trainerName || trainerProfile.fullName,
    trainerTitle: c.trainerTitle || roleDefinition(trainerProfile.role).labelVi,
    date: c.date || c.scheduleDate || '2026-08-28',
    time: c.time || c.scheduleTime || '08:30 - 11:30 (3.0 hours)',
    venue: c.venue || 'Fresh Food & Bakery Practical Lab (MM An Phu)',
    maxCapacity: c.maxCapacity || 25,
    enrolledCount: c.enrolledCount || 21,
    status: c.status || 'UPCOMING',
    qrToken: c.qrToken || `MMVN-QR-${c.code}-LIVE`,
    description: c.description || 'Thực hành vệ sinh, khử trùng máy trộn bột, hiệu chuẩn nhiệt độ và áp suất lò nướng công nghiệp theo chuẩn Gold HACCP.',
    syllabus: [
      { step: 'Phần 1: Chuẩn bị & Phổ biến Quy định An toàn Vệ sinh (30 phút)', detail: 'Quy tắc vệ sinh Gold HACCP, kiểm tra nhiệt độ lõi tủ mát bảo quản nguyên liệu tươi.' },
      { step: 'Phần 2: Thao tác Vận hành Lò nướng Thực tế tại Xưởng (90 phút)', detail: 'Vận hành lò nướng công nghiệp Deck Oven, nhào bột & cân chỉnh công thức nướng bánh mì Pháp.' },
      { step: 'Phần 3: Đánh giá Mẻ bánh & Vệ sinh Khử trùng Thiết bị (60 phút)', detail: 'Kiểm tra độ giòn xốp bánh, vệ sinh khử trùng boong nướng & hoàn tất bảng điểm danh.' },
    ],
    materials: [
      { name: 'SOP-OMD-04B: Hướng dẫn Vận hành Lò Nướng Deck Oven (PDF)', type: 'PDF' },
      { name: 'Slide Bài Giảng: Kiểm soát Nguy cơ Nhiễm khuẩn Chéo (PPT)', type: 'PPT' },
    ],
    enrolledStudents: c.enrolledStudents && c.enrolledStudents.length > 0 ? c.enrolledStudents : [
      { id: 'MMVN-1042', name: 'Minh Tran', position: 'Bakery Specialist', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-1078', name: 'Sarah Johnson', position: 'Pastry Chef Associate', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-2041', name: 'Quoc Bao', position: 'Store Fresh Associate', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-1111', name: 'Lisa Wang', position: 'Fresh Food Associate', store: 'MM An Phu', attendance: 'PENDING' },
      { id: 'MMVN-1120', name: 'Carlos Reyes', position: 'Dough Prep Specialist', store: 'MM An Phu', attendance: 'CONFIRMED' },
    ],
  }));

  const filteredClasses = myTeachingClasses.filter((cls) => {
    if (statusFilter === 'UPCOMING') return cls.status === 'UPCOMING' || cls.status === 'OPEN';
    if (statusFilter === 'COMPLETED') return cls.status === 'COMPLETED';
    return true;
  });

  // Bảng điểm danh tổng hợp mọi lớp mà giảng viên phụ trách.
  const attendanceRows = myTeachingClasses.flatMap((cls) =>
    (cls.enrolledStudents || []).map((st) => ({
      key: `${cls.id}::${st.id}`,
      classId: cls.id,
      classTitle: cls.title,
      classDate: cls.date,
      venue: cls.venue,
      student: st,
    }))
  );
  const totalRosterCount = attendanceRows.length;

  // Ghi đè trạng thái điểm danh do giảng viên thao tác trong phiên.
  const [attendanceOverrides, setAttendanceOverrides] = useState({});
  const [attendanceClassFilter, setAttendanceClassFilter] = useState('ALL');
  const [attendanceSearch, setAttendanceSearch] = useState('');

  function attendanceStateOf(row) {
    return attendanceOverrides[row.key] || row.student.attendance || 'PENDING';
  }

  function setAttendanceState(row, next) {
    setAttendanceOverrides((prev) => ({ ...prev, [row.key]: next }));
  }

  const visibleAttendanceRows = attendanceRows.filter((row) => {
    const matchClass = attendanceClassFilter === 'ALL' || row.classId === attendanceClassFilter;
    const q = attendanceSearch.trim().toLowerCase();
    const matchSearch = !q || row.student.name.toLowerCase().includes(q) || row.student.id.toLowerCase().includes(q);
    return matchClass && matchSearch;
  });

  const checkedInCount = visibleAttendanceRows.filter((r) => attendanceStateOf(r) === 'CONFIRMED').length;
  const absentCount = visibleAttendanceRows.filter((r) => attendanceStateOf(r) === 'ABSENT').length;

  // Modal States
  const [liveQrClass, setLiveQrClass] = useState(null);
  const [rosterClass, setRosterClass] = useState(null);
  const [materialsClass, setMaterialsClass] = useState(null);
  const [rosterSearch, setRosterSearch] = useState('');
  const [activeRoster, setActiveRoster] = useState([]);

  function openLiveQrModal(cls) {
    setLiveQrClass(cls);
  }

  function openRosterModal(cls) {
    setRosterClass(cls);
    setActiveRoster(cls.enrolledStudents || []);
    setRosterSearch('');
  }

  function openMaterialsModal(cls) {
    setMaterialsClass(cls);
  }

  function toggleAttendance(studentId) {
    setActiveRoster((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, attendance: s.attendance === 'CONFIRMED' ? 'PENDING' : 'CONFIRMED' }
          : s
      )
    );
  }

  if (!canBeAssignedToClass) {
    return (
      <div className="empty-state">
        <i className="ti ti-lock" aria-hidden="true" style={{ color: 'var(--rust)' }} />
        <p>Vai trò của bạn không được phân công đứng lớp.</p>
      </div>
    );
  }

  return (
    <>
      {/* HEADER WITH TRAINER PROFILE */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Cổng Lớp Giảng Dạy &amp; Live QR</h1>
            <Badge tone="blue" icon="ti-school">{roleDefinition(trainerProfile.role).labelVi}</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Đang xem lịch dạy của:</span>
            <select
              className="field-select"
              style={{ height: 32, fontSize: 13, fontWeight: 700, borderColor: 'var(--blue)', background: 'var(--paper-sunken)' }}
              value={selectedTrainerId}
              onChange={(e) => setSelectedTrainerId(e.target.value)}
            >
              {eligibleTrainers.map((t) => (
                <option key={t.userId} value={t.userId}>
                  {t.fullName} &mdash; {roleDefinition(t.role).shortVi}
                  {t.userId === authUser?.userId ? ' (bạn)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
          Xem Giao Diện Học Tập Cá Nhân
        </Button>
      </div>

      {/* Quick KPI stats */}
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>★ {trainerProfile.rating}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Điểm CSAT<br />Trung bình</div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>{trainerProfile.totalClassesTaught}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Buổi đào tạo<br />Đã giảng dạy</div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>{trainerProfile.totalLearners.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Học viên<br />Đã hoàn thành</div>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'CLASSES', label: 'Lớp Học Tôi Phụ Trách Giảng Dạy', icon: 'ti-chalkboard', count: myTeachingClasses.length },
          { id: 'ATTENDANCE', label: 'Quản Lý Điểm Danh Học Viên', icon: 'ti-user-check', count: totalRosterCount },
          { id: 'FEEDBACK', label: 'Đánh Giá & Phản Hồi CSAT Từ Học Viên', icon: 'ti-star', count: `${trainerProfile.rating}★` },
          { id: 'LABS', label: 'Danh Mục Xưởng Thực Hành Siêu Thị', icon: 'ti-building', count: meetingRoomsAndLabs.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.id ? 'var(--blue)' : 'var(--paper-raised)',
              color: activeTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: activeTab === tab.id ? 'var(--blue)' : 'var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: activeTab === tab.id ? 700 : 500,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            <span>{tab.label}</span>
            <span style={{
              background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--line)',
              padding: '1px 6px',
              borderRadius: 10,
              fontSize: 10.5,
              fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: TEACHING CLASSES */}
      {activeTab === 'CLASSES' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Danh sách các lớp học đào tạo trực tiếp <strong>do L&amp;D phân công Thầy Nguyễn Văn Hùng giảng dạy</strong>:
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['ALL', 'UPCOMING', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className="btn btn-sm"
                  style={{
                    background: statusFilter === st ? 'var(--blue-soft)' : 'transparent',
                    color: statusFilter === st ? 'var(--blue)' : 'var(--ink-soft)',
                    borderColor: statusFilter === st ? 'var(--blue)' : 'var(--line)',
                    fontWeight: statusFilter === st ? 700 : 500,
                  }}
                >
                  {st === 'ALL' ? 'Tất cả Lớp' : st === 'UPCOMING' ? 'Lớp Sắp Diễn Ra' : 'Lớp Đã Hoàn Thành'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredClasses.map((cls) => {
              const fillPercent = Math.round((cls.enrolledCount / cls.maxCapacity) * 100);
              const isUpcoming = cls.status === 'UPCOMING' || cls.status === 'OPEN';

              return (
                <div
                  key={cls.id}
                  className="card card-pad"
                  style={{
                    borderColor: isUpcoming ? 'var(--blue)' : 'var(--line)',
                    background: isUpcoming ? 'linear-gradient(180deg, #FFFFFF 0%, var(--blue-soft) 100%)' : '#fff',
                    padding: 20,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Badge tone="blue" icon="ti-building-store">Đào tạo Thực hành (In-Person ILT)</Badge>
                        <Badge tone={isUpcoming ? 'amber' : 'sage'}>
                          {isUpcoming ? 'Sắp Diễn Ra' : 'Đã Hoàn Thành'}
                        </Badge>
                        <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>Mã: {cls.code}</span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>{cls.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span><i className="ti ti-calendar" style={{ marginRight: 4, color: 'var(--blue)' }} /> <strong>Thời gian:</strong> {cls.date} ({cls.time})</span>
                        <span><i className="ti ti-map-pin" style={{ marginRight: 4, color: 'var(--rust)' }} /> <strong>Địa điểm:</strong> {cls.venue}</span>
                        <span><i className="ti ti-user" style={{ marginRight: 4, color: 'var(--rail)' }} /> <strong>Giảng viên:</strong> {cls.trainerName}</span>
                      </div>
                    </div>

                    {/* Action buttons for Trainer */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Button
                        variant="primary"
                        icon="ti-qrcode"
                        onClick={() => openLiveQrModal(cls)}
                      >
                        Mở QR Điểm danh Trực tiếp
                      </Button>
                      <Button
                        variant="ghost"
                        icon="ti-users"
                        onClick={() => openRosterModal(cls)}
                      >
                        Danh sách Học viên ({cls.enrolledCount}/{cls.maxCapacity})
                      </Button>
                      <Button
                        variant="outline"
                        icon="ti-file-text"
                        onClick={() => openMaterialsModal(cls)}
                      >
                        Giáo trình &amp; Slide
                      </Button>
                    </div>
                  </div>

                  <p style={{ fontSize: 12.5, color: 'var(--ink)', margin: '0 0 12px', lineHeight: 1.5 }}>
                    {cls.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 420 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Học viên L&amp;D đã gán vào lớp:</span>
                      <ProgressBar value={fillPercent} tone={fillPercent >= 80 ? 'sage' : 'blue'} size="sm" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{cls.enrolledCount} / {cls.maxCapacity} chỗ ({fillPercent}%)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--ink-soft)' }}>
                      <span><i className="ti ti-circle-check" style={{ color: 'var(--sage)' }} /> <strong>{cls.enrolledStudents.filter((s) => s.attendance === 'CONFIRMED').length}</strong> Đã có mặt</span>
                      <span><i className="ti ti-clock" style={{ color: 'var(--amber)' }} /> <strong>{cls.enrolledStudents.filter((s) => s.attendance !== 'CONFIRMED').length}</strong> Chưa điểm danh</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* TAB 2: QUẢN LÝ ĐIỂM DANH HỌC VIÊN */}
      {activeTab === 'ATTENDANCE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="field-select"
                style={{ minWidth: 300 }}
                value={attendanceClassFilter}
                onChange={(e) => setAttendanceClassFilter(e.target.value)}
              >
                <option value="ALL">Tất cả lớp tôi phụ trách ({myTeachingClasses.length})</option>
                {myTeachingClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.title} — {cls.date}</option>
                ))}
              </select>
              <input
                type="text"
                className="field-input"
                style={{ width: 260 }}
                placeholder="Tìm học viên theo tên hoặc mã NV..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Badge tone="sage" icon="ti-user-check">Đã điểm danh: {checkedInCount}</Badge>
              <Badge tone="amber" icon="ti-clock">Chờ: {visibleAttendanceRows.length - checkedInCount - absentCount}</Badge>
              <Badge tone="rust" icon="ti-user-x">Vắng: {absentCount}</Badge>
            </div>
          </div>

          <div className="card card-pad" style={{ background: '#EFF6FF', borderColor: 'var(--blue)', fontSize: 12.5, color: '#1E3A8A' }}>
            <i className="ti ti-qrcode" style={{ marginRight: 6 }} />
            Học viên quét mã <strong>Live QR</strong> chiếu trên máy chiếu sẽ tự chuyển sang trạng thái "Đã điểm danh".
            Giảng viên có thể điểm danh thủ công tại đây cho trường hợp học viên không quét được mã.
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Học Viên</th>
                  <th>Chức Danh &amp; Chi Nhánh</th>
                  <th>Lớp Thực Hành</th>
                  <th>Ngày Học</th>
                  <th>Trạng Thái Điểm Danh</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleAttendanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-soft)' }}>
                      Không có học viên nào khớp bộ lọc.
                    </td>
                  </tr>
                ) : visibleAttendanceRows.map((row) => {
                  const state = attendanceStateOf(row);
                  return (
                    <tr key={row.key}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{row.student.name}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--ink-faint)' }}>{row.student.id}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div>{row.student.position}</div>
                        <div style={{ color: 'var(--ink-faint)', fontSize: 11 }}>{row.student.store}</div>
                      </td>
                      <td style={{ fontSize: 12.5, fontWeight: 600 }}>{row.classTitle}</td>
                      <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{row.classDate}</td>
                      <td>
                        {state === 'CONFIRMED' ? <Badge tone="sage" icon="ti-user-check">Đã điểm danh</Badge>
                          : state === 'ABSENT' ? <Badge tone="rust" icon="ti-user-x">Vắng mặt</Badge>
                            : <Badge tone="amber" icon="ti-clock">Chờ quét QR</Badge>}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Button size="sm" variant="outline" icon="ti-eye"
                          onClick={() => {
                            const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                            const found = list.find(u => u.userId === row.student.id || u.employeeCode === row.student.id || u.fullName === row.student.name) || {
                              userId: row.student.id,
                              employeeCode: row.student.id,
                              fullName: row.student.name,
                              position: row.student.position,
                              storeName: row.student.store,
                              level: '7',
                            };
                            setTranscriptUser(found);
                          }}>
                          Chi Tiết
                        </Button>{' '}
                        <Button size="sm" variant={state === 'CONFIRMED' ? 'outline' : 'primary'} icon="ti-check"
                          onClick={() => setAttendanceState(row, state === 'CONFIRMED' ? 'PENDING' : 'CONFIRMED')}>
                          {state === 'CONFIRMED' ? 'Hủy điểm danh' : 'Điểm danh'}
                        </Button>{' '}
                        <Button size="sm" variant="ghost" icon="ti-user-x" onClick={() => setAttendanceState(row, 'ABSENT')}>
                          Vắng
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CSAT FEEDBACK & RATINGS */}
      {activeTab === 'FEEDBACK' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', borderColor: 'var(--amber)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#92400E' }}>Đánh Giá Chất Lượng Giảng Dạy Của {trainerProfile.fullName} (CSAT)</div>
                <p style={{ fontSize: 12.5, color: '#B45309', margin: '4px 0 0' }}>
                  Tổng hợp từ {trainerProfile.totalLearners.toLocaleString()} phiếu khảo sát Level 1 CSAT của học viên sau khi kết thúc các lớp thực hành.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#92400E' }}>{trainerProfile.rating.toFixed(2)} <span style={{ fontSize: 20 }}>/ 5.0 ★</span></div>
                <Badge tone="amber">{Math.round(trainerProfile.rating / 5 * 1000) / 10}% Hài Lòng Rất Cao</Badge>
              </div>
            </div>
          </div>

          <div className="section-label">Nhận Xét Gần Đây Từ Học Viên Đã Tham Gia Lớp:</div>
          <div className="grid grid-2">
            {[
              {
                student: 'Trần Quốc Bảo',
                role: 'Nhân viên Quầy Bánh (MM An Phú)',
                course: 'Thực hành Vận hành Lò Nướng Bánh Công Nghiệp & HACCP',
                rating: 5,
                comment: 'Thầy Hùng hướng dẫn rất nhiệt tình, giải thích rõ cách nhận biết độ nở của bột và kiểm soát nhiệt độ lò Deck Oven để bánh không bị chai.',
                date: '2026-08-20',
              },
              {
                student: 'Sarah Johnson',
                role: 'Pastry Chef Associate (MM An Phú)',
                course: 'Quy trình Khử trùng Dụng cụ & Vệ sinh An toàn Thực phẩm',
                rating: 5,
                comment: 'Buổi thực hành rất thực tế! Thầy chỉ cho các lỗi thường gặp khi pha lóc thịt tươi và cách ghi chép biểu mẫu SOP-OMD-04B đúng chuẩn.',
                date: '2026-08-18',
              },
              {
                student: 'Lê Hoàng Nam',
                role: 'Trưởng ca Thu ngân (MM An Phú)',
                course: 'Kỹ năng Xử lý Sự cố & Thao tác Máy POS Tốc độ cao',
                rating: 4.8,
                comment: 'Bài tập tình huống giải quyết phàn nàn của khách hàng rất sinh động. Cả lớp được thực hành trực tiếp trên máy POS demo.',
                date: '2026-08-15',
              },
              {
                student: 'Nguyễn Văn Minh',
                role: 'Nhân viên Giao nhận Kho Vận (MM Bình Phú)',
                course: 'Diễn tập Thực tế PCCC & Thoát hiểm Siêu thị',
                rating: 5,
                comment: 'Được trực tiếp cầm bình chữa cháy CO2 dập lửa thật ngoài bãi tập giúp em tự tin hơn nhiều khi có sự cố tại siêu thị.',
                date: '2026-08-10',
              },
            ].map((fb, idx) => (
              <div key={idx} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{fb.student}</span>
                    <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{'★'.repeat(Math.floor(fb.rating))} {fb.rating}★</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 8 }}>{fb.role}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--rail)', marginBottom: 8 }}>Khóa: {fb.course}</div>
                  <p style={{ fontSize: 12.5, color: 'var(--ink)', fontStyle: 'italic', margin: 0, lineHeight: 1.45 }}>
                    "{fb.comment}"
                  </p>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 12, textAlign: 'right' }}>
                  {fb.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LABS & VENUES */}
      {activeTab === 'LABS' && (
        <div className="grid grid-2">
          {meetingRoomsAndLabs.map((lab) => (
            <div key={lab.id} className="card card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{lab.name}</div>
                <Badge tone="blue">Sức chứa: {lab.capacity} chỗ</Badge>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 }}>
                <i className="ti ti-map-pin" style={{ marginRight: 4 }} /> {lab.location}
              </div>
              <div className="section-label" style={{ margin: '0 0 6px', fontSize: 11 }}>Trang thiết bị chuyên dụng có sẵn:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {lab.equipment.map((eq, i) => (
                  <Badge key={i} tone="slate">{eq}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: LIVE QR ATTENDANCE DISPLAY */}
      {liveQrClass && (
        <Modal
          title={`Mã QR Điểm danh Trực tiếp tại Lớp — ${liveQrClass.code}`}
          onClose={() => setLiveQrClass(null)}
          size="md"
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
              {liveQrClass.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16 }}>
              {liveQrClass.date} ({liveQrClass.time}) &middot; {liveQrClass.venue}
            </div>

            {/* High-res Interactive QR Code Display */}
            <div style={{
              background: '#fff',
              border: '3px solid var(--rail)',
              borderRadius: 16,
              padding: 24,
              display: 'inline-block',
              boxShadow: '0 8px 30px rgba(0,122,56,0.15)',
              marginBottom: 16,
            }}>
              <div style={{
                width: 220,
                height: 220,
                background: 'linear-gradient(135deg, #007A38 0%, #004D24 100%)',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                position: 'relative',
              }}>
                <i className="ti ti-qrcode" style={{ fontSize: 140, lineHeight: 1 }} />
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, marginTop: 4, background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4 }}>
                  SCAN WITH MEGALEARN APP
                </div>
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rail)', marginBottom: 6 }}>
              <i className="ti ti-broadcast" style={{ marginRight: 6 }} /> Mã QR Đang Phát Trực Tiếp (Live Token)
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', maxWidth: 420, margin: '0 auto 16px', lineHeight: 1.45 }}>
              Giảng viên mở màn hình này trên máy chiếu tại lớp học. Học viên mở ứng dụng MM MegaLearn trên điện thoại để quét mã điểm danh và nhận <strong>+150 XP</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Button variant="ghost" onClick={() => setLiveQrClass(null)}>Đóng Màn Hình</Button>
              <Button variant="primary" icon="ti-users" onClick={() => { const c = liveQrClass; setLiveQrClass(null); openRosterModal(c); }}>
                Xem Danh Sách Đã Điểm Danh ({liveQrClass.enrolledStudents?.filter((s) => s.attendance === 'CONFIRMED').length || 18})
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: STUDENT ROSTER & MANUAL ATTENDANCE TOGGLE */}
      {rosterClass && (
        <Modal
          title={`Danh Sách Học Viên Tham Gia — ${rosterClass.title}`}
          onClose={() => setRosterClass(null)}
          size="lg"
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                <strong>{activeRoster.filter((s) => s.attendance === 'CONFIRMED').length}</strong> / {activeRoster.length} học viên đã có mặt
              </div>
              <input
                type="text"
                className="field-input"
                placeholder="Tìm học viên theo tên hoặc mã NV..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                style={{ maxWidth: 260 }}
              />
            </div>

            <table className="table" style={{ width: '100%', marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>Mã Nhân Viên</th>
                  <th>Họ và Tên</th>
                  <th>Chức Danh &amp; Bộ Phận</th>
                  <th>Siêu Thị / Chi Nhánh</th>
                  <th style={{ textAlign: 'center' }}>Trạng Thái Điểm Danh</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác Thủ Công</th>
                </tr>
              </thead>
              <tbody>
                {activeRoster
                  .filter((s) => !rosterSearch || s.name.toLowerCase().includes(rosterSearch.toLowerCase()) || s.id.toLowerCase().includes(rosterSearch.toLowerCase()))
                  .map((student) => {
                    const isAttended = student.attendance === 'CONFIRMED';
                    return (
                      <tr key={student.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{student.id}</td>
                        <td style={{ fontWeight: 700 }}>{student.name}</td>
                        <td style={{ color: 'var(--ink-soft)' }}>{student.position}</td>
                        <td>{student.store}</td>
                        <td style={{ textAlign: 'center' }}>
                          <Badge tone={isAttended ? 'sage' : 'amber'} icon={isAttended ? 'ti-check' : 'ti-clock'}>
                            {isAttended ? 'Đã Điểm Danh' : 'Chưa Có Mặt'}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            size="sm"
                            variant={isAttended ? 'ghost' : 'primary'}
                            icon={isAttended ? 'ti-x' : 'ti-check'}
                            onClick={() => toggleAttendance(student.id)}
                          >
                            {isAttended ? 'Hủy Điểm Danh' : 'Tích Có Mặt'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="primary" onClick={() => setRosterClass(null)}>Hoàn Tất Điểm Danh</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: SYLLABUS & CLASS MATERIALS */}
      {materialsClass && (
        <Modal
          title={`Giáo Trình & Tài Liệu Giảng Dạy — ${materialsClass.title}`}
          onClose={() => setMaterialsClass(null)}
          size="md"
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)', marginBottom: 8 }}>
              <i className="ti ti-list-check" style={{ marginRight: 6 }} /> Khung Chương Trình Buổi Học (Session Agenda)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {materialsClass.syllabus?.map((item, idx) => (
                <div key={idx} style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>{item.step}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>{item.detail}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rail)', marginBottom: 8 }}>
              <i className="ti ti-paperclip" style={{ marginRight: 6 }} /> Tài Liệu &amp; Slide Đính Kèm (Class Attachments)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {materialsClass.materials?.map((mat, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '8px 12px' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                    <i className={mat.type === 'PDF' ? 'ti ti-file-type-pdf' : 'ti ti-file-type-ppt'} style={{ color: mat.type === 'PDF' ? 'var(--rust)' : 'var(--amber)', marginRight: 6 }} />
                    {mat.name}
                  </span>
                  <Badge tone="slate">{mat.type}</Badge>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={() => setMaterialsClass(null)}>Đóng</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* USER TRANSCRIPT DRILL-DOWN MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
      />
    </>
  );
}
