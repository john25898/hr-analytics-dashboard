import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

console.log('Checking Sheet2:');
const sheet2Data = utils.sheet_to_json(workbook.Sheets['Sheet2']);
console.log('Records:', sheet2Data.length);
if (sheet2Data.length > 0) {
  console.log(JSON.stringify(sheet2Data, null, 2));
}

console.log('\n\nChecking Summary sheet:');
const summaryData = utils.sheet_to_json(workbook.Sheets['Summary']);
console.log('Records:', summaryData.length);
summaryData.slice(0, 5).forEach((row, i) => {
  console.log('Row', i, ':', Object.values(row).slice(0, 3).join(' | '));
});
