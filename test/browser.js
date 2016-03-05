'use strict';


if (process.env.CI && process.version.indexOf('v5') !== 0) {
  // only run the browser tests once
  process.exit(0);
}

console.log((new Date()).toISOString());

var run = require('sauce-test');
var testResult = require('test-result');

var ENTRIES = [require.resolve('./index.js')];

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

function filterPlatforms(platform, defaultFilter) {
  // exclude some arbitrary browsers to make tests
  // run faster.  Also excludes beta versions of browsers
  if (!defaultFilter(platform)) return false;
  return !isAllowedFailure(platform);
}
function isAllowedFailure(platform) {
  return (platform.browserName in allowedFailures) &&
    ((+platform.version) <= allowedFailures[platform.browserName]);
}

var failedBrowsers = [];
run(ENTRIES, LOCAL ? 'chromedriver' : 'saucelabs', {
  parallel: 4,
  browserify: true,
  username: USER,
  accessKey: ACCESS_KEY,
  disableSSL: true,
  filterPlatforms: filterPlatforms,
  bail: true,
  timeout: '15s',
}).done(function (result) {
  if (result.passed) {
    testResult.pass('browser tests');
  } else {
    testResult.fail('browser tests');
  }
});
