import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { applyAssessmentAttempt, drawAssessmentQuestions, currentUser } from '../../data/mockData';
import { Badge, Button, JobLevelBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

function requiredLessonsOf(course) {
  return course.modules.flatMap((m) => m.lessons.filter((l) => l.isRequired && l.lessonType !== 'ASSESSMENT'));
}

function isAnswerCorrect(question, selectedIds) {
  if (question.type === 'SHORT_ANSWER') {
    const typed = (selectedIds[0] || '').trim().toLowerCase();
    if (!typed) return false;
    return question.options.some((o) => o.text.trim().toLowerCase() === typed);
  }
  const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id).sort();
  const chosen = [...selectedIds].sort();
  return correctIds.length === chosen.length && correctIds.every((id, i) => id === chosen[i]);
}

// FR-ASSESS-003..010: draws a random subset from the question bank, times the
// attempt, scores it against the passing score, and records one
// ASSESSMENT_ATTEMPT — attempts are capped per BR-020.
export default function AssessmentPlayer({ basePath = '/learner/courses' }) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courses, saveCourseProgress, currentUser: authUser, accessFor, myEnrollments } = useCourseStore();
  const user = authUser || currentUser;
  const rawCourse = courses.find((c) => c.id === courseId);
  const course = rawCourse
    ? { ...rawCourse, enrollment: myEnrollments[rawCourse.id] || rawCourse.enrollment }
    : null;

  const [phase, setPhase] = useState('start');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState(null);
  const submittedRef = useRef(false);

  const access = accessFor(course, user);

  // Toàn bộ hook phải chạy trước mọi nhánh return sớm (rules of hooks).
  useEffect(() => {
    if (phase !== 'in-progress' || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (phase === 'in-progress' && secondsLeft === 0 && !submittedRef.current) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  if (access.isLevelLocked) {
    return (
      <div className="card card-pad empty-state" style={{ margin: '40px auto', maxWidth: 560 }}>
        <i className="ti ti-lock" style={{ fontSize: 48, color: 'var(--rust)' }} />
        <h2 style={{ fontSize: 18, marginTop: 10 }}>Khóa học chưa mở theo quy tắc cấp bậc tuần tự</h2>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', margin: '10px 0' }}>
          <JobLevelBadge level={access.userLevel} />
          <i className="ti ti-arrow-right" style={{ color: 'var(--ink-faint)' }} />
          <JobLevelBadge level={access.courseLevel} />
        </div>
        <p style={{ color: 'var(--ink-soft)' }}>{access.reason}</p>
        <Button variant="primary" onClick={() => navigate(`${basePath}/${course.id}`)}>Xem Chi Tiết &amp; Xin Phê Duyệt</Button>
      </div>
    );
  }

  if (!course || !course.enrollment || !course.configuration.assessmentEnabled) {
    return (
      <div className="empty-state">
        <i className="ti ti-mood-empty" aria-hidden="true" />
        <p>Assessment not found.</p>
        <Link to={basePath}>Back to my courses</Link>
      </div>
    );
  }

  const cfg = course.configuration;
  const attempts = course.assessmentAttempts || [];
  const attemptsLeft = cfg.maxAttempts - attempts.length;
  const alreadyPassed = attempts.some((a) => a.passed);
  const req = requiredLessonsOf(course);
  const lessonsIncomplete = req.filter((l) => l.status !== 'COMPLETED');

  function start() {
    submittedRef.current = false;
    const drawn = drawAssessmentQuestions(course);
    setQuestions(drawn);
    setAnswers({});
    setSecondsLeft(cfg.assessmentTimeLimit * 60);
    setResult(null);
    setPhase('in-progress');
  }

  function toggleAnswer(question, optionId) {
    setAnswers((prev) => {
      const current = prev[question.id] || [];
      if (question.type === 'MULTIPLE_CHOICE') {
        const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
        return { ...prev, [question.id]: next };
      }
      return { ...prev, [question.id]: [optionId] };
    });
  }

  function setTextAnswer(question, text) {
    setAnswers((prev) => ({ ...prev, [question.id]: [text] }));
  }

  function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const totalPoints = questions.reduce((s, q) => s + q.score, 0) || 1;
    const earned = questions.reduce((s, q) => s + (isAnswerCorrect(q, answers[q.id] || []) ? q.score : 0), 0);
    const score = Math.round((earned / totalPoints) * 100);
    const passed = score >= cfg.passingScorePercent;
    const answeredCount = questions.filter((q) => (answers[q.id] || []).length > 0).length;

    const updated = applyAssessmentAttempt(course, { score, passed, answered: answeredCount });
    saveCourseProgress(course.id, updated);
    setResult({ score, passed, updatedCourse: updated, isFinalAttempt: attempts.length + 1 >= cfg.maxAttempts });
    setPhase('result');
  }

  if (phase === 'start') {
    return (
      <>
        <div className="page-crumb" style={{ marginBottom: 6 }}>
          <Link to={`${basePath}/${course.id}`} style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>{course.title}</Link> / Assessment
        </div>
        <div className="page-header">
          <h1>{course.title} — Final assessment</h1>
          <p>{cfg.questionsPerAttempt} of {cfg.questionBankSize} questions &middot; {cfg.assessmentTimeLimit} min &middot; passing score {cfg.passingScorePercent}%</p>
        </div>
        <div className="card card-pad">
          {lessonsIncomplete.length > 0 ? (
            <div className="empty-state">
              <i className="ti ti-lock" aria-hidden="true" />
              <p>Complete all required lessons before starting the assessment ({lessonsIncomplete.length} remaining).</p>
            </div>
          ) : alreadyPassed ? (
            <div className="empty-state">
              <i className="ti ti-circle-check" aria-hidden="true" />
              <p>You already passed this assessment.</p>
            </div>
          ) : attemptsLeft <= 0 ? (
            <div className="empty-state">
              <i className="ti ti-ban" aria-hidden="true" />
              <p>No attempts left ({cfg.maxAttempts} of {cfg.maxAttempts} used).</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
                Attempts used: {attempts.length} of {cfg.maxAttempts}. Questions and answer order are randomized per the course's assessment configuration.
              </p>
              <Button variant="primary" icon="ti-player-play" onClick={start}>Start assessment</Button>
            </>
          )}
        </div>
      </>
    );
  }

  if (phase === 'in-progress') {
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const ss = String(secondsLeft % 60).padStart(2, '0');
    return (
      <>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
          <h1>{course.title} — Assessment</h1>
          <Badge tone={secondsLeft < 60 ? 'rust' : 'amber'} icon="ti-clock">{mm}:{ss}</Badge>
        </div>
        {questions.map((q, i) => (
          <div className="card card-pad" key={q.id} style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>Q{i + 1}. {q.text}</div>
            {q.type === 'SHORT_ANSWER' ? (
              <input
                className="field-input"
                type="text"
                placeholder="Type your answer..."
                value={(answers[q.id] || [])[0] || ''}
                onChange={(e) => setTextAnswer(q, e.target.value)}
              />
            ) : (
              q.options.map((o) => (
                <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 0' }}>
                  <input
                    type={q.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                    name={q.id}
                    checked={(answers[q.id] || []).includes(o.id)}
                    onChange={() => toggleAnswer(q, o.id)}
                  />
                  {o.text}
                </label>
              ))
            )}
          </div>
        ))}
        <Button variant="primary" icon="ti-send" onClick={handleSubmit}>Submit assessment</Button>
      </>
    );
  }

  // phase === 'result'
  const showAnswers = cfg.showCorrectAnswers === 'IMMEDIATELY'
    || (cfg.showCorrectAnswers === 'AFTER_PASSING' && result.passed)
    || (cfg.showCorrectAnswers === 'AFTER_FINAL_ATTEMPT' && (result.passed || result.isFinalAttempt));

  return (
    <>
      <div className="page-header">
        <h1>Assessment result</h1>
      </div>
      <div className="card card-pad" style={{ marginBottom: 16, borderColor: result.passed ? 'var(--sage)' : 'var(--rust)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{result.score}%</div>
          <Badge tone={result.passed ? 'sage' : 'rust'}>{result.passed ? 'Passed' : 'Not passed'}</Badge>
        </div>
        {result.passed && result.updatedCourse.enrollment.status === 'COMPLETED' && (
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--sage-soft-text)' }}>
            Course completed{cfg.certificateEnabled ? ' — a certificate has been issued.' : '.'}
          </p>
        )}
        {!result.passed && result.updatedCourse.enrollment.status === 'FAILED' && (
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--rust)' }}>No attempts remaining — this course is now marked Failed.</p>
        )}
      </div>

      {showAnswers && (
        <div style={{ marginBottom: 16 }}>
          {questions.map((q, i) => (
            <div className="card card-pad" key={q.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Q{i + 1}. {q.text}</div>
              {q.type === 'SHORT_ANSWER' ? (
                <div style={{ fontSize: 12.5 }}>
                  <div style={{ color: isAnswerCorrect(q, answers[q.id] || []) ? 'var(--sage-soft-text)' : 'var(--rust)' }}>
                    Your answer: <strong>{(answers[q.id] || [])[0] || '(no answer)'}</strong>
                  </div>
                  <div style={{ color: 'var(--ink-soft)', marginTop: 2 }}>
                    Accepted answer(s): {q.options.map((o) => o.text).join(', ')}
                  </div>
                </div>
              ) : (
                q.options.map((o) => {
                  const chosen = (answers[q.id] || []).includes(o.id);
                  return (
                    <div key={o.id} style={{ fontSize: 12.5, padding: '3px 0', color: o.isCorrect ? 'var(--sage-soft-text)' : chosen ? 'var(--rust)' : 'var(--ink-soft)' }}>
                      {o.isCorrect ? '✓' : chosen ? '✕' : '·'} {o.text}
                    </div>
                  );
                })
              )}
              {q.explanation && <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 6 }}>{q.explanation}</div>}
            </div>
          ))}
        </div>
      )}

      <Button onClick={() => navigate(`${basePath}/${course.id}`)}>Back to course</Button>
    </>
  );
}
