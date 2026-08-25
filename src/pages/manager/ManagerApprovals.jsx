import React, { useState } from 'react';
import { useCourseStore } from '../../state/CourseStore';
import { Badge, Button, JobLevelBadge } from '../../components/ui';
import { normalizeLevel, nextLevelUp, levelShortLabel } from '../../data/levelSystem';
import { roleDefinition, managedScopeLabel, hasCapability, normalizeRole } from '../../data/roles';

export default function ManagerApprovals() {
  const { approvals, approveRequest, rejectRequest, currentUser, courses, myCourses } = useCourseStore();
  const [activeTab, setActiveTab] = useState('PENDING');

  const role = normalizeRole(currentUser?.role);
  const roleDef = roleDefinition(role);
  const canApprove = hasCapability(role, 'canApproveLevelSkip');

  const pendingList = approvals.filter((a) => a.status === 'PENDING');
  const processedList = approvals.filter((a) => a.status !== 'PENDING');
  const levelSkipPending = pendingList.filter((a) => a.requestType === 'LEVEL_ADVANCE');
  const otherPending = pendingList.filter((a) => a.requestType !== 'LEVEL_ADVANCE');

  if (!canApprove) {
    return (
      <div className="card card-pad empty-state" style={{ margin: '40px auto', maxWidth: 520 }}>
        <i className="ti ti-lock" style={{ fontSize: 44, color: 'var(--rust)' }} />
        <h2 style={{ fontSize: 17, marginTop: 10 }}>Bạn không có quyền phê duyệt học vượt cấp</h2>
        <p style={{ color: 'var(--ink-soft)' }}>
          Chỉ các vai trò từ Quản lý trực tiếp trở lên mới xử lý được đơn xin học vượt cấp của nhân viên.
        </p>
      </div>
    );
  }

  /**
   * Điều kiện thực chất để duyệt: học viên đã hoàn thành bao nhiêu phần chương
   * trình bắt buộc ở cấp bậc hiện tại của mình.
   */
  function readinessOf(req) {
    const learner = { userId: req.userId, employeeCode: req.employeeId, level: req.currentLevel };
    const learnerCourses = myCourses(courses, learner);
    const sameLevelMandatory = learnerCourses.filter(
      (c) => normalizeLevel(c.targetLevel) === normalizeLevel(req.currentLevel) && c.courseType === 'MANDATORY'
    );
    const done = sameLevelMandatory.filter((c) => c.enrollment?.status === 'COMPLETED');
    const outstanding = sameLevelMandatory.filter((c) => c.enrollment?.status !== 'COMPLETED');
    return {
      total: sameLevelMandatory.length,
      done: done.length,
      outstanding,
      ready: sameLevelMandatory.length > 0 && outstanding.length === 0,
    };
  }

  function renderRequestCard(req) {
    const isLevelSkip = req.requestType === 'LEVEL_ADVANCE';
    const readiness = isLevelSkip ? readinessOf(req) : null;
    const jumpIsLegal = !isLevelSkip
      || String(nextLevelUp(req.currentLevel)) === String(normalizeLevel(req.courseLevel));

    return (
      <div
        key={req.id}
        className="card card-pad"
        style={{ borderColor: isLevelSkip ? 'var(--blue)' : 'var(--amber)', borderWidth: 1.5 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="avatar" style={{ background: 'var(--rail)', color: '#fff', fontWeight: 700, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {req.employeeName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{req.employeeName} ({req.employeeId})</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{req.position} &middot; {req.department}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {isLevelSkip && <Badge tone="blue" icon="ti-stairs-up">Học vượt cấp</Badge>}
            <Badge tone="amber" icon="ti-clock">Gửi ngày: {req.requestDate}</Badge>
          </div>
        </div>

        {/* Cấp hiện tại -> cấp khóa học */}
        {isLevelSkip && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: '#EFF6FF', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#1E3A8A' }}>Cấp bậc hiện tại:</span>
            <JobLevelBadge level={req.currentLevel} />
            <i className="ti ti-arrow-right" style={{ color: '#1E40AF' }} />
            <span style={{ fontSize: 12, color: '#1E3A8A' }}>Xin học khóa cấp:</span>
            <JobLevelBadge level={req.courseLevel} />
            {jumpIsLegal ? (
              <Badge tone="sage" icon="ti-check">Vượt đúng 1 cấp liền kề — hợp lệ</Badge>
            ) : (
              <Badge tone="rust" icon="ti-ban">Nhảy cóc ≥ 2 cấp — không được phép duyệt</Badge>
            )}
          </div>
        )}

        <div style={{ background: 'var(--paper-sunken)', padding: '14px 16px', borderRadius: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--rail)', marginBottom: 4 }}>
            Khóa học xin duyệt: {req.courseName}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>
            Chi phí / Đơn vị tổ chức: <strong>{req.courseCost}</strong>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>
            <strong>Lý do của học viên:</strong> "{req.justification}"
          </div>
        </div>

        {/* Checklist điều kiện: khóa bắt buộc còn thiếu ở cấp hiện tại */}
        {isLevelSkip && readiness && (
          <div
            style={{
              marginBottom: 14, padding: '12px 14px', borderRadius: 8,
              background: readiness.ready ? '#F0FDF4' : '#FFFBEB',
              border: `1px solid ${readiness.ready ? '#BBF7D0' : '#FDE68A'}`,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: readiness.ready ? '#166534' : '#92400E', marginBottom: 6 }}>
              {readiness.ready
                ? `✅ Đã hoàn thành toàn bộ ${readiness.total} khóa bắt buộc của ${levelShortLabel(req.currentLevel)}`
                : `⚠️ Còn ${readiness.outstanding.length}/${readiness.total} khóa bắt buộc của ${levelShortLabel(req.currentLevel)} chưa hoàn thành`}
            </div>
            {!readiness.ready && readiness.outstanding.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
                {readiness.outstanding.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    {c.title} — {c.enrollment?.progressPercent || 0}%
                  </li>
                ))}
              </ul>
            )}
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 6 }}>
              Đây là thông tin tham khảo để cân nhắc. Quyết định cuối cùng thuộc về bạn.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', maxWidth: 460 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
            Phê duyệt sẽ mở khóa <strong>riêng khóa học này</strong> cho học viên và ghi danh ngay — không mở toàn bộ cấp bậc.
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" icon="ti-x" onClick={() => rejectRequest(req.id)}>Từ Chối</Button>
            <Button
              variant="primary"
              icon="ti-check"
              disabled={!jumpIsLegal}
              title={jumpIsLegal ? undefined : 'Không thể duyệt đơn nhảy cóc từ 2 cấp trở lên.'}
              onClick={() => approveRequest(req.id)}
            >
              Phê Duyệt Đơn Học Vượt Cấp
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Phê Duyệt Đơn Xin Học Vượt Cấp</h1>
            <Badge tone="amber" icon="ti-clipboard-check">{pendingList.length} đơn chờ xử lý</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Bạn đang duyệt với vai trò <strong>{roleDef.labelVi}</strong> &middot; Phạm vi quản lý:{' '}
            <strong>{managedScopeLabel(role)}</strong>
          </p>
        </div>
      </div>

      {/* Nhắc lại quy tắc tuần tự */}
      <div className="card card-pad" style={{ marginBottom: 20, borderLeft: '4px solid var(--blue)', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--ink)' }}>Quy tắc Sequential Level Gate:</strong> thang cấp bậc đảo ngược (Level 7 thấp nhất → Level 1 cao nhất).
        Nhân viên chỉ được xin học vượt <strong>đúng 1 cấp liền kề</strong>; đơn nhảy cóc từ 2 cấp trở lên hệ thống chặn cứng và không thể phê duyệt.
        Mỗi lần duyệt chỉ mở <strong>một khóa học cụ thể</strong>.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('PENDING')} className={`btn ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: 13 }}>
          <i className="ti ti-clock" /> Đơn Chờ Duyệt ({pendingList.length})
        </button>
        <button onClick={() => setActiveTab('PROCESSED')} className={`btn ${activeTab === 'PROCESSED' ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: 13 }}>
          <i className="ti ti-history" /> Lịch Sử Đã Xử Lý ({processedList.length})
        </button>
      </div>

      {activeTab === 'PENDING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {pendingList.length === 0 ? (
            <div className="card empty-state">
              <i className="ti ti-circle-check" />
              <p>Không còn đơn nào chờ xử lý.</p>
            </div>
          ) : (
            <>
              {levelSkipPending.length > 0 && (
                <div className="section-label" style={{ marginBottom: 0 }}>
                  Đơn xin học vượt cấp ({levelSkipPending.length})
                </div>
              )}
              {levelSkipPending.map(renderRequestCard)}

              {otherPending.length > 0 && (
                <div className="section-label" style={{ marginTop: 10, marginBottom: 0 }}>
                  Đơn đăng ký khóa học khác ({otherPending.length})
                </div>
              )}
              {otherPending.map(renderRequestCard)}
            </>
          )}
        </div>
      )}

      {activeTab === 'PROCESSED' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Học Viên</th>
                <th>Khóa Học</th>
                <th>Cấp Bậc</th>
                <th>Ngày Gửi</th>
                <th>Kết Quả</th>
              </tr>
            </thead>
            <tbody>
              {processedList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-soft)' }}>
                    Chưa có đơn nào được xử lý.
                  </td>
                </tr>
              ) : (
                processedList.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{req.employeeName}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{req.employeeId} &middot; {req.position}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{req.courseName}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {req.currentLevel && <JobLevelBadge level={req.currentLevel} compact />}
                        {req.courseLevel && (
                          <>
                            <i className="ti ti-arrow-right" style={{ fontSize: 11, color: 'var(--ink-faint)' }} />
                            <JobLevelBadge level={req.courseLevel} compact />
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--ink-soft)' }}>{req.requestDate}</td>
                    <td>
                      <Badge tone={req.status === 'APPROVED' ? 'sage' : 'rust'}>
                        {req.status === 'APPROVED' ? 'Đã phê duyệt' : 'Đã từ chối'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
