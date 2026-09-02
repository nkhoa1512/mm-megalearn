// ===========================================================================
// MM MegaLearn - Lộ Trình Học Tập 4 Phân Hệ (4-Tab Universal Learning Roadmap)
//   Tab 1 CURRENT     - Khung định biên chuẩn của Level hiện tại (100% bắt buộc)
//   Tab 2 SUCCESSION  - Khung định biên của Level kế cận (Level hiện tại - 1),
//                       chỉ mở khóa khi Tab 1 đã hoàn thành 100%. Không có dữ
//                       liệu riêng: SUCCESSION của Level N chính là CURRENT
//                       của Level N-1, tra cứu động qua successionMilestonesFor.
//   Tab 3 SELF_PROPOSED - Các track chuyên đề tự chọn (không bắt buộc theo Level).
//   Tab 4 RECOMMENDED - Gợi ý theo cấp bậc/khối, tính động, không lưu trữ.
// ===========================================================================

import { LEVEL_ORDER, nextLevelUp, isCourseVisibleInCatalog } from './levelSystem';
import { generated100Courses } from './generated100Data';
import { getRoadmapForScope, migrateLevelBranchMatrix } from './roadmapScopeMatrix';

export const ROADMAP_BRANCHES = { OPERATIONS: 'OPERATIONS', SUPPORTING: 'SUPPORTING' };

// Khóa học không có trường branch riêng (chỉ có domain) — bảng này quyết định
// khóa thuộc Khối nào trên lộ trình. KHÔNG dùng course.targetId/division vì dữ
// liệu đó không nhất quán cho mục đích này (vd. khóa An Toàn Thực Phẩm target
// div-omd nhưng lại là nội dung dành cho nhân viên vận hành tuyến đầu).
const DOMAIN_BRANCH_MAP = {
  'Food Safety & Hygiene': ['OPERATIONS'],
  'Cold Chain': ['OPERATIONS'],
  'Store Operations': ['OPERATIONS'],
  'Customer Service': ['OPERATIONS'],
  'Merchandising': ['OPERATIONS'],
  'Information Security': ['SUPPORTING'],
  'Supply Chain': ['SUPPORTING'],
  'E-Commerce': ['SUPPORTING'],
  'Health & Safety': ['OPERATIONS', 'SUPPORTING'],
  'Leadership': ['OPERATIONS', 'SUPPORTING'],
  'Compliance & Ethics': ['OPERATIONS', 'SUPPORTING'],
  'Culture & Onboarding': ['OPERATIONS', 'SUPPORTING'],
  'Train-The-Trainer & Coaching Standards': ['OPERATIONS', 'SUPPORTING'],
  'Master Trainer & Section Governance': ['OPERATIONS', 'SUPPORTING'],
  'Succession & Store P&L Governance': ['OPERATIONS', 'SUPPORTING'],
  'Corporate Governance & ESG': ['OPERATIONS', 'SUPPORTING'],
  'Executive Strategy Electives': ['OPERATIONS', 'SUPPORTING'],
  'Talent & Store Portfolio Electives': ['OPERATIONS', 'SUPPORTING'],
  'OJT Capstone & Promotion Defense': ['OPERATIONS', 'SUPPORTING'],
};

export function branchesForCourse(course) {
  return DOMAIN_BRANCH_MAP[course.domain] || ['OPERATIONS', 'SUPPORTING'];
}

// Mọi user (persona lẫn 100 nhân sự generate) đã có sẵn field branch —
// xem generated100Data.js. Không cần suy luận lại từ divisionCode.
export function branchForUser(user) {
  return user?.branch === 'OPERATIONS' ? ROADMAP_BRANCHES.OPERATIONS : ROADMAP_BRANCHES.SUPPORTING;
}

// ---------------------------------------------------------------------------
// Tab 1 / Tab 2: CURRENT_ROADMAPS — 1 danh sách chặng (đã sắp thứ tự) cho mỗi
// Level x Khối, gồm toàn bộ khóa MANDATORY (định biên bắt buộc), khóa
// CLASSROOM_LAB (sát hạch/capstone, tối đa 2 khóa) được nối vào CUỐI danh sách
// làm chặng "gác cổng" trước khi đủ điều kiện thăng cấp.
// ---------------------------------------------------------------------------
function emptyBranchSet() {
  return { OPERATIONS: { courseIds: [] }, SUPPORTING: { courseIds: [] } };
}

export function buildCurrentRoadmaps(courses) {
  const config = {};
  LEVEL_ORDER.forEach((level) => { config[level] = emptyBranchSet(); });

  const capstoneCount = {};
  LEVEL_ORDER.forEach((level) => { capstoneCount[level] = { OPERATIONS: 0, SUPPORTING: 0 }; });

  const mandatoryCore = courses.filter((c) => c.courseType === 'MANDATORY' && c.modality !== 'CLASSROOM_LAB');
  const capstones = courses.filter((c) => c.courseType === 'MANDATORY' && c.modality === 'CLASSROOM_LAB');

  mandatoryCore.forEach((course) => {
    const level = course.targetLevel;
    if (!config[level]) return;
    branchesForCourse(course).forEach((branch) => config[level][branch].courseIds.push(course.id));
  });

  capstones.forEach((course) => {
    const level = course.targetLevel;
    if (!config[level]) return;
    branchesForCourse(course).forEach((branch) => {
      if (capstoneCount[level][branch] < 2) {
        config[level][branch].courseIds.push(course.id);
        capstoneCount[level][branch] += 1;
      }
    });
  });

  return config;
}

export const CURRENT_ROADMAPS = buildCurrentRoadmaps(generated100Courses);

// Cấu hình lộ trình được PERSIST giờ là ma trận Scope Key đa tầng (BU ->
// Division -> Department -> Sub-Department x Level), khởi tạo từ đúng nội
// dung Level x Branch cũ để không mất dữ liệu khi nâng cấp.
export const SCOPE_ROADMAP_MATRIX = migrateLevelBranchMatrix(CURRENT_ROADMAPS);

/**
 * Lộ trình kế cận của `user` ở `level` = lộ trình (đã tra cứu kế thừa theo
 * Scope Key) của Level liền trên (N-1), cùng đúng nhánh tổ chức của user đó.
 */
export function successionMilestonesFor(user, roadmapsConfig, level, userEnrollments = {}) {
  const nextLevel = nextLevelUp(level);
  if (!nextLevel) return { level: null, courseIds: [] };
  const resolved = getRoadmapForScope(roadmapsConfig, user, nextLevel, userEnrollments);
  return { level: nextLevel, courseIds: resolved.courseIds };
}

// ---------------------------------------------------------------------------
// Tab 3: SELF_PROPOSED_TRACKS — track chuyên đề tự chọn, không gắn với 1 Level
// cụ thể (gộp từ khóa OPTIONAL theo domain). Hiển thị cho user sẽ được lọc lại
// theo isCourseVisibleInCatalog để không phá vỡ quy tắc chặn cấp bậc tuần tự.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Tab 3: SELF_PROPOSED_TRACKS — Lộ trình tự đề xuất cá nhân hóa theo Phòng Ban,
// Vị trí công tác và Cấp bậc của nhân sự.
// ---------------------------------------------------------------------------
export function generateSelfProposedTracksForUser(user, courses, userEnrollments = {}) {
  const level = user?.level;
  const divCode = (user?.divisionCode || '').toUpperCase();
  const deptCode = (user?.departmentCode || '').toUpperCase();
  const pos = (user?.position || '').toLowerCase();

  const isVisible = (c) => isCourseVisibleInCatalog(level, c.targetLevel);
  const isCompleted = (id) => userEnrollments[id]?.status === 'COMPLETED';
  const statusOf = (id) => {
    if (isCompleted(id)) return 'COMPLETED';
    return userEnrollments[id]?.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_STARTED';
  };

  function toMilestones(courseList) {
    return courseList.map((course) => ({
      course,
      status: statusOf(course.id),
      completed: isCompleted(course.id),
    }));
  }

  const isIT = divCode === 'MIS' || deptCode === 'MIS' || deptCode === 'IT' || pos.includes('it') || pos.includes('cyber') || pos.includes('system');
  const isStoreFresh = divCode === 'OPT' || deptCode === 'BAKERY' || deptCode === 'MEAT' || deptCode === 'SEAFOOD' || pos.includes('bakery') || pos.includes('meat') || pos.includes('fresh') || pos.includes('store') || pos.includes('cashier');
  const isMerch = divCode === 'OMD' || divCode === 'PRC' || deptCode === 'MERCH' || pos.includes('merchandis') || pos.includes('buyer') || pos.includes('pricing');
  const isSCM = divCode === 'SCM' || deptCode === 'LOG' || pos.includes('warehouse') || pos.includes('supply') || pos.includes('logistics');
  const isHRorLOD = divCode === 'HRD' || deptCode === 'L&OD' || deptCode === 'HR' || pos.includes('hr') || pos.includes('trainer') || pos.includes('learning');

  const tracks = [];

  // Track 1: Chuyên Môn Trọng Tâm Phòng Ban (Department Mastery)
  if (isIT) {
    const itCourses = courses.filter((c) => (c.domain === 'Information Security' || c.domain === 'E-Commerce' || c.title.toLowerCase().includes('it') || c.title.toLowerCase().includes('security')) && isVisible(c));
    tracks.push({
      id: 'track-it-security',
      titleVi: 'Kiến Trúc An Ninh Thông Tin & Hạ Tầng Số',
      titleEn: 'Cybersecurity & Digital Infrastructure Mastery',
      icon: 'ti-shield-lock',
      description: 'Chuyên đề an ninh mạng, bảo mật dữ liệu khách hàng và tuân thủ hạ tầng số cho nhân sự CNTT.',
      courseIds: itCourses.slice(0, 4).map((c) => c.id),
      courses: itCourses.slice(0, 4),
    });
  } else if (isStoreFresh) {
    const foodCourses = courses.filter((c) => (c.domain === 'Food Safety & Hygiene' || c.domain === 'Cold Chain' || c.domain === 'Store Operations') && isVisible(c));
    tracks.push({
      id: 'track-fresh-mastery',
      titleVi: 'Chuyên Gia Chuẩn Hóa Quầy Hàng & HACCP Toàn Diện',
      titleEn: 'Store Operations & HACCP Excellence',
      icon: 'ti-meat',
      description: 'Nâng cao nghiệp vụ kiểm soát nhiệt độ chuỗi lạnh, tiêu chuẩn HACCP và giảm thiểu hao hụt tại quầy.',
      courseIds: foodCourses.slice(0, 4).map((c) => c.id),
      courses: foodCourses.slice(0, 4),
    });
  } else if (isMerch) {
    const merchCourses = courses.filter((c) => (c.domain === 'Merchandising' || c.domain === 'Supply Chain') && isVisible(c));
    tracks.push({
      id: 'track-merch-mastery',
      titleVi: 'Đàm Phán Thương Mại & Tối Ưu Biên Lợi Nhuận',
      titleEn: 'Commercial Negotiation & Margin Strategy',
      icon: 'ti-shopping-cart',
      description: 'Kỹ năng đàm phán hợp đồng nhà cung cấp, phân tích biên lợi nhuận và quản trị danh mục hàng hóa.',
      courseIds: merchCourses.slice(0, 4).map((c) => c.id),
      courses: merchCourses.slice(0, 4),
    });
  } else if (isSCM) {
    const scmCourses = courses.filter((c) => (c.domain === 'Supply Chain' || c.domain === 'Cold Chain') && isVisible(c));
    tracks.push({
      id: 'track-scm-logistics',
      titleVi: 'Vận Hành Kho Vận & Chuỗi Cung Ứng Tốc Độ Cao',
      titleEn: 'Fast-Flow Warehouse & SCM Logistics',
      icon: 'ti-truck',
      description: 'Tối ưu luồng phân phối cross-docking, an toàn xe nâng và quản trị logistics kho trung tâm.',
      courseIds: scmCourses.slice(0, 4).map((c) => c.id),
      courses: scmCourses.slice(0, 4),
    });
  } else if (isHRorLOD) {
    const hrCourses = courses.filter((c) => (c.domain === 'Leadership' || c.domain === 'Culture & Onboarding' || c.domain.includes('Trainer')) && isVisible(c));
    tracks.push({
      id: 'track-talent-trainer',
      titleVi: 'Giảng Viên Nội Bộ Chuẩn Quốc Tế & Coaching 70/20/10',
      titleEn: 'Master Trainer & Talent Coaching Standards',
      icon: 'ti-presentation',
      description: 'Phương pháp sư phạm hiện đại, kỹ năng huấn luyện tại chỗ và phát triển lộ trình kế cận.',
      courseIds: hrCourses.slice(0, 4).map((c) => c.id),
      courses: hrCourses.slice(0, 4),
    });
  } else {
    const generalOps = courses.filter((c) => (c.domain === 'Store Operations' || c.domain === 'Customer Service') && isVisible(c));
    tracks.push({
      id: 'track-general-ops',
      titleVi: 'Vận Hành Chuẩn Hóa & Dịch Vụ Khách Hàng Xuất Sắc',
      titleEn: 'Operations Excellence & Customer Experience',
      icon: 'ti-building-store',
      description: 'Kỹ năng phục vụ khách hàng chuyên nghiệp, xử lý tình huống và tối ưu vận hành.',
      courseIds: generalOps.slice(0, 4).map((c) => c.id),
      courses: generalOps.slice(0, 4),
    });
  }

  // Track 2: Lãnh Đạo & Phát Triển Kỹ Năng Quản Lý (Leadership Track)
  const leadCourses = courses.filter((c) => (c.domain === 'Leadership' || c.domain.includes('Leadership')) && isVisible(c));
  if (leadCourses.length > 0) {
    tracks.push({
      id: 'track-leadership-growth',
      titleVi: 'Lãnh Đạo & Quản Trị Đội Ngũ Bán Lẻ Hiện Đại',
      titleEn: 'Modern Retail Leadership & Team Management',
      icon: 'ti-crown',
      description: 'Phát triển năng lực giao việc, giải quyết xung đột, huấn luyện nhân viên và thiết lập mục tiêu KPI.',
      courseIds: leadCourses.slice(0, 3).map((c) => c.id),
      courses: leadCourses.slice(0, 3),
    });
  }

  // Track 3: Bán Lẻ Số & Chuyển Đổi Công Nghệ (Digital Retail & E-Commerce)
  const digitalCourses = courses.filter((c) => (c.domain === 'E-Commerce' || c.title.toLowerCase().includes('digital') || c.title.toLowerCase().includes('online') || c.domain === 'Information Security') && isVisible(c));
  if (digitalCourses.length > 0) {
    tracks.push({
      id: 'track-digital-retail',
      titleVi: 'Bán Lẻ Số & Trải Nghiệm Khách Hàng Đa Kênh (Omnichannel)',
      titleEn: 'Digital Retail & Omnichannel Customer Experience',
      icon: 'ti-device-laptop',
      description: 'Xử lý đơn hàng trực tuyến, thanh toán điện tử và trải nghiệm khách hàng đa nền tảng.',
      courseIds: digitalCourses.slice(0, 3).map((c) => c.id),
      courses: digitalCourses.slice(0, 3),
    });
  }

  // Track 4: Văn Hóa Doanh Nghiệp, An Toàn & ESG
  const esgCourses = courses.filter((c) => (c.domain === 'Culture & Onboarding' || c.domain === 'Health & Safety' || c.domain === 'Compliance & Ethics') && isVisible(c));
  if (esgCourses.length > 0) {
    tracks.push({
      id: 'track-esg-culture',
      titleVi: 'Văn Hóa Doanh Nghiệp, An Toàn Lao Động & ESG',
      titleEn: 'Corporate Culture, Health Safety & ESG',
      icon: 'ti-leaf',
      description: 'Quy tắc ứng xử văn minh, phòng chống cháy nổ PCCC và phát triển chuỗi bán lẻ bền vững.',
      courseIds: esgCourses.slice(0, 3).map((c) => c.id),
      courses: esgCourses.slice(0, 3),
    });
  }

  return tracks.map((track) => {
    const milestones = toMilestones(track.courses);
    const joined = milestones.some((m) => userEnrollments[m.course.id]);
    const percent = milestones.length === 0
      ? 0
      : Math.round((milestones.filter((m) => m.completed).length / milestones.length) * 100);
    return { ...track, milestones, joined, percent };
  }).filter((t) => t.milestones.length > 0);
}

export const SELF_PROPOSED_TRACKS = [];

// ---------------------------------------------------------------------------
// Tab 4: RECOMMENDED — Gợi ý khóa học thông minh dựa trên Phòng ban, Vị trí & Cấp bậc
// ---------------------------------------------------------------------------
export function recommendCoursesFor(user, courses, userEnrollments = {}, excludeIds = []) {
  const level = user?.level;
  const divCode = (user?.divisionCode || '').toUpperCase();
  const deptCode = (user?.departmentCode || '').toUpperCase();
  const deptName = user?.departmentName || user?.departmentCode || user?.divisionName || 'Bộ phận';
  const pos = (user?.position || '').toLowerCase();
  const branch = branchForUser(user);
  const nextLevel = nextLevelUp(level);
  const exclude = new Set(excludeIds);

  const isIT = divCode === 'MIS' || deptCode === 'MIS' || deptCode === 'IT' || pos.includes('it') || pos.includes('cyber') || pos.includes('system');
  const isStoreFresh = divCode === 'OPT' || deptCode === 'BAKERY' || deptCode === 'MEAT' || deptCode === 'SEAFOOD' || pos.includes('bakery') || pos.includes('meat') || pos.includes('fresh') || pos.includes('store') || pos.includes('cashier');
  const isMerch = divCode === 'OMD' || divCode === 'PRC' || deptCode === 'MERCH' || pos.includes('merchandis') || pos.includes('buyer') || pos.includes('pricing');
  const isSCM = divCode === 'SCM' || deptCode === 'LOG' || pos.includes('warehouse') || pos.includes('supply') || pos.includes('logistics');
  const isHRorLOD = divCode === 'HRD' || deptCode === 'L&OD' || deptCode === 'HR' || pos.includes('hr') || pos.includes('trainer') || pos.includes('learning');

  const scoredCourses = courses
    .filter((c) => !exclude.has(c.id))
    .filter((c) => !userEnrollments[c.id] || userEnrollments[c.id].status !== 'COMPLETED')
    .filter((c) => isCourseVisibleInCatalog(level, c.targetLevel))
    .map((c) => {
      let score = 0;
      let reasonTag = `Phù hợp Level ${c.targetLevel}`;

      // 1. Phù hợp Cấp bậc
      if (c.targetLevel === level) {
        score += 35;
        reasonTag = `Đúng chuẩn định biên Level ${level}`;
      } else if (c.targetLevel === nextLevel) {
        score += 30;
        reasonTag = `Phát triển kế cận Level ${nextLevel}`;
      } else {
        score += 15;
      }

      // 2. Phù hợp Ngành nghề & Phòng ban
      if (isIT) {
        if (c.domain === 'Information Security' || c.domain === 'E-Commerce' || c.title.toLowerCase().includes('security') || c.title.toLowerCase().includes('it')) {
          score += 60;
          reasonTag = `Khuyên dùng cho ${deptName}`;
        }
      } else if (isStoreFresh) {
        if (c.domain === 'Food Safety & Hygiene' || c.domain === 'Cold Chain' || c.domain === 'Store Operations') {
          score += 60;
          reasonTag = `Nghiệp vụ quầy hàng ${deptName}`;
        }
      } else if (isMerch) {
        if (c.domain === 'Merchandising' || c.domain === 'Supply Chain' || c.domain === 'E-Commerce') {
          score += 60;
          reasonTag = `Chiến lược ngành hàng ${deptName}`;
        }
      } else if (isSCM) {
        if (c.domain === 'Supply Chain' || c.domain === 'Cold Chain') {
          score += 60;
          reasonTag = `Vận hành Logistics & Kho`;
        }
      } else if (isHRorLOD) {
        if (c.domain === 'Leadership' || c.domain === 'Culture & Onboarding' || (c.domain || '').includes('Trainer')) {
          score += 60;
          reasonTag = `Đào tạo & Phát triển nhân tài`;
        }
      } else {
        if (c.domain === 'Store Operations' || c.domain === 'Customer Service' || c.domain === 'Leadership') {
          score += 40;
          reasonTag = `Kỹ năng dịch vụ khách hàng`;
        }
      }

      if (branchesForCourse(c).includes(branch)) {
        score += 15;
      }

      return {
        ...c,
        recommendationScore: score,
        recommendationReason: reasonTag,
      };
    });

  return scoredCourses
    .sort((a, b) => b.recommendationScore - a.recommendationScore || (b.passingScore || 0) - (a.passingScore || 0))
    .slice(0, 6);
}

/**
 * Tính trạng thái cả 4 tab cho 1 user. `roadmapsConfig` là CURRENT_ROADMAPS
 * (có thể đã bị Admin chỉnh sửa), `enrollments` là { [userId]: { [courseId]:
 * { status, ... } } } đúng shape đang dùng trong CourseStore.
 */
export function computeUserRoadmapTabs(user, roadmapsConfig, enrollments, courses) {
  const level = user?.level;
  const branch = branchForUser(user);
  const userEnrollments = (user && enrollments[user.userId]) || {};
  const isCompleted = (id) => userEnrollments[id]?.status === 'COMPLETED';
  const statusOf = (id) => {
    if (isCompleted(id)) return 'COMPLETED';
    return userEnrollments[id]?.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_STARTED';
  };
  const courseById = (id) => courses.find((c) => c.id === id);

  function buildMilestones(ids) {
    return ids
      .map((id) => courseById(id))
      .filter(Boolean)
      .map((course) => ({ course, status: statusOf(course.id), completed: isCompleted(course.id) }));
  }

  const resolvedCurrent = getRoadmapForScope(roadmapsConfig, user, level, userEnrollments);
  const currentIds = resolvedCurrent.courseIds;
  const currentMilestones = buildMilestones(currentIds);
  const currentDone = currentMilestones.length > 0 && currentMilestones.every((m) => m.completed);
  const currentPercent = currentMilestones.length === 0
    ? 100
    : Math.round((currentMilestones.filter((m) => m.completed).length / currentMilestones.length) * 100);

  const succession = successionMilestonesFor(user, roadmapsConfig, level, userEnrollments);
  const successionMilestones = buildMilestones(succession.courseIds);
  const successionPercent = successionMilestones.length === 0
    ? 0
    : Math.round((successionMilestones.filter((m) => m.completed).length / successionMilestones.length) * 100);

  const tracks = generateSelfProposedTracksForUser(user, courses, userEnrollments);
  const recommended = recommendCoursesFor(user, courses, userEnrollments, [...currentIds, ...succession.courseIds]);

  return {
    level,
    branch,
    scopeKey: resolvedCurrent.scopeKey,
    inheritedFrom: resolvedCurrent.inheritedFrom,
    roadmapVersion: resolvedCurrent.version,
    isArchivedRoadmapVersion: resolvedCurrent.isArchived,
    nextLevel: succession.level,
    current: { milestones: currentMilestones, percent: currentPercent, done: currentDone },
    succession: {
      level: succession.level,
      milestones: successionMilestones,
      percent: successionPercent,
      locked: succession.level !== null && !currentDone,
      unlocked: succession.level !== null && currentDone,
    },
    selfProposed: { tracks },
    recommended,
    readyForPromotion: succession.level !== null && currentDone && successionPercent >= 100,
  };
}
