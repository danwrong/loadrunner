(function(context) {
  var document = context.document,
      scripts = document.getElementsByTagName('script'),
      scriptTag, scriptTemplate = document.createElement('script'),
      scriptsInProgress = {}, modulesInProgress = {}, loadedModule;

  for (var i=0, s; s = scripts[i]; i++) {
    if (s.src.match(/loadrunner\.js(\?|#|$)/)) {
      scriptTag = s;
      break;
    }
  }

  function makeArray(o) {
    return Array.prototype.slice.call(o);
  }

  var isArray = Array.isArray || function(obj) {
    return obj.constructor == Array;
  }

  function indexOf(arr, thing) {
    for (var i=0, item; item = arr[i]; i++) {
      if (thing == item) {
        return i;
      }
    }

    return -1;
  }

  function path() {
    var parts = makeArray(arguments), normalized = [];
    for (var i=0, len = parts.length; i < len; i++) {
      if (parts[i].length > 0) {
        normalized.push(parts[i].replace(/\/$/, ''));
      }
    }
    return normalized.join('/');
  }

  function Dependency() {}
  Dependency.prototype.then = function(cb) {
    if (!this.started) {
      this.started = true;
      this.start();
    }

    if (this.completed) {
      cb.apply(this, this.results);
    } else {
      this.callbacks = this.callbacks || [];
      this.callbacks.push(cb);
    }

    return this;
  };
  Dependency.prototype.start = function() {};
  Dependency.prototype.complete = function() {
    if (!this.completed) {
      this.results = makeArray(arguments);
      this.completed = true;

      if (this.callbacks) {
        for (var i=0, cb; cb = this.callbacks[i]; i++) {
          cb.apply(this, this.results);
        }
      }
    }
  };

  function Script(path, force) {
    this.path = path;
    this.force = !!force;
  }
  Script.loaded = [];
  Script.prototype = new Dependency;
  Script.prototype.start = function() {
    var me = this, dep;

    if (dep = scriptsInProgress[this.path]) {
      dep.then(function() {
        me.loaded();
      });
    } else if (!this.force && indexOf(Script.loaded, this.path) > -1) {
      this.loaded();
    } else {
      scriptsInProgress[this.path] = me;

      var fileLoaded = function() { me.loaded() };

      var script = scriptTemplate.cloneNode(false);
      script.type = 'text/javascript';
      script.async = true;

      script.onload = fileLoaded;

      script.onerror = function() {
        throw new Error(me.path + ' not loaded');
      }

      script.onreadystatechange = function () {
        if (indexOf(['loaded', 'complete'], this.readyState) > -1) {
          this.onreadystatechange = null;
          fileLoaded();
        }
      };

      script.src = this.path;
      scripts[0].parentNode.insertBefore(script, scripts[0]);
    }

    return this;
  }
  Script.prototype.loaded = function() {
    this.mark();
    this.complete();
  }
  Script.prototype.mark = function() {
    delete scriptsInProgress[this.path];
    if (indexOf(Script.loaded, this.path) == -1) {
      Script.loaded.push(this.path);
    }
  }

  function Module(id, body) {
    this.id = id;
    this.body = body;

    if (typeof body == 'undefined') {
      this.path = this.resolvePath(id);
    }
  }
  Module.exports = {};
  Module.prototype = new Script;
  Module.prototype.resolvePath = function(id) {
    return path(using.path, id + '.js');
  }
  Module.prototype.start = function() {
    var exports, module, me = this;
    if (this.body) {
      this.execute();
    } else if (exports = Module.exports[this.id]) {
      this.exp(exports);
    } else if (module = modulesInProgress[this.id]) {
      module.then(function(exports) {
        me.exp(exports);
      });
    } else {
      modulesInProgress[this.id] = this;
      Script.prototype.start.call(this);
    }
  }
  Module.prototype.loaded = function() {
    var me = this;

    this.mark();

    if (loadedModule) {
      loadedModule.id = this.id;
      loadedModule.then(function(exports) {
        delete modulesInProgress[me.id];
        me.exp(exports);
      });
      loadedModule = null;
    } else {
      throw new Error('Module ' + this.id + ' was not defined in ' + this.path);
    }
  }
  Module.prototype.execute = function() {
    var me = this;
    if (typeof this.body == 'object') {
      this.exp(this.body);
    } else if (typeof this.body == 'function') {
      this.body(function(exports) {
        me.exp(exports);
      });
    }
  }
  Module.prototype.exp = function(exports) {
    this.complete(this.exports = Module.exports[this.id] = exports);
  }

  function Collection(deps) {
    this.deps = deps;
  }
  Collection.prototype = new Dependency;
  Collection.prototype.start = function() {
    var me = this;

    function depComplete() {
      var results = [];

      for (var i=0, d; d = me.deps[i]; i++) {
        if (!d.completed) return;
        if (d.results.length > 0) {
          results = results.concat(d.results);
        }
      }

      me.complete.apply(me, results);
    }

    for (var i=0, d; d = this.deps[i]; i++) {
      d.then(depComplete);
    }

    return this;
  };

  function Sequence(deps) {
    this.deps = deps;
  }
  Sequence.prototype = new Dependency;
  Sequence.prototype.start = function() {
    var me = this, nextDep = 0, allResults = [];

    (function next() {
      var dep = me.deps[nextDep++];
      if (dep) {
        dep.then(function(results) {
          if (dep.results.length > 0) {
            allResults.concat(dep.results);
          }
          next();
        });
      } else {
        me.complete(allResults);
      }
    }());

    return this;
  }


  function provide() {
    var args = makeArray(arguments), name, body;

    if (typeof args[0] == 'string') {
      name = args.shift();
    }

    body = args.shift();
    return loadedModule = new Module(name, body);
  }

  function using() {
    var deps = makeArray(arguments), callback;

    if (typeof deps[deps.length-1] == 'function') {
      callback = deps.pop();
    }

    var combi = new Collection(mapDependencies(deps));

    if (callback) {
      combi.then(callback);
    }

    return combi;
  }

  function mapDependencies(deps) {
    var mapped = [];

    for (var i=0, dep; dep = deps[i]; i++) {
      if (typeof dep == 'string') {
        dep = createDependency(dep);
      }

      if (isArray(dep)) {
        dep = new Sequence(mapDependencies(dep));
      }

      mapped.push(dep);
    }

    return mapped;
  }

  function createDependency(id) {
    var m, dep;

    for (var regex in using.matchers) {
      if (m = id.match(regex)) {
        dep = using.matchers[regex](id);
        return dep;
      }
    }
  }

  using.path = '';
  using.matchers = {};
  using.matchers['\\.js$'] = function(path) {
    return new Script(path.replace(/^\$/, using.path.replace(/\/$/, '') + '/'));
  };
  using.matchers['^[a-zA-Z0-9_\\-\\/]+$'] = function(id) {
    return new Module(id);
  };

  context.loadrunner = {
    Script: Script,
    Module: Module,
    Collection: Collection,
    Sequence: Sequence,
    Dependency: Dependency
  };

  context.using = using;
  context.provide = provide;

  if (scriptTag) {
    using.path = scriptTag.getAttribute('data-path') || scriptTag.src.split(/loadrunner\.js/)[0] || '';

    if (main = scriptTag.getAttribute('data-main')) {
      using.apply(context, main.split(/\s*,\s*/)).then(function() {});
    }
  }
}(this));