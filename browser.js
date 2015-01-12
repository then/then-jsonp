'use strict';

var Promise = require('promise');
var handleQs = require('then-request/lib/handle-qs.js');

var jsonpID = 0;

var queues = {};

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

    if (queues[callbackName]) {
      queues[callbackName].push(run);
    } else {
      queues[callbackName] = [];
      run();
    }

    function run() {
      // handle query string
      if (options.qs) {
        url = handleQs(url, options.qs);
      }

      var script = document.createElement('script');
      var head = document.getElementsByTagName('head')[0] || document.documentElement;
      var abortTimeout;
      var done = false;
      function onComplete(success) {
        if (!done) {
          done = true;
          script.onload = script.onreadystatechange = script.onerror = null;
          clearTimeout(abortTimeout);
          if (callbackName in window) {
            if (success) delete window[callbackName];
            else window[callbackName] = function () {};
          }
          if (script && script.parentNode) {
            script.parentNode.removeChild(script);
          }
          if (queues[callbackName].length) queues[callbackName].shift()();
          else delete queues[callbackName];
        }
      }
      script.onload = script.onreadystatechange = function () {
        if (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") {
          onComplete();
          setTimeout(function () {
            reject(new Error('JSONP callback should already have been called'));
          }, 100);
        }
      };
      script.onerror = function () {
        onComplete();
        reject(new Error('JSONP request failed'));
      };
      window[callbackName] = function (result) {
        onComplete(true);
        resolve(result);
      };
      abortTimeout = setTimeout(function(){
        onComplete();
        reject(new Error('JSONP timed out'));
      }, options.timeout || 10000);

      script.src = url;
      script.async = true;

      head.appendChild(script);
    }
  });
  result.getBody = function () {
    return result.then(function (res) { return res.getBody(); });
  };
  return result.nodeify(callback);
}
