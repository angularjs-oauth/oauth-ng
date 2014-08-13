'use strict';

var endpointClient = angular.module('oauth.endpoint', []);

endpointClient.factory('Endpoint', function(AccessToken, $location) {

  var service = {};
  var url;


  /*
   * Defines the authorization URL
   */

  service.set = function(scope) {
    var oAuthScope = (scope.scope) ? encodeURIComponent(scope.scope) : '',
        state = (scope.state) ? encodeURIComponent(scope.state) : '',
        authPathHasQuery = (scope.authorizePath.indexOf('?') == -1) ? false : true,
        appendChar = (authPathHasQuery) ? '&' : '?';    //if authorizePath has ? already append OAuth2 params

    url = scope.site +
          scope.authorizePath +
          appendChar + 'response_type=token&' +
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
});
