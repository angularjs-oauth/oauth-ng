/* ng-oauth - v0.1.1 - 2014-05-20 */

'use strict';

// App libraries
var app = angular.module('oauth', [
  'oauth.directive',      // login directive
  'oauth.accessToken',    // access token service
  'oauth.endpoint',       // oauth endpoint service
  'oauth.profile',        // profile model
  'oauth.interceptor'     // bearer token interceptor
])

angular.module('oauth').config(['$locationProvider','$httpProvider',
  function($locationProvider, $httpProvider) {
    $locationProvider.html5Mode(true).hashPrefix('!');      // HTML5 mode
    $httpProvider.interceptors.push('OAuthInterceptor');    // Authentication header
  }]);

'use strict';

var directives = angular.module('oauth.directive', []);

directives.directive('oauth', ['AccessToken', 'Endpoint', 'Profile', '$location', '$rootScope', '$compile', '$http', '$templateCache',
  function(AccessToken, Endpoint, Profile, $location, $rootScope, $compile, $http, $templateCache) {

  var definition = {
    restrict: 'AE',
    replace: true,
    scope: {
      site: '@',         // (required) set the oauth server host (e.g. http://oauth.example.com)
      clientId: '@',     // (required) client id
      redirectUri: '@',  // (required) client redirect uri
      scope: '@',        // (optional) scope
      profileUri: '@',   // (optional) user profile uri (e.g http://example.com/me)
      template: '@'      // (optional) template to render (e.g bower_components/oauth-ng/dist/views/templates/default.html)
    }
  };

  definition.link = function postLink(scope, element, attrs) {
    scope.show = 'none';

    scope.$watch('client', function(value) {
      init();                    // sets defaults
      compile();                 // compiles the desired layout
      Endpoint.set(scope);       // sets the oauth authorization url
      AccessToken.set(scope);    // sets the access token object (if existing, from fragment or session)
      initProfile(scope);        // gets the profile resource (if existing the access token)
      initView();                // sets the view (logged in or out)
    });

    var init = function() {
      scope.authorizePath = scope.authorizePath || '/oauth/authorize';
      scope.tokenPath     = scope.tokenPath     || '/oauth/token';
      scope.template      = scope.template      || 'bower_components/oauth-ng/dist/views/templates/default.html';
    }

    var compile = function() {
      $http.get(scope.template, { cache: $templateCache }).success(function(html) {
        element.html(html);
        $compile(element.contents())(scope);
      });
    };

    var initProfile = function(scope) {
      var token = AccessToken.get();

      if (token && token.access_token && scope.profileUri) {
        Profile.get(scope.profileUri).success(function(response) { scope.profile = response })
      }
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

    // set the oauth directive to the logged-in status
    var loggedIn = function() {
      $rootScope.$broadcast('oauth:success', AccessToken.get());
      scope.show = 'logged-in';
    }

    // set the oauth directive to the logged-out status
    var loggedOut = function() {
      $rootScope.$broadcast('oauth:logout');
      scope.show = 'logged-out';
    }

    // set the oauth directive to the denied status
    var denied = function() {
      scope.show = 'denied';
      $rootScope.$broadcast('oauth:denied');
    }

    // Updates the template at runtime
    scope.$on('oauth:template:update', function(event, template) {
      scope.template = template;
      compile(scope);
    });
  };

  return definition
}]);

'use strict';

var service = angular.module('oauth.interceptor', []);

service.factory('OAuthInterceptor', ['$rootScope', '$q', '$sessionStorage',
  function ($rootScope, $q, $sessionStorage) {

    var service = {};

    service.request = function(config) {
      var token = $sessionStorage.token;

      if (token)
        config.headers.Authorization = 'Bearer ' + token.access_token;

      if (token && expired(token))
        $rootScope.$broadcast('oauth:expired', token);

      return config;
    };

    var expired = function(token) {
      return (token && token.expires_at && new Date(token.expires_at) < new Date())
    }

    return service;
  }]);


'use strict';

var service = angular.module('oauth.accessToken', ['ngStorage']);

service.factory('AccessToken', ['$rootScope', '$location', '$http', '$sessionStorage',
  function($rootScope, $location, $http, $sessionStorage) {

  var service = {};
  var token   = null;


  /*
   * Returns the access token.
   */

  service.get = function() {
    return token
  }


  /*
   * Sets and returns the access token. It tries (in order) the following strategies:
   * - takes the token from the fragment URI
   * - takes the token from the sessionStorage
   */

  service.set = function() {
    setTokenFromString();
    setTokenFromSession();
    return token
  }


  /*
   *  Delete the access token and remove the session.
   */

  service.destroy = function() {
    delete $sessionStorage.token;
    return token = null;
  }


  /*
   * Tells if the access token is expired.
   */

  service.expired = function() {
    return (token && token.expires_at && token.expires_at < new Date())
  }



  /* * * * * * * * * *
   * PRIVATE METHODS *
   * * * * * * * * * */


  /*
   * Get the access token from a string and save it
   */

  var setTokenFromString = function() {
    var token = getTokenFromString($location.hash());

    if (token) {
      removeFragment();
      setToken(token);
    }
  };


  /*
   * Parse the fragment URI and return an object
   */

  var getTokenFromString = function(hash) {
    var splitted = hash.split('&');
    var params = {};

    for (var i = 0; i < splitted.length; i++) {
      var param  = splitted[i].split('=');
      var key    = param[0];
      var value  = param[1];
      params[key] = value
    }

    if (params.access_token || params.error)
      return params;
  }


  /*
   * Set the access token from the sessionStorage.
   */

  var setTokenFromSession = function() {
    if ($sessionStorage.token) {
      var params = $sessionStorage.token;
      setToken(params);
    }
  }


  /*
   * Save the access token into the session
   */

  var setTokenInSession = function() {
    $sessionStorage.token = token;
  }


  /*
   * Set the access token.
   */

  var setToken = function(params) {
    token = token || {}                 // init the token
    angular.extend(token, params);      // set the access token params
    setExpiresAt();                     // set the expiring time
    setTokenInSession();                // save the token into the session
    return token;
  };


  /*
   * Set the access token expiration date (useful for refresh logics)
   */

  var setExpiresAt = function() {
    if (token) {
      var expires_at = new Date();
      expires_at.setSeconds(expires_at.getSeconds() + parseInt(token.expires_in) - 60); // 60 seconds less to secure browser and response latency
      token.expires_at = expires_at;
    }
  };


  /*
   * Remove the fragment URI
   * TODO we need to remove only the access token
   */

  var removeFragment = function(scope) {
    $location.hash('');
  }


  return service;
}]);

'use strict';

var client = angular.module('oauth.endpoint', []);

client.factory('Endpoint', ['AccessToken', '$location',
  function(AccessToken, $location) {

  var service = {};
  var params;
  var url;


  /*
   * Defines the authorization URL
   */

  service.set = function(scope) {
    url = scope.site +
      scope.authorizePath +
      '?response_type=token&' +
      'client_id=' + scope.clientId + '&' +
      'redirect_uri=' + scope.redirectUri + '&' +
      'scope=' + scope.scope + '&' +
      'state=' + $location.url()

    return url;
  }


  /*
   * Returns the authorization URL
   */

  service.get = function() {
    return url;
  }


  /*
   * Redirects the app to the authorization URL
   */

  service.redirect = function() {
    window.location.replace(url);
  }

  return service;
}]);

'use strict';

var client = angular.module('oauth.profile', [])

client.factory('Profile', ['$http', function($http) {
  var service = {}

  service.get = function(uri) {
    return $http.get(uri);
  }

  return service;
}]);
