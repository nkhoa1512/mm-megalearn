import React, { useState } from 'react';
import {
  aiKnowledgeBase,
  aiRecommendations,
  aiChatSamplePrompts,
  currentUser,
} from '../../data/mockData';
import { Badge, Button, Tabs } from '../../components/ui';

export default function AiLearningHub() {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('ALL');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Hello **${currentUser.fullName}**! I am your **Ridgeline AI Learning Companion**. Feel free to ask any question regarding standard operating procedures (SOPs), food safety compliance, or quiz study prep.`,
      time: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Filter knowledge base
  const allTags = ['ALL', 'Bakery', 'SOP', 'Food Safety', 'Security', 'Fire Safety', 'Customer Service'];
  const filteredKB = aiKnowledgeBase.filter((doc) => {
    const matchesQuery =
      !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.matchedExcerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'ALL' || doc.tags.includes(selectedTag);
    return matchesQuery && matchesTag;
  });

  function handleSend(textToSend) {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: text, time: 'Now' };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = '';
      const lower = text.toLowerCase();
      if (lower.includes('temperature') || lower.includes('dough') || lower.includes('bakery') || lower.includes('proofing')) {
        reply = `🥖 **Bakery Standards (SOP-OMD-04)**:\n• **Proofing cabinet**: Maintain temperature between **28°C – 32°C**, relative humidity 80-85%.\n• **Convection oven**: Inspect thermal sensors before each shift.\n• **Logging**: Record readings in Form SOP-OMD-04B every **120 minutes**.\n• **Deviation handling**: If temperature variance exceeds ±3°C, halt new dough batches and notify the Shift Supervisor immediately.`;
      } else if (lower.includes('security') || lower.includes('data') || lower.includes('pos')) {
        reply = `🔒 **Information Security & POS Terminal Policy (SEC-POL-01)**:\n1. **4 Data Classification Tiers**: Public -> Internal -> Confidential (Customer records, store financial metrics) -> Restricted (Card tokens, master POS credentials).\n2. **POS Restrictions**: Strictly prohibit unapproved software installations and unauthorized USB removable storage.\n3. **Incident Reporting**: Mandatory incident notification to MIS Helpdesk within **24 hours**.`;
      } else if (lower.includes('fire') || lower.includes('evacuation') || lower.includes('safety') || lower.includes('hse')) {
        reply = `🔥 **Emergency Fire & Evacuation Procedure (HSE-PCCC-02)**:\n1. Trigger nearest manual fire alarm pull station.\n2. Deploy CO2 extinguishers (for electrical equipment) or Foam extinguishers (for grease and kitchen oils).\n3. Guide store visitors along photoluminescent exit paths toward **Assembly Point 1 in the main parking lot**.`;
      } else {
        reply = `💡 **AI Knowledge Engine Insight**:\nYour inquiry has been verified against MM Mega Market Vietnam's standardized SOP knowledge base. Ensure compliance with your store's operational logs.`;
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
            <h1>AI Learning Hub</h1>
            <Badge tone="ai" icon="ti-sparkles">Phase 2 AI Engine</Badge>
          </div>
          <p>
            Intelligent enterprise assistant for natural-language SOP search, personalized course matching, and 24/7 compliance support.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" icon="ti-refresh" onClick={() => setSearchQuery('')}>Reset</Button>
          <Button variant="ai" icon="ti-message-chatbot" onClick={() => setActiveTab('tutor')}>Chat with AI</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'search', label: 'Semantic SOP & Manual Search', icon: 'ti-search', count: filteredKB.length },
          { id: 'tutor', label: 'AI Tutor & Interactive Q&A', icon: 'ti-message-chatbot' },
          { id: 'recommendations', label: 'Personalized Recommendations', icon: 'ti-bulb', count: aiRecommendations.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: SMART SOP SEARCH */}
      {activeTab === 'search' && (
        <>
          {/* Search Box Card */}
          <div className="card card-pad" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', borderColor: '#BFDBFE' }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 16, top: 14, fontSize: 18, color: 'var(--ai-primary)' }} />
              <input
                type="text"
                className="field-input"
                style={{ padding: '12px 16px 12px 46px', fontSize: 14.5, borderRadius: 'var(--radius-md)', background: '#ffffff', borderColor: '#93C5FD' }}
                placeholder="Ask a question or enter keywords (e.g. proofing box temperature, POS security, emergency exit...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>Topic Filter:</span>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  style={{
                    border: '1px solid',
                    borderColor: selectedTag === tag ? 'var(--ai-primary)' : 'var(--line)',
                    background: selectedTag === tag ? 'var(--ai-soft)' : '#fff',
                    color: selectedTag === tag ? 'var(--ai-soft-text)' : 'var(--ink-soft)',
                    padding: '4px 12px',
                    borderRadius: 16,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: selectedTag === tag ? 600 : 400,
                  }}
                >
                  {tag === 'ALL' ? 'All Documents' : `#${tag}`}
                </button>
              ))}
            </div>
          </div>

          {/* Results List */}
          <div className="grid grid-2">
            {filteredKB.map((doc) => (
              <div key={doc.id} className="card card-pad card-interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="activity-icon" style={{ background: 'var(--ai-soft)', color: 'var(--ai-soft-text)', width: 36, height: 36 }}>
                        <i className="ti ti-file-text" style={{ fontSize: 18 }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{doc.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{doc.docType} &middot; {doc.pages} pages &middot; Updated {doc.updatedAt}</div>
                      </div>
                    </div>
                    <Badge tone="ai">Match {doc.relevance}%</Badge>
                  </div>

                  <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.5 }}>
                    {doc.summary}
                  </p>

                  <div
                    style={{
                      background: 'var(--paper-sunken)',
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontStyle: 'italic',
                      color: 'var(--ink)',
                      borderLeft: '3px solid var(--ai-primary)',
                      marginBottom: 14,
                    }}
                  >
                    "{doc.matchedExcerpt}"
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {doc.tags.map((t) => (
                      <span key={t} style={{ fontSize: 10.5, background: 'var(--paper-sunken)', padding: '2px 8px', borderRadius: 4, color: 'var(--ink-soft)' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" icon="ti-file-search">Open Source SOP</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* TAB 2: AI TUTOR CHAT */}
      {activeTab === 'tutor' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '620px', overflow: 'hidden' }}>
          {/* Chat header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', background: 'var(--paper-sunken)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="stat-icon-badge" style={{ background: 'var(--ai-gradient)', color: '#fff' }}>
                <i className="ti ti-sparkles" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Enterprise AI Learning Tutor</div>
                <div style={{ fontSize: 11.5, color: 'var(--sage)' }}>
                  <i className="ti ti-circle-filled" style={{ fontSize: 8, marginRight: 4 }} />
                  Active &middot; Grounded in MMVN verified SOP documentation
                </div>
              </div>
            </div>
            <Button size="sm" variant="ghost" icon="ti-trash" onClick={() => setMessages([messages[0]])}>Clear History</Button>
          </div>

          {/* Chat message flow */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`ai-chat-bubble ${m.sender === 'user' ? 'ai-bubble-user' : 'ai-bubble-bot'}`}
                style={{ maxWidth: '80%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, opacity: 0.75 }}>
                  <i className={`ti ${m.sender === 'user' ? 'ti-user' : 'ti-sparkles'}`} />
                  <span>{m.sender === 'user' ? 'You' : 'AI Learning Companion'} &middot; {m.time}</span>
                </div>
                <div style={{ whiteSpace: 'pre-line', fontSize: 13.5, lineHeight: 1.6 }}>{m.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="ai-chat-bubble ai-bubble-bot" style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>
                <i className="ti ti-loader ti-spin" style={{ marginRight: 6 }} /> AI is querying SOP repository...
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div style={{ padding: '10px 16px', background: 'var(--paper-sunken)', borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>
              <i className="ti ti-wand" style={{ marginRight: 4 }} /> Recommended Questions:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {aiChatSamplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--line)',
                    padding: '5px 12px',
                    borderRadius: 14,
                    fontSize: 12,
                    color: 'var(--ink-soft)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => { e.target.style.borderColor = 'var(--ai-primary)'; e.target.style.color = 'var(--ai-soft-text)'; }}
                  onMouseLeave={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.color = 'var(--ink-soft)'; }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input row */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', background: 'var(--paper-raised)' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              style={{ display: 'flex', gap: 10 }}
            >
              <input
                type="text"
                className="field-input"
                style={{ fontSize: 14, padding: '10px 14px' }}
                placeholder="Ask a question regarding operational standards, food safety, security..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <Button variant="ai" type="submit" icon="ti-send">
                Send Question
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: PERSONALIZED RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <>
          <div className="card card-pad" style={{ marginBottom: 20, background: 'var(--ai-soft)', borderColor: '#DDD6FE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="stat-icon-badge" style={{ background: 'var(--ai-gradient)', color: '#fff', width: 44, height: 44, fontSize: 22 }}>
                <i className="ti ti-chart-arrows" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ai-soft-text)' }}>
                  AI Competency Gap Analysis
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ai-soft-text)', marginTop: 2 }}>
                  Based on the profile of <strong>{currentUser.fullName} ({currentUser.position} - {currentUser.departmentId})</strong>, the AI engine mapped your skill matrices and identified high-priority development courses.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-3">
            {aiRecommendations.map((rec, idx) => (
              <div key={idx} className="card card-pad card-interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{rec.title}</div>
                    <Badge tone={rec.badgeTone}>Match {rec.confidence}%</Badge>
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.5 }}>
                    {rec.reason}
                  </p>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 6 }}>Target Competencies:</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {rec.matchSkills.map((sk) => (
                        <span key={sk} style={{ fontSize: 11, background: 'var(--paper-sunken)', padding: '3px 8px', borderRadius: 6, color: 'var(--ink)' }}>
                          ✓ {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                    <i className="ti ti-clock" style={{ marginRight: 4 }} /> {rec.estimatedHours}
                  </span>
                  <Button variant="primary" size="sm" icon="ti-player-play">Start Course</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

