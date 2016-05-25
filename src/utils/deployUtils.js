"use strict";
let AWS = require('aws-sdk');
let moment = require('moment');
let tsm = require('teamcity-service-messages');
let __ = require('lodash');
let constants = require('../constants.js');
let spawn = require('child_process').spawn;
let gulp = require('gulp');
let gulpUtil = require('gulp-util');
let path = require('path');
let mocha = require("gulp-spawn-mocha");
let CloudFrontService = require('./cloudfrontService.js');
let lib_directory = '../../lib';
let uuid = require('node-uuid');
let fs = require('fs');
let Promise = require('bluebird');
let util = require('util');
let fileSystem = require('./FileSystemPromise');

class DeployUtils {

  constructor(options) {
    let opts = options || {};


    this._accessKey = opts.accessKey || '';
    this._secretKey = opts.secretKey || '';
    this._region = opts.region || '';

    this._cloudFrontService = opts.cloudfrontService || new CloudFrontService({
        accessKey: this._accessKey,
        secretKey: this._secretKey
      });

    let gatewayParams = {
      accessKeyId: this._accessKey,
      secretAccessKey: this._secretKey,
      region: this._region,
      sslEnabled: util.isNullOrUndefined(opts.sslEnabled) ? true : opts.sslEnabled
    };

    if (!util.isNullOrUndefined(opts.apiVersion)) {
      gatewayParams.apiVersion = opts.apiVersion;
    }

    this._apiGateway = opts.apiGateway || new AWS.APIGateway(gatewayParams);
  }

  deployApiGatewayToInt(apiGatewayId, callback) {
    this._deployApiGatewayToStage(apiGatewayId,
      constants.env.INTEGRATION.ShortName,
      constants.env.INTEGRATION.FullName,
      callback);
  }

  deployApiGatewayToSandbox(apiGatewayId, callback) {
    this._deployApiGatewayToStage(apiGatewayId,
      constants.env.SANDBOX.ShortName,
      constants.env.SANDBOX.FullName,
      callback);
  }

  deployApiGatewayToProd(apiGatewayId, callback) {
    this._deployApiGatewayToStage(apiGatewayId,
      constants.env.PRODUCTION.ShortName,
      constants.env.PRODUCTION.FullName,
      callback);
  }

  _deployApiGatewayToStage(apiGatewayId, stageName, stageFullName, callback) {
    tsm.progressStart(`Deploying to '${stageFullName}' Environment`);
    Promise.delay(20000).then(() => {
      try {
        let apiGatewayParams = {
          apiVersion: '2015-07-09',
          accessKeyId: this._accessKey,
          secretAccessKey: this._secretKey,
          sslEnabled: true,
          region: this._region
        };

        let params = {
          restApiId: apiGatewayId, /* required */
          stageName: stageName, /* required */
          cacheClusterEnabled: false,
          description: `${stageFullName} - ${moment.utc().format()}`,
          stageDescription: `${stageFullName} - ${moment.utc().format()}`
        };

        let apigateway = new AWS.APIGateway(apiGatewayParams);


        apigateway.createDeployment(params, function (err, data) {
          if (err) {
            tsm.message({text: `Error: ${err} | Stack Trace: ${err.stack}`, errorDetails: err});
            throw err;
          }
          else {
            tsm.message({text: data});
            //introducing a 5 second delay to allow Api Gateway deploy to go live
            setTimeout(function () {
              tsm.progressFinish(`Deploying to '${stageFullName}' Environment`);
              callback();
            }, 5000);
          }
        });
      }
      catch (err) {
        tsm.message({text: `DeployApiGatewayToStage Error: ${err}`, status: 'ERROR'});
      }
    });
  };

  /**
   * a Promise version of deployApiGatewayToSandbox, deployApiGatewayToProd, and deployApiGatewayToInt.
   * @param {string} apiGatewayId
   * @param {string} stageName
   * @param {string} stageFullName
   * @return {Promise<object>}
   */
  deployApiGatewayToStage(apiGatewayId, stageName, stageFullName) {
    if (util.isNullOrUndefined(apiGatewayId)) {
      return Promise.reject("apiGatewayId is null or undefined");
    }

    if (util.isNullOrUndefined(stageName)) {
      return Promise.reject("stageName is null or undefined");
    }

    if (util.isNullOrUndefined(stageFullName)) {
      return Promise.reject("stageFullName is null or undefined");
    }

    tsm.progressStart(`Deploying to '${stageFullName}' Environment`);

    return new Promise((resolve, reject) => {
      let params = {
        restApiId: apiGatewayId, /* required */
        stageName: stageName, /* required */
        cacheClusterEnabled: false,
        description: `${stageFullName} - ${moment.utc().format()}`,
        stageDescription: `${stageFullName} - ${moment.utc().format()}`
      };

      this._apiGateway.createDeployment(params, function (err, data) {
        if (err) {
          return reject(err);
        }

        return resolve(data);
      });
    });
  }

  lookupApiGatewayByName(apiGatewayName, callback) {

    return new Promise((resolve, reject) => {
      tsm.progressStart(`Checking if API Gateway exists. [ApiGatewayName: ${apiGatewayName}]`);

      try {
        let params = {};

        this._apiGateway.getRestApis(params, (err, data) => {
          if (err) {
            let errorMessage = `Error: ${err}| Error Stack Trace: ${err.stack}`;
            tsm.message({text: errorMessage, status: 'ERROR'});
            reject(errorMessage);
          } // an error occurred
          else { // successful response
            tsm.message({text: `${JSON.stringify(data)}`});

            //look for apigateway that matches
            let apiId;
            for (let i = 0; i < data.items.length; ++i) {
              let item = data.items[i];
              if (item.name === apiGatewayName) {
                apiId = item.id;
              }
            }
            tsm.progressFinish(`Checking if API Gateway exists. [ApiGatewayName: ${apiGatewayName}]`);
            resolve(apiId);
          }
        });
      }
      catch (err) {
        let errorMessage = `LookupApiGatewayByName Error: ${err}`;
        tsm.message({text: errorMessage, status: 'ERROR'});
        reject(errorMessage);
      }
    }).asCallback(callback);
  };

  /**
   *
   * @param {string} stageName
   * @param {string} restApiId
   * @param {string} stageVariableName
   * @param {string} stageVariableValue
   * @param {function} callback
   */
  createStageVariable(stageName, restApiId, stageVariableName, stageVariableValue, callback) {
    return new Promise((resolve, reject) => {
      tsm.progressStart(`Creating Stage Variable for '${stageName}' [Variable: ${stageVariableName}] [Value: ${stageVariableValue}]`);
      let apiGatewayParams = {
        apiVersion: '2015-07-09',
        accessKeyId: this._accessKey,
        secretAccessKey: this._secretKey,
        sslEnabled: true,
        region: this._region
      };

      let apiGateway = new AWS.APIGateway(apiGatewayParams);
      let params = {
        restApiId: restApiId,
        stageName: stageName,
        patchOperations: [
          {
            op: 'replace',
            path: `/variables/${stageVariableName}`,
            value: stageVariableValue
          }]
      };

      apiGateway.updateStage(params, function (err, data) {
        if (err) {
          let errorMessage = `Error: ${err} | Error Stack Trace: ${err.stack}`;
          tsm.message({text: errorMessage});
          reject({message: errorMessage});
        } else {
          tsm.message({text: `${JSON.stringify(data)}`});
          tsm.progressFinish(`Creating Stage Variable for '${stageName}' [Variable: ${stageVariableName}] [Value: ${stageVariableValue}]`);
          resolve();
        }
      });
    }).asCallback(callback);
  };

  /**
   * Uses the AWS apigateway's updateStage method to create / update stage variables.
   * The variableCollection is required and it's object schema is {stageVariableName, stageVariableValue}
   * @param {string} stageName
   * @param {string} restApiId
   * @param {Array<Object>} variableCollection {stageVariableName, stageVariableValue}
   * @return {Promise<Object>|Promise}
   */
  createStageVariables(stageName, restApiId, variableCollection) {
    if (util.isNullOrUndefined(stageName) || stageName === "") {
      return Promise.reject("stageName must be populated");
    }

    if (util.isNullOrUndefined(restApiId) || restApiId === "") {
      return Promise.reject("restApiId must be populated");
    }

    if (util.isNullOrUndefined(variableCollection) || variableCollection.length === 0) {
      return Promise.reject("variableCollection must be populated");
    }

    return new Promise((resolve, reject) => {
      tsm.progressStart(`Creating Stage Variables for '${stageName}'] [variableCollection: ${JSON.stringify(variableCollection)}]`);

      let params = {
        restApiId: restApiId,
        stageName: stageName,
        patchOperations: []
      };

      for (let i = 0; i < variableCollection.length; i++) {
        params.patchOperations.push({
          op: 'replace',
          path: `/variables/${variableCollection[i].stageVariableName}`,
          value: variableCollection[i].stageVariableValue
        });
      }

      return this._apiGateway.updateStage(params, function (err, data) {
        if (err) {
          let errorMessage = `Error: ${err} | Error Stack Trace: ${err.stack}`;
          tsm.message({text: errorMessage});
          reject(errorMessage);
        } else {
          tsm.message({text: `${JSON.stringify(data)}`});
          tsm.progressFinish(`Creating Stage Variables for '${stageName}' [variableCollection: ${JSON.stringify(variableCollection)}]`);
          resolve();
        }
      });
    });
  }

  findApiBasePathMapping(domainName, apiBasePathMappingName, callback) {
    tsm.progressStart(`Checking if API base path mapping exists. [Domain: ${domainName}] [ApiMappingName:  ${apiBasePathMappingName}]`);

    let apiGatewayParams = {
      apiVersion: '2015-07-09',
      accessKeyId: this._accessKey,
      secretAccessKey: this._secretKey,
      sslEnabled: true,
      region: this._region
    };

    let apigateway = new AWS.APIGateway(apiGatewayParams);

    let params = {
      domainName: domainName
    };
    apigateway.getBasePathMappings(params, function (err, data) {
      if (err) tsm.message({text: `Error: ${err} | Stack Trace: ${err.stack}`}); // an error occurred
      else {

        let basePathMapping;
        for (let i = 0; i < data.items.length; ++i) {
          let item = data.items[i];
          if (item.basePath === apiBasePathMappingName) {
            tsm.progressMessage('Found BasePathMapping.')
            basePathMapping = item;
          }
        }
        tsm.progressFinish(`Checking if API base path mapping exists. [Domain: ${domainName}] [ApiMappingName:  ${apiBasePathMappingName}]`);
        callback(basePathMapping);
      }
    });
  };

  configureApiGatewaySettingsForInt(restApiId, blacklistedRoutes = [], callback) {
    let patchOps = [
      {
        op: 'replace',
        path: '/*/*/logging/loglevel',
        value: 'INFO'
      },
      {
        op: 'replace',
        path: '/*/*/metrics/enabled',
        value: 'false'
      },
      {
        op: 'replace',
        path: '/*/*/logging/dataTrace',
        value: 'false'
      }];

    tsm.message({text: "Update Patch Settings"});
    return this._updatePatchSettings(patchOps, restApiId, blacklistedRoutes).then((updatePatchOps)=> {
      tsm.message({text: "Pass the Updated operations on!"});
      return this._configureApiGatewaySettingsForEnv(constants.env.INTEGRATION.ShortName.toLowerCase(), restApiId, updatePatchOps, callback);
    });
  };

  configureApiGatewaySettingsForSandbox(restApiId, blacklistedRoutes = [], callback) {
    let patchOps = [
      {
        op: 'replace',
        path: '/*/*/logging/loglevel',
        value: 'INFO'
      },
      {
        op: 'replace',
        path: '/*/*/metrics/enabled',
        value: 'false'
      },
      {
        op: 'replace',
        path: '/*/*/logging/dataTrace',
        value: 'false'
      }];

    // patchOps = this._updatePatchSettings(patchOps, blacklistedRoutes);

    return this._configureApiGatewaySettingsForEnv(constants.env.SANDBOX.ShortName.toLocaleLowerCase(), restApiId, patchOps, callback);
  };

  configureApiGatewaySettingsForProd(restApiId, blacklistedRoutes = [], callback) {
    let patchOps = [
      {
        op: 'replace',
        path: '/*/*/logging/loglevel',
        value: 'INFO'
      },
      {
        op: 'replace',
        path: '/*/*/metrics/enabled',
        value: 'true'
      },
      {
        op: 'replace',
        path: '/*/*/logging/dataTrace',
        value: 'false'
      }];

    // patchOps = this._updatePatchSettings(patchOps, blacklistedRoutes);

    return this._configureApiGatewaySettingsForEnv(constants.env.PRODUCTION.ShortName.toLocaleLowerCase(), restApiId, patchOps, callback);
  };

  _updatePatchSettings(patchOps, restApiId, blacklistedRoutes){
    return new Promise((resolve, reject) => {
      let apiGatewayParams = {
        apiVersion: '2015-07-09',
        accessKeyId: this._accessKey,
        secretAccessKey: this._secretKey,
        sslEnabled: true,
        region: this._region
      };
      let apiGateway = new AWS.APIGateway(apiGatewayParams);
      let params = {
        restApiId: restApiId
      };
      let resources = [];
      tsm.message({text: "Get Resources"});
      apiGateway.getResources(params, function (err, data) {
        if (err) {
          tsm.message({text: err});
          tsm.message({text: err.stack});
          reject({message: err});
        } else {
          for (let index = 0; index < data.items.length; index++) {
            if (data.items[index].hasOwnProperty('resourceMethods')) {
              if (JSON.stringify(data.items[index].resourceMethods).indexOf("GET")) {
                resources.push(`${data.items[index].path}/GET`);
              }

              if (JSON.stringify(data.items[index].resourceMethods).indexOf("POST")) {
                resources.push(`${data.items[index].path}/POST`);
              }

              if (JSON.stringify(data.items[index].resourceMethods).indexOf("PUT")) {
                resources.push(`${data.items[index].path}/PUT`);
              }

              if (JSON.stringify(data.items[index].resourceMethods).indexOf("DELETE")) {
                resources.push(`${data.items[index].path}/DELETE`);
              }
            }
          }

          tsm.message({text: "Remove Black list"});
          // Remove all the routes in the black list!
          resources = resources.filter(function (x) {
            return blacklistedRoutes.indexOf(x) < 0
          });

          for (let index = 0; index < resources.length; index++) {
            patchOps.push({
              op: 'replace',
              path: `${resources[index]}/logging/loglevel`,
              value: 'INFO'
            }, {
              op: 'replace',
              path: `${resources[index]}/metrics/enabled`,
              value: 'true'
            }, {
              op: 'replace',
              path: `${resources[index]}/logging/dataTrace`,
              value: 'true',
              from: 'false'
            });
          }
        }
        tsm.message({text: "Patch Settings Successfully Updated"});
        resolve(patchOps);
      });
    });
  };

  _configureApiGatewaySettingsForEnv(stageName, restApiId, patchOps, callback) {
    return new Promise((resolve, reject) => {
      tsm.progressStart(`Configuring Api Gateway Settings for Stage. [Stage: ${stageName}] [ApiGatewayId: ${restApiId}]`);

      let apiGatewayParams = {
        apiVersion: '2015-07-09',
        accessKeyId: this._accessKey,
        secretAccessKey: this._secretKey,
        sslEnabled: true,
        region: this._region
      };

      let apiGateway = new AWS.APIGateway(apiGatewayParams);
      let params = {
        restApiId: restApiId,
        stageName: stageName,
        patchOperations: patchOps
      };

      apiGateway.updateStage(params, function (err, data) {
        if (err) {
          let errorMessage = `Error: ${JSON.stringify(err)} | Stack Trace: ${err.stack}`;
          tsm.message({text: errorMessage});
          reject({message: errorMessage});
        } else {
          tsm.message({text: `${JSON.stringify(data)}`});
          tsm.progressFinish(`Configuring Api Gateway Settings for Stage. [Stage: ${stageName}] [ApiGatewayId: ${restApiId}]`);
          resolve();
        }
      });
    }).asCallback(callback);
  }

  configureApiGatewaySettings(stageName, restApiId, patchOps, callback) {
    return new Promise((resolve, reject) => {
      tsm.progressStart(`Configuring Api Gateway Settings for [stageName: ${stageName}]. [ApiGatewayId: ${restApiId}]`);
      let apiGatewayParams = {
        apiVersion: '2015-07-09',
        accessKeyId: this._accessKey,
        secretAccessKey: this._secretKey,
        sslEnabled: true,
        region: this._region
      };

      let patches = patchOps;

      tsm.progressMessage(`Patch updates: ${JSON.stringify(patchOps)}`);
      patches = patches.concat(patchOps);
      tsm.progressMessage(`patch updates after concat: ${JSON.stringify(patches)}`);

      let apiGateway = new AWS.APIGateway(apiGatewayParams);
      let params = {
        restApiId: restApiId,
        stageName: stageName,
        patchOperations: patches
      };
      tsm.progressMessage(`updateStage params: ${JSON.stringify(params)}`);
      apiGateway.updateStage(params, function (err, data) {
        if (err) {
          let errorMessage = `Error: ${err} | Stack Trace: ${err.stack}`;
          tsm.message({text: errorMessage});
          reject({message: errorMessage});
        } else {
          tsm.message({text: `${JSON.stringify(data)}`});
          tsm.progressFinish(`Configuring Api Gateway Settings for Int Stage. [ApiGatewayId: ${restApiId}]`);
          resolve();
        }
      });
    }).asCallback(callback);
  };

  createBasePathMapping(stageName, domainName, apiGatewayId, apiBasePath, callback) {
    tsm.progressStart(`Creating BasePath Mapping for 'int' Stage. [DomainName: ${domainName}] [ApiGatewayId: ${apiGatewayId}]`);
    let apiGatewayParams = {
      accessKeyId: this._accessKey,
      secretAccessKey: this._secretKey,
      sslEnabled: true,
      region: this._region
    };

    let apigateway = new AWS.APIGateway(apiGatewayParams);

    let params = {
      domainName: domainName,
      basePath: apiBasePath,
      stage: stageName,
      restApiId: apiGatewayId
    };

    apigateway.createBasePathMapping(params, function (err, data) {
      if (err) tsm.message({text: `Error: ${err} | Stack Trace: ${err.stack}`}); // an error occurred
      else {
        // successful response
        tsm.message({text: `${JSON.stringify(data)}`});
        tsm.progressFinish(`Creating BasePath Mapping for 'int' Stage. [DomainName: ${domainName}] [ApiGatewayId: ${apiGatewayId}]`);
        callback();
      }
    });

  };

  /**
   * this method uses the jar files to promote the swagger document to the api reference
   * @deprecated Please for api gateway and swagger upload, use @see {@link createSwagger} or @see {@link overwriteSwagger} methods
   * @param apiGatewayName
   * @param swaggerJsonPath
   * @param callback
   */
  createApiGateway(apiGatewayName, swaggerJsonPath, callback) {
    tsm.progressStart(`Creating API Gateway - ${apiGatewayName}`);
    let asoluteJsonPath = path.resolve(swaggerJsonPath);
    let apiGatewayImporterConsoleOptions = {
      env: {
        AWS_ACCESS_KEY_ID: this._accessKey,
        AWS_SECRET_ACCESS_KEY: this._secretKey
      },
      cwd: path.join(__dirname, `${lib_directory}`)
    };
    let resolvedPath;
    if (isWindows()) {
      resolvedPath = path.normalize('./aws-api-import.cmd');
    }
    else {
      resolvedPath = './aws-api-import.sh';
    }
    tsm.message({text: `Resolved Path: ${resolvedPath}`});
    let apiGatewayImporter = spawn(`${resolvedPath}`, ['-c', '-r', this._region, asoluteJsonPath], apiGatewayImporterConsoleOptions);
    let tempApiId = '';

    apiGatewayImporter.stdout.on('data', function (data) {
      let trimmedData = data.toString('utf8').replace(/(\n|\r)+$/, '');
      tsm.message({text: `${trimmedData}`});

      if (tempApiId === '') {
        let myRegexp = /Creating method for api id ([a-z0-9]+)/i;
        if (myRegexp.test(data)) {
          let match = myRegexp.exec(data);
          tempApiId = match[1];
          tsm.message({text: `TempApiId:  ${tempApiId}`});
        }
      }
      if (tempApiId === '') {
        tsm.message({text: `TempApiId:  ${tempApiId}`});
      }
    });
    apiGatewayImporter.stderr.on('data', function (data) {
      tsm.message({text: `${data}`, status: 'ERROR'});
    });
    apiGatewayImporter.on('close', function (code) {
      tsm.message({text: `Child process exited with code ${code}`});

      tsm.progressFinish(`Creating API Gateway - ${apiGatewayName}`);
      callback(tempApiId);
    });
  };

  /**
   * this method uses the jar files to promote the swagger document to the api reference
   * @deprecated Please for api gateway and swagger upload, use @see {@link createSwagger} or @see {@link overwriteSwagger} methods
   * @param apiGatewayId
   * @param swaggerJsonPath
   * @param callback
   */
  updateAndDeployToIntStage(apiGatewayId, swaggerJsonPath, callback) {
    tsm.progressStart(`Updating API Gateway -  ${apiGatewayId}`);
    let asoluteJsonPath = path.resolve(swaggerJsonPath);
    let apiGatewayImporterConsoleOptions = {
      env: {
        AWS_ACCESS_KEY_ID: this._accessKey,
        AWS_SECRET_ACCESS_KEY: this._secretKey
      },
      cwd: path.join(__dirname, `${lib_directory}`)
    };
    let resolvedPath;
    if (isWindows()) {
      resolvedPath = path.normalize('./aws-api-import.cmd');
    }
    else {
      resolvedPath = './aws-api-import.sh';
    }
    tsm.message({text: `Resolved Path: ${resolvedPath}`});
    let apiGatewayImporter = spawn(`${resolvedPath}`, ['-u', apiGatewayId, '-d', constants.env.INTEGRATION.ShortName, '-r', this._region, asoluteJsonPath], apiGatewayImporterConsoleOptions);

    apiGatewayImporter.stdout.on('data', function (data) {
      let trimmedData = data.toString('utf8').replace(/(\n|\r)+$/, '');
      tsm.message({text: `${trimmedData}`});
    });
    apiGatewayImporter.stderr.on('data', function (data) {
      tsm.message({text: `${data}`, status: 'ERROR'});
    });
    apiGatewayImporter.on('close', function (code) {
      tsm.message({text: `Child process exited with code ${code}`});
      if (0 !== code) {
        throw new gulpUtil.PluginError({
          plugin: 'updateAndDeployToIntegration',
          message: 'API Gateway update failed.'
        });
      }
      tsm.progressFinish(`Updating API Gateway -  ${apiGatewayId}`);
      callback();
    });
  };

  /**
   * Executes integration test for the given Api Gateway ID
   * @param apiGatewayId
   * @param callback
   */
  runIntegrationTest(apiGatewayId, testPath, callback) {
    let apiGatewayUri = `https://${apiGatewayId}.execute-api.us-east-1.amazonaws.com/int/`;
    tsm.message({text: `Uri: ${apiGatewayUri}`});
    return gulp.src(testPath, {read: false})
      .pipe(mocha({
        env: {API_URL: `${apiGatewayUri}`},
        reporter: 'mocha-teamcity-reporter',
        compilers: 'js:babel-core/register'
      }))
      .on('end', () => {
        callback();
      });
  };

  /**
   *
   * @param parameters
   * @param parameters.apiGatewayId
   * @param parameters.originName Name of the CloudFront Origin
   * @param parameters.cname CNAME of the cloudfront distribution
   * @param parameters.gatewayPathRegex
   * @returns {Promise.<T>}
   */
  connectGatewayToCloudFrontForIntStage(parameters) {
    let params = parameters || {};

    let cname = params.cname || constants.env.INTEGRATION.Host;
    let originId = params.originName || uuid.v4().replace(/-/g, '');
    let apiGatewayDomainName = `${params.apiGatewayId}.execute-api.us-east-1.amazonaws.com`;
    let apiGatewayPath = '/int';

    let originDefintion = {
      DomainName: apiGatewayDomainName, /* required */
      OriginPath: apiGatewayPath,
      Id: originId, /* required */
      CustomHeaders: {
        Quantity: 0,
        Items: []
      },
      CustomOriginConfig: {
        HTTPPort: 80, /* required */
        HTTPSPort: 443, /* required */
        OriginProtocolPolicy: 'https-only', /* required */
        OriginSslProtocols: {
          Items: [/* required */
            'TLSv1',
            'TLSv1.1',
            'TLSv1.2'
          ],
          Quantity: 3 /* required */
        }
      }
    };

    let cacheBehaviorDefintion = {
      ForwardedValues: {
        /* required */
        Cookies: {
          /* required */
          Forward: 'none', /* required */
          WhitelistedNames: {
            Quantity: 0, /* required */
            Items: []
          }
        },
        QueryString: true, /* required */
        Headers: {
          Quantity: 4, /* required */
          Items: [
            'x-vol-tenant',
            'x-vol-test',
            'accept',
            'authorization'
          ]
        }
      },
      MinTTL: 0, /* required */
      PathPattern: params.gatewayPathRegex, /* required */
      TargetOriginId: originId, /* required */
      TrustedSigners: {
        /* required */
        Enabled: false, /* required */
        Quantity: 0, /* required */
        Items: []
      },
      ViewerProtocolPolicy: 'redirect-to-https', /* required */
      AllowedMethods: {
        Items: [/* required */
          'GET',
          'HEAD',
          'POST',
          'PUT',
          'PATCH',
          'OPTIONS',
          'DELETE'
        ],
        Quantity: 7, /* required */
        CachedMethods: {
          Items: [/* required */
            'GET',
            'HEAD',
            'OPTIONS'
          ],
          Quantity: 3 /* required */
        }
      },
      Compress: true,
      DefaultTTL: 0,
      MaxTTL: 0,
      SmoothStreaming: false
    };

    console.log(`Retrieving CloudFront Distribution [CNAME: ${cname}]`);

    return this._cloudFrontService.getDistributionByCName(cname).then((distribution) => {
      if (__.isEmpty(distribution)) {
        throw new Error("Distribution not found!");
      }

      this._cloudFrontService.createOriginAndCacheBehavior(distribution, originDefintion, cacheBehaviorDefintion, function (err, data) {
        if (err) console.log(err);
        else console.log(data);
      });
    })
      .catch(err => {
        console.log(err);
        throw err;
      });
  }


  /**
   *
   * @param parameters
   * @param parameters.apiGatewayId
   * @param parameters.originName Name of the CloudFront Origin
   * @param parameters.cname CNAME of the cloudfront distribution
   * @param parameters.gatewayPathRegex
   * @returns {Promise.<T>}
   */
  connectGatewayToCloudFrontForSandStage(parameters) {
    let params = parameters || {};

    let cname = params.cname || constants.env.SANDBOX.Host;
    let originId = params.originName || uuid.v4().replace(/-/g, '');
    let apiGatewayDomainName = `${params.apiGatewayId}.execute-api.us-east-1.amazonaws.com`;
    let apiGatewayPath = '/sand';

    let originDefintion = {
      DomainName: apiGatewayDomainName, /* required */
      OriginPath: apiGatewayPath,
      Id: originId, /* required */
      CustomHeaders: {
        Quantity: 0,
        Items: []
      },
      CustomOriginConfig: {
        HTTPPort: 80, /* required */
        HTTPSPort: 443, /* required */
        OriginProtocolPolicy: 'https-only', /* required */
        OriginSslProtocols: {
          Items: [/* required */
            'TLSv1',
            'TLSv1.1',
            'TLSv1.2'
          ],
          Quantity: 3 /* required */
        }
      }
    };

    let cacheBehaviorDefintion = {
      ForwardedValues: {
        /* required */
        Cookies: {
          /* required */
          Forward: 'none', /* required */
          WhitelistedNames: {
            Quantity: 0, /* required */
            Items: []
          }
        },
        QueryString: true, /* required */
        Headers: {
          Quantity: 4, /* required */
          Items: [
            'x-vol-tenant',
            'x-vol-test',
            'accept',
            'authorization'
          ]
        }
      },
      MinTTL: 0, /* required */
      PathPattern: params.gatewayPathRegex, /* required */
      TargetOriginId: originId, /* required */
      TrustedSigners: {
        /* required */
        Enabled: false, /* required */
        Quantity: 0, /* required */
        Items: []
      },
      ViewerProtocolPolicy: 'redirect-to-https', /* required */
      AllowedMethods: {
        Items: [/* required */
          'GET',
          'HEAD',
          'POST',
          'PUT',
          'PATCH',
          'OPTIONS',
          'DELETE'
        ],
        Quantity: 7, /* required */
        CachedMethods: {
          Items: [/* required */
            'GET',
            'HEAD',
            'OPTIONS'
          ],
          Quantity: 3 /* required */
        }
      },
      Compress: true,
      DefaultTTL: 0,
      MaxTTL: 0,
      SmoothStreaming: false
    };

    console.log(`Retrieving CloudFront Distribution [CNAME: ${cname}]`);

    return this._cloudFrontService.getDistributionByCName(cname).then((distribution) => {
      if (__.isEmpty(distribution)) {
        throw new Error("Distribution not found!");
      }

      this._cloudFrontService.createOriginAndCacheBehavior(distribution, originDefintion, cacheBehaviorDefintion, function (err, data) {
        if (err) console.log(err);
        else console.log(data);
      });
    })
      .catch(err => {
        console.log(err);
        throw err;
      });
  }

  /**
   *
   * @param parameters
   * @param parameters.apiGatewayId
   * @param parameters.originName Name of the CloudFront Origin
   * @param parameters.cname CNAME of the cloudfront distribution
   * @param parameters.gatewayPathRegex
   * @returns {Promise.<T>}
   */
  connectGatewayToCloudFrontForProdStage(parameters) {
    let params = parameters || {};

    let cname = params.cname || constants.env.PRODUCTION.Host;
    let originId = params.originName || uuid.v4().replace(/-/g, '');
    let apiGatewayDomainName = `${params.apiGatewayId}.execute-api.us-east-1.amazonaws.com`;
    let apiGatewayPath = '/prod';

    let originDefintion = {
      DomainName: apiGatewayDomainName, /* required */
      OriginPath: apiGatewayPath,
      Id: originId, /* required */
      CustomHeaders: {
        Quantity: 0,
        Items: []
      },
      CustomOriginConfig: {
        HTTPPort: 80, /* required */
        HTTPSPort: 443, /* required */
        OriginProtocolPolicy: 'https-only', /* required */
        OriginSslProtocols: {
          Items: [/* required */
            'TLSv1',
            'TLSv1.1',
            'TLSv1.2'
          ],
          Quantity: 3 /* required */
        }
      }
    };

    let cacheBehaviorDefintion = {
      ForwardedValues: {
        /* required */
        Cookies: {
          /* required */
          Forward: 'none', /* required */
          WhitelistedNames: {
            Quantity: 0, /* required */
            Items: []
          }
        },
        QueryString: true, /* required */
        Headers: {
          Quantity: 4, /* required */
          Items: [
            'x-vol-tenant',
            'x-vol-test',
            'accept',
            'authorization'
          ]
        }
      },
      MinTTL: 0, /* required */
      PathPattern: params.gatewayPathRegex, /* required */
      TargetOriginId: originId, /* required */
      TrustedSigners: {
        /* required */
        Enabled: false, /* required */
        Quantity: 0, /* required */
        Items: []
      },
      ViewerProtocolPolicy: 'redirect-to-https', /* required */
      AllowedMethods: {
        Items: [/* required */
          'GET',
          'HEAD',
          'POST',
          'PUT',
          'PATCH',
          'OPTIONS',
          'DELETE'
        ],
        Quantity: 7, /* required */
        CachedMethods: {
          Items: [/* required */
            'GET',
            'HEAD',
            'OPTIONS'
          ],
          Quantity: 3 /* required */
        }
      },
      Compress: true,
      DefaultTTL: 0,
      MaxTTL: 0,
      SmoothStreaming: false
    };

    console.log(`Retrieving CloudFront Distribution [CNAME: ${cname}]`);

    return this._cloudFrontService.getDistributionByCName(cname).then((distribution) => {
      if (__.isEmpty(distribution)) {
        throw new Error("Distribution not found!");
      }

      this._cloudFrontService.createOriginAndCacheBehavior(distribution, originDefintion, cacheBehaviorDefintion, function (err, data) {
        if (err) console.log(err);
        else console.log(data);
      });
    })
      .catch(err => {
        console.log(err);
        throw err;
      });
  }

  createDirectoryIfNotExist(folderPath) {
    try {
      let tmpStat = fs.statSync(folderPath);
    }
    catch (err) {
      //if it fails, then we create new folder
      fs.mkdirSync(folderPath);
    }
  }

  /**
   *
   * @param {string} apiGatewayId
   * @param {object} swaggerEntity
   * @return {Promise<object>} the object will have the following:  id, name, createdDate
   * @param {boolean} [failOnWarnings=false] This is exposed, but from testing this doesn't work.
   * @throws {Promise<Error>} can throw an error if accessKey, secretKey, apiGatewayId, swaggerEntity, or date is null, undefined, or empty respectively.
   */
  overwriteSwagger(apiGatewayId, swaggerEntity, failOnWarnings = false) {
    tsm.progressStart(`overwriting swagger for [ApiGatewayId: ${apiGatewayId}]`);

    var options = {
      restApiId: apiGatewayId,
      body: JSON.stringify(swaggerEntity),
      failOnWarnings: failOnWarnings,
      mode: "overwrite"
    };

    return new Promise((resolve, reject) => {
      this._apiGateway.putRestApi(options, function (err, data) {
        if (err) {
          return reject(err);
        }

        return resolve(data);
      });
    });
  };

  /**
   *
   * @param {string} apiName
   * @param {Object} swaggerEntity
   * @param {number} [delayInMilliseconds=16000] this defaults to 16 seconds
   * @param {boolean} [failOnWarnings=false]
   * @return {Promise<Object>|Promise<gulpUtil.PluginError>}
   */
  overwriteSwaggerByName(apiName, swaggerEntity, delayInMilliseconds = 16000, failOnWarnings = false) {
    let methodName = 'overwriteSwaggerByName';
    if (util.isNullOrUndefined(apiName)) {
      return Promise.reject(new gulpUtil.PluginError({
        plugin: methodName,
        message: `apiName is not valid [apiName: ${this.getObjectAsString(apiName)}]`
      }));
    }

    return this.lookupApiGatewayByName(apiName).delay(delayInMilliseconds).then((foundApiId)=> {
      if (util.isNullOrUndefined(foundApiId)) {
        return Promise.reject(new gulpUtil.PluginError({
          plugin: methodName,
          message: "foundApiId is null or undefined (no match found)"
        }));
      }

      this.logMessage(`Found the foundApid: ${foundApiId}`);

      return this.overwriteSwagger(foundApiId, swaggerEntity, failOnWarnings).delay(delayInMilliseconds).then((data) => {
        tsm.progressFinish(`${methodName} was a success ${this.getObjectAsString(data)}`);
        return Promise.resolve(data);
      }).catch((error) => {
        return Promise.reject(new gulpUtil.PluginError({
          plugin: methodName,
          message: this.getObjectAsString(error)
        }));
      });
    }).catch((err)=> {
      return Promise.reject(err);
    });
  }

  /**
   * Will stand up a new api gateway using the title within the swagger entity
   * @param {object} swaggerEntity
   * @param {boolean} [failOnWarnings=false] This is exposed, but from testing this doesn't work.
   * @return {Promise<object>} the object will have the following:  id, name, createdDate
   */
  createSwagger(swaggerEntity, failOnWarnings = false) {
    tsm.progressStart(`createSwagger swagger for [Swagger Title: ${swaggerEntity.info.title}]`);

    var options = {
      body: JSON.stringify(swaggerEntity),
      failOnWarnings: failOnWarnings
    };

    return new Promise((resolve, reject) => {
      this._apiGateway.importRestApi(options, function (err, data) {
        if (err) {
          return reject(err);
        }

        tsm.progressFinish(`createSwagger swagger for [Swagger Title: ${swaggerEntity.info.title}] completed`);
        return resolve(data);
      });
    });
  };

  /**
   * This will do the following: 1. lookup api by swagger title, 2. delay 3a. if api not found create the new api, 3b. if api found it will update it 4. delay again
   * @param {Object} swaggerEntity Note: swaggerEntity must have valid info.title. Pulling from here because the is the aws importer strategy
   * @param {number} [delayInMilliseconds=16000] this defaults to 16 seconds
   * @param {boolean} [failOnWarnings=false]
   * @return {Promise<Object>|Promise<gulpUtil.PluginError>}
   */
  createOrOverwriteApiSwagger(swaggerEntity, delayInMilliseconds = 16000, failOnWarnings = false){
    let methodName = 'createOrOverwriteApiSwagger';

    if (util.isNullOrUndefined(swaggerEntity)){
      return Promise.reject(new gulpUtil.PluginError({
        plugin: methodName,
        message: `swaggerEntity is null or undefined [swaggerEntity: ${this.getObjectAsString(swaggerEntity)}]`
      }));
    }

    if (!swaggerEntity.hasOwnProperty("info") || !swaggerEntity.info.hasOwnProperty("title")){
      return Promise.reject(new gulpUtil.PluginError({
        plugin: methodName,
        message: `swaggerEntity must contain info and title [swaggerEntity: ${this.getObjectAsString(swaggerEntity)}]`
      }));
    }

    if (util.isNullOrUndefined(swaggerEntity.info.title) || swaggerEntity.info.title === ""){
      return Promise.reject(new gulpUtil.PluginError({
        plugin: methodName,
        message: `swaggerEntity.info.title is null, undefined, or empty [swaggerEntity: ${this.getObjectAsString(swaggerEntity)}]`
      }));
    }

    return this.lookupApiGatewayByName(swaggerEntity.info.title).delay(delayInMilliseconds).then((foundApiId)=> {
      if (util.isNullOrUndefined(foundApiId)) {
        this.logMessage(`${methodName}: creating api gateway`);
        return this.createSwagger(swaggerEntity, failOnWarnings).delay(delayInMilliseconds);
      }

      this.logMessage(`${methodName}: Found the [foundApid: ${foundApiId}]`);

      return this.overwriteSwagger(foundApiId, swaggerEntity, failOnWarnings).delay(delayInMilliseconds).then((data) => {
        tsm.progressFinish(`${methodName} was a success ${this.getObjectAsString(data)}`);
        return Promise.resolve(data);
      }).catch((error) => {
        return Promise.reject(new gulpUtil.PluginError({
          plugin: methodName,
          message: this.getObjectAsString(error)
        }));
      });
    }).catch((err)=> {
      return Promise.reject(err);
    });
  }

  /**
   * This will write the text to teamcity by doing the following: "tsm.message({"text": text});" If tsm does not exist, it will log to the console doing following: "console.log(text)".
   * @param {string} text
   * @param {string} [propertyValue=text]
   */
  logMessage(text, propertyValue = "text") {
    if (tsm) {
      var newVar = {};
      newVar[propertyValue] = text;

      tsm.message(newVar);
    }
    else {
      console.log(text);
    }
  }

  /**
   * append a build number pattern to the packageJson.version
   * @param {Object} packageJson
   * @param {string} [pattern='.{build.number}']
   */
  setBuildNumber(packageJson, pattern = '.{build.number}') {
    if (util.isNullOrUndefined(packageJson)) {
      var error = new Error("Failure. packageJson is null or undefined");
      this.logMessage(error.message);
      throw error;
    }

    tsm.buildNumber(packageJson.version + pattern);
  }

  /**
   *
   * @param {Object} environment @see {@link ./src/constants}
   * @param {string} apiName
   * @param {number} [delayInMilliseconds=16000] this defaults to 16 seconds
   * @return {Promise<Object>|Promise<gulpUtil.PluginError>}
   */
  deployApiGatewayToStageForEnvByGatewayName(environment, apiName, delayInMilliseconds = 16000) {
    let methodName = 'deployApiGatewayToStageForEnvByGatewayName';
    let unknown = "UNK";

    if (util.isNullOrUndefined(environment) ||
      util.isNullOrUndefined(environment.FullName) ||
      environment.FullName.toLocaleUpperCase() === unknown ||
      util.isNullOrUndefined(environment.ShortName) ||
      environment.ShortName.toLocaleUpperCase() === unknown) {

      return Promise.reject(new gulpUtil.PluginError({
        plugin: methodName,
        message: `environment is not valid [environment: ${this.getObjectAsString(environment)}]`
      }));
    }

    if (util.isNullOrUndefined(apiName) || apiName === '') {
      return Promise.reject(new gulpUtil.PluginError({
        plugin: methodName,
        message: 'apiName is null or undefined'
      }));
    }

    return this.lookupApiGatewayByName(apiName).delay(delayInMilliseconds).then((foundApiId)=> {
      if (util.isNullOrUndefined(foundApiId)) {
        return Promise.reject(new gulpUtil.PluginError({
          plugin: methodName,
          message: "foundApiId is null or undefined (no match found)"
        }));
      }

      this.logMessage(`Found the foundApid: ${foundApiId}`);

      return this.deployApiGatewayToStage(
        foundApiId,
        environment.ShortName,
        environment.FullName).delay(delayInMilliseconds).then((data) => {
        this.logMessage(`deployApiGatewayToStageForEnvByGatewayName was a success ${this.getObjectAsString(data)}`);
        return Promise.resolve(data);
      }).catch((error) => {
        return Promise.reject(new gulpUtil.PluginError({
          plugin: methodName,
          message: this.getObjectAsString(error)
        }));
      });
    }).catch((err)=> {
      return Promise.reject(err);
    });
  };

  /**
   * Per AWS team, they have their own implementation of a swagger 2.0 validator. At the time of this writing, they will fail with the following:
   * 1. readOnly: true
   * 2. schema: { type: "string", description: "nothing"}
   * 3. schema: { type: "boolean", description: "Bool Result"}
   * Because of this, we remove readonly, replace both simple schemas, and then add them to a definitions area if they are referenced.
   * We then create a file for later use. Note, this hack might go away if they ever implement this on their side.
   * @param {string} filePathAndName
   * @param {Object} swaggerEntity
   * @return {Promise<Object>|Promise<gulpUtil.PluginError>}
   */
  createAwsSwaggerFile(filePathAndName, swaggerEntity) {
    if (util.isNullOrUndefined(filePathAndName) || filePathAndName === '') {
      return Promise.reject(new gulpUtil.PluginError({
        plugin: "createAwsSwaggerFile",
        message: `filePathAndName is invalid: '${this.getObjectAsString(filePathAndName)}'`
      }));
    }

    if (util.isNullOrUndefined(swaggerEntity)) {
      return Promise.reject(new gulpUtil.PluginError({
        plugin: "createAwsSwaggerFile",
        message: 'swaggerEntity is null or undefined'
      }));
    }

    let fsp = new fileSystem();
    let awsSwaggerString = JSON.stringify(swaggerEntity);

    let schemaStringResponseDefinition = '"schema":{"$ref": "#/definitions/StringResponse"}';
    let schemaBoolResponseDefinition = '"schema":{"$ref": "#/definitions/BooleanResponse"}';

    //point the schema to the StringResponse definition
    awsSwaggerString = awsSwaggerString.replace(
      new RegExp(
        '"schema":{"type":"string","description":"nothing"}', 'g'),
      schemaStringResponseDefinition, 'g');

    awsSwaggerString = awsSwaggerString.replace(
      new RegExp(
        '"schema":{"description":"nothing","type":"string"}', 'g'),
      schemaStringResponseDefinition, 'g');

    //point the schema to the StringResponse definition
    awsSwaggerString = awsSwaggerString.replace(
      new RegExp(
        '"schema":{"type":"boolean","description":"Bool Result"}', 'g'),
      schemaBoolResponseDefinition, 'g');

    awsSwaggerString = awsSwaggerString.replace(
      new RegExp(
        '"schema":{"description":"Bool Result","type":"boolean"}', 'g'),
      schemaBoolResponseDefinition, 'g');

    //remove the readOnly
    awsSwaggerString = awsSwaggerString.replace(new RegExp(',"readOnly":true', 'g'), '');

    let awsSwaggerEntity = JSON.parse(awsSwaggerString);

    if (awsSwaggerString.indexOf(schemaStringResponseDefinition) !== -1 ||
      awsSwaggerString.indexOf(schemaBoolResponseDefinition) !== -1) {
      if (!awsSwaggerEntity.hasOwnProperty("definitions")) {
        awsSwaggerEntity.definitions = {};
      }

      if (awsSwaggerString.indexOf(schemaStringResponseDefinition) !== -1 &&
        !awsSwaggerEntity.definitions.hasOwnProperty("StringResponse")) {
        awsSwaggerEntity.definitions.StringResponse = {
          "type": "string",
          "description": "nothing"
        }
      }

      if (awsSwaggerString.indexOf(schemaBoolResponseDefinition) !== -1 &&
        !awsSwaggerEntity.definitions.hasOwnProperty("BooleanResponse")) {
        awsSwaggerEntity.definitions.BooleanResponse = {
          "type": "boolean",
          "description": "Bool Result"
        }
      }
    }

    return fsp.save(filePathAndName, awsSwaggerEntity).then((data) => {
      return Promise.resolve(data);
    }).catch((err) => {
      return Promise.reject(new gulpUtil.PluginError({
        plugin: "createAwsSwaggerFile",
        message: DeployUtils.getObjectAsString(err)
      }));
    });
  }

  /**
   *
   * @param {string} environmentFullName should match integration, production, or sandbox
   * @return {{FullName:, ShortName:, Host:}}
   */
  getEnvironmentConstants(environmentFullName) {
    switch (environmentFullName.toLocaleUpperCase()) {
      case constants.env.INTEGRATION.FullName.toLocaleUpperCase():
        return constants.env.INTEGRATION;
      case constants.env.PRODUCTION.FullName.toLocaleUpperCase():
        return constants.env.PRODUCTION;
      case constants.env.SANDBOX.FullName.toLocaleUpperCase():
        return constants.env.SANDBOX;
      default:
        return {
          FullName: "UKN",
          ShortName: "UKN",
          Host: "UKN"
        };
    }
  }

  /**
   * a method to transform the entity into a string. If the entity is null or undefined, it will result in an empty string.
   * @param entity
   * @return {string}
   */
  getObjectAsString(entity) {
    return util.isNullOrUndefined(entity) ? '' : JSON.stringify(entity)
  }
}

function isWindows() {
  var isWin = /^win/.test(process.platform);
  return isWin;
}

module.exports = DeployUtils;
