import {
  businessUnits, divisions, departments, subDepartments, jobLevels,
  operationsAreas, storeTypes, clusters, retailStores,
  demoUsers, allUsers,
} from './mockData';
import { ROLE_DEFINITIONS } from './roles';
import { DEFAULT_CUSTOM_GROUPS } from './customGroupsData';

export {
  businessUnits,
  divisions,
  departments,
  subDepartments,
  jobLevels,
  operationsAreas,
  storeTypes,
  clusters,
  retailStores,
};

export const ASSIGNMENT_TYPES = [
  'GROUP',
  'BUSINESS_UNIT', 'DIVISION', 'DEPARTMENT', 'SUBDEPARTMENT',
  'AREA', 'STORE_TYPE', 'CLUSTER', 'STORE',
  'LEVEL', 'ROLE', 'USER',
];

export const TARGET_ID_FIELD = {
  GROUP: 'targetGroupId',
  BUSINESS_UNIT: 'targetBusinessUnitId',
  DIVISION: 'targetDivisionId',
  DEPARTMENT: 'targetDepartmentId',
  SUBDEPARTMENT: 'targetSubDepartmentId',
  AREA: 'targetAreaId',
  STORE_TYPE: 'targetStoreTypeId',
  CLUSTER: 'targetClusterId',
  STORE: 'targetStoreId',
  LEVEL: 'targetLevel',
  ROLE: 'targetRole',
  USER: 'targetUserId',
};

export function targetOptionsFor(assignmentType, customGroupsList = null) {
  switch (assignmentType) {
    case 'GROUP': {
      const groups = (customGroupsList && customGroupsList.length > 0) ? customGroupsList : DEFAULT_CUSTOM_GROUPS;
      return groups.map((g) => ({
        id: g.id,
        code: g.code,
        title: g.title || g.name,
        label: `👥 ${g.title || g.name} (${g.memberCount || g.memberUserIds?.length || 0} thành viên)`,
        memberCount: g.memberCount || g.memberUserIds?.length || 0,
        memberUserIds: g.memberUserIds || [],
        type: g.type,
      }));
    }
    case 'BUSINESS_UNIT': return businessUnits.map((b) => ({ id: b.id, label: b.name }));
    case 'DIVISION': return divisions.map((d) => ({ id: d.id, code: d.code, name: d.name, label: `🏢 [${d.code}] ${d.name}` }));
    case 'DEPARTMENT': return departments.map((d) => ({ id: d.id, code: d.code, name: d.name, divisionId: d.divisionId, label: `🏛️ [${d.code}] ${d.name}` }));
    case 'SUBDEPARTMENT': return subDepartments.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      departmentId: s.departmentId,
      label: `🌿 [${s.code}] ${s.name}`,
    }));
    case 'AREA': return operationsAreas.map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }));
    case 'STORE_TYPE': return storeTypes.map((t) => ({ id: t.id, label: `${t.code} - ${t.name}` }));
    case 'CLUSTER': return clusters.map((c) => ({ id: c.id, label: `${c.code} - ${c.name}` }));
    case 'STORE': return retailStores.map((s) => ({ id: s.id, code: s.code, name: s.name, label: `📍 [${s.code}] ${s.name}` }));
    case 'LEVEL': return jobLevels.map((l) => ({ id: String(l.level), level: String(l.level), label: `🎯 Level ${l.level} — ${l.title}` }));
    case 'ROLE': return ROLE_DEFINITIONS.map((r) => ({ id: r.id, label: `${r.labelVi} (${r.shortVi})` }));
    case 'USER': {
      const list = typeof allUsers === 'function' ? allUsers() : (demoUsers || []);
      return list
        .map((u) => {
          const subInfo = u.subDepartmentName ? ` · 🌿 ${u.subDepartmentName}` : (u.subDepartmentCode ? ` · ${u.subDepartmentCode}` : '');
          const deptInfo = u.departmentCode || u.departmentName || u.department || 'MMVN';
          return {
            id: u.userId,
            label: `${u.fullName} (${u.employeeCode || u.userId} · Lvl ${u.level} · ${deptInfo}${subInfo})`,
            level: String(u.level || ''),
            fullName: u.fullName,
            employeeCode: u.employeeCode,
            departmentId: u.departmentId,
            departmentCode: u.departmentCode,
            departmentName: u.departmentName,
            subDepartmentId: u.subDepartmentId,
            subDepartmentCode: u.subDepartmentCode,
            subDepartmentName: u.subDepartmentName,
            divisionId: u.divisionId,
            divisionCode: u.divisionCode,
            storeId: u.storeId,
            storeName: u.storeName,
          };
        });
    }
    default: return [];
  }
}

/**
 * Lọc danh sách đối tượng linh hoạt theo phân tầng (Cascading Drill-Down).
 */
export function getCascadingTargetOptions({
  scope = 'DIVISION', // 'DIVISION' | 'DEPARTMENT' | 'SUBDEPARTMENT' | 'LEVEL' | 'STORE' | 'USER' | 'GROUP'
  divisionFilter = 'ALL',
  deptFilter = 'ALL',
  subDeptFilter = 'ALL',
  levelFilter = 'ALL',
  storeFilter = 'ALL',
  search = '',
  customGroups = [],
  usersList = null,
}) {
  const q = (search || '').toLowerCase().trim();

  switch (scope) {
    case 'DIVISION': {
      let list = divisions.map((d) => {
        const deptCount = departments.filter((dept) => dept.divisionId === d.id).length;
        return {
          id: d.id,
          code: d.code,
          name: d.name,
          label: `🏢 [${d.code}] ${d.name}`,
          subtitle: `${deptCount} Phòng ban trực thuộc`,
          badge: d.code,
        };
      });
      if (divisionFilter !== 'ALL') {
        list = list.filter((d) => d.id === divisionFilter);
      }
      if (q) {
        list = list.filter((d) => d.label.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
      }
      return list;
    }

    case 'DEPARTMENT': {
      let list = departments.map((dept) => {
        const div = divisions.find((d) => d.id === dept.divisionId);
        const subCount = subDepartments.filter((s) => s.departmentId === dept.id).length;
        return {
          id: dept.id,
          code: dept.code,
          name: dept.name,
          divisionId: dept.divisionId,
          label: `🏛️ [${dept.code}] ${dept.name} (${div ? div.code : 'MMVN'})`,
          subtitle: `${subCount} Sub-Departments · Khối: ${div ? div.name : 'MMVN'}`,
          badge: dept.code,
        };
      });
      if (divisionFilter !== 'ALL') {
        list = list.filter((d) => d.divisionId === divisionFilter);
      }
      if (deptFilter !== 'ALL') {
        list = list.filter((d) => d.id === deptFilter);
      }
      if (q) {
        list = list.filter((d) => d.label.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
      }
      return list;
    }

    case 'SUBDEPARTMENT': {
      let list = subDepartments.map((s) => {
        const parentDept = departments.find((d) => d.id === s.departmentId);
        const parentDiv = parentDept ? divisions.find((d) => d.id === parentDept.divisionId) : null;
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          departmentId: s.departmentId,
          divisionId: parentDept ? parentDept.divisionId : null,
          label: `🌿 [${s.code}] ${s.name} (${parentDept ? parentDept.name : 'MMVN'})`,
          subtitle: `Phòng: ${parentDept ? parentDept.name : 'MMVN'} · Khối: ${parentDiv ? parentDiv.name : 'MMVN'}`,
          badge: s.code,
        };
      });
      if (divisionFilter !== 'ALL') {
        list = list.filter((s) => s.divisionId === divisionFilter);
      }
      if (deptFilter !== 'ALL') {
        list = list.filter((s) => s.departmentId === deptFilter);
      }
      if (subDeptFilter !== 'ALL') {
        list = list.filter((s) => s.id === subDeptFilter);
      }
      if (q) {
        list = list.filter((s) => s.label.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
      }
      return list;
    }

    case 'LEVEL': {
      let list = jobLevels.map((l) => ({
        id: String(l.level),
        level: String(l.level),
        label: `🎯 Level ${l.level} — ${l.title}`,
        subtitle: `Định biên chức danh: ${l.name || l.title}`,
        badge: `Level ${l.level}`,
      }));
      if (levelFilter !== 'ALL') {
        list = list.filter((l) => l.level === String(levelFilter));
      }
      if (q) {
        list = list.filter((l) => l.label.toLowerCase().includes(q) || l.subtitle.toLowerCase().includes(q));
      }
      return list;
    }

    case 'STORE': {
      let list = retailStores.map((st) => ({
        id: st.id,
        code: st.code,
        name: st.name,
        label: `📍 [${st.code}] ${st.name}`,
        subtitle: st.address || 'Hệ thống MM Mega Market',
        badge: st.code,
      }));
      if (storeFilter !== 'ALL') {
        list = list.filter((st) => st.id === storeFilter);
      }
      if (q) {
        list = list.filter((st) => st.label.toLowerCase().includes(q) || st.name.toLowerCase().includes(q));
      }
      return list;
    }

    case 'GROUP': {
      const groups = (customGroups && customGroups.length > 0) ? customGroups : DEFAULT_CUSTOM_GROUPS;
      let list = groups.map((g) => ({
        id: g.id,
        code: g.code,
        title: g.title || g.name,
        label: `👥 ${g.title || g.name} (${g.memberCount || g.memberUserIds?.length || 0} thành viên · ${g.code})`,
        subtitle: g.description || 'Nhóm tùy chỉnh do User Admin quản lý',
        memberCount: g.memberCount || g.memberUserIds?.length || 0,
        memberUserIds: g.memberUserIds || [],
        type: g.type,
        badge: g.type === 'DYNAMIC' ? 'Động' : 'Tĩnh',
      }));
      if (q) {
        list = list.filter((g) => g.label.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q)));
      }
      return list;
    }

    case 'USER':
    default: {
      const list = usersList && usersList.length > 0 ? usersList : (typeof allUsers === 'function' ? allUsers() : (demoUsers || []));
      let filtered = list.filter((u) => {
        if (divisionFilter !== 'ALL') {
          if (u.divisionId && u.divisionId !== divisionFilter && u.divisionCode !== divisionFilter) return false;
        }
        if (deptFilter !== 'ALL') {
          if (u.departmentId && u.departmentId !== deptFilter && u.departmentCode !== deptFilter) return false;
        }
        if (subDeptFilter !== 'ALL') {
          if (u.subDepartmentId && u.subDepartmentId !== subDeptFilter && u.subDepartmentCode !== subDeptFilter) return false;
        }
        if (levelFilter !== 'ALL') {
          if (String(u.level) !== String(levelFilter)) return false;
        }
        if (storeFilter !== 'ALL') {
          if (u.storeId && u.storeId !== storeFilter) return false;
        }
        return true;
      });

      let mapped = filtered.map((u) => {
        const subInfo = u.subDepartmentName ? ` · 🌿 ${u.subDepartmentName}` : (u.subDepartmentCode ? ` · ${u.subDepartmentCode}` : '');
        const deptInfo = u.departmentCode || u.departmentName || u.department || 'MMVN';
        const storeInfo = u.storeName || (u.storeId ? ` · 📍 ${u.storeId}` : '');
        return {
          id: u.userId,
          label: `${u.fullName} (${u.employeeCode || u.userId} · Lvl ${u.level} · ${deptInfo}${subInfo}${storeInfo})`,
          subtitle: `${u.position || u.title || 'Store Associate'} · ${deptInfo}${subInfo}`,
          level: String(u.level || ''),
          fullName: u.fullName,
          employeeCode: u.employeeCode,
          departmentId: u.departmentId,
          departmentCode: u.departmentCode,
          departmentName: u.departmentName,
          subDepartmentId: u.subDepartmentId,
          subDepartmentCode: u.subDepartmentCode,
          subDepartmentName: u.subDepartmentName,
          divisionId: u.divisionId,
          divisionCode: u.divisionCode,
          storeId: u.storeId,
          storeName: u.storeName,
          badge: `Lvl ${u.level}`,
        };
      });

      if (q) {
        mapped = mapped.filter((u) =>
          u.label.toLowerCase().includes(q) ||
          u.fullName.toLowerCase().includes(q) ||
          (u.employeeCode && u.employeeCode.toLowerCase().includes(q)) ||
          (u.departmentName && u.departmentName.toLowerCase().includes(q))
        );
      }
      return mapped;
    }
  }
}

export function assignmentTypeLabel(t) {
  return {
    GROUP: 'Nhóm Người Dùng Tùy Chỉnh (Custom Group)',
    BUSINESS_UNIT: 'Business Unit (Khối Toàn Quốc)',
    DIVISION: 'Khối (Division)',
    DEPARTMENT: 'Phòng Ban (Department)',
    SUBDEPARTMENT: 'Bộ Phận Trực Thuộc (Sub-Department)',
    AREA: 'Vùng Vận Hành (Operations Area)',
    STORE_TYPE: 'Mô Hình Siêu Thị (Store Type)',
    CLUSTER: 'Cụm Siêu Thị (Cluster)',
    STORE: 'Địa Điểm / Siêu Thị Cụ Thể (Store)',
    LEVEL: 'Khung Cấp Bậc (Job Level 1-7)',
    ROLE: 'Vai Trò Hệ Thống (Role)',
    USER: 'Từng Nhân Sự Cụ Thể (Individual User)',
  }[t] || t;
}
