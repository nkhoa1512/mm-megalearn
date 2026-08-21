// ===========================================================================
// MM Mega Market Vietnam (MMVN) - 100 Enterprise Users & 100 Enterprise Courses
// Coherent, Cross-Referenced Multi-Persona Dataset (Completed, In-Progress,
// Not-Started, Overdue, Failed)
// ===========================================================================

import { divisions, departments, jobLevels } from './orgHierarchy';

// ---------------------------------------------------------------------------
// 1. GENERATE 100 REALISTIC ENTERPRISE USERS
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
  FIN: ['Senior Financial Analyst', 'Management Accountant', 'Store CAPEX Controller'],
  ACC: ['Senior General Accountant', 'Accounts Payable Specialist', 'Store Audit Reconciliation Clerk'],
  TAX: ['Corporate Tax Specialist', 'Indirect Tax & VAT Compliance Lead'],
  SEC: ['Cybersecurity Defense Lead', 'IT Security Compliance Officer', 'Information Protection Specialist'],
  ECOM: ['Omnichannel Fulfillment Lead', 'Online Order Processing Specialist', 'Last-Mile Delivery Coordinator', 'E-Commerce Merchandiser'],
  MKT: ['Brand Campaign Specialist', 'Trade Marketing Executive', 'Digital Media Specialist', 'In-Store Promotion Lead'],
  PRC: ['Pricing & Margin Analyst', 'Commercial Strategy Specialist', 'Promotions Pricing Coordinator'],
  CDD: ['B2B Sales Development Lead', 'Key Account Executive', 'Horeca Channel Specialist'],
  IA: ['Senior Internal Auditor', 'Financial & Operational Audit Specialist', 'Compliance Risk Inspector'],
  RSK: ['Enterprise Risk Officer', 'Business Continuity Specialist', 'Operational Risk Analyst'],
  LGD: ['Senior Legal Counsel', 'Contract & Regulatory Specialist', 'Corporate Compliance Lead'],
  PROP: ['Facilities & Property Maintenance Lead', 'HVAC & Refrigeration Technician', 'Energy Management Specialist'],
  TU: ['Digital Transformation PMO', 'Store Technology Project Lead', 'Continuous Improvement Specialist'],
};

// Generate 100 Unique Enterprise Users
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
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-hrd', divisionCode: 'HRD', divisionName: 'Human Resource',
      departmentId: 'dept-lod', departmentCode: 'L&OD', departmentName: 'Learning & Org Dev',
      managerId: null,
      status: 'ACTIVE',
      avatar: 'SN',
      badgeTone: 'ai',
      description: 'Supreme L&D Authority across all 16 MMVN Divisions & 56 Departments',
    };
  }
  if (i === 1) {
    return {
      userId: 'USR-0245',
      employeeCode: 'MMVN-0245',
      fullName: 'David Tran',
      email: 'david.tran@mmvietnam.com',
      role: 'manager',
      position: 'Department Manager - Fresh Food',
      level: '4',
      levelTitle: 'Manager / Functional Expert',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-omd', divisionCode: 'OMD', divisionName: 'Merchandise',
      departmentId: 'dept-ppf', departmentCode: 'PPF', departmentName: 'Processed Fresh Food',
      managerId: 'USR-0001',
      status: 'ACTIVE',
      avatar: 'DT',
      badgeTone: 'amber',
      description: 'Approves course requests & monitors direct reports in Fresh Food',
    };
  }
  if (i === 2) {
    return {
      userId: 'USR-0312',
      employeeCode: 'MMVN-0312',
      fullName: 'Le Hoang Nam',
      email: 'nam.le@mmvietnam.com',
      role: 'manager',
      position: 'Store Operations Supervisor',
      level: '5',
      levelTitle: 'Leader / Supervisor / Specialist / Senior Executive',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-opt', divisionCode: 'OPT', divisionName: 'Operations',
      departmentId: 'dept-opx', departmentCode: 'OPX', departmentName: 'Operations Excellent',
      managerId: 'USR-0001',
      status: 'ACTIVE',
      avatar: 'LN',
      badgeTone: 'blue',
      description: 'Manages Store Floor & Cashier frontline staff',
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
      levelTitle: 'Executive',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-omd', divisionCode: 'OMD', divisionName: 'Merchandise',
      departmentId: 'dept-ppf', departmentCode: 'PPF', departmentName: 'Processed Fresh Food',
      managerId: 'USR-0245',
      status: 'ACTIVE',
      avatar: 'MT',
      badgeTone: 'sage',
      description: 'Enrolled in Food Safety, SOP Bakery & Fire Safety drills',
    };
  }
  if (i === 4) {
    return {
      userId: 'USR-1250',
      employeeCode: 'MMVN-1250',
      fullName: 'Thanh Pham',
      email: 'thanh.pham@mmvietnam.com',
      role: 'learner',
      position: 'Logistics & Warehouse Specialist',
      level: '6',
      levelTitle: 'Executive',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-scm', divisionCode: 'SCM', divisionName: 'Supply Chain Management',
      departmentId: 'dept-sc', departmentCode: 'SC', departmentName: 'Logistic & Warehouse',
      managerId: 'USR-0245',
      status: 'ACTIVE',
      avatar: 'TP',
      badgeTone: 'rail',
      description: 'Tracks Warehouse Safety, Stock Management & Cold Chain SOP',
    };
  }
  if (i === 5) {
    return {
      userId: 'USR-2041',
      employeeCode: 'MMVN-2041',
      fullName: 'Quoc Bao',
      email: 'bao.quoc@mmvietnam.com',
      role: 'learner',
      position: 'Store Floor Assistant',
      level: 'CL',
      levelTitle: 'Casual Labor',
      businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
      divisionId: 'div-opt', divisionCode: 'OPT', divisionName: 'Operations',
      departmentId: 'dept-opt', departmentCode: 'OPT', departmentName: 'Store Operation',
      managerId: 'USR-0312',
      status: 'ACTIVE',
      avatar: 'QB',
      badgeTone: 'slate',
      description: 'Store floor frontline rotation',
    };
  }

  // Generate diverse staff for remaining 94 employees
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

  return {
    userId,
    employeeCode,
    fullName,
    email,
    role,
    position,
    level,
    levelTitle,
    businessUnitId: 'bu-mmvn',
    businessUnitCode: 'MMVN',
    divisionId: div.id,
    divisionCode: div.code,
    divisionName: div.name,
    departmentId: dept.id,
    departmentCode: dept.code,
    departmentName: dept.name,
    managerId,
    status: 'ACTIVE',
    avatar: initials,
    badgeTone: role === 'admin' ? 'ai' : role === 'manager' ? 'amber' : 'rail',
    description: `${position} in ${div.code}/${dept.code} (Level ${level})`,
  };
});

// ---------------------------------------------------------------------------
// 2. GENERATE 100 ENTERPRISE COURSES ACROSS 12 DOMAINS
// ---------------------------------------------------------------------------

const COURSE_CATALOG_TEMPLATES = [
  // 1. Food Safety & Hygiene (10 courses)
  { domain: 'Food Safety & Hygiene', codePrefix: 'FSH', count: 10, cat: 'Food Safety & Hygiene', isMandatory: true, targetType: 'DIVISION', targetId: 'div-omd', passScore: 80, time: '3h', titles: [
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
  { domain: 'Information Security', codePrefix: 'ISA', count: 8, cat: 'Information Security', isMandatory: true, targetType: 'BUSINESS_UNIT', targetId: 'bu-mmvn', passScore: 80, time: '2h', titles: [
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
  { domain: 'Health & Safety', codePrefix: 'HSE', count: 10, cat: 'Health & Safety', isMandatory: true, targetType: 'BUSINESS_UNIT', targetId: 'bu-mmvn', passScore: 75, time: '3h', titles: [
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
  { domain: 'Cold Chain', codePrefix: 'COLD', count: 8, cat: 'Cold Chain', isMandatory: true, targetType: 'DIVISION', targetId: 'div-scm', passScore: 85, time: '4h', titles: [
    'Cold Chain & Warehouse Perishables Quality Control',
    'Refrigerated Container Temperature Logging SOP',
    'Chilled Goods Loading & Quick Dispatch Protocols',
    'Cold Storage Defrost Cycle & Compressor Monitoring',
    'Fresh Produce Respiration & Humidity Control',
    'Frozen Food Deep Freeze Management (-18°C Standards)',
    'Perishable Expiration Date Tagging & FEFO Execution',
    'Cold Chain Transport Breakdown Emergency Contingency',
  ]},

  // 5. Store Operations & Customer Excellence (12 courses)
  { domain: 'Store Operations', codePrefix: 'OPS', count: 12, cat: 'Store Operations', isMandatory: false, targetType: null, targetId: null, passScore: 80, time: '2h', titles: [
    'Corporate Orientation & MMVN Cultural Values',
    'POS Cash Register Operation & Barcode Scanning Speed',
    'Customer Conflict Resolution & De-escalation Skills',
    'Store Floor Merchandising & Shelf Restocking SOP',
    'Price Tag Accuracy & Digital Electronic Shelf Labeling',
    'Handling VIP Wholesale & Professional B2B Customers',
    'Cash Handling, Counterfeit Currency & Safe Drop SOP',
    'Return, Exchange & Customer Refund Policy',
    'Store Opening & Closing Shift Checklist Standards',
    'Self-Checkout Assistance & Mobile Payment Guidance',
    'Greeter Protocol & In-Store Customer Greeting Standards',
    'Night Shift Stock Replenishment & Aisles Facing SOP',
  ]},

  // 6. Supply Chain & Warehouse Logistics (10 courses)
  { domain: 'Supply Chain', codePrefix: 'SCM', count: 10, cat: 'Supply Chain & Logistics', isMandatory: true, targetType: 'DIVISION', targetId: 'div-scm', passScore: 80, time: '3h', titles: [
    'Forklift & Reach Truck Safe Operation Certification',
    'Warehouse Inbound Goods Receipt & Pallet Stacking',
    'Order Picking Accuracy & Barcode Handheld Terminal Use',
    'Cross-Docking Logistics & Fast Transfer Optimization',
    'Cycle Counting & Real-time Inventory Audit SOP',
    'Damaged Goods Quarantine & Supplier Return Protocol',
    'Pallet Jack & Manual Equipment Inspection Guidelines',
    'Warehouse Yard Traffic Safety & Gate Pass Verification',
    'Hazardous Goods Storage Separation in DC Warehouse',
    'Logistics Route Planning & Eco-Driving Standards',
  ]},

  // 7. Loss Prevention & QA (8 courses)
  { domain: 'Loss Prevention', codePrefix: 'LP', count: 8, cat: 'Loss Prevention & QA', isMandatory: true, targetType: 'DEPARTMENT', targetId: 'dept-qa', passScore: 85, time: '3h', titles: [
    'Store Shrink Reduction & Theft Prevention Techniques',
    'CCTV Monitoring & Suspicious Behavior Detection',
    'Employee Entrance & Exit Bag Inspection Protocols',
    'High-Value Merchandise Anti-Theft Tagging Standards',
    'Vendor Delivery Audit & Short-Shipment Discrepancy Protocol',
    'Internal Fraud Investigation & Whistleblower Procedures',
    'Cash Office Security & Armored Vehicle Handover SOP',
    'Emergency Lock-down & Store Alarm Response Plan',
  ]},

  // 8. Corporate Governance & Legal (8 courses)
  { domain: 'Corporate Governance', codePrefix: 'GOV', count: 8, cat: 'Corporate Governance', isMandatory: true, targetType: 'ROLE', targetId: 'admin', passScore: 80, time: '2h', titles: [
    'Corporate Code of Conduct & Anti-Corruption Policy',
    'Conflict of Interest Disclosure & Whistleblowing SOP',
    'Competition Law & Fair Trading Regulatory Standards',
    'Intellectual Property, Brand Trademark & License Rights',
    'Labor Law Compliance & Workplace Harassment Prevention',
    'Contract Review & Signing Authority Governance (DOA)',
    'Financial Crime, Anti-Money Laundering (AML) & Fraud',
    'Environmental Compliance & Waste Water Management Rules',
  ]},

  // 9. Leadership & Management (10 courses)
  { domain: 'Leadership', codePrefix: 'LDR', count: 10, cat: 'Leadership & Management', isMandatory: true, targetType: 'ROLE', targetId: 'manager', passScore: 80, time: '4h', titles: [
    'Leadership Essentials for Managers: Coaching & Feedback',
    'Effective Delegation & Shift Task Prioritization',
    'Managing Store Employee Performance & Goal Setting',
    'Conducting Productive 1-on-1s & Career Development',
    'Frontline Conflict Mediation & Team Morale Building',
    'Leading Change & Agile Retail Transformation',
    'Interviewing & Selecting High-Potential Store Talent',
    'Budgeting, OPEX Cost Control & Margin Maximization',
    'Strategic Thinking & Executive Decision Making',
    'Crisis Communication & Media Handling for Store Directors',
  ]},

  // 10. E-Commerce & Omnichannel (6 courses)
  { domain: 'E-Commerce', codePrefix: 'ECOM', count: 6, cat: 'E-Commerce', isMandatory: false, targetType: null, targetId: null, passScore: 80, time: '2h', titles: [
    'Omnichannel Retail: Online Order Picking & Packing',
    'Fresh Food Cold Insulation Packing for Home Delivery',
    'Last-Mile Delivery Driver Coordination & Delivery SLA',
    'Handling Online Customer Inquiries & Live Chat Etiquette',
    'E-Commerce Catalog Digital Content & Image Standards',
    'Managing Flash Sales & High-Volume Order Surges',
  ]},

  // 11. Merchandising & Planogram (6 courses)
  { domain: 'Merchandising', codePrefix: 'MKT', count: 6, cat: 'Merchandising & Sales', isMandatory: false, targetType: null, targetId: null, passScore: 80, time: '2h', titles: [
    'Planogram Compliance & Eye-Level Shelf Positioning',
    'Promotional Endcap Displays & Promotional Banners SOP',
    'Seasonal Festival Merchandising (Tet & Mid-Autumn)',
    'Product Category Margin Mix & Cross-Merchandising',
    'Supplier Trade Marketing & On-Shelf Space Management',
    'Markdown Strategies & Near-Expiry Product Clearance',
  ]},

  // 12. Finance & Accounting (4 courses)
  { domain: 'Finance', codePrefix: 'FIN', count: 4, cat: 'Finance & Accounting', isMandatory: true, targetType: 'DIVISION', targetId: 'div-fad', passScore: 85, time: '3h', titles: [
    'Store Cash Flow Reconciliation & Daily Register Balancing',
    'VAT Invoice Issuance & Electronic Invoicing Regulations',
    'Fixed Asset Inventory Tagging & Depreciation Tracking',
    'Internal Expense Claims & SAP Concur Reporting Policy',
  ]},
];

// Generate 100 Unique Enterprise Courses
export const generated100Courses = (() => {
  const result = [];
  let courseIndex = 1;

  for (const tpl of COURSE_CATALOG_TEMPLATES) {
    for (let j = 0; j < tpl.titles.length; j++) {
      const code = `${tpl.codePrefix}-${String(j + 1).padStart(3, '0')}`;
      const id = `course-${tpl.codePrefix.toLowerCase()}-${j + 1}`;
      const title = tpl.titles[j];

      const assignment = tpl.isMandatory ? {
        assignmentType: tpl.targetType || 'BUSINESS_UNIT',
        targetBusinessUnitId: tpl.targetType === 'BUSINESS_UNIT' ? 'bu-mmvn' : undefined,
        targetDivisionId: tpl.targetType === 'DIVISION' ? tpl.targetId : undefined,
        targetDepartmentId: tpl.targetType === 'DEPARTMENT' ? tpl.targetId : undefined,
        targetRole: tpl.targetType === 'ROLE' ? tpl.targetId : undefined,
        targetLabel: tpl.targetType === 'BUSINESS_UNIT' ? 'MM Mega Market Vietnam' : `${tpl.targetType}: ${tpl.targetId}`,
        assignedBy: 'USR-0001',
        assignedAt: '2026-06-01',
        startDate: '2026-06-05',
        dueDate: '2026-09-30',
      } : null;

      result.push({
        id,
        code,
        title,
        description: `Official MM Mega Market enterprise operational curriculum covering ${title.toLowerCase()} for qualified employees.`,
        category: tpl.cat,
        courseType: tpl.isMandatory ? 'MANDATORY' : 'OPTIONAL',
        status: 'PUBLISHED',
        version: 'v1.0',
        estimatedDuration: tpl.time,
        createdBy: 'USR-0001',
        publishedAt: '2026-06-01',
        prerequisites: [],
        configuration: {
          assessmentEnabled: true,
          questionBankSize: 20,
          questionsPerAttempt: 10,
          passingScorePercent: tpl.passScore,
          maxAttempts: 3,
          assessmentTimeLimit: 25,
          randomizeQuestions: true,
          randomizeAnswers: true,
          showCorrectAnswers: 'AFTER_PASSING',
          certificateEnabled: true,
          completionRule: `Complete all interactive modules and pass final assessment with >= ${tpl.passScore}%.`,
        },
        assignment,
        modules: [
          {
            id: `${id}-m1`,
            title: `Core Fundamentals & Guidelines`,
            displayOrder: 1,
            lessons: [
              { id: `${id}-l1`, title: `${title} - Executive Overview Video`, lessonType: 'VIDEO', isRequired: true, status: 'COMPLETED', progressPercent: 100, rule: { requiredWatchPercent: 90 } },
              { id: `${id}-l2`, title: `Standard Operating Procedure Manual.pdf`, lessonType: 'DOCUMENT', isRequired: true, status: 'IN_PROGRESS', progressPercent: 50, rule: { requiredReadPercent: 90 } },
            ],
          },
          {
            id: `${id}-m2`,
            title: `Practical Execution & Standards`,
            displayOrder: 2,
            lessons: [
              { id: `${id}-l3`, title: `On-site Step-by-Step Interactive Guide`, lessonType: 'TEXT', isRequired: true, status: 'NOT_STARTED', progressPercent: 0, rule: { requiredReadPercent: 80 } },
              { id: `${id}-l4`, title: `Final Certification Assessment`, lessonType: 'ASSESSMENT', isRequired: true, status: 'NOT_STARTED', progressPercent: 0, rule: {} },
            ],
          },
        ],
        enrollment: {
          status: (courseIndex % 3 === 0) ? 'COMPLETED' : (courseIndex % 2 === 0) ? 'IN_PROGRESS' : 'NOT_STARTED',
          progressPercent: (courseIndex % 3 === 0) ? 100 : (courseIndex % 2 === 0) ? 65 : 0,
          startedAt: '2026-07-01',
          completedAt: (courseIndex % 3 === 0) ? '2026-07-20' : null,
          startDate: '2026-06-05',
          dueDate: '2026-09-30',
          score: (courseIndex % 3 === 0) ? (85 + (courseIndex % 15)) : null,
          lastLessonTitle: 'Standard Operating Procedure Manual.pdf',
          lastActivityAt: '2026-08-15',
        },
        assessmentAttempts: (courseIndex % 3 === 0) ? [
          { n: 1, score: 85 + (courseIndex % 15), passed: true, submittedAt: '2026-07-20' }
        ] : [],
        questionBank: [
          {
            id: `${id}-q1`, category: 'Standards', difficulty: 'MEDIUM', score: 10,
            text: `What is the primary compliance requirement when executing ${title}?`,
            type: 'SINGLE_CHOICE',
            options: [
              { id: 'o1', text: 'Follow official MMVN standard operating procedures and log records accurately', isCorrect: true },
              { id: 'o2', text: 'Proceed without recording if time is limited', isCorrect: false },
              { id: 'o3', text: 'Delegate to unauthorized casual staff', isCorrect: false },
              { id: 'o4', text: 'Only check during government audit days', isCorrect: false },
            ],
            explanation: 'MMVN quality standards require continuous adherence and auditable logging.',
          },
          {
            id: `${id}-q2`, category: 'Escalation', difficulty: 'EASY', score: 10,
            text: `Critical deviations in safety or hygiene must be escalated immediately to the Department Manager.`,
            type: 'TRUE_FALSE',
            options: [
              { id: 'o1', text: 'True', isCorrect: true },
              { id: 'o2', text: 'False', isCorrect: false },
            ],
            explanation: 'Immediate escalation prevents customer safety risks and regulatory penalties.',
          },
        ],
      });

      courseIndex++;
    }
  }

  return result;
})();

// ---------------------------------------------------------------------------
// 3. GENERATE FULL MULTI-USER ENROLLMENT MATRIX FOR ALL 100 USERS
// Guarantees all 100 users have distinct, realistic participation records:
// - Completed (with scores & certificates)
// - In Progress
// - Not Started
// - Overdue
// - Failed
// ---------------------------------------------------------------------------

export const generated100EnrollmentMatrix = (() => {
  const matrix = {};

  generated100Users.forEach((user, uIndex) => {
    matrix[user.userId] = {};

    generated100Courses.forEach((c, cIndex) => {
      // Deterministic pseudo-hash per (user, course) pair
      const hash = (uIndex * 17 + cIndex * 31 + 11) % 100;

      if (hash < 35) {
        // COMPLETED (35%)
        const score = 82 + (hash % 17);
        matrix[user.userId][c.id] = {
          status: 'COMPLETED',
          progressPercent: 100,
          startedAt: '2026-06-10',
          completedAt: '2026-07-15',
          startDate: '2026-06-05',
          dueDate: '2026-08-30',
          score,
          lastLessonTitle: 'Final Certification Assessment',
          lastActivityAt: '2026-07-15',
        };
      } else if (hash < 65) {
        // IN PROGRESS (30%)
        const progressPercent = 20 + (hash % 65);
        matrix[user.userId][c.id] = {
          status: 'IN_PROGRESS',
          progressPercent,
          startedAt: '2026-08-01',
          completedAt: null,
          startDate: '2026-08-01',
          dueDate: '2026-09-30',
          score: null,
          lastLessonTitle: 'Standard Operating Procedure Manual.pdf',
          lastActivityAt: '2026-08-18',
        };
      } else if (hash < 85) {
        // NOT STARTED (20%)
        matrix[user.userId][c.id] = {
          status: 'NOT_STARTED',
          progressPercent: 0,
          startedAt: null,
          completedAt: null,
          startDate: '2026-08-15',
          dueDate: '2026-10-15',
          score: null,
          lastLessonTitle: null,
          lastActivityAt: null,
        };
      } else if (hash < 94) {
        // OVERDUE (9%)
        matrix[user.userId][c.id] = {
          status: 'OVERDUE',
          progressPercent: 15 + (hash % 20),
          startedAt: '2026-07-05',
          completedAt: null,
          startDate: '2026-07-01',
          dueDate: '2026-08-10', // past due
          score: null,
          lastLessonTitle: 'Executive Overview Video',
          lastActivityAt: '2026-07-20',
          inactiveDays: 22,
          overdue: true,
        };
      } else {
        // FAILED (6%)
        matrix[user.userId][c.id] = {
          status: 'FAILED',
          progressPercent: 100,
          startedAt: '2026-07-10',
          completedAt: null,
          startDate: '2026-07-01',
          dueDate: '2026-08-20',
          score: 55 + (hash % 15),
          attempts: 3,
          lastLessonTitle: 'Final Certification Assessment',
          lastActivityAt: '2026-08-12',
        };
      }
    });
  });

  return matrix;
})();
