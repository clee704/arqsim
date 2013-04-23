
scripts = util.js heap.js circularbuffer.js clock.js link.js node.js system.js main.js
targets = style.min.css script.min.js
yui_options = --line-break 512

assets: $(targets)

style.min.css: style.css
	yuicompressor $(yui_options) -o $@ $^

style.css: style.scss
	sass $^ $@

script.min.js: script.js
	yuicompressor $(yui_options) -o $@ $^

script.js: $(scripts)
	cat $^ > $@

server: assets
	python -m SimpleHTTPServer

test:
	karma start --single-run

karma:
	karma start

clean:
	rm -rf _coverage $(targets) style.css

.PHONY: assets server test karma clean
