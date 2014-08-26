'use strict';

var accessTokenService = angular.module('oauth.accessToken', ['ngStorage']);

accessTokenService.factory('AccessToken', function($rootScope, $location, $sessionStorage, $timeout) {

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
    service.setTokenFromString($location.hash());
    service.setTokenFromSession();
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
    return (token && token.expires_at && token.expires_at < new Date());
  }



  /* * * * * * * * * *
   * PRIVATE METHODS *
   * * * * * * * * * */


  /*
   * Get the access token from a string and save it
   */

  service.setTokenFromString = function(hash) {
    var token = getTokenFromString(hash);

    if (token) {
      removeFragment();
      service.setToken(token);
      setExpiresAt();
      $rootScope.$broadcast('oauth:login', token);
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

  service.setTokenFromSession = function() {
    if ($sessionStorage.token) {
      var params = $sessionStorage.token;
      params.expires_at = new Date(params.expires_at);
      service.setToken(params);
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

  service.setToken = function(params) {
    token = token || {}                 // init the token
    angular.extend(token, params);      // set the access token params
    setTokenInSession();                // save the token into the session
    setExpiresAtEvent();                // event to fire when the token expires

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
   * Set the timeout at which the expired event is fired
   */

  var setExpiresAtEvent = function() {
    var time  = (new Date(token.expires_at)) - (new Date())
    if (time) { $timeout(function() { $rootScope.$broadcast('oauth:expired', token) }, time) }
  }


  /*
   * Remove the fragment URI
   * TODO we need to remove only the access token
   */

  var removeFragment = function(scope) {
    $location.hash('');
  }


  return service;
});
