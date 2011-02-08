module('modcompiled', function(exports) {
  require('modc', function(modc) {
    exports({
      test: function() {
        return modc.test() + ' via modcompiled';
      }
    });
  });
});