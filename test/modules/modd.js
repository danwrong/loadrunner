console.log('executed modd');

module('modd', 
  require('modc', function(modc, exports) {
    exports.test = function() {
      return modc.test() + ' via mod d';
    };
  })
);