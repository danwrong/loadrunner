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
loadrunner(function(using, provide, loadrunner, define) {
  function JSONy(path) {
    this.id = this.path = path;
  }
  JSONy.inProgress = [];
  JSONy.done = [];
  JSONy.prototype = new loadrunner.Dependency;
  JSONy.prototype.start = function() {
    var me = this, dep;
    if (dep = JSONy.done[this.id]) {
      this.complete(dep.result);
    } else if (dep = JSONy.inProgress[this.id]) {
      dep.then(function() {
        me.complete(dep.result);
      });
    } else {
      JSONy.inProgress[this.id] = this;
      this.load();
    }
  };
  JSONy.prototype.load = function() {
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
        JSONy.done[me.id] = me;
        delete JSONy.inProgress[me.id];
        me.complete(me.result);
      }
    };
    xhr.open('GET', this.path, true);
    xhr.send(null);
  };

  using.matchers.add(/^json!/, function(path) {
    return new JSONy(path.substring(5));
  });
});