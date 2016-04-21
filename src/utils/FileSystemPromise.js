"use strict";

let Promise = require("bluebird");
const util = require('util');
let fs = require("fs");
Promise.promisifyAll(fs);

/**
 * FileSystemPromise class is a bluebird promise wrapper for fs.
 * There is an encodingType, which is defaulted to 'utf8'
 */
class FileSystemPromise {
  constructor() {
    this.encodingType = "utf8";
  }

  /**
   * saves an entity object to a file
   * @param {string} filePathAndName
   * @param {object} entity
   * @return {Promise}
   */
  save(filePathAndName, entity) {
    if (filePathAndName === undefined || filePathAndName === null || filePathAndName == '') {
      throw new Error("filePathAndName cannot be undefined, null, or empty.");
    }

    var data = JSON.stringify(entity);

    //promisifyAll creates a writeFileAsync method, which is created by bluebird
    return fs.writeFileAsync(filePathAndName, data, this.encodingType);
  }

  /**
   * gets data from file and serializes it as an Object
   * @param {string} filePathAndName
   * @return {Promise}
   * @throws {Error} with filePathAndName is null, undefined or empty string
   */
  get(filePathAndName) {
    var entityData = {};
    if (filePathAndName === undefined || filePathAndName === null || filePathAndName == '') {
      throw new Error("filePathAndName cannot be undefined, null, or empty.");
    }

    return this.fileSystemObjectExists(filePathAndName).then((exists) => {
      if (!exists) {
        return Promise.resolve(null);
      }
      else {
        //promisifyAll creates a readFileAsync method, which is created by bluebird
        return fs.readFileAsync(filePathAndName, this.encodingType).then((data) => {
          return Promise.resolve(JSON.parse(data));
        }).catch((error) => {
          console.error(error);
          //returns new collection item
          return Promise.resolve(entityData);
        });
      }
    });
  }

  /**
   *
   * @param {string} filePathAndName
   * @return {Promise<boolean>}
   */
  fileSystemObjectExists(filePathAndName) {
    if (filePathAndName === undefined || filePathAndName === null || filePathAndName == '') {
      return Promise.resolve(false);
    }

    //console.log(filePathAndName);
    return fs.statAsync(filePathAndName).then((stats) => {
      return Promise.resolve(true);

    }).catch((error) => {
      //console.error(error);
      return Promise.resolve(false);
    });
  }

  /**
   *
   * @param {string} filePathAndName
   * @return {Promise}
   * @throws {Error} if there is a possible problem with @fileSystemObjectExists promise check
   */
  deleteFileSystemObject(filePathAndName) {
    if (filePathAndName === undefined || filePathAndName === null || filePathAndName == '') {
      return Promise.resolve(false);
    }

    return this.fileSystemObjectExists(filePathAndName).then((exists) => {
      //console.log(filePathAndName);
      //console.log(exists);
      if (exists) {
        return fs.unlinkAsync(filePathAndName).then(() => {
          return Promise.resolve(true);
        }).catch((error) => {
          return Promise.resolve(false);
        });
      }
      else {
        return Promise.resolve(true);
      }

    }).catch((error) => {
      //console.log(error);
      return Promise.reject(error);
    });
  }
}

module.exports = FileSystemPromise;
