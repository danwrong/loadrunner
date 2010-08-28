require.module('modj', require(
  'javascripts/d.js', 
  'http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.js', 
  function(exports) {
    exports.test = function() {
      return jQuery.version;
    };
  }
));