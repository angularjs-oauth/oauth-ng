/**
 * ng-oauth
 * @version v0.1.0 - 2013-10-28
 * @link https://github.com/lelylan/oauth-ng
 * @author Andrea Reginato
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

'use strict';

// App libraries
angular.module('oauth', [
  'oauth.directive',       // login directive
  'oauth.accessToken',     // access token service
  'oauth.endpoint',        // oauth endpoint service
  'oauth.requestWrapper',  // requests wrapper (inject the access token into the header)
  'oauth.profile',         // profile model
  'oauth.config'           // configurations
])

// HTML5 mode
angular.module('oauth').config(['$locationProvider', function($locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('!');
}]);


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

'use strict';

var service = angular.module('oauth.accessToken', ['ngCookies']);

service.factory('AccessToken', ['$location', '$http', '$cookies', '$rootScope',
  function($location, $http, $cookies, $rootScope) {

  var service = {};
  var token = null;


  /*
   * Returns the access token.
   */

  service.get = function() {
    return token
  }


  /*
   * Sets and returns the access token taking it from the fragment URI or eventually
   * from the cookies. Use `AccessToken.init()` to load (at boot time) the access token.
   */

  service.set = function(scope) {
    setTokenFromString(scope);    // take the token from the query string and eventually save it in the cookies
    setTokenFromCookies(scope);   // take the from the cookies
    return token
  }


  /*
   *  Delete the access token and remove the cookies.
   */

  service.destroy = function(scope) {
    token = null;
    delete $cookies[scope.client];
    return token;
  }


  /*
   * Tells when the access token is expired.
   */

  service.expired = function() {
    return (token && token.expires_at && token.expires_at < new Date())
  }


  /* --------------- */
  /* Private methods */
  /* --------------- */


  /*
   * Get the access token from a string and save it
   */

  var setTokenFromString = function(scope) {
    var token = getTokenFromString($location.hash());

    if (token) {
      removeFragment();
      setToken(token, scope);
    }
  };


  /*
   * Parse the fragment URI into an object
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
   * Set the access token from the cookies.
   * Returns the access token only when the storage attribute is set to 'cookies'.
   */

  var setTokenFromCookies = function(scope) {
    if (scope.storage == 'cookies') {
      if ($cookies[scope.client]) {
        var params = JSON.parse($cookies[scope.client]);
        setToken(params, scope);
      }
    }
  }


  /*
   * Save the access token into a cookie identified by the application ID
   * Save the access token only when the storage attribute is set to 'cookies'.
   */

  var setTokenInCookies = function(scope, params) {
    if (scope.storage == 'cookies') {
      if (params && params.access_token) {
        $cookies[scope.client] = JSON.stringify(params);
      }
    }
  }


  /*
   * Set the access token.
   */

  var setToken = function(params, scope) {
    token = token || {}                 // init the token
    angular.extend(token, params);      // set the access token params
    setExpiresAt();                     // set the expiring time
    setTokenInCookies(scope, params);   // save the token into a cookie

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
   * TODO we need to let the fragment live if it's not the access token
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
      'client_id=' + scope.client + '&' +
      'redirect_uri=' + scope.redirect + '&' +
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

var client = angular.module('oauth.requestWrapper', ['ngResource']);

client.factory('RequestWrapper', ['AccessToken', 'Endpoint', '$http', function(AccessToken, Endpoint, $http) {
  var service = {};
  var token;


  /*
   * Wrap every request
   */

  service.wrap = function(resource, actions, options) {
    var wrappedResource = resource;
    for (var i=0; i < actions.length; i++) { request(wrappedResource, actions[i]); };
    return wrappedResource;
  };


  /*
   * Verify if the acces token exists and based on it set or unset the header request
   */

  var request = function(resource, action) {
    resource['_' + action] = resource[action];

    resource[action] = function(params, data, success, error) {
      var token = AccessToken.get();
      if (token && AccessToken.expired()) { Endpoint.redirect() }

      setAuthorizationHeader(token);
      return resource['_' + action].call(this, params, data, success, error);
    };
  };


  /*
   * Set the oauth request header
   */

  var setAuthorizationHeader = function(token) {
    if (token)
      $http.defaults.headers.common['Authorization'] = 'Bearer ' + token.access_token;
    else
      delete $http.defaults.headers.common['Authorization']
  };


  return service;
}]);

'use strict';

var client = angular.module('oauth.profile', ['ngResource'])

client.factory('Profile', ['RequestWrapper', '$resource', 'oauth.config',
  function(RequestWrapper, $resource, config) {

    var resource = $resource(config.profile, {}, {
      //get: { method: 'JSONP', params: { callback: 'JSON_CALLBACK' } }
    });
    return RequestWrapper.wrap(resource, ['get']);
}]);

'use strict';

angular.module('oauth.config', []).value('oauth.config', {
  profile: null
});
