all: clean main

dist/plugins/%.js: plugins/%.js
	`npm bin`/uglifyjs -o $@ $<

dist/%.js: src/%.js
	`npm bin`/uglifyjs -o $@ $<

dist:
	mkdir -p dist

dist/plugins: dist
	mkdir -p dist/plugins

main: dist js

plugins: dist/plugins $(wildcard plugins/*.js)

js: $(wildcard src/*.js)


clean:
	rm -rf dist