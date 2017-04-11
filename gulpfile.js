const gulp = require('gulp');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const runSequence = require('run-sequence');
const cache = require('gulp-cached');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const size = require('gulp-size');
const nodemon = require('nodemon');
const gutil = require('gulp-util');
const path = require('path');
const pretty = require('prettysize');
const fs = require('fs');
const del = require('del');

const config = require('./config');
const webpackConfig = require('./webpack.config');
const webpackCompiler = webpack(webpackConfig);

let isRunningDevServer = false;

gulp.task('build:css', () =>
  gulp.src(config.files.css.entry)
    // .pipe(cache('build:css'))
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass(config.build.sass).on('error', sass.logError))
    .pipe(prefix(config.build.autoprefixer))
    .pipe(sourcemaps.write())
    .pipe(size({ title: 'CSS' }))
    .pipe(gulp.dest(`${config.files.staticAssets}${config.files.css.out}`))
    .pipe(browserSync.stream())
);

gulp.task('build:lint:css', () =>
  gulp.src(config.files.css.src)
    .pipe(cache('build:lint:css'))
    .pipe(plumber())
    .pipe(sasslint())
    .pipe(sasslint.format())
);

gulp.task('build:lint:css:prod', () =>
  gulp.src(config.files.css.src)
    .pipe(plumber())
    .pipe(sasslint())
    .pipe(sasslint.format())
    .pipe(sasslint.failOnError())
);

gulp.task('build:lint:js', () =>
  gulp.src(config.files.client.src)
    .pipe(cache('build:lint:js'))
    .pipe(eslint())
    .pipe(eslint.format())
);

gulp.task('build:lint:js:prod', () =>
  gulp.src(config.files.client.src)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failOnError())
);

gulp.task('build:flow', () =>
  gulp.src(config.files.client.src)
    .pipe(cache('build:flow'))
    .pipe(flow())
);

gulp.task('build:flow:prod', () =>
  gulp.src(config.files.client.src)
    .pipe(flow({ abort: true }))
);

/**
 * Compile our server files for development.
 */
gulp.task('build:server', () =>
  gulp.src(config.files.server.src)
    .pipe(cache('src:server'))
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(babel(config.build.babel))
    .pipe(sourcemaps.write('.'))
    .pipe(size({ title: 'Server JS' }))
    .pipe(gulp.dest(config.files.server.out))
);

/**
 * Compile our server files for production.
 */
gulp.task('build:server:prod', () =>
  gulp.src(config.files.server.src)
    .pipe(cache('src:server'))
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(babel(config.build.babel))
    .pipe(sourcemaps.write('.'))
    .pipe(size({ title: 'Server JS' }))
    .pipe(gulp.dest(config.files.server.out))
);

gulp.task('build:client', callback => {
  // Run webpack
  webpackCompiler.run(err => {
    if (err) throw new gutil.PluginError('build:client', err);

    // Emulate gulp-size and ignore errors
    try {
      const outputConfig = webpackConfig.output;
      const jsFilePath = path.join(outputConfig.path, outputConfig.filename);
      gutil.log(`${gutil.colors.cyan('Client JS')} ${gutil.colors.green('all files ')}` +
                `${gutil.colors.magenta(pretty(fs.statSync(jsFilePath).size))}`);
    } catch (e) {
      // Continue regardless of error
    }

    // Set boolean to true if we're not running the server.
    if (!isRunningDevServer) {
      isRunningDevServer = true;

      // Start the dev server. We have to make sure we send a new instance of the webpack compiler.
      const devServer = new WebpackDevServer(webpackCompiler, webpackConfig.devServer);
      devServer.listen(config.ports.webpack, 'localhost', serverErr => {
        if (serverErr) throw new gutil.PluginError('webpack-dev-server', serverErr);
      });
    }

    // Call callback when done
    callback();
  });
});

gulp.task('build:client:prod', callback => {
  // Run webpack
  webpackCompiler.run(err => {
    if (err) throw new gutil.PluginError('build:client:prod', err);

    // Emulate gulp-size
    const outputConfig = webpackConfig.output;
    const jsFilePath = path.join(outputConfig.path, outputConfig.filename);
    gutil.log(`'${gutil.colors.cyan('Client Prod JS')}' ${gutil.colors.green('all files ')}` +
              `${gutil.colors.magenta(pretty(fs.statSync(jsFilePath).size))}`);

    callback();
  });
});

/**
 * Clean out build folder so we are sure we're not building from some cache.
 */
gulp.task('clean', callback => {
  del(['build']).then(() => {
    callback();
  });
});

/**
 * Task to compile our files for production.
 */
gulp.task('build:prod', callback => {
  runSequence('clean', [
    'build:lint:js:prod',
    'build:lint:css:prod',
  ], [
    'build:css',
    'build:client:prod',
    'build:server:prod',
  ], callback);
});

gulp.task('watch', ['clean'], callback => {
  runSequence(
    // [
    //   'build:lint:js',
    //   'build:flow',
    //   'build:lint:css',
    // ], [
    [
      'build:client',
      'build:server',
    ], () => {
      // Watch files
      gulp.watch(config.files.client.src, ['build:client']);
      gulp.watch(config.files.server.src, ['build:server']);
      // gulp.watch(config.files.client.src, ['build:lint:js']);
      // gulp.watch(config.files.css.src, ['build:lint:css']);
      // gulp.watch(config.files.client.src, ['build:flow']);

      // Launch Nodemon
      nodemon({
        script: 'build/server.js',
        env: { NODE_ENV: 'development' },
        watch: [config.files.server.out],
        ignore: [config.files.staticAssets],
      });
    }
  );
});
