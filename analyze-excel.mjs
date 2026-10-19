import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allSheet = workbook.Sheets['All'];
const allData = utils.sheet_to_json(allSheet);

console.log('Total columns:', allData.length > 0 ? Object.keys(allData[0]).length : 0);
console.log('\nAll column names:');
if (allData.length > 0) {
  Object.keys(allData[0]).forEach((col, idx) => {
    if (!col.includes('__EMPTY')) {
      console.log(`${idx}: ${col}`);
    }
  });
}

console.log('\n\nSample data from first employee:');
if (allData.length > 0) {
  const sample = allData[0];
  Object.entries(sample).forEach(([k, v]) => {
    if (!k.includes('__EMPTY') && v) {
      console.log(`${k}: ${v}`);
    }
  });
}

// Get unique values for categorical columns
const categorical = ['DESIGNATION', 'CATEGORY', 'DEPARTMENT', 'STATION', 'SALARY GRADE', 'REGULATORY BODY'];
console.log('\n\nCategorical data analysis:');
categorical.forEach(col => {
  const unique = new Set();
  allData.forEach(row => {
    if (row[col]) unique.add(row[col].toString().trim());
  });
  if (unique.size > 0) {
    console.log(`\n${col} (${unique.size} unique):`);
    Array.from(unique).slice(0, 10).forEach(v => console.log(`  - ${v}`));
    if (unique.size > 10) console.log(`  ... and ${unique.size - 10} more`);
  }
});
