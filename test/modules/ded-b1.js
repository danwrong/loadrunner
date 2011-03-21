provide('ded-b1', function (exports) {
  using('javascripts/a.js', function () {
    exports(loadedA);
  });
});