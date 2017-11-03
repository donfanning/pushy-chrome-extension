/*
 * Copyright (c) 2016-2017, Michael A. Updike All rights reserved.
 * Licensed under Apache 2.0
 * https://opensource.org/licenses/Apache-2.0
 * https://goo.gl/wFvBM1
 */
'use strict';

// paths and files
const base = {
  app: 'pushy-chrome-extension',
  src: 'app/',
  dist: 'dist/',
  dev: 'dev/',
  store: 'store/',
  docs: 'docs/',
  tmp_docs: '../tmp_jsdoc/',
};
const path = {
  scripts: `${base.src}scripts/`,
  html: `${base.src}html/`,
  elements: `${base.src}elements/`,
  styles: `${base.src}styles/`,
  images: `${base.src}images/`,
  assets: `${base.src}assets/`,
  locales: `${base.src}_locales/`,
  bower: `${base.src}bower_components/`,
  bowerScripts: `${base.src}bower_components/chrome-extension-utils/`,
  bowerElements: `${base.src}bower_components/setting-elements/`,
};
const files = {
  manifest: `${base.src}manifest.json`,
  scripts: `${path.scripts}**/*.js`,
  html: `${path.html}**/*.html`,
  styles: `${path.styles}**/*.*`,
  elements: `${path.elements}**/*.html`,
  images: `${path.images}*.*`,
  assets: `${path.assets}*.*`,
  locales: `${path.locales}**/*.*`,
  bower: [
    `${path.bower}**/*`,
    `!${path.bower}**/test/*`,
    `!${path.bower}**/demo/*`,
    `!${path.bower}jquery/**`,
  ],
  bowerScripts: `${path.bowerScripts}**/*.js`,
  bowerElements: `${path.bowerElements}**/*.html`,
  prodDelete: [
    `${base.dist}app/bower_components/`,
    `${base.dist}app/scripts/**/*.js`,
    `!${base.dist}app/scripts/on_copy_cut_content_script.js`,
    `!${base.dist}app/scripts/sw.js`,
    `!${base.dist}app/scripts/main/main.js`,
    `!${base.dist}app/scripts/background/background.js`,
  ],
};
files.js = [files.scripts, files.bowerScripts, `${base.src}*.js`];
files.lintdevjs = '*.js';

// command options
const watchOpts = {
  verbose: true,
  base: '.',
};
const minifyOpts = {
  output: {
    beautify: true,
    comments: '/Copyright/',
  },
};
const crisperOpts = {
  scriptInHead: true,
};
const vulcanizeOpts = {
  stripComments: true,
  inlineCss: true,
  inlineScripts: true,
};

// flag for watching
let isWatch = false;
// flag for production release build
let isProd = false;
// flag to keep key in production build for testing purposes
let isProdTest = false;

const gulp = require('gulp');
const del = require('del');
const runSequence = require('run-sequence');
const If = require('gulp-if');
const util = require('gulp-util');
const watch = require('gulp-watch');
const plumber = require('gulp-plumber');
// for ECMA6
const uglifyjs = require('uglify-es');
const composer = require('gulp-uglify/composer');
const minify = composer(uglifyjs, console);

// load the rest
const plugins = require('gulp-load-plugins')({
  pattern: ['gulp-*', 'gulp.*'],
  replaceString: /\bgulp[-.]/,
});

// to get the current task name
let currentTaskName = '';
gulp.Gulp.prototype.__runTask = gulp.Gulp.prototype._runTask;
gulp.Gulp.prototype._runTask = function(task) {
  currentTaskName = task.name;
  this.__runTask(task);
};

// Default - watch for changes in development
gulp.task('default', ['incrementalBuild']);

// Incremental Development build
gulp.task('incrementalBuild', (cb) => {
  isWatch = true;
  runSequence('lint', [
    'bower',
    'manifest',
    'html',
    'lintdevjs',
    'scripts',
    'styles',
    'elements',
    'images',
    'assets',
    'locales',
  ], cb);
});

// Development build
gulp.task('dev', (cb) => {
  isProd = false;
  runSequence('clean', [
    'bower',
    'manifest',
    'html',
    'scripts',
    'styles',
    'elements',
    'images',
    'assets',
    'locales',
  ], cb);
});

// Production build
gulp.task('prod', (cb) => {
  isProd = true;
  isProdTest = false;
  runSequence('clean', 'html', [
    'manifest',
    'scripts',
    'styles',
    'vulcanize_main',
    'vulcanize_background',
    'images',
    'assets',
    'locales',
    'docs',
  ], 'prod_delete', 'zip', cb);
});

// Production test build
gulp.task('prodTest', (cb) => {
  isProd = true;
  isProdTest = true;
  runSequence('clean', 'html', [
    'manifest',
    'scripts',
    'styles',
    'vulcanize_main',
    'vulcanize_background',
    'images',
    'assets',
    'locales',
  ], 'prod_delete', 'zip', cb);
});

// Generate JSDoc
gulp.task('docs', (cb) => {
  const config = require('./jsdoc.json');
  const README = '../Pushy-Clipboard.github.io/README.md';
  gulp.src([
    README, files.scripts, files.bowerScripts, files.elements,
    files.bowerElements], {read: true}).
      pipe(If('*.html', plugins.crisper(crisperOpts))).
      pipe(gulp.dest(base.tmp_docs)).
      pipe(plugins.jsdoc3(config, cb));
});

// polylint elements
gulp.task('polylint', () => {
  const input = files.elements;
  const opts = {
    verbose: true,
    name: currentTaskName,
  };
  return gulp.src(input).
      pipe(isWatch ? watch(input, opts) : util.noop()).
      pipe(plugins.polylint({noRecursion: true})).
      pipe(plugins.polylint.reporter(plugins.polylint.reporter.stylishlike)).
      pipe(plugins.polylint.reporter.fail({
        buffer: false,
        ignoreWarnings: false,
      }));
});

// clean output directories
gulp.task('clean', () => {
  return del(isProd ? base.dist : base.dev);
});

// clean output directories
gulp.task('clean_all', () => {
  return del([base.dist, base.dev]);
});

// manifest.json
gulp.task('manifest', () => {
  const input = files.manifest;
  watchOpts.name = currentTaskName;
  return gulp.src(input, {base: '.'}).
      pipe(isWatch ? watch(input, watchOpts) : util.noop()).
      pipe(plumber()).
      pipe((isProd && !isProdTest) ? plugins.stripLine('"key":') : util.noop()).
      pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// prep bower files
gulp.task('bower', () => {
  const input = files.bower;
  watchOpts.name = currentTaskName;
  return gulp.src(input, {base: '.'}).
      pipe(isWatch ? watch(input, watchOpts) : util.noop()).
      pipe(plumber()).
      pipe(If('*.html', plugins.crisper(crisperOpts))).
      pipe(gulp.dest(base.dev));
});

// lint development js files
gulp.task('lintdevjs', () => {
  const input = files.lintdevjs;
  watchOpts.name = currentTaskName;
  return gulp.src(input, {base: '.'}).
      pipe(isWatch ? watch(input, watchOpts) : util.noop()).
      pipe(plugins.eslint()).
      pipe(plugins.eslint.formatEach()).
      pipe(plugins.eslint.failOnError());
});

// lint scripts
gulp.task('lint', () => {
  const input = files.js;
  watchOpts.name = currentTaskName;
  return gulp.src(input, {base: '.'}).
      pipe(plugins.eslint()).
      pipe(plugins.eslint.formatEach()).
      pipe(plugins.eslint.failAfterError());
});

// scripts
gulp.task('scripts', () => {
  const input = files.js;
  watchOpts.name = currentTaskName;
  return gulp.src(input, {base: '.'}).
      pipe(isWatch ? watch(input, watchOpts) : util.noop()).
      pipe(plugins.eslint()).
      pipe(plugins.eslint.formatEach()).
      pipe(plugins.eslint.failAfterError()).
      pipe(isProd ? minify(minifyOpts).on('error', util.log) : util.noop()).
      pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// html
gulp.task('html', () => {
  const input = files.html;
  watchOpts.name = currentTaskName;
  return gulp.src(input, {base: '.'}).
      pipe(isWatch ? watch(input, watchOpts) : util.noop()).
      pipe(plumber()).
      pipe(isProd ? plugins.minifyHtml() : util.noop()).
      pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// elements
gulp.task('elements', () => {
  const input = files.elements;
  watchOpts.name = currentTaskName;
  return gulp.src(input, {base: '.'}).
      pipe(isWatch ? watch(input, watchOpts) : util.noop()).
      pipe(plugins.eslint()).
      pipe(plugins.eslint.formatEach()).
      pipe(plugins.eslint.failAfterError()).
      pipe(If('*.html', plugins.crisper(crisperOpts))).
      pipe(gulp.dest(base.dev));
});

// styles
gulp.task('styles', () => {
  const input = files.styles;
  watchOpts.name = currentTaskName;
  return gulp.src(input, {base: '.'}).
      pipe(isWatch ? watch(input, watchOpts) : util.noop()).
      pipe(plumber()).
      pipe(If('*.css', isProd ? plugins.cleanCss() : util.noop())).
      pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// images
gulp.task('images', () => {
  const input = files.images;
  watchOpts.name = currentTaskName;
  return gulp.src(input, {base: '.'}).
      pipe(isWatch ? watch(input, watchOpts) : util.noop()).
      pipe(plumber()).
      pipe(plugins.imagemin({progressive: true, interlaced: true})).
      pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// assets
gulp.task('assets', () => {
  const input = files.assets;
  watchOpts.name = currentTaskName;
  return gulp.src(input, {base: '.'}).
      pipe(isWatch ? watch(input, watchOpts) : util.noop()).
      pipe(plumber()).
      pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// locales
gulp.task('locales', () => {
  const input = files.locales;
  watchOpts.name = currentTaskName;
  return gulp.src(input, {base: '.'}).
      pipe(isWatch ? watch(input, watchOpts) : util.noop()).
      pipe(plumber()).
      pipe(isProd ? gulp.dest(base.dist) : gulp.dest(base.dev));
});

// vulcanize main_imports.html for production
gulp.task('vulcanize_main', () => {
  return gulp.src(`${path.html}main_imports.html`, {base: '.'}).
      pipe(plugins.vulcanize(vulcanizeOpts)).
      pipe(plugins.crisper(crisperOpts)).
      pipe(If('*.html', plugins.minifyInline())).
      pipe(If('*.js', minify(minifyOpts).on('error', util.log))).
      pipe(gulp.dest(base.dist));
});

// vulcanize background_imports.html for production
gulp.task('vulcanize_background', () => {
  return gulp.src(`${path.html}background_imports.html`, {base: '.'}).
      pipe(plugins.vulcanize(vulcanizeOpts)).
      pipe(plugins.crisper(crisperOpts)).
      pipe(If('*.html', plugins.minifyInline())).
      pipe(If('*.js', minify(minifyOpts).on('error', util.log))).
      pipe(gulp.dest(base.dist));
});

// delete unneeded files
gulp.task('prod_delete', () => {
  return del(files.prodDelete);
});

// compress for the Chrome Web Store
gulp.task('zip', () => {
  return gulp.src(`${base.dist}${base.src}**`).
      pipe(!isProdTest ? plugins.zip('store.zip') : plugins.zip(
          'store-test.zip')).
      pipe(!isProdTest ? gulp.dest(base.store) : gulp.dest(base.dist));
});
