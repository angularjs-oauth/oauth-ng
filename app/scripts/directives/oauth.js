'use strict';

var directives = angular.module('oauth.directive', []);

directives.directive('oauth', ['AccessToken', 'Endpoint', 'Profile' ,'oauth.config', '$location', '$rootScope', '$compile', '$http', '$templateCache',
  function(AccessToken, Endpoint, Profile, config, $location, $rootScope, $compile, $http, $templateCache) {

  var definition = {
    restrict: 'AE',
    replace: false,
    scope: {
      site: '@',       // (required) set the oauth2 server host (e.g. http://people.lelylan.com)
      client: '@',     // (required) client id
      redirect: '@',   // (required) client redirect uri
      scope: '@',      // (optional) scope
      flow: '@',       // (required) flow (e.g password, implicit)
      view: '@',       // (optional) view (e.g standard, popup)
      storage: '@',    // (optional) storage (e.g none, cookies)
      profile: '@',    // (optional) user info uri (e.g http://example.com/me)
      template: '@'    // (optional) template to render (e.g views/templates/default.html)
    }
  };

  definition.link = function postLink(scope, element, attrs) {
    scope.show = 'none';

    scope.$watch('client', function(value) {
      init();                    // set defaults
      compile();                 // compile the desired layout
      Endpoint.set(scope);       // set the oauth client url for authorization
      AccessToken.set(scope);    // set the access token object (from fragment or cookies)
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

    var loggedIn = function() {
      $rootScope.$broadcast('oauth:success', AccessToken.get());
      scope.show = 'logout';
    }

    var loggedOut = function() {
      $rootScope.$broadcast('oauth:logout');
      scope.show = 'login';
    }

    var denied = function() {
      scope.show = 'denied';
      $rootScope.$broadcast('oauth:denied');
    }

    scope.$on('oauth:template', function(event, template) {
      scope.template = template;
      compile(scope);
    });
  };

  return definition
}]);
