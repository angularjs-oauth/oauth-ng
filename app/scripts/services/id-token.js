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
