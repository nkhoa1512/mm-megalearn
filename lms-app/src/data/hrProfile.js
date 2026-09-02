// ===========================================================================
// HR profile — the fields that must be present when exporting the file for
// Accounting / Audit:
//
//   Employee Status · Personnel Number · Cost center · Full Name · Entry Date ·
//   Gender · Date of birth · Business Email Address · Position · Level ·
//   HO/Store · Division · Department · Sub Department · Location
//
// Organizational data (Division / Department / Sub Department / Position / Level /
// Email) already present on the user record. The remaining attributes are
// DERIVED BY DETERMINISTIC RULES from the employee code — never random — so that every
// produce the same result and this month's export matches last month's export.
//
//   • Personnel Number = the numeric part of employeeCode, zero-padded to 8 characters.
//   • Cost center      = the Division's 5-digit code (orgHierarchy.divisions.costCenter).
//   • Entry Date       = HR_REFERENCE_DATE minus yearsOfService.
//   • Gender           = parity of the Personnel Number (Male / Female).
//   • Date of birth    = joining year minus hiring age (22–35, derived from the employee code).
//   • HO/Store         = OPERATIONS -> "Store", SUPPORTING -> "HO".
//   • Location         = the Division's location.
//
// withHrProfile() only ADDS missing fields; it never overwrites declared values
// declared by hand — so the 6 demo personas keep their original profiles.
// ===========================================================================

import { divisions } from './orgHierarchy';

/** Seniority reference date. Fixed so Entry Date does not drift with the build date. */
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

/** Numeric part of the employee code: 'MMVN-1042' | 'USR-1042' -> 1042. */
function employeeSeed(user) {
  const digits = String(user.employeeCode || user.userId || '').replace(/[^0-9]/g, '');
  return Number(digits) || 0;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/** The employee's Division: prefer the id, otherwise look it up by code or name. */
export function divisionOf(user) {
  if (!user) return null;
  return (
    divisionById.get(user.divisionId) ||
    divisionByCode.get(user.divisionCode) ||
    divisions.find((d) => d.name === user.divisionName || d.name === user.divisionCode) ||
    null
  );
}

/** The 5-digit cost center code that carries this employee's training cost. */
export function costCenterCodeOf(user) {
  if (user?.costCenterCode) return user.costCenterCode;
  return divisionOf(user)?.costCenter || null;
}

/** Employee status label using the exact vocabulary of the HR file. */
export function employeeStatusLabel(status) {
  return EMPLOYEE_STATUS_LABEL[status] || status || 'Active';
}

/**
 * Fills in the HR profile fields missing from a user record.
 * Pure function; it does not mutate its input.
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
    gender: user.gender || (seed % 2 === 0 ? 'Nam' : 'Female'),
    dateOfBirth: user.dateOfBirth || isoDate(dob),
    hoStore: user.hoStore || ((div?.branch || user.branch) === 'OPERATIONS' ? 'Store' : 'HO'),
    location: user.location || div?.location || 'Ho Chi Minh City (Head Office - An Phu)',
  };
}

/** One row of exactly 15 columns for the standard HR file. */
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
