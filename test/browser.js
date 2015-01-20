'use strict';

console.log((new Date()).toISOString());

var ms = require('ms');
var chalk = require('chalk');
var run = require('sauce-test');

var ENTRIES = [require.resolve('./browser-entry.js'), require.resolve('./index.js')];

var CI_USER = 'then-jsonp-ci';
var LOCAL_USER = 'then-jsonp';
var CI_ACCESS_KEY = '72486282-b452-4666-9b65-d6e610f8794f';
var LOCAL_ACCESS_KEY = 'beb60500-a585-440c-82e9-0888d716570d';
var LOCAL = !process.env.CI && process.argv[2] !== 'sauce';
var USER = process.env.CI ? CI_USER : LOCAL_USER;
var ACCESS_KEY = process.env.CI ? CI_ACCESS_KEY: LOCAL_ACCESS_KEY;

var allowedFailures = {
  iphone: 5.1,
  ipad: 5.1,
  'internet explorer': 8,
  firefox: 3.6
};

var CAPABILITIES = {
  'record-video': false,
  'record-screenshots': true,
  'capture-html': false
};
function filterPlatforms(platform) {
  var browser = platform.browserName;
  var version = platform.version;
  if (process.argv[3] && process.argv[3] !== browser) return false;
  if (process.argv[4] && process.argv[4] !== version) return false;
  if (process.argv.length < 4) {
    if (version === 'dev' || version === 'beta') return false;
    if (browser === 'chrome' && (+version) < 35 && (+version) > 5 && (+version) % 5 !== 0) return false;
    if (browser === 'firefox' && (+version) < 30 && (+version) > 5 && (+version) % 5 !== 0) return false;
  }
  return !isAllowedFailure(platform);
}
function choosePlatforms(platforms) {
  return [platforms[Math.floor(Math.random() * platforms.length)]];
}
function isAllowedFailure(platform) {
  return (platform.browserName in allowedFailures) &&
    ((+platform.version) <= allowedFailures[platform.browserName]);
}

if (LOCAL) {
  run(ENTRIES, 'chromedriver', {
    testComplete: 'return window.TESTS_COMPLETE;',
    testPassed: 'return window.TESTS_PASSED;',
    disableSSL: true
  }).done(function (res) {
    if (res.passed) {
      console.log(chalk.green('browser tests passed (' + ms(res.duration) + ')'));
    } else {
      console.log(chalk.red('browser tests failed (' + ms(res.duration) + ')'));
      process.exit(1);
    }
  }, function (err) {
    if (err.duration) {
      console.log(chalk.red('browser tests failed (' + ms(err.duration) + ')'));
    } else {
      console.log(chalk.red('browser tests failed'));
    }
    throw err;
  });
} else {
  var failedBrowsers = [];
  run(ENTRIES, 'saucelabs', {
    username: USER,
    accessKey: ACCESS_KEY,
    testComplete: 'return window.TESTS_COMPLETE;',
    testPassed: 'return window.TESTS_PASSED;',
    disableSSL: true,
    capabilities: CAPABILITIES,
    filterPlatforms: filterPlatforms,
    choosePlatforms: choosePlatforms,
    bail: true,
    timeout: '15s',
    onResult: function (res) {
      if (res.passed) {
        console.log(res.browserName + ' ' + res.version + ' ' + res.platform +
                    ' passed (' + ms(res.duration) + ')');
      } else {
        failedBrowsers.push(res);
        console.log(chalk.red(res.browserName + ' ' + res.version + ' ' + res.platform +
                              ' failed (' + ms(res.duration) + ')'));
        if (res.err) {
          console.error(res.err.stack || res.err.message || res.err);
        }
      }
    },
    onBrowserResults: function (browser, results) {
      if (results.every(function (result) { return result.passed; })) {
        console.log(chalk.green(browser + ' all passsed'));
      } else {
        console.log(chalk.red(browser + ' some failures'));
        console.dir(results[0]);
      }
    }
  }).done(function (results) {
    if (failedBrowsers.length) {
      console.log(chalk.red('failed browsers'));
      failedBrowsers.forEach(function (res) {
        console.log(chalk.red(res.browserName + ' ' +
                              res.version + ' ' +
                              res.platform +
                              ' (' + ms(res.duration) + ')'));
      });
      console.log(chalk.red('Tests Failed'));
      process.exit(1);
    } else {
      console.log(chalk.green('Tests Passed'));
    }
  });
}
