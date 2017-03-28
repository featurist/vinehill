var logger = require('../log')
var originalRequestLogger = logger.request
var originalResponseLogger = logger.response
var originalMainLogger = logger.main

module.exports.start = () => {
  this.requests = []
  this.responses = []
  this.main = []

  logger.main = (req) => {
    this.main.push(req)
    originalMainLogger.apply(logger, arguments)
  }
  logger.request = (req) => {
    this.requests.push(req)
    originalRequestLogger.apply(logger, arguments)
  }
  logger.response = (res) => {
    this.responses.push(res)
    originalResponseLogger.apply(logger, arguments)
  }
}


module.exports.stop = () => {
  logger.main = originalMainLogger
  logger.request = originalRequestLogger
  logger.response = originalResponseLogger
}
