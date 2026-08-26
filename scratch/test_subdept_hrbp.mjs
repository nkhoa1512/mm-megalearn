import { subDepartments, departments } from '../src/data/orgHierarchy.js';
import { generated100Users } from '../src/data/generated100Data.js';
import { demoUsers } from '../src/data/mockData.js';

console.log('--- TEST 1: SUB-DEPARTMENTS COVERAGE ---');
console.log(`Total Departments: ${departments.length}`);
console.log(`Total Sub-Departments: ${subDepartments.length}`);

const missingDepts = departments.filter(d => !subDepartments.some(s => s.departmentId === d.id));
if (missingDepts.length > 0) {
  console.warn(`Departments without sub-departments (${missingDepts.length}):`, missingDepts.map(d => `${d.id} (${d.code})`));
} else {
  console.log('✅ 100% of Departments have at least one Sub-Department!');
}

console.log('\n--- TEST 2: USER ASSIGNMENT TO SUB-DEPARTMENTS ---');
console.log(`Total Generated Users: ${generated100Users.length}`);
const usersWithSubDept = generated100Users.filter(u => u.subDepartmentId && u.subDepartmentName);
console.log(`Users with assigned Sub-Department: ${usersWithSubDept.length} / ${generated100Users.length}`);

console.log('\n--- TEST 3: ANCHOR PERSONAS ---');
demoUsers.forEach(u => {
  console.log(`  - ${u.fullName} (${u.role}): Dept=${u.departmentCode}, SubDept=${u.subDepartmentCode} (${u.subDepartmentName})`);
});

console.log('\n--- ALL SUB-DEPARTMENT & HRBP TESTS COMPLETED ---');
