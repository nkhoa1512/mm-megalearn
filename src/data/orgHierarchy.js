// ===========================================================================
// MM Mega Market Vietnam (MMVN) - Official Enterprise Organization Matrix
// 1 BU, 16 Divisions, 56 Departments, 9 Job Levels
// ===========================================================================

export const businessUnits = [
  { id: 'bu-mmvn', code: 'MMVN', name: 'MM Mega Market Vietnam' },
];

export const divisions = [
  { id: 'div-omd', businessUnitId: 'bu-mmvn', code: 'OMD', name: 'Merchandise' },
  { id: 'div-fad', businessUnitId: 'bu-mmvn', code: 'FAD', name: 'Finance & Accounting' },
  { id: 'div-gm', businessUnitId: 'bu-mmvn', code: 'GM', name: 'General Management' },
  { id: 'div-opt', businessUnitId: 'bu-mmvn', code: 'OPT', name: 'Operations' },
  { id: 'div-scm', businessUnitId: 'bu-mmvn', code: 'SCM', name: 'Supply Chain Management' },
  { id: 'div-hrd', businessUnitId: 'bu-mmvn', code: 'HRD', name: 'Human Resource' },
  { id: 'div-mkt', businessUnitId: 'bu-mmvn', code: 'MKT', name: 'Marketing' },
  { id: 'div-lgd', businessUnitId: 'bu-mmvn', code: 'LGD', name: 'Legal' },
  { id: 'div-cdd', businessUnitId: 'bu-mmvn', code: 'CDD', name: 'Corporate Development' },
  { id: 'div-prc', businessUnitId: 'bu-mmvn', code: 'PRC', name: 'Pricing' },
  { id: 'div-ecom', businessUnitId: 'bu-mmvn', code: 'ECOM', name: 'E-Commerce' },
  { id: 'div-lp', businessUnitId: 'bu-mmvn', code: 'LP', name: 'Loss Prevention & Quality Assurance' },
  { id: 'div-ia', businessUnitId: 'bu-mmvn', code: 'IA', name: 'Internal Audit & SOP & Risk Management' },
  { id: 'div-cap', businessUnitId: 'bu-mmvn', code: 'CAP', name: 'Cost Optimization & Procurement' },
  { id: 'div-prop', businessUnitId: 'bu-mmvn', code: 'PROP', name: 'Property' },
  { id: 'div-tu', businessUnitId: 'bu-mmvn', code: 'TU', name: 'Trade Union' },
];

export const departments = [
  // 1. OMD - Merchandise
  { id: 'dept-ppf', divisionId: 'div-omd', code: 'PPF', name: 'Processed Fresh Food' },
  { id: 'dept-mie', divisionId: 'div-omd', code: 'MIE', name: 'Import & Export' },
  { id: 'dept-nfpl', divisionId: 'div-omd', code: 'NF&PL', name: 'Non Food & Private Label' },
  { id: 'dept-uf', divisionId: 'div-omd', code: 'UF', name: 'Ultra Fresh' },
  { id: 'dept-df', divisionId: 'div-omd', code: 'DF', name: 'Dry Food' },
  { id: 'dept-srd', divisionId: 'div-omd', code: 'SRD', name: 'Space, Range & Display' },
  { id: 'dept-nfif', divisionId: 'div-omd', code: 'NFIF', name: 'Non Food In Food & Salted Grocery' },

  // 2. FAD - Finance & Accounting
  { id: 'dept-fa', divisionId: 'div-fad', code: 'FA', name: 'Finance & Accounting' },
  { id: 'dept-ctrl', divisionId: 'div-fad', code: 'CTRL', name: 'Controlling' },
  { id: 'dept-tre', divisionId: 'div-fad', code: 'TRE', name: 'Treasury' },
  { id: 'dept-fpr', divisionId: 'div-fad', code: 'FPR', name: 'Finance Project' },
  { id: 'dept-mis', divisionId: 'div-fad', code: 'MIS', name: 'Management Information System' },

  // 3. GM - General Management
  { id: 'dept-gm', divisionId: 'div-gm', code: 'GM', name: 'General Management' },

  // 4. OPT - Operations
  { id: 'dept-opt', divisionId: 'div-opt', code: 'OPT', name: 'Operations' },
  { id: 'dept-opx', divisionId: 'div-opt', code: 'OPX', name: 'Operations Excellent' },
  { id: 'dept-gt', divisionId: 'div-opt', code: 'GT', name: 'Gia Tot' },
  { id: 'dept-nso', divisionId: 'div-opt', code: 'NSO', name: 'New Store Opening' },
  { id: 'dept-sf', divisionId: 'div-opt', code: 'SF', name: 'Sales Force' },
  { id: 'dept-cons', divisionId: 'div-opt', code: 'CONS', name: 'Construction & Maintenance' },
  { id: 'dept-lea', divisionId: 'div-opt', code: 'LEA', name: 'Leasing' },

  // 5. SCM - Supply Chain Management
  { id: 'dept-mdt', divisionId: 'div-scm', code: 'MDT', name: 'Master Data & Stock Management' },
  { id: 'dept-sc', divisionId: 'div-scm', code: 'SC', name: 'Logistic & Warehouse' },
  { id: 'dept-sie', divisionId: 'div-scm', code: 'SIE', name: 'Import & Export' },
  { id: 'dept-ana', divisionId: 'div-scm', code: 'ANA', name: 'Analysis & Report' },

  // 6. HRD - Human Resource
  { id: 'dept-lod', divisionId: 'div-hrd', code: 'L&OD', name: 'Learning & Organizational Development' },
  { id: 'dept-hrbp', divisionId: 'div-hrd', code: 'HRBP', name: 'Human Resource Business Partner' },
  { id: 'dept-ta', divisionId: 'div-hrd', code: 'TA', name: 'Talen Acquisition' },
  { id: 'dept-cb', divisionId: 'div-hrd', code: 'C&B', name: 'Compensation & Benefits' },
  { id: 'dept-admin', divisionId: 'div-hrd', code: 'ADMIN', name: 'Workplace Management' },

  // 7. MKT - Marketing
  { id: 'dept-crm', divisionId: 'div-mkt', code: 'CRM', name: 'CRM & Loyalty' },
  { id: 'dept-mkt', divisionId: 'div-mkt', code: 'MKT', name: 'Marketing' },
  { id: 'dept-cx', divisionId: 'div-mkt', code: 'CX', name: 'Customer Experience' },
  { id: 'dept-com', divisionId: 'div-mkt', code: 'COM', name: 'Communication & Event' },

  // 8. LGD - Legal
  { id: 'dept-lg', divisionId: 'div-lgd', code: 'LG', name: 'Corporate Legal' },
  { id: 'dept-lgnso', divisionId: 'div-lgd', code: 'LGNSO', name: 'NSO & Project' },

  // 9. CDD - Corporate Development
  { id: 'dept-pr', divisionId: 'div-cdd', code: 'PR', name: 'Public Relationship' },
  { id: 'dept-csr', divisionId: 'div-cdd', code: 'CSR', name: 'Corporate Social Responsibility' },

  // 10. PRC - Pricing
  { id: 'dept-prc', divisionId: 'div-prc', code: 'PRC', name: 'Pricing' },
  { id: 'dept-b2b', divisionId: 'div-prc', code: 'B2B', name: 'B2B Development' },

  // 11. ECOM - E-Commerce
  { id: 'dept-ecom', divisionId: 'div-ecom', code: 'ECOM', name: 'E-Commerce' },
  { id: 'dept-ug', divisionId: 'div-ecom', code: 'UG', name: 'User Growth' },
  { id: 'dept-nsd', divisionId: 'div-ecom', code: 'NSD', name: 'New Service Development' },

  // 12. LP - Loss Prevention & Quality Assurance
  { id: 'dept-lp', divisionId: 'div-lp', code: 'LP', name: 'Loss Prevention' },
  { id: 'dept-qa', divisionId: 'div-lp', code: 'QA', name: 'Quality Assurance' },

  // 13. IA - Internal Audit & SOP & Risk Management
  { id: 'dept-iar', divisionId: 'div-ia', code: 'IAR', name: 'Internal Audit - Retail' },
  { id: 'dept-ianr', divisionId: 'div-ia', code: 'IANR', name: 'Internal Audit - Non Retail' },
  { id: 'dept-bm', divisionId: 'div-ia', code: 'BM', name: 'Business Monitoring' },
  { id: 'dept-sop', divisionId: 'div-ia', code: 'SOP', name: 'SOP' },
  { id: 'dept-rsk', divisionId: 'div-ia', code: 'RSK', name: 'Risk Management' },

  // 14. CAP - Cost Optimization & Procurement
  { id: 'dept-capgp', divisionId: 'div-cap', code: 'CAPGP', name: 'General Procurement' },
  { id: 'dept-capmkt', divisionId: 'div-cap', code: 'CAPMKT', name: 'Marketing & Software' },
  { id: 'dept-capnso', divisionId: 'div-cap', code: 'CAPNSO', name: 'Remodeling & NSO & Construction' },
  { id: 'dept-capprj', divisionId: 'div-cap', code: 'CAPPRJ', name: 'Project' },

  // 15. PROP - Property
  { id: 'dept-prop', divisionId: 'div-prop', code: 'PROP', name: 'Property' },
  { id: 'dept-mrd', divisionId: 'div-prop', code: 'MR&D', name: 'Market Research & Development' },

  // 16. TU - Trade Union
  { id: 'dept-tu', divisionId: 'div-tu', code: 'TU', name: 'Trade Union' },
];

export const jobLevels = [
  { level: '1', code: 'LVL-1', title: 'Head of Division (Director) / Board of Management (BOM)', authority: 'SUPREME_ADMIN' },
  { level: '2', code: 'LVL-2', title: 'Head of Department', authority: 'DIVISION_LEAD' },
  { level: '3', code: 'LVL-3', title: 'Senior Manager', authority: 'SENIOR_MANAGER' },
  { level: '4', code: 'LVL-4', title: 'Manager / Functional Expert', authority: 'LINE_MANAGER' },
  { level: '5', code: 'LVL-5', title: 'Leader / Supervisor / Specialist / Senior Executive', authority: 'SUPERVISOR' },
  { level: '6', code: 'LVL-6', title: 'Executive', authority: 'LEARNER' },
  { level: '7', code: 'LVL-7', title: 'Junior Executive', authority: 'LEARNER' },
  { level: 'CL', code: 'LVL-CL', title: 'Casual Labor', authority: 'LEARNER' },
  { level: 'IN', code: 'LVL-IN', title: 'Internship', authority: 'LEARNER' },
];
