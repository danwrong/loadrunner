/*
  Loadrunner JSON

  This plugin extends loadrunner to load JSON.

  To depend on a JSON file, foo.json:
  using('json!foo.json', function(jsonObj) { ... });
  This will trigger the load of foo.json if it has not already been loaded.
  The returned JSON will be parsed and passed to the jsonObj.

  If a new 'using' block depends on a JSON file that has already been loaded,
  it not load the file again, and the function block will fire immediately.
  This behaviour is similar to the loadrunner scripts and modules.

  TODO: THERE IS CURRENTLY NO HANDLING FOR LOAD ERRORS.

*/
loadrunner(function(using, provide, loadrunner) {

  function JSONDependency(id, force) {
    this.path = this.id = id;
    this.transport = this.TRANSPORT_XHR;
    this.force = !!force;
  };
  JSONDependency.prototype = new loadrunner.Script;
  JSONDependency.prototype.key = function() {
    return 'json_' + this.id;
  };
  JSONDependency.prototype.afterXhrFetch = function(data) {
    this.result = data;
    this.complete(this.result);
  };

  using.matchers.add(/^json!/, function(path) {
    return new JSONDependency(path.substring(5));
  });

});