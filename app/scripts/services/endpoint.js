'use strict';

var endpointClient = angular.module('oauth.endpoint', []);

endpointClient.factory('Endpoint', function() {

  var service = {};

  /*
   * Defines the authorization URL
   */

  service.set = function(configuration) {
    this.config = configuration;
    return this.get();
  };

  /*
   * Returns the authorization URL
   */

  service.get = function( overrides ) {
    var params = angular.extend( {}, service.config, overrides);
    var oAuthScope = (params.scope) ? encodeURIComponent(params.scope) : '',
        state = (params.state) ? encodeURIComponent(params.state) : '',
        authPathHasQuery = (params.authorizePath.indexOf('?') === -1) ? false : true,
        appendChar = (authPathHasQuery) ? '&' : '?',    //if authorizePath has ? already append OAuth2 params
        responseType = (params.responseType) ? encodeURIComponent(params.responseType) : '';

    var url = params.site +
          params.authorizePath +
          appendChar + 'response_type=' + responseType + '&' +
          'client_id=' + encodeURIComponent(params.clientId) + '&' +
          'redirect_uri=' + encodeURIComponent(params.redirectUri) + '&' +
          'scope=' + oAuthScope + '&' +
          'state=' + state;

    if( params.nonce ) {
      url = url + '&nonce=' + params.nonce;
    }
    return url;
  };

  /*
   * Redirects the app to the authorization URL
   */

  service.redirect = function( overrides ) {
    var targetLocation = this.get( overrides );
    window.location.replace(targetLocation);
  };

  return service;
});
