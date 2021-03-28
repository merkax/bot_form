async function searchLinks(page, basicUrl) {
  const anchors = await page.$$('a')

  const propertyJsHandles = await Promise.all(
    anchors.map(handle => handle.getProperty('href'))
  );
  const newLinks = await Promise.all(
    propertyJsHandles.map(handle => handle.jsonValue())
  );
  return await Promise.all(
    newLinks.filter(newLink => isHomeLink(basicUrl, newLink))
  );
}

function isHomeLink(basicLink, newLink) {
  let firstLink = basicLink.split('//')[1].split('/')[0]
  let secondLink = newLink.split('//')[1].split('/')[0]

  return (firstLink === secondLink) ? true : false;
}

module.exports = { searchLinks };
