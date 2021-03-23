const puppeteer = require('puppeteer');
const request = require('request-promise-native');
const poll = require('promise-poller').default;

console.log("poll", poll);
require('dotenv').config();


const USER_NAME = process.env.USER_NAME;
const COMPANY = process.env.COMPANY;
const EMAIL = process.env.EMAIL;
const OFFER = process.env.OFFER;
const API_KEY = process.env.API_KEY;


(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 5,
    // devtools: true
  })
  
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 }) 
  
  const urlFromFile = 'https://automatedconversions.com/contact'
  await page.goto(urlFromFile, { waitUntil: 'networkidle2' })

  const requestId = await initiateCaptchaRequest(API_KEY)

  // from https://chrome.google.com/webstore/detail/headless-recorder/djeegiggegleadkkbgopoonhjimgehda
  await page.type('#wpforms-1676 > #wpforms-form-1676 #wpforms-1676-field_0', USER_NAME)
  await page.type('#wpforms-1676 > #wpforms-form-1676 #wpforms-1676-field_8', COMPANY)
  await page.type('#wpforms-1676 > #wpforms-form-1676 #wpforms-1676-field_1', EMAIL)
  await page.type('#wpforms-1676 > #wpforms-form-1676 #wpforms-1676-field_2', OFFER)
 
  console.log("requestId", requestId);

  const response = await pollForRequestResults(API_KEY, requestId)

  console.log("response", response);
  await page.evaluate(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`);
  console.log("after evaluate");

  await page.click('.wpb_wrapper > #wpforms-1676 > #wpforms-form-1676 #wpforms-submit-1676')
  console.log("after submit");

  // await browser.close()
})()

async function initiateCaptchaRequest(apiKey) {
  const formData = {
    method: 'userrecaptcha',
    key: apiKey,
    googlekey: '6LfLW6AUAAAAADd_dznZsxukQHZSmPIqtfPoUAEq',
    pageurl: 'https://automatedconversions.com/contact',
    json: 1
  };
  console.log(`Submiting solution request to 2captcha for` );
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
      console.log('polling for response');
      const rawResponse = await request.get(url);
      const resp = JSON.parse(rawResponse);
      if (resp.status === 0) return reject(resp.request);
      console.log('Responce received.');
      console.log('Responce receive:', resp);
      resolve(resp.request);
    });
  }
}

const timeout = millis => new Promise(resolve => setTimeout(resolve, millis))

