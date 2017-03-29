.PHONY: test

test:
	mocha
	karma start --single-run

test-all:
	mocha
	karma start --single-run --browsers browserstack-osx-chrome
	karma start --single-run --browsers browserstack-osx-firefox
	karma start --single-run --browsers browserstack-windows-chrome
	karma start --single-run --browsers browserstack-windows-firefox
	karma start --single-run --browsers browserstack-edge
	karma start --single-run --browsers browserstack-ie11
