import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

console.log('Sheet names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = utils.sheet_to_json(sheet);
  console.log(`\n=== ${sheetName} ===`);
  console.log(`Rows: ${data.length}`);
  if (data.length > 0) {
    console.log('Headers:', Object.keys(data[0]));
    console.log('First 3 rows:');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  }
});
