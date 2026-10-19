import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allSheet = workbook.Sheets['All'];
const allData = utils.sheet_to_json(allSheet);

console.log('Looking for status/active/left related data...\n');

if (allData.length > 0) {
  const keys = Object.keys(allData[0]);
  console.log(`Total columns: ${keys.length}\n`);
  
  // Find status columns
  const statusColumns = keys.filter(k => 
    k.toLowerCase().includes('status') || 
    k.toLowerCase().includes('left') || 
    k.toLowerCase().includes('active') ||
    k.toLowerCase().includes('employ')
  );
  
  console.log('Status-related columns:');
  statusColumns.forEach(col => {
    console.log(`\n${col}:`);
    const unique = new Set();
    allData.forEach(row => {
      if (row[col]) unique.add(row[col].toString().trim());
    });
    Array.from(unique).slice(0, 8).forEach(v => console.log(`  - ${v}`));
  });

  // Show all column names
  console.log('\n\nAll columns:');
  keys.slice(0, 25).forEach((k, i) => {
    console.log(`${i}: ${k}`);
  });
}
