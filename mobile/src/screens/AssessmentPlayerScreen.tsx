import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import { QUESTION_TYPES, DELIVERY_FORMATS } from '../data/assessmentData';
// @ts-ignore
import { getAssessmentAccess } from '../utils/assessmentCatalog';
// @ts-ignore
import {
  applyAssessmentAttempt,
  drawAssessmentQuestions,
  resolveCourseView,
  deriveLessonStatuses,
} from '../data/mockData';
// @ts-ignore
import { computeValidUntilDate } from '../utils/recertification';
import { Badge, Button, ProgressBar } from '../components/ui';
import { Screen, Card, COLORS, EmptyState, InfoRow, useColors } from '../components/layout';

export default function AssessmentPlayerScreen() {
  const COLORS = useColors();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { courseId, assessmentId } = route.params || {};

  const {
    courses,
    assessments,
    questionBanks,
    saveCourseProgress,
    recordAssessmentAttempt,
    currentUser: user,
    accessFor,
    myEnrollments,
  } = useCourseStore();

  const standaloneAssessment = assessmentId ? (assessments || []).find((a: any) => a.id === assessmentId) : null;

  const rawCourse = !standaloneAssessment && courseId ? courses.find((c: any) => c.id === courseId) : null;
  const rawEnrollment = rawCourse ? myEnrollments[rawCourse.id] || rawCourse.enrollment : null;

  const course = useMemo(() => {
    if (!rawCourse) return null;
    const view = rawEnrollment ? resolveCourseView(rawCourse, rawEnrollment.enrolledVersion) : rawCourse;
    return { ...rawCourse, modules: deriveLessonStatuses(view.modules, rawEnrollment), enrollment: rawEnrollment };
  }, [rawCourse, rawEnrollment]);

  const activeAssessment = useMemo(() => {
    if (standaloneAssessment) return standaloneAssessment;
    if (!course?.configuration?.assessmentEnabled) return null;
    return {
      id: `ASM-CRS-${course.id}`,
      title: `${course.title} — Bài thi cuối khóa`,
      description: course.description,
      type: 'QUIZ',
      deliveryFormat: DELIVERY_FORMATS.COURSE_LINKED,
      courseId: course.id,
      timeLimitMinutes: course.configuration?.assessmentTimeLimit || 15,
      passingScorePercent: course.configuration?.passingScorePercent || 80,
      maxAttempts: course.configuration?.maxAttempts || 3,
      questionsPerAttempt: course.configuration?.questionsPerAttempt || 3,
      antiCheatSettings: { detectTabSwitch: true, maxTabSwitches: 3, randomizeQuestions: true },
      feedbackSettings: { showAnswersAfterSubmit: true, showExplanations: true },
    };
  }, [standaloneAssessment, course]);

  const [phase, setPhase] = useState<'start' | 'in-progress' | 'result'>('start');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [result, setResult] = useState<any>(null);
  const submittedRef = useRef(false);

  // Các handler dùng ref để timer/AppState luôn gọi được bản mới nhất mà không
  // phải gắn lại listener sau mỗi lần state đổi.
  const submitRef = useRef<() => void>(() => {});

  const access = useMemo(() => {
    if (standaloneAssessment) return getAssessmentAccess(standaloneAssessment, user, courses);
    if (course) {
      const crsAccess = accessFor(course, user);
      return {
        canTake: !crsAccess.isLevelLocked && Boolean(course.configuration?.assessmentEnabled),
        isLocked: crsAccess.isLevelLocked,
        reason: crsAccess.reason,
      };
    }
    return { canTake: false, isLocked: true, reason: 'Không tìm thấy bài đánh giá.' };
  }, [standaloneAssessment, course, user, courses, accessFor]);

  // Chống gian lận: trên mobile không có sự kiện chuyển tab của trình duyệt —
  // tương đương là app bị đưa xuống nền (AppState rời 'active').
  useEffect(() => {
    if (phase !== 'in-progress') return undefined;
    const maxSwitches = activeAssessment?.antiCheatSettings?.maxTabSwitches || 3;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      setViolations((prev) => {
        const next = prev + 1;
        if (next >= maxSwitches && !submittedRef.current) {
          Alert.alert(
            'Cảnh báo gian lận',
            `Bạn đã rời màn hình thi quá ${maxSwitches} lần. Hệ thống tự động thu bài.`
          );
          submitRef.current();
        }
        return next;
      });
    });

    return () => sub.remove();
  }, [phase, activeAssessment]);

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (phase !== 'in-progress') return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (!submittedRef.current) submitRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  if (access.isLocked) {
    return (
      <Screen title="Bài đánh giá" back>
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Ionicons name="lock-closed" size={42} color={COLORS.red} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.ink, marginTop: 12, textAlign: 'center' }}>
            Bài đánh giá chưa thể truy cập
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.inkSoft, textAlign: 'center', marginTop: 8, marginBottom: 16, lineHeight: 17 }}>
            {access.reason}
          </Text>
          <Button variant="primary" onPress={() => navigation.goBack()}>
            Quay lại
          </Button>
        </Card>
      </Screen>
    );
  }

  if (!activeAssessment) {
    return (
      <Screen title="Bài đánh giá" back>
        <EmptyState icon="alert-circle-outline" title="Bài đánh giá không tồn tại" />
      </Screen>
    );
  }

  function start() {
    submittedRef.current = false;
    let drawn: any[] = [];

    if (standaloneAssessment) {
      let pool: any[] = [];
      if (standaloneAssessment.questions?.length) pool = [...standaloneAssessment.questions];
      else if (standaloneAssessment.questionIds?.length)
        pool = (questionBanks || []).filter((q: any) => standaloneAssessment.questionIds.includes(q.id));
      else pool = (questionBanks || []).slice(0, 4);

      drawn = standaloneAssessment.antiCheatSettings?.randomizeQuestions
        ? [...pool].sort(() => 0.5 - Math.random())
        : [...pool];
    } else if (course) {
      drawn = drawAssessmentQuestions(course).map((q: any) => ({
        ...q,
        question: q.text || q.question,
        questionType:
          q.type === 'MULTIPLE_CHOICE'
            ? QUESTION_TYPES.MULTIPLE_CHOICE
            : q.type === 'SHORT_ANSWER'
            ? QUESTION_TYPES.ESSAY
            : QUESTION_TYPES.SINGLE_CHOICE,
      }));
    }

    const initial: Record<string, any> = {};
    drawn.forEach((q) => {
      if ((q.questionType || q.type) === QUESTION_TYPES.ORDERING) {
        const items = q.options || q.sequenceItems || [];
        initial[q.id] = [...items].sort(() => 0.5 - Math.random()).map((x: any) => x.id);
      }
    });

    setQuestions(drawn);
    setAnswers(initial);
    setIndex(0);
    setViolations(0);
    setSecondsLeft((activeAssessment.timeLimitMinutes || 15) * 60);
    setResult(null);
    setPhase('in-progress');
  }

  function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;

    const totalScore = questions.reduce((s, q) => s + (q.score || 10), 0) || 1;
    let earnedScore = 0;
    questions.forEach((q) => {
      if (isAnswerCorrect(q, answers[q.id])) earnedScore += q.score || 10;
    });

    const scorePercent = Math.round((earnedScore / totalScore) * 100);
    const passingScore = activeAssessment.passingScorePercent ?? 80;
    const passed = activeAssessment.type === 'SURVEY' ? true : scorePercent >= passingScore;

    const compMap = new Map<string, { total: number; earned: number }>();
    questions.forEach((q) => {
      const comp = q.competency || 'Năng lực tổng quát';
      if (!compMap.has(comp)) compMap.set(comp, { total: 0, earned: 0 });
      const item = compMap.get(comp)!;
      item.total += q.score || 10;
      if (isAnswerCorrect(q, answers[q.id])) item.earned += q.score || 10;
    });

    const competencyResults = Array.from(compMap.entries()).map(([name, data]) => {
      const compPct = Math.round((data.earned / (data.total || 1)) * 100);
      const curLvl = compPct >= 80 ? 4 : compPct >= 60 ? 3 : 2;
      const reqLvl = 3;
      return {
        competencyName: name,
        percent: compPct,
        currentLevel: curLvl,
        requiredLevel: reqLvl,
        gap: curLvl - reqLvl,
        recommendation:
          curLvl - reqLvl >= 0
            ? 'Năng lực vững vàng, sẵn sàng nhận nhiệm vụ cao hơn.'
            : 'Cần tham gia thêm các khóa bổ trợ kỹ năng thực hành.',
      };
    });

    const spent = (activeAssessment.timeLimitMinutes || 15) * 60 - secondsLeft;
    recordAssessmentAttempt({
      attemptId: `ATT-${Date.now()}`,
      assessmentId: activeAssessment.id,
      userId: user?.userId,
      userName: user?.fullName,
      userRole: user?.role,
      userLevel: user?.level,
      department: user?.departmentName || user?.departmentCode || 'MMVN',
      startTime: new Date(Date.now() - spent * 1000).toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: spent,
      violations: { tabSwitches: violations },
      answers,
      scoring: {
        rawScore: earnedScore,
        maxScore: totalScore,
        weightedScore: scorePercent,
        percentage: scorePercent,
        passed,
        gradedBy: 'SYSTEM_AUTO',
      },
      competencyResult: competencyResults,
    });

    if (course) {
      const nowStr = new Date().toISOString().slice(0, 10);
      const validityMonths =
        course.configuration?.validityPeriodMonths !== undefined
          ? parseInt(course.configuration.validityPeriodMonths, 10)
          : 12;
      const updatedCourse = applyAssessmentAttempt(course, {
        score: scorePercent,
        passed,
        answered: Object.keys(answers).length,
      });
      if (passed) {
        if (!updatedCourse.enrollment) updatedCourse.enrollment = {};
        updatedCourse.enrollment.status = 'COMPLETED';
        updatedCourse.enrollment.progressPercent = 100;
        updatedCourse.enrollment.completedAt = nowStr;
        updatedCourse.enrollment.validUntil = computeValidUntilDate(nowStr, validityMonths);
      }
      saveCourseProgress(course.id, updatedCourse);
    }

    setResult({ score: scorePercent, passed, earnedScore, totalScore, competencyResults });
    setPhase('result');
  }
  submitRef.current = handleSubmit;

  function confirmSubmit() {
    const unanswered = questions.filter((q) => answers[q.id] === undefined).length;
    Alert.alert(
      'Nộp bài thi?',
      unanswered > 0
        ? `Bạn còn ${unanswered} câu chưa trả lời. Nộp bài ngay bây giờ?`
        : 'Bạn đã trả lời tất cả các câu. Nộp bài ngay bây giờ?',
      [
        { text: 'Xem lại', style: 'cancel' },
        { text: 'Nộp bài', style: 'destructive', onPress: handleSubmit },
      ]
    );
  }

  // --- START ---
  if (phase === 'start') {
    return (
      <Screen title="Bài sát hạch" subtitle={activeAssessment.title} back>
        <Card>
          <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.ink, lineHeight: 21 }}>
            {activeAssessment.title}
          </Text>
          {!!activeAssessment.description && (
            <Text style={{ fontSize: 12.5, color: COLORS.inkSoft, marginTop: 7, lineHeight: 18 }}>
              {activeAssessment.description}
            </Text>
          )}
        </Card>

        <Card>
          <InfoRow label="Thời gian làm bài" value={`${activeAssessment.timeLimitMinutes} phút`} icon="stopwatch-outline" />
          <InfoRow
            label="Điểm chuẩn đạt"
            value={`${activeAssessment.passingScorePercent}%`}
            icon="trophy-outline"
            valueColor={COLORS.green}
          />
          <InfoRow label="Số lần thi tối đa" value={`${activeAssessment.maxAttempts} lần`} icon="repeat-outline" />
          <InfoRow label="Số câu mỗi lượt" value={`${activeAssessment.questionsPerAttempt || '—'} câu`} icon="list-outline" />
        </Card>

        <Card style={{ backgroundColor: COLORS.amberSoft, borderColor: COLORS.amberBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="shield-checkmark" size={19} color={COLORS.amber} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.amberText }}>Quy chế chống gian lận</Text>
              <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 5, lineHeight: 17 }}>
                Hệ thống ghi nhận mỗi lần bạn thoát khỏi ứng dụng trong lúc thi. Rời màn hình quá{' '}
                {activeAssessment.antiCheatSettings?.maxTabSwitches || 3} lần, bài thi sẽ tự động bị thu.
              </Text>
            </View>
          </View>
        </Card>

        <Button variant="primary" size="lg" icon="create-outline" onPress={start}>
          Bắt đầu làm bài
        </Button>
      </Screen>
    );
  }

  // --- RESULT ---
  if (phase === 'result' && result) {
    return (
      <Screen title="Kết quả bài thi" back>
        <Card
          style={{
            alignItems: 'center',
            paddingVertical: 24,
            backgroundColor: result.passed ? COLORS.greenSoft : COLORS.redSoft,
            borderColor: result.passed ? COLORS.greenBorder : COLORS.redBorder,
          }}
        >
          <View
            style={{
              width: 74,
              height: 74,
              borderRadius: 37,
              backgroundColor: result.passed ? COLORS.green : COLORS.red,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Ionicons name={result.passed ? 'checkmark' : 'close'} size={38} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 32, fontWeight: '900', color: result.passed ? COLORS.greenDark : COLORS.redText }}>
            {result.score}%
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.ink, marginTop: 4 }}>
            {result.passed ? 'Chúc mừng, bạn đã đạt!' : 'Chưa đạt điểm chuẩn'}
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 5, textAlign: 'center' }}>
            {result.earnedScore}/{result.totalScore} điểm · chuẩn đạt {activeAssessment.passingScorePercent}%
          </Text>
        </Card>

        {result.competencyResults?.length > 0 && (
          <Card>
            <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink, marginBottom: 11 }}>
              Phân tích năng lực
            </Text>
            {result.competencyResults.map((c: any, i: number) => (
              <View key={i} style={{ marginBottom: i === result.competencyResults.length - 1 ? 0 : 13 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.ink, flex: 1 }} numberOfLines={2}>
                    {c.competencyName}
                  </Text>
                  <Badge tone={c.gap >= 0 ? 'sage' : 'amber'} size="sm">
                    {c.percent}%
                  </Badge>
                </View>
                <ProgressBar value={c.percent} tone={c.gap >= 0 ? 'sage' : 'amber'} size="sm" />
                <Text style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 5, lineHeight: 16 }}>
                  {c.recommendation}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {violations > 0 && (
          <Card style={{ backgroundColor: COLORS.redSoft, borderColor: COLORS.redBorder }}>
            <Text style={{ fontSize: 12, color: COLORS.redText, fontWeight: '700' }}>
              Ghi nhận {violations} lần rời màn hình thi.
            </Text>
          </Card>
        )}

        {/* Answer review */}
        {activeAssessment.feedbackSettings?.showAnswersAfterSubmit && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.ink, marginTop: 6, marginBottom: 10 }}>
              Xem lại đáp án
            </Text>
            {questions.map((q, i) => {
              const correct = isAnswerCorrect(q, answers[q.id]);
              return (
                <Card key={q.id} style={{ borderLeftWidth: 3, borderLeftColor: correct ? COLORS.green : COLORS.red }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 }}>
                    <Ionicons
                      name={correct ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={correct ? COLORS.green : COLORS.red}
                      style={{ marginRight: 7, marginTop: 1 }}
                    />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.ink, flex: 1, lineHeight: 18 }}>
                      Câu {i + 1}. {q.question || q.text}
                    </Text>
                  </View>
                  {(q.options || []).map((o: any) => (
                    <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3 }}>
                      <Ionicons
                        name={o.isCorrect ? 'checkmark' : 'remove'}
                        size={12}
                        color={o.isCorrect ? COLORS.green : COLORS.inkFaint}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          fontSize: 11.5,
                          color: o.isCorrect ? COLORS.greenDark : COLORS.inkSoft,
                          flex: 1,
                          fontWeight: o.isCorrect ? '700' : '400',
                        }}
                      >
                        {o.text}
                      </Text>
                    </View>
                  ))}
                  {activeAssessment.feedbackSettings?.showExplanations && !!q.explanation && (
                    <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 7, lineHeight: 17, fontStyle: 'italic' }}>
                      💡 {q.explanation}
                    </Text>
                  )}
                </Card>
              );
            })}
          </>
        )}

        <View style={{ gap: 9, marginTop: 6 }}>
          {!result.passed && (
            <Button variant="primary" icon="reload-outline" onPress={start}>
              Thi lại
            </Button>
          )}
          <Button
            variant={result.passed ? 'primary' : 'outline'}
            icon="arrow-back"
            onPress={() =>
              course
                ? navigation.navigate('CourseOverview', { courseId: course.id })
                : navigation.goBack()
            }
          >
            {course ? 'Về trang khóa học' : 'Quay lại'}
          </Button>
        </View>
      </Screen>
    );
  }

  // --- IN PROGRESS ---
  const question = questions[index];
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const lowTime = secondsLeft <= 60;

  return (
    <Screen
      title={`Câu ${index + 1}/${questions.length}`}
      subtitle={activeAssessment.title}
      right={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: lowTime ? COLORS.redSoft : COLORS.sunken,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <Ionicons name="stopwatch-outline" size={14} color={lowTime ? COLORS.red : COLORS.inkSoft} />
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '900',
              color: lowTime ? COLORS.red : COLORS.inkSoft,
              marginLeft: 5,
            }}
          >
            {formatClock(secondsLeft)}
          </Text>
        </View>
      }
    >
      <View style={{ marginBottom: 12 }}>
        <ProgressBar value={(answered / Math.max(1, questions.length)) * 100} tone="rail" size="sm" />
        <Text style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 5 }}>
          Đã trả lời {answered}/{questions.length} câu
        </Text>
      </View>

      {/* Question navigator */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {questions.map((q, i) => {
          const isCurrent = i === index;
          const isDone = answers[q.id] !== undefined;
          return (
            <TouchableOpacity
              key={q.id}
              onPress={() => setIndex(i)}
              activeOpacity={0.8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                marginRight: 6,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCurrent ? COLORS.rail : isDone ? COLORS.greenSoft : COLORS.paper,
                borderWidth: 1,
                borderColor: isCurrent ? COLORS.rail : isDone ? COLORS.greenBorder : COLORS.line,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: isCurrent ? '#FFFFFF' : isDone ? COLORS.greenDark : COLORS.inkFaint,
                }}
              >
                {i + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!!question && (
        <QuestionCard
          question={question}
          value={answers[question.id]}
          onChange={(v: any) => setAnswers((prev) => ({ ...prev, [question.id]: v }))}
        />
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        <Button
          variant="outline"
          icon="chevron-back"
          style={{ flex: 1 }}
          disabled={index === 0}
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Câu trước
        </Button>
        {index < questions.length - 1 ? (
          <Button
            variant="primary"
            icon="chevron-forward"
            iconPosition="right"
            style={{ flex: 1 }}
            onPress={() => setIndex((i) => i + 1)}
          >
            Câu tiếp
          </Button>
        ) : (
          <Button variant="primary" icon="send-outline" style={{ flex: 1 }} onPress={confirmSubmit}>
            Nộp bài
          </Button>
        )}
      </View>

      {index < questions.length - 1 && (
        <Button variant="ghost" icon="send-outline" style={{ marginTop: 9 }} onPress={confirmSubmit}>
          Nộp bài sớm
        </Button>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Hiển thị một câu hỏi theo đúng kiểu của nó.
// ---------------------------------------------------------------------------
function QuestionCard({ question, value, onChange }: { question: any; value: any; onChange: (v: any) => void }) {
  const COLORS = useColors();
  const type = question.questionType || question.type;
  const options = question.options || question.sequenceItems || [];

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Badge tone="rail" size="sm">
          {QUESTION_TYPE_LABEL[type] || 'Câu hỏi'}
        </Badge>
        <Badge tone="slate" size="sm">
          {question.score || 10} điểm
        </Badge>
      </View>

      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink, lineHeight: 20, marginBottom: 14 }}>
        {question.question || question.text}
      </Text>

      {type === QUESTION_TYPES.ESSAY ||
      type === QUESTION_TYPES.SHORT_ANSWER ||
      type === QUESTION_TYPES.FILL_IN_BLANK ? (
        <TextInput
          value={Array.isArray(value) ? value[0] || '' : value || ''}
          onChangeText={(t) => onChange(t)}
          multiline={type === QUESTION_TYPES.ESSAY}
          textAlignVertical={type === QUESTION_TYPES.ESSAY ? 'top' : 'center'}
          placeholder="Nhập câu trả lời của bạn…"
          placeholderTextColor={COLORS.inkFaint}
          style={{
            borderWidth: 1,
            borderColor: COLORS.line,
            borderRadius: 10,
            padding: 11,
            fontSize: 13,
            color: COLORS.ink,
            minHeight: type === QUESTION_TYPES.ESSAY ? 110 : 44,
          }}
        />
      ) : type === QUESTION_TYPES.RATING_SCALE ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
              <Ionicons name={star <= (value || 0) ? 'star' : 'star-outline'} size={32} color={COLORS.amber} />
            </TouchableOpacity>
          ))}
        </View>
      ) : type === QUESTION_TYPES.ORDERING ? (
        <OrderingInput question={question} value={value} onChange={onChange} />
      ) : type === QUESTION_TYPES.MATCHING ? (
        <MatchingInput question={question} value={value} onChange={onChange} />
      ) : (
        // Nhóm chọn đáp án: SINGLE/MULTIPLE_CHOICE, TRUE_FALSE, YES_NO, SCENARIO…
        options.map((opt: any) => {
          const isMulti = type === QUESTION_TYPES.MULTIPLE_CHOICE;
          const selected = isMulti
            ? Array.isArray(value) && value.includes(opt.id)
            : value === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={0.8}
              onPress={() => {
                if (isMulti) {
                  const cur: string[] = Array.isArray(value) ? value : [];
                  onChange(cur.includes(opt.id) ? cur.filter((id) => id !== opt.id) : [...cur, opt.id]);
                } else {
                  onChange(opt.id);
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: selected ? COLORS.green : COLORS.line,
                backgroundColor: selected ? COLORS.greenSoft : COLORS.paper,
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Ionicons
                name={
                  isMulti
                    ? selected
                      ? 'checkbox'
                      : 'square-outline'
                    : selected
                    ? 'radio-button-on'
                    : 'radio-button-off'
                }
                size={19}
                color={selected ? COLORS.green : COLORS.inkFaint}
                style={{ marginRight: 10 }}
              />
              <Text style={{ fontSize: 13, color: COLORS.ink, flex: 1, lineHeight: 19 }}>{opt.text}</Text>
            </TouchableOpacity>
          );
        })
      )}
    </Card>
  );
}

/** Sắp xếp thứ tự: mobile không kéo-thả được nên dùng nút lên/xuống. */
function OrderingInput({ question, value, onChange }: { question: any; value: any; onChange: (v: any) => void }) {
  const COLORS = useColors();
  const items = question.options || question.sequenceItems || [];
  const order: string[] = Array.isArray(value) ? value : items.map((x: any) => x.id);

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <View>
      {order.map((id, i) => {
        const item = items.find((x: any) => x.id === id);
        return (
          <View
            key={id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.line,
              borderRadius: 10,
              padding: 10,
              marginBottom: 7,
              backgroundColor: COLORS.paper,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: COLORS.rail,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 9,
              }}
            >
              <Text style={{ fontSize: 10.5, fontWeight: '900', color: '#FFFFFF' }}>{i + 1}</Text>
            </View>
            <Text style={{ fontSize: 12.5, color: COLORS.ink, flex: 1, lineHeight: 18 }}>
              {item?.text || item?.label || id}
            </Text>
            <TouchableOpacity onPress={() => move(i, i - 1)} disabled={i === 0} style={{ padding: 5 }}>
              <Ionicons name="chevron-up" size={17} color={i === 0 ? COLORS.line : COLORS.inkSoft} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => move(i, i + 1)} disabled={i === order.length - 1} style={{ padding: 5 }}>
              <Ionicons name="chevron-down" size={17} color={i === order.length - 1 ? COLORS.line : COLORS.inkSoft} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

/** Ghép cặp: mỗi vế trái là một hàng chip chọn vế phải. */
function MatchingInput({ question, value, onChange }: { question: any; value: any; onChange: (v: any) => void }) {
  const COLORS = useColors();
  const pairs = question.options || question.pairs || [];
  const rights: string[] = [...new Set(pairs.map((p: any) => p.right).filter(Boolean))] as string[];
  const current = value || {};

  return (
    <View>
      {pairs.map((p: any) => (
        <View key={p.id} style={{ marginBottom: 13 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.ink, marginBottom: 7 }}>
            {p.left || p.text}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {rights.map((r) => {
              const selected = current[p.id] === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => onChange({ ...current, [p.id]: r })}
                  activeOpacity={0.8}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 11,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? COLORS.green : COLORS.line,
                    backgroundColor: selected ? COLORS.greenSoft : COLORS.paper,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: selected ? COLORS.greenDark : COLORS.inkSoft }}>
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const QUESTION_TYPE_LABEL: Record<string, string> = {
  SINGLE_CHOICE: 'Chọn 1 đáp án',
  MULTIPLE_CHOICE: 'Chọn nhiều đáp án',
  TRUE_FALSE: 'Đúng / Sai',
  YES_NO: 'Có / Không',
  MATCHING: 'Ghép cặp',
  ORDERING: 'Sắp xếp thứ tự',
  FILL_IN_BLANK: 'Điền vào chỗ trống',
  SHORT_ANSWER: 'Trả lời ngắn',
  SCENARIO_BASED: 'Tình huống',
  CASE_STUDY: 'Nghiên cứu tình huống',
  ESSAY: 'Tự luận',
  RATING_SCALE: 'Thang điểm',
};

/** Chấm điểm — giữ nguyên logic của bản web (AssessmentPlayer.jsx). */
function isAnswerCorrect(question: any, answerValue: any) {
  if (!question || answerValue === undefined || answerValue === null) return false;
  const type = question.questionType || question.type;

  if (type === QUESTION_TYPES.RATING_SCALE) return true;

  if (type === QUESTION_TYPES.ESSAY) {
    const text = Array.isArray(answerValue) ? answerValue[0] || '' : String(answerValue);
    return text.trim().length >= 5;
  }

  if (type === QUESTION_TYPES.FILL_IN_BLANK || type === QUESTION_TYPES.SHORT_ANSWER) {
    const text = (Array.isArray(answerValue) ? answerValue[0] || '' : String(answerValue)).trim().toLowerCase();
    if (!text) return false;
    const keywords = (question.correctKeywords || []).map((k: string) => k.trim().toLowerCase());
    const optTexts = (question.options || []).map((o: any) => (o.text || '').trim().toLowerCase());
    return keywords.includes(text) || optTexts.includes(text);
  }

  if (type === QUESTION_TYPES.MATCHING) {
    if (typeof answerValue !== 'object') return false;
    const pairs = question.options || question.pairs || [];
    return pairs.length > 0 && pairs.every((p: any) => answerValue[p.id] === p.right);
  }

  if (type === QUESTION_TYPES.ORDERING) {
    if (!Array.isArray(answerValue)) return false;
    const items = question.options || question.sequenceItems || [];
    const sortedTarget = [...items]
      .sort((a: any, b: any) => (a.correctOrder || 0) - (b.correctOrder || 0))
      .map((s: any) => s.id);
    return JSON.stringify(answerValue) === JSON.stringify(sortedTarget);
  }

  const selectedIds = Array.isArray(answerValue) ? answerValue : [answerValue];
  const correctIds = (question.options || [])
    .filter((o: any) => o.isCorrect)
    .map((o: any) => o.id)
    .sort();
  const chosen = [...selectedIds].sort();
  return correctIds.length === chosen.length && correctIds.every((id: string, i: number) => id === chosen[i]);
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
