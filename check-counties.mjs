import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allSheet = workbook.Sheets['All'];
const allData = utils.sheet_to_json(allSheet);

// Get unique counties
const counties = new Set();
const countyData = {};

allData.forEach(row => {
  const colNames = Object.keys(row);
  let county = null;
  
  // Try different column variations
  for (const col of colNames) {
    if (col.toLowerCase().includes('county')) {
      const val = row[col];
      if (val && val.toString().trim()) {
        county = val.toString().trim();
        break;
      }
    }
  }
  
  if (county) {
    counties.add(county);
    if (!countyData[county]) countyData[county] = 0;
    countyData[county]++;
  }
});

console.log('Unique counties found:', Array.from(counties).sort());
console.log('\nCounty breakdown:');
Object.entries(countyData).sort((a, b) => b[1] - a[1]).forEach(([county, count]) => {
  console.log(`  "${county}": ${count} employees`);
});

// Show sample columns to identify county column
console.log('\nSample row columns:');
if (allData.length > 0) {
  console.log(Object.keys(allData[0]).filter(k => !k.includes('undefined')).slice(0, 15));
}
