'use strict';

var assert = require('assert');
var IS_BROWSER = require('is-browser');
var result = require('test-result');
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
  result.pass(IS_BROWSER ? 'browser' : 'node');
}, function (err) {
  if (typeof console !== 'undefined' && typeof console.log === 'function') {
    console.log(err.stack || err.message || err);
  }
  result.fail(IS_BROWSER ? 'browser' : 'node');
});
