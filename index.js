const TelegramBot = require('node-telegram-bot-api')
const {execFile} = require('child_process')
const fs = require('fs')

const {createLogger, format, transports} = require('winston')
const {combine, timestamp, printf} = format

const TOKEN = process.env.TOKEN
const LOG_CHAT_ID = parseInt(process.env.LOG_CHAT_ID)
const UPDATE_INTERVAL = 600000
const RESPONSE_TIMEOUT = 15000

const myFormat = printf(({level, message, label, timestamp}) => {
  return `${timestamp}: ${message}`
})

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    myFormat
  ),
  transports: [
    new transports.File({filename: 'error.log', level: 'error', maxsize: 5242880, maxFiles: 2}),
    new transports.File({filename: 'full.log', maxsize: 5242880, maxFiles: 2})
  ]
})

const bot = new TelegramBot(TOKEN, {polling: true})

const people = [
  {name: 'Artem', selected: false},
  {name: 'Lenya', selected: false},
  {name: 'Kirill', selected: false},
  {name: 'Serega', selected: false},
  {name: 'Nikita', selected: false}
]

const generateMarkup = people => ({
  reply_markup: {
    inline_keyboard: [
      people.map(({name, selected}, index) => ({
        text: name + (selected ? ' ✅' : ' ❌'),
        callback_data: selected ? `-${index}` : `+${index}`
      })),
      [{text: 'Submit', callback_data: 'submit'}]
    ]
  }
})

const update = () => {
  try {
    const startTime = new Date()

    execFile('slimerjs', ['--headless', 'parser.js'], {env: process.env}, (error, stdout, stderr) => {
      if (error)
        logger.error('Slimer error: ', error)
      else
        logger.info(`Data updated in ${(new Date() - startTime) / 1000} sec.`)
    })
  } catch (err) {
    logger.error('Exec error: ', err)
  }
}

const checkResponseTimeout = ({date}) => {
  date *= 1000

  if (date - lastResponse > RESPONSE_TIMEOUT) {
    lastResponse = date
    return true
  }
}

let lastResponse = new Date()

setImmediate(update)
setInterval(update, UPDATE_INTERVAL)

bot.onText(/\/balance.*/, msg => {
  if (checkResponseTimeout(msg) && fs.existsSync('./balances.json')) {
    const result = JSON.parse(fs.readFileSync('balances.json', 'utf-8'))
    bot.sendMessage(msg.chat.id, result['•••• 0279'])
      .catch(err => logger.error('Sending balance failed ', err))
  }
})

bot.onText(/\/tx.*/, msg => {
  if (checkResponseTimeout(msg) && fs.existsSync('./tx.png'))
    bot.sendPhoto(msg.chat.id, fs.readFileSync('./tx.png'))
      .catch(err => logger.error('Sending tx list failed ', err))
})

bot.onText(/\/rnd.*/, msg => {
  if (checkResponseTimeout(msg)) {
    for (let person of people)
      person.selected = false

    bot.sendMessage(msg.chat.id, 'Select:', generateMarkup(people))
      .catch(err => logger.error('Rnd failed ', err))
  }
})

bot.on('callback_query', event => {
  logger.info(JSON.stringify(event))

  if (event.data[0] === '+' || event.data[0] === '-') {
    const person = people[event.data[1] - '0']
    person.selected = !person.selected

    bot.editMessageReplyMarkup(generateMarkup(people).reply_markup, {
      chat_id: event.message.chat.id,
      message_id: event.message.message_id
    }).catch(err => logger.error('Answer callback query failed ', err))
  } else {
    const names = people.filter(x => x.selected).map(x => x.name)
    const text = names.length === 0 ? 'No one is selected' : `Chose ${names[Math.floor(Math.random() * names.length)]} out of [${names.join(', ')}]`

    bot.editMessageText(text, {
      reply_markup: {},
      chat_id: event.message.chat.id,
      message_id: event.message.message_id
    }).catch(err => logger.error('Submit failed ', err))
  }
})

bot.onText(/\/logs.*/, msg => {
  if (msg.chat.id === LOG_CHAT_ID) {
    const full = fs.readFileSync('full.log')
    if (full.length > 0)
      bot.sendDocument(LOG_CHAT_ID, 'full.log')
        .catch(err => logger.error('Sending logs failed ', err))

    const error = fs.readFileSync('error.log')
    if (error.length > 0)
      bot.sendDocument(LOG_CHAT_ID, 'error.log')
        .catch(err => logger.error('Sending logs failed ', err))
  }
})

bot.on('message', msg => {
  logger.info(JSON.stringify(msg))
})
