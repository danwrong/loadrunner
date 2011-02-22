

var myModule = provide('mymod', function(exports) {
  exports({
    mything: 'hello'
  });
});

myModule.addCallback(function(mymod) {
  alert(mymod.mything);
});