provide('ded-b2', function (exports) {
  using('ded-b1', function (b1) {
    exports(b1);
  });
});