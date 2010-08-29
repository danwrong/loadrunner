function loadrunner(context) {
  var window = context, document = window.document;
  
  function makeArray(o) {
    var arr = [];
    for (var i=0, len = o.length; i < len; i++) {
      arr.push(o[i]);
    }
    return arr;
  }
  
  function indexOf(item, arr) {
    for (var i=0, len = arr.length; i < len; i++) {
      if (item == arr[i]) return i;
    }
  }
  
  function isModule(file) {
    return !!file.match(/^((\.|\.\.|[a-zA-Z0-9\-_]+)\/)*[a-zA-Z0-9\-_]+$/);
  }
  
  function getModulePath(file) {
    return [require.paths[0], file, '.js'].join('');
  }
  
  function resolvePath(file) {
    if (file.match(/^https?:/)) {
      return file;
    }
    
    if (file.match(/^\//)) {
      return require.docRoot + file;
    }
    
    return require.cwd + file;
  }
  
  function Promise() {
    this.completed = false;
    this.callbacks = [];
  }
  
  Promise.prototype.addCallback = function(cb) {
    if (this.completed) {
      cb.apply(this, this.results);
    } else {
      this.callbacks.push(cb);
    }
  }
  
  Promise.prototype.complete = function() {
    this.results = makeArray(arguments);
    this.completed = true;
    for (var i=0, cb; cb = this.callbacks[i]; i++) {
      cb.apply(this, this.results);
    }
  } 
  
  function Module(name, body) {
    this.id = name;
    this.__p__ = new Promise;
    this.exports = {};
    
    if (typeof body == 'function') {
      body(this.exports);
      this.__p__.complete(this);
    } else if (body instanceof Promise) {
      var self = this;
      body.addCallback(function() {
        var exports = arguments[arguments.length-2];
        
        if (exports && exports.__all__) {
          self.exports = exports.__all__;
        } else {
          self.exports = exports;
        }
        
        self.__p__.complete(self);
      });
    } else {
      this.exports = body;
      this.__p__.complete(this);
    }
    
    require.loaded.push(name);
  }
  
  var loadsInProgress = {};
  
  function load(file, callback) {
    var p;
    
    if (!loadsInProgress[file]) {
      p = new Promise;
      loadsInProgress[file] = p;
      
      var fileLoaded = function() {
        p.complete(file);
        delete loadsInProgress[file];
      };
      
      
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
    
      script.onload = script.onerror = fileLoaded;
      
      script.onreadystatechange = function () {
        if (this.readyState == 'loaded' || this.readyState == 'complete') {
          this.onreadystatechange = null;
          fileLoaded();
        }
      };
      
      script.src = file;
     
      var head = document.getElementsByTagName('head')[0];
      
      if (!head) {
        head = document.createElement('head');
        document.documentElement.appendChild(head);
      }
      
      head.insertBefore(script, head.firstChild);
    } else {
      p = loadsInProgress[file];
    }
        
    if (callback) {
      p.addCallback(callback);
    }
    
    return p;
  }
  
  function require() {
    var p = new Promise,
        files = makeArray(arguments),
        completed = 0,
        modulesRequested = [];
        
    function fileLoaded() {
      completed++;
      
      if (completed == files.length) {
        var passThrough = {}, args;
        var moduleExports = [], moduleExportsByName = {}, exports;
        
        for (var i=0, moduleName; moduleName = modulesRequested[i]; i++) {
          exports = modules[moduleName].exports;
          moduleExports.push(exports);
          moduleExportsByName[moduleName] = exports;
        }
        
        function simulatedSyncRequire(name) {
          var exports = moduleExportsByName[name];
    
          if (exports) {
            return exports;
          } else {
            throw "Module '" + name + "' not available.";
          }
        }
        
        
        p.complete.apply(p, moduleExports.concat(passThrough, simulatedSyncRequire));
      }
    }
    
    function moduleFileLoadedCallback(name) {
      return function() {
        modules[name].__p__.addCallback(function() {
          fileLoaded();
        });
      }
    }
        
    if (typeof files[files.length-1] == 'function') {
      p.addCallback(files.pop());
    }
    
    for (var i=0, file; file = files[i]; i++) {
      if (isModule(file)) {
        var path = getModulePath(file)
        modulesRequested.push(file);
        
        if (typeof indexOf(file, require.loaded) != 'undefined') {
          moduleFileLoadedCallback(file)();
        } else {
          require.load(resolvePath(path), moduleFileLoadedCallback(file));
        }
      } else {
        if (typeof indexOf(file, require.loaded) != 'undefined') {
          fileLoaded();
        } else {
          require.load(resolvePath(file), fileLoaded);
          require.loaded.push(file);
        }
      }
    }
    
    return p;
  }
  
  var modules = {};
  
  require.loaded = [];
  require.paths = [''];
  require.docRoot = '';
  require.cwd = '';
  
  require.reset = function() {
    require.loaded = [];
    modules = {};
  };
  
  function module(name, body) {
    return modules[name] = new Module(name, body);
  }
  
  context.require        = require;
  context.require.load   = load;
  context.require.module = module;
}

loadrunner(this);