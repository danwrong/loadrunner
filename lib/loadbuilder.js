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

  if (bundleRunner == 'min') {
    runCommand('cat', libPath + '/lib/loadmin.js', opts);
  } else {
    runCommand('cat', libPath + '/lib/loadrunner.js', opts);
  }

  return opts.output
}

function isModule(file) {
  return !!file.match(/^(([a-zA-Z0-9\-_]+)\/)*[a-zA-Z0-9\-_]+$/);
}

function getModulePath(file) {
  return [using.path.replace(/\/$/, ''), '/', file, '.js'].join('');
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

    return opts.output + "\nusing.loaded.push('" + file + "');";
  }).join('\n');
}

function loadContext(context, cb) {
  var files;

  if (context) {
    files = context.split(',');
    using.apply(this, files).addCallback(function() {
      cb(using.loaded.slice());
    });
  } else {
    cb(using.loaded.slice());
  }
}

function arrayDiff(arr1, arr2) {
  return arr1.filter(function(item) {
    return arr2.indexOf(item) === -1;
  });
}

function aliasString(dest, included) {
  return [
    escape(dest),
    included.map(function(item) {
      return escape(item);
    }).join(',')
  ].join('=');
}

var libPath = commandLine.params[0];
var sourceFile = commandLine.params[1];
var destFile = commandLine.params[2];
var minify = !commandLine.options['no-min'];
var bundleRunner = commandLine.options['with-loadrunner'];
var context = commandLine.options['context'];
var modulePath = (commandLine.options['modules'] && commandLine.options['modules'].replace(/([^\/])$/, '$1/')) || '';
var docRoot = (commandLine.options['docroot'] && commandLine.options['docroot'].replace(/([^\/])$/, '$1/')) || '';
var cwd = (commandLine.options['cwd'] && commandLine.options['cwd'].replace(/([^\/])$/, '$1/')) || '';

if (commandLine.options['help'] || !(sourceFile && destFile)) {
  print('loadrunner.js build tool (c) Dan Webb 2010 licensed under an MIT LICENSE');
  print('Usage: loadbuilder {options} {source_file_or_module} {destination_file}');
  print('       --no-min                      disable minification');
  print('       --context=scripts,or,mods     preload these files before calculating bundle');
  print('       --with-loadrunner=full|min    embed loadrunner.js');
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

load(libPath + '/lib/loadrunner.js');

using.path = modulePath;
using.docRoot = docRoot;
using.cwd = cwd;

loadContext(context, function(contextFiles) {
  using(sourceFile, function() {
    var opts;

    var buildOrder = using.loaded.concat(sourceFile);

    buildOrder = arrayDiff(buildOrder, contextFiles);

    print('Build order:');
    for (var i=0, item; item = buildOrder[i]; i++) {
      print(item);
    }

    var source = bundleRunner ? moduleSource() : '';

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
    print('Built file: ' + destFile);
    print('Alias string: ' + aliasString(destFile, buildOrder));
  });
});



