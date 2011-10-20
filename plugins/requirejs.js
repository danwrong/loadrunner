/*
  Loadrunner requirejs

  This plugin extends loadrunner to load bare JavaScript files without requiring
  boilerplate code surrounding it.

  To require on a bare JavaScript file, foo.js:
  using('requirejs!foo.js', function() { ... });
  This will trigger the load of foo.js if it has not already been loaded.
  The exports of the JavaScript will be passed to you.

  If a new 'using' block depends on a JS file that has already been loaded,
  it not load the file again, and the function block will fire immediately.
  This behaviour is similar to the loadrunner scripts and modules.

  TODO: THERE IS CURRENTLY NO HANDLING FOR LOAD ERRORS.
*/
loadrunner(function(using, provide, loadrunner) {
  function RequireJS(id) {
    if(typeof define !== 'function') {
      throw new Error('requirejs requires the amd plugin');
    }

    this.path = loadrunner.Module.prototype.resolvePath(id);
    this.id = id;
  };
  RequireJS.prototype = new loadrunner.Script;
  RequireJS.prototype.key = function() {
    return 'requirejs_' + this.id;
  };

  RequireJS.prototype.arrayToString = function(array) {
    /**
     *  Returns an array as a snippet of JavaScript code. Pretty much the same as
     *  JSON.stringify(array), but without the dependency on JSON.
     */
    return '["' + array.join('","') + '"]';
  }
  
  RequireJS.prototype.fetch = loadrunner.Script.xhrTransport;

  RequireJS.prototype.loaded = function(code) {
    var me = this;
    var definition = this.generateDefinition(code);
    eval(definition).then(function(exports) {
      me.complete(exports);
    });
  };

  RequireJS.prototype.findDependencies = function(code) {
    /**
     *  Returns a list of all of the dependencies that are require()'d in the given
     *  code. Expects require statements to be of the form require('foo') or
     *  require("bar"). Requiring variables -- e.g. require(module) -- is not supported.
     */
    var depNames = [];
    var requireRegexp = /require\(['"]([^'"]+)['"]\)/g, match;
    code.replace(requireRegexp, function(original, moduleName) {
      depNames.push(moduleName);
      return original;
    });
    return depNames;
  }

  RequireJS.prototype.generateDefinition = function(code) {
    /**
     *  Generates an AMD definition from the given code. Assumes that the code has
     *  no boilerplate, accesses all dependencies via require() statements, and returns
     *  its exports by modifying the exports variable.
     */
    var deps = ['require', 'exports'].concat(this.findDependencies(code));
    var depsJsList = this.arrayToString(deps);

    return ('(function() { var module = define("%id%", %deps%, ' + 
           'function(require, exports) {\n%code%\n}); return module; }());').
           replace('%code%', code).
           replace('%id%', this.id).
           replace('%deps%', depsJsList);
  }

  using.matchers.add(/^requirejs!/, function(path) {
    return new RequireJS(path.substring(10));
  });
});