import { read } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allSheet = workbook.Sheets['All'];

// Get ALL headers from row 2
console.log('All columns:');
let colNum = 0;
for (let c = 0; c < 50; c++) {
  let col = '';
  if (c < 26) {
    col = String.fromCharCode(65 + c);
  } else if (c < 52) {
    col = 'A' + String.fromCharCode(65 + (c - 26));
  } else {
    col = 'B' + String.fromCharCode(65 + (c - 52));
  }
  
  const cell = allSheet[col + '2'];
  if (cell && cell.v) {
    console.log(`${col}: ${cell.v}`);
  }
}

// Check for red-colored cells - scan multiple rows
console.log('\n\nScanning for RED background cells...');
let redFound = false;
for (let r = 3; r < 50; r++) {
  for (let c = 0; c < 25; c++) {
    let col = '';
    if (c < 26) {
      col = String.fromCharCode(65 + c);
    } else {
      col = 'A' + String.fromCharCode(65 + (c - 26));
    }
    
    const cellRef = col + r;
    const cell = allSheet[cellRef];
    if (cell && cell.s && cell.s.fill) {
      const fill = cell.s.fill;
      console.log(`RED at ${cellRef}:`, {
        value: cell.v,
        fill: fill,
      });
      redFound = true;
    }
  }
}

if (!redFound) {
  console.log('No red-colored cells found in styling.');
}

// Check if there's a "left" status column
console.log('\n\nLooking for status column...');
for (let c = 0; c < 30; c++) {
  let col = '';
  if (c < 26) {
    col = String.fromCharCode(65 + c);
  } else {
    col = 'A' + String.fromCharCode(65 + (c - 26));
  }
  
  const headerCell = allSheet[col + '2'];
  if (headerCell && headerCell.v) {
    const header = headerCell.v.toString().toUpperCase();
    if (header.includes('LEFT') || header.includes('STATUS') || header.includes('ACTIVE')) {
      console.log(`Found ${header} at column ${col}`);
      // Show values from this column
      for (let r = 3; r < 10; r++) {
        const cell = allSheet[col + r];
        if (cell && cell.v) {
          console.log(`  Row ${r}: ${cell.v}`);
        }
      }
    }
  }
}
