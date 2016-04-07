deferred('bundled_thing.js', function() {
  window.bundleLoadedThing = true;
});

deferred('bundled_another.js', function() {
  window.bundleLoadedAnother = true;
});

deferred('$bundled_with_modpath.js', function() {
  window.bundleLoadedModpath = true;
});