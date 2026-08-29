import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Badge, Button } from '../components/ui';
import { useCourseStore } from '../store/CourseStore';
import { getCourseImage } from '../data/courseImages';

export default function AiLearningHubScreen() {
  const navigation = useNavigation<any>();
  const { currentUser, courses: allCourses, enrollCourse } = useCourseStore();
  const user = currentUser;

  const [activeTab, setActiveTab] = useState<'recommendations' | 'tutor'>('recommendations');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // AI Chatbot messages
  const [messages, setMessages] = useState<any[]>([
    {
      id: 1,
      sender: 'bot',
      text: `Xin chào ${user.fullName}! Tôi là Trợ lý AI Đào tạo MM MegaLearn. Bạn có thể hỏi tôi bất kỳ thắc mắc nào về quy chuẩn an toàn thực phẩm HACCP, PCCC, hoặc ôn tập câu hỏi trắc nghiệm trước khi thi.`,
      time: 'Vừa xong',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Recommendations filtered from uncompleted courses
  const recommendedCourses = allCourses.filter((c: any) => {
    const isCompleted = c.enrollment?.status === 'COMPLETED';
    if (isCompleted) return false;
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'FRESH_FOOD') return c.category === 'Food Safety & Hygiene' || c.code?.startsWith('FSH');
    if (categoryFilter === 'STORE_OPS') return c.category === 'Store Operations' || c.code?.startsWith('SOE');
    if (categoryFilter === 'SAFETY') return c.category === 'Health & Safety' || c.code?.startsWith('HSE');
    return true;
  }).slice(0, 6);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text, time: 'Vừa xong' };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = '';
      const lower = text.toLowerCase();
      if (lower.includes('haccp') || lower.includes('vệ sinh') || lower.includes('nhiệt độ') || lower.includes('bánh')) {
        reply = '🥖 Quy Chuẩn An Toàn Thực Phẩm Quầy Bánh (SOP-OMD-04):\n• Tủ ủ bột: Duy trì nhiệt độ 28°C – 32°C, độ ẩm 80-85%.\n• Lò nướng: Kiểm tra cảm biến nhiệt trước mỗi ca nướng.\n• Ghi nhật ký: Ghi nhiệt độ vào Biểu mẫu SOP-OMD-04B mỗi 120 phút.';
      } else if (lower.includes('pccc') || lower.includes('cháy') || lower.includes('thoát hiểm')) {
        reply = '🔥 Quy Trình PCCC Siêu Thị (HSE-PCCC-02):\n1. Bấm chuông báo cháy khẩn cấp.\n2. Sử dụng bình khí CO2 (cho điện) hoặc bình Bọt Foam (cho xưởng nướng).\n3. Hướng dẫn khách hàng di chuyển theo đèn Exit ra Khu tập kết bãi xe.';
      } else if (lower.includes('bài thi') || lower.includes('điểm đạt')) {
        reply = '🎯 Thông Tin Bài Thi Đánh Giá (Final Assessment):\n• Điểm đạt chuẩn là 80% (đúng 4/5 câu).\n• Tối đa 3 lần thi lại.\n• Thời gian làm bài tiêu chuẩn 15 phút. Chúc bạn thi tốt!';
      } else {
        reply = '💡 Giải Đáp Từ AI Tutor:\nNội dung câu hỏi của bạn đã được đối soát với các khóa học và quy chuẩn đào tạo hiện hành của MM Mega Market. Bạn có thể xem các khóa học được gợi ý tại Tab "Gợi Ý Khóa Học".';
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: reply, time: 'Vừa xong' },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const quickPrompts = [
    'Quy chuẩn nhiệt độ bảo quản thịt tươi?',
    'Quy trình PCCC & thoát hiểm khẩn cấp?',
    'Điều kiện điểm đạt bài thi cuối khóa?',
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header Bar */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>
            AI Learning Hub &amp; Trợ Lý AI
          </Text>
          <Text style={{ fontSize: 11, color: '#64748B' }}>
            Gợi ý đào tạo cá nhân hóa &middot; Hỏi đáp quy chuẩn nghiệp vụ
          </Text>
        </View>
      </View>

      {/* Tabs Switcher */}
      <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
        <TouchableOpacity
          onPress={() => setActiveTab('recommendations')}
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderColor: activeTab === 'recommendations' ? '#009E49' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: activeTab === 'recommendations' ? '#009E49' : '#64748B' }}>
            Gợi Ý Khóa Học ({recommendedCourses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('tutor')}
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderColor: activeTab === 'tutor' ? '#009E49' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: activeTab === 'tutor' ? '#009E49' : '#64748B' }}>
            Hỏi Đáp Cùng AI Tutor
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
            {[
              { id: 'ALL', label: 'Tất Cả Khóa Gợi Ý' },
              { id: 'FRESH_FOOD', label: 'An Toàn Tươi Sống & HACCP' },
              { id: 'STORE_OPS', label: 'Vận Hành Quầy Kệ' },
              { id: 'SAFETY', label: 'An Toàn Lao Động & PCCC' },
            ].map((cat) => {
              const isActive = categoryFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategoryFilter(cat.id)}
                  style={{
                    backgroundColor: isActive ? '#009E49' : '#FFFFFF',
                    borderColor: isActive ? '#009E49' : '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 20,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: isActive ? '#FFFFFF' : '#475569' }}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Cards List */}
          <View style={{ gap: 12 }}>
            {recommendedCourses.map((course: any) => (
              <View
                key={course.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  <Image
                    source={{ uri: getCourseImage(course) }}
                    style={{ width: 64, height: 64, borderRadius: 8, marginRight: 12, backgroundColor: '#CBD5E1' }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 2 }} numberOfLines={2}>
                      {course.title}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                      {course.code} &middot; {course.category || course.domain} &middot; {course.estimatedDuration || '3h'}
                    </Text>
                  </View>
                </View>

                {/* AI Rationale Box */}
                <View style={{ backgroundColor: '#F0FDFA', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#CCFBF1', marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="sparkles" size={13} color="#0F766E" style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={{ fontSize: 11, color: '#0F766E', lineHeight: 15, flex: 1 }}>
                    Đề xuất cho vị trí {user.position}: Cần thiết để chuẩn hóa kỹ năng thực hành và kiểm tra an toàn thực phẩm.
                  </Text>
                </View>

                <Button
                  variant="primary"
                  size="sm"
                  icon="book"
                  onPress={() => {
                    enrollCourse(course.id, user);
                    navigation.navigate('CourseOverview', { course, courseId: course.id });
                  }}
                >
                  Ghi Danh &amp; Bắt Đầu Học
                </Button>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* TAB 2: AI TUTOR CHATBOT */}
      {activeTab === 'tutor' && (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Quick Prompts */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' }}>
              Gợi Ý Câu Hỏi Nhanh:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {quickPrompts.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleSendMessage(p)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 14,
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#009E49', fontWeight: '600' }}>💡 {p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Messages */}
            <View style={{ gap: 12 }}>
              {messages.map((m) => {
                const isBot = m.sender === 'bot';
                return (
                  <View
                    key={m.id}
                    style={{
                      alignSelf: isBot ? 'flex-start' : 'flex-end',
                      maxWidth: '85%',
                      backgroundColor: isBot ? '#FFFFFF' : '#009E49',
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: isBot ? 1 : 0,
                      borderColor: '#E2E8F0',
                      shadowColor: '#000',
                      shadowOpacity: 0.04,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    {isBot && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons name="sparkles" size={13} color="#009E49" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#009E49' }}>AI Tutor MM MegaLearn</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 12.5, color: isBot ? '#1E293B' : '#FFFFFF', lineHeight: 18 }}>
                      {m.text}
                    </Text>
                  </View>
                );
              })}
              {isTyping && (
                <Text style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
                  AI Tutor đang soạn câu trả lời...
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Input Bar */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: '#F1F5F9',
                borderRadius: 20,
                paddingHorizontal: 14,
                height: 40,
                fontSize: 12.5,
                color: '#1E293B',
                marginRight: 8,
              }}
              placeholder="Nhập câu hỏi quy chuẩn, kiến thức bài học..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendMessage()}
            />
            <TouchableOpacity
              onPress={() => handleSendMessage()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#009E49',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
