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
    var state = scope.state || $location.url();

    url = scope.site +
      scope.authorizePath +
      '?response_type=token&' +
      'client_id=' + encodeURIComponent(scope.clientId) + '&' +
      'redirect_uri=' + encodeURIComponent(scope.redirectUri) + '&' +
      'scope=' + encodeURIComponent(scope.scope) + '&' +
      'state=' + encodeURIComponent(state)

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
