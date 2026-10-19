import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

// Check Embu sheet with different parsing
const embuSheet = workbook.Sheets['Embu'];
const allData = utils.sheet_to_json(embuSheet);
console.log('Embu raw data length:', allData.length);
console.log('Embu first 2 rows:');
console.log(JSON.stringify(allData.slice(0, 2), null, 2));

// Check if we need to look at raw values
const meru = utils.sheet_to_json(workbook.Sheets['Meru']);
console.log('\nMeru sample:');
console.log('County value in Meru:', meru[0]?.['COUNTY']);

// Get all unique values from the actual data
const counties = new Set();
Object.values(workbook.Sheets).forEach((sheet, idx) => {
  try {
    const data = utils.sheet_to_json(sheet);
    data.forEach(row => {
      if (row['COUNTY']) {
        counties.add(row['COUNTY']?.toString().trim());
      }
    });
  } catch (e) {
    // ignore
  }
});

console.log('\nAll unique counties from data:', Array.from(counties).sort());
