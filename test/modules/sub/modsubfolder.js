module('sub/modsubfolder', function(exports) {
  require('javascripts/d.js', 'modd', function(modd) {
    exports({
      test: function() {
        return loadedD + modd.test();
      }
    });
  });
});