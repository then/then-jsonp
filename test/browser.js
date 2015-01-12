'use strict';

console.log((new Date()).toISOString());

var assert = require('assert');
var chromedriver = require('chromedriver');
var getDriver = require('cabbie');
var Promise = require('promise');
var throat = require('throat');
var browserify = require('browserify');
var platforms = require('test-platforms');
var chalk = require('chalk');
var request = require('then-request');
var sourceMapper = require('source-mapper');
var ms = require('ms');

var CI_USER = 'then-jsonp-ci:72486282-b452-4666-9b65-d6e610f8794f';
var LOCAL_USER = 'then-jsonp:beb60500-a585-440c-82e9-0888d716570d';
var LOCAL = !process.env.CI && process.argv[2] !== 'sauce';
var USER = LOCAL ? LOCAL_USER : CI_USER;


var allowedFailures = {
  iphone: 5.1,
  ipad: 5.1,
  'internet explorer': 8,
  firefox: 3.6
};
var getOriginalLocation = function (source, line) {
  return {source: source, line: line};
};
var url = new Promise(function (resolve, reject) {
  browserify({entries: [__dirname + '/browser-entry.js'], debug: true}).bundle(function (err, res) {
    if (err) return reject(err);
    var src = res.toString();
    var extracted = sourceMapper.extract(src);
    var consumer = sourceMapper.consumer(extracted.map);
    getOriginalLocation = function (source, line) {
      var res = consumer.originalPositionFor({line: line, column: 0});
      if (res.source === null || res.line === null) {
        return {source: source, line: line};
      } else {
        return {source: res.source, line: res.line};
      }
    };
    resolve(src);
  });
}).then(function (bundle) {
  return request('POST', 'https://tempjs.org/create', {
    json: {
      body: bundle,
      libraries: ['https://cdn.rawgit.com/ForbesLindesay/log-to-screen/c95691617af794f738826145f3f2498d4f4cab09/index.js']
    }
  }).getBody('utf8').then(JSON.parse);
}).then(function (res) {
  return 'http://tempjs.org' + res.path;
});
url.done(function (url) {
  console.log(chalk.magenta(url));
});


var run = function (driver) {
  var startTime = Date.now();
  var opts = {
    name: process.env.CI ? 'then-jsonp' : 'local-test',
    build: process.env.TRAVIS_JOB_ID
  };
  return driver.sauceJobUpdate(opts).then(null, function () {
    return driver.sauceJobUpdate(opts)
  }).then(null, function () {
    return driver.sauceJobUpdate(opts)
  }).then(null, function () {
    return driver.sauceJobUpdate(opts)
  }).then(function () {
    return url
  }).then(function (url) {
    return driver.browser().activeWindow().navigator().navigateTo(url).then(null, function () {
      return driver.browser().activeWindow().navigator().navigateTo(url)
    }).then(null, function () {
      return driver.browser().activeWindow().navigator().navigateTo(url)
    }).then(null, function () {
      return driver.browser().activeWindow().navigator().navigateTo(url)
    });
  }).then(function () {
    return new Promise(function (resolve, reject) {
      var start = Date.now();
      var timingOut = false;
      function check() {
        driver.browser().activeWindow().execute('return window.ERROR_HAS_OCCURED;').then(function (errorHasOcucured) {
          if (!errorHasOcucured) return;
          return driver.browser().activeWindow().execute('return window.FIRST_ERROR;').then(function (err) {
            var loc = getOriginalLocation(err.url, err.line);
            var clientError = new Error(err.msg + ' (' + loc.source + ' line ' + loc.line + ')');
            clientError.isClientError = true;
            throw clientError;
          }, function () {
            throw new Error('Unknown error was thrown and not caught in the browser.');
          });
        }, function () {}).then(function () {
          return driver.browser().activeWindow().execute('return window.TESTS_COMPLETE;').then(null, function () {
            return driver.browser().activeWindow().execute('return window.TESTS_COMPLETE;');
          }).then(null, function () {
            return driver.browser().activeWindow().execute('return window.TESTS_COMPLETE;')
          });
        }).done(function (complete) {
          if (complete) resolve();
          else {
            if (timingOut) return reject(new Error('Test timed out'));
            if (Date.now() - start > 20 * 1000) timingOut = true;
            setTimeout(check, 500);
          }
        }, reject);
      }
      check();
    });
  }).then(function () {
    return driver.browser().activeWindow().execute('return window.TESTS_PASSED;').then(null, function () {
      return driver.browser().activeWindow().execute('return window.TESTS_PASSED;');
    }).then(null, function () {
      return driver.browser().activeWindow().execute('return window.TESTS_PASSED;');
    }).then(null, function () {
      return driver.browser().activeWindow().execute('return window.TESTS_PASSED;');
    });
  }).then(function (result) {
    return {passed: result, duration: Date.now() - startTime};
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
      if (result.passed) {
        console.log(chalk.green('browser tests passed (' + ms(result.duration) + ')'));
      } else {
        console.log(chalk.red('browser tests failed (' + ms(result.duration) + ')'));
        setTimeout(function () {
          process.exit(1);
        }, 2000);
      }
      return driver.dispose();
    }, function (err) {
      console.log(chalk.red('browser tests failed'));
      return driver.dispose().then(null, function () {}).then(function () {
        setTimeout(function () {
          throw err;
        }, 2000);
      });
    });
  }, 5000);
} else {
  var runPlatform = throat(3, function (platform) {
    var driver;
    var result = new Promise(function (resolve, reject) {
      function attempt(index) {
        driver = getDriver('http://' + USER + '@ondemand.saucelabs.com/wd/hub', {
          browserName: platform.api_name,
          version: platform.short_version,
          platform: platform.os,
          'record-video': false,
          'record-screenshots': true,
          'capture-html': false
        }, {
          mode: 'async',
          debug: false,
          httpDebug: false
        });
        driver._session().done(function () {
          resolve(run(driver));
        }, function (err) {
          console.error('failed to get driver, retrying');
          if (index > 3) reject(err);
          else setTimeout(attempt.bind(null, index + 1), 2000);
        });
      }
      attempt(1);
    });
    return result.then(function (result) {
      return driver.dispose({passed: result.passed}).then(null, function () {
        return driver.dispose({passed: result.passed})
      }).then(null, function () {
        return driver.dispose({passed: result.passed})
      }).then(null, function () {}).then(function () { return result; });
    }, function (err) {
      if (!driver) throw err;
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
      if (process.argv.length < 4) {
      if (platform.short_version === 'dev' || platform.short_version === 'beta') return;
        if (platform.api_name === 'chrome' && (+platform.short_version) < 35 && (+platform.short_version) > 5 && (+platform.short_version) % 5 !== 0) return;
        if (platform.api_name === 'firefox' && (+platform.short_version) < 30 && (+platform.short_version) > 5 && (+platform.short_version) % 5 !== 0) return;
      }
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
        result[browser].push(obj[browser][version][Math.floor(Math.random() * obj[browser][version].length)]);
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
            if (result.passed) {
              console.log(key + ' ' + platform.short_version + ' ' + platform.os + ' passed (' + ms(result.duration) + ')');
              next(i + 1);
            } else {
              console.log(chalk.red(key + ' ' + platform.short_version + ' ' + platform.os + ' failed (' + ms(result.duration) + ')'));
              resolve(platform);
            }
          }, function (err) {
            if(err.isClientError) {
              console.log(chalk.red(key + ' ' + platform.short_version + ' ' + platform.os + ' failed'));
            } else {
              console.log(chalk.yellow(key + ' ' + platform.short_version + ' ' + platform.os + ' errored'));
            }
            console.error(err.stack || err);
            resolve(platform);
          });
        }
        next(0);
      });
    }));
    results.done(function (results) {
      console.log((new Date()).toISOString());
      var failed = false;
      if (results.some(function (result) { return result !== true; })) {
        console.log(chalk.red('test failures:'));
      }
      results.forEach(function (result) {
        if (result !== true) {
          var isAllowed = true;
          if (!(result.api_name in allowedFailures)) {
            isAllowed = false;
          } else if ((+result.short_version) < allowedFailures[result.api_name]) {
            isAllowed = false;
          }
          console.log(chalk[isAllowed ? 'yellow' : 'red'](' - ' + result.api_name + ' ' + result.short_version + ' ' + result.os));
          if (!isAllowed) failed = true;
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

