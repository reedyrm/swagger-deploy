"use strict";
let deployUtils = require('./utils/deployUtils.js');
let environmentConstants = require('./constants.js');
let FileSystemPromise = require('./utils/FileSystemPromise.js');

module.exports = function() {
  return {
    deployUtils: deployUtils,
    deployUtilsClass: deployUtils,
    fileSystemPromise: FileSystemPromise,
    fileSystemPromiseClass: FileSystemPromise,
    constants: environmentConstants
  };
}();
