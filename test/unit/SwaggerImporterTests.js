"use strict";

let chai = require("chai");
let expect = chai.expect;
let chaiAsPromised = require('chai-as-promised');
let SwaggerImporter = require('./../../src/utils/SwaggerImporter');
let uuid = require("node-uuid");
let Promise = require("bluebird");
let sigv4 = require('aws-sigv4');
let dateFormat = require("dateformat");

chai.use(chaiAsPromised);

describe("Swagger Importer unit tests", () => {
  //example from aws
  var swagger = require("./../test-swagger.json");

  let shouldFailTestException = new Error("this should fail");
  let swaggerImporter = null;
  let awsSubDomainRegion = null;

  beforeEach(()=> {
    awsSubDomainRegion = uuid();
    swaggerImporter = new SwaggerImporter(awsSubDomainRegion);
  });

  afterEach(() => {
    swaggerImporter = null;
    awsSubDomainRegion = null;
  });

  describe("and getting request parameters", () => {
    describe("and no session token or auth", () => {
      it("should result in the following object", () => {
        var restApiId = uuid();
        var date = new Date();
        var host = `apigateway.${awsSubDomainRegion}.amazonaws.com`;

        let result = swaggerImporter.getSwaggerOverwriteRequestParameters(restApiId, date, true);

        expect(result.uri.host).to.equal(host);
        expect(result.uri.path).to.equal(`/restapis/${restApiId}`);
        expect(result.qs).to.have.property("mode").that.equals("overwrite");
        expect(result.body).to.equal("");
        expect(result.headers).to.have.property("Content-Type", "application/json");
        expect(result.headers).to.have.property("Host", host);
        expect(result.headers["X-Amz-Security-Token"]).to.equal(undefined);
        expect(result.headers["Authorization"]).to.equal(undefined);
        expect(result.headers).to.have.property("X-Amz-Date", SwaggerImporter.getIsoDate(date, false));
      });
    });

    describe("with session token and no auth", () => {
      it("should result in the following object", () => {
        var sessionToken = uuid();
        var restApiId = uuid();
        var date = new Date();
        var payloadAsString = "";
        var host = `apigateway.${awsSubDomainRegion}.amazonaws.com`;

        let result = swaggerImporter.getSwaggerOverwriteRequestParameters(restApiId, date, true, payloadAsString, sessionToken);

        expect(result.uri.host).to.equal(host);
        expect(result.uri.path).to.equal(`/restapis/${restApiId}`);
        expect(result.qs).to.have.property("mode").that.equals("overwrite");
        expect(result.body).to.equal(payloadAsString);
        expect(result.headers).to.have.property("Content-Type", "application/json");
        expect(result.headers).to.have.property("Host", host);
        expect(result.headers["X-Amz-Security-Token"]).to.equal(sessionToken);
        expect(result.headers["Authorization"]).to.equal(undefined);
        expect(result.headers).to.have.property("X-Amz-Date", SwaggerImporter.getIsoDate(date, false));
      });
    });

    describe("with payload and no session token or auth", () => {
      it("should result in the following object", () => {
        var restApiId = uuid();
        var date = new Date();
        var payloadAsString = uuid();
        var host = `apigateway.${awsSubDomainRegion}.amazonaws.com`;

        let result = swaggerImporter.getSwaggerOverwriteRequestParameters(restApiId, date, true, payloadAsString);

        expect(result.uri.host).to.equal(host);
        expect(result.uri.path).to.equal(`/restapis/${restApiId}`);
        expect(result.qs).to.have.property("mode").that.equals("overwrite");
        expect(result.body).to.equal(payloadAsString);
        expect(result.headers).to.have.property("Content-Type", "application/json");
        expect(result.headers).to.have.property("Host", host);
        expect(result.headers["X-Amz-Security-Token"]).to.equal(undefined);
        expect(result.headers["Authorization"]).to.equal(undefined);
        expect(result.headers).to.have.property("X-Amz-Date", SwaggerImporter.getIsoDate(date, false));
      });
    });

    describe("with session token and no auth", () => {
      it("should result in the following object", () => {
        var sessionToken = uuid();
        var restApiId = uuid();
        var date = new Date();
        var host = `apigateway.${awsSubDomainRegion}.amazonaws.com`;
        var payloadAsString = uuid();

        let result = swaggerImporter.getSwaggerOverwriteRequestParameters(restApiId, date, true, payloadAsString, sessionToken);

        expect(result.uri.host).to.equal(host);
        expect(result.uri.path).to.equal(`/restapis/${restApiId}`);
        expect(result.qs).to.have.property("mode").that.equals("overwrite");
        expect(result.body).to.equal(payloadAsString);
        expect(result.headers).to.have.property("Content-Type", "application/json");
        expect(result.headers).to.have.property("Host", host);
        expect(result.headers["X-Amz-Security-Token"]).to.equal(sessionToken);
        expect(result.headers["Authorization"]).to.equal(undefined);
        expect(result.headers).to.have.property("X-Amz-Date", SwaggerImporter.getIsoDate(date, false));
      });
    });

    describe("with session token and auth", () => {
      it("should result in the following object", () => {
        var sessionToken = uuid();
        var restApiId = uuid();
        var date = new Date();
        var host = `apigateway.${awsSubDomainRegion}.amazonaws.com`;
        var payloadAsString = uuid();

        var authHeader = uuid();
        let result = swaggerImporter.getSwaggerOverwriteRequestParameters(restApiId, date, true, payloadAsString, sessionToken, authHeader);

        expect(result.uri.host).to.equal(host);
        expect(result.uri.path).to.equal(`/restapis/${restApiId}`);
        expect(result.qs).to.have.property("mode").that.equals("overwrite");
        expect(result.body).to.equal(payloadAsString);
        expect(result.headers).to.have.property("Content-Type", "application/json");
        expect(result.headers).to.have.property("Host", host);
        expect(result.headers["X-Amz-Security-Token"]).to.equal(sessionToken);
        expect(result.headers["Authorization"]).to.equal(authHeader);
        expect(result.headers).to.have.property("X-Amz-Date", SwaggerImporter.getIsoDate(date, false));
      });
    });
  });

  describe("and getting date iso format", () => {
    describe("and date only", () => {
      it("should do stuff", () => {
        var date = new Date();
        let result = SwaggerImporter.getIsoDate(date, true);

        var month = date.getMonth() + 1;
        var monthString = month < 10 ? `0${month}` : `${month}`;

        var dateString = date.getDate() < 10 ? `0${date.getDate()}` : `${date.getDate()}`;

        expect(result).to.equal(`${date.getUTCFullYear()}${monthString}${dateString}`);
      });
    });

    describe("and date time", () => {
      it("should do stuff", () => {
        var date = new Date();

        let result = SwaggerImporter.getIsoDate(date, false);

        var month = date.getUTCMonth() + 1;
        var monthString = month < 10 ? `0${month}` : `${month}`;
        var dateString = date.getUTCDate() < 10 ? `0${date.getUTCDate()}` : `${date.getUTCDate()}`;

        var time = dateFormat(date, "UTC:HHMMss");

        var expected = `${date.getUTCFullYear()}${monthString}${dateString}T${time}Z`;

        expect(result).to.equal(expected);
      });
    });
  });

  describe("and overwriteCurrentSwagger", () => {
    describe("and put swagger invalid call", () => {
      describe("and restApiId is invalid", () => {
        it("is undefined", (done) => {
          let restApiId = undefined;
          let swaggerJson = null;

          let result = swaggerImporter.overwriteCurrentSwagger(uuid(), uuid(), restApiId, new Date(), swaggerJson);
          expect(result).to.be.instanceof(Promise);

          result.then(() => {
            throw shouldFailTestException;

          }).catch((error) => {
            expect(error.message).to.equal("restApiId is null, undefined, or empty");
            done();
          });
        });

        it("is null", (done) => {
          let restApiId = null;
          let swaggerJson = null;

          let result = swaggerImporter.overwriteCurrentSwagger(uuid(), uuid(), restApiId, new Date(), swaggerJson);
          expect(result).to.be.instanceof(Promise);

          result.then(() => {
            throw shouldFailTestException;
          }).catch((error) => {
            expect(error.message).to.equal("restApiId is null, undefined, or empty");
            done();
          });
        });

        it("is empty string", (done) => {
          let restApiId = "";
          let swaggerJson = null;

          let result = swaggerImporter.overwriteCurrentSwagger(uuid(), uuid(), restApiId, new Date(), swaggerJson);
          expect(result).to.be.instanceof(Promise);

          result.then(() => {
            throw shouldFailTestException;

          }).catch((error) => {
            expect(error.message).to.equal("restApiId is null, undefined, or empty");
            done();
          });
        });
      });

      describe("and restApiId valid", ()=> {
        describe("and swaggerJson is invalid", () => {
          let restApiId = null;
          beforeEach(()=> {
            restApiId = uuid();
          });

          afterEach(() => {
            restApiId = null;
          });

          it("is undefined", (done) => {
            let swaggerJson = undefined;

            let result = swaggerImporter.overwriteCurrentSwagger(uuid(), uuid(), restApiId, new Date(), swaggerJson, null);
            expect(result).to.be.instanceof(Promise);

            result.then(() => {
              throw shouldFailTestException;

            }).catch((error) => {
              expect(error.message).to.equal("swaggerJson is null or undefined");
              done();
            });
          });

          it("is null", (done) => {
            let swaggerJson = null;

            let result = swaggerImporter.overwriteCurrentSwagger(uuid(), uuid(), restApiId, new Date(), swaggerJson, null);
            expect(result).to.be.instanceof(Promise);

            result.then(() => {
              throw shouldFailTestException;

            }).catch((error) => {
              expect(error.message).to.equal("swaggerJson is null or undefined");
              done();
            });
          });
        });
      });
    });

    describe("and put request valid", () => {
      it("it should return the spec without session token", ()=> {
        var apiId = uuid();

        var swaggerJson = {
          something: uuid()
        };

        let result = swaggerImporter.overwriteCurrentSwagger(uuid(), uuid(), apiId, new Date(), swaggerJson, null);

        expect(result.method).to.equal("PUT");
        expect(result.headers["Content-Type"]).to.equal("application/json");
        expect(result.headers["X-Amz-Date"]).to.not.be.null;
        expect(result.headers["X-Amz-Security-Token"]).to.be.undefined;
        expect(result.headers["Authorization"]).to.not.be.null;
        expect(result.uri.protocol).to.equal("https:");
        expect(result.uri.query).to.equal("failonwarnings=false&mode=overwrite");
        expect(result.uri.host).to.equal(`apigateway.${awsSubDomainRegion}.amazonaws.com`);
        expect(result.body).to.equal(JSON.stringify(swaggerJson));
      });

      it("it should return the spec with session token", ()=> {
        var apiId = uuid();

        var swaggerJson = {
          something: uuid()
        };

        var sessionToken = uuid();
        let result = swaggerImporter.overwriteCurrentSwagger(uuid(), uuid(), apiId, new Date(), swaggerJson, sessionToken);

        expect(result.method).to.equal("PUT");
        expect(result.headers["Content-Type"]).to.equal("application/json");
        expect(result.headers["X-Amz-Date"]).to.not.be.null;
        expect(result.headers["X-Amz-Security-Token"]).to.equal(sessionToken);
        expect(result.headers["Authorization"]).to.not.be.null;
        expect(result.uri.protocol).to.equal("https:");
        expect(result.uri.query).to.equal("failonwarnings=false&mode=overwrite");
        expect(result.uri.host).to.equal(`apigateway.${awsSubDomainRegion}.amazonaws.com`);
        expect(result.body).to.equal(JSON.stringify(swaggerJson));
      });
    });

    describe.skip("integration with kelly-v-test, which is a resource in apigateway at the time of this test", () => {
      it("do work with just accessid and secret", (done) => {
        var si = new SwaggerImporter("us-east-1");

        var date = new Date();

        si.overwriteCurrentSwagger(
          "your access key",
          "your secret key",
          "h2silvhe8h", /*this is the api gateway key*/
          date,
          swagger,
          null,
          false).then((something) => {

          console.log(something);
          done();
        }).catch((error) => {
          console.error(error, error.stack);

          expect(error).to.be.null;
          done();
        });
      });
    });
  });

  describe("and object property builder", () => {
    describe("and object invalid", () => {
      describe("and object undefined", () => {
        it("it should return empty string", () => {
          expect(SwaggerImporter.parseObjectToString(undefined)).to.equal("");
        });
      });

      describe("and object null", () => {
        it("it should return empty string", () => {
          expect(SwaggerImporter.parseObjectToString(null)).to.equal("");
        });
      });
    });

    describe("and object valid", () => {
      describe("and object empty", () => {
        it("it should return empty string", () => {
          expect(SwaggerImporter.parseObjectToString({})).to.equal("");
        });
      });

      describe("and object with properties", () => {
        describe("and one property value", () => {
          it("it should return", () => {
            var property = uuid();
            var value = uuid();

            var entity = {};
            entity[property] = value;

            let expected = `${property}:${value}\n`;
            expect(SwaggerImporter.parseObjectToString(entity)).to.equal(expected.toLocaleLowerCase());
          });
        });

        describe("and uppercase", () => {
          it("it should convert to lowercase", () => {
            var property = uuid();

            var entity = {};
            entity[property] = "PEWp is REAlz ToDay";

            let expected = `${property}:pewp is realz today\n`;
            expect(SwaggerImporter.parseObjectToString(entity)).to.equal(expected);
          });
        });

        describe("and date", () => {
          it("should not lowercase the property", ()=> {
            var property = uuid() + "DaTe";

            var entity = {};
            entity[property] = "      PEWp  ";

            let expected = `${property}:PEWp\n`;
            expect(SwaggerImporter.parseObjectToString(entity)).to.equal(expected.replace("DaTe", "date"));
          });
        });

        describe("and token", () => {
          it("should not lowercase the property", ()=> {
            var property = uuid() + "token";

            var entity = {};
            entity[property] = "      PEWp  ";

            let expected = `${property}:PEWp\n`;
            expect(SwaggerImporter.parseObjectToString(entity)).to.equal(expected.replace("token", "token"));
          });
        });

        describe("and trimming", () => {
          it("it remove excess white space ", () => {
            var property = uuid();

            var entity = {};
            entity[property] = "      PEWp  ";

            let expected = `${property}:pewp\n`;
            expect(SwaggerImporter.parseObjectToString(entity)).to.equal(expected);
          });

          it("aws header example should leave single spaces and trim sides", () => {
            var property = uuid();

            var entity = {};
            entity[property] = "    a   b   c  ";

            let expected = `${property}:a b c\n`;
            expect(SwaggerImporter.parseObjectToString(entity)).to.equal(expected);
          });
        });

        describe("and multiple property value combinations", () => {
          it("it should return", () => {
            var propertyOne = uuid();
            var valueOne = uuid();
            var propertyTwo = uuid();
            var valueTwo = uuid();

            var entity = {};
            entity[propertyOne] = valueOne;
            entity[propertyTwo] = valueTwo;

            let expected = `${propertyOne}:${valueOne}\n${propertyTwo}:${valueTwo}\n`;
            expect(SwaggerImporter.parseObjectToString(entity)).to.equal(expected.toLocaleLowerCase());
          });

          it("it should return", () => {
            var propertyOne = uuid();
            var valueOne = uuid();
            var propertyTwo = uuid();
            var valueTwo = uuid();

            var entity = {};
            entity[propertyOne] = valueOne;
            entity[propertyTwo] = valueTwo;

            let expected = `${propertyOne}:${valueOne};${propertyTwo}:${valueTwo};`;

            var value = SwaggerImporter.parseObjectToString(entity, ":", "\n", true);
            console.log(value);
            value = value.replace(/\n/g, ";");

            console.log(value);

            expect(value).to.equal(expected);
          });

          it("it should return another", () => {
            var propertyOne = "prop" + uuid();
            var valueOne = "value " + uuid();
            var propertyTwo = "prop" + uuid();
            var valueTwo = "value " + uuid();

            var entity = {};
            entity[propertyOne] = valueOne;
            entity[propertyTwo] = valueTwo;

            let expected = `${propertyOne}=${valueOne}&${propertyTwo}=${valueTwo}&`;

            var value = SwaggerImporter.parseObjectToString(entity, "=", "&", true);
            //console.log(value);
            value = value.replace(/\n/g, "&");

            console.log(value);
            console.log(expected);

            expect(value).to.equal(expected);
          });
        });

        describe("and only want property names", () => {
          it("it should do more stuff", () => {
            let example = {
              one: "two",
              twoItem: "something",
              three: 8
            };

            let actual = SwaggerImporter.parseObjectToString(example, ";", "\n", false);

            expect(actual).to.equal("one;twoitem;three\n");
          });
        });
      });
    });
  });

  describe("and getAuthorizationHeader", () => {
    it("should do work", () => {
      let date = new Date();
      let accessKeyId = uuid();
      let secretAccessKey = uuid();
      let apiId = uuid();
      let payloadAsString = JSON.stringify(swagger);

      let signatureHeaders = SwaggerImporter.parseObjectToString(swaggerImporter.getSwaggerOverwriteRequestParameters(apiId, date, true, payloadAsString).headers, ";", "", false);
      let expectedCredentialsClause = `Credential=${accessKeyId}/${SwaggerImporter.getIsoDate(date, true)}/${awsSubDomainRegion}/apigateway/aws4_request`;

      let result = swaggerImporter.getAuthorizationHeader(
        accessKeyId,
        secretAccessKey,
        apiId,
        date,
        false,
        payloadAsString);

      expect(result).to.not.be.null;
      expect(result.indexOf("AWS4-HMAC-SHA256")).to.equal(0);
      expect(result.indexOf(expectedCredentialsClause)).to.greaterThan(0);
      expect(result.indexOf("Signature=")).to.greaterThan(0);
      expect(result.indexOf(`SignedHeaders=${signatureHeaders}`)).to.greaterThan(0);
    });
  });
});
