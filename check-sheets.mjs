import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

console.log('All sheet names:', workbook.SheetNames);

// Check each sheet for data
console.log('\nSheet summary:');
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = utils.sheet_to_json(sheet);
  console.log(sheetName + ': ' + data.length + ' records');
});

// Check if there's a "Left" sheet
const leftSheets = workbook.SheetNames.filter(s => s.toLowerCase().includes('left'));
console.log('\n\nSheets containing "left":', leftSheets);

if (leftSheets.length > 0) {
  leftSheets.forEach(name => {
    const data = utils.sheet_to_json(workbook.Sheets[name]);
    console.log('\nSheet: ' + name + ' (' + data.length + ' records)');
    if (data.length > 0) {
      console.log('First employee:', Object.values(data[0]).slice(0, 3));
    }
  });
}
