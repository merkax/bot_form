const XLSX = require('xlsx');
const fs = require('fs');

const filePath = `${__dirname}/public/sites.xlsx`
const workBook = XLSX.readFileSync(filePath)
const sheetName = workBook.SheetNames

export const linksOnSites = () => {
  const worksheets = {}
  const sites = []

  worksheets[sheetName] = XLSX.utils.sheet_to_json(workBook.Sheets[sheetName])

  worksheets[sheetName].forEach((cell) => { 
    sites.push(cell['sites'])
  });

  return sites
}

// console.log(linksOnSites());
