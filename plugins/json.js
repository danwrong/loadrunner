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

  function JSONRequest(id, force) {
    this.path = this.id = id;
    this.force = !!force;
  };
  JSONRequest.prototype = new loadrunner.Script;
  JSONRequest.prototype.key = function() {
    return 'json_' + this.id;
  };
  JSONRequest.prototype.fetch = loadrunner.Script.xhrTransport;
  JSONRequest.prototype.loaded = function(data) {
    // TODO we should parse the JSON here otherwise this isn't a JSON plugin
    // its just an XHR plugin
    this.complete(data);
  };

  using.matchers.add(/^json!/, function(path) {
    return new JSONRequest(path.substring(5));
  });

});