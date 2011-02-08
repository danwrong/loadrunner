(function() {  
  function makeArray(o) {
    var arr = [];
    for (var i=0, len = o.length; i < len; i++) {
      arr.push(o[i]);
    }
    return arr;
  }
  
  window.require = function() {
    var files = makeArray(arguments);
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
      module[name] = ex;
    }
    
    if (typeof body == 'function') {
      body(exports);
    } else {
      exports(body);
    }
  };
  
  var modules = {};
  window.require.loaded = [];
}())