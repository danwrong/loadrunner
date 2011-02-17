provide('modj', function(exports) {
  using('javascripts/d.js', 'http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.js', function() {
    exports({
      test: function() {
        return jQuery.version;
      }
    });
  });
});