import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  meetingRoomsAndLabs,
  classroomSessions,
  allUsers,
  teachingEligibleUsers,
  trainerStatsFor,
} from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { Badge, Button, Modal, ProgressBar, DonutChart, BarChart, LineChart } from '../../features/common/ui';
import { normalizeRole, hasCapability, roleDefinition } from '../../data/roles';
import UserTranscriptModal from '../../features/common/UserTranscriptModal';
import {
  generateQrToken,
  currentBucket,
  secondsUntilNextBucket,
  sessionQrSecret,
  deriveAttendanceWindows,
} from '../../utils/qrAttendance';
import {
  courseIntakes, nextOpenIntake, intakeDateRange, scheduleSummary, formatSessionDate,
} from '../../utils/classSchedule';

function QrCodeDisplay({ value }) {
  const [dataUrl, setDataUrl] = useState('');
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: 220, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);
  if (!dataUrl) return <div style={{ width: 220, height: 220, margin: '0 auto' }} />;
  return (
    <img
      src={dataUrl}
      alt="Live attendance QR code"
      style={{ width: 220, height: 220, margin: '0 auto', display: 'block', borderRadius: 8 }}
    />
  );
}

export default function TrainerHub({ initialTab = 'CLASSES' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewUserId = searchParams.get('viewUserId');

  const { courses, currentUser: authUser, users, removeCourse } = useCourseStore();
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, UPCOMING, COMPLETED
  const [classSearch, setClassSearch] = useState('');
  const [classModalityFilter, setClassModalityFilter] = useState('ALL');
  const [classGroupBy, setClassGroupBy] = useState('NONE');
  const [transcriptUser, setTranscriptUser] = useState(null);
  const [activeChartTab, setActiveChartTab] = useState('BAR'); // 'BAR' | 'LINE'

  const authRole = normalizeRole(authUser?.role);
  const canManageUsers = hasCapability(authRole, 'canManageUsers');
  const isAdminView = Boolean(canManageUsers && viewUserId);
  const canBeAssignedToClass = hasCapability(authRole, 'canBeAssignedToClass');

  const eligibleTrainers = teachingEligibleUsers();
  const [selectedTrainerId, setSelectedTrainerId] = useState(
    (isAdminView && viewUserId) || authUser?.userId || eligibleTrainers[0]?.userId
  );
  useEffect(() => {
    if (isAdminView && viewUserId) {
      setSelectedTrainerId(viewUserId);
    } else if (authUser?.userId) {
      setSelectedTrainerId(authUser.userId);
    }
  }, [isAdminView, viewUserId, authUser?.userId]);

  const trainerUser = eligibleTrainers.find((t) => t.userId === selectedTrainerId) || eligibleTrainers[0] || authUser;
  const trainerProfile = { ...trainerUser, ...trainerStatsFor(trainerUser?.userId) };

  // Filter in-person courses taught specifically by selected trainer
  const inPersonCourses = courses.filter((c) => c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB');

  // The trainer's OWN in-person courses — the ones they created and may therefore edit or
  // delete. User Admin / System Admin manage every in-person course from the catalog page
  // instead; a trainer only ever sees their own here.
  const isFullAdmin = hasCapability(authRole, 'canAuthorOnlineCourses');
  const myAuthoredCourses = inPersonCourses.filter((c) =>
    isFullAdmin ? true : c.createdBy === authUser?.userId
  );
  const [courseSearch, setCourseSearch] = useState('');
  const filteredAuthoredCourses = myAuthoredCourses.filter((c) => {
    if (!courseSearch.trim()) return true;
    const q = courseSearch.toLowerCase().trim();
    return [c.title, c.code, c.category, c.venue].some((v) => String(v || '').toLowerCase().includes(q));
  });

  // Live online classes (Virtual Class) hosted by this trainer
  const virtualClassCourses = courses

    .filter((c) => c.deliveryType === 'ONLINE_ELEARNING' && c.onlineClassType === 'VIRTUAL_CLASS')
    .filter((c) => c.virtualMeeting?.instructorId === trainerProfile.userId || c.trainerName === trainerProfile.fullName)
    .map((c) => {
      const platformLabel = { TEAMS: 'Microsoft Teams', ZOOM: 'Zoom', MEET: 'Google Meet', WEBEX: 'Cisco Webex', CUSTOM: 'Online platform' }[c.virtualMeeting?.platform] || 'Microsoft Teams';
      return {
        ...c,
        isVirtual: true,
        meetingUrl: c.virtualMeeting?.meetingUrl,
        date: c.virtualMeeting?.scheduleDate,
        time: c.virtualMeeting?.scheduleTime,
        venue: `${platformLabel} (Live Virtual Class)`,
        maxCapacity: c.virtualMeeting?.maxCapacity || c.maxCapacity,
        status: c.virtualMeeting?.status || 'UPCOMING',
        materials: (c.virtualMeeting?.materials || []).map((m) => ({ name: m.name, type: 'LINK' })),
      };
    });

  const allLearnerCandidates = (users && users.length > 0 ? users : (typeof allUsers === 'function' ? allUsers() : (allUsers || []))).filter((u) => normalizeRole(u.role) === 'learner' || normalizeRole(u.role) === 'manager');

  const myTeachingClasses = [
    ...classroomSessions.filter((s) =>
      s.trainerId === trainerProfile.userId ||
      s.trainerName === trainerProfile.fullName ||
      (s.coTrainerIds && s.coTrainerIds.includes(trainerProfile.userId)) ||
      (s.coTrainers && s.coTrainers.some((ct) => (ct.userId || ct.id) === trainerProfile.userId))
    ),
    ...inPersonCourses.filter((c) =>
      (c.trainerId === trainerProfile.userId ||
      c.trainerName === trainerProfile.fullName ||
      (c.coTrainerIds && c.coTrainerIds.includes(trainerProfile.userId)) ||
      (c.coTrainers && c.coTrainers.some((ct) => (ct.userId || ct.id) === trainerProfile.userId))) &&
      !classroomSessions.some((s) => s.title === c.title)
    ),
    ...virtualClassCourses,
  ].map((c, cIdx) => {
    const isLead = (c.trainerId === trainerProfile.userId || c.trainerName === trainerProfile.fullName);
    const targetCount = c.enrolledCount || (cIdx === 0 ? 52 : cIdx === 1 ? 21 : 18);
    const capacity = c.maxCapacity || (cIdx === 0 ? 60 : cIdx === 1 ? 100 : 25);
    
    // Generate realistic roster matching targetCount
    const students = (c.enrolledStudents && c.enrolledStudents.length >= targetCount)
      ? c.enrolledStudents
      : Array.from({ length: targetCount }, (_, i) => {
          const baseUser = allLearnerCandidates[i % allLearnerCandidates.length] || { fullName: `Learner ${i + 1}`, employeeCode: `MMVN-${2000 + i}`, position: 'Front-Line Employee', storeName: 'MM An Phu' };
          const isPending = i % 7 === 0 || i % 11 === 0;
          return {
            id: baseUser.employeeCode || `MMVN-${1000 + i}`,
            name: baseUser.fullName,
            position: baseUser.position || 'Sales Executive',
            store: baseUser.storeName || baseUser.department || 'MM An Phu',
            attendance: isPending ? 'PENDING' : 'CONFIRMED',
          };
        });

    return {
      id: c.id,
      code: c.code || `WS-${c.id}`,
      title: c.title,
      category: c.category,
      isVirtual: c.isVirtual || false,
      meetingUrl: c.meetingUrl || (c.isVirtual ? 'https://teams.microsoft.com/l/meetup-join/mmvn-virtual-class' : null),
      isLeadTrainer: isLead,
      coTrainers: c.coTrainers || [],
      coTrainerNames: c.coTrainerNames || [],
      trainerName: c.trainerName || trainerProfile.fullName,
      trainerTitle: c.trainerTitle || roleDefinition(trainerProfile.role).labelVi,
      date: c.date || c.scheduleDate || '2026-09-05',
      time: c.time || c.scheduleTime || '08:30 - 11:30 (3.0 hours)',
      venue: c.venue || 'Fresh Food & Bakery Practical Lab (MM An Phu)',
      maxCapacity: capacity,
      enrolledCount: targetCount,
      status: c.status || 'UPCOMING',
      qrToken: c.qrToken || `MMVN-QR-${c.code || c.id}-LIVE`,
      description: c.description || 'Hands-on cleaning and sanitizing of the dough mixer, plus calibrating the industrial oven temperature and pressure to the Gold HACCP standard.',
      syllabus: [
        { step: 'Part 1: Preparation & Hygiene Safety Briefing (30 minutes)', detail: 'Gold HACCP hygiene rules and core temperature checks on the chiller holding fresh ingredients.' },
        { step: 'Part 2: Hands-On Oven Operation In The Workshop (90 minutes)', detail: 'Operating the industrial deck oven, kneading dough & calibrating French bread baking recipes.' },
        { step: 'Part 3: Evaluating The Bake & Sanitizing The Equipment (60 minutes)', detail: 'Checking the crispness of the bread, sanitizing the deck oven & finalizing the attendance sheet.' },
      ],
      materials: (c.materials && c.materials.length > 0) ? c.materials : [
        { name: 'SOP-OMD-04B: Deck Oven Operating Guide (PDF)', type: 'PDF', size: '2.4 MB' },
        { name: 'Lecture Slides: Controlling Cross-Contamination Risk (PPT)', type: 'PPT', size: '8.1 MB' },
        { name: 'Food Safety Hygiene Standard Checklist Form (PDF)', type: 'PDF', size: '1.1 MB' },
      ],
      enrolledStudents: students,
    };
  });

  const TRAINER_GROUP_BY_OPTIONS = [
    { id: 'NONE', label: 'No grouping' },
    { id: 'MODALITY', label: 'By Delivery Format' },
    { id: 'STATUS', label: 'By Class Status' },
  ];

  const filteredClasses = myTeachingClasses.filter((cls) => {
    if (statusFilter === 'UPCOMING' && !(cls.status === 'UPCOMING' || cls.status === 'OPEN')) return false;
    if (statusFilter === 'COMPLETED' && cls.status !== 'COMPLETED') return false;
    if (classModalityFilter === 'IN_PERSON' && cls.isVirtual) return false;
    if (classModalityFilter === 'VIRTUAL' && !cls.isVirtual) return false;
    if (classSearch) {
      const q = classSearch.toLowerCase().trim();
      const titleMatch = cls.title?.toLowerCase().includes(q);
      const codeMatch = cls.code?.toLowerCase().includes(q);
      const venueMatch = cls.venue?.toLowerCase().includes(q);
      const catMatch = cls.category?.toLowerCase().includes(q);
      if (!titleMatch && !codeMatch && !venueMatch && !catMatch) return false;
    }
    return true;
  });

  // A consolidated attendance sheet across every class this trainer leads.
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

  // Attendance status overridden by the trainer during the session.
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
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState('ALL'); // ALL | CONFIRMED | PENDING
  const [activeRoster, setActiveRoster] = useState([]);
  const [qrPhase, setQrPhase] = useState('CHECKIN');
  const [nowTick, setNowTick] = useState(Date.now());
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (!liveQrClass) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [liveQrClass]);

  // Trainer Custom Materials & Syllabus State
  const [classMaterialsMap, setClassMaterialsMap] = useState({});
  const [classSyllabusMap, setClassSyllabusMap] = useState({});
  const [trainerNewMatName, setTrainerNewMatName] = useState('');
  const [trainerNewMatType, setTrainerNewMatType] = useState('PDF');
  const [trainerNewMatSize, setTrainerNewMatSize] = useState('2.4 MB');
  const [trainerAddingStep, setTrainerAddingStep] = useState(false);
  const [trainerNewStepTitle, setTrainerNewStepTitle] = useState('');
  const [trainerNewStepDetail, setTrainerNewStepDetail] = useState('');

  function openLiveQrModal(cls) {
    setLiveQrClass(cls);
    setQrPhase('CHECKIN');
    setNowTick(Date.now());
    setCopiedToken(false);
  }

  function openRosterModal(cls) {
    setRosterClass(cls);
    setActiveRoster(cls.enrolledStudents || []);
    setRosterSearch('');
    setRosterFilter('ALL');
  }

  function openMaterialsModal(cls) {
    setMaterialsClass(cls);
    setPreviewMaterial(null);
    setTrainerAddingStep(false);
    setTrainerNewMatName('');
    setTrainerNewStepTitle('');
    setTrainerNewStepDetail('');
  }

  function getSyllabusForClass(cls) {
    if (!cls) return [];
    return classSyllabusMap[cls.id] || cls.syllabus || [];
  }

  function getMaterialsForClass(cls) {
    if (!cls) return [];
    return classMaterialsMap[cls.id] || cls.materials || [];
  }

  function handleTrainerAddMaterial(clsId) {
    if (!trainerNewMatName.trim()) return;
    const newMat = {
      id: `mat-tr-${Date.now()}`,
      name: trainerNewMatName.trim(),
      type: trainerNewMatType,
      size: trainerNewMatSize || '2.0 MB',
      url: '#',
      uploadedBy: authUser?.fullName || 'Trainer',
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    setClassMaterialsMap((prev) => {
      const currentList = prev[clsId] || (materialsClass?.materials || []);
      return { ...prev, [clsId]: [...currentList, newMat] };
    });
    setTrainerNewMatName('');
  }

  function handleTrainerRemoveMaterial(clsId, matId) {
    setClassMaterialsMap((prev) => {
      const currentList = prev[clsId] || (materialsClass?.materials || []);
      return { ...prev, [clsId]: currentList.filter((m) => m.id !== matId) };
    });
  }

  function handleTrainerAddSyllabusStep(clsId) {
    if (!trainerNewStepTitle.trim()) return;
    const newStep = {
      step: trainerNewStepTitle.trim(),
      detail: trainerNewStepDetail.trim() || 'Practical content and assessment criteria.',
    };
    setClassSyllabusMap((prev) => {
      const currentList = prev[clsId] || (materialsClass?.syllabus || []);
      return { ...prev, [clsId]: [...currentList, newStep] };
    });
    setTrainerNewStepTitle('');
    setTrainerNewStepDetail('');
    setTrainerAddingStep(false);
  }

  function handleTrainerRemoveSyllabusStep(clsId, stepIndex) {
    setClassSyllabusMap((prev) => {
      const currentList = prev[clsId] || (materialsClass?.syllabus || []);
      return { ...prev, [clsId]: currentList.filter((_, idx) => idx !== stepIndex) };
    });
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

  function checkInAll() {
    setActiveRoster((prev) => prev.map((s) => ({ ...s, attendance: 'CONFIRMED' })));
  }

  function handleCopyToken(token) {
    navigator.clipboard?.writeText?.(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  }

  if (!canBeAssignedToClass && !isAdminView) {
    return (
      <div className="empty-state">
        <i className="ti ti-lock" aria-hidden="true" style={{ color: 'var(--rust)' }} />
        <p>Your role is not assigned to teach classes.</p>
      </div>
    );
  }

  // Donut chart data: distribution of learner CSAT ratings
  const csatDonutData = [
    { label: '5 Stars (Very Satisfied)', value: 82, tone: 'sage' },
    { label: '4 Stars (Satisfied)', value: 15, tone: 'blue' },
    { label: '3 Stars (Meets Expectations)', value: 3, tone: 'amber' },
  ];

  // Bar chart data: learner count per practice class
  const classLearnersData = myTeachingClasses.slice(0, 5).map((cls, idx) => ({
    label: cls.title.length > 22 ? cls.title.slice(0, 22) + '...' : cls.title,
    value: cls.enrolledCount || (idx === 0 ? 52 : idx === 1 ? 45 : 38),
    tone: 'rail',
  }));

  // Line chart data: CSAT score trend over 4 months
  const csatMonthlyTrend = [
    { label: 'May', value: 4.75 },
    { label: 'June', value: 4.80 },
    { label: 'July', value: 4.85 },
    { label: 'August', value: trainerProfile.rating || 4.88 },
  ];

  return (
    <>
      {/* 0. ADMIN READ-ONLY OVERSIGHT BANNER */}
      {isAdminView && (
        <div
          className="card card-pad"
          style={{
            marginBottom: 20,
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            borderColor: '#3B82F6',
            borderWidth: 2,
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--blue, #005BAA)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0, 91, 170, 0.3)',
              }}
            >
              <i className="ti ti-eye" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#1E3A8A' }}>Admin View Mode &mdash; Read Only</span>
                <Badge tone="blue">Inspecting: {trainerProfile.fullName}</Badge>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#1E40AF' }}>
                Viewing live teaching command center of <strong>{trainerProfile.fullName}</strong> ({trainerProfile.position || 'Trainer'}, {trainerProfile.departmentName || trainerProfile.divisionName || 'L&D Faculty'}).
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            icon="ti-arrow-left"
            onClick={() => {
              if (authRole === 'sysadmin') navigate('/sysadmin/team-performance');
              else navigate('/user-admin/team-performance');
            }}
            style={{ background: '#1D4ED8', borderColor: '#1D4ED8', fontWeight: 700 }}
          >
            Back to Team Performance
          </Button>
        </div>
      )}

      {/* 1. EXECUTIVE TRAINER PROFILE BANNER */}
      <div
        className="card card-pad"
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, var(--paper-raised) 0%, var(--sage-soft) 100%)',
          borderColor: 'var(--sage, #10B981)',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #065F46 0%, var(--sage, #059669) 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 20,
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                flexShrink: 0,
              }}
            >
              {trainerProfile.avatar || trainerProfile.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
                  Teaching &amp; Practice Class Dashboard
                </h1>
                <Badge tone="sage" icon="ti-school">
                  {roleDefinition(trainerProfile.role).labelVi}
                </Badge>
                <Badge tone="amber" icon="ti-star">
                  ★ {trainerProfile.rating.toFixed(2)} / 5.0 CSAT
                </Badge>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  Trainer: <strong>{trainerProfile.fullName}</strong> &middot; {trainerProfile.position || 'L&D Training Specialist'} &middot; Trainer code: <strong>{trainerProfile.employeeCode || 'MMVN-9005'}</strong>
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>|</span>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Switch the teaching schedule view:</span>
                <select
                  className="field-select"
                  style={{ height: 28, fontSize: 12, fontWeight: 700, borderColor: 'var(--sage)', background: 'var(--paper-raised)', padding: '2px 8px' }}
                  value={selectedTrainerId}
                  onChange={(e) => setSelectedTrainerId(e.target.value)}
                >
                  {eligibleTrainers.map((t) => (
                    <option key={t.userId} value={t.userId}>
                      {t.fullName} &mdash; {roleDefinition(t.role).shortVi}
                      {t.userId === authUser?.userId ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
              View The Personal Interface
            </Button>
            <Button variant="primary" tone="sage" icon="ti-plus" onClick={() => navigate('/admin/courses/new')}>
              Create An In-Person Course
            </Button>
          </div>
        </div>
      </div>

      {/* 2. FOUR HERO TEACHING METRIC TILES */}
      <div className="grid grid-4" style={{ marginBottom: 24, gap: 16 }}>
        <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>Average CSAT Rating</div>
            <div className="stat-icon-badge" style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', width: 36, height: 36, fontSize: 18, borderRadius: 8 }}>
              <i className="ti ti-star" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>★ {trainerProfile.rating.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Top 5% of trainers</div>
        </div>

        <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>Total Sessions Taught</div>
            <div className="stat-icon-badge" style={{ background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', width: 36, height: 36, fontSize: 18, borderRadius: 8 }}>
              <i className="ti ti-school" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage)' }}>{trainerProfile.totalClassesTaught} Sessions</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>186.5 cumulative teaching hours</div>
        </div>

        <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>Learners Trained</div>
            <div className="stat-icon-badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', width: 36, height: 36, fontSize: 18, borderRadius: 8 }}>
              <i className="ti ti-users" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>{trainerProfile.totalLearners.toLocaleString()} Learner</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>96.2% met the examination standard</div>
        </div>

        <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>Classes In Progress</div>
            <div className="stat-icon-badge" style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', width: 36, height: 36, fontSize: 18, borderRadius: 8 }}>
              <i className="ti ti-chalkboard" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>{myTeachingClasses.length} Classes</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>3 Workshop · 3 Webinar Online</div>
        </div>
      </div>

      {/* 3. DUAL-CHART TEACHING QUALITY & CSAT ANALYTICS */}
      <div className="grid grid-2" style={{ gap: 20, marginBottom: 24, alignItems: 'start' }}>
        {/* CHART 1: CSAT RATING DISTRIBUTION (DONUT CHART) */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-star" style={{ marginRight: 6, color: 'var(--amber)' }} />
                Learner CSAT Rating Distribution
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Survey responses by star rating (142 responses)
              </div>
            </div>
            <Badge tone="amber">★ {trainerProfile.rating.toFixed(2)} / 5.0</Badge>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', minHeight: 180, marginBottom: 10 }}>
            <DonutChart data={csatDonutData} valueSuffix="%" />
          </div>

          <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12, color: 'var(--ink)' }}>Share of highly satisfied learners (&ge;4 stars):</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--sage)' }}>97.0%</span>
          </div>
        </div>

        {/* CHART 2: CLASS ROSTER & CSAT TREND (BAR & LINE SWITCHER) */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-chart-bar" style={{ marginRight: 6, color: 'var(--rail)' }} />
                Class Size &amp; CSAT Trend
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                The number of learners assigned to the class and the teaching quality
              </div>
            </div>

            {/* SWITCHER */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveChartTab('BAR')}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: activeChartTab === 'BAR' ? 'var(--rail)' : 'transparent',
                  color: activeChartTab === 'BAR' ? '#fff' : 'var(--ink-soft)',
                  border: 'none',
                }}
                title="Bar chart by class"
              >
                📊 Classes
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveChartTab('LINE')}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: activeChartTab === 'LINE' ? 'var(--amber)' : 'transparent',
                  color: activeChartTab === 'LINE' ? '#fff' : 'var(--ink-soft)',
                  border: 'none',
                }}
                title="CSAT trend line chart"
              >
                📈 CSAT Trend
              </button>
            </div>
          </div>

          <div style={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            {activeChartTab === 'BAR' ? (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Registered Learners Per Class (people)
                </div>
                <BarChart data={classLearnersData} valueSuffix=" learners" tone="rail" />
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  CSAT Score Trend Over The Last 4 Months (5.0 Scale)
                </div>
                <LineChart data={csatMonthlyTrend} valueSuffix="★" tone="amber" />
              </div>
            )}
          </div>

          <div style={{ background: 'var(--sage-soft)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink)' }}>
              <i className="ti ti-trending-up" style={{ color: 'var(--sage)', fontSize: 16 }} />
              The CSAT score is rising steadily <strong>+0.13★</strong> versus the start of the quarter.
            </div>
            <Badge tone="sage">Master Standard Achieved</Badge>
          </div>
        </div>
      </div>

      {/* 4. TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'CLASSES', label: 'Classes I Teach', icon: 'ti-chalkboard', count: myTeachingClasses.length },
          { id: 'MY_COURSES', label: 'My In-Person Courses', icon: 'ti-folder', count: myAuthoredCourses.length },
          { id: 'ATTENDANCE', label: 'Learner Attendance Management', icon: 'ti-user-check', count: totalRosterCount },
          { id: 'FEEDBACK', label: 'CSAT Ratings & Learner Feedback', icon: 'ti-star', count: `${trainerProfile.rating}★` },
          { id: 'LABS', label: 'Store Practice Workshop Directory', icon: 'ti-building', count: meetingRoomsAndLabs.length },
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
              fontSize: 11,
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
          {/* STANDARDIZED FILTER TOOLBAR CARD */}
          <div className="card card-pad" style={{ marginBottom: 20, background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
            {/* ROW 1: SEARCH & MODALITY */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 12 }}>
              {/* Search input */}
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 36, paddingRight: classSearch ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                  placeholder="Search by class name, class code, training venue..."
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                />
                {classSearch && (
                  <button
                    type="button"
                    onClick={() => setClassSearch('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
                  >
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Group By */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Group by:</span>
                  <select
                    value={classGroupBy}
                    onChange={(e) => setClassGroupBy(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: 13,
                      fontWeight: classGroupBy !== 'NONE' ? 700 : 500,
                      color: classGroupBy !== 'NONE' ? 'var(--blue, #005BAA)' : 'var(--ink)',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="NONE">No grouping</option>
                    <option value="MODALITY">By Type</option>
                    <option value="STATUS">By Status</option>
                  </select>
                </div>

                {/* Modality Filter */}
                <div style={{ minWidth: 200 }}>
                  <select
                    className="field-select"
                    style={{
                      width: '100%',
                      height: 38,
                      fontSize: 13,
                      borderRadius: 8,
                      background: classModalityFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                      borderColor: classModalityFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                      color: classModalityFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                      fontWeight: classModalityFilter !== 'ALL' ? 700 : 500,
                    }}
                    value={classModalityFilter}
                    onChange={(e) => setClassModalityFilter(e.target.value)}
                  >
                    <option value="ALL">All delivery formats</option>
                    <option value="IN_PERSON">🏪 Store Workshop Practice</option>
                    <option value="VIRTUAL">💻 Live Online (Teams/Zoom)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* STATUS FILTER PILLS */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All Classes', count: myTeachingClasses.length },
                { id: 'UPCOMING', label: 'Upcoming Classes', count: myTeachingClasses.filter(c => c.status === 'UPCOMING' || c.status === 'OPEN').length },
                { id: 'COMPLETED', label: 'Classes Completed', count: myTeachingClasses.filter(c => c.status === 'COMPLETED').length },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`btn btn-sm ${statusFilter === st.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    borderRadius: 20,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderColor: statusFilter === st.id ? 'var(--blue)' : 'var(--line)',
                    background: statusFilter === st.id ? 'var(--blue)' : 'transparent',
                    color: statusFilter === st.id ? '#fff' : 'var(--ink)',
                    fontWeight: statusFilter === st.id ? 700 : 500,
                  }}
                >
                  {st.label}
                  <span style={{
                    background: statusFilter === st.id ? 'rgba(255,255,255,0.3)' : 'var(--paper-sunken)',
                    color: statusFilter === st.id ? '#fff' : 'var(--ink-soft)',
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {st.count}
                  </span>
                </button>
              ))}
            </div>

            {/* ACTIVE FILTER TAGS & RESET */}
            {(classSearch || statusFilter !== 'ALL' || classModalityFilter !== 'ALL') && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Filtering by:</span>
                  {classSearch && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Search term: <strong>"{classSearch}"</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setClassSearch('')} />
                    </span>
                  )}
                  {statusFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Status: <strong>{statusFilter === 'UPCOMING' ? 'Upcoming' : 'Completed'}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
                    </span>
                  )}
                  {classModalityFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Format: <strong>{classModalityFilter === 'IN_PERSON' ? 'Workshop practice' : 'Online Webinar'}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setClassModalityFilter('ALL')} />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setClassSearch(''); setStatusFilter('ALL'); setClassModalityFilter('ALL'); }}
                    style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
                  >
                    Clear all filters
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Found <strong>{filteredClasses.length}</strong> / {myTeachingClasses.length} classes
                </div>
              </div>
            )}
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
                    background: isUpcoming ? 'linear-gradient(180deg, var(--paper-raised) 0%, var(--blue-soft) 100%)' : 'var(--paper-raised)',
                    padding: 20,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {cls.isVirtual ? (
                          <Badge tone="amber" icon="ti-video">💻 Online Class (Zoom/Teams)</Badge>
                        ) : (
                          <Badge tone="blue" icon="ti-building-store">Hands-On Training (In-Person ILT)</Badge>
                        )}
                        <Badge tone={isUpcoming ? 'amber' : 'sage'}>
                          {isUpcoming ? 'Upcoming' : 'Completed'}
                        </Badge>
                        <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>Code: {cls.code}</span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>{cls.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span><i className="ti ti-calendar" style={{ marginRight: 4, color: 'var(--blue)' }} /> <strong>Time:</strong> {cls.date} ({cls.time})</span>
                        <span><i className="ti ti-map-pin" style={{ marginRight: 4, color: 'var(--rust)' }} /> <strong>Location:</strong> {cls.venue}</span>
                        <span><i className="ti ti-user" style={{ marginRight: 4, color: 'var(--rail)' }} /> <strong>Trainer:</strong> {cls.trainerName}</span>
                      </div>
                    </div>

                    {/* Action buttons for Trainer */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {cls.isVirtual ? (
                        <Button
                          variant="primary"
                          icon="ti-video"
                          onClick={() => window.open(cls.meetingUrl, '_blank', 'noopener,noreferrer')}
                          disabled={!cls.meetingUrl}
                        >
                          Host The Class (Host Meeting)
                        </Button>
                      ) : null}
                      {cls.isVirtual ? (
                        <Button
                          variant="outline"
                          icon="ti-qrcode"
                          onClick={() => openLiveQrModal(cls)}
                        >
                          Project The Live Attendance QR
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          icon="ti-qrcode"
                          onClick={() => openLiveQrModal(cls)}
                        >
                          Open The Live Attendance QR
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        icon="ti-users"
                        onClick={() => openRosterModal(cls)}
                      >
                        Learner list ({cls.enrolledCount}/{cls.maxCapacity})
                      </Button>
                      <Button
                        variant="outline"
                        icon="ti-file-text"
                        onClick={() => openMaterialsModal(cls)}
                      >
                        Syllabus &amp; Slides
                      </Button>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--ink)', margin: '0 0 12px', lineHeight: 1.5 }}>
                    {cls.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-raised)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 420 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>L&amp;D learners assigned to the class:</span>
                      <ProgressBar value={fillPercent} tone={fillPercent >= 80 ? 'sage' : 'blue'} size="sm" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{cls.enrolledCount} / {cls.maxCapacity} seats ({fillPercent}%)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--ink-soft)' }}>
                      <span><i className="ti ti-circle-check" style={{ color: 'var(--sage)' }} /> <strong>{cls.enrolledStudents.filter((s) => s.attendance === 'CONFIRMED').length}</strong> Present</span>
                      <span><i className="ti ti-clock" style={{ color: 'var(--amber)' }} /> <strong>{cls.enrolledStudents.filter((s) => s.attendance !== 'CONFIRMED').length}</strong> Not checked in</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* TAB 2: LEARNER ATTENDANCE MANAGEMENT */}
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
                <option value="ALL">All classes I teach ({myTeachingClasses.length})</option>
                {myTeachingClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.title} — {cls.date}</option>
                ))}
              </select>
              <input
                type="text"
                className="field-input"
                style={{ width: 260 }}
                placeholder="Search learners by name or employee code..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Badge tone="sage" icon="ti-user-check">Checked in: {checkedInCount}</Badge>
              <Badge tone="amber" icon="ti-clock">Pending: {visibleAttendanceRows.length - checkedInCount - absentCount}</Badge>
              <Badge tone="rust" icon="ti-user-x">Absent: {absentCount}</Badge>
            </div>
          </div>

          <div className="card card-pad" style={{ background: 'var(--blue-soft)', borderColor: 'var(--blue)', fontSize: 13, color: 'var(--blue-soft-text)' }}>
            <i className="ti ti-qrcode" style={{ marginRight: 6 }} />
            The learner scans the code <strong>Live QR</strong> shown on the projector to flip automatically to "Attendance recorded".
            The trainer can mark attendance manually here if a learner cannot scan the code.
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Job Title &amp; Branch</th>
                  <th>Practice Class</th>
                  <th>Class Date</th>
                  <th>Attendance Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleAttendanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-soft)' }}>
                      No learner matches the filters.
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
                      <td style={{ fontSize: 13, fontWeight: 600 }}>{row.classTitle}</td>
                      <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{row.classDate}</td>
                      <td>
                        {state === 'CONFIRMED' ? <Badge tone="sage" icon="ti-user-check">Attendance recorded</Badge>
                          : state === 'ABSENT' ? <Badge tone="rust" icon="ti-user-x">Absent</Badge>
                            : <Badge tone="amber" icon="ti-clock">Awaiting QR scan</Badge>}
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
                          Details
                        </Button>{' '}
                        <Button size="sm" variant={state === 'CONFIRMED' ? 'outline' : 'primary'} icon="ti-check"
                          onClick={() => setAttendanceState(row, state === 'CONFIRMED' ? 'PENDING' : 'CONFIRMED')}>
                          {state === 'CONFIRMED' ? 'Undo check-in' : 'Attendance'}
                        </Button>{' '}
                        <Button size="sm" variant="ghost" icon="ti-user-x" onClick={() => setAttendanceState(row, 'ABSENT')}>
                          Absent
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
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--amber-soft-text)' }}>Teaching Quality Rating For {trainerProfile.fullName} (CSAT)</div>
                <p style={{ fontSize: 13, color: 'var(--amber-soft-text)', margin: '4px 0 0' }}>
                  Aggregated from {trainerProfile.totalLearners.toLocaleString()} learner Level 1 CSAT responses collected after practice classes.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--amber-soft-text)' }}>{trainerProfile.rating.toFixed(2)} <span style={{ fontSize: 20 }}>/ 5.0 ★</span></div>
                <Badge tone="amber">{Math.round(trainerProfile.rating / 5 * 1000) / 10}% Highly Satisfied</Badge>
              </div>
            </div>
          </div>

          <div className="section-label">Recent Comments From Learners Who Attended:</div>
          <div className="grid grid-2">
            {[
              {
                student: 'Trần Quốc Bảo',
                role: 'Bakery Counter Associate (MM An Phu)',
                course: 'Industrial Bread Oven Operation Practice & HACCP',
                rating: 5,
                comment: 'Trainer Hung was very enthusiastic; he explained clearly how to judge dough rise and control the deck oven temperature so the bread does not go tough.',
                date: '2026-08-20',
              },
              {
                student: 'Sarah Johnson',
                role: 'Pastry Chef Associate (MM An Phu)',
                course: 'Tool Sanitizing & Food Hygiene Safety Procedure',
                rating: 5,
                comment: 'A very practical session! The trainer pointed out the common mistakes in butchery and how to fill in form SOP-OMD-04B correctly.',
                date: '2026-08-18',
              },
              {
                student: 'Lê Hoàng Nam',
                role: 'Cashier Shift Leader (MM An Phu)',
                course: 'Incident Handling Skills & High-Speed POS Operation',
                rating: 4.8,
                comment: 'The customer complaint role-play exercises were lively. The whole class practised directly on a demo POS terminal.',
                date: '2026-08-15',
              },
              {
                student: 'Nguyễn Văn Minh',
                role: 'Warehouse Goods Handler (MM Binh Phu)',
                course: 'Live Fire Drill & Store Evacuation',
                rating: 5,
                comment: 'Actually holding a CO2 extinguisher and putting out a real fire on the drill ground made me far more confident about an incident in store.',
                date: '2026-08-10',
              },
            ].map((fb, idx) => (
              <div key={idx} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{fb.student}</span>
                    <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{'★'.repeat(Math.floor(fb.rating))} {fb.rating}★</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8 }}>{fb.role}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--rail)', marginBottom: 8 }}>Locked: {fb.course}</div>
                  <p style={{ fontSize: 13, color: 'var(--ink)', fontStyle: 'italic', margin: 0, lineHeight: 1.45 }}>
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
      {/* TAB: MY IN-PERSON COURSES — the trainer's own catalog entries, editable here */}
      {activeTab === 'MY_COURSES' && (
        <>
          <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--ink-soft)' }}>
              <i className="ti ti-folder" style={{ color: 'var(--blue)', fontSize: 16 }} />
              <div>
                {isFullAdmin
                  ? <>Every in-person course in the catalog, including the ones trainers created.</>
                  : <>The in-person courses <strong>you created</strong>. Edit the schedule, venue and syllabus, or delete a course you no longer run.</>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: 220 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 14 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 32, height: 36, fontSize: 13, width: '100%' }}
                  placeholder="Search my courses..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                />
              </div>
              <Button icon="ti-calendar" onClick={() => navigate('/trainer/training-ops')}>
                Teaching Schedule
              </Button>
              <Button icon="ti-chart-histogram" onClick={() => navigate('/trainer/reports')}>
                Training Reports
              </Button>
              <Button
                variant="primary"
                icon="ti-plus"
                onClick={() => navigate('/trainer/courses/new?scope=classroom&deliveryType=IN_PERSON_CLASSROOM')}
              >
                Create In-Person Course
              </Button>
            </div>
          </div>

          {filteredAuthoredCourses.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <i className="ti ti-folder-open" style={{ fontSize: 40, color: 'var(--ink-faint)', marginBottom: 10, display: 'block' }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>
                {courseSearch ? 'No course matches your search.' : 'You have not created any in-person course yet.'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                Click &quot;Create In-Person Course&quot; to build one, set its venue and lay out the training days.
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th style={{ width: 150 }}>Category</th>
                    <th style={{ width: 230 }}>Training Schedule</th>
                    <th style={{ width: 160 }}>Venue</th>
                    <th style={{ width: 90 }}>Capacity</th>
                    <th style={{ width: 110 }}>Status</th>
                    <th style={{ width: 150, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuthoredCourses.map((c) => {
                    const intakes = courseIntakes(c);
                    const next = nextOpenIntake(c);
                    const nextStart = next ? intakeDateRange(next).start : null;
                    const canManage = isFullAdmin || c.createdBy === authUser?.userId;
                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{c.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>{c.code || c.id}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{c.category || '—'}</td>
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{scheduleSummary(c)}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                            {nextStart
                              ? `Next intake starts ${formatSessionDate(nextStart, { withWeekday: false })}`
                              : intakes.length > 0 ? 'All intakes finished' : 'Not scheduled yet'}
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {c.venue || '—'}
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                            {intakes.length === 1 ? '1 intake' : `${intakes.length} intakes`}
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>{c.maxCapacity || 25}</td>
                        <td>
                          <Badge tone={c.status === 'PUBLISHED' ? 'sage' : 'slate'} size="sm">
                            {c.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <Button size="sm" icon="ti-pencil" onClick={() => navigate(`/trainer/courses/${c.id}`)}>
                              Edit
                            </Button>
                            {canManage && (
                              <Button
                                size="sm"
                                variant="danger"
                                icon="ti-trash"
                                onClick={() => {
                                  if (window.confirm(`Delete the course "${c.title}"? This cannot be undone.`)) removeCourse(c.id);
                                }}
                              >
                                Delete
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
          )}
        </>
      )}

      {activeTab === 'LABS' && (
        <div className="grid grid-2">
          {meetingRoomsAndLabs.map((lab) => (
            <div key={lab.id} className="card card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{lab.name}</div>
                <Badge tone="blue">Capacity: {lab.capacity} seats</Badge>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 }}>
                <i className="ti ti-map-pin" style={{ marginRight: 4 }} /> {lab.location}
              </div>
              <div className="section-label" style={{ margin: '0 0 6px', fontSize: 11 }}>Dedicated equipment available:</div>
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
      {liveQrClass && (() => {
        const qrToken = generateQrToken(liveQrClass.id, sessionQrSecret(liveQrClass), qrPhase, currentBucket(nowTick));
        const secondsLeft = secondsUntilNextBucket(nowTick);
        const windows = deriveAttendanceWindows(liveQrClass);

        return (
          <Modal
            isOpen={Boolean(liveQrClass)}
            title={`Live Attendance QR Code — ${liveQrClass.code}`}
            subtitle={`${liveQrClass.date} (${liveQrClass.time}) · ${liveQrClass.venue}`}
            onClose={() => setLiveQrClass(null)}
            size="md"
          >
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                {liveQrClass.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                <Badge tone="sage" icon="ti-broadcast">The QR Code Is Live</Badge>
                <Badge tone="blue" icon="ti-user-check">Class size: {liveQrClass.enrolledCount}/{liveQrClass.maxCapacity} Learner</Badge>
              </div>

              {windows && (
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
                  <i className="ti ti-clock" style={{ marginRight: 5 }} />
                  {qrPhase === 'CHECKIN'
                    ? `Check-in window: ${new Date(windows.checkIn.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(windows.checkIn.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : `Check-out window: ${new Date(windows.checkOut.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(windows.checkOut.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  }
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
                <Button variant={qrPhase === 'CHECKIN' ? 'primary' : 'outline'} onClick={() => setQrPhase('CHECKIN')}>
                  QR Check-in (Class Start)
                </Button>
                <Button variant={qrPhase === 'CHECKOUT' ? 'primary' : 'outline'} onClick={() => setQrPhase('CHECKOUT')}>
                  QR Check-out &amp; Survey (Class End)
                </Button>
              </div>

              {/* High-res Interactive QR Code Display */}
              <div style={{
                background: 'var(--paper-raised)',
                border: '3px solid var(--bigc-green, #007A38)',
                borderRadius: 16,
                padding: 24,
                display: 'inline-block',
                boxShadow: '0 10px 35px rgba(0,122,56,0.18)',
                marginBottom: 16,
                position: 'relative',
              }}>
                <QrCodeDisplay value={qrToken} />
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Badge tone={secondsLeft <= 5 ? 'rust' : 'amber'} icon="ti-clock" size="lg">
                    Refreshing in {secondsLeft}s
                  </Badge>
                </div>
              </div>

              {/* Dynamic Token display with copy */}
              <div style={{
                background: 'var(--paper-sunken)',
                border: '1px dashed var(--line-strong)',
                borderRadius: 8,
                padding: '10px 14px',
                maxWidth: 420,
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>SESSION TOKEN ({qrPhase}):</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>
                    {qrToken}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={copiedToken ? 'ti-check' : 'ti-copy'}
                  onClick={() => handleCopyToken(qrToken)}
                >
                  {copiedToken ? 'Copied' : 'Copy'}
                </Button>
              </div>

              <p style={{ fontSize: 12, color: 'var(--ink-soft)', maxWidth: 460, margin: '0 auto 18px', lineHeight: 1.45 }}>
                The trainer opens this screen on the training room projector. Learners scan the code in the app <strong>MMLearn</strong> to complete check-in and record course attendance.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Button variant="outline" onClick={() => setLiveQrClass(null)}>
                  Close The Screen
                </Button>
                <Button
                  variant="primary"
                  icon="ti-users"
                  onClick={() => {
                    const c = liveQrClass;
                    setLiveQrClass(null);
                    openRosterModal(c);
                  }}
                >
                  Open The Learner List ({liveQrClass.enrolledCount} Learner)
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* MODAL 2: STUDENT ROSTER & MANUAL ATTENDANCE TOGGLE */}
      {rosterClass && (
        <Modal
          isOpen={Boolean(rosterClass)}
          title={`Learner List & Attendance — ${rosterClass.title}`}
          subtitle={`${rosterClass.date} · ${rosterClass.venue}`}
          onClose={() => setRosterClass(null)}
          size="lg"
        >
          <div>
            {/* Filter toolbar & summary stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[
                  { id: 'ALL', label: `All (${activeRoster.length})` },
                  { id: 'CONFIRMED', label: `Present (${activeRoster.filter((s) => s.attendance === 'CONFIRMED').length})` },
                  { id: 'PENDING', label: `Not Checked In (${activeRoster.filter((s) => s.attendance !== 'CONFIRMED').length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setRosterFilter(f.id)}
                    className="btn btn-sm"
                    style={{
                      background: rosterFilter === f.id ? 'var(--blue)' : 'var(--paper-sunken)',
                      color: rosterFilter === f.id ? '#fff' : 'var(--ink)',
                      borderColor: rosterFilter === f.id ? 'var(--blue)' : 'var(--line)',
                      fontSize: 12,
                      fontWeight: rosterFilter === f.id ? 700 : 500,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Search learners by name or employee code..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  style={{ width: 240, height: 32, fontSize: 12 }}
                />
                <Button size="sm" variant="outline" icon="ti-checks" onClick={checkInAll}>
                  Mark All Present
                </Button>
              </div>
            </div>

            {/* Roster table */}
            <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 16 }}>
              <table className="table" style={{ width: '100%', margin: 0 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--paper-raised)', zIndex: 2 }}>
                  <tr>
                    <th style={{ width: 110 }}>Employee Code</th>
                    <th>Full Name</th>
                    <th>Job Title &amp; Sub-Department</th>
                    <th>Store Branch</th>
                    <th style={{ textAlign: 'center', width: 140 }}>Status</th>
                    <th style={{ textAlign: 'right', width: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRoster
                    .filter((s) => {
                      if (rosterFilter === 'CONFIRMED') return s.attendance === 'CONFIRMED';
                      if (rosterFilter === 'PENDING') return s.attendance !== 'CONFIRMED';
                      return true;
                    })
                    .filter((s) => !rosterSearch || s.name.toLowerCase().includes(rosterSearch.toLowerCase()) || s.id.toLowerCase().includes(rosterSearch.toLowerCase()) || s.position?.toLowerCase().includes(rosterSearch.toLowerCase()))
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
                              {isAttended ? 'Attendance Recorded' : 'Not Present'}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              size="sm"
                              variant={isAttended ? 'ghost' : 'primary'}
                              icon={isAttended ? 'ti-x' : 'ti-check'}
                              onClick={() => toggleAttendance(student.id)}
                            >
                              {isAttended ? 'Undo Check-In' : 'Mark Present'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Checked in: <strong>{activeRoster.filter((s) => s.attendance === 'CONFIRMED').length}</strong> / {activeRoster.length} learners ({Math.round((activeRoster.filter((s) => s.attendance === 'CONFIRMED').length / (activeRoster.length || 1)) * 100)}%)
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="ghost" onClick={() => setRosterClass(null)}>Close</Button>
                <Button variant="primary" icon="ti-device-floppy" onClick={() => setRosterClass(null)}>
                  Save &amp; Finish Attendance
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: SYLLABUS & CLASS MATERIALS (WITH TRAINER AUTHORING & UPLOADS) */}
      {materialsClass && (
        <Modal
          isOpen={Boolean(materialsClass)}
          title={`Syllabus & Teaching Materials — ${materialsClass.title}`}
          subtitle={`Class code: ${materialsClass.code} · Lead trainer: ${materialsClass.trainerName}`}
          onClose={() => { setMaterialsClass(null); setPreviewMaterial(null); setTrainerAddingStep(false); }}
          size="lg"
        >
          <div>
            {/* Section 1: Session Agenda */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-list-check" /> Session Agenda &amp; Syllabus
              </div>
              <Button
                size="sm"
                variant="outline"
                icon="ti-plus"
                onClick={() => setTrainerAddingStep(!trainerAddingStep)}
              >
                {trainerAddingStep ? 'Cancel Adding' : 'Add A Teaching Module'}
              </Button>
            </div>

            {/* Inline Add Syllabus Step Form */}
            {trainerAddingStep && (
              <div style={{ background: 'var(--blue-soft)', border: '1px solid var(--blue)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue-soft-text)', marginBottom: 6 }}>
                  Add a new lecture / practice module:
                </div>
                <input
                  className="field-input"
                  style={{ height: 32, fontSize: 12, marginBottom: 8 }}
                  placeholder="Module name (e.g. Part 4: Practising unexpected scenarios...)"
                  value={trainerNewStepTitle}
                  onChange={(e) => setTrainerNewStepTitle(e.target.value)}
                />
                <textarea
                  className="field-input"
                  rows={2}
                  style={{ fontSize: 12, marginBottom: 8, resize: 'vertical' }}
                  placeholder="Detailed training content and required outcomes..."
                  value={trainerNewStepDetail}
                  onChange={(e) => setTrainerNewStepDetail(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button size="sm" variant="ghost" onClick={() => setTrainerAddingStep(false)}>Cancel</Button>
                  <Button size="sm" variant="primary" icon="ti-check" onClick={() => handleTrainerAddSyllabusStep(materialsClass.id)}>
                    Save The Module
                  </Button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, maxHeight: 240, overflowY: 'auto' }}>
              {getSyllabusForClass(materialsClass).map((item, idx) => (
                <div key={idx} style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: 'var(--blue)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                        {idx + 1}
                      </span>
                      {item.step}
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ color: 'var(--rust)', opacity: 0.7 }}
                      title="Remove this module"
                      onClick={() => handleTrainerRemoveSyllabusStep(materialsClass.id, idx)}
                    >
                      <i className="ti ti-trash" style={{ fontSize: 14 }} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, marginLeft: 28 }}>
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>

            {/* Section 2: Attachments */}
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--bigc-green, #007A38)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-paperclip" /> Attached Materials &amp; Slides (Class Attachments &amp; Uploads)
            </div>

            {/* Trainer Upload / Add Material Row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, background: 'var(--paper-sunken)', padding: 10, borderRadius: 8, border: '1px dashed #CBD5E1', flexWrap: 'wrap' }}>
              <input
                className="field-input"
                style={{ flex: 1, minWidth: 200, height: 32, fontSize: 12 }}
                placeholder="Enter the name of the new material / slide file to upload..."
                value={trainerNewMatName}
                onChange={(e) => setTrainerNewMatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTrainerAddMaterial(materialsClass.id); } }}
              />
              <select
                className="field-select"
                style={{ width: 80, height: 32, fontSize: 12 }}
                value={trainerNewMatType}
                onChange={(e) => setTrainerNewMatType(e.target.value)}
              >
                <option value="PDF">PDF</option>
                <option value="PPT">PPT</option>
                <option value="DOC">DOC</option>
                <option value="LINK">LINK</option>
              </select>
              <Button size="sm" variant="primary" icon="ti-upload" onClick={() => handleTrainerAddMaterial(materialsClass.id)}>
                Upload / Add
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, maxHeight: 260, overflowY: 'auto' }}>
              {getMaterialsForClass(materialsClass).map((mat, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <i
                      className={mat.type === 'PDF' ? 'ti ti-file-type-pdf' : mat.type === 'PPT' ? 'ti ti-file-type-ppt' : mat.type === 'DOC' ? 'ti ti-file-type-doc' : 'ti ti-link'}
                      style={{ fontSize: 24, color: mat.type === 'PDF' ? 'var(--rust)' : mat.type === 'PPT' ? 'var(--amber)' : 'var(--blue)', flexShrink: 0 }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{mat.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Format: {mat.type} · Size: {mat.size || '2.5 MB'} · {mat.uploadedBy || 'Trainer'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      icon="ti-eye"
                      onClick={() => setPreviewMaterial(mat)}
                    >
                      View Online
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="ti-download"
                      onClick={() => alert(`Downloading material: ${mat.name}`)}
                    >
                      Download
                    </Button>
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ color: 'var(--rust)' }}
                      title="Delete this file"
                      onClick={() => handleTrainerRemoveMaterial(materialsClass.id, mat.id)}
                    >
                      <i className="ti ti-x" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Document preview box if a material is selected */}
            {previewMaterial && (
              <div style={{ background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                    <i className="ti ti-file-description" style={{ marginRight: 6 }} /> Preview Material: {previewMaterial.name}
                  </div>
                  <Button size="sm" variant="ghost" icon="ti-x" onClick={() => setPreviewMaterial(null)}>
                    Close The Preview
                  </Button>
                </div>
                <div style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 6, padding: 20, minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <i className="ti ti-file-search" style={{ fontSize: 44, color: 'var(--blue)', marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>MMLearn Embedded Document Viewer</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', maxWidth: 440, marginTop: 4 }}>
                    Materials <strong>{previewMaterial.name}</strong> ({previewMaterial.type} - {previewMaterial.size}) loaded successfully from the MMVN SOP &amp; learning material repository.
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="primary" onClick={() => { setMaterialsClass(null); setPreviewMaterial(null); }}>
                Close &amp; Finish
              </Button>
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
