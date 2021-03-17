const puppeteer = require('puppeteer')
const fs = require('fs').promises
const path = require('path').promises
const xlsx = require('node-xlsx').default;
const request = require('request-promise-native');
const poll = require('promise-poller').default;
require('dotenv').config();

const USER_NAME = process.env.USER_NAME;
const COMPANY = process.env.COMPANY;
const EMAIL = process.env.EMAIL;
const OFFER = process.env.OFFER;
const API_KEY = process.env.API_KEY;

(async () => {
  //     try {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 5//,
    // devtools: true
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 }) 
  // await page.setRequestInterception(true) /?
  
  const urlFromFile = 'https://automatedconversions.com/'
  // const urlFromFile = 'https://automatedconversions.com/contact'

  await page.goto(urlFromFile, { waitUntil: 'networkidle2' })

  const formOnPage = await searchForm(page)

  if (formOnPage.length !== 0) {
    console.log('I found forms');
    fillInForm(page)
    recaptcha(page)
    // break// ?
  }

  const links = await searchHref(page)
  const linksWithoutDouble = Array.from(new Set(links))
  
  const viewed_links = []

  for (const link of linksWithoutDouble) {
    console.log("Watching this link:", link);

    viewed_links.push(link)

    await page.goto(link, { waitUntil: 'networkidle2' })

    const formOnPage = await searchForm(page)

    newLinks = await searchHref(page)
    // console.log("init newLinks", newLinks);

    await fs.appendFile('./tmp/newlinks.json', JSON.stringify(newLinks, null, 2))
    // or  = .concat(newLinks)

    if (formOnPage.length !== 0) {
      console.log('I found forms');
      break
    } 
  }

  fillInForm(page)
  recaptcha(page)

  // console.log("newLinks global", newLinks);
  
  // TODO
  // read new links here?
  // let newLinks = JSON.parse(await fs.readFile(`./tmp/newlinks.json`))
  //compare new links with viewed ones this or in for cycle

  //if there is not a single form on all viewed links, then I look at another site

  // 
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
}

async function searchForm(page) {
  return await page.$$('form')
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

  console.log("response: ", response);
  await page.evaluate(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`);
  console.log("after evaluate");

  await page.click('.wpb_wrapper > #wpforms-1676 > #wpforms-form-1676 #wpforms-submit-1676')
  console.log("after submit");
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
