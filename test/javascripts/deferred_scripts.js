deferred('thing.js', function() {
  window.loadedThing = true;
});

deferred('another.js', function() {
  window.loadedAnother = true;
})