import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { Button, Badge, Modal } from '../../features/common/ui';
import { normalizeRole, ROLE_HOME } from '../../data/roles';

// Đếm số Course/Curriculum/Assessment/Library-domain đang giữ đúng tên
// category này — dùng để chặn xóa khi đang được tham chiếu, và để hiển thị
// cho admin biết trước khi thao tác (đổi tên/xóa) sẽ ảnh hưởng bao nhiêu nơi.
function usageOf(category, { courses, curricula, assessments, libraries }) {
  const courseCount = (courses || []).filter((c) => c.category === category || (c.categories || []).includes(category)).length;
  const curriculumCount = (curricula || []).filter((cur) => cur.category === category).length;
  const assessmentCount = (assessments || []).filter((a) => a.category === category || (a.categories || []).includes(category)).length;
  const libraryDomainCount = (libraries || []).reduce((sum, lib) => sum + (lib.domains || []).filter((d) => d.category === category).length, 0);
  return {
    courseCount,
    curriculumCount,
    assessmentCount,
    libraryDomainCount,
    total: courseCount + curriculumCount + assessmentCount + libraryDomainCount,
  };
}

export default function AdminCategoryManager() {
  const {
    companyCategories, addCompanyCategory, renameCompanyCategory, deleteCompanyCategory,
    courses, curricula, assessments, libraries, language, currentUser,
  } = useCourseStore();

  const role = normalizeRole(currentUser?.role);
  const isSystemAdminRole = role === 'useradmin' || role === 'sysadmin';

  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingCategory, setRenamingCategory] = useState(null); // { oldName, value } | null
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'GRID'

  const ctx = { courses, curricula, assessments, libraries };

  function showToast(text, type = 'success') {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  }

  if (!isSystemAdminRole) {
    return <Navigate to={ROLE_HOME[role] || '/learner'} replace />;
  }

  function handleAdd(e) {
    if (e) e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) {
      setError('Vui lòng nhập tên danh mục.');
      return;
    }
    const result = addCompanyCategory(clean);
    if (result && !result.ok) {
      setError(result.reason || `Danh mục "${clean}" đã tồn tại.`);
      return;
    }
    setNewCategoryName('');
    setError('');
    showToast(`Đã thêm danh mục mới "${clean}" thành công!`);
  }

  function handleRenameSave() {
    const clean = renamingCategory.value.trim();
    if (!clean) return;
    if (clean !== renamingCategory.oldName && companyCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setError(`Danh mục "${clean}" đã tồn tại.`);
      return;
    }
    renameCompanyCategory(renamingCategory.oldName, clean);
    showToast(`Đã đổi tên danh mục thành "${clean}" thành công!`);
    setRenamingCategory(null);
    setError('');
  }

  function handleDelete(cat) {
    const usage = usageOf(cat, ctx);
    if (usage.total > 0) {
      window.alert(
        `Không thể xóa "${cat}" vì đang được dùng ở ${usage.total} nơi:\n` +
        `- ${usage.courseCount} khóa học\n- ${usage.curriculumCount} giáo trình\n` +
        `- ${usage.assessmentCount} assessment\n- ${usage.libraryDomainCount} lĩnh vực trong Library`
      );
      return;
    }
    if (window.confirm(`Xóa danh mục "${cat}"? Không thể hoàn tác.`)) {
      deleteCompanyCategory(cat);
      showToast(`Đã xóa danh mục "${cat}" thành công!`);
    }
  }

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return companyCategories;
    const q = search.toLowerCase();
    return companyCategories.filter((cat) => cat.toLowerCase().includes(q));
  }, [companyCategories, search]);

  // Usage summary statistics
  const stats = useMemo(() => {
    let inUseCount = 0;
    let unusedCount = 0;
    companyCategories.forEach((cat) => {
      const u = usageOf(cat, ctx);
      if (u.total > 0) inUseCount++;
      else unusedCount++;
    });
    return { total: companyCategories.length, inUseCount, unusedCount };
  }, [companyCategories, ctx]);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{language === 'en' ? 'Manage Category' : 'Quản Lý Danh Mục'}</h1>
            <Badge tone="sage">{companyCategories.length} {language === 'en' ? 'Categories' : 'Danh Mục'}</Badge>
          </div>
          <p>
            {language === 'en'
              ? 'Manage the standard Category taxonomy used across Courses, Curricula, Assessments, and Library domains.'
              : 'Quản lý danh sách chuẩn Lĩnh Vực (Category) dùng chung cho Khóa học, Giáo trình, Assessment và các Lĩnh Vực trong Library.'}
          </p>
        </div>
      </div>

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
          }}
        >
          <i className={`ti ${toastMessage.type === 'success' ? 'ti-circle-check' : 'ti-alert-circle'}`} style={{ fontSize: 18 }} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Stats Overview */}
      <div className="grid grid-3" style={{ gap: 14, marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-label">Tổng Danh Mục Chuẩn</div>
          <div className="stat-value" style={{ color: 'var(--rail)' }}>{stats.total}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Đang Được Sử Dụng</div>
          <div className="stat-value" style={{ color: 'var(--sage)' }}>{stats.inUseCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Chưa Gán Khóa / Nội Dung</div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>{stats.unusedCount}</div>
        </div>
      </div>

      {/* Add New Category Card */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <form style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }} onSubmit={handleAdd}>
          <div style={{ flex: '1 1 300px' }}>
            <label className="field-label" style={{ fontWeight: 700, marginBottom: 6 }}>
              <i className="ti ti-plus" style={{ marginRight: 4, color: 'var(--rail)' }} />
              Thêm Danh Mục Mới
            </label>
            <input
              className="field-input"
              placeholder="VD: Trí Tuệ Nhân Tạo AI, Digital Marketing..."
              value={newCategoryName}
              onChange={(e) => { setNewCategoryName(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(e); }}
            />
          </div>
          <Button type="submit" variant="primary" icon="ti-plus" onClick={handleAdd}>
            Thêm Danh Mục
          </Button>
        </form>
        {error && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--rust)', fontWeight: 600 }}>{error}</div>}
      </div>

      {/* Toolbar: Search + View Mode Switcher */}
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)', fontSize: 14 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 32, height: 34, fontSize: 12.5, width: '100%' }}
              placeholder="Tìm kiếm danh mục..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <Button size="sm" variant="ghost" icon="ti-x" onClick={() => setSearch('')}>
              Xóa tìm kiếm
            </Button>
          )}
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            Hiển thị <strong>{filteredCategories.length}</strong> / {companyCategories.length} danh mục
          </div>
        </div>

        {/* View Mode Toggle: Grid vs List */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--paper-sunken)', padding: 3, borderRadius: 6, border: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={`btn btn-sm ${viewMode === 'TABLE' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            title="Dạng Bảng (List View)"
          >
            <i className="ti ti-list" />
            <span>Bảng</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('GRID')}
            className={`btn btn-sm ${viewMode === 'GRID' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            title="Dạng Lưới (Grid View)"
          >
            <i className="ti ti-layout-grid" />
            <span>Lưới</span>
          </button>
        </div>
      </div>

      {/* View Mode: List View (Table) */}
      {viewMode === 'TABLE' ? (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Tên Danh Mục</th>
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
                const usage = usageOf(cat, ctx);
                return (
                  <tr key={cat}>
                    <td style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: usage.total > 0 ? 'var(--sage)' : 'var(--ink-faint)' }} />
                        <span>{cat}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 600, color: usage.courseCount > 0 ? 'var(--ink)' : 'var(--ink-faint)' }}>
                        {usage.courseCount}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 600, color: usage.curriculumCount > 0 ? 'var(--ink)' : 'var(--ink-faint)' }}>
                        {usage.curriculumCount}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 600, color: usage.assessmentCount > 0 ? 'var(--ink)' : 'var(--ink-faint)' }}>
                        {usage.assessmentCount}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 600, color: usage.libraryDomainCount > 0 ? 'var(--ink)' : 'var(--ink-faint)' }}>
                        {usage.libraryDomainCount}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge tone={usage.total > 0 ? 'sage' : 'slate'} size="sm">
                        {usage.total > 0 ? `${usage.total} liên kết` : 'Trống'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <Button size="sm" variant="outline" icon="ti-edit" onClick={() => setRenamingCategory({ oldName: cat, value: cat })}>
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
      ) : (
        /* View Mode: Grid View (Cards) */
        <div className="grid grid-3" style={{ gap: 14 }}>
          {filteredCategories.map((cat) => {
            const usage = usageOf(cat, ctx);
            return (
              <div
                key={cat}
                className="card card-pad card-interactive"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', lineHeight: 1.3 }}>
                      {cat}
                    </div>
                    <Badge tone={usage.total > 0 ? 'sage' : 'slate'} size="sm">
                      {usage.total > 0 ? `${usage.total} liên kết` : 'Chưa dùng'}
                    </Badge>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 8,
                      background: 'var(--paper-sunken)',
                      padding: '10px 12px',
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 11.5,
                    }}
                  >
                    <div style={{ color: 'var(--ink-soft)' }}>
                      <i className="ti ti-books" style={{ marginRight: 4, color: 'var(--rail)' }} />
                      Khóa học: <strong style={{ color: 'var(--ink)' }}>{usage.courseCount}</strong>
                    </div>
                    <div style={{ color: 'var(--ink-soft)' }}>
                      <i className="ti ti-certificate" style={{ marginRight: 4, color: 'var(--sage)' }} />
                      Giáo trình: <strong style={{ color: 'var(--ink)' }}>{usage.curriculumCount}</strong>
                    </div>
                    <div style={{ color: 'var(--ink-soft)' }}>
                      <i className="ti ti-writing" style={{ marginRight: 4, color: 'var(--amber)' }} />
                      Assessment: <strong style={{ color: 'var(--ink)' }}>{usage.assessmentCount}</strong>
                    </div>
                    <div style={{ color: 'var(--ink-soft)' }}>
                      <i className="ti ti-folders" style={{ marginRight: 4, color: 'var(--blue)' }} />
                      Library: <strong style={{ color: 'var(--ink)' }}>{usage.libraryDomainCount}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  <Button size="sm" variant="outline" icon="ti-edit" onClick={() => setRenamingCategory({ oldName: cat, value: cat })}>
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
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '36px 16px' }}>
              <i className="ti ti-category" aria-hidden="true" />
              <p>Không tìm thấy danh mục nào phù hợp với "{search}".</p>
            </div>
          )}
        </div>
      )}

      {/* Rename Category Modal */}
      {renamingCategory && (
        <Modal
          isOpen
          title={`Đổi Tên Danh Mục "${renamingCategory.oldName}"`}
          subtitle="Tên mới sẽ tự động cập nhật ở mọi Khóa học, Giáo trình, Assessment và Library đang dùng danh mục này."
          onClose={() => setRenamingCategory(null)}
          size="sm"
          footer={(
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" onClick={() => setRenamingCategory(null)}>Hủy</Button>
              <Button variant="primary" icon="ti-check" disabled={!renamingCategory.value.trim()} onClick={handleRenameSave}>Lưu</Button>
            </div>
          )}
        >
          <label className="field-label">Tên Danh Mục Mới</label>
          <input
            className="field-input"
            value={renamingCategory.value}
            onChange={(e) => { setRenamingCategory({ ...renamingCategory, value: e.target.value }); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSave(); }}
            autoFocus
          />
          {error && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--rust)' }}>{error}</div>}
        </Modal>
      )}
    </>
  );
}
