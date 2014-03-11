'use strict';

var directives = angular.module('oauth.directive', []);

directives.directive('oauth', ['AccessToken', 'Endpoint', 'Profile' ,'oauth.config', '$location', '$rootScope', '$compile', '$http', '$templateCache',
  function(AccessToken, Endpoint, Profile, config, $location, $rootScope, $compile, $http, $templateCache) {

  var definition = {
    restrict: 'AE',
    replace: false,
    scope: {
      site: '@',                    // (required) set the oauth2 server host (e.g. http://people.example.com)
      clientId: '@clientId',        // (required) client id
      redirectUrl: '@redirectUrl',  // (required) client redirect uri
      scope: '@',                   // (optional) scope
      profile: '@',                 // (optional) user info uri (e.g http://example.com/me)
      template: '@'                 // (optional) template to render (e.g views/templates/default.html)
    }
  };

  definition.link = function postLink(scope, element, attrs) {
    scope.show = 'none';

    scope.$watch('client', function(value) {
      init();                    // set defaults
      compile();                 // compile the desired layout
      Endpoint.set(scope);       // set the oauth client url for authorization
      AccessToken.set(scope);    // set the access token object (from fragment or session)
      initProfile();             // get the profile info
      initView();                // set the actual visualization status for the widget
    });

    var init = function() {
      scope.authorizePath = scope.authorizePath || '/oauth/authorize';
      scope.tokenPath     = scope.tokenPath     || '/oauth/token';
      scope.flow          = scope.flow          || 'implicit';
      scope.view          = scope.view          || 'standard';
      scope.storage       = scope.storage       || 'none';
      scope.template      = scope.template      || 'views/templates/default.html';
    }

    var compile = function() {
      $http.get(scope.template, { cache: $templateCache }).success(function(html) {
        element.html(html);
        $compile(element.contents())(scope);
      });
    };

    var initProfile = function() {
      var token = AccessToken.get();
      if (token && token.access_token && config.profile)
        scope.profile = Profile.get();
    }

    var initView = function(token) {
      var token = AccessToken.get();

      if (!token)             { return loggedOut() }   // without access token it's logged out
      if (token.access_token) { return loggedIn() }    // if there is the access token we are done
      if (token.error)        { return denied() }      // if the request has been denied we fire the denied event
    }

    scope.login = function() {
      Endpoint.redirect();
    }

    scope.logout = function() {
      AccessToken.destroy(scope);
      loggedOut();
    }

    // set the oauth2 directive to the logged-in status
    var loggedIn = function() {
      $rootScope.$broadcast('oauth:success', AccessToken.get());
      scope.show = 'logged-out';
    }

    // set the oauth2 directive to the logged-out status
    var loggedOut = function() {
      $rootScope.$broadcast('oauth:logout');
      scope.show = 'logged-in';
    }

    // set the oauth2 directive to the denied status
    var denied = function() {
      scope.show = 'denied';
      $rootScope.$broadcast('oauth:denied');
    }

    // called to update the template at runtime
    scope.$on('oauth:template', function(event, template) {
      scope.template = template;
      compile(scope);
    });
  };

  return definition
}]);
