import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Button, JobLevelBadge } from '../../features/common/ui';
import { useCourseStore } from '../../store/CourseStore';
import { QUESTION_TYPES, DELIVERY_FORMATS, ASSESSMENT_MODES } from '../../data/assessmentData';
import { getAssessmentAccess } from '../../utils/assessmentCatalog';
import { applyAssessmentAttempt, drawAssessmentQuestions, resolveCourseView, deriveLessonStatuses, deriveAssessmentAttempts } from '../../data/mockData';
import { computeValidUntilDate } from '../../utils/recertification';


function isAnswerCorrect(question, answerValue) {
  if (!question || answerValue === undefined || answerValue === null) return false;

  const type = question.questionType || question.type;

  if (type === QUESTION_TYPES.RATING_SCALE) {
    return true; // A survey is always recorded as complete
  }

  if (type === QUESTION_TYPES.ESSAY) {
    const text = Array.isArray(answerValue) ? (answerValue[0] || '') : String(answerValue);
    return text.trim().length >= 5;
  }

  if (type === QUESTION_TYPES.FILL_IN_BLANK || type === QUESTION_TYPES.SHORT_ANSWER) {
    const text = (Array.isArray(answerValue) ? (answerValue[0] || '') : String(answerValue)).trim().toLowerCase();
    if (!text) return false;
    const keywords = (question.correctKeywords || []).map((k) => k.trim().toLowerCase());
    const optTexts = (question.options || []).map((o) => (o.text || '').trim().toLowerCase());
    return keywords.includes(text) || optTexts.includes(text);
  }

  if (type === QUESTION_TYPES.MATCHING) {
    if (typeof answerValue !== 'object') return false;
    const pairs = question.options || question.pairs || [];
    return pairs.length > 0 && pairs.every((p) => answerValue[p.id] === p.right);
  }

  if (type === QUESTION_TYPES.ORDERING) {
    if (!Array.isArray(answerValue)) return false;
    const items = question.options || question.sequenceItems || [];
    const sortedTarget = [...items].sort((a, b) => (a.correctOrder || 0) - (b.correctOrder || 0)).map((s) => s.id);
    return JSON.stringify(answerValue) === JSON.stringify(sortedTarget);
  }

  // Choices based: SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, YES_NO, SCENARIO_BASED, CASE_STUDY, HOTSPOT, IMAGE_BASED, VIDEO_BASED, SIMULATION
  const selectedIds = Array.isArray(answerValue) ? answerValue : [answerValue];
  const correctIds = (question.options || []).filter((o) => o.isCorrect).map((o) => o.id).sort();
  const chosen = [...selectedIds].sort();

  return correctIds.length === chosen.length && correctIds.every((id, i) => id === chosen[i]);
}

export default function AssessmentPlayer({ basePath = '/learner/courses' }) {
  const { courseId, assessmentId: paramAssessmentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    courses,
    assessments,
    questionBanks,
    saveCourseProgress,
    recordAssessmentAttempt,
    currentUser,
    accessFor,
    myEnrollments,
    assessmentRegistrations,
    enrollAssessment,
    isAssessmentRegistered,
  } = useCourseStore();

  const user = currentUser;

  // Determine whether this is a standalone assessment or a course assessment
  const targetAssessmentId = paramAssessmentId || searchParams.get('assessmentId') || (courseId && courseId.startsWith('ASM-') ? courseId : null);
  const standaloneAssessment = targetAssessmentId ? (assessments || []).find((a) => a.id === targetAssessmentId) : null;

  const rawCourse = (!standaloneAssessment && courseId) ? courses.find((c) => c.id === courseId) : null;
  const rawEnrollment = rawCourse ? (myEnrollments[rawCourse.id] || rawCourse.enrollment) : null;
  const lessonView = rawCourse
    ? (rawEnrollment ? resolveCourseView(rawCourse, rawEnrollment.enrolledVersion) : rawCourse)
    : null;
  const course = rawCourse
    ? { ...rawCourse, modules: deriveLessonStatuses(lessonView.modules, rawEnrollment), enrollment: rawEnrollment }
    : null;

  // Fetch the matching assessment (standalone or from the course)
  const activeAssessment = standaloneAssessment || (course?.configuration?.assessmentEnabled ? {
    id: `ASM-CRS-${course.id}`,
    title: `${course.title} — Final Assessment`,
    description: course.description,
    type: 'QUIZ',
    deliveryFormat: DELIVERY_FORMATS.COURSE_LINKED,
    courseId: course.id,
    timeLimitMinutes: course.configuration?.assessmentTimeLimit || 15,
    passingScorePercent: course.configuration?.passingScorePercent || 80,
    maxAttempts: course.configuration?.maxAttempts || 3,
    questionsPerAttempt: course.configuration?.questionsPerAttempt || 3,
    antiCheatSettings: {
      enforceFullscreen: false,
      detectTabSwitch: true,
      maxTabSwitches: 3,
      randomizeQuestions: true,
      randomizeOptions: true,
      showWatermark: true,
    },
    feedbackSettings: {
      showAnswersAfterSubmit: true,
      showExplanations: true,
    },
  } : null);

  const [phase, setPhase] = useState('start'); // start | in-progress | result
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [tabSwitchViolations, setTabSwitchViolations] = useState(0);
  const [result, setResult] = useState(null);
  const [learnerFeedback, setLearnerFeedback] = useState('');
  const [csatRating, setCsatRating] = useState(5);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeVerified, setPasscodeVerified] = useState(false);
  const submittedRef = useRef(false);

  // Registration gate: standalone assessments require the learner to register/enroll
  // first (course-linked exams have no registration concept — always treated as
  // registered, matching the pre-existing behavior).
  const isRegistered = standaloneAssessment ? isAssessmentRegistered(activeAssessment?.id) : true;

  // Verify access rights
  const access = useMemo(() => {
    if (standaloneAssessment) {
      return getAssessmentAccess(standaloneAssessment, user, courses);
    }
    if (course) {
      const crsAccess = accessFor(course, user);
      return {
        canTake: !crsAccess.isLevelLocked && Boolean(course.configuration?.assessmentEnabled),
        isLocked: crsAccess.isLevelLocked,
        reason: crsAccess.reason,
      };
    }
    return { canTake: false, isLocked: true, reason: 'Assessment Not Found' };
  }, [standaloneAssessment, course, user, courses, accessFor]);

  // Anti-cheat: listen for tab switches / focus loss
  useEffect(() => {
    if (phase !== 'in-progress') return;

    function handleVisibilityChange() {
      if (document.hidden) {
        setTabSwitchViolations((prev) => {
          const next = prev + 1;
          const maxSwitches = activeAssessment?.antiCheatSettings?.maxTabSwitches || 3;
          if (next >= maxSwitches && !submittedRef.current) {
            alert(`CHEATING ALERT: you left the exam screen more than ${maxSwitches} times. The system has submitted your paper automatically.`);
            handleSubmit();
          }
          return next;
        });
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeAssessment]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'in-progress' || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, secondsLeft]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (phase === 'in-progress' && secondsLeft === 0 && !submittedRef.current) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  if (access.isLocked) {
    return (
      <div className="card card-pad empty-state" style={{ margin: '40px auto', maxWidth: 560 }}>
        <i className="ti ti-lock" style={{ fontSize: 48, color: 'var(--rust)' }} />
        <h2 style={{ fontSize: 18, marginTop: 10 }}>This Assessment Is Not Accessible</h2>
        <p style={{ color: 'var(--ink-soft)' }}>{access.reason}</p>
        <Button variant="primary" onClick={() => navigate(basePath)}>Back To The Catalog</Button>
      </div>
    );
  }

  if (!activeAssessment) {
    return (
      <div className="empty-state">
        <i className="ti ti-mood-empty" aria-hidden="true" />
        <p>The assessment does not exist.</p>
        <Link to={basePath}>Back to the catalog</Link>
      </div>
    );
  }

  function start() {
    submittedRef.current = false;
    let drawn = [];

    if (standaloneAssessment) {
      let pool = [];
      if (standaloneAssessment.questions && standaloneAssessment.questions.length > 0) {
        pool = [...standaloneAssessment.questions];
      } else if (standaloneAssessment.questionIds && standaloneAssessment.questionIds.length > 0) {
        pool = (questionBanks || []).filter((q) => standaloneAssessment.questionIds.includes(q.id));
      } else {
        pool = (questionBanks || []).slice(0, 4);
      }

      drawn = standaloneAssessment.antiCheatSettings?.randomizeQuestions
        ? [...pool].sort(() => 0.5 - Math.random())
        : [...pool];
    } else if (course) {
      drawn = drawAssessmentQuestions(course).map((q) => ({
        ...q,
        question: q.text || q.question,
        questionType: q.type === 'MULTIPLE_CHOICE' ? QUESTION_TYPES.MULTIPLE_CHOICE : q.type === 'SHORT_ANSWER' ? QUESTION_TYPES.ESSAY : QUESTION_TYPES.SINGLE_CHOICE,
      }));
    }

    const initialAnswers = {};
    drawn.forEach((q) => {
      if (q.questionType === QUESTION_TYPES.ORDERING) {
        const items = q.options || q.sequenceItems || [];
        // The initial shuffle for an ordering question, for the learner to re-sort
        initialAnswers[q.id] = [...items].sort(() => 0.5 - Math.random()).map((x) => x.id);
      }
    });

    setQuestions(drawn);
    setAnswers(initialAnswers);
    setTabSwitchViolations(0);
    setSecondsLeft((activeAssessment.timeLimitMinutes || 15) * 60);
    setResult(null);
    setPhase('in-progress');
  }

  function handleAnswer(question, value) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function handleToggleMulti(question, optionId) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[question.id]) ? prev[question.id] : [];
      const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
      return { ...prev, [question.id]: next };
    });
  }

  function handleMatchingPair(question, pairId, selectedRight) {
    setAnswers((prev) => {
      const current = prev[question.id] || {};
      return { ...prev, [question.id]: { ...current, [pairId]: selectedRight } };
    });
  }

  function handleMoveOrderItem(question, fromIndex, toIndex) {
    setAnswers((prev) => {
      const items = qItems(question);
      const currentOrder = prev[question.id] || items.map((x) => x.id);
      if (toIndex < 0 || toIndex >= currentOrder.length) return prev;
      const next = [...currentOrder];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...prev, [question.id]: next };
    });
  }

  function qItems(question) {
    return question.options || question.sequenceItems || [];
  }

  function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;

    const totalScore = questions.reduce((s, q) => s + (q.score || 10), 0) || 1;
    let earnedScore = 0;

    questions.forEach((q) => {
      if (isAnswerCorrect(q, answers[q.id])) {
        earnedScore += (q.score || 10);
      }
    });

    const scorePercent = Math.round((earnedScore / totalScore) * 100);
    const passingScore = activeAssessment.passingScorePercent ?? 80;
    const passed = activeAssessment.type === 'SURVEY' ? true : scorePercent >= passingScore;

    // Compute competency results
    const compMap = new Map();
    questions.forEach((q) => {
      const comp = q.competency || 'General Competency';
      if (!compMap.has(comp)) compMap.set(comp, { total: 0, earned: 0 });
      const item = compMap.get(comp);
      item.total += (q.score || 10);
      if (isAnswerCorrect(q, answers[q.id])) item.earned += (q.score || 10);
    });

    const competencyResults = Array.from(compMap.entries()).map(([name, data]) => {
      const compPct = Math.round((data.earned / (data.total || 1)) * 100);
      const curLvl = compPct >= 80 ? 4 : compPct >= 60 ? 3 : 2;
      const reqLvl = 3;
      const gap = curLvl - reqLvl;
      return {
        competencyName: name,
        currentLevel: curLvl,
        requiredLevel: reqLvl,
        gap,
        recommendation: gap >= 0 ? 'Solid capability; ready for greater responsibility.' : 'Additional hands-on skills courses are needed.',
      };
    });

    const attemptRecord = {
      attemptId: `ATT-${Date.now()}`,
      assessmentId: activeAssessment.id,
      userId: user?.userId,
      userName: user?.fullName,
      userRole: user?.role,
      userLevel: user?.level,
      department: user?.departmentName || user?.departmentCode || 'MMVN',
      startTime: new Date(Date.now() - (activeAssessment.timeLimitMinutes * 60 - secondsLeft) * 1000).toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: (activeAssessment.timeLimitMinutes * 60 - secondsLeft),
      violations: {
        tabSwitches: tabSwitchViolations,
      },
      answers,
      scoring: {
        rawScore: earnedScore,
        maxScore: totalScore,
        weightedScore: scorePercent,
        percentage: scorePercent,
        passed,
        gradedBy: 'SYSTEM_AUTO',
      },
      feedback: {
        learnerFeedback,
        csatScore: csatRating,
      },
      competencyResult: competencyResults,
    };

    recordAssessmentAttempt(attemptRecord);

    if (course) {
      const nowStr = new Date().toISOString().slice(0, 10);
      const validityMonths = course.configuration?.validityPeriodMonths !== undefined ? parseInt(course.configuration.validityPeriodMonths, 10) : 12;
      const validUntilStr = computeValidUntilDate(nowStr, validityMonths);
      const updatedCourse = applyAssessmentAttempt(course, { score: scorePercent, passed, answered: Object.keys(answers).length });
      if (passed) {
        if (!updatedCourse.enrollment) updatedCourse.enrollment = {};
        updatedCourse.enrollment.status = 'COMPLETED';
        updatedCourse.enrollment.progressPercent = 100;
        updatedCourse.enrollment.completedAt = nowStr;
        updatedCourse.enrollment.validUntil = validUntilStr;
      }
      saveCourseProgress(course.id, updatedCourse);
    }



    setResult({
      score: scorePercent,
      passed,
      earnedScore,
      totalScore,
      competencyResults,
    });
    setPhase('result');
  }

  // --- START SCREEN (START) ---
  if (phase === 'start') {
    return (
      <div style={{ maxWidth: 760, margin: '20px auto' }}>
        <div className="page-crumb" style={{ marginBottom: 8 }}>
          <Link to={basePath} style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>
            <i className="ti ti-arrow-left" style={{ marginRight: 4 }} />
            Back To The Catalog
          </Link>
        </div>

        <div className="page-header" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{activeAssessment.title}</h1>
            <Badge tone="sage">{activeAssessment.type}</Badge>
          </div>
          <p>{activeAssessment.description}</p>
        </div>

        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Time Taken</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{activeAssessment.timeLimitMinutes} min</div>
            </div>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Pass Mark</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sage)' }}>{activeAssessment.passingScorePercent}%</div>
            </div>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Maximum Attempts</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--rail)' }}>{activeAssessment.maxAttempts} attempts</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
              <i className="ti ti-shield-lock" style={{ color: 'var(--rail)', marginRight: 6 }} />
              Rules &amp; Anti-Cheating Monitoring:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              <li>Do not switch tabs or open other applications during the exam (violations are recorded).</li>
              <li>The system submits the paper automatically when the countdown ends.</li>
              <li>Exam security: your name and employee code are watermarked on the exam screen.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            {!isRegistered ? (
              <Button variant="primary" icon="ti-clipboard-check" size="lg" onClick={() => enrollAssessment(activeAssessment.id)}>
                Enroll / Register for Examination
              </Button>
            ) : activeAssessment.evaluationMode === ASSESSMENT_MODES.PROMOTION && !passcodeVerified ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  <i className="ti ti-lock" style={{ marginRight: 6, color: 'var(--rust)' }} />
                  Enter The Exam Room / Proctor Passcode To Continue
                </div>
                <input
                  type="password"
                  className="field-input"
                  value={passcodeInput}
                  onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(''); }}
                  placeholder="Exam Room Passcode"
                  style={{ maxWidth: 260 }}
                />
                {passcodeError && <div style={{ fontSize: 12, color: 'var(--rust)' }}>{passcodeError}</div>}
                <div>
                  <Button
                    variant="primary"
                    icon="ti-key"
                    onClick={() => {
                      if (passcodeInput === activeAssessment.passcode) { setPasscodeVerified(true); }
                      else { setPasscodeError('Incorrect passcode. Please contact your Proctor / Examination Board.'); }
                    }}
                  >
                    Unlock Exam Paper
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" icon="ti-player-play" size="lg" onClick={start}>
                {activeAssessment.evaluationMode === ASSESSMENT_MODES.PROMOTION ? 'Enter Exam Room' : 'Start The Exam Now'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- EXAM SCREEN (IN-PROGRESS) ---
  if (phase === 'in-progress') {
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const ss = String(secondsLeft % 60).padStart(2, '0');

    return (
      <div style={{ maxWidth: 840, margin: '16px auto', position: 'relative' }}>
        {/* Anti-cheat Watermark (suppressed for anonymous EES surveys — no name/employee-code) */}
        {activeAssessment.antiCheatSettings?.showWatermark && activeAssessment.evaluationMode !== ASSESSMENT_MODES.EES && (
          <div style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.04,
            fontSize: 28,
            fontWeight: 800,
            transform: 'rotate(-25deg)',
            zIndex: 999,
            userSelect: 'none',
          }}>
            {user?.fullName} &bull; {user?.employeeCode || user?.userId} &bull; {new Date().toLocaleDateString()}
          </div>
        )}

        {/* Sticky Header with Timer & Violations */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--paper)',
          padding: '12px 16px',
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          border: '1px solid var(--line)',
        }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0, color: 'var(--ink)' }}>{activeAssessment.title}</h2>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Answered {Object.keys(answers).length}/{questions.length} questions
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tabSwitchViolations > 0 && (
              <Badge tone="rust" icon="ti-alert-triangle">
                {tabSwitchViolations} tab-switch violations
              </Badge>
            )}
            <Badge tone={secondsLeft < 120 ? 'rust' : 'amber'} icon="ti-clock" size="lg">
              {mm}:{ss}
            </Badge>
          </div>
        </div>

        {/* Question List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {questions.map((q, idx) => {
            const currentAnswer = answers[q.id];

            return (
              <div key={q.id} className="card card-pad" style={{ border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                    Question {idx + 1}: {q.question}
                  </div>
                  <Badge tone="slate" size="sm">{q.score || 10} points</Badge>
                </div>

                {/* 1. SINGLE CHOICE, TRUE/FALSE, YES/NO */}
                {(q.questionType === QUESTION_TYPES.SINGLE_CHOICE ||
                  q.questionType === QUESTION_TYPES.TRUE_FALSE ||
                  q.questionType === QUESTION_TYPES.YES_NO) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(q.options || []).map((opt) => (
                      <label
                        key={opt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          borderRadius: 6,
                          background: currentAnswer === opt.id ? 'var(--paper-sunken)' : 'transparent',
                          border: currentAnswer === opt.id ? '1.5px solid var(--rail)' : '1px solid var(--line)',
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={currentAnswer === opt.id}
                          onChange={() => handleAnswer(q, opt.id)}
                        />
                        <span>{opt.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* 2. MULTIPLE CHOICE */}
                {q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(q.options || []).map((opt) => {
                      const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: isSelected ? 'var(--paper-sunken)' : 'transparent',
                            border: isSelected ? '1.5px solid var(--rail)' : '1px solid var(--line)',
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleMulti(q, opt.id)}
                          />
                          <span>{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 3. MATCHING */}
                {q.questionType === QUESTION_TYPES.MATCHING && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(q.options || q.pairs || []).map((pair) => (
                      <div
                        key={pair.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          gap: 10,
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--paper-sunken)',
                          borderRadius: 6,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{pair.left}</div>
                        <i className="ti ti-arrow-right" style={{ color: 'var(--ink-faint)' }} />
                        <select
                          className="field-input"
                          value={(currentAnswer && currentAnswer[pair.id]) || ''}
                          onChange={(e) => handleMatchingPair(q, pair.id, e.target.value)}
                        >
                          <option value="">-- Choose the matching side --</option>
                          {(q.options || q.pairs || []).map((o) => (
                            <option key={o.id} value={o.right}>{o.right}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. ORDERING / SEQUENCE */}
                {q.questionType === QUESTION_TYPES.ORDERING && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8 }}>
                      Use the up/down arrow buttons to put the steps into the correct execution order:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(() => {
                        const items = q.options || q.sequenceItems || [];
                        const orderIds = Array.isArray(currentAnswer) && currentAnswer.length === items.length
                          ? currentAnswer
                          : items.map((x) => x.id);

                        return orderIds.map((itemId, itemIdx) => {
                          const itemObj = items.find((x) => x.id === itemId) || {};
                          return (
                            <div
                              key={itemId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '8px 12px',
                                background: 'var(--paper-sunken)',
                                border: '1px solid var(--line)',
                                borderRadius: 6,
                              }}
                            >
                              <Badge tone="slate" size="sm">Step {itemIdx + 1}</Badge>
                              <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{itemObj.text}</div>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={itemIdx === 0}
                                  onClick={() => handleMoveOrderItem(q, itemIdx, itemIdx - 1)}
                                  style={{ padding: '2px 6px' }}
                                >
                                  ▲ Up
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={itemIdx === orderIds.length - 1}
                                  onClick={() => handleMoveOrderItem(q, itemIdx, itemIdx + 1)}
                                  style={{ padding: '2px 6px' }}
                                >
                                  ▼ Down
                                </Button>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* 5. FILL IN BLANK & SHORT ANSWER */}
                {(q.questionType === QUESTION_TYPES.FILL_IN_BLANK || q.questionType === QUESTION_TYPES.SHORT_ANSWER) && (
                  <div>
                    <input
                      type="text"
                      className="field-input"
                      style={{ fontSize: 13 }}
                      placeholder={q.placeholderTemplate || 'Enter your answer or keyword...'}
                      value={currentAnswer || ''}
                      onChange={(e) => handleAnswer(q, e.target.value)}
                    />
                  </div>
                )}

                {/* 6. SCENARIO BASED, CASE STUDY, SIMULATION */}
                {(q.questionType === QUESTION_TYPES.SCENARIO_BASED ||
                  q.questionType === QUESTION_TYPES.CASE_STUDY ||
                  q.questionType === QUESTION_TYPES.SIMULATION) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {q.scenarioContext && (
                      <div style={{ padding: '10px 14px', background: 'var(--paper-sunken)', borderRadius: 6, borderLeft: '4px solid var(--rail)', fontSize: 13, lineHeight: 1.5, color: 'var(--ink)' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--rail)' }}>📖 Real-World Scenario:</div>
                        {q.scenarioContext}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(q.options || []).map((opt) => (
                        <label
                          key={opt.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: currentAnswer === opt.id ? 'var(--paper-sunken)' : 'transparent',
                            border: currentAnswer === opt.id ? '1.5px solid var(--rail)' : '1px solid var(--line)',
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={currentAnswer === opt.id}
                            onChange={() => handleAnswer(q, opt.id)}
                          />
                          <span>{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. HOTSPOT & IMAGE BASED */}
                {(q.questionType === QUESTION_TYPES.HOTSPOT || q.questionType === QUESTION_TYPES.IMAGE_BASED) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {q.imageUrl && (
                      <div style={{ maxHeight: 240, overflow: 'hidden', borderRadius: 8, border: '1px solid var(--line)', textAlign: 'center', background: '#000' }}>
                        <img src={q.imageUrl} alt="A visual scenario" style={{ maxHeight: 240, maxWidth: '100%', objectFit: 'contain' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(q.options || []).map((opt) => (
                        <label
                          key={opt.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: currentAnswer === opt.id ? 'var(--paper-sunken)' : 'transparent',
                            border: currentAnswer === opt.id ? '1.5px solid var(--rail)' : '1px solid var(--line)',
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={currentAnswer === opt.id}
                            onChange={() => handleAnswer(q, opt.id)}
                          />
                          <span>{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. VIDEO BASED */}
                {q.questionType === QUESTION_TYPES.VIDEO_BASED && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {q.videoUrl && (
                      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)', background: '#000' }}>
                        <video controls src={q.videoUrl} style={{ width: '100%', maxHeight: 260 }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(q.options || []).map((opt) => (
                        <label
                          key={opt.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: currentAnswer === opt.id ? 'var(--paper-sunken)' : 'transparent',
                            border: currentAnswer === opt.id ? '1.5px solid var(--rail)' : '1px solid var(--line)',
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={currentAnswer === opt.id}
                            onChange={() => handleAnswer(q, opt.id)}
                          />
                          <span>{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* 9. ESSAY */}
                {q.questionType === QUESTION_TYPES.ESSAY && (
                  <div>
                    <textarea
                      className="field-input"
                      rows={4}
                      placeholder="Enter your answer or set out your approach here..."
                      value={currentAnswer || ''}
                      onChange={(e) => handleAnswer(q, e.target.value)}
                    />
                  </div>
                )}

                {/* 10. RATING SCALE */}
                {q.questionType === QUESTION_TYPES.RATING_SCALE && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(q.options || []).map((opt) => (
                      <Button
                        key={opt.id}
                        type="button"
                        variant={currentAnswer === opt.id ? 'primary' : 'outline'}
                        onClick={() => handleAnswer(q, opt.id)}
                      >
                        {opt.text}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingBottom: 40 }}>
          <Button variant="primary" size="lg" icon="ti-send" onClick={handleSubmit}>
            Submit The Assessment
          </Button>
        </div>
      </div>
    );
  }

  // --- RESULT SCREEN (RESULT) ---
  if (activeAssessment.evaluationMode === ASSESSMENT_MODES.PROMOTION) {
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', textAlign: 'center' }}>
        <div className="card card-pad" style={{ padding: 32 }}>
          <i className="ti ti-shield-check" style={{ fontSize: 56, color: 'var(--rail)' }} />
          <h2 style={{ marginTop: 16, fontSize: 20 }}>Submission Recorded</h2>
          <p style={{ color: 'var(--ink-soft)', marginTop: 8, lineHeight: 1.6 }}>
            Your promotion examination submission has been securely recorded. Official results will be validated and published by the Evaluation Committee &amp; HR Department.
          </p>
          <Button variant="primary" style={{ marginTop: 16 }} onClick={() => navigate(basePath)}>
            Finish &amp; Return To The Course Catalog
          </Button>
        </div>
      </div>
    );
  }
  if (activeAssessment.evaluationMode === ASSESSMENT_MODES.SURVEY || activeAssessment.evaluationMode === ASSESSMENT_MODES.EES) {
    const isEes = activeAssessment.evaluationMode === ASSESSMENT_MODES.EES;
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', textAlign: 'center' }}>
        <div className="card card-pad" style={{ padding: 32 }}>
          <i className="ti ti-heart-handshake" style={{ fontSize: 56, color: 'var(--sage)' }} />
          <h2 style={{ marginTop: 16, fontSize: 20 }}>Thank You For Your Feedback!</h2>
          <p style={{ color: 'var(--ink-soft)', marginTop: 8, lineHeight: 1.6 }}>
            {isEes
              ? 'Your response has been recorded anonymously and will be included in the company-wide engagement analysis.'
              : 'Your feedback has been recorded and helps us improve future training.'}
          </p>
          <Button variant="primary" style={{ marginTop: 16 }} onClick={() => navigate(basePath)}>
            Finish &amp; Return To The Course Catalog
          </Button>
        </div>
      </div>
    );
  }
  // existing RESULT screen JSX (TEST / undefined mode) continues unchanged below this line
  return (
    <div style={{ maxWidth: 760, margin: '20px auto' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1>Exam Result</h1>
        <p>Score report, competency gap review and answer explanations</p>
      </div>

      <div className="card card-pad" style={{
        textAlign: 'center',
        padding: 24,
        marginBottom: 16,
        borderColor: result?.passed ? 'var(--sage)' : 'var(--rust)',
      }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: result?.passed ? 'var(--sage)' : 'var(--rust)', marginBottom: 6 }}>
          {result?.score}%
        </div>
        <Badge tone={result?.passed ? 'sage' : 'rust'} size="lg">
          {result?.passed ? '🎉 CONGRATULATIONS: YOU PASSED THE EXAMINATION' : '⚠️ BELOW THE PASS MARK'}
        </Badge>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 10 }}>
          Score achieved: <strong>{result?.earnedScore} / {result?.totalScore} points</strong> &middot; Violations: {tabSwitchViolations}
        </div>
        {result?.passed && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--bigc-green-soft)', border: '1px solid rgba(0,158,73,0.2)', fontSize: 13, color: 'var(--bigc-green-soft-text)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <i className="ti ti-certificate" style={{ fontSize: 18 }} />
            <span>Your digital certificate has been extended for another 12 months!</span>
          </div>
        )}
      </div>


      {/* Competency Gap Result Section */}
      {result?.competencyResults && result.competencyResults.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--ink)' }}>
            <i className="ti ti-chart-radar" style={{ color: 'var(--rail)', marginRight: 6 }} />
            Competency Gap Analysis:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.competencyResults.map((cr, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--paper-sunken)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong>{cr.competencyName}</strong>
                  <Badge tone={cr.gap >= 0 ? 'sage' : 'rust'}>
                    {cr.gap >= 0 ? `+${cr.gap} Above Requirement` : `${cr.gap} Below Requirement`}
                  </Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Assessment level: <strong>Lvl {cr.currentLevel}</strong> / Required: <strong>Lvl {cr.requiredLevel}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic', marginTop: 4 }}>
                  Recommendation: {cr.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Question Review with Explanations */}
      {activeAssessment.feedbackSettings?.showExplanations && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--ink)' }}>
            <i className="ti ti-notes" style={{ color: 'var(--rail)', marginRight: 6 }} />
            Answer Explanations &amp; Per-Question Detail:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map((q, i) => {
              const isCorrect = isAnswerCorrect(q, answers[q.id]);
              return (
                <div key={q.id} style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--paper-sunken)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Question {i + 1}: {q.question}</div>
                    <Badge tone={isCorrect ? 'sage' : 'rust'}>{isCorrect ? 'CORRECT' : 'INCORRECT'}</Badge>
                  </div>
                  {q.explanation && (
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic', marginTop: 4 }}>
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
        {result?.passed && (
          <Button variant="primary" tone="success" icon="ti-certificate" onClick={() => navigate('/learner/certificates')}>
            View The New Digital Certificate
          </Button>
        )}
        <Button variant={result?.passed ? 'outline' : 'primary'} onClick={() => navigate(basePath)}>
          Finish &amp; Return To The Course Catalog
        </Button>
      </div>

    </div>
  );
}
