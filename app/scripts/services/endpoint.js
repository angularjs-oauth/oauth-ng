'use strict';

var endpointClient = angular.module('oauth.endpoint', []);

endpointClient.factory('Endpoint', function($rootScope, AccessToken, $q, $http) {

  var service = {};

  var buildOauthUrl = function (path, params) {
    var oAuthScope = (params.scope) ? encodeURIComponent(params.scope) : '',
      state = (params.state) ? encodeURIComponent(params.state) : '',
      authPathHasQuery = (params.authorizePath.indexOf('?') == -1) ? false : true,
      appendChar = (authPathHasQuery) ? '&' : '?',    //if authorizePath has ? already append OAuth2 params
      nonceParam = (params.nonce) ? '&nonce=' + params.nonce : '',
      responseType = encodeURIComponent(params.responseType);

    return params.site +
      path +
      appendChar + 'response_type=' + responseType + '&' +
      'client_id=' + encodeURIComponent(params.clientId) + '&' +
      'redirect_uri=' + encodeURIComponent(params.redirectUri) + '&' +
      'scope=' + oAuthScope + '&' +
      'state=' + state + nonceParam;
  };

  var extendValidity = function (tokenInfo) {
    AccessToken.updateExpiry(tokenInfo.expires);
  };

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

  service.get = function(overrides) {
    var params = angular.extend( {}, service.config, overrides);
    return buildOauthUrl(params.authorizePath, params);
  };

  /*
   * Redirects the app to the authorization URL
   */

  service.redirect = function(overrides) {
    var targetLocation = this.get(overrides);
    $rootScope.$broadcast('oauth:logging-in');
    window.location.replace(targetLocation);
  };

  /*
   * Alias for 'redirect'
   */
  service.login = function() {
    service.redirect();
  };

  /*
   * Check the validity of the token if a session path is available
   */
  service.checkValidity = function() {
    var params = service.config;
    if( params.sessionPath ) {
      var token = AccessToken.get();
      if( !token ) {
        return $q.reject("No token configured");
      }
      var path = params.site + params.sessionPath + "?token=" + token.access_token;
      return $http.get(path).then( function(httpResponse) {
        var tokenInfo = httpResponse.data;
        if(tokenInfo.valid) {
          extendValidity(tokenInfo);
          return true;
        } else {
          return $q.reject("Server replied: token is invalid.");
        }
      });
    } else {
      return $q.reject("You must give a :session-path param in order to validate the token.")
    }
  };

  /*
   * Destroys the session, sends the user to the logout url if set.
   * First broadcasts 'logging-out' and then 'logout' when finished.
   */

  service.logout = function() {
    var params = service.config;
    AccessToken.destroy();
    $rootScope.$broadcast('oauth:logging-out');
    if( params.logoutPath ) {
      window.location.replace(buildOauthUrl(params.logoutPath, params));
    }
    $rootScope.$broadcast('oauth:logout');
  };

  return service;
});
