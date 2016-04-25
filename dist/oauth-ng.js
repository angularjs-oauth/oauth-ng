/* oauth-ng - v0.4.10 - 2016-04-25 */

'use strict';

// App libraries
angular.module('oauth', [
  'oauth.directive',      // login directive
  'oauth.idToken',        // id token service (only for OpenID Connect)
  'oauth.oidcConfig',     // for loading OIDC configuration from .well-known/openid-configuration endpoint
  'oauth.accessToken',    // access token service
  'oauth.endpoint',       // oauth endpoint service
  'oauth.profile',        // profile model
  'oauth.storage',        // storage
  'oauth.interceptor',     // bearer token interceptor
  'oauth.configuration'   // token appender
])
  .config(['$locationProvider','$httpProvider',
  function($locationProvider, $httpProvider) {
    $httpProvider.interceptors.push('ExpiredInterceptor');
  }]);

'use strict';

var idTokenService = angular.module('oauth.idToken', []);

idTokenService.factory('IdToken', ['Storage', function(Storage) {

  var service = {
    issuer: null,
    subject: null,
    //clientId, should match 'aud' claim
    clientId: null,
    /*
      The public key to verify the signature, supports:
      1.RSA public key in PEM string: e.g. "-----BEGIN PUBLIC KEY..."
      2.X509 certificate in PEM string: e.g. "-----BEGIN CERTIFICATE..."
      3.JWK (Json Web Key): e.g. {kty: "RSA", n: "0vx7...", e: "AQAB"}

      If not set, the id_token header should carry the key or the url to retrieve the key
     */
    pubKey: null
  };
  /**
   * OidcException
   * @param {string } message  - The exception error message
   * @constructor
   */
  function OidcException(message) {
    this.name = 'OidcException';
    this.message = message;
  }
  OidcException.prototype = new Error();
  OidcException.prototype.constructor = OidcException;

  /**
   * For initialization
   * @param scope
   */
  service.set = function(scope) {
    this.issuer = scope.issuer;
    this.subject = scope.subject;
    this.clientId = scope.clientId;
    this.pubKey = scope.pubKey;
  };

  /**
   * Validate id_token and access_token(if there's one)
   * If validation passes, the id_token payload(claims) will be populated to 'params'
   * Otherwise error will set to 'params' and tokens will be removed
   *
   * @param params
   */
  service.validateTokensAndPopulateClaims = function(params) {
    var valid = false;
    var message = '';
    try {
      valid = this.validateIdToken(params.id_token);
      /*
       if response_type is 'id_token token', then we will get both id_token and access_token,
       access_token needs to be validated as well
       */
      if (valid && params.access_token) {
        valid = this.validateAccessToken(params.id_token, params.access_token);
      }
    } catch (error) {
      message = error.message;
    }

    if (valid) {
      params.id_token_claims = getIdTokenPayload(params.id_token);
    } else {
      params.id_token = null;
      params.access_token = null;
      params.error = 'Failed to validate token:' + message;
    }
  };


  /**
   * Validates the id_token
   * @param {String} idToken The id_token
   * @returns {boolean} True if all the check passes, False otherwise
   */
  service.validateIdToken = function(idToken) {
    return this.verifyIdTokenSig(idToken) && this.verifyIdTokenInfo(idToken);
  };

  /**
   * Validate access_token based on the 'alg' and 'at_hash' value of the id_token header
   * per spec: http://openid.net/specs/openid-connect-core-1_0.html#ImplicitTokenValidation
   *
   * @param idToken The id_token
   * @param accessToken The access_token
   * @returns {boolean} true if validation passes
   */
  service.validateAccessToken = function(idToken, accessToken) {
    var header = getJsonObject(getIdTokenParts(idToken)[0]);
    if (header.at_hash) {
      var shalevel = header.alg.substr(2);
      if (shalevel !== '256' && shalevel !== '384' && shalevel !== '512') {
        throw new OidcException('Unsupported hash algorithm, expecting sha256, sha384, or sha512');
      }
      var md = new KJUR.crypto.MessageDigest({'alg':'sha'+ shalevel, 'prov':'cryptojs'});
      //hex representation of the hash
      var hexStr = md.digestString(accessToken);
      //take first 128bits and base64url encoding it
      var expected = hextob64u(hexStr.substring(0, 32));

      return expected === header.at_hash;
    } else {
      return true;
    }
  };

  /**
   * Verifies the ID Token signature using the specified public key
   * The id_token header can optionally carry public key or the url to retrieve the public key
   * Otherwise will use the public key configured using 'pubKey'
   *
   * Supports only RSA signatures ['RS256', 'RS384', 'RS512']
   * @param {string}idToken      The ID Token string
   * @returns {boolean}          Indicates whether the signature is valid or not
   * @throws {OidcException}
   */
  service.verifyIdTokenSig = function (idToken) {

    var idtParts = getIdTokenParts(idToken);
    var header = getJsonObject(idtParts[0]);

    if(!header.alg || header.alg.substr(0, 2) !== 'RS') {
      throw new OidcException('Unsupported JWS signature algorithm ' + header.alg);
    }

    var matchedPubKey = null;

    if (header.jwk) {
      //Take the JWK if it comes with the id_token
      matchedPubKey = header.jwk;
      if (matchedPubKey.kid && header.kid && matchedPubKey.kid !== header.kid) {
        throw new OidcException('Json Web Key ID not match');
      }
      /*
       TODO: Support for "jku" (JWK Set URL), "x5u" (X.509 URL), "x5c" (X.509 Certificate Chain) parameter to get key
       per http://tools.ietf.org/html/draft-ietf-jose-json-web-signature-26#page-9
       */
    } else {
      //Try to load the key from .well-known configuration
      var oidcConfig = Storage.get('oidcConfig');
      if (angular.isDefined(oidcConfig) && oidcConfig.jwks && oidcConfig.jwks.keys) {
        oidcConfig.jwks.keys.forEach(function(key) {
          if (key.kid === header.kid) {
            matchedPubKey = key;
          }
        });
      } else {
        //Use configured public key
        var jwk = getJsonObject(this.pubKey);
        matchedPubKey = jwk ? jwk : this.pubKey; //JWK or PEM
      }
    }

    if(!matchedPubKey) {
      throw new OidcException('No public key found to verify signature');
    }

    return rsaVerifyJWS(idToken, matchedPubKey, header.alg);
  };

  /**
   * Validates the information in the ID Token against configuration
   * @param {string} idtoken      The ID Token string
   * @returns {boolean}           Validity of the ID Token
   * @throws {OidcException}
   */
  service.verifyIdTokenInfo = function(idtoken) {
    var valid = false;

    if (idtoken) {
      var idtParts = getIdTokenParts(idtoken);
      var payload = getJsonObject(idtParts[1]);
      if (payload) {
        var now =  new Date() / 1000;
        if (payload.iat > now + 60)
          throw new OidcException('ID Token issued time is later than current time');

        if (payload.exp < now )
          throw new OidcException('ID Token expired');

        if (now < payload.ntb)
          throw new OidcException('ID Token is invalid before '+ payload.ntb);

        if (payload.iss && this.issuer && payload.iss !== this.issuer)
          throw new OidcException('Invalid issuer ' + payload.iss + ' != ' + this.issuer);

        if (payload.sub && this.subject && payload.sub !== this.subject)
          throw new OidcException('Invalid subject ' + payload.sub + ' != ' + this.subject);

        if (payload.aud) {
          if (payload.aud instanceof Array && !KJUR.jws.JWS.inArray(this.clientId, payload.aud)) {
            throw new OidcException('Client not in intended audience:' + payload.aud);
          }
          if (typeof payload.aud === 'string' && payload.aud !== this.clientId) {
            throw new OidcException('Invalid audience ' + payload.aud + ' != ' + this.clientId);
          }
        }

        //TODO: nonce support ? probably need to redo current nonce support
        //if(payload['nonce'] != sessionStorage['nonce'])
        //  throw new OidcException('invalid nonce');
        valid = true;
      } else
        throw new OidcException('Unable to parse JWS payload');
    }
    return valid;
  };

  /**
   * Verifies the JWS string using the JWK
   * @param {string} jws      The JWS string
   * @param {object} pubKey   The public key that will be used to verify the signature
   * @param {string} alg      The algorithm string. Expecting 'RS256', 'RS384', or 'RS512'
   * @returns {boolean}       Validity of the JWS signature
   * @throws {OidcException}
   */
  var rsaVerifyJWS = function (jws, pubKey, alg) {
    /*
      convert various public key format to RSAKey object
      see @KEYUTIL.getKey for a full list of supported input format
     */
    var rsaKey = KEYUTIL.getKey(pubKey);

    return KJUR.jws.JWS.verify(jws, rsaKey, [alg]);
  };

  /**
   * Splits the ID Token string into the individual JWS parts
   * @param  {string} id_token  ID Token
   * @returns {Array} An array of the JWS compact serialization components (header, payload, signature)
   */
  var getIdTokenParts = function (id_token) {
    var jws = new KJUR.jws.JWS();
    jws.parseJWS(id_token);
    return [jws.parsedJWS.headS, jws.parsedJWS.payloadS, jws.parsedJWS.si];
  };

  /**
   * Get the contents of the ID Token payload as an JSON object
   * @param {string} id_token     ID Token
   * @returns {object}            The ID Token payload JSON object
   */
  var getIdTokenPayload = function (id_token) {
    var parts = getIdTokenParts(id_token);
    if(parts)
      return getJsonObject(parts[1]);
  };

  /**
   * Get the JSON object from the JSON string
   * @param {string} jsonS    JSON string
   * @returns {object|null}   JSON object or null
   */
  var getJsonObject = function (jsonS) {
    var jws = KJUR.jws.JWS;
    if(jws.isSafeJSONString(jsonS)) {
      return jws.readSafeJSONString(jsonS);
    }
    return null;
  };

  return service;

}]);

(function() {
  'use strict';

  angular.module('oauth.oidcConfig', [])
    .factory('OidcConfig', ['Storage', '$http', '$q', '$log', OidcConfig]);

  function OidcConfig(Storage, $http, $q, $log) {
    var cache = null;
    return {
      load: load
    };

    function load(scope) {
      if (scope.issuer && scope.wellKnown && scope.wellKnown !== "false") {
        var promise = loadConfig(scope.issuer);
        if (scope.wellKnown === "sync") {
          return promise;
        }
      }
      return $q.when(1);
    }

    function loadConfig(iss) {
      if (cache === null) {
        cache = Storage.get('oidcConfig');
      }
      if (angular.isDefined(cache)) {
        return $q.when(cache);
      } else {
        return loadOpenidConfiguration(iss)
                .then(saveCache)
                .then(loadJwks)
                .then(saveCache, errorLogger);
      }
    }

    function errorLogger(err) {
      $log.error("Could not load OIDC config:", err);
      return $q.reject(err);
    }

    function saveCache(o) {
      Storage.set('oidcConfig', cache);
      return o;
    }

    function joinPath(x,y) {
      return x + (x.charAt(x.length - 1) === '/' ? '' : '/') + y;
    }

    function loadOpenidConfiguration(iss) {
      var configUri = joinPath(iss, ".well-known/openid-configuration");
      return $http.get(configUri).then(function(res) {
        return cache = res.data;
      }, function(err) {
        return $q.reject("Could not get config info from " + configUri + ' . Check the availability of this url.');
      });
    }

    function loadJwks(oidcConf) {
      if (oidcConf.jwks_uri) {
        return $http.get(oidcConf.jwks_uri).then(function(res) {
          return oidcConf.jwks = res.data;
        });
      } else {
        return $q.reject("No jwks_uri found.");
      }
    }
  }
})();

'use strict';

var accessTokenService = angular.module('oauth.accessToken', []);

accessTokenService.factory('AccessToken', ['Storage', '$rootScope', '$location', '$interval', '$timeout', 'IdToken', function(Storage, $rootScope, $location, $interval, $timeout, IdToken){

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
  service.set = function(){
    this.setTokenFromString($location.hash());

    //If hash is present in URL always use it, cuz its coming from oAuth2 provider redirect
    if(null === service.token){
      setTokenFromSession();
    }

    return this.token;
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

  /**
   * Get the access token from a string and save it
   * @param hash
   */
  service.setTokenFromString = function(hash){
    var params = getTokenFromString(hash);

    if(params){
      removeFragment();
      setToken(params);
      setExpiresAt();
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
    if(time && time > 0 && time <= 2147483647){
      expiresAtEvent = $interval(function(){
        $rootScope.$broadcast('oauth:expired', service.token);
      }, time, 1);
    }
  };

  var cancelExpiresAtEvent = function() {
    if(expiresAtEvent) {
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

'use strict';

var endpointClient = angular.module('oauth.endpoint', []);

endpointClient.factory('Endpoint', ['$rootScope', 'AccessToken', '$q', '$http', function($rootScope, AccessToken, $q, $http) {

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
}]);

'use strict';

var profileClient = angular.module('oauth.profile', []);

profileClient.factory('Profile', ['$http', 'AccessToken', '$rootScope', function($http, AccessToken, $rootScope) {
  var service = {};
  var profile;

  service.find = function(uri) {
    var promise = $http.get(uri, { headers: headers() });
    promise.success(function(response) {
        profile = response;
        $rootScope.$broadcast('oauth:profile', profile);
      });
    return promise;
  };

  service.get = function() {
    return profile;
  };

  service.set = function(resource) {
    profile = resource;
    return profile;
  };

  var headers = function() {
    return { Authorization: 'Bearer ' + AccessToken.get().access_token };
  };

  return service;
}]);

'use strict';

var storageService = angular.module('oauth.storage', ['ngStorage']);

storageService.factory('Storage', ['$rootScope', '$sessionStorage', '$localStorage', function($rootScope, $sessionStorage, $localStorage){

  var service = {
    storage: $sessionStorage // By default
  };

  /**
   * Deletes the item from storage,
   * Returns the item's previous value
   */
  service.delete = function (name) {
    var stored = this.get(name);
    delete this.storage[name];
    return stored;
  };

  /**
   * Returns the item from storage
   */
  service.get = function (name) {
    return this.storage[name];
  };

  /**
   * Sets the item in storage to the value specified
   * Returns the item's value
   */
  service.set = function (name, value) {
    this.storage[name] = value;
    return this.get(name);
  };

  /**
   * Change the storage service being used
   */
  service.use = function (storage) {
    if (storage === 'sessionStorage') {
      this.storage = $sessionStorage;
    } else if (storage === 'localStorage') {
      this.storage = $localStorage;
    }
  };

  return service;
}]);
'use strict';

var oauthConfigurationService = angular.module('oauth.configuration', []);

oauthConfigurationService.provider('OAuthConfiguration', function() {
	var _config = {};
	
	this.init = function(config, httpProvider) {
		_config.protectedResources = config.protectedResources || [];
		httpProvider.interceptors.push('AuthInterceptor');
	};
	
	this.$get = function() {
		return {
			getConfig: function() {
				return _config;
			}
		};
	};
})
.factory('AuthInterceptor', ['OAuthConfiguration', 'AccessToken', function(OAuthConfiguration, AccessToken) {
	return {
		'request': function(config) {
			OAuthConfiguration.getConfig().protectedResources.forEach(function(resource) {
				// If the url is one of the protected resources, we want to see if there's a token and then
				// add the token if it exists.
				if (config.url.indexOf(resource) > -1) {
					var token = AccessToken.get();
					if (token) {
						config.headers.Authorization = 'Bearer ' + token.access_token;
					}
				}
			});
			
			return config;
		}
	};
}]);
'use strict';

var interceptorService = angular.module('oauth.interceptor', []);

interceptorService.factory('ExpiredInterceptor', ['Storage', '$rootScope', function (Storage, $rootScope) {

  var service = {};

  service.request = function(config) {
    var token = Storage.get('token');

    if (token && expired(token)) {
      $rootScope.$broadcast('oauth:expired', token);
    }

    return config;
  };

  var expired = function(token) {
    return (token && token.expires_at && new Date(token.expires_at) < new Date());
  };

  return service;
}]);

'use strict';

var directives = angular.module('oauth.directive', []);

directives.directive('oauth', [
  'IdToken',
  'AccessToken',
  'Endpoint',
  'Profile',
  'Storage',
  'OidcConfig',
  '$location',
  '$rootScope',
  '$compile',
  '$http',
  '$templateCache',
  '$timeout',
  function(IdToken, AccessToken, Endpoint, Profile, Storage, OidcConfig, $location, $rootScope, $compile, $http, $templateCache, $timeout) {

    var definition = {
      restrict: 'AE',
      replace: true,
      scope: {
        site: '@',          // (required) set the oauth server host (e.g. http://oauth.example.com)
        clientId: '@',      // (required) client id
        redirectUri: '@',   // (required) client redirect uri
        responseType: '@',  // (optional) response type, defaults to token (use 'token' for implicit flow and 'code' for authorization code flow
        scope: '@',         // (optional) scope
        profileUri: '@',    // (optional) user profile uri (e.g http://example.com/me)
        template: '@',      // (optional) template to render (e.g bower_components/oauth-ng/dist/views/templates/default.html)
        text: '@',          // (optional) login text
        authorizePath: '@', // (optional) authorization url
        state: '@',         // (optional) An arbitrary unique string created by your app to guard against Cross-site Request Forgery
        storage: '@',        // (optional) Store token in 'sessionStorage' or 'localStorage', defaults to 'sessionStorage'
        nonce: '@',          // (optional) Send nonce on auth request
                             // OpenID Connect extras, more details in id-token.js:
        issuer: '@',         // (optional for OpenID Connect) issuer of the id_token, should match the 'iss' claim in id_token payload
        subject: '@',        // (optional for OpenID Connect) subject of the id_token, should match the 'sub' claim in id_token payload
        pubKey: '@',          // (optional for OpenID Connect) the public key(RSA public key or X509 certificate in PEM format) to verify the signature
        wellKnown: '@',       // (optional for OpenID Connect) whether to load public key according to .well-known/openid-configuration endpoint
        logoutPath: '@',    // (optional) A url to go to at logout
        sessionPath: '@'    // (optional) A url to use to check the validity of the current token.
      }
    };

    definition.link = function postLink(scope, element) {
      scope.show = 'none';

      scope.$watch('clientId', function() {
        init();
      });

      var init = function() {
        initAttributes();          // sets defaults
        Storage.use(scope.storage);// set storage
        compile();                 // compiles the desired layout
        Endpoint.set(scope);       // sets the oauth authorization url
        OidcConfig.load(scope)     // loads OIDC configuration from .well-known/openid-configuration if necessary
          .then(function() {
            IdToken.set(scope);
            AccessToken.set(scope);    // sets the access token object (if existing, from fragment or session)
            initProfile(scope);        // gets the profile resource (if existing the access token)
            initView();                // sets the view (logged in or out)
            checkValidity();           // ensure the validity of the current token
          });
      };

      var initAttributes = function() {
        scope.authorizePath = scope.authorizePath || '/oauth/authorize';
        scope.tokenPath     = scope.tokenPath     || '/oauth/token';
        scope.template      = scope.template      || 'bower_components/oauth-ng/dist/views/templates/default.html';
        scope.responseType  = scope.responseType  || 'token';
        scope.text          = scope.text          || 'Sign In';
        scope.state         = scope.state         || undefined;
        scope.scope         = scope.scope         || undefined;
        scope.storage       = scope.storage       || 'sessionStorage';
      };

      var compile = function() {
        $http.get(scope.template, { cache: $templateCache }).success(function(html) {
          element.html(html);
          $compile(element.contents())(scope);
        });
      };

      var initProfile = function(scope) {
        var token = AccessToken.get();

        if (token && token.access_token && scope.profileUri) {
          Profile.find(scope.profileUri).success(function(response) {
            scope.profile = response;
          });
        }
      };

      var initView = function () {
        var token = AccessToken.get();

        if (!token) {
          return scope.logout();
        }  // without access token it's logged out
        if (AccessToken.expired()) {
          return expired();
        }  // with a token, but it's expired
        if (token.access_token) {
          return authorized();
        }  // if there is the access token we are done
        if (token.error) {
          return denied();
        }  // if the request has been denied we fire the denied event
      };

      scope.login = function () {
        Endpoint.redirect();
      };

      scope.logout = function () {
        Endpoint.logout();
        $rootScope.$broadcast('oauth:loggedOut');
        scope.show = 'logged-out';
      };

      scope.$on('oauth:expired',expired);

      // user is authorized
      var authorized = function() {
        $rootScope.$broadcast('oauth:authorized', AccessToken.get());
        scope.show = 'logged-in';
      };

      var expired = function() {
        $rootScope.$broadcast('oauth:expired');
        scope.logout();
      };

      // set the oauth directive to the denied status
      var denied = function() {
        scope.show = 'denied';
        $rootScope.$broadcast('oauth:denied');
      };

      var checkValidity = function() {
        Endpoint.checkValidity().then(function() {
          $rootScope.$broadcast('oauth:valid');
        }).catch(function(message){
          $rootScope.$broadcast('oauth:invalid', message);
        });
      };

      var refreshDirective = function () {
        scope.$apply();
      };

      // Updates the template at runtime
      scope.$on('oauth:template:update', function(event, template) {
        scope.template = template;
        compile(scope);
      });

      // Hack to update the directive content on logout
      scope.$on('$routeChangeSuccess', function () {
        $timeout(refreshDirective);
      });

      scope.$on('$stateChangeSuccess', function () {
        $timeout(refreshDirective);
      });
    };

    return definition;
  }
]);
