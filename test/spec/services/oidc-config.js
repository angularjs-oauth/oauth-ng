describe('IdToken', function() {

  var IdToken, OidcConfig;

  var publicKeyModulus, publicKeyExponent;
  var validIdToken;
  var $httpBackend;

  beforeEach(module('oauth'));

  beforeEach(inject(function ($injector) {
    IdToken = $injector.get('IdToken');
  }));

  beforeEach(function () {
    /**
     * http://kjur.github.io/jsjws/tool_jwt.html generated sample id_token, signed by default private key
     * The public key modulus and exponent are as below. This is the same public key as in id-token.js test.
     */
    publicKeyModulus = '33TqqLR3eeUmDtHS89qF3p4MP7Wfqt2Zjj3lZjLjjCGDvwr9cJNlN' +
                       'DiuKboODgUiT4ZdPWbOiMAfDcDzlOxA04DDnEFGAf-kDQiNSe2Ztq' +
                       'C7bnIc8-KSG_qOGQIVaay4Ucr6ovDkykO5Hxn7OU7sJp9TP9H0JH8' +
                       'zMQA6YzijYH9LsupTerrY3U6zyihVEDXXOv08vBHk50BMFJbE9iwF' +
                       'wnxCsU5-UZUZYw87Uu0n4LPFS9BT8tUIvAfnRXIEWCha3KbFWmdZQ' +
                       'ZlyrFw0buUEf0YN3_Q0auBkdbDR_ES2PbgKTJdkjc_rEeM0TxvOUf' +
                       '7HuUNOhrtAVEN1D5uuxE1WSw';
    publicKeyExponent = 'AQAB';
  });

  beforeEach(inject(function ($injector) {
    OidcConfig = $injector.get('OidcConfig');
    $httpBackend = $injector.get('$httpBackend');
    $httpBackend.when('GET', 'oidc/.well-known/openid-configuration')
                .respond({jwks_uri: "oidc/jwks_uri"});
    $httpBackend.when('GET', 'oidc/jwks_uri')
                .respond({
                  keys: [{
                      kty: 'RSA',
                      n: publicKeyModulus,
                      e: publicKeyExponent,
                      kid: 'rsa1'
                    }
                  ]
                });
  }));


  describe('validate an id_token when pubkey is loaded from .well-known configuration', function() {
    beforeEach(function () {
      /*
        Valid token with RS256, expires at 20251231235959Z UTC
        https://jwt.io has a debugger that can help view the id_token's header and payload

        e.g. The header of following token is { "alg": "RS256", "typ": "JWT", "kid": "rsa1" }
             The body of the following token is:
             {
               "iss": "oidc",
               "sub": "oauth-ng-client",
               "nbf": 1449267385,
               "exp": 1767225599,
               "iat": 1449267385,
               "jti": "id123456",
               "typ": "https://example.com/register"
             }
       */
      validIdToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJzYTEifQ' +
          '.eyJpc3MiOiJvaWRjIiwic3ViIjoib2F1dGgtbmctY2xpZW50IiwibmJmIjoxNDQ5MjY3Mzg1LCJleHAiOjE3NjcyMjU1OTksImlhdCI6MTQ0OTI2NzM4NSwianRpIjoiaWQxMjM0NTYiLCJ0eXAiOiJodHRwczovL2V4YW1wbGUuY29tL3JlZ2lzdGVyIn0' +
          '.J39k8LK_lu7xYvW_eU-MAI3jtgQEdkpJOlx4ZX_WZ3TUyY-9GG0xLUusteDcy3UGIVxangwonaZ7311WKKz9OwjU1ePivMLXayiP2bL6srIUu8PvOOIcf8oPt8HGv-TLb1zPmYPx3XniekKUEnFAxMGedobcX0wg9tZnnkM11T4qQPcTjDhKB9bNlih9yRHR-6OkKZN4Q_by7EJAPJti22L0dTCW81A_9J5OMXoe0k6fScGfc0Wspsc7CpBN9ZAmTUdHGe8IP5L4leM0pOud6M0gzcIhixR1OMm6qj7ZyvJxgZ48h7Fln3CHyz3LGoHBTQWWDf3ufTzl3sGvippc1w';

      var scope = {
        issuer: 'oidc',
        clientId: 'oauth-ng-client',
        wellKnown: 'sync'
      };

      OidcConfig.load(scope).then(function(){
        IdToken.set(scope);
      })
      $httpBackend.flush();
    });

    it('with success', function () {
      expect(IdToken.validateIdToken(validIdToken)).toEqual(true);
    });

  });
});
