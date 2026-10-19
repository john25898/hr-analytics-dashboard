import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

console.log('All sheet names:', workbook.SheetNames);

// Check if there's a dedicated "Left" sheet
if (workbook.Sheets['Left Org']) {
  console.log('\n\nFound "Left Org" sheet!');
  const data = utils.sheet_to_json(workbook.Sheets['Left Org']);
  console.log(`Employees who left: ${data.length}`);
  data.slice(0, 5).forEach(emp => {
    console.log(`  - ${emp.EMPLOYEE NAME || emp['EMPLOYEE NAME'] || emp['Name'] || Object.values(emp)[1]}`);
  });
}

// Check each sheet for data
console.log('\n\nSheet summary:');
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = utils.sheet_to_json(sheet);
  console.log(`${sheetName}: ${data.length} records`);
});

// Check the "All" sheet for any specific "left" indicator
const allSheet = workbook.Sheets['All'];
const allData = utils.sheet_to_json(allSheet);

console.log('\n\nChecking "All" sheet for employees with no dates (might indicate they left):');
const noDateEmployees = allData.filter((emp: any) => !emp['VALID UNTIL']);
console.log(`Employees with no valid date: ${noDateEmployees.length}`);

console.log('\n\nSample - last 5 rows of All sheet:');
allData.slice(-5).forEach((row: any) => {
  console.log(`${row['EMPLOYEE NAME']}: Valid Until = ${row['VALID UNTIL']}, Status = ${row.status}`);
});
