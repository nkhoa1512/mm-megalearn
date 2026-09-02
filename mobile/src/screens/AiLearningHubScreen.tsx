import React, { useMemo, useRef, useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../store/CourseStore';
// @ts-ignore
import { levelValue } from '../data/levelSystem';
// @ts-ignore
import { currentUser as fallbackUser } from '../data/mockData';
// @ts-ignore
import { getCourseImage } from '../data/courseImages';
import { Badge, Button } from '../components/ui';
import { Screen, Card, COLORS, ChipRow, Segmented, EmptyState, useColors } from '../components/layout';

const QUICK_PROMPTS = [
  'Quy chuẩn nhiệt độ tủ ủ bột quầy bánh?',
  'Quy trình ứng phó sự cố PCCC siêu thị?',
  'Điểm đạt bài thi cuối khóa là bao nhiêu?',
  'Tôi nên học khóa nào tiếp theo?',
];

export default function AiLearningHubScreen() {
  const COLORS = useColors();
  const navigation = useNavigation<any>();
  const { courses: allCourses, currentUser: authUser, enrollCourse } = useCourseStore();
  const user = authUser || fallbackUser;

  const [tab, setTab] = useState<'RECOMMEND' | 'TUTOR'>('RECOMMEND');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<any[]>([
    {
      id: 1,
      sender: 'bot',
      text: `Xin chào ${user.fullName}! Tôi là Trợ lý AI Đào tạo MM MegaLearn. Bạn có thể hỏi tôi về kiến thức bài học, quy chuẩn an toàn thực phẩm HACCP, hoặc ôn tập trước kỳ thi.`,
      time: 'Vừa xong',
    },
  ]);

  const recommended = useMemo(() => {
    const uncompleted = allCourses.filter((c: any) => {
      const isCompleted = c.enrollment?.status === 'COMPLETED';
      // Thang cấp bậc đảo ngược: số càng nhỏ càng cao, nên levelValue > 4 là dưới cấp Quản lý.
      const isManagerCourse = (c.domain === 'Leadership' || c.code?.startsWith('LEAD')) && levelValue(user.level) > 4;
      return !isCompleted && !isManagerCourse;
    });

    return uncompleted.filter((c: any) => {
      switch (categoryFilter) {
        case 'FRESH_FOOD':
          return c.domain === 'Food Safety & Hygiene' || c.code?.startsWith('FSH') || c.code?.startsWith('COLD');
        case 'STORE_OPS':
          return c.domain === 'Store Operations' || c.code?.startsWith('STOPS');
        case 'SAFETY':
          return c.domain === 'Health & Safety' || c.code?.startsWith('HSE') || c.code?.startsWith('ISA');
        case 'DIGITAL':
          return c.domain === 'E-Commerce' || c.code?.startsWith('ECOM') || c.code?.startsWith('MERCH');
        default:
          return true;
      }
    });
  }, [allCourses, user, categoryFilter]);

  function send(textToSend?: string) {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text, time: 'Vừa xong' }]);
    if (!textToSend) setInputText('');
    setIsTyping(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: aiReply(text), time: 'Vừa xong' },
      ]);
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    }, 650);
  }

  return (
    <Screen title="AI Learning Hub" subtitle="Trợ lý AI đào tạo doanh nghiệp" back scroll={false}>
      <View style={{ flex: 1, padding: 14 }}>
        <Segmented
          options={[
            { value: 'RECOMMEND', label: '💡 Gợi ý khóa học' },
            { value: 'TUTOR', label: '🤖 Gia sư AI' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as any)}
        />

        {tab === 'RECOMMEND' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <Card style={{ backgroundColor: COLORS.purpleSoft, borderColor: COLORS.purpleBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name="sparkles" size={18} color={COLORS.purple} style={{ marginRight: 9 }} />
                <Text style={{ fontSize: 11.5, color: COLORS.purple, flex: 1, lineHeight: 17 }}>
                  AI phân tích chức danh <Text style={{ fontWeight: '800' }}>{user.position}</Text> (
                  {user.branchName || 'Khối Vận hành Siêu thị'}) để gợi ý các khóa chưa hoàn thành từ kho bài giảng L&D.
                </Text>
              </View>
            </Card>

            <ChipRow
              options={[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'FRESH_FOOD', label: 'Thực phẩm tươi' },
                { value: 'STORE_OPS', label: 'Vận hành quầy' },
                { value: 'SAFETY', label: 'An toàn & PCCC' },
                { value: 'DIGITAL', label: 'Số hóa & TMĐT' },
              ]}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />

            <Text style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 10 }}>
              {recommended.length} khóa học phù hợp
            </Text>

            {recommended.length === 0 ? (
              <EmptyState
                icon="checkmark-done-outline"
                title="Không có gợi ý mới"
                hint="Bạn đã hoàn thành hầu hết khóa học trong nhóm này."
              />
            ) : (
              recommended.slice(0, 20).map((course: any) => (
                <Card
                  key={course.id}
                  onPress={() => navigation.navigate('CourseOverview', { courseId: course.id })}
                  style={{ padding: 12 }}
                >
                  <View style={{ flexDirection: 'row', marginBottom: 9 }}>
                    <Image
                      source={{ uri: getCourseImage(course) }}
                      style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: COLORS.sunken, marginRight: 11 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.ink, lineHeight: 17 }} numberOfLines={2}>
                        {course.title}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginTop: 3 }} numberOfLines={1}>
                        {course.code} · {course.category || course.domain}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      backgroundColor: COLORS.purpleSoft,
                      borderRadius: 8,
                      padding: 9,
                      marginBottom: 10,
                    }}
                  >
                    <Ionicons name="bulb-outline" size={13} color={COLORS.purple} style={{ marginRight: 7, marginTop: 1 }} />
                    <Text style={{ fontSize: 11, color: COLORS.purple, flex: 1, lineHeight: 16 }}>
                      {aiReason(course, user)}
                    </Text>
                  </View>

                  <Button
                    size="sm"
                    variant="primary"
                    icon="add-outline"
                    onPress={() => {
                      enrollCourse(course.id, user);
                      navigation.navigate('CourseOverview', { courseId: course.id });
                    }}
                  >
                    Ghi danh & vào học
                  </Button>
                </Card>
              ))
            )}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '86%',
                    backgroundColor: msg.sender === 'user' ? COLORS.rail : COLORS.paper,
                    borderWidth: msg.sender === 'user' ? 0 : 1,
                    borderColor: COLORS.line,
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 9,
                  }}
                >
                  {msg.sender === 'bot' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="sparkles" size={13} color={COLORS.purple} style={{ marginRight: 5 }} />
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: COLORS.purple }}>AI TUTOR</Text>
                    </View>
                  )}
                  <Text
                    style={{
                      fontSize: 12.5,
                      color: msg.sender === 'user' ? '#FFFFFF' : COLORS.ink,
                      lineHeight: 19,
                    }}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9.5,
                      color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : COLORS.inkFaint,
                      marginTop: 5,
                    }}
                  >
                    {msg.time}
                  </Text>
                </View>
              ))}

              {isTyping && (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: COLORS.paper,
                    borderWidth: 1,
                    borderColor: COLORS.line,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                  }}
                >
                  <Text style={{ fontSize: 12, color: COLORS.inkFaint }}>AI đang soạn câu trả lời…</Text>
                </View>
              )}
            </ScrollView>

            {/* Quick prompts */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 9, maxHeight: 40 }}>
              {QUICK_PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => send(p)}
                  activeOpacity={0.8}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: COLORS.purpleBorder,
                    backgroundColor: COLORS.purpleSoft,
                    marginRight: 6,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.purple }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Composer */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                backgroundColor: COLORS.paper,
                borderWidth: 1,
                borderColor: COLORS.line,
                borderRadius: 12,
                paddingHorizontal: 11,
                paddingVertical: 5,
              }}
            >
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Hỏi AI về bài học, SOP, kỳ thi…"
                placeholderTextColor={COLORS.inkFaint}
                multiline
                style={{ flex: 1, paddingVertical: 8, fontSize: 13, color: COLORS.ink, maxHeight: 90 }}
              />
              <TouchableOpacity
                onPress={() => send()}
                disabled={!inputText.trim()}
                activeOpacity={0.8}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: inputText.trim() ? COLORS.purple : COLORS.sunken,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 3,
                  marginLeft: 6,
                }}
              >
                <Ionicons name="send" size={15} color={inputText.trim() ? '#FFFFFF' : COLORS.inkFaint} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

/** Cùng bộ tri thức SOP với AiLearningHub.jsx của bản web. */
function aiReply(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes('haccp') || lower.includes('vệ sinh') || lower.includes('nhiệt độ') || lower.includes('bánh')) {
    return `🥖 Quy chuẩn an toàn thực phẩm quầy bánh (SOP-OMD-04):\n\n• Tủ ủ bột: duy trì 28°C – 32°C, độ ẩm 80–85%.\n• Lò nướng đối lưu: kiểm tra cảm biến nhiệt trước mỗi ca.\n• Ghi nhật ký nhiệt độ vào biểu mẫu SOP-OMD-04B mỗi 120 phút.\n• Sự cố: lệch quá ±3°C thì dừng mẻ mới và báo Trưởng ca ngay.`;
  }
  if (lower.includes('pccc') || lower.includes('cháy') || lower.includes('thoát hiểm') || lower.includes('bình')) {
    return `🔥 Quy trình ứng phó sự cố PCCC siêu thị (HSE-PCCC-02):\n\n1. Bấm chuông báo cháy khẩn cấp gần nhất.\n2. Dùng bình CO2 cho thiết bị điện, bình bọt Foam cho khu vực dầu mỡ.\n3. Hướng dẫn khách theo đèn Exit dạ quang ra khu vực tập kết an toàn số 1 tại bãi đỗ xe.`;
  }
  if (lower.includes('bài thi') || lower.includes('trắc nghiệm') || lower.includes('điểm đạt') || lower.includes('thi')) {
    return `🎯 Thông tin bài thi đánh giá cuối khóa:\n\n• Điểm đạt chuẩn 80%.\n• Tối đa 3 lần thi lại.\n• Thời gian làm bài tiêu chuẩn 15 phút.\n\nChúc bạn ôn tập tốt!`;
  }
  return `💡 Giải đáp từ AI Tutor MM MegaLearn:\n\nCâu hỏi của bạn đã được đối soát với các khóa học và quy chuẩn đào tạo hiện hành của MM Mega Market. Hãy mở tab "Gợi ý khóa học" để xem và vào học trực tiếp các khóa liên quan.`;
}

function aiReason(course: any, user: any) {
  if (course.code?.startsWith('FSH') || course.domain === 'Food Safety & Hygiene') {
    return `Đề xuất cho vị trí ${user.position}: cần thiết để đáp ứng tiêu chuẩn kiểm định an toàn vệ sinh thực phẩm HACCP tại xưởng chế biến.`;
  }
  if (course.code?.startsWith('COLD') || course.domain === 'Cold Chain') {
    return 'Bổ trợ nghiệp vụ bảo quản hàng lạnh và chống sốc nhiệt cho nhóm sản phẩm tươi sống.';
  }
  if (course.code?.startsWith('HSE') || course.domain === 'Health & Safety') {
    return 'Khóa tuân thủ bắt buộc định kỳ về PCCC và an toàn lao động cho khối Vận hành.';
  }
  if (course.code?.startsWith('STOPS') || course.domain === 'Store Operations') {
    return 'Chuẩn hóa kỹ năng vận hành quầy kệ, chống hao hụt và nâng cao trải nghiệm khách hàng.';
  }
  return 'Khóa tự chọn nâng cao năng lực chuyên môn trong danh mục đào tạo của Ban L&D.';
}
