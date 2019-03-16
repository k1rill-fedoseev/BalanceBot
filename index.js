const TelegramBot = require('node-telegram-bot-api')
const {execFile} = require('child_process')
const fs = require('fs')

const {createLogger, format, transports} = require('winston')
const {combine, timestamp, printf} = format

const token = process.env.TOKEN
const LOG_CHAT_ID = process.env.LOG_CHAT_ID

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

const bot = new TelegramBot(token, {polling: true})

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
    bot.sendMessage(LOG_CHAT_ID, 'Something went wrong...').finally()
  }
}

setImmediate(update)
setInterval(update, 10 * 60 * 1000)

bot.onText(/\/balance.*/, msg => {
  if (fs.existsSync('./balances.json')) {
    const result = JSON.parse(fs.readFileSync('balances.json', 'utf-8'))
    bot.sendMessage(msg.chat.id, result['•••• 0279']).finally()
  }
})

bot.onText(/\/tx.*/, msg => {
  if (fs.existsSync('./tx.png'))
    bot.sendPhoto(msg.chat.id, fs.readFileSync('./tx.png')).finally()
})

bot.on('message', msg => {
  logger.info(JSON.stringify(msg))
})
