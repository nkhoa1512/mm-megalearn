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
  const questions = questionBanks.filter((q) => (assessment.questionIds || []).includes(q.id));
  const linkedCourse = assessment.deliveryFormat === DELIVERY_FORMATS.COURSE_LINKED
    ? courses.find((c) => c.id === assessment.courseId)
    : null;

  const passRate = relevantAttempts.length > 0
    ? Math.round((relevantAttempts.filter((a) => a.scoring?.passed).length / relevantAttempts.length) * 100)
    : 0;

  return (
    <Modal
      title={`Chi Tiết Assessment: ${assessment.title || assessment.code}`}
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
            Thông Tin &amp; Phân Bổ
          </Button>
          <Button
            size="sm"
            variant={detailTab === 'QUESTIONS' ? 'primary' : 'ghost'}
            icon="ti-file-text"
            onClick={() => setDetailTab('QUESTIONS')}
          >
            Đề Thi &amp; Cấu Hình ({assessment.questionsPerAttempt || questions.length} câu)
          </Button>
          <Button
            size="sm"
            variant={detailTab === 'SUBMISSIONS' ? 'primary' : 'ghost'}
            icon="ti-clipboard-check"
            onClick={() => setDetailTab('SUBMISSIONS')}
          >
            Bài Nộp &amp; Điểm Số ({relevantAttempts.length})
          </Button>
          <Button
            size="sm"
            variant={detailTab === 'COMPETENCY_GAP' ? 'primary' : 'ghost'}
            icon="ti-chart-radar"
            onClick={() => setDetailTab('COMPETENCY_GAP')}
          >
            Khoảng Cách Năng Lực
          </Button>
        </div>

        {/* TAB 1: THÔNG TIN & PHÂN BỔ */}
        {detailTab === 'INFO' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--paper-sunken)', padding: 14, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-faint)', marginRight: 6 }}>
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
                {assessment.description || 'Chưa có mô tả chi tiết.'}
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
                    {fmt === 'UPLOAD_DOC' ? '📄 File Đề Tự Luận' : fmt === 'SCORM_PACKAGE' ? '📦 Gói SCORM' : fmt === 'GOOGLE_FORM' ? '🔗 Form Khảo Sát' : '💡 Ngân Hàng Câu Hỏi'}
                  </Badge>
                ))}
                <span>&middot;</span>
                <span>Thời gian: <strong>{assessment.timeLimitMinutes} phút</strong></span>
                <span>&middot;</span>
                <span>Điểm đạt: <strong>{assessment.passingScorePercent}%</strong></span>
                <span>&middot;</span>
                <span>Tối đa: <strong>{assessment.maxAttempts} lần</strong></span>
              </div>

              {assessment.questionTypesList && assessment.questionTypesList.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, background: 'var(--paper-raised)', padding: '6px 10px', borderRadius: 6 }}>
                  <i className="ti ti-list-check" style={{ color: 'var(--rail)', marginRight: 5 }} />
                  <strong>Dạng câu hỏi trong đề:</strong> {assessment.questionTypesList.join(', ')}
                </div>
              )}
            </div>

            {/* Quyền tham gia / Access status */}
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
                <strong>{canTake ? 'Quyền truy cập:' : 'Hạn chế:'}</strong> {accessReason || (canTake ? 'Bạn đủ điều kiện tham gia bài Assessment này.' : 'Bài kiểm tra không thuộc phạm vi đào tạo hoặc bạn chưa được gán.')}
              </div>
            </div>

            {/* Phân bổ đối tượng */}
            {assessment.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', marginBottom: 8 }}>
                  <i className="ti ti-target" style={{ color: 'var(--rail)', marginRight: 6 }} />
                  Phạm Vi Phân Bổ Nhân Sự ({assessment.assignments?.length || 0}):
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
                        fontSize: 12.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{asg.targetName}</strong> <span style={{ color: 'var(--ink-faint)' }}>({asg.assignmentType})</span>
                      </div>
                      <div style={{ color: 'var(--ink-soft)' }}>
                        Hạn chót: <strong>{asg.dueDate}</strong> &middot; Bắt buộc: {asg.isMandatory ? 'Có' : 'Không'}
                      </div>
                    </div>
                  ))}
                  {(assessment.assignments || []).length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Chưa có phân bổ cụ thể nào.</div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', marginBottom: 8 }}>
                  <i className="ti ti-link" style={{ color: 'var(--rail)', marginRight: 6 }} />
                  Khóa Học Online E-Learning Liên Kết:
                </div>
                {linkedCourse ? (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>[{linkedCourse.code}] {linkedCourse.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                      Lĩnh vực: {linkedCourse.category} &middot; Thời lượng: {linkedCourse.estimatedHours || '2h'}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Không tìm thấy khóa học liên kết.</div>
                )}
              </div>
            )}

            {/* Anti-cheat Policy Summary */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
                <i className="ti ti-shield-check" style={{ color: 'var(--sage)', marginRight: 6 }} />
                Cơ Chế Chống Gian Lận Đang Bật:
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11.5 }}>
                {assessment.antiCheatSettings?.enforceFullscreen && <Badge tone="sage"><i className="ti ti-maximize" /> Toàn màn hình</Badge>}
                {assessment.antiCheatSettings?.detectTabSwitch && <Badge tone="amber"><i className="ti ti-alert-triangle" /> Giám sát chuyển tab</Badge>}
                {assessment.antiCheatSettings?.randomizeQuestions && <Badge tone="slate"><i className="ti ti-arrows-shuffle" /> Đảo câu hỏi</Badge>}
                {assessment.antiCheatSettings?.randomizeOptions && <Badge tone="slate"><i className="ti ti-arrows-shuffle-2" /> Đảo đáp án</Badge>}
                {assessment.antiCheatSettings?.showWatermark && <Badge tone="slate"><i className="ti ti-fingerprint" /> Watermark</Badge>}
                {assessment.antiCheatSettings?.preventCopyPaste && <Badge tone="rust"><i className="ti ti-clipboard-off" /> Khóa Copy/Paste</Badge>}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ĐỀ THI & CẤU HÌNH BỐC ĐỀ */}
        {detailTab === 'QUESTIONS' && (() => {
          const formats = assessment.contentFormats || (assessment.contentFormat ? [assessment.contentFormat] : ['INTERACTIVE_BANK']);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Format info card */}
              <div style={{ background: 'var(--paper-sunken)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rail)', marginBottom: 6 }}>
                  <i className="ti ti-info-circle" style={{ marginRight: 5 }} />
                  Định Dạng Đề Thi Tích Hợp ({formats.length} hình thức):
                </div>

                {formats.includes('INTERACTIVE_BANK') && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, paddingBottom: 6, borderBottom: formats.length > 1 ? '1px dashed var(--line)' : 'none' }}>
                    💡 <strong>Ngân hàng câu hỏi:</strong> File <em>{assessment.uploadedFileName || 'Ngan_Hang_150_Cau_Hoi_Chuan.xlsx'}</em> ({assessment.uploadedPoolSize || 150} câu) &middot; Bốc ngẫu nhiên: <strong>{assessment.questionsPerAttempt || 4} câu / đề thi</strong>
                    {assessment.questionTypesList && assessment.questionTypesList.length > 0 && (
                      <div style={{ marginTop: 3, color: 'var(--ink)' }}>
                        <strong>Ma trận:</strong> {assessment.questionTypesList.join(' &middot; ')}
                      </div>
                    )}
                  </div>
                )}

                {formats.includes('UPLOAD_DOC') && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>
                    📄 <strong>Đề tự luận đính kèm:</strong> <a href={assessment.documentUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--rail)', textDecoration: 'underline' }}>{assessment.documentUrl || 'De_Thi_Tu_Luan.pdf'}</a> (Học viên nộp bài tự luận / nộp file)
                  </div>
                )}

                {formats.includes('SCORM_PACKAGE') && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>
                    📦 <strong>Gói SCORM bài thi:</strong> {assessment.scormUrl || 'SCORM 1.2 / 2004 Package'}
                  </div>
                )}

                {formats.includes('GOOGLE_FORM') && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    🔗 <strong>Biểu mẫu khảo sát:</strong> <a href={assessment.googleFormUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--rail)', textDecoration: 'underline' }}>{assessment.googleFormUrl || 'https://forms.google.com/...'}</a>
                  </div>
                )}
              </div>

              {/* Questions list */}
              {formats.includes('INTERACTIVE_BANK') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>
                    Trích xuất câu hỏi mẫu từ ngân hàng đề ({questions.length} câu đã trích xuất):
                  </div>
                  {questions.map((q, idx) => (
                    <div key={q.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--paper-sunken)', border: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                          Câu {idx + 1}: {q.question}
                        </div>
                        <Badge tone="slate" size="sm">{q.score} điểm</Badge>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 6 }}>
                        Loại: <strong>{q.questionType}</strong> &middot; Năng lực: <em>{q.competency}</em> &middot; Độ khó: {q.difficulty}
                      </div>
                      {q.options && q.options.length > 0 && (
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
                              {opt.text || opt.left ? `${opt.left} ➔ ${opt.right}` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.explanation && (
                        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 6, fontStyle: 'italic' }}>
                          Giải thích: {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 3: BÀI NỘP & ĐIỂM SỐ */}
        {detailTab === 'SUBMISSIONS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div className="card card-pad" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Tổng Lượt Thi</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>{relevantAttempts.length}</div>
              </div>
              <div className="card card-pad" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Tỷ Lệ Đạt (Pass Rate)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage)' }}>{passRate}%</div>
              </div>
              <div className="card card-pad" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Điểm Trung Bình</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>
                  {relevantAttempts.length > 0
                    ? Math.round(relevantAttempts.reduce((s, a) => s + (a.scoring?.weightedScore || a.scoring?.percentage || 0), 0) / relevantAttempts.length)
                    : 0}
                  %
                </div>
              </div>
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              <table className="table" style={{ fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th>Học Viên</th>
                    <th>Phòng Ban</th>
                    <th>Thời Gian Nộp</th>
                    <th>Vi Phạm</th>
                    <th>Điểm</th>
                    <th>Kết Quả</th>
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
                      <td>{new Date(att.endTime).toLocaleString('vi-VN')}</td>
                      <td>
                        {(att.violations?.tabSwitches || 0) > 0 ? (
                          <Badge tone="rust" size="sm">{att.violations.tabSwitches} lần switch tab</Badge>
                        ) : (
                          <Badge tone="sage" size="sm">0 vi phạm</Badge>
                        )}
                      </td>
                      <td><strong>{att.scoring?.weightedScore || att.scoring?.percentage || 0}%</strong></td>
                      <td>
                        <Badge tone={att.scoring?.passed ? 'sage' : 'rust'}>
                          {att.scoring?.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {relevantAttempts.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 16 }}>
                        Chưa có học viên nào nộp bài assessment này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: KHOẢNG CÁCH NĂNG LỰC (COMPETENCY GAP) */}
        {detailTab === 'COMPETENCY_GAP' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', fontSize: 12.5 }}>
              <div style={{ fontWeight: 700, color: 'var(--rail)', marginBottom: 4 }}>
                <i className="ti ti-chart-bar" style={{ marginRight: 6 }} />
                Đo Lường Năng Lực Thực Tế Sau Khi Thi
              </div>
              <p style={{ margin: 0, color: 'var(--ink-soft)' }}>
                Hệ thống tự động so khớp điểm số bài thi với ma trận năng lực vị trí (Current Level vs Required Level) để phát hiện lỗ hổng kỹ năng (Skill Gap).
              </p>
            </div>

            {relevantAttempts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {relevantAttempts.flatMap((a) => (a.competencyResult || []).map((cr, idx) => (
                  <div key={`${a.attemptId}-${idx}`} className="card card-pad" style={{ border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div>
                        <strong style={{ fontSize: 13.5 }}>{cr.competencyName}</strong>
                        <span style={{ fontSize: 12, color: 'var(--ink-faint)', marginLeft: 8 }}>({a.userName})</span>
                      </div>
                      <Badge tone={cr.gap >= 0 ? 'sage' : 'rust'}>
                        {cr.gap >= 0 ? `+${cr.gap} Đạt Chuẩn` : `${cr.gap} Thiếu Hụt`}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, marginBottom: 6 }}>
                      <span>Cấp độ hiện tại: <strong>Lvl {cr.currentLevel}</strong></span>
                      <span>&rarr;</span>
                      <span>Yêu cầu vị trí: <strong>Lvl {cr.requiredLevel}</strong></span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                      Khuyến nghị đào tạo: {cr.recommendation}
                    </div>
                  </div>
                )))}
              </div>
            ) : (
              <div className="empty-state">
                <i className="ti ti-chart-dots" />
                <p>Chưa có dữ liệu bài làm để tính toán khoảng cách năng lực.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          {canTake && onStartAssessment && (
            <Button variant="primary" icon="ti-player-play" onClick={onStartAssessment}>
              Làm Bài Thi
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
