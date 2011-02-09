function loadrunner(context, win) {
  var window = win || context;
  var document = window.document;

  function makeArray(o) {
    var arr = [];
    for (var i=0, len = o.length; i < len; i++) {
      arr.push(o[i]);
    }
    return arr;
  }

  function isModule(file) {
    return !!file.match(/^(([a-zA-Z0-9\-_]+)\/)*[a-zA-Z0-9\-_]+$/);
  }

  function getModulePath(id) {
    return [require.path.replace(/\/$/, ''), '/', id, '.js'].join('');
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
    var me = this;

    function ex(exports) {
      me.exports = exports;
      me.__p__.complete(me);
    }

    if (typeof body == 'function') {
      body(ex);
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
        var args;
        var moduleExports = [], moduleExportsByName = {}, exports;

        for (var i=0, moduleName; moduleName = modulesRequested[i]; i++) {
          exports = modules[moduleName].exports;
          moduleExports.push(exports);
          moduleExportsByName[moduleName] = exports;
        }

        p.complete.apply(p, moduleExports);
      }
    }

    function moduleFileLoadedCallback(name) {
      return function() {
        if (!modules[name]) {
          throw "Module name mismatch for " + name;
        }

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
        var path = getModulePath(file);
        modulesRequested.push(file);

        if (require.loaded.indexOf(file) > -1) {
          moduleFileLoadedCallback(file)();
        } else {
          require.load(resolvePath(path), moduleFileLoadedCallback(file));
        }
      } else {
        if (require.loaded.indexOf(file) > -1) {
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
  require.path = '';
  require.docRoot = '';
  require.cwd = '';

  require.reset = function() {
    require.loaded = [];
    modules = {};
  };

  function module(name, body) {
    return modules[name] = new Module(name, body);
  }
  
  var oldContext = {};
  oldContext.require = context.require;
  oldContext.module = context.module;

  context.require        = require;
  context.require.load   = load;
  context.module         = module;
  
  loadrunner.noConflict = function(atAll) {
    window.require = oldContext.require;
    window.module = oldContext.module;
    
    if (atAll) {
      var exports = {};
      loadrunner(exports);
      delete window.loadrunner;
      
      return exports;
    } else {
      return loadrunner(loadrunner);
    }
  }
}

loadrunner(window);