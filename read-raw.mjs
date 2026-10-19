import { read } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allSheet = workbook.Sheets['All'];

// Get actual cell values from first row
console.log('First row (Headers):');
for (let c = 0; c < 30; c++) {
  const cellRef = String.fromCharCode(65 + (c % 26)) + (c >= 26 ? String.fromCharCode(65 + Math.floor(c / 26) - 1) : '1');
  const cell = allSheet[cellRef];
  if (cell) {
    console.log(`  ${cellRef}: ${cell.v}`);
  }
}

// Check for colors in cells - look at second row
console.log('\n\nSecond row cell properties:');
for (let c = 0; c < 15; c++) {
  const col = String.fromCharCode(65 + c);
  const cellRef = col + '2';
  const cell = allSheet[cellRef];
  if (cell) {
    console.log(`${cellRef}:`, {
      value: cell.v,
      style: cell.s,
      fill: cell.s?.fill,
      font: cell.s?.font,
    });
  }
}
