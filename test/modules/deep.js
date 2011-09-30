provide(function(exports) {
  var limit = 2000;
  var dep = 'moda';
  for (var i=0;i<limit;i++) {
    dep = using(dep, function(moda) {
    });
  }
  exports('success');
});