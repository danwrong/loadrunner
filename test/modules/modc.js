console.log('executed modc');
module('modc', require('moda', function(moda, exports) {
  exports.test = function() {
    return moda.test + ' from mod a';
  };
}));