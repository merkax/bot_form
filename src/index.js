const puppeteer = require('puppeteer')
const fs = require('fs').promises
const path = require('path').promises
const xlsx = require('node-xlsx').default;
require('dotenv').config();


// const USER_NAME = process.env.USER_NAME
// const COMPANY = process.env.COMPANY
// const EMAIL = process.env.EMAIL
// const OFFER = process.env.OFFER

(async () => {
  //     try {
  const browser = await puppeteer.launch({
    // headless: false,
    slowMo: 5//,
    // devtools: true
  })
  
  links = []

  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 }) 
  // await page.setRequestInterception(true)
  
  const urlFromFile = 'https://automatedconversions.com/'
  await page.goto(urlFromFile, { waitUntil: 'networkidle2' })// networkidle2 ?
  // const anchors = await page.$$('a')

  // const  formPage = await page.$$('form')// search forms in main page
  // 
  //fill in form if exists
  //recaptcha
  
  // if there is no form, I look for links on the main page

  // const hrefs = await searchHref(pageFromSite)
  const hrefs = await searchHref(page)
  console.log("hrefs from 'global'", hrefs);

  // const viewed_links = []

  // while (hrefs.length > 0) {
  //   for (let href of hrefs) {
  //     if (viewed_links.includes(href)) {    // check if I watched this link
  //       //delete links from hrefs?
  //       continue
  //     } else {
  //       viewed_links.push(href)
  //       await page.goto(href, { waitUntil: 'networkidle2' })

  //       //search form
  //       //fill in form if exists
  //       //recaptcha

  //         // if there is no form, I look for links on the page and add in array newLinks
            // compare new links with viewed ones

    // if there is not a single form on all viewed links, then I look at another site


  // await browser.close()
})()

async function searchHref(page) {
    const anchors = await page.$$('a')

    const propertyJsHandles = await Promise.all(
      anchors.map(handle => handle.getProperty('href'))
    );
    return await Promise.all(
      propertyJsHandles.map(handle => handle.jsonValue())
    );
    // console.log('href from searchHref', href);
}


function searchForm() {
}

function recaptcha() {
}
