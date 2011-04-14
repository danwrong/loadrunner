all: loadrunner.js
  
loadrunner.js: clean
	uglifyjs -o dist/loadrunner.js lib/loadrunner.js
  
clean:
	mkdir -p dist; rm -rf dist/*