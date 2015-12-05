/* oauth-ng - v0.4.4 - 2015-12-04 */

'use strict';

// App libraries
angular.module('oauth', [
  'oauth.directive',      // login directive
  'oauth.idToken',        // id token service (only for OpenID Connect)
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

var accessTokenService = angular.module('oauth.idToken', []);

accessTokenService.factory('IdToken', ['Storage', '$rootScope', '$location',
  function(Storage, $rootScope, $location){

    var service = {
      issuer: null,
      clientId: null,
      jwks: null
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
      this.clientId = scope.clientId;
      this.jwks = scope.jwks;
    };

    /**
     * Validates the id_token
     * @param {String} idToken The id_token
     * @returns {boolean} True if all the check passes, False otherwise
     */
    service.validateIdToken = function(idToken) {
      return verifyIdTokenSig(idToken) && verifyIdTokenInfo(idToken);
    };

    /**
     * Verifies the ID Token signature using the JWK Keyset from jwks
     * Supports only RSA signatures
     * @param {string}idtoken      The ID Token string
     * @returns {boolean}          Indicates whether the signature is valid or not
     * @throws {OidcException}
     */
    var verifyIdTokenSig = function (idtoken) {
      var verified = false;

      if(!service.jwks) {
        throw new OidcException('jwks(Json Web Keys) parameter not set');
      }

      var idtParts = getIdTokenParts(idtoken);
      var header = getJsonObject(idtParts[0]);
      var jwks = service.jwks.keys;

      if(header['alg'] && header['alg'].substr(0, 2) == 'RS') {
        //TODO: choose key ?
        //var jwk = jwk_get_key(jwks, 'RSA', 'sig', header['kid']);
        verified = rsaVerifyJWS(idtoken, jwks[0]);
        //if(!jwk)
        //  new OidcException('No matching JWK found');
        //else {
        //  console.log("-----4------");
        //  verified = rsaVerifyJWS(idtoken, jwk[0]);
        //}
      } else
        throw new OidcException('Unsupported JWS signature algorithm ' + header['alg']);

      return verified;
    };

    /**
     * Validates the information in the ID Token against configuration
     * @param {string} idtoken      The ID Token string
     * @returns {boolean}           Validity of the ID Token
     * @throws {OidcException}
     */
    var verifyIdTokenInfo = function(idtoken) {
      var valid = false;

      if(idtoken) {
        var idtParts = getIdTokenParts(idtoken);
        var payload = getJsonObject(idtParts[1]);
        if(payload) {
          var now =  new Date() / 1000;
          if( payload['iat'] >  now + 60)
            throw new OidcException('ID Token issued time is later than current time');

          if(payload['exp'] < now - 60)
            throw new OidcException('ID Token expired');

          var audience = null;
          if(payload['aud']) {
            if(payload['aud'] instanceof Array) {
              audience = payload['aud'][0];
            } else
              audience = payload['aud'];
          }
          if(audience && audience != service.clientId)
            throw new OidcException('invalid audience');

          if(payload['iss'] != service.issuer)
            throw new OidcException('invalid issuer ' + payload['iss'] + ' != ' + service.clientId);

          //TODO: nonce support
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
     * @param {object} jwk      The JWK Key that will be used to verify the signature
     * @returns {boolean}       Validity of the JWS signature
     * @throws {OidcException}
     */
    var rsaVerifyJWS = function (jws, jwk) {
      if(jws && typeof jwk === 'object') {
        return KJUR.jws.JWS.verify(jws, jwk, ['RS256']);
        //if(jwk['kty'] == 'RSA') {
        //  var verifier = new KJUR.jws.JWS();
        //  if(jwk['n'] && jwk['e']) {
        //    var keyN = b64utohex(jwk['n']);
        //    var keyE = b64utohex(jwk['e']);
        //    return verifier.verifyJWSByNE(jws, keyN, keyE);
        //  } else if (jwk['x5c']) {
        //    return verifier.verifyJWSByPemX509Cert(jws, "-----BEGIN CERTIFICATE-----\n" + jwk['x5c'][0] + "\n-----END CERTIFICATE-----\n");
        //  }
        //} else {
        //  throw new OidcException('No RSA kty in JWK');
        //}
      }
      return false;
    };

    /**
     * Splits the ID Token string into the individual JWS parts
     * @param  {string} id_token    - ID Token
     * @returns {Array} An array of the JWS compact serialization components (header, payload, signature)
     */
    var getIdTokenParts = function (id_token) {
      var jws = new KJUR.jws.JWS();
      jws.parseJWS(id_token);
      return [jws.parsedJWS.headS, jws.parsedJWS.payloadS, jws.parsedJWS.si];
    };

    /**
     * Get the contents of the ID Token payload as an JSON object
     * @param {string} id_token     - ID Token
     * @returns {object}            - The ID Token payload JSON object
     */
    var getIdTokenPayload = function (id_token) {
      var parts = getIdTokenParts(id_token);
      if(parts)
        return getJsonObject(parts[1]);
    };

    /**
     * Get the JSON object from the JSON string
     * @param {string} jsonS    - JSON string
     * @returns {object|null}   JSON object or null
     */
    var getJsonObject = function (jsonS) {
      var jws = KJUR.jws.JWS;
      if(jws.isSafeJSONString(jsonS)) {
        return jws.readSafeJSONString(jsonS);
      }
      return null;
    };

    /**
     * Retrieve the JWK key that matches the input criteria
     * @param {string|object} jwkIn     - JWK Keyset string or object
     * @param {string} kty              - The 'kty' to match (RSA|EC). Only RSA is supported.
     * @param {string}use               - The 'use' to match (sig|enc).
     * @param {string}kid               - The 'kid' to match
     * @returns {array}                 Array of JWK keys that match the specified criteria                                                                     itera
     */
    var jwk_get_key = function(jwkIn, kty, use, kid )
    {
      var jwk = null;
      var foundKeys = [];

      if(jwkIn) {
        if(typeof jwkIn === 'string')
          jwk = getJsonObject(jwkIn);
        else if(typeof jwkIn === 'object')
          jwk = jwkIn;

        if(jwk != null) {
          if(typeof jwk['keys'] === 'object') {
            if(jwk.keys.length == 0)
              return null;

            for(var i = 0; i < jwk.keys.length; i++) {
              if(jwk['keys'][i]['kty'] == kty)
                foundKeys.push(jwk.keys[i]);
            }

            if(foundKeys.length == 0)
              return null;

            if(use) {
              var temp = [];
              for(var j = 0; j < foundKeys.length; j++) {
                if(!foundKeys[j]['use'])
                  temp.push(foundKeys[j]);
                else if(foundKeys[j]['use'] == use)
                  temp.push(foundKeys[j]);
              }
              foundKeys = temp;
            }
            if(foundKeys.length == 0)
              return null;

            if(kid) {
              temp = [];
              for(var k = 0; k < foundKeys.length; k++) {
                if(foundKeys[k]['kid'] == kid)
                  temp.push(foundKeys[k]);
              }
              foundKeys = temp;
            }
            if(foundKeys.length == 0)
              return null;
            else
              return foundKeys;
          }
        }
      }
    };



    return service;

}]);

'use strict';

var accessTokenService = angular.module('oauth.accessToken', []);

accessTokenService.factory('AccessToken', ['Storage', '$rootScope', '$location', '$interval', 'IdToken', function(Storage, $rootScope, $location, $interval, IdToken){

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
    if (params.id_token) {
      IdToken.validateIdToken(params.id_token);
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
    var time = (new Date(service.token.expires_at))-(new Date());
    if(time && time > 0){
      $interval(function(){
        $rootScope.$broadcast('oauth:expired', service.token);
      }, time, 1);
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
  '$location',
  '$rootScope',
  '$compile',
  '$http',
  '$templateCache',
  function(IdToken, AccessToken, Endpoint, Profile, Storage, $location, $rootScope, $compile, $http, $templateCache) {

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
                             // OIDC(OpenID Connect) extras:
        issuer: '@',         // (required for OpenID Connect) issuer of the id_token, should match the 'iss' claim in id_token payload
        jwks: '@'            // (required for OpenID Connect) json web key(s), it will be used to verify the id_token signature
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
        IdToken.set(scope);
        AccessToken.set(scope);    // sets the access token object (if existing, from fragment or session)
        initProfile(scope);        // gets the profile resource (if existing the access token)
        initView();                // sets the view (logged in or out)
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

      var initView = function() {
        var token = AccessToken.get();

        if (!token) {
          return loggedOut(); // without access token it's logged out
        }
        if (token.access_token) {
          return authorized(); // if there is the access token we are done
        }
        if (token.error) {
          return denied(); // if the request has been denied we fire the denied event
        }
      };

      scope.login = function() {
        Endpoint.redirect();
      };

      scope.logout = function() {
        AccessToken.destroy(scope);
        $rootScope.$broadcast('oauth:logout');
        loggedOut();
      };

      scope.$on('oauth:expired', function() {
        AccessToken.destroy(scope);
        scope.show = 'logged-out';
      });

      // user is authorized
      var authorized = function() {
        $rootScope.$broadcast('oauth:authorized', AccessToken.get());
        scope.show = 'logged-in';
      };

      // set the oauth directive to the logged-out status
      var loggedOut = function() {
        $rootScope.$broadcast('oauth:loggedOut');
        scope.show = 'logged-out';
      };

      // set the oauth directive to the denied status
      var denied = function() {
        scope.show = 'denied';
        $rootScope.$broadcast('oauth:denied');
      };

      // Updates the template at runtime
      scope.$on('oauth:template:update', function(event, template) {
        scope.template = template;
        compile(scope);
      });

      // Hack to update the directive content on logout
      // TODO think to a cleaner solution
      scope.$on('$routeChangeSuccess', function () {
        init();
      });

      scope.$on('$stateChangeSuccess', function () {
        init();
      });
    };

    return definition;
  }
]);
