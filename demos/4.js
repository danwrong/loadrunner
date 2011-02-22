

// load 3 files in parallel
using('javascripts/sha1.js', 'javascripts/crypto.js', 'javascripts/app.js');

// use any subset of those later in code
using('javascript/crypto.js', function() {
  // ensure crypto is loaded
});

