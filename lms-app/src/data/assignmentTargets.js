import {
  businessUnits, divisions, departments, subDepartments, jobLevels,
  operationsAreas, storeTypes, clusters, retailStores,
  demoUsers, allUsers,
} from './mockData';
import { ROLE_DEFINITIONS } from './roles';
import { DEFAULT_CUSTOM_GROUPS } from './customGroupsData';

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
    case 'DIVISION': return divisions.map((d) => ({ id: d.id, label: `${d.code} - ${d.name}` }));
    case 'DEPARTMENT': return departments.map((d) => ({ id: d.id, label: `${d.code} - ${d.name}` }));
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
    case 'STORE': return retailStores.map((s) => ({ id: s.id, label: `${s.code} - ${s.name}` }));
    case 'LEVEL': return jobLevels.map((l) => ({ id: l.level, label: `Level ${l.level} - ${l.title}` }));
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
            departmentCode: u.departmentCode,
            departmentName: u.departmentName,
            subDepartmentId: u.subDepartmentId,
            subDepartmentCode: u.subDepartmentCode,
            subDepartmentName: u.subDepartmentName,
            divisionCode: u.divisionCode,
          };
        });
    }
    default: return [];
  }
}

export function assignmentTypeLabel(t) {
  return {
    GROUP: 'Nhóm Người Dùng Tùy Chỉnh (Custom Group)',
    BUSINESS_UNIT: 'Business Unit (Khối Toàn Quốc)',
    DIVISION: 'Division (Head Office / Khối)',
    DEPARTMENT: 'Department (Phòng Ban)',
    SUBDEPARTMENT: 'Sub-Department (Bộ phận trực thuộc)',
    AREA: 'Operations Area (North/Central/South)',
    STORE_TYPE: 'Store Type (C&C / Super Center / Food Service / Depot)',
    CLUSTER: 'Store Cluster',
    STORE: 'Specific Store (Siêu thị cụ thể)',
    LEVEL: 'Job Level (Cấp bậc 1-7)',
    ROLE: 'Role (Vai trò)',
    USER: 'Individual User (Từng nhân sự)',
  }[t] || t;
}
