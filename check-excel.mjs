import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allSheet = workbook.Sheets['All'];
const data = utils.sheet_to_json(allSheet, { defval: '' });

console.log('Total rows:', data.length);
console.log('Columns:', Object.keys(data[0] || {}));

// Check a few rows
console.log('\nFirst 3 rows (first 5 cols each):');
const cols = Object.keys(data[0] || {}).slice(0, 5);
data.slice(0, 3).forEach((row, i) => {
  console.log(`\nRow ${i + 1}:`);
  cols.forEach(col => {
    console.log(`  ${col}: ${row[col]}`);
  });
});
