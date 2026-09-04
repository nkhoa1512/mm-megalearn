// ===========================================================================
// MM Mega Market Vietnam (MMVN) - 100+ Enterprise Users & 100+ Enterprise Courses
// Coherent, Cross-Referenced Multi-Persona Dataset with Strict Dual Hierarchy
// (User -> Sub-Department -> Department -> Division -> Business Unit)
// ===========================================================================

import {
  divisions,
  departments,
  subDepartments,
  jobLevels,
  retailStores,
  clusters,
  operationsAreas,
  storeTypes,
} from './orgHierarchy';
import {
  checkCourseAccessRule,
  levelGap,
  levelShortLabel,
  levelTitle,
  levelValue,
} from './levelSystem';
import { getCourseImage } from './courseImages';
import { withHrProfile } from './hrProfile';

// ---------------------------------------------------------------------------
// 1. GENERATE 100+ REALISTIC ENTERPRISE USERS (WITH FULL TALENT PROFILES)
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

const ANCHOR_EMP_NUMS = new Set([1, 245, 312, 1042, 1250, 2041]);

const TOTAL_USER_COUNT = 150;

export const generated100Users = Array.from({ length: TOTAL_USER_COUNT }, (_, i) => {
  const rawEmpNum = 1001 + i;
  const empNum = ANCHOR_EMP_NUMS.has(rawEmpNum) ? rawEmpNum + 1000 : rawEmpNum;
  const userId = `USR-${empNum}`;
  const employeeCode = `MMVN-${empNum}`;

  // Anchor primary demo personas
  if (i === 0) {
    return {
      userId: 'USR-0001',
      employeeCode: 'MMVN-0001',
      fullName: 'Sarah Nguyen',
      email: 'sarah.nguyen@mmvietnam.com',
      role: 'trainer',
      position: 'Head of Division - HR Director & L&D Faculty Lead',
      title: 'Head of Division - HR Director',
      level: '2',
      levelTitle: levelTitle('2'),
      branch: 'SUPPORTING',
      branchName: 'Supporting Functions (Head Office)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
      divisionId: 'div-hrd', divisionCode: 'Human Resources', divisionName: 'Human Resources',
      departmentId: 'dept-hrd-lod', departmentCode: 'HR_LOD', departmentName: 'HR - Learning & Organizational Development',
      subDepartmentId: 'sub-hrd-sfnl', subDepartmentCode: 'SUB-SF-NL', subDepartmentName: 'SF National Learning',
      status: 'ACTIVE',
      yearsOfService: 7.5,
      avatar: 'SN',
      badgeTone: 'ai',
      description: 'Supreme L&D Authority across all 42 MMVN Divisions, Stores & Talent Pipelines',
    };
  }
  if (i === 1) {
    return {
      userId: 'USR-0245',
      employeeCode: 'MMVN-0245',
      fullName: 'David Tran',
      email: 'david.tran@mmvietnam.com',
      role: 'manager',
      position: 'Store Department Manager - Fresh Food',
      title: 'Store Department Manager',
      level: '4',
      levelTitle: levelTitle('4'),
      branch: 'OPERATIONS',
      branchName: 'Operations (Operations / Stores)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
      divisionId: 'div-1010-ap', divisionCode: '1010_AP', divisionName: '1010_AP (MM An Phu)',
      departmentId: 'dept-1010-ff', departmentCode: 'FF_ST', departmentName: 'Fresh Food_ST',
      subDepartmentId: 'sub-ff-bakery-1010', subDepartmentCode: 'SUB-BAKERY', subDepartmentName: 'Bakery',
      storeName: '1010_AP (MM An Phu)',
      status: 'ACTIVE',
      yearsOfService: 4.8,
      avatar: 'DT',
      badgeTone: 'teal',
      description: 'Fresh food category operations manager, MM An Phu',
    };
  }
  if (i === 2) {
    return {
      userId: 'USR-0312',
      employeeCode: 'MMVN-0312',
      fullName: 'Hoang Nguyen',
      email: 'hoang.nguyen@mmvietnam.com',
      role: 'manager',
      position: 'Customer Service Section Manager',
      title: 'Customer Service Section Manager',
      level: '4',
      levelTitle: levelTitle('4'),
      branch: 'OPERATIONS',
      branchName: 'Operations (Operations / Stores)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
      divisionId: 'div-1013-tl', divisionCode: '1013_TL', divisionName: '1013_TL (MM Thang Long)',
      departmentId: 'dept-1013-cs', departmentCode: 'CS_ST', departmentName: 'Customer Service_ST',
      subDepartmentId: 'sub-cs-fo-1013', subDepartmentCode: 'SUB-FO', subDepartmentName: 'Front Office',
      storeName: '1013_TL (MM Thang Long)',
      status: 'ACTIVE',
      yearsOfService: 5.2,
      avatar: 'HN',
      badgeTone: 'teal',
    };
  }
  if (i === 3) {
    return {
      userId: 'USR-1042',
      employeeCode: 'MMVN-1042',
      fullName: 'Minh Tran',
      email: 'minh.tran@mmvietnam.com',
      role: 'learner',
      position: 'Junior Bakery Associate',
      title: 'Junior Bakery Associate',
      level: '7',
      levelTitle: levelTitle('7'),
      branch: 'OPERATIONS',
      branchName: 'Operations (Operations / Stores)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
      divisionId: 'div-1010-ap', divisionCode: '1010_AP', divisionName: '1010_AP (MM An Phu)',
      departmentId: 'dept-1010-ff', departmentCode: 'FF_ST', departmentName: 'Fresh Food_ST',
      subDepartmentId: 'sub-ff-bakery-1010', subDepartmentCode: 'SUB-BAKERY', subDepartmentName: 'Bakery',
      storeName: '1010_AP (MM An Phu)',
      status: 'ACTIVE',
      yearsOfService: 1.2,
      avatar: 'MT',
      badgeTone: 'blue',
      description: 'Bakery counter fresh baking associate at the An Phu branch',
    };
  }
  if (i === 4) {
    return {
      userId: 'USR-1250',
      employeeCode: 'MMVN-1250',
      fullName: 'Linh Hoang',
      email: 'linh.hoang@mmvietnam.com',
      role: 'hrbp',
      position: 'HRBP Lead - Head Office',
      title: 'HRBP Lead',
      level: '2',
      levelTitle: levelTitle('2'),
      branch: 'SUPPORTING',
      branchName: 'Supporting Functions (Head Office)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
      divisionId: 'div-hrd', divisionCode: 'Human Resources', divisionName: 'Human Resources',
      departmentId: 'dept-hrd-tahrbp', departmentCode: 'HR_TA_HRBP', departmentName: 'HR - Talent Acquisition & HRBP',
      subDepartmentId: 'sub-hrd-hrbpho', subDepartmentCode: 'SUB-HRBP-HO', subDepartmentName: 'HR - HRBP HO',
      status: 'ACTIVE',
      yearsOfService: 6.1,
      avatar: 'LH',
      badgeTone: 'purple',
    };
  }
  if (i === 5) {
    return {
      userId: 'USR-2041',
      employeeCode: 'MMVN-2041',
      fullName: 'Kim Vu',
      email: 'kim.vu@mmvietnam.com',
      role: 'learner',
      position: 'Loss Prevention Specialist',
      title: 'Loss Prevention Specialist',
      level: '6',
      levelTitle: levelTitle('6'),
      branch: 'SUPPORTING',
      branchName: 'Supporting Functions (Head Office)',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
      divisionId: 'div-lpqa', divisionCode: 'LP-QA', divisionName: 'LP-QA',
      departmentId: 'dept-lpqa-lp', departmentCode: 'LP', departmentName: 'Loss Prevention',
      subDepartmentId: 'sub-df-chh-1010', subDepartmentCode: 'SUB-CHH', subDepartmentName: 'Cosmetics & Household & HBA',
      status: 'ACTIVE',
      yearsOfService: 2.8,
      avatar: 'KV',
      badgeTone: 'slate',
    };
  }

  // Pick sub-department in cyclic round-robin
  const subDept = subDepartments[(i - 6) % subDepartments.length] || subDepartments[0];
  const dept = departments.find((d) => d.id === subDept.departmentId) || departments[0];
  const div = divisions.find((d) => d.id === dept.divisionId) || divisions[0];

  const fName = FIRST_NAMES[(i * 3 + 7) % FIRST_NAMES.length];
  const lName = LAST_NAMES[(i * 2 + 5) % LAST_NAMES.length];
  const fullName = `${fName} ${lName}`;
  const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${empNum}@mmvietnam.com`;

  // Determine Level: mostly 7, 6, 5, some 4, 3, 2
  let level = '7';
  if (i % 25 === 0) level = '2';
  else if (i % 15 === 0) level = '3';
  else if (i % 9 === 0) level = '4';
  else if (i % 4 === 0) level = '5';
  else if (i % 2 === 0) level = '6';

  let role = 'learner';
  if (level === '2') role = (i % 2 === 0) ? 'hrbp' : 'trainer';
  else if (level === '3') role = 'trainer';
  else if (level === '4') role = 'manager';

  const title = `${subDept.name} Specialist`;

  return {
    userId,
    employeeCode,
    fullName,
    email,
    role,
    position: title,
    title,
    level,
    levelTitle: levelTitle(level),
    branch: div.branch || 'SUPPORTING',
    branchName: div.branch === 'OPERATIONS' ? 'Operations (Operations / Stores)' : 'Supporting Functions (Head Office)',
    businessUnitId: 'bu-mmvn',
    businessUnitCode: 'MMVN',
    businessUnitName: 'MM Mega Market Vietnam',
    divisionId: div.id,
    divisionCode: div.code,
    divisionName: div.name,
    departmentId: dept.id,
    departmentCode: dept.code,
    departmentName: dept.name,
    subDepartmentId: subDept.id,
    subDepartmentCode: subDept.code,
    subDepartmentName: subDept.name,
    storeName: div.branch === 'OPERATIONS' ? div.name : 'Head Office (An Phu)',
    status: 'ACTIVE',
    yearsOfService: +(1 + (i % 8) * 0.8).toFixed(1),
    avatar: `${fName[0]}${lName[0]}`,
    badgeTone: level === '2' ? 'purple' : level === '3' ? 'ai' : level === '4' ? 'teal' : level === '5' ? 'amber' : 'blue',
  };
})
  // Fill in the HR profile (Personnel Number, Cost center, Entry Date, Gender,
  // Date of birth, HO/Store, Location) by deterministic rules — see hrProfile.js.
  .map(withHrProfile);

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

  // 13. Train-The-Trainer & Coaching Standards (3 courses) — Level 4 gap-fill
  { domain: 'Train-The-Trainer & Coaching Standards', codePrefix: 'TTT', count: 3, cat: 'Leadership & Management', isMandatory: true, targetType: 'LEVEL', targetId: '4', passScore: 80, time: '3h', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', titles: [
    'Train-The-Trainer Certification & Coaching Standards (TTT)',
    'Department On-the-Job Coaching & Skill Transfer Framework',
    'Structured Feedback & Performance Coaching for Line Managers',
  ]},

  // 14. Master Trainer & Section Governance (3 courses) — Level 3 gap-fill
  { domain: 'Master Trainer & Section Governance', codePrefix: 'MGT3', count: 3, cat: 'Leadership & Management', isMandatory: true, targetType: 'LEVEL', targetId: '3', passScore: 82, time: '4h', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', titles: [
    'Section Governance & Category P&L Ownership',
    'Master Trainer Curriculum Design & Facilitation Standards',
    'Cross-Functional Vendor & Supply Chain Negotiation Governance',
  ]},

  // 15. Succession & Store P&L Governance (4 courses) — Level 2 gap-fill
  { domain: 'Succession & Store P&L Governance', codePrefix: 'SUCC', count: 4, cat: 'Leadership & Management', isMandatory: true, targetType: 'LEVEL', targetId: '2', passScore: 82, time: '4h', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', titles: [
    'Store General Manager P&L Governance & Budget Ownership',
    'Succession Planning & Talent Pipeline Committee Standards',
    'Multi-Store Crisis Management & Legal Escalation',
    'SGM Store Portfolio Strategic Planning',
  ]},

  // 16. Corporate Governance & ESG (4 courses) — Level 1 gap-fill
  { domain: 'Corporate Governance & ESG', codePrefix: 'GOV', count: 4, cat: 'Compliance & Ethics', isMandatory: true, targetType: 'LEVEL', targetId: '1', passScore: 85, time: '4h', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', titles: [
    'Corporate Governance & Board Reporting Standards',
    'ESG Strategy & Sustainable Retail Compliance',
    'Enterprise Risk Management & Crisis Governance',
    'Regulatory Affairs & National Retail Market Policy',
  ]},

  // 17. Executive Strategy Electives (2 courses) — Level 1 elective gap-fill
  { domain: 'Executive Strategy Electives', codePrefix: 'EXEC', count: 2, cat: 'Leadership & Management', isMandatory: false, targetType: 'LEVEL', targetId: '1', passScore: 75, time: '5h', modality: 'EXTERNAL_PLATFORM', platformSource: 'Coursera / Udemy Executive Education', format: 'Coursera Embed', titles: [
    'Executive Retail Strategy (Coursera Executive Education)',
    'M&A and International Market Expansion Fundamentals',
  ]},

  // 18. Talent & Store Portfolio Electives (2 courses) — Level 2 elective gap-fill
  { domain: 'Talent & Store Portfolio Electives', codePrefix: 'TALENT', count: 2, cat: 'Leadership & Management', isMandatory: false, targetType: 'LEVEL', targetId: '2', passScore: 75, time: '4h', modality: 'EXTERNAL_PLATFORM', platformSource: 'LinkedIn Learning / Coursera', format: 'LinkedIn Learning Embed', titles: [
    'Omnichannel Retail Leadership (LinkedIn Learning)',
    'Advanced Talent Analytics & Workforce Planning',
  ]},

  // 19. OJT Capstone & Promotion Defense (4 courses) — Tier 3 gap-fill, Levels 4/3/2/1
  { domain: 'OJT Capstone & Promotion Defense', codePrefix: 'CAPSTONE', count: 4, cat: 'Leadership & Management', isMandatory: true, targetType: 'LEVEL', targetId: '1', passScore: 85, time: '4h', modality: 'CLASSROOM_LAB', format: 'Capstone Defense & Committee Review', titles: [
    'Line Manager Practical Coaching Capstone Defense',
    'Master Trainer / Thanh Giong Fast-Track Capstone Defense',
    'Store General Manager (SGM) Portfolio Capstone Defense',
    'Board Capstone Review & Executive Case Defense',
  ]},
];

// ---------------------------------------------------------------------------
// Assign the target level of each course on the INVERTED scale (7 lowest -> 1 highest).
//
//   Level 7 - Culture induction, basic hygiene, basic fire safety, counter operations.
//   Level 6 - Advanced HACCP, fresh food storage, bread oven operation.
//   Level 5 - Shift supervision, shrinkage stocktaking, forklift safety.
//   Level 4 - Department people management, shift planning, 1-on-1 coaching.
//   Level 3 - Category cost management, supplier negotiation.
//   Level 2 - Store P&L management, budgeting, succession talent planning.
//   Level 1 - Group retail strategy, nationwide risk & crisis management.
//
// Each threshold is the index of the first course belonging to the next level within that domain's catalog.
// ---------------------------------------------------------------------------
const COURSE_LEVEL_LADDER = {
  FSH:   [['7', 3], ['6', 8], ['5', Infinity]],
  ISA:   [['7', 4], ['6', Infinity]],
  HSE:   [['7', 4], ['6', 8], ['5', Infinity]],
  COLD:  [['6', 5], ['5', Infinity]],
  STOPS: [['7', 4], ['6', 8], ['5', 11], ['4', Infinity]],
  LEAD:  [['4', 3], ['3', 6], ['2', 9], ['1', Infinity]],
  SCM:   [['6', 4], ['5', 7], ['4', Infinity]],
  MERCH: [['5', 4], ['4', 7], ['3', Infinity]],
  ECOM:  [['6', 3], ['5', Infinity]],
  ETHIC: [['6', 3], ['5', Infinity]],
  CSERV: [['7', 3], ['6', Infinity]],
  CULT:  [['7', 5], ['6', Infinity]],
  TTT:      [['4', Infinity]],
  MGT3:     [['3', Infinity]],
  SUCC:     [['2', Infinity]],
  GOV:      [['1', Infinity]],
  EXEC:     [['1', Infinity]],
  TALENT:   [['2', Infinity]],
  CAPSTONE: [['4', 1], ['3', 2], ['2', 3], ['1', Infinity]],
};

function resolveCourseTargetLevel(codePrefix, idx) {
  const ladder = COURSE_LEVEL_LADDER[codePrefix];
  if (!ladder) return '7';
  const step = ladder.find(([, ceiling]) => idx < ceiling);
  return step ? step[0] : '7';
}

let generatedCourseList = [];
let courseCounter = 1;
let classroomCounter = 0;

COURSE_CATALOG_TEMPLATES.forEach((tpl) => {
  tpl.titles.forEach((title, idx) => {
    const paddedNum = String(courseCounter).padStart(3, '0');
    const courseId = `CRS-${tpl.codePrefix}-${paddedNum}`;
    const code = `${tpl.codePrefix}-${paddedNum}`;
    
    // Realistic version tracking data
    const versionNumber = idx === 0 ? 'v2.1' : idx === 1 ? 'v1.4' : 'v1.0';
    const lastReviewedBy = idx % 2 === 0 ? 'Nguyễn Văn Hùng (Master Trainer)' : 'Đặng Thanh Mai (L&OD Lead)';
    const lastReviewedDate = `2026-0${Math.max(1, 8 - (idx % 6))}-14`;

    const isClassroom = tpl.modality === 'CLASSROOM_LAB';
    const deliveryType = isClassroom ? 'IN_PERSON_CLASSROOM' : 'ONLINE_ELEARNING';
    
    // Assign trainers qualified to teach: L&D, HSE, SGM, User Admin, HRBP, SysAdmin
    const TEACHING_POOL = [
      { id: 'USR-9003', name: 'Nguyễn Văn Hùng', venueId: 'lab-ap-fresh', venue: 'Fresh Food & Bakery Lab - MM Mega Market An Phu (Flagship)' },
      { id: 'USR-9005', name: 'Vũ Đức Thành', venueId: 'lab-tl-fire', venue: 'HSE Fire & Emergency Drill Grounds - MM Mega Market Thang Long' },
      { id: 'USR-9006', name: 'Trần Minh Quang', venueId: 'room-ho-pla', venue: 'Platinum Executive Conference Room - MM Head Office' },
      { id: 'USR-9002', name: 'Phạm Thanh Thảo', venueId: 'room-ho-dia', venue: 'Diamond Training Hall - MM Mega Market Head Office' },
      { id: 'USR-9004', name: 'Lê Thị Mai', venueId: 'lab-ap-pos', venue: 'Cashier & Frontline Service Lab - MM Mega Market An Phu' },
      { id: 'USR-9001', name: 'Trần Hoàng Long', venueId: 'room-ho-dia', venue: 'Microsoft Teams Live Studio (An Phu Head Office)' },
    ];
    // Rotate over the classroom courses only. Keying off (idx + courseCounter) instead
    // walked the pool in a stride that skipped members entirely, leaving some trainers —
    // the demo Trainer login among them — with no course of their own to manage.
    const assignedPersona = TEACHING_POOL[classroomCounter % TEACHING_POOL.length];
    if (isClassroom) classroomCounter++;
    const trainerId = isClassroom ? assignedPersona.id : null;
    const trainerName = isClassroom ? assignedPersona.name : null;
    const venue = isClassroom ? assignedPersona.venue : null;
    const venueId = isClassroom ? assignedPersona.venueId : null;
    // In-person courses run across 1-3 training days. Longer programmes are split into
    // a morning + afternoon block per day, mirroring how store workshops actually run.
    // Two thirds of them are re-run for a second cohort a few weeks later — the same
    // course, a second intake, different dates.
    const firstDay = isClassroom ? `2026-0${Math.min(9, 8 + (idx % 2))}-${String(15 + (idx % 12)).padStart(2, '0')}` : null;
    const dayCount = isClassroom ? [1, 2, 3][idx % 3] : 0;
    const isFullDay = isClassroom && dayCount > 1;
    const intakeCount = isClassroom ? (idx % 3 === 2 ? 1 : 2) : 0;

    function buildIntakeSessions(intakeIdx) {
      const offset = intakeIdx * 21; // the re-run starts three weeks after the first
      return Array.from({ length: dayCount }, (_, dIdx) => {
        const d = new Date(`${firstDay}T00:00:00`);
        d.setDate(d.getDate() + offset + dIdx);
        const date = d.toISOString().slice(0, 10);
        const blocks = isFullDay
          ? [{ startTime: '08:30', endTime: '12:00', topic: `Day ${dIdx + 1} — morning theory block` },
             { startTime: '13:30', endTime: '17:00', topic: `Day ${dIdx + 1} — afternoon hands-on practice` }]
          : [{ startTime: '08:30', endTime: '11:30', topic: 'Theory, demonstration & assessment' }];
        return blocks.map((b, bIdx) => ({
          id: `ses-${code}-i${intakeIdx + 1}-${dIdx + 1}-${bIdx + 1}`,
          date,
          ...b,
        }));
      }).flat();
    }

    const classroomIntakes = isClassroom
      ? Array.from({ length: intakeCount }, (_, i) => ({
          id: `intake-${code}-${i + 1}`,
          name: `Intake ${i + 1}`,
          trainerId: '',
          trainerName: '',
          venueId: '',
          venue: '',
          maxCapacity: null,
          sessions: buildIntakeSessions(i),
        }))
      : [];
    const classroomSessions = classroomIntakes.flatMap((it) => it.sessions);
    const totalTrainingHours = isFullDay ? dayCount * 7 : (isClassroom ? 3 : 0);
    const scheduleDate = isClassroom ? classroomSessions[0].date : null;
    const scheduleTime = isClassroom
      ? `${classroomSessions[0].startTime} - ${classroomSessions[0].endTime} (${(isFullDay ? 3.5 : 3).toFixed(1)}h)`
      : null;

    // Assign 2 to 3 co-trainers & teaching assistants (total teaching panel of 3 - 4 people)
    const coTrainerCount = (idx % 2 === 0) ? 2 : 3;
    const coTrainers = isClassroom ? Array.from({ length: coTrainerCount }, (_, cIdx) => {
      const p = TEACHING_POOL[(idx + courseCounter + 1 + cIdx) % TEACHING_POOL.length];
      return {
        id: p.id,
        userId: p.id,
        name: p.name,
        fullName: p.name,
        role: 'trainer',
        title: 'Trainer / Teaching Assistant',
      };
    }) : [];
    const coTrainerIds = isClassroom ? coTrainers.map((t) => t.id) : [];
    const coTrainerNames = isClassroom ? coTrainers.map((t) => t.name) : [];

    const targetLevel = resolveCourseTargetLevel(tpl.codePrefix, idx);
    const targetLevelTitle = `Level ${targetLevel}: ${levelTitle(targetLevel)}`;

    // Resolve domain/topic-specific vibrant thumbnail image
    const lowerTitle = (title || '').toLowerCase();
    let courseThumb;
    if (lowerTitle.includes('bakery') || lowerTitle.includes('bakery') || lowerTitle.includes('confectionery')) {
      courseThumb = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80';
    } else if (lowerTitle.includes('meat') || lowerTitle.includes('meat') || lowerTitle.includes('poultry') || lowerTitle.includes('butcher')) {
      courseThumb = 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&q=80';
    } else if (lowerTitle.includes('seafood') || lowerTitle.includes('seafood') || lowerTitle.includes('shellfish') || lowerTitle.includes('fish')) {
      courseThumb = 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=600&q=80';
    } else if (lowerTitle.includes('produce') || lowerTitle.includes('rau') || lowerTitle.includes('fruit') || lowerTitle.includes('vegetable')) {
      courseThumb = 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80';
    } else if (lowerTitle.includes('cold') || lowerTitle.includes('cold') || lowerTitle.includes('chilled') || lowerTitle.includes('temperature')) {
      courseThumb = 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&q=80';
    } else if (lowerTitle.includes('pos') || lowerTitle.includes('cashier') || lowerTitle.includes('checkout') || lowerTitle.includes('cashier')) {
      courseThumb = 'https://images.unsplash.com/photo-1556742049-0a67e5572263?auto=format&fit=crop&w=600&q=80';
    } else if (lowerTitle.includes('security') || lowerTitle.includes('phishing') || lowerTitle.includes('cyber') || lowerTitle.includes('privacy')) {
      courseThumb = idx % 2 === 0
        ? 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80';
    } else if (lowerTitle.includes('forklift') || lowerTitle.includes('warehouse') || lowerTitle.includes('logistics') || lowerTitle.includes('fleet')) {
      courseThumb = idx % 2 === 0
        ? 'https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80';
    } else if (lowerTitle.includes('leadership') || lowerTitle.includes('coach') || lowerTitle.includes('manage') || lowerTitle.includes('leadership')) {
      courseThumb = idx % 2 === 0
        ? 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80';
    } else if (lowerTitle.includes('fire') || lowerTitle.includes('safety') || lowerTitle.includes('pccc') || lowerTitle.includes('hse') || lowerTitle.includes('hazard')) {
      courseThumb = idx % 2 === 0
        ? 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80';
    } else {
      courseThumb = getCourseImage({ domain: tpl.domain, category: tpl.cat });
    }

    generatedCourseList.push({
      id: courseId,
      code,
      title,
      category: tpl.cat,
      domain: tpl.domain,
      thumbnail: courseThumb,
      imageUrl: courseThumb,
      milestoneImage: courseThumb,
      deliveryType,
      targetLevel,
      targetLevelTitle,
      modality: tpl.modality || 'SCORM_PACKAGE',
      format: tpl.format || 'SCORM 2004',
      platformSource: tpl.platformSource || null,
      courseType: tpl.isMandatory ? 'MANDATORY' : 'OPTIONAL',
      // An in-person course lasts exactly as long as its timetable says. Only a self-paced
      // online course keeps the template's estimate, since it has no timetable to measure.
      estimatedHours: isClassroom ? `${totalTrainingHours.toFixed(1)}h` : tpl.time,
      passingScore: tpl.passScore,
      published: true,
      trainerId,
      trainerName,
      coTrainerIds,
      coTrainerNames,
      coTrainers,
      venue,
      venueId,
      scheduleDate,
      scheduleTime,
      intakes: classroomIntakes,
      sessions: classroomSessions,
      totalTrainingHours,
      // An in-person course is owned by the trainer who leads it, so that trainer can
      // manage it from their own hub. Online courses stay owned by the L&D admin
      // (no createdBy => the catalog treats them as User Admin's).
      ...(isClassroom ? { createdBy: trainerId } : {}),
      maxCapacity: isClassroom ? 25 : 500,
      description: `Comprehensive MMVN standard training module for ${title}. Aligned with retail excellence and regulatory compliance.`,
      prerequisites: idx > 0 && idx % 3 === 0 ? [`CRS-${tpl.codePrefix}-${String(courseCounter - 1).padStart(3, '0')}`] : [],
      syllabus: isClassroom ? [
        { step: `Part 1: Preparation & Regulation Briefing (${title}) (30 minutes)`, detail: 'Check the practice setup and Gold HACCP/SOP safety standards, then brief the session objectives.' },
        { step: `Part 2: Operating Technique & Hands-On Guidance In The Workshop (90 minutes)`, detail: 'The trainer demonstrates the technique and learners practise directly on the real equipment/tools.' },
        { step: `Part 3: Result Assessment & Live QR Attendance (60 minutes)`, detail: 'Inspect the practice output, wrap up the lesson, answer questions and scan the attendance QR code.' },
      ] : [
        { step: 'Part 1: Foundation Knowledge & The MMVN Standards Framework', detail: 'Cover the overall regulations, core principles and operational compliance metrics.' },
        { step: 'Part 2: Standard Operating Procedure (SOP) & Scenario Handling', detail: 'Step-by-step execution guidance plus the checks that prevent costly mistakes.' },
        { step: 'Part 3: End-Of-Course Competency Exam', detail: 'Take the multiple-choice test to complete the course and earn your certificate/XP.' },
      ],
      materials: [
        { id: `mat-doc-${courseId}`, name: `SOP-MMVN-${tpl.codePrefix}: Operating Guide & Business Standards (PDF)`, type: 'PDF', size: '2.8 MB', url: '#' },
        { id: `mat-ppt-${courseId}`, name: `Training Slides & Scenarios: ${title} (PPT)`, type: 'PPT', size: '7.5 MB', url: '#' },
        { id: `mat-chk-${courseId}`, name: `Practical Assessment Checklist Form (PDF)`, type: 'PDF', size: '1.2 MB', url: '#' },
      ],
      configuration: {
        assessmentEnabled: true,
        maxAttempts: 3,
        passingScorePercent: tpl.passScore,
        certificateEnabled: true,
        certificateTemplateId:
          tpl.category === 'Food Safety & Hygiene' ? 'CERTTPL-FSH-001' :
          tpl.category === 'Health & Safety' ? 'CERTTPL-HSE-001' :
          tpl.category === 'Retail Operations' ? 'CERTTPL-OPS-001' :
          tpl.category === 'Supply Chain & Logistics' ? 'CERTTPL-SCM-001' :
          tpl.category === 'Customer Service' ? 'CERTTPL-CS-001' :
          tpl.category === 'Leadership & Management' ? 'CERTTPL-LEAD-001' :
          tpl.category === 'Digital & Technology' ? 'CERTTPL-TECH-001' :
          tpl.category === 'Compliance & Ethics' ? 'CERTTPL-COMP-001' :
          tpl.category === 'Fresh Food Processing' ? 'CERTTPL-FRESH-001' :
          tpl.category === 'Financial Management' ? 'CERTTPL-FIN-001' :
          'CERTTPL-OPS-001',
        validityPeriodMonths:
          tpl.category === 'Customer Service' || tpl.category === 'Digital & Technology' ? 0 :
          tpl.category === 'Leadership & Management' ? 36 :
          tpl.category === 'Food Safety & Hygiene' || tpl.category === 'Health & Safety' || tpl.category === 'Compliance & Ethics' || tpl.category === 'Fresh Food Processing' ? 12 :
          24,
        recertificationWarningDays: 30,
        recertificationMethod: tpl.isMandatory ? 'RETAKE_FULL_COURSE' : 'ASSESSMENT_ONLY',
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
        targetLevel,
        assignedDate: '2026-08-01',
        dueDate: `2026-${['09', '09', '09', '10', '08'][courseCounter % 5]}-${['04', '07', '10', '12', '15', '18', '21', '24', '26', '28'][courseCounter % 10]}`,
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
// 3. ENTERPRISE ACCESS CONTROL & TARGETING RULES
// ---------------------------------------------------------------------------

/**
 * Course access control on the inverted level scale.
 *
 * All level logic lives in `checkCourseAccessRule` (./levelSystem.js);
 * this function only wraps it and keeps the backward-compatible fields
 * (`isLocked`, `requiredLevel`) for the older screens.
 */
export function getCourseAccessControl(course, user, ctx = {}) {
  const access = checkCourseAccessRule(course, user, ctx);
  return {
    ...access,
    isLocked: access.isLevelLocked,
    requiredLevel: access.courseLevel,
  };
}

// ---------------------------------------------------------------------------
// 4. GENERATE TARGETED REALISTIC ENROLLMENT MATRIX (~8-14 Courses per User)
// ---------------------------------------------------------------------------

export const generated100EnrollmentMatrix = {};
export const generated100EnrollmentList = [];

// Manual enrollment list for Minh Tran (USR-1042 - Level 7, bakery counter front line).
// These are all Level 7 courses: you must finish your own level's program before
// submit a request to study up to Level 6 (see the Sequential Level Gate flow).
const MINH_TRAN_ENROLLMENTS = {
  'CRS-FSH-001': { status: 'IN_PROGRESS', progressPercent: 47, score: null, attemptsCount: 0, completedAt: null, completedTime: null, hoursSpent: 1.4, dueDate: '2026-09-30', enrolledAt: '2026-08-20', startedAt: '2026-08-22' },
  'CRS-FSH-002': { status: 'COMPLETED', progressPercent: 100, score: 92, attemptsCount: 1, completedAt: '2026-08-12', completedTime: '14:35', hoursSpent: 3.2, dueDate: '2026-08-30', enrolledAt: '2026-07-20', startedAt: '2026-07-22' },
  'CRS-FSH-003': { status: 'FAILED', progressPercent: 100, score: 58, attemptsCount: 2, completedAt: '2026-08-15', completedTime: '09:10', hoursSpent: 3.6, dueDate: '2026-08-30', enrolledAt: '2026-07-25', startedAt: '2026-07-28' },
  'CRS-ISA-011': { status: 'COMPLETED', progressPercent: 100, score: 95, attemptsCount: 1, completedAt: '2026-08-05', completedTime: '16:48', hoursSpent: 1.8, dueDate: '2026-08-30', enrolledAt: '2026-07-15', startedAt: '2026-07-16' },
  'CRS-ISA-012': { status: 'OVERDUE', progressPercent: 25, score: null, attemptsCount: 0, completedAt: null, completedTime: null, hoursSpent: 0.5, dueDate: '2026-08-15', enrolledAt: '2026-07-10', startedAt: '2026-07-15' },
  'CRS-HSE-019': { status: 'IN_PROGRESS', progressPercent: 80, score: null, attemptsCount: 0, completedAt: null, completedTime: null, hoursSpent: 2.5, dueDate: '2026-09-15', enrolledAt: '2026-08-01', startedAt: '2026-08-03' },
  'CRS-HSE-020': { status: 'OVERDUE', progressPercent: 10, score: null, attemptsCount: 0, completedAt: null, completedTime: null, hoursSpent: 0.3, dueDate: '2026-08-10', enrolledAt: '2026-07-05', startedAt: '2026-07-20' },
  'CRS-STOPS-037': { status: 'IN_PROGRESS', progressPercent: 40, score: null, attemptsCount: 0, completedAt: null, completedTime: null, hoursSpent: 1.2, dueDate: '2026-09-30', enrolledAt: '2026-08-15', startedAt: '2026-08-18' },
  'CRS-STOPS-038': { status: 'NOT_STARTED', progressPercent: 0, score: null, attemptsCount: 0, completedAt: null, completedTime: null, hoursSpent: 0, dueDate: '2026-10-31', enrolledAt: '2026-08-25', startedAt: null },
  'CRS-CSERV-087': { status: 'IN_PROGRESS', progressPercent: 30, score: null, attemptsCount: 0, completedAt: null, completedTime: null, hoursSpent: 0.9, dueDate: '2026-10-31', enrolledAt: '2026-08-20', startedAt: '2026-08-25' },
  'CRS-CULT-093': { status: 'COMPLETED', progressPercent: 100, score: 88, attemptsCount: 1, completedAt: '2026-07-28', completedTime: '11:20', hoursSpent: 2.1, dueDate: '2026-08-15', enrolledAt: '2026-07-01', startedAt: '2026-07-03' },
  'CRS-CULT-094': { status: 'IN_PROGRESS', progressPercent: 55, score: null, attemptsCount: 0, completedAt: null, completedTime: null, hoursSpent: 1.6, dueDate: '2026-09-30', enrolledAt: '2026-08-10', startedAt: '2026-08-12' },
};

// The "today" the whole demo dataset is anchored to (the app's clock is fixed to
// this date, see the days-remaining maths on the operational reports).
const TODAY = '2026-09-04';

// Deterministic day-shift so every employee/course pair gets its own (but stable
// across re-renders) enrollment/start date instead of one fixed constant for
// the entire company — see BR-RPT data-check with the Vietnamese team.
function shiftDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Three company-wide mandatory compliance courses (Level 7) - assigned to everyone.
export const UNIVERSAL_COMPLIANCE_COURSE_IDS = ['CRS-ISA-011', 'CRS-HSE-019', 'CRS-STOPS-037'];

generated100Users.forEach((user, uIdx) => {
  const userEnrollmentMap = {};

  if (user.userId === 'USR-1042' || user.employeeCode === 'MMVN-1042') {
    Object.entries(MINH_TRAN_ENROLLMENTS).forEach(([courseId, details]) => {
      const course = generatedCourseList.find((c) => c.id === courseId);
      if (course) {
        userEnrollmentMap[courseId] = {
          courseId,
          userId: user.userId,
          courseType: course.courseType,
          ...details,
          lastLessonTitle: course.modules?.[0]?.lessons?.[0]?.title || '1.1 Industry Standards & Legal Foundations',
          lastActivityAt: '2026-08-20',
        };
      }
    });
  } else {
    // For other users, select 8-12 tailored courses based on role and department
    const isManager = user.role === 'manager' || levelValue(user.level) <= 4;
    const isFood = user.divisionCode === 'OMD' || user.departmentCode === 'PPF';
    const isSCM = user.divisionCode === 'SCM';
    const isFrontEnd = user.departmentCode === 'FE' || user.position?.includes('Cashier');

    generatedCourseList.forEach((c, cIdx) => {
      let isTargeted = false;

      // Never self-enroll in an above-level course: the learner must request approval.
      if (levelGap(user.level, c.targetLevel) > 0) return;

      // Universal compliance for all employees
      if (UNIVERSAL_COMPLIANCE_COURSE_IDS.includes(c.id)) {
        isTargeted = true;
      }
      // Manager leadership courses
      else if (isManager && c.code?.startsWith('LEAD')) {
        isTargeted = (cIdx % 3 === 0);
      }
      // Food Safety courses
      else if (isFood && c.code?.startsWith('FSH')) {
        isTargeted = (cIdx % 2 === 0);
      }
      // SCM courses
      else if (isSCM && (c.code?.startsWith('SCM') || c.code?.startsWith('COLD'))) {
        isTargeted = (cIdx % 2 === 0);
      }
      // POS Cashier courses
      else if (isFrontEnd && c.code?.startsWith('STOPS')) {
        isTargeted = (cIdx % 2 === 0);
      }
      // Electives
      else if ((uIdx * 3 + cIdx) % 17 === 0) {
        isTargeted = true;
      }

      if (isTargeted) {
        let status = 'IN_PROGRESS';
        let progressPercent = 35 + ((uIdx * 7 + cIdx * 11) % 55);
        let score = null;
        let attemptsCount = 0;

        if ((uIdx + cIdx) % 4 === 0) {
          status = 'COMPLETED';
          progressPercent = 100;
          score = 85 + ((uIdx * 3 + cIdx) % 15);
          attemptsCount = 1;
        } else if ((uIdx + cIdx) % 7 === 0) {
          status = 'NOT_STARTED';
          progressPercent = 0;
        } else if ((uIdx + cIdx) % 5 === 0) {
          status = 'OVERDUE';
          progressPercent = 20;
        }

        const dueDate = c.assignment?.dueDate || '2026-09-30';

        // A completed record is anchored backwards from today so the whole
        // timeline stays coherent and in the past (enrolled → started →
        // completed); anything unfinished is anchored to its deadline instead.
        let enrolledAt;
        let startedAt = null;
        let completedAt = null;
        let completedTime = null;

        if (status === 'COMPLETED') {
          completedAt = shiftDate(TODAY, -(1 + ((uIdx * 5 + cIdx * 3) % 45)));
          completedTime = `${String(8 + ((uIdx + cIdx) % 10)).padStart(2, '0')}:${String((uIdx * 7 + cIdx * 13) % 60).padStart(2, '0')}`;
          startedAt = shiftDate(completedAt, -(3 + ((uIdx + cIdx) % 12)));
          enrolledAt = shiftDate(startedAt, -(2 + ((uIdx * 3 + cIdx) % 8)));
        } else {
          const enrollLagDays = 20 + ((uIdx * 7 + cIdx * 11) % 40);
          enrolledAt = shiftDate(dueDate, -enrollLagDays);
          startedAt = status === 'NOT_STARTED' ? null : shiftDate(enrolledAt, 2 + ((uIdx + cIdx) % 6));
        }

        // Hours actually spent on the course, as opposed to the course's declared
        // length: a completed record lands near the declared length (±20%), an
        // unfinished one in proportion to how far the learner has got.
        const declaredHours = parseFloat(c.estimatedHours) || 2;
        const effortFactor = 0.85 + (((uIdx * 13 + cIdx * 7) % 40) / 100);
        const hoursSpent = status === 'NOT_STARTED'
          ? 0
          : Math.round(declaredHours * (status === 'COMPLETED' ? 1 : progressPercent / 100) * effortFactor * 10) / 10;

        userEnrollmentMap[c.id] = {
          courseId: c.id,
          userId: user.userId,
          courseType: c.courseType,
          status,
          progressPercent,
          score,
          attemptsCount,
          completedAt,
          completedTime,
          hoursSpent,
          dueDate,
          enrolledAt,
          startedAt,
          lastLessonTitle: c.modules?.[0]?.lessons?.[0]?.title || '1.1 Industry Standards & Legal Foundations',
          lastActivityAt: '2026-08-19',
        };
      }
    });
  }

  generated100EnrollmentMatrix[user.userId] = userEnrollmentMap;
  generated100EnrollmentList.push({
    userId: user.userId,
    enrollments: Object.values(userEnrollmentMap),
  });
});

