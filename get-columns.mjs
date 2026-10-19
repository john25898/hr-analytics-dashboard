import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allSheet = workbook.Sheets['All'];
// Get the range to see actual cell values
const range = utils.decode_range(allSheet['!ref']);

console.log('Sheet range:', allSheet['!ref']);
console.log('\nFirst row (headers):');
for (let col = 0; col <= range.e.c; col++) {
  const cellRef = utils.encode_cell({ r: 0, c: col });
  const cell = allSheet[cellRef];
  console.log(`Col ${col}: ${cell ? cell.v : 'empty'}`);
}

console.log('\n\nSecond row (first data):');
for (let col = 0; col <= 15; col++) {
  const cellRef = utils.encode_cell({ r: 1, c: col });
  const cell = allSheet[cellRef];
  console.log(`Col ${col}: ${cell ? cell.v : 'empty'}`);
}
