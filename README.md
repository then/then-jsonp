# then-jsonp

Easy jsonp client for browser and node.js

[![Build Status](https://img.shields.io/travis/then/then-jsonp/master.svg)](https://travis-ci.org/then/then-jsonp)
[![Dependency Status](https://img.shields.io/gemnasium/then/then-jsonp.svg)](https://gemnasium.com/then/then-jsonp)
[![NPM version](https://img.shields.io/npm/v/then-jsonp.svg)](https://www.npmjs.org/package/then-jsonp)

[![Sauce Test Status](https://saucelabs.com/browser-matrix/then-jsonp-ci.svg)](https://saucelabs.com/u/then-jsonp-ci)

## Installation

    npm install then-jsonp

## Usage

```js
var request = require('then-jsonp');

// with promises
var result = request('GET', 'http://example.com/foo/bar');
result.done(function (res) {
  console.dir(res);
});

// with callbacks
request('GET', 'http://example.com/foo/bar', function (err, res) {
  if (err) throw err;
  console.dir(res);
});
```

**Method:**

If this is anything other than `'GET'` it gets added to the querystring as `method=METHOD`.  The actual request is always a GET request.  In the browser it's added as a `<script>` tag, on the server it uses `then-request` then evalutates the result in a vm.

**URL:**

The url to request.

**Options:**

 - `qs` - an object containing querystring values to be appended to the uri.
 - `json` - an object containing values to be merged into `qs`.
 - `callbackName` - The name of the callback to use, by default it will auto generate a new callback for each request of the form `then_jsonp_{n}`.
 - `callbackParameter` - The name to use to put the parameter in the querysting.  Defaults to `callback`.  Set it to `false` to not include the parameter at all.
 - `methodParameter` - The parameter to add the method, when the method is not `GET`.
 - `skipJsonpOnServer` - set this to `true` to use `then-request` instead of `then-jsonp` when running server side.

## License

  MIT
