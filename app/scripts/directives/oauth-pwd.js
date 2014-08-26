'use strict';

var directives = angular.module('oauth.directive.pwd', []);

directives.directive('oauthPwd', function(AccessToken, Profile, $rootScope, $compile, $http, $templateCache) {

  var definition = {
    restrict: 'AE',
    replace: true,
    scope: {
      clientId: '@',      // (required) client id
      authPath: '@',      // (optional) the path to post to if not /oauth
      profilePath: '@',   // (optional) user profile path (e.g /users/me)
      logoutPath: '@',    // (optional) a path to post to so the token is destroyed on the server (e.g /users/me)
      loginTemplate: '@', // (optional) template to render (e.g views/templates/login-form.html)
      registerUrl: '@'    // (optional) a link to the registration page is shown when a URL is specified
    }
  };

  definition.link = function postLink(scope, element) {
    scope.show = 'none';

    scope.$watch('clientId', function(value) { init() });
    
    element.on('submit', '#loginForm', function() { scope.login() });
    scope.$on('$destroy', function() { element.off('submit', '#loginForm') });

    scope.$on('oauth:authorized', function(event, token) {
        console.log('auth:', token);
    });

    var init = function() {
      initAttributes();          // sets defaults
      compile();                 // compiles the desired layout
      AccessToken.set(scope);    // sets the access token object (if existing, from fragment or session)
      initProfile(scope);        // gets the profile resource (if existing the access token)
      updateView();              // sets the view (logged in or out)
    };

    var initAttributes = function() {
      scope.authPath      = scope.authPath      || '/oauth';
      scope.loginTemplate = scope.loginTemplate || 'views/templates/login-form.html';
      scope.registerUrl   = scope.registerUrl   || undefined;
      scope.profilePath   = scope.profilePath   || undefined;
      scope.logoutPath    = scope.logoutPath    || undefined;
    };

    var compile = function() {
      $http.get(scope.loginTemplate, { cache: $templateCache }).success(function(html) {
        element.html(html);
        $compile(element.contents())(scope);
      });
    };

    var initProfile = function(scope) {
      var token = AccessToken.get();

      if (token && token.access_token && scope.profilePath) {
        Profile.find(scope.profilePath).success(function(response) {
          scope.profile = response
        })
      }
    };

    var updateView = function() {
      var token = AccessToken.get();

      if (!token)             { return loggedOut()  }  // without access token it's logged out
      if (token.access_token) { return authorized() }  // if there is the access token we are done
      if (token.error)        { return denied()     }  // if the request has been denied we fire the denied event
    };

    scope.login = function() {
      delete scope.errorMsg;
      $http.post(scope.authPath, {
        "grant_type": "password",
        "username": scope.username,
        "password": scope.password,
        "client_id": scope.clientId
      }).then(function(successResponse) {
        console.log(successResponse);
        AccessToken.set(scope, successResponse.data);
        console.log(AccessToken.get());
        initProfile(scope);
        updateView();
      }, function(errorResponse) {
        scope.errorMsg = (errorResponse.data && errorResponse.data.detail) || 'Invalid credentials';
      });
    };

    scope.logout = function() {
      scope.logoutPath && $http.post(scope.logoutPath, data).success(successCallback);
      AccessToken.destroy(scope);
      loggedOut();
    };

    // user is authorized
    var authorized = function() {
        console.log('broadcast auth');
      $rootScope.$broadcast('oauth:authorized', AccessToken.get());
      scope.show = 'logged-in';
    };

    // set the oauth directive to the logged-out status
    var loggedOut = function() {
      $rootScope.$broadcast('oauth:logout');
      scope.show = 'logged-out';
    };

    // set the oauth directive to the denied status
    var denied = function() {
      scope.show = 'denied';
      $rootScope.$broadcast('oauth:denied');
    };

    // Updates the template at runtime
    scope.$on('oauth:template:update', function(event, template) {
      scope.template = template;
      compile(scope);
    });
  };

  return definition
});
