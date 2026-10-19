import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

const allData = utils.sheet_to_json(workbook.Sheets['All']);
const summaryData = utils.sheet_to_json(workbook.Sheets['Summary']);

const allNames = new Set(allData.map((r: any) => r['EMPLOYEE NAME']?.toString().trim()));
const summaryNames = new Set(summaryData.map((r: any) => r.col2?.toString().trim())); // Second column seems to be names

console.log('Total in All sheet:', allNames.size);
console.log('Total in Summary sheet:', summaryNames.size);

// Find names in Summary but not in All (these might be left employees)
const leftInSummary = Array.from(summaryNames).filter(name => !allNames.has(name));
console.log('\n\nEmployees in Summary but NOT in All (' + leftInSummary.length + '):');
leftInSummary.slice(0, 20).forEach(name => console.log(' - ' + name));

// Also check the Program sheet
const programData = utils.sheet_to_json(workbook.Sheets['Program ']);
const programNames = new Set(programData.map((r: any) => r['Staff Names']?.toString().trim() || Object.values(r)[0]?.toString().trim()));

console.log('\n\nProgram sheet employees:', programNames.size);
const leftInProgram = Array.from(programNames).filter(name => !allNames.has(name) && name);
console.log('In Program but NOT in All (' + leftInProgram.length + '):');
leftInProgram.slice(0, 15).forEach(name => console.log(' - ' + name));
