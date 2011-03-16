provide(function(exports) {
  using('javascripts/d.js', 'modd', function(modd) {
    exports({
      test: function() {
        return loadedD + modd.test();
      }
    });
  });
});