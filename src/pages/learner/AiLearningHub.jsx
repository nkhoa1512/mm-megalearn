import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../../state/CourseStore';
import { currentUser as defaultUser } from '../../data/mockData';
import { Badge, Button, Tabs } from '../../components/ui';

export default function AiLearningHub() {
  const navigate = useNavigate();
  const { courses: allCourses, currentUser: authUser, enrollCourse } = useCourseStore();
  const user = authUser || defaultUser;

  // Active Tab: recommendations (Default) vs tutor
  const [activeTab, setActiveTab] = useState('recommendations');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // AI Chatbot State
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Xin chào **${user.fullName}**! Tôi là **Trợ lý AI Đào tạo MM MegaLearn**. Bạn có thể hỏi tôi bất kỳ thắc mắc nào về kiến thức bài học, quy chuẩn an toàn thực phẩm HACCP, hoặc ôn tập câu hỏi trắc nghiệm trước khi thi.`,
      time: 'Vừa xong',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // DYNAMIC PERSONALIZED RECOMMENDATIONS (Filtered from Admin Courses in CourseStore)
  // Recommends courses created by Admin that the user has NOT completed yet
  const uncompletedCourses = allCourses.filter((c) => {
    const isCompleted = c.enrollment?.status === 'COMPLETED';
    const isManagerCourse = (c.domain === 'Leadership' || c.code?.startsWith('LEAD')) && Number(user.level) < 4;
    return !isCompleted && !isManagerCourse;
  });

  const recommendedCourses = uncompletedCourses.filter((c) => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'FRESH_FOOD') return c.domain === 'Food Safety & Hygiene' || c.code?.startsWith('FSH') || c.code?.startsWith('COLD');
    if (categoryFilter === 'STORE_OPS') return c.domain === 'Store Operations' || c.code?.startsWith('STOPS');
    if (categoryFilter === 'SAFETY') return c.domain === 'Health & Safety' || c.code?.startsWith('HSE') || c.code?.startsWith('ISA');
    if (categoryFilter === 'DIGITAL') return c.domain === 'E-Commerce' || c.code?.startsWith('ECOM') || c.code?.startsWith('MERCH');
    return true;
  });

  function getAiReason(course) {
    if (course.code?.startsWith('FSH') || course.domain === 'Food Safety & Hygiene') {
      return `Đề xuất trực tiếp cho vị trí ${user.position}: Cần thiết để đáp ứng tiêu chuẩn kiểm định an toàn vệ sinh thực phẩm HACCP tại xưởng chế biến.`;
    }
    if (course.code?.startsWith('COLD') || course.domain === 'Cold Chain') {
      return `Bổ trợ nghiệp vụ bảo quản hàng lạnh và chống sốc nhiệt cho nhóm sản phẩm tươi sống tại siêu thị.`;
    }
    if (course.code?.startsWith('HSE') || course.domain === 'Health & Safety') {
      return `Khóa học tuân thủ bắt buộc định kỳ về PCCC và An toàn lao động cho toàn bộ nhân sự khối Vận hành.`;
    }
    if (course.code?.startsWith('STOPS') || course.domain === 'Store Operations') {
      return `Chuẩn hóa kỹ năng vận hành quầy kệ, chống hao hụt và nâng cao trải nghiệm khách hàng tại MM Mega Market.`;
    }
    return `Khóa học tự chọn nâng cao năng lực chuyên môn trong danh mục đào tạo của Ban L&D MM Mega Market.`;
  }

  function handleSend(textToSend) {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: text, time: 'Vừa xong' };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = '';
      const lower = text.toLowerCase();
      if (lower.includes('haccp') || lower.includes('vệ sinh') || lower.includes('nhiệt độ') || lower.includes('bánh')) {
        reply = `🥖 **Quy Chuẩn An Toàn Thực Phẩm Quầy Bánh (SOP-OMD-04)**:\n• **Tủ ủ bột**: Duy trì nhiệt độ **28°C – 32°C**, độ ẩm tương đối 80-85%.\n• **Lò nướng đối lưu**: Kiểm tra cảm biến nhiệt trước mỗi ca nướng.\n• **Ghi chép nhật ký**: Ghi nhiệt độ vào Biểu mẫu SOP-OMD-04B mỗi **120 phút**.\n• **Xử lý sự cố**: Nếu nhiệt độ lệch quá ±3°C, tạm dừng nướng mẻ mới và báo ngay cho Trưởng ca.`;
      } else if (lower.includes('pccc') || lower.includes('cháy') || lower.includes('thoát hiểm') || lower.includes('bình')) {
        reply = `🔥 **Quy Trình Ứng Phó Sự Cố PCCC Siêu Thị (HSE-PCCC-02)**:\n1. Bấm chuông báo cháy khẩn cấp gần nhất.\n2. Sử dụng bình khí CO2 (cho thiết bị điện) hoặc bình Bọt Foam (cho khu vực dầu mỡ xưởng nấu/nướng).\n3. Hướng dẫn khách hàng di chuyển theo đèn Exit dạ quang ra **Khu vực tập kết an toàn số 1 tại bãi đỗ xe**.`;
      } else if (lower.includes('bài thi') || lower.includes('trắc nghiệm') || lower.includes('điểm đạt')) {
        reply = `🎯 **Thông Tin Bài Thi Đánh Giá (Final Assessment)**:\n• Điểm đạt chuẩn là **80%** (tương đương đúng 4/5 câu hỏi).\n• Mỗi học viên có tối đa **3 lần thi lại**.\n• Thời gian làm bài tiêu chuẩn là **15 phút**. Chúc bạn ôn tập tốt và đạt điểm tối đa!`;
      } else {
        reply = `💡 **Giải Đáp Từ AI Tutor MM MegaLearn**:\nNội dung câu hỏi của bạn đã được đối soát với các khóa học và quy chuẩn đào tạo hiện hành của MM Mega Market. Bạn có thể bấm vào tab **"Gợi Ý Khóa Học Cá Nhân Hóa"** để xem và vào học trực tiếp các khóa liên quan.`;
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: reply, time: 'Vừa xong' },
      ]);
      setIsTyping(false);
    }, 600);
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>AI Learning Hub &amp; Gợi Ý Khóa Học</h1>
            <Badge tone="ai" icon="ti-sparkles">Trợ Lý AI Doanh Nghiệp</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Hệ thống AI tự động phân tích chức danh <strong>{user.position}</strong> ({user.branchName || 'Khối Vận hành Siêu thị'}) để gợi ý các khóa học chưa hoàn thành từ kho bài giảng của L&amp;D Admin.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant={activeTab === 'recommendations' ? 'primary' : 'outline'}
            icon="ti-bulb"
            onClick={() => setActiveTab('recommendations')}
          >
            Khóa Học Được Gợi Ý ({recommendedCourses.length})
          </Button>
          <Button
            variant={activeTab === 'tutor' ? 'primary' : 'outline'}
            icon="ti-message-chatbot"
            onClick={() => setActiveTab('tutor')}
          >
            Hỏi Đáp Cùng AI Tutor
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'recommendations', label: 'Gợi Ý Khóa Học Cá Nhân Hóa (Từ Danh Mục Admin)', icon: 'ti-bulb', count: recommendedCourses.length },
          { id: 'tutor', label: 'Trợ Lý AI Hỏi Đáp & Ôn Tập Bài Học', icon: 'ti-message-chatbot' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: PERSONALIZED RECOMMENDATIONS (FROM ADMIN COURSES) */}
      {activeTab === 'recommendations' && (
        <>
          {/* Filter Bar */}
          <div className="card card-pad" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', borderColor: '#BFDBFE' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-filter" style={{ color: 'var(--blue)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Lọc theo chuyên ngành:</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: 'Tất Cả Khóa Gợi Ý' },
                  { id: 'FRESH_FOOD', label: 'Thực Phẩm Tươi Sống & Bánh Mì (HACCP)' },
                  { id: 'STORE_OPS', label: 'Vận Hành Quầy Kệ Siêu Thị' },
                  { id: 'SAFETY', label: 'An Toàn PCCC & Bảo Mật' },
                  { id: 'DIGITAL', label: 'Thương Mại Điện Tử & Đơn Hàng' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCategoryFilter(f.id)}
                    style={{
                      border: '1px solid',
                      borderColor: categoryFilter === f.id ? 'var(--blue)' : 'var(--line)',
                      background: categoryFilter === f.id ? 'var(--blue)' : '#fff',
                      color: categoryFilter === f.id ? '#fff' : 'var(--ink)',
                      padding: '5px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: categoryFilter === f.id ? 700 : 500,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Courses Grid */}
          <div className="grid grid-2" style={{ gap: 16 }}>
            {recommendedCourses.length === 0 ? (
              <div className="card card-pad empty-state" style={{ gridColumn: '1 / -1' }}>
                <i className="ti ti-circle-check" style={{ fontSize: 40, color: 'var(--sage)' }} />
                <p>Tuyệt vời! Bạn đã hoàn thành toàn bộ các khóa học trong nhóm chuyên ngành này.</p>
              </div>
            ) : (
              recommendedCourses.map((course) => {
                const isInPerson = course.deliveryType === 'IN_PERSON_CLASSROOM' || course.modality === 'CLASSROOM_LAB';
                const isEnrolled = Boolean(course.enrollment);

                return (
                  <div
                    key={course.id}
                    className="card card-pad"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: '4px solid var(--blue)',
                      padding: 18,
                    }}
                  >
                    <div>
                      {/* Top badge row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{course.code}</span>
                          <Badge tone={isInPerson ? 'amber' : 'blue'}>
                            {isInPerson ? 'Thực Hành Xưởng (ILT)' : (course.format || 'E-learning')}
                          </Badge>
                        </div>
                        <Badge tone={course.courseType === 'MANDATORY' ? 'amber' : 'sage'}>
                          {course.courseType === 'MANDATORY' ? 'Khóa Bắt Buộc' : 'Tự Chọn Bổ Trợ'}
                        </Badge>
                      </div>

                      {/* Title */}
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.4 }}>
                        {course.title}
                      </div>

                      {/* AI Matching Justification */}
                      <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '8px 12px', marginBottom: 12, border: '1px solid #DCFCE7' }}>
                        <div style={{ fontSize: 11.5, color: '#166534', lineHeight: 1.45 }}>
                          <i className="ti ti-sparkles" style={{ marginRight: 4, color: '#16A34A' }} />
                          <strong>Lý do AI đề xuất:</strong> {getAiReason(course)}
                        </div>
                      </div>

                      {/* Meta specs */}
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12, display: 'flex', gap: 12 }}>
                        <span><i className="ti ti-clock" style={{ marginRight: 4 }} /> Thời lượng: <strong>{course.estimatedDuration || '3h'}</strong></span>
                        <span><i className="ti ti-award" style={{ marginRight: 4 }} /> Điểm đạt: <strong>{course.passingScore || 80}%</strong></span>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                        {isInPerson && course.trainerName ? `GV: ${course.trainerName}` : 'Do L&D Admin ban hành'}
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={isInPerson ? 'ti-calendar-event' : 'ti-player-play'}
                        onClick={() => {
                          if (isInPerson) {
                            navigate('/learner/classrooms');
                          } else {
                            if (!isEnrolled) enrollCourse(course.id);
                            navigate(`/learner/courses/${course.id}`);
                          }
                        }}
                      >
                        {isInPerson ? 'Xem Lịch Thực Hành' : isEnrolled ? 'Vào Học Ngay' : 'Đăng Ký & Vào Học'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* TAB 2: AI TUTOR CHATBOT */}
      {activeTab === 'tutor' && (
        <div className="card card-pad" style={{ maxWidth: 850, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid var(--line)', marginBottom: 16 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--ai-soft)', color: 'var(--ai-soft-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              <i className="ti ti-message-chatbot" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Trợ Lý AI Hỏi Đáp Bài Học (AI Tutor)</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Hỗ trợ giải đáp kiến thức về các khóa học HACCP, PCCC, An toàn thông tin và quy trình vận hành MM Mega Market.
              </div>
            </div>
          </div>

          {/* Quick Prompts */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              'Quy chuẩn nhiệt độ tủ ủ bột bánh mì là bao nhiêu?',
              'Quy trình PCCC khi xảy ra chập cháy tại siêu thị?',
              'Bài thi trắc nghiệm cần đạt bao nhiêu điểm?',
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p)}
                style={{
                  background: 'var(--paper-sunken)',
                  border: '1px solid var(--line)',
                  borderRadius: 16,
                  padding: '4px 12px',
                  fontSize: 12,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                💡 {p}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div style={{ minHeight: 280, maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 6, marginBottom: 16 }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.sender === 'user' ? 'var(--blue)' : 'var(--paper-sunken)',
                  color: msg.sender === 'user' ? '#fff' : 'var(--ink)',
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line',
                }}
              >
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--paper-sunken)', padding: '8px 14px', borderRadius: 12, fontSize: 12, color: 'var(--ink-soft)' }}>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />
                AI Tutor đang soạn câu trả lời...
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="field-input"
              style={{ flex: 1 }}
              placeholder="Nhập câu hỏi của bạn về bài học..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button variant="primary" icon="ti-send" onClick={() => handleSend()}>
              Gửi
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
