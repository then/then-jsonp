'use strict';

var Promise = require('promise');
var handleQs = require('then-request/lib/handle-qs.js');

var jsonpID = 0;

module.exports = pquest;
function pquest(method, url, options, callback) {
  var result = new Promise(function (resolve, reject) {

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

    var callbackName = options.callbackName || 'then_jsonp_' + (++jsonpID);

    if (options.callbackParameter !== false) {
      options.qs[options.callbackParameter || 'callback'] = callbackName;
    }
    if (method.toLowerCase() !== 'get') {
      options.qs[options.methodParameter || 'method'] = method;
    }



    // handle query string
    if (options.qs) {
      url = handleQs(url, options.qs);
    }

    var script = document.createElement('script');
    var head = document.getElementsByTagName('head')[0] || document.documentElement;
    var abortTimeout;

    script.onerror = function () {
      clearTimeout(abortTimeout);
      if (callbackName in window) window[callbackName] = function () {};
      reject(new Error('JSONP request failed'));
    };
    window[callbackName] = function (result) {
      clearTimeout(abortTimeout);
      delete window[callbackName];
      resolve(result);
    };
    abortTimeout = setTimeout(function(){
      if (callbackName in window) window[callbackName] = function () {};
      reject(new Error('JSONP timed out'));
    }, options.timeout || 10000);

    script.src = url;

    // Use insertBefore instead of appendChild to circumvent an IE6 bug.
    // This arises when a base node is used (see jQuery bugs #2709 and #4378).
    head.insertBefore(script, head.firstChild);
  });
  result.getBody = function () {
    return result.then(function (res) { return res.getBody(); });
  };
  return result.nodeify(callback);
}
