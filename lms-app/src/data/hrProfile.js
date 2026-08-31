// ===========================================================================
// Hồ sơ nhân sự (HR profile) — các trường bắt buộc phải có khi xuất file cho
// Kế toán / Kiểm toán:
//
//   Employee Status · Personnel Number · Cost center · Full Name · Entry Date ·
//   Gender · Date of birth · Business Email Address · Position · Level ·
//   HO/Store · Division · Department · Sub Department · Location
//
// Dữ liệu tổ chức (Division / Department / Sub Department / Position / Level /
// Email) đã có sẵn trên bản ghi người dùng. Những thuộc tính còn thiếu được
// SUY RA BẰNG QUY TẮC TẤT ĐỊNH từ mã nhân viên — không random — để mỗi lần
// build ra cùng một kết quả và file xuất tháng này khớp file xuất tháng trước.
//
//   • Personnel Number = phần số của employeeCode, đệm 0 cho đủ 8 ký tự.
//   • Cost center      = mã 5 số của Division (orgHierarchy.divisions.costCenter).
//   • Entry Date       = HR_REFERENCE_DATE trừ đi yearsOfService.
//   • Gender           = chẵn/lẻ của Personnel Number (Nam / Nữ).
//   • Date of birth    = năm vào làm trừ tuổi tuyển dụng (22–35, suy từ mã NV).
//   • HO/Store         = OPERATIONS -> "Store", SUPPORTING -> "HO".
//   • Location         = địa điểm của Division.
//
// withHrProfile() chỉ BỔ SUNG trường còn thiếu, không ghi đè giá trị đã khai
// báo tay — nhờ vậy 6 persona demo giữ nguyên hồ sơ gốc của họ.
// ===========================================================================

import { divisions } from './orgHierarchy';

/** Mốc tính thâm niên. Cố định để Entry Date không trôi theo ngày chạy build. */
export const HR_REFERENCE_DATE = '2026-01-01';

export const HR_EXPORT_COLUMNS = [
  'Employee Status',
  'Personnel Number',
  'Cost center',
  'Full Name',
  'Entry Date',
  'Gender',
  'Date of birth',
  'Business Email Address',
  'Position',
  'Level',
  'HO/Store',
  'Division',
  'Department',
  'Sub Department',
  'Location',
];

const EMPLOYEE_STATUS_LABEL = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
};

const divisionById = new Map(divisions.map((d) => [d.id, d]));
const divisionByCode = new Map(divisions.map((d) => [d.code, d]));

/** Phần số của mã nhân viên: 'MMVN-1042' | 'USR-1042' -> 1042. */
function employeeSeed(user) {
  const digits = String(user.employeeCode || user.userId || '').replace(/[^0-9]/g, '');
  return Number(digits) || 0;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/** Division của nhân sự: ưu tiên id, không có thì dò theo code hoặc tên. */
export function divisionOf(user) {
  if (!user) return null;
  return (
    divisionById.get(user.divisionId) ||
    divisionByCode.get(user.divisionCode) ||
    divisions.find((d) => d.name === user.divisionName || d.name === user.divisionCode) ||
    null
  );
}

/** Mã Trung Tâm Chi Phí 5 số chịu chi phí đào tạo cho nhân sự này. */
export function costCenterCodeOf(user) {
  if (user?.costCenterCode) return user.costCenterCode;
  return divisionOf(user)?.costCenter || null;
}

/** Nhãn trạng thái nhân sự theo đúng từ vựng của file HR. */
export function employeeStatusLabel(status) {
  return EMPLOYEE_STATUS_LABEL[status] || status || 'Active';
}

/**
 * Bổ sung các trường hồ sơ HR còn thiếu cho một bản ghi người dùng.
 * Thuần hàm, không đột biến tham số đầu vào.
 */
export function withHrProfile(user) {
  if (!user) return user;

  const div = divisionOf(user);
  const seed = employeeSeed(user);
  const ref = new Date(`${HR_REFERENCE_DATE}T00:00:00Z`);

  const years = Number(user.yearsOfService) || 1;
  const entry = new Date(ref.getTime() - Math.round(years * 365.25) * 86400000);

  const hireAge = 22 + (seed % 14);
  const dob = new Date(Date.UTC(
    entry.getUTCFullYear() - hireAge,
    seed % 12,
    (seed % 28) + 1
  ));

  return {
    ...user,
    personnelNumber: user.personnelNumber || String(seed).padStart(8, '0'),
    costCenterCode: user.costCenterCode || div?.costCenter || null,
    costCenterName: user.costCenterName || div?.name || null,
    employeeStatus: user.employeeStatus || employeeStatusLabel(user.status),
    entryDate: user.entryDate || isoDate(entry),
    gender: user.gender || (seed % 2 === 0 ? 'Nam' : 'Nữ'),
    dateOfBirth: user.dateOfBirth || isoDate(dob),
    hoStore: user.hoStore || ((div?.branch || user.branch) === 'OPERATIONS' ? 'Store' : 'HO'),
    location: user.location || div?.location || 'TP. Hồ Chí Minh (Head Office - An Phú)',
  };
}

/** Một dòng đúng 15 cột của file HR chuẩn. */
export function hrExportRow(user) {
  const u = withHrProfile(user);
  return {
    'Employee Status': u.employeeStatus,
    'Personnel Number': u.personnelNumber,
    'Cost center': u.costCenterCode || '',
    'Full Name': u.fullName || '',
    'Entry Date': u.entryDate,
    Gender: u.gender,
    'Date of birth': u.dateOfBirth,
    'Business Email Address': u.email || '',
    Position: u.position || u.title || '',
    Level: u.level || '',
    'HO/Store': u.hoStore,
    Division: u.divisionName || u.divisionCode || '',
    Department: u.departmentName || '',
    'Sub Department': u.subDepartmentName || '',
    Location: u.location,
  };
}
