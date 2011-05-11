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
(function() {
  function JSONy(path, body) {
    this.id = this.path = path;
    this.body = body;
  }
  JSONy.loaded = [];
  JSONy.loading = [];
  JSONy.prototype = new loadrunner.Dependency;
  JSONy.prototype.start = function() {
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
        me.complete(JSON.parse(xhr.responseText));
      }
    };
    xhr.open('GET', this.path, true);
    xhr.send(null);
  };

  using.matchers.add(/^json!/, function(path) {
    return new JSONy(path.split(/json!/)[1]);
  });
}());