(function loadrunner(context) {
  var document = context.document;
  var scripts = document.getElementsByTagName('script'), scriptTag, main;
  var modules = {}, translations = {}, transData;

  for (var i=0, s; s = scripts[i]; i++) {
    if (s.src.match(/loadrunner\.js(\?|#|$)/)) {
      scriptTag = s;
      break;
    }
  }

  function pathNorm(path) {
    if (path.length > 0) {
      return path.replace(/\/$/, '') + '/';
    }

    return '';
  }

  function makeArray(o) {
    return Array.prototype.slice.call(o);
  }

  function indexOf(arr, thing) {
    for (var i=0, item; item = arr[i]; i++) {
      if (thing == item) {
        return i;
      }
    }

    return -1;
  }

  function isModule(file) {
    return !!file.match(/^(([a-zA-Z0-9\-_]+)\/)*[a-zA-Z0-9\-_]+$/);
  }

  function getModulePath(id) {
    return [pathNorm(using.path), id, '.js'].join('');
  }

  function resolvePath(file) {
    if (file.match(/^(https?)?:?\/\//)) {
      return file;
    }

    if (file.match(/^\/[^\/]/)) {
      return pathNorm(using.docRoot) + file;
    }

    if (file.match(/^\$/)) {
      return pathNorm(using.path) + file.replace(/^\$/, '');
    }

    return file;
  }

  function translate(file) {
    var t;

    if (t = translations[file]) {
      return t;
    } else {
      return file;
    }
  }

  function Promise() {}

  Promise.prototype.addCallback = function(cb) {
    if (this.completed) {
      cb.apply(this, this.results);
    } else {
      this.callbacks = this.callbacks || [];
      this.callbacks.push(cb);
    }
  }

  Promise.prototype.complete = function() {
    if (!this.completed) {
      this.results = makeArray(arguments);
      this.completed = true;
      if (this.callbacks) {
        for (var i=0, cb; cb = this.callbacks[i]; i++) {
          cb.apply(this, this.results);
        }
      }
    }
  }

  function Module(name, body) {
    this.id = name;
    var me = this;

    function ex(exports) {
      me.exports = exports;
      me.complete(me.exports);
    }

    if (typeof body == 'function') {
      body(ex);
    } else {
      this.exports = body;
      this.complete(this.exports);
    }

    using.loaded.push(name);
  }

  Module.prototype = new Promise;

  var loadsInProgress = {};

  function load(file, callback) {
    var p;

    if (!loadsInProgress[file]) {
      p = new Promise;
      loadsInProgress[file] = p;

      var fileLoaded = function() {
        delete loadsInProgress[file];
        p.complete(file);
      };

      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;

      script.onload = fileLoaded;

      script.onerror = function() {
        throw file + ' not loaded';
      }

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

  function alias(newFile, oldFiles) {
     oldFiles = [].concat(oldFiles);

    for (var j=0, oldFile; oldFile = oldFiles[j]; j++) {
      translations[unescape(oldFile)] = unescape(newFile);
    }
  }

  function using() {
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

    function moduleFileLoadedCallback(name, path) {
      return function() {
        if (!modules[name]) {
          throw "File " + path + " does not provide module " + name;
        }

        modules[name].addCallback(function() {
          fileLoaded();
        });
      }
    }

    if (typeof files[files.length-1] == 'function') {
      p.addCallback(files.pop());
    }

    for (var i=0, file; file = files[i]; i++) {
      if (isModule(file)) {
        var translatedFile = translate(file);
        var path = (isModule(translatedFile)) ? getModulePath(translatedFile) : translatedFile;
        modulesRequested.push(file);

        if (indexOf(using.loaded, file) > -1) {
          moduleFileLoadedCallback(file)();
        } else {
          using.load(resolvePath(path), moduleFileLoadedCallback(file, path));
        }
      } else {
        if (indexOf(using.loaded, file) > -1) {
          fileLoaded();
        } else {
          using.load(resolvePath(translate(file)), fileLoaded);
          using.loaded.push(file);
        }
      }
    }

    return p;
  }

  using.loaded = [];
  using.path = '';

  if (scriptTag) {
    using.path = scriptTag.getAttribute('data-path') || scriptTag.src.split(/loadrunner\.js/)[0] || '';
  }

  if (transData = scriptTag.getAttribute('data-alias') || window.__lralias) {
    for (var i=0, pair, pairs = transData.split('&');
         pair = pairs[i] && pairs[i].split('='); i++) {
      var newFile = pair[0], oldFiles = pair[1].split(',');
      alias(newFile, oldFiles);
    }
  }

  using.docRoot = using.cwd = '';

  using.reset = function() {
    using.loaded = [];
    modules = {};
  };

  function provide(name, body) {
    return modules[name] = new Module(name, body);
  }

  context.using        = using;
  context.using.load   = load;
  context.using.alias  = alias;
  context.provide      = provide;

  if (main = (scriptTag && scriptTag.getAttribute('data-main'))) {
    using.apply(context, main.split(/\s*,\s*/));
  }
})(this);