// ===========================================================================
// MM Mega Market Vietnam (MMVN) - 100 Enterprise Users & 100 Enterprise Courses
// Coherent, Cross-Referenced Multi-Persona Dataset (Completed, In-Progress,
// Not-Started, Overdue, Failed) with Dual Hierarchy (Operations & Supporting)
// ===========================================================================

import {
  divisions,
  departments,
  jobLevels,
  retailStores,
  clusters,
  operationsAreas,
  storeTypes,
  storeDepartments,
  storeSections,
} from './orgHierarchy';

// ---------------------------------------------------------------------------
// 1. GENERATE 100 REALISTIC ENTERPRISE USERS (WITH FULL TALENT PROFILES)
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Minh', 'Thanh', 'Quoc', 'David', 'Sarah', 'Hoang', 'Duc', 'Huong', 'Kim', 'Bao',
  'Linh', 'Tuan', 'Phong', 'Mai', 'Lan', 'Nam', 'Trang', 'Hien', 'Thao', 'Phuong',
  'Ngoc', 'Ha', 'Cuong', 'Vy', 'Son', 'Long', 'Dung', 'Chau', 'Thang', 'Khang',
  'Yen', 'Khoa', 'Huy', 'Nga', 'Tam', 'Hung', 'My', 'An', 'Binh', 'Tai'
];

const LAST_NAMES = [
  'Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Phan', 'Vu', 'Vo', 'Dang', 'Bui',
  'Do', 'Ho', 'Ngo', 'Duong', 'Ly', 'Doan', 'Truong', 'Dinh', 'Lam', 'Ha'
];

const POSITIONS_BY_DEPT = {
  PPF: ['Bakery Section Specialist', 'Pastry Chef Associate', 'Line Cook Specialist', 'Dough Prep Associate', 'Meat Processing Lead', 'Butcher Specialist', 'Deli Counter Associate'],
  MIE: ['Dairy & Frozen Specialist', 'Chilled Foods Inspector', 'Cold Storage Supervisor', 'Ice Cream Section Lead'],
  UF: ['Fresh Produce Inspector', 'Fruit & Veg Section Lead', 'Organic Sourcing Associate', 'Produce Display Lead'],
  DF: ['Dry Grocery Specialist', 'Beverage & Snack Merchandiser', 'Packaged Goods Inventory Clerk', 'Cereal Section Lead'],
  SC: ['Logistics & Warehouse Specialist', 'Forklift Operations Lead', 'Inbound Receiving Clerk', 'Cross-Docking Coordinator', 'Fleet Dispatch Specialist'],
  OPX: ['Store Operations Supervisor', 'Floor Operations Assistant', 'Cashier Team Leader', 'POS Terminal Supervisor', 'Customer Service Specialist'],
  QA: ['Quality Assurance Lead Inspector', 'Food Hygiene Auditor', 'Vendor Compliance Specialist', 'HACCP Testing Specialist'],
  SOP: ['Store SOP Compliance Officer', 'Audit Trail Specialist', 'Standardization Lead'],
  'L&OD': ['L&D Program Director', 'Organizational Development Specialist', 'Instructional Designer', 'Corporate Trainer Lead'],
  HRBP: ['HR Business Partner - Retail Stores', 'HRBP - Supply Chain & Logistics', 'Senior People Partner'],
  'C&B': ['Compensation & Benefits Specialist', 'Payroll Compliance Officer', 'Labor Insurance Lead'],
  TA: ['Talent Acquisition Specialist', 'Retail Recruiter Lead', 'Campus Recruitment Associate'],
  LP: ['Loss Prevention Lead Officer', 'Store Security Specialist', 'CCTV & Surveillance Lead', 'Shrink Investigation Officer'],
  FA: ['Senior Financial Analyst', 'Management Accountant', 'Store CAPEX Controller'],
  CTRL: ['Senior General Accountant', 'Accounts Payable Specialist', 'Store Audit Reconciliation Clerk'],
  TRE: ['Corporate Treasury Specialist', 'Cash Flow & Banking Lead'],
  MIS: ['Cybersecurity Defense Lead', 'IT Infrastructure Compliance Officer', 'Enterprise Applications Specialist'],
  ECOM: ['Omnichannel Fulfillment Lead', 'Online Order Processing Specialist', 'Last-Mile Delivery Coordinator', 'E-Commerce Merchandiser'],
  MKT: ['Brand Campaign Specialist', 'Trade Marketing Executive', 'Digital Media Specialist', 'In-Store Promotion Lead'],
  PRC: ['Pricing & Margin Analyst', 'Commercial Strategy Specialist', 'Promotions Pricing Coordinator'],
  CDD: ['B2B Sales Development Lead', 'Key Account Executive', 'Horeca Channel Specialist'],
  IA: ['Senior Internal Auditor', 'Financial & Operational Audit Specialist', 'Compliance Risk Inspector'],
  RSK: ['Enterprise Risk Officer', 'Business Continuity Specialist', 'Operational Risk Analyst'],
  LG: ['Senior Legal Counsel', 'Contract & Regulatory Specialist', 'Corporate Compliance Lead'],
  PROP: ['Facilities & Property Maintenance Lead', 'HVAC & Refrigeration Technician', 'Energy Management Specialist'],
  TU: ['Trade Union Committee Member', 'Employee Welfare Coordinator'],
};

export const generated100Users = Array.from({ length: 100 }, (_, i) => {
  const empNum = 1001 + i;
  const userId = `USR-${empNum}`;
  const employeeCode = `MMVN-${empNum}`;

  // Anchor primary demo personas
  if (i === 0) {
    return {
      userId: 'USR-0001',
      employeeCode: 'MMVN-0001',
      fullName: 'Sarah Nguyen',
      email: 'sarah.nguyen@mmvietnam.com',
      role: 'admin',
      position: 'Head of Division - HR Director / BOM',
      level: '1',
      levelTitle: 'Head of Division - Director / BOM',
      branch: 'SUPPORTING',
      branchName: 'Khối Chức năng Hỗ trợ (Head Office)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-hrd', divisionCode: 'HRD', divisionName: 'Human Resource & L&OD',
      departmentId: 'dept-lod', departmentCode: 'L&OD', departmentName: 'Learning & Org Dev',
      areaId: 'area-south', areaName: 'Khu vực Miền Nam',
      storeId: null, storeName: 'Head Office (An Phú, TP. Thủ Đức)',
      managerId: null,
      status: 'ACTIVE',
      yearsOfService: 7.5,
      joinDate: '2019-03-01',
      avatar: 'SN',
      badgeTone: 'ai',
      description: 'Supreme L&D Authority across all 16 MMVN Divisions, 8 Stores & Talent Pipelines',
      pastPositions: [
        { role: 'Senior Talent Development Manager', period: '2019 - 2022', org: 'MMVN Head Office' },
        { role: 'L&OD Specialist', period: '2017 - 2019', org: 'BigC Regional HQ' },
      ],
      projects: ['Thánh Gióng Leadership Pipeline 2024-2026', 'MMVN Digital Learning LMS Transformation', 'SAP SuccessFactors HRIS Rollout'],
      talentProfile: {
        potential: 'TOP_EXECUTIVE',
        successorFor: 'Chief People Officer (CPO)',
        readiness: 'READY_NOW',
        mentor: 'BOM Chairman',
        skills: ['Strategic L&D', 'Retail Workforce Planning', 'Succession Architecture', 'Kirkpatrick ROI Evaluation'],
      },
    };
  }
  if (i === 1) {
    return {
      userId: 'USR-0245',
      employeeCode: 'MMVN-0245',
      fullName: 'David Tran',
      email: 'david.tran@mmvietnam.com',
      role: 'manager',
      position: 'Department Manager - Fresh Food & Bakery',
      level: '4',
      levelTitle: 'Line Manager / Functional Expert',
      branch: 'OPERATIONS',
      branchName: 'Khối Vận hành (Operations / Stores)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-omd', divisionCode: 'OMD', divisionName: 'Merchandise',
      departmentId: 'dept-ppf', departmentCode: 'PPF', departmentName: 'Processed Fresh Food',
      areaId: 'area-south', areaName: 'Khu vực Miền Nam',
      storeTypeId: 'st-cc', storeTypeName: 'Cash & Carry Hypermarket',
      clusterId: 'clus-hcm-east', clusterName: 'Cluster TP.HCM Đông',
      storeId: 'store-an-phu', storeName: 'MM Mega Market An Phú (Flagship)',
      sectionId: 'sec-bakery', sectionName: 'Bakery & Confectionery Section',
      managerId: 'USR-0001',
      status: 'ACTIVE',
      yearsOfService: 4.8,
      joinDate: '2021-10-15',
      avatar: 'DT',
      badgeTone: 'amber',
      description: 'Manages Fresh Food Department & Mentors 14 Bakery & Meat Specialists at MM An Phú',
      pastPositions: [
        { role: 'Bakery Shift Supervisor', period: '2021 - 2023', org: 'MM Mega Market Bình Phú' },
        { role: 'Senior Pastry Chef', period: '2019 - 2021', org: 'BigC Thăng Long' },
      ],
      projects: ['An Phú Flagship HACCP Gold Standard Certification', 'In-Store Live Baking Workshop Lead', 'Store Shrinkage Reduction Initiative'],
      talentProfile: {
        potential: 'HIGH_POTENTIAL',
        successorFor: 'Store Deputy General Manager (Deputy SGM)',
        readiness: 'READY_IN_6_MONTHS',
        mentor: 'Trần Minh Quang (SGM MM An Phú)',
        skills: ['HACCP Certified Lead', 'Store P&L Optimization', 'Team Coaching (20%)', 'Fresh Food Merchandising'],
      },
    };
  }
  if (i === 2) {
    return {
      userId: 'USR-0312',
      employeeCode: 'MMVN-0312',
      fullName: 'Le Hoang Nam',
      email: 'nam.le@mmvietnam.com',
      role: 'manager',
      position: 'Store Operations Supervisor & Frontline Lead',
      level: '5',
      levelTitle: 'Leader / Supervisor / Specialist',
      branch: 'OPERATIONS',
      branchName: 'Khối Vận hành (Operations / Stores)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-opt', divisionCode: 'OPT', divisionName: 'Operations',
      departmentId: 'dept-opx', departmentCode: 'OPX', departmentName: 'Operations Excellence',
      areaId: 'area-south', areaName: 'Khu vực Miền Nam',
      storeTypeId: 'st-cc', storeTypeName: 'Cash & Carry Hypermarket',
      clusterId: 'clus-hcm-east', clusterName: 'Cluster TP.HCM Đông',
      storeId: 'store-an-phu', storeName: 'MM Mega Market An Phú (Flagship)',
      sectionId: 'sec-pos', sectionName: 'Checkout Lanes & POS Cashiers',
      managerId: 'USR-0245',
      status: 'ACTIVE',
      yearsOfService: 3.2,
      joinDate: '2023-06-01',
      avatar: 'LN',
      badgeTone: 'blue',
      description: 'Manages Store Floor, POS Terminals, Customer Care & Cashier Squad',
      pastPositions: [
        { role: 'POS Cashier Lead', period: '2023 - 2024', org: 'MM An Phú' },
      ],
      projects: ['Self-Checkout Terminal Deployment 2025', 'Customer Service CSAT 95+ Drive'],
      talentProfile: {
        potential: 'EMERGING_LEADER',
        successorFor: 'Store Operations Department Manager',
        readiness: 'READY_IN_1_YEAR',
        mentor: 'David Tran',
        skills: ['POS Operations', 'Frontline Conflict Resolution', 'Shrinkage Mitigation', 'Shift Scheduling'],
      },
    };
  }
  if (i === 3) {
    return {
      userId: 'USR-1042',
      employeeCode: 'MMVN-1042',
      fullName: 'Minh Tran',
      email: 'minh.tran@mmvietnam.com',
      role: 'learner',
      position: 'Bakery Section Specialist',
      level: '6',
      levelTitle: 'Executive / Specialist',
      branch: 'OPERATIONS',
      branchName: 'Khối Vận hành (Operations / Stores)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-omd', divisionCode: 'OMD', divisionName: 'Merchandise',
      departmentId: 'dept-ppf', departmentCode: 'PPF', departmentName: 'Processed Fresh Food',
      areaId: 'area-south', areaName: 'Khu vực Miền Nam',
      storeTypeId: 'st-cc', storeTypeName: 'Cash & Carry Hypermarket',
      clusterId: 'clus-hcm-east', clusterName: 'Cluster TP.HCM Đông',
      storeId: 'store-an-phu', storeName: 'MM Mega Market An Phú (Flagship)',
      sectionId: 'sec-bakery', sectionName: 'Bakery & Confectionery Section',
      managerId: 'USR-0245',
      status: 'ACTIVE',
      yearsOfService: 2.1,
      joinDate: '2024-07-10',
      avatar: 'MT',
      badgeTone: 'sage',
      description: 'Fast-track candidate in Thánh Gióng Leadership Pipeline; Enrolled in HACCP, Cold Chain & 10/20/70 OJT',
      pastPositions: [
        { role: 'Junior Bakery Associate', period: '2024 - 2025', org: 'MM Mega Market Hiệp Phú' },
      ],
      projects: ['European Sourdough Artisan Line Trial', 'MMVN Bread Quality Standardization 2025'],
      talentProfile: {
        potential: 'HIGH_POTENTIAL',
        successorFor: 'Bakery Shift Supervisor',
        readiness: 'READY_IN_6_MONTHS',
        mentor: 'David Tran',
        skills: ['Artisan Baking', 'HACCP Compliance', 'Stock Management', 'Peer Mentoring'],
      },
    };
  }
  if (i === 4) {
    return {
      userId: 'USR-1250',
      employeeCode: 'MMVN-1250',
      fullName: 'Thanh Pham',
      email: 'thanh.pham@mmvietnam.com',
      role: 'learner',
      position: 'Logistics & Inbound DC Specialist',
      level: '6',
      levelTitle: 'Executive / Specialist',
      branch: 'SUPPORTING',
      branchName: 'Khối Chức năng Hỗ trợ (Supply Chain DC)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-scm', divisionCode: 'SCM', divisionName: 'Supply Chain Management',
      departmentId: 'dept-sc', departmentCode: 'SC', departmentName: 'Logistic & Warehouse',
      areaId: 'area-south', areaName: 'Khu vực Miền Nam',
      storeId: null, storeName: 'Regional Distribution Center (Bình Dương DC)',
      managerId: 'USR-0245',
      status: 'TRANSFER',
      yearsOfService: 1.6,
      joinDate: '2025-01-15',
      avatar: 'TP',
      badgeTone: 'rail',
      description: 'Transferred from MM Đà Nẵng to Regional DC; Completing Cross-docking & Forklift Safety Certification',
      pastPositions: [
        { role: 'Goods Receiving Associate', period: '2024 - 2025', org: 'MM Mega Market Đà Nẵng' },
      ],
      projects: ['WMS Warehouse Management System Upgrade 2025'],
      talentProfile: {
        potential: 'CORE_PERFORMER',
        successorFor: 'Inbound Shift Team Leader',
        readiness: 'READY_IN_1_YEAR',
        mentor: 'Đặng Thanh Mai',
        skills: ['Cross-Docking', 'Cold Storage Logistics', 'Inventory Optimization', 'Forklift Safety'],
      },
    };
  }
  if (i === 5) {
    return {
      userId: 'USR-2041',
      employeeCode: 'MMVN-2041',
      fullName: 'Quoc Bao',
      email: 'bao.quoc@mmvietnam.com',
      role: 'learner',
      position: 'Store Fresh Food Associate (New Joiner)',
      level: '7',
      levelTitle: 'Junior Associate / New Joiner',
      branch: 'OPERATIONS',
      branchName: 'Khối Vận hành (Operations / Stores)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-omd', divisionCode: 'OMD', divisionName: 'Merchandise',
      departmentId: 'dept-ppf', departmentCode: 'PPF', departmentName: 'Processed Fresh Food',
      areaId: 'area-south', areaName: 'Khu vực Miền Nam',
      storeTypeId: 'st-cc', storeTypeName: 'Cash & Carry Hypermarket',
      clusterId: 'clus-hcm-east', clusterName: 'Cluster TP.HCM Đông',
      storeId: 'store-an-phu', storeName: 'MM Mega Market An Phú (Flagship)',
      sectionId: 'sec-meat', sectionName: 'Meat & Poultry Section',
      managerId: 'USR-0245',
      status: 'NEW_JOINER',
      yearsOfService: 0.2,
      joinDate: '2026-06-20',
      avatar: 'QB',
      badgeTone: 'slate',
      description: 'Newly onboarded; completing Store Operations Onboarding Track and Food Hygiene Basics',
      pastPositions: [],
      projects: ['Store Onboarding Induction 2026'],
      talentProfile: {
        potential: 'NEW_HIRE',
        successorFor: 'Senior Meat Associate',
        readiness: 'DEVELOPING',
        mentor: 'Minh Tran',
        skills: ['Basic Food Handling', 'Hygiene Standards', 'Customer Greeting'],
      },
    };
  }

  // Generate diverse staff for remaining 94 employees
  const isOperations = i % 3 !== 0; // ~67% Operations, 33% Supporting Functions
  const branch = isOperations ? 'OPERATIONS' : 'SUPPORTING';
  const branchName = isOperations ? 'Khối Vận hành (Operations / Stores)' : 'Khối Chức năng Hỗ trợ (Head Office)';

  const assignedStore = isOperations ? retailStores[i % retailStores.length] : null;
  const storeName = isOperations ? assignedStore.name : 'Head Office (An Phú)';
  const areaId = isOperations ? assignedStore.areaId : 'area-south';
  const areaName = areaId === 'area-north' ? 'Khu vực Miền Bắc' : areaId === 'area-central' ? 'Khu vực Miền Trung' : 'Khu vực Miền Nam';

  const divIndex = i % divisions.length;
  const div = divisions[divIndex];
  const divDepts = departments.filter((d) => d.divisionId === div.id);
  const dept = divDepts.length > 0 ? divDepts[i % divDepts.length] : departments[0];

  const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(i * 3 + 7) % LAST_NAMES.length];
  const fullName = `${lastName} ${firstName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@mmvietnam.com`;

  // Determine Level & Role
  let level = '6';
  let role = 'learner';
  let levelTitle = 'Executive';
  let managerId = 'USR-0245';

  if (i >= 6 && i <= 14) {
    level = (i % 2 === 0) ? '4' : '5';
    role = 'manager';
    levelTitle = (level === '4') ? 'Manager / Functional Expert' : 'Leader / Supervisor / Specialist';
    managerId = 'USR-0001';
  } else if (i >= 85) {
    level = (i % 2 === 0) ? 'CL' : 'IN';
    levelTitle = (level === 'CL') ? 'Casual Labor' : 'Internship';
    managerId = 'USR-0312';
  } else if (i % 5 === 0) {
    level = '7';
    levelTitle = 'Officer / Staff';
    managerId = 'USR-0245';
  }

  const deptPositions = POSITIONS_BY_DEPT[dept.code] || [
    `${dept.name} Specialist`,
    `${dept.name} Associate`,
    `${dept.name} Officer`,
    `${dept.name} Lead`,
  ];
  const position = deptPositions[i % deptPositions.length];
  const initials = `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase();

  // Diverse realistic statuses
  const status = (i === 15 || i === 28) ? 'TRANSFER' : (i === 22 || i === 45 || i === 70) ? 'NEW_JOINER' : (i === 99) ? 'INACTIVE' : 'ACTIVE';
  const yearsOfService = Number((0.3 + (i * 0.12) % 6.5).toFixed(1));

  return {
    userId,
    employeeCode,
    fullName,
    email,
    role,
    position,
    level,
    levelTitle,
    branch,
    branchName,
    businessUnitId: 'bu-mmvn',
    businessUnitCode: 'MMVN',
    divisionId: div.id,
    divisionCode: div.code,
    divisionName: div.name,
    departmentId: dept.id,
    departmentCode: dept.code,
    departmentName: dept.name,
    areaId,
    areaName,
    storeId: assignedStore?.id || null,
    storeName,
    clusterId: assignedStore?.clusterId || null,
    storeTypeId: assignedStore?.typeId || null,
    managerId,
    status,
    yearsOfService,
    joinDate: `202${Math.max(0, 6 - Math.floor(yearsOfService))}-0${(i % 9) + 1}-15`,
    avatar: initials,
    badgeTone: role === 'admin' ? 'ai' : role === 'manager' ? 'amber' : 'rail',
    description: `${position} in ${div.code}/${dept.code} - ${storeName} (Level ${level})`,
    pastPositions: yearsOfService > 1.5 ? [
      { role: `Associate - ${dept.name}`, period: '2023 - 2024', org: storeName }
    ] : [],
    projects: [`MMVN Annual Operational Audit ${2024 + (i % 2)}`],
    talentProfile: {
      potential: level === '4' || level === '5' ? 'HIGH_POTENTIAL' : 'CORE_PERFORMER',
      successorFor: level === '6' ? `${position} Team Leader` : `${dept.name} Manager`,
      readiness: level === '6' ? 'READY_IN_1_YEAR' : 'READY_IN_6_MONTHS',
      mentor: 'David Tran',
      skills: ['Operational SOPs', 'Customer Centricity', 'Safety Standards'],
    },
  };
});

// ---------------------------------------------------------------------------
// 2. GENERATE 100 ENTERPRISE COURSES (WITH SCORM, PPT, EXTERNAL LINKS)
// ---------------------------------------------------------------------------

const COURSE_CATALOG_TEMPLATES = [
  // 1. Food Safety & Hygiene (10 courses)
  { domain: 'Food Safety & Hygiene', codePrefix: 'FSH', count: 10, cat: 'Food Safety & Hygiene', isMandatory: true, targetType: 'DIVISION', targetId: 'div-omd', passScore: 80, time: '3h', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', titles: [
    'Food Safety & Hygiene Standards (HACCP)',
    'Fresh Meat & Poultry Cold Storage Procedures',
    'Seafood Quality Inspection & Cross-Contamination Control',
    'Bakery & Confectionery Sanitation Protocols',
    'Dairy & Delicatessen Temperature Assurance',
    'Ready-to-Eat Food Prep & Glove Hand Hygiene',
    'Raw Produce Disinfection & Slicing Standards',
    'Store Food Sampling & Display Safety Rules',
    'Allergen Management & Ingredient Labeling SOP',
    'Pest Prevention & Counter Sanitization in Food Areas',
  ]},

  // 2. Information Security & Cyber Defense (8 courses)
  { domain: 'Information Security', codePrefix: 'ISA', count: 8, cat: 'Information Security', isMandatory: true, targetType: 'BUSINESS_UNIT', targetId: 'bu-mmvn', passScore: 80, time: '2h', modality: 'INTERACTIVE_VIDEO', format: 'Interactive Video', titles: [
    'Information Security Awareness & Phishing Defense',
    'Customer Data Privacy & Personal Data Protection (PDPD)',
    'POS Terminal Protection & Credit Card Security (PCI-DSS)',
    'Acceptable Use Policy for Corporate Devices & Email',
    'Social Engineering Tactics & Ransomware Prevention',
    'Incident Escalation & Data Leakage Reporting Protocol',
    'Password Security & Multi-Factor Authentication Best Practices',
    'Remote Work & VPN Security for Enterprise Staff',
  ]},

  // 3. Health, Safety & Environment (10 courses)
  { domain: 'Health & Safety', codePrefix: 'HSE', count: 10, cat: 'Health & Safety', isMandatory: true, targetType: 'BUSINESS_UNIT', targetId: 'bu-mmvn', passScore: 75, time: '3h', modality: 'CLASSROOM_LAB', format: 'Store Practical Lab / ILT', titles: [
    'On-site Fire Safety & Emergency Evacuation (PCCC)',
    'First Aid & CPR Certification for Store Teams',
    'Electrical Safety in High-Voltage Equipment Rooms',
    'Ergonomics & Safe Heavy Lifting in Store Aisles',
    'Hazardous Chemical Handling & Safety Data Sheets (SDS)',
    'Working at Heights: Ladder & Scaffolding Safety',
    'Slip, Trip & Fall Prevention on Store Floors',
    'Warehouse Dock Safety & Truck Loading Hazards',
    'Personal Protective Equipment (PPE) Compliance',
    'Emergency Incident Reporting & Medical Response Flow',
  ]},

  // 4. Cold Chain & Perishables Storage (8 courses)
  { domain: 'Cold Chain', codePrefix: 'COLD', count: 8, cat: 'Cold Chain', isMandatory: true, targetType: 'DIVISION', targetId: 'div-scm', passScore: 85, time: '4h', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', titles: [
    'Cold Chain & Warehouse Perishables Quality Control',
    'Refrigerated Container Temperature Logging SOP',
    'Chilled Goods Loading & Quick Dispatch Protocols',
    'Cold Storage Defrost Cycle & Compressor Monitoring',
    'Fresh Produce Respiration & Humidity Control',
    'Frozen Seafood Glaze Inspection & Thaw Prevention',
    'Vaccine & Temperature-Sensitive Freight Handling',
    'Cold Chain Emergency Contingency & Generator Backup',
  ]},

  // 5. Store Operations & Frontline Excellence (12 courses)
  { domain: 'Store Operations', codePrefix: 'STOPS', count: 12, cat: 'Store Operations', isMandatory: true, targetType: 'DIVISION', targetId: 'div-opt', passScore: 80, time: '3h', modality: 'PPT_PRESENTATION', format: 'Interactive PPT Slides', titles: [
    'Store Operations Excellence & Planogram Compliance',
    'Cashier POS Speed & Barcode Scanning Accuracy',
    'Shrinkage Reduction & Anti-Theft Surveillance',
    'Customer Queue Management & Peak Hour Flow',
    'Return, Exchange & Refund Policies (SOP-RTN)',
    'Price Tag Accuracy & Digital Electronic Shelf Labels (ESL)',
    'In-Store Stock Count & Cyclical Inventory Audit',
    'Damaged Goods Write-off & Disposal Procedures',
    'Customer De-escalation & Service Recovery Standards',
    'Store Opening & Closing Checklist SOP',
    'Trolley Collection & Parking Area Logistics',
    'Night Shift Stocking & Aisle Recovery Guidelines',
  ]},

  // 6. External Platforms / Leadership & Management (10 courses)
  { domain: 'Leadership', codePrefix: 'LEAD', count: 10, cat: 'Leadership & Management', isMandatory: false, targetType: 'LEVEL', targetId: '4', passScore: 80, time: '6h', modality: 'EXTERNAL_PLATFORM', platformSource: 'LinkedIn Learning / Coursera', format: 'LinkedIn Learning Embed', titles: [
    'Leadership Essentials for Managers (MMVN & LinkedIn)',
    'Coaching & Giving High-Impact Constructive Feedback',
    'Conflict Management & Difficult Conversations',
    'Strategic Thinking & Annual Retail Business Planning',
    'Store P&L Financial Literacy for General Managers',
    'Delegation & Multi-Department Team Coordination',
    'Change Management & Store Digital Transformation',
    'Performance Appraisal & KPI Setting Workshops',
    'Succession Planning & Talent Pipeline Mentoring (70/20/10)',
    'Emotional Intelligence & Resilient Leadership in Retail',
  ]},

  // 7. Supply Chain & Logistics (8 courses)
  { domain: 'Supply Chain', codePrefix: 'SCM', count: 8, cat: 'Supply Chain', isMandatory: false, targetType: 'DIVISION', targetId: 'div-scm', passScore: 80, time: '3h', modality: 'INTERACTIVE_VIDEO', format: 'Interactive Video', titles: [
    'Forklift Safe Driving & Pallet Racking Standards',
    'Inbound Container Unloading & Defect Inspection',
    'Cross-Docking Efficiency & Fast-Flow Distribution',
    'Warehouse Management System (WMS) Barcode Scanning',
    'Fleet Route Planning & Fuel Efficiency Optimization',
    'Reverse Logistics & Expired Goods Consolidation',
    'Vendor Delivery Window & Dock Appointment SOP',
    'Dangerous Goods (HAZMAT) Transport Regulation',
  ]},

  // 8. Commercial & Merchandising (8 courses)
  { domain: 'Merchandising', codePrefix: 'MERCH', count: 8, cat: 'Merchandising', isMandatory: false, targetType: 'DIVISION', targetId: 'div-omd', passScore: 80, time: '4h', modality: 'PPT_PRESENTATION', format: 'Interactive PPT Slides', titles: [
    'Category Management & Margin Optimization',
    'Vendor Negotiation & Joint Business Planning (JBP)',
    'Promotional Strategy & Space Range Merchandising',
    'Private Label (M-Choice / MM Bio) Sourcing Strategy',
    'Import Customs Clearance & Tariff Compliance',
    'Seasonal Promotional Calendar Execution',
    'Supplier Quality Audit & SLA Performance Scoring',
    'Competitor Price Matching & Dynamic Pricing Logic',
  ]},

  // 9. Digital & E-Commerce (6 courses)
  { domain: 'E-Commerce', codePrefix: 'ECOM', count: 6, cat: 'Digital & E-Commerce', isMandatory: false, targetType: 'DIVISION', targetId: 'div-ecom', passScore: 80, time: '3h', modality: 'EXTERNAL_PLATFORM', platformSource: 'Coursera / Udemy', format: 'Coursera Embed', titles: [
    'MM Online Order Picking & Cold Pack Handling',
    'Last-Mile Delivery Driver Dispatch & SLA Tracking',
    'Omnichannel Customer Experience & App Loyalty',
    'E-Commerce Product Photography & Content Standards',
    'Digital Payment Gateways & Fraud Detection',
    'Chatbot Support & Customer Inquiry Routing',
  ]},

  // 10. Compliance, Legal & Ethics (6 courses)
  { domain: 'Compliance & Ethics', codePrefix: 'ETHIC', count: 6, cat: 'Compliance & Ethics', isMandatory: true, targetType: 'BUSINESS_UNIT', targetId: 'bu-mmvn', passScore: 85, time: '2h', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', titles: [
    'Corporate Code of Conduct & Anti-Corruption Policy',
    'Whistleblower Protection & Ethical Reporting Hotline',
    'Fair Competition & Anti-Monopoly Trade Laws',
    'Intellectual Property & Trademark Usage Guidelines',
    'Labor Law Compliance & Working Hour Regulations',
    'Gifts, Hospitality & Conflict of Interest Disclosure',
  ]},

  // 11. Customer Service & Hospitality (6 courses)
  { domain: 'Customer Service', codePrefix: 'CSERV', count: 6, cat: 'Customer Service', isMandatory: false, targetType: 'DIVISION', targetId: 'div-opt', passScore: 80, time: '2h', modality: 'INTERACTIVE_VIDEO', format: 'Video + Quiz', titles: [
    'Customer Care Excellence & Horeca Client Service',
    'Handling Difficult Customer Demands with Empathy',
    'Telephone Etiquette & Professional Email Writing',
    'VIP Loyalty Member (M-Card Elite) Privileges',
    'In-Store Customer Assistance & Product Recommendations',
    'B2B Wholesale Client Account Servicing Protocols',
  ]},

  // 12. Corporate Orientation & Culture (8 courses)
  { domain: 'Culture & Onboarding', codePrefix: 'CULT', count: 8, cat: 'Corporate Orientation', isMandatory: false, targetType: 'BUSINESS_UNIT', targetId: 'bu-mmvn', passScore: 75, time: '2h', modality: 'INTERACTIVE_VIDEO', format: 'Interactive Video', titles: [
    'Corporate Orientation & MMVN Cultural Values',
    'Retail Sustainability: Single-Use Plastic Reduction',
    'Community CSR & Food Waste Donation Programs',
    'Diversity, Equity & Inclusion in Retail Workplaces',
    'Kaizen & Continuous Improvement Idea Submission',
    'Internal Career Growth & Succession Roadmap Guide',
    'Mental Health & Employee Wellbeing in Shift Work',
    'Trade Union Benefits & Social Insurance Policies',
  ]},
];

let generatedCourseList = [];
let courseCounter = 1;

COURSE_CATALOG_TEMPLATES.forEach((tpl) => {
  tpl.titles.forEach((title, idx) => {
    const paddedNum = String(courseCounter).padStart(3, '0');
    const courseId = `CRS-${tpl.codePrefix}-${paddedNum}`;
    const code = `${tpl.codePrefix}-${paddedNum}`;
    
    // Realistic version tracking data
    const versionNumber = idx === 0 ? 'v2.1' : idx === 1 ? 'v1.4' : 'v1.0';
    const lastReviewedBy = idx % 2 === 0 ? 'Nguyễn Văn Hùng (Master Trainer)' : 'Đặng Thanh Mai (L&OD Lead)';
    const lastReviewedDate = `2026-0${Math.max(1, 8 - (idx % 6))}-14`;

    generatedCourseList.push({
      id: courseId,
      code,
      title,
      category: tpl.cat,
      domain: tpl.domain,
      modality: tpl.modality || 'SCORM_PACKAGE',
      format: tpl.format || 'SCORM 2004',
      platformSource: tpl.platformSource || null,
      courseType: tpl.isMandatory ? 'MANDATORY' : 'OPTIONAL',
      estimatedHours: tpl.time,
      passingScore: tpl.passScore,
      published: true,
      description: `Comprehensive MMVN standard training module for ${title}. Aligned with retail excellence and regulatory compliance.`,
      prerequisites: idx > 0 && idx % 3 === 0 ? [`CRS-${tpl.codePrefix}-${String(courseCounter - 1).padStart(3, '0')}`] : [],
      configuration: {
        assessmentEnabled: true,
        maxAttempts: 3,
        passingScorePercent: tpl.passScore,
        certificateEnabled: true,
        questionBankSize: 20,
        questionsPerAttempt: 5,
        version: versionNumber,
        lastReviewedBy,
        lastReviewedDate,
        changelog: [
          { version: versionNumber, date: lastReviewedDate, reviewer: lastReviewedBy, note: 'Updated compliance guidelines and added interactive SCORM check-ins.' }
        ],
      },
      assignment: tpl.isMandatory ? {
        assignmentType: tpl.targetType,
        targetBusinessUnitId: tpl.targetType === 'BUSINESS_UNIT' ? tpl.targetId : null,
        targetDivisionId: tpl.targetType === 'DIVISION' ? tpl.targetId : null,
        targetLevel: tpl.targetType === 'LEVEL' ? tpl.targetId : null,
        assignedDate: '2026-08-01',
        dueDate: '2026-09-30',
        assignedBy: 'Sarah Nguyen (L&OD Admin)',
      } : null,
      modules: [
        {
          id: `mod-1-${courseId}`,
          title: 'Module 1: Principles & Regulatory Framework',
          lessons: [
            { id: `les-1-1-${courseId}`, title: '1.1 Industry Standards & Legal Foundations', lessonType: 'VIDEO', isRequired: true, duration: '15 mins', content: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } },
            { id: `les-1-2-${courseId}`, title: '1.2 Standard Operating Guidelines & Checklists', lessonType: 'DOCUMENT', isRequired: true, duration: '20 mins' },
          ],
        },
        {
          id: `mod-2-${courseId}`,
          title: 'Module 2: Practical Execution & Store Floor Application',
          lessons: [
            { id: `les-2-1-${courseId}`, title: '2.1 Step-by-Step Practical Workflow Simulation', lessonType: tpl.modality === 'PPT_PRESENTATION' ? 'DOCUMENT' : 'VIDEO', isRequired: true, duration: '25 mins' },
            { id: `les-2-2-${courseId}`, title: '2.2 Incident Response & Corrective Actions', lessonType: 'TEXT', isRequired: true, duration: '15 mins' },
          ],
        },
      ],
      questionBank: [
        { id: `q1-${courseId}`, text: `What is the primary compliance objective of ${title}?`, type: 'SINGLE_CHOICE', score: 20, options: [{ id: 'o1', text: 'Adhere to MMVN audit standards and safeguard operations', isCorrect: true }, { id: 'o2', text: 'Reduce documentation paperwork', isCorrect: false }, { id: 'o3', text: 'Optional reference only', isCorrect: false }] },
        { id: `q2-${courseId}`, text: 'Who is directly accountable for executing these safety protocols on shift?', type: 'SINGLE_CHOICE', score: 20, options: [{ id: 'o4', text: 'Every shift employee and assigned section supervisor', isCorrect: true }, { id: 'o5', text: 'External inspectors only', isCorrect: false }] },
        { id: `q3-${courseId}`, text: 'When a severe deviation is detected, within how many minutes must it be logged?', type: 'SINGLE_CHOICE', score: 20, options: [{ id: 'o6', text: 'Immediately within 15-30 minutes', isCorrect: true }, { id: 'o7', text: 'At the end of the month', isCorrect: false }] },
        { id: `q4-${courseId}`, text: 'True or False: Periodic refresher assessment is required every 12 months.', type: 'TRUE_FALSE', score: 20, options: [{ id: 'o8', text: 'True', isCorrect: true }, { id: 'o9', text: 'False', isCorrect: false }] },
        { id: `q5-${courseId}`, text: 'Identify the key mitigation step in case of cold-chain failure:', type: 'SINGLE_CHOICE', score: 20, options: [{ id: 'o10', text: 'Isolate affected batch, log core temperature & notify QA lead', isCorrect: true }, { id: 'o11', text: 'Continue selling immediately', isCorrect: false }] },
      ],
    });
    courseCounter++;
  });
});

export const generated100Courses = generatedCourseList;

// ---------------------------------------------------------------------------
// 3. GENERATE REALISTIC ENROLLMENT MATRIX (100 Users x 100 Courses)
// ---------------------------------------------------------------------------

export const generated100EnrollmentMatrix = generated100Users.map((user, uIdx) => {
  // Give each user 5-10 course enrollments
  const userCourses = generated100Courses.slice(0, 6 + (uIdx % 4));

  const enrollments = userCourses.map((c, cIdx) => {
    let status = 'IN_PROGRESS';
    let progressPercent = 65;
    let score = null;
    let attemptsCount = 0;
    let completedAt = null;

    if ((uIdx + cIdx) % 5 === 0) {
      status = 'COMPLETED';
      progressPercent = 100;
      score = 88 + ((uIdx * 3 + cIdx) % 12);
      attemptsCount = 1;
      completedAt = '2026-08-14';
    } else if ((uIdx + cIdx) % 5 === 1) {
      status = 'NOT_STARTED';
      progressPercent = 0;
      score = null;
      attemptsCount = 0;
    } else if ((uIdx + cIdx) % 5 === 2) {
      status = 'OVERDUE';
      progressPercent = 25;
      score = null;
      attemptsCount = 0;
    } else if ((uIdx + cIdx) % 5 === 3) {
      status = 'FAILED';
      progressPercent = 100;
      score = 52;
      attemptsCount = 3;
    }

    return {
      courseId: c.id,
      userId: user.userId,
      courseType: c.courseType,
      status,
      progressPercent,
      score,
      attemptsCount,
      completedAt,
      lastActivityAt: '2026-08-19',
    };
  });

  return {
    userId: user.userId,
    enrollments,
  };
});
