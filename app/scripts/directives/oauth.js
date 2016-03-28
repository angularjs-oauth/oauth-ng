'use strict';

var directives = angular.module('oauth.directive', []);

directives.directive('oauth', [
  'IdToken',
  'AccessToken',
  'Endpoint',
  'Profile',
  'Storage',
  'OidcConfig',
  '$location',
  '$rootScope',
  '$compile',
  '$http',
  '$templateCache',
  '$timeout',
  function(IdToken, AccessToken, Endpoint, Profile, Storage, OidcConfig, $location, $rootScope, $compile, $http, $templateCache, $timeout) {

    var definition = {
      restrict: 'AE',
      replace: true,
      scope: {
        site: '@',          // (required) set the oauth server host (e.g. http://oauth.example.com)
        clientId: '@',      // (required) client id
        redirectUri: '@',   // (required) client redirect uri
        responseType: '@',  // (optional) response type, defaults to token (use 'token' for implicit flow and 'code' for authorization code flow
        scope: '@',         // (optional) scope
        profileUri: '@',    // (optional) user profile uri (e.g http://example.com/me)
        template: '@',      // (optional) template to render (e.g views/templates/default.html)
        text: '@',          // (optional) login text
        authorizePath: '@', // (optional) authorization url
        state: '@',         // (optional) An arbitrary unique string created by your app to guard against Cross-site Request Forgery
        storage: '@',        // (optional) Store token in 'sessionStorage' or 'localStorage', defaults to 'sessionStorage'
        nonce: '@',          // (optional) Send nonce on auth request
                             // OpenID Connect extras, more details in id-token.js:
        issuer: '@',         // (optional for OpenID Connect) issuer of the id_token, should match the 'iss' claim in id_token payload
        subject: '@',        // (optional for OpenID Connect) subject of the id_token, should match the 'sub' claim in id_token payload
        pubKey: '@',          // (optional for OpenID Connect) the public key(RSA public key or X509 certificate in PEM format) to verify the signature
        wellKnown: '@',       // (optional for OpenID Connect) whether to load public key according to .well-known/openid-configuration endpoint
        logoutPath: '@',    // (optional) A url to go to at logout
        sessionPath: '@'    // (optional) A url to use to check the validity of the current token.
      }
    };

    definition.link = function postLink(scope, element) {
      scope.show = 'none';

      scope.$watch('clientId', function() {
        init();
      });

      var init = function() {
        initAttributes();          // sets defaults
        Storage.use(scope.storage);// set storage
        compile();                 // compiles the desired layout
        Endpoint.set(scope);       // sets the oauth authorization url
        OidcConfig.load(scope)     // loads OIDC configuration from .well-known/openid-configuration if necessary
          .then(function() {
            IdToken.set(scope);
            AccessToken.set(scope);    // sets the access token object (if existing, from fragment or session)
            initProfile(scope);        // gets the profile resource (if existing the access token)
            initView();                // sets the view (logged in or out)
            checkValidity();           // ensure the validity of the current token
          });
      };

      var initAttributes = function() {
        scope.authorizePath = scope.authorizePath || '/oauth/authorize';
        scope.tokenPath     = scope.tokenPath     || '/oauth/token';
        scope.template      = scope.template      || 'views/templates/default.html';
        scope.responseType  = scope.responseType  || 'token';
        scope.text          = scope.text          || 'Sign In';
        scope.state         = scope.state         || undefined;
        scope.scope         = scope.scope         || undefined;
        scope.storage       = scope.storage       || 'sessionStorage';
      };

      var compile = function() {
        $http.get(scope.template, { cache: $templateCache }).success(function(html) {
          element.html(html);
          $compile(element.contents())(scope);
        });
      };

      var initProfile = function(scope) {
        var token = AccessToken.get();

        if (token && token.access_token && scope.profileUri) {
          Profile.find(scope.profileUri).success(function(response) {
            scope.profile = response;
          });
        }
      };

      var initView = function () {
        var token = AccessToken.get();

        if (!token) {
          return scope.logout();
        }  // without access token it's logged out
        if (AccessToken.expired()) {
          return expired();
        }  // with a token, but it's expired
        if (token.access_token) {
          return authorized();
        }  // if there is the access token we are done
        if (token.error) {
          return denied();
        }  // if the request has been denied we fire the denied event
      };

      scope.login = function () {
        Endpoint.redirect();
      };

      scope.logout = function () {
        Endpoint.logout();
        $rootScope.$broadcast('oauth:loggedOut');
        scope.show = 'logged-out';
      };

      scope.$on('oauth:expired',expired);

      // user is authorized
      var authorized = function() {
        $rootScope.$broadcast('oauth:authorized', AccessToken.get());
        scope.show = 'logged-in';
      };

      var expired = function() {
        $rootScope.$broadcast('oauth:expired');
        scope.logout();
      };

      // set the oauth directive to the denied status
      var denied = function() {
        scope.show = 'denied';
        $rootScope.$broadcast('oauth:denied');
      };

      var checkValidity = function() {
        Endpoint.checkValidity().then(function() {
          $rootScope.$broadcast('oauth:valid');
        }).catch(function(message){
          $rootScope.$broadcast('oauth:invalid', message);
        });
      };

      var refreshDirective = function () {
        scope.$apply();
      };

      // Updates the template at runtime
      scope.$on('oauth:template:update', function(event, template) {
        scope.template = template;
        compile(scope);
      });

      // Hack to update the directive content on logout
      scope.$on('$routeChangeSuccess', function () {
        $timeout(refreshDirective);
      });

      scope.$on('$stateChangeSuccess', function () {
        $timeout(refreshDirective);
      });
    };

    return definition;
  }
]);
