'use strict';

describe('Endpoint', function() {

  var result, $location, Storage, Endpoint;

  var fragment = 'access_token=token&token_type=bearer&expires_in=7200&state=/path';
  var params   = { site: 'http://example.com', clientId: 'client-id', redirectUri: 'http://example.com/redirect', scope: 'scope', authorizePath: '/oauth/authorize', responseType: 'token' };
  var uri      = 'http://example.com/oauth/authorize?response_type=token&client_id=client-id&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=scope&state=';

  beforeEach(module('oauth'));

  beforeEach(inject(function($injector) { $location       = $injector.get('$location') }));
  beforeEach(inject(function($injector) { Storage         = $injector.get('Storage') }));
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

    describe( "without overrides", function(){
      beforeEach(function() {
        result = Endpoint.get();
      });

      it('returns the oauth server endpoint', function() {
        expect(result).toEqual(uri);
      });
    });

    describe( "with state override", function(){
      it( "injects the state correct", function(){
        var override = { state: 'testState' };
        var result = Endpoint.get( override );
        expect( result ).toEqual( uri + encodeURIComponent( override.state ) );
      });
    });

    describe( "with clientId override", function(){
      it( "injects the override", function(){
        var override    = { clientId: 'unicorn' };
        var result      = Endpoint.get( override );
        var expectedUri = 'http://example.com/oauth/authorize?response_type=token&client_id=unicorn&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=scope&state=';
        expect( result ).toEqual( expectedUri );
      });
    });

    describe( "with scope override", function(){
      it( "injects the override", function(){
        var override    = { scope: 'stars' };
        var result      = Endpoint.get( override );
        var expectedUri = 'http://example.com/oauth/authorize?response_type=token&client_id=client-id&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=stars&state=';
        expect( result ).toEqual( expectedUri );
      });
    });

    describe( "with state override", function(){
      it( "injects the state correct", function(){
        var override = { state: 'testState' };
        var result   = Endpoint.get( override );
        expect( result ).toEqual( uri + encodeURIComponent( override.state ) );
      });
    });

    describe( "with responseType override", function(){
      it( "injects the correct repsonseType", function(){
        var override    = { responseType: 'id_token' };
        var result      = Endpoint.get( override );
        var expectedUri = 'http://example.com/oauth/authorize?response_type=id_token&client_id=client-id&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=scope&state=';
        expect( result ).toEqual( expectedUri );
      });
    });

    describe( "with site override", function(){
      it( "injects the correct site", function(){
        var override    = { site: 'https://invincible.test' };
        var result      = Endpoint.get( override );
        var expectedUri = 'https://invincible.test/oauth/authorize?response_type=token&client_id=client-id&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=scope&state=';
        expect( result ).toEqual( expectedUri );
      });
    });

    describe( "with authorize path overrides", function(){
      it( "injects the correct authorize path", function(){
        var override    = { authorizePath: '/end/here' };
        var result      = Endpoint.get( override );
        var expectedUri = 'http://example.com/end/here?response_type=token&client_id=client-id&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=scope&state=';
        expect( result ).toEqual( expectedUri );
      });
    });

    describe( "given scope with spaces", function(){
      it( "correctly encodes the spaces", function(){
        var override    = { scope: 'read write profile openid' };
        var result      = Endpoint.get( override );
        var expectedUri = 'http://example.com/oauth/authorize?response_type=token&client_id=client-id&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=read%20write%20profile%20openid&state=';
        expect( result ).toEqual( expectedUri );
      });
    });

    describe( "on repsonse type with spaces", function(){
      it( "correctly encodes the spaces", function(){
        var override    = { responseType: 'id_token token' };
        var result      = Endpoint.get( override );
        var expectedUri = 'http://example.com/oauth/authorize?response_type=id_token%20token&client_id=client-id&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=scope&state=';
        expect( result ).toEqual( expectedUri );
      });
    });

    describe( "when provided with a nonce", function(){
      it( "adds the nonce parameter", function(){
        var override    = { nonce: '987654321' };
        var result      = Endpoint.get( override );
        var expectedUri = 'http://example.com/oauth/authorize?response_type=token&client_id=client-id&redirect_uri=http%3A%2F%2Fexample.com%2Fredirect&scope=scope&state=&nonce=987654321';
        expect( result ).toEqual( expectedUri );
      });
    });
  });
});
