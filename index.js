'use strict';

var vm = require('vm');
var request = require('then-request');
var Promise = require('promise');

module.exports = pquest;
function pquest(method, url, options, callback) {
  var callbackName;
  var result = Promise.resolve(null).then(function () {
    // check types of arguments

    if (typeof method !== 'string') {
      throw new TypeError('The method must be a string.');
    }
    if (typeof url !== 'string') {
      throw new TypeError('The URL/path must be a string.');
    }
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (options === null || options === undefined) {
      options = {};
    }
    if (typeof options !== 'object') {
      throw new TypeError('Options must be an object (or null).');
    }
    if (typeof callback !== 'function') {
      callback = undefined;
    }

    if (options.skipJsonpOnServer) {
      return request(method, url, options).getBody('utf8').then(JSON.parse);
    }

    if (options.body) {
      throw new TypeError('JSONP does not support requests that have bodies');
    }
    if (options.headers) {
      throw new TypeError('JSONP does not support requests that specify headers');
    }
    if (options.followRedirects === false) {
      throw new TypeError('JSONP does not support requests that do not follow redirects');
    }

    options.qs = options.qs || {};
    if (options.json) {
      Object.keys(options.json).forEach(function (key) {
        options.qs[key] = options.json[key];
      });
      delete options.json;
    }

    callbackName = options.callbackName || 'then_jsonp_0';

    if (options.callbackParameter !== false) {
      options.qs[options.callbackParameter || 'callback'] = callbackName;
    }
    if (method.toLowerCase() !== 'get') {
      options.qs[options.methodParameter || 'method'] = method;
    }
    return request('get', url, options).getBody('utf8');
  }).then(function (body) {
    if (options.skipJsonpOnServer) return body;
    var sandbox = {};
    var result, called;
    sandbox[callbackName] = function (res) {
      if (called) {
        throw new Error('JSONP callback called multiple times');
      }
      result = res;
      called = true;
    };
    vm.runInNewContext(body, sandbox);
    if (!called) throw new Error('JSONP timed out');
    return result;
  });
  result.getBody = function () {
    return result.then(function (res) { return res.getBody(); });
  };
  return result.nodeify(callback);
}
