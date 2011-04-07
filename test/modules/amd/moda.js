define(['require', 'exports', 'moda', './modb'], function(require, exports) {
  var moda = require('moda'),
      modb = require('./modb');

  exports.moda = moda.test;
  exports.modb = modb.test();
});