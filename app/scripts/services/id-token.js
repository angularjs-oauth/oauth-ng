'use strict';

var idTokenService = angular.module('oauth.idToken', []);

idTokenService.factory('IdToken', ['Storage', function(Storage) {

  var service = {
    issuer: null,
    clientId: null,
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
      this.populateIdTokenClaims(params.id_token, params);
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
   * Populate id token claims to map for future use
   * @param idToken The id_token
   * @param params  The target object for storing the claims
   */
  service.populateIdTokenClaims = function(idToken, params) {
    params.id_token_claims = getIdTokenPayload(idToken);
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
        throw new OidcException('Json Wek Key ID not match');
      }
      //TODO: Support for "jku" (JWK Set URL), "x5u" (X.509 URL), "x5c" (X.509 Certificate Chain) parameter to get key
    } else {
      //Use configured public key
      matchedPubKey = this.pubKey;
      if (typeof matchedPubKey !== 'string') {
        throw new OidcException('Unsupported public key format, expecting PEM format');
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

    if(idtoken) {
      var idtParts = getIdTokenParts(idtoken);
      var payload = getJsonObject(idtParts[1]);
      if(payload) {
        var now =  new Date() / 1000;
        if( payload['iat'] >  now )
          throw new OidcException('ID Token issued time is later than current time');

        if(payload['exp'] < now )
          throw new OidcException('ID Token expired');

        var audience = null;
        if(payload['aud']) {
          if(payload['aud'] instanceof Array) {
            audience = payload['aud'][0];
          } else
            audience = payload['aud'];
        }
        if(audience && audience != this.clientId)
          throw new OidcException('invalid audience');

        if(payload['iss'] != this.issuer)
          throw new OidcException('invalid issuer ' + payload['iss'] + ' != ' + this.issuer);

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
