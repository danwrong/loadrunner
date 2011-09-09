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
    this.force = !!force;
  };
  JSONDependency.prototype = new loadrunner.Script;
  JSONDependency.prototype.key = function() {
    return 'json_' + this.id;
  };
  JSONDependency.prototype.fetch = function() {
    var xhr, me = this;
    if(window.XMLHttpRequest) {
      xhr = new window.XMLHttpRequest();
    } else {
      try {
        xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
      } catch(e) {
        //  Eep
        return new Error('XHR not found.');
      }
    }
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        me.result = xhr.responseText;
        me.complete(me.result);
      }
    };
    xhr.open('GET', this.path, true);
    xhr.send(null);
  };

  using.matchers.add(/^json!/, function(path) {
    return new JSONDependency(path.substring(5));
  });

});