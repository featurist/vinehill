var logger = require('../log')
var originalMainLogger = logger.main
var originalRequestLogger = logger.request
var originalResponseLogger = logger.response

module.exports.start = () => {
  var self = this
  this.requests = []
  this.responses = []
  this.main = []

  logger.main = function (req) {
    self.main.push(req)
    originalMainLogger.apply(logger, arguments)
  }
  logger.request = function (req) {
    self.requests.push(req)
    originalRequestLogger.apply(logger, arguments)
  }
  logger.response = function (res) {
    self.responses.push(res)
    originalResponseLogger.apply(logger, arguments)
  }
}

module.exports.stop = () => {
  logger.main = originalMainLogger
  logger.request = originalRequestLogger
  logger.response = originalResponseLogger
}
