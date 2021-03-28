const puppeteer = require('puppeteer')
const fs = require('fs').promises
const path = require('path').promises

const { readSitesFromExcel, writeInExcel } = require('./work_with_file');
const { searchLinks } = require('./work_with_links');
const { fillInForm, recaptcha } = require('./work_with_form');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 5//,
    // devtools: true
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })
  const urlsFromFile = readSitesFromExcel()

  for ( let i = 0; i < urlsFromFile.length; i++ ) {
    try {
      const urlSite = urlsFromFile[i]
      console.log('Watching the site:', urlSite);

      const viewedLinks = []

      await searchProcess(page, urlSite, viewedLinks)
      console.log('Process on site is closed');
    } catch(err) {
      console.log('Error from main function:', err)
      writeInExcel(urlSite, 'Error from main function')
    }
  }
  // await browser.close()
})();

async function searchProcess(page, url, viewedLinks) {
  await page.goto(url, { waitUntil: 'networkidle2' })

  const formOnPage = await page.$$('form')

  if (formOnPage.length !== 0) { //todo check on correct form
    console.log('I found forms');
    try {
      await fillInForm(page)
      await recaptcha(page)
      //todo check send form?
      writeInExcel(url, 'Form completed and send')
      console.log('After fill in form');
      return true;
    } catch(err) {
      // if (err) throw err
      console.log("Errors when filling form and send: \n", err)
      writeInExcel(url, 'Errors when filling form and send')
      // return false;
    }
  } else {
    const links = await searchLinks(page, url)
    const linksWithoutDouble = Array.from(new Set(links))
    
    console.log("Links from page on which watch now:", linksWithoutDouble);
    
    newLinks = linksWithoutDouble.filter(function (link) {
      return !viewedLinks.includes(link);
    });
    console.log("New links without visits:", newLinks);

    for (const link of newLinks) {
      //todo check link
      console.log("Watching this link now:", link);
      viewedLinks.push(link)

      console.log("Lins visited:", viewedLinks);

      await page.goto(link, { waitUntil: 'networkidle2' })
      await searchProcess(page, link, viewedLinks)
      console.log('return false from links loop \n');
      return false;
      // todo
      // if watched all links and dont find form, then return false in file
    }
  }
}
