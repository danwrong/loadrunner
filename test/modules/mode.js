provide(function(exports) {
  using('javascripts/d.js', function() {
    exports({
      test: function() {
        return loadedD;
      }
    });
  });
});