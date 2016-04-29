"use strict";
let chai = require('chai'),
  Promise = require('bluebird'),
  expect = chai.expect,
  sinon = require('sinon'),
  chaiAsPromised = require('chai-as-promised'),
  uuid = require("node-uuid"),
  CloudFrontService = require('../../src/utils/cloudfrontService.js'),
  module = require('../../src/index.js');

chai.use(chaiAsPromised);

describe('When accessing deployUtils class', function () {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('should default accessKey to empty string if no value provided', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils._accessKey).to.be.equal('');
  });

  it('should set accessKey to value passed in', () => {
    let params = {accessKey: 'ABCD'};
    let DeployUtils = new module.deployUtilsClass(params);

    expect(DeployUtils._accessKey).to.be.equal(params.accessKey);
  });

  it('should default secretKey to empty string if no value provided', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils._secretKey).to.be.equal('');
  });

  it('should set secretKey to value passed in', () => {
    let params = {secretKey: '12345'};
    let DeployUtils = new module.deployUtilsClass(params);

    expect(DeployUtils._secretKey).to.be.equal(params.secretKey);
  });

  it('should default region to empty string if no value provided', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils._region).to.be.equal('');
  });

  it('should set region to value passed in', () => {
    let params = {region: 'us-east-1'};
    let DeployUtils = new module.deployUtilsClass(params);

    expect(DeployUtils._region).to.be.equal(params.region);
  });

  it('should have a function for deployApiGatewayToInt', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.deployApiGatewayToInt).to.be.a('function');
  });

  it('should have a function for deployApiGatewayToProd', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.deployApiGatewayToProd).to.be.a('function');
  });

  it('should have a function for lookupApiGatewayByName', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.lookupApiGatewayByName).to.be.a('function');
  });

  it('should have a function for configureApiGatewaySettingsForInt', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.configureApiGatewaySettingsForInt).to.be.a('function');
  });

  it('should have a function for configureApiGatewaySettingsForSandbox', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.configureApiGatewaySettingsForSandbox).to.be.a('function');
  });

  it('should have a function for configureApiGatewaySettingsForProd', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.configureApiGatewaySettingsForProd).to.be.a('function');
  });

  it('should have a function for createStageVariable', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.createStageVariable).to.be.a('function');
  });

  it('should have a function for findApiBasePathMapping', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.findApiBasePathMapping).to.be.a('function');
  });

  it('should have a function for createBasePathMapping', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.createBasePathMapping).to.be.a('function');
  });

  it('should have a function for createApiGateway', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.createApiGateway).to.be.a('function');
  });

  it('should have a function for updateAndDeployToIntStage', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.updateAndDeployToIntStage).to.be.a('function');
  });

  it('should have a function for runIntegrationTest', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.runIntegrationTest).to.be.a('function');
  });

  it('should have a function for createDirectoryIfNotExist', () => {
    let DeployUtils = new module.deployUtilsClass({});

    expect(DeployUtils.createDirectoryIfNotExist).to.be.a('function');
  });

  describe('connectGatewayToCloudFrontForIntStage', () => {

    it('should have a function for connectGatewayToCloudFrontForIntStage', () => {
      let DeployUtils = new module.deployUtilsClass({});

      expect(DeployUtils.connectGatewayToCloudFrontForIntStage).to.be.a('function');
    });

    it('should pass expected origin object to createOriginAndCacheBehavior', () => {

      //Arrange
      let service = new CloudFrontService({});
      let stub = sandbox.stub(service, 'getDistributionByCName', () => {
        console.log('getDistribution here');
        return Promise.resolve({id: "123"});
      });
      let createOriginAndCacheBehaviorStub = sandbox.stub(service, 'createOriginAndCacheBehavior');

      let DeployUtils = new module.deployUtilsClass({cloudfrontService: service});

      let params = {
        apiGatewayId: '3sh6vuhnvg',
        originName: 'Registration API Gateway Int Stage',
        cname: 'dev1.api.material.com',
        gatewayPathRegex: '/registration/*'
      };

      //Act
      let resultPromise = DeployUtils.connectGatewayToCloudFrontForIntStage(params);

      //Assert
      return resultPromise.then(() => {
        expect(createOriginAndCacheBehaviorStub.calledOnce).to.be.true;

        let parameters = createOriginAndCacheBehaviorStub.args[0];
        let originDefintion = parameters[1];
        expect(originDefintion.DomainName).to.be.equal(`${params.apiGatewayId}.execute-api.us-east-1.amazonaws.com`);
        expect(originDefintion.OriginPath).to.be.equal('/int');
        expect(originDefintion.Id).to.be.equal(params.originName);
      });
    });


    it('should use default cname if none provided', () => {

      //Arrange
      let service = new CloudFrontService({});
      let stub = sandbox.stub(service, 'getDistributionByCName', () => {
        console.log('getDistribution here');
        return Promise.resolve({id: "123"});
      });
      let createOriginAndCacheBehaviorStub = sandbox.stub(service, 'createOriginAndCacheBehavior');

      let DeployUtils = new module.deployUtilsClass({cloudfrontService: service});

      let params = {
        apiGatewayId: '3sh6vuhnvg',
        originName: 'Registration API Gateway Prod Stage',
        gatewayPathRegex: '/registration/*'
      };

      //Act
      let resultPromise = DeployUtils.connectGatewayToCloudFrontForIntStage(params);

      //Assert
      return resultPromise.then(() => {
        expect(stub.args[0][0]).to.be.equal('dev.api.material.com');
      });
    });

    it('should pass expected cacheBehavior object to createOriginAndCacheBehavior', () => {

      //Arrange
      let service = new CloudFrontService({});
      let stub = sandbox.stub(service, 'getDistributionByCName', () => {
        console.log('getDistribution here');
        return Promise.resolve({id: "123"});
      });
      let createOriginAndCacheBehaviorStub = sandbox.stub(service, 'createOriginAndCacheBehavior');

      let DeployUtils = new module.deployUtilsClass({cloudfrontService: service});

      let params = {
        apiGatewayId: '3sh6vuhnvg',
        originName: 'Registration API Gateway Int Stage',
        cname: 'dev1.api.material.com',
        gatewayPathRegex: '/registration/*'
      };

      //Act
      let resultPromise = DeployUtils.connectGatewayToCloudFrontForIntStage(params);

      //Assert
      return resultPromise.then(() => {
        expect(createOriginAndCacheBehaviorStub.calledOnce).to.be.true;

        let parameters = createOriginAndCacheBehaviorStub.args[0];
        let cacheBehaviorDefinition = parameters[2];
        expect(cacheBehaviorDefinition.PathPattern).to.be.equal(params.gatewayPathRegex);
        expect(cacheBehaviorDefinition.TargetOriginId).to.be.equal(params.originName);
      });
    });

    it('should generate originId if originName is not passed in', () => {

      //Arrange
      let service = new CloudFrontService({});
      let stub = sandbox.stub(service, 'getDistributionByCName', () => {
        console.log('getDistribution here');
        return Promise.resolve({id: "123"});
      });
      let createOriginAndCacheBehaviorStub = sandbox.stub(service, 'createOriginAndCacheBehavior');

      let DeployUtils = new module.deployUtilsClass({cloudfrontService: service});

      let params = {
        apiGatewayId: '3sh6vuhnvg',
        cname: 'dev1.api.material.com',
        gatewayPathRegex: '/registration/*'
      };

      //Act
      let resultPromise = DeployUtils.connectGatewayToCloudFrontForIntStage(params);

      //Assert
      return resultPromise.then(() => {
        expect(createOriginAndCacheBehaviorStub.calledOnce).to.be.true;

        let parameters = createOriginAndCacheBehaviorStub.args[0];
        let originDefintion = parameters[1];
        let cacheBehaviorDefinition = parameters[2];
        expect(cacheBehaviorDefinition.TargetOriginId).to.be.equal(originDefintion.Id);
      });
    });

    it('should return and do no work if distribution not found', () => {

      //Arrange
      let service = new CloudFrontService({});
      let stub = sandbox.stub(service, 'getDistributionByCName', () => {
        console.log('getDistribution here');
        return Promise.resolve({});
      });
      let createOriginAndCacheBehaviorStub = sandbox.stub(service, 'createOriginAndCacheBehavior');

      let DeployUtils = new module.deployUtilsClass({cloudfrontService: service});

      let params = {
        apiGatewayId: '3sh6vuhnvg',
        cname: 'dev1.api.material.com',
        gatewayPathRegex: '/registration/*'
      };

      //Act
      let resultPromise = DeployUtils.connectGatewayToCloudFrontForIntStage(params);

      //Assert
      return resultPromise.catch(() => {
        expect(resultPromise.isRejected()).to.be.true;
      });
    });
  });

  describe('connectGatewayToCloudFrontForProdStage', () => {

    it('should have a function for connectGatewayToCloudFrontForProdStage', () => {
      let DeployUtils = new module.deployUtilsClass({});

      expect(DeployUtils.connectGatewayToCloudFrontForProdStage).to.be.a('function');
    });

    it('should pass expected origin object to createOriginAndCacheBehavior', () => {

      //Arrange
      let service = new CloudFrontService({});
      let stub = sandbox.stub(service, 'getDistributionByCName', () => {
        console.log('getDistribution here');
        return Promise.resolve({id: "123"});
      });
      let createOriginAndCacheBehaviorStub = sandbox.stub(service, 'createOriginAndCacheBehavior');

      let DeployUtils = new module.deployUtilsClass({cloudfrontService: service});

      let params = {
        apiGatewayId: '3sh6vuhnvg',
        originName: 'Registration API Gateway Prod Stage',
        cname: 'dev1.api.material.com',
        gatewayPathRegex: '/registration/*'
      };

      //Act
      let resultPromise = DeployUtils.connectGatewayToCloudFrontForProdStage(params);

      //Assert
      return resultPromise.then(() => {
        expect(createOriginAndCacheBehaviorStub.calledOnce).to.be.true;

        let parameters = createOriginAndCacheBehaviorStub.args[0];
        let originDefintion = parameters[1];
        expect(originDefintion.DomainName).to.be.equal(`${params.apiGatewayId}.execute-api.us-east-1.amazonaws.com`);
        expect(originDefintion.OriginPath).to.be.equal('/prod');
        expect(originDefintion.Id).to.be.equal(params.originName);
      });
    });

    it('should use default cname if none provided', () => {

      //Arrange
      let service = new CloudFrontService({});
      let stub = sandbox.stub(service, 'getDistributionByCName', () => {
        console.log('getDistribution here');
        return Promise.resolve({id: "123"});
      });
      let createOriginAndCacheBehaviorStub = sandbox.stub(service, 'createOriginAndCacheBehavior');

      let DeployUtils = new module.deployUtilsClass({cloudfrontService: service});

      let params = {
        apiGatewayId: '3sh6vuhnvg',
        originName: 'Registration API Gateway Prod Stage',
        gatewayPathRegex: '/registration/*'
      };

      //Act
      let resultPromise = DeployUtils.connectGatewayToCloudFrontForProdStage(params);

      //Assert
      return resultPromise.then(() => {
        expect(stub.args[0][0]).to.be.equal('api.material.com');
      });
    });

    it('should pass expected cacheBehavior object to createOriginAndCacheBehavior', () => {

      //Arrange
      let service = new CloudFrontService({});
      let stub = sandbox.stub(service, 'getDistributionByCName', () => {
        console.log('getDistribution here');
        return Promise.resolve({id: "123"});
      });
      let createOriginAndCacheBehaviorStub = sandbox.stub(service, 'createOriginAndCacheBehavior');

      let DeployUtils = new module.deployUtilsClass({cloudfrontService: service});

      let params = {
        apiGatewayId: '3sh6vuhnvg',
        originName: 'Registration API Gateway Prod Stage',
        cname: 'dev1.api.material.com',
        gatewayPathRegex: '/registration/*'
      };

      //Act
      let resultPromise = DeployUtils.connectGatewayToCloudFrontForProdStage(params);

      //Assert
      return resultPromise.then(() => {
        expect(createOriginAndCacheBehaviorStub.calledOnce).to.be.true;

        let parameters = createOriginAndCacheBehaviorStub.args[0];
        let cacheBehaviorDefinition = parameters[2];
        expect(cacheBehaviorDefinition.PathPattern).to.be.equal(params.gatewayPathRegex);
        expect(cacheBehaviorDefinition.TargetOriginId).to.be.equal(params.originName);
      });
    });

    it('should generate originId if originName is not passed in', () => {

      //Arrange
      let service = new CloudFrontService({});
      let stub = sandbox.stub(service, 'getDistributionByCName', () => {
        console.log('getDistribution here');
        return Promise.resolve({id: "123"});
      });
      let createOriginAndCacheBehaviorStub = sandbox.stub(service, 'createOriginAndCacheBehavior');

      let DeployUtils = new module.deployUtilsClass({cloudfrontService: service});

      let params = {
        apiGatewayId: '3sh6vuhnvg',
        cname: 'dev1.api.material.com',
        gatewayPathRegex: '/registration/*'
      };

      //Act
      let resultPromise = DeployUtils.connectGatewayToCloudFrontForProdStage(params);

      //Assert
      return resultPromise.then(() => {
        expect(createOriginAndCacheBehaviorStub.calledOnce).to.be.true;

        let parameters = createOriginAndCacheBehaviorStub.args[0];
        let originDefintion = parameters[1];
        let cacheBehaviorDefinition = parameters[2];
        expect(cacheBehaviorDefinition.TargetOriginId).to.be.equal(originDefintion.Id);
      });
    });

    it('should return and do no work if distribution not found', () => {

      //Arrange
      let service = new CloudFrontService({});
      let stub = sandbox.stub(service, 'getDistributionByCName', () => {
        console.log('getDistribution here');
        return Promise.resolve({});
      });
      let createOriginAndCacheBehaviorStub = sandbox.stub(service, 'createOriginAndCacheBehavior');

      let DeployUtils = new module.deployUtilsClass({cloudfrontService: service});

      let params = {
        apiGatewayId: '3sh6vuhnvg',
        cname: 'dev1.api.material.com',
        gatewayPathRegex: '/registration/*'
      };

      //Act
      let resultPromise = DeployUtils.connectGatewayToCloudFrontForProdStage(params);

      //Assert
      return resultPromise.catch(() => {
        expect(resultPromise.isRejected()).to.be.true;
      });
    });
  });

  describe("should overwrite swagger", () => {
    let deployUtilOptions, apiId;

    beforeEach(() => {
      apiId = uuid();

      deployUtilOptions = {
        region: uuid(),
        accessKey: uuid(),
        secretKey: uuid()
      };
    });

    afterEach(() => {
      deployUtilOptions = null;
      apiId = null;
    });

    it("should overwrite swagger", (done) => {
      this.timeout(3000);

      var aws = {
        putRestApi : () => {}
      };

      var expected = {
        id : uuid(),
        name: uuid(),
        createdDate: new Date()
      };

      let putRestApiStub = sinon.stub(aws, "putRestApi", (opts, callback) => {
          callback(null, expected);
      });

      deployUtilOptions["apiGateway"] = aws;

      let deployUtils = new module.deployUtilsClass(deployUtilOptions);

      deployUtils.overwriteSwagger(apiId, deployUtilOptions).then((data) => {

        expect(data.id).to.equal(expected.id);
        expect(data.name).to.equal(expected.name);
        expect(data.createdDate).to.equal(expected.createdDate);

        var restApiStub = putRestApiStub.args[0][0];
        console.log(restApiStub);

        expect(restApiStub.restApiId).to.equal(apiId);
        expect(restApiStub.body).to.equal(JSON.stringify(deployUtilOptions));
        expect(restApiStub.failOnWarnings).to.equal(false);
        expect(restApiStub.mode).to.equal("overwrite");

        done();
      }).catch((error)=> {
        console.error(error);
        expect(error).to.be.null;
        done();
      });
    });

    it("should reject promise", (done) => {
      this.timeout(3000);

      var aws = {
        putRestApi : () => {}
      };

      let putRestApiStub = sinon.stub(aws, "putRestApi", (opts, callback) => {
        callback("Test", null);
      });

      deployUtilOptions["apiGateway"] = aws;

      let deployUtils = new module.deployUtilsClass(deployUtilOptions);
      deployUtils.overwriteSwagger(apiId, deployUtilOptions).then((data) => {
        // should never get here
        expect(data).to.equal(true);
        done();
      }).catch((error) => {
        console.log(error);
        expect(error).to.equal("Test");

        var restApiStub = putRestApiStub.args[0][0];
        console.log(restApiStub);

        expect(restApiStub.restApiId).to.equal(apiId);
        expect(restApiStub.body).to.equal(JSON.stringify(deployUtilOptions));
        expect(restApiStub.failOnWarnings).to.equal(false);
        expect(restApiStub.mode).to.equal("overwrite");

        done();
      });
    });
  });

  describe("should create swagger", () => {
    let deployUtilOptions, apiId;

    beforeEach(() => {
      apiId = uuid();

      deployUtilOptions = {
        region: uuid(),
        accessKey: uuid(),
        secretKey: uuid()
      };
    });

    afterEach(() => {
      deployUtilOptions = null;
      apiId = null;
    });

    it("should create swagger", (done) => {
      this.timeout(3000);

      var aws = {
        importRestApi: () => {
        }
      };

      var expected = {
        id: uuid(),
        name: uuid(),
        createdDate: new Date()
      };

      let putRestApiStub = sinon.stub(aws, "importRestApi", (opts, callback) => {
        callback(null, expected);
      });

      deployUtilOptions["apiGateway"] = aws;

      let deployUtils = new module.deployUtilsClass(deployUtilOptions);

      var mockSwagger = {info: {title: `title: ${expected.name}`}};

      deployUtils.createSwagger(mockSwagger).then((data) => {
        expect(data.id).to.equal(expected.id);
        expect(data.name).to.equal(expected.name);
        expect(data.createdDate).to.equal(expected.createdDate);

        var restApiStub = putRestApiStub.args[0][0];
        console.log(restApiStub);

        expect(restApiStub.body).to.equal(JSON.stringify(mockSwagger));
        expect(restApiStub.failOnWarnings).to.equal(false);

        done();
      }).catch((error)=> {
        console.error(error);
        expect(error).to.be.null;
        done();
      });
    });

    it("should reject promise", (done) => {
      this.timeout(3000);

      var aws = {
        importRestApi : () => {}
      };

      var expected = {
        id: uuid(),
        name: uuid(),
        createdDate: new Date()
      };

      var mockSwagger = {info: {title: `title: ${expected.name}`}};

      let putRestApiStub = sinon.stub(aws, "importRestApi", (opts, callback) => {
        callback("Test", null);
      });

      deployUtilOptions["apiGateway"] = aws;

      let deployUtils = new module.deployUtilsClass(deployUtilOptions);
      deployUtils.createSwagger(mockSwagger).then((data) => {
        // should never get here
        expect(data).to.equal(true);
        done();
      }).catch((error) => {
        console.log(error);
        expect(error).to.equal("Test");

        var restApiStub = putRestApiStub.args[0][0];
        console.log(restApiStub);

        expect(restApiStub.body).to.equal(JSON.stringify(mockSwagger));
        expect(restApiStub.failOnWarnings).to.equal(false);

        done();
      });
    });
  });
});
