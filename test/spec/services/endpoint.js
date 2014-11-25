'use strict';

describe('Endpoint', function() {

  var result, $location, $sessionStorage, Endpoint;

  var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var params   = { site: 'http://example.com', clientId: 'client-id', redirectUri: 'http://example.com/redirect', scope: 'scope', authorizePath: '/oauth/authorize', responseType: 'token' };
  var uri      = 'http://example.com/oauth/authorize?response_type=token&client_id=client-id&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=scope&state=';

  beforeEach(module('oauth'));

  beforeEach(inject(function($injector) { $location       = $injector.get('$location') }));
  beforeEach(inject(function($injector) { $sessionStorage = $injector.get('$sessionStorage') }));
  beforeEach(inject(function($injector) { Endpoint        = $injector.get('Endpoint') }));

  describe('#set', function() {

    beforeEach(function() {
      result = Endpoint.set(params);
    });

    it('returns the oauth server endpoint', function() {
      expect(result).toEqual(uri);
    });

    describe('when in a specific /path', function() {

      beforeEach(function() {
        $location.path('/path');
      });

      beforeEach(function() {
        result = Endpoint.set(params);
      });

      it('uri should not be in state', function() {
        expect(result).toEqual(uri);
      });
    });

    describe('set state', function() {
      var paramsClone = JSON.parse(JSON.stringify(params));

      beforeEach(function() {
          paramsClone.state = 'test';
      });

      beforeEach(function() {
          result = Endpoint.set(paramsClone);
      });

      it('uri should not be in state', function() {
          expect(result).toEqual(uri + 'test');
      });
    });

    describe('authorizePath can have query string it in', function() {
      var paramsClone = JSON.parse(JSON.stringify(params));

      beforeEach(function() {
          paramsClone.authorizePath = '/oauth/authorize?google=doesthis';
      });

      beforeEach(function() {
          result = Endpoint.set(paramsClone);
      });

      it('uri should not be in state', function() {
          var expectedUri = 'http://example.com/oauth/authorize?google=doesthis&response_type=token&client_id=client-id&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=scope&state=';
          expect(result).toEqual(expectedUri);
      });
    });

    describe('authorizePath can be empty', function() {
      var paramsClone = JSON.parse(JSON.stringify(params));

      beforeEach(function() {
          paramsClone.authorizePath = '';
      });

      beforeEach(function() {
          result = Endpoint.set(paramsClone);
      });

      it('uri should not be in state', function() {
          var expectedUri = 'http://example.com?response_type=token&client_id=client-id&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=scope&state=';
          expect(result).toEqual(expectedUri);
      });
    });
  });

  describe('#get', function() {

    beforeEach(function() {
      Endpoint.set(params);
    });

    beforeEach(function() {
      result = Endpoint.get();
    });

    it('returns the oauth server endpoint', function() {
      expect(result).toEqual(uri);
    });
  });
});
