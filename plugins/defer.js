(function(context) {
  loadrunner(function(using, provide) {
    var def;

    function deferred(id, body) {
      return new loadrunner.Definition(id, function(exports) {
        exports(body());
      });
    }

    context.deferred = deferred;

    using.matchers.add(/(^script!|\.js(!?)$)/, function(path) {
      var force = !!path.match(/!$/);

      path = path.replace(/^script!/,'').replace(/!$/, '');


      if (def = loadrunner.Definition.provided[path]) {
        return def;
      } else {
        var script = new loadrunner.Script(path, force);

        if (force) script.start();
        return script;
      }
    });

  });
}(this));