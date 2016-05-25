let AWS = require('aws-sdk'),
  expect = require('chai').expect;
describe('Should Grab Routes from Gateway', function () {
  xit('hope it works', (done) => {
    let apiGatewayParams = {
      apiVersion: '2015-07-09',
      accessKeyId: '***',
      secretAccessKey: '***',
      sslEnabled: true,
      region: 'us-east-1'
    };
    let apiGateway = new AWS.APIGateway(apiGatewayParams);

    let params = {
      restApiId: 'ypisctp73i'
    };
    let resources = [];
    apiGateway.getResources(params, function (err, data) {
      if (err) {
        console.log(err, err.stack);
        expect.fail();
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
        console.log(resources);
        let blacklistedRoutes = ['/calc/GET', '/calc/{operand1}/{operand2}/{operator}/GET'];
        // let blacklistedRoutes = [];

        resources = resources.filter(function(x) { return blacklistedRoutes.indexOf(x) < 0 });

        console.log('Update Blacklist Routes: ' + JSON.stringify(resources));
        let updateStageParams = {
          restApiId: 'ypisctp73i',
          stageName: 'test',
          patchOperations: []
        };
        for (let index = 0; index < resources.length; index++) {
          updateStageParams.patchOperations.push({
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
        console.log('Update Params' + JSON.stringify(updateStageParams));
        apiGateway.updateStage(updateStageParams, function (err, data) {
            if (err) {
              console.log(err, err.stack);
              expect.fail();
            } else {
              console.log(data);
            }
            done()
          }
        );
      }
    });
  });
});

