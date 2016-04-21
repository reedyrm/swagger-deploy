"use strict";

let AWS = require('aws-sdk'),
    __ = require('lodash'),
    uuid = require('node-uuid'),
    Promise = require('bluebird');

class CloudFrontService {
  constructor(options) {
    let opts = options || {};
    let accessKey = opts.accessKey || '';
    let secretKey = opts.secretKey || '';

    let cloudfrontParams = {
      apiVersion: '2016-01-28',
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    };

    this._cloudfrontClient = opts.CloudFrontClient || new AWS.CloudFront(cloudfrontParams);
  }

  getDistributionByCName(cname, callback) {
    console.log('Executing getDistributionByCName.');
    let params = {};

    let findDistribution = (data) => {
      let distributionList = data.DistributionList.Items;
      let result = __.find(distributionList, function (obj) {
        return obj.Aliases.Quantity > 0 && __.includes(obj.Aliases.Items, cname);
      });

      return result;
    };

    let lookupDistributionSummary = (distribution) =>  {
      return new Promise((resolve, reject) => {
        if(typeof(distribution) === 'undefined') resolve(distribution);
        else {
          this._cloudfrontClient.getDistributionConfig({Id: distribution.Id}, function (err, data) {
            if (err) reject(err, null);
            else {
              data.DistributionConfig.Id = distribution.Id;
              data.DistributionConfig.ETag = data.ETag;
              resolve(data.DistributionConfig);
            }
          })
        }
      }).bind(this);
    };

    return new Promise((resolve, reject) => {
      this._cloudfrontClient.listDistributions(params, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      })
    }).then(findDistribution)
      .tap((distribution) => {
        if (typeof(distribution) === 'undefined') console.log(`Distribution not found! [CNAME: ${cname}]`);
        else console.log(`Distribution found! [CNAME: ${cname}]`);
      })
      .then(lookupDistributionSummary)
      .catch(err => console.error(err))
      .asCallback(callback);
  }

  createOriginAndCacheBehavior(distribution, newOrigin, newCacheBehavior, callback) {
    console.log('Executing createOriginAndCacheBehavior.');


    if(__.isUndefined(distribution.Origins)) {
      distribution.Origins = {
        Items: [],
        Quantity: 0
      };
    }

    if(__.isUndefined(distribution.CacheBehaviors)) {
      distribution.CacheBehaviors = {
        Items: [],
        Quantity: 0
      };
    }

    console.log('Checking if origin and cacheBehavior already exists.');
    if(doesOriginAlreadyExists(distribution, newOrigin) && doesCacheBehaviorAlreadyExists(distribution, newCacheBehavior)) {
      callback(null, {message: 'Origin and Cache Behavior already exists in cloudfront.  No Action taken.'});
      return;
    }
    else {
      console.log('Origin and CacheBehavior dont exist.');
    }

    distribution.Origins.Items.push(newOrigin);
    distribution.Origins.Quantity++;


    distribution.CacheBehaviors.Items.push(newCacheBehavior);
    distribution.CacheBehaviors.Quantity++;

    console.log('Removing unnecessary items from distribution.');
    let distributionId = distribution.Id;
    let distributionETag = distribution.ETag;
    delete distribution.Id;
    delete distribution.Status;
    delete distribution.LastModifiedTime;
    delete distribution.DomainName;
    delete distribution.ETag;

    let params = {
      'Id': distributionId,
      'DistributionConfig': distribution,
      'IfMatch': distributionETag
    };


    console.log(`Params: ${JSON.stringify(params)}`);
    this._cloudfrontClient.updateDistribution(params, function(err, data) {
      if(err) callback(err, null);
      else callback(null, data);
    });
  }
}

let doesOriginAlreadyExists = function(distribution, newOrigin) {

  if(distribution.Origins.Items.length <= 0) {
    return false;
  }

  let result = __.find(distribution.Origins.Items, function (obj) {
    return obj.DomainName === newOrigin.DomainName &&
           obj.OriginPath === newOrigin.OriginPath &&
           obj.Id === newOrigin.Id;
  });

  return !__.isUndefined(result);
};

let doesCacheBehaviorAlreadyExists = function(distribution, newCacheBehavior) {

  if(distribution.CacheBehaviors.Items.length <= 0) {
    return false;
  }

  let result = __.find(distribution.CacheBehaviors.Items, function (obj) {
    return obj.PathPattern === newCacheBehavior.PathPattern &&
           obj.TargetOriginId === newCacheBehavior.TargetOriginId;
  });

  return !__.isUndefined(result);
};

module.exports = CloudFrontService;
