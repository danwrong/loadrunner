

provide('name', function(exports) {
  using('a/dependency', 'another/dependency', function(a, b) {
    // your code

    exports({
      // export anything you want - typically an object containing methods
    });
  });
});