(function(context) {
  var document = context.document,
      scripts = document.getElementsByTagName('script'),
      scriptTag, scriptTemplate = document.createElement('script'),
      scriptsInProgress = [], modules = {}, matchers = [];

  for (var i=0, s; s = scripts[i]; i++) {
    if (s.src.match(/loadrunner\.js(\?|#|$)/)) {
      scriptTag = s;
      break;
    }
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
          cb.apply(window, this.results);
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
        me.complete(me.path);
      });
    } else if (indexOf(Script.loaded, this.path) > -1) {
      this.complete(this.path);
    } else {
      scriptsInProgress[this.path] = me;

      var fileLoaded = function() { me.loaded() };

      var script = scriptTemplate.cloneNode();
      script.type = 'text/javascript';
      script.async = true;

      script.onload = fileLoaded;

      script.onerror = function() {
        throw this.path + ' not loaded';
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
    delete scriptsInProgress[this.path];
    Script.loaded.push(this.path);
    this.complete(this.path);
  }

  function Module(name) {
    this.name = name;
    modules[name] = this;

    if (body) {
      this.execute(body);
    }
  }
  Module.prototype = new Script;

  function Combination(deps) {
    this.deps = deps;
  }
  Combination.prototype = new Dependency;
  Combination.prototype.start = function() {
    var me = this;

    function depComplete() {
      for (var i=0, d; d = me.deps[i]; i++) {
        if (!d.complete) return;
      }

      me.complete();
    }

    for (var i=0, d; d = this.deps[i]; i++) {
      d.then(depComplete);
    }

    return this;
  };

  function provide(name, body) {
    var module;

    if (module = modules[name]) {
      module.execute(body);
    } else {
      module = new Module(name, body);
    }

    return module;
  }

  function using() {
    var deps = makeArray(arguments), callback;

    if (typeof deps[deps.length-1] == 'function') {
      callback = deps.pop();
    }

    var combi = new Combination(deps);

    if (callback) {
      combi.then(callback);
    }

    return combi;
  }

  function mapDependencies(deps) {
    var mapped = [];

    for (var i, dep; dep = deps[i]; i++) {
      if (typeof dep == 'string') {
        dep = createDependency(dep);
      }
      mapped.push(dep);
    }

    return mapped;
  }

  function createDependency(id) {
    var m, dep;

    for (var regex in matchers) {
      if (m = id.match(regex)) {
        // try to new (or simulate new) with captures
        return dep;
      }
    }
  }

  context.loadrunner = {
    Script: Script,
    Dependency: Dependency,
    using: using,
    provide: provide
  };

  context.using = using;
  context.provide = provide;
}(this));