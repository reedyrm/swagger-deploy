var babel = require('babel-core');

module.exports = function(wallaby){
  return {
    files: ["src/**/*.js","build/**/*.js", "*.js"],
    tests: ["test/**/*.js"],
    env: {type: "node"},
    testFramework: "mocha",
    compilers: {'**/*.js': wallaby.compilers.babel({
      babel:babel,
      presets: ['es2015']
    })}
  }
};
