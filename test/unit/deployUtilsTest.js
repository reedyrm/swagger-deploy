"use strict";
let chai = require('chai'),
  Promise = require('bluebird'),
  expect = chai.expect,
  sinon = require('sinon'),
  chaiAsPromised = require('chai-as-promised'),
  uuid = require("node-uuid"),
  CloudFrontService = require('../../src/utils/cloudfrontService.js'),
  module = require('../../src/index.js'),
  moment = require('moment'),
  gulpUtil = require('gulp-util'),
  util = require("util"),
  fileSystem = module.fileSystemPromise;

chai.use(chaiAsPromised);

let getRandomIntInclusive = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

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

  it("should assign properties to a new ApiGateway", () => {
    let params = {
      apiVersion: '2015-07-09',
      accessKey: uuid(),
      secretKey: uuid(),
      region: uuid(),
      sslEnabled: false
    };

    let deploy = new module.deployUtilsClass(params);

    var apiGateway = deploy._apiGateway;

    expect(apiGateway).to.not.be.null;

    expect(apiGateway.config.apiVersion).to.equal(params.apiVersion);
    expect(apiGateway.config.accessKeyId).to.equal(params.accessKey);
    expect(apiGateway.config.region).to.equal(params.region);
    expect(apiGateway.config.secretAccessKey).to.equal(params.secretKey);
    expect(apiGateway.config.sslEnabled).to.equal(params.sslEnabled);
  });

  it('sslEnabled should be true when nothing supplied', () => {
    let params = {
      accessKey: uuid(),
      secretKey: uuid(),
      region: uuid()
    };

    let deploy = new module.deployUtilsClass(params);

    var apiGateway = deploy._apiGateway;

    expect(apiGateway).to.not.be.null;

    expect(apiGateway.config.sslEnabled).to.equal(true);
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

  describe("and creating stage variables", () => {
    let deployUtilOptions, apiId, stageName, stageFullName, expectedParams, deployUtils;
    let apiGatewayPropertyName = "apiGateway";

    beforeEach(() => {
      apiId = uuid();
      stageName = uuid();
      stageFullName = uuid();

      deployUtilOptions = {
        region: uuid(),
        accessKey: uuid(),
        secretKey: uuid()
      };

      expectedParams = {
        restApiId: apiId,
        stageName: stageName,
        cacheClusterEnabled: false,
        patchOperations: []
      }
    });

    afterEach(() => {
      deployUtilOptions = null;
      apiId = null;
      stageName = null;
      stageFullName = null;
      expectedParams = null;
      deployUtils = null;
    });

    describe("and no stage name", () => {
      it("and null, should reject", () => {
        deployUtils = new module.deployUtilsClass({});
        return deployUtils.createStageVariables(null, null, null).catch((err) => {
          expect(err).to.equal("stageName must be populated");
        });
      });

      it("and undefined, should reject", () => {
        deployUtils = new module.deployUtilsClass({});
        return deployUtils.createStageVariables(undefined, null, null).catch((err) => {
          expect(err).to.equal("stageName must be populated");
        });
      });

      it("and empty string, should reject", () => {
        deployUtils = new module.deployUtilsClass({});
        return deployUtils.createStageVariables('', null, null).catch((err) => {
          expect(err).to.equal("stageName must be populated");
        });
      });
    });

    describe("and no rest api id", () => {
      it("and null, should reject", () => {
        deployUtils = new module.deployUtilsClass({});
        return deployUtils.createStageVariables(uuid(), null, null).catch((err) => {
          expect(err).to.equal("restApiId must be populated");
        });
      });

      it("and undefined, should reject", () => {
        deployUtils = new module.deployUtilsClass({});
        return deployUtils.createStageVariables(uuid(), undefined, null).catch((err) => {
          expect(err).to.equal("restApiId must be populated");
        });
      });

      it("and empty string, should reject", () => {
        deployUtils = new module.deployUtilsClass({});
        return deployUtils.createStageVariables(uuid(), '', null).catch((err) => {
          expect(err).to.equal("restApiId must be populated");
        });
      });
    });

    describe("and no stage variables", () => {
      beforeEach(() => {
        deployUtilOptions[apiGatewayPropertyName] = {
          updateStage: () => {
          }
        };

        deployUtils = new module.deployUtilsClass(deployUtilOptions);
      });

      describe("and null, undefined, or empty collection", () => {
        it("and null, it should return reject", () => {
          this.timeout(3000);

          return deployUtils.createStageVariables(uuid(), apiId, null).then((data) => {
            expect(true).to.equal(false); //force this to blow up because it should be here
          }).catch((error) => {
            expect(error).to.equal("variableCollection must be populated");
          });
        });

        it("and undefined, it should return reject", () => {
          this.timeout(3000);

          return deployUtils.createStageVariables(uuid(), apiId, undefined).then((data) => {
            expect(true).to.equal(false); //force this to blow up because it should be here
          }).catch((error) => {
            expect(error).to.equal("variableCollection must be populated");
          });
        });

        it("and empty array, it should return reject", () => {
          this.timeout(3000);

          return deployUtils.createStageVariables(uuid(), apiId, []).then((data) => {
            expect(true).to.equal(false); //force this to blow up because it should be here
          }).catch((error) => {
            expect(error).to.equal("variableCollection must be populated");
          });
        });
      });
    });

    describe("and stage variables populated", () => {
      let variablesArray, updateStageStub;

      beforeEach(() => {
        variablesArray = [];
        for (let q = 0; q < 3; q++) {
          var variableItem = {
            stageVariableName: uuid(),
            stageVariableValue: `value${uuid()}`
          };

          variablesArray.push(variableItem);

          var variableItemTransform = {
            op: 'replace',
            path: `/variables/${variableItem.stageVariableName}`,
            value: variableItem.stageVariableValue
          };

          expectedParams.patchOperations.push(variableItemTransform);
        }

        let aws = {
          updateStage: () => {
          }
        };

        deployUtilOptions[apiGatewayPropertyName] = aws;

        updateStageStub = sinon.stub(aws, "updateStage", (opts, callback) => {
          callback(null, "Test");
        });

        deployUtils = new module.deployUtilsClass(deployUtilOptions);
      });

      afterEach(() => {
        updateStageStub = null;
        variablesArray = null;
        expectedParams = null;
      });

      it("it should match expected params", () => {

        var stageName = `stageName${uuid()}`;

        return deployUtils.createStageVariables(stageName, apiId, variablesArray).then((data)=> {

          let actual = updateStageStub.args[0][0];

          expect(actual.restApiId).to.equal(apiId);
          expect(actual.stageName).to.equal(stageName);
          expect(actual.patchOperations.length).to.equal(expectedParams.patchOperations.length);

          for (let c = 0; c < expectedParams.patchOperations.length; c++) {
            expect(expectedParams.patchOperations[c].op).to.equal(actual.patchOperations[c].op);
            expect(expectedParams.patchOperations[c].path).to.equal(actual.patchOperations[c].path);
            expect(expectedParams.patchOperations[c].value).to.equal(actual.patchOperations[c].value);
          }
        }).catch((error)=> {
          console.error(error);
          expect(error).to.be.null;
        });
      });
    });
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

    it("should overwrite swagger", () => {
      this.timeout(3000);

      var aws = {
        putRestApi: () => {
        }
      };

      var expected = {
        id: uuid(),
        name: uuid(),
        createdDate: new Date()
      };

      let putRestApiStub = sinon.stub(aws, "putRestApi", (opts, callback) => {
        callback(null, expected);
      });

      deployUtilOptions["apiGateway"] = aws;

      let deployUtils = new module.deployUtilsClass(deployUtilOptions);

      return deployUtils.overwriteSwagger(apiId, deployUtilOptions).then((data) => {

        expect(data.id).to.equal(expected.id);
        expect(data.name).to.equal(expected.name);
        expect(data.createdDate).to.equal(expected.createdDate);

        var restApiStub = putRestApiStub.args[0][0];
        console.log(restApiStub);

        expect(restApiStub.restApiId).to.equal(apiId);
        expect(restApiStub.body).to.equal(JSON.stringify(deployUtilOptions));
        expect(restApiStub.failOnWarnings).to.equal(false);
        expect(restApiStub.mode).to.equal("overwrite");
      }).catch((error)=> {
        console.error(error);
        expect(error).to.be.null;
      });
    });

    it("should reject promise", () => {
      this.timeout(3000);

      var aws = {
        putRestApi: () => {
        }
      };

      let putRestApiStub = sinon.stub(aws, "putRestApi", (opts, callback) => {
        callback("Test", null);
      });

      deployUtilOptions["apiGateway"] = aws;

      let deployUtils = new module.deployUtilsClass(deployUtilOptions);
      return deployUtils.overwriteSwagger(apiId, deployUtilOptions).then((data) => {
        // should never get here
        expect(data).to.equal(true);
      }).catch((error) => {
        console.log(error);
        expect(error).to.equal("Test");

        var restApiStub = putRestApiStub.args[0][0];
        console.log(restApiStub);

        expect(restApiStub.restApiId).to.equal(apiId);
        expect(restApiStub.body).to.equal(JSON.stringify(deployUtilOptions));
        expect(restApiStub.failOnWarnings).to.equal(false);
        expect(restApiStub.mode).to.equal("overwrite");
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

    it("should create swagger", () => {
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

      return deployUtils.createSwagger(mockSwagger).then((data) => {
        expect(data.id).to.equal(expected.id);
        expect(data.name).to.equal(expected.name);
        expect(data.createdDate).to.equal(expected.createdDate);

        var restApiStub = putRestApiStub.args[0][0];
        console.log(restApiStub);

        expect(restApiStub.body).to.equal(JSON.stringify(mockSwagger));
        expect(restApiStub.failOnWarnings).to.equal(false);
      }).catch((error)=> {
        console.error(error);
        expect(error).to.be.null;
      });
    });

    it.skip("To see an actual example do the following", () => {
      let dep = new module.deployUtilsClass({
        accessKeyId: "you access key",
        secretKeyId: "your secret key",
        region: "us-east-1"
      });

      return dep.createSwagger(require("./../test-swagger.json")).then((data) => {
        console.log(data);
      }).catch((shit) => {
        console.error(shit);
      });
    });

    it("should reject promise", () => {
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

      var mockSwagger = {info: {title: `title: ${expected.name}`}};

      let putRestApiStub = sinon.stub(aws, "importRestApi", (opts, callback) => {
        callback("Test", null);
      });

      deployUtilOptions["apiGateway"] = aws;

      let deployUtils = new module.deployUtilsClass(deployUtilOptions);
      return deployUtils.createSwagger(mockSwagger).then((data) => {
        // should never get here
        expect(data).to.equal(true);
      }).catch((error) => {
        console.log(error);
        expect(error).to.equal("Test");

        var restApiStub = putRestApiStub.args[0][0];
        console.log(restApiStub);

        expect(restApiStub.body).to.equal(JSON.stringify(mockSwagger));
        expect(restApiStub.failOnWarnings).to.equal(false);
      });
    });
  });

  describe("and getting environment constants", () => {
    it("and not main full name", () => {
      let deployUtil = new module.deployUtils({});
      var environmentConstants = deployUtil.getEnvironmentConstants(uuid());

      var unknown = "UKN";
      expect(environmentConstants.FullName).to.equal(unknown);
      expect(environmentConstants.ShortName).to.equal(unknown);
      expect(environmentConstants.Host).to.equal(unknown);
    });

    it("and integration", () => {
      let deployUtil = new module.deployUtils({});
      var environmentConstants = deployUtil.getEnvironmentConstants("integration");

      expect(environmentConstants.FullName).to.equal(module.constants.env.INTEGRATION.FullName);
      expect(environmentConstants.ShortName).to.equal(module.constants.env.INTEGRATION.ShortName);
      expect(environmentConstants.Host).to.equal(module.constants.env.INTEGRATION.Host);
    });

    it("and production", () => {
      let deployUtil = new module.deployUtils({});
      var environmentConstants = deployUtil.getEnvironmentConstants("production");

      expect(environmentConstants.FullName).to.equal(module.constants.env.PRODUCTION.FullName);
      expect(environmentConstants.ShortName).to.equal(module.constants.env.PRODUCTION.ShortName);
      expect(environmentConstants.Host).to.equal(module.constants.env.PRODUCTION.Host);
    });

    it("and sandbox", () => {
      let deployUtil = new module.deployUtils({});
      var environmentConstants = deployUtil.getEnvironmentConstants("sandbox");

      expect(environmentConstants.FullName).to.equal(module.constants.env.SANDBOX.FullName);
      expect(environmentConstants.ShortName).to.equal(module.constants.env.SANDBOX.ShortName);
      expect(environmentConstants.Host).to.equal(module.constants.env.SANDBOX.Host);
    });
  });

  describe("and deployToStagingEnvironment", () => {
    describe("and no apiGatewayId", () => {
      it("should reject", () => {
        this.timeout(3000);

        let deploy = new module.deployUtils({});
        return deploy.deployApiGatewayToStage(null, null, null).then()
          .catch((error) => {
            expect(error).to.equal("apiGatewayId is null or undefined");
          });
      });
    });

    describe("and no stageName", () => {
      it("should reject", () => {
        this.timeout(3000);

        let deploy = new module.deployUtils({});
        return deploy.deployApiGatewayToStage(uuid(), null, null).then()
          .catch((error) => {
            expect(error).to.equal("stageName is null or undefined");
          });
      });
    });

    describe("and no stageFullName", () => {
      it("should reject", () => {
        this.timeout(3000);

        let deploy = new module.deployUtils({});
        return deploy.deployApiGatewayToStage(uuid(), uuid(), null).then()
          .catch((error) => {
            expect(error).to.equal("stageFullName is null or undefined");
          });
      });
    });

    describe("and deploying to stage", () => {
      let deployUtilOptions, apiId, stageName, stageFullName, expectedParams;
      let apiGatewayPropertyName = "apiGateway";

      let assertOptions = (paramOptions, expectedParams) => {
        expect(paramOptions.restApiId).to.equal(expectedParams.restApiId);
        expect(paramOptions.stageName).to.equal(expectedParams.stageName);
        expect(paramOptions.cacheClusterEnabled).to.equal(expectedParams.cacheClusterEnabled);
        expect(paramOptions.description).to.equal(expectedParams.description);
        expect(paramOptions.stageDescription).to.equal(expectedParams.stageDescription);
      };

      beforeEach(() => {
        apiId = uuid();
        stageName = uuid();
        stageFullName = uuid();

        deployUtilOptions = {
          region: uuid(),
          accessKey: uuid(),
          secretKey: uuid()
        };

        expectedParams = {
          restApiId: apiId,
          stageName: stageName,
          cacheClusterEnabled: false,
          description: `${stageFullName} - ${moment.utc().format()}`,
          stageDescription: `${stageFullName} - ${moment.utc().format()}`
        }
      });

      afterEach(() => {
        deployUtilOptions = null;
        apiId = null;
        stageName = null;
        stageFullName = null;
      });

      describe("with success", () => {
        it("it should do work", () => {
          this.timeout(3000);

          var aws = {
            createDeployment: () => {
            }
          };

          let createDeploymentStub = sinon.stub(aws, "createDeployment", (opts, callback) => {
            callback(null, "Test");
          });

          deployUtilOptions[apiGatewayPropertyName] = aws;

          let deployUtils = new module.deployUtilsClass(deployUtilOptions);
          return deployUtils.deployApiGatewayToStage(apiId, stageName, stageFullName).then((data) => {
            expect(data).to.equal("Test");

            var paramOptions = createDeploymentStub.args[0][0];

            assertOptions(paramOptions, expectedParams);
          }).catch((error) => {
            console.error(error);
            expect(error).to.be.null;
          });
        });
      });

      describe("with failure", () => {
        it("it should do work", () => {
          this.timeout(3000);

          var aws = {
            createDeployment: () => {
            }
          };

          var result = "Test";

          let createDeploymentStub = sinon.stub(aws, "createDeployment", (opts, callback) => {
            callback(result, null);
          });

          deployUtilOptions[apiGatewayPropertyName] = aws;

          let deployUtils = new module.deployUtilsClass(deployUtilOptions);
          return deployUtils.deployApiGatewayToStage(apiId, stageName, stageFullName).then((data) => {
            expect(data).to.be.null;
          }).catch((error) => {
            var paramOptions = createDeploymentStub.args[0][0];

            assertOptions(paramOptions, expectedParams);

            console.error(error);
            expect(error).to.equal(result);
          });
        });
      });
    });
  });

  describe("and deployApiGatewayToStageForEnvByGatewayName", function () {
    this.timeout(3000);

    describe("and environment invalid", function () {
      let deployUtils, options;

      let generateError = (value) => {
        return new gulpUtil.PluginError({
          plugin: 'deployApiGatewayToStageForEnvByGatewayName',
          message: `environment is not valid [environment: ${new module.deployUtils({}).getObjectAsString(value)}]`
        });
      };

      beforeEach(()=> {
        options = {};
        deployUtils = new module.deployUtils(options);
      });

      afterEach(() => {
        options = null;
        deployUtils = null;
      });

      it("and environment null, it should reject", () => {
        let environment = null;
        let pluginError = generateError(environment);

        return deployUtils.deployApiGatewayToStageForEnvByGatewayName(environment, 20, uuid()).catch((error) => {
          expect(error.plugin).to.equal(pluginError.plugin);
          expect(error.message).to.equal(pluginError.message);
        });
      });

      it("and environment undefined, it should reject", () => {
        let environment = undefined;
        let pluginError = generateError(environment);

        return deployUtils.deployApiGatewayToStageForEnvByGatewayName(undefined, 20, uuid()).catch((error) => {
          expect(error.plugin).to.equal(pluginError.plugin);
          expect(error.message).to.equal(pluginError.message);
        });
      });

      it("and environment does not contain FullName, it should reject", () => {
        let environment = {};
        let pluginError = generateError(environment);

        return deployUtils.deployApiGatewayToStageForEnvByGatewayName(environment, 20, uuid()).catch((error) => {
          expect(error.plugin).to.equal(pluginError.plugin);
          expect(error.message).to.equal(pluginError.message);
        });
      });

      it("and environment FullName is unknown, it should reject", () => {
        let environment = {
          FullName: "UNK"
        };

        let pluginError = generateError(environment);

        return deployUtils.deployApiGatewayToStageForEnvByGatewayName(environment, 20, uuid()).then(()=> {
          expect(true).to.equal(false);
        }).catch((error) => {
          expect(error.plugin).to.equal(pluginError.plugin);
          expect(error.message).to.equal(pluginError.message);
        });
      });


      it("and environment does not contain ShortName, it should reject", () => {
        let environment = {
          FullName: uuid()
        };

        let pluginError = generateError(environment);

        return deployUtils.deployApiGatewayToStageForEnvByGatewayName(environment, 20, uuid()).then(()=> {
          expect(true).to.equal(false);
        }).catch((error) => {
          expect(error.plugin).to.equal(pluginError.plugin);
          expect(error.message).to.equal(pluginError.message);
        });
      });

      it("and environment ShortName is unknown, it should reject", () => {
        let environment = {
          FullName: uuid(),
          ShortName: "UNK"
        };

        let pluginError = generateError(environment);

        return deployUtils.deployApiGatewayToStageForEnvByGatewayName(environment, 20, uuid()).then(()=> {
          expect(true).to.equal(false);
        }).catch((error) => {
          expect(error.plugin).to.equal(pluginError.plugin);
          expect(error.message).to.equal(pluginError.message);
        });
      });
    });

    describe("and apiName invalid", function () {
      let deployUtils, options, environment, pluginError;

      beforeEach(()=> {
        options = {};
        environment = {
          FullName: `FullName${uuid()}`,
          ShortName: `ShortName${uuid()}`
        };

        pluginError = new gulpUtil.PluginError({
          plugin: 'deployApiGatewayToStageForEnvByGatewayName',
          message: 'apiName is null or undefined'
        });

        deployUtils = new module.deployUtils(options);
      });

      afterEach(() => {
        options = null;
        environment = null;
        pluginError = null;
        deployUtils = null;
      });

      it("and apiName null, it should reject", () => {
        let apiName = null;

        return deployUtils.deployApiGatewayToStageForEnvByGatewayName(environment, apiName, 20).then(()=> {
          expect(true).to.equal(false);
        }).catch((error) => {
          expect(error.plugin).to.equal(pluginError.plugin);
          expect(error.message).to.equal(pluginError.message);
        });
      });

      it("and apiName undefined, it should reject", () => {
        let apiName = undefined;

        return deployUtils.deployApiGatewayToStageForEnvByGatewayName(environment, apiName, 20).then(()=> {
          expect(true).to.equal(false);
        }).catch((error) => {
          expect(error.plugin).to.equal(pluginError.plugin);
          expect(error.message).to.equal(pluginError.message);
        });
      });

      it("and apiName empty string, it should reject", () => {
        let apiName = '';

        return deployUtils.deployApiGatewayToStageForEnvByGatewayName(environment, apiName).then(()=> {
          expect(true).to.equal(false);
        }).catch((error) => {
          expect(error.plugin).to.equal(pluginError.plugin);
          expect(error.message).to.equal(pluginError.message);
        });
      });
    });

    describe("and all props valid", function () {
      let aws, options, deployUtils, environment;

      beforeEach(() => {
        aws = {
          getRestApis: () => {
          },
          createDeployment: () => {
          }
        };

        environment = {
          FullName: `FullName${uuid()}`,
          ShortName: `ShortName${uuid()}`
        };
      });

      afterEach(()=> {
        aws = null;
        environment = null;
      });

      describe("and api not found", function () {
        beforeEach(() => {
          sinon.stub(aws, "getRestApis", (opts, callback) => {
            callback(null, {items: []});
          });

          options = {
            apiGateway: aws
          };

          deployUtils = new module.deployUtils(options);
        });

        afterEach(()=> {
          deployUtils = null;
          options = null;
        });

        it("it should not continue", () => {
          return deployUtils.deployApiGatewayToStageForEnvByGatewayName(environment, 20, uuid()).then(()=> {
            expect(true).to.equal(false);
          }).catch((error)=> {

            expect(error.plugin).to.equal("deployApiGatewayToStageForEnvByGatewayName");
            expect(error.message).to.equal("foundApiId is null or undefined (no match found)");
          });
        });
      });

      describe("and api found with create deploy a success", function () {
        let apiName, successResultFromCreateDeploy;

        beforeEach(() => {
          var id = getRandomIntInclusive(1, 999);
          successResultFromCreateDeploy = "success";
          apiName = `apiName ${uuid()}`;

          sinon.stub(aws, "createDeployment", (opts, callback) => {
            callback(null, successResultFromCreateDeploy);
          });

          sinon.stub(aws, "getRestApis", (opts, callback) => {
            callback(null, {
              items: [
                {
                  name: apiName,
                  id: id
                },
                {
                  name: uuid(),
                  id: getRandomIntInclusive(id, id + 20) + 1
                }
              ]
            });
          });

          options = {
            apiGateway: aws
          };

          deployUtils = new module.deployUtils(options);
        });

        afterEach(()=> {
          successResultFromCreateDeploy = null;
          apiName = null;
          deployUtils = null;
          options = null;
        });

        it("it should deploy to staging", () => {
          return deployUtils.deployApiGatewayToStageForEnvByGatewayName(environment, apiName, 20).then((data)=> {
            console.log(data);
            expect(data).to.equal(successResultFromCreateDeploy);
          }).catch((err)=> {
            console.error(err);
            expect(err).to.be.null;
          });
        });
      });

      describe("and api found with create deploy a failure", function () {
        let apiName, failureMessage;

        beforeEach(() => {
          var id = getRandomIntInclusive(1, 999);
          apiName = `apiName ${uuid()}`;
          failureMessage = "this is a failure";

          sinon.stub(aws, "createDeployment", (opts, callback) => {
            callback(failureMessage, null);
          });

          sinon.stub(aws, "getRestApis", (opts, callback) => {
            callback(null, {
              items: [
                {
                  name: apiName,
                  id: id
                },
                {
                  name: uuid(),
                  id: getRandomIntInclusive(id, id + 20) + 1
                }
              ]
            });
          });

          options = {
            apiGateway: aws
          };

          deployUtils = new module.deployUtils(options);
        });

        afterEach(()=> {
          failureMessage = null;
          apiName = null;
          deployUtils = null;
          options = null;
        });

        it("it should deploy to staging", () => {
          return deployUtils.deployApiGatewayToStageForEnvByGatewayName(environment, apiName, 20).then(()=> {
            expect(true).to.equal(false);
          }).catch((err)=> {
            console.error(err);
            expect(err.plugin).to.equal("deployApiGatewayToStageForEnvByGatewayName");
            expect(err.message).to.equal(JSON.stringify(failureMessage));
          });
        });
      });
    });
  });

  describe("should overwriteSwaggerByName", function () {
    this.timeout(3000);

    let deployUtilOptions, apiId, apiName, aws, swagger;

    beforeEach(() => {
      apiName = `apiName ${uuid()}`;
      apiId = getRandomIntInclusive(1, 999);
      aws = {
        getRestApis: () => {
        },
        putRestApi: () => {
        }
      };

      deployUtilOptions = {
        region: uuid(),
        accessKey: uuid(),
        secretKey: uuid()
      };

      swagger = {
        info: {
          title: apiName
        }
      }
    });

    afterEach(() => {
      deployUtilOptions = null;
      apiName = null;
      aws = null;
      swagger = null;
      apiId = null;
    });

    it("should overwrite swagger", () => {
      this.timeout(3000);

      var expected = {
        id: apiId,
        name: apiName,
        createdDate: new Date()
      };

      let putRestApiStub = sinon.stub(aws, "putRestApi", (opts, callback) => {
        callback(null, expected);
      });

      sinon.stub(aws, "getRestApis", (opts, callback) => {
        callback(null, {
          items: [
            {
              name: apiName,
              id: apiId
            },
            {
              name: uuid(),
              id: getRandomIntInclusive(apiId, apiId + 20) + 1
            }
          ]
        });
      });

      deployUtilOptions["apiGateway"] = aws;

      let deployUtils = new module.deployUtilsClass(deployUtilOptions);

      return deployUtils.overwriteSwaggerByName(apiName, swagger, 20, false).then((data) => {

        expect(data.id).to.equal(expected.id);
        expect(data.name).to.equal(expected.name);
        expect(data.createdDate).to.equal(expected.createdDate);

        var restApiStub = putRestApiStub.args[0][0];
        console.log(restApiStub);

        expect(restApiStub.restApiId).to.equal(apiId);
        expect(restApiStub.body).to.equal(JSON.stringify(swagger));
      }).catch((error)=> {
        console.error(error);
        expect(error).to.be.null;
      });
    });

    it("should reject promise", () => {
      this.timeout(3000);

      sinon.stub(aws, "getRestApis", (opts, callback) => {
        callback(null, {
          items: [
            {
              name: apiName + "1",
              id: apiId
            },
            {
              name: uuid(),
              id: getRandomIntInclusive(apiId, apiId + 20) + 1
            }
          ]
        });
      });

      deployUtilOptions["apiGateway"] = aws;

      let deployUtils = new module.deployUtilsClass(deployUtilOptions);
      return deployUtils.overwriteSwaggerByName(apiName, swagger, 20, false).then((data) => {
        // should never get here
        expect(data).to.equal(true);
      }).catch((error) => {
        console.log(error);

        expect(error.message).to.equal("foundApiId is null or undefined (no match found)");
      });
    });
  });

  describe("should createOrOverwriteApiSwagger", function () {
    this.timeout(3000);

    let expected, deployUtilOptions, apiId, apiName, aws, swagger;

    beforeEach(() => {
      apiName = `apiName ${uuid()}`;
      apiId = getRandomIntInclusive(1, 999);

      deployUtilOptions = {
        region: uuid(),
        accessKey: uuid(),
        secretKey: uuid()
      };

      swagger = {
        info: {
          title: apiName
        }
      }
    });

    afterEach(() => {
      deployUtilOptions = null;
      expected = null;
      apiName = null;
      aws = null;
      swagger = null;
      apiId = null;
    });

    describe("and swagger is invalid", ()=> {
      describe("and is undefined", ()=> {
        it("should fail ", ()=> {
          let deployUtils = new module.deployUtilsClass(deployUtilOptions);
          return deployUtils.createOrOverwriteApiSwagger(undefined).catch((error)=> {
            expect(error.message).to.equal("swaggerEntity is null or undefined [swaggerEntity: ]");
          });
        });
      });

      describe("and is null", ()=> {
        it("should fail ", ()=> {
          let deployUtils = new module.deployUtilsClass(deployUtilOptions);
          return deployUtils.createOrOverwriteApiSwagger(null).catch((error)=> {
            expect(error.message).to.equal("swaggerEntity is null or undefined [swaggerEntity: ]");
          });
        });
      });

      describe("and does not contain info", ()=> {
        it("should fail ", ()=> {
          let deployUtils = new module.deployUtilsClass(deployUtilOptions);
          return deployUtils.createOrOverwriteApiSwagger({}).catch((error)=> {
            expect(error.message).to.equal("swaggerEntity must contain info and title [swaggerEntity: {}]");
          });
        });
      });

      describe("and title property", ()=> {
        describe("and title property does not exist", ()=> {
          it("should fail ", ()=> {
            let deployUtils = new module.deployUtilsClass(deployUtilOptions);
            return deployUtils.createOrOverwriteApiSwagger({info: {}}).catch((error)=> {
              expect(error.message).to.equal("swaggerEntity must contain info and title [swaggerEntity: {\"info\":{}}]");
            });
          });

          describe("and title property value", ()=> {
            describe("and title property value is undefined", ()=> {
              it("should fail ", ()=> {
                let swaggerEntity = {info: {title: undefined}};
                let deployUtils = new module.deployUtilsClass(deployUtilOptions);
                return deployUtils.createOrOverwriteApiSwagger(swaggerEntity)
                  .catch((error)=> {
                    expect(error.message).to.equal(`swaggerEntity.info.title is null, undefined, or empty [swaggerEntity: ${JSON.stringify(swaggerEntity)}]`);
                  });
              });
            });

            describe("and title property value is undefined", ()=> {
              it("should fail ", ()=> {
                let deployUtils = new module.deployUtilsClass(deployUtilOptions);
                let swaggerEntity = {info: {title: undefined}};
                return deployUtils.createOrOverwriteApiSwagger(swaggerEntity)
                  .catch((error)=> {
                    expect(error.message).to.equal(`swaggerEntity.info.title is null, undefined, or empty [swaggerEntity: ${JSON.stringify(swaggerEntity)}]`);
                  });
              });
            });
            describe("and title property value is null", ()=> {
              it("should fail ", ()=> {
                let deployUtils = new module.deployUtilsClass(deployUtilOptions);
                let swaggerEntity = {info: {title: null}};
                return deployUtils.createOrOverwriteApiSwagger(swaggerEntity)
                  .catch((error)=> {
                    expect(error.message).to.equal(`swaggerEntity.info.title is null, undefined, or empty [swaggerEntity: ${JSON.stringify(swaggerEntity)}]`);
                  });
              });
            });
            describe("and title property value is empty string", ()=> {
              it("should fail ", ()=> {
                let deployUtils = new module.deployUtilsClass(deployUtilOptions);
                let swaggerEntity = {info: {title: ""}};
                return deployUtils.createOrOverwriteApiSwagger(swaggerEntity)
                  .catch((error)=> {
                    expect(error.message).to.equal(`swaggerEntity.info.title is null, undefined, or empty [swaggerEntity: ${JSON.stringify(swaggerEntity)}]`);
                  });
              });
            });
          });

          it("should overwrite swagger", () => {
            this.timeout(3000);

            aws = {
              getRestApis: () => {
              },
              putRestApi: () => {
              }
            };

            expected = {
              id: apiId,
              name: apiName,
              createdDate: new Date()
            };

            let putRestApiStub = sinon.stub(aws, "putRestApi", (opts, callback) => {
              callback(null, expected);
            });

            sinon.stub(aws, "getRestApis", (opts, callback) => {
              callback(null, {
                items: [
                  {
                    name: apiName,
                    id: apiId
                  },
                  {
                    name: uuid(),
                    id: getRandomIntInclusive(apiId, apiId + 20) + 1
                  }
                ]
              });
            });

            deployUtilOptions["apiGateway"] = aws;

            let deployUtils = new module.deployUtilsClass(deployUtilOptions);

            return deployUtils.createOrOverwriteApiSwagger(swagger, 20, false).then((data) => {

              expect(data.id).to.equal(expected.id);
              expect(data.name).to.equal(expected.name);
              expect(data.createdDate).to.equal(expected.createdDate);

              var restApiStub = putRestApiStub.args[0][0];
              console.log(restApiStub);

              expect(restApiStub.restApiId).to.equal(apiId);
              expect(restApiStub.body).to.equal(JSON.stringify(swagger));

            }).catch((error)=> {
              console.error(error);
              expect(error).to.be.null;
            });
          });

          it("should create swagger", () => {
            this.timeout(3000);

            expected = {
              id: apiId,
              name: apiName,
              createdDate: new Date()
            };

            aws = {
              getRestApis: () => {
              },
              importRestApi: () => {
              },
              putRestApi: () => {
              }
            };

            sinon.stub(aws, "getRestApis", (opts, callback) => {
              callback(null, {
                items: [
                  {
                    name: apiName + "1",
                    id: apiId
                  },
                  {
                    name: uuid(),
                    id: getRandomIntInclusive(apiId, apiId + 20) + 1
                  }
                ]
              });

              sinon.stub(aws, "importRestApi", (opts, callback) => {
                callback(null, expected);
              });
            });

            deployUtilOptions["apiGateway"] = aws;

            let deployUtils = new module.deployUtilsClass(deployUtilOptions);
            return deployUtils.createOrOverwriteApiSwagger(swagger, 20, false).then((data) => {
              // should never get here
              expect(data).to.equal(expected);
            }).catch((error) => {
              console.log(error);
            });
          });
        });

        describe("and scrubbing swagger for aws", () => {
          describe("and no file path and name supplied", () => {
            it("file null, should save no file", () => {
              var deploy = new module.deployUtils({});
              return deploy.createAwsSwaggerFile(null, {}).catch((error)=> {
                expect(error.plugin).to.equal("createAwsSwaggerFile");
                expect(error.message).to.equal("filePathAndName is invalid: ''");
              });
            });

            it("file undefined, should save no file", () => {
              var deploy = new module.deployUtils({});
              return deploy.createAwsSwaggerFile(undefined, {}).catch((error)=> {
                expect(error.plugin).to.equal("createAwsSwaggerFile");
                expect(error.message).to.equal("filePathAndName is invalid: ''");
              });
            });

            it("file empty string, should save no file", () => {
              var deploy = new module.deployUtils({});
              return deploy.createAwsSwaggerFile('', {}).catch((error)=> {
                expect(error.plugin).to.equal("createAwsSwaggerFile");
                expect(error.message).to.equal('filePathAndName is invalid: \'""\'');
              });
            });
          });

          describe("and invalid swagger supplied", () => {
            it("entity null, should save no swagger file", () => {
              var deploy = new module.deployUtils({});
              return deploy.createAwsSwaggerFile(uuid(), null).catch((error)=> {
                expect(error.plugin).to.equal("createAwsSwaggerFile");
                expect(error.message).to.equal("swaggerEntity is null or undefined");
              });
            });

            it("entity undefined, should save no swagger file", () => {
              var deploy = new module.deployUtils({});
              return deploy.createAwsSwaggerFile(uuid(), undefined).catch((error)=> {
                expect(error.plugin).to.equal("createAwsSwaggerFile");
                expect(error.message).to.equal("swaggerEntity is null or undefined");
              });
            });
          });

          describe("and valid path and file", () => {
            var filePathAndName, fsp;

            beforeEach(()=> {
              filePathAndName = `./test/unit/${uuid()}.json`;
              fsp = new fileSystem();
            });

            afterEach(()=> {
              return fsp.deleteFileSystemObject(filePathAndName).then(()=> {
                filePathAndName = null;
                fsp = null;
              });
            });

            describe("swagger is contains schema type string with description nothing", () => {
              it("it should replace it and create a definitions area", () => {
                var deploy = new module.deployUtils({});
                return deploy.createAwsSwaggerFile(filePathAndName, {
                  one: {
                    schema: {
                      description: "nothing",
                      type: "string"
                    }
                  }, two: {
                    schema: {
                      type: "string",
                      description: "nothing"
                    }
                  }
                }).then(() => {
                  return fsp.get(filePathAndName, false).then((data)=> {
                    expect(data.indexOf('"schema":{"type":"string","description":"nothing"')).to.equal(-1);

                    let resultsCount = data.match(/{"schema":{"\$ref":"#\/definitions\/StringResponse"}/g).length;
                    expect(resultsCount).to.equal(2);

                    let entity = JSON.parse(data);

                    expect(entity.definitions.StringResponse).with.property("type", "string");
                    expect(entity.definitions.StringResponse).with.property("description", "nothing");
                  });
                }).catch((error) => {
                  console.log(error);
                  expect(error).to.be.null;
                });
              });

              it("it should replace it and not update the area", () => {
                var deploy = new module.deployUtils({});
                return deploy.createAwsSwaggerFile(filePathAndName, {
                  one: {
                    schema: {
                      description: "nothing",
                      type: "string"
                    }
                  },
                  two: {
                    schema: {
                      type: "string",
                      description: "nothing"
                    }
                  },
                  definitions: {
                    StringResponse: {
                      type: "cookie",
                      description: "poodle"
                    }
                  }
                }).then(() => {
                  return fsp.get(filePathAndName, false).then((data)=> {
                    expect(data.indexOf('"schema":{"type":"string","description":"nothing"')).to.equal(-1);

                    let resultsCount = data.match(/{"schema":{"\$ref":"#\/definitions\/StringResponse"}/g).length;
                    expect(resultsCount).to.equal(2);

                    let entity = JSON.parse(data);

                    expect(entity.definitions.StringResponse).with.property("type", "cookie");
                    expect(entity.definitions.StringResponse).with.property("description", "poodle");

                  });
                }).catch((error) => {
                  console.log(error);
                  expect(error).to.be.null;
                });
              });
            });

            describe("swagger is contains schema type boolean with description bool result", () => {
              it("it should replace it and create definitions", () => {
                var deploy = new module.deployUtils({});
                return deploy.createAwsSwaggerFile(filePathAndName, {
                  one: {
                    schema: {
                      type: "boolean",
                      description: "Bool Result"
                    }
                  }, two: {
                    schema: {
                      description: "Bool Result",
                      type: "boolean"
                    }
                  }
                }).then(() => {
                  return fsp.get(filePathAndName, false).then((data)=> {
                    expect(data.indexOf('"schema":{"type":"boolean","description":"nothing"')).to.equal(-1);

                    let verifyReplaceMatch = data.match(/{"schema":{"\$ref":"#\/definitions\/BooleanResponse"}/g).length;
                    expect(verifyReplaceMatch).to.equal(2);

                    let entity = JSON.parse(data);
                    expect(entity.definitions.BooleanResponse).with.property("type", "boolean");
                    expect(entity.definitions.BooleanResponse).with.property("description", "Bool Result");
                  });
                }).catch((error) => {
                  console.log(error);
                  expect(error).to.be.null;
                });
              });

              it("it should replace it and not create definitions", () => {
                var deploy = new module.deployUtils({});
                return deploy.createAwsSwaggerFile(filePathAndName, {
                  one: {
                    schema: {
                      type: "boolean",
                      description: "Bool Result"
                    }
                  },
                  two: {
                    schema: {
                      description: "Bool Result",
                      type: "boolean"
                    }
                  },
                  definitions: {
                    BooleanResponse: {
                      type: "cookie",
                      description: "poodle"
                    }
                  }
                }).then(() => {
                  return fsp.get(filePathAndName, false).then((data)=> {
                    expect(data.indexOf('"schema":{"type":"boolean","description":"nothing"')).to.equal(-1);

                    let verifyReplaceMatch = data.match(/{"schema":{"\$ref":"#\/definitions\/BooleanResponse"}/g).length;
                    expect(verifyReplaceMatch).to.equal(2);

                    let entity = JSON.parse(data);
                    expect(entity.definitions.BooleanResponse).with.property("type", "cookie");
                    expect(entity.definitions.BooleanResponse).with.property("description", "poodle");
                  });
                }).catch((error) => {
                  console.log(error);
                  expect(error).to.be.null;
                });
              });
            });

            describe("swagger is contains ,readonly: true", () => {
              it("it should remove it", () => {
                var deploy = new module.deployUtils({});
                return deploy.createAwsSwaggerFile(filePathAndName, {
                  one: {
                    aProp: "holla",
                    readOnly: true
                  }, two: {
                    aProp: "holla",
                    readOnly: true
                  }
                }).then(() => {
                  return fsp.get(filePathAndName, false).then((data)=> {
                    expect(data.indexOf('"readOnly":true')).to.equal(-1);

                    let entity = JSON.parse(data);
                    expect(entity.definitions).to.equal(undefined);
                    expect(entity.definitions).to.equal(undefined);
                  });
                }).catch((error) => {
                  console.log(error);
                  expect(error).to.be.null;
                });
              });
            });
          });
        });
      });
    });
  });
});
