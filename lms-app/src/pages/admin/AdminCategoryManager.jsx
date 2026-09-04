import React, { useState, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { Button, Badge, Modal } from '../../features/common/ui';
import { normalizeRole, ROLE_HOME } from '../../data/roles';
import {
  CATEGORY_ICON_PRESETS,
  CATEGORY_COLOR_PRESETS,
  CATEGORY_GROUP_ICON_PRESETS,
  generateCategoryCode,
  generateGroupCode,
  normalizeCategory,
  normalizeCategoryGroup,
  groupCategoriesByGroup,
} from '../../utils/courseCatalog';

const CATEGORY_IMAGE_PRESETS = [
  { label: 'Food Safety / HACCP', url: 'https://images.unsplash.com/photo-1577106263724-2c8e03bfe9cf?auto=format&fit=crop&w=600&q=80' },
  { label: 'Occupational Safety & Fire Prevention', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80' },
  { label: 'Cold Supply Chain', url: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&q=80' },
  { label: 'Store Operations & POS', url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80' },
  { label: 'Warehousing & Logistics', url: 'https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=600&q=80' },
  { label: 'Loss Prevention & QA', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80' },
  { label: 'Leadership & Management', url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80' },
  { label: 'Corporate Governance (ESG)', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80' },
  { label: 'Legal & Ethics', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80' },
  { label: 'Information Security (IT Sec)', url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80' },
  { label: 'Customer Service', url: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=600&q=80' },
  { label: 'Merchandising & Sales', url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80' },
  { label: 'E-Commerce', url: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=600&q=80' },
  { label: 'Finance & Accounting', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80' },
  { label: 'MMVN Onboarding & Culture', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Fresh Food', url: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80' },
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

function emptyCategoryDraft(existingCount = 0, groupId = '') {
  const preset = CATEGORY_IMAGE_PRESETS[existingCount % CATEGORY_IMAGE_PRESETS.length];
  return {
    id: `cat-${Date.now()}`,
    name: '',
    code: '',
    groupId,
    icon: 'ti-folder',
    color: '#3b82f6',
    description: '',
    coverImage: preset?.url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
  };
}

function emptyGroupDraft() {
  return {
    id: `grp-${Date.now()}`,
    name: '',
    code: '',
    icon: 'ti-folder',
    color: '#3b82f6',
    description: '',
  };
}

export default function AdminCategoryManager() {
  const {
    companyCategoryObjects = [],
    addCompanyCategory,
    updateCompanyCategory,
    deleteCompanyCategory,
    categoryGroups = [],
    addCategoryGroup,
    updateCategoryGroup,
    deleteCategoryGroup,
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
  const [toastMessage, setToastMessage] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null); // null | { isNew, draft, isCodeTouched, imageTab }
  const [groupModal, setGroupModal] = useState(null); // null | { isNew, draft }
  const [modalError, setModalError] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const fileInputRef = useRef(null);

  const ctx = { courses, curricula, assessments, libraries };

  function showToast(text, type = 'success') {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  }

  if (!isSystemAdminRole) {
    return <Navigate to={ROLE_HOME[role] || '/learner'} replace />;
  }

  // Normalized list of sub-categories
  const normalizedCategories = useMemo(() => {
    return companyCategoryObjects.map((c) => normalizeCategory(c, companyCategoryObjects));
  }, [companyCategoryObjects]);

  const normalizedGroups = useMemo(() => categoryGroups.map((g) => normalizeCategoryGroup(g)), [categoryGroups]);

  // Filter sub-categories by search (name, code, description), then bucket by
  // their parent Group so the page reads Group -> Sub-Categories, not a flat
  // list of 16+ look-alike cards.
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

  const buckets = useMemo(
    () => groupCategoriesByGroup(filteredCategories, normalizedGroups),
    [filteredCategories, normalizedGroups]
  );

  // Usage summary statistics
  const stats = useMemo(() => {
    let inUseCount = 0;
    let unusedCount = 0;
    normalizedCategories.forEach((cat) => {
      const u = usageOf(cat.name, ctx);
      if (u.total > 0) inUseCount++;
      else unusedCount++;
    });
    return { total: normalizedCategories.length, groupTotal: normalizedGroups.length, inUseCount, unusedCount };
  }, [normalizedCategories, normalizedGroups, ctx]);

  function groupUsage(group, categoriesInGroup) {
    return categoriesInGroup.reduce((sum, cat) => sum + usageOf(cat.name, ctx).total, 0);
  }

  // --- Sub-Category modal (Create / Edit) ---
  function openCreateCategoryModal(presetGroupId = '') {
    setCategoryModal({
      isNew: true,
      draft: emptyCategoryDraft(normalizedCategories.length, presetGroupId || normalizedGroups[0]?.id || ''),
      isCodeTouched: false,
      imageTab: 'PRESET',
    });
    setModalError('');
  }

  function openEditCategoryModal(category) {
    setCategoryModal({
      isNew: false,
      draft: { ...normalizeCategory(category, normalizedCategories) },
      isCodeTouched: true,
      imageTab: 'PRESET',
    });
    setModalError('');
  }

  function handleSaveCategoryModal() {
    if (!categoryModal) return;
    const { isNew, draft } = categoryModal;
    const cleanName = (draft.name || '').trim();
    if (!cleanName) {
      setModalError('Please enter a sub-category name.');
      return;
    }
    if (!draft.groupId) {
      setModalError('Please choose which Category group this Sub-Category belongs to.');
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
        setModalError(result.reason || `The sub-category "${cleanName}" already exists.`);
        return;
      }
      showToast(`New sub-category "${cleanName}" created successfully!`);
    } else {
      const result = updateCompanyCategory(draft.id || draft.name, categoryToSave);
      if (result && !result.ok) {
        setModalError(result.reason || `Failed to update the sub-category.`);
        return;
      }
      showToast(`Sub-category "${cleanName}" updated successfully!`);
    }

    setCategoryModal(null);
    setModalError('');
  }

  function handleDeleteCategory(cat) {
    const name = cat.name;
    const usage = usageOf(name, ctx);
    if (usage.total > 0) {
      window.alert(
        `Cannot delete "${name}" because it is used in ${usage.total} places:\n` +
        `- ${usage.courseCount} courses\n- ${usage.curriculumCount} curricula\n` +
        `- ${usage.assessmentCount} assessments\n- ${usage.libraryDomainCount} areas in the Library`
      );
      return;
    }
    if (window.confirm(`Delete the sub-category "${name}"? This action cannot be undone.`)) {
      deleteCompanyCategory(cat.id || name);
      showToast(`Sub-category "${name}" deleted successfully!`);
    }
  }

  // --- Category Group modal (Create / Edit) ---
  function openCreateGroupModal() {
    setGroupModal({ isNew: true, draft: emptyGroupDraft() });
    setModalError('');
  }

  function openEditGroupModal(group) {
    setGroupModal({ isNew: false, draft: { ...group } });
    setModalError('');
  }

  function handleSaveGroupModal() {
    if (!groupModal) return;
    const { isNew, draft } = groupModal;
    const cleanName = (draft.name || '').trim();
    if (!cleanName) {
      setModalError('Please enter a category name.');
      return;
    }
    const cleanCode = (draft.code || '').trim() || generateGroupCode(cleanName, normalizedGroups.map((g) => g.code));
    const groupToSave = { ...draft, name: cleanName, code: cleanCode.toUpperCase() };

    if (isNew) {
      const result = addCategoryGroup(groupToSave);
      if (result && !result.ok) {
        setModalError(result.reason || `The category "${cleanName}" already exists.`);
        return;
      }
      showToast(`New category "${cleanName}" created! Now add its sub-categories.`);
      setGroupModal(null);
      setModalError('');
      // Straight into "create the first sub-category" — matches the requested
      // flow of creating a Category, then immediately its Sub-Category.
      openCreateCategoryModal(result.group?.id || result.id);
      return;
    }

    const result = updateCategoryGroup(draft.id || draft.name, groupToSave);
    if (result && !result.ok) {
      setModalError(result.reason || 'Failed to update the category.');
      return;
    }
    showToast(`Category "${cleanName}" updated successfully!`);
    setGroupModal(null);
    setModalError('');
  }

  function handleDeleteGroup(group, categoriesInGroup) {
    if (categoriesInGroup.length > 0) {
      window.alert(`Cannot delete "${group.name}" because it still contains ${categoriesInGroup.length} sub-categor${categoriesInGroup.length === 1 ? 'y' : 'ies'}. Move or delete them first.`);
      return;
    }
    if (window.confirm(`Delete the category "${group.name}"? This action cannot be undone.`)) {
      const result = deleteCategoryGroup(group.id || group.name);
      if (result && !result.ok) {
        window.alert(result.reason);
        return;
      }
      showToast(`Category "${group.name}" deleted successfully!`);
    }
  }

  // Handle local image file upload
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setModalError('Please choose an image file (JPG, PNG, WebP).');
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

  function toggleGroupCollapsed(groupId) {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{language === 'en' ? 'Manage Category Taxonomy' : 'Category Management'}</h1>
            <Badge tone="sage">{stats.groupTotal} Categories · {stats.total} Sub-Categories</Badge>
          </div>
          <p>
            {language === 'en'
              ? 'Every Sub-Category belongs to one Category group — create a Category first, then add Sub-Categories inside it.'
              : 'Mỗi Sub-Category thuộc về đúng một Category — tạo Category trước, rồi thêm Sub-Category vào bên trong.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" icon="ti-folder-plus" onClick={openCreateGroupModal}>
            New Category
          </Button>
          <Button variant="primary" icon="ti-plus" onClick={() => openCreateCategoryModal()}>
            New Sub-Category
          </Button>
        </div>
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
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700, textTransform: 'uppercase' }}>Categories / Sub-Categories</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--rail)' }}>{stats.groupTotal} / {stats.total}</div>
          </div>
        </div>
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--sage-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sage)', fontSize: 22 }}>
            <i className="ti ti-circle-check" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700, textTransform: 'uppercase' }}>In Use</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--sage)' }}>{stats.inUseCount}</div>
          </div>
        </div>
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--amber-soft, #fef3c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)', fontSize: 22 }}>
            <i className="ti ti-alert-circle" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700, textTransform: 'uppercase' }}>No Course / Content Assigned</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)' }}>{stats.unusedCount}</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search */}
      <div className="card card-pad" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
          <input
            type="text"
            className="field-input"
            style={{ paddingLeft: 36, paddingRight: search ? 30 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
            placeholder="Search by sub-category name, code, description..."
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
          Display <strong>{filteredCategories.length}</strong> / {stats.total} sub-categories across <strong>{buckets.filter((b) => b.categories.length > 0 || !search.trim()).length}</strong> categories
        </div>
      </div>

      {/* Category (Group) sections, each containing its Sub-Category cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {buckets.map(({ group, categories: categoriesInGroup }) => {
          if (search.trim() && categoriesInGroup.length === 0) return null;
          const isCollapsed = Boolean(collapsedGroups[group.id]);
          const usedTotal = groupUsage(group, categoriesInGroup);
          const isRealGroup = group.id !== 'grp-ungrouped';

          return (
            <div key={group.id} className="card" style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Group header bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 18px',
                  background: 'var(--paper-sunken)',
                  borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleGroupCollapsed(group.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', flex: '1 1 260px' }}
                >
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: 9, background: group.color || '#3b82f6', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                    }}
                  >
                    <i className={`ti ${group.icon || 'ti-folder'}`} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{group.name}</span>
                      <span style={{ background: 'var(--paper)', color: group.color || 'var(--rail)', border: '1px solid var(--line)', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono, monospace)' }}>
                        {group.code}
                      </span>
                      <Badge tone={usedTotal > 0 ? 'sage' : 'slate'} size="sm">{categoriesInGroup.length} sub-categor{categoriesInGroup.length === 1 ? 'y' : 'ies'}</Badge>
                    </div>
                    {group.description && (
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{group.description}</div>
                    )}
                  </div>
                  <i className={`ti ${isCollapsed ? 'ti-chevron-down' : 'ti-chevron-up'}`} style={{ marginLeft: 'auto', color: 'var(--ink-faint)' }} />
                </button>

                {isRealGroup && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <Button size="sm" variant="outline" icon="ti-plus" onClick={() => openCreateCategoryModal(group.id)}>
                      Add Sub-Category
                    </Button>
                    <Button size="sm" variant="outline" icon="ti-edit" onClick={() => openEditGroupModal(group)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon="ti-trash"
                      disabled={categoriesInGroup.length > 0}
                      title={categoriesInGroup.length > 0 ? `Contains ${categoriesInGroup.length} sub-categories — move/delete them first` : undefined}
                      onClick={() => handleDeleteGroup(group, categoriesInGroup)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Sub-category cards */}
              {!isCollapsed && (
                <div style={{ padding: 16 }}>
                  {categoriesInGroup.length === 0 ? (
                    <div className="empty-state" style={{ padding: '20px 16px' }}>
                      <i className="ti ti-folder-off" aria-hidden="true" />
                      <p>No sub-category in this group yet.</p>
                      {isRealGroup && (
                        <Button size="sm" variant="outline" icon="ti-plus" onClick={() => openCreateCategoryModal(group.id)}>
                          Add the first Sub-Category
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-3" style={{ gap: 16 }}>
                      {categoriesInGroup.map((cat) => {
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
                              <div style={{ position: 'relative', height: 120, background: 'var(--paper-sunken)', overflow: 'hidden' }}>
                                <img
                                  src={cat.coverImage}
                                  alt={cat.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80';
                                  }}
                                />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)' }} />

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
                                    {usage.total > 0 ? `${usage.total} links` : 'Unused'}
                                  </span>
                                </div>

                                <div
                                  style={{
                                    position: 'absolute', bottom: 10, left: 12, width: 36, height: 36, borderRadius: 9,
                                    background: cat.color || '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.25)', border: '2px solid #fff',
                                  }}
                                >
                                  <i className={`ti ${cat.icon || 'ti-folder'}`} />
                                </div>

                                {cat.code && (
                                  <div style={{ position: 'absolute', bottom: 12, left: 56 }}>
                                    <span
                                      style={{
                                        background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '2px 8px', borderRadius: 4,
                                        fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', fontFamily: 'var(--font-mono, monospace)', backdropFilter: 'blur(4px)',
                                      }}
                                    >
                                      {cat.code}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div style={{ padding: '14px 14px 10px 14px' }}>
                                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.3 }}>
                                  {cat.name}
                                </div>

                                <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12, minHeight: 34, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {cat.description || 'No training objective or scope has been described for this sub-category yet.'}
                                </p>

                                <div
                                  style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, background: 'var(--paper-sunken)',
                                    padding: '8px 10px', borderRadius: 8, fontSize: 12,
                                  }}
                                >
                                  <div style={{ color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <i className="ti ti-books" style={{ color: 'var(--rail)' }} />
                                    <span>Courses: <strong style={{ color: 'var(--ink)' }}>{usage.courseCount}</strong></span>
                                  </div>
                                  <div style={{ color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <i className="ti ti-certificate" style={{ color: 'var(--sage)' }} />
                                    <span>Curricula: <strong style={{ color: 'var(--ink)' }}>{usage.curriculumCount}</strong></span>
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

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '10px 14px', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
                              <Button size="sm" variant="outline" icon="ti-edit" onClick={() => openEditCategoryModal(cat)}>
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                icon="ti-trash"
                                disabled={usage.total > 0}
                                title={usage.total > 0 ? `Used in ${usage.total} places — cannot be deleted` : undefined}
                                onClick={() => handleDeleteCategory(cat)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="empty-state" style={{ padding: '40px 16px' }}>
            <i className="ti ti-category" aria-hidden="true" />
            <p>No sub-category matches "{search}".</p>
          </div>
        )}
      </div>

      {/* Category Group Modal (Create & Edit) */}
      {groupModal && (
        <Modal
          isOpen
          title={groupModal.isNew ? 'Create A New Category' : `Edit Category "${groupModal.draft.name}"`}
          subtitle="Categories are the top level of the taxonomy — Sub-Categories live inside them."
          onClose={() => setGroupModal(null)}
          size="md"
          footer={(
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>* A category name is required</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => setGroupModal(null)}>Cancel</Button>
                <Button variant="primary" icon="ti-check" disabled={!groupModal.draft.name.trim()} onClick={handleSaveGroupModal}>
                  {groupModal.isNew ? 'Create & Add Sub-Category' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: 10 }}>
              <div>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: 4 }}>
                  Category Name <span style={{ color: 'var(--rust)' }}>*</span>
                </label>
                <input
                  className="field-input"
                  placeholder="E.g. Compliance, Leadership..."
                  value={groupModal.draft.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setGroupModal({ ...groupModal, draft: { ...groupModal.draft, name: newName } });
                    setModalError('');
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: 4 }}>Code</label>
                <input
                  className="field-input"
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                  placeholder="e.g. COMPLIANCE"
                  value={groupModal.draft.code}
                  onChange={(e) => setGroupModal({ ...groupModal, draft: { ...groupModal.draft, code: e.target.value.toUpperCase() } })}
                />
              </div>
            </div>

            <div>
              <label className="field-label" style={{ fontWeight: 700, marginBottom: 6 }}>Identity Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {CATEGORY_COLOR_PRESETS.map((color) => {
                  const isSelected = groupModal.draft.color === color.value;
                  return (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setGroupModal({ ...groupModal, draft: { ...groupModal.draft, color: color.value } })}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: color.value,
                        border: isSelected ? '3px solid var(--ink)' : '2px solid transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12,
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

            <div>
              <label className="field-label" style={{ fontWeight: 700, marginBottom: 6 }}>Icon</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, padding: 8, background: 'var(--paper-sunken)', borderRadius: 8, border: '1px solid var(--line)' }}>
                {CATEGORY_GROUP_ICON_PRESETS.map((icon) => {
                  const isSelected = groupModal.draft.icon === icon.id;
                  return (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => setGroupModal({ ...groupModal, draft: { ...groupModal.draft, icon: icon.id } })}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: 6,
                        background: isSelected ? groupModal.draft.color || 'var(--rail)' : 'var(--paper-raised)',
                        color: isSelected ? '#fff' : 'var(--ink)', border: isSelected ? 'none' : '1px solid var(--line)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      }}
                      title={icon.label}
                    >
                      <i className={`ti ${icon.id}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="field-label" style={{ fontWeight: 700, marginBottom: 4 }}>Description</label>
              <textarea
                className="field-input"
                rows={2}
                style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
                placeholder="What kind of sub-categories belong under this Category?"
                value={groupModal.draft.description}
                onChange={(e) => setGroupModal({ ...groupModal, draft: { ...groupModal.draft, description: e.target.value } })}
              />
            </div>

            {modalError && (
              <div style={{ fontSize: 13, color: 'var(--rust)', fontWeight: 600 }}>
                <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
                {modalError}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Sub-Category Modal (Create & Edit) */}
      {categoryModal && (
        <Modal
          isOpen
          title={categoryModal.isNew ? 'Create A New Sub-Category' : `Edit Sub-Category "${categoryModal.draft.name}"`}
          subtitle="Choose the parent Category, then set the name, code, cover image, icon and description."
          onClose={() => setCategoryModal(null)}
          size="lg"
          footer={(
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                * A Category and Sub-Category name are required
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => setCategoryModal(null)}>Cancel</Button>
                <Button variant="primary" icon="ti-check" disabled={!categoryModal.draft.name.trim() || !categoryModal.draft.groupId} onClick={handleSaveCategoryModal}>
                  {categoryModal.isNew ? 'Create Sub-Category' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'start' }}>
            {/* Left Column: Form Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Step 1: Category (Group) selector — required, chosen before the Sub-Category's own details */}
              <div>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: 4 }}>
                  1. Category (parent group) <span style={{ color: 'var(--rust)' }}>*</span>
                </label>
                <select
                  className="field-select"
                  style={{ width: '100%' }}
                  value={categoryModal.draft.groupId || ''}
                  onChange={(e) => setCategoryModal({ ...categoryModal, draft: { ...categoryModal.draft, groupId: e.target.value } })}
                >
                  <option value="">— Choose a category —</option>
                  {normalizedGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                  ))}
                </select>
              </div>

              {/* Row 1: Name & Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: 10 }}>
                <div>
                  <label className="field-label" style={{ fontWeight: 700, marginBottom: 4 }}>
                    2. Sub-Category Name <span style={{ color: 'var(--rust)' }}>*</span>
                  </label>
                  <input
                    className="field-input"
                    placeholder="E.g. Artificial Intelligence, Digital Marketing..."
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
                  />
                </div>

                <div>
                  <label className="field-label" style={{ fontWeight: 700, marginBottom: 4 }}>
                    Code
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      className="field-input"
                      style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                      placeholder="e.g. FSH"
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
                      title="Auto-generate code"
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
                  Identity Color
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
                  Icon
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
                          fontSize: 18,
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
                  Training Objective &amp; Scope Description
                </label>
                <textarea
                  className="field-input"
                  rows={2}
                  style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
                  placeholder="Describe the knowledge, skills or operations covered by this sub-category..."
                  value={categoryModal.draft.description}
                  onChange={(e) => setCategoryModal({ ...categoryModal, draft: { ...categoryModal.draft, description: e.target.value } })}
                />
              </div>

              {/* Row 5: Cover Image Picker Tabs */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="field-label" style={{ fontWeight: 700, margin: 0 }}>
                    Cover Image
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setCategoryModal({ ...categoryModal, imageTab: 'PRESET' })}
                      className={`btn btn-sm ${categoryModal.imageTab === 'PRESET' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: 11, padding: '2px 8px', height: 24 }}
                    >
                      Sample Images
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryModal({ ...categoryModal, imageTab: 'URL' })}
                      className={`btn btn-sm ${categoryModal.imageTab === 'URL' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: 11, padding: '2px 8px', height: 24 }}
                    >
                      Paste Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryModal({ ...categoryModal, imageTab: 'UPLOAD' })}
                      className={`btn btn-sm ${categoryModal.imageTab === 'UPLOAD' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: 11, padding: '2px 8px', height: 24 }}
                    >
                      Upload
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
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Click to choose an image file from your computer</span>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Supports JPG, PNG, WebP</div>
                    </div>
                  </div>
                )}
              </div>

              {modalError && (
                <div style={{ fontSize: 13, color: 'var(--rust)', fontWeight: 600 }}>
                  <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
                  {modalError}
                </div>
              )}
            </div>

            {/* Right Column: Live Preview Card */}
            <div>
              <label className="field-label" style={{ fontWeight: 700, marginBottom: 6, color: 'var(--ink-soft)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.04em' }}>
                <i className="ti ti-eye" style={{ marginRight: 4 }} />
                Live Preview
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

                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <span style={{ background: 'rgba(16, 185, 129, 0.9)', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                      Card Preview
                    </span>
                  </div>

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

                <div style={{ padding: '14px 14px 10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
                    {normalizedGroups.find((g) => g.id === categoryModal.draft.groupId)?.name || 'No category chosen'}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', marginBottom: 6, minHeight: 20 }}>
                    {categoryModal.draft.name || 'Sub-Category Name...'}
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12, minHeight: 34, lineHeight: 1.4 }}>
                    {categoryModal.draft.description || 'A short description of this sub-category\'s training objective and scope appears here.'}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 6,
                      background: 'var(--paper-sunken)',
                      padding: '8px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ color: 'var(--ink-soft)' }}><i className="ti ti-books" style={{ color: 'var(--rail)' }} /> Courses: <strong>0</strong></div>
                    <div style={{ color: 'var(--ink-soft)' }}><i className="ti ti-certificate" style={{ color: 'var(--sage)' }} /> Curricula: <strong>0</strong></div>
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
