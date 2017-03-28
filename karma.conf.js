module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'browserify'],
    files: [
      'test/**/*Spec.js'
    ],
    exclude: [
    ],
    browserify: {
      debug: true
    },
    preprocessors: {
      'test/**/*Spec.js': ['browserify']
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    concurrency: Infinity
  })
}
