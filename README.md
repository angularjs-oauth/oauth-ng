# oauth2-ng

AngularJS directive (aka web component) working with the
[OAuth2 Implicit Flow](http://tools.ietf.org/html/rfc6749#section-1.3.2).


## Install

Install ng-oauth2 using [bower](http://bower.io/)

```
bower install ng-oauth2
```


## Requirements

* [angular ~1.2.14](http://angularjs.org/)


## Getting Started

```html
<html ng-app="example">
  <body>
    <!-- oauth2 tag -->
    <oauth2
      site="http://oauth.example.com"
      client-id="client-id"
      redirect-uri="http://redirect.example.com"
      scope="scope"
      profile="http://api.example.com/me">
    </oauth2>
    <!-- Javascript libraries -->
    <script src="//ajax.googleapis.com/ajax/libs/angularjs/1.2.14/angular.js"></script>
    <script src="bower_components/oauth2-ng/dist/oauth2-ng.js"/></script>
  </body>
</html>
```


### OAuth2 configurations

The oauth2 component accepts the following attributes.

* `site` - A string that represents the authorization endpoint (e.g. `http://people.lelylan.com`).
* `client-id` - Registered Client ID.
* `redirect-uri` - Registered application URI where the user is redirected after the authorization.
* `scope` - Application privileges.
* `profile` - API endpoint returning the profile representation
* `state` - Optional opaque value used by the client to maintain state between the request and callback


### OAuth2 events

Lelylan client fires the following events.

* `oauth2:success` - the user has authorized the third party app.
The listener receives the [access token](http://tools.ietf.org/html/rfc6750#section-4) obect.
* `oauth2:logout` - the user has logged out
* `oauth2:denied` - the user has not authorized the third party app

```javascript
function ExampleController($scope) {
  $scope.$on('oauth2:login', function(event, token) {
    console.log('The user authorized the third party app with access token' + token.access_token);
  });

  $scope.$on('oauth2:logout', function(event) {
    console.log('The user has signed out');
  });

  $scope.$on('oauth2:denied', function(event) {
    console.log('The user did not authorize the third party app');
  });
}
```


### Signed in user

When a user signs in, the profile is cached into the `Profile` service. Keep in mind that the
Profile Endpoint is defined with the profile attribute into the directive.

```html
<div ng-controller="LelylanController">
  Welcome {{me.full_name}}
</div>

<script>
function LelylanController($scope, LoggedUser) {
  $scope.me = Profile.get();
}
</script>
```

## Contributing

Fork the repo on github and send a pull requests with topic branches.
Do not forget to provide specs to your contribution.

### Requirements

* [Yeoman](yeoman.io)
* [PhantomJS](http://phantomjs.org/)

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

#### Run specs

```
grunt karma:unit
```

#### Create your own distribution

```
grunt build
```
