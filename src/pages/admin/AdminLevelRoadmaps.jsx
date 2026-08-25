import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCourseStore } from '../../state/CourseStore';
import { normalizeRole, hasCapability } from '../../data/roles';
import { LEVEL_DEFINITIONS, nextLevelUp } from '../../data/levelSystem';
import { ROADMAP_BRANCHES } from '../../data/levelRoadmapMatrix';
import { Button, Modal, Badge } from '../../components/ui';
import VisualRoadmapTimeline from '../../components/VisualRoadmapTimeline';
import { getCourseImage, COURSE_IMAGE_PRESETS } from '../../data/courseImages';

const BRANCH_LABEL = { OPERATIONS: 'Khối Vận Hành Siêu Thị', SUPPORTING: 'Khối Văn Phòng Hỗ Trợ' };
const BRANCH_LABEL_EN = { OPERATIONS: 'Store Operations Branch', SUPPORTING: 'Support Center Branch' };

export default function AdminLevelRoadmaps() {
  const {
    currentUser,
    courses,
    roadmapsConfig,
    addCourseToRoadmap,
    removeCourseFromRoadmap,
    updateCourse,
    language,
    t,
  } = useCourseStore();

  const role = normalizeRole(currentUser?.role);
  const canManage = hasCapability(role, 'canManageLevelRoadmaps');

  const [selectedLevel, setSelectedLevel] = useState('7');
  const [selectedBranch, setSelectedBranch] = useState(ROADMAP_BRANCHES.OPERATIONS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Modal tùy chỉnh ảnh mốc lộ trình
  const [imageModalCourse, setImageModalCourse] = useState(null);
  const [customImageUrl, setCustomImageUrl] = useState('');

  if (!canManage) {
    return (
      <div className="empty-state">
        <i className="ti ti-lock" aria-hidden="true" style={{ color: 'var(--rust)' }} />
        <p>{language === 'en' ? 'You do not have permission to manage Level Roadmaps.' : 'Bạn không có quyền quản lý Lộ trình Cấp bậc.'}</p>
        <Link to="/">{language === 'en' ? 'Back to Home' : 'Về trang chủ'}</Link>
      </div>
    );
  }

  const milestoneSet = roadmapsConfig[selectedLevel]?.[selectedBranch] || { courseIds: [] };
  const courseById = (id) => courses.find((c) => c.id === id);
  const belowLevel = nextLevelUp(selectedLevel);

  // Tạo mock milestones array cho VisualRoadmapTimeline preview
  const previewMilestones = milestoneSet.courseIds
    .map((id) => courseById(id))
    .filter(Boolean)
    .map((course, idx) => ({
      course,
      status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      completed: false,
    }));

  const pickerCandidates = pickerOpen
    ? courses
        .filter((c) => !milestoneSet.courseIds.includes(c.id))
        .filter(
          (c) =>
            !pickerSearch ||
            c.title.toLowerCase().includes(pickerSearch.toLowerCase()) ||
            c.code.toLowerCase().includes(pickerSearch.toLowerCase()) ||
            (c.domain && c.domain.toLowerCase().includes(pickerSearch.toLowerCase()))
        )
        .slice(0, 40)
    : [];

  function openImageCustomizer(course) {
    setImageModalCourse(course);
    setCustomImageUrl(course.milestoneImage || course.thumbnail || '');
  }

  function handleSaveMilestoneImage(url) {
    if (!imageModalCourse) return;
    const targetUrl = url || customImageUrl;
    updateCourse(imageModalCourse.id, {
      ...imageModalCourse,
      milestoneImage: targetUrl,
      thumbnail: targetUrl,
      imageUrl: targetUrl,
    });
    setImageModalCourse(null);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{language === 'en' ? 'Level Roadmaps & Milestone Visual Management' : 'Quản Lý Lộ Trình Cấp Bậc & Hình Ảnh Mốc Học'}</h1>
            <Badge tone="blue">{language === 'en' ? 'Visual Roadmaps' : 'Sinh Động Hóa Lộ Trình'}</Badge>
          </div>
          <p>
            {language === 'en'
              ? 'Configure mandatory milestones and curate visual imagery for each Job Level × Branch combination.'
              : 'Cấu hình định biên bắt buộc và quản lý hình ảnh trực quan cho từng Cấp bậc × Khối. Học viên tại Level này thấy đúng danh sách này ở Tab "Lộ trình hiện tại".'}
          </p>
        </div>
      </div>

      {/* MATRIX SELECTOR */}
      <div className="card card-pad" style={{ marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>{language === 'en' ? 'Job Level' : 'Cấp Bậc'}</div>
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
          <div className="field-label" style={{ marginBottom: 6 }}>{language === 'en' ? 'Branch' : 'Khối'}</div>
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
                {language === 'en' ? BRANCH_LABEL_EN[branch] : BRANCH_LABEL[branch]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. INTERACTIVE ROADMAP TIMELINE PREVIEW */}
      <div className="card card-pad" style={{ marginBottom: 20, borderLeft: '4px solid var(--blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-route" style={{ color: 'var(--blue)', fontSize: 18 }} />
            Xem Trước Trục Lộ Trình Trực Quan — Level {selectedLevel} &middot; {BRANCH_LABEL[selectedBranch]}
          </div>
          <Badge tone="sage">{milestoneSet.courseIds.length} Chặng Học</Badge>
        </div>

        <VisualRoadmapTimeline milestones={previewMilestones} />
      </div>

      {/* 2. ROADMAP MILESTONES LIST & IMAGE CUSTOMIZATION */}
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>
            Danh Sách Mốc Định Biên &amp; Hình Ảnh Chặng ({milestoneSet.courseIds.length} khóa học)
          </div>
          <Button size="sm" variant="primary" icon="ti-plus" onClick={() => { setPickerOpen(true); setPickerSearch(''); }}>
            Thêm Khóa Học Vào Lộ Trình
          </Button>
        </div>

        {milestoneSet.courseIds.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', padding: '20px 0', textAlign: 'center' }}>
            Chưa có khóa học nào ở lộ trình này. Hãy bấm &quot;Thêm Khóa Học Vào Lộ Trình&quot; để thiết lập.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {milestoneSet.courseIds.map((id, idx) => {
              const course = courseById(id);
              if (!course) return null;
              const imgUrl = getCourseImage(course);

              return (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    background: 'var(--paper-sunken)',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                  }}
                >
                  {/* Sequence Number */}
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--rail)',
                      color: '#fff',
                      textAlign: 'center',
                      lineHeight: '26px',
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>

                  {/* Thumbnail Image Avatar */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid var(--blue)',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                    }}
                    onClick={() => openImageCustomizer(course)}
                    title="Bấm để đổi ảnh mốc lộ trình"
                  >
                    <img
                      src={imgUrl}
                      alt={course.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Course Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={course.title}
                    >
                      {course.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{course.code}</span>
                      <span>&middot;</span>
                      <span>{course.domain || course.category}</span>
                      <span>&middot;</span>
                      <span>Level {course.targetLevel}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Button
                      size="sm"
                      variant="outline"
                      icon="ti-photo"
                      onClick={() => openImageCustomizer(course)}
                      title="Đổi ảnh đại diện chặng học"
                    >
                      Đổi Ảnh
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="ti-trash"
                      onClick={() => removeCourseFromRoadmap(selectedLevel, selectedBranch, id)}
                      title="Xóa khỏi lộ trình"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. MODAL: TÙY CHỈNH ẢNH MỐC LỘ TRÌNH */}
      {imageModalCourse && (
        <Modal
          isOpen={Boolean(imageModalCourse)}
          onClose={() => setImageModalCourse(null)}
          title="Tùy Chỉnh Ảnh Mốc Lộ Trình"
          subtitle={imageModalCourse.title}
          size="md"
        >
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Nhập URL hình ảnh mới</label>
            <input
              type="text"
              className="field-input"
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              style={{ width: '100%', marginBottom: 10 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
              Hoặc chọn ảnh đại diện phù hợp từ thư viện MMVN:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {COURSE_IMAGE_PRESETS.map((preset) => {
                const isSelected = customImageUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setCustomImageUrl(preset.url);
                      handleSaveMilestoneImage(preset.url);
                    }}
                    style={{
                      padding: 4,
                      borderRadius: 6,
                      border: isSelected ? '2px solid var(--blue)' : '1px solid var(--line)',
                      background: isSelected ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      style={{ width: '100%', height: 48, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }}
                    />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--ink)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="outline" onClick={() => setImageModalCourse(null)}>Hủy</Button>
            <Button variant="primary" icon="ti-check" onClick={() => handleSaveMilestoneImage(customImageUrl)}>Lưu Ảnh Mốc</Button>
          </div>
        </Modal>
      )}

      {/* 4. MODAL: THÊM KHÓA HỌC VÀO LỘ TRÌNH (CÓ THUMBNAIL) */}
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
          placeholder="Tìm theo tên, mã hoặc lĩnh vực khóa học..."
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
            pickerCandidates.map((course) => {
              const thumb = getCourseImage(course);
              return (
                <div
                  key={course.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 10px',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    background: '#fff',
                  }}
                >
                  <img
                    src={thumb}
                    alt={course.title}
                    style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>
                      {course.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                      {course.code} &middot; {course.domain || course.category} &middot; Level {course.targetLevel}
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
              );
            })
          )}
        </div>
      </Modal>
    </>
  );
}
