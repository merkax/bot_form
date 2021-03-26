const puppeteer = require('puppeteer')
const fs = require('fs').promises
const path = require('path').promises
const request = require('request-promise-native');
const poll = require('promise-poller').default;
const { readSitesFromExcel, writeInExcel } = require('./work_with_file');
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
    const links = await searchLinks(page)
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
  //todo form for all sites. now only for https://www.ppcadeditor.com/contact-us/
  await page.type('.frm_form_fields #field_qh4icy', USER_NAME)
  await page.type('.frm_form_fields #field_ocfup1', PHONE)
  await page.type('.frm_form_fields #field_29yf4d', EMAIL)
  await page.type('.frm_form_fields #field_9jv0r1', OFFER)
}

async function recaptcha(page) {
  const requestId = await initiateCaptchaRequest(API_KEY)
  console.log("requestId", requestId);

  const response = await pollForRequestResults(API_KEY, requestId)

  console.log("Response:", response);
  await page.evaluate(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`);
  console.log("After evaluate");

  // await Promise.all([
  //   page.waitForNavigation(),
  //   page.click('.wpb_wrapper > #wpforms-1676 > #wpforms-form-1676 #wpforms-submit-1676')
  // ]);
  await page.click('.frm_form_fields > fieldset > .frm_fields_container > .frm_submit > .frm_button_submit')

  console.log("After submit");
}

async function initiateCaptchaRequest(apiKey) {
  const formData = {
    method: 'userrecaptcha',
    key: apiKey,
    googlekey: '6LeVzf8ZAAAAAFS0jeTpV4lPt7e4r9dX3d6uUYer',
    pageurl: 'https://www.ppcadeditor.com/contact-us/',
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
