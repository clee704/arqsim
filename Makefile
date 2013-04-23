jekyll:
	jekyll

server:
	jekyll --server --auto

test:
	karma start --single-run

karma:
	karma start

clean:
	rm -rf _coverage _site .sass-cache

.PHONY: jekyll server test karma clean
