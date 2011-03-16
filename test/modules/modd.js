provide(function(exports) {
  using('modc', function(modc) {
    exports({
      test: function() {
        return modc.test() + ' via mod d';
      }
    });
  });
});