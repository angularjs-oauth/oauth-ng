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
