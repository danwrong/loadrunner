provide('ded-a', function (exports) {
  using('ded-b1', 'ded-b2',
    function (b1, b2) {
      exports(b1 == b2);
  });

});
