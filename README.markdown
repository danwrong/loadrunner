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
* Rely on convention rather than configuration - dependency configration files should not need to be generated, rather if the developer sticks to some simple, sensible conventions things just work out of the box
* Allow (and facility with built in tools) very robust bundling for production builds - while allowing developers to load dynamically in development.  These tools will not be based on fragile static analysis but by really executing the code and reading out the load order.
* Facilitate on demand loading - Along side loadtime dependency definition, allow developers to require files as and when needed
* Be as close to CommonJS as possible - but not be afraid to change things where it makes sense to do so
* Self contained modules - modules should have their own scope and export only explicitly defined values in the style of CommonJS require

API
---

    require.load(path[, callback])
    
Starts loading the specified file and returns a promise that will be triggered when the file has loaded.  If callback is specified it will be added to the promise.  Note that calling load multiple times for the same file will load it multiple times.

    require.module(name, factory)
    
Creates and returns a new module with the specified name.  factory can either be an object literal (in which case the object will be the module's export), a function which takes the exports object as an argument so you can add properties or a promise (usually the result of a require statement).  In this case once the promise has completed the callbacks will be passed the exports object to attach exported values.  See examples for more details.

    require(dep1, dep2, debN... [, callback])
    
Starts to load the dependencies specified in parallel returning a promise that will complete when all the dependencies are loaded.  Each dependency can either be a normal script file URL or a module reference.  If modules are required there exports object will be passed into any callbacks as arguments so they can be used within the callback.  Note that if a file or module has been required before it will not be reloaded.

    require.paths = ["modulePath"]
    
Set the first element of this property to the base URL of your modules.  Set to the current directory by default. NB.  loadrunner does not search multiple paths for modules at this time.  This property takes an array for CommonJS compatibility.

Requiring Regular Script Files
------------------------------

You can use the require function to load any number of scripts in parallel.  There are no restrictions at all on what type or location the script is.  If you can reference it with a script tag you can require it with loadrunner.  You can also use loadbuilder against regular files effectively.

Creating and Requiring Modules
------------------------------

Writing code as modules has a number of advantages over just requiring regular scripts:

  1. It encourages libraries to be self contained and only export what they need to.
  2. It allows loadrunner to work out the loading and building of complex nested dependency trees for you.
  3. It negates the need for multi.level.namespaces as exports are only available when a require call makes them available.
  
TODO

Tests
-----

Open test/test.html in a browser.  That's it.


Examples
--------

To require several scripts and then execute code:

    require(
      'http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js',
      '/javascripts/application.js', function() {
        jQuery(function() {
          Application.init();
        });
      }
    );
    
To define a module with dependencies:

    require.module('myshit', 
      require('utils', 'dom', function(utils, dom, exports) {
        
        exports.myShitMethod = function() {
          dom.get('thing');
          utils.map([1,2], function(i) { return i * 2; });
        };
        
      })
    );
    
To use a module:

    require('myshit', function(myshit) {
      myshit.myShitMethod();
    });
    
On demand feature loading:

    function activateUberFeature() {
      require('uber', function(uber) {
        uber.activate();
      });
    }
    
    $('#thing').click(activateUberFeature);
    
Make a module out of jQuery:

    require.module('jquery', require('http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js', function(exports) {
      var jquery = jQuery.noConflict(true);
      exports.__all__ = jquery;
    }));
  
    require('jquery', function(jq) {
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

Tests pass in: Safari 5, Google Chrome, FF 3.5, Opera 9

I'm expecting browser support to be very good.  I'll add more as I get around to running the tests on other browsers.

Feedback appreciated as always.