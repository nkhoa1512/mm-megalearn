// ===========================================================================
// MM Mega Market Vietnam (MMVN) & Retail Matrix - Official Dual Hierarchy
// 1. Supporting Functions (Head Office / Corporate Branches)
// 2. Operations (Areas -> Store Types -> Clusters -> Stores -> Depts -> Positions)
// ===========================================================================

import { LEVEL_DEFINITIONS } from './levelSystem';

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

// ---------------------------------------------------------------------------
// Sub-Departments Hierarchy (Phòng ban con / Bộ phận nhỏ dưới Department)
// ---------------------------------------------------------------------------

export const subDepartments = [
  // 1. Processed Fresh Food (dept-ppf)
  { id: 'sub-bakery', departmentId: 'dept-ppf', code: 'SUB-BAKERY', name: 'Quầy Bánh Tươi & Bánh Mì (Bakery & Confectionery)' },
  { id: 'sub-meat', departmentId: 'dept-ppf', code: 'SUB-MEAT', name: 'Sơ Chế Thịt & Gia Cầm (Meat & Poultry Processing)' },
  { id: 'sub-seafood', departmentId: 'dept-ppf', code: 'SUB-SEAFOOD', name: 'Sơ Chế Thủy Hải Sản (Seafood Processing)' },
  { id: 'sub-rte', departmentId: 'dept-ppf', code: 'SUB-RTE', name: 'Bếp Nấu Sẵn Ready-to-Eat (RTE Delicatessen)' },
  { id: 'sub-ppf-lead', departmentId: 'dept-ppf', code: 'SUB-PPF-MGT', name: 'Ban Quản Lý & Giám Sát Chế Biến Tươi (Fresh Operations Management)' },

  // 2. Ultra Fresh Food (dept-uf)
  { id: 'sub-uf-veg', departmentId: 'dept-uf', code: 'SUB-UF-VEG', name: 'Rau Củ Tươi & Nông Sản (Produce & Vegetables)' },
  { id: 'sub-uf-fruit', departmentId: 'dept-uf', code: 'SUB-UF-FRUIT', name: 'Trái Cây Tươi & Trái Cây Nhập Khẩu (Fresh Fruits)' },
  { id: 'sub-uf-gap', departmentId: 'dept-uf', code: 'SUB-UF-GAP', name: 'Nguồn Hàng VietGAP & Hữu Cơ (Organic & GAP Sourcing)' },

  // 3. Dry Food Grocery (dept-df)
  { id: 'sub-df-pack', departmentId: 'dept-df', code: 'SUB-DF-PACK', name: 'Thực Phẩm Đóng Gói & Gia Vị (Packaged Goods & Condiments)' },
  { id: 'sub-df-bev', departmentId: 'dept-df', code: 'SUB-DF-BEV', name: 'Đồ Uống, Bia Rượu & Bánh Kẹo (Beverages & Confectionery)' },
  { id: 'sub-df-can', departmentId: 'dept-df', code: 'SUB-DF-CAN', name: 'Sữa, Bơ Sữa & Đồ Hộp (Dairy & Canned Foods)' },

  // 4. Non Food & Private Label (dept-nfpl)
  { id: 'sub-nf-care', departmentId: 'dept-nfpl', code: 'SUB-NF-CARE', name: 'Hóa Mỹ Phẩm & Chăm Sóc Cá Nhân (Personal & Home Care)' },
  { id: 'sub-nf-pl', departmentId: 'dept-nfpl', code: 'SUB-NF-PL', name: 'Phát Triển Nhãn Hàng Riêng (Private Label Development)' },

  // 5. Non Food Hardlines (dept-nfh) & Softlines (dept-nfs)
  { id: 'sub-nf-elec', departmentId: 'dept-nfh', code: 'SUB-NF-ELEC', name: 'Điện Máy & Gia Dụng Nhỏ (Electronics & Appliances)' },
  { id: 'sub-nf-house', departmentId: 'dept-nfh', code: 'SUB-NF-HOUSE', name: 'Dụng Cụ Nhà Bếp & Đồ Nhựa (Kitchenware & Household)' },
  { id: 'sub-nf-tex', departmentId: 'dept-nfs', code: 'SUB-NF-TEX', name: 'Thời Trang, Giày Dép & Hàng Vải (Textiles & Apparel)' },

  // 6. Import & Export (dept-mie)
  { id: 'sub-mie-imp', departmentId: 'dept-mie', code: 'SUB-MIE-IMP', name: 'Nhập Khẩu Trực Tiếp & Thu Mua Toàn Cầu (Global Import)' },
  { id: 'sub-mie-cust', departmentId: 'dept-mie', code: 'SUB-MIE-CUST', name: 'Khai Báo Hải Quan & Kiểm Dịch (Customs Clearance)' },

  // 7. Finance & Accounting (dept-acct, dept-cct, dept-oct, dept-tres, dept-tax, dept-itf)
  { id: 'sub-acct-gl', departmentId: 'dept-acct', code: 'SUB-ACCT-GL', name: 'Kế Toán Tổng Hợp & Báo Cáo Tài Chính (General Ledger)' },
  { id: 'sub-acct-ap', departmentId: 'dept-acct', code: 'SUB-ACCT-AP', name: 'Kế Toán Công Nợ Phải Trả Nhà Cung Cấp (Accounts Payable)' },
  { id: 'sub-acct-audit', departmentId: 'dept-acct', code: 'SUB-ACCT-AUD', name: 'Kiểm Soát Thu Ngân Siêu Thị (Cashier Audit)' },
  { id: 'sub-cct-mar', departmentId: 'dept-cct', code: 'SUB-CCT-MAR', name: 'Kiểm Soát Biên Lợi Nhuận & Chiết Khấu (Margin & Rebate Control)' },
  { id: 'sub-oct-inv', departmentId: 'dept-oct', code: 'SUB-OCT-INV', name: 'Kiểm Soát Hao Hụt & Tồn Kho Siêu Thị (Inventory Control)' },
  { id: 'sub-tres-cash', departmentId: 'dept-tres', code: 'SUB-TRES-CSH', name: 'Quản Trị Dòng Tiền & Giao Dịch Ngân Hàng (Cash Management)' },
  { id: 'sub-tax-stat', departmentId: 'dept-tax', code: 'SUB-TAX-STAT', name: 'Kê Khai Thuế & Thanh Tra Thuế (Tax Compliance)' },
  { id: 'sub-itf-hw', departmentId: 'dept-itf', code: 'SUB-ITF-HW', name: 'Hạ Tầng Mạng Siêu Thị & Data Center (Network Infra)' },
  { id: 'sub-itf-pos', departmentId: 'dept-itf', code: 'SUB-ITF-POS', name: 'Hỗ Trợ Kỹ Thuật Máy POS & Bảo Mật (POS Support & Sec)' },
  { id: 'sub-itf-erp', departmentId: 'dept-itf', code: 'SUB-ITF-ERP', name: 'Quản Trị Hệ Thống ERP & Cơ Sở Dữ Liệu (ERP & Database)' },

  // 8. General Management & PMO (dept-gm, dept-pm)
  { id: 'sub-gm-sec', departmentId: 'dept-gm', code: 'SUB-GM-SEC', name: 'Văn Phòng Ban Điều Hành (Executive Secretariat)' },
  { id: 'sub-pm-trans', departmentId: 'dept-pm', code: 'SUB-PM-TRANS', name: 'Chuyển Đổi Số & Quản Lý Dự Án (Enterprise PMO)' },

  // 9. Operations Executive (dept-ops-s, dept-ops-n, dept-ops-c, dept-gt, dept-dev, dept-fmt)
  { id: 'sub-ops-s-store', departmentId: 'dept-ops-s', code: 'SUB-OPS-S1', name: 'Vận Hành Siêu Thị Khu Vực TP.HCM (HCM Stores Ops)' },
  { id: 'sub-ops-s-prov', departmentId: 'dept-ops-s', code: 'SUB-OPS-S2', name: 'Vận Hành Siêu Thị Khu Vực Tỉnh Miền Nam (Mekong & East Ops)' },
  { id: 'sub-ops-n-store', departmentId: 'dept-ops-n', code: 'SUB-OPS-N1', name: 'Vận Hành Siêu Thị Khu Vực Miền Bắc (Northern Stores Ops)' },
  { id: 'sub-ops-c-store', departmentId: 'dept-ops-c', code: 'SUB-OPS-C1', name: 'Vận Hành Siêu Thị Khu Vực Miền Trung (Central Stores Ops)' },
  { id: 'sub-ops-gt', departmentId: 'dept-gt', code: 'SUB-OPS-GT', name: 'Mô Hình Giá Tốt & Bán Buôn (Wholesale Gia Tot Ops)' },
  { id: 'sub-ops-fmt', departmentId: 'dept-fmt', code: 'SUB-OPS-FMT', name: 'Tiêu Chuẩn Trưng Bày & Layout (Format Strategy)' },

  // 10. Supply Chain & Logistics (dept-ssp, dept-fsp, dept-dsp, dept-nfp, dept-rdc, dept-cd)
  { id: 'sub-scm-ssp', departmentId: 'dept-ssp', code: 'SUB-SCM-SSP', name: 'Quy Hoạch & Dự Báo Nhu Cầu Chuỗi Cung Ứng (Demand Planning)' },
  { id: 'sub-scm-cold', departmentId: 'dept-fsp', code: 'SUB-SCM-COLD', name: 'Vận Hành Chuỗi Cung Ứng Lạnh (Cold Chain Logistics)' },
  { id: 'sub-scm-forklift', departmentId: 'dept-rdc', code: 'SUB-SCM-FORK', name: 'Lái Xe Nâng & Xếp Dỡ Kho DC (Forklift & Stacking Ops)' },
  { id: 'sub-scm-fleet', departmentId: 'dept-cd', code: 'SUB-SCM-FLEET', name: 'Điều Phối Đội Xe Vận Tải Trung Tâm (Fleet Dispatch)' },
  { id: 'sub-scm-dry', departmentId: 'dept-dsp', code: 'SUB-SCM-DRY', name: 'Kho Trung Tâm Thực Phẩm Khô (Dry Goods DC)' },

  // 11. Human Resources & L&OD (dept-lod, dept-hrbp, dept-cb, dept-ta, dept-hrs)
  { id: 'sub-lod-store', departmentId: 'dept-lod', code: 'SUB-LOD-STORE', name: 'Học Viện Đào Tạo Siêu Thị & Thực Hành Tay Nghề (Store Academy)' },
  { id: 'sub-lod-lead', departmentId: 'dept-lod', code: 'SUB-LOD-LEAD', name: 'Đào Tạo Lãnh Đạo, Kế Nhiệm & Kỹ Năng Mềm (Leadership Development)' },
  { id: 'sub-lod-lms', departmentId: 'dept-lod', code: 'SUB-LOD-LMS', name: 'Quản Trị Hệ Thống LMS & Nội Dung E-Learning (Digital Learning Ops)' },
  { id: 'sub-hrbp-ops', departmentId: 'dept-hrbp', code: 'SUB-HRBP-OPS', name: 'HRBP Khối Vận Hành Siêu Thị (Operations HRBP)' },
  { id: 'sub-hrbp-ho', departmentId: 'dept-hrbp', code: 'SUB-HRBP-HO', name: 'HRBP Khối Văn Phòng & Hỗ Trợ (Corporate HRBP)' },
  { id: 'sub-cb-sys', departmentId: 'dept-cb', code: 'SUB-CB-SYS', name: 'Quản Trị Dữ Liệu Nhân Sự & Phân Quyền (HR Master Data & User Admin)' },
  { id: 'sub-cb-pay', departmentId: 'dept-cb', code: 'SUB-CB-PAY', name: 'Chính Sách, Tiền Lương & Phúc Lợi (Payroll & C&B)' },
  { id: 'sub-ta-store', departmentId: 'dept-ta', code: 'SUB-TA-STORE', name: 'Tuyển Dụng Nhân Sự Tuyến Đầu & Khối Siêu Thị (Mass Hiring)' },
  { id: 'sub-ta-ho', departmentId: 'dept-ta', code: 'SUB-TA-HO', name: 'Tuyển Dụng Cán Bộ Quản Lý & Khối Văn Phòng (HQ & Leadership Hiring)' },
  { id: 'sub-hrs-rel', departmentId: 'dept-hrs', code: 'SUB-HRS-REL', name: 'Quan Hệ Lao Động & Hợp Đồng Nhân Sự (Employee Relations)' },

  // 12. Marketing & CRM (dept-crm, dept-trad, dept-dig, dept-comm)
  { id: 'sub-mkt-crm', departmentId: 'dept-crm', code: 'SUB-MKT-CRM', name: 'Quản Trị Hội Viên M-Card & Dữ Liệu Khách Hàng (Loyalty & CRM)' },
  { id: 'sub-mkt-trad', departmentId: 'dept-trad', code: 'SUB-MKT-TRAD', name: 'Marketing Tại Điểm Bán & Ấn Phẩm Khuyến Mãi (Trade Activation)' },
  { id: 'sub-mkt-dig', departmentId: 'dept-dig', code: 'SUB-MKT-DIG', name: 'Truyền Thông Số, Mạng Xã Hội & Performance (Digital Media)' },
  { id: 'sub-mkt-pr', departmentId: 'dept-comm', code: 'SUB-MKT-PR', name: 'Quan Hệ Báo Chí & Truyền Thông Nội Bộ (PR & Internal Comms)' },

  // 13. Legal & Compliance (dept-legal, dept-comp)
  { id: 'dept-sub-legal', departmentId: 'dept-legal', code: 'SUB-LGD-LEG', name: 'Tư Vấn Pháp Lý Doanh Nghiệp & Hợp Đồng (Corporate Legal)' },
  { id: 'dept-sub-comp', departmentId: 'dept-comp', code: 'SUB-LGD-CMP', name: 'Tuân Thủ Pháp Luật & Giấy Phép Kinh Doanh (Statutory Compliance)' },

  // 14. Corporate Development & CSR (dept-cdd)
  { id: 'sub-cdd-esg', departmentId: 'dept-cdd', code: 'SUB-CDD-ESG', name: 'Phát Triển Bền Vững & Dự Án Xã Hội ESG (CSR & Sustainability)' },

  // 15. Pricing & B2B Commercial (dept-prc, dept-b2b)
  { id: 'sub-prc-opt', departmentId: 'dept-prc', code: 'SUB-PRC-OPT', name: 'Chiến Lược Định Giá & Tình Báo Cạnh Tranh (Pricing Intelligence)' },
  { id: 'sub-prc-b2b', departmentId: 'dept-b2b', code: 'SUB-PRC-B2B', name: 'Bán Hàng Khách Hàng Tổ Chức & HORECA (B2B Commercial Sales)' },

  // 16. E-Commerce & Digital (dept-ecom, dept-ug, dept-nsd)
  { id: 'sub-ecom-ops', departmentId: 'dept-ecom', code: 'SUB-ECOM-OPS', name: 'Vận Hành Đơn Hàng MM Online & App (MM Click & Delivery)' },
  { id: 'sub-ecom-ug', departmentId: 'dept-ug', code: 'SUB-ECOM-UG', name: 'Phát Triển Người Dùng & Tăng Trưởng Số (Digital User Growth)' },
  { id: 'sub-ecom-nsd', departmentId: 'dept-nsd', code: 'SUB-ECOM-NSD', name: 'Phát Triển Dịch Vụ Mới & O2O (New Service Dev)' },

  // 17. Loss Prevention & Quality Assurance (dept-lp, dept-qa)
  { id: 'sub-lp-sec', departmentId: 'dept-lp', code: 'SUB-LP-SEC', name: 'An Ninh Siêu Thị & Phòng Chống Thất Thoát (Loss Prevention & Security)' },
  { id: 'sub-lp-hse', departmentId: 'dept-lp', code: 'SUB-LP-HSE', name: 'An Toàn Lao Động & Phòng Cháy Chữa Cháy (HSE & Safety)' },
  { id: 'sub-qa-haccp', departmentId: 'dept-qa', code: 'SUB-QA-HACCP', name: 'Kiểm Soát Vệ Sinh An Toàn Thực Phẩm HACCP (Food Safety QA)' },

  // 18. Internal Audit & Risk (dept-iar, dept-ianr, dept-bm, dept-sop, dept-rsk)
  { id: 'sub-ia-store', departmentId: 'dept-iar', code: 'SUB-IA-STORE', name: 'Kiểm Toán Định Kỳ Khối Siêu Thị (Store Audit Team)' },
  { id: 'sub-ia-nonretail', departmentId: 'dept-ianr', code: 'SUB-IA-NR', name: 'Kiểm Toán Kho DC & Trung Tâm Vận Hành (Non-Retail Audit)' },
  { id: 'sub-ia-bm', departmentId: 'dept-bm', code: 'SUB-IA-BM', name: 'Giám Sát Tuân Thủ Kinh Doanh (Business Monitoring)' },
  { id: 'sub-ia-sop', departmentId: 'dept-sop', code: 'SUB-IA-SOP', name: 'Soạn Thảo & Chuẩn Hóa Quy Trình Vận Hành (SOP Management)' },
  { id: 'sub-ia-risk', departmentId: 'dept-rsk', code: 'SUB-IA-RISK', name: 'Quản Trị Rủi Ro Doanh Nghiệp (Enterprise Risk Management)' },

  // 19. Cost Optimization & Procurement (dept-capgp, dept-capmkt, dept-capnso, dept-capprj)
  { id: 'sub-cap-nso', departmentId: 'dept-capnso', code: 'SUB-CAP-NSO', name: 'Mua Sắm Thiết Bị Siêu Thị Mới & Cải Tạo (Store Equipment Procurement)' },
  { id: 'sub-cap-gen', departmentId: 'dept-capgp', code: 'SUB-CAP-GEN', name: 'Mua Sắm Dịch Vụ & Hàng Gián Tiếp (Indirect Procurement)' },
  { id: 'sub-cap-mkt', departmentId: 'dept-capmkt', code: 'SUB-CAP-MKT', name: 'Mua Sắm Dịch Vụ IT & Marketing (IT & Marketing Procurement)' },
  { id: 'sub-cap-prj', departmentId: 'dept-capprj', code: 'SUB-CAP-PRJ', name: 'Mua Sắm Chiến Lược & Dự Án (Strategic Sourcing)' },

  // 20. Property & Construction (dept-prop, dept-mrd)
  { id: 'sub-prop-dev', departmentId: 'dept-prop', code: 'SUB-PROP-DEV', name: 'Phát Triển Bất Động Sản & Cho Thuê Mặt Bằng (Tenant Leasing)' },
  { id: 'sub-prop-site', departmentId: 'dept-mrd', code: 'SUB-PROP-SITE', name: 'Nghiên Cứu Địa Điểm Siêu Thị Mới (Site Selection)' },

  // 21. Trade Union (dept-tu)
  { id: 'sub-tu-welfare', departmentId: 'dept-tu', code: 'SUB-TU-WEL', name: 'Chăm Lo Đời Sống & Phong Trào Đoàn Thể (Employee Welfare)' },
];

// ---------------------------------------------------------------------------
// Khung 7 Cấp Bậc Định Biên (thang ĐẢO NGƯỢC: Level 7 thấp nhất -> Level 1 cao nhất)
// Nguồn chân lý duy nhất là `LEVEL_DEFINITIONS` trong ./levelSystem.js; bảng dưới
// đây chỉ bổ sung phần mô tả nghiệp vụ HR (authority, typicalRoles, headcount).
// ---------------------------------------------------------------------------

const LEVEL_HR_META = {
  '1': {
    authority: 'SUPREME_EXECUTIVE',
    typicalRoles: ['sysadmin'],
    descVi: 'Ban điều hành / Giám đốc toàn quyền: hoạch định chiến lược tập đoàn, quản trị rủi ro & khủng hoảng toàn quốc.',
    headcount: 2,
  },
  '2': {
    authority: 'DIVISION_LEAD',
    typicalRoles: ['hrbp', 'useradmin'],
    descVi: 'Giám đốc siêu thị (SGM) / Trưởng khối: chịu trách nhiệm P&L siêu thị, ngân sách và quy hoạch nhân tài kế nhiệm.',
    headcount: 4,
  },
  '3': {
    authority: 'SENIOR_MANAGER',
    typicalRoles: ['trainer'],
    descVi: 'Trưởng ngành hàng / Master Trainer L&D: quản trị chi phí ngành hàng, đàm phán nhà cung cấp, đứng lớp đào tạo.',
    headcount: 8,
  },
  '4': {
    authority: 'LINE_MANAGER',
    typicalRoles: ['manager'],
    descVi: 'Trưởng bộ phận siêu thị (Line Manager): quản lý nhân sự phòng ban, phân ca, kèm cặp 1-on-1 và duyệt học vượt cấp.',
    headcount: 14,
  },
  '5': {
    authority: 'SUPERVISOR',
    typicalRoles: ['manager', 'learner'],
    descVi: 'Giám sát ca / Trưởng nhóm: kiểm soát tuân thủ SOP trong ca, kiểm kê thất thoát, an toàn xe nâng.',
    headcount: 17,
  },
  '6': {
    authority: 'PROFESSIONAL',
    typicalRoles: ['learner'],
    descVi: 'Chuyên viên vận hành chính thức: HACCP chuyên sâu, bảo quản hàng tươi sống, vận hành thiết bị chuyên dụng.',
    headcount: 25,
  },
  '7': {
    authority: 'ENTRY',
    typicalRoles: ['learner'],
    descVi: 'Nhân viên tuyến đầu / mới vào: nhập môn văn hóa, vệ sinh cơ bản, PCCC cơ bản và thao tác quầy.',
    headcount: 30,
  },
};

export const jobLevels = LEVEL_DEFINITIONS.map((def) => ({
  level: def.level,
  rank: Number(def.level),
  code: `LVL-${def.level}`,
  emoji: def.emoji,
  title: def.titleEn,
  viTitle: def.titleVi,
  shortVi: def.shortVi,
  band: def.band,
  colors: def.colors,
  ...LEVEL_HR_META[def.level],
}));

// Các mã cấp bậc cũ của HRIS (Casual Labor / Internship) quy về Level 7 để không vỡ dữ liệu.
export const legacyLevelAliases = [
  { legacy: 'CL', mapsTo: '7', title: 'Casual Labor / Seasonal Associate' },
  { legacy: 'IN', mapsTo: '7', title: 'Internship / Management Trainee' },
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
