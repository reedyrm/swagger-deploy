"use strict";

module.exports = (function(){
  return {
    env: {
      INTEGRATION: {
        FullName: "Integration",
        ShortName: "int",
        Host: "dev.api.material.com"
      },
      PRODUCTION: {
        FullName: "Production",
        ShortName: "prod",
        Host: "api.material.com"
      }
    }
  };
})();
