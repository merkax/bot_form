const puppeteer = require('puppeteer');
const request = require('request-promise-native');
const poll = require('promise-poller').default;
require('dotenv').config();

const USER_NAME = process.env.USER_NAME;
const PHONE = process.env.PHONE;
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
  
  const urlFromFile = 'https://www.ppcadeditor.com/contact-us/'
  await page.goto(urlFromFile, { waitUntil: 'networkidle2' })

  const requestId = await initiateCaptchaRequest(API_KEY)

  // from https://chrome.google.com/webstore/detail/headless-recorder/djeegiggegleadkkbgopoonhjimgehda
  await page.type('.frm_form_fields #field_qh4icy', USER_NAME)
  await page.waitFor(1000 + Math.random() * 1000)
  await page.type('.frm_form_fields #field_ocfup1', PHONE)
  await page.waitFor(1000 + Math.random() * 1000)
  await page.type('.frm_form_fields #field_29yf4d', EMAIL)
  await page.waitFor(1000 + Math.random() * 1000)
  await page.type('.frm_form_fields #field_9jv0r1', OFFER)

  console.log("requestId", requestId);

  const response = await pollForRequestResults(API_KEY, requestId)

  console.log("response", response);
  await page.evaluate(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`);
  console.log("after evaluate");

  await page.click('.frm_form_fields > fieldset > .frm_fields_container > .frm_submit > .frm_button_submit')

  console.log("after submit");

  // await browser.close()
})()

async function initiateCaptchaRequest(apiKey) {
  const formData = {
    method: 'userrecaptcha',
    key: apiKey,
    googlekey: '6LeVzf8ZAAAAAFS0jeTpV4lPt7e4r9dX3d6uUYer',
    pageurl: 'https://www.ppcadeditor.com/contact-us/',
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

