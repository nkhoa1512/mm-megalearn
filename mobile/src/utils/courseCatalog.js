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
    description: 'Tiêu chuẩn vệ sinh an toàn thực phẩm, kiểm định HACCP, quy trình sơ chế và bảo quản thực phẩm sạch tại hệ thống MM Mega Market.',
    coverImage: 'https://images.unsplash.com/photo-1577106263724-2c8e03bfe9cf?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-hse',
    name: 'Health & Safety',
    code: 'HSE',
    icon: 'ti-first-aid-kit',
    color: '#ef4444',
    description: 'An toàn lao động, trang bị bảo hộ, sơ cấp cứu và phương án phòng cháy chữa cháy (PCCC) cho siêu thị và kho vận.',
    coverImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-cold',
    name: 'Cold Chain',
    code: 'COLD',
    icon: 'ti-snowflake',
    color: '#06b6d4',
    description: 'Quản trị chuỗi cung ứng lạnh, giám sát nhiệt độ kho mát & kho âm sâu, tiêu chuẩn bảo quản thực phẩm tươi sống.',
    coverImage: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-ops',
    name: 'Store Operations',
    code: 'OPS',
    icon: 'ti-building-store',
    color: '#3b82f6',
    description: 'Vận hành siêu thị, quầy thu ngân POS, trưng bày hàng hóa chuẩn bán lẻ và quy trình kiểm soát thất thoát sàn bán hàng.',
    coverImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-scm',
    name: 'Supply Chain & Logistics',
    code: 'SCM',
    icon: 'ti-truck-delivery',
    color: '#f59e0b',
    description: 'Kho vận trung tâm (DC), vận hành xe nâng, luân chuyển hàng hóa liên trung tâm và quản trị đội xe giao hàng Last-Mile.',
    coverImage: 'https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-lpqa',
    name: 'Loss Prevention & QA',
    code: 'LPQA',
    icon: 'ti-scan-eye',
    color: '#64748b',
    description: 'Kiểm soát chất lượng đầu vào, chống thất thoát hàng hóa, an ninh camera và kiểm toán tuân thủ quy chuẩn MMVN.',
    coverImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-lead',
    name: 'Leadership & Management',
    code: 'LEAD',
    icon: 'ti-users',
    color: '#8b5cf6',
    description: 'Nâng cao năng lực quản lý, kỹ năng lãnh đạo đội ngũ, giao việc, huấn luyện (coaching) và hoạch định hiệu suất OKRs.',
    coverImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-gov',
    name: 'Corporate Governance',
    code: 'GOV',
    icon: 'ti-gavel',
    color: '#475569',
    description: 'Quản trị doanh nghiệp, quy chế điều hành, chuẩn mực phát triển bền vững (ESG) và báo cáo minh bạch cho hội đồng.',
    coverImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-comp',
    name: 'Compliance & Ethics',
    code: 'COMP',
    icon: 'ti-scale',
    color: '#d97706',
    description: 'Quy tắc ứng xử đạo đức kinh doanh, phòng chống tham nhũng, xung đột lợi ích và tuân thủ pháp luật lao động.',
    coverImage: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-sec',
    name: 'Information Security',
    code: 'SEC',
    icon: 'ti-lock-square-rounded',
    color: '#dc2626',
    description: 'Bảo mật thông tin hệ thống, phòng chống lừa đảo Phishing, bảo vệ dữ liệu cá nhân khách hàng PDPD và mã hóa dữ liệu.',
    coverImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-cs',
    name: 'Customer Service',
    code: 'CS',
    icon: 'ti-headset',
    color: '#ec4899',
    description: 'Nghệ thuật giao tiếp, giải quyết khiếu nại khách hàng, chuẩn mực phục vụ khách hàng B2B/B2C và văn hóa dịch vụ xuất sắc.',
    coverImage: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-merch',
    name: 'Merchandising & Sales',
    code: 'MERCH',
    icon: 'ti-shopping-bag',
    color: '#f97316',
    description: 'Chiến lược phát triển ngành hàng, định giá cạnh tranh, đàm phán nhà cung cấp và nghệ thuật kích cầu doanh số.',
    coverImage: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-digi',
    name: 'Digital & E-Commerce',
    code: 'DIGI',
    icon: 'ti-device-laptop',
    color: '#6366f1',
    description: 'Thương mại điện tử bán lẻ đa kênh (Omnichannel), ứng dụng số hóa quy trình vận hành và quản trị dữ liệu lớn.',
    coverImage: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-fin',
    name: 'Finance & Accounting',
    code: 'FIN',
    icon: 'ti-calculator',
    color: '#059669',
    description: 'Quản trị tài chính siêu thị, kiểm soát báo cáo P&L, đối soát thu chi, hóa đơn điện tử và kiểm toán nội bộ.',
    coverImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-orient',
    name: 'Corporate Orientation',
    code: 'ORIENT',
    icon: 'ti-compass',
    color: '#0284c7',
    description: 'Định hướng hội nhập nhân viên mới (Onboarding), văn hóa MM Mega Market, cơ cấu tổ chức và chế độ phúc lợi.',
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cat-fresh',
    name: 'Fresh Food Practice',
    code: 'FRESH',
    icon: 'ti-leaf',
    color: '#16a34a',
    description: 'Kỹ thuật pha lọc thịt, chế biến thủy hải sản, sơ chế rau củ quả hữu cơ và làm bánh tươi chuẩn xuất sắc.',
    coverImage: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80',
  },
];

export const DEFAULT_COMPANY_CATEGORIES = DEFAULT_CATEGORY_OBJECTS.map((c) => c.name);

export const CATEGORY_ICON_PRESETS = [
  { id: 'ti-shield-check', label: 'An Toàn / Shield' },
  { id: 'ti-building-store', label: 'Siêu Thị / Store' },
  { id: 'ti-leaf', label: 'Thực Phẩm / Fresh' },
  { id: 'ti-truck-delivery', label: 'Kho Vận / Logistics' },
  { id: 'ti-snowflake', label: 'Chuỗi Lạnh / Cold' },
  { id: 'ti-first-aid-kit', label: 'Y Tế & PCCC' },
  { id: 'ti-users', label: 'Lãnh Đạo / Team' },
  { id: 'ti-headset', label: 'Khách Hàng / CS' },
  { id: 'ti-shopping-bag', label: 'Bán Lẻ / Sales' },
  { id: 'ti-device-laptop', label: 'Công Nghệ / IT' },
  { id: 'ti-calculator', label: 'Tài Chính / Fin' },
  { id: 'ti-gavel', label: 'Pháp Chế / Law' },
  { id: 'ti-scale', label: 'Đạo Đức / Ethics' },
  { id: 'ti-lock-square-rounded', label: 'Bảo Mật / Sec' },
  { id: 'ti-compass', label: 'Hội Nhập / Orientation' },
  { id: 'ti-scan-eye', label: 'Chất Lượng / QA' },
  { id: 'ti-certificate', label: 'Chứng Chỉ' },
  { id: 'ti-chart-bar', label: 'Phân Tích / Data' },
  { id: 'ti-bulb', label: 'Sáng Tạo / Idea' },
  { id: 'ti-books', label: 'Đào Tạo / Học Tập' },
  { id: 'ti-briefcase', label: 'Nghiệp Vụ' },
  { id: 'ti-award', label: 'Thành Tựu' },
  { id: 'ti-heart-handshake', label: 'Hợp Tác' },
  { id: 'ti-world', label: 'Toàn Cầu' },
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
    description: `Danh mục đào tạo ${nameToMatch}`,
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
// Trạng thái vòng đời "cá nhân hóa" — dùng cho catalog của Learner, Manager,
// HRBP và Trainer/L&D (mọi role KHÔNG PHẢI User Admin/SysAdmin). Khác với
// LIFECYCLE_STATUS_META (Nháp/Chưa Mở/Đang Mở/Đã Đóng — góc nhìn quản trị của
// người tạo khóa), 4 role này quan tâm tới quan hệ CÁ NHÂN của họ với khóa học
// hơn là vòng đời quản trị thuần túy, nên khi đã ghi danh thì trạng thái ghi
// danh thật (Đã Hoàn Thành / Đã Quá Hạn / đang tham gia) được ưu tiên hiển thị
// thay vì chỉ nói chung chung "Đang Mở". Chỉ khi CHƯA từng ghi danh mới quay
// lại dùng đúng trạng thái vòng đời của khóa (Đang Mở / Đã Qua Thời Gian Tham
// Gia — tương đương "Đã Đóng" bên Admin nhưng đổi tên cho đúng góc nhìn học
// viên/quản lý).
export const PERSONAL_LIFECYCLE_STATUS_META = {
  OPEN: { label: 'Đang Mở', labelEn: 'Open', tone: 'sage', icon: 'ti-circle-check' },
  CLOSED: { label: 'Đã Qua Thời Gian Tham Gia', labelEn: 'Enrollment Window Closed', tone: 'rust', icon: 'ti-lock' },
  JOINED: { label: 'Đang Tham Gia', labelEn: 'Currently Enrolled', tone: 'blue', icon: 'ti-user-check' },
  OVERDUE: { label: 'Đã Quá Hạn', labelEn: 'Overdue', tone: 'amber', icon: 'ti-alert-triangle' },
  COMPLETED: { label: 'Đã Hoàn Thành', labelEn: 'Completed', tone: 'rail', icon: 'ti-certificate' },
};

// `course.enrollment` phải được gộp sẵn vào course (ghi danh thật của người
// đang xem, không phải field tĩnh trên course template) trước khi gọi hàm này.
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

export function courseOrgUnitGroups(c) {
  const asgList = c.assignments && c.assignments.length > 0
    ? c.assignments
    : (c.assignment ? [c.assignment] : []);

  if (asgList.length === 0) {
    return [{ key: 'ELECTIVE', label: 'Tự Chọn / Bổ Trợ (Elective)', icon: 'ti-sparkles' }];
  }

  const groups = [];
  asgList.forEach((a) => {
    const targetId = a.targetId || a.targetDivisionId || a.targetDepartmentId || a.targetBusinessUnitId || a.targetStoreId || a.targetAreaId || a.targetClusterId;
    if (a.assignmentType === 'BUSINESS_UNIT' || a.assignmentType === 'ALL_ASSOCIATES') {
      groups.push({ key: 'BU', label: 'Bắt Buộc Toàn Công Ty (MMVN)', icon: 'ti-building-skyscraper' });
    } else if (a.assignmentType === 'DIVISION') {
      const div = divisions.find((d) => d.id === targetId || d.code === targetId);
      const label = a.targetLabel || (div ? `Khối ${div.name}` : `Khối [${targetId}]`);
      groups.push({ key: `DIV-${targetId}`, label: label.startsWith('Khối') ? label : `Khối ${label}`, icon: 'ti-building' });
    } else if (a.assignmentType === 'DEPARTMENT') {
      const dept = departments.find((d) => d.id === targetId || d.code === targetId);
      const label = a.targetLabel || (dept ? `Phòng Ban: ${dept.name}` : `Phòng Ban: ${targetId}`);
      groups.push({ key: `DEPT-${targetId}`, label: label.startsWith('Phòng') ? label : `Phòng Ban: ${label}`, icon: 'ti-building-community' });
    } else if (a.assignmentType === 'SUBDEPARTMENT') {
      const sub = subDepartments.find((s) => s.id === targetId || s.code === targetId);
      const label = a.targetLabel || (sub ? `Bộ Phận: ${sub.name}` : `Bộ Phận: ${targetId}`);
      groups.push({ key: `SUBDEPT-${targetId}`, label: label.startsWith('Bộ') ? label : `Bộ Phận: ${label}`, icon: 'ti-git-branch' });
    } else if (a.assignmentType === 'STORE') {
      const st = retailStores.find((s) => s.id === targetId || s.code === targetId);
      const label = a.targetLabel || (st ? `Chi Nhánh: ${st.name}` : `Chi Nhánh: ${targetId}`);
      groups.push({ key: `STORE-${targetId}`, label, icon: 'ti-map-pin' });
    } else if (a.assignmentType === 'LEVEL') {
      groups.push({ key: `LVLREQ-${targetId || a.targetLevel}`, label: `Bắt Buộc Level ${targetId || a.targetLevel}`, icon: 'ti-stairs-up' });
    } else if (a.assignmentType === 'GROUP') {
      groups.push({ key: `GRP-${targetId}`, label: `Nhóm: ${a.targetLabel || targetId}`, icon: 'ti-users-group' });
    } else if (a.assignmentType === 'USER') {
      groups.push({ key: `USR-${targetId}`, label: `Gán Cá Nhân: ${a.targetLabel || targetId}`, icon: 'ti-user' });
    } else {
      groups.push({ key: 'ELECTIVE', label: 'Tự Chọn / Bổ Trợ (Elective)', icon: 'ti-sparkles' });
    }
  });

  return groups.length ? groups : [{ key: 'ELECTIVE', label: 'Tự Chọn / Bổ Trợ (Elective)', icon: 'ti-sparkles' }];
}

export function courseGroupOf(c, groupBy, opts = {}) {
  switch (groupBy) {
    case 'ORG_UNIT': {
      const groups = courseOrgUnitGroups(c);
      return groups[0] || { key: 'ELECTIVE', label: 'Tự Chọn / Bổ Trợ (Elective)', icon: 'ti-sparkles' };
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
