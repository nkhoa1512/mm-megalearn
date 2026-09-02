// Shared Catalog helpers: standardized company category taxonomy, course-code
// auto-generation, date-driven lifecycle status, and the delivery-format /
// group-by logic reused across the admin and learner catalog pages (single
// source of truth — previously duplicated independently in AdminCourses.jsx
// and LearnerCourses.jsx).

import { divisions, departments, subDepartments, retailStores } from '../data/assignmentTargets';
import { levelShortLabel } from '../data/levelSystem';

// ---------------------------------------------------------------------------
// Company Category Taxonomy — seeds CourseStore's admin-manageable
// `companyCategories` list (System Admin & Security can view/add more from
// there; this is only the initial default set, not a hard cap).
// ---------------------------------------------------------------------------
export const DEFAULT_CATEGORY_OBJECTS = [
  {
    id: 'cat-fsh',
    name: 'Food Safety & Hygiene',
    code: 'FSH',
    icon: 'ti-shield-check',
    color: '#10b981',
    description: 'Food hygiene and safety standards, HACCP audits, and the preparation and storage procedures for clean food across MM Mega Market.',
    coverImage: 'https://images.unsplash.com/photo-1577106263724-2c8e03bfe9cf?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-hse',
    name: 'Health & Safety',
    code: 'HSE',
    icon: 'ti-first-aid-kit',
    color: '#ef4444',
    description: 'Occupational safety, protective equipment, first aid and the fire prevention plan for stores and warehouses.',
    coverImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-cold',
    name: 'Cold Chain',
    code: 'COLD',
    icon: 'ti-snowflake',
    color: '#06b6d4',
    description: 'Cold chain management, chiller and deep-freeze temperature monitoring, and fresh food storage standards.',
    coverImage: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-ops',
    name: 'Store Operations',
    code: 'OPS',
    icon: 'ti-building-store',
    color: '#3b82f6',
    description: 'Store operations, POS checkout, retail-standard merchandising and the sales floor shrinkage control process.',
    coverImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-scm',
    name: 'Supply Chain & Logistics',
    code: 'SCM',
    icon: 'ti-truck-delivery',
    color: '#f59e0b',
    description: 'Distribution center warehousing, forklift operation, inter-center stock transfer and last-mile delivery fleet management.',
    coverImage: 'https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-lpqa',
    name: 'Loss Prevention & QA',
    code: 'LPQA',
    icon: 'ti-scan-eye',
    color: '#64748b',
    description: 'Inbound quality control, shrinkage prevention, camera security and MMVN compliance auditing.',
    coverImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-lead',
    name: 'Leadership & Management',
    code: 'LEAD',
    icon: 'ti-users',
    color: '#8b5cf6',
    description: 'Building management capability, team leadership, delegation, coaching and OKR performance planning.',
    coverImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-gov',
    name: 'Corporate Governance',
    code: 'GOV',
    icon: 'ti-gavel',
    color: 'var(--ink-soft)',
    description: 'Corporate governance, operating regulations, sustainable development (ESG) standards and transparent board reporting.',
    coverImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-comp',
    name: 'Compliance & Ethics',
    code: 'COMP',
    icon: 'ti-scale',
    color: '#d97706',
    description: 'The business ethics code of conduct, anti-corruption, conflicts of interest and labour law compliance.',
    coverImage: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-sec',
    name: 'Information Security',
    code: 'SEC',
    icon: 'ti-lock-square-rounded',
    color: '#dc2626',
    description: 'System information security, phishing prevention, customer personal data protection (PDPD) and data encryption.',
    coverImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-cs',
    name: 'Customer Service',
    code: 'CS',
    icon: 'ti-headset',
    color: '#ec4899',
    description: 'The art of communication, resolving customer complaints, B2B/B2C service standards and a culture of service excellence.',
    coverImage: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-merch',
    name: 'Merchandising & Sales',
    code: 'MERCH',
    icon: 'ti-shopping-bag',
    color: '#f97316',
    description: 'Category development strategy, competitive pricing, supplier negotiation and the art of driving sales.',
    coverImage: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-digi',
    name: 'Digital & E-Commerce',
    code: 'DIGI',
    icon: 'ti-device-laptop',
    color: '#6366f1',
    description: 'Omnichannel retail e-commerce, digitalizing operational processes and big data management.',
    coverImage: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-fin',
    name: 'Finance & Accounting',
    code: 'FIN',
    icon: 'ti-calculator',
    color: '#059669',
    description: 'Store financial management, P&L report control, income/expense reconciliation, e-invoicing and internal audit.',
    coverImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-orient',
    name: 'Corporate Orientation',
    code: 'ORIENT',
    icon: 'ti-compass',
    color: '#0284c7',
    description: 'New employee onboarding, MM Mega Market culture, the org structure and the benefits package.',
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-fresh',
    name: 'Fresh Food Practice',
    code: 'FRESH',
    icon: 'ti-leaf',
    color: '#16a34a',
    description: 'Meat butchery technique, seafood processing, organic produce preparation and excellent fresh baking.',
    coverImage: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80',
  },
];

export const DEFAULT_COMPANY_CATEGORIES = DEFAULT_CATEGORY_OBJECTS.map((c) => c.name);

export const CATEGORY_ICON_PRESETS = [
  { id: 'ti-shield-check', label: 'Safety / Shield' },
  { id: 'ti-building-store', label: 'Store' },
  { id: 'ti-leaf', label: 'Food / Fresh' },
  { id: 'ti-truck-delivery', label: 'Warehousing / Logistics' },
  { id: 'ti-snowflake', label: 'Cold Chain / Cold' },
  { id: 'ti-first-aid-kit', label: 'Health & Fire Safety' },
  { id: 'ti-users', label: 'Leadership / Team' },
  { id: 'ti-headset', label: 'Customer / CS' },
  { id: 'ti-shopping-bag', label: 'Retail / Sales' },
  { id: 'ti-device-laptop', label: 'Technology / IT' },
  { id: 'ti-calculator', label: 'Finance / Fin' },
  { id: 'ti-gavel', label: 'Legal / Law' },
  { id: 'ti-scale', label: 'Ethics' },
  { id: 'ti-lock-square-rounded', label: 'Security / Sec' },
  { id: 'ti-compass', label: 'Onboarding / Orientation' },
  { id: 'ti-scan-eye', label: 'Quality / QA' },
  { id: 'ti-certificate', label: 'Certificates' },
  { id: 'ti-chart-bar', label: 'Analytics / Data' },
  { id: 'ti-bulb', label: 'Innovation / Idea' },
  { id: 'ti-books', label: 'Training / Learning' },
  { id: 'ti-briefcase', label: 'Operations' },
  { id: 'ti-award', label: 'Achievement' },
  { id: 'ti-heart-handshake', label: 'Collaboration' },
  { id: 'ti-world', label: 'Global' },
];

export const CATEGORY_COLOR_PRESETS = [
  { value: '#10b981', label: 'Emerald Green', tone: 'sage' },
  { value: '#3b82f6', label: 'Royal Blue', tone: 'blue' },
  { value: '#8b5cf6', label: 'Purple Violet', tone: 'purple' },
  { value: '#f59e0b', label: 'Amber Gold', tone: 'amber' },
  { value: '#ef4444', label: 'Bright Red', tone: 'rust' },
  { value: '#06b6d4', label: 'Cyan Teal', tone: 'teal' },
  { value: '#6366f1', label: 'Indigo Navy', tone: 'indigo' },
  { value: '#ec4899', label: 'Pink Magenta', tone: 'pink' },
  { value: '#f97316', label: 'Vibrant Orange', tone: 'orange' },
  { value: '#64748b', label: 'Slate Gray', tone: 'slate' },
];

export function generateCategoryCode(name = '', existingCodes = []) {
  const clean = stripDiacritics(name)
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  let prefix = words.map((w) => w[0].toUpperCase()).join('').slice(0, 6);
  if (!prefix) prefix = 'CAT';

  const existingSet = new Set((existingCodes || []).map((c) => (c || '').toUpperCase()));
  if (!existingSet.has(prefix)) return prefix;

  let counter = 1;
  while (existingSet.has(`${prefix}${counter}`)) {
    counter++;
  }
  return `${prefix}${counter}`;
}

export function getCategoryMetadata(categoryName, customList = []) {
  if (!categoryName) return null;
  const nameToMatch = typeof categoryName === 'string' ? categoryName : categoryName?.name;
  if (!nameToMatch) return null;

  // Search in custom list first
  const foundInCustom = (customList || []).find((c) => {
    if (typeof c === 'string') return c.toLowerCase() === nameToMatch.toLowerCase();
    return c?.name?.toLowerCase() === nameToMatch.toLowerCase() || c?.id === categoryName?.id;
  });
  if (foundInCustom && typeof foundInCustom === 'object') return foundInCustom;

  // Search in default objects
  const foundInDefault = DEFAULT_CATEGORY_OBJECTS.find(
    (c) => c.name.toLowerCase() === nameToMatch.toLowerCase() || c.id === nameToMatch
  );
  if (foundInDefault) return foundInDefault;

  // Fallback synthetic metadata
  return {
    id: `cat-${stripDiacritics(nameToMatch).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: nameToMatch,
    code: generateCategoryCode(nameToMatch),
    icon: 'ti-folder',
    color: '#3b82f6',
    description: `${nameToMatch} training catalog`,
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
  };
}

export function normalizeCategory(cat, customList = []) {
  if (!cat) return null;
  if (typeof cat === 'object' && cat.name) {
    return {
      id: cat.id || `cat-${stripDiacritics(cat.name).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: cat.name,
      code: cat.code || generateCategoryCode(cat.name),
      icon: cat.icon || 'ti-folder',
      color: cat.color || '#3b82f6',
      description: cat.description || '',
      coverImage: cat.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    };
  }
  return getCategoryMetadata(cat, customList);
}

// A couple of legacy free-text `category` values already present in seed
// course data use shorter wording than the canonical list above.
const LEGACY_CATEGORY_REMAP = {
  'Supply Chain': 'Supply Chain & Logistics',
  Merchandising: 'Merchandising & Sales',
};

export function canonicalizeCategory(raw) {
  if (!raw) return raw;
  return LEGACY_CATEGORY_REMAP[raw] || raw;
}

// ---------------------------------------------------------------------------
// Course Code auto-generation: initials of the (diacritic-stripped) Course
// Name + a random 3-digit suffix guaranteed unique among existing codes.
// e.g. "Food Safety & Hygiene Standards" -> "FSHS-014".
// ---------------------------------------------------------------------------
function stripDiacritics(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function generateCourseCode(courseName, existingCodes = []) {
  const clean = stripDiacritics(courseName)
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  let prefix = words.map((w) => w[0].toUpperCase()).join('').slice(0, 6);
  if (!prefix) prefix = 'CRS';

  const existingSet = new Set((existingCodes || []).map((c) => (c || '').toUpperCase()));
  let candidate = '';
  let attempts = 0;
  do {
    const num = Math.floor(Math.random() * 900) + 10;
    candidate = `${prefix}-${String(num).padStart(3, '0')}`;
    attempts++;
  } while (existingSet.has(candidate) && attempts < 200);
  return candidate;
}

// ---------------------------------------------------------------------------
// Lifecycle status: DRAFT (explicit) / UPCOMING / OPEN / CLOSED, computed from
// `status` + `startDate`/`endDate` rather than stored, so it can never drift
// out of sync with the dates an admin sets in the Builder.
// ---------------------------------------------------------------------------
export const LIFECYCLE_STATUS = { DRAFT: 'DRAFT', UPCOMING: 'UPCOMING', OPEN: 'OPEN', CLOSED: 'CLOSED' };

export function computeLifecycleStatus(course, today = new Date()) {
  if (!course) return LIFECYCLE_STATUS.DRAFT;
  if (course.status === 'DRAFT') return LIFECYCLE_STATUS.DRAFT;
  const now = today instanceof Date ? today : new Date(today);
  const start = course.startDate ? new Date(course.startDate) : null;
  const end = course.endDate ? new Date(course.endDate) : null;
  if (start && now < start) return LIFECYCLE_STATUS.UPCOMING;
  if (end && now > end) return LIFECYCLE_STATUS.CLOSED;
  return LIFECYCLE_STATUS.OPEN;
}

export const LIFECYCLE_STATUS_META = {
  DRAFT: { label: 'Draft', labelEn: 'Draft', tone: 'slate', icon: 'ti-file-pencil' },
  UPCOMING: { label: 'Upcoming', labelEn: 'Upcoming', tone: 'blue', icon: 'ti-clock' },
  OPEN: { label: 'Open', labelEn: 'Open', tone: 'sage', icon: 'ti-circle-check' },
  CLOSED: { label: 'Closed', labelEn: 'Closed', tone: 'rust', icon: 'ti-lock' },
};

// Learner catalog visibility: a CLOSED course is hidden from anyone who never
// enrolled, but stays visible (with continued access) for anyone who did.
export function isCourseVisibleWhenClosed(course) {
  return Boolean(course.enrollment);
}

// ---------------------------------------------------------------------------
// The "personalized" lifecycle status — used in the catalog for Learner, Manager,
// HRBP and Trainer/L&D (every role that is NOT User Admin/SysAdmin). Unlike
// LIFECYCLE_STATUS_META (Draft/Upcoming/Open/Closed — the administration view of
// the course author), these 4 roles care about their PERSONAL relationship with the course
// rather than the pure administrative lifecycle, so once enrolled, the
// real enrollment (Completed / Overdue / in progress) takes display priority
// instead of the vague "Open". Only when they have NEVER enrolled does it fall
// falls back to the course's true lifecycle status (Open / Enrollment Window
// Closed — the same as the Admin's "Closed" but renamed for the learner's
// perspective (learner/manager).
export const PERSONAL_LIFECYCLE_STATUS_META = {
  OPEN: { label: 'Open', labelEn: 'Open', tone: 'sage', icon: 'ti-circle-check' },
  CLOSED: { label: 'Enrollment Window Closed', labelEn: 'Enrollment Window Closed', tone: 'rust', icon: 'ti-lock' },
  JOINED: { label: 'In Progress', labelEn: 'Currently Enrolled', tone: 'blue', icon: 'ti-user-check' },
  OVERDUE: { label: 'Overdue', labelEn: 'Overdue', tone: 'amber', icon: 'ti-alert-triangle' },
  COMPLETED: { label: 'Completed', labelEn: 'Completed', tone: 'rail', icon: 'ti-certificate' },
};

// `course.enrollment` must already be merged onto the course (the real enrollment of the person
// being viewed, not a static field on the course template) before calling this function.
export function personalLifecycleStatusOf(course) {
  const enrollment = course.enrollment;
  if (enrollment) {
    if (enrollment.status === 'COMPLETED') return 'COMPLETED';
    if (enrollment.status === 'OVERDUE') return 'OVERDUE';
    return 'JOINED';
  }
  return computeLifecycleStatus(course) === 'CLOSED' ? 'CLOSED' : 'OPEN';
}

// ---------------------------------------------------------------------------
// Delivery-format badge — the existing 3-way split (🌐 E-Learning / 💻 Live
// Online Class / 🏢 In-Person ILT) that already cleanly maps onto 3 of the 5
// Catalog tabs (Learning Objects / Online Class / Classroom), no new field
// needed on the course object.
// ---------------------------------------------------------------------------
export function courseFormatBadge(c) {
  const isInPerson = c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB';
  if (isInPerson) return { icon: '🏢', label: 'In-Person (ILT)', tone: 'blue' };
  if (c.onlineClassType === 'VIRTUAL_CLASS') return { icon: '💻', label: 'Live Online Class', tone: 'amber' };
  return { icon: '🌐', label: 'E-Learning', tone: 'sage' };
}

export const CATALOG_SECTIONS = {
  LEARNING_OBJECTS: 'LEARNING_OBJECTS',
  ONLINE_CLASS: 'ONLINE_CLASS',
  CLASSROOM: 'CLASSROOM',
};

export function catalogSectionOf(c) {
  if (c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB') return CATALOG_SECTIONS.CLASSROOM;
  if (c.onlineClassType === 'VIRTUAL_CLASS') return CATALOG_SECTIONS.ONLINE_CLASS;
  return CATALOG_SECTIONS.LEARNING_OBJECTS;
}

// ---------------------------------------------------------------------------
// Group By (extended set: original ORG_UNIT/LEVEL/STATUS/MODALITY/DOMAIN from
// the learner catalog, plus CATEGORY/LIFECYCLE_STATUS for the new Library tab).
// ---------------------------------------------------------------------------
export const STATUS_GROUP_META = {
  COMPLETED: { label: 'Completed', icon: 'ti-circle-check' },
  IN_PROGRESS: { label: 'In Progress', icon: 'ti-player-play' },
  NOT_STARTED: { label: 'Not Started', icon: 'ti-circle-dashed' },
  OVERDUE: { label: 'Overdue', icon: 'ti-alert-triangle' },
  FAILED: { label: 'Retake Required', icon: 'ti-reload' },
  NOT_ENROLLED: { label: 'Not Enrolled', icon: 'ti-bookmark-off' },
};

export function courseOrgUnitGroups(c) {
  const asgList = c.assignments && c.assignments.length > 0
    ? c.assignments
    : (c.assignment ? [c.assignment] : []);

  if (asgList.length === 0) {
    return [{ key: 'ELECTIVE', label: 'Optional / Supplementary (Elective)', icon: 'ti-sparkles' }];
  }

  const groups = [];
  asgList.forEach((a) => {
    const targetId = a.targetId || a.targetDivisionId || a.targetDepartmentId || a.targetBusinessUnitId || a.targetStoreId || a.targetAreaId || a.targetClusterId;
    if (a.assignmentType === 'BUSINESS_UNIT' || a.assignmentType === 'ALL_ASSOCIATES') {
      groups.push({ key: 'BU', label: 'Company-Wide Mandatory (MMVN)', icon: 'ti-building-skyscraper' });
    } else if (a.assignmentType === 'DIVISION') {
      const div = divisions.find((d) => d.id === targetId || d.code === targetId);
      const label = a.targetLabel || (div ? `Division ${div.name}` : `Division [${targetId}]`);
      groups.push({ key: `DIV-${targetId}`, label: label.startsWith('Division') ? label : `Division ${label}`, icon: 'ti-building' });
    } else if (a.assignmentType === 'DEPARTMENT') {
      const dept = departments.find((d) => d.id === targetId || d.code === targetId);
      const label = a.targetLabel || (dept ? `Department: ${dept.name}` : `Department: ${targetId}`);
      groups.push({ key: `DEPT-${targetId}`, label: label.startsWith('Department') ? label : `Department: ${label}`, icon: 'ti-building-community' });
    } else if (a.assignmentType === 'SUBDEPARTMENT') {
      const sub = subDepartments.find((s) => s.id === targetId || s.code === targetId);
      const label = a.targetLabel || (sub ? `Sub-Department: ${sub.name}` : `Sub-Department: ${targetId}`);
      groups.push({ key: `SUBDEPT-${targetId}`, label: label.startsWith('Sub-Dept') ? label : `Sub-Department: ${label}`, icon: 'ti-git-branch' });
    } else if (a.assignmentType === 'STORE') {
      const st = retailStores.find((s) => s.id === targetId || s.code === targetId);
      const label = a.targetLabel || (st ? `Branch: ${st.name}` : `Branch: ${targetId}`);
      groups.push({ key: `STORE-${targetId}`, label, icon: 'ti-map-pin' });
    } else if (a.assignmentType === 'LEVEL') {
      groups.push({ key: `LVLREQ-${targetId || a.targetLevel}`, label: `Mandatory For Level ${targetId || a.targetLevel}`, icon: 'ti-stairs-up' });
    } else if (a.assignmentType === 'GROUP') {
      groups.push({ key: `GRP-${targetId}`, label: `Group: ${a.targetLabel || targetId}`, icon: 'ti-users-group' });
    } else if (a.assignmentType === 'USER') {
      groups.push({ key: `USR-${targetId}`, label: `Individual Assignment: ${a.targetLabel || targetId}`, icon: 'ti-user' });
    } else {
      groups.push({ key: 'ELECTIVE', label: 'Optional / Supplementary (Elective)', icon: 'ti-sparkles' });
    }
  });

  return groups.length ? groups : [{ key: 'ELECTIVE', label: 'Optional / Supplementary (Elective)', icon: 'ti-sparkles' }];
}

export function courseGroupOf(c, groupBy, opts = {}) {
  switch (groupBy) {
    case 'ORG_UNIT': {
      const groups = courseOrgUnitGroups(c);
      return groups[0] || { key: 'ELECTIVE', label: 'Optional / Supplementary (Elective)', icon: 'ti-sparkles' };
    }
    case 'LEVEL':
      return { key: String(c.targetLevel), label: `Level ${c.targetLevel} — ${levelShortLabel(c.targetLevel)}`, icon: 'ti-stairs-up' };
    case 'STATUS': {
      const s = c.enrollment?.status || 'NOT_ENROLLED';
      const meta = STATUS_GROUP_META[s] || STATUS_GROUP_META.NOT_ENROLLED;
      return { key: s, label: meta.label, icon: meta.icon };
    }
    case 'MODALITY': {
      const b = courseFormatBadge(c);
      return { key: b.label, label: b.label, icon: 'ti-device-desktop' };
    }
    case 'DOMAIN':
      return { key: c.domain || c.category || 'Other', label: c.domain || c.category || 'Other', icon: 'ti-category' };
    case 'CATEGORY': {
      const label = (c.categories && c.categories[0]) || c.category || 'Other';
      return { key: label, label, icon: 'ti-tag' };
    }
    case 'LIFECYCLE_STATUS': {
      if (opts.personal) {
        const s = personalLifecycleStatusOf(c);
        const meta = PERSONAL_LIFECYCLE_STATUS_META[s];
        return { key: s, label: meta.label, icon: meta.icon };
      }
      const s = computeLifecycleStatus(c);
      const meta = LIFECYCLE_STATUS_META[s];
      return { key: s, label: meta.label, icon: meta.icon };
    }
    default:
      return { key: 'ALL', label: '', icon: '' };
  }
}

export function buildCourseGroups(items, groupBy, opts = {}) {
  if (groupBy === 'NONE') return null;
  const map = new Map();
  items.forEach((c) => {
    if (groupBy === 'ORG_UNIT') {
      const gList = courseOrgUnitGroups(c);
      gList.forEach((g) => {
        if (!map.has(g.key)) map.set(g.key, { ...g, items: [] });
        if (!map.get(g.key).items.some((item) => item.id === c.id)) {
          map.get(g.key).items.push(c);
        }
      });
    } else {
      const g = courseGroupOf(c, groupBy, opts);
      if (!map.has(g.key)) map.set(g.key, { ...g, items: [] });
      map.get(g.key).items.push(c);
    }
  });
  const groups = Array.from(map.values()).map((g) => {
    const completed = g.items.filter((c) => c.enrollment?.status === 'COMPLETED').length;
    const percent = g.items.length ? Math.round((completed / g.items.length) * 100) : 0;
    return { ...g, percent, completed };
  });
  if (groupBy === 'LEVEL') {
    groups.sort((a, b) => Number(b.key) - Number(a.key));
  } else {
    groups.sort((a, b) => b.items.length - a.items.length);
  }
  return groups;
}

// "Any of" category match, used by filter predicates once `categories[]` is
// the multi-select source of truth (falls back to the legacy singular field).
export function courseMatchesCategory(c, category) {
  if (!category || category === 'ALL') return true;
  const cats = c.categories && c.categories.length ? c.categories : [c.category];
  return cats.includes(category);
}
