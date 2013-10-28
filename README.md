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

* [Yeoman](yeoman.io)
* [PhantomJS](http://phantomjs.org/).

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

#### Run local server

```
grunt server
```

#### Run specs

```
grunt karma:unit
```

#### Create your own distribution

```
grunt build
```
