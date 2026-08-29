import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Badge, Button, ProgressBar } from '../components/ui';
import { useCourseStore } from '../store/CourseStore';
import { drawAssessmentQuestions } from '../data/mockData';

export default function AssessmentPlayerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    currentUser,
    courses: allCourses,
    myEnrollments,
    saveCourseProgress,
    recordAssessmentAttempt,
  } = useCourseStore();

  const user = currentUser;
  const courseId = route.params?.courseId || 'CRS-FSH-001';

  const rawCourse = allCourses.find((c: any) => c.id === courseId) || allCourses[0];
  const cfg = rawCourse?.configuration || {};
  const timeLimitMinutes = cfg.assessmentTimeLimit || 15;
  const passingScore = cfg.passingScorePercent || 80;
  const maxAttempts = cfg.maxAttempts || 3;

  const [phase, setPhase] = useState<'start' | 'in-progress' | 'result'>('start');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMinutes * 60);
  const [result, setResult] = useState<any>(null);

  const submittedRef = useRef(false);

  // Initialize questions
  const handleStartExam = () => {
    const drawn = drawAssessmentQuestions(rawCourse);
    const sampleQuestions = drawn && drawn.length > 0 ? drawn : [
      {
        id: 'Q1',
        text: 'Nhiệt độ tiêu chuẩn bảo quản thịt tươi sống trong quầy lạnh MM Mega Market là bao nhiêu?',
        type: 'SINGLE_CHOICE',
        options: [
          { id: 'opt1', text: '-2°C đến 2°C', isCorrect: true },
          { id: 'opt2', text: '5°C đến 8°C', isCorrect: false },
          { id: 'opt3', text: '10°C đến 15°C', isCorrect: false },
          { id: 'opt4', text: 'Nhiệt độ phòng', isCorrect: false },
        ],
        explanation: 'Thịt tươi sống bắt buộc duy trì trong dải nhiệt độ -2°C đến 2°C để ức chế vi khuẩn phát triển.',
      },
      {
        id: 'Q2',
        text: 'Quy tắc luân chuyển hàng hóa ưu tiên hạn sử dụng trong siêu thị viết tắt là gì?',
        type: 'SINGLE_CHOICE',
        options: [
          { id: 'opt1', text: 'FEFO (First Expired First Out)', isCorrect: true },
          { id: 'opt2', text: 'LIFO (Last In First Out)', isCorrect: false },
          { id: 'opt3', text: 'JIT (Just In Time)', isCorrect: false },
        ],
        explanation: 'FEFO là quy tắc xuất trước hàng có hạn sử dụng gần nhất.',
      },
      {
        id: 'Q3',
        text: 'Khoảng cách lối đi tối thiểu đảm bảo an toàn PCCC và thoát hiểm tại quầy kệ siêu thị là:',
        type: 'SINGLE_CHOICE',
        options: [
          { id: 'opt1', text: '90 cm', isCorrect: true },
          { id: 'opt2', text: '50 cm', isCorrect: false },
          { id: 'opt3', text: '60 cm', isCorrect: false },
        ],
        explanation: 'Tiêu chuẩn PCCC MMVN quy định lối đi thông thoáng tối thiểu 90cm.',
      },
    ];

    setQuestions(sampleQuestions);
    setAnswers({});
    setCurrentQIndex(0);
    setSecondsLeft(timeLimitMinutes * 60);
    submittedRef.current = false;
    setPhase('in-progress');
  };

  // Timer countdown
  useEffect(() => {
    let interval: any;
    if (phase === 'in-progress' && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1 && !submittedRef.current) {
            handleAutoSubmit();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase, secondsLeft]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleAutoSubmit = () => {
    handleSubmit();
  };

  const handleSubmit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    // Calculate score
    let correctCount = 0;
    questions.forEach((q) => {
      const selected = answers[q.id];
      const correctOpt = q.options?.find((o: any) => o.isCorrect)?.id;
      if (selected === correctOpt) {
        correctCount += 1;
      }
    });

    const totalQuestions = questions.length || 1;
    const finalScore = Math.round((correctCount / totalQuestions) * 100);
    const passed = finalScore >= passingScore;

    const attemptData = {
      attemptNumber: (rawCourse?.enrollment?.attempts?.length || 0) + 1,
      score: finalScore,
      passed,
      submittedAt: new Date().toISOString().slice(0, 10),
      totalQuestions,
      correctCount,
    };

    setResult(attemptData);
    setPhase('result');

    // Save attempt and update course progress in store
    if (rawCourse) {
      const isCompleted = passed;
      saveCourseProgress(rawCourse.id, {
        status: isCompleted ? 'COMPLETED' : 'FAILED',
        progress: isCompleted ? 100 : 70,
        score: finalScore,
      }, user);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Bar */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => {
            if (phase === 'in-progress') {
              Alert.alert('Xác Nhận', 'Bạn có chắc muốn rời bài thi? Kết quả sẽ không được lưu.', [
                { text: 'Tiếp tục thi', style: 'cancel' },
                { text: 'Rời phòng thi', onPress: () => navigation.goBack() },
              ]);
            } else {
              navigation.goBack();
            }
          }}
          style={{ padding: 4, marginRight: 8 }}
        >
          <Ionicons name="close" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B', flex: 1 }} numberOfLines={1}>
          {rawCourse?.title || 'Bài Đánh Giá Cuối Khóa'}
        </Text>
      </View>

      {/* PHASE 1: START INTRO */}
      {phase === 'start' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="trophy" size={36} color="#D97706" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1E293B', textAlign: 'center' }}>
              BÀI SÁT HẠCH CUỐI KHÓA
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
              Đánh giá chuẩn hóa năng lực chuyên môn MM Mega Market
            </Text>
          </View>

          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 12 }}>Quy Chế &amp; Thông Tin Bài Thi:</Text>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Điểm đạt chuẩn:</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#009E49' }}>{passingScore}% trở lên</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Thời gian làm bài:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{timeLimitMinutes} phút</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Số lần thi tối đa:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{maxAttempts} lượt</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Chống gian lận (Anti-cheat):</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Cảnh báo khi rời màn hình</Text>
              </View>
            </View>
          </View>

          <Button variant="primary" icon="play" size="lg" onPress={handleStartExam}>
            Bắt Đầu Làm Bài Thi Ngay
          </Button>
        </ScrollView>
      )}

      {/* PHASE 2: IN-PROGRESS EXAM */}
      {phase === 'in-progress' && (
        <View style={{ flex: 1 }}>
          {/* Timer & Progress Header */}
          <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="help-circle-outline" size={16} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                Câu {currentQIndex + 1} / {questions.length}
              </Text>
            </View>

            <View style={{ backgroundColor: secondsLeft < 60 ? '#FEE2E2' : '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time" size={14} color={secondsLeft < 60 ? '#DC2626' : '#2563EB'} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: secondsLeft < 60 ? '#DC2626' : '#2563EB' }}>
                {formatTimer(secondsLeft)}
              </Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Question Card */}
            {questions[currentQIndex] && (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B', lineHeight: 20, marginBottom: 16 }}>
                  {currentQIndex + 1}. {questions[currentQIndex].text}
                </Text>

                {/* Options List */}
                <View style={{ gap: 10 }}>
                  {(questions[currentQIndex].options || []).map((opt: any) => {
                    const isSelected = answers[questions[currentQIndex].id] === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => handleSelectOption(questions[currentQIndex].id, opt.id)}
                        style={{
                          backgroundColor: isSelected ? '#ECFDF5' : '#F8FAFC',
                          borderColor: isSelected ? '#009E49' : '#E2E8F0',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          padding: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: isSelected ? '#009E49' : '#CBD5E1',
                            backgroundColor: isSelected ? '#009E49' : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                          }}
                        >
                          {isSelected && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} />}
                        </View>
                        <Text style={{ fontSize: 13, color: isSelected ? '#065F46' : '#334155', fontWeight: isSelected ? '700' : '500', flex: 1 }}>
                          {opt.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Question Quick Jump Grid */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 10, textTransform: 'uppercase' }}>
                Danh Sách Câu Hỏi:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(answers[q.id]);
                  const isCurrent = idx === currentQIndex;
                  return (
                    <TouchableOpacity
                      key={q.id}
                      onPress={() => setCurrentQIndex(idx)}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        backgroundColor: isCurrent ? '#009E49' : isAnswered ? '#ECFDF5' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: isCurrent ? '#009E49' : isAnswered ? '#A7F3D0' : '#E2E8F0',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isCurrent ? '#FFFFFF' : isAnswered ? '#047857' : '#64748B' }}>
                        {idx + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', padding: 16, borderTopWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', gap: 10 }}>
            <Button
              variant="outline"
              size="md"
              disabled={currentQIndex <= 0}
              onPress={() => setCurrentQIndex((i) => Math.max(0, i - 1))}
              style={{ flex: 1 }}
            >
              Câu Trước
            </Button>

            {currentQIndex < questions.length - 1 ? (
              <Button
                variant="primary"
                size="md"
                onPress={() => setCurrentQIndex((i) => Math.min(questions.length - 1, i + 1))}
                style={{ flex: 1 }}
              >
                Câu Kế Tiếp &rarr;
              </Button>
            ) : (
              <Button
                variant="primary"
                tone="warning"
                size="md"
                icon="checkmark-circle"
                onPress={() => {
                  Alert.alert('Nộp Bài Thi', 'Bạn có chắc chắn muốn hoàn tất và nộp bài thi này không?', [
                    { text: 'Xem lại bài', style: 'cancel' },
                    { text: 'Nộp bài ngay', onPress: handleSubmit },
                  ]);
                }}
                style={{ flex: 1 }}
              >
                Nộp Bài Thi
              </Button>
            )}
          </View>
        </View>
      )}

      {/* PHASE 3: EXAM RESULT */}
      {phase === 'result' && result && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: result.passed ? '#ECFDF5' : '#FEF2F2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                borderWidth: 3,
                borderColor: result.passed ? '#009E49' : '#DC2626',
              }}
            >
              <Ionicons
                name={result.passed ? 'checkmark-circle' : 'close-circle'}
                size={48}
                color={result.passed ? '#009E49' : '#DC2626'}
              />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: result.passed ? '#047857' : '#991B1B' }}>
              {result.passed ? 'CHÚC MỪNG! BẠN ĐÃ ĐẠT' : 'CHƯA ĐẠT YÊU CẦU'}
            </Text>
            <Text style={{ fontSize: 32, fontWeight: '900', color: '#1E293B', marginVertical: 4 }}>
              {result.score}%
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>
              Điểm đạt yêu cầu: {passingScore}% &middot; Đúng {result.correctCount}/{result.totalQuestions} câu hỏi
            </Text>
          </View>

          {/* Detailed Question Review */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 12 }}>
              Giải Thích Đáp Án Chi Tiết:
            </Text>
            <View style={{ gap: 12 }}>
              {questions.map((q, idx) => {
                const selected = answers[q.id];
                const isCorrect = q.options?.find((o: any) => o.id === selected)?.isCorrect;
                return (
                  <View key={q.id} style={{ borderBottomWidth: idx < questions.length - 1 ? 1 : 0, borderColor: '#F1F5F9', paddingBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name={isCorrect ? 'checkmark-circle' : 'close-circle'} size={14} color={isCorrect ? '#009E49' : '#DC2626'} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', flex: 1 }}>{idx + 1}. {q.text}</Text>
                    </View>
                    {q.explanation && (
                      <Text style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic', marginLeft: 18 }}>
                        &bull; {q.explanation}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: 10 }}>
            <Button
              variant="primary"
              onPress={() => navigation.navigate('CourseOverview', { courseId: rawCourse?.id })}
            >
              Xem Chi Tiết Khóa Học &amp; Chứng Chỉ
            </Button>
            {!result.passed && (
              <Button variant="outline" icon="refresh" onPress={handleStartExam}>
                Làm Lại Bài Thi (Lượt Còn Lại)
              </Button>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
