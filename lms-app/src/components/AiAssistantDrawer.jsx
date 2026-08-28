import React, { useState } from 'react';
import { useCourseStore } from '../state/CourseStore';
import {
  aiKnowledgeBase,
  aiRecommendations,
  aiChatSamplePrompts,
  currentUser,
} from '../data/mockData';
import { Button, Badge } from './ui';

export default function AiAssistantDrawer() {
  const { aiDrawerOpen, closeAiAssistant, activeAiTab } = useCourseStore();
  const [tab, setTab] = useState(activeAiTab || 'tutor');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Hello ${currentUser.fullName}! I am your AI Learning Assistant at MM Mega Market. I can help clarify standard operating procedures (SOPs), review assessment prep topics, or search internal training knowledge.`,
      time: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!aiDrawerOpen) return null;

  function handleSendMessage(textToSend) {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      time: 'Now',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let botReply = 'Thank you for your question. The AI engine is retrieving data from the enterprise SOP repository...';
      const lower = text.toLowerCase();

      if (lower.includes('temperature') || lower.includes('dough') || lower.includes('bakery') || lower.includes('proofing')) {
        botReply = `According to **SOP-OMD-04 (Bakery Standards)**:\n- Standard proofing box temperature: **28°C - 32°C**, humidity 80-85%.\n- Logging frequency: **Every 120 minutes (2 hours)** on Form SOP-OMD-04B.\n- If temperature deviation exceeds ±3°C, immediately report to the Shift Supervisor or Fresh Food Department Manager.`;
      } else if (lower.includes('security') || lower.includes('data') || lower.includes('classification') || lower.includes('tier')) {
        botReply = `Per **SEC-POL-01 (MMVN Information Security Policy)**, data is categorized into 4 tiers:\n1. **Public**: Marketing brochures, public catalogues.\n2. **Internal**: Standard procedures, operational emails.\n3. **Confidential**: Customer PII, unpublished store financial reports.\n4. **Restricted**: POS database master credentials, payment card tokens (mandatory end-to-end encryption).`;
      } else if (lower.includes('fire') || lower.includes('evacuation') || lower.includes('safety') || lower.includes('hse')) {
        botReply = `Per **HSE-PCCC-02 (Emergency Evacuation Protocol)**:\n- CO2 and Foam extinguishers are positioned at warehouse entryways and fresh food prep stations.\n- Upon Level 2 alarm: Cut main sector electrical breakers, guide customers along photoluminescent exit paths toward **Assembly Point 1 in the main parking lot**.`;
      } else if (lower.includes('error') || lower.includes('quiz') || lower.includes('infosec') || lower.includes('pitfall') || lower.includes('assessment')) {
        botReply = `💡 **Key Pitfall Analysis from AI Learning Analytics**:\n- 42% of learners miss the incident reporting deadline question (Correct answer: Mandatory reporting within **24 hours**).\n- 28% confuse Confidential vs Restricted data classification.\n👉 You can re-take practice quizzes in the Assessment module!`;
      } else {
        botReply = `Based on enterprise documentation, your query "${text}" has been cross-referenced with MM Mega Market's verified SOP database. You can review full source documents under the SOP Search tab.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: botReply,
          time: 'Just now',
        },
      ]);
      setIsTyping(false);
    }, 650);
  }

  const filteredDocs = aiKnowledgeBase.filter(
    (d) =>
      !searchQuery ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="ai-drawer-backdrop" onClick={closeAiAssistant}>
      <div className="ai-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-drawer-header">
          <div className="ai-drawer-title">
            <i className="ti ti-sparkles" style={{ fontSize: 18 }} />
            <span>AI Learning Assistant</span>
            <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>
              GPT-4o Enterprise
            </span>
          </div>
          <button className="icon-btn" onClick={closeAiAssistant} style={{ color: '#fff' }} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--paper-raised)', padding: '0 12px' }}>
          <button
            className={`tab-btn ${tab === 'tutor' ? 'active' : ''}`}
            onClick={() => setTab('tutor')}
            style={{ fontSize: 12.5 }}
          >
            <i className="ti ti-message-chatbot" /> AI Tutor Chat
          </button>
          <button
            className={`tab-btn ${tab === 'search' ? 'active' : ''}`}
            onClick={() => setTab('search')}
            style={{ fontSize: 12.5 }}
          >
            <i className="ti ti-search" /> SOP Semantic Search
          </button>
          <button
            className={`tab-btn ${tab === 'insights' ? 'active' : ''}`}
            onClick={() => setTab('insights')}
            style={{ fontSize: 12.5 }}
          >
            <i className="ti ti-bulb" /> AI Recommendations ({aiRecommendations.length})
          </button>
        </div>

        {/* Tab 1: Chat Tutor */}
        {tab === 'tutor' && (
          <>
            <div className="ai-drawer-body">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`ai-chat-bubble ${m.sender === 'user' ? 'ai-bubble-user' : 'ai-bubble-bot'}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, opacity: 0.75 }}>
                    <i className={`ti ${m.sender === 'user' ? 'ti-user' : 'ti-sparkles'}`} />
                    <span>{m.sender === 'user' ? 'You' : 'AI Learning Tutor'} &middot; {m.time}</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
                </div>
              ))}
              {isTyping && (
                <div className="ai-chat-bubble ai-bubble-bot" style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>
                  <i className="ti ti-loader ti-spin" style={{ marginRight: 6 }} /> AI is querying SOP repository...
                </div>
              )}
            </div>

            {/* Prompt suggestions */}
            <div style={{ padding: '8px 16px', background: 'var(--paper-sunken)', borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 }}>
                <i className="ti ti-wand" style={{ marginRight: 4 }} /> Recommended Prompts:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {aiChatSamplePrompts.map((p, idx) => (
                  <span
                    key={idx}
                    className="ai-prompt-chip"
                    onClick={() => handleSendMessage(p)}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Input area */}
            <div className="ai-drawer-footer">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                style={{ display: 'flex', gap: 8 }}
              >
                <input
                  type="text"
                  className="field-input"
                  placeholder="Ask AI about lessons, SOPs, food safety..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{ fontSize: 13 }}
                />
                <Button variant="ai" type="submit" icon="ti-send">
                  Send
                </Button>
              </form>
            </div>
          </>
        )}

        {/* Tab 2: Semantic SOP Search */}
        {tab === 'search' && (
          <div className="ai-drawer-body" style={{ gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: 11, color: 'var(--ink-faint)' }} />
              <input
                type="text"
                className="field-input"
                style={{ paddingLeft: 34 }}
                placeholder="Search SOPs, manuals, videos using natural language..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Found <strong>{filteredDocs.length}</strong> matching standards:
            </div>

            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="card card-pad card-interactive"
                style={{ borderColor: 'var(--line)', padding: 14 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--rail)' }}>{doc.title}</div>
                  <Badge tone="ai">Match {doc.relevance}%</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8 }}>{doc.summary}</div>
                <div
                  style={{
                    background: 'var(--paper-sunken)',
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontStyle: 'italic',
                    color: 'var(--ink-soft)',
                    borderLeft: '3px solid var(--ai-primary)',
                    marginBottom: 8,
                  }}
                >
                  "{doc.matchedExcerpt}"
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {doc.tags.map((t) => (
                      <span key={t} style={{ fontSize: 10, background: 'var(--paper-sunken)', padding: '2px 6px', borderRadius: 4, color: 'var(--ink-soft)' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" icon="ti-file-search">Open Source SOP</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Personalized Recommendations */}
        {tab === 'insights' && (
          <div className="ai-drawer-body">
            <div style={{ background: 'var(--ai-soft)', border: '1px solid #DDD6FE', padding: '12px 16px', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ai-soft-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-sparkles" /> AI Skill Gap Matcher: {currentUser.position}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ai-soft-text)', marginTop: 4 }}>
                The AI engine analyzed your role competency framework and learning history to recommend optimized courses.
              </div>
            </div>

            {aiRecommendations.map((rec, idx) => (
              <div key={idx} className="card card-pad card-interactive" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{rec.title}</div>
                  <Badge tone={rec.badgeTone}>Match {rec.confidence}%</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8 }}>{rec.reason}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {rec.matchSkills.map((sk) => (
                    <span key={sk} style={{ fontSize: 10.5, background: 'var(--paper-sunken)', padding: '2px 7px', borderRadius: 10, color: 'var(--ink-soft)' }}>
                      ✓ {sk}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                    <i className="ti ti-clock" style={{ marginRight: 4 }} /> {rec.estimatedHours}
                  </span>
                  <Button size="sm" variant="primary" icon="ti-player-play">Start Learning</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

