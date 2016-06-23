let AWS = require('aws-sdk'),
  uuid = require('node-uuid'),
  expect = require('chai').expect;
describe('Should Create Cloud Front', function (done) {
  xit('hope it works', (done) => {
    console.log('Creating Cloud Front Distribution');
    let cloudfrontParams = {
      apiVersion: '2016-01-28',
      accessKeyId: 'AKIAIZPUW7DHGJYAKFMA',
      secretAccessKey: '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'
    };
    let params = {
      comment : 'Test Comment',
      apiGatewayUri: '',
      originId: 'testing'+ uuid.v4(),
      alias: 'testing.api.material.com',
      apiGatewayPath: '2ahflj1lp3.execute-api.us-east-1.amazonaws.com/int'
    };
    let cloudFrontParams = {
      DistributionConfig: { /* required */
        CallerReference: 'STRING_VALUE', /* required */
        Comment: params.comment, /* required */
        DefaultCacheBehavior: { /* required */
          ForwardedValues: { /* required */
            Cookies: { /* required */
              Forward: 'none', /* required */
              WhitelistedNames: {
                Quantity: 0, /* required */
                Items: []
              }
            },
            QueryString: false, /* required */
            Headers: {
              Quantity: 0, /* required */
              Items: [ ]
            }
          },
          MinTTL: 0, /* required */
          TargetOriginId: 'STRING_VALUE', /* required */
          TrustedSigners: { /* required */
            Enabled: false, /* required */
            Quantity: 0, /* required */
            Items: [ ]
          },
          ViewerProtocolPolicy: 'redirect-to-https', /* required */
          AllowedMethods: {
            Items: [ /* required */
              'GET',
              'HEAD',
              'POST',
              'PUT',
              'PATCH',
              'OPTIONS',
              'DELETE'
            ],
            Quantity: 0, /* required */
            CachedMethods: {
              Items: [ /* required */
                'GET'
              ],
              Quantity: 0 /* required */
            }
          },
          Compress: false,
          DefaultTTL: 0,
          MaxTTL: 0,
          SmoothStreaming: false
        },
        Enabled: true, /* required */
        Origins: { /* required */
          Quantity: 1, /* required */
          Items: [
            {
              DomainName: params.apiGatewayUri, /* required */
              Id: params.originId, /* required */
              CustomHeaders: {
                Quantity: 0, /* required */
                Items: [ ]
              },
              CustomOriginConfig: {
                HTTPPort: 0, /* required */
                HTTPSPort: 0, /* required */
                OriginProtocolPolicy: 'https-only', /* required */
                OriginSslProtocols: {
                  Items: [ /* required */
                    'SSLv3', 'TLSv1', 'TLSv1.1', 'TLSv1.2'
                  ],
                  Quantity: 0 /* required */
                }
              },
              OriginPath: params.apiGatewayPath
            }
          ]
        },
        Aliases: {
          Quantity: 1, /* required */
          Items: [
            params.alias
          ]
        },
        CacheBehaviors: {
          Quantity: 0, /* required */
          Items: [
            {
              ForwardedValues: { /* required */
                Cookies: { /* required */
                  Forward: 'none', /* required */
                  WhitelistedNames: {
                    Quantity: 0, /* required */
                    Items: [ ]
                  }
                },
                QueryString: true || false, /* required */
                Headers: {
                  Quantity: 0, /* required */
                  Items: [ ]
                }
              },
              MinTTL: 0, /* required */
              PathPattern: 'STRING_VALUE', /* required */
              TargetOriginId: 'STRING_VALUE', /* required */
              TrustedSigners: { /* required */
                Enabled: false, /* required */
                Quantity: 0, /* required */
                Items: [ ]
              },
              ViewerProtocolPolicy: 'redirect-to-https', /* required */
              AllowedMethods: {
                Items: [ /* required */
                  'GET',
                  'HEAD',
                  'POST',
                  'PUT',
                  'PATCH',
                  'OPTIONS',
                  'DELETE'
                ],
                Quantity: 0, /* required */
                CachedMethods: {
                  Items: [ /* required */
                    'GET'
                  ],
                  Quantity: 0 /* required */
                }
              },
              Compress: false,
              DefaultTTL: 0,
              MaxTTL: 0,
              SmoothStreaming: false
            }
          ]
        },
        PriceClass: 'PriceClass_All'
      }
    };

    return new AWS.CloudFront(cloudfrontParams).createDistribution(cloudFrontParams, function(err, data) {
      if(err) {
        console.log(err);
      }
      else {
        console.log(data);
        done();
      }
    });
  });
});
