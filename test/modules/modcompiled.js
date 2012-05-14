provide('thing', function(exports) {
  window.thingLoaded = true;
  exports('thing');
});

provide('another', function(exports) {
  exports('another');
});

provide('modcompiled', function(exports) {
  using('thing', 'another', function(a, b) {
    exports(a + b);
  });
});