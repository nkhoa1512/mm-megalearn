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
const SELF_PROPOSED_TRACK_DEFS = [
  { id: 'track-leadership', titleVi: 'Lãnh Đạo & Quản Trị Nâng Cao', icon: 'ti-crown', description: 'Kỹ năng lãnh đạo, coaching và hoạch định chiến lược dành cho nhân sự muốn phát triển lên vai trò quản lý.', domain: 'Leadership' },
  { id: 'track-scm', titleVi: 'Chuỗi Cung Ứng & Logistics', icon: 'ti-truck', description: 'Vận hành kho vận, quản trị đội xe và tối ưu chuỗi cung ứng.', domain: 'Supply Chain' },
  { id: 'track-digital', titleVi: 'Bán Lẻ Số & Thương Mại Điện Tử', icon: 'ti-device-laptop', description: 'Omnichannel, thanh toán số và trải nghiệm khách hàng trực tuyến.', domain: 'E-Commerce' },
  { id: 'track-merch', titleVi: 'Merchandising & Quản Trị Ngành Hàng', icon: 'ti-shopping-cart', description: 'Đàm phán nhà cung cấp, quản trị danh mục và chiến lược giá.', domain: 'Merchandising' },
  { id: 'track-culture', titleVi: 'Văn Hóa & Phát Triển Bản Thân', icon: 'ti-heart', description: 'Văn hóa doanh nghiệp, phát triển bền vững và chăm sóc sức khỏe tinh thần.', domain: 'Culture & Onboarding' },
];

export const SELF_PROPOSED_TRACKS = SELF_PROPOSED_TRACK_DEFS.map((track) => ({
  ...track,
  courseIds: generated100Courses.filter((c) => c.domain === track.domain && c.courseType === 'OPTIONAL').map((c) => c.id),
}));

// ---------------------------------------------------------------------------
// Tab 4: RECOMMENDED — tính động, không lưu trữ. Ưu tiên khóa cùng Level hoặc
// Level kế cận, cùng Khối, chưa hoàn thành, chưa nằm trong Tab 1/Tab 2.
// ---------------------------------------------------------------------------
function recommendCoursesFor(user, courses, userEnrollments, excludeIds) {
  const level = user?.level;
  const branch = branchForUser(user);
  const nextLevel = nextLevelUp(level);
  const exclude = new Set(excludeIds);
  return courses
    .filter((c) => !exclude.has(c.id))
    .filter((c) => c.targetLevel === level || c.targetLevel === nextLevel)
    .filter((c) => branchesForCourse(c).includes(branch))
    .filter((c) => !userEnrollments[c.id] || userEnrollments[c.id].status !== 'COMPLETED')
    .sort((a, b) => (b.passingScore || 0) - (a.passingScore || 0))
    .slice(0, 5);
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

  const tracks = SELF_PROPOSED_TRACKS.map((track) => {
    const visibleIds = track.courseIds.filter((id) => {
      const course = courseById(id);
      return course && isCourseVisibleInCatalog(level, course.targetLevel);
    });
    const milestones = buildMilestones(visibleIds);
    const joined = milestones.some((m) => userEnrollments[m.course.id]);
    const percent = milestones.length === 0
      ? 0
      : Math.round((milestones.filter((m) => m.completed).length / milestones.length) * 100);
    return { ...track, milestones, joined, percent };
  }).filter((track) => track.milestones.length > 0);

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
