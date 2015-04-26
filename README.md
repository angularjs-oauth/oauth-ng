# AngularJS directive for OAuth 2.0 [![Build Status](https://travis-ci.org/andreareginato/oauth-ng.svg?branch=master)](https://travis-ci.org/andreareginato/oauth-ng)


AngularJS directive for the [OAuth 2.0 Authorization code Flow](http://tools.ietf.org/html/rfc6749#section-1.3.1) 
and the [OAuth 2.0 Implicit Flow](http://tools.ietf.org/html/rfc6749#section-1.3.2).

## Documentation

[![oauth-ng](http://i.imgur.com/C0xCJcr.png)](https://andreareginato.github.com/oauth-ng)

## Contributing

Fork the repo on github and send a pull requests with topic branches.
Do not forget to provide specs and test cases to your contribution.
Please also update `gh-pages` branch with documentation when applicable.

### Setup

* Fork and clone the repository
* Run `npm install && bower install`

### OAuth 2.0 supported grant types

We support both [OAuth 2.0 Authorization code Flow](http://tools.ietf.org/html/rfc6749#section-1.3.1) 
and the [OAuth 2.0 Implicit Flow](http://tools.ietf.org/html/rfc6749#section-1.3.2).

#### Authorization code flow

See: http://tools.ietf.org/html/rfc6749#section-4.1

To use the Authorization code flow set response-type="code" in the oauth directive.

#### Implicit flow

See: http://tools.ietf.org/html/rfc6749#section-4.2

To use the Implicit flow set response-type="token" in the oauth directive.

### Unit tests (karma)

`npm install && bower install`

* Install [PhantomJS](http://phantomjs.org/download.html) then run `sudo ln -s ~/phantomjs-VERSION/bin/phantomjs /usr/bin/phantomjs`
* `grunt karma:unit`

### Creating your own distribution

* `grunt build`

The new distribution files will be created in the `dist/` folder.

### Coding guidelines

Follow [github](https://github.com/styleguide/) guidelines.

### Feedback

Use the [issue tracker](http://github.com/andreareginato/oauth-ng/issues) for bugs.
[Mail](mailto:andrea.reginato@gmail.com) or [Tweet](http://twitter.com/andreareginato) us for any idea
that can improve the project.

### Links

* [GIT Repository](http://github.com/andreareginato/oauth-ng)
* [Website](https://andreareginato.github.com/oauth-ng)


## Authors

Project created and released as open-source thanks to [Lelylan](http://lelylan.com).

* [Andrea Reginato](http://twitter.com/andreareginato)


## Contributors

Special thanks to all [contributors](https://github.com/andreareginato/oauth-ng/contributors)
for submitting patches.

## Changelog

See [CHANGELOG](https://github.com/andreareginato/oauth-ng/blob/master/CHANGELOG.md)

## Copyright

Copyright (c) 2014 [Lelylan](http://lelylan.com).
See [LICENSE](https://github.com/andreareginato/oauth-ng/blob/master/LICENSE.md) for details.
