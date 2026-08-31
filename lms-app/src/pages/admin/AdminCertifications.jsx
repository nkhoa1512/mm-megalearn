import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { Button, Badge, Modal } from '../../features/common/ui';
import { normalizeRole, ROLE_HOME } from '../../data/roles';

export function emptyCertificateTemplateDraft(defaultCat = 'Food Safety & Hygiene') {
  return {
    id: `CERTTPL-${Date.now()}`,
    name: '',
    description: '',
    category: defaultCat,
    signerName: '',
    signerTitle: '',
    issuerOrg: 'MM Mega Market Vietnam',
    attachedFile: null,
  };
}

function coursesUsing(courses, templateId) {
  return courses.filter((c) => c.configuration?.certificateTemplateId === templateId);
}

function curriculaUsing(curricula, templateId) {
  return curricula.filter((cur) => cur.certificateTemplateId === templateId);
}

export default function AdminCertifications() {
  const {
    certificateTemplates, addCertificateTemplate, updateCertificateTemplate, deleteCertificateTemplate,
    companyCategories, courses, curricula, language, currentUser,
  } = useCourseStore();

  const role = normalizeRole(currentUser?.role);
  const isSystemAdminRole = role === 'useradmin' || role === 'sysadmin';

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingTemplateId, setViewingTemplateId] = useState(null);

  const filteredTemplates = certificateTemplates.filter((t) => categoryFilter === 'ALL' || t.category === categoryFilter);
  const viewingTemplate = certificateTemplates.find((t) => t.id === viewingTemplateId) || null;

  if (!isSystemAdminRole) {
    return <Navigate to={ROLE_HOME[role] || '/learner'} replace />;
  }

  function saveTemplate(draft) {
    const exists = certificateTemplates.some((t) => t.id === draft.id);
    const now = new Date().toISOString().slice(0, 10);
    if (exists) {
      updateCertificateTemplate(draft.id, { ...draft, updatedAt: now });
    } else {
      addCertificateTemplate({ ...draft, createdAt: now, updatedAt: now });
    }
    setEditingTemplate(null);
  }

  function handleDelete(t) {
    const usedByCourses = coursesUsing(courses, t.id);
    const usedByCurricula = curriculaUsing(curricula, t.id);
    if (usedByCourses.length + usedByCurricula.length > 0) {
      window.alert(
        `Không thể xóa mẫu "${t.name}" vì đang được dùng ở ${usedByCourses.length} khóa học & ${usedByCurricula.length} giáo trình. ` +
        `Hãy gỡ mẫu này khỏi các khóa học/giáo trình đó trước.`
      );
      return;
    }
    if (window.confirm(`Xóa mẫu chứng chỉ "${t.name}"? Không thể hoàn tác.`)) {
      deleteCertificateTemplate(t.id);
    }
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{language === 'en' ? 'Manage Certification' : 'Quản Lý Chứng Chỉ'}</h1>
            <Badge tone="sage">{certificateTemplates.length} {language === 'en' ? 'Templates' : 'Mẫu Chứng Chỉ'}</Badge>
          </div>
          <p>
            {language === 'en'
              ? 'Manage the certificate template library. Courses and Curricula pick from these templates when certificates are enabled — the completion date always auto-matches each learner.'
              : 'Quản lý thư viện mẫu chứng chỉ. Course và Curriculum sẽ chọn từ các mẫu này khi bật cấp chứng chỉ — ngày cấp luôn tự động khớp ngày hoàn thành của từng học viên.'}
          </p>
        </div>
        <Button variant="primary" icon="ti-plus" onClick={() => setEditingTemplate(emptyCertificateTemplateDraft(companyCategories[0]))}>
          Tạo Mẫu Chứng Chỉ Mới
        </Button>
      </div>

      <div className="card card-pad" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Lọc theo Lĩnh Vực:</span>
        <select
          className="field-select"
          style={{ height: 34, fontSize: 12, width: 220 }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="ALL">Tất Cả Lĩnh Vực ({companyCategories.length})</option>
          {companyCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-3" style={{ gap: 14 }}>
        {filteredTemplates.map((t) => {
          const usedByCourses = coursesUsing(courses, t.id);
          const usedByCurricula = curriculaUsing(curricula, t.id);
          return (
            <div key={t.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{t.name || 'Mẫu chưa đặt tên'}</div>
                  <Badge tone="slate" size="sm">{t.category}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10, minHeight: 34 }}>{t.description}</div>
                {t.attachedFile && (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="ti ti-paperclip" /> {t.attachedFile.name} {t.attachedFile.sizeLabel ? `(${t.attachedFile.sizeLabel})` : ''}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>{usedByCourses.length} khóa học</span>
                  <span>&middot;</span>
                  <span>{usedByCurricula.length} giáo trình</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setViewingTemplateId(t.id)}>Chi Tiết</Button>
                <Button size="sm" icon="ti-pencil" onClick={() => setEditingTemplate(t)}>Sửa</Button>
                <Button size="sm" variant="danger" icon="ti-trash" onClick={() => handleDelete(t)}>Xóa</Button>
              </div>
            </div>
          );
        })}
        {filteredTemplates.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <i className="ti ti-certificate" aria-hidden="true" />
            <p>Chưa có mẫu chứng chỉ nào{categoryFilter !== 'ALL' ? ' trong lĩnh vực này' : ''}. Bấm "Tạo Mẫu Chứng Chỉ Mới" để bắt đầu.</p>
          </div>
        )}
      </div>

      {viewingTemplate && (
        <CertificateTemplateDetailModal
          template={viewingTemplate}
          coursesUsingIt={coursesUsing(courses, viewingTemplate.id)}
          curriculaUsingIt={curriculaUsing(curricula, viewingTemplate.id)}
          onClose={() => setViewingTemplateId(null)}
          onEdit={(t) => { setViewingTemplateId(null); setEditingTemplate(t); }}
        />
      )}

      {editingTemplate && (
        <CertificateTemplateEditorModal
          draft={editingTemplate}
          companyCategories={companyCategories}
          onCancel={() => setEditingTemplate(null)}
          onSave={saveTemplate}
        />
      )}
    </>
  );
}

function CertificateTemplateDetailModal({ template, coursesUsingIt, curriculaUsingIt, onClose, onEdit }) {
  return (
    <Modal
      isOpen
      title={template.name}
      subtitle={`${template.category} — ${coursesUsingIt.length} khóa học · ${curriculaUsingIt.length} giáo trình`}
      onClose={onClose}
      size="lg"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
          <Button size="sm" variant="outline" icon="ti-pencil" onClick={() => onEdit(template)}>Sửa Mẫu</Button>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
        </div>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{template.description || 'Chưa có mô tả.'}</div>

        <div className="grid grid-2" style={{ gap: 10, background: 'var(--paper-sunken)', padding: 12, borderRadius: 8, fontSize: 12.5 }}>
          <div><strong>Người ký:</strong> {template.signerName || '—'}</div>
          <div><strong>Chức danh:</strong> {template.signerTitle || '—'}</div>
          <div><strong>Đơn vị cấp:</strong> {template.issuerOrg || '—'}</div>
          <div>
            <strong>File đính kèm:</strong>{' '}
            {template.attachedFile ? `${template.attachedFile.name} (${template.attachedFile.sizeLabel || 'n/a'})` : 'Không có'}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            <i className="ti ti-stack-2" style={{ marginRight: 6, color: 'var(--rail)' }} />
            Đang Dùng Cho Course ({coursesUsingIt.length})
          </div>
          {coursesUsingIt.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Chưa gắn cho khóa học nào.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {coursesUsingIt.map((c) => (
                <div key={c.id} style={{ fontSize: 12.5, padding: '5px 8px', background: 'var(--paper-sunken)', borderRadius: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', marginRight: 6 }}>{c.code}</span>
                  {c.title}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            <i className="ti ti-books" style={{ marginRight: 6, color: 'var(--rail)' }} />
            Đang Dùng Cho Curriculum ({curriculaUsingIt.length})
          </div>
          {curriculaUsingIt.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Chưa gắn cho giáo trình nào.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {curriculaUsingIt.map((cur) => (
                <div key={cur.id} style={{ fontSize: 12.5, padding: '5px 8px', background: 'var(--paper-sunken)', borderRadius: 6 }}>
                  {cur.title}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function CertificateTemplateEditorModal({ draft, companyCategories, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...draft }));

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeLabel = file.size < 1024 * 1024
      ? `${Math.max(1, Math.round(file.size / 1024))} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    setForm((f) => ({ ...f, attachedFile: { name: file.name, sizeLabel } }));
  }

  return (
    <Modal
      isOpen
      title={draft.name ? 'Chỉnh Sửa Mẫu Chứng Chỉ' : 'Tạo Mẫu Chứng Chỉ Mới'}
      subtitle="File đính kèm chỉ lưu làm tham chiếu (tên & dung lượng) — nội dung chứng chỉ thật hiển thị theo layout chuẩn với thông tin bên dưới."
      onClose={onCancel}
      size="md"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onCancel}>Hủy</Button>
          <Button variant="primary" icon="ti-check" disabled={!form.name.trim()} onClick={() => onSave(form)}>
            Lưu Mẫu Chứng Chỉ
          </Button>
        </div>
      )}
    >
      <div className="grid grid-2" style={{ gap: 14, marginBottom: 12 }}>
        <div>
          <label className="field-label">Tên Mẫu <span style={{ color: 'var(--rust)' }}>*</span></label>
          <input
            className="field-input"
            placeholder="VD: Chứng Chỉ Chuẩn ATVSTP"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="field-label">Lĩnh Vực (Category)</label>
          <select
            className="field-select"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {companyCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="field-label">Mô tả</label>
        <textarea
          className="field-input"
          rows={2}
          style={{ resize: 'vertical' }}
          placeholder="Mục đích & phạm vi sử dụng của mẫu chứng chỉ này..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="grid grid-2" style={{ gap: 14, marginBottom: 12 }}>
        <div>
          <label className="field-label">Người Ký Duyệt</label>
          <input
            className="field-input"
            placeholder="VD: Nguyễn Văn A"
            value={form.signerName}
            onChange={(e) => setForm({ ...form, signerName: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label">Chức Danh Người Ký</label>
          <input
            className="field-input"
            placeholder="VD: Head of Learning & Org Development"
            value={form.signerTitle}
            onChange={(e) => setForm({ ...form, signerTitle: e.target.value })}
          />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="field-label">Đơn Vị Cấp Chứng Chỉ</label>
        <input
          className="field-input"
          value={form.issuerOrg}
          onChange={(e) => setForm({ ...form, issuerOrg: e.target.value })}
        />
      </div>

      <div>
        <label className="field-label">File Định Dạng Chứng Chỉ (tùy chọn)</label>
        <input type="file" className="field-input" onChange={handleFileChange} />
        {form.attachedFile && (
          <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-paperclip" /> {form.attachedFile.name} ({form.attachedFile.sizeLabel})
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, attachedFile: null }))}
              style={{ background: 'transparent', border: 'none', color: 'var(--rust)', cursor: 'pointer' }}
              title="Gỡ file"
            >
              <i className="ti ti-x" />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
