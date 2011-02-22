loadrunner.js (Browser-based JavaScript dependency loader, builder and more)
---------------------------------------------------------------------

(c) Dan Webb (dan@massiverobot.co.uk) 2010 under an MIT Licence (attached)

Overview
--------

The aim is to create an asyncronous loader/dependency manager for use in the browser that forfills a number of requirements:

* Plain old JavaScript - No server side components required at all and be JS lib agnostic
* Can load any script -  Rather than requiring all files to adhere to a 'package' convention, in its simplest form it must allow you to load any javascript file
* Uses script tags - so scripts can be loaded from any domain
* Asyncronous - Must allow developers fine control over the parallel or serial loading of their files and order of execution
* Rely on convention rather than configuration - dependency configuration files should not need to be generated, rather if the developer sticks to some simple, sensible conventions things just work out of the box
* Allow (and facility with built in tools) very robust bundling for production builds - while allowing developers to load dynamically in development.  These tools will not be based on fragile static analysis but by really executing the code and reading out the load order.
* Facilitate on demand loading - Along side loadtime dependency definition, allow developers to require files as and when needed
* Self contained modules - modules should have their own scope and export only explicitly defined values in the style of CommonJS require

API
---

    using.path = "modulePath"

Set this property to the base URL of your modules.  Set to the directory loadrunner.js is in by default.

    using(dep1, dep2, debN... [, callback]) => Promise

Loads (if not previously loaded) the specified dependencies, which can be regular JavaScript files or modules.  When all are complete the callback is called passing each module's exports as arguments.  For example:

    using('util', 'dom/events', function(util, events) {
      util.isArray([1,2]);
      events.on('something', function() { });
    });

Also, using calls return a promise object so you can attach multiple callbacks at any time:

    var loadLibs = using('/js/jquery.js', '/js/underscore.js');

    loadLibs.then(function() {
      // some stuff using the scripts
    });

    loadLibs.then(function() {
      // some other stuff
    });

Finally, if you just want to parallel load several scripts before you use them then you can call using to start them loading then just depend on them when you need them. See examples for more info.

    provides(name, factory)

Creates and returns a new module with the specified name.  factory can either be an object literal (in which case the object will be the module's export) ro a function which takes the exports function as an argument so you can export properties asyncronously (normally after a using call completes to load your dependencies). See examples for details.

Requiring Regular Script Files
------------------------------

You can use the using function to load any number of scripts in parallel.  There are no restrictions at all on what type or location the script is.  If you can reference it with a script tag you can require it with loadrunner.  You can also use loadbuilder against regular files effectively.

Creating and Using Modules
------------------------------

Writing code as modules has a number of advantages over just requiring regular scripts:

  1. It encourages libraries to be self contained and only export what they need to.
  2. It allows loadrunner to work out the loading and building of complex nested dependency trees for you.
  3. It negates the need for multi.level.namespaces as exports are only available when a using call makes them available.

To create a module:

TBC

Tests
-----

Open test/test.html in a browser.  That's it.


Examples
--------

To require several scripts and then execute code:

    using(
      'http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js',
      '/javascripts/application.js', function() {
        jQuery(function() {
          Application.init();
        });
      }
    );

To define a module with dependencies:

    provide('myshit', function(exports) {
      using('utils', 'dom', function(utils, dom) {

        exports({
          myShitMethod: function() {
            dom.get('thing');
            utils.map([1,2], function(i) { return i * 2; });
          }
        });

      });
    });

To use a module:

    using('myshit', function(myshit) {
      myshit.myShitMethod();
    });

On demand feature loading:

    function activateUberFeature() {
      using('uber', function(uber) {
        uber.activate();
      });
    }

    $('#thing').click(activateUberFeature);

Make a module out of jQuery:

    provide('jquery', function(exports) {
      using('http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js', function() {
        exports(jQuery.noConflict(true));
      });
    });

    using('jquery', function(jq) {
      jq('body').append('<h1>Goddamn this is good</h1>');
    });


Building Combined Files
-----------------------

This is still in its early stages so its bound to change and/or be slightly awkard to work with but here are the basics:

    Usage: loadbuilder {options} {source_file_or_module} {destination_file}
           --no-min                      disable minification
           --with-loadrunner             embed loadrunner.js
           --modules=path                path to unbuilt modules
           --docRoot=path                path to / (your sites web root)
           --cwd=path                    path to current directory if you use relative paths

With any luck you should get the entire dependency tree combined and minified. This is all very in progress but the basic implementation seems sound.

Browser Support
---------------

Tests pass in: Safari 5, Google Chrome, FF 3.5, Opera 9, IE 6, 7, 8 7 9

I'm expecting browser support to be very good.  I'll add more as I get around to running the tests on other browsers.

Feedback appreciated as always.