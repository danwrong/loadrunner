var commandLine = (function(cArgs) {
  var args = {};
  var params = [];

  for(var i=0, arg; arg = cArgs[i]; i++) {
    if( arg.indexOf( "--" ) == 0 ) {
      arg = arg.substring(2).split( "=" );
      args[arg.shift()] = (arg[0] == null) ? true : arg.join( "=" );
    } else {
      params.push(arg);
    }
  }
  
  return { options: args, params: params };
}(arguments));

function isLocalFile(file) {
  return !(file.match(/^https?:/));
}

function moduleSource() {
  var opts = {
    output: ''
  };
  
  runCommand('cat', libPath + '/lib/module.js', opts);
  
  return [opts.output, 'require.modulePath = "' + bundleModule + '";'].join('');
}

function isModule(file) {
  return !!file.match(/^((\.|\.\.|[a-zA-Z0-9\-_]+)\/)*[a-zA-Z0-9\-_]+$/);
}

function getModulePath(file) {
  return [require.modulePath, file, '.js'].join('');
}

function bundle(files) {
  return files.map(function(file) {
    var path = isModule(file) ? getModulePath(file) : file;
    
    var opts = {
      output: ''
    }
    
    if (isLocalFile(path)) {
      runCommand('cat', path, opts);
    } else {
      runCommand('curl', '-s', path, opts);
    }
    
    return opts.output + "\nrequire.loaded.push('" + file + "');";
  }).join('\n');
}

var libPath = commandLine.params[0];
var sourceFile = commandLine.params[1];
var destFile = commandLine.params[2];
var minify = !commandLine.options['no-min']; 
var bundleModule = (commandLine.options['with-modulejs'] && commandLine.options['with-modulejs'].replace(/([^\/])$/, '$1/'));
var modulePath = (commandLine.options['modules'] && commandLine.options['modules'].replace(/([^\/])$/, '$1/')) || '';
var docRoot = (commandLine.options['docroot'] && commandLine.options['docroot'].replace(/([^\/])$/, '$1/')) || '';
var cwd = (commandLine.options['cwd'] && commandLine.options['cwd'].replace(/([^\/])$/, '$1/')) || '';

if (commandLine.options['help'] || !(sourceFile && destFile)) {
  print('Module.js build tool (c) Dan Webb 2010 licensed under an MIT LICENSE');
  print('Usage: build {options} {source_file_or_module} {destination_file}');
  print('       --no-min                      disable minification');
  print('       --with-modulejs=modulePath    embed module.js and (optionally) set module path');
  print('       --modules=path                path to unbuilt modules');
  print('       --docRoot=path                path to / (your sites web root)');
  print('       --cwd=path                    path to current directory if you use relative paths');
  quit();
}

print('Build starting from ' + sourceFile + '...');

load(libPath + '/vendor/env.js');

Envjs({
    scriptTypes : {
        '': true,
        'text/javascript': true
    }
});

load(libPath + '/lib/module.js');

require.modulePath = modulePath;
require.docRoot = docRoot;
require.cwd = cwd;

require(sourceFile, function() {
  var opts;
  
  var buildOrder = require.loaded.reverse();
  
  print('Build order:');
  for (var i=0, item; item = buildOrder[i]; i++) {
    print(item);
  }
  
  var source = bundleModule ? moduleSource() : '';
  source += bundle(buildOrder);
  
  if (minify) {
    opts = {
      input: source,
      output: ''
    };
    
    runCommand('java', '-jar', 
               libPath + '/vendor/yuicompressor-2.4.2.jar', 
               '--type', 'js', opts);
               
    source = opts.output;
  }
  
  Envjs.writeToFile(source, Envjs.uri(destFile));
  print('Built file to ' + destFile);
});



