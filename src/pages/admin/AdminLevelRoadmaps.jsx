import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCourseStore } from '../../state/CourseStore';
import { normalizeRole, hasCapability } from '../../data/roles';
import { LEVEL_DEFINITIONS, nextLevelUp } from '../../data/levelSystem';
import { ROADMAP_BRANCHES } from '../../data/levelRoadmapMatrix';
import { Button, Modal } from '../../components/ui';

const BRANCH_LABEL = { OPERATIONS: 'Khối Vận Hành Siêu Thị', SUPPORTING: 'Khối Văn Phòng Hỗ Trợ' };

// Không có dữ liệu "Tab 2 Lộ trình kế cận" riêng — kế cận của Level N chính là
// định biên (Tab 1) của Level N-1, nên trang này chỉ cần 1 trình soạn thảo cho
// mỗi Level x Khối; sửa ở đây tự động cập nhật cả Tab 1 (của Level đó) lẫn
// Tab 2 (của Level N+1) trên trang Lộ Trình Học Tập của học viên.
export default function AdminLevelRoadmaps() {
  const { currentUser, courses, roadmapsConfig, addCourseToRoadmap, removeCourseFromRoadmap } = useCourseStore();
  const role = normalizeRole(currentUser?.role);
  const canManage = hasCapability(role, 'canManageLevelRoadmaps');

  const [selectedLevel, setSelectedLevel] = useState('7');
  const [selectedBranch, setSelectedBranch] = useState(ROADMAP_BRANCHES.OPERATIONS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  if (!canManage) {
    return (
      <div className="empty-state">
        <i className="ti ti-lock" aria-hidden="true" style={{ color: 'var(--rust)' }} />
        <p>Bạn không có quyền quản lý Lộ trình Cấp bậc.</p>
        <Link to="/">Về trang chủ</Link>
      </div>
    );
  }

  const milestoneSet = roadmapsConfig[selectedLevel][selectedBranch];
  const courseById = (id) => courses.find((c) => c.id === id);
  const belowLevel = nextLevelUp(selectedLevel); // Level thấp hơn xem lộ trình này làm "Lộ trình kế cận"

  const pickerCandidates = pickerOpen
    ? courses
        .filter((c) => !milestoneSet.courseIds.includes(c.id))
        .filter((c) => !pickerSearch
          || c.title.toLowerCase().includes(pickerSearch.toLowerCase())
          || c.code.toLowerCase().includes(pickerSearch.toLowerCase()))
        .slice(0, 40)
    : [];

  return (
    <>
      <div className="page-header">
        <h1>Quản Lý Lộ Trình Cấp Bậc</h1>
        <p>
          Cấu hình định biên bắt buộc cho từng Cấp bậc &times; Khối. Học viên tại Level này thấy đúng danh sách này ở
          Tab &quot;Lộ trình hiện tại&quot;{belowLevel ? <> — học viên Level {belowLevel} thấy nó ở Tab &quot;Lộ trình kế cận&quot;</> : null}.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>Cấp Bậc</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LEVEL_DEFINITIONS.map((lvl) => (
              <button
                key={lvl.level}
                onClick={() => setSelectedLevel(lvl.level)}
                className="btn btn-sm"
                style={{
                  background: selectedLevel === lvl.level ? 'var(--rail)' : 'var(--paper-raised)',
                  color: selectedLevel === lvl.level ? '#fff' : 'var(--ink)',
                  borderColor: selectedLevel === lvl.level ? 'var(--rail)' : 'var(--line-strong)',
                }}
              >
                {lvl.emoji} Level {lvl.level}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>Khối</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.values(ROADMAP_BRANCHES).map((branch) => (
              <button
                key={branch}
                onClick={() => setSelectedBranch(branch)}
                className="btn btn-sm"
                style={{
                  background: selectedBranch === branch ? 'var(--rail)' : 'var(--paper-raised)',
                  color: selectedBranch === branch ? '#fff' : 'var(--ink)',
                  borderColor: selectedBranch === branch ? 'var(--rail)' : 'var(--line-strong)',
                }}
              >
                {BRANCH_LABEL[branch]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>
            Định Biên Level {selectedLevel} &middot; {BRANCH_LABEL[selectedBranch]} ({milestoneSet.courseIds.length} chặng)
          </div>
          <Button size="sm" variant="outline" icon="ti-plus" onClick={() => { setPickerOpen(true); setPickerSearch(''); }}>
            Thêm Khóa Học
          </Button>
        </div>

        {milestoneSet.courseIds.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>Chưa có khóa học nào ở lộ trình này.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {milestoneSet.courseIds.map((id, idx) => {
              const course = courseById(id);
              if (!course) return null;
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--paper-sunken)', borderRadius: 6 }}>
                  <div style={{ width: 22, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', flexShrink: 0 }}>{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>
                      {course.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{course.code} &middot; {course.domain}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="ti-trash"
                    onClick={() => removeCourseFromRoadmap(selectedLevel, selectedBranch, id)}
                    title="Xóa khỏi lộ trình"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Thêm Khóa Học Vào Lộ Trình"
        subtitle={`Level ${selectedLevel} · ${BRANCH_LABEL[selectedBranch]}`}
        size="lg"
      >
        <input
          type="text"
          className="field-input"
          placeholder="Tìm theo tên hoặc mã khóa học..."
          value={pickerSearch}
          onChange={(e) => setPickerSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 14 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
          {pickerCandidates.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', textAlign: 'center', padding: 20 }}>
              Không tìm thấy khóa học phù hợp.
            </div>
          ) : (
            pickerCandidates.map((course) => (
              <div key={course.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>
                    {course.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {course.code} &middot; {course.domain} &middot; Level {course.targetLevel}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  icon="ti-plus"
                  onClick={() => addCourseToRoadmap(selectedLevel, selectedBranch, course.id)}
                >
                  Thêm
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </>
  );
}
