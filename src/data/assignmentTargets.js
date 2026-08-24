import {
  businessUnits, divisions, departments, jobLevels,
  operationsAreas, storeTypes, clusters, retailStores,
  demoUsers, allUsers,
} from './mockData';

export const ASSIGNMENT_TYPES = [
  'BUSINESS_UNIT', 'DIVISION', 'DEPARTMENT',
  'AREA', 'STORE_TYPE', 'CLUSTER', 'STORE',
  'LEVEL', 'ROLE', 'USER',
];

export const TARGET_ID_FIELD = {
  BUSINESS_UNIT: 'targetBusinessUnitId',
  DIVISION: 'targetDivisionId',
  DEPARTMENT: 'targetDepartmentId',
  AREA: 'targetAreaId',
  STORE_TYPE: 'targetStoreTypeId',
  CLUSTER: 'targetClusterId',
  STORE: 'targetStoreId',
  LEVEL: 'targetLevel',
  ROLE: 'targetRole',
  USER: 'targetUserId',
};

export function targetOptionsFor(assignmentType) {
  switch (assignmentType) {
    case 'BUSINESS_UNIT': return businessUnits.map((b) => ({ id: b.id, label: b.name }));
    case 'DIVISION': return divisions.map((d) => ({ id: d.id, label: `${d.code} - ${d.name}` }));
    case 'DEPARTMENT': return departments.map((d) => ({ id: d.id, label: `${d.code} - ${d.name}` }));
    case 'AREA': return operationsAreas.map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }));
    case 'STORE_TYPE': return storeTypes.map((t) => ({ id: t.id, label: `${t.code} - ${t.name}` }));
    case 'CLUSTER': return clusters.map((c) => ({ id: c.id, label: `${c.code} - ${c.name}` }));
    case 'STORE': return retailStores.map((s) => ({ id: s.id, label: `${s.code} - ${s.name}` }));
    case 'LEVEL': return jobLevels.map((l) => ({ id: l.level, label: `Level ${l.level} - ${l.title}` }));
    case 'ROLE': return [
      { id: 'admin', label: 'Admin (HRD Director Level 1)' },
      { id: 'manager', label: 'Line Manager (Level 4-5)' },
      { id: 'learner', label: 'Learner (Level 6-7, CL, IN)' },
    ];
    case 'USER': return (demoUsers || allUsers())
      .filter((u) => u.role !== 'admin')
      .map((u) => ({ id: u.userId, label: `${u.fullName} (${u.employeeCode} · Lvl ${u.level} · ${u.divisionCode}-${u.departmentCode})` }));
    default: return [];
  }
}

export function assignmentTypeLabel(t) {
  return {
    BUSINESS_UNIT: 'Business Unit',
    DIVISION: 'Division (Head Office)',
    DEPARTMENT: 'Department (Head Office)',
    AREA: 'Operations Area (North/Central/South)',
    STORE_TYPE: 'Store Type (C&C / Super Center / Food Service / Depot)',
    CLUSTER: 'Store Cluster',
    STORE: 'Specific Store',
    LEVEL: 'Job Level',
    ROLE: 'Role',
    USER: 'Individual User',
  }[t] || t;
}
