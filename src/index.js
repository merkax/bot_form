const puppeteer = require('puppeteer')
const fs = require('fs').promises
const path = require('path').promises
const XLSX = require('xlsx');
const request = require('request-promise-native');
const poll = require('promise-poller').default;
require('dotenv').config();

// import { linksOnSites } from './work_with_file.js';

const USER_NAME = process.env.USER_NAME;
const COMPANY = process.env.COMPANY;
const EMAIL = process.env.EMAIL;
const OFFER = process.env.OFFER;
const API_KEY = process.env.API_KEY;

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      slowMo: 5//,
      // devtools: true
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 }) 

    const urlFromFile = linksOnSites()[0]

    const viewedLinks = []

    await searchProcess(page, urlFromFile, viewedLinks)
  } catch(err) {
    console.log('Error from main function:', err)// todo continue next file
  }
})();

async function searchProcess(page, urlFromFile, viewedLinks) {
  await page.goto(urlFromFile, { waitUntil: 'networkidle2' })

  const formOnPage = await page.$$('form')

  if (formOnPage.length !== 0) {
    console.log('I found forms');
    try {
      await fillInForm(page)
      await recaptcha(page)
      //todo return true in file;
    } catch(err) {
      if (err) throw err// todo // return false in file;
      console.log('Error from fill in form', err)
    }
  } else {
    const links = await searchLinks(page)
    const linksWithoutDouble = Array.from(new Set(links))
    
    console.log("Links from page on which watch now:", linksWithoutDouble);
    
    newLinks = linksWithoutDouble.filter(function (link) {
      return !viewedLinks.includes(link);
    });
    console.log("New links without visits:", newLinks);

    for (const link of newLinks) {
      console.log("Watching this link now:", link);
      viewedLinks.push(link)

      console.log("Lins visited:", viewedLinks);

      await page.goto(link, { waitUntil: 'networkidle2' })
      await searchProcess(page, link, viewedLinks)
      // todo
      // if watched all links and dont find form, then return false in file
    }
  }
}

async function searchLinks(page) {
    const anchors = await page.$$('a')

    const propertyJsHandles = await Promise.all(
      anchors.map(handle => handle.getProperty('href'))
      );
    return await Promise.all(
      propertyJsHandles.map(handle => handle.jsonValue())
    );
}

async function fillInForm(page) {
  await page.type('#wpforms-1676 > #wpforms-form-1676 #wpforms-1676-field_0', USER_NAME)
  await page.type('#wpforms-1676 > #wpforms-form-1676 #wpforms-1676-field_8', COMPANY)
  await page.type('#wpforms-1676 > #wpforms-form-1676 #wpforms-1676-field_1', EMAIL)
  await page.type('#wpforms-1676 > #wpforms-form-1676 #wpforms-1676-field_2', OFFER)
}

async function recaptcha(page) {
  const requestId = await initiateCaptchaRequest(API_KEY)
  console.log("requestId", requestId);

  const response = await pollForRequestResults(API_KEY, requestId)

  console.log("Response: ", response);
  const recap = await page.evaluate(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`);
  console.log("After evaluate");

  // await Promise.all([
  //   page.waitForNavigation(),
  //   page.click('.wpb_wrapper > #wpforms-1676 > #wpforms-form-1676 #wpforms-submit-1676')
  // ]);
  await page.click('.wpb_wrapper > #wpforms-1676 > #wpforms-form-1676 #wpforms-submit-1676')
  console.log("After submit");
}

async function initiateCaptchaRequest(apiKey) {
  const formData = {
    method: 'userrecaptcha',
    key: apiKey,
    googlekey: '6LfLW6AUAAAAADd_dznZsxukQHZSmPIqtfPoUAEq',
    pageurl: 'https://automatedconversions.com/contact',
    json: 1
  };
  console.log(`Submiting solution request to 2captcha for`);
  const response = await request.post('http://2captcha.com/in.php', { form: formData });

  return JSON.parse(response).request;
}

async function pollForRequestResults(
  key,
  id,
  retries = 30,
  interval = 1500,
  delay = 15000
) {
  await timeout(delay);
  return poll({
    taskFn: requestCaptchaResults(key, id),
    interval,
    retries
  });
}

function requestCaptchaResults(apiKey, requestId) {
  const url = `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`;
  return async function () {
    return new Promise(async function (resolve, reject) {
      console.log('Polling for response ...');
      const rawResponse = await request.get(url);
      const resp = JSON.parse(rawResponse);
      if (resp.status === 0) return reject(resp.request);
      console.log('Responce received:', resp);
      resolve(resp.request);
    });
  }
}

const timeout = millis => new Promise(resolve => setTimeout(resolve, millis))

const filePath = `${__dirname}/public/sites.xlsx`
const workBook = XLSX.readFileSync(filePath)
const sheetName = workBook.SheetNames

const linksOnSites = () => {
  const worksheets = {}
  const sites = []

  worksheets[sheetName] = XLSX.utils.sheet_to_json(workBook.Sheets[sheetName])

  worksheets[sheetName].forEach((cell) => {
    sites.push(cell['sites'])
  });

  return sites
}
