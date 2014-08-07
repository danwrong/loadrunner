all: clean main

dist/plugins/%.js: plugins/%.js
	`npm bin`/uglifyjs -o $@ $<

dist/%.js: src/%.js
	`npm bin`/uglifyjs -o $@ $<

dist:
	mkdir -p dist/plugins

main: dist js plugins

plugins: dist/plugins/amd.js dist/plugins/defer.js dist/plugins/json.js

js: dist/loadrunner.js

clean:
	rm -rf dist

testserver: .
	./test/server

test: .
	open 'http://localhost:8080/test/index.html'