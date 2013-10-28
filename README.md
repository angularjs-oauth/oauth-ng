# ng-oauth

AngularJS directive (aka web component) working with the
[OAuth2 Implicit Flow](http://tools.ietf.org/html/rfc6749#section-1.3.2).


## Requirements

In order to make it work you need to install the following libraries.

* angular ~1.0.7
* angular-resource ~1.0.7
* angular-cookies ~1.0.7
* angular-sanitize ~1.0.7


## Install

Install ng-oauth using [bower](http://bower.io/)

```
bower install ng-oauth
```


## Example

```
<oauth ng-cloak
  site="http://oauth.example.com"
  client="client-id"
  redirect="http://redirect.example.com"
  scope="scope"
  profile="http://api.example.com/me"
  storage="cookies">Sign In</oauth>
```


## Contributing

Fork the repo on github and send a pull requests with topic branches.
Do not forget to provide specs to your contribution.


### Requirements

In order to make ng-oauth work you need to install [yeoman](yeoman.io)
and [PhantomJS](http://phantomjs.org/).

### Install

Clone the repo.

```
git clone git@github.com:andreareginato/ng-oauth.git
cd ng-oauth
```

And install the required libraries.

```
npm install
bower install
```

### Running locally

```
grunt server
```

### Running specs

```
grunt karma:unit
```

### Creating your distribution

```
grunt build
```
