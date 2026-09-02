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
        label: `👥 ${g.title || g.name} (${g.memberCount || g.memberUserIds?.length || 0} members)`,
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
 * Flexible cascading drill-down filtering of the target list.
 */
export function getCascadingTargetOptions({
  scope = 'DIVISION', // 'BUSINESS_UNIT' | 'DIVISION' | 'DEPARTMENT' | 'SUBDEPARTMENT' | 'LEVEL' | 'STORE' | 'USER' | 'GROUP'
  buFilter = 'ALL',
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
    case 'BUSINESS_UNIT': {
      let list = (businessUnits || []).map((b) => {
        const divCount = divisions.filter((d) => d.businessUnitId === b.id).length;
        const deptCount = departments.filter((dept) => {
          const d = divisions.find((div) => div.id === dept.divisionId);
          return d && d.businessUnitId === b.id;
        }).length;
        return {
          id: b.id,
          code: b.code || 'MMVN',
          name: b.name,
          label: `🏢 [${b.code || 'MMVN'}] ${b.name}`,
          subtitle: `${divCount || divisions.length} Divisions · ${deptCount || departments.length} Departments (Enterprise-Wide)`,
          badge: b.code || 'BU',
        };
      });
      if (buFilter !== 'ALL') {
        list = list.filter((b) => b.id === buFilter);
      }
      if (q) {
        list = list.filter((b) => b.label.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || (b.code && b.code.toLowerCase().includes(q)));
      }
      return list;
    }

    case 'DIVISION': {
      let list = divisions.map((d) => {
        const deptCount = departments.filter((dept) => dept.divisionId === d.id).length;
        const bu = businessUnits.find((b) => b.id === d.businessUnitId);
        return {
          id: d.id,
          code: d.code,
          name: d.name,
          businessUnitId: d.businessUnitId,
          label: `🏢 [${d.code}] ${d.name}`,
          subtitle: `${deptCount} departments below${bu ? ` · BU: ${bu.code || bu.name}` : ''}`,
          badge: d.code,
        };
      });
      if (buFilter !== 'ALL') {
        list = list.filter((d) => d.businessUnitId === buFilter);
      }
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
        const bu = div ? businessUnits.find((b) => b.id === div.businessUnitId) : null;
        const subCount = subDepartments.filter((s) => s.departmentId === dept.id).length;
        return {
          id: dept.id,
          code: dept.code,
          name: dept.name,
          divisionId: dept.divisionId,
          businessUnitId: div ? div.businessUnitId : null,
          label: `🏛️ [${dept.code}] ${dept.name} (${div ? div.code : 'MMVN'})`,
          subtitle: `${subCount} Sub-Departments · Division: ${div ? div.name : 'MMVN'}${bu ? ` · BU: ${bu.code || bu.name}` : ''}`,
          badge: dept.code,
        };
      });
      if (buFilter !== 'ALL') {
        list = list.filter((d) => d.businessUnitId === buFilter);
      }
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
        const bu = parentDiv ? businessUnits.find((b) => b.id === parentDiv.businessUnitId) : null;
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          departmentId: s.departmentId,
          divisionId: parentDept ? parentDept.divisionId : null,
          businessUnitId: parentDiv ? parentDiv.businessUnitId : null,
          label: `🌿 [${s.code}] ${s.name} (${parentDept ? parentDept.name : 'MMVN'})`,
          subtitle: `Department: ${parentDept ? parentDept.name : 'MMVN'} · Division: ${parentDiv ? parentDiv.name : 'MMVN'}${bu ? ` · BU: ${bu.code || bu.name}` : ''}`,
          badge: s.code,
        };
      });
      if (buFilter !== 'ALL') {
        list = list.filter((s) => s.businessUnitId === buFilter);
      }
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
        subtitle: `Job title headcount: ${l.name || l.title}`,
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
        subtitle: st.address || 'MM Mega Market system',
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
        label: `👥 ${g.title || g.name} (${g.memberCount || g.memberUserIds?.length || 0} members · ${g.code})`,
        subtitle: g.description || 'Custom groups managed by the User Admin',
        memberCount: g.memberCount || g.memberUserIds?.length || 0,
        memberUserIds: g.memberUserIds || [],
        type: g.type,
      }));
      if (q) {
        list = list.filter((g) => g.label.toLowerCase().includes(q) || g.title.toLowerCase().includes(q) || g.code.toLowerCase().includes(q));
      }
      return list;
    }

    case 'USER': {
      const sourceList = (usersList && usersList.length > 0)
        ? usersList
        : (typeof allUsers === 'function' ? allUsers() : (demoUsers || []));

      let mapped = sourceList.map((u) => {
        const sub = u.subDepartmentId ? subDepartments.find((s) => s.id === u.subDepartmentId) : null;
        const dept = u.departmentId ? departments.find((d) => d.id === u.departmentId) : null;
        const div = u.divisionId ? divisions.find((d) => d.id === u.divisionId) : (dept ? divisions.find((d) => d.id === dept.divisionId) : null);
        const subInfo = u.subDepartmentName ? `🌿 ${u.subDepartmentName}` : (sub ? `🌿 ${sub.name}` : '');
        const deptInfo = u.departmentName || (dept ? dept.name : (u.department || 'MMVN'));

        return {
          id: u.userId,
          userId: u.userId,
          employeeCode: u.employeeCode,
          fullName: u.fullName,
          avatar: u.avatar,
          level: String(u.level || ''),
          position: u.position,
          label: `${u.fullName} (${u.employeeCode || u.userId})`,
          subtitle: [deptInfo, subInfo, u.storeName || u.storeId].filter(Boolean).join(' · '),
          departmentId: u.departmentId,
          departmentCode: u.departmentCode,
          departmentName: u.departmentName,
          subDepartmentId: u.subDepartmentId,
          subDepartmentCode: u.subDepartmentCode,
          subDepartmentName: u.subDepartmentName,
          divisionId: u.divisionId || (dept ? dept.divisionId : null),
          divisionCode: u.divisionCode,
          businessUnitId: div ? div.businessUnitId : (u.businessUnitId || 'bu-mmvn'),
          storeId: u.storeId,
          storeName: u.storeName,
          badge: `Lvl ${u.level}`,
        };
      });

      if (buFilter !== 'ALL') {
        mapped = mapped.filter((u) => u.businessUnitId === buFilter);
      }
      if (divisionFilter !== 'ALL') {
        mapped = mapped.filter((u) => u.divisionId === divisionFilter);
      }
      if (deptFilter !== 'ALL') {
        mapped = mapped.filter((u) => u.departmentId === deptFilter);
      }
      if (subDeptFilter !== 'ALL') {
        mapped = mapped.filter((u) => u.subDepartmentId === subDeptFilter);
      }
      if (levelFilter !== 'ALL') {
        mapped = mapped.filter((u) => u.level === String(levelFilter));
      }
      if (storeFilter !== 'ALL') {
        mapped = mapped.filter((u) => u.storeId === storeFilter);
      }

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
    GROUP: 'Custom User Group',
    BUSINESS_UNIT: 'Business Unit (Nationwide)',
    DIVISION: 'Division',
    DEPARTMENT: 'Department',
    SUBDEPARTMENT: 'Sub-Department',
    AREA: 'Operations Area',
    STORE_TYPE: 'Store Type',
    CLUSTER: 'Store Cluster',
    STORE: 'Specific Location / Store',
    LEVEL: 'Job Level Framework (Level 1-7)',
    ROLE: 'System Role',
    USER: 'Individual User',
  }[t] || t;
}

export function resolveTargetLabel(assignmentType, targetId) {
  if (!targetId) return 'All';
  if (assignmentType === 'BUSINESS_UNIT') {
    const bu = businessUnits.find((b) => b.id === targetId || b.code === targetId);
    if (bu) return `🏢 [${bu.code || 'MMVN'}] ${bu.name}`;
  }
  if (assignmentType === 'DIVISION') {
    const div = divisions.find((d) => d.id === targetId || d.code === targetId);
    if (div) return `🏢 [${div.code}] ${div.name}`;
  }
  if (assignmentType === 'DEPARTMENT') {
    const dept = departments.find((d) => d.id === targetId || d.code === targetId);
    if (dept) return `🏛️ [${dept.code}] ${dept.name}`;
  }
  if (assignmentType === 'SUBDEPARTMENT') {
    const sub = subDepartments.find((s) => s.id === targetId || s.code === targetId);
    if (sub) return `🌿 [${sub.code}] ${sub.name}`;
  }
  if (assignmentType === 'STORE') {
    const st = retailStores.find((s) => s.id === targetId || s.code === targetId);
    if (st) return `📍 [${st.code}] ${st.name}`;
  }
  if (assignmentType === 'LEVEL') {
    const lvl = jobLevels.find((l) => String(l.level) === String(targetId));
    if (lvl) return `🎯 Level ${lvl.level} — ${lvl.title}`;
  }
  if (assignmentType === 'GROUP') {
    const grp = DEFAULT_CUSTOM_GROUPS.find((g) => g.id === targetId || g.code === targetId);
    if (grp) return `👥 ${grp.title || grp.name}`;
  }
  if (assignmentType === 'USER') {
    const uList = typeof allUsers === 'function' ? allUsers() : (demoUsers || []);
    const u = uList.find((usr) => usr.userId === targetId || usr.employeeCode === targetId || usr.id === targetId);
    if (u) return `👤 ${u.fullName} (${u.employeeCode || u.userId} · Lvl ${u.level})`;
  }
  const opts = targetOptionsFor(assignmentType) || [];
  const found = opts.find((o) => o.id === targetId || o.code === targetId);
  return found ? (found.label || found.name || targetId) : targetId;
}
