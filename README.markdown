Loadrunner is a JavaScript dependency manager.

Loadrunner started off as my science project script loader and module system but its turned into a generic dependency manager that you can build on to manage any type of asynchronous dependency from CSS templates to DOM events to cache loading.  It does however include build in support for loading regular JavaScript files, AMD modules and its own, more elegant (IMHO) flavour of modules.

Run the tests
-------------

Open test/test.html.  To run against the minified version open test/test.html?dist=true. Also, try reading the tests.  They illustrate how it works possibly better than the examples below.

Build a minified version
------------------------

Just run:

    make


The Basics
----------

In its basic form, loadrunner exposes two top level functions: `using` and `provide`.

__using(dependency[, dependency1, dependency2, ...][, collectResults:boolean][, callback])__ => Combination

Takes any number of dependencies, which can be any type of dependency object or a string representing a dependency (a path to a javascript file or module identifier works by default), and returns a dependency called a *Combination* which waits for all of the given dependencies to complete in any order.  If you specify a callback then it's attached to this dependency as a convenience.

Dependencies are not loaded until a callback is attached.

```javascript
// use some javascript files
using('javascripts/jquery.js', 'javascripts/underscore.js', function() {
  $(function() {
    _(['foo', 'bar', 'baz']).each(function(i) {
      $(document.body).append('<p>' + i + '</p>');
    });
  })
});
```

Depending on the type of dependencies specified in the `using` block some arguments may be passed to the callback function.  For instance, in the case of using a module, the module's exports are passed as a function argument.

```javascript
// use some modules
using('dom', 'events', function(dom, events) {
  var el = dom.get('#thing');

  events.on(el, function() {
    alert('kersplang');
  });
});

// get reference to a dependency
var mods = using('dom', 'events');

// use that dependency with others
using(mods, 'javascripts/jquery.js', function(dom, events) {

});
```

Using can provide all exports in a single object if required.  Just use the 'as' method.

```javascript
    // use some modules in one object
    using('dom', 'events').as(function(imports) {
      var el = imports.dom.get('#thing');
      imports.events.on(el, function() {
        alert('kersplang');
      });
    });
```

In this case, the exports are still available individually.

```javascript
    // use some modules in one object, and also have them immediately available
    using('dom', 'events').as(function(imports, dom, events) {
      var el = dom.get('#thing');
      imports.events.on(el, function() {
        alert('kersplang');
      });
    });
```

Using can load scripts synchronously (in order) by being provided arguments in an array.

```javascript
    // load 'dom' first, then load 'events', then execute the callback
    using(['dom', 'events'], true, function(imports) {

    });
```


__provide([id,] factory)__ => Module

`provide` defines a module with the given id.  If you don't provide an id then the module's id will be inferred from the location of the javascript file that contains it (dom/events.js => dom/events).  Provide returns a type of definition, *Module*.  The second argument can be either a function that is run to define the module, or any kind of other type.  In the case of this being a function, then when the module is evaluated the function is called with a single argument, normally called *exports*, which is a function that you call to specify which public values the module exports.  Note that you can call this at any point after the module has been evaluated.  _Exporting module values is asynchronous._  Among other things, this allows seamless operation with the `using` function to allow your modules to depend on other items.

```javascript
    // define a module, "config", that exports some static values
    provide('config', {
      env: 'staging',
      admin: true
    });

    // define then use a module, test
    provide('test', function(exports) {
      var thing = 47;

      exports(thing);
    });

    using('test', function(thing) {
      alert(thing); // => 47
    });

    // define and use a module that depends on other modules (app/main.js)
    provide(function(exports) {
      using('test', function(thing) {
        exports(thing + 10);
      });
    });

    using('app/main', function(main) {
      alert(main); //=> 57
    });
```

Debugging
--------

Loadrunner provides a debug command to run in the console.  Enter `loadrunner.debug()`, and you'll see a set of met, inProgress and paused dependencies.

Another great debugging method is to inspect `loadrunner.Module.exports`.


Bundling
--------

Modules can be joined together in single files, provided they have names explicitly defined.  Tools such as [Loadbuilder](https://github.com/danwrong/loadbuilder) can help with automatically inserting the module names.

If a module is requested in a `using` before it has been provided, loadrunner will make a call to load the module individually.  To prevent this, loadrunner provides some options:

* `loadrunner.autoFetch = false` Assumes modules will be provided in later-loading bundles, so loadrunner will not fetch scripts.  To explicitly fetch scripts, you must run `forceStart` on the dependency, eg: `using('bundle').forceStart();`
* `using.bundles.push({'bundle': ['moda', 'modb'])` Declare the location of modules in bundles. When a module is requested, loadrunner will wait first on the evaluation of the bundle, fetching it if required.

If your wish to bundle scripts, then they must first be wrapped with `deferred` syntax, like so:

```javascript
    deferred('jquery.js', function() { /* jquery source */ });
```

Loadrunner supports the `deferred` syntax through the `defer` plugin.

AMD Modules
-----------

Loadrunner will have support for [AMD Modules](http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition) with the use of a plugin.  However, this support is not be complete at this time.


More documentation forthcoming...

