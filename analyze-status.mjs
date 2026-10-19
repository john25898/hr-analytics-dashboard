import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allSheet = workbook.Sheets['All'];

// Manually parse to get proper values
console.log('Status column (V) values from first 20 rows:');
for (let r = 3; r < 23; r++) {
  const nameCell = allSheet['B' + r];
  const statusCell = allSheet['V' + r];
  const name = nameCell ? nameCell.v : 'N/A';
  const status = statusCell ? statusCell.v : 'N/A';
  console.log(`Row ${r}: ${name} -> Status: ${status}`);
}

// Use JSON parsing which might handle it better
console.log('\n\nUsing JSON parser:');
const data = utils.sheet_to_json(allSheet);
console.log(`Total records: ${data.length}`);

// Look at status values
const statusValues = new Set();
const leftEmployees = [];

data.forEach((row, idx) => {
  const status = row.status;
  if (status) {
    statusValues.add(status.toString());
    // Check if it looks like they left (status might contain specific text)
    if (typeof status === 'string' && (
      status.toLowerCase().includes('left') || 
      status.toLowerCase().includes('terminated') ||
      status.toLowerCase().includes('resign')
    )) {
      leftEmployees.push({ name: row['EMPLOYEE NAME'], status });
    }
  }
});

console.log('\nUnique status values:');
Array.from(statusValues).slice(0, 15).forEach(v => {
  console.log(`  - ${v}`);
});

console.log(`\n\nEmployees marked as "left": ${leftEmployees.length}`);
leftEmployees.slice(0, 10).forEach(emp => {
  console.log(`  ${emp.name}: ${emp.status}`);
});
