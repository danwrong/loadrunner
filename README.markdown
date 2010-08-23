Asyncronous JavaScript Loader and Dependency Manager (Funky Name TBC)
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

    module('myshit', 
      require('utils', 'dom', function(utils, dom) {
        
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

    module('jquery', require('http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js', function(exports) {
      var jquery = jQuery.noConflict(true);
      exports.__all__ = jquery;
    }));
  
    require('jquery', function(jq) {
      jq('body').append('<h1>Goddamn this is good</h1>');
    });

    
Building Combined Files
-----------------------

This is still in its early stages so its bound to change and/or be slightly awkard to work with but here are the basics:

Usage: build {options} {source_file_or_module} {destination_file}
       --no-min                      disable minification
       --with-modulej                embed module.js
       --modules=path                path to unbuilt modules
       --docRoot=path                path to / (your sites web root)
       --cwd=path                    path to current directory if you use relative paths

With any luck you should get the entire dependency tree combined and minified. This is all very in progress but the basic implementation seems sound.

Browser Support
---------------

Tests pass in: Safari 5, Google Chrome, FF 3.5, Opera 9

I'm expecting browser support to be very good.  I'll add more as I get around to running the tests on other browsers.

Feedback appreciated as always.