'use strict';

var assert = require('assert');
var chalk = require('chalk');
var IS_BROWSER = require('is-browser');
var pquest = require('../');

pquest('GET', 'https://api.uptimerobot.com/getMonitors?apiKey=u193485-e7bb953d295bd66420f2f5d6&format=json', {
  callbackName: 'jsonUptimeRobotApi',
  callbackParameter: false
}).then(function (result) {
  console.log(result);
  assert(result.stat === 'ok');
  if (!IS_BROWSER) {
    return pquest('GET', 'https://api.uptimerobot.com/getMonitors?apiKey=u193485-e7bb953d295bd66420f2f5d6&format=json', {
      callbackName: 'jsonUptimeRobotApi',
      callbackParameter: false,
      skipJsonpOnServer: true,
      qs: IS_BROWSER ? {} : {noJsonCallback: '1'}
    });
  }
}).then(function (result) {
  if (!IS_BROWSER) {
    console.log(result);
    assert(result.stat === 'ok');
  }
}).done(function () {
  console.log(IS_BROWSER ? 'browser tests passed' : chalk.green('node tests passed'));
  process && process.exit && process.exit(0);
}, function (err) {
  console.log(IS_BROWSER ? 'browser tests failed' : chalk.green('node tests failed'));
  console.error(err.stack || err.message || err);
  process && process.exit && process.exit(1);
});
