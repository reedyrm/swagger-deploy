"use strict";
let deployUtils = require('./utils/deployUtils.js');
let environmentConstants = require('./constants.js');


module.exports = function() {
  return {
    deployUtils: deployUtils,
    deployUtilsClass: deployUtils,
    constants: environmentConstants
  };
}();
