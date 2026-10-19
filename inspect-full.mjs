import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

console.log('=== WORKBOOK OVERVIEW ===');
console.log('Sheet names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = utils.sheet_to_json(sheet);
  
  console.log(`\n📄 ${sheetName}: ${data.length} rows`);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    if (data.length <= 2) {
      console.log('Data:', JSON.stringify(data, null, 2));
    } else {
      console.log('Sample:', JSON.stringify(data[0], null, 2));
    }
  }
});
