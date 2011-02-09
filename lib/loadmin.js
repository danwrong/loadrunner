(function() {    
  function isModule(file) {
    return !!file.match(/^(([a-zA-Z0-9\-_]+)\/)*[a-zA-Z0-9\-_]+$/);
  }
  
  window.require = function() {
    var files = Array.prototype.slice.call(arguments);
    var callback = files.pop(), exports = [];
    
    for (var i=0, f; f = files[i]; i++) {
      if (isModule(f)) {
        exports.push(modules[f]);
      }
    }
    
    callback.apply(this, exports);
  };
  
  window.module = function(name, body) {
    function exports(ex) {
      modules[name] = ex;
    }
    
    if (typeof body == 'function') {
      body(exports);
    } else {
      exports(body);
    }
  };
  
  window.modules = {};
  window.require.loaded = [];
}());