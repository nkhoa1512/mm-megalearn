import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Button, JobLevelBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { QUESTION_TYPES, DELIVERY_FORMATS } from '../../data/assessmentData';
import { getAssessmentAccess } from '../../utils/assessmentCatalog';
import { applyAssessmentAttempt, drawAssessmentQuestions, resolveCourseView, deriveLessonStatuses, deriveAssessmentAttempts } from '../../data/mockData';

function isAnswerCorrect(question, answerValue) {
  if (!question || !answerValue) return false;

  if (question.questionType === QUESTION_TYPES.ESSAY || question.type === 'SHORT_ANSWER') {
    const text = Array.isArray(answerValue) ? (answerValue[0] || '') : String(answerValue);
    if (!text.trim()) return false;
    if (question.options && question.options.length > 0) {
      return question.options.some((o) => o.text.trim().toLowerCase() === text.trim().toLowerCase());
    }
    return text.trim().length >= 10; // Essay passes if reasonable response is provided
  }

  if (question.questionType === QUESTION_TYPES.MATCHING) {
    if (typeof answerValue !== 'object') return false;
    const pairs = question.options || [];
    return pairs.every((p) => answerValue[p.id] === p.right);
  }

  if (question.questionType === QUESTION_TYPES.RATING_SCALE) {
    return true; // Khảo sát luôn hợp lệ
  }

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
  } = useCourseStore();

  const user = currentUser;

  // Xác định xem đang thi Assessment Độc Lập hay Assessment theo Khóa Học
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

  // Lấy Assessment tương ứng (Standalone hoặc lấy từ Course)
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
  const submittedRef = useRef(false);

  // Thẩm định quyền truy cập
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
    return { canTake: false, isLocked: true, reason: 'Không tìm thấy Assessment' };
  }, [standaloneAssessment, course, user, courses, accessFor]);

  // Anti-cheat: Lắng nghe chuyển tab / mất focus
  useEffect(() => {
    if (phase !== 'in-progress') return;

    function handleVisibilityChange() {
      if (document.hidden) {
        setTabSwitchViolations((prev) => {
          const next = prev + 1;
          const maxSwitches = activeAssessment?.antiCheatSettings?.maxTabSwitches || 3;
          if (next >= maxSwitches && !submittedRef.current) {
            alert(`CẢNH BÁO GIAN LẬN: Bạn đã rời màn hình thi quá ${maxSwitches} lần. Hệ thống tự động thu bài.`);
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

  // Đếm ngược thời gian
  useEffect(() => {
    if (phase !== 'in-progress' || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, secondsLeft]);

  // Tự động nộp khi hết giờ
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
        <h2 style={{ fontSize: 18, marginTop: 10 }}>Bài Assessment Chưa Thể Truy Cập</h2>
        <p style={{ color: 'var(--ink-soft)' }}>{access.reason}</p>
        <Button variant="primary" onClick={() => navigate(basePath)}>Quay Lại Danh Mục</Button>
      </div>
    );
  }

  if (!activeAssessment) {
    return (
      <div className="empty-state">
        <i className="ti ti-mood-empty" aria-hidden="true" />
        <p>Assessment không tồn tại.</p>
        <Link to={basePath}>Quay lại danh mục</Link>
      </div>
    );
  }

  function start() {
    submittedRef.current = false;
    let drawn = [];

    if (standaloneAssessment && standaloneAssessment.questionIds) {
      const pool = (questionBanks || []).filter((q) => standaloneAssessment.questionIds.includes(q.id));
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

    setQuestions(drawn);
    setAnswers({});
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

    // Tính Competency Results
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
        recommendation: gap >= 0 ? 'Năng lực vững vàng, sẵn sàng nhận nhiệm vụ cao hơn.' : 'Cần tham gia thêm các khóa bổ trợ kỹ năng thực hành.',
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
      const updatedCourse = applyAssessmentAttempt(course, { score: scorePercent, passed, answered: Object.keys(answers).length });
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

  // --- MÀN HÌNH BẮT ĐẦU (START) ---
  if (phase === 'start') {
    return (
      <div style={{ maxWidth: 760, margin: '20px auto' }}>
        <div className="page-crumb" style={{ marginBottom: 8 }}>
          <Link to={basePath} style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>
            <i className="ti ti-arrow-left" style={{ marginRight: 4 }} />
            Quay lại Danh Mục
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
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Thời Gian Làm Bài</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{activeAssessment.timeLimitMinutes} phút</div>
            </div>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Điểm Chuẩn Đạt</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sage)' }}>{activeAssessment.passingScorePercent}%</div>
            </div>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Số Lần Thi Tối Đa</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--rail)' }}>{activeAssessment.maxAttempts} lần</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
              <i className="ti ti-shield-lock" style={{ color: 'var(--rail)', marginRight: 6 }} />
              Quy Định &amp; Giám Sát Chống Gian Lận:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              <li>Không chuyển tab hoặc mở ứng dụng khác trong quá trình thi (Hệ thống ghi nhận vi phạm).</li>
              <li>Hệ thống tự động nộp bài khi hết thời gian đếm ngược.</li>
              <li>Bảo mật đề thi: Tên và mã nhân viên của bạn được watermark trên màn hình thi.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <Button variant="primary" icon="ti-player-play" size="lg" onClick={start}>
              Bắt Đầu Làm Bài Ngay
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- MÀN HÌNH LÀM BÀI (IN-PROGRESS) ---
  if (phase === 'in-progress') {
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const ss = String(secondsLeft % 60).padStart(2, '0');

    return (
      <div style={{ maxWidth: 840, margin: '16px auto', position: 'relative' }}>
        {/* Anti-cheat Watermark */}
        {activeAssessment.antiCheatSettings?.showWatermark && (
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
              Đã trả lời {Object.keys(answers).length}/{questions.length} câu hỏi
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tabSwitchViolations > 0 && (
              <Badge tone="rust" icon="ti-alert-triangle">
                {tabSwitchViolations} vi phạm chuyển tab
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
                    Câu {idx + 1}: {q.question}
                  </div>
                  <Badge tone="slate" size="sm">{q.score || 10} điểm</Badge>
                </div>

                {/* 1. SINGLE CHOICE & TRUE/FALSE */}
                {(q.questionType === QUESTION_TYPES.SINGLE_CHOICE || q.questionType === QUESTION_TYPES.TRUE_FALSE) && (
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
                          border: currentAnswer === opt.id ? '1px solid var(--rail)' : '1px solid var(--line)',
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
                        {opt.text}
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
                            border: isSelected ? '1px solid var(--rail)' : '1px solid var(--line)',
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleMulti(q, opt.id)}
                          />
                          {opt.text}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 3. ESSAY */}
                {q.questionType === QUESTION_TYPES.ESSAY && (
                  <div>
                    <textarea
                      className="field-input"
                      rows={4}
                      placeholder="Nhập câu trả lời hoặc trình bày phương án của bạn tại đây..."
                      value={currentAnswer || ''}
                      onChange={(e) => handleAnswer(q, e.target.value)}
                    />
                  </div>
                )}

                {/* 4. RATING SCALE */}
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

                {/* 5. MATCHING */}
                {q.questionType === QUESTION_TYPES.MATCHING && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(q.options || []).map((pair) => (
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
                          <option value="">-- Chọn đáp án ghép đôi --</option>
                          {(q.options || []).map((o) => (
                            <option key={o.id} value={o.right}>{o.right}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingBottom: 40 }}>
          <Button variant="primary" size="lg" icon="ti-send" onClick={handleSubmit}>
            Nộp Bài Assessment
          </Button>
        </div>
      </div>
    );
  }

  // --- MÀN HÌNH KẾT QUẢ (RESULT) ---
  return (
    <div style={{ maxWidth: 760, margin: '20px auto' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1>Kết Quả Đánh Giá Bài Thi</h1>
        <p>Báo cáo điểm số, đánh giá khoảng cách năng lực và giải thích đáp án</p>
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
          {result?.passed ? '🎉 CHÚC MỪNG: BẠN ĐÃ ĐẠT' : '⚠️ CHƯA ĐẠT ĐIỂM CHUẨN'}
        </Badge>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 10 }}>
          Điểm số đạt được: <strong>{result?.earnedScore} / {result?.totalScore} điểm</strong> &middot; Vi phạm: {tabSwitchViolations} lần
        </div>
      </div>

      {/* Competency Gap Result Section */}
      {result?.competencyResults && result.competencyResults.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--ink)' }}>
            <i className="ti ti-chart-radar" style={{ color: 'var(--rail)', marginRight: 6 }} />
            Đo Lường Khoảng Cách Năng Lực (Competency Gap Analysis):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.competencyResults.map((cr, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--paper-sunken)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong>{cr.competencyName}</strong>
                  <Badge tone={cr.gap >= 0 ? 'sage' : 'rust'}>
                    {cr.gap >= 0 ? `+${cr.gap} Đạt Yêu Cầu` : `${cr.gap} Chưa Đạt`}
                  </Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Cấp độ đánh giá: <strong>Lvl {cr.currentLevel}</strong> / Yêu cầu: <strong>Lvl {cr.requiredLevel}</strong>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontStyle: 'italic', marginTop: 4 }}>
                  Khuyến nghị: {cr.recommendation}
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
            Giải Thích Đáp Án &amp; Chi Tiết Từng Câu:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map((q, i) => {
              const isCorrect = isAnswerCorrect(q, answers[q.id]);
              return (
                <div key={q.id} style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--paper-sunken)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Câu {i + 1}: {q.question}</div>
                    <Badge tone={isCorrect ? 'sage' : 'rust'}>{isCorrect ? 'ĐÚNG' : 'SAI'}</Badge>
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
        <Button variant="primary" onClick={() => navigate(basePath)}>
          Hoàn Tất &amp; Về Danh Mục
        </Button>
      </div>
    </div>
  );
}
