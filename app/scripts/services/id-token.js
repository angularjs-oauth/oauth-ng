'use strict';

var accessTokenService = angular.module('oauth.idToken', []);

accessTokenService.factory('IdToken', ['Storage', function(Storage){

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
     * Verifies the ID Token signature using the JWK Keyset from jwks
     * Supports only RSA signatures ['RS256', 'RS384', 'RS512']
     * @param {string}idtoken      The ID Token string
     * @returns {boolean}          Indicates whether the signature is valid or not
     * @throws {OidcException}
     */
    service.verifyIdTokenSig = function (idtoken) {
      var verified = false;

      if(!this.jwks) {
        throw new OidcException('jwks(Json Web Keys) parameter not set');
      }

      var idtParts = getIdTokenParts(idtoken);
      var header = getJsonObject(idtParts[0]);
      var jwks = null;

      if(typeof this.jwks === 'string')
        jwks = getJsonObject(this.jwks);
      else if(typeof this.jwks === 'object')
        jwks = this.jwks;

      if(header.alg && header.alg.substr(0, 2) == 'RS') {
        var matchedPubKey = null;
        if (jwks.keys) {
          if (jwks.keys.length == 1) {
            matchedPubKey = jwks.keys[0];
          } else {
            matchedPubKey = getMatchedKey(jwks.keys, 'RSA', 'sig', header.kid);
          }
        }
        if (!matchedPubKey) {
          throw new OidcException('No matching JWK found');
        } else {
          verified = rsaVerifyJWS(idtoken, matchedPubKey, header.alg);
        }
      } else
        throw new OidcException('Unsupported JWS signature algorithm ' + header.alg);

      return verified;
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
     * @param {object} jwk      The JWK Key that will be used to verify the signature
     * @param {string} alg      The algorithm string. Expecting 'RS256', 'RS384', or 'RS512'
     * @returns {boolean}       Validity of the JWS signature
     * @throws {OidcException}
     */
    var rsaVerifyJWS = function (jws, jwk, alg) {
      if(jws && typeof jwk === 'object') {
        console.log("verifying token with algorithm ["+alg+"]");
        return KJUR.jws.JWS.verify(jws, jwk, [alg]);
      }
      return false;
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

    /**
     * Retrieve the JWK key that matches the input criteria
     * @param {array} keys               JWK Keyset
     * @param {string} kty               The 'kty' to match (RSA|EC). Only RSA is supported.
     * @param {string} use               The 'use' to match (sig|enc).
     * @param {string} kid               The 'kid' to match
     * @returns {object} jwk             The matched JWK
     */
    var getMatchedKey = function (keys, kty, use, kid) {
      var foundKeys = [];

      if (typeof keys === 'object' && keys.length > 0) {
        for (var i = 0; i < keys.length; i++) {
          if (keys[i]['kty'] == kty)
            foundKeys.push(keys[i]);
        }

        if (foundKeys.length == 0)
          return null;

        if (use) {
          var temp = [];
          for (var j = 0; j < foundKeys.length; j++) {
            if (!foundKeys[j]['use'])
              temp.push(foundKeys[j]);
            else if (foundKeys[j]['use'] == use)
              temp.push(foundKeys[j]);
          }
          foundKeys = temp;
        }
        if (foundKeys.length == 0)
          return null;

        if (kid) {
          temp = [];
          for (var k = 0; k < foundKeys.length; k++) {
            if (foundKeys[k]['kid'] == kid)
              temp.push(foundKeys[k]);
          }
          foundKeys = temp;
        }
        if (foundKeys.length == 0)
          return null;
        else
          return foundKeys[0];
      } else {
        return null;
      }

    };



    return service;

}]);
