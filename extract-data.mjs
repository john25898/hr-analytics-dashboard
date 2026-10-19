import { read, utils } from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync('data/UJTP-HRH-Master-DATABASE-2025-EM-430b41.xlsx');
const workbook = read(fileBuffer, { cellDates: true });

// Get the "All" sheet with all employee data
const allSheet = workbook.Sheets['All'];
const allData = utils.sheet_to_json(allSheet);

// Get county-specific sheets
const counties = ['Embu', 'Meru', 'Nyandarua', 'Tharaka Nithi'];
const countyData = {};

counties.forEach(county => {
  if (workbook.Sheets[county]) {
    countyData[county] = utils.sheet_to_json(workbook.Sheets[county]);
  }
});

// Get Layworkers data
const layworkersData = utils.sheet_to_json(workbook.Sheets['Layworkers']);

// Create output directory
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// Save all data
const combinedData = {
  all: allData,
  counties: countyData,
  layworkers: layworkersData,
  summary: {
    totalEmployees: allData.length,
    totalLayworkers: layworkersData.length,
    counties: Object.keys(countyData).reduce((acc, county) => {
      acc[county] = countyData[county].length;
      return acc;
    }, {})
  }
};

fs.writeFileSync('public/employees-data.json', JSON.stringify(combinedData, null, 2));

console.log('✓ Data extracted successfully');
console.log(`  Total employees: ${allData.length}`);
console.log(`  Layworkers: ${layworkersData.length}`);
console.log('  County breakdown:', combinedData.summary.counties);
console.log('\nAll sheet columns:', Object.keys(allData[0] || {}).slice(0, 10));
console.log('Sample record:', JSON.stringify(allData[0], null, 2));
