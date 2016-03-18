"use strict";
let AWS = require('aws-sdk'),
    chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    chaiAsPromised = require('chai-as-promised'),
    CloudFrontService = require('../../src/utils/cloudfrontService.js'),
    sinonAsPromised = require('sinon-as-promised');

chai.use(chaiAsPromised);

describe('When accessing cloudfrontService', function() {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe('getDistributionByCName', () => {
    it('should contain a function named getDistributionByCName', () => {
      let cloudfrontService = new CloudFrontService();

      return expect(cloudfrontService.getDistributionByCName).to.be.a('function');
    });

    it('should call listDistributions once with no params', () => {
      let client = new AWS.CloudFront({apiVersion: '2016-01-28'});
      let listDistributionsSpy = sandbox.spy(client, 'listDistributions');
      let cname = 'dev1.api.example.com';

      let cloudfrontService = new CloudFrontService({CloudFrontClient: client});

      cloudfrontService.getDistributionByCName(cname);

      expect(listDistributionsSpy.withArgs({}).calledOnce).to.be.true;
    });
  });

  describe('createOriginAndCacheBehavior', () => {
    it('should contain a function named createOriginAndCacheBehavior', () => {
      let cloudfrontService = new CloudFrontService();

      return expect(cloudfrontService.createOriginAndCacheBehavior).to.be.a('function');
    });

    it('should do no work if origin and cacheBehavior already exists', (done) => {

      //Arrange
      let client = new AWS.CloudFront({apiVersion: '2016-01-28'});
      let updateDistributionStub = sandbox.stub(client, 'updateDistribution');
      let cloudfrontService = new CloudFrontService({CloudFrontClient: client});

      let distribution = {
        Origins: {
          Items: [{
            DomainName: 'domainName',
            OriginPath: '/int',
            Id: 'expectedId'
          }],
          Quantity: 1
        },
        CacheBehaviors: {
          Items: [{
            PathPattern: '/something/*',
            TargetOriginId: 'expectedId'
          }],
          Quantity: 1
        }
      };
      let newOrigin = {
        DomainName: 'domainName',
        OriginPath: '/int',
        Id: 'expectedId'
      };
      let newCacheBehavior = {
        PathPattern: '/something/*',
        TargetOriginId: 'expectedId'
      };

      //Act
      cloudfrontService.createOriginAndCacheBehavior(distribution, newOrigin, newCacheBehavior, function(err, data) {
        expect(data.message).to.be.equal('Origin and Cache Behavior already exists in cloudfront.  No Action taken.');
        done();
      });

    });

    it('should call updateDistribution', () => {

      //Arrange
      let client = new AWS.CloudFront({apiVersion: '2016-01-28'});
      let updateDistributionStub = sandbox.stub(client, 'updateDistribution');
      let cloudfrontService = new CloudFrontService({CloudFrontClient: client});

      let distributionId = '123';
      let distributionETag = 'abc';
      let distribution = {
        Id: distributionId,
        ETag: distributionETag,
        Origins: {
          Items: [],
          Quantity: 1
        },
        CacheBehaviors: {
          Items: [],
          Quantity: 1
        }
      };
      let newOrigin = {
        DomainName: 'domainName',
        OriginPath: '/int',
        Id: 'expectedId'
      };
      let newCacheBehavior = {
        PathPattern: '/something/*',
        TargetOriginId: 'expectedId'
      };

      //Act
      cloudfrontService.createOriginAndCacheBehavior(distribution, newOrigin, newCacheBehavior, function(err, data) {});

      //Assert
      expect(updateDistributionStub.args[0][0].Id).to.be.equal(distributionId);
      expect(updateDistributionStub.args[0][0].DistributionConfig).to.be.equal(distribution);
      expect(updateDistributionStub.args[0][0].IfMatch).to.be.equal(distributionETag);

    });

    it('should remove unnecessary properties from distribution before updating', () => {
      //Arrange
      let client = new AWS.CloudFront({apiVersion: '2016-01-28'});
      let updateDistributionStub = sandbox.stub(client, 'updateDistribution');
      let cloudfrontService = new CloudFrontService({CloudFrontClient: client});

      let distributionId = '123';
      let distributionETag = 'abc';
      let distribution = {
        Id: distributionId,
        Status: 'abc',
        LastModifiedTime: '',
        DomainName: '',
        ETag: distributionETag,
        Origins: {
          Items: [],
          Quantity: 1
        },
        CacheBehaviors: {
          Items: [],
          Quantity: 1
        }
      };
      let newOrigin = {
        DomainName: 'domainName',
        OriginPath: '/int',
        Id: 'expectedId'
      };
      let newCacheBehavior = {
        PathPattern: '/something/*',
        TargetOriginId: 'expectedId'
      };

      //Act
      cloudfrontService.createOriginAndCacheBehavior(distribution, newOrigin, newCacheBehavior, function(err, data) {});

      //Assert
      let distributionConfig = updateDistributionStub.args[0][0].DistributionConfig;
      expect(distributionConfig.Id).to.be.undefined;
      expect(distributionConfig.Status).to.be.undefined;
      expect(distributionConfig.LastModifiedTime).to.be.undefined;
      expect(distributionConfig.DomainName).to.be.undefined;
      expect(distributionConfig.ETag).to.be.undefined;
    });
  });

});
