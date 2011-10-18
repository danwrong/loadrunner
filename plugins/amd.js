(function(context) {
  loadrunner(function(using, provide) {
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

    function resolve(id, mod) {
      // replace the './' on the id with the dir taken from the mod id.
      var from = mod.id || '';
      var parts = from.split('/'); parts.pop();
      var dir = parts.join('/');
      console.log('resolve', id.replace(/^\./, dir));
      return id.replace(/^\./, dir);
    }

    function mapArgs(args, mod) {
      var mapped = [];

      function require(id) {
        return loadrunner.Module.exports[resolve(id, mod)];
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

    function define() {
      var args = makeArray(arguments), dependencies = [], id, factory;

      if (typeof args[0] == 'string') {
        id = args.shift();
      }

      if (isArray(args[0])) {
        dependencies = args.shift();
      }

      factory = args.shift();

      var def = new loadrunner.Definition(id, function(exports) {
        var mods = [];

        function executeAMD() {
          var args = mapArgs(makeArray(dependencies), def), exported;

          if (typeof factory == 'function') {
            exported = factory.apply(def, args);
          } else {
            exported = factory;
          }

          if (typeof exported == 'undefined') {
            exported = def.exports;
          }

          exports(exported);
        }

        for (var i=0, len=dependencies.length; i < len; i++) {
          var d = dependencies[i];
          if (indexOf(['require', 'exports'], d) == -1) {
            mods.push(resolve(d, def));
          }
        }

        if (mods.length > 0) {
          using.apply(this, mods.concat(executeAMD));
        } else {
          executeAMD();
        }
      });

      return def;
    }

    context.define = define;
  });
}(this));