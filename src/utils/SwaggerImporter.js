"use strict";

let util = require("util");
let rp = require("request-promise");
let Promise = require("bluebird");
let DateFormat = require("dateformat");
let sigv4 = require('aws-sigv4');
let url = require('url');

class SwaggerImporter {

  /**
   *
   * @param {string} awsSubDomainRegion
   */
  constructor(awsSubDomainRegion) {
    this.awsSubDomainRegion = awsSubDomainRegion;
  }

  /**
   *
   * @param {Object} entity
   * @param {String} [equalPattern=":"]
   * @param {string} [newLinePattern="\n"]
   * @param {boolean} [includeValuesWithMultipleLineBreaks=true]
   * @return {string}
   */
  static parseObjectToString(entity, equalPattern = ":", newLinePattern = "\n", includeValuesWithMultipleLineBreaks = true) {
    if (util.isNullOrUndefined(entity)) {
      return "";
    }

    let result = "";

    for (var prop in entity) {
      var propertyName = prop.toLocaleLowerCase();

      if (!includeValuesWithMultipleLineBreaks) {
        result += propertyName + equalPattern;
        continue;
      }

      var value = typeof entity[prop] !== "string" ? String(entity[prop]) : entity[prop];

      if (propertyName.indexOf("date") > 0 || propertyName.indexOf("token") > 0) {
        value = value.replace(/\s+/g, ' ');
      }
      else {
        value = value.toLocaleLowerCase().replace(/\s+/g, ' ');
      }

      if (value.length !== 0) {
        if (value[0] === " ") {
          value = value.substr(1);
        }

        if (value[value.length - 1] === " ") {
          value = value.substr(0, value.length - 1);
        }
      }

      result += `${propertyName}${equalPattern}${value}${newLinePattern}`;
    }

    if (!includeValuesWithMultipleLineBreaks) {
      result = `${result.substr(0, result.length - 1)}${newLinePattern}`;
    }

    return result;
  }

  /**
   *
   * @param {string} accessKeyId
   * @param {string} secretAccessKey
   * @param {string} restApiId
   * @param {Date} date
   * @param {object} [swaggerJson=null]
   * @param {string} [sessionToken=null]
   * @return {Promise}
   */
  overwriteCurrentSwagger(accessKeyId, secretAccessKey, restApiId, date, swaggerJson=null, sessionToken=null) {
    if (util.isNullOrUndefined(accessKeyId)) {
      throw Promise.reject(new Error("accessKeyId is undefined or null"));
    }

    if (util.isNullOrUndefined(secretAccessKey)) {
      throw Promise.reject(new Error("secretAccessKey is undefined or null"));
    }

    if (util.isNullOrUndefined(restApiId) || restApiId === "") {
      return Promise.reject(new Error("restApiId is null, undefined, or empty"));
    }

    if (util.isNullOrUndefined(swaggerJson)) {
      return Promise.reject(new Error("swaggerJson is null or undefined"));
    }

    if (util.isNullOrUndefined(date)) {
      return Promise.reject(new Error("date is null or undefined"));
    }

    /**
     * @inheritDoc http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-import-api.html
     *
     * Note: from research, when a api is created, it is this syntax:
     * https://<api-id>.execute-api.<region>.amazonaws.com
     *
     * Region becomes the server location. In our case, we have awsSubDomainRegion,
     * which is typically us-east-1.
     *
     * api-id (probably) becomes restApiId
     */

    var payloadAsString = JSON.stringify(swaggerJson);

    var auth = this.getAuthorizationHeader(accessKeyId, secretAccessKey, restApiId, date, payloadAsString, sessionToken);

    return rp(this.getSwaggerOverwriteRequestParameters(restApiId, date, payloadAsString, sessionToken, auth));
  }

  /**
   *
   * @param {string} restApiId
   * @param {Date} date
   * @param {string} [payloadAsString=""]
   * @param {string} [sessionToken=null]
   * @param {string} [authHeader=null]
   * @return {{uri: string, method: string, headers: *, body: *, qs: {mode: string}}}
   */
  getSwaggerOverwriteRequestParameters(restApiId, date, payloadAsString="", sessionToken=null, authHeader=null) {
    var uri = `https://${this.getHost()}${this.getUriPath(restApiId)}`;

    var headers = this.getHeaders(date, sessionToken);

    if (!util.isNullOrUndefined(authHeader) && authHeader !== "") {
      headers["Authorization"] = authHeader;
    }

    return {
      uri: url.parse(uri),
      method: 'PUT',
      headers: headers,
      body: payloadAsString,
      qs: {
        mode: "overwrite"
      }
    };
  }

  /**
   *
   * @param {Date} date
   * @param {boolean} dateOnly
   * @return {string}
   */
  getIsoDate(date, dateOnly) {
    var dateOnlyFormat = DateFormat(date, "yyyymmdd");
    if (dateOnly) {
      return dateOnlyFormat;
    }

    return `${dateOnlyFormat}T${DateFormat(date, "UTC:HHMMss")}Z`;
  }

  /**
   * Grabs headers for call, note this needs to be ascending sort
   * @param {Date} date
   * @param {string=} sessionToken
   * @return {{Content-Type: string, Host: string, X-Amz-Date: UTC date}}
   */
  getHeaders(date, sessionToken) {
    var headers = {
      "Content-Type": "application/json",
      "Host": this.getHost(),
      "X-Amz-Date": this.getIsoDate(date, false)
    };

    if (util.isNullOrUndefined(sessionToken) || sessionToken === "") {
      return headers;
    }

    headers["X-Amz-Security-Token"] = sessionToken;
    return headers;
  }

  /**
   *
   * @param {string} restApiId
   * @return {string}
   */
  getUriPath(restApiId) {
    return `/restapis/${restApiId}`;
  }


  /**
   *
   * @return {string}
   */
  getHost() {
    return `apigateway.${this.awsSubDomainRegion}.amazonaws.com`
  }

  getAuthorizationHeader(accessKeyId, secretAccessKey, apiId, date, payloadAsString="", sessionToken=null) {
    if (util.isNullOrUndefined(accessKeyId)) {
      throw new Error("accessKeyId is undefined or null");
    }

    if (util.isNullOrUndefined(secretAccessKey)) {
      throw new Error("secretAccessKey is undefined or null");
    }

    if (util.isNullOrUndefined(apiId)) {
      throw new Error("apiId is undefined or null");
    }

    var requestParameters = this.getSwaggerOverwriteRequestParameters(apiId, date, payloadAsString, sessionToken, null);

    let signedHeaders = SwaggerImporter.parseObjectToString(requestParameters.headers, ";", "", false);

    var canonicalHeaders = SwaggerImporter.parseObjectToString(requestParameters.headers, ":", "~", true);
    canonicalHeaders = canonicalHeaders.substr(0, canonicalHeaders.lastIndexOf("~"));
    canonicalHeaders = canonicalHeaders.replace(/~/g, "\n");

    let request = sigv4.canonicalRequest(
      requestParameters.method,                                           //httpRequestMethod
      this.getUriPath(apiId),                                             //canonicalURI
      SwaggerImporter.parseObjectToString(requestParameters.qs, "=", ""), //canonicalQueryString
      canonicalHeaders,                                                   //canonicalHeaders
      signedHeaders,                                                      //signedHeaders
      payloadAsString                                                     //payload
    );

    //console.log("request");
    //console.log(request);

    let algorithm = 'AWS4-HMAC-SHA256';
    var isoDateOnly = this.getIsoDate(date, true);

    let credentialScope = `${isoDateOnly}/${this.awsSubDomainRegion}/apigateway/aws4_request`;

    let stringToSign = sigv4.stringToSign(
      algorithm,
      this.getIsoDate(date, false),
      credentialScope,
      sigv4.hash(request));

    //console.log("stringToSign ");
    //console.log(stringToSign);

    let signature = sigv4.sign(
      secretAccessKey,
      isoDateOnly,
      this.awsSubDomainRegion,
      'apigateway',
      stringToSign);

    //console.log("signature ");
    //console.log(signature);

    let authorization = sigv4.authorization(
      algorithm,
      accessKeyId,
      credentialScope,
      signedHeaders,
      signature);

    //console.log("authorization ");
    //console.log(authorization);

    return authorization;
  }
}

module.exports = SwaggerImporter;
