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
      return id.replace(/^\./, dir);
    }

    function mapArgs(args, mod) {
      var mapped = [];

      function require(id) {
        return loadrunner.Module.exports[resolve(id.replace(/^.+!/, ''), mod)];
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

        if (args[i] == 'module') {
          mapped.push(mod);
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
        var mods = [],
            definition = exports.definition;

        function executeAMD() {
          var args = mapArgs(makeArray(dependencies), definition), exported;

          if (typeof factory == 'function') {
            exported = factory.apply(definition, args);
          } else {
            exported = factory;
          }

          if (typeof exported == 'undefined') {
            exported = definition.exports;
          }

          exports(exported);
        }

        for (var i=0, len=dependencies.length; i < len; i++) {
          var d = dependencies[i];
          if (indexOf(['require', 'exports', 'module'], d) == -1) {
            mods.push(resolve(d, definition));
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
