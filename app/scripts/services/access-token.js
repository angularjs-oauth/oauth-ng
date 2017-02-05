'use strict';

var accessTokenService = angular.module('oauth.accessToken', []);

accessTokenService.factory('AccessToken', ['Storage', '$rootScope', '$http', '$q', '$location', '$interval', '$timeout', 'IdToken', function(Storage, $rootScope, $http, $q, $location, $interval, $timeout, IdToken){

  var service = {
    token: null
  },
  hashFragmentKeys = [
    //Oauth2 keys per http://tools.ietf.org/html/rfc6749#section-4.2.2
    'access_token', 'token_type', 'expires_in', 'scope', 'state',
    'error','error_description',
    //Additional OpenID Connect key per http://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthResponse
    'id_token'
  ];
  var expiresAtEvent = null;
  var refreshTokenUri = null;

  /**
   * Returns the access token.
   */
  service.get = function(){
    return this.token;
  };

  /**
   * Sets and returns the access token. It tries (in order) the following strategies:
   * - takes the token from the fragment URI
   * - takes the token from the sessionStorage
   */
  service.set = function(scope) {
    refreshTokenUri = scope.site + scope.tokenPath;
    if ($location.search().code) {
      return this.setTokenFromCode($location.search(), scope);
    } else {
      this.setTokenFromString($location.hash());
    }

    //If hash is present in URL always use it, cuz its coming from oAuth2 provider redirect
    if(null === service.token){
      setTokenFromSession();
    }
    
    var deferred = $q.defer();
    
    if (this.token) {
      deferred.resolve(this.token);
    } else {
      deferred.reject();
    }
    
    return deferred.promise;
  };

  /**
   * Delete the access token and remove the session.
   * @returns {null}
   */
  service.destroy = function(){
    Storage.delete('token');
    this.token = null;
    return this.token;
  };

  /**
   * Tells if the access token is expired.
   */
  service.expired = function(){
    return (this.token && this.token.expires_at && new Date(this.token.expires_at) < new Date());
  };
  
  service.setTokenFromCode = function (search, scope) {
    return $http({
      method: "POST",
      url: scope.site + scope.tokenPath,
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      transformRequest: function(obj) {
          var str = [];
          for(var p in obj)
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
          return str.join("&");
      },
      data: {grant_type: "authorization_code", code: search.code, redirect_uri: scope.redirectUri, client_id: scope.clientId}
    }).then(function (result) {
      setToken(result.data);
      $rootScope.$broadcast('oauth:login', service.token);
      $location.url($location.path());
    });
  }

  /**
   * Get the access token from a string and save it
   * @param hash
   */
  service.setTokenFromString = function(hash){
    var params = getTokenFromString(hash);

    if(params){
      removeFragment();
      setToken(params);
      // We have to save it again to make sure expires_at is set
      //  and the expiry event is set up properly
      setToken(this.token);
      $rootScope.$broadcast('oauth:login', service.token);
    }
  };

   /**
    * updates the expiration of the token
    */
  service.updateExpiry = function(newExpiresIn){
    this.token.expires_in = newExpiresIn;
    setExpiresAt();
  };

  /* * * * * * * * * *
   * PRIVATE METHODS *
   * * * * * * * * * */

  /**
   * Set the access token from the sessionStorage.
   */
  var setTokenFromSession = function(){
    var params = Storage.get('token');
    if (params) {
      setToken(params);
      $rootScope.$broadcast('oauth:login', params);
    }
  };

  /**
   * Set the access token.
   *
   * @param params
   * @returns {*|{}}
   */
  var setToken = function(params){
    service.token = service.token || {};      // init the token
    angular.extend(service.token, params);      // set the access token params
    setTokenInSession();                // save the token into the session
    setExpiresAt();
    setExpiresAtEvent();                // event to fire when the token expires

    return service.token;
  };

  /**
   * Parse the fragment URI and return an object
   * @param hash
   * @returns {{}}
   */
  var getTokenFromString = function(hash){
    var params = {},
        regex = /([^&=]+)=([^&]*)/g,
        m;

    while ((m = regex.exec(hash)) !== null) {
      params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }

    // OpenID Connect
    if (params.id_token && !params.error) {
      IdToken.validateTokensAndPopulateClaims(params);
      return params;
    }

    // Oauth2
    if(params.access_token || params.error){
      return params;
    }
  };

  /**
   * Save the access token into the session
   */
  var setTokenInSession = function(){
    Storage.set('token', service.token);
  };

  /**
   * Set the access token expiration date (useful for refresh logics)
   */
  var setExpiresAt = function(){
    if (!service.token) {
      return;
    }
    if(typeof(service.token.expires_in) !== 'undefined' && service.token.expires_in !== null) {
      var expires_at = new Date();
      expires_at.setSeconds(expires_at.getSeconds() + parseInt(service.token.expires_in)-60); // 60 seconds less to secure browser and response latency
      service.token.expires_at = expires_at;
    }
    else {
      service.token.expires_at = null;
    }
  };


  /**
   * Set the timeout at which the expired event is fired
   */
  var setExpiresAtEvent = function(){
    // Don't bother if there's no expires token
    if (typeof(service.token.expires_at) === 'undefined' || service.token.expires_at === null) {
      return;
    }
    cancelExpiresAtEvent();
    var time = (new Date(service.token.expires_at))-(new Date());
    if(time && time > 0 && time <= 2147483647) {
      if (service.token.refresh_token) {
        expiresAtEvent = $interval(function() {
          $http({
            method: "POST",
            url: refreshTokenUri,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            transformRequest: function(obj) {
                var str = [];
                for(var p in obj)
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: {grant_type: "refresh_token", refresh_token: service.token.refresh_token}
          }).then(function (result) {
            setToken(result.data);
            $rootScope.$broadcast('oauth:login', service.token);
          }, function () {
            $rootScope.$broadcast('oauth:expired', service.token);
          });
        }, time);
      } else {
        expiresAtEvent = $interval(function() {
          $rootScope.$broadcast('oauth:expired', service.token);
        }, time, 1);
      }
    }
  };

  var cancelExpiresAtEvent = function() {
    if(expiresAtEvent && !service.token.refresh_token) {
      $timeout.cancel(expiresAtEvent);
      expiresAtEvent = undefined;
    }
  };

  /**
   * Remove the oAuth2 pieces from the hash fragment
   */
  var removeFragment = function(){
    var curHash = $location.hash();
    angular.forEach(hashFragmentKeys,function(hashKey){
      var re = new RegExp('&'+hashKey+'(=[^&]*)?|^'+hashKey+'(=[^&]*)?&?');
      curHash = curHash.replace(re,'');
    });

    $location.hash(curHash);
  };

  return service;

}]);
