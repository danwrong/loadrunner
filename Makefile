all: clean main

dist/plugins/%.js: plugins/%.js
	`npm bin`/uglifyjs -o $@ $<

dist/%.js: src/%.js
	`npm bin`/uglifyjs -o $@ $<

dist:
	mkdir -p dist

dist/plugins: dist
	mkdir -p dist/plugins

main: dist js plugins

plugins: dist/plugins/amd.js dist/plugins/defer.js dist/plugins/json.js dist/plugins/requirejs.js

js: dist/loadrunner.js

clean:
	rm -rf dist

testserver: .
	./test/bin/server

test: .
	open 'http://localhost:8080/test/index.html'