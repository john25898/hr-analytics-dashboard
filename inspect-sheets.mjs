import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

console.log('Total sheets:', workbook.SheetNames.length);
console.log('Sheet names:', workbook.SheetNames);

workbook.SheetNames.forEach((sheetName, idx) => {
  const sheet = workbook.Sheets[sheetName];
  const data = utils.sheet_to_json(sheet);
  console.log(`\n[${idx}] ${sheetName}`);
  console.log(`   Rows: ${data.length}`);
  if (data.length > 0) {
    console.log(`   Columns: ${Object.keys(data[0]).length}`);
    const keys = Object.keys(data[0]).slice(0, 5);
    console.log(`   Sample columns: ${keys.join(', ')}`);
  }
});
