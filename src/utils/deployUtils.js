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
  }

  deployApiGatewayToInt(apiGatewayId, callback) {
    this._deployApiGatewayToStage(apiGatewayId,
      constants.env.INTEGRATION.ShortName,
      constants.env.INTEGRATION.FullName,
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
          //throw error??
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
      tsm.message(`DeployApiGatewayToStage Error: ${err}`);
    }
  };

  lookupApiGatewayByName(apiGatewayName, callback) {

    return new Promise((resolve, reject) => {
      tsm.progressStart(`Checking if API Gateway exists. [ApiGatewayName: ${apiGatewayName}]`);

      try {
        let apiGatewayParams = {
          apiVersion: '2015-07-09',
          accessKeyId: this._accessKey,
          secretAccessKey: this._secretKey,
          sslEnabled: true,
          region: this._region
        };

        let params = {};

        let apigatewayClient = new AWS.APIGateway(apiGatewayParams);
        apigatewayClient.getRestApis(params, function (err, data) {
          if (err) {
            let errorMessage = `Error: ${err}| Error Stack Trace: ${err.stack}`;
            tsm.message({text: errorMessage});
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
        tsm.message({text: errorMessage});
        reject(errorMessage);
      }
    }).asCallback(callback);
  };

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

  configureApiGatewaySettingsForProd(restApiId, callback) {
    return new Promise((resolve, reject) => {
      tsm.progressStart(`Configuring Api Gateway Settings for Prod Stage. [ApiGatewayId: ${restApiId}]`);

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
        stageName: constants.env.PRODUCTION.ShortName,
        patchOperations: [
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
          }]
      };

      apiGateway.updateStage(params, function (err, data) {
        if (err) {
          let errorMessage = `Error: ${err} | Stack Trace: ${err.stack}`;
          tsm.message({text: errorMessage});
          reject({message: errorMessage});
        } else {
          tsm.message({text: `${JSON.stringify(data)}`});
          tsm.progressFinish(`Configuring Api Gateway Settings for Prod Stage. [ApiGatewayId: ${restApiId}]`);
          resolve();
        }
      });
    }).asCallback(callback);
  };


  configureApiGatewaySettingsForInt(restApiId, callback) {
    return new Promise((resolve, reject) => {
      tsm.progressStart(`Configuring Api Gateway Settings for Int Stage. [ApiGatewayId: ${restApiId}]`);
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
        stageName: constants.env.INTEGRATION.ShortName,
        patchOperations: [
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
          }]
      };

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
  
  configureApiGatewaySettingsForInt2(restApiId, blacklistedPaths, callback) {
    return new Promise((resolve, reject) => {
      tsm.progressStart(`Configuring Api Gateway Settings for Int Stage. [ApiGatewayId: ${restApiId}]`);
      let apiGatewayParams = {
        apiVersion: '2015-07-09',
        accessKeyId: this._accessKey,
        secretAccessKey: this._secretKey,
        sslEnabled: true,
        region: this._region
      };

      let patches = [
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
            value: 'true'
          }];
      tsm.progressMessage(`patch updates before concat: ${JSON.stringify(patches)}`);
      let blackListed = this._buildBlacklistedPathsJSON(blacklistedPaths);
      patches.concat(blackListed);      
      tsm.progressMessage(`patch updates after concat: ${JSON.stringify(patches)}`);
      
      let apiGateway = new AWS.APIGateway(apiGatewayParams);
      let params = {
        restApiId: restApiId,
        stageName: constants.env.INTEGRATION.ShortName,
        patchOperations: patches
      };
      
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

  configureApiGatewaySettingsForProd2(restApiId, blacklistedPaths, callback) {
    return new Promise((resolve, reject) => {
      tsm.progressStart(`Configuring Api Gateway Settings for Prod Stage. [ApiGatewayId: ${restApiId}]`);
      let apiGatewayParams = {
        apiVersion: '2015-07-09',
        accessKeyId: this._accessKey,
        secretAccessKey: this._secretKey,
        sslEnabled: true,
        region: this._region
      };

      let patches = [
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
          value: 'true'
        }];

      tsm.progressMessage(`patch updates before concat: ${JSON.stringify(patches)}`);
      let blackListed = this._buildBlacklistedPathsJSON(blacklistedPaths);
      patches.concat(blackListed);      
      tsm.progressMessage(`patch updates after concat: ${JSON.stringify(patches)}`);
      let apiGateway = new AWS.APIGateway(apiGatewayParams);

      let params = {
        restApiId: restApiId,
        stageName: constants.env.PRODUCTION.ShortName,
        patchOperations: patches
      };

      apiGateway.updateStage(params, function (err, data) {
        if (err) {
          let errorMessage = `Error: ${err} | Stack Trace: ${err.stack}`;
          tsm.message({text: errorMessage});
          reject({message: errorMessage});
        } else {
          tsm.message({text: `${JSON.stringify(data)}`});
          tsm.progressFinish(`Configuring Api Gateway Settings for Prod Stage. [ApiGatewayId: ${restApiId}]`);
          resolve();
        }
      });
    }).asCallback(callback);
  };

  _buildBlacklistedPathsJSON(blacklistedPaths) {

    let jsonArr = [];

    for (let i = 0; i < blacklistedPaths.length; i++) {
      jsonArr.push({
        op: 'replace',
        path: blacklistedPaths[i],
        value: 'false'
      });

      return jsonArr;
    }
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

}

function isWindows() {
  var isWin = /^win/.test(process.platform);
  return isWin;
}

module.exports = DeployUtils;
