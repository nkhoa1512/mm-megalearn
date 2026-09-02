// ===========================================================================
// MM Mega Market Vietnam (MMVN) & Retail Matrix - Official Dual Hierarchy
// 1. Supporting Functions (Head Office / Corporate Branches)
// 2. Operations (Areas -> Store Types -> Clusters -> Stores -> Depts -> Positions)
// ===========================================================================

import { LEVEL_DEFINITIONS } from './levelSystem';

export const businessUnits = [
  { id: 'bu-mmvn', code: 'MMVN', name: 'MM Mega Market Vietnam (Retail & Wholesale)', description: 'MM Mega Market Vietnam wholesale and retail center chain' },
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
// 42 OFFICIAL DIVISIONS OF MM MEGA MARKET VIETNAM
//
// `costCenter` — the 5-digit cost center code issued by HR. Each Division owns EXACTLY
// exactly ONE code; every Department and Sub-Department inside the Division shares it,
// so an employee's training cost always maps to one single code even if they change
// department within the same Division. Code allocation rules:
//   • OPERATIONS  = the store number plus a trailing 0   (1010_AP -> 10100)
//   • SUPPORTING  = the 50xx0 range in declaration order (BSM -> 50010, CDD -> 50020…)
// `location` — the Division's work location, used for the "Location" column when exporting
// the HR file.
// ---------------------------------------------------------------------------

export const divisions = [
  // --- 23 Operations Divisions (Stores & Depots) ---
  { id: 'div-1010-ap', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1010_AP', costCenter: '10100', name: 'MM An Phu', location: 'Ho Chi Minh City (Thu Duc)' },
  { id: 'div-1011-bp', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1011_BP', costCenter: '10110', name: 'MM Binh Phu', location: 'Ho Chi Minh City (District 6)' },
  { id: 'div-1012-hp', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1012_HP', costCenter: '10120', name: 'MM Hiep Phu', location: 'Ho Chi Minh City (District 12)' },
  { id: 'div-1013-tl', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1013_TL', costCenter: '10130', name: 'MM Thang Long', location: 'Hanoi (Bac Tu Liem)' },
  { id: 'div-1014-hm', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1014_HM', costCenter: '10140', name: 'MM Hoang Mai', location: 'Hanoi (Hoang Mai)' },
  { id: 'div-1015-hl', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1015_HL', costCenter: '10150', name: 'MM Hung Loi', location: 'Can Tho (Ninh Kieu)' },
  { id: 'div-1016-hb', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1016_HB', costCenter: '10160', name: 'MM Hong Bang', location: 'Hai Phong (Hong Bang)' },
  { id: 'div-1017-dn', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1017_DN', costCenter: '10170', name: 'MM Da Nang', location: 'Da Nang (Cam Le)' },
  { id: 'div-1018-bh', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1018_BH', costCenter: '10180', name: 'MM Bien Hoa', location: 'Dong Nai (Bien Hoa)' },
  { id: 'div-1019-bd', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1019_BD', costCenter: '10190', name: 'MM Binh Duong', location: 'Binh Duong (Thuan An)' },
  { id: 'div-1020-lx', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1020_LX', costCenter: '10200', name: 'MM Long Xuyen', location: 'An Giang (Long Xuyen)' },
  { id: 'div-1021-qn', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1021_QN', costCenter: '10210', name: 'MM Quy Nhon', location: 'Binh Dinh (Quy Nhon)' },
  { id: 'div-1022-vt', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1022_VT', costCenter: '10220', name: 'MM Vung Tau', location: 'Ba Ria - Vung Tau' },
  { id: 'div-1023-vi', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1023_VI', costCenter: '10230', name: 'MM Vinh', location: 'Nghe An (Vinh City)' },
  { id: 'div-1024-hal', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1024_HaL', costCenter: '10240', name: 'MM Ha Long', location: 'Quang Ninh (Ha Long)' },
  { id: 'div-1025-nt', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1025_NT', costCenter: '10250', name: 'MM Nha Trang', location: 'Khanh Hoa (Nha Trang)' },
  { id: 'div-1026-hd', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1026_HD', costCenter: '10260', name: 'MM Ha Dong', location: 'Hanoi (Ha Dong)' },
  { id: 'div-1027-bmt', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1027_BMT', costCenter: '10270', name: 'MM Buon Ma Thuot', location: 'Dak Lak (Buon Ma Thuot)' },
  { id: 'div-1028-rg', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1028_RG', costCenter: '10280', name: 'MM Rach Gia', location: 'Kien Giang (Rach Gia)' },
  { id: 'div-1029-hup', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1029_HuP', costCenter: '10290', name: 'MM Hung Phu', location: 'Can Tho (Cai Rang)' },
  { id: 'div-1052-dl', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1052_DL', costCenter: '10520', name: 'Da Lat Depot', location: 'Lam Dong (Da Lat)' },
  { id: 'div-1055-hue', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '1055_HUE', costCenter: '10550', name: 'Hue Depot', location: 'Thua Thien Hue (Hue City)' },
  { id: 'div-2090-tx', businessUnitId: 'bu-mmvn', branch: 'OPERATIONS', code: '2090_TX', costCenter: '20900', name: 'MM Thanh Xuan', location: 'Hanoi (Thanh Xuan)' },

  // --- 19 Supporting Divisions (Head Office) ---
  { id: 'div-bsm-format', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'BSM', costCenter: '50010', name: 'BSM Format', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-cdd', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'CDD', costCenter: '50020', name: 'Corporate Development', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-cop', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'COP', costCenter: '50030', name: 'Cost Optimization & Procurement', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-dnsc', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'DNSC', costCenter: '50040', name: 'DN SC', location: 'Da Nang (Cam Le)' },
  { id: 'div-ecom', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'ECOM', costCenter: '50050', name: 'E-commerce & New Service Development', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-fad', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'FAD', costCenter: '50060', name: 'Finance & Accounting', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-gm', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'GM', costCenter: '50070', name: 'General Management', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-hrd', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'HRD', costCenter: '50080', name: 'Human Resources', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-ia', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'IA_RM', costCenter: '50090', name: 'Internal Audit & SOP & Risk Management', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-lgd', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'LGD', costCenter: '50100', name: 'Legal', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-lpqa', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'LP_QA', costCenter: '50110', name: 'LP-QA', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-mkt', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'MKT', costCenter: '50120', name: 'Marketing', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-omd', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'OMD', costCenter: '50130', name: 'Merchandise', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-mis', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'MIS', costCenter: '50140', name: 'MIS', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-opt', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'OPS', costCenter: '50150', name: 'Operations', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-prop', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'PROP', costCenter: '50160', name: 'Property', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-st41', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'ST41', costCenter: '50170', name: 'ST41', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-scm', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'SCM', costCenter: '50180', name: 'Supply Chain', location: 'Ho Chi Minh City (Head Office - An Phu)' },
  { id: 'div-tu', businessUnitId: 'bu-mmvn', branch: 'SUPPORTING', code: 'TU', costCenter: '50190', name: 'Trade Union', location: 'Ho Chi Minh City (Head Office - An Phu)' },
];

// Looks up a Division by its 5-digit cost center code. Used when reading back from the
// accounting / HR file (which only carries codes) back to the org structure.
export const divisionByCostCenter = divisions.reduce((acc, d) => {
  acc[d.costCenter] = d;
  return acc;
}, {});

/** The 5-digit cost center code of a Division (by id or code). */
export function costCenterCodeOfDivision(divisionIdOrCode) {
  const hit = divisions.find((d) => d.id === divisionIdOrCode || d.code === divisionIdOrCode);
  return hit ? hit.costCenter : null;
}

// ---------------------------------------------------------------------------
// 41 OFFICIAL DEPARTMENTS (MAPPED TO DIVISIONS)
// ---------------------------------------------------------------------------

export const departments = [
  // 1. 1010_AP
  { id: 'dept-1010-cs', divisionId: 'div-1010-ap', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1010-deliv', divisionId: 'div-1010-ap', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1010-df', divisionId: 'div-1010-ap', code: 'DF_ST', name: 'Dry Food_ST' },
  { id: 'dept-1010-ff', divisionId: 'div-1010-ap', code: 'FF_ST', name: 'Fresh Food_ST' },

  // 2. 1011_BP
  { id: 'dept-1011-cs', divisionId: 'div-1011-bp', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1011-deliv', divisionId: 'div-1011-bp', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1011-df', divisionId: 'div-1011-bp', code: 'DF_ST', name: 'Dry Food_ST' },
  { id: 'dept-1011-ff', divisionId: 'div-1011-bp', code: 'FF_ST', name: 'Fresh Food_ST' },
  { id: 'dept-1011-gr', divisionId: 'div-1011-bp', code: 'GR_ST', name: 'Goods Receiving_ST' },

  // 3. 1012_HP
  { id: 'dept-1012-cs', divisionId: 'div-1012-hp', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1012-deliv', divisionId: 'div-1012-hp', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1012-ff', divisionId: 'div-1012-hp', code: 'FF_ST', name: 'Fresh Food_ST' },
  { id: 'dept-1012-gr', divisionId: 'div-1012-hp', code: 'GR_ST', name: 'Goods Receiving_ST' },
  { id: 'dept-1012-nf', divisionId: 'div-1012-hp', code: 'NF_ST', name: 'Non Food_ST' },

  // 4. 1013_TL
  { id: 'dept-1013-cs', divisionId: 'div-1013-tl', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1013-deliv', divisionId: 'div-1013-tl', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1013-df', divisionId: 'div-1013-tl', code: 'DF_ST', name: 'Dry Food_ST' },
  { id: 'dept-1013-ff', divisionId: 'div-1013-tl', code: 'FF_ST', name: 'Fresh Food_ST' },

  // 5. 1014_HM
  { id: 'dept-1014-ff', divisionId: 'div-1014-hm', code: 'FF_ST', name: 'Fresh Food_ST' },
  { id: 'dept-1014-gr', divisionId: 'div-1014-hm', code: 'GR_ST', name: 'Goods Receiving_ST' },
  { id: 'dept-1014-os', divisionId: 'div-1014-hm', code: 'OPS_SUPP_ST', name: 'Operations Support_ST' },

  // 6. 1015_HL
  { id: 'dept-1015-ctsdc', divisionId: 'div-1015-hl', code: 'CT_SDC', name: 'Can Tho Sourcing DC' },
  { id: 'dept-1015-cs', divisionId: 'div-1015-hl', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1015-deliv', divisionId: 'div-1015-hl', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1015-df', divisionId: 'div-1015-hl', code: 'DF_ST', name: 'Dry Food_ST' },
  { id: 'dept-1015-ff', divisionId: 'div-1015-hl', code: 'FF_ST', name: 'Fresh Food_ST' },

  // 7. 1016_HB
  { id: 'dept-1016-cs', divisionId: 'div-1016-hb', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1016-deliv', divisionId: 'div-1016-hb', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1016-df', divisionId: 'div-1016-hb', code: 'DF_ST', name: 'Dry Food_ST' },
  { id: 'dept-1016-ff', divisionId: 'div-1016-hb', code: 'FF_ST', name: 'Fresh Food_ST' },
  { id: 'dept-1016-gr', divisionId: 'div-1016-hb', code: 'GR_ST', name: 'Goods Receiving_ST' },

  // 8. 1017_DN
  { id: 'dept-1017-cs', divisionId: 'div-1017-dn', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1017-deliv', divisionId: 'div-1017-dn', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1017-df', divisionId: 'div-1017-dn', code: 'DF_ST', name: 'Dry Food_ST' },
  { id: 'dept-1017-ff', divisionId: 'div-1017-dn', code: 'FF_ST', name: 'Fresh Food_ST' },
  { id: 'dept-1017-nf', divisionId: 'div-1017-dn', code: 'NF_ST', name: 'Non Food_ST' },

  // 9. 1018_BH
  { id: 'dept-1018-cs', divisionId: 'div-1018-bh', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1018-deliv', divisionId: 'div-1018-bh', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1018-ff', divisionId: 'div-1018-bh', code: 'FF_ST', name: 'Fresh Food_ST' },
  { id: 'dept-1018-nf', divisionId: 'div-1018-bh', code: 'NF_ST', name: 'Non Food_ST' },

  // 10. 1019_BD
  { id: 'dept-1019-gr', divisionId: 'div-1019-bd', code: 'GR_ST', name: 'Goods Receiving_ST' },
  { id: 'dept-1019-nf', divisionId: 'div-1019-bd', code: 'NF_ST', name: 'Non Food_ST' },
  { id: 'dept-1019-os', divisionId: 'div-1019-bd', code: 'OPS_SUPP_ST', name: 'Operations Support_ST' },

  // 11. 1020_LX
  { id: 'dept-1020-deliv', divisionId: 'div-1020-lx', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1020-nf', divisionId: 'div-1020-lx', code: 'NF_ST', name: 'Non Food_ST' },

  // 12. 1021_QN
  { id: 'dept-1021-cs', divisionId: 'div-1021-qn', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1021-deliv', divisionId: 'div-1021-qn', code: 'DELIV_ST', name: 'Delivery_ST' },

  // 13. 1022_VT
  { id: 'dept-1022-ff', divisionId: 'div-1022-vt', code: 'FF_ST', name: 'Fresh Food_ST' },
  { id: 'dept-1022-gr', divisionId: 'div-1022-vt', code: 'GR_ST', name: 'Goods Receiving_ST' },
  { id: 'dept-1022-nf', divisionId: 'div-1022-vt', code: 'NF_ST', name: 'Non Food_ST' },
  { id: 'dept-1022-os', divisionId: 'div-1022-vt', code: 'OPS_SUPP_ST', name: 'Operations Support_ST' },

  // 14. 1023_VI
  { id: 'dept-1023-cs', divisionId: 'div-1023-vi', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1023-deliv', divisionId: 'div-1023-vi', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1023-df', divisionId: 'div-1023-vi', code: 'DF_ST', name: 'Dry Food_ST' },

  // 15. 1024_HaL
  { id: 'dept-1024-cs', divisionId: 'div-1024-hal', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1024-deliv', divisionId: 'div-1024-hal', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1024-df', divisionId: 'div-1024-hal', code: 'DF_ST', name: 'Dry Food_ST' },
  { id: 'dept-1024-ff', divisionId: 'div-1024-hal', code: 'FF_ST', name: 'Fresh Food_ST' },

  // 16. 1025_NT
  { id: 'dept-1025-cs', divisionId: 'div-1025-nt', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1025-ff', divisionId: 'div-1025-nt', code: 'FF_ST', name: 'Fresh Food_ST' },

  // 17. 1026_HD
  { id: 'dept-1026-cs', divisionId: 'div-1026-hd', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1026-deliv', divisionId: 'div-1026-hd', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1026-df', divisionId: 'div-1026-hd', code: 'DF_ST', name: 'Dry Food_ST' },

  // 18. 1027_BMT
  { id: 'dept-1027-cs', divisionId: 'div-1027-bmt', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1027-deliv', divisionId: 'div-1027-bmt', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1027-ff', divisionId: 'div-1027-bmt', code: 'FF_ST', name: 'Fresh Food_ST' },

  // 19. 1028_RG
  { id: 'dept-1028-cs', divisionId: 'div-1028-rg', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-1028-deliv', divisionId: 'div-1028-rg', code: 'DELIV_ST', name: 'Delivery_ST' },
  { id: 'dept-1028-ff', divisionId: 'div-1028-rg', code: 'FF_ST', name: 'Fresh Food_ST' },

  // 20. 1029_HuP
  { id: 'dept-1029-df', divisionId: 'div-1029-hup', code: 'DF_ST', name: 'Dry Food_ST' },

  // 21. 1052_DL
  { id: 'dept-1052-depot', divisionId: 'div-1052-dl', code: 'DEPOT', name: 'Depot' },

  // 22. 1055_HUE
  { id: 'dept-1055-depot', divisionId: 'div-1055-hue', code: 'DEPOT', name: 'Depot' },

  // 23. 2090_TX
  { id: 'dept-2090-ff', divisionId: 'div-2090-tx', code: 'FF_ST', name: 'Fresh Food_ST' },
  { id: 'dept-2090-os', divisionId: 'div-2090-tx', code: 'OPS_SUPP_ST', name: 'Operations Support_ST' },

  // 24. BSM Format
  { id: 'dept-bsm-ops', divisionId: 'div-bsm-format', code: 'BSM_OPS', name: 'BSM Operations' },

  // 25. Corporate Development
  { id: 'dept-cdd-dept', divisionId: 'div-cdd', code: 'CDD', name: 'Corporate Development' },

  // 26. Cost Optimization & Procurement
  { id: 'dept-cop-pms', divisionId: 'div-cop', code: 'PROC_MKT_SW', name: 'Procurement - Marketing, Software' },

  // 27. DN SC
  { id: 'dept-dnsc-cs', divisionId: 'div-dnsc', code: 'CS_ST', name: 'Customer Service_ST' },
  { id: 'dept-dnsc-df', divisionId: 'div-dnsc', code: 'DF_ST', name: 'Dry Food_ST' },

  // 28. E-commerce & New Service Development
  { id: 'dept-ecom-dept', divisionId: 'div-ecom', code: 'ECOM', name: 'E-Commerce' },

  // 29. Finance & Accounting
  { id: 'dept-fad-ctrl', divisionId: 'div-fad', code: 'CTRL', name: 'Controlling' },
  { id: 'dept-fad-fp', divisionId: 'div-fad', code: 'FIN_PRJ', name: 'Finance Project' },
  { id: 'dept-fad-fa', divisionId: 'div-fad', code: 'F&A', name: 'Finance and Accounting' },
  { id: 'dept-fad-tres', divisionId: 'div-fad', code: 'TRES', name: 'Treasury' },

  // 30. General Management
  { id: 'dept-gm-dept', divisionId: 'div-gm', code: 'GM', name: 'General Management' },

  // 31. Human Resources
  { id: 'dept-hrd-cb', divisionId: 'div-hrd', code: 'HR_CB', name: 'HR - Compensation & Benefits' },
  { id: 'dept-hrd-lod', divisionId: 'div-hrd', code: 'HR_LOD', name: 'HR - Learning & Organizational Development' },
  { id: 'dept-hrd-tahrbp', divisionId: 'div-hrd', code: 'HR_TA_HRBP', name: 'HR - Talent Acquisition & HRBP' },

  // 32. Internal Audit & SOP & Risk Management
  { id: 'dept-ia-bm', divisionId: 'div-ia', code: 'BM', name: 'Business Monitoring' },
  { id: 'dept-ia-ianr', divisionId: 'div-ia', code: 'IA_NR', name: 'Internal Audit - Non Retail' },
  { id: 'dept-ia-sop', divisionId: 'div-ia', code: 'SOP', name: 'SOP' },

  // 33. Legal
  { id: 'dept-lgd-mm', divisionId: 'div-lgd', code: 'LEGAL_MM', name: 'Legal - MM' },

  // 34. LP-QA
  { id: 'dept-lpqa-lp', divisionId: 'div-lpqa', code: 'LP', name: 'Loss Prevention' },
  { id: 'dept-lpqa-qa', divisionId: 'div-lpqa', code: 'QA', name: 'Quality Assurance' },

  // 35. Marketing
  { id: 'dept-mkt-ce', divisionId: 'div-mkt', code: 'MKT_CE', name: 'MKT - Communication & Event' },

  // 36. Merchandise
  { id: 'dept-omd-b2b', divisionId: 'div-omd', code: 'MCH_B2B', name: 'Merchandise - B2B Development' },
  { id: 'dept-omd-df', divisionId: 'div-omd', code: 'MCH_DF', name: 'Merchandise - Dry Food' },
  { id: 'dept-omd-nfif', divisionId: 'div-omd', code: 'MCH_NFIF', name: 'Merchandise - NFIF & Salted Grocery' },
  { id: 'dept-omd-nfpl', divisionId: 'div-omd', code: 'MCH_NFPL', name: 'Merchandise - Non Food & Private Label' },
  { id: 'dept-omd-ppf', divisionId: 'div-omd', code: 'MCH_PPF', name: 'Merchandise - Processed Fresh Food' },
  { id: 'dept-omd-srd', divisionId: 'div-omd', code: 'MCH_SRD', name: 'Merchandise - Space, Range & Display' },
  { id: 'dept-omd-uf', divisionId: 'div-omd', code: 'MCH_UF', name: 'Merchandise - Ultra Fresh' },

  // 37. MIS
  { id: 'dept-mis-dept', divisionId: 'div-mis', code: 'MIS', name: 'MIS' },

  // 38. Operations
  { id: 'dept-opt-lease', divisionId: 'div-opt', code: 'LEASING', name: 'Leasing' },
  { id: 'dept-opt-cm', divisionId: 'div-opt', code: 'OPS_CM', name: 'Operations - Construction & Maintenance' },
  { id: 'dept-opt-dnsc', divisionId: 'div-opt', code: 'OPS_DNSC', name: 'Operations - Da Nang SC' },
  { id: 'dept-opt-gt', divisionId: 'div-opt', code: 'OPS_GT', name: 'Operations - Gia Tot' },
  { id: 'dept-opt-sm', divisionId: 'div-opt', code: 'OPS_SM', name: 'Operations - Store Management' },

  // 39. Property
  { id: 'dept-prop-dept', divisionId: 'div-prop', code: 'PROPERTY', name: 'Property' },

  // 40. ST41
  { id: 'dept-st41-deliv', divisionId: 'div-st41', code: 'DELIV_ST', name: 'Delivery_ST' },

  // 41. Supply Chain
  { id: 'dept-scm-dept', divisionId: 'div-scm', code: 'SUPPLY_CHAIN', name: 'Supply Chain' },

  // 42. Trade Union
  { id: 'dept-tu-dept', divisionId: 'div-tu', code: 'TRADE_UNION', name: 'Trade Union' },
];

// ---------------------------------------------------------------------------
// 24 OFFICIAL SUB-DEPARTMENTS (MAPPED TO DEPARTMENTS)
// ---------------------------------------------------------------------------

export const subDepartments = [
  // 1. BSM Operations 2 -> BSM Operations
  { id: 'sub-bsm-ops2', departmentId: 'dept-bsm-ops', code: 'SUB-BSM-OPS2', name: 'BSM Operations 2' },

  // 2. Commercial Controlling -> Controlling
  { id: 'sub-fad-ctrl-com', departmentId: 'dept-fad-ctrl', code: 'SUB-CTRL-COM', name: 'Commercial Controlling' },

  // 3. Corporate Development - Public Affairs -> Corporate Development
  { id: 'sub-cdd-pa', departmentId: 'dept-cdd-dept', code: 'SUB-CDD-PA', name: 'Corporate Development - Public Affairs' },

  // 4 & 5. Decoration & Front Office -> Customer Service_ST (across store divs)
  { id: 'sub-cs-deco-1016', departmentId: 'dept-1016-cs', code: 'SUB-DECO', name: 'Decoration' },
  { id: 'sub-cs-deco-dnsc', departmentId: 'dept-dnsc-cs', code: 'SUB-DECO', name: 'Decoration' },
  { id: 'sub-cs-fo-1010', departmentId: 'dept-1010-cs', code: 'SUB-FO', name: 'Front Office' },
  { id: 'sub-cs-fo-1013', departmentId: 'dept-1013-cs', code: 'SUB-FO', name: 'Front Office' },

  // 6. Cosmetics & Household & HBA -> Dry Food_ST & Non Food_ST
  { id: 'sub-df-chh-1010', departmentId: 'dept-1010-df', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-df-chh-1011', departmentId: 'dept-1011-df', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-df-chh-1013', departmentId: 'dept-1013-df', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-df-chh-1015', departmentId: 'dept-1015-df', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-df-chh-1016', departmentId: 'dept-1016-df', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-df-chh-1026', departmentId: 'dept-1026-df', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-df-chh-dnsc', departmentId: 'dept-dnsc-df', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-nf-chh-1012', departmentId: 'dept-1012-nf', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-nf-chh-1017', departmentId: 'dept-1017-nf', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-nf-chh-1018', departmentId: 'dept-1018-nf', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-nf-chh-1019', departmentId: 'dept-1019-nf', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-nf-chh-1020', departmentId: 'dept-1020-nf', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },
  { id: 'sub-nf-chh-1022', departmentId: 'dept-1022-nf', code: 'SUB-CHH', name: 'Cosmetics & Household & HBA' },

  // 7. General Accounting & Credit Sales -> Finance and Accounting
  { id: 'sub-fad-fa-gacs', departmentId: 'dept-fad-fa', code: 'SUB-FA-GACS', name: 'General Accounting & Credit Sales' },

  // 8. Bakery -> Fresh Food_ST
  { id: 'sub-ff-bakery-1010', departmentId: 'dept-1010-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1011', departmentId: 'dept-1011-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1012', departmentId: 'dept-1012-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1013', departmentId: 'dept-1013-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1014', departmentId: 'dept-1014-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1015', departmentId: 'dept-1015-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1016', departmentId: 'dept-1016-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1017', departmentId: 'dept-1017-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1018', departmentId: 'dept-1018-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1022', departmentId: 'dept-1022-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1024', departmentId: 'dept-1024-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1025', departmentId: 'dept-1025-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1027', departmentId: 'dept-1027-ff', code: 'SUB-BAKERY', name: 'Bakery' },
  { id: 'sub-ff-bakery-1028', departmentId: 'dept-1028-ff', code: 'SUB-BAKERY', name: 'Bakery' },

  // 9. SF National Learning -> HR - Learning & Organizational Development
  { id: 'sub-hrd-sfnl', departmentId: 'dept-hrd-lod', code: 'SUB-SF-NL', name: 'SF National Learning' },

  // 10 & 11. HR - HRBP HO & HR - Talent Acquisition -> HR - Talent Acquisition & HRBP
  { id: 'sub-hrd-hrbpho', departmentId: 'dept-hrd-tahrbp', code: 'SUB-HRBP-HO', name: 'HR - HRBP HO' },
  { id: 'sub-hrd-ta', departmentId: 'dept-hrd-tahrbp', code: 'SUB-HR-TA', name: 'HR - Talent Acquisition' },

  // 12. Sweet & Confectionery -> Merchandise - Dry Food
  { id: 'sub-omd-df-sc', departmentId: 'dept-omd-df', code: 'SUB-DF-SC', name: 'Sweet & Confectionery' },

  // 13. Grocery_  Edible: Oil, Rice, Sugar, Pasta, Noodle, Canned Goods -> Merchandise - NFIF & Salted Grocery
  { id: 'sub-omd-nfif-groc', departmentId: 'dept-omd-nfif', code: 'SUB-NFIF-GROC', name: 'Grocery_  Edible: Oil, Rice, Sugar, Pasta, Noodle, Canned Goods' },

  // 14 & 15. Houseware, Softlines & Stationery , Hardlines, Recreation, Home Décor & DIY -> Merchandise - Non Food & Private Label
  { id: 'sub-omd-nfpl-hs', departmentId: 'dept-omd-nfpl', code: 'SUB-NFPL-HS', name: 'Houseware, Softlines' },
  { id: 'sub-omd-nfpl-shrd', departmentId: 'dept-omd-nfpl', code: 'SUB-NFPL-SHRD', name: 'Stationery , Hardlines, Recreation, Home Décor & DIY' },

  // 16. Perishable -> Merchandise - Processed Fresh Food
  { id: 'sub-omd-ppf-perish', departmentId: 'dept-omd-ppf', code: 'SUB-PPF-PERISH', name: 'Perishable' },

  // 17. Layout & Planogram -> Merchandise - Space, Range & Display
  { id: 'sub-omd-srd-lp', departmentId: 'dept-omd-srd', code: 'SUB-SRD-LP', name: 'Layout & Planogram' },

  // 18. Butchery -> Merchandise - Ultra Fresh
  { id: 'sub-omd-uf-butch', departmentId: 'dept-omd-uf', code: 'SUB-UF-BUTCH', name: 'Butchery' },

  // 19, 20, 21. Regional Operations (Center), (North), (South) -> Operations - Store Management
  { id: 'sub-opt-sm-center', departmentId: 'dept-opt-sm', code: 'SUB-OPS-CTR', name: 'Regional Operations (Center)' },
  { id: 'sub-opt-sm-north', departmentId: 'dept-opt-sm', code: 'SUB-OPS-NOR', name: 'Regional Operations (North)' },
  { id: 'sub-opt-sm-south', departmentId: 'dept-opt-sm', code: 'SUB-OPS-SOU', name: 'Regional Operations (South)' },

  // 22 & 23. Delivery & Goods Receiving -> Operations Support_ST
  { id: 'sub-os-deliv-1014', departmentId: 'dept-1014-os', code: 'SUB-DELIV', name: 'Delivery' },
  { id: 'sub-os-deliv-1019', departmentId: 'dept-1019-os', code: 'SUB-DELIV', name: 'Delivery' },
  { id: 'sub-os-deliv-1022', departmentId: 'dept-1022-os', code: 'SUB-DELIV', name: 'Delivery' },
  { id: 'sub-os-gr-2090', departmentId: 'dept-2090-os', code: 'SUB-GR', name: 'Goods Receiving' },

  // 24. Logistics & Warehouse -> Supply Chain
  { id: 'sub-scm-lw', departmentId: 'dept-scm-dept', code: 'SUB-SCM-LW', name: 'Logistics & Warehouse' },
];

// ---------------------------------------------------------------------------
// 7-Level Job Grade Framework (INVERTED scale: Level 7 lowest -> Level 1 highest)
// ---------------------------------------------------------------------------

export const LEVEL_HR_META = {
  '1': {
    code: 'L1_DIRECTOR',
    authority: 'SUPREME_EXECUTIVE',
    typicalRoles: ['sysadmin'],
    descVi: 'Director / Senior Leadership: sets group strategy, manages risk and drives overall development direction.',
    headcount: 2,
  },
  '2': {
    code: 'L2_HEAD',
    authority: 'DIVISION_LEAD',
    typicalRoles: ['hrbp', 'useradmin'],
    descVi: 'Associate Director / Head of Department or Division: owns the P&L, budget and succession talent planning for the division/department.',
    headcount: 4,
  },
  '3': {
    code: 'L3_SENIOR_MANAGER',
    authority: 'SENIOR_MANAGER',
    typicalRoles: ['trainer'],
    descVi: 'Senior Manager: runs a major functional area, negotiates with strategic partners and leads advanced training.',
    headcount: 8,
  },
  '4': {
    code: 'L4_MANAGER',
    authority: 'SECTION_MANAGER',
    typicalRoles: ['manager'],
    descVi: 'Manager: coordinates targets, directly manages the department team and monitors performance.',
    headcount: 14,
  },
  '5': {
    code: 'L5_SUPERVISOR',
    authority: 'SUPERVISOR',
    typicalRoles: ['manager', 'learner'],
    descVi: 'Supervisor / Senior Executive: controls business processes, holds deep technical expertise and coaches staff.',
    headcount: 22,
  },
  '6': {
    code: 'L6_EXECUTIVE',
    authority: 'SENIOR_STAFF',
    typicalRoles: ['learner'],
    descVi: 'Executive / Operations Specialist: executes work independently, coordinates across departments and coaches new staff.',
    headcount: 35,
  },
  '7': {
    code: 'L7_STAFF',
    authority: 'FRONTLINE',
    typicalRoles: ['learner'],
    descVi: 'Staff: new joiners / front-line employees who complete onboarding, follow the rules and serve customers.',
    headcount: 42,
  },
};

export const jobLevels = LEVEL_DEFINITIONS.map((def) => ({
  ...def,
  ...(LEVEL_HR_META[def.level] || {}),
  viTitle: def.titleVi,
  title: def.titleEn,
  code: def.code || LEVEL_HR_META[def.level]?.code,
  colors: def.colors || {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#CBD5E1',
  },
}));

// Helper Functions
export function getDivisionsForBu(buId = 'bu-mmvn') {
  return divisions.filter((d) => !d.businessUnitId || d.businessUnitId === buId);
}

export function getDepartmentsForDivision(divisionId) {
  return departments.filter((d) => d.divisionId === divisionId);
}

export function getSubDepartmentsForDepartment(departmentId) {
  return subDepartments.filter((s) => s.departmentId === departmentId);
}

export function getFullOrgChainForUser(subDeptId) {
  const sub = subDepartments.find((s) => s.id === subDeptId);
  if (!sub) return null;
  const dept = departments.find((d) => d.id === sub.departmentId);
  if (!dept) return { sub };
  const div = divisions.find((d) => d.id === dept.divisionId);
  const bu = businessUnits.find((b) => b.id === (div?.businessUnitId || 'bu-mmvn'));
  return { bu, division: div, department: dept, subDepartment: sub };
}

export const meetingRoomsAndLabs = [
  { id: 'lab-ap-fresh', name: 'Fresh Food & Bakery Practical Lab (MM An Phu)', capacity: 25, type: 'LAB', location: 'MM An Phu, Thu Duc City', equipment: ['Industrial baking oven', 'Bread proofing cabinet', 'HACCP stainless steel work table', 'Food thermometer'] },
  { id: 'lab-bp-dry', name: 'FMCG & Dry Grocery Storage Lab (MM Binh Phu)', capacity: 30, type: 'LAB', location: 'MM Binh Phu, District 6, HCMC', equipment: ['Reach truck simulator', 'Standard pallet racking', 'Wireless barcode scanner', 'SOP guidance display'] },
  { id: 'lab-hp-gr', name: 'Goods Receiving & Cold-Chain Lab (MM Hiep Phu)', capacity: 20, type: 'LAB', location: 'MM Hiep Phu, District 12, HCMC', equipment: ['Cold storage temperature sensors', 'Industrial digital scale', 'Inbound goods quality inspection kit'] },
  { id: 'lab-tl-frontline', name: 'Cashier & Customer Service POS Lab (MM Thang Long)', capacity: 35, type: 'LAB', location: 'MM Thang Long, Hanoi', equipment: ['Live POS checkout counter', 'Receipt printer & card payment POS', 'Internal two-way radios', 'CSAT standards board'] },
  { id: 'room-ho-auditorium', name: 'Grand Auditorium & Training Hall (Head Office)', capacity: 100, type: 'AUDITORIUM', location: 'Head Office, An Phu', equipment: ['4K projector & 200-inch LED screen', 'Wireless auditorium sound system', 'Speaker podium & interpreter booth'] },
  { id: 'room-ho-innovation', name: 'Digital Innovation & E-Learning Lab (Head Office)', capacity: 40, type: 'LAB', location: 'Head Office, An Phu', equipment: ['30 dedicated learning tablets', '85-inch interactive touchscreen', 'Fire drill VR headset'] },
];

export const competencyFramework = [
  { id: 'comp-fsh', code: 'FSH', name: 'Food Safety & HACCP Hygiene Standards', domain: 'Operations & Quality' },
  { id: 'comp-pos', code: 'POS', name: 'Cashier POS & Payment Systems Operation', domain: 'Frontline & Customer Experience' },
  { id: 'comp-inv', code: 'INV', name: 'Inventory Management & Cold-Chain Storage', domain: 'Supply Chain & Logistics' },
  { id: 'comp-mgt', code: 'MGT', name: 'Retail Store Leadership & P&L Management', domain: 'Leadership & Strategy' },
  { id: 'comp-cs', code: 'CS', name: 'Customer Service Excellence & Conflict Resolution', domain: 'Customer Service' },
];

export const trainersDirectory = [
  { id: 'tr-01', userId: 'USR-9003', name: 'Nguyen Van Hung', domain: 'Food Safety & Bakery', role: 'Master Trainer' },
  { id: 'tr-02', userId: null, name: 'Vu Duc Thanh', domain: 'HSE & Workplace Safety', role: 'Safety Instructor' },
  { id: 'tr-03', userId: 'USR-9006', name: 'Tran Minh Quang', domain: 'Store Management & P&L', role: 'SGM Mentor' },
  { id: 'tr-04', userId: 'USR-0001', name: 'Sarah Nguyen', domain: 'Leadership & Talent Pipeline', role: 'Faculty Lead' },
];

export function trainerUserIdFor(trainerId) {
  const t = trainersDirectory.find((tr) => tr.id === trainerId);
  return t ? t.userId : null;
}
