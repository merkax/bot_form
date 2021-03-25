const XLSX = require('xlsx');
const fs = require('fs');

const filePath = `${__dirname}/public/sites.xlsx`
const workBook = XLSX.readFileSync(filePath)
const sheetName = workBook.SheetNames

const worksheets = {}

const readSitesFromExcel = () => {
  const sites = []

  worksheets[sheetName] = XLSX.utils.sheet_to_json(workBook.Sheets[sheetName])

  worksheets[sheetName].forEach((cell) => { 
    sites.push(cell['sites'])
  });

  return sites
}

function writeInExcel(urlFromFile, data) { 

  worksheets[sheetName].forEach((cell) => {
    if (cell['sites'] === urlFromFile) {
      cell['status'] = data
    }
  })

  XLSX.utils.sheet_add_json(workBook.Sheets[sheetName], worksheets[sheetName])
  XLSX.writeFile(workBook, filePath);
}

module.exports = { readSitesFromExcel, writeInExcel };
