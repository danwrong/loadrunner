module('mode', function(exports) {
  require('javascripts/d.js', function() {
    exports({
      test: function() {
        return loadedD;
      }
    });
  });
});