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
  
  return opts.output + '\n';
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
var bundleModule = commandLine.options['with-modulejs'];
var modulePath = (commandLine.options['modules'] && commandLine.options['modules'].replace(/([^\/])$/, '$1/')) || '';
var docRoot = (commandLine.options['docroot'] && commandLine.options['docroot'].replace(/([^\/])$/, '$1/')) || '';
var cwd = (commandLine.options['cwd'] && commandLine.options['cwd'].replace(/([^\/])$/, '$1/')) || '';

print('Building ' + sourceFile + '...');

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
  
  print('Build order: ' + buildOrder.join(', '));
  
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



