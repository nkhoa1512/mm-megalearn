import React, { useState, useMemo } from 'react';
import { Badge, Button, ProgressBar, Modal, JobLevelBadge } from './ui';
import { useCourseStore } from '../../store/CourseStore';
import { levelTitle, LEVEL_DEFINITIONS } from '../../data/levelSystem';
import RoadmapProgressSummary from '../roadmaps/RoadmapProgressSummary';

const statusMap = {
  COMPLETED: { tone: 'sage', label: 'Đã Hoàn Thành' },
  IN_PROGRESS: { tone: 'amber', label: 'Đang Học' },
  NOT_STARTED: { tone: 'slate', label: 'Chưa Bắt Đầu' },
  OVERDUE: { tone: 'rust', label: 'Quá Hạn' },
  FAILED: { tone: 'rust', label: 'Cần Thi Lại' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function UserTranscriptModal({ targetUser, isOpen, onClose, onEdit, onDelete }) {
  const { courses, currentUser, promoteUserLevel, myCourses, getUserRoadmapTabs } = useCourseStore();

  const [activeTab, setActiveTab] = useState('transcript'); // transcript | roadmap
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [selectedNewLevel, setSelectedNewLevel] = useState('6');
  const [promotionReason, setPromotionReason] = useState(
    'Hoàn thành xuất sắc các khóa học định biên và đạt chuẩn năng lực nghiệp vụ theo quy chế L&OD.'
  );
  const [promotionSuccess, setPromotionSuccess] = useState(false);

  // Toàn bộ khóa học (đã ghi danh) của người này, gộp cả ghi danh phát sinh
  // trong phiên — dùng myCourses của store thay vì enrollmentsForUser (hàm đó
  // trả về object theo courseId, không phải mảng, và nhận (user, overlay) chứ
  // không phải (courseList, user) như từng gọi nhầm ở đây gây crash "filter is
  // not a function").
  const userCourses = useMemo(() => {
    if (!targetUser) return [];
    return myCourses(courses, targetUser);
  }, [myCourses, courses, targetUser]);

  if (!isOpen || !targetUser) return null;

  // Stats calculation
  const totalCourses = userCourses.length;
  const completedList = userCourses.filter((c) => c.enrollment?.status === 'COMPLETED');
  const inProgressList = userCourses.filter((c) => c.enrollment?.status === 'IN_PROGRESS');
  const overdueList = userCourses.filter((c) => c.enrollment?.status === 'OVERDUE' || c.enrollment?.status === 'FAILED');

  const avgScore = completedList.length > 0
    ? Math.round(completedList.reduce((sum, c) => sum + (c.enrollment?.score || c.passingScore || 85), 0) / completedList.length)
    : '—';

  // Permission check for promoting Level
  const canPromote = currentUser?.role === 'useradmin' || currentUser?.role === 'sysadmin';

  function handlePromoteSubmit(e) {
    e.preventDefault();
    if (!selectedNewLevel) return;
    promoteUserLevel(targetUser.userId, selectedNewLevel, promotionReason);
    setPromotionSuccess(true);
    setTimeout(() => {
      setPromotionSuccess(false);
      setPromoteModalOpen(false);
    }, 1400);
  }

  return (
    <>
      <Modal
        isOpen={isOpen && !promoteModalOpen}
        onClose={onClose}
        title="Hồ Sơ &amp; Chi Tiết Khóa Học Của Nhân Sự"
        size="lg"
      >
        <div style={{ padding: '4px 0' }}>
          {/* USER HEADER CARD */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              background: 'var(--paper-sunken)',
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--rail)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {targetUser.avatar || (targetUser.fullName ? targetUser.fullName.slice(0, 2).toUpperCase() : 'NV')}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                    {targetUser.fullName}
                  </h3>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>
                    ({targetUser.employeeCode || targetUser.userId})
                  </span>
                  <JobLevelBadge level={targetUser.level} />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                  <strong>{targetUser.position}</strong> &middot; {targetUser.storeName || targetUser.branchName || 'MM Mega Market VN'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>Phòng ban: <strong>{targetUser.departmentName || targetUser.departmentCode || targetUser.department}</strong></span>
                  {(targetUser.subDepartmentName || targetUser.subDepartmentCode) && (
                    <>
                      <span>&middot;</span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#1E40AF',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        padding: '1px 8px',
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: 11,
                      }}>
                        <i className="ti ti-git-branch" />
                        {targetUser.subDepartmentName || targetUser.subDepartmentCode}
                      </span>
                    </>
                  )}
                  <span>&middot;</span>
                  <span>Thâm niên: {targetUser.yearsOfService || '1.5'} năm</span>
                </div>
              </div>
            </div>

            {/* Mọi thao tác trên nhân sự gom về đây, thay vì rải rác ngoài bảng danh mục. */}
            {(onEdit || canPromote || onDelete) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {onEdit && (
                  <Button
                    variant="outline"
                    icon="ti-edit"
                    size="sm"
                    onClick={() => onEdit(targetUser)}
                    title="Sửa tên, email, chức danh, cấp bậc và vai trò hệ thống"
                  >
                    Sửa Thông Tin
                  </Button>
                )}
                {canPromote && (
                  <Button
                    variant="primary"
                    icon="ti-award"
                    size="sm"
                    onClick={() => setPromoteModalOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)',
                      borderColor: '#4338CA',
                      fontWeight: 700,
                    }}
                  >
                    ⭐ Thăng Cấp Bậc (Promote Level)
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    icon="ti-trash"
                    size="sm"
                    onClick={() => onDelete(targetUser)}
                    title="Xóa hồ sơ nhân sự"
                    style={{ color: 'var(--rose, #E11D48)' }}
                  >
                    Xóa Nhân Sự
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* TAB SWITCHER */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`btn btn-sm ${activeTab === 'transcript' ? 'btn-primary' : 'btn-outline'}`}
            >
              <i className="ti ti-table" /> Bảng Điểm Khóa Học
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`btn btn-sm ${activeTab === 'roadmap' ? 'btn-primary' : 'btn-outline'}`}
            >
              <i className="ti ti-map-2" /> Lộ Trình Cấp Bậc
            </button>
          </div>

          {activeTab === 'roadmap' ? (
            <RoadmapProgressSummary roadmap={getUserRoadmapTabs(targetUser)} />
          ) : (
          <>
          {/* KPI SUMMARY CARDS */}
          <div className="grid grid-4" style={{ gap: 12, marginBottom: 20 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                Tổng Khóa Đã Gán
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', marginTop: 4 }}>
                {totalCourses}
              </div>
            </div>

            <div className="card card-pad" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                Đã Hoàn Thành
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#15803D', marginTop: 4 }}>
                {completedList.length}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#166534', marginLeft: 4 }}>
                  (ĐTB: {avgScore}%)
                </span>
              </div>
            </div>

            <div className="card card-pad" style={{ background: '#FEFCE8', borderColor: '#FEF08A', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#854D0E', textTransform: 'uppercase' }}>
                Đang Học Dở Dang
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#A16207', marginTop: 4 }}>
                {inProgressList.length}
              </div>
            </div>

            <div className="card card-pad" style={{ background: '#FEF2F2', borderColor: '#FECACA', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>
                Quá Hạn / Cần Thi Lại
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#DC2626', marginTop: 4 }}>
                {overdueList.length}
              </div>
            </div>
          </div>

          {/* COURSE TRANSCRIPT TABLE */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink)' }}>
                Chi Tiết Tiến Độ Từng Khóa Học ({userCourses.length} Khóa)
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                Chuẩn hóa định biên &amp; phân quyền truy cập
              </span>
            </div>

            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Khóa Học</th>
                  <th style={{ width: 120 }}>Cấp Bậc (Level)</th>
                  <th style={{ width: 120 }}>Trạng Thái</th>
                  <th style={{ width: 130 }}>Tiến Độ</th>
                  <th style={{ width: 80 }}>Điểm Thi</th>
                  <th style={{ width: 110 }}>Hạn / Hoàn Thành</th>
                </tr>
              </thead>
              <tbody>
                {userCourses.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)' }}>
                      Chưa có khóa học nào được ghi nhận cho nhân sự này.
                    </td>
                  </tr>
                ) : (
                  userCourses.map((c) => {
                    const enr = c.enrollment;
                    const status = enr?.status || 'NOT_STARTED';
                    const st = statusMap[status] || statusMap.NOT_STARTED;
                    const isCompleted = status === 'COMPLETED';
                    const isFailed = status === 'FAILED';

                    return (
                      <tr key={c.id}>
                        {/* Bảng tổng hợp này chỉ hiện mã khóa (gọn, không xuống dòng lung tung
                            khi cột hẹp) — tên đầy đủ xem trong tooltip hoặc trang "Khóa Học Của
                            Tôi" của learner, nơi vẫn hiện tên bình thường như trước. */}
                        <td>
                          <div
                            style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}
                            title={c.title}
                          >
                            {c.code}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                            <span>{c.category || c.domain}</span>
                            <span>&middot;</span>
                            <span>{c.estimatedHours || c.estimatedDuration || '3h'}</span>
                          </div>
                        </td>

                        <td>
                          <JobLevelBadge level={c.targetLevel || '7'} />
                        </td>

                        <td>
                          <Badge tone={st.tone}>
                            {st.label}
                          </Badge>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1 }}>
                              <ProgressBar
                                value={enr?.progressPercent || 0}
                                tone={isCompleted ? 'sage' : isFailed ? 'rust' : 'amber'}
                                size="sm"
                              />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28 }}>
                              {enr?.progressPercent || 0}%
                            </span>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontWeight: 700, fontSize: 12, color: isCompleted ? 'var(--sage)' : 'var(--ink-soft)' }}>
                            {enr?.score ? `${enr.score}%` : isCompleted ? `${c.passingScore || 80}%` : '—'}
                          </span>
                        </td>

                        <td style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                          {isCompleted ? formatDate(enr?.completedAt) : formatDate(enr?.dueDate || c.assignment?.dueDate)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          </>
          )}
        </div>
      </Modal>

      {/* PROMOTION SUB-MODAL */}
      {promoteModalOpen && (
        <Modal
          isOpen={promoteModalOpen}
          onClose={() => setPromoteModalOpen(false)}
          title="Quyết Định Thăng Cấp Bậc (Job Level Promotion)"
          size="md"
        >
          {promotionSuccess ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>
                <i className="ti ti-check" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontWeight: 800 }}>Thăng Cấp Bậc Thành Công!</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: 0 }}>
                Học viên <strong>{targetUser.fullName}</strong> đã được nâng lên <strong>Level {selectedNewLevel} ({levelTitle(selectedNewLevel)})</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePromoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--paper-sunken)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Nhân viên được xem xét:</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>
                  {targetUser.fullName} &middot; Level hiện tại: <JobLevelBadge level={targetUser.level} />
                </div>
              </div>

              <div>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>
                  Chọn Cấp Bậc Mới (Thang Level 7 Thấp Nhất &rarr; Level 1 Cao Nhất):
                </label>
                <select
                  className="field-select"
                  value={selectedNewLevel}
                  onChange={(e) => setSelectedNewLevel(e.target.value)}
                  style={{ width: '100%', height: 38, fontSize: 13, fontWeight: 700 }}
                >
                  {Object.entries(LEVEL_DEFINITIONS)
                    .filter(([lvl]) => Number(lvl) < Number(targetUser.level || 7)) // Chỉ cho phép thăng lên level cao hơn (số nhỏ hơn)
                    .map(([lvl, def]) => (
                      <option key={lvl} value={lvl}>
                        Level {lvl} &mdash; {def.title} (Khung: {def.authority})
                      </option>
                    ))}
                </select>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                  Khi thăng cấp thành công, học viên sẽ tự động được mở khóa toàn bộ chương trình đào tạo của cấp bậc mới.
                </div>
              </div>

              <div>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>
                  Lý Do / Căn Cứ Đánh Giá Thăng Cấp:
                </label>
                <textarea
                  className="field-textarea"
                  rows={3}
                  value={promotionReason}
                  onChange={(e) => setPromotionReason(e.target.value)}
                  placeholder="Ghi chú thành tích học tập, chứng chỉ đạt được, đánh giá 1-on-1 của quản lý..."
                  required
                  style={{ width: '100%', fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <Button variant="outline" type="button" onClick={() => setPromoteModalOpen(false)}>
                  Hủy Bỏ
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  icon="ti-award"
                  style={{ background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)', borderColor: '#4338CA' }}
                >
                  Xác Nhận Thăng Cấp Bậc
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
