'use strict';

var endpointClient = angular.module('oauth.endpoint', []);

endpointClient.factory('Endpoint', function(AccessToken, $location) {

  var service = {};
  var url;


  /*
   * Defines the authorization URL
   */

  service.set = function(params) {
    var oAuthScope = (params.scope) ? params.scope : '',
        state = (params.state) ? encodeURIComponent(params.state) : '',
        authPathHasQuery = (params.authorizePath.indexOf('?') == -1) ? false : true,
        appendChar = (authPathHasQuery) ? '&' : '?';    //if authorizePath has ? already append OAuth2 params

    url = params.site +
          params.authorizePath +
          appendChar + 'response_type=' + params.responseType + '&' +
          'client_id=' + encodeURIComponent(params.clientId) + '&' +
          'redirect_uri=' + encodeURIComponent(params.redirectUri) + '&' +
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
