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
