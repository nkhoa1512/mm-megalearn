import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { levelValue } from '../../data/levelSystem';
import { currentUser as defaultUser } from '../../data/mockData';
import { Badge, Button, Tabs } from '../../features/common/ui';

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
      text: `Hello **${user.fullName}**! I am the **MM MegaLearn AI Training Assistant**. Ask me anything about lesson content, HACCP food safety standards, or revise quiz questions before your exam.`,
      time: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // DYNAMIC PERSONALIZED RECOMMENDATIONS (Filtered from Admin Courses in CourseStore)
  // Recommends courses created by Admin that the user has NOT completed yet
  const uncompletedCourses = allCourses.filter((c) => {
    const isCompleted = c.enrollment?.status === 'COMPLETED';
    // The level scale is inverted: a smaller number is more senior, so Level > 4 means below manager grade.
    const isManagerCourse = (c.domain === 'Leadership' || c.code?.startsWith('LEAD')) && levelValue(user.level) > 4;
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
      return `Recommended directly for the ${user.position} role: required to meet HACCP food hygiene and safety audit standards in the processing workshop.`;
    }
    if (course.code?.startsWith('COLD') || course.domain === 'Cold Chain') {
      return `Supplementary training on chilled goods storage and thermal shock prevention for fresh products in store.`;
    }
    if (course.code?.startsWith('HSE') || course.domain === 'Health & Safety') {
      return `A recurring mandatory compliance course on fire safety and occupational safety for all Operations division staff.`;
    }
    if (course.code?.startsWith('STOPS') || course.domain === 'Store Operations') {
      return `Standardizes shelf and counter operations, shrinkage prevention and the customer experience at MM Mega Market.`;
    }
    return `An optional course to deepen professional capability within the MM Mega Market L&D catalog.`;
  }

  function handleSend(textToSend) {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: text, time: 'Just now' };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = '';
      const lower = text.toLowerCase();
      if (lower.includes('haccp') || lower.includes('hygiene') || lower.includes('temperature') || lower.includes('bakery')) {
        reply = `🥖 **Bakery Counter Food Safety Standard (SOP-OMD-04)**:
• **Proofing cabinet**: maintain **28°C – 32°C**, relative humidity 80-85%.
• **Convection oven**: check the temperature sensor before every baking shift.
• **Logging**: record the temperature on form SOP-OMD-04B every **120 minutes**.
• **Incident handling**: if the temperature deviates by more than ±3°C, stop baking new batches and notify the shift leader immediately.`;
      } else if (lower.includes('pccc') || lower.includes('fire') || lower.includes('evacuation') || lower.includes('extinguisher')) {
        reply = `🔥 **Store Fire Incident Response Procedure (HSE-PCCC-02)**:
1. Press the nearest emergency fire alarm.
2. Use a CO2 extinguisher (for electrical equipment) or a foam extinguisher (for oil/grease areas in the cooking/baking workshop).
3. Guide customers along the luminous exit signs to **Safe Assembly Point 1 in the car park**.`;
      } else if (lower.includes('exam') || lower.includes('quiz') || lower.includes('pass mark')) {
        reply = `🎯 **Final Assessment Information**:
• The pass mark is **80%** (exactly 4 of 5 questions).
• Each learner gets up to **3 retakes**.
• The standard time limit is **15 minutes**. Good luck with your revision — aim for full marks!`;
      } else {
        reply = `💡 **Answer From The MM MegaLearn AI Tutor**:
Your question has been cross-checked against MM Mega Market's current courses and training standards. Click the **"Personalized Course Suggestions"** tab to see and open the related courses directly.`;
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: reply, time: 'Just now' },
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
            <h1>AI Learning Hub &amp; Course Suggestions</h1>
            <Badge tone="ai" icon="ti-sparkles">Enterprise AI Assistant</Badge>
          </div>
          <p style={{ margin: 0 }}>
            The AI system analyzes job titles automatically <strong>{user.position}</strong> ({user.branchName || 'Store Operations Division'}) to suggest the unfinished courses from the L&amp;D Admin library.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant={activeTab === 'recommendations' ? 'primary' : 'outline'}
            icon="ti-bulb"
            onClick={() => setActiveTab('recommendations')}
          >
            Suggested Courses ({recommendedCourses.length})
          </Button>
          <Button
            variant={activeTab === 'tutor' ? 'primary' : 'outline'}
            icon="ti-message-chatbot"
            onClick={() => setActiveTab('tutor')}
          >
            Ask The AI Tutor
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'recommendations', label: 'Personalized Course Suggestions (From The Admin Catalog)', icon: 'ti-bulb', count: recommendedCourses.length },
          { id: 'tutor', label: 'AI Assistant For Lesson Q&A And Revision', icon: 'ti-message-chatbot' },
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
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Filter by specialization:</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: 'All Suggested Courses' },
                  { id: 'FRESH_FOOD', label: 'Fresh Food & Bakery (HACCP)' },
                  { id: 'STORE_OPS', label: 'Store Shelf & Counter Operations' },
                  { id: 'SAFETY', label: 'Fire Safety & Security' },
                  { id: 'DIGITAL', label: 'E-Commerce & Orders' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCategoryFilter(f.id)}
                    style={{
                      border: '1px solid',
                      borderColor: categoryFilter === f.id ? 'var(--blue)' : 'var(--line)',
                      background: categoryFilter === f.id ? 'var(--blue)' : 'var(--paper-raised)',
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
                <p>Excellent! You have completed every course in this specialist group.</p>
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
                            {isInPerson ? 'Workshop Practice (ILT)' : (course.format || 'E-learning')}
                          </Badge>
                        </div>
                        <Badge tone={course.courseType === 'MANDATORY' ? 'amber' : 'sage'}>
                          {course.courseType === 'MANDATORY' ? 'Mandatory Course' : 'Optional Supplementary'}
                        </Badge>
                      </div>

                      {/* Title */}
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.4 }}>
                        {course.title}
                      </div>

                      {/* AI Matching Justification */}
                      <div style={{ background: 'var(--sage-soft)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, border: '1px solid #DCFCE7' }}>
                        <div style={{ fontSize: 12, color: 'var(--sage-soft-text)', lineHeight: 1.45 }}>
                          <i className="ti ti-sparkles" style={{ marginRight: 4, color: '#16A34A' }} />
                          <strong>Why the AI recommends it:</strong> {getAiReason(course)}
                        </div>
                      </div>

                      {/* Meta specs */}
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12, display: 'flex', gap: 12 }}>
                        <span><i className="ti ti-clock" style={{ marginRight: 4 }} /> Duration: <strong>{course.estimatedDuration || '3h'}</strong></span>
                        <span><i className="ti ti-award" style={{ marginRight: 4 }} /> Pass score: <strong>{course.passingScore || 80}%</strong></span>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                        {isInPerson && course.trainerName ? `Trainer: ${course.trainerName}` : 'Issued by the L&D Admin'}
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
                        {isInPerson ? 'View The Practice Schedule' : isEnrolled ? 'Start Learning' : 'Enroll & Start Learning'}
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
              <div style={{ fontWeight: 800, fontSize: 15 }}>AI Lesson Q&A Assistant (AI Tutor)</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Answers questions on the HACCP, fire safety and information security courses, and MM Mega Market operating procedures.
              </div>
            </div>
          </div>

          {/* Quick Prompts */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              'What is the standard proofing cabinet temperature for bread?',
              'What is the fire procedure for an electrical fire in the store?',
              'What score is required to pass the quiz?',
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
                The AI Tutor is composing an answer...
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="field-input"
              style={{ flex: 1 }}
              placeholder="Ask a question about the lesson..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button variant="primary" icon="ti-send" onClick={() => handleSend()}>
              Send
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
