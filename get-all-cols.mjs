import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allSheet = workbook.Sheets['All'];
const range = utils.decode_range(allSheet['!ref']);

console.log('All columns available:');
for (let col = 0; col <= range.e.c; col++) {
  const cellRef = utils.encode_cell({ r: 1, c: col });
  const cell = allSheet[cellRef];
  const header = cell ? cell.v : '';
  if (header) {
    console.log(`${col}: ${header}`);
  }
}
