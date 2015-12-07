describe('IdToken', function() {

  var Storage, IdToken;

  var publicKeyString, jwk;
  var valid_id_token, expired_id_token;

  beforeEach(module('oauth'));

  beforeEach(inject(function ($injector) {
    Storage = $injector.get('Storage');
  }));
  beforeEach(inject(function ($injector) {
    IdToken = $injector.get('IdToken');
  }));

  describe('validate id_token with algorithm', function () {
    beforeEach(function () {
      /**
       * http://kjur.github.io/jsjws/tool_jwt.html generated sample id_token, signed by default private key
       * The public key is shown as below
       */
      publicKeyString =
          "-----BEGIN PUBLIC KEY-----\n"
          + "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA33TqqLR3eeUmDtHS89qF\n"
          + "3p4MP7Wfqt2Zjj3lZjLjjCGDvwr9cJNlNDiuKboODgUiT4ZdPWbOiMAfDcDzlOxA\n"
          + "04DDnEFGAf+kDQiNSe2ZtqC7bnIc8+KSG/qOGQIVaay4Ucr6ovDkykO5Hxn7OU7s\n"
          + "Jp9TP9H0JH8zMQA6YzijYH9LsupTerrY3U6zyihVEDXXOv08vBHk50BMFJbE9iwF\n"
          + "wnxCsU5+UZUZYw87Uu0n4LPFS9BT8tUIvAfnRXIEWCha3KbFWmdZQZlyrFw0buUE\n"
          + "f0YN3/Q0auBkdbDR/ES2PbgKTJdkjc/rEeM0TxvOUf7HuUNOhrtAVEN1D5uuxE1W\n"
          + "SwIDAQAB"
          + "-----END PUBLIC KEY-----\n";

      jwk = KEYUTIL.getKey(publicKeyString);
    });


    describe('RS256', function () {

      beforeEach(function () {

        //Valid token with RS256, expires at 20251231235959Z UTC
        valid_id_token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9' +
            '.eyJpc3MiOiJvaWRjIiwic3ViIjoib2F1dGgtbmctY2xpZW50IiwibmJmIjoxNDQ5MjY3Mzg1LCJleHAiOjE3NjcyMjU1OTksImlhdCI6MTQ0OTI2NzM4NSwianRpIjoiaWQxMjM0NTYiLCJ0eXAiOiJodHRwczovL2V4YW1wbGUuY29tL3JlZ2lzdGVyIn0' +
            '.MXBbWkr1Sf6KRn11IgEXyVg5g5VVUOSyLhTglgL8fI13aGf6SquVy0ZNn7ajTym5a_fJHPWLlgpvo-v98xuMBC9cLH_NN3ocrZAQkkW19G4AVY-LsOURp0t9JzVEb-pEe8Zps8O7Mumj0qSlr-4Dnyb3UMqdwZTcSgUTrbdyf6Qa7KHA0myANLDs2T8ctlSEptgVHPj8Zy9tk9UUlDZgsU4KoEpanDt7c1GzQJu7KEI3iJYlVEwDgMqu0EWn64aaP-w1OKZAyHbJWdMwun7i9edLonQ37M67Mb8ox6-cx8fxS3s3h6b3jRS5L0RACFVtB9lF4f_0yPVBwcTBhzYBOg';

        //Expired token
        expired_id_token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9' +
            '.eyJpc3MiOiJvaWRjIiwic3ViIjoib2F1dGgtbmctY2xpZW50IiwibmJmIjoxNDQ5MjE1OTMxLCJleHAiOjE0NDkyMTk1MzEsImlhdCI6MTQ0OTIxNTkzMSwianRpIjoiaWQxMjM0NTYiLCJ0eXAiOiJodHRwczovL2V4YW1wbGUuY29tL3JlZ2lzdGVyIn0' +
            '.jlmI1b7LYGFRPTLdBcBTgVKwSabwKwsuqQpZAAvX7xF7Xf32miAA_FG-jJegTkjJdjImdNmRqDrR1iu2yX-785nbhNm_eOUChTkWplqszE6-lOvoJy5q8jXlWnS4f6q7EM890eVO2prtLmFW6zUO6xIa4cVFzrWSSN7VjPYV09F38DYGfymE3HmwdNyu56CBuTaYv1SW0wUavtu4_FCt50gfOGQ9tVkDHSNXj8xviskiOJ9TbHAesGPgPMHqCfAR0fRQf3lK0pxd76BEw3f2zYCnsPu_JFDiwiK8MBzHMpmP4i9kxl18mElA4CylwXKDCaGY5Fef3gS9p5mWV46V0A';

        IdToken.set({
          issuer: 'oidc',
          clientId: 'oauth-ng-client',
          jwks: {keys: [jwk]}
        });
      });

      it('validate token successfully', function () {
        expect(IdToken.validateIdToken(valid_id_token)).toEqual(true);
      });

    });

    describe('RS384', function () {

      beforeEach(function() {
        //Valid token with RS384, expires at 20251231235959Z UTC
        valid_id_token = 'eyJhbGciOiJSUzM4NCIsInR5cCI6IkpXVCJ9' +
            '.eyJpc3MiOiJvaWRjLXJzLTM4NCIsInN1YiI6Im9hdXRoLW5nLWNsaWVudCIsIm5iZiI6MTQ0OTQ0NTM3NSwiZXhwIjoxNzY3MjI1NTk5LCJpYXQiOjE0NDk0NDUzNzUsImp0aSI6ImlkMTIzNDU2IiwidHlwIjoiaHR0cHM6Ly9leGFtcGxlLmNvbS9yZWdpc3RlciJ9' +
            '.cDSfORFIZ28nUgvbdJ0wwe-JtZOy5J40--xYfJBPbwRJz02EscFlRD-xNqRB9eEsVVK4shW9AtF4yfp3Sa_jcjziGlQNwpRzFhnCqrADupMNNhK-z1SmuxgG_zfP7plXVAhg1IJ671w43I2PmXQw5wAKpAMwun4J-mxHP7ZV6__z_hxv4QclONHrk23_ebHJXi8W4q7B7n-amQQZ-kKQf8OblZIX9kAF58WIhyA5ZNqXGZ_hmcDKUVlBpgiurpD8u429NwrlauowHCQI_zMKlaEzJvH5qNhXLNbFgLmhrQFYo_VW48ZjHygmAkuuKt0jioR0dUeYirTGq-xEBcOpnw';

        IdToken.set({
          issuer: 'oidc-rs-384',
          clientId: 'oauth-ng-client',
          jwks: {keys: [jwk]}
        });

      });

      it('validate token successfully', function () {
        expect(IdToken.validateIdToken(valid_id_token)).toEqual(true);
      });

    });

    describe('RS512', function () {

      beforeEach(function() {
        //Valid token with RS512, expires at 20251231235959Z UTC
        valid_id_token = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9' +
            '.eyJpc3MiOiJvaWRjLXJzLTUxMiIsInN1YiI6Im9hdXRoLW5nLWNsaWVudCIsIm5iZiI6MTQ0OTQ0NzQyMiwiZXhwIjoxNzY3MjI1NTk5LCJpYXQiOjE0NDk0NDc0MjIsImp0aSI6ImlkMTIzNDU2IiwidHlwIjoiaHR0cHM6Ly9leGFtcGxlLmNvbS9yZWdpc3RlciJ9' +
            '.BAqggV91_YwQmnKty-qHzi61WgUpLue7gFWDe72VzHzcQhYu1STLduBxtr3qtsl6XzVDL6N0AmYfpFwMQQ8dRMaLLsnx6wg7Mi9nqCkDTL1Px5biL9AM4C3S32N6iJ4nFyJgUiFJ4RWG9f-78k4PG51xvSCkA-2TbODU1KsXRnc3o9SrQKw8pWnjmxNIfDtfzkxEdBlePWuknZGeaJBlR4hBRrxH1GnNDVW3aeuLJl4y1IOIbUxsnNW8HgAm6KpoCVAbPN7YzQPfDEIQgaNSS_i7Nkuq9Rno_6ivfqxs3QCiEqHJkAh8W2J3N8iPpRrCW03oQp2sGvmRTxxvxuxZbw'

        IdToken.set({
          issuer: 'oidc-rs-512',
          clientId: 'oauth-ng-client',
          jwks: {keys: [jwk]}
        });

      });

      it('validate token successfully', function () {
        expect(IdToken.validateIdToken(valid_id_token)).toEqual(true);
      });

    });

  });



});
