(function(context, document) {
  var useInteractive = context.attachEvent && !context.opera,
      scripts = document.getElementsByTagName('script'), uuid = 0,
      scriptTag, scriptTemplate = document.createElement('script'),
      loadedModule, currentScript, activeScripts = {}, oldUsing = context.using,
      oldProvide = context.provide, oldDefine = context.define,
      oldLoadrunner = context.loadrunner;

  var pausedDependencies = {}, metDependencies = {}, inProgressDependencies = {};

  for (var i=0, s; s = scripts[i]; i++) {
    if (s.src.match(/loadrunner\.js(\?|#|$)/)) {
      scriptTag = s;
      break;
    }
  }

  function aug(target) {
    for (var i = 1, o; o = arguments[i]; i++) {
      for (var key in o) {
        target[key] = o[key];
      }
    }
    return target;
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

  function pushObjPath(obj, path, newobj) {
    // pushObjPath(thing, 'a/b/c', new) //=> thing.a.b.c = new
    var names = path.split('/'), cursor = obj;
    while (names.length > 1) {
      var name = names.shift();
      cursor = cursor[name] = cursor[name] || {};
    }
    cursor[names[0]] = newobj;
  }

  function Dependency() {}

  Dependency.prototype.then = function(cb) {
    var dep = this, inProgress, met;

    this.callbacks = this.callbacks || [];
    this.callbacks.push(cb);

    if (this.completed) {
      cb.apply(context, this.results);
    } else if (met = metDependencies[this.key()]) {
      this.complete(met.results);
    } else if (inProgress = inProgressDependencies[this.key()]) {
        inProgess.then(function() {
          dep.complete.apply(dep, arguments);
        });
    } else {
      if (!this.paused) this.start();
    }

    return this;
  };
  Dependency.prototype.key = function() {
    if (!this.id) this.id = uuid++;
    return 'dependency_' + this.id;
  };
  Dependency.prototype.start = function() {
    inProgressDependencies[this.key()] = this;
  };
  Dependency.prototype.complete = function() {
    if (!this.completed) {
      this.results = makeArray(arguments);
      this.completed = true;

      if (this.callbacks) {
        for (var i=0, cb; cb = this.callbacks[i]; i++) {
          cb.apply(context, this.results);
        }
      }

      // get paused deps for this id and complete them
    }
  };

  function Script(path, force) {
    if (path) this.id = this.path = this.resolvePath(path);
    this.force = !!force;
  }
  Script.prototype = new Dependency;
  Script.prototype.key = function() { return "script_" + this.id };
  Script.prototype.start = function() {
    Dependency.prototype.start.call(this);

    var me = this, paused;

    if (paused = pausedScripts[this.path]) {
      me.then(function() {
        for (var i=0, d; d = paused[i]; i++) {
          d.complete.apply(d, arguments);
        }
      });
    }

    var script = scriptTemplate.cloneNode(false);

    this.scriptId = script.id = 'LR' + ++uuid;
    script.type = 'text/javascript';
    script.async = true;

    script.onerror = function() {
      throw new Error(me.path + ' not loaded');
    }

    script.onreadystatechange = script.onload = function (e) {
      e = context.event || e;

      if (e.type == 'load' || indexOf(['loaded', 'complete'], this.readyState) > -1) {
        this.onreadystatechange = null;
        me.loaded();
      }
    };

    script.src = this.path;

    currentScript = this;
    scripts[0].parentNode.insertBefore(script, scripts[0]);
    currentScript = null;

    activeScripts[script.id] = this;
  };

  function Module(id, body) {
    this.id = id;
    this.body = body;

    if (typeof body == 'undefined') {
      this.path = this.resolvePath(id);
    }


  }
  Module.exports = {};
  Module.prototype = new Script;
  Module.prototype.key = function() {
    return 'module_' + this.id;
  }
  Module.prototype.resolvePath = function(id) {
    return (whichBundle(id) != id) ? whichBundle(id) : path(using.path, id + '.js');
  }
  Module.prototype.loaded = function() {
    var module, exports, me = this;

    if (!useInteractive) {
      module = loadedModule;
      loadedModule = null;
      module.id = module.id || this.id;

      module.then(function(exports) {
        me.exp(exports);
      });
    } else {
      // heres something to sort out
      if (exports = Module.exports[this.id]) {
        this.exp(exports);
      } else if (module = modulesInProgress[this.id]) {
        module.then(function(exports) {
          me.exp(exports);
        });
      }
    }
  }
  Module.prototype.execute = function() {
    var me = this;
    if (typeof this.body == 'object') {
      this.exp(this.body);
    } else if (typeof this.body == 'function') {
      this.body.apply(window, [function(exports) {
        me.exp(exports);
      }]);
    }
  }
  Module.prototype.exp = function(exports) {
    if (this.times) {
      aug(this.times, { eval: new Date() });
    }
    this.complete(this.exports = Module.exports[this.id] = exports || {});
  }

  function flattenDeps(deps) {
    var flat = [];

    for (var i=0, d; d = deps[i]; i++) {
      if (d instanceof Sequence) {
        flat = flat.concat(flattenDeps(d.deps));
      } else if (d instanceof Module) {
        flat.push(d);
      }
    }

    return flat;
  }

  function Collection(deps) {
    this.deps = deps;
    if (this.deps.length == 0) {
      this.complete();
    }
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
  Collection.prototype.load = function() {
    for (var i=0, d; d = this.deps[i]; i++) {
      if (d.load) {
        d.load(true);
      }
    }
    return this;
  }
  Collection.prototype.as = function(cb) {
    var me = this;

    return this.then(function() {
      var flatDeps = flattenDeps(me.deps), obj = {};

      for (var i=0, d; d = flatDeps[i]; i++) {
        pushObjPath(obj, d.id, arguments[i]);
      }

      cb.apply(this, [obj].concat(makeArray(arguments)));
    });
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
            allResults = allResults.concat(dep.results);
          }
          next();
        });
      } else {
        me.complete.apply(me, allResults);
      }
    }());

    return this;
  }
  Sequence.prototype.load = function() {
    var me = this, nextDep = 0;

    (function next() {
      var dep = me.deps[nextDep++];
      if (dep && dep.load) {
        dep.load(true).then(function() {
          next();
        });
      }
    }());

    return this;
  }

  function interactiveScript() {
    for (var i in scripts) {
      if (scripts[i].readyState == 'interactive') {
        return activeScripts[scripts[i].id];
      }
    }
  }

  function defineModule(name, body) {
    var module;

    if (!name && useInteractive) {
      module = currentScript || interactiveScript();
    }

    if (module) {
      delete activeScripts[module.scriptId];
      module.body = body;
      // If 'execute' method is not found here, you're wrongly loading this as a script instead of a module
      module.execute();
    } else {
      loadedModule = module = new Module(name, body);
      modulesInProgress[module.id] = module;
    }

    return module;
  }

  function provide() {
    var args = makeArray(arguments), name, body;

    if (typeof args[0] == 'string') {
      name = args.shift();
    }

    body = args.shift();

    return defineModule(name, body);
  }

  function amdResolve(id, mod) {
    // replace the './' on the id with the dir taken from the mod id.
    var from = mod.id || '';
    var parts = from.split('/'); parts.pop();
    var dir = parts.join('/');
    return id.replace(/^\./, dir);
  }

  function amdMap(args, mod) {
    var mapped = [];

    function require(id) {
      return Module.exports[amdResolve(id, mod)];
    }

    for (var i=0, len = args.length; i < len; i++) {
      if (args[i] == 'require') {
        mapped.push(require);
        continue;
      }

      if (args[i] == 'exports') {
        mod.exports = mod.exports || {};
        mapped.push(mod.exports);
        continue;
      }

      mapped.push(require(args[i]));
    }
    return mapped;
  }

  function amdDefine() {
    var args = makeArray(arguments), dependencies = [], id, factory;

    if (typeof args[0] == 'string') {
      id = args.shift();
    }

    if (isArray(args[0])) {
      dependencies = args.shift();
    }

    factory = args.shift();

    var mod = defineModule(id, function(exports) {
      var mods = [];

      function executeAMD() {
        var args = amdMap(makeArray(dependencies), mod), exported;

        if (typeof factory == 'function') {
          exported = factory.apply(mod, args);
        } else {
          exported = factory;
        }

        if (typeof exported == 'undefined') {
          exported = mod.exports;
        }

        exports(exported);
      }

      for (var i=0, len=dependencies.length; i < len; i++) {
        var d = dependencies[i];
        if (indexOf(['require', 'exports'], d) == -1) {
          mods.push(amdResolve(d, mod));
        }
      }

      if (mods.length > 0) {
        using.apply(this, mods.concat(executeAMD));
      } else {
        executeAMD();
      }
    });
    return mod;
  }

  amdDefine.amd = {};

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

    for (var i=0, matcher; matcher = using.matchers[i]; i++) {
      var regex = matcher[0], factory = matcher[1];
      if (m = id.match(regex)) {
        return factory(id);
      }
    }
    throw new Error(id + ' was not recognised by loader');
  }

  var loadrunner = function(f) {
    return f(using, provide, loadrunner, amdDefine);
  }

  function noConflict() {
    context.using = oldUsing;
    context.provide = oldProvide;
    context.define = oldDefine;
    context.loadrunner = oldLoadrunner;
    return loadrunner;
  }

  loadrunner.Script = Script;
  loadrunner.Module = Module;
  loadrunner.Collection = Collection;
  loadrunner.Sequence = Sequence;
  loadrunner.Dependency = Dependency;
  loadrunner.noConflict = noConflict;

  context.loadrunner = loadrunner;
  context.using   = using;
  context.provide = provide;
  context.define  = amdDefine;

  using.path = '';
  using.autoLoad = true;

  using.bundles = [];

  // Append your bundle manifests to this array
  // using.bundles.push( { "bundlename" : ["modulename", "modulename2", "script"], "bundle2": ["script2"] });
  // Loadbuilder can generate your bundles and manifests
  function whichBundle(id) {
    for (var manifestId=0; manifestId < using.bundles.length; manifestId++) {
      for (var bundleId in using.bundles[manifestId]) {
        if (bundleId!=id && indexOf(using.bundles[manifestId][bundleId], id) > -1) return bundleId;
      }
    }
    return id;
  }

  using.matchers = [];
  using.matchers.add = function(regex, factory) {
    this.unshift([regex, factory]);
  }

  using.matchers.add(/(^script!|\.js$)/, function(path) {
    var script = new Script(path.replace(/^\$/, using.path.replace(/\/$/, '') + '/').replace(/^script!/,''), false);
    script.id = path;
    return script;
  });

  using.matchers.add(/^[a-zA-Z0-9_\-\/]+$/, function(id) {
    return new Module(id);
  });

  if (scriptTag) {
    using.path = scriptTag.getAttribute('data-path') || scriptTag.src.split(/loadrunner\.js/)[0] || '';

    if (main = scriptTag.getAttribute('data-main')) {
      using.apply(context, main.split(/\s*,\s*/)).then(function() {});
    }
  }
}(this, document));