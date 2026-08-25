// ===========================================================================
// MM MegaLearn - Thang Cấp Bậc 7 Level (ĐẢO NGƯỢC)
// Level 7 = THẤP NHẤT (Nhân viên tuyến đầu mới vào)
// Level 1 = CAO NHẤT (Ban điều hành / BOM)
//
// Mọi so sánh cấp bậc trong hệ thống phải đi qua helper trong file này để tránh
// lặp lại lỗi "số lớn hơn = cấp cao hơn" của thang cũ.
// ===========================================================================

export const ENTRY_LEVEL = '7';
export const TOP_LEVEL = '1';

export const LEVEL_DEFINITIONS = [
  {
    level: '1',
    emoji: '👑',
    shortVi: 'Ban Điều Hành (Cao nhất)',
    titleVi: 'Board of Management (BOM) / Giám Đốc Điều Hành',
    titleEn: 'Board of Management / Managing Director',
    band: 'EXECUTIVE',
    note: 'Cấp cao nhất trong doanh nghiệp',
    colors: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  },
  {
    level: '2',
    emoji: '👑',
    shortVi: 'Giám Đốc Siêu Thị / Trưởng Khối',
    titleVi: 'Store General Manager (SGM) / Trưởng Khối (Head of Division)',
    titleEn: 'Store General Manager / Head of Division',
    band: 'EXECUTIVE',
    note: 'Điều hành toàn siêu thị hoặc một khối chức năng',
    colors: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  },
  {
    level: '3',
    emoji: '🟠',
    shortVi: 'Trưởng Ngành Hàng',
    titleVi: 'Section Manager / Trưởng Ngành Hàng (Master Trainer / L&D Lead)',
    titleEn: 'Section Manager / Master Trainer',
    band: 'SENIOR_MANAGEMENT',
    note: 'Quản trị ngành hàng, giảng dạy và phát triển năng lực',
    colors: { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' },
  },
  {
    level: '4',
    emoji: '🔵',
    shortVi: 'Trưởng Bộ Phận',
    titleVi: 'Store Department Manager / Quản Lý Bộ Phận (Line Manager)',
    titleEn: 'Store Department Manager / Line Manager',
    band: 'MANAGEMENT',
    note: 'Quản lý trực tiếp nhân viên phòng ban',
    colors: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  },
  {
    level: '5',
    emoji: '🟢',
    shortVi: 'Giám Sát Ca / Trưởng Nhóm',
    titleVi: 'Shift Supervisor / Trưởng Nhóm / Chuyên Viên Cao Cấp',
    titleEn: 'Shift Supervisor / Team Leader / Senior Specialist',
    band: 'SUPERVISORY',
    note: 'Giám sát ca vận hành và kèm cặp nhóm nhỏ',
    colors: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  },
  {
    level: '6',
    emoji: '🟢',
    shortVi: 'Chuyên Viên Vận Hành',
    titleVi: 'Specialist / Chuyên Viên Vận Hành Chính Thức',
    titleEn: 'Specialist / Operations Executive',
    band: 'PROFESSIONAL',
    note: 'Nhân sự vận hành chính thức đã qua thử việc',
    colors: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  },
  {
    level: '7',
    emoji: '⚪',
    shortVi: 'Nhân Viên Tuyến Đầu (Thấp nhất)',
    titleVi: 'Junior Associate / Nhân Viên Tuyến Đầu / Mới Vào',
    titleEn: 'Junior Associate / Store Counter Staff',
    band: 'ENTRY',
    note: 'Cấp thấp nhất - điểm xuất phát của mọi lộ trình',
    colors: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  },
];

export const LEVEL_ORDER = LEVEL_DEFINITIONS.map((l) => l.level);

// Các mã cấp bậc ngoài thang 1-7 trong dữ liệu HRIS cũ đều quy về cấp thấp nhất.
const LEGACY_LEVEL_ALIAS = { CL: '7', IN: '7', '0': '7' };

/** Chuẩn hóa bất kỳ giá trị level nào về chuỗi '1'..'7'. */
export function normalizeLevel(level) {
  if (level === null || level === undefined) return ENTRY_LEVEL;
  const raw = String(level).trim().toUpperCase().replace(/^LVL-?/, '');
  if (LEVEL_ORDER.includes(raw)) return raw;
  if (LEGACY_LEVEL_ALIAS[raw]) return LEGACY_LEVEL_ALIAS[raw];
  const num = Number(raw);
  if (Number.isFinite(num) && raw !== '') {
    if (num >= 1 && num <= 7) return String(Math.round(num));
    return num < 1 ? TOP_LEVEL : ENTRY_LEVEL;
  }
  return ENTRY_LEVEL;
}

export function levelDefinition(level) {
  const norm = normalizeLevel(level);
  return LEVEL_DEFINITIONS.find((l) => l.level === norm) || LEVEL_DEFINITIONS[LEVEL_DEFINITIONS.length - 1];
}

export function levelTitle(level) {
  return levelDefinition(level).titleVi;
}

export function levelShortLabel(level) {
  const def = levelDefinition(level);
  return `${def.emoji} Level ${def.level}: ${def.shortVi}`;
}

/** Số càng nhỏ càng cao. Trả về số nguyên 1..7 để so sánh. */
export function levelValue(level) {
  return Number(normalizeLevel(level));
}

/**
 * Khoảng cách cấp bậc = số bậc mà khóa học nằm CAO HƠN học viên.
 *   <= 0 : khóa cùng cấp hoặc thấp hơn (mở tự do)
 *   === 1: vượt đúng 1 cấp liền kề (phải xin phê duyệt)
 *   >= 2 : nhảy cóc (chặn cứng)
 * Vì thang đảo ngược nên Level 7 (thấp nhất) trừ Level 6 = 1 bậc vượt.
 */
export function levelGap(userLevel, courseLevel) {
  return levelValue(userLevel) - levelValue(courseLevel);
}

/** Cấp liền kề phía trên (Level 7 -> Level 6). Trả về null nếu đã ở đỉnh. */
export function nextLevelUp(level) {
  const value = levelValue(level);
  return value <= 1 ? null : String(value - 1);
}

/** Các cấp phải lần lượt đi qua để từ `fromLevel` leo tới `toLevel`. */
export function levelRoadmap(fromLevel, toLevel) {
  const from = levelValue(fromLevel);
  const to = levelValue(toLevel);
  const steps = [];
  for (let v = from - 1; v >= to; v -= 1) steps.push(String(v));
  return steps;
}

// ---------------------------------------------------------------------------
// Quy tắc chặn quyền & học vượt cấp tuần tự (Sequential Level Gate)
// ---------------------------------------------------------------------------

export const ACCESS_STATE = {
  OPEN: 'OPEN',                         // Cùng cấp hoặc thấp hơn -> học ngay
  APPROVED: 'APPROVED',                 // Vượt 1 cấp & Manager đã duyệt
  PENDING_APPROVAL: 'PENDING_APPROVAL', // Đã gửi đơn, chờ Manager duyệt
  REJECTED: 'REJECTED',                 // Manager đã từ chối đơn
  REQUESTABLE: 'REQUESTABLE',           // Vượt đúng 1 cấp -> được phép xin
  LOCKED_LEVEL_GAP: 'LOCKED_LEVEL_GAP', // Nhảy cóc >= 2 cấp -> cấm tuyệt đối
};

/**
 * Quy tắc truy cập khóa học theo cấp bậc.
 *
 * @param {object} course Khóa học (đọc `targetLevel`).
 * @param {object} user   Học viên (đọc `level`).
 * @param {object} ctx    { approvedCourseIds, pendingCourseIds, rejectedCourseIds }
 */
export function checkCourseAccessRule(course, user, ctx = {}) {
  const approvedCourseIds = ctx.approvedCourseIds || [];
  const pendingCourseIds = ctx.pendingCourseIds || [];
  const rejectedCourseIds = ctx.rejectedCourseIds || [];

  if (!course || !user) {
    return {
      state: ACCESS_STATE.OPEN,
      canAccess: true,
      isLevelLocked: false,
      requiresApproval: false,
      gap: 0,
      userLevel: ENTRY_LEVEL,
      courseLevel: ENTRY_LEVEL,
      reason: null,
    };
  }

  const userLevel = normalizeLevel(user.level);
  const courseLevel = normalizeLevel(course.targetLevel);
  const gap = levelGap(userLevel, courseLevel);
  const base = { gap, userLevel, courseLevel };

  // Trường hợp 1: khóa cùng cấp hoặc thấp hơn -> mở tự do.
  if (gap <= 0) {
    return {
      ...base,
      state: ACCESS_STATE.OPEN,
      canAccess: true,
      isLevelLocked: false,
      requiresApproval: false,
      reason: null,
    };
  }

  // Trường hợp 2: vượt đúng 1 cấp liền kề (Level 7 muốn học Level 6).
  if (gap === 1) {
    if (approvedCourseIds.includes(course.id)) {
      return {
        ...base,
        state: ACCESS_STATE.APPROVED,
        canAccess: true,
        isLevelLocked: false,
        requiresApproval: false,
        reason: `Đã được Quản lý phê duyệt học vượt lên Level ${courseLevel}.`,
      };
    }
    if (pendingCourseIds.includes(course.id)) {
      return {
        ...base,
        state: ACCESS_STATE.PENDING_APPROVAL,
        canAccess: false,
        isLevelLocked: true,
        requiresApproval: false,
        reason: `Đơn xin học vượt lên Level ${courseLevel} đang chờ Quản lý phê duyệt.`,
      };
    }
    if (rejectedCourseIds.includes(course.id)) {
      return {
        ...base,
        state: ACCESS_STATE.REJECTED,
        canAccess: false,
        isLevelLocked: true,
        requiresApproval: true,
        reason: 'Quản lý đã từ chối đơn học vượt khóa này. Bạn có thể gửi lại kèm lý do thuyết phục hơn.',
      };
    }
    return {
      ...base,
      state: ACCESS_STATE.REQUESTABLE,
      canAccess: false,
      isLevelLocked: true,
      requiresApproval: true,
      reason: `Khóa học Level ${courseLevel} cao hơn cấp bậc hiện tại (Level ${userLevel}). Bạn cần gửi yêu cầu để Manager phê duyệt học vượt cấp.`,
    };
  }

  // Trường hợp 3: nhảy cóc từ 2 cấp trở lên -> chặn cứng.
  const mustFinishLevel = nextLevelUp(userLevel);
  return {
    ...base,
    state: ACCESS_STATE.LOCKED_LEVEL_GAP,
    canAccess: false,
    isLevelLocked: true,
    requiresApproval: false,
    blockedRoadmap: levelRoadmap(userLevel, courseLevel),
    reason: `Bạn không thể nhảy cóc lên Level ${courseLevel}. Bạn bắt buộc phải hoàn thành toàn bộ chương trình đào tạo Level ${mustFinishLevel} trước.`,
  };
}
