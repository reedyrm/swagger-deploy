"use strict";
let deployUtils = require('./utils/deployUtils.js');


module.exports = function() {
  return {
    deployUtils: deployUtils,
    deployUtilsClass: deployUtils
  }
}();
