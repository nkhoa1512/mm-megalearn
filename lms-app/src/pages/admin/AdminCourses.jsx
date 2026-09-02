import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { courseHasParticipants, userAdminUser, isUserAssignedToCourse } from '../../data/mockData';
import { ActionsMenu, Badge, Button, CourseTypeBadge, Modal, Tabs, CertificateTemplatePicker } from '../../features/common/ui';
import { useCourseStore } from '../../store/CourseStore';
import { canAuthorAnyCourse, hasCapability, normalizeRole } from '../../data/roles';
import { getCourseImage } from '../../data/courseImages';
import {
  courseFormatBadge, catalogSectionOf, CATALOG_SECTIONS, courseMatchesCategory,
  computeLifecycleStatus, LIFECYCLE_STATUS_META, buildCourseGroups,
  personalLifecycleStatusOf, PERSONAL_LIFECYCLE_STATUS_META,
} from '../../utils/courseCatalog';
import CurriculumTree from '../../features/catalog/CurriculumTree';
import { pricingOf, formatVnd } from '../../utils/costCenter';
import MultiTargetAssigner from '../../features/catalog/MultiTargetAssigner';
import {
  ASSIGNMENT_TYPES,
  assignmentTypeLabel,
  targetOptionsFor,
  getCascadingTargetOptions,
  divisions,
  departments,
  subDepartments,
  jobLevels,
  retailStores,
} from '../../data/assignmentTargets';
import {
  assignmentTargetSummary, resolveTargetLabel,
  visibleCurriculaFor, curriculumAccessOf, CURRICULUM_ACCESS_MODE,
} from '../../utils/curriculumAssignment';
import AssessmentEditorModal from '../../features/assessment/AssessmentEditorModal';
import AssessmentDetailModal from '../../features/assessment/AssessmentDetailModal';
import {
  getAssessmentAccess, filterAssessments, buildAssessmentGroups, ASSESSMENT_GROUP_BY_OPTIONS,
} from '../../utils/assessmentCatalog';
import { DELIVERY_FORMATS, ASSESSMENT_TYPES } from '../../data/assessmentData';
import {
  getCourseTargetLevels,
  getCourseEligibleLevels,
  evaluateUserEligibilityForCourse,
  evaluateGroupEligibilityForCourse,
  ACCESS_STATE,
} from '../../data/levelSystem';

const STATUS_TONE = { PUBLISHED: 'sage', DRAFT: 'rail', ARCHIVED: 'slate' };

// "Learning Objects" (self-paced E-Learning) and "Online Class" (live classes) are merged
// into a single tab — both are online courses, differing only in the
// format badge (🌐 E-Learning / 💻 Live) is already on every row, so a separate tab
// is no longer needed. "Library Course" moves to the front & is renamed "All Class" (keeping the same
// behaviour: shows every course, with no section filter). The new "Library" at the end is
// a consolidated view of courses by area (hard skills) — only User Admin &
// System Admin can see it (adminOnly, filtered when building the visible tab list).
const CATALOG_TABS = [
  { id: 'library', label: 'All Class', icon: 'ti-database' },
  { id: 'online-class', label: 'Online Class', icon: 'ti-broadcast', includeSections: [CATALOG_SECTIONS.LEARNING_OBJECTS, CATALOG_SECTIONS.ONLINE_CLASS] },
  { id: 'classroom', label: 'Classroom / In-Person', icon: 'ti-chalkboard', section: CATALOG_SECTIONS.CLASSROOM },
  { id: 'curriculum', label: 'Curriculum', icon: 'ti-books' },
  { id: 'assessment', label: 'Assessment', icon: 'ti-writing' },
  { id: 'domain-library', label: 'Library', icon: 'ti-folders', adminOnly: true },
];

const COURSE_GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'No grouping' },
  { id: 'CATEGORY', label: 'Category' },
  { id: 'ORG_UNIT', label: 'Department & Division' },
  { id: 'LEVEL', label: 'Job Level' },
  { id: 'LIFECYCLE_STATUS', label: 'Lifecycle Status' },
  { id: 'MODALITY', label: 'Delivery Format' },
];

const CURRICULUM_GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'No grouping' },
  { id: 'CATEGORY', label: 'By Area (Category)' },
  { id: 'STATUS', label: 'By Status' },
  { id: 'ASSIGNMENT', label: 'By Allocated Audience' },
];

function buildCurriculumGroups(curriculaList, groupByOption) {
  if (!groupByOption || groupByOption === 'NONE') return null;
  const groupsMap = new Map();

  curriculaList.forEach((cur) => {
    let key = 'OTHER';
    let label = 'Other';
    let icon = 'ti-folder';

    if (groupByOption === 'CATEGORY') {
      key = cur.category || 'Chung';
      label = key;
      icon = 'ti-category';
    } else if (groupByOption === 'STATUS') {
      key = cur.status || 'DRAFT';
      label = key === 'PUBLISHED' ? 'Published' : 'Draft';
      icon = key === 'PUBLISHED' ? 'ti-circle-check' : 'ti-file-pencil';
    } else if (groupByOption === 'ASSIGNMENT') {
      const count = (cur.assignments || []).length;
      if (count === 0) {
        key = 'UNASSIGNED';
        label = 'Not Allocated';
        icon = 'ti-target-off';
      } else {
        const types = new Set((cur.assignments || []).map((a) => a.targetType));
        if (types.has('ALL_ENTERPRISE')) {
          key = 'ENTERPRISE';
          label = 'Enterprise-Wide (All Associates)';
          icon = 'ti-world';
        } else if (types.has('BU') || types.has('DIVISION') || types.has('DEPT')) {
          key = 'ORG_UNIT';
          label = 'By Division & Department';
          icon = 'ti-building';
        } else if (types.has('STORE')) {
          key = 'STORE';
          label = 'By Store';
          icon = 'ti-building-store';
        } else {
          key = 'CUSTOM';
          label = 'By Custom Group / Individual';
          icon = 'ti-users';
        }
      }
    }

    if (!groupsMap.has(key)) {
      groupsMap.set(key, { key, label, icon, items: [] });
    }
    groupsMap.get(key).items.push(cur);
  });

  return Array.from(groupsMap.values());
}

function emptyCurriculumDraft(defaultCat = 'Food Safety & Hygiene') {
  return { id: `CUR-${Date.now()}`, title: '', description: '', category: defaultCat, courseIds: [], status: 'PUBLISHED', assignments: [], certificateTemplateId: null };
}

function emptyLibraryDraft() {
  return { id: `LIB-${Date.now()}`, name: '', description: '', domains: [] };
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const {
    courses, updateCourse, removeCourse, currentUser, language, t,
    companyCategories, curricula, addCurriculum, updateCurriculum, deleteCurriculum,
    libraries, addLibrary, updateLibrary, deleteLibrary,
    certificateTemplates, addCertificateTemplate,
    assignCurriculum, proposeCurriculumAssignment, removeCurriculumAssignment,
    approvals, myEnrollments,
    assessments, addAssessment, updateAssessment, deleteAssessment,
    assignAssessmentTarget, removeAssessmentTarget,
    questionBanks, addQuestionToBank, assessmentAttempts,
    accessFor, customGroups,
  } = useCourseStore();
  const role = normalizeRole(currentUser?.role);
  const isAdmin = canAuthorAnyCourse(role);
  const isCurriculumAdmin = hasCapability(role, 'canManageCurriculum');
  const { mode: curriculumMode } = curriculumAccessOf(currentUser);
  const visibleCurricula = useMemo(() => visibleCurriculaFor(curricula, currentUser), [curricula, currentUser]);
  // User Admin & SysAdmin manage EVERY course (canAuthorOnlineCourses is the
  // signal separating them from Trainer/L&D — only these 2 roles have it). Trainer/L&D
  // may only edit/delete the courses they created; the 100 original catalog courses have no
  // createdBy field and are therefore treated as set up by the User Admin (the default owner
  // of the official catalog), so a Trainer has no rights over them.
  const isFullAdmin = hasCapability(role, 'canAuthorOnlineCourses');
  function ownerIdOf(course) {
    return course.createdBy || userAdminUser.userId;
  }
  function canManageCourse(course) {
    if (isFullAdmin) return true;
    if (isAdmin) return ownerIdOf(course) === currentUser?.userId;
    return false;
  }

  const [searchParams, setSearchParams] = useSearchParams();
  // Defaults to the "All Class" tab (the full catalog) — Admin/Trainer click
  // Opening Courses from the nav usually means wanting to see every course, not just one
  // a specific delivery format.
  const rawTab = (searchParams.get('tab') || 'library').toLowerCase().trim();
  const activeTab = (() => {
    const clean = rawTab.replace(/[\s_/]+/g, '-');
    if (clean.includes('online')) return 'online-class';
    if (clean.includes('classroom') || clean.includes('in-person')) return 'classroom';
    if (clean === 'curriculum') return 'curriculum';
    if (clean === 'assessment') return 'assessment';
    if (clean === 'domain-library') return 'domain-library';
    return 'library';
  })();

  function setActiveTab(id) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });
  }
  const activeTabDef = CATALOG_TABS.find((tb) => tb.id === activeTab) || CATALOG_TABS[0];
  // "Library" (domain-library) is for User Admin/SysAdmin only — if someone
  // navigates straight to ?tab=domain-library without the rights, they are pushed back to
  // "All Class" rather than showing an empty/incorrect view.
  useEffect(() => {
    if (activeTab === 'domain-library' && !isFullAdmin) {
      setActiveTab('library');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isFullAdmin]);
  // Trainer/L&D may only create in-person (Classroom) courses
  const hideCreateForTrainerTab = isAdmin && !isFullAdmin && activeTab === 'online-class';

  // User Learner, Manager & HRBP have no create/edit/delete/publish rights
  // nor view any allocation detail — they may only browse the catalog (with the same 5+ data
  // columns a User Admin sees) and click "View Course" to reach the right learning page
  // personal view (whether they may take the course, and enrol/start it as they
  // course type). HRBP's curriculum add/propose flow still lives on the Dashboard
  // their own page (/hrbp/curriculum), not this shared catalog page.
  // hideAllocationDetails also folds in hideCreateForTrainerTab above because
  // A Trainer also cannot view "Details & Allocation" for a Learning
  // Objects/Online Class — they can only create/manage in-person classes.
  const isViewOnlyCatalogRole = role === 'learner' || role === 'manager' || role === 'hrbp';
  const hideAllocationDetails = isViewOnlyCatalogRole || hideCreateForTrainerTab;

  const enrolledCourseIdSet = new Set(Object.keys(myEnrollments || {}));
  const visibleCourses = (isFullAdmin || isAdmin)
    ? courses.filter((c) => {
        if (c.status === 'DRAFT' && !canManageCourse(c)) return false;
        return true;
      }).map((c) => ({ ...c, enrollment: myEnrollments?.[c.id] || null }))
    : courses
      .filter((c) => {
        if (c.status === 'DRAFT' && !canManageCourse(c)) return false;
        const lifecycle = computeLifecycleStatus(c);
        if (lifecycle === 'UPCOMING' && catalogSectionOf(c) === CATALOG_SECTIONS.LEARNING_OBJECTS) return false;
        if (c.courseType === 'MANDATORY') {
          const isAssigned = isUserAssignedToCourse(c, currentUser, customGroups);
          const hasEnrollment = Boolean(myEnrollments?.[c.id]);
          if (!isAssigned && !hasEnrollment && !canManageCourse(c)) return false;
        }
        return true;
      })
      // Merge in the viewer's real enrollments onto each course — needed to
      // compute the correct "personalized" status (In Progress/Overdue/
      // Completed/Enrollment Window Closed) in the filter, the grouping and the badges below.
      .map((c) => ({ ...c, enrollment: myEnrollments?.[c.id] || null }));

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedLifecycle, setSelectedLifecycle] = useState('ALL');
  const [groupBy, setGroupBy] = useState('NONE');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [page, setPage] = useState(1);
  const [courseViewMode, setCourseViewMode] = useState('TABLE'); // 'TABLE' | 'GRID'
  const pageSize = 15;

  // Curriculum Filter & Group By states
  const [curriculumSearch, setCurriculumSearch] = useState('');
  const [selectedCurriculumCategory, setSelectedCurriculumCategory] = useState('ALL');
  const [selectedCurriculumStatus, setSelectedCurriculumStatus] = useState('ALL');
  const [selectedCurriculumAssignment, setSelectedCurriculumAssignment] = useState('ALL');
  const [curriculumGroupBy, setCurriculumGroupBy] = useState('NONE');
  const [curriculumViewMode, setCurriculumViewMode] = useState('GRID'); // 'GRID' | 'TABLE'
  const [collapsedCurriculumGroups, setCollapsedCurriculumGroups] = useState(new Set());

  const [showCourseFilters, setShowCourseFilters] = useState(true);
  const [showCurriculumFilters, setShowCurriculumFilters] = useState(true);
  const [showAssessmentFilters, setShowAssessmentFilters] = useState(true);

  const [editingCurriculum, setEditingCurriculum] = useState(null);
  const [viewingCurriculum, setViewingCurriculum] = useState(null);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [editingLibrary, setEditingLibrary] = useState(null);

  function saveLibrary(draft) {
    const now = new Date().toISOString().slice(0, 10);
    const exists = libraries.some((l) => l.id === draft.id);
    if (exists) {
      updateLibrary(draft.id, { ...draft, updatedAt: now });
    } else {
      addLibrary({ ...draft, createdBy: currentUser?.userId, createdAt: now, updatedAt: now });
    }
    setEditingLibrary(null);
  }

  function publish(course) {
    publishNewCourseVersion(course.id, null, 'Published a new version.');
  }

  function remove(course) {
    if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) {
      removeCourse(course.id);
    }
  }

  const bySearchCategoryType = visibleCourses.filter((c) => {
    const matchCat = selectedCategory === 'ALL' || courseMatchesCategory(c, selectedCategory);
    const matchType = selectedType === 'ALL' || c.courseType === selectedType;
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchType && matchSearch;
  });

  const isLibrary = activeTabDef.id === 'library';
  const isCurriculum = activeTabDef.id === 'curriculum';
  const isAssessment = activeTabDef.id === 'assessment';
  // "Library" (domain-library) is no longer an auto-grouped view — it is
  // its own CRUD: the admin creates the Library, adds areas & assigns courses manually
  // (see the dedicated JSX block below; it does not share the course table layout).
  const isLibraryManager = activeTabDef.id === 'domain-library' && isFullAdmin;

  // Assessment management & catalog state
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [viewingAssessment, setViewingAssessment] = useState(null);
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [selectedAssessmentType, setSelectedAssessmentType] = useState('ALL');
  const [selectedAssessmentFormat, setSelectedAssessmentFormat] = useState('ALL');
  const [selectedAssessmentCategory, setSelectedAssessmentCategory] = useState('ALL');
  const [selectedAssessmentStatus, setSelectedAssessmentStatus] = useState('ALL');
  const [assessmentGroupBy, setAssessmentGroupBy] = useState('NONE');
  const [collapsedAssessmentGroups, setCollapsedAssessmentGroups] = useState(new Set());

  const visibleAssessments = useMemo(() => {
    return (assessments || []).filter((asm) => {
      if (asm.status === 'DRAFT') {
        if (isFullAdmin) return true;
        if (role === 'trainer' && asm.createdBy === currentUser?.userId) return true;
        return false;
      }
      return true;
    });
  }, [assessments, isFullAdmin, role, currentUser]);

  const filteredAssessments = useMemo(() => {
    return filterAssessments(visibleAssessments, {
      search: assessmentSearch,
      selectedType: selectedAssessmentType,
      selectedFormat: selectedAssessmentFormat,
      selectedCategory: selectedAssessmentCategory,
      selectedStatus: selectedAssessmentStatus,
      currentUser,
      courses,
    });
  }, [visibleAssessments, assessmentSearch, selectedAssessmentType, selectedAssessmentFormat, selectedAssessmentCategory, selectedAssessmentStatus, currentUser, courses]);

  const assessmentGroups = useMemo(() => {
    return buildAssessmentGroups(filteredAssessments, assessmentGroupBy);
  }, [filteredAssessments, assessmentGroupBy]);

  function toggleAssessmentGroup(key) {
    setCollapsedAssessmentGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Curriculum Filter & Group computation
  const filteredCurricula = useMemo(() => {
    return (visibleCurricula || []).filter((cur) => {
      if (selectedCurriculumCategory && selectedCurriculumCategory !== 'ALL' && cur.category !== selectedCurriculumCategory) {
        return false;
      }
      if (selectedCurriculumStatus && selectedCurriculumStatus !== 'ALL' && cur.status !== selectedCurriculumStatus) {
        return false;
      }
      if (selectedCurriculumAssignment === 'ASSIGNED' && (!cur.assignments || cur.assignments.length === 0)) {
        return false;
      }
      if (selectedCurriculumAssignment === 'UNASSIGNED' && cur.assignments && cur.assignments.length > 0) {
        return false;
      }
      if (curriculumSearch.trim()) {
        const q = curriculumSearch.toLowerCase();
        const matchTitle = (cur.title || '').toLowerCase().includes(q);
        const matchDesc = (cur.description || '').toLowerCase().includes(q);
        const matchCat = (cur.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [visibleCurricula, selectedCurriculumCategory, selectedCurriculumStatus, selectedCurriculumAssignment, curriculumSearch]);

  const curriculumGroups = useMemo(() => {
    return buildCurriculumGroups(filteredCurricula, curriculumGroupBy);
  }, [filteredCurricula, curriculumGroupBy]);

  function toggleCurriculumGroup(key) {
    setCollapsedCurriculumGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const assessmentPlayerBasePath = role === 'manager'
    ? '/manager/assessment'
    : role === 'learner'
    ? '/learner/assessment'
    : '/my-learning/assessment';

  const learnerCourseBasePath = role === 'manager'
    ? '/manager/learning'
    : role === 'learner'
    ? '/learner/courses'
    : '/my-learning';

  // The lifecycle status filter and grouping apply to EVERY tab that lists courses
  // (Learning Objects/Online Class/Classroom/Library), not just
  // Library — differing only in that the Library applies no section filter (it shows everything),
  // while the other 3 tabs also filter by the open tab's section. For a role that is NOT
  // Full Admin, the status set switches to the personalized view (see
  // personalLifecycleStatusOf) instead of the Admin's Draft/Upcoming/Open/Closed.
  const filtered = isCurriculum || isAssessment || isLibraryManager
    ? []
    : bySearchCategoryType.filter((c) => {
      // "All Class" shows every course with no section filter; the remaining tabs
      // filter by their own section (or includeSections when one tab merges several
      // section, like Online Class).
      if (!isLibrary) {
        const sectionOk = activeTabDef.includeSections
          ? activeTabDef.includeSections.includes(catalogSectionOf(c))
          : catalogSectionOf(c) === activeTabDef.section;
        if (!sectionOk) return false;
      }
      const rowLifecycle = (isFullAdmin || isAdmin) ? computeLifecycleStatus(c) : personalLifecycleStatusOf(c);
      const matchLifecycle = selectedLifecycle === 'ALL' || rowLifecycle === selectedLifecycle;
      return matchLifecycle;
    });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const groups = isCurriculum || isAssessment || isLibraryManager ? null : buildCourseGroups(filtered, groupBy, { personal: !(isFullAdmin || isAdmin) });

  function toggleGroup(key) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function renderCourseRow(c) {
    const hasParticipants = courseHasParticipants(c);
    const canManage = canManageCourse(c);
    const badge = courseFormatBadge(c);
    const lifecycle = computeLifecycleStatus(c);
    // Full Admin & Trainer: keep the administration view (Draft/Upcoming/Open/Closed),
    // only becomes "Enrolled" when the course is Open and they themselves are enrolled.
    // The remaining roles (Learner/Manager/HRBP): use the personalized status
    // personalized (In Progress/Overdue/Completed/Enrollment
    // Window Closed/Open) to match the filter & grouping just added above.
    const isMineAndOpen = lifecycle === 'OPEN' && enrolledCourseIdSet.has(c.id);
    const lifecycleMeta = (isFullAdmin || isAdmin)
      ? (isMineAndOpen
        ? { label: 'Enrolled', labelEn: 'Joined', tone: 'rail', icon: 'ti-user-check' }
        : LIFECYCLE_STATUS_META[lifecycle])
      : PERSONAL_LIFECYCLE_STATUS_META[personalLifecycleStatusOf(c)];
    const asgCount = (c.assignments && c.assignments.length) || (c.assignment ? 1 : 0);
    const myAccess = accessFor ? accessFor(c, currentUser) : { canAccess: true, state: ACCESS_STATE.OPEN };
    const rowPricing = pricingOf(c);

    return (
      <tr key={c.id}>
        <td>
          <div
            style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}
            onClick={() => (hideAllocationDetails ? navigate(`/learner/courses/${c.id}`) : setViewingCourse(c))}
            title={hideAllocationDetails ? 'Click to view the course details' : 'Click to view the course details & allocation'}
          >
            <img
              src={getCourseImage(c)}
              alt={c.title}
              style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--line)' }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{c.title}</div>
                <Badge tone={badge.tone}>{badge.icon} {badge.label}</Badge>
                <Badge tone={lifecycleMeta.tone}>{lifecycleMeta.label}</Badge>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{c.code}</span> &middot; {(c.categories && c.categories.join(', ')) || c.category} &middot; Version {c.version}
                {c.onlineClassType === 'VIRTUAL_CLASS' && c.virtualMeeting?.instructorName && (
                  <> &middot; GV: {c.virtualMeeting.instructorName}</>
                )}
              </div>
            </div>
          </div>
        </td>
        <td><CourseTypeBadge courseType={c.courseType} /></td>
        {isFullAdmin && (
          <td style={{ color: 'var(--ink-soft)', fontSize: 12 }}>
            {c.courseType === 'MANDATORY' ? (
              <span style={{ background: 'var(--paper-sunken)', padding: '3px 8px', borderRadius: 4, display: 'inline-block' }}>
                {asgCount > 0
                  ? `${asgCount} assigned audiences`
                  : (c.assignment?.targetLabel || 'Assigned Division')}
              </span>
            ) : (
              <span style={{ color: 'var(--ink-faint)' }}>All MMVN Associates (Catalog)</span>
            )}
          </td>
        )}
        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.modules?.length || 2}</td>
        <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.estimatedDuration || c.estimatedHours || '2h'}</td>
        <td>
          {rowPricing.isFree ? (
            <Badge tone="sage" icon="ti-gift" size="sm">Free</Badge>
          ) : (
            <Badge tone="amber" icon="ti-coin" size="sm">{formatVnd(rowPricing.price)}</Badge>
          )}
        </td>
        <td>
          <Badge tone={STATUS_TONE[c.status]}>
            {c.status === 'PUBLISHED' ? 'Published' : c.status === 'DRAFT' ? 'Draft' : 'Archived'}
          </Badge>
        </td>
        <td>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
            {canManage ? (
              <>
                <Button size="sm" variant="outline" icon="ti-edit" onClick={() => navigate(`/admin/courses/${c.id}`)}>Edit</Button>
                <ActionsMenu
                  label="More actions"
                  items={[
                    !hideAllocationDetails && { key: 'details', icon: 'ti-list-details', label: 'Details & Allocation', onClick: () => setViewingCourse(c) },
                    myAccess.canAccess ? {
                      key: 'learn',
                      icon: 'ti-player-play',
                      label: '🚀 Open The Lesson (Personal)',
                      onClick: () => navigate(`/learner/courses/${c.id}`),
                    } : myAccess.state === ACCESS_STATE.REQUESTABLE ? {
                      key: 'request_learn',
                      icon: 'ti-send',
                      label: '⚠️ Request A Level Skip',
                      onClick: () => navigate(`/learner/courses/${c.id}`),
                    } : {
                      key: 'locked_learn',
                      icon: 'ti-lock',
                      label: '🔒 Course above your level',
                      disabled: true,
                      title: myAccess.reason,
                    },
                    c.status === 'DRAFT' && { key: 'publish', icon: 'ti-upload', label: 'Publish', onClick: () => publish(c) },
                    {
                      key: 'delete',
                      icon: 'ti-trash',
                      label: 'Delete',
                      variant: 'danger',
                      disabled: hasParticipants,
                      title: hasParticipants ? 'Cannot delete: employees have already started this course.' : undefined,
                      onClick: () => remove(c),
                    },
                  ].filter(Boolean)}
                />
              </>
            ) : (
              <Button
                size="sm"
                variant={myAccess.canAccess ? "primary" : "outline"}
                icon={myAccess.canAccess ? "ti-player-play" : myAccess.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? "ti-lock" : "ti-eye"}
                disabled={myAccess.state === ACCESS_STATE.LOCKED_LEVEL_GAP}
                onClick={() => navigate(`/learner/courses/${c.id}`)}
                title={myAccess.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? myAccess.reason : (isAdmin ? 'You did not create this course — view only, no edit/delete.' : undefined)}
              >
                {isAdmin ? 'View Course' : (myAccess.canAccess ? 'Start Learning' : myAccess.state === ACCESS_STATE.REQUESTABLE ? 'Request' : 'Course Blocked')}
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  function renderCourseTable(rows) {
    return (
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Course Program</th>
              <th style={{ width: 140 }}>Type</th>
              {isFullAdmin && <th>Assigned Target Scope</th>}
              <th style={{ width: 90 }}>Modules</th>
              <th style={{ width: 90 }}>Duration</th>
              <th style={{ width: 120 }}>Tuition</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 150, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>{rows.map(renderCourseRow)}</tbody>
        </table>
      </div>
    );
  }

  function renderCourseGrid(rows) {
    return (
      <div className="grid grid-3" style={{ gap: 14 }}>
        {rows.map((c) => {
          const hasParticipants = courseHasParticipants(c);
          const canManage = canManageCourse(c);
          const badge = courseFormatBadge(c);
          const lifecycle = computeLifecycleStatus(c);
          const isMineAndOpen = lifecycle === 'OPEN' && enrolledCourseIdSet.has(c.id);
          const lifecycleMeta = (isFullAdmin || isAdmin)
            ? (isMineAndOpen
              ? { label: 'Enrolled', labelEn: 'Joined', tone: 'rail', icon: 'ti-user-check' }
              : LIFECYCLE_STATUS_META[lifecycle])
            : PERSONAL_LIFECYCLE_STATUS_META[personalLifecycleStatusOf(c)];
          const asgCount = (c.assignments && c.assignments.length) || (c.assignment ? 1 : 0);
          const myAccess = accessFor ? accessFor(c, currentUser) : { canAccess: true, state: ACCESS_STATE.OPEN };
          const rowPricing = pricingOf(c);
          const courseImg = getCourseImage(c);

          return (
            <div
              key={c.id}
              className="card card-interactive"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden',
              }}
            >
              <div>
                {/* Banner image with overlay badges */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 130,
                    background: 'var(--paper-sunken)',
                    cursor: 'pointer',
                  }}
                  onClick={() => (hideAllocationDetails ? navigate(`/learner/courses/${c.id}`) : setViewingCourse(c))}
                >
                  <img
                    src={courseImg}
                    alt={c.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <Badge tone={badge.tone}>{badge.icon} {badge.label}</Badge>
                    <Badge tone={lifecycleMeta.tone}>{lifecycleMeta.label}</Badge>
                  </div>
                  <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
                    {rowPricing.isFree ? (
                      <Badge tone="sage" icon="ti-gift" size="sm">Free</Badge>
                    ) : (
                      <Badge tone="amber" icon="ti-coin" size="sm">{formatVnd(rowPricing.price)}</Badge>
                    )}
                  </div>
                </div>

                {/* Body info */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{c.code}</span>
                    <span>&middot;</span>
                    <Badge tone="slate" size="sm">{(c.categories && c.categories.join(', ')) || c.category}</Badge>
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: 'var(--ink)',
                      margin: '0 0 8px 0',
                      lineHeight: 1.35,
                      cursor: 'pointer',
                      minHeight: 38,
                    }}
                    onClick={() => (hideAllocationDetails ? navigate(`/learner/courses/${c.id}`) : setViewingCourse(c))}
                    title={c.title}
                  >
                    {c.title}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10, flexWrap: 'wrap' }}>
                    <span><i className="ti ti-folders" style={{ marginRight: 4 }} />{c.modules?.length || 2} modules</span>
                    <span>&middot;</span>
                    <span><i className="ti ti-clock" style={{ marginRight: 4 }} />{c.estimatedDuration || c.estimatedHours || '2h'}</span>
                    <CourseTypeBadge courseType={c.courseType} />
                  </div>

                  {isFullAdmin && (
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '5px 8px', borderRadius: 6, marginBottom: 8 }}>
                      <i className="ti ti-target" style={{ marginRight: 4, color: 'var(--rail)' }} />
                      {c.courseType === 'MANDATORY'
                        ? (asgCount > 0 ? `${asgCount} allocated audiences` : (c.assignment?.targetLabel || 'Assigned Scope'))
                        : 'All MMVN Associates (Catalog)'}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid var(--line)', background: 'var(--paper-sunken)' }}>
                {canManage ? (
                  <>
                    <Button size="sm" variant="outline" icon="ti-edit" onClick={() => navigate(`/admin/courses/${c.id}`)}>
                      Edit
                    </Button>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {!hideAllocationDetails && (
                        <Button size="sm" variant="ghost" icon="ti-list-details" onClick={() => setViewingCourse(c)}>
                          Details
                        </Button>
                      )}
                      <ActionsMenu
                        label="More actions"
                        items={[
                          !hideAllocationDetails && { key: 'details', icon: 'ti-list-details', label: 'Details & Allocation', onClick: () => setViewingCourse(c) },
                          myAccess.canAccess ? {
                            key: 'learn',
                            icon: 'ti-player-play',
                            label: '🚀 Open The Lesson',
                            onClick: () => navigate(`/learner/courses/${c.id}`),
                          } : null,
                          c.status === 'DRAFT' && { key: 'publish', icon: 'ti-upload', label: 'Publish', onClick: () => publish(c) },
                          {
                            key: 'delete',
                            icon: 'ti-trash',
                            label: 'Delete',
                            variant: 'danger',
                            disabled: hasParticipants,
                            onClick: () => remove(c),
                          },
                        ].filter(Boolean)}
                      />
                    </div>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant={myAccess.canAccess ? "primary" : "outline"}
                    icon={myAccess.canAccess ? "ti-player-play" : "ti-eye"}
                    onClick={() => navigate(`/learner/courses/${c.id}`)}
                    style={{ width: '100%' }}
                  >
                    {isAdmin ? 'View Course' : (myAccess.canAccess ? 'Start Learning' : 'View Details')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderCurriculumGrid(items) {
    return (
      <div className="grid grid-3" style={{ gap: 14 }}>
        {items.map((cur) => {
          const asgCount = (cur.assignments || []).length;
          const asgSummary = assignmentTargetSummary(cur);
          return (
            <div key={cur.id} className="card card-pad card-interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{cur.title}</div>
                  <Badge tone={cur.status === 'PUBLISHED' ? 'sage' : 'rail'}>{cur.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10, minHeight: 34 }}>{cur.description}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Badge tone="slate" size="sm">{cur.category || 'Chung'}</Badge>
                  <span>&middot;</span>
                  <span>{(cur.courseIds || []).length} course E-Learning</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6, marginBottom: 12 }}>
                  <i className="ti ti-target" style={{ color: asgCount > 0 ? 'var(--rail)' : 'var(--ink-faint)', marginRight: 5 }} />
                  <strong>Allocation:</strong> {asgSummary}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setViewingCurriculum(cur)}>
                  {curriculumMode === CURRICULUM_ACCESS_MODE.ASSIGNED_ONLY ? 'View Details' : 'Details & Allocation'}
                </Button>
                {isCurriculumAdmin && <Button size="sm" onClick={() => setEditingCurriculum(cur)}>Edit</Button>}
                {isCurriculumAdmin && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon="ti-trash"
                    onClick={() => { if (window.confirm(`Delete the curriculum "${cur.title}"?`)) deleteCurriculum(cur.id); }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <i className="ti ti-books" aria-hidden="true" />
            <p>{curriculumMode === CURRICULUM_ACCESS_MODE.ASSIGNED_ONLY ? 'No curriculum has been allocated to you.' : 'No curriculum matches the filters.'}</p>
          </div>
        )}
      </div>
    );
  }

  function renderCurriculumTable(items) {
    return (
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Curriculum Name</th>
              <th style={{ width: 180 }}>Area</th>
              <th style={{ width: 140, textAlign: 'center' }}>E-Learning Courses</th>
              <th>Allocated Audience</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 180, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((cur) => {
              const asgSummary = assignmentTargetSummary(cur);
              return (
                <tr key={cur.id}>
                  <td>
                    <div
                      style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}
                      onClick={() => setViewingCurriculum(cur)}
                    >
                      {cur.title}
                    </div>
                    {cur.description && (
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cur.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <Badge tone="slate" size="sm">{cur.category || 'Chung'}</Badge>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    {(cur.courseIds || []).length} course
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className="ti ti-target" style={{ color: (cur.assignments || []).length > 0 ? 'var(--rail)' : 'var(--ink-faint)' }} />
                      <span>{asgSummary}</span>
                    </div>
                  </td>
                  <td>
                    <Badge tone={cur.status === 'PUBLISHED' ? 'sage' : 'rail'}>
                      {cur.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setViewingCurriculum(cur)}>
                        {curriculumMode === CURRICULUM_ACCESS_MODE.ASSIGNED_ONLY ? 'Details' : 'Details & Allocation'}
                      </Button>
                      {isCurriculumAdmin && <Button size="sm" onClick={() => setEditingCurriculum(cur)}>Edit</Button>}
                      {isCurriculumAdmin && (
                        <Button
                          size="sm"
                          variant="danger"
                          icon="ti-trash"
                          onClick={() => { if (window.confirm(`Delete the curriculum "${cur.title}"?`)) deleteCurriculum(cur.id); }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-soft)' }}>
                  <i className="ti ti-books" style={{ fontSize: 24, marginBottom: 8, display: 'block', color: 'var(--ink-faint)' }} />
                  No curriculum matches the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function saveCurriculum(draft) {
    const exists = curricula.some((c) => c.id === draft.id);
    const now = new Date().toISOString().slice(0, 10);
    if (exists) {
      updateCurriculum(draft.id, { ...draft, updatedAt: now });
    } else {
      addCurriculum({ ...draft, createdBy: currentUser?.userId, createdAt: now, updatedAt: now });
    }
    setEditingCurriculum(null);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{language === 'en' ? 'Course Catalog & Program Governance' : 'Course Catalog & Administration'}</h1>
            <Badge tone="sage">{visibleCourses.length} {language === 'en' ? 'Total Programs' : 'Courses'}</Badge>
          </div>
          <p>
            {language === 'en'
              ? 'Define curriculum modules, author interactive quizzes, import question banks, and target mandatory compliance by Business Unit, Division, Department, or Job Level.'
              : 'Build lesson modules, interactive tests and question banks, and allocate mandatory training by Division, Department or Job Level.'}
          </p>
        </div>
        {isAdmin && !isCurriculum && !isAssessment && !isLibraryManager && !hideCreateForTrainerTab && (
          <div>
            {!isFullAdmin ? (
              <Button
                variant="primary"
                icon="ti-plus"
                onClick={() => navigate('/admin/courses/new?scope=classroom&deliveryType=IN_PERSON_CLASSROOM')}
              >
                {language === 'en' ? '+ Create In-Person Class' : '+ Create An In-Person Course'}
              </Button>
            ) : activeTab === 'online-class' ? (
              <Button
                variant="primary"
                icon="ti-plus"
                onClick={() => navigate('/admin/courses/new?scope=online&deliveryType=ONLINE_ELEARNING&onlineClassType=E_LEARNING')}
              >
                {language === 'en' ? '+ Create Online Course' : '+ Create An Online Course'}
              </Button>
            ) : activeTab === 'classroom' ? (
              <Button
                variant="primary"
                icon="ti-plus"
                onClick={() => navigate('/admin/courses/new?scope=classroom&deliveryType=IN_PERSON_CLASSROOM')}
              >
                {language === 'en' ? '+ Create In-Person Course' : '+ Create An In-Person Course'}
              </Button>
            ) : (
              <Button
                variant="primary"
                icon="ti-plus"
                onClick={() => navigate('/admin/courses/new?scope=all')}
              >
                {language === 'en' ? '+ Create New Course' : '+ Create New Course'}
              </Button>
            )}
          </div>
        )}
        {isCurriculumAdmin && isCurriculum && (
          <Button variant="primary" icon="ti-plus" onClick={() => setEditingCurriculum(emptyCurriculumDraft())}>
            Create New Curriculum
          </Button>
        )}
        {isFullAdmin && isAssessment && (
          <Button variant="primary" icon="ti-plus" onClick={() => setEditingAssessment({})}>
            Create New Assessment
          </Button>
        )}
        {isLibraryManager && (
          <Button variant="primary" icon="ti-plus" onClick={() => setEditingLibrary(emptyLibraryDraft())}>
            Create New Library
          </Button>
        )}
      </div>

      <Tabs
        tabs={CATALOG_TABS.filter((tb) => !tb.adminOnly || isFullAdmin).map((tb) => ({
          id: tb.id,
          label: tb.label,
          icon: tb.icon,
          count: tb.id === 'curriculum'
            ? visibleCurricula.length
            : tb.id === 'assessment'
            ? visibleAssessments.length
            : tb.id === 'domain-library'
            ? libraries.length
            : tb.id === 'library'
            ? visibleCourses.length
            : tb.includeSections
            ? visibleCourses.filter((c) => tb.includeSections.includes(catalogSectionOf(c))).length
            : visibleCourses.filter((c) => catalogSectionOf(c) === tb.section).length,
        }))}
        activeTab={activeTab}
        onChange={(id) => { setActiveTab(id); setPage(1); }}
      />

      {isCurriculum ? (
        <>
          {/* Curriculum Filter & Search & Group By Bar */}
          {(() => {
            const activeCurriculumFiltersCount = (selectedCurriculumCategory !== 'ALL' ? 1 : 0) + (selectedCurriculumStatus !== 'ALL' ? 1 : 0) + (selectedCurriculumAssignment !== 'ALL' ? 1 : 0);
            return (
              <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                {/* Row 1: Search + Group By + Filters Toggle + View Mode Switcher */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative', flex: '1 1 300px', minWidth: 240 }}>
                    <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                    <input
                      type="text"
                      className="field-input"
                      style={{ paddingLeft: 36, paddingRight: curriculumSearch ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                      placeholder="Search curricula by name, description..."
                      value={curriculumSearch}
                      onChange={(e) => setCurriculumSearch(e.target.value)}
                    />
                    {curriculumSearch && (
                      <button
                        type="button"
                        onClick={() => setCurriculumSearch('')}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
                      >
                        <i className="ti ti-x" />
                      </button>
                    )}
                  </div>

                  {/* Right controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Group By Select */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Group by:</span>
                      <select
                        value={curriculumGroupBy}
                        onChange={(e) => setCurriculumGroupBy(e.target.value)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontSize: 13,
                          fontWeight: curriculumGroupBy !== 'NONE' ? 700 : 500,
                          color: curriculumGroupBy !== 'NONE' ? 'var(--rail)' : 'var(--ink)',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        {CURRICULUM_GROUP_BY_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowCurriculumFilters(!showCurriculumFilters)}
                      className={`btn btn-sm ${activeCurriculumFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
                      style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
                    >
                      <i className="ti ti-filter" />
                      <span>Filters</span>
                      {activeCurriculumFiltersCount > 0 && (
                        <span style={{ background: 'var(--paper-raised)', color: 'var(--rail)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                          {activeCurriculumFiltersCount}
                        </span>
                      )}
                      <i className={`ti ${showCurriculumFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
                    </button>

                    {/* View Mode Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
                      <button
                        type="button"
                        onClick={() => setCurriculumViewMode('GRID')}
                        className={`btn btn-sm ${curriculumViewMode === 'GRID' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                        title="Grid View"
                      >
                        <i className="ti ti-layout-grid" />
                        <span>Grid</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurriculumViewMode('TABLE')}
                        className={`btn btn-sm ${curriculumViewMode === 'TABLE' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                        title="List View"
                      >
                        <i className="ti ti-list" />
                        <span>Table</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Filter Grid with Top Labels */}
                {showCurriculumFilters && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
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
                            background: selectedCurriculumCategory !== 'ALL' ? 'var(--rail-soft)' : 'var(--paper)',
                            borderColor: selectedCurriculumCategory !== 'ALL' ? 'var(--rail)' : 'var(--line)',
                            color: selectedCurriculumCategory !== 'ALL' ? 'var(--rail-soft-text)' : 'var(--ink)',
                            fontWeight: selectedCurriculumCategory !== 'ALL' ? 700 : 500,
                          }}
                          value={selectedCurriculumCategory}
                          onChange={(e) => setSelectedCurriculumCategory(e.target.value)}
                        >
                          <option value="ALL">All areas ({companyCategories.length})</option>
                          {companyCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Filter 2: Status */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                          Publication Status
                        </label>
                        <select
                          className="field-select"
                          style={{
                            width: '100%',
                            height: 38,
                            fontSize: 13,
                            borderRadius: 6,
                            background: selectedCurriculumStatus !== 'ALL' ? 'var(--rail-soft)' : 'var(--paper)',
                            borderColor: selectedCurriculumStatus !== 'ALL' ? 'var(--rail)' : 'var(--line)',
                            color: selectedCurriculumStatus !== 'ALL' ? 'var(--rail-soft-text)' : 'var(--ink)',
                            fontWeight: selectedCurriculumStatus !== 'ALL' ? 700 : 500,
                          }}
                          value={selectedCurriculumStatus}
                          onChange={(e) => setSelectedCurriculumStatus(e.target.value)}
                        >
                          <option value="ALL">All statuses</option>
                          <option value="PUBLISHED">Published</option>
                          <option value="DRAFT">Draft</option>
                        </select>
                      </div>

                      {/* Filter 3: Allocation */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                          Allocated Audience
                        </label>
                        <select
                          className="field-select"
                          style={{
                            width: '100%',
                            height: 38,
                            fontSize: 13,
                            borderRadius: 6,
                            background: selectedCurriculumAssignment !== 'ALL' ? 'var(--rail-soft)' : 'var(--paper)',
                            borderColor: selectedCurriculumAssignment !== 'ALL' ? 'var(--rail)' : 'var(--line)',
                            color: selectedCurriculumAssignment !== 'ALL' ? 'var(--rail-soft-text)' : 'var(--ink)',
                            fontWeight: selectedCurriculumAssignment !== 'ALL' ? 700 : 500,
                          }}
                          value={selectedCurriculumAssignment}
                          onChange={(e) => setSelectedCurriculumAssignment(e.target.value)}
                        >
                          <option value="ALL">All allocations</option>
                          <option value="ASSIGNED">Allocated</option>
                          <option value="UNASSIGNED">Not allocated</option>
                        </select>
                      </div>
                    </div>

                    {/* Active Filter Summary Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        Display <strong>{filteredCurricula.length}</strong> / {visibleCurricula.length} curriculum
                      </div>
                      {(curriculumSearch || activeCurriculumFiltersCount > 0 || curriculumGroupBy !== 'NONE') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="ti-x"
                          style={{ fontSize: 12, color: 'var(--rust)' }}
                          onClick={() => {
                            setCurriculumSearch('');
                            setSelectedCurriculumCategory('ALL');
                            setSelectedCurriculumStatus('ALL');
                            setSelectedCurriculumAssignment('ALL');
                            setCurriculumGroupBy('NONE');
                          }}
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Curriculum Content: Grouped or Flat */}
          {curriculumGroups ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {curriculumGroups.map((g) => {
                const collapsed = collapsedCurriculumGroups.has(g.key);
                return (
                  <div key={g.key} className="card" style={{ overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => toggleCurriculumGroup(g.key)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: 'var(--paper-sunken)',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)' }}>
                        <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} aria-hidden="true" />
                        {g.icon && <i className={`ti ${g.icon}`} aria-hidden="true" />}
                        <span>{g.label}</span>
                        <Badge tone="slate">{g.items.length}</Badge>
                      </span>
                    </button>
                    {!collapsed && (
                      <div style={{ padding: curriculumViewMode === 'GRID' ? 14 : 0 }}>
                        {curriculumViewMode === 'GRID' ? renderCurriculumGrid(g.items) : renderCurriculumTable(g.items)}
                      </div>
                    )}
                  </div>
                );
              })}
              {curriculumGroups.length === 0 && (
                <div className="empty-state">
                  <i className="ti ti-books" aria-hidden="true" />
                  <p>No curriculum matches the filters.</p>
                </div>
              )}
            </div>
          ) : (
            curriculumViewMode === 'GRID' ? renderCurriculumGrid(filteredCurricula) : renderCurriculumTable(filteredCurricula)
          )}
        </>
      ) : isAssessment ? (
        <>
          {/* Assessment Filter & Search Bar */}
          {(() => {
            const activeAssessmentFiltersCount = (selectedAssessmentCategory !== 'ALL' ? 1 : 0) + (selectedAssessmentType !== 'ALL' ? 1 : 0) + (selectedAssessmentFormat !== 'ALL' ? 1 : 0) + (selectedAssessmentStatus !== 'ALL' ? 1 : 0);
            return (
              <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                {/* Row 1: Search + Group By + Filters Toggle */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative', flex: '1 1 300px', minWidth: 240 }}>
                    <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                    <input
                      type="text"
                      className="field-input"
                      style={{ paddingLeft: 36, paddingRight: assessmentSearch ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                      placeholder="Search assessments by name, exam code..."
                      value={assessmentSearch}
                      onChange={(e) => setAssessmentSearch(e.target.value)}
                    />
                    {assessmentSearch && (
                      <button
                        type="button"
                        onClick={() => setAssessmentSearch('')}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
                      >
                        <i className="ti ti-x" />
                      </button>
                    )}
                  </div>

                  {/* Right controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Group By Select */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Group by:</span>
                      <select
                        value={assessmentGroupBy}
                        onChange={(e) => setAssessmentGroupBy(e.target.value)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontSize: 13,
                          fontWeight: assessmentGroupBy !== 'NONE' ? 700 : 500,
                          color: assessmentGroupBy !== 'NONE' ? 'var(--rail)' : 'var(--ink)',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        {ASSESSMENT_GROUP_BY_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowAssessmentFilters(!showAssessmentFilters)}
                      className={`btn btn-sm ${activeAssessmentFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
                      style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
                    >
                      <i className="ti ti-filter" />
                      <span>Filters</span>
                      {activeAssessmentFiltersCount > 0 && (
                        <span style={{ background: 'var(--paper-raised)', color: 'var(--rail)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                          {activeAssessmentFiltersCount}
                        </span>
                      )}
                      <i className={`ti ${showAssessmentFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
                    </button>
                  </div>
                </div>

                {/* Row 2: Filter Grid with Top Labels */}
                {showAssessmentFilters && (
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
                            background: selectedAssessmentCategory !== 'ALL' ? 'var(--rail-soft)' : 'var(--paper)',
                            borderColor: selectedAssessmentCategory !== 'ALL' ? 'var(--rail)' : 'var(--line)',
                            color: selectedAssessmentCategory !== 'ALL' ? 'var(--rail-soft-text)' : 'var(--ink)',
                            fontWeight: selectedAssessmentCategory !== 'ALL' ? 700 : 500,
                          }}
                          value={selectedAssessmentCategory}
                          onChange={(e) => setSelectedAssessmentCategory(e.target.value)}
                        >
                          <option value="ALL">All areas ({companyCategories.length})</option>
                          {companyCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Filter 2: Type */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                          Type
                        </label>
                        <select
                          className="field-select"
                          style={{
                            width: '100%',
                            height: 38,
                            fontSize: 13,
                            borderRadius: 6,
                            background: selectedAssessmentType !== 'ALL' ? 'var(--rail-soft)' : 'var(--paper)',
                            borderColor: selectedAssessmentType !== 'ALL' ? 'var(--rail)' : 'var(--line)',
                            color: selectedAssessmentType !== 'ALL' ? 'var(--rail-soft-text)' : 'var(--ink)',
                            fontWeight: selectedAssessmentType !== 'ALL' ? 700 : 500,
                          }}
                          value={selectedAssessmentType}
                          onChange={(e) => setSelectedAssessmentType(e.target.value)}
                        >
                          <option value="ALL">All types</option>
                          <option value={ASSESSMENT_TYPES.QUIZ}>📝 Quiz</option>
                          <option value={ASSESSMENT_TYPES.ASSIGNMENT}>📂 Assignment</option>
                          <option value={ASSESSMENT_TYPES.SURVEY}>📊 Survey</option>
                        </select>
                      </div>

                      {/* Filter 3: Format */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                          Delivery Format
                        </label>
                        <select
                          className="field-select"
                          style={{
                            width: '100%',
                            height: 38,
                            fontSize: 13,
                            borderRadius: 6,
                            background: selectedAssessmentFormat !== 'ALL' ? 'var(--rail-soft)' : 'var(--paper)',
                            borderColor: selectedAssessmentFormat !== 'ALL' ? 'var(--rail)' : 'var(--line)',
                            color: selectedAssessmentFormat !== 'ALL' ? 'var(--rail-soft-text)' : 'var(--ink)',
                            fontWeight: selectedAssessmentFormat !== 'ALL' ? 700 : 500,
                          }}
                          value={selectedAssessmentFormat}
                          onChange={(e) => setSelectedAssessmentFormat(e.target.value)}
                        >
                          <option value="ALL">All types</option>
                          <option value={DELIVERY_FORMATS.STANDALONE}>🎯 Standalone</option>
                          <option value={DELIVERY_FORMATS.COURSE_LINKED}>🔗 Linked Course</option>
                        </select>
                      </div>

                      {/* Filter 4: Status (Full Admin) */}
                      {isFullAdmin && (
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                            Status
                          </label>
                          <select
                            className="field-select"
                            style={{
                              width: '100%',
                              height: 38,
                              fontSize: 13,
                              borderRadius: 6,
                              background: selectedAssessmentStatus !== 'ALL' ? 'var(--rail-soft)' : 'var(--paper)',
                              borderColor: selectedAssessmentStatus !== 'ALL' ? 'var(--rail)' : 'var(--line)',
                              color: selectedAssessmentStatus !== 'ALL' ? 'var(--rail-soft-text)' : 'var(--ink)',
                              fontWeight: selectedAssessmentStatus !== 'ALL' ? 700 : 500,
                            }}
                            value={selectedAssessmentStatus}
                            onChange={(e) => setSelectedAssessmentStatus(e.target.value)}
                          >
                            <option value="ALL">All statuses</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="DRAFT">Draft</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Active Filter Summary Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        Display <strong>{filteredAssessments.length}</strong> / {visibleAssessments.length} assessments
                      </div>
                      {(assessmentSearch || activeAssessmentFiltersCount > 0 || assessmentGroupBy !== 'NONE') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="ti-x"
                          style={{ fontSize: 12, color: 'var(--rust)' }}
                          onClick={() => {
                            setAssessmentSearch('');
                            setSelectedAssessmentCategory('ALL');
                            setSelectedAssessmentType('ALL');
                            setSelectedAssessmentFormat('ALL');
                            setSelectedAssessmentStatus('ALL');
                            setAssessmentGroupBy('NONE');
                          }}
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Assessment List / Grouped View */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {assessmentGroups.map((grp) => {
              const isCollapsed = collapsedAssessmentGroups.has(grp.id);

              return (
                <div key={grp.id}>
                  {assessmentGroupBy !== 'NONE' && (
                    <button
                      type="button"
                      onClick={() => toggleAssessmentGroup(grp.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: 'var(--paper-sunken)',
                        padding: '10px 14px',
                        borderRadius: 8,
                        marginBottom: 10,
                        border: '1px solid var(--line)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                        <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} />
                        <span>{grp.title}</span>
                      </div>
                      <Badge tone="sage" size="sm">{grp.items.length} exam</Badge>
                    </button>
                  )}

                  {!isCollapsed && (
                    <div className="grid grid-3" style={{ gap: 14 }}>
                      {grp.items.map((asm) => {
                        const access = getAssessmentAccess(asm, currentUser, courses);
                        const isOwner = isFullAdmin || (role === 'trainer' && asm.createdBy === currentUser?.userId);
                        const asgCount = (asm.assignments || []).length;
                        const asgSummary = asm.assignments && asm.assignments.length > 0
                          ? asm.assignments.map((a) => a.targetName).join(', ')
                          : 'Not allocated';

                        const typesList = asm.types || (asm.type ? [asm.type] : ['QUIZ']);
                        const catsList = asm.categories || (asm.category ? [asm.category] : ['General']);
                        const qTypes = asm.questionTypesList || [];

                        return (
                          <div
                            key={asm.id}
                            className="card card-pad"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              borderColor: !access.canTake && !isOwner ? 'var(--line)' : undefined,
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                                    {asm.title}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                                    {asm.code}
                                  </div>
                                </div>
                                <Badge tone={asm.status === 'PUBLISHED' ? 'sage' : 'rail'}>
                                  {asm.status}
                                </Badge>
                              </div>

                              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, minHeight: 34 }}>
                                {asm.description || 'No detailed description yet.'}
                              </div>

                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8, fontSize: 11 }}>
                                {catsList.map((c) => (
                                  <Badge key={c} tone="slate" size="sm">{c}</Badge>
                                ))}
                                {typesList.map((t) => (
                                  <Badge key={t} tone={t === 'QUIZ' ? 'sage' : t === 'ASSIGNMENT' ? 'amber' : 'rail'} size="sm">
                                    {t}
                                  </Badge>
                                ))}
                                <Badge tone={asm.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? 'sage' : 'slate'} size="sm">
                                  {asm.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? '🎯 Standalone' : '🔗 Link A Course'}
                                </Badge>
                                {(asm.contentFormats || (asm.contentFormat ? [asm.contentFormat] : [])).map((fmt) => (
                                  <Badge key={fmt} tone="blue" size="sm">
                                    {fmt === 'UPLOAD_DOC' ? '📄 Essay Paper File' : fmt === 'SCORM_PACKAGE' ? '📦 SCORM' : fmt === 'GOOGLE_FORM' ? '🔗 Form Online' : '💡 Question Bank'}
                                  </Badge>
                                ))}
                              </div>

                              {/* Question Types breakdown */}
                              {qTypes.length > 0 && (
                                <div style={{ fontSize: 11, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '5px 8px', borderRadius: 6, marginBottom: 8 }}>
                                  <i className="ti ti-list-check" style={{ marginRight: 4, color: 'var(--rail)' }} />
                                  <strong>Question types:</strong> {qTypes.join(', ')}
                                </div>
                              )}

                              <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8 }}>
                                <i className="ti ti-clock" style={{ marginRight: 4 }} />
                                {asm.timeLimitMinutes} min &middot; Pass score: {asm.passingScorePercent}% &middot; {(asm.questionIds || []).length} questions
                              </div>

                              {asm.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? (
                                <div style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6, marginBottom: 8 }}>
                                  <i className="ti ti-target" style={{ color: asgCount > 0 ? 'var(--rail)' : 'var(--ink-faint)', marginRight: 5 }} />
                                  <strong>Allocation:</strong> {asgSummary}
                                </div>
                              ) : (
                                <div style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6, marginBottom: 8 }}>
                                  <i className="ti ti-link" style={{ color: 'var(--rail)', marginRight: 5 }} />
                                  <strong>Courses:</strong> {(asm.courseIds || [asm.courseId]).filter(Boolean).join(', ') || asm.courseTitle || 'E-Learning'}
                                </div>
                              )}

                              {!access.canTake && !isOwner && (
                                <div style={{ fontSize: 11, color: 'var(--rust)', background: 'rgba(220,38,38,0.06)', padding: '5px 8px', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <i className="ti ti-lock" />
                                  <span>{access.reason}</span>
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 6 }}>
                              <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setViewingAssessment(asm)}>
                                View Details
                              </Button>

                              {isOwner ? (
                                <>
                                  <Button size="sm" icon="ti-pencil" onClick={() => setEditingAssessment(asm)}>
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    icon="ti-trash"
                                    onClick={() => {
                                      if (window.confirm(`Delete the assessment "${asm.title}"?`)) {
                                        deleteAssessment(asm.id);
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    icon="ti-player-play"
                                    onClick={() => {
                                      if (asm.deliveryFormat === DELIVERY_FORMATS.COURSE_LINKED) {
                                        navigate(`${learnerCourseBasePath}/${asm.courseId}`);
                                      } else {
                                        navigate(`${assessmentPlayerBasePath}/${asm.id}`);
                                      }
                                    }}
                                  >
                                    Try It
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {asm.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? (
                                    access.canTake ? (
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        icon="ti-player-play"
                                        onClick={() => navigate(`${assessmentPlayerBasePath}/${asm.id}`)}
                                      >
                                        Start The Exam
                                      </Button>
                                    ) : (
                                      <Button size="sm" disabled icon="ti-lock">
                                        Not Available To You
                                      </Button>
                                    )
                                  ) : (
                                    access.canTake ? (
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        icon="ti-arrow-right"
                                        onClick={() => navigate(`${learnerCourseBasePath}/${asm.courseId}`)}
                                      >
                                        Open The Course To Take The Exam
                                      </Button>
                                    ) : (
                                      <Button size="sm" disabled icon="ti-lock">
                                        Course Locked
                                      </Button>
                                    )
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredAssessments.length === 0 && (
              <div className="empty-state">
                <i className="ti ti-writing" aria-hidden="true" />
                <p>No assessment matches the filters.</p>
              </div>
            )}
          </div>
        </>
      ) : isLibraryManager ? (
        <>
          <div className="card card-pad" style={{ marginBottom: 16, fontSize: 13, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-folders" style={{ color: 'var(--rail)', fontSize: 16 }} />
            <div>
              <strong>Library</strong> — create the Library yourself, add the <strong>Area</strong> inside it, then assign courses manually to each area for easy lookup. Shown only to <strong>User Admin &amp; System Admin</strong>.
            </div>
          </div>
          <div className="grid grid-3" style={{ gap: 14 }}>
            {libraries.map((lib) => {
              const domainCount = (lib.domains || []).length;
              const courseCount = new Set((lib.domains || []).flatMap((d) => d.courseIds || [])).size;
              return (
                <div key={lib.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', marginBottom: 6 }}>{lib.name || 'Untitled Library'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10, minHeight: 34 }}>{lib.description}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Badge tone="slate" size="sm">{domainCount} Area</Badge>
                      <span>&middot;</span>
                      <span>{courseCount} courses</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                    <Button size="sm" icon="ti-pencil" onClick={() => setEditingLibrary(lib)}>Manager</Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon="ti-trash"
                      onClick={() => { if (window.confirm(`Delete the Library "${lib.name}"? The courses are unaffected.`)) deleteLibrary(lib.id); }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
            {libraries.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <i className="ti ti-folders" aria-hidden="true" />
                <p>No Library yet. Click "Create New Library" to start.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Filter & Search Bar */}
          {(() => {
            const activeCourseFiltersCount = (selectedCategory !== 'ALL' ? 1 : 0) + (selectedType !== 'ALL' ? 1 : 0) + (selectedLifecycle !== 'ALL' ? 1 : 0);
            return (
              <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                {/* Row 1: Search + Group By + Filters Toggle + View Mode Switcher */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative', flex: '1 1 300px', minWidth: 240 }}>
                    <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                    <input
                      type="text"
                      className="field-input"
                      style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                      placeholder={language === 'en' ? 'Search course by title, code, keyword...' : 'Search by course name, code, keyword...'}
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => { setSearch(''); setPage(1); }}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
                      >
                        <i className="ti ti-x" />
                      </button>
                    )}
                  </div>

                  {/* Right controls */}
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
                          color: groupBy !== 'NONE' ? 'var(--rail)' : 'var(--ink)',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        {COURSE_GROUP_BY_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowCourseFilters(!showCourseFilters)}
                      className={`btn btn-sm ${activeCourseFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
                      style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
                    >
                      <i className="ti ti-filter" />
                      <span>Filters</span>
                      {activeCourseFiltersCount > 0 && (
                        <span style={{ background: 'var(--paper-raised)', color: 'var(--rail)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                          {activeCourseFiltersCount}
                        </span>
                      )}
                      <i className={`ti ${showCourseFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
                    </button>

                    {/* View Mode Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
                      <button
                        type="button"
                        onClick={() => setCourseViewMode('TABLE')}
                        className={`btn btn-sm ${courseViewMode === 'TABLE' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                        title="List View"
                      >
                        <i className="ti ti-list" />
                        <span>Table</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCourseViewMode('GRID')}
                        className={`btn btn-sm ${courseViewMode === 'GRID' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                        title="Grid View"
                      >
                        <i className="ti ti-layout-grid" />
                        <span>Grid</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Filter Grid with Top Labels */}
                {showCourseFilters && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
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
                            background: selectedCategory !== 'ALL' ? 'var(--rail-soft)' : 'var(--paper)',
                            borderColor: selectedCategory !== 'ALL' ? 'var(--rail)' : 'var(--line)',
                            color: selectedCategory !== 'ALL' ? 'var(--rail-soft-text)' : 'var(--ink)',
                            fontWeight: selectedCategory !== 'ALL' ? 700 : 500,
                          }}
                          value={selectedCategory}
                          onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                        >
                          <option value="ALL">All areas ({companyCategories.length})</option>
                          {companyCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Filter 2: Course Type */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                          Course Type
                        </label>
                        <select
                          className="field-select"
                          style={{
                            width: '100%',
                            height: 38,
                            fontSize: 13,
                            borderRadius: 6,
                            background: selectedType !== 'ALL' ? 'var(--rail-soft)' : 'var(--paper)',
                            borderColor: selectedType !== 'ALL' ? 'var(--rail)' : 'var(--line)',
                            color: selectedType !== 'ALL' ? 'var(--rail-soft-text)' : 'var(--ink)',
                            fontWeight: selectedType !== 'ALL' ? 700 : 500,
                          }}
                          value={selectedType}
                          onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
                        >
                          <option value="ALL">All types</option>
                          <option value="MANDATORY">Compliance mandatory</option>
                          <option value="OPTIONAL">Advanced optional</option>
                        </select>
                      </div>

                      {/* Filter 3: Lifecycle Status */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                          Lifecycle Status
                        </label>
                        <select
                          className="field-select"
                          style={{
                            width: '100%',
                            height: 38,
                            fontSize: 13,
                            borderRadius: 6,
                            background: selectedLifecycle !== 'ALL' ? 'var(--rail-soft)' : 'var(--paper)',
                            borderColor: selectedLifecycle !== 'ALL' ? 'var(--rail)' : 'var(--line)',
                            color: selectedLifecycle !== 'ALL' ? 'var(--rail-soft-text)' : 'var(--ink)',
                            fontWeight: selectedLifecycle !== 'ALL' ? 700 : 500,
                          }}
                          value={selectedLifecycle}
                          onChange={(e) => { setSelectedLifecycle(e.target.value); setPage(1); }}
                        >
                          <option value="ALL">All statuses</option>
                          {Object.entries(isFullAdmin ? LIFECYCLE_STATUS_META : PERSONAL_LIFECYCLE_STATUS_META).map(([key, meta]) => (
                            <option key={key} value={key}>{meta.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Active Filter Summary Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        Display <strong>{groups ? filtered.length : paginated.length}</strong> / <strong>{filtered.length}</strong> courses
                      </div>
                      {(search || activeCourseFiltersCount > 0 || groupBy !== 'NONE') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="ti-x"
                          style={{ fontSize: 12, color: 'var(--rust)' }}
                          onClick={() => {
                            setSearch('');
                            setSelectedCategory('ALL');
                            setSelectedType('ALL');
                            setSelectedLifecycle('ALL');
                            setGroupBy('NONE');
                            setPage(1);
                          }}
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {groups ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {groups.map((g) => {
                const collapsed = collapsedGroups.has(g.key);
                return (
                  <div key={g.key} className="card" style={{ overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.key)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--paper-sunken)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} aria-hidden="true" />
                        {g.icon && <i className={`ti ${g.icon}`} aria-hidden="true" />} {g.label}
                        <Badge tone="slate">{g.items.length}</Badge>
                      </span>
                    </button>
                    {!collapsed && (
                      courseViewMode === 'GRID'
                        ? <div style={{ padding: 14 }}>{renderCourseGrid(g.items)}</div>
                        : renderCourseTable(g.items)
                    )}
                  </div>
                );
              })}
              {groups.length === 0 && (
                <div className="empty-state"><p>No course matches the filters.</p></div>
              )}
            </div>
          ) : (
            <>
              {courseViewMode === 'GRID' ? renderCourseGrid(paginated) : renderCourseTable(paginated)}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Trang <strong>{page}</strong> / <strong>{totalPages}</strong> ({filtered.length} courses)
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      &larr; Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className="btn btn-sm"
                          style={{
                            background: page === p ? 'var(--rail)' : 'var(--paper-raised)',
                            color: page === p ? '#fff' : 'var(--ink)',
                            borderColor: page === p ? 'var(--rail)' : 'var(--line-strong)',
                            minWidth: 32,
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                      Sau &rarr;
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {viewingCourse && (
        <CourseDetailModal
          course={viewingCourse}
          courses={courses}
          onClose={() => setViewingCourse(null)}
          onEdit={(c) => {
            setViewingCourse(null);
            navigate(`/admin/courses/${c.id}`);
          }}
          isAdmin={isAdmin}
          currentUser={currentUser}
        />
      )}

      {viewingCurriculum && (
        <CurriculumDetailModal
          curriculum={viewingCurriculum}
          courses={courses}
          curricula={curricula}
          onClose={() => setViewingCurriculum(null)}
          onAssign={assignCurriculum}
          onPropose={proposeCurriculumAssignment}
          onRemoveAssignment={removeCurriculumAssignment}
          onEdit={(cur) => {
            setViewingCurriculum(null);
            setEditingCurriculum(cur);
          }}
          isAdmin={isCurriculumAdmin}
          currentUser={currentUser}
          approvals={approvals}
        />
      )}

      {editingCurriculum && (
        <CurriculumEditorModal
          draft={editingCurriculum}
          courses={courses}
          companyCategories={companyCategories}
          certificateTemplates={certificateTemplates}
          onCreateCertificateTemplate={addCertificateTemplate}
          onCancel={() => setEditingCurriculum(null)}
          onSave={saveCurriculum}
        />
      )}

      {editingLibrary && (
        <LibraryEditorModal
          draft={editingLibrary}
          courses={courses}
          companyCategories={companyCategories}
          onCancel={() => setEditingLibrary(null)}
          onSave={saveLibrary}
        />
      )}

      {editingAssessment && (
        <AssessmentEditorModal
          assessment={editingAssessment.id ? editingAssessment : null}
          isOpen={Boolean(editingAssessment)}
          onClose={() => setEditingAssessment(null)}
          onSave={(saved) => {
            if (assessments.some((a) => a.id === saved.id)) {
              updateAssessment(saved.id, saved);
            } else {
              addAssessment(saved);
            }
            setEditingAssessment(null);
          }}
          courses={courses}
          companyCategories={companyCategories}
          questionBanks={questionBanks}
          onAddQuestionToBank={addQuestionToBank}
        />
      )}

      {viewingAssessment && (
        <AssessmentDetailModal
          assessment={viewingAssessment}
          isOpen={Boolean(viewingAssessment)}
          onClose={() => setViewingAssessment(null)}
          attempts={assessmentAttempts}
          questionBanks={questionBanks}
          courses={courses}
          canTake={getAssessmentAccess(viewingAssessment, currentUser, courses).canTake}
          accessReason={getAssessmentAccess(viewingAssessment, currentUser, courses).reason}
          onStartAssessment={() => {
            const targetId = viewingAssessment.id;
            const isCourseLinked = viewingAssessment.deliveryFormat === DELIVERY_FORMATS.COURSE_LINKED;
            const cId = viewingAssessment.courseId;
            setViewingAssessment(null);
            if (isCourseLinked && cId) {
              navigate(`${learnerCourseBasePath}/${cId}`);
            } else {
              navigate(`${assessmentPlayerBasePath}/${targetId}`);
            }
          }}
        />
      )}
    </>
  );
}



function CurriculumDetailModal({
  curriculum: initialCurriculum,
  courses,
  curricula: propCurricula,
  onClose,
  onAssign,
  onPropose,
  onRemoveAssignment,
  onEdit,
  isAdmin: propIsAdmin,
  currentUser: propCurrentUser,
  approvals: propApprovals,
}) {
  const {
    currentUser: storeCurrentUser,
    curricula: storeCurricula,
    assignCurriculum: storeAssign,
    proposeCurriculumAssignment: storePropose,
    removeCurriculumAssignment: storeRemove,
    approvals: storeApprovals,
    myEnrollments,
  } = useCourseStore();

  const currentUser = propCurrentUser || storeCurrentUser;
  const curricula = propCurricula || storeCurricula || [];
  const approvals = propApprovals || storeApprovals || [];
  const handleAssign = onAssign || storeAssign;
  const handlePropose = onPropose || storePropose;
  const handleRemove = onRemoveAssignment || storeRemove;

  const access = curriculumAccessOf(currentUser);
  const { mode: modalMode, canDirectAssign, canPropose, canEdit: isCurriculumAdmin } = access;
  const isHrbp = modalMode === CURRICULUM_ACCESS_MODE.VIEW_ALL;

  const [activeTab, setActiveTab] = useState('tree'); // 'tree' | 'assignments'
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const liveCurriculum = curricula.find((c) => c.id === initialCurriculum.id) || initialCurriculum;
  const assignments = liveCurriculum.assignments || [];

  const pendingProposals = (approvals || []).filter(
    (a) => a.curriculumId === liveCurriculum.id && a.status === 'PENDING'
  );

  function handleSaveAssignment({ assignmentType, targets, dueDate, justification }) {
    if (canDirectAssign) {
      const toAdd = targets.map((t) => ({
        assignmentType,
        targetId: t.targetId,
        targetLabel: t.targetLabel,
        dueDate: dueDate || '',
      }));
      handleAssign(liveCurriculum.id, toAdd);
      setFeedbackMsg(`✅ Curriculum allocated successfully to ${targets.length} audiences!`);
    } else if (isHrbp && handlePropose) {
      targets.forEach((t) => {
        handlePropose(
          liveCurriculum.id,
          {
            assignmentType,
            targetId: t.targetId,
            targetLabel: t.targetLabel,
            dueDate: dueDate || '',
          },
          justification
        );
      });
      setFeedbackMsg(`📋 Sent ${targets.length} curriculum allocation requests to the User Admin for approval!`);
    }

    setShowAssignForm(false);
    setTimeout(() => setFeedbackMsg(null), 5000);
  }

  return (
    <Modal
      isOpen
      title={liveCurriculum.title}
      subtitle={`${liveCurriculum.category || 'General'} · ${(liveCurriculum.courseIds || []).length} courses · ${assignments.length} official audiences · ${pendingProposals.length} pending requests`}
      onClose={onClose}
      size="lg"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <Badge tone={liveCurriculum.status === 'PUBLISHED' ? 'sage' : 'rail'}>
              {liveCurriculum.status === 'PUBLISHED' ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isCurriculumAdmin && (
              <Button size="sm" variant="outline" icon="ti-pencil" onClick={() => onEdit(liveCurriculum)}>
                Edit Curriculum
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.5 }}>
          {liveCurriculum.description}
        </div>
        {modalMode !== CURRICULUM_ACCESS_MODE.ASSIGNED_ONLY && (
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'tree' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('tree')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="ti ti-sitemap" /> Course Structure ({(liveCurriculum.courseIds || []).length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'assignments' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('assignments')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="ti ti-users-group" /> Assigned Audiences ({assignments.length})
              {pendingProposals.length > 0 && (
                <Badge tone="amber" size="sm">{pendingProposals.length} Pending Approval</Badge>
              )}
            </button>
          </div>
        )}
      </div>

      {modalMode === CURRICULUM_ACCESS_MODE.ASSIGNED_ONLY || activeTab === 'tree' ? (
        <CurriculumTree curriculum={liveCurriculum} courses={courses} enrollmentsMap={myEnrollments} />
      ) : (
        <div>
          {feedbackMsg && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--blue-soft)', border: '1px solid #BFDBFE', color: 'var(--blue-soft-text)', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              {feedbackMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {isHrbp
                ? 'HRBP can send the User Admin a request to allocate a curriculum to an employee/sub-department:'
                : 'Allocate the curriculum to a unit or to individual learners required to comply (multi-select supported):'}
            </div>
            {(canDirectAssign || canPropose) && !showAssignForm && (
              <Button size="sm" variant="primary" icon={isHrbp ? 'ti-send' : 'ti-plus'} onClick={() => setShowAssignForm(true)}>
                {isHrbp ? 'Propose A Curriculum (Sent For Approval)' : 'Assign A New Audience'}
              </Button>
            )}
          </div>

          {showAssignForm && (
            <MultiTargetAssigner
              curriculum={liveCurriculum}
              onSave={handleSaveAssignment}
              onCancel={() => setShowAssignForm(false)}
              isHrbp={isHrbp}
            />
          )}

          {pendingProposals.length > 0 && (
            <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: 'var(--amber-soft)', border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber-soft-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-clock" /> Proposals Awaiting User Admin Approval ({pendingProposals.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pendingProposals.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-raised)', padding: '8px 12px', borderRadius: 6, border: '1px solid #FEF3C7', fontSize: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{p.targetLabel}</span>
                      <span style={{ color: 'var(--ink-soft)', marginLeft: 6 }}>({assignmentTypeLabel(p.assignmentType)})</span>
                      {p.justification && (
                        <div style={{ color: 'var(--ink-soft)', fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>
                          Reason: {p.justification}
                        </div>
                      )}
                    </div>
                    <Badge tone="amber" size="sm">Awaiting Approval</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignments.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)', background: 'var(--paper-sunken)', borderRadius: 8 }}>
              <i className="ti ti-target-arrow" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
              No audience has been officially assigned this curriculum yet.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
              <table className="table" style={{ margin: 0, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--paper-sunken)' }}>
                    <th>Classification</th>
                    <th>Assigned Audience Name</th>
                    <th>Deadline</th>
                    <th>Assigned On</th>
                    {isCurriculumAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((asg) => (
                    <tr key={asg.id}>
                      <td>
                        <Badge tone="rail" size="sm">{assignmentTypeLabel(asg.assignmentType)}</Badge>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {asg.targetLabel || resolveTargetLabel(asg.assignmentType, asg.targetId)}
                      </td>
                      <td>
                        {asg.dueDate ? (
                          <span style={{ color: 'var(--ink-soft)' }}>
                            <i className="ti ti-calendar" style={{ marginRight: 4 }} />
                            {asg.dueDate}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)' }}>Unlimited</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--ink-faint)', fontSize: 12 }}>
                        {asg.assignedAt || '—'}
                      </td>
                      {isCurriculumAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            size="sm"
                            variant="danger"
                            icon="ti-trash"
                            onClick={() => {
                              if (window.confirm(`Cancel this curriculum allocation for "${asg.targetLabel || asg.targetId}"?`)) {
                                handleRemove(liveCurriculum.id, asg.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function CourseDetailModal({
  course: initialCourse,
  courses,
  onClose,
  onEdit,
  isAdmin,
  currentUser,
}) {
  const navigate = useNavigate();
  const {
    courses: storeCourses,
    assignCourse,
    removeCourseAssignment,
    accessFor,
  } = useCourseStore();

  const liveCourse = (storeCourses || courses || []).find((c) => c.id === initialCourse.id) || initialCourse;
  const assignments = liveCourse.assignments || (liveCourse.assignment ? [liveCourse.assignment] : []);

  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'assignments'
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const formatBadge = courseFormatBadge(liveCourse);
  const coursePricing = pricingOf(liveCourse);
  const targetLevels = liveCourse.targetLevels && liveCourse.targetLevels.length > 0
    ? liveCourse.targetLevels
    : liveCourse.targetLevel ? [liveCourse.targetLevel] : ['7'];

  // Personal Learner Access for currentUser
  const myAccess = useMemo(() => {
    if (!accessFor || !currentUser) return { canAccess: true, state: ACCESS_STATE.OPEN };
    return accessFor(liveCourse, currentUser);
  }, [accessFor, liveCourse, currentUser]);

  function handleSaveAssignment({ assignmentType, targets, dueDate, justification, groupPolicy, assignedLevelEligibility }) {
    const toAdd = targets.map((t) => ({
      assignmentType,
      targetId: t.targetId,
      targetLabel: t.targetLabel,
      dueDate: dueDate || '',
      justification: justification || '',
      groupPolicy: groupPolicy || 'ELIGIBLE_ONLY',
      assignedLevelEligibility,
    }));
    assignCourse(liveCourse.id, toAdd);
    setFeedbackMsg(`✅ Course allocated successfully to ${targets.length} audiences!`);
    setShowAssignForm(false);
    setTimeout(() => setFeedbackMsg(null), 5000);
  }

  return (
    <Modal
      isOpen
      title={liveCourse.title}
      subtitle={`${liveCourse.code} · ${liveCourse.category || liveCourse.domain || 'General'} · Version ${liveCourse.version || 'v1.0'} · ${assignments.length} assigned audiences`}
      onClose={onClose}
      size="lg"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Badge tone={formatBadge.tone}>{formatBadge.icon} {formatBadge.label}</Badge>
            <Badge tone={STATUS_TONE[liveCourse.status]}>{liveCourse.status || 'PUBLISHED'}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {myAccess.canAccess ? (
              <Button
                size="sm"
                variant="primary"
                icon="ti-player-play"
                onClick={() => {
                  onClose();
                  navigate(`/learner/courses/${liveCourse.id}`);
                }}
              >
                🚀 Open The Lesson (Learner Mode)
              </Button>
            ) : myAccess.state === ACCESS_STATE.REQUESTABLE ? (
              <Button
                size="sm"
                variant="outline"
                icon="ti-send"
                onClick={() => {
                  onClose();
                  navigate(`/learner/courses/${liveCourse.id}`);
                }}
              >
                ⚠️ Request A Level Skip
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled
                icon="ti-lock"
                title={myAccess.reason}
              >
                🔒 Course Above Your Level
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" variant="outline" icon="ti-pencil" onClick={() => onEdit(liveCourse)}>
                Edit (Builder)
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'info' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('info')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="ti ti-info-circle" /> Details &amp; Content
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'assignments' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('assignments')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="ti ti-users-group" /> Assigned Audiences ({assignments.length})
          </button>
        </div>
      </div>

      {activeTab === 'info' ? (
        <div>
          {/* Header Banner */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, background: 'var(--paper-sunken)', padding: 14, borderRadius: 8, border: '1px solid var(--line)' }}>
            <img
              src={getCourseImage(liveCourse)}
              alt={liveCourse.title}
              style={{ width: 100, height: 100, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--line)' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>{liveCourse.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>{liveCourse.description}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
                <span><strong>Duration:</strong> {liveCourse.estimatedDuration || liveCourse.estimatedHours || '2h'}</span>
                <span>&middot;</span>
                <span><strong>Target job level:</strong> {targetLevels.map((l) => `Level ${l}`).join(', ')}</span>
                <span>&middot;</span>
                <span><strong>Course type:</strong> <CourseTypeBadge courseType={liveCourse.courseType} /></span>
                <span>&middot;</span>
                <span>
                  <strong>Tuition:</strong>{' '}
                  {coursePricing.isFree ? (
                    <Badge tone="sage" icon="ti-gift" size="sm">Free</Badge>
                  ) : (
                    <Badge tone="amber" icon="ti-coin" size="sm">{formatVnd(coursePricing.price)} / learner</Badge>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Personal Learning Status Banner for Current User */}
          {myAccess.canAccess ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                border: '1px solid #86EFAC',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--sage-soft-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-circle-check" /> You Are Eligible For This Course
                </div>
                <div style={{ fontSize: 12, color: 'var(--sage-soft-text)', marginTop: 2 }}>
                  {myAccess.reason || `Requirement: Level ${targetLevels.join(', ')} · Your current level: Level ${currentUser?.level || 7} (${Number(currentUser?.level || 7) <= Math.max(...targetLevels.map(Number)) ? 'Correct level / higher level' : 'Directly assigned'})`}
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon="ti-player-play"
                onClick={() => {
                  onClose();
                  navigate(`/learner/courses/${liveCourse.id}`);
                }}
              >
                🚀 Start Learning (Learner Mode)
              </Button>
            </div>
          ) : myAccess.state === ACCESS_STATE.REQUESTABLE ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--blue-soft)',
                border: '1px solid #BFDBFE',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-lock" /> Course One Grade Above (a request is required)
                </div>
                <div style={{ fontSize: 12, color: 'var(--blue-soft-text)', marginTop: 2 }}>
                  {myAccess.reason}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                icon="ti-send"
                onClick={() => {
                  onClose();
                  navigate(`/learner/courses/${liveCourse.id}`);
                }}
              >
                ⚠️ Submit A Level Skip Request
              </Button>
            </div>
          ) : myAccess.state === ACCESS_STATE.PENDING_APPROVAL ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--amber-soft)',
                border: '1px solid #FDE68A',
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--amber-soft-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-clock" /> Level Skip Requests Awaiting Approval
              </div>
              <div style={{ fontSize: 12, color: 'var(--amber-soft-text)', marginTop: 2 }}>
                {myAccess.reason}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--rust-soft)',
                border: '1px solid #FECACA',
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rust-soft-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-ban" /> Course Above Your Level — Access Locked
              </div>
              <div style={{ fontSize: 12, color: 'var(--rust-soft-text)', marginTop: 2 }}>
                {myAccess.reason || `This course requires Level ${targetLevels.join(', ')} — you are at Level ${currentUser?.level || 7} (${myAccess.gap || 2} grades away). You must complete the level roadmap first.`}
              </div>
            </div>
          )}

          {/* Module / Logistics Content */}
          {liveCourse.onlineClassType === 'VIRTUAL_CLASS' ? (
            <div className="card card-pad" style={{ background: 'var(--amber-soft)', borderColor: '#FDE68A' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--amber-soft-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-broadcast" /> Live Online Class Details
              </div>
              <div className="grid grid-2" style={{ gap: 10, fontSize: 13 }}>
                <div><strong>Platform:</strong> {liveCourse.virtualMeeting?.platform || 'Microsoft Teams'}</div>
                <div><strong>Hosting trainer:</strong> {liveCourse.virtualMeeting?.instructorName || 'Not assigned'}</div>
                <div><strong>Schedule:</strong> {liveCourse.virtualMeeting?.scheduleDate || '—'} ({liveCourse.virtualMeeting?.scheduleTime || '—'})</div>
                <div><strong>Meeting link:</strong> <a href={liveCourse.virtualMeeting?.meetingUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>{liveCourse.virtualMeeting?.meetingUrl || '—'}</a></div>
              </div>
            </div>
          ) : (liveCourse.deliveryType === 'IN_PERSON_CLASSROOM' || liveCourse.modality === 'CLASSROOM_LAB') ? (
            <div className="card card-pad" style={{ background: 'var(--blue-soft)', borderColor: '#BFDBFE' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue-soft-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-school" /> In-Person Workshop Training Details
              </div>
              <div className="grid grid-2" style={{ gap: 10, fontSize: 13 }}>
                <div><strong>Lead trainer:</strong> {liveCourse.trainerName || liveCourse.instructor || 'Not assigned'}</div>
                {((liveCourse.coTrainers && liveCourse.coTrainers.length > 0) || (liveCourse.coTrainerNames && liveCourse.coTrainerNames.length > 0)) && (
                  <div style={{ gridColumn: '1 / -1', background: 'var(--blue-soft)', padding: '6px 10px', borderRadius: 6, color: 'var(--blue-soft-text)' }}>
                    <i className="ti ti-users" style={{ marginRight: 6 }} />
                    <strong>Co-trainers / teaching assistants:</strong> {liveCourse.coTrainerNames?.join(', ') || liveCourse.coTrainers.map(t => t.fullName || t.name).join(', ')}
                  </div>
                )}
                <div><strong>Venue / workshop:</strong> {liveCourse.venue || 'Fresh Food & Bakery Lab'}</div>
                <div><strong>Training schedule:</strong> {liveCourse.scheduleDate || '2026-08-28'} ({liveCourse.scheduleTime || '08:30 - 11:30'})</div>
                <div><strong>Capacity:</strong> {liveCourse.maxCapacity || 25} learners &middot; Live QR Attendance</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 10 }}>
                Module &amp; Lesson Structure ({liveCourse.modules?.length || 2} modules)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(liveCourse.modules || [{ id: 'm1', title: 'Module 1: Content overview', lessons: [] }]).map((m, idx) => (
                  <div key={m.id || idx} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', background: 'var(--paper-raised)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
                      {idx + 1}. {m.title}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 12 }}>
                      {(m.lessons || []).map((l, lIdx) => (
                        <div key={l.id || lIdx} style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className={`ti ${l.lessonType === 'VIDEO' ? 'ti-video' : l.lessonType === 'SCORM' ? 'ti-package' : l.lessonType === 'PPT' ? 'ti-presentation' : l.lessonType === 'ASSESSMENT' ? 'ti-writing' : 'ti-file-text'}`} />
                          <span>{l.title}</span>
                          <Badge tone="slate" size="sm">{l.lessonType || 'E-Learning'}</Badge>
                        </div>
                      ))}
                      {(!m.lessons || m.lessons.length === 0) && (
                        <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Includes online learning material, interactive slides and real-world video.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {feedbackMsg && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--blue-soft)', border: '1px solid #BFDBFE', color: 'var(--blue-soft-text)', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              {feedbackMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Allocate the mandatory course to a BU, Division, Department, Sub-Dept, Store or to specific employees (multi-select):
            </div>
            {isAdmin && !showAssignForm && (
              <Button size="sm" variant="primary" icon="ti-plus" onClick={() => setShowAssignForm(true)}>
                Assign A New Audience
              </Button>
            )}
          </div>

          {showAssignForm && (
            <MultiTargetAssigner
              course={liveCourse}
              onSave={handleSaveAssignment}
              onCancel={() => setShowAssignForm(false)}
            />
          )}

          {assignments.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)', background: 'var(--paper-sunken)', borderRadius: 8 }}>
              <i className="ti ti-target-arrow" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
              No audience has been assigned this course. Click "Assign A New Audience" to allocate it.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
              <table className="table" style={{ margin: 0, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--paper-sunken)' }}>
                    <th>Classification</th>
                    <th>Assigned Audience Name</th>
                    <th>Deadline</th>
                    <th>Assigned On</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((asg, index) => (
                    <tr key={asg.id || index}>
                      <td>
                        <Badge tone="rail" size="sm">{assignmentTypeLabel(asg.assignmentType)}</Badge>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {asg.targetLabel || resolveTargetLabel(asg.assignmentType, asg.targetId)}
                      </td>
                      <td>
                        {asg.dueDate ? (
                          <span style={{ color: 'var(--ink-soft)' }}>
                            <i className="ti ti-calendar" style={{ marginRight: 4 }} />
                            {asg.dueDate}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)' }}>Unlimited</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--ink-faint)', fontSize: 12 }}>
                        {asg.assignedAt || '—'}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            size="sm"
                            variant="danger"
                            icon="ti-trash"
                            onClick={() => {
                              if (window.confirm(`Cancel this course allocation for "${asg.targetLabel || asg.targetId}"?`)) {
                                removeCourseAssignment(liveCourse.id, asg.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function CurriculumEditorModal({ draft, courses, companyCategories, certificateTemplates = [], onCreateCertificateTemplate, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    ...draft,
    category: draft.category || companyCategories[0] || 'Store Operations',
    assignments: draft.assignments || [],
    certificateTemplateId: draft.certificateTemplateId || null,
  }));

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const eLearningCourses = useMemo(() => {
    return (courses || []).filter((c) => {
      // Prefer self-paced online E-Learning courses
      if (c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB') return false;
      if (c.onlineClassType === 'VIRTUAL_CLASS') return false;
      return true;
    });
  }, [courses]);

  function toggleCourse(id) {
    setForm((f) => ({
      ...f,
      courseIds: (f.courseIds || []).includes(id)
        ? (f.courseIds || []).filter((x) => x !== id)
        : [...(f.courseIds || []), id],
    }));
  }

  function removeCourse(id) {
    setForm((f) => ({
      ...f,
      courseIds: (f.courseIds || []).filter((x) => x !== id),
    }));
  }

  // Filter available courses
  const filteredAvailable = eLearningCourses.filter((c) => {
    const matchCat = categoryFilter === 'ALL' || courseMatchesCategory(c, categoryFilter);
    const matchLevel = levelFilter === 'ALL' || String(c.targetLevel || c.level || '') === String(levelFilter);
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchLevel && matchSearch;
  });

  function selectAllFiltered() {
    const idsToAdd = filteredAvailable.map((c) => c.id);
    setForm((f) => ({
      ...f,
      courseIds: Array.from(new Set([...f.courseIds, ...idsToAdd])),
    }));
  }

  function clearAllSelected() {
    setForm((f) => ({ ...f, courseIds: [] }));
  }

  const selectedCourses = (form.courseIds || [])
    .map((id) => courses.find((c) => c.id === id))
    .filter(Boolean);

  const totalSelectedHours = selectedCourses.reduce((sum, c) => {
    const h = parseFloat(c.estimatedHours) || 2;
    return sum + h;
  }, 0);

  return (
    <Modal
      isOpen
      title={draft.title ? 'Edit Curriculum' : 'Create Curriculum'}
      subtitle="Build a roadmap curriculum bundling several standardized self-paced E-Learning courses"
      onClose={onCancel}
      size="xl"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            Selected: <strong style={{ color: 'var(--rail)' }}>{form.courseIds.length}</strong> E-Learning courses ({totalSelectedHours.toFixed(1)}h)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button
              variant="primary"
              icon="ti-check"
              disabled={!form.title.trim() || form.courseIds.length === 0}
              onClick={() => onSave(form)}
            >
              Save Curriculum
            </Button>
          </div>
        </div>
      )}
    >
      <div className="grid grid-2" style={{ gap: 14, marginBottom: 12 }}>
        <div>
          <label className="field-label">Curriculum Title <span style={{ color: 'var(--rust)' }}>*</span></label>
          <input
            className="field-input"
            placeholder="E.g. Food Safety Foundation Program"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="field-label">Specialist Area (Category)</label>
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
        <label className="field-label">Curriculum description &amp; training objective</label>
        <textarea
          className="field-input"
          rows={2}
          style={{ resize: 'vertical' }}
          placeholder="Describe the curriculum's objective, target audience and learning outcomes..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={form.status === 'PUBLISHED'}
            onChange={(e) => setForm({ ...form, status: e.target.checked ? 'PUBLISHED' : 'DRAFT' })}
          />
          <span>Publish now (Published - ready to allocate to learners)</span>
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <CertificateTemplatePicker
          templateId={form.certificateTemplateId}
          onChange={(id) => setForm({ ...form, certificateTemplateId: id })}
          certificateTemplates={certificateTemplates}
          companyCategories={companyCategories}
          defaultCategory={form.category}
          onCreateTemplate={onCreateCertificateTemplate}
        />
      </div>

      {/* Course Selection Area */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
            <i className="ti ti-books" style={{ color: 'var(--rail)', marginRight: 6 }} />
            Add E-Learning Courses To The Curriculum
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="outline" onClick={selectAllFiltered}>
              Select all filtered ({filteredAvailable.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={clearAllSelected}>
              Deselect all
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', background: 'var(--paper-sunken)', padding: '10px 12px', borderRadius: 8 }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: 9, color: 'var(--ink-faint)', fontSize: 13 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 28, height: 32, fontSize: 12 }}
              placeholder="Search by course code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="field-select"
            style={{ width: 170, height: 32, fontSize: 12 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All categories ({companyCategories.length})</option>
            {companyCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="field-select"
            style={{ width: 130, height: 32, fontSize: 12 }}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="ALL">All levels</option>
            {['1', '2', '3', '4', '5', '6', '7'].map((lvl) => (
              <option key={lvl} value={lvl}>Level {lvl}</option>
            ))}
          </select>
        </div>

        {/* 2-Column Picker */}
        <div className="grid grid-2" style={{ gap: 14, alignItems: 'start' }}>
          {/* Left Column: Filtered Available E-Learning Courses */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
              <span>E-Learning course list ({filteredAvailable.length})</span>
              <span style={{ color: 'var(--ink-faint)' }}>Tick to add</span>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', padding: 6 }}>
              {filteredAvailable.map((c) => {
                const isSelected = form.courseIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleCourse(c.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 6,
                      marginBottom: 4,
                      background: isSelected ? 'var(--blue-soft, rgba(37,99,235,0.08))' : 'transparent',
                      border: isSelected ? '1px solid var(--blue, #3b82f6)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent div
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600 }}>{c.code}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-soft)' }}>
                        <Badge tone="slate" size="sm">{c.category || 'Store Ops'}</Badge>
                        <span>Lvl {c.targetLevel || c.level || '7'}</span>
                        <span>&middot;</span>
                        <span>{c.estimatedHours || '2h'}</span>
                        <span>&middot;</span>
                        <span>{(c.modules || []).length} modules</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredAvailable.length === 0 && (
                <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
                  No E-Learning course matches the filters.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Courses in Curriculum */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Selected courses ({selectedCourses.length})</span>
              <Badge tone="sage" size="sm">{totalSelectedHours.toFixed(1)} study hours</Badge>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', padding: 6 }}>
              {selectedCourses.map((c, idx) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    marginBottom: 4,
                    background: 'var(--paper-raised)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', width: 16 }}>{idx + 1}.</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.title}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                        {c.code} &middot; {c.estimatedHours || '2h'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCourse(c.id);
                    }}
                    className="btn btn-sm"
                    style={{ padding: '2px 6px', color: 'var(--rust)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}
                    title="Remove this course"
                  >
                    <i className="ti ti-x" />
                  </button>
                </div>
              ))}
              {selectedCourses.length === 0 && (
                <div style={{ padding: '30px 12px', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
                  <i className="ti ti-books" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
                  No course has been added to the curriculum yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// A one-shot editor for the Library: name/description + add areas (each bound to an existing category)
// + assigning courses to each area all operate on local state (nothing is written
// store); it commits once when "Save Library" is pressed (through onSave, exactly like
// CurriculumEditorModal) — shared by both creating and editing an existing Library,
// so the whole set of areas + courses is "built" in a single modal session.
export function LibraryEditorModal({ draft, courses, companyCategories, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...draft, domains: draft.domains || [] }));
  const domains = form.domains;

  const [addingDomainCategory, setAddingDomainCategory] = useState('');
  const [openPickerFor, setOpenPickerFor] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSelected, setPickerSelected] = useState([]);

  const usedCategories = new Set(domains.map((d) => d.category));
  const availableCategories = companyCategories.filter((c) => !usedCategories.has(c));
  const totalCourses = new Set(domains.flatMap((d) => d.courseIds || [])).size;

  function setDomains(nextDomains) {
    setForm((f) => ({ ...f, domains: nextDomains }));
  }

  function addDomain() {
    if (!addingDomainCategory) return;
    setDomains([...domains, { id: `DOM-${Date.now()}`, category: addingDomainCategory, courseIds: [] }]);
    setAddingDomainCategory('');
  }

  function removeDomain(domainId) {
    if (!window.confirm('Remove this area from the Library? The courses inside are unaffected.')) return;
    setDomains(domains.filter((d) => d.id !== domainId));
    if (openPickerFor === domainId) setOpenPickerFor(null);
  }

  function removeCourseFromDomain(domainId, courseId) {
    setDomains(domains.map((d) => (d.id === domainId ? { ...d, courseIds: (d.courseIds || []).filter((id) => id !== courseId) } : d)));
  }

  function openPicker(domainId) {
    setOpenPickerFor(domainId === openPickerFor ? null : domainId);
    setPickerSearch('');
    setPickerSelected([]);
  }

  function togglePickerCourse(id) {
    setPickerSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function confirmAddCourses(domainId) {
    setDomains(domains.map((d) => (d.id === domainId ? { ...d, courseIds: Array.from(new Set([...(d.courseIds || []), ...pickerSelected])) } : d)));
    setOpenPickerFor(null);
    setPickerSelected([]);
    setPickerSearch('');
  }

  return (
    <Modal
      isOpen
      title={draft.name ? 'Edit Library' : 'Create New Library'}
      subtitle={`${domains.length} areas · ${totalCourses} courses — add areas & courses, then click Save to create them all at once`}
      onClose={onCancel}
      size="xl"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
            {domains.length} Area &middot; {totalCourses} courses assigned
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" icon="ti-check" disabled={!form.name.trim()} onClick={() => onSave(form)}>
              Save Library
            </Button>
          </div>
        </div>
      )}
    >
      <div className="grid grid-2" style={{ gap: 14, marginBottom: 16 }}>
        <div>
          <label className="field-label">Library Name <span style={{ color: 'var(--rust)' }}>*</span></label>
          <input
            className="field-input"
            placeholder="E.g. Hard Skills Library"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="field-label">Description</label>
          <input
            className="field-input"
            placeholder="The purpose & scope of this Library..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {domains.map((d) => {
          const domainCourses = (d.courseIds || []).map((id) => courses.find((c) => c.id === id)).filter(Boolean);
          const isPickerOpen = openPickerFor === d.id;
          const q = pickerSearch.toLowerCase();
          const pickerCandidates = courses.filter((c) => {
            if ((d.courseIds || []).includes(c.id)) return false;
            return !q || c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
          });

          return (
            <div key={d.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--paper-sunken)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge tone="rail" icon="ti-tag">{d.category}</Badge>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{domainCourses.length} courses</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeDomain(d.id)}
                  className="btn btn-sm"
                  style={{ background: 'transparent', border: 'none', color: 'var(--rust)', cursor: 'pointer' }}
                  title="Remove Area"
                >
                  <i className="ti ti-trash" />
                </button>
              </div>

              <div style={{ padding: '10px 14px' }}>
                {domainCourses.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', marginRight: 6 }}>{c.code}</span>
                      {c.title}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCourseFromDomain(d.id, c.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--rust)', cursor: 'pointer' }}
                      title="Remove from the area"
                    >
                      <i className="ti ti-x" />
                    </button>
                  </div>
                ))}
                {domainCourses.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>No course in this area yet.</div>
                )}

                <Button size="sm" variant="outline" icon="ti-plus" onClick={() => openPicker(d.id)} style={{ marginTop: 8 }}>
                  {isPickerOpen ? 'Close' : 'Add Course'}
                </Button>

                {isPickerOpen && (
                  <div style={{ marginTop: 10, border: '1px solid var(--line)', borderRadius: 8, padding: 10, background: 'var(--paper-sunken)' }}>
                    <input
                      type="text"
                      className="field-input"
                      style={{ height: 32, fontSize: 12, marginBottom: 8 }}
                      placeholder="Search courses by name or code..."
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                    />
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {pickerCandidates.map((c) => {
                        const checked = pickerSelected.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => togglePickerCourse(c.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                              background: checked ? 'var(--blue-soft, rgba(37,99,235,0.08))' : 'transparent',
                            }}
                          >
                            <input type="checkbox" checked={checked} onChange={() => {}} />
                            <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', marginRight: 6 }}>{c.code}</span>
                              {c.title}
                            </div>
                          </div>
                        );
                      })}
                      {pickerCandidates.length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: 8 }}>No matching course.</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <Button size="sm" variant="ghost" onClick={() => setOpenPickerFor(null)}>Cancel</Button>
                      <Button size="sm" variant="primary" disabled={pickerSelected.length === 0} onClick={() => confirmAddCourses(d.id)}>
                        Add {pickerSelected.length || ''} Selected Courses
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {domains.length === 0 && (
          <div className="empty-state"><p>No area yet. Add the first area below.</p></div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <select
            className="field-select"
            style={{ height: 34, fontSize: 12, flex: 1 }}
            value={addingDomainCategory}
            onChange={(e) => setAddingDomainCategory(e.target.value)}
          >
            <option value="">{availableCategories.length ? 'Choose an area to add...' : 'Every existing category has been added'}</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button size="sm" variant="primary" icon="ti-plus" disabled={!addingDomainCategory} onClick={addDomain}>
            Add Area
          </Button>
        </div>
      </div>
    </Modal>
  );
}
