'use strict';

window.TESTS_COMPLETE = false;
window.TESTS_PASSED = false;

process.exit = function (code) {
  window.TESTS_PASSED = code === 0;
  window.TESTS_COMPLETE = true;
};
