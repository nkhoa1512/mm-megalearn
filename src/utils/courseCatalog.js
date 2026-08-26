// Shared Catalog helpers: standardized company category taxonomy, course-code
// auto-generation, date-driven lifecycle status, and the delivery-format /
// group-by logic reused across the admin and learner catalog pages (single
// source of truth — previously duplicated independently in AdminCourses.jsx
// and LearnerCourses.jsx).

import { divisions } from '../data/orgHierarchy';
import { levelShortLabel } from '../data/levelSystem';

// ---------------------------------------------------------------------------
// Company Category Taxonomy — seeds CourseStore's admin-manageable
// `companyCategories` list (System Admin & Security can view/add more from
// there; this is only the initial default set, not a hard cap).
// ---------------------------------------------------------------------------
export const DEFAULT_COMPANY_CATEGORIES = [
  'Food Safety & Hygiene',
  'Health & Safety',
  'Cold Chain',
  'Store Operations',
  'Supply Chain & Logistics',
  'Loss Prevention & QA',
  'Leadership & Management',
  'Corporate Governance',
  'Compliance & Ethics',
  'Information Security',
  'Customer Service',
  'Merchandising & Sales',
  'Digital & E-Commerce',
  'Finance & Accounting',
  'Corporate Orientation',
  'Fresh Food Practice',
];

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
  DRAFT: { label: 'Nháp', labelEn: 'Draft', tone: 'slate', icon: 'ti-file-pencil' },
  UPCOMING: { label: 'Chưa Mở', labelEn: 'Upcoming', tone: 'blue', icon: 'ti-clock' },
  OPEN: { label: 'Đang Mở', labelEn: 'Open', tone: 'sage', icon: 'ti-circle-check' },
  CLOSED: { label: 'Đã Đóng', labelEn: 'Closed', tone: 'rust', icon: 'ti-lock' },
};

// Learner catalog visibility: a CLOSED course is hidden from anyone who never
// enrolled, but stays visible (with continued access) for anyone who did.
export function isCourseVisibleWhenClosed(course) {
  return Boolean(course.enrollment);
}

// ---------------------------------------------------------------------------
// Delivery-format badge — the existing 3-way split (🌐 E-Learning / 💻 Live
// Online Class / 🏢 In-Person ILT) that already cleanly maps onto 3 of the 5
// Catalog tabs (Learning Objects / Online Class / Classroom), no new field
// needed on the course object.
// ---------------------------------------------------------------------------
export function courseFormatBadge(c) {
  const isInPerson = c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB';
  if (isInPerson) return { icon: '🏢', label: 'Trực Tiếp (ILT)', tone: 'blue' };
  if (c.onlineClassType === 'VIRTUAL_CLASS') return { icon: '💻', label: 'Lớp Trực Tuyến Live', tone: 'amber' };
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
  COMPLETED: { label: 'Đã Hoàn Thành', icon: 'ti-circle-check' },
  IN_PROGRESS: { label: 'Đang Học', icon: 'ti-player-play' },
  NOT_STARTED: { label: 'Chưa Bắt Đầu', icon: 'ti-circle-dashed' },
  OVERDUE: { label: 'Quá Hạn', icon: 'ti-alert-triangle' },
  FAILED: { label: 'Cần Thi Lại', icon: 'ti-reload' },
  NOT_ENROLLED: { label: 'Chưa Ghi Danh', icon: 'ti-bookmark-off' },
};

export function courseGroupOf(c, groupBy) {
  switch (groupBy) {
    case 'ORG_UNIT': {
      const a = c.assignment;
      if (!a) return { key: 'ELECTIVE', label: 'Tự Chọn / Bổ Trợ (Elective)', icon: 'ti-sparkles' };
      if (a.assignmentType === 'BUSINESS_UNIT') return { key: 'BU', label: 'Bắt Buộc Toàn Công Ty (MMVN)', icon: 'ti-building-skyscraper' };
      if (a.assignmentType === 'DIVISION') {
        const div = divisions.find((d) => d.id === a.targetDivisionId);
        return { key: `DIV-${a.targetDivisionId}`, label: div ? `Khối ${div.name}` : 'Khối Chuyên Trách', icon: 'ti-building' };
      }
      return { key: `LVLREQ-${a.targetLevel}`, label: `Bắt Buộc Level ${a.targetLevel}`, icon: 'ti-stairs-up' };
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
      return { key: c.domain || c.category || 'Khác', label: c.domain || c.category || 'Khác', icon: 'ti-category' };
    case 'CATEGORY': {
      const label = (c.categories && c.categories[0]) || c.category || 'Khác';
      return { key: label, label, icon: 'ti-tag' };
    }
    case 'LIFECYCLE_STATUS': {
      const s = computeLifecycleStatus(c);
      const meta = LIFECYCLE_STATUS_META[s];
      return { key: s, label: meta.label, icon: meta.icon };
    }
    default:
      return { key: 'ALL', label: '', icon: '' };
  }
}

export function buildCourseGroups(items, groupBy) {
  if (groupBy === 'NONE') return null;
  const map = new Map();
  items.forEach((c) => {
    const g = courseGroupOf(c, groupBy);
    if (!map.has(g.key)) map.set(g.key, { ...g, items: [] });
    map.get(g.key).items.push(c);
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
