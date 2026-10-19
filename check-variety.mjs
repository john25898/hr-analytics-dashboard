import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allSheet = workbook.Sheets['All'];
const range = utils.decode_range(allSheet['!ref']);

// Helper to get cell value
const getCell = (r, c) => {
  const cell = allSheet[utils.encode_cell({ r, c })];
  return cell ? cell.v : '';
};

// Get data for several columns
const cols = {
  'QUALIFICATION': 15,
  'REGULATORY BODY': 18,
  'SUB COUNTY': 8,
  'DESIGNATION': 6,
  'EDUCATION LEVEL': 14,
  'status': 21
};

for (const [name, colNum] of Object.entries(cols)) {
  const values = new Set();
  for (let r = 2; r < Math.min(50, range.e.r); r++) {
    const val = getCell(r, colNum);
    if (val && val !== '') {
      values.add(val.toString().trim());
    }
  }
  console.log(`\n${name}:`);
  Array.from(values).slice(0, 12).forEach(v => console.log(`  - ${v}`));
}
