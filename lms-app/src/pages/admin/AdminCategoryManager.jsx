import React, { useState, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { Button, Badge, Modal } from '../../features/common/ui';
import { normalizeRole, ROLE_HOME } from '../../data/roles';
import {
  CATEGORY_ICON_PRESETS,
  CATEGORY_COLOR_PRESETS,
  generateCategoryCode,
  normalizeCategory,
} from '../../utils/courseCatalog';

const CATEGORY_IMAGE_PRESETS = [
  { label: 'Vệ Sinh ATTP / HACCP', url: 'https://images.unsplash.com/photo-1577106263724-2c8e03bfe9cf?auto=format&fit=crop&w=600&q=80' },
  { label: 'An Toàn Lao Động & PCCC', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80' },
  { label: 'Chuỗi Cung Ứng Lạnh', url: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&q=80' },
  { label: 'Vận Hành Siêu Thị & POS', url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80' },
  { label: 'Kho Vận & Logistics', url: 'https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=600&q=80' },
  { label: 'Kiểm Soát Thất Thoát & QA', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80' },
  { label: 'Lãnh Đạo & Quản Trị', url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80' },
  { label: 'Quản Trị Doanh Nghiệp (ESG)', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80' },
  { label: 'Pháp Chế & Đạo Đức', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80' },
  { label: 'An Ninh Thông Tin (IT Sec)', url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80' },
  { label: 'Dịch Vụ Khách Hàng', url: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=600&q=80' },
  { label: 'Ngành Hàng & Bán Hàng', url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80' },
  { label: 'Thương Mại Điện Tử', url: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=600&q=80' },
  { label: 'Tài Chính & Kế Toán', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Hội Nhập & Văn Hóa MMVN', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Thực Phẩm Tươi Sống (Fresh)', url: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80' },
];

function usageOf(categoryName, { courses, curricula, assessments, libraries }) {
  const name = typeof categoryName === 'string' ? categoryName : categoryName?.name;
  const courseCount = (courses || []).filter((c) => c.category === name || (c.categories || []).includes(name)).length;
  const curriculumCount = (curricula || []).filter((cur) => cur.category === name).length;
  const assessmentCount = (assessments || []).filter((a) => a.category === name || (a.categories || []).includes(name)).length;
  const libraryDomainCount = (libraries || []).reduce((sum, lib) => sum + (lib.domains || []).filter((d) => d.category === name).length, 0);
  return {
    courseCount,
    curriculumCount,
    assessmentCount,
    libraryDomainCount,
    total: courseCount + curriculumCount + assessmentCount + libraryDomainCount,
  };
}

function emptyCategoryDraft(existingCount = 0) {
  const preset = CATEGORY_IMAGE_PRESETS[existingCount % CATEGORY_IMAGE_PRESETS.length];
  return {
    id: `cat-${Date.now()}`,
    name: '',
    code: '',
    icon: 'ti-folder',
    color: '#3b82f6',
    description: '',
    coverImage: preset?.url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
  };
}

export default function AdminCategoryManager() {
  const {
    companyCategoryObjects = [],
    addCompanyCategory,
    updateCompanyCategory,
    deleteCompanyCategory,
    courses,
    curricula,
    assessments,
    libraries,
    language,
    currentUser,
  } = useCourseStore();

  const role = normalizeRole(currentUser?.role);
  const isSystemAdminRole = role === 'useradmin' || role === 'sysadmin';

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' | 'TABLE'
  const [toastMessage, setToastMessage] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null); // null | { isNew: boolean, draft: Object, isCodeTouched: boolean, imageTab: 'PRESET'|'URL'|'UPLOAD' }
  const [modalError, setModalError] = useState('');
  const fileInputRef = useRef(null);

  const ctx = { courses, curricula, assessments, libraries };

  function showToast(text, type = 'success') {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  }

  if (!isSystemAdminRole) {
    return <Navigate to={ROLE_HOME[role] || '/learner'} replace />;
  }

  // Normalized list of categories
  const normalizedCategories = useMemo(() => {
    return companyCategoryObjects.map((c) => normalizeCategory(c, companyCategoryObjects));
  }, [companyCategoryObjects]);

  // Filter categories by search (name, code, description)
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return normalizedCategories;
    const q = search.toLowerCase();
    return normalizedCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        (cat.code && cat.code.toLowerCase().includes(q)) ||
        (cat.description && cat.description.toLowerCase().includes(q))
    );
  }, [normalizedCategories, search]);

  // Usage summary statistics
  const stats = useMemo(() => {
    let inUseCount = 0;
    let unusedCount = 0;
    normalizedCategories.forEach((cat) => {
      const u = usageOf(cat.name, ctx);
      if (u.total > 0) inUseCount++;
      else unusedCount++;
    });
    return { total: normalizedCategories.length, inUseCount, unusedCount };
  }, [normalizedCategories, ctx]);

  // Open Create Modal
  function openCreateModal() {
    setCategoryModal({
      isNew: true,
      draft: emptyCategoryDraft(normalizedCategories.length),
      isCodeTouched: false,
      imageTab: 'PRESET',
    });
    setModalError('');
  }

  // Open Edit Modal
  function openEditModal(category) {
    setCategoryModal({
      isNew: false,
      draft: { ...normalizeCategory(category, normalizedCategories) },
      isCodeTouched: true,
      imageTab: 'PRESET',
    });
    setModalError('');
  }

  // Save Modal (Create or Update)
  function handleSaveModal() {
    if (!categoryModal) return;
    const { isNew, draft } = categoryModal;
    const cleanName = (draft.name || '').trim();
    if (!cleanName) {
      setModalError('Vui lòng nhập tên danh mục.');
      return;
    }

    const cleanCode = (draft.code || '').trim() || generateCategoryCode(cleanName);
    const categoryToSave = {
      ...draft,
      name: cleanName,
      code: cleanCode.toUpperCase(),
    };

    if (isNew) {
      const result = addCompanyCategory(categoryToSave);
      if (result && !result.ok) {
        setModalError(result.reason || `Danh mục "${cleanName}" đã tồn tại.`);
        return;
      }
      showToast(`Đã tạo danh mục mới "${cleanName}" thành công!`);
    } else {
      const result = updateCompanyCategory(draft.id || draft.name, categoryToSave);
      if (result && !result.ok) {
        setModalError(result.reason || `Lỗi cập nhật danh mục.`);
        return;
      }
      showToast(`Đã cập nhật danh mục "${cleanName}" thành công!`);
    }

    setCategoryModal(null);
    setModalError('');
  }

  // Delete Category
  function handleDelete(cat) {
    const name = cat.name;
    const usage = usageOf(name, ctx);
    if (usage.total > 0) {
      window.alert(
        `Không thể xóa "${name}" vì đang được dùng ở ${usage.total} nơi:\n` +
        `- ${usage.courseCount} khóa học\n- ${usage.curriculumCount} giáo trình\n` +
        `- ${usage.assessmentCount} assessment\n- ${usage.libraryDomainCount} lĩnh vực trong Library`
      );
      return;
    }
    if (window.confirm(`Xóa danh mục "${name}"? Thao tác này không thể hoàn tác.`)) {
      deleteCompanyCategory(cat.id || name);
      showToast(`Đã xóa danh mục "${name}" thành công!`);
    }
  }

  // Handle local image file upload
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setModalError('Vui lòng chọn file hình ảnh (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result;
      if (dataUrl && categoryModal) {
        setCategoryModal({
          ...categoryModal,
          draft: { ...categoryModal.draft, coverImage: dataUrl },
        });
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{language === 'en' ? 'Manage Category Taxonomy' : 'Quản Lý Danh Mục'}</h1>
            <Badge tone="sage">{stats.total} {language === 'en' ? 'Categories' : 'Danh Mục'}</Badge>
          </div>
          <p>
            {language === 'en'
              ? 'Define company-wide training categories with custom cover images, icons, color codes, and descriptions.'
              : 'Thiết lập danh mục Lĩnh Vực (Category) chuẩn hóa toàn công ty với đầy đủ ảnh bìa, biểu tượng nhận diện, mã code và mô tả đào tạo.'}
          </p>
        </div>
        <Button variant="primary" icon="ti-plus" onClick={openCreateModal}>
          Tạo Danh Mục Mới
        </Button>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            background: toastMessage.type === 'success' ? 'var(--sage-soft)' : 'var(--rust-soft)',
            color: toastMessage.type === 'success' ? 'var(--sage-soft-text)' : 'var(--rust-soft-text)',
            border: `1px solid ${toastMessage.type === 'success' ? 'var(--sage)' : 'var(--rust)'}`,
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
            fontSize: 13,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <i className={`ti ${toastMessage.type === 'success' ? 'ti-circle-check' : 'ti-alert-circle'}`} style={{ fontSize: 18 }} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Stats Overview */}
      <div className="grid grid-3" style={{ gap: 14, marginBottom: 20 }}>
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--rail-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rail)', fontSize: 22 }}>
            <i className="ti ti-category" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Danh Mục Chuẩn</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--rail)' }}>{stats.total}</div>
          </div>
        </div>
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--sage-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sage)', fontSize: 22 }}>
            <i className="ti ti-circle-check" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 700, textTransform: 'uppercase' }}>Đang Được Sử Dụng</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--sage)' }}>{stats.inUseCount}</div>
          </div>
        </div>
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--amber-soft, #fef3c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)', fontSize: 22 }}>
            <i className="ti ti-alert-circle" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 700, textTransform: 'uppercase' }}>Chưa Gán Khóa / Nội Dung</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)' }}>{stats.unusedCount}</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search + Stats + View Switcher */}
      <div className="card card-pad" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 36, paddingRight: search ? 30 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
              placeholder="Tìm theo tên danh mục, mã code, mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            Hiển thị <strong>{filteredCategories.length}</strong> / {stats.total} danh mục
          </div>
        </div>

        {/* Right side: Create button + View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button size="sm" variant="primary" icon="ti-plus" onClick={openCreateModal}>
            Tạo Mới
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)', height: 36 }}>
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`btn btn-sm ${viewMode === 'GRID' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ height: 28, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
              title="Dạng Lưới (Grid View)"
            >
              <i className="ti ti-layout-grid" />
              <span>Lưới</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`btn btn-sm ${viewMode === 'TABLE' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ height: 28, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
              title="Dạng Bảng (List View)"
            >
              <i className="ti ti-list" />
              <span>Bảng</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid View (Rich Cards with Cover Images) */}
      {viewMode === 'GRID' ? (
        <div className="grid grid-3" style={{ gap: 16 }}>
          {filteredCategories.map((cat) => {
            const usage = usageOf(cat.name, ctx);
            return (
              <div
                key={cat.id || cat.name}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                  borderRadius: 12,
                  border: '1px solid var(--line)',
                }}
              >
                <div>
                  {/* Card Cover Image Header */}
                  <div style={{ position: 'relative', height: 130, background: 'var(--paper-sunken)', overflow: 'hidden' }}>
                    <img
                      src={cat.coverImage}
                      alt={cat.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)' }} />

                    {/* Top-Right Badge: Usage Status */}
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <span
                        style={{
                          background: usage.total > 0 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(100, 116, 139, 0.85)',
                          color: '#fff',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        {usage.total > 0 ? `${usage.total} liên kết` : 'Chưa dùng'}
                      </span>
                    </div>

                    {/* Bottom-Left Floating Avatar Icon */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 10,
                        left: 12,
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: cat.color || '#3b82f6',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                        border: '2px solid #fff',
                      }}
                    >
                      <i className={`ti ${cat.icon || 'ti-folder'}`} />
                    </div>

                    {/* Code Badge next to Avatar */}
                    {cat.code && (
                      <div style={{ position: 'absolute', bottom: 12, left: 60 }}>
                        <span
                          style={{
                            background: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            fontFamily: 'var(--font-mono, monospace)',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          {cat.code}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '14px 14px 10px 14px' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.3 }}>
                      {cat.name}
                    </div>

                    <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12, minHeight: 34, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {cat.description || 'Chưa có mô tả mục tiêu và phạm vi đào tạo cho danh mục này.'}
                    </p>

                    {/* Usage Stats 4-Cell Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 6,
                        background: 'var(--paper-sunken)',
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 11.5,
                      }}
                    >
                      <div style={{ color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="ti ti-books" style={{ color: 'var(--rail)' }} />
                        <span>Khóa học: <strong style={{ color: 'var(--ink)' }}>{usage.courseCount}</strong></span>
                      </div>
                      <div style={{ color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="ti ti-certificate" style={{ color: 'var(--sage)' }} />
                        <span>Giáo trình: <strong style={{ color: 'var(--ink)' }}>{usage.curriculumCount}</strong></span>
                      </div>
                      <div style={{ color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="ti ti-writing" style={{ color: 'var(--amber)' }} />
                        <span>Assessment: <strong style={{ color: 'var(--ink)' }}>{usage.assessmentCount}</strong></span>
                      </div>
                      <div style={{ color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="ti ti-folders" style={{ color: '#06b6d4' }} />
                        <span>Library: <strong style={{ color: 'var(--ink)' }}>{usage.libraryDomainCount}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '10px 14px', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
                  <Button size="sm" variant="outline" icon="ti-edit" onClick={() => openEditModal(cat)}>
                    Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon="ti-trash"
                    disabled={usage.total > 0}
                    title={usage.total > 0 ? `Đang được dùng ở ${usage.total} nơi — không thể xóa` : undefined}
                    onClick={() => handleDelete(cat)}
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '40px 16px' }}>
              <i className="ti ti-category" aria-hidden="true" />
              <p>Không tìm thấy danh mục nào phù hợp với "{search}".</p>
            </div>
          )}
        </div>
      ) : (
        /* List View (Table) */
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Danh Mục</th>
                <th style={{ width: 110, textAlign: 'center' }}>Khóa Học</th>
                <th style={{ width: 110, textAlign: 'center' }}>Giáo Trình</th>
                <th style={{ width: 110, textAlign: 'center' }}>Assessment</th>
                <th style={{ width: 110, textAlign: 'center' }}>Library</th>
                <th style={{ width: 140, textAlign: 'center' }}>Tổng Liên Kết</th>
                <th style={{ width: 150, textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat) => {
                const usage = usageOf(cat.name, ctx);
                return (
                  <tr key={cat.id || cat.name}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Thumbnail & Icon avatar */}
                        <div style={{ position: 'relative', width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                          <img
                            src={cat.coverImage}
                            alt={cat.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: 18,
                            }}
                          >
                            <i className={`ti ${cat.icon || 'ti-folder'}`} />
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{cat.name}</span>
                            {cat.code && (
                              <span
                                style={{
                                  background: 'var(--paper-sunken)',
                                  color: cat.color || 'var(--rail)',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  border: '1px solid var(--line)',
                                  fontFamily: 'var(--font-mono, monospace)',
                                }}
                              >
                                {cat.code}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cat.description || 'Chưa có mô tả.'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: usage.courseCount > 0 ? 'var(--ink)' : 'var(--ink-faint)' }}>
                      {usage.courseCount}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: usage.curriculumCount > 0 ? 'var(--ink)' : 'var(--ink-faint)' }}>
                      {usage.curriculumCount}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: usage.assessmentCount > 0 ? 'var(--ink)' : 'var(--ink-faint)' }}>
                      {usage.assessmentCount}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: usage.libraryDomainCount > 0 ? 'var(--ink)' : 'var(--ink-faint)' }}>
                      {usage.libraryDomainCount}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge tone={usage.total > 0 ? 'sage' : 'slate'} size="sm">
                        {usage.total > 0 ? `${usage.total} liên kết` : 'Trống'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <Button size="sm" variant="outline" icon="ti-edit" onClick={() => openEditModal(cat)}>
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon="ti-trash"
                          disabled={usage.total > 0}
                          title={usage.total > 0 ? `Đang được dùng ở ${usage.total} nơi — không thể xóa` : undefined}
                          onClick={() => handleDelete(cat)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-soft)' }}>
                    <i className="ti ti-search" style={{ fontSize: 24, marginBottom: 8, display: 'block', color: 'var(--ink-faint)' }} />
                    Không tìm thấy danh mục nào phù hợp với "{search}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Rich Category Modal (Create & Edit) */}
      {categoryModal && (
        <Modal
          isOpen
          title={categoryModal.isNew ? 'Tạo Danh Mục Lĩnh Vực Mới' : `Chỉnh Sửa Danh Mục "${categoryModal.draft.name}"`}
          subtitle="Thiết lập tên, mã viết tắt, ảnh bìa, icon nhận diện và thông tin mô tả chi tiết."
          onClose={() => setCategoryModal(null)}
          size="lg"
          footer={(
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                * Bắt buộc nhập tên danh mục
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => setCategoryModal(null)}>Hủy</Button>
                <Button variant="primary" icon="ti-check" disabled={!categoryModal.draft.name.trim()} onClick={handleSaveModal}>
                  {categoryModal.isNew ? 'Tạo Danh Mục' : 'Lưu Thay Đổi'}
                </Button>
              </div>
            </div>
          )}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'start' }}>
            {/* Left Column: Form Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Row 1: Name & Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: 10 }}>
                <div>
                  <label className="field-label" style={{ fontWeight: 700, marginBottom: 4 }}>
                    Tên Danh Mục <span style={{ color: 'var(--rust)' }}>*</span>
                  </label>
                  <input
                    className="field-input"
                    placeholder="VD: Trí Tuệ Nhân Tạo, Digital Marketing..."
                    value={categoryModal.draft.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      const newCode = !categoryModal.isCodeTouched
                        ? generateCategoryCode(newName)
                        : categoryModal.draft.code;
                      setCategoryModal({
                        ...categoryModal,
                        draft: { ...categoryModal.draft, name: newName, code: newCode },
                      });
                      setModalError('');
                    }}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="field-label" style={{ fontWeight: 700, marginBottom: 4 }}>
                    Mã Code
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      className="field-input"
                      style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                      placeholder="VD: FSH"
                      value={categoryModal.draft.code}
                      onChange={(e) => {
                        setCategoryModal({
                          ...categoryModal,
                          isCodeTouched: true,
                          draft: { ...categoryModal.draft, code: e.target.value.toUpperCase() },
                        });
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      title="Tự động sinh mã"
                      onClick={() => {
                        setCategoryModal({
                          ...categoryModal,
                          isCodeTouched: false,
                          draft: { ...categoryModal.draft, code: generateCategoryCode(categoryModal.draft.name) },
                        });
                      }}
                    >
                      <i className="ti ti-wand" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Color Theme Swatches */}
              <div>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: 6 }}>
                  Màu Sắc Nhận Diện
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {CATEGORY_COLOR_PRESETS.map((color) => {
                    const isSelected = categoryModal.draft.color === color.value;
                    return (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setCategoryModal({ ...categoryModal, draft: { ...categoryModal.draft, color: color.value } })}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: color.value,
                          border: isSelected ? '3px solid var(--ink)' : '2px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 12,
                          boxShadow: isSelected ? '0 0 0 2px rgba(0,0,0,0.15)' : 'none',
                        }}
                        title={color.label}
                      >
                        {isSelected && <i className="ti ti-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Icon Picker Grid */}
              <div>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: 6 }}>
                  Biểu Tượng (Icon)
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: 6,
                    maxHeight: 120,
                    overflowY: 'auto',
                    padding: 8,
                    background: 'var(--paper-sunken)',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                  }}
                >
                  {CATEGORY_ICON_PRESETS.map((icon) => {
                    const isSelected = categoryModal.draft.icon === icon.id;
                    return (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => setCategoryModal({ ...categoryModal, draft: { ...categoryModal.draft, icon: icon.id } })}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: 6,
                          background: isSelected ? categoryModal.draft.color || 'var(--rail)' : 'var(--paper-raised)',
                          color: isSelected ? '#fff' : 'var(--ink)',
                          border: isSelected ? 'none' : '1px solid var(--line)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 17,
                        }}
                        title={icon.label}
                      >
                        <i className={`ti ${icon.id}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Description */}
              <div>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: 4 }}>
                  Mô Tả Mục Tiêu &amp; Phạm Vi Đào Tạo
                </label>
                <textarea
                  className="field-input"
                  rows={2}
                  style={{ width: '100%', resize: 'vertical', fontSize: 12.5 }}
                  placeholder="Mô tả nhóm kiến thức, kỹ năng hoặc nghiệp vụ thuộc danh mục này..."
                  value={categoryModal.draft.description}
                  onChange={(e) => setCategoryModal({ ...categoryModal, draft: { ...categoryModal.draft, description: e.target.value } })}
                />
              </div>

              {/* Row 5: Cover Image Picker Tabs */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="field-label" style={{ fontWeight: 700, margin: 0 }}>
                    Ảnh Bìa Đại Diện (Cover Image)
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setCategoryModal({ ...categoryModal, imageTab: 'PRESET' })}
                      className={`btn btn-sm ${categoryModal.imageTab === 'PRESET' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: 11, padding: '2px 8px', height: 24 }}
                    >
                      Ảnh Mẫu
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryModal({ ...categoryModal, imageTab: 'URL' })}
                      className={`btn btn-sm ${categoryModal.imageTab === 'URL' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: 11, padding: '2px 8px', height: 24 }}
                    >
                      Nhập Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryModal({ ...categoryModal, imageTab: 'UPLOAD' })}
                      className={`btn btn-sm ${categoryModal.imageTab === 'UPLOAD' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: 11, padding: '2px 8px', height: 24 }}
                    >
                      Tải Lên
                    </button>
                  </div>
                </div>

                {categoryModal.imageTab === 'PRESET' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 8,
                      maxHeight: 140,
                      overflowY: 'auto',
                      padding: 6,
                      background: 'var(--paper-sunken)',
                      borderRadius: 8,
                      border: '1px solid var(--line)',
                    }}
                  >
                    {CATEGORY_IMAGE_PRESETS.map((img) => {
                      const isSelected = categoryModal.draft.coverImage === img.url;
                      return (
                        <div
                          key={img.url}
                          onClick={() => setCategoryModal({ ...categoryModal, draft: { ...categoryModal.draft, coverImage: img.url } })}
                          style={{
                            position: 'relative',
                            height: 60,
                            borderRadius: 6,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: isSelected ? `2px solid ${categoryModal.draft.color || 'var(--rail)'}` : '1px solid var(--line)',
                            opacity: isSelected ? 1 : 0.85,
                          }}
                          title={img.label}
                        >
                          <img src={img.url} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {isSelected && (
                            <div style={{ position: 'absolute', top: 2, right: 2, background: categoryModal.draft.color || 'var(--rail)', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                              <i className="ti ti-check" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {categoryModal.imageTab === 'URL' && (
                  <input
                    className="field-input"
                    placeholder="https://images.unsplash.com/..."
                    value={categoryModal.draft.coverImage}
                    onChange={(e) => setCategoryModal({ ...categoryModal, draft: { ...categoryModal.draft, coverImage: e.target.value } })}
                  />
                )}

                {categoryModal.imageTab === 'UPLOAD' && (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed var(--line-strong)',
                        borderRadius: 8,
                        padding: '16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: 'var(--paper-sunken)',
                      }}
                    >
                      <i className="ti ti-cloud-upload" style={{ fontSize: 24, color: 'var(--rail)', marginBottom: 4, display: 'block' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Bấm để chọn file ảnh từ máy tính</span>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Hỗ trợ JPG, PNG, WebP</div>
                    </div>
                  </div>
                )}
              </div>

              {modalError && (
                <div style={{ fontSize: 12.5, color: 'var(--rust)', fontWeight: 600 }}>
                  <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
                  {modalError}
                </div>
              )}
            </div>

            {/* Right Column: Live Preview Card */}
            <div>
              <label className="field-label" style={{ fontWeight: 700, marginBottom: 6, color: 'var(--ink-soft)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.04em' }}>
                <i className="ti ti-eye" style={{ marginRight: 4 }} />
                Xem Trước (Live Preview)
              </label>

              <div
                className="card"
                style={{
                  overflow: 'hidden',
                  borderRadius: 12,
                  border: '1px solid var(--line)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  background: 'var(--paper)',
                }}
              >
                {/* Preview Image */}
                <div style={{ position: 'relative', height: 130, background: 'var(--paper-sunken)', overflow: 'hidden' }}>
                  <img
                    src={categoryModal.draft.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)' }} />

                  {/* Status Badge */}
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <span style={{ background: 'rgba(16, 185, 129, 0.9)', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                      Mẫu Thẻ
                    </span>
                  </div>

                  {/* Avatar Icon */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: 12,
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: categoryModal.draft.color || '#3b82f6',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                      border: '2px solid #fff',
                    }}
                  >
                    <i className={`ti ${categoryModal.draft.icon || 'ti-folder'}`} />
                  </div>

                  {/* Code */}
                  {categoryModal.draft.code && (
                    <div style={{ position: 'absolute', bottom: 12, left: 60 }}>
                      <span
                        style={{
                          background: 'rgba(0,0,0,0.65)',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      >
                        {categoryModal.draft.code}
                      </span>
                    </div>
                  )}
                </div>

                {/* Preview Content */}
                <div style={{ padding: '14px 14px 10px 14px' }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', marginBottom: 6, minHeight: 20 }}>
                    {categoryModal.draft.name || 'Tên Danh Mục...'}
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12, minHeight: 34, lineHeight: 1.4 }}>
                    {categoryModal.draft.description || 'Mô tả tóm tắt mục tiêu và phạm vi đào tạo của danh mục sẽ hiển thị tại đây.'}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 6,
                      background: 'var(--paper-sunken)',
                      padding: '8px 10px',
                      borderRadius: 8,
                      fontSize: 11.5,
                    }}
                  >
                    <div style={{ color: 'var(--ink-soft)' }}><i className="ti ti-books" style={{ color: 'var(--rail)' }} /> Khóa học: <strong>0</strong></div>
                    <div style={{ color: 'var(--ink-soft)' }}><i className="ti ti-certificate" style={{ color: 'var(--sage)' }} /> Giáo trình: <strong>0</strong></div>
                    <div style={{ color: 'var(--ink-soft)' }}><i className="ti ti-writing" style={{ color: 'var(--amber)' }} /> Assessment: <strong>0</strong></div>
                    <div style={{ color: 'var(--ink-soft)' }}><i className="ti ti-folders" style={{ color: '#06b6d4' }} /> Library: <strong>0</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
