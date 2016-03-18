let gulp = require('gulp');
let plugins = require('gulp-load-plugins')();//loads all plugins matching gulp-*
let mocha = require('gulp-spawn-mocha');
let del = require('del');
let tsm = require('teamcity-service-messages');
let packageJson = require("./package.json");
let child_process = require('child_process');

gulp.task('default', ['test:testConsole']);

gulp.task('npmrc', function(){
  var npmKey = process.env.NPM_KEY;
  require('fs').writeFileSync('.npmrc', npmKey);
});

gulp.task('build:setBuildNumber', () => {
  tsm.buildNumber(packageJson.version + '.{build.number}')
});

gulp.task('build:clean',() => {
  return del(['dist/**/*', 'build/**/*', 'babeled/**/*']);
});

gulp.task('build:cleanDependencies', () => {
  return del(['node_modules/**/*']);
});

gulp.task('build:babel', (callback) => {
  gulp.src(['src/**/*.js'], {base: "./src"})
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.babel({presets:['es2015']}))
    .pipe(plugins.sourcemaps.write("."))
    .pipe(gulp.dest('build'))
    .on('end', ()=> {callback()});
});

gulp.task('build:lint', () => {
  return gulp.src('build/**/*.js')
    .pipe(plugins.jshint(          {
      "node": true,
      "esnext" : 6
    }))
    .pipe(plugins.jshint.reporter('jshint-stylish'))
    .pipe(plugins.jshint.reporter('fail'));
});

gulp.task('test:testConsole', () => {
  return gulp.src('test/**/*.js', {read: false})
    .pipe(mocha({compilers: 'js:babel-core/register'}));
});

gulp.task('test:testTeamCity', () => {
  return gulp.src('test/**/*.js', {read: false})
    .pipe(mocha({reporter: 'mocha-teamcity-reporter', compilers: 'js:babel-core/register'}));
});
