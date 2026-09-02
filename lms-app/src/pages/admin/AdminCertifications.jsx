import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { Button, Badge, Modal, CertificateModal } from '../../features/common/ui';
import { normalizeRole, ROLE_HOME } from '../../data/roles';

export function emptyCertificateTemplateDraft(defaultCat = 'Food Safety & Hygiene') {
  return {
    id: `CERTTPL-${Date.now()}`,
    name: '',
    nameEn: '',
    description: '',
    category: defaultCat,
    signerName: '',
    signerTitle: '',
    issuerOrg: 'MM Mega Market Vietnam',
    validityDefaultMonths: 12,
    warningDaysDefault: 30,
    recertificationMethodDefault: 'RETAKE_FULL_COURSE',
    attachedFile: null,
  };
}

function coursesUsing(courses, templateId) {
  return courses.filter((c) => c.configuration?.certificateTemplateId === templateId);
}

function curriculaUsing(curricula, templateId) {
  return curricula.filter((cur) => cur.certificateTemplateId === templateId);
}

const CERT_GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'No grouping' },
  { id: 'CATEGORY', label: 'By Area' },
  { id: 'VALIDITY', label: 'By Validity Period' },
  { id: 'SIGNER', label: 'By Approving Signatory' },
];

export default function AdminCertifications() {
  const {
    certificateTemplates, addCertificateTemplate, updateCertificateTemplate, deleteCertificateTemplate,
    companyCategories, courses, curricula, language, currentUser,
  } = useCourseStore();

  const role = normalizeRole(currentUser?.role);
  const isSystemAdminRole = role === 'useradmin' || role === 'sysadmin';

  // Filter & View States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedValidity, setSelectedValidity] = useState('ALL');
  const [selectedSigner, setSelectedSigner] = useState('ALL');
  const [selectedUsage, setSelectedUsage] = useState('ALL');
  const [groupBy, setGroupBy] = useState('NONE');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' | 'TABLE'

  // Modals
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingTemplateId, setViewingTemplateId] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Dynamic Signers list
  const allSigners = useMemo(() => {
    const set = new Set();
    certificateTemplates.forEach((t) => {
      if (t.signerName && t.signerName.trim()) set.add(t.signerName.trim());
    });
    return Array.from(set);
  }, [certificateTemplates]);

  // Active filters count
  const activeFiltersCount = (
    (selectedCategory !== 'ALL' ? 1 : 0) +
    (selectedValidity !== 'ALL' ? 1 : 0) +
    (selectedSigner !== 'ALL' ? 1 : 0) +
    (selectedUsage !== 'ALL' ? 1 : 0)
  );

  function resetAllFilters() {
    setSelectedCategory('ALL');
    setSelectedValidity('ALL');
    setSelectedSigner('ALL');
    setSelectedUsage('ALL');
    setSearch('');
  }

  // Filtering
  const filteredTemplates = useMemo(() => {
    return certificateTemplates.filter((t) => {
      // Category filter
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;

      // Validity filter
      if (selectedValidity !== 'ALL') {
        const val = t.validityDefaultMonths ?? 12;
        if (selectedValidity === 'LIFETIME' && val !== 0) return false;
        if (selectedValidity !== 'LIFETIME' && String(val) !== String(selectedValidity)) return false;
      }

      // Signer filter
      if (selectedSigner !== 'ALL' && t.signerName !== selectedSigner) return false;

      // Usage filter
      if (selectedUsage !== 'ALL') {
        const cCount = coursesUsing(courses, t.id).length;
        const curCount = curriculaUsing(curricula, t.id).length;
        const total = cCount + curCount;
        if (selectedUsage === 'USED' && total === 0) return false;
        if (selectedUsage === 'UNUSED' && total > 0) return false;
      }

      // Search query
      const q = search.toLowerCase().trim();
      if (q) {
        const matchName = t.name && t.name.toLowerCase().includes(q);
        const matchNameEn = t.nameEn && t.nameEn.toLowerCase().includes(q);
        const matchCat = t.category && t.category.toLowerCase().includes(q);
        const matchSigner = t.signerName && t.signerName.toLowerCase().includes(q);
        const matchDesc = t.description && t.description.toLowerCase().includes(q);
        const matchId = t.id && t.id.toLowerCase().includes(q);
        if (!matchName && !matchNameEn && !matchCat && !matchSigner && !matchDesc && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [certificateTemplates, selectedCategory, selectedValidity, selectedSigner, selectedUsage, search, courses, curricula]);

  // Grouping logic
  const groupedData = useMemo(() => {
    if (groupBy === 'NONE') return null;

    const map = {};
    filteredTemplates.forEach((t) => {
      let groupKey = 'Other';
      if (groupBy === 'CATEGORY') {
        groupKey = t.category || 'Uncategorized';
      } else if (groupBy === 'VALIDITY') {
        const months = t.validityDefaultMonths ?? 12;
        groupKey = months === 0 ? 'Lifetime' : `Valid for ${months} months`;
      } else if (groupBy === 'SIGNER') {
        groupKey = t.signerName ? `Signed by: ${t.signerName}` : 'No signatory assigned';
      }

      if (!map[groupKey]) {
        map[groupKey] = [];
      }
      map[groupKey].push(t);
    });

    return Object.entries(map).map(([title, items]) => ({ title, items }));
  }, [filteredTemplates, groupBy]);

  const viewingTemplate = certificateTemplates.find((t) => t.id === viewingTemplateId) || null;

  // Stats
  const totalCoursesUsing = useMemo(() => {
    return courses.filter((c) => c.configuration?.certificateEnabled).length;
  }, [courses]);

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
        `Cannot delete the template "${t.name}" because it is used by ${usedByCourses.length} courses & ${usedByCurricula.length} curricula. ` +
        `Detach this template from those courses/curricula first.`
      );
      return;
    }
    if (window.confirm(`Delete the certificate template "${t.name}"? This cannot be undone.`)) {
      deleteCertificateTemplate(t.id);
    }
  }

  function openPreview(t) {
    setPreviewTemplate({
      id: `CERT-MMVN-PREVIEW-${t.id.replace('CERTTPL-', '')}`,
      courseName: 'MM Mega Market Professional Operations Training Course',
      courseCode: 'MMVN-SAMPLE-001',
      issueDate: new Date().toISOString().slice(0, 10),
      validUntil: t.validityDefaultMonths === 0 ? null : new Date(new Date().setFullYear(new Date().getFullYear() + (t.validityDefaultMonths / 12 || 1))).toISOString().slice(0, 10),
      isLifetime: t.validityDefaultMonths === 0,
      score: 95,
      recipientName: currentUser?.fullName || 'Nguyễn Văn Học Viên',
      recipientPosition: currentUser?.position || 'Executive / Supervisor',
      department: 'MM Mega Market An Phu / Operations & Fresh Food Division',
      template: t,
    });
  }

  function renderCard(t) {
    const usedByCourses = coursesUsing(courses, t.id);
    const usedByCurricula = curriculaUsing(curricula, t.id);
    const isLifetime = t.validityDefaultMonths === 0;

    return (
      <div
        key={t.id}
        className="card card-pad"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid var(--line)',
          borderRadius: 10,
          background: 'var(--paper-raised)',
          transition: 'box-shadow 0.2s',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', lineHeight: 1.3 }}>
              {t.name || 'Untitled template'}
            </div>
            <Badge tone={isLifetime ? 'purple' : 'blue'} size="sm">
              {isLifetime ? 'Lifetime' : `${t.validityDefaultMonths || 12}T`}
            </Badge>
          </div>

          <div style={{ fontSize: 12, color: 'var(--blue, #005BAA)', fontWeight: 700, marginBottom: 6 }}>
            <i className="ti ti-folder" style={{ marginRight: 4 }} />
            {t.category}
          </div>

          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12, minHeight: 38, lineHeight: 1.4 }}>
            {t.description}
          </div>

          <div style={{ background: 'var(--paper-sunken)', padding: '8px 10px', borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
            <div><strong>Signed by:</strong> {t.signerName || 'Bruno Jousselin'} ({t.signerTitle || 'Managing Director'})</div>
            <div><strong>Issuing organization:</strong> {t.issuerOrg || 'MM Mega Market Vietnam'}</div>
          </div>

          {t.attachedFile && (
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-paperclip" /> {t.attachedFile.name} {t.attachedFile.sizeLabel ? `(${t.attachedFile.sizeLabel})` : ''}
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ color: '#16A34A', fontWeight: 700 }}>{usedByCourses.length} courses</span>
            <span>&middot;</span>
            <span>{usedByCurricula.length} curriculum</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 6 }}>
          <Button size="sm" variant="primary" icon="ti-eye" onClick={() => openPreview(t)}>View Template</Button>
          <Button size="sm" variant="outline" icon="ti-list-details" onClick={() => setViewingTemplateId(t.id)}>Details</Button>
          <Button size="sm" icon="ti-pencil" onClick={() => setEditingTemplate(t)}>Edit</Button>
          <Button size="sm" variant="danger" icon="ti-trash" onClick={() => handleDelete(t)}>Delete</Button>
        </div>
      </div>
    );
  }

  function renderTable(templatesList) {
    return (
      <div className="card" style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper-raised)' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Certificate Template Name</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Category</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Validity Period</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Signatory &amp; Job Title</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>In Use</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Template File</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templatesList.map((t) => {
              const usedByCourses = coursesUsing(courses, t.id);
              const usedByCurricula = curriculaUsing(curricula, t.id);
              const isLifetime = t.validityDefaultMonths === 0;

              return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{t.name}</div>
                    {t.nameEn && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.nameEn}</div>}
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'monospace', marginTop: 2 }}>{t.id}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <Badge tone="blue" size="sm">{t.category}</Badge>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <Badge tone={isLifetime ? 'purple' : 'slate'} size="sm">
                      {isLifetime ? 'Lifetime' : `${t.validityDefaultMonths || 12} Months`}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{t.signerName || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{t.signerTitle || '—'}</div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>{usedByCourses.length} courses</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{usedByCurricula.length} curriculum</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--ink-soft)' }}>
                    {t.attachedFile ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <i className="ti ti-paperclip" /> {t.attachedFile.name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-faint)' }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <Button size="sm" variant="primary" icon="ti-eye" onClick={() => openPreview(t)} title="View The Printed Template">View Template</Button>
                      <Button size="sm" variant="outline" icon="ti-list-details" onClick={() => setViewingTemplateId(t.id)} title="Details" />
                      <Button size="sm" icon="ti-pencil" onClick={() => setEditingTemplate(t)} title="Edit" />
                      <Button size="sm" variant="danger" icon="ti-trash" onClick={() => handleDelete(t)} title="Delete" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{language === 'en' ? 'Manage Certification & Credentials' : 'Certificate & Recertification Template Management'}</h1>
            <Badge tone="sage" icon="ti-certificate">{certificateTemplates.length} {language === 'en' ? 'Templates' : 'Templates'}</Badge>
          </div>
          <p>
            {language === 'en'
              ? 'Manage the enterprise digital certificate template library for MM Mega Market. Templates configure signers, accreditation seals, default validity periods, and recertification cycles.'
              : 'Manage the MM Mega Market digital certificate template library. Configure approving signatories, the official seal, validity (fixed term / lifetime) and the automatic recertification cycle.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" icon="ti-plus" onClick={() => setEditingTemplate(emptyCertificateTemplateDraft(companyCategories[0]))}>
            Create A New Certificate Template
          </Button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="card card-pad" style={{ background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Total Certificate Templates</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue, #005BAA)', marginTop: 2 }}>{certificateTemplates.length}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>Covering {companyCategories.length} training areas</div>
        </div>

        <div className="card card-pad" style={{ background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Courses Issuing This Certificate</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#16A34A', marginTop: 2 }}>{totalCoursesUsing}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>Includes a QR code and an automatic issue date</div>
        </div>

        <div className="card card-pad" style={{ background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Fixed-Term / Recurring Recertification Template</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#D97706', marginTop: 2 }}>
            {certificateTemplates.filter((t) => t.validityDefaultMonths !== 0).length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>6 - 36 month cycle (HACCP, Fire Safety, Occupational Safety)</div>
        </div>

        <div className="card card-pad" style={{ background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Lifetime Certificate Template</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#7C3AED', marginTop: 2 }}>
            {certificateTemplates.filter((t) => t.validityDefaultMonths === 0).length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>Soft skills, technology, onboarding</div>
        </div>
      </div>

      {/* STANDARDIZED FILTER TOOLBAR CARD */}
      <div className="card card-pad" style={{ marginBottom: 18, background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
        {/* ROW 1: SEARCH, GROUP BY, FILTER TOGGLE, VIEW MODE */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: 240 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
              placeholder={language === 'en' ? 'Search certificate by name, signer, code...' : 'Search templates by name, signatory, code...'}
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

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Group By Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Group by:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: groupBy !== 'NONE' ? 700 : 500,
                  color: groupBy !== 'NONE' ? 'var(--blue, #005BAA)' : 'var(--ink)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {CERT_GROUP_BY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-sm ${activeFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
              style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
            >
              <i className="ti ti-filter" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span style={{ background: 'var(--paper-raised)', color: 'var(--rail, #005BAA)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                  {activeFiltersCount}
                </span>
              )}
              <i className={`ti ${showFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
            </button>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`btn btn-sm ${viewMode === 'GRID' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                title="Grid View"
              >
                <i className="ti ti-layout-grid" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`btn btn-sm ${viewMode === 'TABLE' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                title="List View"
              >
                <i className="ti ti-list" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: COLLAPSIBLE FILTER PANEL WITH TOP LABELS */}
        {showFilters && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {/* Filter 1: Area */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Category
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: selectedCategory !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: selectedCategory !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: selectedCategory !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: selectedCategory !== 'ALL' ? 700 : 500,
                  }}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="ALL">All areas ({companyCategories.length})</option>
                  {companyCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Validity Period */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Validity Period
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: selectedValidity !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: selectedValidity !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: selectedValidity !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: selectedValidity !== 'ALL' ? 700 : 500,
                  }}
                  value={selectedValidity}
                  onChange={(e) => setSelectedValidity(e.target.value)}
                >
                  <option value="ALL">All validity periods</option>
                  <option value="LIFETIME">Lifetime</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                </select>
              </div>

              {/* Filter 3: Approving Signatory */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Approving Signatory
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: selectedSigner !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: selectedSigner !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: selectedSigner !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: selectedSigner !== 'ALL' ? 700 : 500,
                  }}
                  value={selectedSigner}
                  onChange={(e) => setSelectedSigner(e.target.value)}
                >
                  <option value="ALL">All signatories ({allSigners.length})</option>
                  {allSigners.map((signer) => (
                    <option key={signer} value={signer}>{signer}</option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Usage Status */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Usage Status
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 13,
                    borderRadius: 6,
                    background: selectedUsage !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                    borderColor: selectedUsage !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: selectedUsage !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                    fontWeight: selectedUsage !== 'ALL' ? 700 : 500,
                  }}
                  value={selectedUsage}
                  onChange={(e) => setSelectedUsage(e.target.value)}
                >
                  <option value="ALL">All statuses</option>
                  <option value="USED">In use by a course/curriculum</option>
                  <option value="UNUSED">Not attached</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE FILTER TAGS & RESET BAR */}
        {(search || activeFiltersCount > 0 || groupBy !== 'NONE') && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Filtering by:</span>

              {search && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Search term: <strong>"{search}"</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                </span>
              )}

              {selectedCategory !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Area: <strong>{selectedCategory}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSelectedCategory('ALL')} />
                </span>
              )}

              {selectedValidity !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Validity: <strong>{selectedValidity === 'LIFETIME' ? 'Lifetime' : `${selectedValidity} Months`}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSelectedValidity('ALL')} />
                </span>
              )}

              {selectedSigner !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Signed by: <strong>{selectedSigner}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSelectedSigner('ALL')} />
                </span>
              )}

              {selectedUsage !== 'ALL' && (
                <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Status: <strong>{selectedUsage === 'USED' ? 'In use' : 'Not attached'}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSelectedUsage('ALL')} />
                </span>
              )}

              {groupBy !== 'NONE' && (
                <span className="badge" style={{ background: 'var(--paper-sunken)', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Group by: <strong>{CERT_GROUP_BY_OPTIONS.find(o => o.id === groupBy)?.label}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setGroupBy('NONE')} />
                </span>
              )}

              <button
                type="button"
                onClick={resetAllFilters}
                style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
              >
                Clear all filters
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Found <strong>{filteredTemplates.length}</strong> / {certificateTemplates.length} templates
            </div>
          </div>
        )}
      </div>

      {/* RENDER CONTENT (GRID / TABLE with or without GROUP BY) */}
      {filteredTemplates.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--paper-raised)', padding: 40, borderRadius: 10, border: '1px solid var(--line)' }}>
          <i className="ti ti-certificate" aria-hidden="true" style={{ fontSize: 36, color: 'var(--ink-faint)' }} />
          <p style={{ marginTop: 10, color: 'var(--ink-soft)' }}>
            No certificate template matches the current filters.
          </p>
          <div style={{ marginTop: 14 }}>
            <Button size="sm" variant="outline" onClick={resetAllFilters}>Clear Filters</Button>
          </div>
        </div>
      ) : groupedData ? (
        // GROUPED VIEW
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groupedData.map(({ title, items }) => (
            <div key={title}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{title}</h3>
                <Badge tone="slate" size="sm">{items.length} templates</Badge>
              </div>

              {viewMode === 'GRID' ? (
                <div className="grid grid-3" style={{ gap: 16 }}>
                  {items.map((t) => renderCard(t))}
                </div>
              ) : (
                renderTable(items)
              )}
            </div>
          ))}
        </div>
      ) : (
        // FLAT LIST VIEW
        viewMode === 'GRID' ? (
          <div className="grid grid-3" style={{ gap: 16 }}>
            {filteredTemplates.map((t) => renderCard(t))}
          </div>
        ) : (
          renderTable(filteredTemplates)
        )
      )}

      {/* DETAIL MODAL */}
      {viewingTemplate && (
        <CertificateTemplateDetailModal
          template={viewingTemplate}
          coursesUsingIt={coursesUsing(courses, viewingTemplate.id)}
          curriculaUsingIt={curriculaUsing(curricula, viewingTemplate.id)}
          onClose={() => setViewingTemplateId(null)}
          onEdit={(t) => { setViewingTemplateId(null); setEditingTemplate(t); }}
          onPreview={(t) => openPreview(t)}
        />
      )}

      {/* EDITOR MODAL */}
      {editingTemplate && (
        <CertificateTemplateEditorModal
          draft={editingTemplate}
          companyCategories={companyCategories}
          onCancel={() => setEditingTemplate(null)}
          onSave={saveTemplate}
          onPreview={(t) => openPreview(t)}
        />
      )}

      {/* PREVIEW CERTIFICATE MODAL */}
      {previewTemplate && (
        <CertificateModal
          certificate={previewTemplate}
          isOpen={Boolean(previewTemplate)}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </>
  );
}

function CertificateTemplateDetailModal({ template, coursesUsingIt, curriculaUsingIt, onClose, onEdit, onPreview }) {
  return (
    <Modal
      isOpen
      title={template.name}
      subtitle={`${template.category} — ${coursesUsingIt.length} courses · ${curriculaUsingIt.length} curricula`}
      onClose={onClose}
      size="lg"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Button size="sm" variant="primary" icon="ti-eye" onClick={() => onPreview(template)}>
            Preview The Printed Certificate
          </Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="outline" icon="ti-pencil" onClick={() => onEdit(template)}>Edit Template</Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{template.description || 'No description.'}</div>

        <div className="grid grid-2" style={{ gap: 10, background: 'var(--paper-sunken)', padding: 14, borderRadius: 8, fontSize: 13 }}>
          <div><strong>Approving signatory:</strong> {template.signerName || '—'}</div>
          <div><strong>Job title:</strong> {template.signerTitle || '—'}</div>
          <div><strong>Issuing organization:</strong> {template.issuerOrg || '—'}</div>
          <div><strong>Default validity:</strong> {template.validityDefaultMonths === 0 ? 'Lifetime' : `${template.validityDefaultMonths || 12} Months`}</div>
          <div>
            <strong>Attached file:</strong>{' '}
            {template.attachedFile ? `${template.attachedFile.name} (${template.attachedFile.sizeLabel || 'n/a'})` : 'None'}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            <i className="ti ti-stack-2" style={{ marginRight: 6, color: 'var(--blue)' }} />
            In Use Cho Course ({coursesUsingIt.length})
          </div>
          {coursesUsingIt.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Not attached to any course yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {coursesUsingIt.map((c) => (
                <div key={c.id} style={{ fontSize: 12, padding: '6px 10px', background: 'var(--paper-sunken)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--blue)', fontWeight: 700 }}>{c.code}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            <i className="ti ti-books" style={{ marginRight: 6, color: 'var(--blue)' }} />
            In Use Cho Curriculum ({curriculaUsingIt.length})
          </div>
          {curriculaUsingIt.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Not attached to any curriculum yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {curriculaUsingIt.map((cur) => (
                <div key={cur.id} style={{ fontSize: 13, padding: '6px 10px', background: 'var(--paper-sunken)', borderRadius: 6 }}>
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

export function CertificateTemplateEditorModal({ draft, companyCategories, onCancel, onSave, onPreview }) {
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
      title={draft.name ? 'Edit Certificate Template' : 'Create A New Certificate Template'}
      subtitle="Define the standardized details printed automatically onto a learner's digital certificate on course completion."
      onClose={onCancel}
      size="lg"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Button size="sm" variant="outline" icon="ti-eye" disabled={!form.name.trim()} onClick={() => onPreview && onPreview(form)}>
            Preview Template
          </Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" icon="ti-check" disabled={!form.name.trim()} onClick={() => onSave(form)}>
              Save Certificate Template
            </Button>
          </div>
        </div>
      )}
    >
      <div className="grid grid-2" style={{ gap: 14, marginBottom: 12 }}>
        <div>
          <label className="field-label">Certificate Template Name (Vietnamese) <span style={{ color: 'var(--rust)' }}>*</span></label>
          <input
            className="field-input"
            placeholder="E.g. HACCP Food Hygiene & Safety Certificate"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="field-label">English Title</label>
          <input
            className="field-input"
            placeholder="e.g. MMVN Food Safety & HACCP Standard Certificate"
            value={form.nameEn || ''}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 14, marginBottom: 12 }}>
        <div>
          <label className="field-label">Training Area (Category)</label>
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
        <div>
          <label className="field-label">Default Validity Period</label>
          <select
            className="field-select"
            value={form.validityDefaultMonths ?? 12}
            onChange={(e) => setForm({ ...form, validityDefaultMonths: parseInt(e.target.value, 10) })}
          >
            <option value={6}>6 Months (peak season / recurring hygiene)</option>
            <option value={12}>12 Months / 1 Year (Food Safety, Fire Safety, Occupational Safety)</option>
            <option value={24}>24 Months / 2 Years (Operations & Management)</option>
            <option value={36}>36 Months / 3 Years (Senior Leadership Skills)</option>
            <option value={0}>Lifetime (never expires)</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="field-label">Description &amp; Intended Use</label>
        <textarea
          className="field-input"
          rows={2}
          style={{ resize: 'vertical' }}
          placeholder="The purpose & intended use of this certificate template..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="grid grid-2" style={{ gap: 14, marginBottom: 12 }}>
        <div>
          <label className="field-label">Approving Signatory</label>
          <input
            className="field-input"
            placeholder="E.g. Thái Minh Dũng"
            value={form.signerName}
            onChange={(e) => setForm({ ...form, signerName: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label">Signatory Job Title</label>
          <input
            className="field-input"
            placeholder="e.g. Head of Learning & Org Development"
            value={form.signerTitle}
            onChange={(e) => setForm({ ...form, signerTitle: e.target.value })}
          />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="field-label">Issuing Organization</label>
        <input
          className="field-input"
          value={form.issuerOrg}
          onChange={(e) => setForm({ ...form, issuerOrg: e.target.value })}
        />
      </div>

      <div>
        <label className="field-label">Attached Certificate Layout File (optional PDF/Word/image)</label>
        <input type="file" className="field-input" onChange={handleFileChange} />
        {form.attachedFile && (
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-paperclip" /> {form.attachedFile.name} ({form.attachedFile.sizeLabel})
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, attachedFile: null }))}
              style={{ background: 'transparent', border: 'none', color: 'var(--rust)', cursor: 'pointer' }}
              title="Remove file"
            >
              <i className="ti ti-x" />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
