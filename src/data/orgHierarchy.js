// ===========================================================================
// MM Mega Market Vietnam (MMVN) & Retail Matrix - Official Dual Hierarchy
// 1. Supporting Functions (Head Office / Corporate Branches)
// 2. Operations (Areas -> Store Types -> Clusters -> Stores -> Depts -> Positions)
// ===========================================================================

export const businessUnits = [
  { id: 'bu-mmvn', code: 'MMVN', name: 'MM Mega Market Vietnam (Retail & Wholesale)' },
];

export const orgBranches = [
  { id: 'branch-ops', code: 'OPERATIONS', name: 'Operations Branch (Hypermarkets & Stores)' },
  { id: 'branch-support', code: 'SUPPORTING', name: 'Supporting Functions Branch (Head Office)' },
];

// ---------------------------------------------------------------------------
// Branch 1: OPERATIONS HIERARCHY (Area -> Store Type -> Cluster -> Store -> Dept -> Section -> Position)
// ---------------------------------------------------------------------------

export const operationsAreas = [
  { id: 'area-north', code: 'NORTH', name: 'Area North (Northern Vietnam)' },
  { id: 'area-central', code: 'CENTRAL', name: 'Area Central (Central Vietnam)' },
  { id: 'area-south', code: 'SOUTH', name: 'Area South (Southern Vietnam)' },
];

export const storeTypes = [
  { id: 'st-cc', code: 'C&C', name: 'Cash & Carry Wholesale Hypermarket' },
  { id: 'st-sc', code: 'SUPER_CENTER', name: 'Super Center & Commercial Mall' },
  { id: 'st-fs', code: 'FOOD_SERVICE', name: 'Food Service Distribution Depot' },
  { id: 'st-depot', code: 'DEPOT', name: 'Regional Depot & Logistics Hub' },
];

export const clusters = [
  { id: 'clus-hn', areaId: 'area-north', code: 'CLUS-HN', name: 'Cluster Hanoi & Greater Metro' },
  { id: 'clus-qn-hp', areaId: 'area-north', code: 'CLUS-HP', name: 'Cluster Hai Phong - Quang Ninh' },
  { id: 'clus-danang', areaId: 'area-central', code: 'CLUS-DN', name: 'Cluster Da Nang - Central Coast' },
  { id: 'clus-hcm-east', areaId: 'area-south', code: 'CLUS-HCME', name: 'Cluster HCMC East & Binh Duong' },
  { id: 'clus-hcm-west', areaId: 'area-south', code: 'CLUS-HCMW', name: 'Cluster HCMC West & Dong Nai' },
  { id: 'clus-mekong', areaId: 'area-south', code: 'CLUS-MKN', name: 'Cluster Mekong Delta Region' },
];

export const retailStores = [
  { id: 'store-an-phu', clusterId: 'clus-hcm-east', typeId: 'st-cc', code: 'MM-AP', name: 'MM Mega Market An Phu (Flagship)', areaId: 'area-south', address: 'Zone B, An Phu New Urban Area, Thu Duc City' },
  { id: 'store-binh-phu', clusterId: 'clus-hcm-west', typeId: 'st-cc', code: 'MM-BP', name: 'MM Mega Market Binh Phu', areaId: 'area-south', address: 'Binh Phu Residential Area, District 6, HCMC' },
  { id: 'store-hiep-phu', clusterId: 'clus-hcm-east', typeId: 'st-cc', code: 'MM-HP', name: 'MM Mega Market Hiep Phu', areaId: 'area-south', address: 'National Highway 1A, Tan Thoi Hiep, District 12, HCMC' },
  { id: 'store-thang-long', clusterId: 'clus-hn', typeId: 'st-cc', code: 'MM-TL', name: 'MM Mega Market Thang Long', areaId: 'area-north', address: 'Pham Van Dong Road, Bac Tu Liem, Hanoi' },
  { id: 'store-ha-dong', clusterId: 'clus-hn', typeId: 'st-sc', code: 'MM-HD', name: 'MM Mega Market Ha Dong', areaId: 'area-north', address: 'To Hieu, Ha Dong, Hanoi' },
  { id: 'store-da-nang', clusterId: 'clus-danang', typeId: 'st-cc', code: 'MM-DN', name: 'MM Mega Market Da Nang', areaId: 'area-central', address: 'Cach Mang Thang 8, Cam Le, Da Nang' },
  { id: 'store-can-tho', clusterId: 'clus-mekong', typeId: 'st-cc', code: 'MM-CT', name: 'MM Mega Market Hung Loi (Can Tho)', areaId: 'area-south', address: '30/4 Street, Ninh Kieu, Can Tho' },
  { id: 'store-bien-hoa', clusterId: 'clus-hcm-west', typeId: 'st-sc', code: 'MM-BH', name: 'MM Mega Market Bien Hoa', areaId: 'area-south', address: 'Dong Khoi, Tan Tien, Bien Hoa, Dong Nai' },
];

export const storeDepartments = [
  { id: 'sdept-fresh', code: 'FRESH', name: 'Fresh Food Operations' },
  { id: 'sdept-dry', code: 'DRY', name: 'Dry Grocery & FMCG' },
  { id: 'sdept-nonfood', code: 'NONFOOD', name: 'Non-Food & Electronics' },
  { id: 'sdept-frontline', code: 'FRONTLINE', name: 'Cashier & Frontline Service' },
  { id: 'sdept-lp', code: 'LP_QA', name: 'Loss Prevention, QA & HSE Safety' },
  { id: 'sdept-gr', code: 'GR_LOG', name: 'Goods Receiving & Inventory Storage' },
];

export const storeSections = [
  { id: 'sec-bakery', departmentId: 'sdept-fresh', name: 'Bakery & Confectionery Section' },
  { id: 'sec-meat', departmentId: 'sdept-fresh', name: 'Meat, Poultry & Seafood Section' },
  { id: 'sec-fv', departmentId: 'sdept-fresh', name: 'Fruit & Vegetables Section' },
  { id: 'sec-delica', departmentId: 'sdept-fresh', name: 'Delicatessen & Ready-to-Eat Section' },
  { id: 'sec-pos', departmentId: 'sdept-frontline', name: 'Checkout Lanes & POS Cashiers' },
  { id: 'sec-cs', departmentId: 'sdept-frontline', name: 'Customer Service Counter' },
];

// ---------------------------------------------------------------------------
// Branch 2: SUPPORTING FUNCTIONS HIERARCHY (Head Office -> Division -> Dept -> Section -> Position)
// ---------------------------------------------------------------------------

export const divisions = [
  { id: 'div-omd', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'OMD', name: 'Merchandise Division' },
  { id: 'div-fad', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'FAD', name: 'Finance & Accounting' },
  { id: 'div-gm', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'GM', name: 'General Management' },
  { id: 'div-opt', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: 'OPT', name: 'Operations Executive' },
  { id: 'div-scm', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'SCM', name: 'Supply Chain Management' },
  { id: 'div-hrd', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'HRD', name: 'Human Resource & L&OD' },
  { id: 'div-mkt', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'MKT', name: 'Marketing & CRM' },
  { id: 'div-lgd', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'LGD', name: 'Legal & Compliance' },
  { id: 'div-cdd', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'CDD', name: 'Corporate Development & CSR' },
  { id: 'div-prc', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'PRC', name: 'Pricing & B2B Commercial' },
  { id: 'div-ecom', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'ECOM', name: 'E-Commerce & Digital Growth' },
  { id: 'div-lp', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'LP', name: 'Loss Prevention & Quality Assurance' },
  { id: 'div-ia', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'IA', name: 'Internal Audit & SOP & Risk' },
  { id: 'div-cap', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'CAP', name: 'Cost Optimization & Procurement' },
  { id: 'div-prop', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'PROP', name: 'Property & Construction' },
  { id: 'div-tu', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'TU', name: 'Trade Union' },
];

export const departments = [
  // 1. OMD - Merchandise
  { id: 'dept-ppf', divisionId: 'div-omd', code: 'PPF', name: 'Processed Fresh Food' },
  { id: 'dept-mie', divisionId: 'div-omd', code: 'MIE', name: 'Import & Export' },
  { id: 'dept-nfpl', divisionId: 'div-omd', code: 'NF&PL', name: 'Non Food & Private Label' },
  { id: 'dept-uf', divisionId: 'div-omd', code: 'UF', name: 'Ultra Fresh Food' },
  { id: 'dept-df', divisionId: 'div-omd', code: 'DF', name: 'Dry Food Grocery' },
  { id: 'dept-nfh', divisionId: 'div-omd', code: 'NFH', name: 'Non Food Hardlines' },
  { id: 'dept-nfs', divisionId: 'div-omd', code: 'NFS', name: 'Non Food Softlines' },

  // 2. FAD - Finance & Accounting
  { id: 'dept-acct', divisionId: 'div-fad', code: 'ACCT', name: 'Accounting & Reporting' },
  { id: 'dept-cct', divisionId: 'div-fad', code: 'CCT', name: 'Commercial Control' },
  { id: 'dept-oct', divisionId: 'div-fad', code: 'OCT', name: 'Operations Control' },
  { id: 'dept-tres', divisionId: 'div-fad', code: 'TRES', name: 'Treasury & Banking' },
  { id: 'dept-tax', divisionId: 'div-fad', code: 'TAX', name: 'Tax & Statutory Audit' },
  { id: 'dept-itf', divisionId: 'div-fad', code: 'ITF', name: 'IT Infrastructure & POS Security' },

  // 3. GM - General Management
  { id: 'dept-gm', divisionId: 'div-gm', code: 'GM', name: 'Executive Office' },
  { id: 'dept-pm', divisionId: 'div-gm', code: 'PM', name: 'Enterprise Project Management Office' },

  // 4. OPT - Operations Executive
  { id: 'dept-ops-s', divisionId: 'div-opt', code: 'OPS-S', name: 'Store Operations South' },
  { id: 'dept-ops-n', divisionId: 'div-opt', code: 'OPS-N', name: 'Store Operations North' },
  { id: 'dept-ops-c', divisionId: 'div-opt', code: 'OPS-C', name: 'Store Operations Central' },
  { id: 'dept-gt', divisionId: 'div-opt', code: 'GT', name: 'Gia Tot & Wholesale Program' },
  { id: 'dept-dev', divisionId: 'div-opt', code: 'OPS-DEV', name: 'Store Development & NSO' },
  { id: 'dept-fmt', divisionId: 'div-opt', code: 'FMT', name: 'Format & Layout Strategy' },

  // 5. SCM - Supply Chain Management
  { id: 'dept-ssp', divisionId: 'div-scm', code: 'SSP', name: 'Supply Chain Strategy & Planning' },
  { id: 'dept-fsp', divisionId: 'div-scm', code: 'FSP', name: 'Fresh Food Supply Chain & Cold Chain' },
  { id: 'dept-dsp', divisionId: 'div-scm', code: 'DSP', name: 'Dry Food Supply Chain' },
  { id: 'dept-nfp', divisionId: 'div-scm', code: 'NFP', name: 'Non Food Supply Chain' },
  { id: 'dept-rdc', divisionId: 'div-scm', code: 'RDC', name: 'Regional Distribution Center' },
  { id: 'dept-cd', divisionId: 'div-scm', code: 'CD', name: 'Central Depot & Transport' },

  // 6. HRD - Human Resources
  { id: 'dept-lod', divisionId: 'div-hrd', code: 'L&OD', name: 'Learning & Organizational Development' },
  { id: 'dept-hrbp', divisionId: 'div-hrd', code: 'HRBP', name: 'HR Business Partnering' },
  { id: 'dept-cb', divisionId: 'div-hrd', code: 'C&B', name: 'Compensation, Benefits & Payroll' },
  { id: 'dept-ta', divisionId: 'div-hrd', code: 'TA', name: 'Talent Acquisition & Employer Branding' },
  { id: 'dept-hrs', divisionId: 'div-hrd', code: 'HR-OPS', name: 'HR Services & Labor Relations' },

  // 7. MKT - Marketing & CRM
  { id: 'dept-crm', divisionId: 'div-mkt', code: 'CRM', name: 'CRM & Customer Loyalty (M-Card)' },
  { id: 'dept-trad', divisionId: 'div-mkt', code: 'TRAD', name: 'Trade Marketing' },
  { id: 'dept-dig', divisionId: 'div-mkt', code: 'DIG', name: 'Digital Media & Performance' },
  { id: 'dept-comm', divisionId: 'div-mkt', code: 'COMM', name: 'Corporate Communications & PR' },

  // 8. LGD - Legal & Compliance
  { id: 'dept-legal', divisionId: 'div-lgd', code: 'LGD', name: 'Corporate Legal & Real Estate' },
  { id: 'dept-comp', divisionId: 'div-lgd', code: 'COMP', name: 'Statutory Compliance' },

  // 9. CDD - Corporate Development & CSR
  { id: 'dept-cdd', divisionId: 'div-cdd', code: 'CDD', name: 'CSR & ESG Sustainability' },

  // 10. PRC - Pricing
  { id: 'dept-prc', divisionId: 'div-prc', code: 'PRC', name: 'Pricing Strategy & Competitor Intelligence' },
  { id: 'dept-b2b', divisionId: 'div-prc', code: 'B2B', name: 'B2B Institutional Sales' },

  // 11. ECOM - E-Commerce
  { id: 'dept-ecom', divisionId: 'div-ecom', code: 'ECOM', name: 'MM Online & FoodApp' },
  { id: 'dept-ug', divisionId: 'div-ecom', code: 'UG', name: 'Digital User Growth' },
  { id: 'dept-nsd', divisionId: 'div-ecom', code: 'NSD', name: 'New Service Development' },

  // 12. LP - Loss Prevention & Quality Assurance
  { id: 'dept-lp', divisionId: 'div-lp', code: 'LP', name: 'Loss Prevention & Security' },
  { id: 'dept-qa', divisionId: 'div-lp', code: 'QA', name: 'Food Safety & Product Quality Assurance' },

  // 13. IA - Internal Audit & SOP & Risk Management
  { id: 'dept-iar', divisionId: 'div-ia', code: 'IAR', name: 'Internal Audit - Retail Stores' },
  { id: 'dept-ianr', divisionId: 'div-ia', code: 'IANR', name: 'Internal Audit - Non Retail & DC' },
  { id: 'dept-bm', divisionId: 'div-ia', code: 'BM', name: 'Business Monitoring & Compliance' },
  { id: 'dept-sop', divisionId: 'div-ia', code: 'SOP', name: 'Standard Operating Procedures (SOP)' },
  { id: 'dept-rsk', divisionId: 'div-ia', code: 'RSK', name: 'Enterprise Risk Management' },

  // 14. CAP - Cost Optimization & Procurement
  { id: 'dept-capgp', divisionId: 'div-cap', code: 'CAPGP', name: 'General & Indirect Procurement' },
  { id: 'dept-capmkt', divisionId: 'div-cap', code: 'CAPMKT', name: 'IT, Software & Marketing Procurement' },
  { id: 'dept-capnso', divisionId: 'div-cap', code: 'CAPNSO', name: 'Equipment, Remodeling & Capex' },
  { id: 'dept-capprj', divisionId: 'div-cap', code: 'CAPPRJ', name: 'Strategic Sourcing' },

  // 15. PROP - Property
  { id: 'dept-prop', divisionId: 'div-prop', code: 'PROP', name: 'Real Estate & Property Development' },
  { id: 'dept-mrd', divisionId: 'div-prop', code: 'MR&D', name: 'Market Research & Site Selection' },

  // 16. TU - Trade Union
  { id: 'dept-tu', divisionId: 'div-tu', code: 'TU', name: 'Trade Union & Labor Relations' },
];

export const jobLevels = [
  { level: '1', code: 'LVL-1', title: 'Head of Division (Director) / Board of Management (BOM)', authority: 'SUPREME_ADMIN' },
  { level: '2', code: 'LVL-2', title: 'Head of Department / Store General Manager (SGM)', authority: 'DIVISION_LEAD' },
  { level: '3', code: 'LVL-3', title: 'Senior Manager / Deputy SGM', authority: 'SENIOR_MANAGER' },
  { level: '4', code: 'LVL-4', title: 'Line Manager / Store Department Manager', authority: 'LINE_MANAGER' },
  { level: '5', code: 'LVL-5', title: 'Section Supervisor / Shift Leader / Specialist', authority: 'SUPERVISOR' },
  { level: '6', code: 'LVL-6', title: 'Senior Associate / Specialist / Store Executive', authority: 'LEARNER' },
  { level: '7', code: 'LVL-7', title: 'Junior Associate / Store Counter Staff', authority: 'LEARNER' },
  { level: 'CL', code: 'LVL-CL', title: 'Casual Labor / Seasonal Associate', authority: 'LEARNER' },
  { level: 'IN', code: 'LVL-IN', title: 'Internship / Management Trainee', authority: 'LEARNER' },
];

// ---------------------------------------------------------------------------
// Competency Framework Matrix (Core, Functional & Leadership)
// ---------------------------------------------------------------------------

export const competencyFramework = [
  {
    id: 'comp-core',
    category: 'Core Competencies',
    skills: [
      { id: 'sk-cust', code: 'SK-CUST', name: 'Customer Centricity & Service Excellence' },
      { id: 'sk-collab', code: 'SK-COLLAB', name: 'Cross-Functional Collaboration' },
      { id: 'sk-integrity', code: 'SK-INT', name: 'Business Ethics & Compliance Integrity' },
      { id: 'sk-safety', code: 'SK-SAFETY', name: 'Food Safety & HSE Standards' },
    ],
  },
  {
    id: 'comp-func',
    category: 'Functional Competencies',
    skills: [
      { id: 'sk-haccp', code: 'SK-HACCP', name: 'HACCP & Cold-Chain Storage Protocols' },
      { id: 'sk-pos', code: 'SK-POS', name: 'Cash Handling, POS & Shrinkage Control' },
      { id: 'sk-plg', code: 'SK-PLG', name: 'Planogram & Space Merchandising' },
      { id: 'sk-proc', code: 'SK-PROC', name: 'Strategic Sourcing & Vendor Negotiation' },
      { id: 'sk-data', code: 'SK-DATA', name: 'Data Analytics & Stock Optimization' },
    ],
  },
  {
    id: 'comp-lead',
    category: 'Leadership & Management Competencies',
    skills: [
      { id: 'sk-team-lead', code: 'SK-LEAD', name: 'Team Coaching & Performance Management' },
      { id: 'sk-decision', code: 'SK-DEC', name: 'Operational Decision Making & Crisis Handling' },
      { id: 'sk-sgm', code: 'SK-SGM', name: 'Store P&L Management & Commercial Strategy' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Physical Facilities: Meeting Rooms & Store Practical Labs
// ---------------------------------------------------------------------------

export const meetingRoomsAndLabs = [
  { id: 'room-ho-dia', code: 'HO-DIA', name: 'Diamond Auditorium (An Phu Head Office)', capacity: 80, location: '4th Floor, An Phu Head Office Building', equipment: ['4K Video Wall', 'Wireless Microphone Array', 'Teams Rooms Bar', 'Speaker Podium'] },
  { id: 'room-ho-saph', code: 'HO-SAPH', name: 'Sapphire Training Suite (An Phu Head Office)', capacity: 35, location: '3rd Floor, An Phu Head Office Building', equipment: ['Interactive Projector', 'Smart Whiteboard', 'Audio System'] },
  { id: 'lab-ap-fresh', code: 'LAB-AP-01', name: 'Fresh Food & Bakery Practical Lab (MM An Phu)', capacity: 25, location: 'Fresh Preparation Area & Bakery Deck, MM An Phu', equipment: ['Commercial Deck Oven', 'HACCP Meat Prep Station', 'Continuous Cold Chain Monitor'] },
  { id: 'lab-ap-pos', code: 'LAB-AP-02', name: 'Cashier & Frontline Service Lab (MM An Phu)', capacity: 20, location: 'Mezzanine Training Room, MM An Phu', equipment: ['6 Demo POS Terminals', 'Barcode Scanners', 'Cash Management Safe'] },
  { id: 'lab-tl-fire', code: 'LAB-TL-01', name: 'HSE Fire & Emergency Drill Grounds (MM Thang Long)', capacity: 60, location: 'Outdoor Training Yard, MM Thang Long, Hanoi', equipment: ['CO2/Dry Powder Extinguishers', 'Simulated Smoke Chamber', 'High-Pressure Fire Hose'] },
  { id: 'room-dn-mekong', code: 'ROOM-DN-01', name: 'Song Han Training Hall (MM Da Nang)', capacity: 30, location: '2nd Floor, MM Mega Market Da Nang', equipment: ['85-inch 4K Smart Display', 'Conference Audio Array'] },
];

// ---------------------------------------------------------------------------
// Certified Trainers Directory (Internal & External Instructors)
// ---------------------------------------------------------------------------

export const trainersDirectory = [
  {
    id: 'tr-01',
    code: 'TRN-101',
    name: 'Nguyen Van Hung',
    role: 'Master Trainer / Head of Operational Training',
    department: 'L&OD - HRD',
    level: 'LVL-3',
    email: 'hung.nguyen@mmvietnam.com',
    phone: '0908 123 456',
    subjects: ['Food Safety & HACCP', 'Bakery Store Practical Lab', 'Shrinkage Prevention & Audit'],
    rating: 4.9,
    totalClassesTaught: 48,
    totalLearners: 1240,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'tr-02',
    code: 'TRN-102',
    name: 'Dang Thanh Mai',
    role: 'Senior L&OD Specialist / Soft Skills Instructor',
    department: 'L&OD - HRD',
    level: 'LVL-4',
    email: 'mai.dang@mmvietnam.com',
    phone: '0912 345 678',
    subjects: ['Customer Service Excellence', 'Office Onboarding Track', '1-on-1 Coaching & Mentoring'],
    rating: 4.85,
    totalClassesTaught: 36,
    totalLearners: 920,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'tr-03',
    code: 'TRN-103',
    name: 'Vu Duc Thanh',
    role: 'Loss Prevention & HSE Director',
    department: 'Loss Prevention & QA',
    level: 'LVL-2',
    email: 'thanh.vu@mmvietnam.com',
    phone: '0983 222 111',
    subjects: ['Fire Safety & Workplace HSE', 'Store Physical Security', 'Crisis Management'],
    rating: 4.92,
    totalClassesTaught: 52,
    totalLearners: 1850,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'tr-04',
    code: 'TRN-104',
    name: 'Tran Minh Quang',
    role: 'Store General Manager (MM An Phu) / Leadership Mentor',
    department: 'Operations',
    level: 'LVL-2',
    email: 'quang.tran@mmvietnam.com',
    phone: '0903 888 999',
    subjects: ['SGM Talent Pipeline', 'Store P&L Management', '70-20-10 Succession Track'],
    rating: 4.96,
    totalClassesTaught: 24,
    totalLearners: 410,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
];
