import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { Button, Badge, Modal } from '../../features/common/ui';
import { normalizeRole, ROLE_HOME } from '../../data/roles';

// Đếm số Course/Curriculum/Assessment/Library-domain đang giữ đúng tên
// category này — dùng để chặn xóa khi đang được tham chiếu, và để hiển thị
// cho admin biết trước khi thao tác (đổi tên/xóa) sẽ ảnh hưởng bao nhiêu nơi.
function usageOf(category, { courses, curricula, assessments, libraries }) {
  const courseCount = courses.filter((c) => c.category === category || (c.categories || []).includes(category)).length;
  const curriculumCount = curricula.filter((cur) => cur.category === category).length;
  const assessmentCount = assessments.filter((a) => a.category === category || (a.categories || []).includes(category)).length;
  const libraryDomainCount = libraries.reduce((sum, lib) => sum + (lib.domains || []).filter((d) => d.category === category).length, 0);
  return {
    courseCount, curriculumCount, assessmentCount, libraryDomainCount,
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

  const ctx = { courses, curricula, assessments, libraries };

  if (!isSystemAdminRole) {
    return <Navigate to={ROLE_HOME[role] || '/learner'} replace />;
  }

  function handleAdd(e) {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;
    if (companyCategories.includes(clean)) {
      setError(`Danh mục "${clean}" đã tồn tại.`);
      return;
    }
    addCompanyCategory(clean);
    setNewCategoryName('');
    setError('');
  }

  function handleRenameSave() {
    const clean = renamingCategory.value.trim();
    if (!clean) return;
    if (clean !== renamingCategory.oldName && companyCategories.includes(clean)) {
      setError(`Danh mục "${clean}" đã tồn tại.`);
      return;
    }
    renameCompanyCategory(renamingCategory.oldName, clean);
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
    }
  }

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

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <form style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }} onSubmit={handleAdd}>
          <div style={{ flex: '1 1 260px' }}>
            <label className="field-label">Thêm Danh Mục Mới</label>
            <input
              className="field-input"
              placeholder="VD: Digital Marketing"
              value={newCategoryName}
              onChange={(e) => { setNewCategoryName(e.target.value); setError(''); }}
            />
          </div>
          <Button type="submit" variant="primary" icon="ti-plus">Thêm Danh Mục</Button>
        </form>
        {error && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--rust)' }}>{error}</div>}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Tên Danh Mục</th>
              <th style={{ width: 100 }}>Khóa Học</th>
              <th style={{ width: 100 }}>Giáo Trình</th>
              <th style={{ width: 100 }}>Assessment</th>
              <th style={{ width: 110 }}>Library</th>
              <th style={{ width: 150, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companyCategories.map((cat) => {
              const usage = usageOf(cat, ctx);
              return (
                <tr key={cat}>
                  <td style={{ fontWeight: 700, fontSize: 13 }}>{cat}</td>
                  <td>{usage.courseCount}</td>
                  <td>{usage.curriculumCount}</td>
                  <td>{usage.assessmentCount}</td>
                  <td>{usage.libraryDomainCount}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <Button size="sm" variant="outline" icon="ti-edit" onClick={() => setRenamingCategory({ oldName: cat, value: cat })}>Sửa</Button>
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
          </tbody>
        </table>
      </div>

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
            autoFocus
          />
          {error && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--rust)' }}>{error}</div>}
        </Modal>
      )}
    </>
  );
}
