provide('modc', function(exports) {
  using('moda', function(moda) {
    exports({
      test: function() {
        return moda.test + ' from mod a';
      }
    });
  });
});