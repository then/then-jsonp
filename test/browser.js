'use strict';

var assert = require('assert');
var chromedriver = require('chromedriver');
var getDriver = require('cabbie');
var Promise = require('promise');
var throat = require('throat');
var browserify = require('browserify');
var platforms = require('test-platforms');
var chalk = require('chalk');
var request = require('then-request');

var LOCAL = !process.env.CI && process.argv[2] !== 'sauce';

if (process.env.CI) {
  // TODO: make selenium tests work in CI
  process.exit(0);
}

var url = new Promise(function (resolve, reject) {
  browserify(__dirname + '/browser-entry.js').bundle(function (err, res) {
    if (err) reject(err);
    else resolve(res.toString());
  });
}).then(function (bundle) {
  return request('POST', 'https://tempjs.org/create', {
    json: {
      body: bundle
    }
  }).getBody('utf8').then(JSON.parse);
}).then(function (res) {
  return 'http://tempjs.org' + res.path;
});
url.done(function (url) {
  console.log(chalk.magenta(url));
});


var run = function (driver) {
  return driver.sauceJobUpdate({
    name: process.env.CI ? 'then-jsonp' : 'local-test',
    build: process.env.TRAVIS_JOB_ID
  }).then(function () {
    return url;
  }).then(function (url) {
    return driver.browser().activeWindow().navigator().navigateTo(url);
  }).then(function () {
    return;
    var start = Date.now();
    return new Promise(function (resolve, reject) {
      function check(i) {
        driver.browser().activeWindow().execute('return window.TESTS_COMPLETE;').done(function (complete) {
          if (complete) resolve();
          else {
            if (i > 60 * 2) return reject(new Error('Test timed out'));
            setTimeout(check.bind(null, i + 1), 500);
          }
        }, reject);
      }
      check();
    });
  }).then(function () {
    return driver.browser().activeWindow().execute('return window.TESTS_PASSED;');
  }).then(function (result) {
    return result;
  });
};

if (LOCAL) {
  chromedriver.start();
  setTimeout(function () {
    var driver;
    try {
      driver = getDriver('http://localhost:9515/', {}, {
        mode: 'async',
        debug: false,
        httpDebug: false
      });
      driver.on('disposed', function () {
        chromedriver.stop();
      });
    } catch (ex) {
      chromedriver.stop();
      setTimeout(function () {
        throw ex;
      }, 500);
    }
    run(driver).then(function (result) {
      if (result) {
        console.log('browser tests passed');
      } else {
        console.log('browser tests failed');
        setTimeout(function () {
          process.exit(1);
        }, 2000);
      }
      return driver.dispose();
    }, function (err) {
      console.log('browser tests failed');
      return driver.dispose().then(null, function () {}).then(function () {
        setTimeout(function () {
          throw err;
        }, 2000);
      });
    });
  }, 5000);
} else {
  var runPlatform = throat(3, function (platform) {
    var driver = getDriver('http://then-jsonp:beb60500-a585-440c-82e9-0888d716570d@ondemand.saucelabs.com/wd/hub', {
      browserName: platform.api_name,
      version: platform.short_version,
      platform: platform.os
    }, {
      mode: 'async',
      debug: true,
      httpDebug: true
    });
    return run(driver).then(function (result) {
      return driver.dispose({passed: result}).then(function () { return result; });
    }, function (err) {
      return driver.dispose({passed: false}).then(null, function () {}).then(function () {
        throw err;
      });
    });
  });
  var platforms = request('GET', 'https://saucelabs.com/rest/v1/info/platforms/webdriver')
  .getBody('utf8').then(JSON.parse).then(function (platforms) {
    var obj = {};
    platforms.forEach(function (platform) {
      if (process.argv[3] && process.argv[3] !== platform.api_name) return;
      if (process.argv[4] && process.argv[4] !== platform.short_version) return;
      obj[platform.api_name] = obj[platform.api_name] || {};
      obj[platform.api_name][platform.short_version] = obj[platform.api_name][platform.short_version] || [];
      obj[platform.api_name][platform.short_version].push(platform);
    });
    var result = {};
    Object.keys(obj).forEach(function (browser) {
      if (browser === 'lynx') return;
      result[browser] = [];
      Object.keys(obj[browser]).sort(function (versionA, versionB) {
        return (+versionB) - (+versionA);
      }).forEach(function (version, index) {
        if (index === 0) {
          result[browser] = result[browser].concat(obj[browser][version]);
        } else {
          result[browser].push(obj[browser][version][Math.floor(Math.random() * obj[browser][version].length)]);
        }
      });
    });
    return result;
  });
  platforms.done(function (platforms) {
    var results = Promise.all(Object.keys(platforms).map(function (key) {
      return new Promise(function (resolve) {
        function next(i) {
          if (i >= platforms[key].length) {
            console.log(chalk.green('all tests pass for ' + key));
            return resolve(true);
          }
          var platform = platforms[key][i];
          runPlatform(platform).then(function (result) {
            if (result) {
              console.log(key + ' ' + platform.short_version + ' ' + platform.os + ' passed');
              next(i + 1);
            } else {
              console.log(chalk.red(key + ' ' + platform.short_version + ' ' + platform.os + ' failed'));
              resolve(platform);
            }
          }, function (err) {
            console.log(chalk.yellow(key + ' ' + platform.short_version + ' ' + platform.os + ' errored'));
            console.error(err.stack || err);
            resolve(platform);
          });
        }
        next(0);
      });
    }));
    var allowedFailures = {
      iphone: 5.1,
      ipad: 5.1,
      android: 5.0,
      'internet explorer': 9
    };
    results.done(function (results) {
      var failed = false;
      results.forEach(function (result) {
        if (result !== true) {
          if ((result.api_name in allowedFailures)) {
            failed = true;
          } else if ((+result.short_version) < allowedFailures[result.api_name]) {
            failed = true;
          }
        }
      });
      if (failed) {
        console.log(chalk.red('tests failed'));
        setTimeout(function () {
          process.exit(1);
        }, 1000);
      } else {
        console.log(chalk.green('tests passed'));
      }
    });
  });
}

