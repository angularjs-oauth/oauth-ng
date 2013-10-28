'use strict';

var client = angular.module('oauth.requestWrapper', ['ngResource']);

client.factory('RequestWrapper', ['AccessToken', '$http', function(AccessToken, $http) {
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
