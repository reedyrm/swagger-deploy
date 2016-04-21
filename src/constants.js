"use strict";

module.exports = (function(){
  return {
    env: {
      INTEGRATION: {
        FullName: "Integration",
        ShortName: "int",
        Host: "int.api.material.com"
      },
      SANDBOX: {
        FullName: "Sandbox",
        ShortName: "sand",
        Host: "sandbox.api.material.com"
      },
      PRODUCTION: {
        FullName: "Production",
        ShortName: "prod",
        Host: "api.material.com"
      }
    }
  };
})();
