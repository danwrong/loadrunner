provide('app', function(exports) {
  using('modd', function(d) {
    console.log(d.test());
  });

  exports();
})