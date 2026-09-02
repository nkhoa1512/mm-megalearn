import React, { useState } from 'react';
import { Modal, Button, Badge, ProgressBar } from '../common/ui';
import { DELIVERY_FORMATS, ASSESSMENT_TYPES } from '../../data/assessmentData';

export default function AssessmentDetailModal({
  assessment,
  isOpen,
  onClose,
  attempts = [],
  questionBanks = [],
  courses = [],
  onStartAssessment,
  canTake = true,
  accessReason = '',
}) {
  const [detailTab, setDetailTab] = useState('INFO'); // INFO | QUESTIONS | SUBMISSIONS | COMPETENCY_GAP
  if (!isOpen || !assessment) return null;

  const relevantAttempts = attempts.filter((a) => a.assessmentId === assessment.id);
  const questions = (assessment.questions && assessment.questions.length > 0)
    ? assessment.questions
    : questionBanks.filter((q) => (assessment.questionIds || []).includes(q.id));
  const linkedCourse = assessment.deliveryFormat === DELIVERY_FORMATS.COURSE_LINKED
    ? courses.find((c) => c.id === assessment.courseId)
    : null;

  const passRate = relevantAttempts.length > 0
    ? Math.round((relevantAttempts.filter((a) => a.scoring?.passed).length / relevantAttempts.length) * 100)
    : 0;

  return (
    <Modal
      title={`Assessment Detail: ${assessment.title || assessment.code}`}
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={800}
    >
      <div>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 14 }}>
          <Button
            size="sm"
            variant={detailTab === 'INFO' ? 'primary' : 'ghost'}
            icon="ti-info-circle"
            onClick={() => setDetailTab('INFO')}
          >
            Details &amp; Allocation
          </Button>
          <Button
            size="sm"
            variant={detailTab === 'QUESTIONS' ? 'primary' : 'ghost'}
            icon="ti-file-text"
            onClick={() => setDetailTab('QUESTIONS')}
          >
            Exam Paper &amp; Configuration ({assessment.questionsPerAttempt || questions.length} questions)
          </Button>
          <Button
            size="sm"
            variant={detailTab === 'SUBMISSIONS' ? 'primary' : 'ghost'}
            icon="ti-clipboard-check"
            onClick={() => setDetailTab('SUBMISSIONS')}
          >
            Submissions &amp; Scores ({relevantAttempts.length})
          </Button>
          <Button
            size="sm"
            variant={detailTab === 'COMPETENCY_GAP' ? 'primary' : 'ghost'}
            icon="ti-chart-radar"
            onClick={() => setDetailTab('COMPETENCY_GAP')}
          >
            Competency Gap
          </Button>
        </div>

        {/* TAB 1: DETAILS & ALLOCATION */}
        {detailTab === 'INFO' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--paper-sunken)', padding: 14, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)', marginRight: 6 }}>
                    {assessment.code}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
                    {assessment.title}
                  </span>
                </div>
                <Badge tone={assessment.status === 'PUBLISHED' ? 'sage' : 'rail'}>
                  {assessment.status}
                </Badge>
              </div>

              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
                {assessment.description || 'No detailed description yet.'}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, alignItems: 'center' }}>
                {(assessment.categories || [assessment.category || 'General']).map((c) => (
                  <Badge key={c} tone="slate">{c}</Badge>
                ))}
                {(assessment.types || [assessment.type || 'QUIZ']).map((t) => (
                  <Badge key={t} tone={t === 'QUIZ' ? 'sage' : t === 'ASSIGNMENT' ? 'amber' : 'rail'}>
                    {t}
                  </Badge>
                ))}
                {(assessment.contentFormats || (assessment.contentFormat ? [assessment.contentFormat] : [])).map((fmt) => (
                  <Badge key={fmt} tone="blue">
                    {fmt === 'UPLOAD_DOC' ? '📄 Essay Paper File' : fmt === 'SCORM_PACKAGE' ? '📦 SCORM Package' : fmt === 'GOOGLE_FORM' ? '🔗 Survey Form' : '💡 Question Bank'}
                  </Badge>
                ))}
                <span>&middot;</span>
                <span>Time: <strong>{assessment.timeLimitMinutes} min</strong></span>
                <span>&middot;</span>
                <span>Pass score: <strong>{assessment.passingScorePercent}%</strong></span>
                <span>&middot;</span>
                <span>Max: <strong>{assessment.maxAttempts} attempts</strong></span>
              </div>

              {assessment.questionTypesList && assessment.questionTypesList.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, background: 'var(--paper-raised)', padding: '6px 10px', borderRadius: 6 }}>
                  <i className="ti ti-list-check" style={{ color: 'var(--rail)', marginRight: 5 }} />
                  <strong>Question types in this paper:</strong> {assessment.questionTypesList.join(', ')}
                </div>
              )}
            </div>

            {/* Access status */}
            <div style={{
              padding: '8px 12px',
              borderRadius: 6,
              background: canTake ? 'rgba(0,122,56,0.06)' : 'rgba(220,38,38,0.06)',
              border: canTake ? '1px solid rgba(0,122,56,0.2)' : '1px solid rgba(220,38,38,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
            }}>
              <i className={`ti ${canTake ? 'ti-circle-check' : 'ti-lock'}`} style={{ color: canTake ? 'var(--sage)' : 'var(--rust)', fontSize: 16 }} />
              <div style={{ color: canTake ? 'var(--ink)' : 'var(--rust)' }}>
                <strong>{canTake ? 'Access:' : 'Restriction:'}</strong> {accessReason || (canTake ? 'You are eligible to take this assessment.' : 'This test is outside your training scope, or it has not been assigned to you.')}
              </div>
            </div>

            {/* Audience allocation */}
            {assessment.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? (
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 8 }}>
                  <i className="ti ti-target" style={{ color: 'var(--rail)', marginRight: 6 }} />
                  Employee Allocation Scope ({assessment.assignments?.length || 0}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(assessment.assignments || []).map((asg, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: 'var(--paper-raised)',
                        border: '1px solid var(--line)',
                        fontSize: 13,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{asg.targetName}</strong> <span style={{ color: 'var(--ink-faint)' }}>({asg.assignmentType})</span>
                      </div>
                      <div style={{ color: 'var(--ink-soft)' }}>
                        Deadline: <strong>{asg.dueDate}</strong> &middot; Mandatory: {asg.isMandatory ? 'Yes' : 'No'}
                      </div>
                    </div>
                  ))}
                  {(assessment.assignments || []).length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>No specific allocation yet.</div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 8 }}>
                  <i className="ti ti-link" style={{ color: 'var(--rail)', marginRight: 6 }} />
                  Linked Online E-Learning Course:
                </div>
                {linkedCourse ? (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>[{linkedCourse.code}] {linkedCourse.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                      Area: {linkedCourse.category} &middot; Duration: {linkedCourse.estimatedHours || '2h'}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>No linked course found.</div>
                )}
              </div>
            )}

            {/* Anti-cheat Policy Summary */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
                <i className="ti ti-shield-check" style={{ color: 'var(--sage)', marginRight: 6 }} />
                Anti-Cheating Measures Enabled:
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                {assessment.antiCheatSettings?.enforceFullscreen && <Badge tone="sage"><i className="ti ti-maximize" /> Fullscreen</Badge>}
                {assessment.antiCheatSettings?.detectTabSwitch && <Badge tone="amber"><i className="ti ti-alert-triangle" /> Tab-switch monitoring</Badge>}
                {assessment.antiCheatSettings?.randomizeQuestions && <Badge tone="slate"><i className="ti ti-arrows-shuffle" /> Shuffle questions</Badge>}
                {assessment.antiCheatSettings?.randomizeOptions && <Badge tone="slate"><i className="ti ti-arrows-shuffle-2" /> Shuffle answers</Badge>}
                {assessment.antiCheatSettings?.showWatermark && <Badge tone="slate"><i className="ti ti-fingerprint" /> Watermark</Badge>}
                {assessment.antiCheatSettings?.preventCopyPaste && <Badge tone="rust"><i className="ti ti-clipboard-off" /> Copy/Paste Locked</Badge>}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXAM PAPER & QUESTION DRAW CONFIGURATION */}
        {detailTab === 'QUESTIONS' && (() => {
          const formats = assessment.contentFormats || (assessment.contentFormat ? [assessment.contentFormat] : ['INTERACTIVE_BANK']);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Format info card */}
              <div style={{ background: 'var(--paper-sunken)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rail)', marginBottom: 6 }}>
                  <i className="ti ti-info-circle" style={{ marginRight: 5 }} />
                  Integrated Exam Formats ({formats.length} formats):
                </div>

                {formats.includes('INTERACTIVE_BANK') && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, paddingBottom: 6, borderBottom: formats.length > 1 ? '1px dashed var(--line)' : 'none' }}>
                    💡 <strong>Question bank:</strong> File <em>{assessment.uploadedFileName || 'Ngan_Hang_150_Cau_Hoi_Chuan.xlsx'}</em> ({assessment.uploadedPoolSize || 150} questions) &middot; Random draw: <strong>{assessment.questionsPerAttempt || 4} questions / paper</strong>
                    {assessment.questionTypesList && assessment.questionTypesList.length > 0 && (
                      <div style={{ marginTop: 3, color: 'var(--ink)' }}>
                        <strong>Matrix:</strong> {assessment.questionTypesList.join(' &middot; ')}
                      </div>
                    )}
                  </div>
                )}

                {formats.includes('UPLOAD_DOC') && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>
                    📄 <strong>Attached essay paper:</strong> <a href={assessment.documentUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--rail)', textDecoration: 'underline' }}>{assessment.documentUrl || 'De_Thi_Tu_Luan.pdf'}</a> (The learner submits an essay / uploads a file)
                  </div>
                )}

                {formats.includes('SCORM_PACKAGE') && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>
                    📦 <strong>Exam SCORM package:</strong> {assessment.scormUrl || 'SCORM 1.2 / 2004 Package'}
                  </div>
                )}

                {formats.includes('GOOGLE_FORM') && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    🔗 <strong>Survey form:</strong> <a href={assessment.googleFormUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--rail)', textDecoration: 'underline' }}>{assessment.googleFormUrl || 'https://forms.google.com/...'}</a>
                  </div>
                )}
              </div>

              {/* Questions list */}
              {formats.includes('INTERACTIVE_BANK') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>
                    Sample questions drawn from the question bank ({questions.length} extracted):
                  </div>
                  {questions.map((q, idx) => (
                    <div key={q.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--paper-sunken)', border: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                          Question {idx + 1}: {q.question}
                        </div>
                        <Badge tone="slate" size="sm">{q.score} points</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>
                        Type: <strong>{q.questionType}</strong> &middot; Competency: <em>{q.competency}</em> &middot; Difficulty: {q.difficulty}
                      </div>
                      {q.scenarioContext && (
                        <div style={{ fontSize: 12, padding: '6px 10px', background: 'var(--paper-raised)', borderRadius: 4, marginBottom: 6, fontStyle: 'italic', borderLeft: '3px solid var(--rail)' }}>
                          📖 Scenario: {q.scenarioContext}
                        </div>
                      )}

                      {q.imageUrl && (
                        <div style={{ maxHeight: 120, overflow: 'hidden', borderRadius: 4, marginBottom: 6 }}>
                          <img src={q.imageUrl} alt="Question image" style={{ maxHeight: 120, objectFit: 'contain' }} />
                        </div>
                      )}

                      {q.pairs && q.pairs.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                          {q.pairs.map((p, pIdx) => (
                            <div key={p.id || pIdx} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: 'rgba(0,122,56,0.08)', border: '1px solid var(--sage)', color: 'var(--sage)' }}>
                              <i className="ti ti-link" style={{ marginRight: 4 }} />
                              <strong>{p.left}</strong> ➔ {p.right}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.sequenceItems && q.sequenceItems.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                          {q.sequenceItems.map((s, sIdx) => (
                            <div key={s.id || sIdx} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                              <span style={{ fontWeight: 700, marginRight: 6 }}>Step {s.correctOrder || sIdx + 1}:</span> {s.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.correctKeywords && q.correctKeywords.length > 0 && (
                        <div style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: 'rgba(0,122,56,0.08)', border: '1px solid var(--sage)', color: 'var(--sage)', marginTop: 4 }}>
                          <i className="ti ti-key" style={{ marginRight: 4 }} />
                          Expected keywords: <strong>{q.correctKeywords.join(', ')}</strong>
                        </div>
                      )}

                      {q.options && q.options.length > 0 && !q.pairs && !q.sequenceItems && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              style={{
                                fontSize: 12,
                                padding: '4px 8px',
                                borderRadius: 4,
                                background: opt.isCorrect ? 'rgba(0,122,56,0.1)' : 'var(--paper-raised)',
                                color: opt.isCorrect ? 'var(--sage)' : 'var(--ink)',
                                border: opt.isCorrect ? '1px solid var(--sage)' : '1px solid var(--line)',
                              }}
                            >
                              {opt.isCorrect && <i className="ti ti-check" style={{ marginRight: 4 }} />}
                              {opt.text || opt.left ? (opt.left ? `${opt.left} ➔ ${opt.right}` : opt.text) : ''}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.explanation && (
                        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6, fontStyle: 'italic' }}>
                          💡 Explanation: {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 3: SUBMISSIONS & SCORES */}
        {detailTab === 'SUBMISSIONS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div className="card card-pad" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Total Attempts</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>{relevantAttempts.length}</div>
              </div>
              <div className="card card-pad" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Pass Rate</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage)' }}>{passRate}%</div>
              </div>
              <div className="card card-pad" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Average Score</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>
                  {relevantAttempts.length > 0
                    ? Math.round(relevantAttempts.reduce((s, a) => s + (a.scoring?.weightedScore || a.scoring?.percentage || 0), 0) / relevantAttempts.length)
                    : 0}
                  %
                </div>
              </div>
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Department</th>
                    <th>Submitted At</th>
                    <th>Violations</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {relevantAttempts.map((att) => (
                    <tr key={att.attemptId}>
                      <td>
                        <strong>{att.userName}</strong>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{att.userId} &middot; Lvl {att.userLevel}</div>
                      </td>
                      <td>{att.department || 'MMVN'}</td>
                      <td>{new Date(att.endTime).toLocaleString('en-US')}</td>
                      <td>
                        {(att.violations?.tabSwitches || 0) > 0 ? (
                          <Badge tone="rust" size="sm">{att.violations.tabSwitches} tab switches</Badge>
                        ) : (
                          <Badge tone="sage" size="sm">0 violations</Badge>
                        )}
                      </td>
                      <td><strong>{att.scoring?.weightedScore || att.scoring?.percentage || 0}%</strong></td>
                      <td>
                        <Badge tone={att.scoring?.passed ? 'sage' : 'rust'}>
                          {att.scoring?.passed ? 'PASSED' : 'NOT PASSED'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {relevantAttempts.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 16 }}>
                        No learner has submitted this assessment yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: COMPETENCY GAP */}
        {detailTab === 'COMPETENCY_GAP' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: 'var(--rail)', marginBottom: 4 }}>
                <i className="ti ti-chart-bar" style={{ marginRight: 6 }} />
                Measuring Real Competency After The Exam
              </div>
              <p style={{ margin: 0, color: 'var(--ink-soft)' }}>
                The system automatically matches exam scores against the position competency matrix (Current Level vs Required Level) to detect skill gaps.
              </p>
            </div>

            {relevantAttempts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {relevantAttempts.flatMap((a) => (a.competencyResult || []).map((cr, idx) => (
                  <div key={`${a.attemptId}-${idx}`} className="card card-pad" style={{ border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>{cr.competencyName}</strong>
                        <span style={{ fontSize: 12, color: 'var(--ink-faint)', marginLeft: 8 }}>({a.userName})</span>
                      </div>
                      <Badge tone={cr.gap >= 0 ? 'sage' : 'rust'}>
                        {cr.gap >= 0 ? `+${cr.gap} Above Standard` : `${cr.gap} Short`}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, marginBottom: 6 }}>
                      <span>Current level: <strong>Lvl {cr.currentLevel}</strong></span>
                      <span>&rarr;</span>
                      <span>Position requirement: <strong>Lvl {cr.requiredLevel}</strong></span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                      Training recommendation: {cr.recommendation}
                    </div>
                  </div>
                )))}
              </div>
            ) : (
              <div className="empty-state">
                <i className="ti ti-chart-dots" />
                <p>There is no submission data yet to compute the competency gap.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canTake && onStartAssessment && (
            <Button variant="primary" icon="ti-player-play" onClick={onStartAssessment}>
              Take The Exam
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
