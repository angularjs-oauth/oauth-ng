'use strict';

var endpointClient = angular.module('oauth.endpoint', []);

endpointClient.factory('Endpoint', ['AccessToken', '$location',
  function(AccessToken, $location) {

  var service = {};
  var url;


  /*
   * Defines the authorization URL
   */

  service.set = function(scope) {
    var oAuthScope = (scope.scope)?encodeURIComponent(scope.scope):'',
        state = (scope.state)?encodeURIComponent(scope.state):'';

    url = scope.site +
      scope.authorizePath +
      '?response_type=token&' +
      'client_id=' + encodeURIComponent(scope.clientId) + '&' +
      'redirect_uri=' + encodeURIComponent(scope.redirectUri) + '&' +
      'scope=' + oAuthScope + '&' +
      'state=' + state;

    return url;
  };

  /*
   * Returns the authorization URL
   */

  service.get = function() {
    return url;
  };


  /*
   * Redirects the app to the authorization URL
   */

  service.redirect = function() {
    window.location.replace(url);
  };

  return service;
}]);
