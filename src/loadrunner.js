(function(context, document) {
  var useInteractive = context.attachEvent && !context.opera,
      scripts = document.getElementsByTagName('script'), uuid = 0,
      scriptTag, scriptTemplate = document.createElement('script'),
      scriptsInProgress = {}, modulesInProgress = {}, loadedModule,
      currentScript, activeScripts = {}, oldUsing = context.using,
      oldProvide = context.provide, oldDefine = context.define,
      oldLoadrunner = context.loadrunner;

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
    // add newobj to obj under path
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
    var dep = this;
    if (!this.started) {
      this.started = true;
      this.start();
    }

    if (this.completed) {
      cb.apply(context, this.results);
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
          cb.apply(context, this.results);
        }
      }
    }
  };

  function Script(path, force) {
    this.id = this.path = path;
    this.force = !!force;
    if (path) this.bundle = whichBundle(this.id);
  }
  Script.loaded = [];
  Script.times = {};
  Script.prototype = new Dependency;
  Script.prototype.start = function() {
    var me = this, dep, bundle, module;

    // provide ability to provide a script inline, like you would a module
    // so here, we say "if script is already provided, use that"
    if (module = modulesInProgress[this.id]) {
      module.then(function() {
        me.complete();
      });
      return this;
    }

    if (dep = scriptsInProgress[this.id]) {
      dep.then(function() {
        me.loaded();
      });
    } else if (!this.force && indexOf(Script.loaded, this.id) > -1) {
      this.loaded();
    } else if (this.bundle) {
      using(this.bundle, function() {
        me.loaded();
      });
    } else {
      this.load();
    }

    return this;
  }
  Script.prototype.load = function() {
    var me = this;
    this.times = { start: new Date() };
    scriptsInProgress[this.id] = me;

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
  }
  Script.prototype.loaded = function() {
    this.complete();
  }
  Script.prototype.complete = function() {
    if (indexOf(Script.loaded, this.id) == -1) {
      Script.loaded.push(this.id);
    }
    if (this.times) {
      Script.times[this.id] = aug(this.times, { end: new Date() });
    }
    delete scriptsInProgress[this.id];
    Dependency.prototype.complete.apply(this, arguments);
  }

  function Module(id, body) {
    this.id = id;
    this.body = body;

    if (typeof body == 'undefined') {
      this.path = this.resolvePath(id);
    }

    if (id) this.bundle = whichBundle(this.id);
  }
  Module.exports = {};
  Module.prototype = new Script;
  Module.prototype.resolvePath = function(id) {
    return path(using.path, id + '.js');
  }
  Module.prototype.start = function() {
    var exports, module, me = this, oldCurrent;
    if (this.body) {
      this.execute();
    } else if (exports = Module.exports[this.id]) {
      this.exp(exports);
    } else if (module = modulesInProgress[this.id]) {
      module.then(function(exports) {
        me.exp(exports);
      });
    } else if (this.bundle) {
      using(this.bundle, function() {
        me.start();
      });
    } else {
      modulesInProgress[this.id] = this;
      this.load();
    }
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
      if (exports = Module.exports[this.id]) {
        this.exp(exports);
      } else if (module = modulesInProgress[this.id]) {
        module.then(function(exports) {
          me.exp(exports);
        });
      }
    }
  }
  Module.prototype.complete = function() {
    delete modulesInProgress[this.id];
    Script.prototype.complete.apply(this, arguments);
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

  function Collection(deps, collectResults) {
    this.deps = deps;
    this.collectResults = collectResults;
    if (this.deps.length==0) {
      this.complete();
    }
  }
  Collection.prototype = new Dependency;
  Collection.prototype.start = function() {
    var me = this;

    function depComplete() {
      var results = [];

      if (me.collectResults) {
        results[0] = {};
      }

      for (var i=0, d; d = me.deps[i]; i++) {
        if (!d.completed) return;
        if (d.results.length > 0) {
          if (me.collectResults) {
            if (d instanceof Sequence) {
              aug(results[0], d.results[0]);
            } else {
              pushObjPath(results[0], d.id, d.results[0]);
            }
          } else {
            results = results.concat(d.results);
          }
        }
      }

      me.complete.apply(me, results);
    }

    for (var i=0, d; d = this.deps[i]; i++) {
      d.then(depComplete);
    }

    return this;
  };

  function Sequence(deps, collectResults) {
    this.deps = deps;
    this.collectResults = collectResults;
  }
  Sequence.prototype = new Dependency;
  Sequence.prototype.start = function() {
    var me = this, nextDep = 0, allResults = [];
    if (me.collectResults) {
      allResults[0] = {};
    }

    (function next() {
      var dep = me.deps[nextDep++];
      if (dep) {
        dep.then(function(results) {
          // this looks too similar to the Collection code above - TODO: refactor
          if (dep.results.length > 0) {
            if (me.collectResults) {
              if (dep instanceof Sequence) {
                aug(allResults[0], dep.results[0]);
              } else {
                pushObjPath(allResults[0], dep.id, dep.results[0]);
              }
            } else {
              allResults.push(dep.results[0]);
            }
          }
          next();
        });
      } else {
        me.complete.apply(me, allResults);
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
    var deps = makeArray(arguments), callback, collectResults;

    if (typeof deps[deps.length-1] == 'function') {
      callback = deps.pop();
    }

    if (typeof deps[deps.length-1] == 'boolean') {
      collectResults = deps.pop();
    }

    var combi = new Collection(mapDependencies(deps, collectResults), collectResults);

    if (callback) {
      combi.then(callback);
    }

    return combi;
  }

  function mapDependencies(deps, collectResults) {
    var mapped = [];

    for (var i=0, dep; dep = deps[i]; i++) {
      if (typeof dep == 'string') {
        dep = createDependency(dep);
      }

      if (isArray(dep)) {
        dep = new Sequence(mapDependencies(dep, collectResults), collectResults);
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
  }

  if (scriptTag) {
    using.path = scriptTag.getAttribute('data-path') || scriptTag.src.split(/loadrunner\.js/)[0] || '';

    if (main = scriptTag.getAttribute('data-main')) {
      using.apply(context, main.split(/\s*,\s*/)).then(function() {});
    }
  }
}(this, document));