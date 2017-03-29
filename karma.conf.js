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
      debug: true,
      transform: ['bubleify']
    },
    preprocessors: {
      'test/**/*Spec.js': ['browserify']
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: process.env.BROWSERS === 'all' ? Object.keys(browsers) : ['Chrome'],
    browserStack: {
      username: process.env.BROWSERSTACK_USER,
      accessKey: process.env.BROWSERSTACK_PASSWORD
    },
    customLaunchers: browsers,
    singleRun: false,
    concurrency: Infinity
  })
}
var browsers = {
  'browserstack-windows-firefox': {
    base: 'BrowserStack',
    browser: 'Firefox',
    browser_version: '52.0',
    os: 'Windows',
    os_version: '10',
    resolution: '1280x1024'
  },
  'browserstack-osx-firefox': {
    base: 'BrowserStack',
    browser: 'Firefox',
    browser_version: '52.0',
    os: 'OS X',
    os_version: 'Sierra',
    resolution: '1280x1024'
  },
  'browserstack-windows-chrome': {
    base: 'BrowserStack',
    browser: 'Chrome',
    browser_version: '52.0',
    os: 'Windows',
    os_version: '10',
    resolution: '1280x1024'
  },
  'browserstack-osx-chrome': {
    base: 'BrowserStack',
    browser: 'Chrome',
    browser_version: '52.0',
    os: 'OS X',
    os_version: 'Sierra',
    resolution: '1280x1024'
  },
  'browserstack-ie11': {
    base: 'BrowserStack',
    browser: 'IE',
    browser_version: '11.0',
    os: 'Windows',
    os_version: '10',
    resolution: '1280x1024'
  },
  'browserstack-edge': {
    base: 'BrowserStack',
    browser: 'Edge',
    browser_version: '13.0',
    os: 'Windows',
    os_version: '10',
    resolution: '1280x1024'
  }
}
