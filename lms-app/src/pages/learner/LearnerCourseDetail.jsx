import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Badge, ProgressBar, Button, ModuleList, CourseTypeBadge, Modal, JobLevelBadge, LevelAccessBadge, CertificateModal } from '../../features/common/ui';
import { useCourseStore } from '../../store/CourseStore';
import { currentUser, resolveCourseView, deriveCertificates, deriveLessonStatuses } from '../../data/mockData';
import { ACCESS_STATE, levelShortLabel, nextLevelUp } from '../../data/levelSystem';
import { getCourseImage } from '../../data/courseImages';
import { getAssignedCurriculaForUser } from '../../utils/curriculumAssignment';
import { computeLifecycleStatus } from '../../utils/courseCatalog';
import { computeCourseRecertification, RECERTIFICATION_STATE } from '../../utils/recertification';
import { pricingOf, formatVnd, COST_TYPE_META } from '../../utils/costCenter';


function statusLabel(status) {
  switch (status) {
    case 'COMPLETED': return 'Completed';
    case 'IN_PROGRESS': return 'In Progress';
    case 'OVERDUE': return 'Overdue';
    case 'FAILED': return 'Retake Required';
    default: return 'Not Started';
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function LearnerCourseDetail({ basePath = '/learner/courses' }) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courses, currentUser: authUser, enrollCourse, accessFor, requestLevelAdvanceApproval, myEnrollments, curricula, certificateTemplates } = useCourseStore();
  const user = authUser || currentUser;
  const rawCourse = courses.find((c) => c.id === courseId);
  const [requestOpen, setRequestOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [notice, setNotice] = useState(null);
  // A paid course must be confirmed before it is debited to the cost center of
  // the learner's department — free courses enroll straight away.
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);

  const assignedCurricula = useMemo(() => getAssignedCurriculaForUser(curricula, user), [curricula, user]);
  const parentCurriculum = useMemo(() => {
    if (!courseId) return null;
    return assignedCurricula.find((cur) => (cur.courseIds || []).includes(courseId));
  }, [assignedCurricula, courseId]);

  // Merge in enrollments created during this session (e.g. a level skip just approved).
  const rawEnrollment = rawCourse ? (myEnrollments[rawCourse.id] || rawCourse.enrollment) : null;
  // Versioning: this ONLY serves the frozen snapshot to people who ARE ENROLLED (protecting
  // them from later publishes) — anyone not enrolled always sees the newest
  // version when viewing/preparing to register; resolveCourseView is not applied for them.
  const versionedCourse = rawCourse
    ? (rawEnrollment ? resolveCourseView(rawCourse, rawEnrollment.enrolledVersion) : rawCourse)
    : null;
  const course = versionedCourse
    ? { ...versionedCourse, enrollment: rawEnrollment, modules: deriveLessonStatuses(versionedCourse.modules, rawEnrollment) }
    : null;

  // Tuition (Cost Center). The price comes from the source course, not from the
  // version snapshot — price is a commercial attribute and is not frozen with the
  // content version.
  const pricing = pricingOf(rawCourse);

  const allRequiredLessons = useMemo(() => {
    if (!course || !course.modules) return [];
    return course.modules.flatMap((m) => m.lessons.filter((l) => l.isRequired && l.lessonType !== 'ASSESSMENT'));
  }, [course]);

  // The certificate (if any) for the course being viewed — it only exists once completed
  // and the course has certificateEnabled (see deriveCertificates() in mockData.js).
  const certificate = useMemo(() => {
    if (!course) return null;
    return deriveCertificates(courses, user, myEnrollments, certificateTemplates).find((cert) => cert.courseId === course.id) || null;
  }, [courses, user, course, myEnrollments, certificateTemplates]);

  const recert = useMemo(() => {
    return computeCourseRecertification(course, course?.enrollment, certificate);
  }, [course, certificate]);

  const [showCertificate, setShowCertificate] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  if (!course) {
    return (
      <div className="empty-state">
        <i className="ti ti-mood-empty" aria-hidden="true" />
        <p>Course not found.</p>
        <Link to={basePath}>Back to the course list</Link>
      </div>
    );
  }

  // Prerequisites are checked against the learner's real enrollments
  // (the HRIS matrix + overlay), not the course object's `enrollment` field.
  const unmetPrerequisites = (course.prerequisites || []).filter((pid) => {
    const p = courses.find((c) => c.id === pid);
    return !p || myEnrollments[pid]?.status !== 'COMPLETED';
  });
  const isPrereqLocked = unmetPrerequisites.length > 0;
  // A closed course never enrolled in: the catalog now still allows viewing (marked
  // "Enrollment window closed" instead of being hidden entirely as before), but definitely
  // new registration is blocked — the enrollment window has expired.
  const isRegistrationClosed = !course.enrollment && computeLifecycleStatus(course) === 'CLOSED';

  const completedRequired = allRequiredLessons.filter((l) => l.status === 'COMPLETED').length;
  const completionPct = allRequiredLessons.length
    ? Math.round((completedRequired / allRequiredLessons.length) * 100)
    : 100;
  const cfg = course.configuration || {};
  const access = accessFor(course, user);
  const isLevelLocked = access.isLevelLocked;
  const assessmentUnlocked = ((!isPrereqLocked && !isLevelLocked && completionPct >= 100) || recert.needsRecertification) && cfg.assessmentEnabled;

  function submitRequest() {
    const result = requestLevelAdvanceApproval(course, justification, user);
    setRequestOpen(false);
    setNotice(
      result.ok
        ? 'Your level skip request has been sent to your line manager. The course opens as soon as it is approved.'
        : result.reason
    );
  }

  return (
    <>
      <div className="page-crumb" style={{ marginBottom: 6 }}>
        <Link to={basePath} style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>My Courses</Link> / {course.title}
      </div>
      <div className="card" style={{ marginBottom: 20, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <div style={{ position: 'relative', width: '100%', height: 180, background: 'var(--paper-sunken)' }}>
          <img
            src={getCourseImage(course)}
            alt={course.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                  {course.code}
                </span>
                <CourseTypeBadge courseType={course.courseType} />
                {pricing.isFree ? (
                  <Badge tone="sage" icon="ti-gift" size="sm">Free</Badge>
                ) : (
                  <Badge tone="amber" icon="ti-coin" size="sm">{formatVnd(pricing.price)}</Badge>
                )}
              </div>
              <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                {course.title}
              </h1>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>{course.category || course.domain}</span>
              <span>&middot;</span>
              <span>{course.estimatedDuration || '3h'}</span>
              <span>&middot;</span>
              <span>{course.version || 'v2.1'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RECERTIFICATION ALERT BANNER */}
      {recert.needsRecertification && (
        <div
          className="card card-pad"
          style={{
            marginBottom: 16,
            borderLeft: `4px solid ${recert.isExpired ? 'var(--rust)' : 'var(--amber)'}`,
            background: recert.isExpired ? 'var(--rust-soft)' : 'var(--amber-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: recert.isExpired ? 'var(--rust)' : 'var(--amber)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              <i className={`ti ${recert.isExpired ? 'ti-alert-circle' : 'ti-clock'}`} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: recert.isExpired ? 'var(--rust-soft-text)' : 'var(--amber-soft-text)' }}>
                {recert.statusLabel}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                {recert.alertMessage}
              </div>
            </div>
          </div>
          {cfg.assessmentEnabled && (
            <Button
              variant="primary"
              tone={recert.isExpired ? 'danger' : 'primary'}
              icon="ti-refresh"
              onClick={() => navigate(`${basePath}/${course.id}/assessment`)}
            >
              {recert.actionLabel}
            </Button>
          )}
        </div>
      )}

      {parentCurriculum && (
        <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '4px solid var(--rail, #6366f1)', background: 'rgba(99,102,241,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--rail)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              <i className="ti ti-books" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                Course in a mandatory curriculum: <strong>{parentCurriculum.title}</strong>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                This course is part of a curriculum roadmap assigned to you as mandatory.
                {parentCurriculum.assignedVia?.dueDate ? ` Completion deadline: ${parentCurriculum.assignedVia.dueDate}.` : ''}
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" icon="ti-arrow-left" onClick={() => navigate(basePath)}>
            View The Curriculum List
          </Button>
        </div>
      )}

      {notice && (
        <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '4px solid var(--sage)', background: 'var(--sage-soft)', fontSize: 13, color: 'var(--sage-soft-text)', fontWeight: 600 }}>
          <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
          {notice}
        </div>
      )}

      {course.isArchivedVersionView && (
        <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '4px solid var(--amber)', background: 'var(--amber-soft)', fontSize: 13, color: 'var(--amber-soft-text)' }}>
          <i className="ti ti-history" style={{ marginRight: 6 }} />
          You enrolled in this course at version <strong>{course.version}</strong>. The lesson content stays exactly as it was when you started, even though a newer version of the course now exists.
        </div>
      )}

      {/* JOB LEVEL & ACCESS COMPARISON TABLE */}
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Your job level:</span>
          <JobLevelBadge level={access.userLevel} />
          <i className="ti ti-arrow-right" style={{ color: 'var(--ink-faint)' }} />
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Course job level:</span>
          <JobLevelBadge level={access.courseLevel} />
        </div>
        <LevelAccessBadge access={access} />
      </div>

      {isRegistrationClosed ? (
        /* ENROLLMENT WINDOW CLOSED — never enrolled and the registration window has expired */
        <div className="card card-pad empty-state" style={{ marginBottom: 20 }}>
          <i className="ti ti-lock" aria-hidden="true" style={{ color: 'var(--rust)' }} />
          <p>The enrollment window for this course has closed and you never registered. New registration for a closed course is not possible.</p>
        </div>
      ) : isLevelLocked ? (
        /* LOCKED BY THE SEQUENTIAL LEVEL RULE */
        <div
          className="card card-pad"
          style={{
            marginBottom: 20,
            borderLeft: `4px solid ${access.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? 'var(--rust)' : 'var(--blue)'}`,
            background: access.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? 'var(--rust-soft)' : 'var(--blue-soft)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ maxWidth: 640 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: access.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? 'var(--rust-soft-text)' : 'var(--blue-soft-text)', marginBottom: 4 }}>
                {access.state === ACCESS_STATE.LOCKED_LEVEL_GAP
                  ? '⛔ Grade Skipping Blocked'
                  : access.state === ACCESS_STATE.PENDING_APPROVAL
                    ? '⏳ Level Skip Request Awaiting Approval'
                    : '🔒 Course One Grade Above — Approval Required'}
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>{access.reason}</p>

              {access.state === ACCESS_STATE.LOCKED_LEVEL_GAP && access.blockedRoadmap?.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>The roadmap you must follow:</span>
                  {access.blockedRoadmap.map((lvl, idx) => (
                    <React.Fragment key={lvl}>
                      {idx > 0 && <i className="ti ti-arrow-right" style={{ fontSize: 11, color: 'var(--ink-faint)' }} />}
                      <JobLevelBadge level={lvl} compact />
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {access.requiresApproval && (
              <Button variant="primary" icon="ti-lock" onClick={() => setRequestOpen(true)}>
                🔒 Request Level Skip Approval
              </Button>
            )}
          </div>
        </div>
      ) : isPrereqLocked ? (
        /* PREREQUISITES LOCKED */
        <div className="card card-pad empty-state" style={{ marginBottom: 20 }}>
          <i className="ti ti-lock" aria-hidden="true" />
          <p>This course requires you to complete these first: {unmetPrerequisites.map((pid) => courses.find((c) => c.id === pid)?.title).join(', ')}.</p>
        </div>
      ) : !course.enrollment ? (
        /* NOT ENROLLED — FREE TO START */
        <div
          className="card card-pad"
          style={{
            background: access.state === ACCESS_STATE.APPROVED ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' : 'var(--blue-soft)',
            borderColor: access.state === ACCESS_STATE.APPROVED ? 'var(--sage)' : 'var(--blue)',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: access.state === ACCESS_STATE.APPROVED ? 'var(--sage-soft-text)' : 'var(--blue-soft-text)' }}>
                {access.state === ACCESS_STATE.APPROVED
                  ? `✅ Your Manager Approved Studying Up To ${levelShortLabel(access.courseLevel)}`
                  : 'This Course Is At Your Level — Start Now Without Approval'}
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
                {access.state === ACCESS_STATE.APPROVED
                  ? 'You have been individually approved for this course. Click to enroll and begin.'
                  : 'This course is at or below your job level, so it is freely open. Click to enroll and start learning.'}
              </p>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {pricing.isFree ? (
                  <Badge tone="sage" icon="ti-gift">Free</Badge>
                ) : (
                  <Badge tone="amber" icon="ti-coin">Tuition {formatVnd(pricing.price)} / learner</Badge>
                )}
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {pricing.isFree
                    ? 'MMVN internal content — no deduction from the department training budget.'
                    : `Debited to the training budget of ${user?.divisionName || 'your department'}.`}
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              icon={pricing.isFree ? 'ti-plus' : 'ti-coin'}
              onClick={() => (pricing.isFree ? enrollCourse(course.id, user) : setPayConfirmOpen(true))}
            >
              {pricing.isFree
                ? (access.state === ACCESS_STATE.APPROVED ? 'Start Learning' : 'Enroll Now')
                : `Register · ${formatVnd(pricing.price)}`}
            </Button>
          </div>
        </div>
      ) : (
        /* ENROLLED PROGRESS CARD */
        <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'var(--blue)', borderWidth: 1.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Your learning progress</div>
              {course.courseType === 'MANDATORY' && (
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Completion deadline: {formatDate(course.enrollment.dueDate)}</div>
              )}
            </div>
            <Badge tone={recert.needsRecertification ? recert.badgeTone : course.enrollment.status === 'COMPLETED' ? 'sage' : course.enrollment.status === 'OVERDUE' ? 'rust' : 'amber'}>
              {recert.needsRecertification ? recert.statusLabel : statusLabel(course.enrollment.status)}
            </Badge>

          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <ProgressBar value={course.enrollment.progressPercent} tone={course.enrollment.status === 'COMPLETED' ? 'sage' : 'blue'} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{course.enrollment.progressPercent}%</span>
          </div>

          {!pricing.isFree && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-coin" style={{ color: 'var(--amber)' }} />
              Paid course — already debited <strong>{formatVnd(pricing.price)}</strong> to the training budget of {user?.divisionName || 'your department'}.
            </div>
          )}

          {course.enrollment.status === 'COMPLETED' && certificate && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="activity-icon" style={{ width: 40, height: 40, background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', borderRadius: 10 }}>
                  <i className="ti ti-certificate" style={{ fontSize: 20 }} aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Certificate issued</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{certificate.id}</div>
                </div>
              </div>
              <Button size="sm" variant="primary" icon="ti-eye" onClick={() => setShowCertificate(true)}>
                View Certificate
              </Button>
            </div>
          )}
        </div>
      )}

      {/* IN-PERSON WORKSHOP COURSE (IN-PERSON WORKSHOP / ILT) */}
      {course.deliveryType === 'IN_PERSON_CLASSROOM' ? (
        <InPersonClassroomCard
          course={course}
          isLocked={isPrereqLocked || isLevelLocked}
          isEnrolled={Boolean(course.enrollment)}
          onPreviewDoc={setPreviewDoc}
        />
      ) : course.deliveryType === 'ONLINE_ELEARNING' && course.onlineClassType === 'VIRTUAL_CLASS' ? (
        <VirtualClassCard
          course={course}
          isLocked={isPrereqLocked || isLevelLocked}
          isEnrolled={Boolean(course.enrollment)}
          onPreviewDoc={setPreviewDoc}
        />
      ) : (
        <>
          {/* MODULES & LESSONS */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-pad" style={{ paddingBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="section-label" style={{ margin: '0 0 4px' }}>Program structure &amp; lessons</div>
              {recert.needsRecertification && recert.isFullCourse && (
                <Badge tone="amber" icon="ti-refresh" size="sm">
                  Every Lesson Has Been Reopened For Revision
                </Badge>
              )}
            </div>
            <div className="card-pad" style={{ paddingTop: 4 }}>
              <ModuleList
                modules={course.modules || []}
                disabled={isLevelLocked || isRegistrationClosed}
                getLessonHref={(l) => {
                  if (isPrereqLocked || isLevelLocked || isRegistrationClosed) return null;
                  return l.lessonType === 'ASSESSMENT' ? null : `${basePath}/${course.id}/lessons/${l.id}`;
                }}
              />
            </div>
          </div>

          {/* FINAL ASSESSMENT */}
          {cfg.assessmentEnabled && (
            <div className="card card-pad" style={{ borderColor: assessmentUnlocked ? (recert.needsRecertification ? (recert.isExpired ? 'var(--rust)' : 'var(--amber)') : 'var(--sage)') : 'var(--line)', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="activity-icon" style={{ background: recert.needsRecertification ? (recert.isExpired ? 'var(--rust-soft)' : 'var(--amber-soft)') : 'var(--blue-soft)', color: recert.needsRecertification ? (recert.isExpired ? 'var(--rust)' : 'var(--amber)') : 'var(--blue)' }}>
                    <i className={`ti ${recert.needsRecertification ? 'ti-refresh-alert' : 'ti-writing'}`} aria-hidden="true" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {recert.needsRecertification ? 'Standardized Recertification Exam' : 'Final Assessment'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {cfg.questionsPerAttempt || 5} questions &middot; Time: {cfg.assessmentTimeLimit || 15} min &middot; Pass score: {cfg.passingScorePercent || 80}% &middot; Max {cfg.maxAttempts || 3} attempts
                    </div>
                  </div>
                </div>

                {assessmentUnlocked ? (
                  <Button
                    variant="primary"
                    tone={recert.needsRecertification ? (recert.isExpired ? 'danger' : 'primary') : 'primary'}
                    icon={recert.needsRecertification ? 'ti-refresh' : 'ti-player-play'}
                    onClick={() => navigate(`${basePath}/${course.id}/assessment`)}
                  >
                    {recert.needsRecertification ? recert.actionLabel : 'Take The Exam'}
                  </Button>
                ) : (
                  <Badge tone="slate" icon="ti-lock">
                    {isLevelLocked ? 'This course is not open at your level' : 'Finish the lessons to unlock the exam'}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: SUBMIT A LEVEL SKIP REQUEST */}
      <Modal
        isOpen={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Level Skip Approval Request"
        subtitle={`Request to study up from ${levelShortLabel(access.userLevel)} to ${levelShortLabel(access.courseLevel)} for this course only.`}
        size="md"
      >
        <div>
          <div style={{ background: 'var(--paper-sunken)', padding: '14px 16px', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{course.title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Approved by: <strong>Your line manager ({user.managerId || 'Line Manager'})</strong> &middot; The course is exactly one grade above, so a request is valid.
            </div>
          </div>
          <label className="field-label">Reason for the level skip request</label>
          <textarea
            className="field-input"
            rows={4}
            style={{ resize: 'vertical', marginBottom: 16 }}
            placeholder="State clearly why you need this capability and how ready you are..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button variant="primary" icon="ti-send" onClick={submitRequest}>Send The Request To My Manager</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CONFIRM TUITION BEFORE ENROLLING IN A PAID COURSE */}
      <Modal
        isOpen={payConfirmOpen}
        onClose={() => setPayConfirmOpen(false)}
        title="Confirm Registration For A Paid Course"
        subtitle={course.title}
        size="sm"
        footer={
          <Button
            variant="primary"
            icon="ti-check"
            onClick={() => {
              enrollCourse(course.id, user);
              setPayConfirmOpen(false);
            }}
          >
            Confirm Registration
          </Button>
        }
      >
        <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--ink-soft)' }}>Company cost per learner</span>
            <strong style={{ fontSize: 15, color: 'var(--amber)' }}>{formatVnd(pricing.price)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--ink-soft)' }}>Cost type</span>
            <span>{COST_TYPE_META[pricing.costType]?.labelVi || pricing.costType}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--ink-soft)' }}>Cost center debited</span>
            <span style={{ textAlign: 'right' }}>
              {user?.divisionName || 'No department assigned'}
              {user?.costCenterCode ? ` · Code ${user.costCenterCode}` : ''}
            </span>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
          This amount is paid by <strong>paid by the company</strong>; you pay nothing. When you confirm, an expense entry
          is written to the Cost Center ledger and deducted from your Division's annual training budget. Your manager and the
          L&amp;D team will see it in the income and expense report.
        </p>
      </Modal>

      {/* MODAL: VIEW CERTIFICATE */}
      <CertificateModal
        certificate={certificate}
        isOpen={showCertificate}
        onClose={() => setShowCertificate(false)}
      />

      {/* MODAL: SYLLABUS & MATERIAL PREVIEW (EMBEDDED VIEWER) */}
      <DocumentPreviewModal
        material={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
      />
    </>
  );
}

const VC_PLATFORM_LABEL = {
  TEAMS: 'Microsoft Teams', ZOOM: 'Zoom', MEET: 'Google Meet', WEBEX: 'Cisco Webex', CUSTOM: 'Online platform',
};
const VC_PLATFORM_ICON = {
  TEAMS: 'ti-brand-teams', ZOOM: 'ti-video', MEET: 'ti-brand-google', WEBEX: 'ti-device-tv', CUSTOM: 'ti-broadcast',
};

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{value}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
          }}
        >
          <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} aria-hidden="true" style={{ color: copied ? 'var(--sage)' : undefined }} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   COMPONENTS: IN-PERSON / ONLINE / E-LEARNING COURSE SYLLABUS & MATERIALS
   ========================================================================= */

function InPersonClassroomCard({ course, isLocked, isEnrolled, onPreviewDoc }) {
  const syllabus = course.syllabus || [];
  const materials = course.materials || [];

  return (
    <div className="card" style={{ marginBottom: 20, overflow: 'hidden', borderColor: 'var(--blue)' }}>
      {/* Top Banner Header */}
      <div
        className="card-pad"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
          background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
          borderBottom: '1px solid #BFDBFE',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            <i className="ti ti-building-store" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--blue-soft-text)' }}>
              In-Person Workshop Training
            </div>
            <div style={{ fontSize: 12, color: 'var(--blue)' }}>
              On-site training with SOP practice &middot; attendance via the trainer's QR code
            </div>
          </div>
        </div>
        <Badge tone="blue" icon="ti-qrcode">Scan The Attendance QR</Badge>
      </div>

      <div className="card-pad">
        {/* Logistics Grid */}
        <div className="grid grid-2" style={{ marginBottom: 16, gap: 16, background: 'var(--paper-sunken)', borderRadius: 8, padding: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>Teaching trainer</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                {(course.trainerName || 'GV').split(' ').filter(Boolean).slice(-2).map((s) => s[0]).join('').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{course.trainerName || 'Dedicated Trainer'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Master Trainer &middot; L&amp;OD Training Board</div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>Venue &amp; Time</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{course.venue || 'MM Mega Market Practice Workshop'}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
              {formatDate(course.scheduleDate || course.startDate)} &middot; {course.scheduleTime || '08:30 - 11:30 (3.0 hours)'}
            </div>
          </div>
        </div>

        {/* Section 1: Session Agenda & Syllabus */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--blue)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-list-check" /> Session Agenda &amp; Syllabus
          </div>
          {syllabus.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', padding: '10px 0' }}>
              The detailed syllabus has not been updated yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {syllabus.map((item, idx) => (
                <div key={idx} style={{ background: 'var(--paper-raised)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: 'var(--blue)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                      {idx + 1}
                    </span>
                    {item.step}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, marginLeft: 28 }}>
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Pre-Class Materials & Downloads */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--bigc-green, #007A38)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-paperclip" /> Syllabus &amp; Attached Slides (Pre-Class Materials &amp; Downloads)
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Learners download or view them online to prepare before the class</span>
          </div>

          {materials.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', padding: '10px 0' }}>
              No material is attached to this session yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {materials.map((mat, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <i
                      className={mat.type === 'PDF' ? 'ti ti-file-type-pdf' : mat.type === 'PPT' ? 'ti ti-file-type-ppt' : mat.type === 'DOC' ? 'ti ti-file-type-doc' : 'ti ti-link'}
                      style={{ fontSize: 24, color: mat.type === 'PDF' ? 'var(--rust)' : mat.type === 'PPT' ? 'var(--amber)' : 'var(--blue)', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{mat.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Format: {mat.type} &middot; Size: {mat.size || '2.5 MB'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      icon="ti-eye"
                      onClick={() => onPreviewDoc(mat)}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance instructions footer */}
        <div style={{ background: 'var(--sage-soft)', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--sage-soft-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-info-circle" style={{ fontSize: 16 }} />
          <span>A hands-on session requires no online exam. The trainer opens a Live QR code in class for you to scan and complete the course.</span>
        </div>
      </div>
    </div>
  );
}

function VirtualClassCard({ course, isLocked, isEnrolled, onPreviewDoc }) {
  const vm = course.virtualMeeting || {};
  const isCompleted = vm.status === 'COMPLETED';
  const syllabus = course.syllabus || [];
  const materials = course.materials || vm.materials || [];

  return (
    <div className="card" style={{ marginBottom: 20, overflow: 'hidden', borderColor: isCompleted ? 'var(--line)' : 'var(--amber)' }}>
      <div
        className="card-pad"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
          background: isCompleted ? 'var(--paper-sunken)' : 'var(--amber-soft)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`ti ${VC_PLATFORM_ICON[vm.platform] || 'ti-video'}`} style={{ fontSize: 18, color: isCompleted ? 'var(--ink-soft)' : 'var(--amber-soft-text)' }} />
          <span style={{ fontWeight: 800, fontSize: 14 }}>Live Virtual Class &middot; {VC_PLATFORM_LABEL[vm.platform] || 'Online'}</span>
        </div>
        <Badge tone={isCompleted ? 'slate' : 'amber'} icon={isCompleted ? 'ti-circle-check' : 'ti-clock-hour-4'}>
          {isCompleted ? 'Finished' : 'Upcoming'}
        </Badge>
      </div>

      <div className="card-pad">
        <div className="grid grid-2" style={{ marginBottom: 16, gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>Hosting trainer</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--rail)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                {(vm.instructorName || '?').split(' ').filter(Boolean).slice(-2).map((s) => s[0]).join('').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{vm.instructorName || 'Not assigned'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{vm.instructorTitle}</div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>Schedule</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{formatDate(vm.scheduleDate)}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{vm.scheduleTime}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <CopyField label="Meeting ID" value={vm.meetingId} />
          <CopyField label="Passcode" value={vm.passcode} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 2 }}>Capacity</div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Max {vm.maxCapacity || 0} learners</span>
          </div>
        </div>

        {isLocked ? (
          <Badge tone="slate" icon="ti-lock">The course is not open yet — join the meeting room once you are eligible</Badge>
        ) : !isEnrolled ? (
          <Badge tone="slate" icon="ti-info-circle">Enroll in the course above to receive the join link</Badge>
        ) : isCompleted ? (
          <Badge tone="sage" icon="ti-circle-check">The session has finished &middot; the trainer marked attendance in the Teaching Portal</Badge>
        ) : (
          <Button
            variant="primary"
            size="lg"
            icon="ti-video"
            onClick={() => window.open(vm.meetingUrl, '_blank', 'noopener,noreferrer')}
            disabled={!vm.meetingUrl}
          >
            Join The Online Class
          </Button>
        )}

        {/* Section 1: Session Agenda & Syllabus */}
        {syllabus.length > 0 && (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--blue)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-list-check" /> Session Agenda
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {syllabus.map((item, idx) => (
                <div key={idx} style={{ background: 'var(--paper-raised)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: 'var(--blue)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                      {idx + 1}
                    </span>
                    {item.step}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, marginLeft: 28 }}>
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Pre-Class Materials */}
        {materials.length > 0 && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div className="section-label" style={{ margin: '0 0 8px' }}>Attached materials &amp; slides</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {materials.map((mat, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-sunken)', borderRadius: 6, padding: '8px 12px', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i
                      className={mat.type === 'PDF' ? 'ti ti-file-type-pdf' : mat.type === 'PPT' ? 'ti ti-file-type-ppt' : 'ti ti-paperclip'}
                      style={{ fontSize: 20, color: mat.type === 'PDF' ? 'var(--rust)' : mat.type === 'PPT' ? 'var(--amber)' : 'var(--blue)' }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{mat.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{mat.type} &middot; {mat.size || '2.0 MB'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" variant="outline" icon="ti-eye" onClick={() => onPreviewDoc(mat)}>
                      View Online
                    </Button>
                    <Button size="sm" variant="ghost" icon="ti-download" onClick={() => alert(`Downloading: ${mat.name}`)}>
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-faint)' }}>
          There is no end-of-course exam — completion is recorded when you attend the full session (the trainer marks attendance).
        </div>
      </div>
    </div>
  );
}

function DocumentPreviewModal({ material, isOpen, onClose }) {
  if (!material || !isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Preview Material: ${material.name}`}
      subtitle={`Format: ${material.type} · Size: ${material.size || '2.5 MB'}`}
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Simulated Document Reader Top Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-sunken)', padding: '8px 12px', borderRadius: 8, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge tone={material.type === 'PDF' ? 'rust' : material.type === 'PPT' ? 'amber' : 'blue'}>
              {material.type}
            </Badge>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Trang 1 / 18</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-sm btn-ghost" title="Zoom out">
              <i className="ti ti-zoom-out" />
            </button>
            <span style={{ fontSize: 12, display: 'flex', alignItems: 'center' }}>100%</span>
            <button type="button" className="btn btn-sm btn-ghost" title="Zoom in">
              <i className="ti ti-zoom-in" />
            </button>
            <Button
              size="sm"
              variant="primary"
              icon="ti-download"
              onClick={() => alert(`Downloading material: ${material.name}`)}
            >
              Download File
            </Button>
          </div>
        </div>

        {/* Simulated Document Canvas View */}
        <div style={{
          background: '#475569',
          borderRadius: 8,
          padding: 24,
          minHeight: 380,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)',
        }}>
          <div style={{
            background: 'var(--paper-raised)',
            width: '100%',
            maxWidth: 520,
            borderRadius: 6,
            padding: '36px 32px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            color: 'var(--ink)',
            textAlign: 'left',
          }}>
            <div style={{ borderBottom: '2px solid #007A38', paddingBottom: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#007A38', textTransform: 'uppercase', letterSpacing: 1 }}>MM Mega Market Vietnam &middot; L&amp;OD</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>{material.name}</div>
              </div>
              <i className="ti ti-certificate" style={{ fontSize: 28, color: '#007A38' }} />
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-soft)', marginBottom: 14 }}>
              <strong>Purpose of the material:</strong> Standardizes the full practical procedure, personal protective equipment rules and quality control standards at the store branch.
            </div>

            <div style={{ background: 'var(--slate-soft)', borderRadius: 6, padding: '12px 14px', marginBottom: 14, fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>Key topics in this material:</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-soft)' }}>
                <li>Occupational safety rules &amp; personal protective equipment (PPE).</li>
                <li>Step-by-step standard operating procedure (SOP) to the Gold HACCP standard.</li>
                <li>Pre-shift and post-shift checklist.</li>
                <li>Handling incidents &amp; reporting to the shift manager.</li>
              </ul>
            </div>

            <div style={{ fontSize: 11, color: 'var(--ink-faint)', borderTop: '1px dashed #CBD5E1', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span>MMVN Training &amp; Development Board</span>
              <span>Internal circulation &middot; 2026</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            icon="ti-download"
            onClick={() => alert(`Downloading: ${material.name}`)}
          >
            Download File ({material.size || '2.5 MB'})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
