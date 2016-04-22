"use strict";
let deployUtils = require('./utils/deployUtils.js');
let environmentConstants = require('./constants.js');
let SwaggerImporter = require('./utils/SwaggerImporter.js');
let FileSystemPromise = require('./utils/FileSystemPromise.js');

module.exports = function() {
  return {
    deployUtils: deployUtils,
    deployUtilsClass: deployUtils,
    swaggerImporterClass: SwaggerImporter,
    fileSystemPromise: FileSystemPromise,
    fileSystemPromiseClass: FileSystemPromise,
    constants: environmentConstants
  };
}();
