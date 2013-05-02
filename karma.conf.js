// Karma configuration
// Generated on Sun Mar 24 2013 18:17:23 GMT+0900 (KST)


// base path, that will be used to resolve files and exclude
basePath = '';


// list of files / patterns to load in the browser
files = [
  JASMINE,
  JASMINE_ADAPTER,
  '_assets/javascripts/*.js',
  '_spec/spec_helper.js',
  '_spec/unit/*.spec.js',
  '_spec/functional/*.spec.js'
];


preprocessors = {
  // don't forget to prefix paths with **/
  '**/_assets/javascripts/*.js': 'coverage'
};


// list of files to exclude
exclude = [
  '*.conf.js',
  '**/main.js',
  '**/app.js',
  '**/painter.js'
];


// test results reporter to use
// possible values: 'dots', 'progress', 'junit'
reporters = ['progress', 'growl', 'coverage'];


// web server port
port = 9876;


// cli runner port
runnerPort = 9100;


// enable / disable colors in the output (reporters and logs)
colors = true;


// level of logging
// possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
logLevel = LOG_INFO;


// enable / disable watching file and executing tests whenever any file changes
autoWatch = true;


// Start these browsers, currently available:
// - Chrome
// - ChromeCanary
// - Firefox
// - Opera
// - Safari (only Mac)
// - PhantomJS
// - IE (only Windows)
browsers = ['Chrome', 'Firefox', 'Safari'];


// If browser does not capture in given timeout [ms], kill it
captureTimeout = 60000;


// Continuous Integration mode
// if true, it capture browsers, run tests and exit
singleRun = false;

// Coverage
coverageReporter = {
  type: 'html',
  dir: '_coverage/'
};
