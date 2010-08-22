var libPath = arguments[0];
var sourceFile = arguments[1];

print('Evaluating ' + sourceFile + '...');

load(libPath + '/vendor/env.js');
load(libPath + '/lib/module.js');

Envjs({
    scriptTypes : {
        '': true,
        'text/javascript': true
    }
});

require.loaded.push(sourceFile);
load(sourceFile);

print('Load order: ' + JSON.stringify(require.loaded));

