S3_BUCKET = s3://arqsim.clee.kr

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

push: jekyll
	s3cmd sync _site/ $(S3_BUCKET) --delete-removed
	s3cmd setacl --acl-public --recursive $(S3_BUCKET)

.PHONY: jekyll server test karma clean push
