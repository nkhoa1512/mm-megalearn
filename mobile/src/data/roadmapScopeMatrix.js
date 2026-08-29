// ===========================================================================
// MM MegaLearn - Ma Trận Lộ Trình Đa Tầng theo Scope Key
//   BU (Business Unit) -> Division -> Department -> Sub-Department x Level
//
// Xây dựng THÊM trên nền dữ liệu tổ chức đã có trong orgHierarchy.js, KHÔNG
// thay thế: 2 Business Unit của kế hoạch (bu-ho / bu-ops) ánh xạ trực tiếp
// vào trường `branch` (SUPPORTING / OPERATIONS) đã dùng xuyên suốt hệ thống,
// nên toàn bộ dữ liệu tổ chức/nhân sự/dashboard hiện có không bị phá vỡ.
//
// Mỗi Scope Key (`${buId}:${divisionId}:${departmentId}:${subId}:${level}`)
// là MỘT bản ghi Lộ Trình có versioning riêng, giống hệt cơ chế đa phiên bản
// của khóa học (course.versions): `courseIds` là danh sách ĐANG SỐNG, `versions`
// là kho lưu các phiên bản CŨ đã bị thay thế. Khi Admin sửa (thêm/bớt khóa
// học) và lưu, phiên bản hiện tại được đóng băng vào `versions[oldVersion]`
// rồi tăng lên phiên bản mới — học viên ĐÃ hoàn thành hoặc ĐANG học dở một
// khóa thuộc phiên bản cũ sẽ tiếp tục thấy đúng phiên bản đó; chỉ học viên
// CHƯA từng động vào lộ trình này mới thấy phiên bản mới nhất.
// ===========================================================================

import { nextMajorVersion } from './mockData';

export const SCOPE_BUSINESS_UNITS = [
  { id: 'bu-ho', branch: 'SUPPORTING', name: 'Khối Văn Phòng Hỗ Trợ (Head Office)' },
  { id: 'bu-ops', branch: 'OPERATIONS', name: 'Khối Vận Hành Siêu Thị (Store Operations)' },
];

export function buIdForBranch(branch) {
  return branch === 'OPERATIONS' ? 'bu-ops' : 'bu-ho';
}

export function branchForBuId(buId) {
  return buId === 'bu-ops' ? 'OPERATIONS' : 'SUPPORTING';
}

/** Ô Sub-Department: sectionId (siêu thị) được ưu tiên hơn subDepartmentId (khối văn phòng). */
export function subScopeIdOf(entity) {
  return entity?.sectionId || entity?.subDepartmentId || null;
}

/** Dựng Scope Key chuẩn `${buId}:${divisionId}:${departmentId}:${subId}:${level}`, dùng '*' cho ô bỏ trống. */
export function buildScopeKey({ buId, divisionId, departmentId, subDepartmentId, level }) {
  return [buId || '*', divisionId || '*', departmentId || '*', subDepartmentId || '*', level].join(':');
}

export function parseScopeKey(scopeKey) {
  const [buId, divisionId, departmentId, subDepartmentId, level] = String(scopeKey || '').split(':');
  return {
    buId: buId === '*' ? null : buId || null,
    divisionId: divisionId === '*' ? null : divisionId || null,
    departmentId: departmentId === '*' ? null : departmentId || null,
    subDepartmentId: subDepartmentId === '*' ? null : subDepartmentId || null,
    level: level || null,
  };
}

/** Chuỗi Scope Key kế thừa của 1 user ở 1 level, từ chi tiết nhất -> tổng quát nhất. */
export function scopeChainFor(user, level) {
  const buId = buIdForBranch(user?.branch);
  const divisionId = user?.divisionId || null;
  const departmentId = user?.departmentId || null;
  const subDepartmentId = subScopeIdOf(user);
  const chain = [];
  if (subDepartmentId) chain.push(buildScopeKey({ buId, divisionId, departmentId, subDepartmentId, level }));
  if (departmentId) chain.push(buildScopeKey({ buId, divisionId, departmentId, subDepartmentId: null, level }));
  if (divisionId) chain.push(buildScopeKey({ buId, divisionId, departmentId: null, subDepartmentId: null, level }));
  chain.push(buildScopeKey({ buId, divisionId: null, departmentId: null, subDepartmentId: null, level }));
  return chain;
}

function versionNumber(v) {
  const m = /^v(\d+)/.exec(v || 'v1.0');
  return m ? Number(m[1]) : 1;
}

/**
 * Phiên bản lộ trình mà `userEnrollments` (ghi danh khóa học của 1 học viên)
 * thực sự phải thấy: quét các phiên bản CŨ (cũ -> mới) của `entry`, phiên bản
 * đầu tiên mà học viên đã có tiến độ (đang học/đã hoàn thành) ở ít nhất 1 khóa
 * thuộc phiên bản đó thắng — học viên bị "khóa" vào đúng phiên bản họ đã bắt
 * đầu. Học viên chưa từng động vào khóa nào của lộ trình này thấy phiên bản
 * ĐANG SỐNG (mới nhất).
 */
export function resolveUserRoadmapVersion(entry, userEnrollments = {}) {
  if (!entry) return { version: null, courseIds: [], isArchived: false };
  const hasProgress = (ids) =>
    (ids || []).some((id) => {
      const e = userEnrollments[id];
      return e && (e.status === 'IN_PROGRESS' || e.status === 'COMPLETED');
    });
  const historyVersions = Object.keys(entry.versions || {}).sort((a, b) => versionNumber(a) - versionNumber(b));
  for (const v of historyVersions) {
    if (hasProgress(entry.versions[v].courseIds)) {
      return { version: v, courseIds: entry.versions[v].courseIds, isArchived: true };
    }
  }
  return { version: entry.currentVersion || 'v1.0', courseIds: entry.courseIds || [], isArchived: false };
}

/**
 * Tra cứu danh sách khóa học của 1 user ở 1 level theo cơ chế Kế Thừa &
 * Phân Nhánh Thông Minh (Smart Fallback & Inheritance): thử khớp chính xác
 * Sub-Department trước, rồi lần lượt lùi ra Department -> Division -> BU.
 * `userEnrollments` (tùy chọn) dùng để khóa học viên vào đúng phiên bản họ đã
 * bắt đầu — bỏ trống khi Admin chỉ đang xem/preview (luôn thấy bản mới nhất).
 */
export function getRoadmapForScope(matrix, user, level, userEnrollments = {}) {
  const chain = scopeChainFor(user, level);
  for (let i = 0; i < chain.length; i += 1) {
    const key = chain[i];
    const entry = matrix?.[key];
    if (entry && entry.courseIds && entry.courseIds.length > 0) {
      const resolved = resolveUserRoadmapVersion(entry, userEnrollments);
      return {
        scopeKey: key,
        courseIds: resolved.courseIds,
        version: resolved.version,
        isArchived: resolved.isArchived,
        inheritedFrom: i === 0 ? null : key,
      };
    }
  }
  const fallbackKey = chain[chain.length - 1];
  const resolvedFallback = resolveUserRoadmapVersion(matrix?.[fallbackKey], userEnrollments);
  return {
    scopeKey: fallbackKey,
    courseIds: resolvedFallback.courseIds,
    version: resolvedFallback.version,
    isArchived: false,
    inheritedFrom: null,
  };
}

/**
 * Lưu danh sách khóa học mới cho đúng 1 Scope Key:
 *  - Nếu Scope Key CHƯA tồn tại (Tạo Lộ Trình Mới) -> khởi tạo v1.0, không
 *    đóng băng gì cả.
 *  - Nếu ĐÃ tồn tại và danh sách thực sự thay đổi -> đóng băng phiên bản
 *    hiện tại vào `versions[oldVersion]` rồi tăng lên phiên bản mới (v1.0 ->
 *    v2.0 -> v3.0 -> ... không giới hạn), y hệt cơ chế `publishNewCourseVersion`.
 *  - Nếu danh sách không đổi -> giữ nguyên, không tạo phiên bản rác.
 */
export function publishRoadmapScope(matrix, scopeKey, nextCourseIds, meta = {}) {
  const prev = matrix[scopeKey];
  const cleanIds = [...nextCourseIds];

  if (!prev) {
    return {
      ...matrix,
      [scopeKey]: {
        currentVersion: 'v1.0',
        courseIds: cleanIds,
        versions: {},
        versionHistory: [{ version: 'v1.0', updatedBy: meta.updatedBy || 'Admin', updatedAt: meta.updatedAt, note: meta.note || 'Khởi tạo lộ trình.' }],
      },
    };
  }

  const sameContent =
    prev.courseIds.length === cleanIds.length && prev.courseIds.every((id, idx) => id === cleanIds[idx]);
  if (sameContent) return matrix;

  const oldVersion = prev.currentVersion || 'v1.0';
  const newVersion = nextMajorVersion(oldVersion);
  return {
    ...matrix,
    [scopeKey]: {
      currentVersion: newVersion,
      courseIds: cleanIds,
      versions: {
        ...prev.versions,
        [oldVersion]: { courseIds: prev.courseIds, archivedAt: meta.updatedAt, updatedBy: meta.updatedBy || 'Admin', changeLog: meta.note || `Phiên bản ${oldVersion} được đóng băng khi phát hành ${newVersion}.` },
      },
      versionHistory: [
        { version: newVersion, updatedBy: meta.updatedBy || 'Admin', updatedAt: meta.updatedAt, note: meta.note || `Phát hành phiên bản ${newVersion}.` },
        ...(prev.versionHistory || []),
      ],
    },
  };
}

/**
 * Chuyển ma trận Level x Branch cũ (CURRENT_ROADMAPS) sang scope-key phẳng
 * `${buId}:*:*:*:${level}` — giữ nguyên 100% cấu hình đã có, không mất dữ liệu
 * khi nâng cấp lên mô hình đa tầng. Mỗi entry khởi tạo ở v1.0.
 */
export function migrateLevelBranchMatrix(oldMatrix) {
  const next = {};
  Object.entries(oldMatrix || {}).forEach(([level, byBranch]) => {
    Object.entries(byBranch || {}).forEach(([branch, set]) => {
      const buId = buIdForBranch(branch);
      const key = buildScopeKey({ buId, level });
      next[key] = { currentVersion: 'v1.0', courseIds: [...(set?.courseIds || [])], versions: {}, versionHistory: [] };
    });
  });
  return next;
}

/**
 * Liệt kê TOÀN BỘ vị trí tổ chức có thật (BU x Division x Department x
 * Sub-Department) đang có ít nhất 1 nhân sự, kèm headcount theo từng Level —
 * dùng để dựng Danh Bạ Lộ Trình (Roadmap Directory) hiển thị đúng những gì
 * học viên thực tế nhìn thấy, thay vì chỉ liệt kê những scope Admin đã lỡ cấu
 * hình.
 */
export function listRealOrgPositions(users) {
  const map = new Map();
  (users || []).forEach((u) => {
    const buId = buIdForBranch(u.branch);
    const key = [buId, u.divisionId || '', u.departmentId || '', subScopeIdOf(u) || ''].join('|');
    if (!map.has(key)) {
      map.set(key, {
        buId,
        divisionId: u.divisionId || null,
        departmentId: u.departmentId || null,
        subDepartmentId: subScopeIdOf(u) || null,
        levelCounts: {},
      });
    }
    const entry = map.get(key);
    entry.levelCounts[u.level] = (entry.levelCounts[u.level] || 0) + 1;
  });
  return Array.from(map.values());
}
