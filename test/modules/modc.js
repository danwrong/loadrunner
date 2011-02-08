module('modc', function(exports) {
  require('moda', function(moda) {
    exports({
      test: function() {
        return moda.test + ' from mod a';
      }
    });
  });
});