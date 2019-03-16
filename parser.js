const page = require('webpage').create()
const env = require('system').env
const fs = require('fs')

const login = env.SBERBANK_LOGIN
const pass = env.SBERBANK_PASS

page.onResourceRequested = (requestData, networkRequest) => {
  if (['google', 'yandex', '.jpg', '.gif', 'stat.sberbank'].some(keyword => requestData.url.includes(keyword)))
    networkRequest.abort()
}

let loadedMain = false
let loadedTx = false

page.onLoadFinished = (status, url) => {
  if (url.includes('private/accounts.do'))
    loadedMain = true
  if (url.includes('private/payments/common.do'))
    loadedTx = true
}

(async () => {
  await page.open('https://online.sberbank.ru/CSAFront/index.do')

  await page.evaluate((login, pass) => {
    $('#login').val(login)
    $('#password').val(pass)
    $('#buttonSubmit .btn_hidden').click()
  }, login, pass)

  while (!loadedMain)
    await slimer.wait(50)

  const balances = page.evaluate(() => {
    const balances = []
    const cardNames = []
    const result = {}
    $('.overallAmount').each(function () {
      balances.push($(this).text())
    })
    $('.accountNumber').each(function () {
      cardNames.push($(this).text().substring(0, 9))
    })
    cardNames.forEach((cardName, index) => {
      result[cardName] = balances[index]
    })
    return result
  })
  fs.write('./balances.json', JSON.stringify(balances))

  await page.evaluate(() => {
    $('#favouriteLinks a')[0].click()
  })

  while (!loadedTx)
    await slimer.wait(50)
  loadedTx = false

  await page.evaluate(() => {
    $('#filterCounterTag1').click()
    $('.filter .productSelect').val('card:112977175')
    $('.filter .commandButton .buttonGreen').get(1).click()
  })
  while (!loadedTx)
    await slimer.wait(50)
  loadedTx = false

  await page.evaluate(() => {
    $('#filterCounterTag1').click()
    $('.filter .productSelect').val('card:112977175')
    $('.filter .commandButton .buttonGreen').get(1).click()

    $('#pagination .paginationSize a')[1].click()
  })
  while (!loadedTx)
    await slimer.wait(50)

  page.clipRect = page.evaluate(count => {
    $('#pagination').hide()
    $('#simpleTable0 > .grid > table > tbody > tr').each((i, elem) => {
      if (i > count)
        $(elem).hide()
    })
    const table = $('#simpleTable0 > .grid > table')[0]
    return {left: table.offsetLeft, top: table.offsetTop, width: table.offsetWidth, height: table.offsetHeight}
  }, 10)
  page.render('tx.png')

  page.close()
  phantom.exit()
})()
  .catch(console.error)


