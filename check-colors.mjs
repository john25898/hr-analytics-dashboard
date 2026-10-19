import { read } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allSheet = workbook.Sheets['All'];
const range = read(fileBuffer).Sheets['All']['!ref'];

console.log('Checking for colored cells (red background = left employees)...\n');

let redCellsFound = 0;
let totalCells = 0;

// Check for cell formatting/colors
for (const cellRef in allSheet) {
  if (cellRef.startsWith('!')) continue;
  const cell = allSheet[cellRef];
  
  if (cell.s) {
    totalCells++;
    // Check fill color
    if (cell.s.fill) {
      console.log(`${cellRef}: Fill color = ${JSON.stringify(cell.s.fill)}`);
      // Red color in Excel is typically RGB FF0000 or similar
      if (cell.s.fill.fgColor || cell.s.fill.bgColor) {
        const color = cell.s.fill.fgColor?.rgb || cell.s.fill.bgColor?.rgb || '';
        if (color.includes('FF0000') || color.includes('FF') || color === 'FFFF0000') {
          redCellsFound++;
          console.log(`  ✓ RED CELL FOUND at ${cellRef}`);
        }
      }
    }
  }
}

console.log(`\nTotal cells with styling: ${totalCells}`);
console.log(`Red cells found: ${redCellsFound}`);

// Also check raw values to see if there's a status column
const data = read(fileBuffer, { cellDates: true });
const sheet = data.Sheets['All'];
const allData = data.utils.sheet_to_json(sheet);

console.log('\nLooking for "status" or "left" related columns...');
if (allData.length > 0) {
  const keys = Object.keys(allData[0]);
  keys.forEach((key, i) => {
    if (key.toLowerCase().includes('status') || key.toLowerCase().includes('left') || key.toLowerCase().includes('active')) {
      console.log(`Found: Column ${i} - ${key}`);
      // Show unique values
      const unique = new Set(allData.map(r => r[key]));
      Array.from(unique).slice(0, 5).forEach(v => console.log(`  - ${v}`));
    }
  });
}
